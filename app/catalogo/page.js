'use client';
import { useState, useEffect, useMemo } from 'react';

const ISOTIPO   = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/ISOTIPO%20PNG.png";
const WA_NUMBER = "584120363131";
const WA_NUMBER2= "584127534435";

const NIVEL = {
  disponible: { label:'Disponible',     dot:'#16c65a', text:'#16c65a', bg:'rgba(22,198,90,.12)'  },
  pocas:      { label:'Pocas unidades', dot:'#f59e0b', text:'#d97706', bg:'rgba(245,158,11,.12)' },
  agotado:    { label:'Bajo pedido',    dot:'#94a3b8', text:'#94a3b8', bg:'rgba(148,163,184,.1)' },
};
const CAT_ICONS = {'BODY':'👙','BODIES':'👙','CHAQUETA':'🧥','CONJUNTO':'👗','ENTERIZO':'🩱','FALDA':'👘','PANTS':'👖','SHORT':'🩳','TOPS':'👕','TOP':'👕','TRAJE DE BANO':'🩱','TRIKINIS':'🩱','VESTIDO':'💃','DEFAULT':'🏷️'};
function catIcon(c){const k=(c||'').toUpperCase();for(const[key,v] of Object.entries(CAT_ICONS)){if(k.includes(key))return v;}return CAT_ICONS.DEFAULT;}

export default function CatalogoPage() {
  const [modelos,   setModelos]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [filtrocat, setFiltrocat] = useState('');
  const [buscar,    setBuscar]    = useState('');
  const [modal,     setModal]     = useState(null);
  const [fotoIdx,   setFotoIdx]   = useState(0);
  const [carrito,   setCarrito]   = useState([]);
  const [cartOpen,  setCartOpen]  = useState(false);
  const [nombre,    setNombre]    = useState('');
  const [opening,   setOpening]   = useState(true); // entry animation

  useEffect(() => {
    cargar();
    // Entry animation
    setTimeout(() => setOpening(false), 900);

    // ── Tiempo real: recargar cuando la tab vuelve a ser visible ──
    function onVisible() {
      if (document.visibilityState === 'visible') cargar();
    }
    document.addEventListener('visibilitychange', onVisible);

    // ── Polling cada 60 segundos ──────────────────────────────────
    const interval = setInterval(cargar, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);

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
  const filtrados  = useMemo(() => {
    let r = modelos;
    if (filtrocat) r = r.filter(m => m.categoria === filtrocat);
    if (buscar.trim()) { const q = buscar.toLowerCase(); r = r.filter(m => `${m.modelo} ${m.categoria} ${m.descripcion}`.toLowerCase().includes(q)); }
    return r;
  }, [modelos, filtrocat, buscar]);

  // Carrito
  function addToCart(modelo, v) {
    setCarrito(prev => {
      const ex = prev.find(x => x.sku === v.sku);
      if (ex) return prev.map(x => x.sku===v.sku ? {...x, qty:x.qty+1} : x);
      return [...prev, {sku:v.sku, modelo:modelo.modelo, color:v.color, talla:v.talla, nivel:v.nivel, qty:1}];
    });
  }
  function removeFromCart(sku) { setCarrito(prev => prev.filter(x => x.sku!==sku)); }
  function changeQty(sku, d)   { setCarrito(prev => prev.map(x => x.sku===sku ? {...x, qty:Math.max(1,x.qty+d)} : x)); }
  const totalItems = carrito.reduce((a,x) => a+x.qty, 0);
  const cartQty    = (sku) => carrito.find(x=>x.sku===sku)?.qty || 0;
  const isInCart   = (sku) => carrito.some(x=>x.sku===sku);

  function sendWA(num) {
    if (!carrito.length) return;
    const lines = carrito.map(i=>`  • ${i.qty}x ${i.modelo} — ${i.color}${i.talla&&i.talla!=='UNICA'?' (T:'+i.talla+')':''}`).join('\n');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Hola, mi nombre es *${nombre||'Cliente'}* y este es mi pedido:\n\n${lines}\n\nPor favor confírmenme el monto para proceder con la transferencia. ¡Gracias! 🙏`)}`, '_blank');
  }

  const fotosModal = useMemo(() => {
    if (!modal) return [];
    const f = [];
    if (modal.foto_url) f.push(modal.foto_url);
    if (modal.fotos_extra) modal.fotos_extra.split(',').map(s=>s.trim()).filter(Boolean).forEach(u=>f.push(u));
    return f;
  }, [modal]);

  function abrirModal(m) { setModal(m); setFotoIdx(0); document.body.style.overflow='hidden'; }
  function cerrarModal()  { setModal(null); document.body.style.overflow=''; }

  return (
    <div style={{minHeight:'100vh',background:'#fafaf8',fontFamily:"'Poppins',sans-serif"}}>
      {/* ── ENTRY ANIMATION ── */}
      <div className={`cat-cut-top${!opening?' open':''}`} style={{pointerEvents:opening?'all':'none'}}/>
      <div className={`cat-cut-bot${!opening?' open':''}`} style={{pointerEvents:opening?'all':'none'}}/>
      {opening && <>
        <div className="cat-cut-line"/>
        <div className="cat-scissors"><svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style={{width:'80px',height:'80px',filter:'drop-shadow(0 0 16px rgba(201,168,76,.8))'}}>
          <g transform="rotate(-30,60,60)">
            <ellipse cx="32" cy="28" rx="12" ry="14" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
            <ellipse cx="32" cy="28" rx="6" ry="7" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
            <path d="M22 20 Q14 12 12 10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
            <path d="M42 34 L60 60" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
            <path d="M60 60 L88 100" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          </g>
          <g transform="rotate(30,60,60)">
            <ellipse cx="88" cy="28" rx="12" ry="14" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
            <ellipse cx="88" cy="28" rx="6" ry="7" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
            <path d="M98 20 Q106 12 108 10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
            <path d="M78 34 L60 60" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
            <path d="M60 60 L32 100" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          </g>
          <circle cx="60" cy="60" r="4" fill="#c9a84c"/>
          <circle cx="60" cy="60" r="1.5" fill="#0a0a0a"/>
        </svg></div>
      </>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Poppins:wght@300;400;500;600&family=DM+Mono&display=swap');
        /* ── CATALOG ENTRY ANIMATION ── */
        .cat-cut-top,.cat-cut-bot{position:fixed;left:0;right:0;height:50vh;background:#0a0a0a;z-index:900;transition:transform .65s cubic-bezier(.77,0,.175,1);}
        .cat-cut-top{top:0;transform:translateY(0);}
        .cat-cut-bot{bottom:0;transform:translateY(0);}
        .cat-cut-top.open{transform:translateY(-100%);}
        .cat-cut-bot.open{transform:translateY(100%);}
        .cat-scissors{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:901;transition:opacity .3s .5s;animation:catScissors .9s cubic-bezier(.68,-0.55,.27,1.55) forwards;}
        @keyframes catScissors{0%{transform:translate(-50%,-50%) scale(0);opacity:0;}25%{transform:translate(-50%,-50%) scale(1.2);opacity:1;}55%{transform:translate(-50%,-50%) scale(1) rotate(0deg);opacity:1;}100%{transform:translate(-50%,-130vh) scale(0.6);opacity:0;}}
        .cat-cut-line{position:fixed;left:0;right:0;top:50%;height:2px;background:linear-gradient(to right,transparent,#c9a84c,#fff,#c9a84c,transparent);z-index:902;animation:catLine .3s ease .1s forwards;opacity:0;}
        @keyframes catLine{0%{opacity:0;transform:scaleX(0);}50%{opacity:1;transform:scaleX(1);}100%{opacity:0;transform:scaleX(1);}}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}

        /* NAV */
        .nav{background:#0a0a0a;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:200;border-bottom:1px solid #1a1a1a;}
        .nav-brand{display:flex;align-items:center;gap:9px;text-decoration:none;}
        .nav-brand img{height:30px;width:30px;object-fit:contain;}
        .nav-name{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:#fff;letter-spacing:.1em;}
        .nav-sub{font-family:'DM Mono',monospace;font-size:5.5px;color:#c9a84c;letter-spacing:.45em;text-transform:uppercase;display:block;margin-top:1px;}
        .nav-cart{display:flex;align-items:center;gap:7px;padding:7px 14px;background:#c9a84c;color:#000;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;transition:background .15s;}
        .nav-cart:hover{background:#e0bc5e;}
        .nav-badge{background:#000;color:#c9a84c;border-radius:50%;width:16px;height:16px;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;}

        /* HERO */
        .hero{background:#0a0a0a;padding:28px 24px;text-align:center;}
        .hero-ey{font-family:'DM Mono',monospace;font-size:8px;color:#c9a84c;letter-spacing:.3em;text-transform:uppercase;margin-bottom:7px;}
        .hero-t{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:#fff;line-height:1.1;}
        .hero-s{font-family:'Poppins',sans-serif;font-size:11px;color:rgba(255,255,255,.3);margin-top:5px;}
        .hero-lv{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin-top:14px;}
        .hero-lv-i{display:flex;align-items:center;gap:5px;font-family:'DM Mono',monospace;font-size:8px;color:rgba(255,255,255,.25);letter-spacing:.06em;}

        /* FILTERS */
        .filt{background:#fff;border-bottom:1px solid #ebebeb;padding:11px 24px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;position:sticky;top:56px;z-index:100;}
        .filt-srch{flex:1;min-width:160px;max-width:260px;padding:7px 12px;border:1px solid #e5e5e0;font-family:'Poppins',sans-serif;font-size:12px;outline:none;background:#fafaf8;transition:border-color .15s;}
        .filt-srch:focus{border-color:#c9a84c;}
        .filt-tag{padding:5px 12px;border:1px solid #e5e5e0;background:#fff;cursor:pointer;font-family:'DM Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#aaa;transition:all .12s;white-space:nowrap;}
        .filt-tag:hover{color:#0a0a0a;border-color:#0a0a0a;}
        .filt-tag.on{background:#0a0a0a;color:#c9a84c;border-color:#0a0a0a;}

        /* SECTION HDR */
        .sec-h{padding:14px 24px 10px;background:#fafaf8;border-bottom:1px solid #ebebeb;display:flex;align-items:baseline;gap:9px;}
        .sec-h-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:#111;}
        .sec-h-cnt{font-family:'DM Mono',monospace;font-size:8.5px;color:#bbb;letter-spacing:.1em;}

        /* GRID */
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1px;background:#ebebeb;}

        /* CARD */
        .card{background:#fff;cursor:pointer;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s;position:relative;}
        .card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.09);z-index:2;}
        .card-img{aspect-ratio:3/4;overflow:hidden;background:#f2f2ef;position:relative;}
        .card-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s;}
        .card:hover .card-img img{transform:scale(1.05);}
        .card-no-img{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:44px;color:#d8d8d2;}
        .card-badge{position:absolute;top:9px;left:9px;padding:3px 8px;font-family:'DM Mono',monospace;font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;}
        .card-body{padding:13px 14px 14px;flex:1;display:flex;flex-direction:column;}
        .card-cat{font-family:'DM Mono',monospace;font-size:7px;color:#c0c0b8;letter-spacing:.2em;text-transform:uppercase;margin-bottom:3px;}
        .card-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:#111;line-height:1.2;margin-bottom:5px;}
        .card-desc{font-family:'Poppins',sans-serif;font-size:10.5px;color:#aaa;line-height:1.6;margin-bottom:10px;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .card-colors{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:11px;}
        .card-dot{width:13px;height:13px;border-radius:50%;border:1.5px solid rgba(0,0,0,.07);}
        .card-foot{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f2f2ef;padding-top:9px;}
        .card-niv{display:flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:7.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
        .card-btn{padding:6px 12px;background:#0a0a0a;color:#fff;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:10px;font-weight:600;transition:background .15s;}
        .card-btn:hover{background:#c9a84c;color:#000;}

        /* MODAL OVERLAY */
        .mo{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:500;display:flex;align-items:flex-end;justify-content:center;animation:mFade .18s ease;}
        @media(min-width:680px){.mo{align-items:center;padding:20px;}}
        @keyframes mFade{from{opacity:0}to{opacity:1}}

        /* MODAL BOX — dos columnas en desktop, apilado en mobile */
        .mb{background:#fff;width:100%;max-width:860px;max-height:95vh;overflow:hidden;display:flex;flex-direction:column;position:relative;animation:mUp .22s ease;}
        @media(min-width:680px){.mb{flex-direction:row;max-height:90vh;}}
        @keyframes mUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
        .mb-close{position:absolute;top:10px;right:10px;width:30px;height:30px;background:rgba(0,0,0,.45);border:none;cursor:pointer;color:#fff;font-size:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:10;}

        /* FOTOS — mobile: max 52vw altura, desktop: 45% ancho fijo */
        .mb-imgs{flex-shrink:0;width:100%;overflow:hidden;background:#f2f2ef;display:flex;flex-direction:column;}
        @media(max-width:679px){.mb-imgs{max-height:52vw;}}
        @media(min-width:680px){.mb-imgs{width:44%;max-height:none;}}
        .mb-main{flex:1;min-height:0;overflow:hidden;}
        .mb-main img{width:100%;height:100%;object-fit:cover;display:block;}
        .mb-thumbs{display:flex;gap:4px;padding:5px 7px;background:#f8f8f6;overflow-x:auto;flex-shrink:0;}
        .mb-thumb{width:44px;height:55px;object-fit:cover;cursor:pointer;border:2px solid transparent;flex-shrink:0;transition:border-color .12s;}
        .mb-thumb.on{border-color:#c9a84c;}

        /* INFO PANEL — scroll independiente */
        .mb-info{flex:1;min-width:0;overflow-y:auto;padding:20px 20px 16px;display:flex;flex-direction:column;gap:13px;overflow-x:hidden;}
        @media(min-width:680px){.mb-info{padding:26px 26px 20px;}}
        .mb-cat{font-family:'DM Mono',monospace;font-size:7.5px;color:#bbb;letter-spacing:.22em;text-transform:uppercase;}
        .mb-name{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#111;line-height:1.2;}
        .mb-desc{font-family:'Poppins',sans-serif;font-size:12px;color:#666;line-height:1.75;}
        .mb-tela{font-family:'DM Mono',monospace;font-size:8.5px;color:#bbb;letter-spacing:.1em;}
        .mb-vh{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;letter-spacing:.2em;text-transform:uppercase;margin-bottom:7px;}

        /* VARIANTE ROW */
        .vr{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #f0f0ec;cursor:default;transition:border-color .12s;margin-bottom:5px;min-height:52px;}
        .vr:hover:not(.vr-ag){border-color:#c9a84c;}
        .vr.vr-ag{opacity:.38;}
        .vr.vr-sel{border-color:#c9a84c;background:#fffbf0;}
        .vr-clr{width:22px;height:22px;border-radius:50%;border:2px solid rgba(0,0,0,.07);flex-shrink:0;}
        .vr-info{flex:1;min-width:0;}
        .vr-name{font-family:'Poppins',sans-serif;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .vr-niv{font-family:'DM Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;display:flex;align-items:center;gap:5px;margin-top:2px;}
        .vr-right{display:flex;align-items:center;gap:6px;flex-shrink:0;}
        .vr-add{padding:7px 13px;background:#0a0a0a;color:#fff;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;transition:background .15s;white-space:nowrap;}
        .vr-add:hover{background:#c9a84c;color:#000;}
        .qc{display:flex;align-items:center;border:1px solid #e5e5e0;}
        .qb{width:28px;height:28px;border:none;background:#f8f8f6;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .1s;color:#333;}
        .qb:hover{background:#e5e5e0;}
        .qn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:700;border-left:1px solid #e5e5e0;border-right:1px solid #e5e5e0;}

        /* Qty control within variant */
        .qc{display:flex;align-items:center;border:1px solid #e5e5e0;flex-shrink:0;}
        .qb{width:26px;height:26px;border:none;background:#f8f8f6;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:background .1s;color:#333;}
        .qb:hover{background:#e5e5e0;}
        .qn{width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:11px;font-weight:700;border-left:1px solid #e5e5e0;border-right:1px solid #e5e5e0;}
        .vr-add{padding:7px 12px;background:#0a0a0a;color:#fff;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;transition:background .15s;white-space:nowrap;flex-shrink:0;}
        .vr-add:hover{background:#c9a84c;color:#000;}

        /* Bottom sticky bar inside modal */
        .mb-bar{position:sticky;bottom:0;background:#fff;border-top:1px solid #ebebeb;padding:11px 20px;display:flex;gap:8px;align-items:center;}
        @media(min-width:680px){.mb-bar{padding:12px 26px;}}
        .mb-bar-hint{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;flex:1;letter-spacing:.06em;}
        .mb-bar-btn{padding:10px 18px;background:#c9a84c;color:#000;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;transition:background .15s;white-space:nowrap;}
        .mb-bar-btn:hover{background:#e0bc5e;}

        /* CART DRAWER */
        .co{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:600;}
        .cd{position:fixed;top:0;right:0;bottom:0;width:min(390px,100vw);background:#fff;z-index:601;display:flex;flex-direction:column;box-shadow:-6px 0 32px rgba(0,0,0,.14);animation:cR .2s ease;}
        @keyframes cR{from{transform:translateX(100%)}to{transform:none}}
        .cd-h{padding:15px 18px;background:#0a0a0a;display:flex;align-items:center;justify-content:space-between;gap:10px;}
        .cd-title{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:#fff;}
        .cd-count{font-family:'DM Mono',monospace;font-size:8px;color:#c9a84c;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);padding:3px 8px;}
        .cd-cx{width:27px;height:27px;background:none;border:1px solid #333;cursor:pointer;color:#777;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .cd-items{flex:1;overflow-y:auto;}
        .cd-item{display:grid;grid-template-columns:auto 1fr auto;gap:11px;padding:13px 18px;border-bottom:1px solid #f5f5f3;align-items:center;}
        .cd-dot{width:26px;height:26px;border-radius:50%;border:2px solid rgba(0,0,0,.07);flex-shrink:0;}
        .cd-iname{font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;color:#111;}
        .cd-isub{font-family:'DM Mono',monospace;font-size:9px;color:#bbb;margin-top:2px;}
        .cd-iniv{font-family:'DM Mono',monospace;font-size:8px;font-weight:700;margin-top:3px;}
        .cd-ctrl{display:flex;align-items:center;gap:4px;}
        .cd-qc{display:flex;align-items:center;border:1px solid #e5e5e0;}
        .cd-qb{width:27px;height:27px;border:none;background:#f8f8f6;cursor:pointer;font-size:14px;transition:background .1s;}
        .cd-qb:hover{background:#e5e5e0;}
        .cd-qn{width:28px;height:27px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:700;border-left:1px solid #e5e5e0;border-right:1px solid #e5e5e0;}
        .cd-del{background:none;border:none;cursor:pointer;color:#d4d4d4;font-size:13px;padding:3px 5px;transition:color .1s;}
        .cd-del:hover{color:#ef4444;}
        .cd-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:40px;}
        .cd-foot{padding:14px 18px;border-top:1px solid #ebebeb;display:flex;flex-direction:column;gap:9px;}
        .cd-input{width:100%;padding:9px 11px;border:1px solid #e5e5e0;font-family:'Poppins',sans-serif;font-size:12px;outline:none;transition:border-color .15s;}
        .cd-input:focus{border-color:#c9a84c;}
        .cd-hint{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;text-align:center;letter-spacing:.06em;line-height:1.9;padding:0 4px;}
        .cd-wa{width:100%;padding:12px;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;}
        .cd-wa.m{background:#25d366;color:#000;} .cd-wa.m:hover{background:#22c55e;}
        .cd-wa.s{background:#f0f0ec;color:#555;} .cd-wa.s:hover{background:#e5e5e0;}
        .cd-clr{padding:6px;background:none;border:1px solid #f0f0ec;cursor:pointer;font-family:'DM Mono',monospace;font-size:8px;color:#ccc;letter-spacing:.1em;text-transform:uppercase;transition:all .1s;}
        .cd-clr:hover{border-color:#ef4444;color:#ef4444;}

        /* WA FLOAT */
        .wf{position:fixed;bottom:22px;left:18px;z-index:300;width:48px;height:48px;border-radius:50%;background:#25d366;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:21px;box-shadow:0 4px 16px rgba(37,211,102,.4);text-decoration:none;transition:transform .15s;}
        .wf:hover{transform:scale(1.1);}

        /* FOOTER */
        .foot{background:#0a0a0a;padding:32px 24px;margin-top:48px;text-align:center;}
        .foot-brand{display:flex;align-items:center;justify-content:center;gap:11px;margin-bottom:13px;}
        .foot-brand img{height:38px;width:38px;object-fit:contain;}
        .foot-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:#fff;letter-spacing:.08em;}
        .foot-sub{font-family:'DM Mono',monospace;font-size:6px;color:#c9a84c;letter-spacing:.45em;text-transform:uppercase;margin-top:3px;}
        .foot-info{font-family:'DM Mono',monospace;font-size:8.5px;color:rgba(255,255,255,.2);letter-spacing:.1em;line-height:2.3;}
        .foot-info a{color:#c9a84c;text-decoration:none;}

        /* EMPTY */
        .empty{text-align:center;padding:70px 24px;}
        .empty-icon{font-size:44px;margin-bottom:12px;}
        .empty-txt{font-family:'DM Mono',monospace;font-size:11px;color:#bbb;margin-bottom:14px;line-height:1.8;}
        .empty-btn{padding:8px 20px;background:#0a0a0a;color:#fff;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:11px;font-weight:600;}

        @media(max-width:520px){
          .nav{padding:0 14px;} .hero{padding:22px 14px;} .filt{padding:9px 14px;}
          .sec-h{padding:11px 14px 8px;} .grid{grid-template-columns:repeat(2,1fr);}
          .hero-t{font-size:25px;} .foot{padding:26px 14px;margin-top:36px;}
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/catalogo" className="nav-brand">
          <img src={ISOTIPO} alt="M"/>
          <div><div className="nav-name">MODITEX</div><span className="nav-sub">GROUP</span></div>
        </a>
        <button className="nav-cart" onClick={() => setCartOpen(true)}>
          🛒 Mi pedido {totalItems>0 && <span className="nav-badge">{totalItems}</span>}
        </button>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-ey">Colección disponible</div>
        <div className="hero-t">Moditex Group</div>
        <div className="hero-s">Fabricamos tu propia marca · Venta al mayor</div>
        {modelos.length>0 && <div style={{fontFamily:"'DM Mono',monospace",fontSize:'8px',color:'rgba(255,255,255,.2)',marginTop:'5px',letterSpacing:'.1em'}}>{modelos.length} prenda{modelos.length!==1?'s':''} en catálogo</div>}
        <div className="hero-lv">
          {Object.entries(NIVEL).map(([k,v]) => (
            <div key={k} className="hero-lv-i">
              <span style={{width:'6px',height:'6px',borderRadius:'50%',background:v.dot,display:'inline-block'}}/>
              {v.label}
            </div>
          ))}
        </div>
      </div>

      {/* FILTROS */}
      <div className="filt">
        <input className="filt-srch" placeholder="Buscar prenda…" value={buscar} onChange={e=>setBuscar(e.target.value)}/>
        <button className={`filt-tag${!filtrocat?' on':''}`} onClick={()=>setFiltrocat('')}>Todas</button>
        {categorias.map(cat => (
          <button key={cat} className={`filt-tag${filtrocat===cat?' on':''}`} onClick={()=>setFiltrocat(filtrocat===cat?'':cat)}>
            {catIcon(cat)} {cat}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      {loading ? (
        <div className="empty"><div className="empty-icon">✨</div><div className="empty-txt">Cargando catálogo…</div></div>
      ) : error ? (
        <div className="empty"><div className="empty-icon">⚠️</div><div className="empty-txt">{error}</div><button className="empty-btn" onClick={cargar}>Reintentar</button></div>
      ) : modelos.length===0 ? (
        <div className="empty"><div className="empty-icon">🏷️</div><div className="empty-txt">El catálogo está vacío por el momento.<br/>Pronto habrá novedades.</div></div>
      ) : filtrados.length===0 ? (
        <div className="empty"><div className="empty-icon">🔍</div><div className="empty-txt">Sin resultados para "{buscar||filtrocat}"</div><button className="empty-btn" onClick={()=>{setBuscar('');setFiltrocat('');}}>Ver todas</button></div>
      ) : (
        (filtrocat ? [filtrocat] : categorias.filter(c=>filtrados.some(m=>m.categoria===c))).map(cat => {
          const items = filtrados.filter(m=>m.categoria===cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <div className="sec-h">
                <span style={{fontSize:'16px'}}>{catIcon(cat)}</span>
                <span className="sec-h-name">{cat}</span>
                <span className="sec-h-cnt">· {items.length}</span>
              </div>
              <div className="grid">
                {items.map(modelo => {
                  const varDisp = modelo.variantes.filter(v=>v.nivel!=='agotado');
                  const ngen = varDisp.length===0?'agotado':varDisp.some(v=>v.nivel==='disponible')?'disponible':'pocas';
                  const nc = NIVEL[ngen];
                  const colores = {};
                  modelo.variantes.forEach(v=>{colores[v.color]=v.nivel;});
                  return (
                    <div key={modelo.key} className="card" onClick={()=>abrirModal(modelo)}>
                      <div className="card-img">
                        {modelo.foto_url ? <img src={modelo.foto_url} alt={modelo.modelo} loading="lazy"/> : <div className="card-no-img">{catIcon(modelo.categoria)}</div>}
                        <div className="card-badge" style={{background:nc.bg,color:nc.text}}>{nc.label}</div>
                      </div>
                      <div className="card-body">
                        <div className="card-cat">{modelo.categoria}</div>
                        <div className="card-name">{modelo.modelo}</div>
                        {modelo.descripcion && <div className="card-desc">{modelo.descripcion}</div>}
                        <div className="card-colors">
                          {Object.entries(colores).slice(0,10).map(([color,nivel])=>(
                            <div key={color} className="card-dot" title={color} style={{background:colorFromName(color),opacity:nivel==='agotado'?.28:1}}/>
                          ))}
                          {Object.keys(colores).length>10 && <span style={{fontFamily:"'DM Mono',monospace",fontSize:'8px',color:'#bbb',lineHeight:'13px'}}>+{Object.keys(colores).length-10}</span>}
                        </div>
                        <div className="card-foot">
                          <div className="card-niv"><span style={{width:'5px',height:'5px',borderRadius:'50%',background:nc.dot,display:'inline-block'}}/><span style={{color:nc.text}}>{nc.label}</span></div>
                          <button className="card-btn" onClick={e=>{e.stopPropagation();abrirModal(modelo);}}>Ver →</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* MODAL */}
      {modal && (
        <div className="mo" onClick={cerrarModal}>
          <div className="mb" onClick={e=>e.stopPropagation()}>
            <button className="mb-close" onClick={cerrarModal}>✕</button>

            {/* FOTOS */}
            <div className="mb-imgs">
              <div className="mb-main" style={{position:'relative'}}>
                {fotosModal.length>0
                  ? <img src={fotosModal[fotoIdx]} alt={modal.modelo}/>
                  : <div style={{width:'100%',height:'100%',minHeight:'220px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'52px',color:'#ccc',background:'#f2f2ef'}}>{catIcon(modal.categoria)}</div>
                }
                {/* Price overlay */}
                <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.35) 65%,transparent 100%)',padding:'36px 18px 14px',display:'flex',gap:'0',alignItems:'flex-end'}}>
                  <div style={{flex:1,borderRight:'1px solid rgba(255,255,255,.1)',paddingRight:'14px',marginRight:'14px'}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'rgba(255,255,255,.45)',letterSpacing:'.25em',textTransform:'uppercase',marginBottom:'4px',textShadow:'0 1px 4px rgba(0,0,0,1)'}}>AL MAYOR</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'30px',fontWeight:700,color:'#c9a84c',textShadow:'0 2px 12px rgba(0,0,0,1)',lineHeight:1,letterSpacing:'-.01em'}}>€{(modal.precioMayor||0).toFixed(2)}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'rgba(255,255,255,.45)',letterSpacing:'.25em',textTransform:'uppercase',marginBottom:'4px',textShadow:'0 1px 4px rgba(0,0,0,1)'}}>AL DETAL</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'30px',fontWeight:700,color:'#fff',textShadow:'0 2px 12px rgba(0,0,0,1)',lineHeight:1,letterSpacing:'-.01em'}}>€{(modal.precioDetal||0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
              {fotosModal.length>1 && (
                <div className="mb-thumbs">
                  {fotosModal.map((f,i)=>(
                    <img key={i} src={f} className={`mb-thumb${fotoIdx===i?' on':''}`} onClick={()=>setFotoIdx(i)} alt=""/>
                  ))}
                </div>
              )}
            </div>

            {/* INFO + BAR wrapper — columna flex para que la barra quede pegada al fondo */}
            <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
            {/* INFO */}
            <div className="mb-info">
              <div>
                <div className="mb-cat">{catIcon(modal.categoria)} {modal.categoria}</div>
                <div className="mb-name">{modal.modelo}</div>
              </div>
              {modal.descripcion && <div className="mb-desc">{modal.descripcion}</div>}
              {modal.tela && <div className="mb-tela">Tela: {modal.tela}</div>}

              {/* VARIANTES */}
              <div>
                <div className="mb-vh">Elige tu color</div>
                {modal.variantes.map(v => {
                  const nc = NIVEL[v.nivel];
                  const inCart = isInCart(v.sku);
                  const qty = cartQty(v.sku);
                  return (
                    <div key={v.sku} className={`vr${v.nivel==='agotado'?' vr-ag':''}${inCart?' vr-sel':''}`}>
                      <div className="vr-clr" style={{background:colorFromName(v.color)}}/>
                      <div className="vr-info">
                        <div className="vr-name">
                          {v.color}{v.talla&&v.talla!=='UNICA'&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:'9px',color:'#aaa',marginLeft:'5px'}}>T:{v.talla}</span>}
                        </div>
                        <div className="vr-niv" style={{color:nc.text}}>
                          <span style={{width:'7px',height:'7px',borderRadius:'50%',background:nc.dot,display:'inline-block',flexShrink:0}}/>
                          <span style={{fontWeight:800}}>{nc.label}</span>
                          {(v.nivel==='pocas'||v.nivel==='disponible')&&v.disponible>0&&v.disponible<=20&&(
                            <span style={{opacity:.65,fontWeight:400}}>· {v.disponible} disp.</span>
                          )}
                        </div>
                      </div>
                      {/* Derecha: siempre mismo espacio */}
                      <div className="vr-right">
                        {v.nivel!=='agotado' && (
                          inCart ? (
                            <>
                              <div className="qc">
                                <button className="qb" onClick={e=>{e.stopPropagation();if(qty===1)removeFromCart(v.sku);else changeQty(v.sku,-1);}}>−</button>
                                <span className="qn">{qty}</span>
                                <button className="qb" onClick={e=>{e.stopPropagation();changeQty(v.sku,1);}}>+</button>
                              </div>
                              <button onClick={e=>{e.stopPropagation();removeFromCart(v.sku);}}
                                style={{width:'24px',height:'24px',background:'none',border:'1px solid #f0f0ec',cursor:'pointer',color:'#ccc',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s',flexShrink:0}}
                                onMouseEnter={e=>{e.currentTarget.style.color='#ef4444';e.currentTarget.style.borderColor='#ef4444';}}
                                onMouseLeave={e=>{e.currentTarget.style.color='#ccc';e.currentTarget.style.borderColor='#f0f0ec';}}>✕</button>
                            </>
                          ) : (
                            <button className="vr-add" onClick={e=>{e.stopPropagation();addToCart(modal,v);}}>+ Pedir</button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{padding:'9px 11px',background:'#fffbf0',border:'1px solid #fde68a44',fontFamily:"'DM Mono',monospace",fontSize:'9px',color:'#92400e',lineHeight:1.8}}>
                💡 Selecciona el color y la cantidad. Cuando estés lista, envía tu pedido por WhatsApp.
              </div>
            </div>

            {/* BARRA PEDIDO — fija al fondo del panel info */}
            {totalItems>0 && (
              <div style={{flexShrink:0,background:'#fff',borderTop:'2px solid #c9a84c',padding:'10px 20px',display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'7px',flex:1}}>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#16c65a',display:'inline-block',flexShrink:0}}/>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:'9px',color:'#555',fontWeight:700}}>{totalItems} prenda{totalItems!==1?'s':''} en pedido</span>
                </div>
                <button style={{padding:'10px 20px',background:'#c9a84c',color:'#000',border:'none',cursor:'pointer',fontFamily:"'Poppins',sans-serif",fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',flexShrink:0,transition:'background .15s'}}
                  onClick={()=>{cerrarModal();setCartOpen(true);}}
                  onMouseEnter={e=>e.currentTarget.style.background='#e0bc5e'}
                  onMouseLeave={e=>e.currentTarget.style.background='#c9a84c'}>
                  Ver pedido →
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* CARRITO */}
      {cartOpen && (
        <>
          <div className="co" onClick={()=>setCartOpen(false)}/>
          <div className="cd">
            <div className="cd-h">
              <div className="cd-title">Mi Pedido</div>
              {carrito.length>0 && <span className="cd-count">{totalItems} prenda{totalItems!==1?'s':''}</span>}
              <button className="cd-cx" onClick={()=>setCartOpen(false)}>✕</button>
            </div>

            {carrito.length===0 ? (
              <div className="cd-empty">
                <span style={{fontSize:'38px'}}>🛒</span>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:'10px',color:'#bbb',textAlign:'center'}}>Tu pedido está vacío</span>
                <button onClick={()=>setCartOpen(false)} style={{padding:'8px 18px',background:'#0a0a0a',color:'#fff',border:'none',cursor:'pointer',fontFamily:"'Poppins',sans-serif",fontSize:'11px',fontWeight:600,marginTop:'5px'}}>Ver catálogo</button>
              </div>
            ) : (
              <>
                <div className="cd-items">
                  {carrito.map(item => {
                    const nc = NIVEL[item.nivel];
                    return (
                      <div key={item.sku} className="cd-item">
                        <div className="cd-dot" style={{background:colorFromName(item.color)}}/>
                        <div>
                          <div className="cd-iname">{item.modelo}</div>
                          <div className="cd-isub">{item.color}{item.talla&&item.talla!=='UNICA'?' · T:'+item.talla:''}</div>
                          <div className="cd-iniv" style={{color:nc.text}}>{nc.label}</div>
                        </div>
                        <div className="cd-ctrl">
                          <div className="cd-qc">
                            <button className="cd-qb" onClick={()=>{if(item.qty===1)removeFromCart(item.sku);else changeQty(item.sku,-1);}}>−</button>
                            <span className="cd-qn">{item.qty}</span>
                            <button className="cd-qb" onClick={()=>changeQty(item.sku,1)}>+</button>
                          </div>
                          <button className="cd-del" onClick={()=>removeFromCart(item.sku)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="cd-foot">
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:'8px',color:'#bbb',letterSpacing:'.12em',textTransform:'uppercase'}}>Tu nombre</div>
                  <input className="cd-input" placeholder="ej: María González" value={nombre} onChange={e=>setNombre(e.target.value)}/>
                  <div className="cd-hint">Tu pedido se enviará por WhatsApp.<br/>Una asesora te confirma el monto.</div>
                  <button className="cd-wa m" onClick={()=>sendWA(WA_NUMBER)}>📱 Enviar · WA 1</button>
                  <button className="cd-wa s" onClick={()=>sendWA(WA_NUMBER2)}>📱 Enviar · WA 2</button>
                  <button className="cd-clr" onClick={()=>setCarrito([])}>Vaciar pedido</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* FOOTER */}
      <div className="foot">
        <div className="foot-brand">
          <img src={ISOTIPO} alt="M"/>
          <div><div className="foot-name">MODITEX</div><div className="foot-sub">GROUP</div></div>
        </div>
        <div className="foot-info">
          BARQUISIMETO · VENEZUELA<br/>
          <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer">+58 412-036-3131</a>
          {' · '}
          <a href={`https://wa.me/${WA_NUMBER2}`} target="_blank" rel="noreferrer">+58 412-753-4435</a>
        </div>
      </div>

      <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="wf">💬</a>
    </div>
  );
}


function colorFromName(name) {
  const n=(name||'').toLowerCase().trim();
  const m={'negro':'#1a1a1a','blanco':'#f5f5f0','rojo':'#dc2626','azul':'#2563eb','azul marino':'#1e3a5f','azul rey':'#1d4ed8','verde':'#16a34a','verde oscuro':'#14532d','verde pistacho':'#84cc16','amarillo':'#eab308','rosado':'#ec4899','rosa':'#f472b6','morado':'#9333ea','violeta':'#7c3aed','lila':'#a78bfa','naranja':'#ea580c','salmon':'#fb923c','coral':'#f87171','beige':'#d4b896','camel':'#b87c4c','café':'#92400e','cafe':'#92400e','marrón':'#78350f','marron':'#78350f','gris':'#6b7280','gris claro':'#d1d5db','gris oscuro':'#374151','nude':'#e8c9a0','vinotinto':'#7f1d1d','vino':'#7f1d1d','blanco crema':'#fefce8','turquesa':'#0d9488','celeste':'#38bdf8','fucsia':'#d946ef','terracota':'#b45309','dorado':'#d97706','plateado':'#94a3b8','chocolate':'#431407','caqui':'#a3a36a'};
  for(const[k,v] of Object.entries(m)){if(n.includes(k))return v;}
  let h=0; for(let i=0;i<name.length;i++)h=name.charCodeAt(i)+((h<<5)-h);
  return `hsl(${Math.abs(h)%360},40%,52%)`;
}