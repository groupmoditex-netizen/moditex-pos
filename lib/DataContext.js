'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const [data, setData]     = useState({ productos: [], movimientos: [], clientes: [], comandas: [] });
  const [loading, setLoading] = useState(true);
  const [lastLoad, setLastLoad] = useState(0);

  const load = useCallback(async (force = false) => {
    // No recargar si fue hace menos de 30s y no es forzado
    if (!force && Date.now() - lastLoad < 30000) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard').then(r => r.json());
      if (res.ok) {
        setData({ productos: res.productos, movimientos: res.movimientos, clientes: res.clientes, comandas: res.comandas });
        setLastLoad(Date.now());
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [lastLoad]);

  useEffect(() => { load(true); }, []);

  return (
    <DataCtx.Provider value={{ ...data, loading, reload: () => load(true) }}>
      {children}
    </DataCtx.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
