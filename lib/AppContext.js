'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const debounceRef  = useRef(null);
  const cargandoRef  = useRef(false);

  const cargar = useCallback(async (silencioso = false) => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    if (!silencioso) setCargando(true);
    try {
      const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' },
      }).then(r => r.json());

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
      setError(e.message);
    } finally {
      // ✅ finally garantiza que cargandoRef SIEMPRE se resetea
      // Sin esto, si el fetch falla una vez, todas las llamadas
      // futuras a recargar() se ignoran silenciosamente para siempre
      if (!silencioso) setCargando(false);
      cargandoRef.current = false;
    }
  }, []);

  // Carga inicial
  useEffect(() => { cargar(); }, [cargar]);

  // ── Supabase Realtime ───────────────────────────────────────────────────
  useEffect(() => {
    let channelRef = null;

    async function conectar() {
      try {
        const { supabasePublic } = await import('@/lib/supabase');
        if (!supabasePublic) return;

        function recargar() {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => cargar(true), 1500);
        }

        channelRef = supabasePublic
          .channel('moditex-live')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos' }, recargar)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'productos'   }, recargar)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'productos'   }, recargar)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comandas'    }, recargar)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comandas'    }, recargar)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pagos'       }, recargar)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventario'  }, recargar)
          .subscribe();
      } catch(e) {
        console.warn('[Realtime] No disponible:', e.message);
      }
    }

    conectar();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channelRef) {
        import('@/lib/supabase').then(({ supabasePublic }) => {
          if (supabasePublic) supabasePublic.removeChannel(channelRef);
        }).catch(() => {});
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