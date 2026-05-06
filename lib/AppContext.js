'use client';
import { fetchApi } from '@/utils/fetchApi';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [data,     setData]     = useState(null);
  const [tasa,     setTasa]     = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'error'
  
  const debounceRef  = useRef({
    all: null,
    comandas: null,
    productos: null,
    movimientos: null
  });
  
  const cargandoRef  = useRef(false);
  const retryRef     = useRef(null); 

  /* ─── Carga Inicial (Dashboard Full) ─────────────────────────────────── */
  const cargar = useCallback(async (silencioso = false) => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    if (!silencioso) setCargando(true);
    try {
      const response = await fetchApi(`/api/dashboard?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' },
      });

      if (response.status === 401) {
        if (!retryRef.current) {
          retryRef.current = setInterval(() => {
            cargandoRef.current = false;
            cargar(true);
          }, 1000);
        }
        if (!silencioso) setCargando(false);
        cargandoRef.current = false;
        return;
      }

      if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }

      const res = await response.json();
      if (res.ok) {
        setData({
          productos:   res.productos,
          movimientos: res.movimientos,
          clientes:    res.clientes,
          comandas:    res.comandas,
        });
        setError(null);
      } else {
        setError(res.error);
      }
    } catch (e) {
      console.error('[AppContext] Error cargando datos:', e.message);
      setError('No se pudieron cargar los datos.');
    } finally {
      if (!silencioso) setCargando(false);
      cargandoRef.current = false;
    }
  }, []);

  const cargarTasa = useCallback(async () => {
    try {
      const res = await fetchApi('/api/tasa').then(r => r.json());
      if (res.ok) setTasa(res.tasa_bs_eur || res.tasa || 1);
    } catch (e) { console.warn('Error cargando tasa:', e.message); }
  }, []);

  useEffect(() => {
    cargarTasa();
  }, [cargarTasa]);

  /* ─── Actualizaciones Granulares ───────────────────────────────────────── */
  
  const refreshComandas = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const res = await fetchApi('/api/comandas').then(r => r.json());
      if (res.ok) {
        setData(prev => prev ? { ...prev, comandas: res.comandas } : prev);
        setSyncStatus('synced');
      } else { setSyncStatus('error'); }
    } catch (e) { 
      console.warn('[AppContext] Error refrescando comandas:', e.message);
      setSyncStatus('error');
    }
  }, []);

  const refreshComandaGranular = useCallback(async (id) => {
    if (!id) return;
    setSyncStatus('syncing');
    try {
      const res = await fetchApi(`/api/comandas?id=${id}`).then(r => r.json()); 
      if (res.ok && res.comandas) {
        setData(prev => {
          if (!prev) return prev;
          const updated = res.comandas[0];
          if (!updated) return prev;
          return {
            ...prev,
            comandas: prev.comandas.map(c => c.id === updated.id ? updated : c)
          };
        });
        setSyncStatus('synced');
      }
    } catch (e) { setSyncStatus('error'); }
  }, []);

  const actualizarComandaLocal = useCallback((id, updates) => {
    setData(prev => {
      if (!prev || !prev.comandas) return prev;
      return {
        ...prev,
        comandas: prev.comandas.map(c => {
          if (c.id !== id) return c;
          
          let nextCmd = { ...c, ...updates };

          // Si el update incluye cambios en productos (JSON manual para pre-renderizado)
          if (updates.productos && Array.isArray(updates.productos)) {
             // Re-calcular resumen e items_count localmente para que se vea reflejado
             nextCmd.items_resumen = updates.productos.map(i => `${i.modelo || ''} ${i.sku || ''}`).join(' ');
             nextCmd.items_count = updates.productos.reduce((a, b) => a + (parseInt(b.cant || b.cantidad || 1)), 0);
          }
          
          return nextCmd;
        })
      };
    });
  }, []);

  const refreshProductos = useCallback(async () => {
    try {
      const res = await fetchApi('/api/productos').then(r => r.json());
      if (Array.isArray(res)) {
        setData(prev => prev ? { ...prev, productos: res } : prev);
      }
    } catch (e) { console.warn('[AppContext] Error refrescando productos:', e.message); }
  }, []);

  const refreshMovimientos = useCallback(async () => {
    try {
      const res = await fetchApi('/api/movimientos?limit=25').then(r => r.json());
      if (res.ok) {
        setData(prev => prev ? { ...prev, movimientos: res.data } : prev);
      }
    } catch (e) { console.warn('[AppContext] Error refrescando movimientos:', e.message); }
  }, []);

  /* ─── Helpers de Debounce ────────────────────────────────────────────── */
  
  const triggerUpdate = (key, id = null) => {
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    
    // Si es una comanda específica, podríamos marcarla como "sincronizando" visualmente si tuviéramos ese estado por item
    setSyncStatus('syncing');

    const delay = key === 'comandas' ? 5000 : 2000;

    debounceRef.current[key] = setTimeout(() => {
      if (key === 'comandas') {
        if (id) refreshComandaGranular(id);
        else refreshComandas();
      }
      else if (key === 'productos') { refreshProductos(); refreshMovimientos(); }
      else if (key === 'all') cargar(true);
    }, delay); 
  };

  /* ─── Persistencia Anti-Apagones (Queue) ────────────────────────────── */
  const QUEUE_KEY = 'moditex_mutation_queue';

  const getQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
  const saveQueue = (q) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} };

  const mutationApi = useCallback(async (url, options = {}) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Inyectar tx_id automáticamente en el body si es JSON
    let optionsWithTx = { ...options };
    if (options.body && typeof options.body === 'string') {
      try {
        const bodyObj = JSON.parse(options.body);
        if (typeof bodyObj === 'object' && bodyObj !== null) {
          bodyObj.tx_id = taskId;
          optionsWithTx.body = JSON.stringify(bodyObj);
        }
      } catch (e) {}
    }

    const task = { id: taskId, url, options: optionsWithTx, timestamp: Date.now() };
    
    // 1. Guardar en disco antes de intentar
    const q = getQueue();
    saveQueue([...q, task]);

    try {
      const response = await fetchApi(url, options);
      const res = await response.json();
      
      if (res.ok) {
        // 2. Si sale bien, limpiar de la cola
        const updatedQ = getQueue().filter(t => t.id !== taskId);
        saveQueue(updatedQ);
      }
      return res;
    } catch (e) {
      console.warn('[Mutation Queue] Error en peticion, se queda en cola:', e.message);
      throw e;
    }
  }, []);

  const procesarColaPendiente = useCallback(async () => {
    const q = getQueue();
    if (q.length === 0) return;

    console.log(`[Mutation Queue] Reintentando ${q.length} tareas pendientes...`);
    for (const task of q) {
      try {
        // Ignorar tareas muy viejas (> 24h) para evitar basura
        if (Date.now() - task.timestamp > 1000 * 60 * 60 * 24) continue;

        const res = await fetchApi(task.url, task.options).then(r => r.json());
        if (res.ok) {
           const nextQ = getQueue().filter(t => t.id !== task.id);
           saveQueue(nextQ);
        }
      } catch (e) { break; } // Parar si sigue fallando la red
    }
    // Refrescar datos tras procesar cola
    cargar(true);
  }, [cargar]);

  useEffect(() => { cargar(); procesarColaPendiente(); }, [cargar, procesarColaPendiente]);

  useEffect(() => {
    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      Object.values(debounceRef.current).forEach(d => d && clearTimeout(d));
    };
  }, []);

  /* ─── Supabase Realtime Granular ───────────────────────────────────────── */
  useEffect(() => {
    let channelRef = null;

    async function conectar() {
      try {
        const { supabasePublic } = await import('@/lib/supabase-client');
        if (!supabasePublic) return;

        channelRef = supabasePublic
          .channel('moditex-granular')
          // Comandas
          .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, (payload) => {
            const id = payload.new?.id || payload.old?.id;
            triggerUpdate('comandas', id);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_comentarios' }, (payload) => {
            const id = payload.new?.comanda_id || payload.old?.comanda_id;
            triggerUpdate('comandas', id);
          })
          // Productos / Inventario
          .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => triggerUpdate('productos'))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, () => triggerUpdate('productos'))
          // Movimientos
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos' }, () => triggerUpdate('productos'))
          .subscribe();
      } catch (e) {
        console.warn('[Realtime Context] Error:', e.message);
      }
    }

    conectar();

    return () => {
      if (channelRef) {
        import('@/lib/supabase-client').then(({ supabasePublic }) => {
          if (supabasePublic) supabasePublic.removeChannel(channelRef);
        }).catch(() => {});
      }
    };
  }, [refreshComandas, refreshProductos, refreshMovimientos, cargar]);

  return (
    <AppContext.Provider value={{ 
      data, tasa, cargando, error, syncStatus, 
      cargar, recargar: () => cargar(false), 
      refreshComandas, refreshComandaGranular, refreshProductos, refreshMovimientos,
      triggerUpdate, actualizarComandaLocal, mutationApi
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppContext);
}
