'use client';
/**
 * /catalogo — Catálogo público para clientes de Moditex Group
 * Sin login · Stock en tiempo real · Carrito → WhatsApp
 */
import { useState, useEffect, useMemo, useCallback } from 'react';

const LOGO_URL  = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/moditex-logo.jpg";
const ISOTIPO_URL = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/ISOTIPO%20PNG.png";
const WA_NUMBER = "584120363131";
const WA_NUMBER2= "584127534435";

const NIVEL_CFG = {
  disponible: { label:'Disponible',      color:'#22c55e', bg:'#f0fdf4', dot:'#22c55e' },
  pocas:      { label:'Pocas unidades',  color:'#f59e0b', bg:'#fffbeb', dot:'#f59e0b' },
  agotado:    { label:'Bajo pedido',     color:'#94a3b8', bg:'#f8fafc', dot:'#94a3b8' },
};

const CAT_ICONS = {
  'BODY':'👙','BODIES':'👙','CHAQUETA':'🧥','CONJUNTO':'👗','ENTERIZO':'🩱',
  'FALDA':'👘','PANTS':'👖','SHORT':'🩳','TOPS':'👕','TOP':'👕',
  'TRAJE DE BANO':'🩱','TRIKINIS':'🩱','VESTIDO':'💃','DEFAULT':'🏷️',
};
function catIcon(c){ const k=(c||'').toUpperCase(); for(const[key,v] of Object.entries(CAT_ICONS)){if(k.includes(key))return v;} return CAT_ICONS.DEFAULT; }

export default function CatalogoPage() {
  const [modelos,   setModelos]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [filtrocat, setFiltrocat] = useState('');
  const [buscar,    setBuscar]    = useState('');
  const [modal,     setModal]     = useState(null);  // modelo seleccionado
  const [carrito,   setCarrito]   = useState([]);    // [{modelo,color,sku,qty,precio}]
  const [carritoOpen, setCarritoOpen] = useState(false);
  const [nombre,    setNombre]    = useState('');
  const [fotoIdx,   setFotoIdx]   = useState(0);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/catalogo').then(r => r.json());
      if (res.ok) setModelos(res.modelos || []);
      else setError(res.error || 'Error al cargar');
    } catch { setError('No se pudo conectar'); }
    setLoading(false);
  }

  const categorias = useMemo(() => [...new Set(modelos.map(m => m.categoria))].sort(), [modelos]);

  const filtrados = useMemo(() => {
    let r = modelos;
    if (filtrocat) r = r.filter(m => m.categoria === filtrocat);
    if (buscar.trim()) {
      const q = buscar.toLowerCase();
      r = r.filter(m => `${m.modelo} ${m.categoria} ${m.descripcion}`.toLowerCase().includes(q));
    }
    return r;
  }, [modelos, filtrocat, buscar]);

  // Carrito
  function addToCart(modelo, variante) {
    setCarrito(prev => {
      const ex = prev.find(x => x.sku === variante.sku);
      if (ex) return prev.map(x => x.sku === variante.sku ? {...x, qty: x.qty + 1} : x);
      return [...prev, {
        sku: variante.sku, modelo: modelo.modelo,
        color: variante.color, talla: variante.talla,
        precio: modelo.precioDetal, qty: 1,
        nivel: variante.nivel,
      }];
    });
  }
  function removeFromCart(sku) { setCarrito(prev => prev.filter(x => x.sku !== sku)); }
  function changeQty(sku, d)   { setCarrito(prev => prev.map(x => x.sku === sku ? {...x, qty: Math.max(1, x.qty + d)} : x)); }
  const totalItems = carrito.reduce((a, x) => a + x.qty, 0);

  function buildWAMessage() {
    const lines = carrito.map(item =>
      `  • ${item.qty}x ${item.modelo} — ${item.color}${item.talla && item.talla !== 'UNICA' ? ' (T:'+item.talla+')' : ''}`
    ).join('\n');
    return encodeURIComponent(
      `Hola, mi nombre es *${nombre || 'Cliente'}* y este es mi pedido:\n\n${lines}\n\n` +
      `Por favor confírmenme el monto para proceder con la transferencia. ¡Gracias! 🙏`
    );
  }

  function sendWA(num) {
    if (!carrito.length) return;
    window.open(`https://wa.me/${num}?text=${buildWAMessage()}`, '_blank');
  }

  // Modal fotos
  const fotosModal = useMemo(() => {
    if (!modal) return [];
    const fotos = [];
    if (modal.foto_url)    fotos.push(modal.foto_url);
    if (modal.fotos_extra) modal.fotos_extra.split(',').map(s=>s.trim()).filter(Boolean).forEach(f => fotos.push(f));
    return fotos;
  }, [modal]);

  return (
    <div style={{ minHeight:'100vh', background:'#f8f8f6', fontFamily:"'Poppins',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&family=DM+Mono:wght@400;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── NAVBAR ── */
        .cat-nav {
          background: #0a0a0a; padding: 0 28px; height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 100;
          border-bottom: 1px solid #1f1f1f;
        }
        .cat-nav-logo { height: 36px; width: auto; object-fit: contain; }
        .cat-nav-tagline {
          font-family: 'DM Mono', monospace; font-size: 8px;
          color: rgba(255,255,255,.3); letter-spacing: .2em;
          text-transform: uppercase; display: none;
        }
        .cat-cart-btn {
          position: relative; padding: 8px 16px;
          background: #c9a84c; color: #000; border: none; cursor: pointer;
          font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: .06em; text-transform: uppercase;
          display: flex; align-items: center; gap: 7px;
          transition: background .15s;
        }
        .cat-cart-btn:hover { background: #e0bc5e; }
        .cat-cart-badge {
          background: #000; color: #c9a84c;
          border-radius: 50%; width: 18px; height: 18px;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── HERO ── */
        .cat-hero {
          background: #0a0a0a; padding: 40px 28px;
          text-align: center; border-bottom: 1px solid #1f1f1f;
        }

        /* ── FILTROS ── */
        .cat-filters {
          background: #fff; padding: 14px 28px;
          border-bottom: 1px solid #e5e5e0;
          display: flex; align-items: center; gap: 12px;
          flex-wrap: wrap; position: sticky; top: 60px; z-index: 90;
        }
        .cat-search {
          flex: 1; min-width: 200px; max-width: 320px;
          padding: 8px 14px; border: 1px solid #e5e5e0;
          font-family: 'Poppins', sans-serif; font-size: 12px;
          outline: none; background: #f8f8f6;
          transition: border-color .15s;
        }
        .cat-search:focus { border-color: #c9a84c; }
        .cat-filter-btn {
          padding: 7px 14px; border: 1px solid #e5e5e0;
          background: #fff; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 9px;
          font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          color: #888; transition: all .12s; white-space: nowrap;
        }
        .cat-filter-btn:hover { border-color: #c9a84c; color: #c9a84c; }
        .cat-filter-btn.active { background: #0a0a0a; color: #c9a84c; border-color: #0a0a0a; }

        /* ── GRID ── */
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1px; background: #e5e5e0;
          padding: 0;
        }
        .cat-card {
          background: #fff; cursor: pointer;
          transition: transform .18s, box-shadow .18s;
          display: flex; flex-direction: column;
        }
        .cat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.1); z-index: 1; position: relative; }
        .cat-card-img {
          aspect-ratio: 3/4; overflow: hidden; background: #f0f0ec;
          position: relative;
        }
        .cat-card-img img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform .4s;
        }
        .cat-card:hover .cat-card-img img { transform: scale(1.04); }
        .cat-card-no-img {
          width: 100%; height: 100%; display: flex;
          align-items: center; justify-content: center;
          flex-direction: column; gap: 8px;
          color: #ccc; font-size: 40px;
        }
        .cat-card-body { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; }
        .cat-card-cat {
          font-family: 'DM Mono', monospace; font-size: 8px;
          color: #aaa; letter-spacing: .18em; text-transform: uppercase;
          margin-bottom: 4px;
        }
        .cat-card-name {
          font-family: 'Playfair Display', serif;
          font-size: 15px; font-weight: 700; color: #111;
          margin-bottom: 6px; line-height: 1.3;
        }
        .cat-card-desc {
          font-size: 11px; color: #777; line-height: 1.55;
          margin-bottom: 10px; flex: 1;
        }
        .cat-card-colores {
          display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px;
        }
        .cat-color-dot {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(0,0,0,.1);
          title: attr(data-color);
        }
        .cat-card-footer {
          display: flex; align-items: center;
          justify-content: space-between; gap: 8px;
          padding-top: 10px; border-top: 1px solid #f0f0ec;
        }
        .cat-nivel {
          display: flex; align-items: center; gap: 5px;
          font-family: 'DM Mono', monospace; font-size: 8px;
          font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
        }
        .cat-nivel-dot { width: 6px; height: 6px; border-radius: 50%; }
        .cat-ver-btn {
          padding: 6px 14px; background: #0a0a0a; color: #fff;
          border: none; cursor: pointer;
          font-family: 'Poppins', sans-serif; font-size: 10px; font-weight: 600;
          transition: background .15s; white-space: nowrap;
        }
        .cat-ver-btn:hover { background: #c9a84c; color: #000; }

        /* ── MODAL ── */
        .cat-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.65);
          z-index: 500; display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fadeIn .15s ease;
        }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .cat-modal {
          background: #fff; width: 100%; max-width: 860px;
          max-height: 90vh; overflow-y: auto;
          display: grid; grid-template-columns: 1fr 1fr;
          animation: slideUp .2s ease;
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity:0; } to { transform:none; opacity:1; } }
        .cat-modal-close {
          position: absolute; top: 16px; right: 16px;
          width: 32px; height: 32px; background: rgba(0,0,0,.4);
          border: none; cursor: pointer; color: #fff;
          font-size: 14px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          z-index: 10;
        }
        .cat-modal-imgs { position: relative; background: #f0f0ec; }
        .cat-modal-img-main {
          aspect-ratio: 3/4; overflow: hidden;
        }
        .cat-modal-img-main img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .cat-modal-thumbs {
          display: flex; gap: 6px; padding: 8px;
          overflow-x: auto;
        }
        .cat-modal-thumb {
          width: 60px; height: 75px; object-fit: cover;
          cursor: pointer; border: 2px solid transparent;
          flex-shrink: 0; transition: border-color .12s;
        }
        .cat-modal-thumb.active { border-color: #c9a84c; }
        .cat-modal-info { padding: 28px; display: flex; flex-direction: column; gap: 16px; }
        .cat-modal-cat  { font-family: 'DM Mono', monospace; font-size: 8px; color: #aaa; letter-spacing: .2em; text-transform: uppercase; }
        .cat-modal-name { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #111; line-height: 1.25; }
        .cat-modal-desc { font-size: 13px; color: #666; line-height: 1.7; }
        .cat-modal-price {
          font-family: 'DM Mono', monospace;
        }
        .cat-variantes { display: flex; flex-direction: column; gap: 6px; }
        .cat-variante-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border: 1px solid #f0f0ec;
          cursor: pointer; transition: border-color .12s;
        }
        .cat-variante-row:hover { border-color: #c9a84c; }
        .cat-variante-row.agotado { opacity: .5; cursor: default; }
        .cat-variante-color { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(0,0,0,.1); flex-shrink: 0; }
        .cat-variante-name { font-size: 12px; font-weight: 500; flex: 1; }
        .cat-variante-nivel {
          font-family: 'DM Mono', monospace; font-size: 8px;
          font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        }
        .cat-add-btn {
          padding: 7px 14px; border: none; cursor: pointer;
          font-family: 'Poppins', sans-serif; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .06em;
          background: #0a0a0a; color: #fff; transition: background .12s;
          white-space: nowrap;
        }
        .cat-add-btn:hover { background: #c9a84c; color: #000; }
        .cat-add-btn.added { background: #22c55e; color: #fff; }

        /* ── CARRITO DRAWER ── */
        .cat-cart-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 600;
        }
        .cat-cart-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(400px, 100vw); background: #fff;
          z-index: 601; display: flex; flex-direction: column;
          box-shadow: -4px 0 30px rgba(0,0,0,.15);
          animation: slideInRight .2s ease;
        }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform:none; } }
        .cart-header {
          padding: 18px 20px; background: #0a0a0a;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cart-title { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; color: #fff; }
        .cart-close {
          width: 28px; height: 28px; background: none; border: 1px solid #333;
          cursor: pointer; color: #888; font-size: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .cart-items { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
        .cart-item {
          display: grid; grid-template-columns: auto 1fr auto;
          gap: 12px; padding: 12px; border: 1px solid #f0f0ec; align-items: center;
        }
        .cart-item-color { width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(0,0,0,.1); flex-shrink: 0; }
        .cart-item-info .name { font-size: 12px; font-weight: 600; }
        .cart-item-info .sub { font-family: 'DM Mono', monospace; font-size: 9px; color: #aaa; margin-top: 1px; }
        .cart-item-ctrl { display: flex; align-items: center; gap: 0; border: 1px solid #f0f0ec; }
        .cart-qty-btn { width: 24px; height: 24px; border: none; background: #f8f8f6; cursor: pointer; font-size: 14px; }
        .cart-qty { width: 28px; text-align: center; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 700; }
        .cart-remove { margin-left: 6px; background: none; border: none; cursor: pointer; color: #ccc; font-size: 12px; }
        .cart-footer { padding: 16px 20px; border-top: 1px solid #f0f0ec; display: flex; flex-direction: column; gap: 10px; }
        .cart-nombre {
          width: 100%; padding: 10px 12px; border: 1px solid #e5e5e0;
          font-family: 'Poppins', sans-serif; font-size: 12px; outline: none;
        }
        .cart-nombre:focus { border-color: #c9a84c; }
        .cart-wa-btn {
          width: 100%; padding: 13px; border: none; cursor: pointer;
          font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .06em;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background .15s;
        }
        .cart-wa-btn.main { background: #25d366; color: #000; }
        .cart-wa-btn.main:hover { background: #22c55e; }
        .cart-wa-btn.sec  { background: #f0f0ec; color: #333; }
        .cart-wa-btn.sec:hover { background: #e5e5e0; }

        /* ── EMPTY / LOADING ── */
        .cat-empty { text-align: center; padding: 80px 24px; }
        .cat-section-title {
          padding: 20px 28px 10px;
          font-family: 'DM Mono', monospace; font-size: 9px;
          color: #aaa; letter-spacing: .22em; text-transform: uppercase;
          border-bottom: 1px solid #e5e5e0; margin-bottom: 0;
          background: #f8f8f6;
        }

        /* ── WA FLOAT ── */
        .cat-wa-float {
          position: fixed; bottom: 24px; left: 24px; z-index: 300;
          width: 52px; height: 52px; border-radius: 50%;
          background: #25d366; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; box-shadow: 0 4px 16px rgba(37,211,102,.4);
          transition: transform .15s;
          text-decoration: none;
        }
        .cat-wa-float:hover { transform: scale(1.08); }

        @media (max-width: 640px) {
          .cat-modal { grid-template-columns: 1fr; }
          .cat-modal-imgs { max-height: 300px; }
          .cat-filters { padding: 10px 14px; }
          .cat-grid { grid-template-columns: repeat(2, 1fr); }
          .cat-nav { padding: 0 14px; }
          .cat-nav-tagline { display: none; }
        }
        @media (max-width: 400px) {
          .cat-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="cat-nav">
        <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <img src={ISOTIPO_URL} alt="M" style={{ height:'36px', width:'36px', objectFit:'contain' }}/>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px', fontWeight:900, color:'#fff', letterSpacing:'.05em', lineHeight:1 }}>MODITEX</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'6.5px', color:'#c9a84c', letterSpacing:'.35em', textTransform:'uppercase', marginTop:'2px' }}>GROUP</div>
            </div>
          </div>
          <div className="cat-nav-tagline">Barquisimeto · Venezuela</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button className="cat-cart-btn" onClick={() => setCarritoOpen(true)}>
            🛒 Mi pedido
            {totalItems > 0 && <span className="cat-cart-badge">{totalItems}</span>}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="cat-hero">
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#c9a84c', letterSpacing:'.28em', textTransform:'uppercase', marginBottom:'10px' }}>
          Colección disponible
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'28px', fontWeight:900, color:'#fff', marginBottom:'8px' }}>
          Moditex Group
        </div>
        <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:'12px', color:'rgba(255,255,255,.45)', marginBottom:'20px' }}>
          Fabricamos tu propia marca · Venta al mayor
        </div>
        {/* Leyenda de estados */}
        <div style={{ display:'flex', gap:'18px', justifyContent:'center', flexWrap:'wrap' }}>
          {Object.entries(NIVEL_CFG).map(([k, cfg]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:cfg.dot, display:'inline-block' }}/>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'rgba(255,255,255,.45)', letterSpacing:'.08em' }}>
                {cfg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div className="cat-filters">
        <input className="cat-search" placeholder="🔍 Buscar por modelo, descripción…"
          value={buscar} onChange={e => setBuscar(e.target.value)}/>
        <button className={`cat-filter-btn${!filtrocat ? ' active' : ''}`}
          onClick={() => setFiltrocat('')}>Todas</button>
        {categorias.map(cat => (
          <button key={cat}
            className={`cat-filter-btn${filtrocat === cat ? ' active' : ''}`}
            onClick={() => setFiltrocat(filtrocat === cat ? '' : cat)}>
            {catIcon(cat)} {cat}
          </button>
        ))}
      </div>

      {/* ── CONTENIDO ── */}
      {loading ? (
        <div className="cat-empty">
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>✨</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'12px', color:'#aaa' }}>Cargando catálogo…</div>
        </div>
      ) : error ? (
        <div className="cat-empty">
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'12px', color:'#ef4444' }}>⚠ {error}</div>
          <button onClick={cargar} style={{ marginTop:'12px', padding:'8px 16px', background:'#0a0a0a', color:'#fff', border:'none', cursor:'pointer', fontFamily:"'Poppins',sans-serif", fontSize:'11px' }}>Reintentar</button>
        </div>
      ) : modelos.length === 0 ? (
        <div className="cat-empty">
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>🏷️</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'12px', color:'#aaa', marginBottom:'8px' }}>
            El catálogo está vacío por el momento
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#ccc' }}>
            Pronto tendremos productos disponibles
          </div>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="cat-empty">
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>🔍</div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'12px', color:'#aaa', marginBottom:'16px' }}>
            Sin resultados para "{buscar || filtrocat}"
          </div>
          <button onClick={() => { setBuscar(''); setFiltrocat(''); }}
            style={{ padding:'9px 20px', background:'#0a0a0a', color:'#fff', border:'none', cursor:'pointer',
              fontFamily:"'Poppins',sans-serif", fontSize:'11px', fontWeight:600 }}>
            Ver todas las prendas
          </button>
        </div>
      ) : (
        <>
          {/* Agrupar por categoría */}
          {(filtrocat ? [filtrocat] : categorias.filter(c => filtrados.some(m => m.categoria === c))).map(cat => {
            const items = filtrados.filter(m => m.categoria === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <div className="cat-section-title">{catIcon(cat)} {cat} ({items.length})</div>
                <div className="cat-grid">
                  {items.map(modelo => {
                    // Nivel general del modelo (el mejor disponible)
                    const varDisp = modelo.variantes.filter(v => v.nivel !== 'agotado');
                    const nivelGeneral = varDisp.length === 0 ? 'agotado' : varDisp.some(v => v.nivel === 'disponible') ? 'disponible' : 'pocas';
                    const nivelCfg = NIVEL_CFG[nivelGeneral];
                    // Colores únicos de las variantes
                    const coloresMap = {};
                    modelo.variantes.forEach(v => { coloresMap[v.color] = v.nivel; });

                    return (
                      <div key={modelo.key} className="cat-card" onClick={() => { setModal(modelo); setFotoIdx(0); }}>
                        <div className="cat-card-img">
                          {modelo.foto_url ? (
                            <img src={modelo.foto_url} alt={modelo.modelo} loading="lazy"/>
                          ) : (
                            <div className="cat-card-no-img">
                              <span>{catIcon(modelo.categoria)}</span>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#ccc' }}>{modelo.modelo}</span>
                            </div>
                          )}
                          {/* Badge nivel */}
                          <div style={{
                            position:'absolute', top:'10px', left:'10px',
                            background: nivelGeneral === 'agotado' ? 'rgba(0,0,0,.6)' : nivelCfg.bg,
                            color: nivelCfg.color, padding:'3px 9px',
                            fontFamily:"'DM Mono',monospace", fontSize:'7px',
                            fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase',
                          }}>
                            {nivelCfg.label}
                          </div>
                        </div>
                        <div className="cat-card-body">
                          <div className="cat-card-cat">{modelo.categoria}</div>
                          <div className="cat-card-name">{modelo.modelo}</div>
                          {modelo.descripcion && (
                            <div className="cat-card-desc" style={{ WebkitLineClamp:2, display:'-webkit-box', WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                              {modelo.descripcion}
                            </div>
                          )}
                          {/* Puntos de color */}
                          <div className="cat-card-colores">
                            {Object.entries(coloresMap).slice(0, 10).map(([color, nivel]) => (
                              <div key={color} className="cat-color-dot"
                                data-color={color}
                                title={color}
                                style={{
                                  background: colorFromName(color),
                                  opacity: nivel === 'agotado' ? .3 : 1,
                                }}/>
                            ))}
                            {Object.keys(coloresMap).length > 10 && (
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'8px', color:'#aaa', lineHeight:'16px' }}>
                                +{Object.keys(coloresMap).length - 10}
                              </span>
                            )}
                          </div>
                          <div className="cat-card-footer">
                            <div className="cat-nivel">
                              <span className="cat-nivel-dot" style={{ background: nivelCfg.dot }}/>
                              <span style={{ color: nivelCfg.color }}>{nivelCfg.label}</span>
                            </div>
                            <button className="cat-ver-btn" onClick={e => { e.stopPropagation(); setModal(modelo); setFotoIdx(0); }}>
                              Ver prenda →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── MODAL PRODUCTO ── */}
      {modal && (
        <div className="cat-modal-overlay" onClick={() => setModal(null)}>
          <div className="cat-modal" onClick={e => e.stopPropagation()} style={{ position:'relative' }}>
            <button className="cat-modal-close" onClick={() => setModal(null)}>✕</button>

            {/* Fotos */}
            <div className="cat-modal-imgs">
              <div className="cat-modal-img-main">
                {fotosModal.length > 0 ? (
                  <img src={fotosModal[fotoIdx] || fotosModal[0]} alt={modal.modelo}/>
                ) : (
                  <div style={{ width:'100%', height:'100%', minHeight:'300px', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'8px', color:'#ccc', background:'#f0f0ec' }}>
                    <span style={{ fontSize:'60px' }}>{catIcon(modal.categoria)}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'10px' }}>Sin foto</span>
                  </div>
                )}
              </div>
              {fotosModal.length > 1 && (
                <div className="cat-modal-thumbs">
                  {fotosModal.map((f, i) => (
                    <img key={i} src={f} alt="" className={`cat-modal-thumb${fotoIdx === i ? ' active' : ''}`}
                      onClick={() => setFotoIdx(i)}/>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="cat-modal-info">
              <div>
                <div className="cat-modal-cat">{catIcon(modal.categoria)} {modal.categoria}</div>
                <div className="cat-modal-name">{modal.modelo}</div>
              </div>
              {modal.descripcion && <div className="cat-modal-desc">{modal.descripcion}</div>}
              {modal.tela && (
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#888', letterSpacing:'.1em' }}>
                  TELA: {modal.tela.toUpperCase()}
                </div>
              )}
              {/* Variantes */}
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'8px', color:'#aaa', letterSpacing:'.18em', textTransform:'uppercase', marginBottom:'8px' }}>
                  Colores disponibles
                </div>
                <div className="cat-variantes">
                  {modal.variantes.map(v => {
                    const ncfg = NIVEL_CFG[v.nivel];
                    const inCart = carrito.some(x => x.sku === v.sku);
                    return (
                      <div key={v.sku}
                        className={`cat-variante-row${v.nivel === 'agotado' ? ' agotado' : ''}`}
                        onClick={() => v.nivel !== 'agotado' && addToCart(modal, v)}>
                        <div className="cat-variante-color" style={{ background: colorFromName(v.color) }}/>
                        <div className="cat-variante-name">
                          {v.color}
                          {v.talla && v.talla !== 'UNICA' && <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#aaa', marginLeft:'6px' }}>T:{v.talla}</span>}
                        </div>
                        <div className="cat-variante-nivel" style={{ color: ncfg.color }}>
                          <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:ncfg.dot, display:'inline-block', marginRight:'4px' }}/>
                          {ncfg.label}
                        </div>
                        {v.nivel !== 'agotado' && (
                          <button className={`cat-add-btn${inCart ? ' added' : ''}`}
                            onClick={e => { e.stopPropagation(); addToCart(modal, v); }}>
                            {inCart ? '✓ Agregado' : '+ Pedir'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding:'12px', background:'#fffbeb', border:'1px solid #fde68a', fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#92400e', lineHeight:1.7 }}>
                💡 Selecciona el color que deseas y agrégalo a tu pedido.<br/>
                Cuando estés listo, envía tu pedido por WhatsApp.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CARRITO DRAWER ── */}
      {carritoOpen && (
        <>
          <div className="cat-cart-overlay" onClick={() => setCarritoOpen(false)}/>
          <div className="cat-cart-drawer">
            <div className="cart-header">
              <div className="cart-title">Mi Pedido</div>
              <button className="cart-close" onClick={() => setCarritoOpen(false)}>✕</button>
            </div>

            {carrito.length === 0 ? (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', padding:'24px' }}>
                <span style={{ fontSize:'40px' }}>🛒</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'11px', color:'#aaa' }}>Tu pedido está vacío</span>
                <button onClick={() => setCarritoOpen(false)}
                  style={{ padding:'8px 20px', background:'#0a0a0a', color:'#fff', border:'none', cursor:'pointer', fontFamily:"'Poppins',sans-serif", fontSize:'11px', fontWeight:600, marginTop:'8px' }}>
                  Ver catálogo
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {carrito.map(item => {
                    const ncfg = NIVEL_CFG[item.nivel];
                    return (
                      <div key={item.sku} className="cart-item">
                        <div className="cart-item-color" style={{ background: colorFromName(item.color) }}/>
                        <div className="cart-item-info">
                          <div className="name">{item.modelo}</div>
                          <div className="sub">{item.color}{item.talla && item.talla !== 'UNICA' ? ' · T:'+item.talla : ''}</div>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'8px', color:ncfg.color, marginTop:'2px', fontWeight:700 }}>
                            {ncfg.label}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                          <div className="cart-item-ctrl">
                            <button className="cart-qty-btn" onClick={() => changeQty(item.sku, -1)}>−</button>
                            <span className="cart-qty">{item.qty}</span>
                            <button className="cart-qty-btn" onClick={() => changeQty(item.sku, 1)}>+</button>
                          </div>
                          <button className="cart-remove" onClick={() => removeFromCart(item.sku)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="cart-footer">
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#aaa', letterSpacing:'.1em', textTransform:'uppercase' }}>
                    Tu nombre para el pedido
                  </div>
                  <input className="cart-nombre" placeholder="ej: María González"
                    value={nombre} onChange={e => setNombre(e.target.value)}/>

                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#888', lineHeight:1.6, padding:'8px 10px', background:'#f8f8f6', borderLeft:'3px solid #c9a84c' }}>
                    Se enviará un mensaje a WhatsApp con tu pedido.<br/>
                    Una asesora confirmará el monto para tu transferencia.
                  </div>

                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#aaa', textAlign:'center', letterSpacing:'.1em', textTransform:'uppercase' }}>Enviar a:</div>

                  <button className="cart-wa-btn main" onClick={() => sendWA(WA_NUMBER)}>
                    📱 WhatsApp 1 — {WA_NUMBER.replace('58', '+58 ')}
                  </button>
                  <button className="cart-wa-btn sec" onClick={() => sendWA(WA_NUMBER2)}>
                    📱 WhatsApp 2 — {WA_NUMBER2.replace('58', '+58 ')}
                  </button>

                  <button onClick={() => setCarrito([])}
                    style={{ padding:'7px', background:'none', border:'1px solid #f0f0ec', cursor:'pointer', fontFamily:"'DM Mono',monospace", fontSize:'8px', color:'#ccc', letterSpacing:'.1em', textTransform:'uppercase' }}>
                    Vaciar pedido
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── FOOTER ── */}
      <div style={{ background:'#0a0a0a', padding:'30px 28px', textAlign:'center', marginTop:'40px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', marginBottom:'14px' }}>
          <img src={{ISOTIPO_URL}} alt="M" style={{ height:'44px', width:'44px', objectFit:'contain' }}/>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', fontWeight:900, color:'#fff', letterSpacing:'.05em', lineHeight:1 }}>MODITEX</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'7px', color:'#c9a84c', letterSpacing:'.35em', textTransform:'uppercase', marginTop:'3px' }}>GROUP</div>
          </div>
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'rgba(255,255,255,.25)', letterSpacing:'.16em', lineHeight:2 }}>
          MODITEX GROUP · BARQUISIMETO, VENEZUELA<br/>
          <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer"
            style={{ color:'#c9a84c', textDecoration:'none' }}>+58 412-036-3131</a>
          {' · '}
          <a href={`https://wa.me/${WA_NUMBER2}`} target="_blank" rel="noreferrer"
            style={{ color:'#c9a84c', textDecoration:'none' }}>+58 412-753-4435</a>
        </div>
      </div>

      {/* ── WhatsApp flotante ── */}
      <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="cat-wa-float">
        💬
      </a>
    </div>
  );
}

/* Convierte nombre de color a hex aproximado */
function colorFromName(name) {
  const n = (name||'').toLowerCase().trim();
  const map = {
    'negro':'#1a1a1a','blanco':'#f5f5f0','rojo':'#dc2626','azul':'#2563eb',
    'azul marino':'#1e3a5f','azul rey':'#1d4ed8','verde':'#16a34a','verde oscuro':'#14532d',
    'verde pistacho':'#84cc16','amarillo':'#eab308','rosado':'#ec4899','rosa':'#f472b6',
    'morado':'#9333ea','violeta':'#7c3aed','lila':'#a78bfa','naranja':'#ea580c',
    'salmon':'#fb923c','coral':'#f87171','beige':'#d4b896','camel':'#b87c4c',
    'café':'#92400e','cafe':'#92400e','marrón':'#78350f','marron':'#78350f',
    'gris':'#6b7280','gris claro':'#d1d5db','gris oscuro':'#374151',
    'nude':'#e8c9a0','vinotinto':'#7f1d1d','vino':'#7f1d1d','blanco crema':'#fefce8',
    'turquesa':'#0d9488','celeste':'#38bdf8','fucsia':'#d946ef','terracota':'#b45309',
    'dorado':'#d97706','plateado':'#94a3b8','chocolate':'#431407','caqui':'#a3a36a',
  };
  for (const [k, v] of Object.entries(map)) {
    if (n.includes(k)) return v;
  }
  // Hash fallback
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 45%, 55%)`;
}
