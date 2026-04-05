'use client';
import { useState, useEffect, useRef } from 'react';

const COLOR_MAP = {
  'BLANCO':'#d0d0d0','NEGRO':'#1a1a1a','AZUL':'#3b6fd4','ROJO':'#d63b3b',
  'VERDE':'#2d9e4a','ROSA':'#f07aa0','GRIS':'#6b7280','AMARILLO':'#f5c842',
  'NARANJA':'#f57c42','MORADO':'#7c4fd4','VINOTINTO':'#8b2035',
  'BEIGE':'#d4b896','CORAL':'#f26e5b','CELESTE':'#7ec8e3',
};

function colorDotHex(n) {
  const k = (n || '').toUpperCase().trim();
  return COLOR_MAP[k] || COLOR_MAP[k.split(' ')[0]] || '#9ca3af';
}

/**
 * ProductSearch — buscador con dropdown y fix de blur vs click
 * Props:
 *   productos: []       — lista global de productos
 *   onAdd: (prod) => {} — callback cuando se selecciona uno
 *   tipoVenta: string   — 'DETAL' | 'MAYOR' (para mostrar precio correcto)
 *   modo: string        — 'entrada' | 'salida'
 */
export default function ProductSearch({ productos, onAdd, tipoVenta = 'DETAL', modo = 'entrada' }) {
  const [query, setQuery]           = useState('');
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto]       = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) { setResultados([]); setAbierto(false); return; }
    const q = query.toLowerCase();
    const matches = (productos || []).filter(p =>
      `${p.sku} ${p.modelo} ${p.color} ${p.categoria} ${p.talla}`.toLowerCase().includes(q)
    ).slice(0, 12);
    setResultados(matches);
    setAbierto(matches.length > 0);
  }, [query, productos]);

  function handleSelect(p) {
    onAdd(p);
    setQuery('');
    setResultados([]);
    setAbierto(false);
    // Devolver foco al input
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function getPrice(p) {
    return tipoVenta === 'MAYOR' ? p.precioMayor : p.precioDetal;
  }

  function stockColor(n) {
    if (n <= 0) return 'var(--red)';
    if (n <= 3) return 'var(--warn)';
    return 'var(--green)';
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        padding: '8px 12px',
      }}>
        <span style={{ color: '#555', flexShrink: 0 }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          placeholder="Escribe modelo, color, SKU o talla..."
          autoComplete="off"
          style={{
            background: 'none', border: 'none', outline: 'none',
            fontFamily: 'Poppins, sans-serif', fontSize: '13px',
            color: '#111', width: '100%',
          }}
        />
        {query && (
          <button
            onMouseDown={e => { e.preventDefault(); setQuery(''); setResultados([]); setAbierto(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '14px', padding: 0 }}>
            ✕
          </button>
        )}
      </div>

      {abierto && resultados.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% - 1px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border-strong)',
          borderTop: 'none', zIndex: 999, maxHeight: '320px', overflowY: 'auto',
          boxShadow: '0 8px 28px rgba(0,0,0,.12)',
        }}>
          {resultados.map(p => {
            const precio   = getPrice(p);
            const noStock  = modo === 'salida' && p.disponible <= 0;
            return (
              <div
                key={p.sku}
                // ← FIX: onMouseDown + preventDefault evita que blur se dispare antes del click
                onMouseDown={e => {
                  e.preventDefault();
                  if (!noStock) handleSelect(p);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '10px 1fr 90px',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  cursor: noStock ? 'not-allowed' : 'pointer',
                  borderBottom: '1px solid var(--border)',
                  opacity: noStock ? 0.45 : 1,
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!noStock) e.currentTarget.style.background = 'var(--bg2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <span className="color-dot" style={{ background: colorDotHex(p.color), flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>
                    {p.modelo} — {p.color}
                    {p.talla && p.talla !== 'UNICA' && <span style={{ color: '#888', marginLeft: '5px', fontWeight: 400 }}>T:{p.talla}</span>}
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: 'var(--blue)', marginTop: '2px' }}>
                    {p.sku} · {p.categoria}
                    {noStock && <span style={{ color: 'var(--red)', marginLeft: '6px', fontWeight: 700 }}>SIN STOCK</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: 700, color: stockColor(p.disponible) }}>
                    {p.disponible} uds
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#888' }}>
                    € {precio?.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
