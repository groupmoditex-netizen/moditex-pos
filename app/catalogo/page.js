'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabasePublic } from '@/lib/supabase-client';

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

const METODOS_ENVIO = ['MRW','Zoom','Retiro en tienda','Otro'];

function safeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.replace(/ /g, '%20');
}

// ── Sonido al agregar al carrito (Web Audio API nativa) ───────────────────────
function playAddSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Nota 1: Do5 (523Hz)
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.connect(g1); g1.connect(ctx.destination);
    o1.frequency.value = 523.25;
    o1.type = 'sine';
    g1.gain.setValueAtTime(0, ctx.currentTime);
    g1.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.01);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.12);
    // Nota 2: Mi5 (659Hz)
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.frequency.value = 659.25;
    o2.type = 'sine';
    g2.gain.setValueAtTime(0, ctx.currentTime + 0.09);
    g2.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.10);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    o2.start(ctx.currentTime + 0.09); o2.stop(ctx.currentTime + 0.22);
  } catch (_) { /* silencioso si el navegador bloquea */ }
}

export default function CatalogoPage() {
  const [modelos,      setModelos]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [filtrocat,    setFiltrocat]    = useState('');
  const [buscar,       setBuscar]       = useState('');
  const [modal,        setModal]        = useState(null);
  const [fotoIdx,      setFotoIdx]      = useState(0);
  const [carrito,      setCarrito]      = useState([]);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [nombre,       setNombre]       = useState('');
  const [email,        setEmail]        = useState('');
  const [emailError,   setEmailError]   = useState('');
  const [metodoEnvio,  setMetodoEnvio]  = useState('');
  const [opening,      setOpening]      = useState(true);
  const [lightbox,     setLightbox]     = useState(false);
  const [enviando,     setEnviando]     = useState(false);
  const [settings,     setSettings]     = useState({
    email_requerido: false, email_incentivo: '', email_boton_texto: 'Obtener oferta',
    mensaje_banner: '', mensaje_tipo: 'info', mensaje_activo: false,
    flash_activo: false, flash_texto: '', flash_hasta: '', flash_color: '#ef4444',
  });
  const [infoOpen,     setInfoOpen]     = useState(false);
  const [combos,       setCombos]       = useState([]);
  const [combosLoad,   setCombosLoad]   = useState(true);
  const [soloDisp,     setSoloDisp]     = useState(false);
  const [modalIdx,     setModalIdx]     = useState(-1);
  const [comboLightbox, setComboLightbox] = useState(null); // { fotos:[], idx:0 }
  const [flashTiempo,  setFlashTiempo]  = useState('');

  const cargarRef = useRef(null);

  async function cargar() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/catalogo').then(r => r.json());
      if (res.ok) setModelos(res.modelos || []);
      else setError(res.error || 'Error al cargar');
    } catch { setError('No se pudo conectar'); }
    setLoading(false);
  }

  cargarRef.current = cargar;

  useEffect(() => {
    cargar();
    fetch('/api/catalogo-settings').then(r => r.json()).then(res => {
      if (res.ok) setSettings({
        email_requerido: res.email_requerido,
        email_incentivo: res.email_incentivo,
        email_boton_texto: res.email_boton_texto,
        mensaje_banner: res.mensaje_banner || '',
        mensaje_tipo: res.mensaje_tipo || 'info',
        mensaje_activo: res.mensaje_activo || false,
        flash_activo: res.flash_activo || false,
        flash_texto: res.flash_texto || '',
        flash_hasta: res.flash_hasta || '',
        flash_color: res.flash_color || '#ef4444',
      });
    }).catch(() => {});

    // Cargar combos
    fetch('/api/combos').then(r => r.json()).then(res => {
      if (res.ok) setCombos(res.combos || []);
    }).catch(() => {}).finally(() => setCombosLoad(false));

    setTimeout(() => setOpening(false), 900);

    function onVisible() {
      if (document.visibilityState === 'visible') cargarRef.current();
    }
    document.addEventListener('visibilitychange', onVisible);

    const channel = supabasePublic
      .channel('moditex-catalogo-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalogo_config' }, () => { cargarRef.current(); })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') console.warn('[Catálogo] Realtime no disponible');
      });

    const interval = setInterval(() => cargarRef.current(), 300_000);

    // Cuenta regresiva para oferta flash — actualiza cada segundo
    const flashInterval = setInterval(() => {
      setSettings(s => {
        if (!s.flash_activo || !s.flash_hasta) { setFlashTiempo(''); return s; }
        const diff = new Date(s.flash_hasta).getTime() - Date.now();
        if (diff <= 0) { setFlashTiempo('Expirada'); return s; }
        const h  = Math.floor(diff / 3_600_000);
        const m  = Math.floor((diff % 3_600_000) / 60_000);
        const sc = Math.floor((diff % 60_000) / 1_000);
        setFlashTiempo(h > 0
          ? `${h}h ${String(m).padStart(2,'0')}m ${String(sc).padStart(2,'0')}s`
          : `${String(m).padStart(2,'0')}m ${String(sc).padStart(2,'0')}s`
        );
        return s;
      });
    }, 1_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
      clearInterval(flashInterval);
      supabasePublic.removeChannel(channel);
    };
  }, []);

  const categorias = useMemo(() => [...new Set(modelos.map(m => m.categoria))].sort(), [modelos]);
  const filtrados  = useMemo(() => {
    let r = modelos;
    if (soloDisp) r = r.filter(m => m.variantes.some(v => v.nivel !== 'agotado'));
    if (filtrocat) r = r.filter(m => m.categoria === filtrocat);
    if (buscar.trim()) { const q = buscar.toLowerCase(); r = r.filter(m => `${m.modelo} ${m.categoria} ${m.descripcion}`.toLowerCase().includes(q)); }
    return r;
  }, [modelos, filtrocat, buscar, soloDisp]);

  useEffect(() => {
    function onKey(e) {
      if (modal) {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); irModal(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); irModal(1); }
        if (e.key === 'Escape')     { cerrarModal(); }
      }
      if (comboLightbox) {
        if (e.key === 'Escape') cerrarComboLightbox();
        if (e.key === 'ArrowLeft')  setComboLightbox(p => p && ({...p, idx:(p.idx-1+p.fotos.length)%p.fotos.length}));
        if (e.key === 'ArrowRight') setComboLightbox(p => p && ({...p, idx:(p.idx+1)%p.fotos.length}));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, modalIdx, filtrados, comboLightbox]);

  function addToCart(modelo, v) {
    if (v.disponible <= 0) return;
    playAddSound();
    setCarrito(prev => {
      const ex = prev.find(x => x.sku === v.sku);
      const stockMax = v.disponible;
      if (ex) {
        if (ex.qty >= stockMax) return prev; // ya en el límite
        return prev.map(x => x.sku===v.sku ? {...x, qty:x.qty+1} : x);
      }
      return [...prev, {sku:v.sku, modelo:modelo.modelo, color:v.color, talla:v.talla, nivel:v.nivel, qty:1, stockMax}];
    });
  }

  function addComboToCart(combo, colorDatos) {
    playAddSound();
    const comboSku = `COMBO-${combo.id}-${colorDatos.color.replace(/\s+/g,'-')}`;
    setCarrito(prev => {
      const ex = prev.find(x => x.sku === comboSku);
      if (ex) return prev.map(x => x.sku === comboSku ? {...x, qty: x.qty + 1} : x);
      return [...prev, {
        sku:        comboSku,
        modelo:     combo.nombre,
        color:      colorDatos.color,
        talla:      colorDatos.piezas.map(p => p.modelo).join(' + '),
        nivel:      'disponible',
        qty:        1,
        esCombo:    true,
        stockCombo: colorDatos.stock,
      }];
    });
  }
  function removeFromCart(sku) { setCarrito(prev => prev.filter(x => x.sku!==sku)); }
  function changeQty(sku, d) {
    setCarrito(prev => prev.map(x => {
      if (x.sku !== sku) return x;
      const max = x.stockMax ?? 999;
      return {...x, qty: Math.min(max, Math.max(1, x.qty + d))};
    }));
  }
  const totalItems = carrito.reduce((a,x) => a+x.qty, 0);
  const cartQty    = (sku) => carrito.find(x=>x.sku===sku)?.qty || 0;
  const isInCart   = (sku) => carrito.some(x=>x.sku===sku);

  function consultarProducto(modelo, e) {
    e.stopPropagation();
    const msg = `Hola! 👋 Estoy viendo el catálogo de Moditex y tengo una consulta sobre la prenda *${modelo.modelo}* (${modelo.categoria}).\n\n¿Podrían darme más información? 🙏`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function sendWA(num) {
    if (!carrito.length) return;
    if (settings.email_requerido && !email.trim()) {
      setEmailError('⚠ Por favor ingresa tu correo electrónico para continuar.');
      return;
    }
    if (email.trim() && !email.includes('@')) {
      setEmailError('⚠ Correo electrónico inválido.');
      return;
    }
    setEmailError('');
    setEnviando(true);

    if (email.trim()) {
      try {
        await fetch('/api/emails-catalogo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), nombre: nombre.trim() || null }),
        });
      } catch (_) {}
    }

    const lines = carrito.map(i => {
      if (i.esCombo) {
        return `  • ${i.qty}x SET ${i.modelo} — ${i.color}\n    (${i.talla})`;
      }
      return `  • ${i.qty}x ${i.modelo} — ${i.color}${i.talla&&i.talla!=='UNICA'?' (T:'+i.talla+')':''}`;
    }).join('\n');
    const envioLine = metodoEnvio ? `\n\n📦 *Método de envío:* ${metodoEnvio}` : '';
    const emailLine = email.trim() ? `\n📧 *Correo:* ${email.trim()}` : '';
    const msg = `Hola, mi nombre es *${nombre||'Cliente'}* y este es mi pedido:\n\n${lines}${envioLine}${emailLine}\n\nPor favor confírmenme el monto para proceder con el pago. ¡Gracias! 🙏`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    setEnviando(false);
  }

  const fotosModal = useMemo(() => {
    if (!modal) return [];
    const f = [];
    if (modal.foto_url) f.push(safeUrl(modal.foto_url));
    if (modal.fotos_extra) {
      modal.fotos_extra.split(',').map(s => safeUrl(s.trim())).filter(Boolean).forEach(u => f.push(u));
    }
    return f;
  }, [modal]);

  function abrirComboLightbox(combo) {
    const fotos = [];
    if (combo.foto_url) fotos.push(safeUrl(combo.foto_url));
    if (combo.fotos_extra) {
      combo.fotos_extra.split(',').map(s => safeUrl(s.trim())).filter(Boolean).forEach(u => fotos.push(u));
    }
    if (!fotos.length) return;
    setComboLightbox({ fotos, idx: 0, nombre: combo.nombre });
    document.body.style.overflow = 'hidden';
  }
  function cerrarComboLightbox() { setComboLightbox(null); document.body.style.overflow = ''; }

  function abrirModal(m, idx) { setModal(m); setFotoIdx(0); setModalIdx(idx ?? filtrados.findIndex(x => x.key === m.key)); document.body.style.overflow='hidden'; }
  function cerrarModal()  { setModal(null); setModalIdx(-1); document.body.style.overflow=''; }
  function irModal(dir) {
    const next = modalIdx + dir;
    if (next < 0 || next >= filtrados.length) return;
    setModal(filtrados[next]); setFotoIdx(0); setModalIdx(next);
  }

  return (
    <div style={{minHeight:'100vh',background:'#fafaf8',fontFamily:"'Poppins',sans-serif"}}>
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
        .cat-cut-top,.cat-cut-bot{position:fixed;left:0;right:0;height:50vh;background:#0a0a0a;z-index:900;transition:transform .65s cubic-bezier(.77,0,.175,1);}
        .cat-cut-top{top:0;transform:translateY(0);}
        .cat-cut-bot{bottom:0;transform:translateY(0);}
        .cat-cut-top.open{transform:translateY(-100%);}
        .cat-cut-bot.open{transform:translateY(100%);}
        .cat-scissors{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:901;animation:catScissors .9s cubic-bezier(.68,-0.55,.27,1.55) forwards;}
        @keyframes catScissors{0%{transform:translate(-50%,-50%) scale(0);opacity:0;}25%{transform:translate(-50%,-50%) scale(1.2);opacity:1;}55%{transform:translate(-50%,-50%) scale(1) rotate(0deg);opacity:1;}100%{transform:translate(-50%,-130vh) scale(0.6);opacity:0;}}
        .cat-cut-line{position:fixed;left:0;right:0;top:50%;height:2px;background:linear-gradient(to right,transparent,#c9a84c,#fff,#c9a84c,transparent);z-index:902;animation:catLine .3s ease .1s forwards;opacity:0;}
        @keyframes catLine{0%{opacity:0;transform:scaleX(0);}50%{opacity:1;transform:scaleX(1);}100%{opacity:0;transform:scaleX(1);}}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#f0f0ec;border-radius:4px}::-webkit-scrollbar-thumb{background:#bbb;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:#888}
        .mb-nav{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;background:rgba(10,10,10,.65);border:none;cursor:pointer;color:#fff;font-size:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:15;transition:background .15s;backdrop-filter:blur(4px);}
        .mb-nav:hover{background:rgba(201,168,76,.9);color:#000;}
        .mb-nav:disabled{opacity:.15;cursor:default;}
        .mb-nav-prev{left:8px;}.mb-nav-next{right:8px;}
        .nav{background:#0a0a0a;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:200;border-bottom:1px solid #1a1a1a;}
        .nav-brand{display:flex;align-items:center;gap:9px;text-decoration:none;}
        .nav-brand img{height:30px;width:30px;object-fit:contain;}
        .nav-name{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:#fff;letter-spacing:.1em;}
        .nav-sub{font-family:'DM Mono',monospace;font-size:5.5px;color:#c9a84c;letter-spacing:.45em;text-transform:uppercase;display:block;margin-top:1px;}
        .nav-right{display:flex;align-items:center;gap:8px;}
        .nav-info{display:flex;align-items:center;gap:5px;padding:7px 12px;background:transparent;color:rgba(255,255,255,.5);border:1px solid #333;cursor:pointer;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;transition:all .15s;white-space:nowrap;}
        .nav-info:hover,.nav-info.on{color:#c9a84c;border-color:#c9a84c;}
        .nav-cart{display:flex;align-items:center;gap:7px;padding:7px 14px;background:#c9a84c;color:#000;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;transition:background .15s;}
        .nav-cart:hover{background:#e0bc5e;}
        .nav-badge{background:#000;color:#c9a84c;border-radius:50%;width:16px;height:16px;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;}
        .banner-admin{padding:10px 24px;font-family:'Poppins',sans-serif;font-size:12px;line-height:1.6;display:flex;align-items:center;gap:10px;}
        .flash-bar{display:flex;align-items:center;gap:12px;padding:10px 24px;flex-wrap:wrap;}
        .flash-txt{font-family:'DM Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.06em;flex:1;min-width:0;}
        .flash-timer{font-family:'DM Mono',monospace;font-size:13px;font-weight:800;letter-spacing:.08em;background:rgba(255,255,255,.18);padding:4px 10px;border-radius:4px;white-space:nowrap;flex-shrink:0;}
        .hero{background:#0a0a0a;padding:28px 24px;text-align:center;}
        .hero-ey{font-family:'DM Mono',monospace;font-size:8px;color:#c9a84c;letter-spacing:.3em;text-transform:uppercase;margin-bottom:7px;}
        .hero-t{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:#fff;line-height:1.1;}
        .hero-s{font-family:'Poppins',sans-serif;font-size:11px;color:rgba(255,255,255,.3);margin-top:5px;}
        .hero-lv{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin-top:14px;}
        .hero-lv-i{display:flex;align-items:center;gap:5px;font-family:'DM Mono',monospace;font-size:8px;color:rgba(255,255,255,.25);letter-spacing:.06em;}
        .info-banner{background:#fff;border-bottom:2px solid #f0ede6;overflow:hidden;transition:max-height .35s ease;}
        .info-inner{padding:22px 24px 26px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;}
        .info-blk{padding:13px 15px;background:#fafaf8;border:1px solid #ebebeb;border-left:3px solid #c9a84c;}
        .info-blk-t{font-family:'DM Mono',monospace;font-size:7.5px;letter-spacing:.22em;text-transform:uppercase;color:#c9a84c;font-weight:700;margin-bottom:6px;}
        .info-blk-b{font-family:'Poppins',sans-serif;font-size:11px;color:#555;line-height:1.75;}
        .info-pagos{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
        .info-pago{padding:3px 9px;background:#0a0a0a;color:#c9a84c;font-family:'DM Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.08em;}
        .filt{background:#fff;border-bottom:1px solid #ebebeb;padding:11px 24px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;position:sticky;top:56px;z-index:100;}
        .filt-srch{flex:1;min-width:160px;max-width:260px;padding:7px 12px;border:1px solid #e5e5e0;font-family:'Poppins',sans-serif;font-size:12px;outline:none;background:#fafaf8;transition:border-color .15s;}
        .filt-srch:focus{border-color:#c9a84c;}
        .filt-tag{padding:5px 12px;border:1px solid #e5e5e0;background:#fff;cursor:pointer;font-family:'DM Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#aaa;transition:all .12s;white-space:nowrap;}
        .filt-tag:hover{color:#0a0a0a;border-color:#0a0a0a;}
        .filt-tag.on{background:#0a0a0a;color:#c9a84c;border-color:#0a0a0a;}
        .sec-h{padding:14px 24px 10px;background:#fafaf8;border-bottom:1px solid #ebebeb;display:flex;align-items:baseline;gap:9px;}
        .sec-h-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:#111;}
        .sec-h-cnt{font-family:'DM Mono',monospace;font-size:8.5px;color:#bbb;letter-spacing:.1em;}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1px;background:#ebebeb;}
        .card{background:#fff;cursor:pointer;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s;position:relative;}
        .card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.09);z-index:2;}
        .card-img{aspect-ratio:3/4;overflow:hidden;background:#f2f2ef;position:relative;}
        .card-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s;}
        .card:hover .card-img img{transform:scale(1.05);}
        .card-no-img{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:44px;color:#d8d8d2;}
        .card-badge{position:absolute;top:9px;left:9px;padding:3px 8px;font-family:'DM Mono',monospace;font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;}
        .card-consult{position:absolute;bottom:9px;right:9px;padding:5px 10px;background:rgba(10,10,10,.82);color:#fff;border:none;cursor:pointer;font-family:'DM Mono',monospace;font-size:7.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;backdrop-filter:blur(4px);transition:background .15s;white-space:nowrap;}
        .card-consult:hover{background:#25d366;color:#000;}
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
        .mo{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:500;display:flex;align-items:flex-end;justify-content:center;animation:mFade .18s ease;}
        @media(min-width:680px){.mo{align-items:center;padding:20px;}}
        @keyframes mFade{from{opacity:0}to{opacity:1}}
        .mb{background:#fff;width:100%;max-width:860px;max-height:95vh;overflow:hidden;display:flex;flex-direction:column;position:relative;animation:mUp .22s ease;}
        @media(min-width:680px){.mb{flex-direction:row;max-height:90vh;}}
        @keyframes mUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}
        .mb-close{position:absolute;top:10px;right:10px;width:30px;height:30px;background:rgba(0,0,0,.45);border:none;cursor:pointer;color:#fff;font-size:13px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:10;}
        .mb-imgs{flex-shrink:0;width:100%;overflow:hidden;background:#f2f2ef;display:flex;flex-direction:column;}
        @media(max-width:679px){.mb-imgs{max-height:88vw;}}
        @media(min-width:680px){.mb-imgs{width:44%;max-height:none;}}
        .mb-main{flex:1;min-height:0;overflow:hidden;}@media(max-width:679px){.mb-main{min-height:70vw;}}
        .mb-main img{width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in;}
        .lb{position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:800;display:flex;align-items:center;justify-content:center;animation:mFade .15s ease;}
        .lb img{max-width:100vw;max-height:100vh;object-fit:contain;touch-action:pinch-zoom;}
        .lb-close{position:absolute;top:14px;right:14px;width:36px;height:36px;background:rgba(255,255,255,.12);border:none;cursor:pointer;color:#fff;font-size:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
        .lb-prev,.lb-next{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;background:rgba(255,255,255,.12);border:none;cursor:pointer;color:#fff;font-size:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
        .lb-prev{left:14px;}.lb-next{right:14px;}
        .mb-thumbs{display:flex;gap:4px;padding:5px 7px;background:#f8f8f6;overflow-x:auto;flex-shrink:0;}
        .mb-thumb{width:44px;height:55px;object-fit:cover;cursor:pointer;border:2px solid transparent;flex-shrink:0;transition:border-color .12s;}
        .mb-thumb.on{border-color:#c9a84c;}
        .mb-info{flex:1;min-width:0;overflow-y:auto;padding:20px 20px 80px;display:flex;flex-direction:column;gap:13px;}
        @media(min-width:680px){.mb-info{padding:26px 26px 90px;}}
        .mb-cat{font-family:'DM Mono',monospace;font-size:7.5px;color:#bbb;letter-spacing:.22em;text-transform:uppercase;}
        .mb-name{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#111;line-height:1.2;}
        .mb-desc{font-family:'Poppins',sans-serif;font-size:12px;color:#666;line-height:1.75;}
        .mb-tela{font-family:'DM Mono',monospace;font-size:8.5px;color:#bbb;letter-spacing:.1em;}
        .mb-vh{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;letter-spacing:.2em;text-transform:uppercase;margin-bottom:7px;}
        .mb-consult{display:flex;align-items:center;gap:7px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a;cursor:pointer;font-family:'Poppins',sans-serif;font-size:11px;font-weight:600;transition:all .15s;width:100%;justify-content:center;}
        .mb-consult:hover{background:#dcfce7;border-color:#86efac;}
        .vr{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #f0f0ec;cursor:default;transition:border-color .12s;margin-bottom:5px;}
        .vr:hover:not(.vr-ag){border-color:#c9a84c;}
        .vr.vr-ag{opacity:.38;}
        .vr.vr-sel{border-color:#c9a84c;background:#fffbf0;}
        .vr-clr{width:22px;height:22px;border-radius:50%;border:2px solid rgba(0,0,0,.07);flex-shrink:0;align-self:center;}
        .vr-info{flex:1;min-width:0;}
        .vr-name{font-family:'Poppins',sans-serif;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .vr-niv{font-family:'DM Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;display:flex;align-items:center;gap:5px;margin-top:2px;}
        .vr-ctrl{display:flex;align-items:center;gap:6px;margin-top:8px;}
        .vr-right{display:flex;align-items:center;gap:4px;flex-shrink:0;align-self:center;}
        .vr-add{padding:7px 12px;background:#0a0a0a;color:#fff;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;transition:background .15s;white-space:nowrap;flex-shrink:0;}
        .vr-add:hover{background:#c9a84c;color:#000;}
        .qc{display:flex;align-items:center;border:1px solid #e5e5e0;}
        .qb{width:28px;height:28px;border:none;background:#f8f8f6;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:background .1s;color:#333;}
        .qb:hover{background:#e5e5e0;}
        .qn{width:32px;height:28px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:700;border-left:1px solid #e5e5e0;border-right:1px solid #e5e5e0;}
        .mb-bar{position:sticky;bottom:0;background:#fff;border-top:1px solid #ebebeb;padding:11px 20px;display:flex;gap:8px;align-items:center;}
        @media(min-width:680px){.mb-bar{padding:12px 26px;}}
        .mb-bar-hint{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;flex:1;letter-spacing:.06em;}
        .mb-bar-btn{padding:10px 18px;background:#c9a84c;color:#000;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;transition:background .15s;white-space:nowrap;}
        .mb-bar-btn:hover{background:#e0bc5e;}
        .co{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:600;}
        .cd{position:fixed;top:0;right:0;bottom:0;width:min(390px,100vw);background:#fff;z-index:601;display:flex;flex-direction:column;box-shadow:-6px 0 32px rgba(0,0,0,.14);animation:cR .2s ease;}
        @keyframes cR{from{transform:translateX(100%)}to{transform:none}}
        .cd-h{padding:15px 18px;background:#0a0a0a;display:flex;align-items:center;justify-content:space-between;gap:10px;}
        .cd-title{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:#fff;}
        .cd-count{font-family:'DM Mono',monospace;font-size:8px;color:#c9a84c;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);padding:3px 8px;}
        .cd-cx{width:27px;height:27px;background:none;border:1px solid #333;cursor:pointer;color:#777;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .cd-items{flex:1;overflow-y:auto;min-height:80px;}
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
        .cd-foot{padding:14px 18px;border-top:1px solid #ebebeb;display:flex;flex-direction:column;gap:9px;overflow-y:auto;}
        .cd-label{font-family:'DM Mono',monospace;font-size:8px;color:#888;letter-spacing:.14em;text-transform:uppercase;margin-bottom:2px;}
        .cd-input{width:100%;padding:9px 11px;border:1px solid #e5e5e0;font-family:'Poppins',sans-serif;font-size:12px;outline:none;transition:border-color .15s;}
        .cd-input:focus{border-color:#c9a84c;}
        .cd-input.err{border-color:#ef4444;background:#fff5f5;}
        .cd-errmsg{font-family:'DM Mono',monospace;font-size:8px;color:#ef4444;letter-spacing:.06em;}
        .cd-incentivo{padding:9px 12px;background:linear-gradient(135deg,#fffbf0,#fef3c7);border:1px solid rgba(245,158,11,.3);border-left:3px solid #c9a84c;font-family:'Poppins',sans-serif;font-size:11px;color:#92400e;line-height:1.6;margin-bottom:5px;}
        .cd-envio-opts{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
        .cd-envio-opt{padding:8px 6px;border:1px solid #e5e5e0;background:#fff;cursor:pointer;font-family:'DM Mono',monospace;font-size:8.5px;font-weight:700;text-align:center;letter-spacing:.06em;text-transform:uppercase;transition:all .12s;color:#666;}
        .cd-envio-opt:hover{border-color:#0a0a0a;color:#0a0a0a;}
        .cd-envio-opt.sel{background:#0a0a0a;color:#c9a84c;border-color:#0a0a0a;}
        .cd-hint{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;text-align:center;letter-spacing:.06em;line-height:1.9;padding:0 4px;}
        .cd-wa{width:100%;padding:12px;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;}
        .cd-wa.m{background:#25d366;color:#000;}.cd-wa.m:hover{background:#22c55e;}
        .cd-wa.s{background:#f0f0ec;color:#555;}.cd-wa.s:hover{background:#e5e5e0;}
        .cd-wa:disabled{opacity:.45;cursor:not-allowed;}
        .cd-clr{padding:6px;background:none;border:1px solid #f0f0ec;cursor:pointer;font-family:'DM Mono',monospace;font-size:8px;color:#ccc;letter-spacing:.1em;text-transform:uppercase;transition:all .1s;}
        .cd-clr:hover{border-color:#ef4444;color:#ef4444;}
        .wf{position:fixed;bottom:22px;left:18px;z-index:300;width:48px;height:48px;border-radius:50%;background:#25d366;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:21px;box-shadow:0 4px 16px rgba(37,211,102,.4);text-decoration:none;transition:transform .15s;}
        .wf:hover{transform:scale(1.1);}
        .foot{background:#0a0a0a;padding:32px 24px;margin-top:48px;text-align:center;}
        .foot-brand{display:flex;align-items:center;justify-content:center;gap:11px;margin-bottom:13px;}
        .foot-brand img{height:38px;width:38px;object-fit:contain;}
        .foot-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:#fff;letter-spacing:.08em;}
        .foot-sub{font-family:'DM Mono',monospace;font-size:6px;color:#c9a84c;letter-spacing:.45em;text-transform:uppercase;margin-top:3px;}
        .foot-info{font-family:'DM Mono',monospace;font-size:8.5px;color:rgba(255,255,255,.2);letter-spacing:.1em;line-height:2.3;}
        .foot-info a{color:#c9a84c;text-decoration:none;}
        .empty{text-align:center;padding:70px 24px;}
        .empty-icon{font-size:44px;margin-bottom:12px;}
        .empty-txt{font-family:'DM Mono',monospace;font-size:11px;color:#bbb;margin-bottom:14px;line-height:1.8;}
        .empty-btn{padding:8px 20px;background:#0a0a0a;color:#fff;border:none;cursor:pointer;font-family:'Poppins',sans-serif;font-size:11px;font-weight:600;}
        .combo-sec-h{padding:13px 24px 10px;background:#0d0d0d;border-bottom:1px solid #222;display:flex;align-items:baseline;gap:9px;}
        .combo-sec-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:#c9a84c;letter-spacing:.06em;}
        .combo-sec-cnt{font-family:'DM Mono',monospace;font-size:8.5px;color:#444;letter-spacing:.1em;}
        .combo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1px;background:#1c1c1c;}
        .combo-card{background:#111;display:flex;flex-direction:column;overflow:hidden;transition:transform .2s,box-shadow .2s;position:relative;}
        .combo-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.5);z-index:2;}
        .combo-img{aspect-ratio:3/4;overflow:hidden;background:#1a1a1a;position:relative;flex-shrink:0;max-height:240px;}
        .combo-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s;}
        .combo-card:hover .combo-img img{transform:scale(1.04);}
        .combo-img-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;background:linear-gradient(135deg,#1a1a1a,#222);}
        .combo-badge{position:absolute;top:9px;left:9px;padding:3px 9px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);color:#c9a84c;font-family:'DM Mono',monospace;font-size:7.5px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;backdrop-filter:blur(4px);}
        .combo-body{padding:14px 16px 16px;flex:1;display:flex;flex-direction:column;gap:10px;}
        .combo-name{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#f5f5f0;line-height:1.15;}
        .combo-piezas{font-family:'DM Mono',monospace;font-size:8px;color:#555;letter-spacing:.1em;text-transform:uppercase;line-height:1.9;}
        .combo-desc{font-family:'Poppins',sans-serif;font-size:10.5px;color:#555;line-height:1.65;}
        .combo-price-row{display:flex;gap:14px;align-items:flex-end;border-top:1px solid #1e1e1e;padding-top:9px;}
        .combo-price-block{display:flex;flex-direction:column;gap:2px;}
        .combo-price-lbl{font-family:'DM Mono',monospace;font-size:7px;color:#444;letter-spacing:.2em;text-transform:uppercase;}
        .combo-price-val{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;line-height:1;}
        .combo-colores-lbl{font-family:'DM Mono',monospace;font-size:7.5px;color:#555;letter-spacing:.15em;text-transform:uppercase;margin-bottom:6px;}
        .combo-colores{display:flex;flex-wrap:wrap;gap:6px;}
        .combo-color-btn{display:flex;align-items:center;gap:5px;padding:5px 9px;background:rgba(255,255,255,.04);border:1px solid #2a2a2a;cursor:pointer;transition:all .15s;font-family:'DM Mono',monospace;font-size:8.5px;color:#888;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;}
        .combo-color-btn:hover{border-color:#c9a84c;color:#c9a84c;background:rgba(201,168,76,.06);}
        .combo-color-btn.agregado{border-color:#16c65a;color:#16c65a;background:rgba(22,198,90,.08);}
        .combo-color-dot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(255,255,255,.1);flex-shrink:0;}
        .combo-agotado{font-family:'DM Mono',monospace;font-size:8px;color:#333;letter-spacing:.1em;padding:7px 0;}
        .combo-stock-hint{font-family:'DM Mono',monospace;font-size:7.5px;color:#3a3a3a;text-align:right;flex:1;letter-spacing:.04em;}
        @media(max-width:520px){
          .combo-grid{grid-template-columns:1fr 1fr;}
          .combo-img{max-height:180px;}
        }
        @media(max-width:520px){
          .nav{padding:0 14px;}.hero{padding:22px 14px;}.filt{padding:9px 14px;}
          .sec-h{padding:11px 14px 8px;}.grid{grid-template-columns:repeat(2,1fr);}
          .hero-t{font-size:25px;}.foot{padding:26px 14px;margin-top:36px;}
        }
      `}</style>

      <nav className="nav">
        <a href="/catalogo" className="nav-brand">
          <img src={ISOTIPO} alt="M"/>
          <div><div className="nav-name">MODITEX</div><span className="nav-sub">GROUP</span></div>
        </a>
        <div className="nav-right">
          <button className={`nav-info${infoOpen?' on':''}`} onClick={() => setInfoOpen(v => !v)}>
            ℹ️ Información
          </button>
          <button className="nav-cart" onClick={() => setCartOpen(true)}>
            🛒 Mi pedido {totalItems>0 && <span className="nav-badge">{totalItems}</span>}
          </button>
        </div>
      </nav>

      {/* ── Oferta Flash ─────────────────────────────────────────── */}
      {settings.flash_activo && settings.flash_texto && flashTiempo !== 'Expirada' && (
        <div className="flash-bar" style={{background: settings.flash_color, color:'#fff'}}>
          <span style={{fontSize:'16px',flexShrink:0}}>⚡</span>
          <span className="flash-txt">{settings.flash_texto}</span>
          {settings.flash_hasta && flashTiempo && (
            <span className="flash-timer">⏱ {flashTiempo}</span>
          )}
        </div>
      )}

      {/* ── Mensaje del admin ─────────────────────────────────────── */}
      {settings.mensaje_activo && settings.mensaje_banner && (
        <div className="banner-admin" style={{
          background: settings.mensaje_tipo==='warn' ? 'rgba(245,158,11,.09)'
                    : settings.mensaje_tipo==='promo' ? 'rgba(124,58,237,.08)'
                    : 'rgba(14,165,233,.08)',
          borderBottom: `1px solid ${
            settings.mensaje_tipo==='warn'  ? 'rgba(245,158,11,.2)'
          : settings.mensaje_tipo==='promo' ? 'rgba(124,58,237,.2)'
          : 'rgba(14,165,233,.2)'}`,
          borderLeft: `3px solid ${
            settings.mensaje_tipo==='warn'  ? '#f59e0b'
          : settings.mensaje_tipo==='promo' ? '#7c3aed'
          : '#0ea5e9'}`,
          color: settings.mensaje_tipo==='warn'  ? '#92400e'
               : settings.mensaje_tipo==='promo' ? '#4c1d95'
               : '#075985',
        }}>
          <span style={{fontSize:'16px',flexShrink:0}}>
            {settings.mensaje_tipo==='warn' ? '⚠️' : settings.mensaje_tipo==='promo' ? '🎉' : 'ℹ️'}
          </span>
          <span>{settings.mensaje_banner}</span>
        </div>
      )}

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

      {/* PANEL DE INFORMACIÓN DESPLEGABLE */}
      <div className="info-banner" style={{maxHeight: infoOpen ? '600px' : '0'}}>
        <div className="info-inner">
          <div className="info-blk">
            <div className="info-blk-t">📦 Nuestras prendas</div>
            <div className="info-blk-b">Prendas deportivas de alta calidad, <strong>talla única</strong>.<br/>Tela licra alo <strong>80% nylon</strong>.</div>
          </div>
          <div className="info-blk">
            <div className="info-blk-t">💰 Precio al mayor</div>
            <div className="info-blk-b">A partir de <strong>6 piezas</strong>, mínimo <strong>3 piezas por modelo</strong>.<br/>Precios en divisa o Bs a tasa BCV del día.</div>
          </div>
          <div className="info-blk">
            <div className="info-blk-t">🎨 Personalización</div>
            <div className="info-blk-b">Tu logo <strong>sin costo adicional</strong> a partir de <strong>12 piezas</strong>. ¡Crea tu propia marca!</div>
          </div>
          <div className="info-blk">
            <div className="info-blk-t">🚚 Entregas</div>
            <div className="info-blk-b"><strong>3 a 7 días hábiles</strong>. Envíos a nivel <strong>nacional</strong>. MRW · Zoom y más.</div>
          </div>
          <div className="info-blk" style={{gridColumn:'span 2'}}>
            <div className="info-blk-t">💳 Métodos de pago</div>
            <div className="info-pagos">
              {['Pago Móvil','Zelle','Zinli','Binance','Efectivo'].map(p=>(
                <span key={p} className="info-pago">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="filt">
        <input className="filt-srch" placeholder="Buscar prenda…" value={buscar} onChange={e=>setBuscar(e.target.value)}/>
        <button className={`filt-tag${soloDisp?' on':''}`} style={soloDisp?{background:'#16c65a',color:'#fff',borderColor:'#16c65a'}:{}} onClick={()=>setSoloDisp(v=>!v)}>
          {soloDisp ? '✓ Solo disponibles' : '● Solo disponibles'}
        </button>
        <button className={`filt-tag${!filtrocat?' on':''}`} onClick={()=>setFiltrocat('')}>Todas</button>
        {categorias.map(cat => (
          <button key={cat} className={`filt-tag${filtrocat===cat?' on':''}`} onClick={()=>setFiltrocat(filtrocat===cat?'':cat)}>
            {catIcon(cat)} {cat}
          </button>
        ))}
      </div>

      {/* ── SECCIÓN DE COMBOS/SETS ─────────────────────────────── */}
      {!combosLoad && combos.length > 0 && !filtrocat && !buscar.trim() && (
        <div>
          <div className="combo-sec-h">
            <span style={{fontSize:'15px'}}>✨</span>
            <span className="combo-sec-name">SETS & COMBOS</span>
            <span className="combo-sec-cnt">· {combos.length} set{combos.length!==1?'s':''} disponibles</span>
          </div>
          <div className="combo-grid">
            {combos.map(combo => {
              const piezasLabel = combo.piezas_modelos
                .map(k => k.split('__')[1] || k)
                .join(' + ');

              return (
                <div key={combo.id} className="combo-card">
                  {/* Imagen o placeholder */}
                  <div className="combo-img" onClick={() => abrirComboLightbox(combo)} style={{cursor: combo.foto_url ? 'zoom-in' : 'default', position:'relative'}}>
                    {combo.foto_url
                      ? <img src={safeUrl(combo.foto_url)} alt={combo.nombre} loading="lazy"/>
                      : <div className="combo-img-ph">✨</div>
                    }
                    <div className="combo-badge">✨ SET · {combo.num_piezas} PZS</div>
                    {combo.foto_url && <div style={{position:'absolute',bottom:8,right:8,background:'rgba(0,0,0,.55)',color:'#fff',fontFamily:"'DM Mono',monospace",fontSize:'7px',padding:'3px 7px',letterSpacing:'.08em',backdropFilter:'blur(4px)'}}>🔍 AMPLIAR</div>}
                  </div>

                  <div className="combo-body">
                    <div>
                      <div className="combo-name">{combo.nombre}</div>
                      <div className="combo-piezas">📦 {piezasLabel}</div>
                      {combo.descripcion && <div className="combo-desc">{combo.descripcion}</div>}
                    </div>

                    {/* Precios */}
                    <div className="combo-price-row">
                      <div className="combo-price-block">
                        <div className="combo-price-lbl">AL MAYOR</div>
                        <div className="combo-price-val" style={{color:'#c9a84c'}}>€{(combo.precio_mayor||0).toFixed(2)}</div>
                      </div>
                      <div className="combo-price-block">
                        <div className="combo-price-lbl">AL DETAL</div>
                        <div className="combo-price-val" style={{color:'#f5f5f0'}}>€{(combo.precio_detal||0).toFixed(2)}</div>
                      </div>
                      <div className="combo-stock-hint">{combo.total_disponible} color{combo.total_disponible!==1?'es':''} disp.</div>
                    </div>

                    {/* Colores disponibles */}
                    {combo.colores_disponibles.length === 0 ? (
                      <div className="combo-agotado">Sin colores disponibles actualmente</div>
                    ) : (
                      <div>
                        <div className="combo-colores-lbl">Colores disponibles — toca para pedir</div>
                        <div className="combo-colores">
                          {combo.colores_disponibles.map(cd => {
                            const comboSku = `COMBO-${combo.id}-${cd.color.replace(/\s+/g,'-')}`;
                            const estaEnCart = carrito.some(x => x.sku === comboSku);
                            return (
                              <button
                                key={cd.color}
                                className={`combo-color-btn${estaEnCart?' agregado':''}`}
                                onClick={() => addComboToCart(combo, cd)}
                                title={`${combo.nombre} — ${cd.color} · ${cd.stock} disponible${cd.stock!==1?'s':''}`}
                              >
                                <span
                                  className="combo-color-dot"
                                  style={{background: colorFromName(cd.color)}}
                                />
                                {cd.color}
                                {estaEnCart && ' ✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                {items.map((modelo, itemIdx) => {
                  const globalIdx = filtrados.findIndex(m => m.key === modelo.key);
                  const varDisp = modelo.variantes.filter(v=>v.nivel!=='agotado');
                  const ngen = varDisp.length===0?'agotado':varDisp.some(v=>v.nivel==='disponible')?'disponible':'pocas';
                  const nc = NIVEL[ngen];
                  const colores = {};
                  modelo.variantes.forEach(v=>{colores[v.color]=v.nivel;});
                  return (
                    <div key={modelo.key} className="card" onClick={()=>abrirModal(modelo, globalIdx)}>
                      <div className="card-img">
                        {modelo.foto_url
                          ? <img src={safeUrl(modelo.foto_url)} alt={modelo.modelo} loading="lazy"/>
                          : <div className="card-no-img">{catIcon(modelo.categoria)}</div>
                        }
                        <div className="card-badge" style={{background:nc.bg,color:nc.text}}>{nc.label}</div>
                        <button className="card-consult" onClick={e => consultarProducto(modelo, e)}>💬 Consultar</button>
                      </div>
                      <div className="card-body">
                        <div className="card-cat">{modelo.categoria}</div>
                        <div className="card-name">{modelo.modelo}</div>
                        {modelo.descripcion && <div className="card-desc">{modelo.descripcion}</div>}
                        <div className="card-colors">
                          {Object.entries(colores)
                            .filter(([,nivel]) => soloDisp ? nivel!=='agotado' : true)
                            .slice(0,8).map(([color,nivel])=>(
                            <div key={color} title={color}
                              style={{display:'flex',alignItems:'center',gap:'3px',padding:'2px 6px 2px 4px',
                                background:nivel==='agotado'?'rgba(0,0,0,.04)':'rgba(0,0,0,.05)',
                                border:`1px solid ${nivel==='agotado'?'rgba(0,0,0,.06)':'rgba(0,0,0,.1)'}`,
                                opacity:nivel==='agotado'?.35:1,marginBottom:'2px'}}>
                              <span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorFromName(color),flexShrink:0,border:'1px solid rgba(0,0,0,.1)'}}/>
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'#555',whiteSpace:'nowrap',letterSpacing:'.03em',lineHeight:1}}>{color}</span>
                            </div>
                          ))}
                          {Object.keys(colores).length>8 && <span style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'#bbb',alignSelf:'center'}}>+{Object.keys(colores).length-8}</span>}
                        </div>
                        <div className="card-foot">
                          <div className="card-niv"><span style={{width:'5px',height:'5px',borderRadius:'50%',background:nc.dot,display:'inline-block'}}/><span style={{color:nc.text}}>{nc.label}</span></div>
                          <button className="card-btn" onClick={e=>{e.stopPropagation();abrirModal(modelo, globalIdx);}}>Ver →</button>
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

      {modal && (
        <div className="mo" onClick={cerrarModal}>
          <div className="mb" onClick={e=>e.stopPropagation()}>
            <button className="mb-close" onClick={cerrarModal}>✕</button>
            {/* Flechas de navegación — dentro del área de imagen */}
            <div className="mb-imgs" style={{position:'relative'}}>
              {filtrados.length > 1 && (
                <button className="mb-nav mb-nav-prev" disabled={modalIdx<=0} onClick={e=>{e.stopPropagation();irModal(-1);}} title="Prenda anterior">‹</button>
              )}
              {filtrados.length > 1 && (
                <button className="mb-nav mb-nav-next" disabled={modalIdx>=filtrados.length-1} onClick={e=>{e.stopPropagation();irModal(1);}} title="Siguiente prenda">›</button>
              )}
              <div className="mb-main" style={{position:'relative'}}>
                {filtrados.length > 1 && (
                  <div style={{position:'absolute',top:8,left:8,background:'rgba(0,0,0,.55)',color:'rgba(255,255,255,.8)',fontFamily:"'DM Mono',monospace",fontSize:'8px',padding:'3px 8px',letterSpacing:'.08em',zIndex:10,backdropFilter:'blur(4px)'}}>
                    {modalIdx+1} / {filtrados.length}
                  </div>
                )}
                {fotosModal.length>0
                  ? <img src={fotosModal[fotoIdx]} alt={modal.modelo} onClick={e=>{e.stopPropagation();setLightbox(true);}} title="Toca para ampliar"/>
                  : <div style={{width:'100%',height:'100%',minHeight:'220px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'52px',color:'#ccc',background:'#f2f2ef'}}>{catIcon(modal.categoria)}</div>
                }
                <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.35) 65%,transparent 100%)',padding:'36px 18px 14px',display:'flex',gap:'0',alignItems:'flex-end'}}>
                  <div style={{flex:1,borderRight:'1px solid rgba(255,255,255,.1)',paddingRight:'14px',marginRight:'14px'}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'rgba(255,255,255,.45)',letterSpacing:'.25em',textTransform:'uppercase',marginBottom:'4px'}}>AL MAYOR</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'30px',fontWeight:700,color:'#c9a84c',textShadow:'0 2px 12px rgba(0,0,0,1)',lineHeight:1}}>€{(modal.precioMayor||0).toFixed(2)}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'rgba(255,255,255,.3)',marginTop:'3px'}}>Mín. 6 piezas · 3 por modelo</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'rgba(255,255,255,.45)',letterSpacing:'.25em',textTransform:'uppercase',marginBottom:'4px'}}>AL DETAL</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'30px',fontWeight:700,color:'#fff',textShadow:'0 2px 12px rgba(0,0,0,1)',lineHeight:1}}>€{(modal.precioDetal||0).toFixed(2)}</div>
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
            <div className="mb-info">
              {totalItems>0 && (
                <div onClick={()=>{cerrarModal();setCartOpen(true);}} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 12px',background:'#fffbf0',border:'1px solid #c9a84c44',cursor:'pointer',transition:'background .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#fff8e7'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fffbf0'}>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#16c65a',display:'inline-block',flexShrink:0}}/>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:'9px',color:'#92400e',fontWeight:700,flex:1}}>{totalItems} prenda{totalItems!==1?'s':''} en pedido</span>
                  <span style={{fontFamily:"'Poppins',sans-serif",fontSize:'9px',fontWeight:700,color:'#92400e',letterSpacing:'.05em'}}>Ver pedido →</span>
                </div>
              )}
              <div>
                <div className="mb-cat">{catIcon(modal.categoria)} {modal.categoria}</div>
                <div className="mb-name">{modal.modelo}</div>
              </div>
              {modal.descripcion && <div className="mb-desc">{modal.descripcion}</div>}
              {modal.tela && <div className="mb-tela">Tela: {modal.tela}</div>}

              <button className="mb-consult" onClick={e => consultarProducto(modal, e)}>
                💬 Tengo una duda sobre esta prenda — Consultar por WhatsApp
              </button>

              <div>
                <div className="mb-vh">
                  Elige tu color
                  {modal.variantes.filter(v=>v.nivel!=='agotado').length > 0 && (
                    <span style={{marginLeft:'8px',fontFamily:"'DM Mono',monospace",fontSize:'7px',
                      background:'rgba(22,198,90,.1)',color:'#16c65a',border:'1px solid rgba(22,198,90,.2)',
                      padding:'1px 6px',letterSpacing:'.06em'}}>
                      {modal.variantes.filter(v=>v.nivel!=='agotado').length} disponible{modal.variantes.filter(v=>v.nivel!=='agotado').length!==1?'s':''}
                    </span>
                  )}
                </div>
                {[...modal.variantes]
                  .sort((a,b) => {
                    const o = {disponible:0,pocas:1,agotado:2};
                    return (o[a.nivel]??2)-(o[b.nivel]??2);
                  })
                  .map(v => {
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
                        {inCart && (
                          <div className="vr-ctrl">
                            <div className="qc">
                              <button className="qb" onClick={e=>{e.stopPropagation();if(qty===1)removeFromCart(v.sku);else changeQty(v.sku,-1);}}>−</button>
                              <span className="qn">{qty}</span>
                              <button className="qb" onClick={e=>{e.stopPropagation();changeQty(v.sku,1);}}>+</button>
                            </div>
                            <button onClick={e=>{e.stopPropagation();removeFromCart(v.sku);}}
                              style={{width:'26px',height:'26px',background:'none',border:'1px solid #e5e5e0',cursor:'pointer',color:'#ccc',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s',flexShrink:0}}
                              onMouseEnter={e=>{e.currentTarget.style.color='#ef4444';e.currentTarget.style.borderColor='#ef4444';}}
                              onMouseLeave={e=>{e.currentTarget.style.color='#ccc';e.currentTarget.style.borderColor='#e5e5e0';}}>✕</button>
                          </div>
                        )}
                      </div>
                      {!inCart && v.nivel!=='agotado' && (
                        <div className="vr-right">
                          <button className="vr-add" onClick={e=>{e.stopPropagation();addToCart(modal,v);}}>+ Pedir</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{padding:'9px 11px',background:'#fffbf0',border:'1px solid #fde68a44',fontFamily:"'DM Mono',monospace",fontSize:'9px',color:'#92400e',lineHeight:1.8}}>
                💡 Selecciona el color y la cantidad. Cuando estés lista, envía tu pedido por WhatsApp.
              </div>
            </div>
          </div>
        </div>
      )}

      {comboLightbox && (
        <div className="lb" onClick={cerrarComboLightbox}>
          <img src={comboLightbox.fotos[comboLightbox.idx]} alt={comboLightbox.nombre} onClick={e=>e.stopPropagation()}/>
          <button className="lb-close" onClick={cerrarComboLightbox}>✕</button>
          {comboLightbox.fotos.length > 1 && <>
            <button className="lb-prev" onClick={e=>{e.stopPropagation();setComboLightbox(prev=>({...prev,idx:(prev.idx-1+prev.fotos.length)%prev.fotos.length}));}}>‹</button>
            <button className="lb-next" onClick={e=>{e.stopPropagation();setComboLightbox(prev=>({...prev,idx:(prev.idx+1)%prev.fotos.length}));}}>›</button>
          </>}
          <div style={{position:'absolute',bottom:18,left:'50%',transform:'translateX(-50%)',fontFamily:"'DM Mono',monospace",fontSize:'9px',color:'rgba(255,255,255,.5)',letterSpacing:'.1em'}}>{comboLightbox.nombre}</div>
        </div>
      )}

      {lightbox && fotosModal.length>0 && (
        <div className="lb" onClick={()=>setLightbox(false)}>
          <img src={fotosModal[fotoIdx]} alt={modal?.modelo} onClick={e=>e.stopPropagation()}/>
          <button className="lb-close" onClick={()=>setLightbox(false)}>✕</button>
          {fotosModal.length>1 && <>
            <button className="lb-prev" onClick={e=>{e.stopPropagation();setFotoIdx(i=>(i-1+fotosModal.length)%fotosModal.length);}}>‹</button>
            <button className="lb-next" onClick={e=>{e.stopPropagation();setFotoIdx(i=>(i+1)%fotosModal.length);}}>›</button>
          </>}
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
                    const nc = item.esCombo ? NIVEL['disponible'] : NIVEL[item.nivel];
                    return (
                      <div key={item.sku} className="cd-item">
                        <div className="cd-dot" style={{background: item.esCombo ? colorFromName(item.color) : colorFromName(item.color), outline: item.esCombo ? '2px solid #c9a84c' : 'none', outlineOffset:'1px'}}/>
                        <div>
                          <div className="cd-iname">
                            {item.esCombo && <span style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',background:'rgba(201,168,76,.15)',color:'#c9a84c',border:'1px solid rgba(201,168,76,.3)',padding:'1px 5px',letterSpacing:'.1em',marginRight:'5px'}}>SET</span>}
                            {item.modelo}
                          </div>
                          <div className="cd-isub">
                            {item.color}
                            {item.esCombo
                              ? <span style={{display:'block',fontSize:'8px',color:'#555',marginTop:'1px'}}>{item.talla}</span>
                              : (item.talla&&item.talla!=='UNICA'?' · T:'+item.talla:'')
                            }
                          </div>
                          {!item.esCombo && <div className="cd-iniv" style={{color:nc.text}}>{nc.label}</div>}
                        </div>
                        <div className="cd-ctrl">
                          <div className="cd-qc">
                            <button className="cd-qb" onClick={()=>{if(item.qty===1)removeFromCart(item.sku);else changeQty(item.sku,-1);}}>−</button>
                            <span className="cd-qn" style={{color: item.stockMax && item.qty >= item.stockMax ? '#f59e0b' : ''}}>{item.qty}</span>
                            <button className="cd-qb"
                              onClick={()=>changeQty(item.sku,1)}
                              disabled={!!(item.stockMax && item.qty >= item.stockMax)}
                              style={{opacity: item.stockMax && item.qty >= item.stockMax ? .3 : 1}}>+</button>
                          </div>
                          <button className="cd-del" onClick={()=>removeFromCart(item.sku)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="cd-foot">
                  {/* NOMBRE */}
                  <div>
                    <div className="cd-label">Tu nombre</div>
                    <input className="cd-input" placeholder="ej: María González" value={nombre} onChange={e=>setNombre(e.target.value)}/>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <div className="cd-label">
                      Correo electrónico{' '}
                      {settings.email_requerido
                        ? <span style={{color:'#ef4444',fontWeight:700}}>*</span>
                        : <span style={{color:'#ccc',fontWeight:400,textTransform:'none',letterSpacing:0}}>(opcional)</span>}
                    </div>
                    {settings.email_incentivo && (
                      <div className="cd-incentivo">🎁 {settings.email_incentivo}</div>
                    )}
                    <input
                      className={`cd-input${emailError?' err':''}`}
                      type="email"
                      placeholder="ej: maria@correo.com"
                      value={email}
                      onChange={e=>{setEmail(e.target.value);setEmailError('');}}
                    />
                    {emailError && <div className="cd-errmsg">{emailError}</div>}
                  </div>

                  {/* MÉTODO DE ENVÍO */}
                  <div>
                    <div className="cd-label">📦 Método de envío</div>
                    <div className="cd-envio-opts">
                      {METODOS_ENVIO.map(m => (
                        <button key={m} className={`cd-envio-opt${metodoEnvio===m?' sel':''}`}
                          onClick={()=>setMetodoEnvio(metodoEnvio===m?'':m)}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cd-hint">Tu pedido se enviará por WhatsApp.<br/>Una asesora te confirma el monto y datos de pago.</div>
                  <button className="cd-wa m" onClick={()=>sendWA(WA_NUMBER)} disabled={enviando}>
                    📱 {enviando?'Enviando...':'Enviar pedido · WA 1'}
                  </button>
                  <button className="cd-wa s" onClick={()=>sendWA(WA_NUMBER2)} disabled={enviando}>
                    📱 {enviando?'Enviando...':'Enviar pedido · WA 2'}
                  </button>
                  <button className="cd-clr" onClick={()=>setCarrito([])}>Vaciar pedido</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="foot">
        <div className="foot-brand">
          <img src={ISOTIPO} alt="M"/>
          <div><div className="foot-name">MODITEX</div><div className="foot-sub">GROUP</div></div>
        </div>
        <div className="foot-info">
          BARQUISIMETO · VENEZUELA<br/>
          <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer">+58 412-036-3131</a>
          {' · '}
          <a href={`https://wa.me/${WA_NUMBER2}`} target="_blank" rel="noreferrer">+58 412-753-4435</a><br/>
          @YAINA.ATELIER · @MODITEX_GROUP
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