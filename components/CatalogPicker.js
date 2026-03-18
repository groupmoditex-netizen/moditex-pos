'use client';
import { useState, useEffect, useRef } from 'react';

const COLOR_MAP = {
  'BLANCO':'#d0d0d0','NEGRO':'#1a1a1a','AZUL':'#3b6fd4','ROJO':'#d63b3b',
  'VERDE':'#2d9e4a','ROSA':'#f07aa0','GRIS':'#6b7280','AMARILLO':'#f5c842',
  'NARANJA':'#f57c42','MORADO':'#7c4fd4','VINOTINTO':'#8b2035',
  'BEIGE':'#d4b896','CORAL':'#f26e5b','CELESTE':'#7ec8e3',
};
const CAT_ICONS = {
  BODIES:'👙',BODY:'👙',CHAQUETA:'🧥',CONJUNTO:'👗',ENTERIZO:'🩱',
  FALDA:'👘',PANTS:'👖',SHORT:'🩳',TOPS:'👕',TOP:'👕',
  'TRAJE DE BANO':'🩱','TRAJE DE BAÑO':'🩱',TRIKINIS:'🩱',VESTIDO:'💃',
};

function dotHex(n) {
  const k = (n||'').toUpperCase().trim();
  return COLOR_MAP[k] || COLOR_MAP[k.split(' ')[0]] || '#9ca3af';
}
function catIcon(c) { return CAT_ICONS[(c||'').toUpperCase()] || '🏷️'; }
function fmtE(n) { return `€ ${Number(n||0).toFixed(2)}`; }

export default function CatalogPicker({ productos, open, onClose, onAdd, modo = 'entrada', tipoVenta = 'DETAL' }) {
  const [vista, setVista]         = useState('cats');  // cats | modelos | variantes | busqueda
  const [cat, setCat]             = useState('');
  const [modelo, setModelo]       = useState('');
  const [query, setQuery]         = useState('');
  const [qtys, setQtys]           = useState({});
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) {
      setVista('cats'); setCat(''); setModelo(''); setQuery(''); setQtys({});
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (query.length >= 2) setVista('busqueda');
    else if (vista === 'busqueda') setVista(cat ? (modelo ? 'variantes' : 'modelos') : 'cats');
  }, [query]);

  if (!open) return null;

  const getQty = sku => qtys[sku] || 1;
  const setQty = (sku, v) => setQtys(p => ({ ...p, [sku]: Math.max(1, parseInt(v) || 1) }));
  const incQty = sku => setQty(sku, getQty(sku) + 1);
  const decQty = sku => setQty(sku, getQty(sku) - 1);
  function getPrice(p) { return tipoVenta === 'MAYOR' ? p.precioMayor : p.precioDetal; }

  function handleAdd(p) {
    if (modo === 'salida' && p.disponible <= 0) return;
    onAdd(p, getQty(p.sku));
    setQtys(prev => ({ ...prev, [p.sku]: 1 }));
  }

  // ── Categorías ──────────────────────────────────────────────────────────
  const catMap = {};
  productos.forEach(p => {
    if (!catMap[p.categoria]) catMap[p.categoria] = { conStock: 0, total: 0 };
    catMap[p.categoria].total++;
    if (p.disponible > 0) catMap[p.categoria].conStock++;
  });

  // ── Modelos de cat ──────────────────────────────────────────────────────
  const modeloMap = {};
  productos.filter(p => p.categoria === cat).forEach(p => {
    if (!modeloMap[p.modelo]) modeloMap[p.modelo] = { vars: [], stock: 0 };
    modeloMap[p.modelo].vars.push(p);
    modeloMap[p.modelo].stock += p.disponible;
  });

  // ── Variantes de modelo ─────────────────────────────────────────────────
  const variantes = productos.filter(p => p.categoria === cat && p.modelo === modelo)
    .sort((a, b) => b.disponible - a.disponible);

  // ── Búsqueda ────────────────────────────────────────────────────────────
  const busquedaRes = query.length >= 2
    ? productos.filter(p =>
        `${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(query.toLowerCase())
      ).sort((a, b) => b.disponible - a.disponible).slice(0, 20)
    : [];

  // Breadcrumb
  function Breadcrumb() {
    return (
      <div style={{ display:'flex',alignItems:'center',gap:'6px',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',marginBottom:'14px',flexWrap:'wrap' }}>
        <span onClick={() => { setVista('cats'); setCat(''); setModelo(''); }} style={{ cursor:'pointer',color:'var(--blue)',textDecoration:'underline' }}>Categorías</span>
        {cat && <>
          <span style={{ color:'#ccc' }}>›</span>
          {modelo
            ? <span onClick={() => { setVista('modelos'); setModelo(''); }} style={{ cursor:'pointer',color:'var(--blue)',textDecoration:'underline' }}>{cat}</span>
            : <span style={{ fontWeight:700,color:'#111' }}>{cat}</span>
          }
        </>}
        {modelo && <>
          <span style={{ color:'#ccc' }}>›</span>
          <span style={{ fontWeight:700,color:'#111' }}>{modelo}</span>
        </>}
      </div>
    );
  }

  function VarianteCard({ p }) {
    const noStock = modo === 'salida' && p.disponible <= 0;
    const precio  = getPrice(p);
    const sc = p.disponible === 0 ? 'var(--red)' : p.disponible <= 3 ? 'var(--warn)' : 'var(--green)';
    return (
      <div style={{
        background: '#fff', border: `1px solid ${noStock ? 'var(--border)' : 'var(--border)'}`,
        borderTop: `3px solid ${sc}`, padding: '12px',
        opacity: noStock ? 0.5 : 1,
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
          <span style={{ width:'12px',height:'12px',borderRadius:'50%',background:dotHex(p.color),border:'1px solid rgba(0,0,0,.12)',flexShrink:0 }} />
          <div>
            <div style={{ fontSize:'12px',fontWeight:700 }}>{p.color}</div>
            {p.talla && p.talla !== 'UNICA' && <div style={{ fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666' }}>Talla: {p.talla}</div>}
            <div style={{ fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)' }}>{p.sku}</div>
          </div>
        </div>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:sc }}>{p.disponible === 0 ? '🏭 Fabricar' : `${p.disponible} uds`}</span>
          <span style={{ fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--red)',fontWeight:600 }}>{fmtE(precio)}</span>
        </div>
        {!noStock && (
          <div style={{ display:'flex',alignItems:'center',gap:'6px' }}>
            <button onMouseDown={e=>{e.preventDefault();decQty(p.sku);}} style={{ width:'28px',height:'28px',background:'var(--bg3)',border:'1px solid var(--border)',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
            <input type="number" value={getQty(p.sku)} onChange={e=>setQty(p.sku,e.target.value)}
              style={{ width:'44px',height:'28px',textAlign:'center',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,background:'#fff',outline:'none' }} />
            <button onMouseDown={e=>{e.preventDefault();incQty(p.sku);}} style={{ width:'28px',height:'28px',background:'var(--bg3)',border:'1px solid var(--border)',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
            <button onMouseDown={e=>{e.preventDefault();handleAdd(p);}} style={{ flex:1,padding:'6px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',transition:'background .13s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#333'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--ink)'}>
              + Agregar
            </button>
          </div>
        )}
        {noStock && <div style={{ textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--red)' }}>Sin stock</div>}
      </div>
    );
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff',width:'100%',maxWidth:'820px',maxHeight:'88vh',display:'flex',flexDirection:'column',border:'1px solid var(--border-strong)',borderTop:'3px solid var(--red)',boxShadow:'0 24px 60px rgba(0,0,0,.18)' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',flexShrink:0 }}>
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:'10px',fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700 }}>
              ⊞ Explorar Catálogo
              <span style={{ fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'2px 9px',background:modo==='entrada'?'var(--green-soft)':'var(--red-soft)',color:modo==='entrada'?'var(--green)':'var(--red)',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase' }}>
                {modo.toUpperCase()}
              </span>
            </div>
            <div style={{ fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',marginTop:'4px' }}>
              {vista !== 'cats' && <Breadcrumb />}
              {vista === 'cats' && 'Selecciona una categoría'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'14px',color:'#555',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding:'10px 20px',borderBottom:'1px solid var(--border)',background:'#fff',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'8px 12px' }}>
            <span style={{ color:'#888' }}>🔍</span>
            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Búsqueda rápida: modelo, color o SKU…"
              style={{ background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',width:'100%' }} />
            {query && <button onClick={() => setQuery('')} style={{ background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:'14px' }}>✕</button>}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1,overflowY:'auto',padding:'18px 20px' }}>

          {/* ── CATEGORÍAS ── */}
          {vista === 'cats' && (
            <>
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'14px' }}>
                Categorías ({Object.keys(catMap).length})
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'10px' }}>
                {Object.entries(catMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([c, info]) => (
                  <button key={c} onClick={() => { setCat(c); setVista('modelos'); }}
                    style={{ background:'#fff',border:'1px solid var(--border)',padding:'18px 10px 14px',textAlign:'center',cursor:'pointer',transition:'all .14s',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--red)';e.currentTarget.style.background='rgba(217,30,30,.04)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='#fff'}}>
                    <span style={{ fontSize:'26px' }}>{catIcon(c)}</span>
                    <span style={{ fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,color:'#111' }}>{c}</span>
                    <span style={{ fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888' }}>{info.conStock} con stock</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── MODELOS ── */}
          {vista === 'modelos' && (
            <>
              <Breadcrumb />
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'14px' }}>
                {Object.keys(modeloMap).length} modelos en {cat}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:'10px' }}>
                {Object.entries(modeloMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([m, info]) => {
                  const hasStock = info.stock > 0;
                  return (
                    <button key={m} onClick={() => { setModelo(m); setVista('variantes'); }}
                      style={{ background:'#fff',border:`1px solid var(--border)`,borderLeft:`3px solid ${hasStock?'var(--green)':'var(--border)'}`,padding:'13px 14px',textAlign:'left',cursor:'pointer',transition:'all .14s' }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--red)';e.currentTarget.style.background='rgba(217,30,30,.04)'}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.borderLeftColor=hasStock?'var(--green)':'var(--border)';e.currentTarget.style.background='#fff'}}>
                      <div style={{ fontSize:'13px',fontWeight:700,marginBottom:'5px' }}>{m}</div>
                      <div style={{ fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666' }}>
                        {info.vars.length} variantes · {' '}
                        <span style={{ color:hasStock?'var(--green)':'var(--red)',fontWeight:700 }}>
                          {hasStock ? `${info.stock} uds` : 'Sin stock'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── VARIANTES ── */}
          {vista === 'variantes' && (
            <>
              <Breadcrumb />
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'14px' }}>
                {variantes.length} variante{variantes.length!==1?'s':''} de {modelo}
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px' }}>
                {variantes.map(p => <VarianteCard key={p.sku} p={p} />)}
              </div>
            </>
          )}

          {/* ── BÚSQUEDA ── */}
          {vista === 'busqueda' && (
            <>
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'14px' }}>
                {busquedaRes.length} resultado{busquedaRes.length!==1?'s':''} para "{query}"
              </div>
              {busquedaRes.length === 0
                ? <div style={{ textAlign:'center',padding:'40px',color:'#888',fontFamily:'DM Mono,monospace',fontSize:'12px' }}>Sin resultados</div>
                : <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px' }}>
                    {busquedaRes.map(p => <VarianteCard key={p.sku} p={p} />)}
                  </div>
              }
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 20px',borderTop:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
          <span style={{ fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)' }}>
            💡 Sin stock = fabricable bajo pedido
          </span>
          <button className="btn btn-primary btn-sm" onClick={onClose}>✓ Listo — volver</button>
        </div>
      </div>
    </div>
  );
}
