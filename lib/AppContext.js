'use client';
import { fetchApi } from '@/utils/fetchApi';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const debounceRef  = useRef(null);
  const cargandoRef  = useRef(false);
  const retryRef     = useRef(null); // para el reintento automático tras 401

  const cargar = useCallback(async (silencioso = false) => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    if (!silencioso) setCargando(true);
    try {
      const response = await fetchApi(`/api/dashboard?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' },
      });

      // Si recibimos 401 (sin sesión todavía), programar reintento automático.
      // Esto cubre el caso donde el AppContext cargó antes de que el login
      // terminara de setear la cookie.
      if (response.status === 401) {
        if (!retryRef.current) {
          retryRef.current = setInterval(() => {
            // Reintentar cada 800ms hasta tener sesión
            cargandoRef.current = false;
            cargar(true);
          }, 800);
        }
        if (!silencioso) setCargando(false);
        cargandoRef.current = false;
        return;
      }

      // Si tenemos respuesta válida, cancelar cualquier reintento pendiente
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
      setError('No se pudieron cargar los datos. Verifica tu conexión.');
    } finally {
      if (!silencioso) setCargando(false);
      cargandoRef.current = false;
    }
  }, []);

  // Carga inicial
  useEffect(() => { cargar(); }, [cargar]);

  // Limpiar el intervalo de reintento al desmontar
  useEffect(() => {
    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Supabase Realtime ──────────────────────────────────────────────────
  useEffect(() => {
    let channelRef = null;

    async function conectar() {
      try {
        const { supabasePublic } = await import('@/lib/supabase-client');
        if (!supabasePublic) return;

        function recargarDebounced() {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => cargar(true), 1500);
        }

        channelRef = supabasePublic
          .channel('moditex-live')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos' }, recargarDebounced)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'productos'   }, recargarDebounced)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'productos'   }, recargarDebounced)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comandas'    }, recargarDebounced)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comandas'    }, recargarDebounced)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pagos'       }, recargarDebounced)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventario'  }, recargarDebounced)
          .subscribe();
      } catch (e) {
        console.warn('[Realtime] No disponible:', e.message);
      }
    }

    conectar();

    return () => {
      if (channelRef) {
        import('@/lib/supabase-client').then(({ supabasePublic }) => {
          if (supabasePublic) supabasePublic.removeChannel(channelRef);
        }).catch((e) => console.warn('[Realtime] Error al limpiar canal:', e.message));
      }
    };
  }, [cargar]);

  return (
    <AppContext.Provider value={{ data, cargando, error, recargar: () => cargar(false) }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppContext);
}
