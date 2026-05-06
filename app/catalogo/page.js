'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabasePublic } from '@/lib/supabase-client';


const ISOTIPO   = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/ISOTIPO%20PNG.png";
const WA_NUMBER = "584120363131";
const WA_NUMBER2= "584127534435";

const NIVEL = {
  disponible: { label:'Disponible',     dot:'#16c65a', text:'#16c65a', bg:'rgba(22,198,90,.12)'  },
  produccion: { label:'Bajo pedido',    dot:'#3b82f6', text:'#3b82f6', bg:'rgba(59,130,246,.12)' },
  pocas:      { label:'Pocas unidades', dot:'#f59e0b', text:'#d97706', bg:'rgba(245,158,11,.12)' },
  agotado:    { label:'Agotado',        dot:'#94a3b8', text:'#94a3b8', bg:'rgba(148,163,184,.1)' },
};
const CAT_ICONS = {};
function catIcon(c){ return null; }

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
  const [comboLightbox, setComboLightbox] = useState(null);
  const [flashTiempo,  setFlashTiempo]  = useState('');
  const [showTop,      setShowTop]      = useState(false);

  const cargarRef = useRef(null);

  // ── Inyectar fuentes Google solo en cliente (evita hydration mismatch) ──
  useEffect(() => {
    const id = 'moditex-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id   = id;
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600&family=DM+Mono&display=swap';
    document.head.appendChild(link);
  }, []);

  // ── Botón volver arriba ────────────────────────────────────────────────
  useEffect(() => {
    function onScroll() { setShowTop(window.scrollY > 400); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
        flash_imagen: res.flash_imagen || '',
        flash_marquee: res.flash_marquee || 'ALERTA OFERTA ESPECIAL',
        grid_banners: res.grid_banners || [],
      });
    }).catch(() => {});

    // Cargar combos
    fetch('/api/combos').then(r => r.json()).then(res => {
      if (res.ok) setCombos(res.combos || []);
    }).catch(() => {}).finally(() => setCombosLoad(false));

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
    if (v.nivel === 'agotado') return;
    playAddSound();
    setCarrito(prev => {
      const ex = prev.find(x => x.sku === v.sku);
      const stockMax = v.nivel === 'produccion' ? 999 : v.disponible;
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
    <div style={{minHeight:'100vh',background:'#fafaf8',fontFamily:"'Montserrat',sans-serif"}}>

      <style suppressHydrationWarning>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#f0f0ec;border-radius:4px}::-webkit-scrollbar-thumb{background:#bbb;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:#888}
        .mb-nav{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;background:rgba(10,10,10,.65);border:none;cursor:pointer;color:#fff;font-size:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:15;transition:background .15s;backdrop-filter:blur(4px);}
        .mb-nav:hover{background:rgba(201,168,76,.9);color:#000;}
        .mb-nav:disabled{opacity:.15;cursor:default;}
        .mb-nav-prev{left:8px;}.mb-nav-next{right:8px;}
        .nav{background:#0a0a0a;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:200;border-bottom:1px solid #1a1a1a;}
        .nav-brand{display:flex;align-items:center;gap:9px;text-decoration:none;}
        .nav-brand img{height:30px;width:30px;object-fit:contain;}
        .nav-name{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#fff;letter-spacing:.1em;}
        .nav-sub{font-family:'DM Mono',monospace;font-size:5.5px;color:#c9a84c;letter-spacing:.45em;text-transform:uppercase;display:block;margin-top:1px;}
        .nav-right{display:flex;align-items:center;gap:8px;}
        .nav-info{display:flex;align-items:center;gap:5px;padding:7px 12px;background:transparent;color:rgba(255,255,255,.5);border:1px solid #333;cursor:pointer;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;transition:all .15s;white-space:nowrap;}
        .nav-info:hover,.nav-info.on{color:#c9a84c;border-color:#c9a84c;}
        .nav-cart{display:flex;align-items:center;gap:7px;padding:7px 14px;background:#c9a84c;color:#000;border:none;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;transition:background .15s;}
        .nav-cart:hover{background:#e0bc5e;}
        .nav-badge{background:#000;color:#c9a84c;border-radius:50%;width:16px;height:16px;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;}
        .banner-admin{padding:10px 24px;font-family:'Montserrat',sans-serif;font-size:12px;line-height:1.6;display:flex;align-items:center;gap:10px;}
        .flash-bar{display:flex;align-items:center;gap:12px;padding:10px 24px;flex-wrap:wrap;}
        .flash-txt{font-family:'DM Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.06em;flex:1;min-width:0;}
        .flash-timer{font-family:'DM Mono',monospace;font-size:13px;font-weight:800;letter-spacing:.08em;background:rgba(255,255,255,.18);padding:4px 10px;border-radius:4px;white-space:nowrap;flex-shrink:0;}
        .hero{background:#0a0a0a;padding:28px 24px;text-align:center;}
        .hero-ey{font-family:'DM Mono',monospace;font-size:8px;color:#c9a84c;letter-spacing:.3em;text-transform:uppercase;margin-bottom:7px;}
        .hero-t{font-family:'Playfair Display',serif;font-size:32px;font-weight:700;color:#fff;line-height:1.1;}
        .hero-s{font-family:'Montserrat',sans-serif;font-size:11px;color:rgba(255,255,255,.3);margin-top:5px;}
        .hero-lv{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;margin-top:14px;}
        .hero-lv-i{display:flex;align-items:center;gap:5px;font-family:'DM Mono',monospace;font-size:8px;color:rgba(255,255,255,.25);letter-spacing:.06em;}
        .info-banner{background:#fff;border-bottom:2px solid #f0ede6;overflow:hidden;transition:max-height .35s ease;}
        .info-inner{padding:22px 24px 26px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;}
        .info-blk{padding:13px 15px;background:#fafaf8;border:1px solid #ebebeb;border-left:3px solid #c9a84c;}
        .info-blk-t{font-family:'DM Mono',monospace;font-size:7.5px;letter-spacing:.22em;text-transform:uppercase;color:#c9a84c;font-weight:700;margin-bottom:6px;}
        .info-blk-b{font-family:'Montserrat',sans-serif;font-size:11px;color:#555;line-height:1.75;}
        .info-pagos{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
        .info-pago{padding:3px 9px;background:#0a0a0a;color:#c9a84c;font-family:'DM Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.08em;}
        .filt-container{background:#fff;border-bottom:1px solid #ebebeb;position:sticky;top:56px;z-index:100;display:flex;flex-direction:column;align-items:center;}
        .filt-search-row{padding:12px 24px 8px;display:flex;align-items:center;position:relative;width:100%;max-width:1200px;}
        .filt-search-icon{position:absolute;left:38px;font-size:14px;color:#888;pointer-events:none;}
        .filt-srch{width:100%;padding:10px 16px 10px 40px;border:none;background:#f5f5f5;border-radius:24px;font-family:'Montserrat',sans-serif;font-size:13px;outline:none;transition:background .2s;}
        .filt-srch:focus{background:#eaeaea;}
        .filt-tags-row{padding:0 24px 12px;display:flex;align-items:center;gap:8px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;width:100%;max-width:1200px;}
        .filt-tags-row::-webkit-scrollbar{display:none;}
        .filt-tag{padding:6px 14px;border:1px solid #eaeaea;border-radius:20px;background:#fff;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;letter-spacing:.03em;color:#555;transition:all .15s;white-space:nowrap;flex-shrink:0;}
        .filt-tag:hover{color:#0a0a0a;border-color:#0a0a0a;}
        .filt-tag.on{background:#0a0a0a;color:#c9a84c;border-color:#0a0a0a;}
        .sec-h{padding:12px 24px 8px;background:#fafaf8;border-bottom:1px solid #ebebeb;display:flex;align-items:baseline;gap:9px;max-width:1200px;margin:0 auto;}
        .sec-h-name{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#111;}
        .sec-h-cnt{font-family:'DM Mono',monospace;font-size:8.5px;color:#bbb;letter-spacing:.1em;}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:1px;background:#ebebeb;max-width:1200px;margin:0 auto;}
        .card{background:#fff;cursor:pointer;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s;position:relative;}
        .card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.09);z-index:2;}
        .card-img{aspect-ratio:3/4;overflow:hidden;background:#f2f2ef;position:relative;}
        .card-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s;}
        .card:hover .card-img img{transform:scale(1.05);}
        .card-no-img{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:44px;color:#d8d8d2;}
        .card-badge{position:absolute;top:9px;left:9px;padding:3px 8px;font-family:'DM Mono',monospace;font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-radius:4px;}
        .card-consult{position:absolute;bottom:8px;right:8px;padding:6px 12px;background:rgba(10,10,10,.85);color:#fff;border:none;border-radius:12px;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;letter-spacing:.05em;backdrop-filter:blur(4px);transition:background .15s;white-space:nowrap;}
        .card-consult:hover{background:#25d366;color:#000;}
        .card-body{padding:10px 12px 12px;flex:1;display:flex;flex-direction:column;}
        .card-cat{font-family:'DM Mono',monospace;font-size:7px;color:#c0c0b8;letter-spacing:.2em;text-transform:uppercase;margin-bottom:2px;}
        .card-name{font-family:'Playfair Display',serif;font-size:14px;font-weight:700;color:#111;line-height:1.15;margin-bottom:4px;}
        .card-desc{font-family:'Montserrat',sans-serif;font-size:9.5px;color:#888;line-height:1.4;margin-bottom:8px;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .card-colors{display:flex;gap:3px;flex-wrap:wrap;margin-bottom:8px;}
        .card-dot{width:11px;height:11px;border-radius:50%;border:1px solid rgba(0,0,0,.07);}
        .card-foot{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f2f2ef;padding-top:8px;}
        .card-niv{display:flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:7.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
        .card-btn{padding:5px 10px;background:#0a0a0a;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;transition:background .15s;}
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
        .mb-name{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:#111;line-height:1.2;}
        .mb-desc{font-family:'Montserrat',sans-serif;font-size:12px;color:#666;line-height:1.75;}
        .mb-tela{font-family:'DM Mono',monospace;font-size:8.5px;color:#bbb;letter-spacing:.1em;}
        .mb-vh{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;letter-spacing:.2em;text-transform:uppercase;margin-bottom:7px;}
        .mb-consult{display:flex;align-items:center;gap:7px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;transition:all .15s;width:100%;justify-content:center;}
        .mb-consult:hover{background:#dcfce7;border-color:#86efac;}
        .vr{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #f0f0ec;cursor:default;transition:border-color .12s;margin-bottom:5px;}
        .vr:hover:not(.vr-ag){border-color:#c9a84c;}
        .vr.vr-ag{opacity:.38;}
        .vr.vr-sel{border-color:#c9a84c;background:#fffbf0;}
        .vr-clr{width:22px;height:22px;border-radius:50%;border:2px solid rgba(0,0,0,.07);flex-shrink:0;align-self:center;}
        .vr-info{flex:1;min-width:0;}
        .vr-name{font-family:'Montserrat',sans-serif;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .vr-niv{font-family:'DM Mono',monospace;font-size:8px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;display:flex;align-items:center;gap:5px;margin-top:2px;}
        .vr-ctrl{display:flex;align-items:center;gap:6px;margin-top:8px;}
        .vr-right{display:flex;align-items:center;gap:4px;flex-shrink:0;align-self:center;}
        .vr-add{padding:7px 12px;background:#0a0a0a;color:#fff;border:none;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;transition:background .15s;white-space:nowrap;flex-shrink:0;}
        .vr-add:hover{background:#c9a84c;color:#000;}
        .qc{display:flex;align-items:center;border:1px solid #e5e5e0;}
        .qb{width:28px;height:28px;border:none;background:#f8f8f6;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:background .1s;color:#333;}
        .qb:hover{background:#e5e5e0;}
        .qn{width:32px;height:28px;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:700;border-left:1px solid #e5e5e0;border-right:1px solid #e5e5e0;}
        .mb-bar{position:sticky;bottom:0;background:#fff;border-top:1px solid #ebebeb;padding:11px 20px;display:flex;gap:8px;align-items:center;}
        @media(min-width:680px){.mb-bar{padding:12px 26px;}}
        .mb-bar-hint{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;flex:1;letter-spacing:.06em;}
        .mb-bar-btn{padding:10px 18px;background:#c9a84c;color:#000;border:none;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;transition:background .15s;white-space:nowrap;}
        .mb-bar-btn:hover{background:#e0bc5e;}
        .co{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:600;}
        .cd{position:fixed;top:0;right:0;bottom:0;width:min(390px,100vw);background:#fff;z-index:601;display:flex;flex-direction:column;box-shadow:-6px 0 32px rgba(0,0,0,.14);animation:cR .2s ease;}
        @keyframes cR{from{transform:translateX(100%)}to{transform:none}}
        .cd-h{padding:15px 18px;background:#0a0a0a;display:flex;align-items:center;justify-content:space-between;gap:10px;}
        .cd-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:#fff;}
        .cd-count{font-family:'DM Mono',monospace;font-size:8px;color:#c9a84c;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);padding:3px 8px;}
        .cd-cx{width:27px;height:27px;background:none;border:1px solid #333;cursor:pointer;color:#777;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .cd-items{flex:1;overflow-y:auto;min-height:80px;}
        .cd-item{display:grid;grid-template-columns:auto 1fr auto;gap:11px;padding:13px 18px;border-bottom:1px solid #f5f5f3;align-items:center;}
        .cd-dot{width:26px;height:26px;border-radius:50%;border:2px solid rgba(0,0,0,.07);flex-shrink:0;}
        .cd-iname{font-family:'Montserrat',sans-serif;font-size:12px;font-weight:600;color:#111;}
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
        .cd-input{width:100%;padding:9px 11px;border:1px solid #e5e5e0;font-family:'Montserrat',sans-serif;font-size:12px;outline:none;transition:border-color .15s;}
        .cd-input:focus{border-color:#c9a84c;}
        .cd-input.err{border-color:#ef4444;background:#fff5f5;}
        .cd-errmsg{font-family:'DM Mono',monospace;font-size:8px;color:#ef4444;letter-spacing:.06em;}
        .cd-incentivo{padding:9px 12px;background:linear-gradient(135deg,#fffbf0,#fef3c7);border:1px solid rgba(245,158,11,.3);border-left:3px solid #c9a84c;font-family:'Montserrat',sans-serif;font-size:11px;color:#92400e;line-height:1.6;margin-bottom:5px;}
        .cd-envio-opts{display:grid;grid-template-columns:1fr 1fr;gap:5px;}
        .cd-envio-opt{padding:8px 6px;border:1px solid #e5e5e0;background:#fff;cursor:pointer;font-family:'DM Mono',monospace;font-size:8.5px;font-weight:700;text-align:center;letter-spacing:.06em;text-transform:uppercase;transition:all .12s;color:#666;}
        .cd-envio-opt:hover{border-color:#0a0a0a;color:#0a0a0a;}
        .cd-envio-opt.sel{background:#0a0a0a;color:#c9a84c;border-color:#0a0a0a;}
        .cd-hint{font-family:'DM Mono',monospace;font-size:8px;color:#bbb;text-align:center;letter-spacing:.06em;line-height:1.9;padding:0 4px;}
        .cd-wa{width:100%;padding:12px;border:none;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;}
        .cd-wa.m{background:#25d366;color:#000;}.cd-wa.m:hover{background:#22c55e;}
        .cd-wa.s{background:#f0f0ec;color:#555;}.cd-wa.s:hover{background:#e5e5e0;}
        .cd-wa:disabled{opacity:.45;cursor:not-allowed;}
        .cd-clr{padding:6px;background:none;border:1px solid #f0f0ec;cursor:pointer;font-family:'DM Mono',monospace;font-size:8px;color:#ccc;letter-spacing:.1em;text-transform:uppercase;transition:all .1s;}
        .cd-clr:hover{border-color:#ef4444;color:#ef4444;}
        .wf{position:fixed;bottom:22px;left:18px;z-index:300;width:48px;height:48px;border-radius:50%;background:#25d366;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:21px;box-shadow:0 4px 16px rgba(37,211,102,.4);text-decoration:none;transition:transform .15s;}
        .wf:hover{transform:scale(1.1);}
        .top-btn{position:fixed;bottom:80px;right:18px;z-index:300;width:40px;height:40px;border-radius:50%;background:#0a0a0a;border:2px solid #c9a84c;cursor:pointer;color:#c9a84c;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:opacity .25s,transform .2s;}
        .top-btn.vis{opacity:1;pointer-events:all;}
        .top-btn:hover{background:#c9a84c;color:#000;transform:scale(1.1);}
        .foot{background:#0a0a0a;padding:32px 24px;margin-top:48px;text-align:center;}
        .foot-brand{display:flex;align-items:center;justify-content:center;gap:11px;margin-bottom:13px;}
        .foot-brand img{height:38px;width:38px;object-fit:contain;}
        .foot-name{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#fff;letter-spacing:.08em;}
        .foot-sub{font-family:'DM Mono',monospace;font-size:6px;color:#c9a84c;letter-spacing:.45em;text-transform:uppercase;margin-top:3px;}
        .foot-info{font-family:'DM Mono',monospace;font-size:8.5px;color:rgba(255,255,255,.2);letter-spacing:.1em;line-height:2.3;}
        .foot-info a{color:#c9a84c;text-decoration:none;}
        .empty{text-align:center;padding:70px 24px;}
        .empty-icon{font-size:44px;margin-bottom:12px;}
        .empty-txt{font-family:'DM Mono',monospace;font-size:11px;color:#bbb;margin-bottom:14px;line-height:1.8;}
        .empty-btn{padding:8px 20px;background:#0a0a0a;color:#fff;border:none;cursor:pointer;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;}
        .combo-sec-h{padding:10px 24px 8px;background:#0d0d0d;border-bottom:1px solid #222;display:flex;align-items:baseline;gap:9px;max-width:1200px;margin:0 auto;}
        .combo-sec-name{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#c9a84c;letter-spacing:.06em;}
        .combo-sec-cnt{font-family:'DM Mono',monospace;font-size:8.5px;color:#444;letter-spacing:.1em;}
        .combo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1px;background:#1c1c1c;max-width:1200px;margin:0 auto;}
        .combo-card{background:#111;display:flex;flex-direction:column;overflow:hidden;transition:transform .2s,box-shadow .2s;position:relative;}
        .combo-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.5);z-index:2;}
        .combo-img{aspect-ratio:3/4;overflow:hidden;background:#1a1a1a;position:relative;flex-shrink:0;}
        .combo-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s;}
        .combo-card:hover .combo-img img{transform:scale(1.04);}
        .combo-img-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;background:linear-gradient(135deg,#1a1a1a,#222);}
        .combo-badge{position:absolute;top:9px;left:9px;padding:3px 9px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);color:#c9a84c;font-family:'DM Mono',monospace;font-size:7.5px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;backdrop-filter:blur(4px);border-radius:4px;}
        .combo-body{padding:10px 14px 12px;flex:1;display:flex;flex-direction:column;gap:8px;}
        .combo-name{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#f5f5f0;line-height:1.15;}
        .combo-piezas{font-family:'DM Mono',monospace;font-size:8px;color:#555;letter-spacing:.1em;text-transform:uppercase;line-height:1.5;}
        .combo-desc{font-family:'Montserrat',sans-serif;font-size:9.5px;color:#777;line-height:1.4;}
        .combo-price-row{display:flex;gap:14px;align-items:flex-end;border-top:1px solid #1e1e1e;padding-top:8px;}
        .combo-price-block{display:flex;flex-direction:column;gap:1px;}
        .combo-price-lbl{font-family:'DM Mono',monospace;font-size:7px;color:#444;letter-spacing:.2em;text-transform:uppercase;}
        .combo-price-val{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;line-height:1;}
        .combo-colores-lbl{font-family:'DM Mono',monospace;font-size:7.5px;color:#555;letter-spacing:.15em;text-transform:uppercase;margin-bottom:6px;}
        .combo-colores{display:flex;flex-wrap:wrap;gap:4px;}
        .combo-color-btn{display:flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(255,255,255,.04);border:1px solid #2a2a2a;border-radius:12px;cursor:pointer;transition:all .15s;font-family:'Montserrat',sans-serif;font-size:8.5px;font-weight:600;color:#999;white-space:nowrap;}
        .combo-color-btn:hover{border-color:#c9a84c;color:#c9a84c;background:rgba(201,168,76,.06);}
        .combo-color-btn.agregado{border-color:#16c65a;color:#16c65a;background:rgba(22,198,90,.08);}
        .combo-color-dot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(255,255,255,.1);flex-shrink:0;}
        .combo-agotado{font-family:'DM Mono',monospace;font-size:8px;color:#333;letter-spacing:.1em;padding:7px 0;}
        .combo-stock-hint{font-family:'DM Mono',monospace;font-size:7.5px;color:#3a3a3a;text-align:right;flex:1;letter-spacing:.04em;}
        @media(max-width:520px){
          .nav{padding:0 12px;} .nav-name{font-size:13px;} .nav-brand img{height:24px;width:24px;}
          .hero{padding:16px 12px;} .hero-t{font-size:20px;} .hero-s{font-size:10px;}
          .filt-search-row{padding:10px 14px 6px;} .filt-search-icon{left:28px;font-size:12px;}
          .filt-srch{font-size:12px; padding:8px 14px 8px 36px;}
          .filt-tags-row{padding:0 14px 10px; gap:6px;}
          .filt-tag{padding:6px 12px; font-size:10px;}
          
          .sec-h{padding:10px 12px 6px;} .sec-h-name{font-size:13px;}
          .grid{grid-template-columns:repeat(2,1fr); gap:1px;}
          
          .card-body{padding:8px;}
          .card-name{font-size:11px; margin-bottom:2px;}
          .card-desc{font-size:8.5px; line-height:1.3; margin-bottom:6px; -webkit-line-clamp:2;}
          .card-colors{gap:2px;} .card-dot{width:9px; height:9px;}
          .card-niv{font-size:6.5px;} .card-btn{font-size:8px; padding:4px 8px;}
          .card-consult{padding:4px 8px; font-size:7.5px; bottom:6px; right:6px;}
          .card-badge{padding:2px 6px; font-size:6.5px; top:6px; left:6px;}
          
          .combo-grid{grid-template-columns:1fr 1fr; gap:1px;}
          .combo-sec-h{padding:10px 12px 6px;} .combo-sec-name{font-size:13px;}
          .combo-img{max-height:160px;}
          .combo-body{padding:8px; gap:4px;}
          .combo-name{font-size:12px; margin-bottom:2px; line-height:1.2;}
          .combo-piezas{font-size:7px; margin-bottom:2px;}
          .combo-desc{font-size:8px; line-height:1.2; margin-bottom:4px; -webkit-line-clamp:2; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden;}
          .combo-price-val{font-size:14px;} .combo-price-lbl{font-size:6.5px;}
          .combo-color-btn{padding:3px 6px; font-size:7px; gap:3px;} .combo-color-dot{width:8px; height:8px;}
          .combo-badge{padding:2px 6px; font-size:6.5px; top:6px; left:6px;}
          
          .wf{width:40px; height:40px; bottom:16px; left:12px; font-size:18px;}
          .foot{padding:26px 14px;margin-top:36px;}
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.92); }
        }
        @keyframes alert-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .mega-flash {
          position: relative;
          overflow: hidden;
          width: 100%;
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        
        .mega-flash::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          transition: background 0.3s;
        }
        
        .mega-flash:hover::before {
          background: rgba(0,0,0,0.3);
        }
        
        .mega-flash-marquee {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 28px;
          background: repeating-linear-gradient(45deg, #ef4444, #ef4444 15px, #facc15 15px, #facc15 30px);
          display: flex;
          align-items: center;
          overflow: hidden;
          z-index: 10;
        }
        
        .mega-flash-marquee-inner {
          display: flex;
          white-space: nowrap;
          width: max-content;
          animation: alert-marquee 50s linear infinite;
        }
        
        .mega-flash-marquee-text {
          background: #000;
          color: #fff;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .2em;
          padding: 2px 20px;
          margin: 0 10px;
        }
        
        .mega-flash-content {
          position: relative;
          z-index: 2;
          background: rgba(0,0,0,0.85);
          padding: 30px 40px;
          border: 3px solid;
          transform: skew(-8deg);
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          transition: opacity 0.3s, transform 0.3s;
          text-align: center;
          max-width: 90%;
        }
        
        .mega-flash:hover .mega-flash-content {
          opacity: 0.85;
          transform: skew(-8deg) scale(0.98);
        }
        
        .mega-flash-content > * {
          transform: skew(8deg);
        }
        
        .mega-flash-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 32px;
          font-weight: 900;
          color: #fff;
          letter-spacing: .02em;
          text-shadow: 0 2px 10px rgba(0,0,0,0.8);
          line-height: 1.2;
        }
        
        .mega-flash-timer {
          display: inline-block;
          margin-top: 10px;
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          font-weight: 700;
          background: rgba(0,0,0,0.5);
          padding: 4px 12px;
          border-radius: 4px;
        }
        
        /* Banners Intercalados */
        .grid-banner {
          grid-column: span 2;
          min-height: 300px;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-color: var(--bg3);
          border: 1px solid var(--border);
          display: block;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: default;
        }
        a.grid-banner {
          cursor: pointer;
        }
        a.grid-banner:hover {
          transform: scale(0.99);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        @media(max-width:520px){
          .mega-flash { min-height: 200px; }
          .mega-flash-content { padding: 20px 25px; }
          .mega-flash-title { font-size: 22px; }
          .mega-flash-timer { font-size: 12px; }
          .grid-banner {
            grid-column: span 2;
            min-height: 220px;
          }
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

      {/* ── MEGA OFERTA FLASH ESTILO ZARA ──────────────────────────── */}
      {settings.flash_activo && settings.flash_texto && flashTiempo !== 'Expirada' && (
        <div className="mega-flash" style={{ backgroundColor: settings.flash_color, backgroundImage: settings.flash_imagen ? `url(${settings.flash_imagen})` : 'none' }}>
          
          <div className="mega-flash-marquee">
            <div className="mega-flash-marquee-inner">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="mega-flash-marquee-text">{settings.flash_marquee || 'ALERTA OFERTA ESPECIAL'}</div>
              ))}
            </div>
          </div>

          <div className="mega-flash-content" style={{ borderColor: settings.flash_color }}>
            <div>
              <div className="mega-flash-title">{settings.flash_texto}</div>
              {settings.flash_hasta && flashTiempo && (
                <div className="mega-flash-timer" style={{ color: settings.flash_color }}>
                  ⏱ {flashTiempo}
                </div>
              )}
            </div>
          </div>

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

      <div className="filt-container">
        <div className="filt-search-row">
          <span className="filt-search-icon">🔍</span>
          <input className="filt-srch" placeholder="Buscar prenda o modelo..." value={buscar} onChange={e=>setBuscar(e.target.value)}/>
        </div>
        <div className="filt-tags-row">
          <button className={`filt-tag${soloDisp?' on':''}`} style={soloDisp?{background:'#16c65a',color:'#fff',borderColor:'#16c65a'}:{}} onClick={()=>setSoloDisp(v=>!v)}>
            {soloDisp ? '✓ Disponibles' : '● Disponibles'}
          </button>
          <button className={`filt-tag${!filtrocat?' on':''}`} onClick={()=>setFiltrocat('')}>Todas</button>
          {categorias.map(cat => (
            <button key={cat} className={`filt-tag${filtrocat===cat?' on':''}`} onClick={()=>setFiltrocat(filtrocat===cat?'':cat)}>
              {catIcon(cat)} {cat}
            </button>
          ))}
        </div>
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
                      : <div className="combo-img-ph" style={{background:'#1a1a1a'}}><img src={ISOTIPO} alt="Moditex" style={{width:'50px',height:'50px',objectFit:'contain',opacity:0.5}}/></div>
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
        <div className="empty"><div className="empty-icon" style={{display:'flex',justifyContent:'center',marginBottom:'15px'}}><div style={{background:'#0a0a0a',width:'80px',height:'80px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',animation:'pulse 1.5s ease-in-out infinite',boxShadow:'0 10px 25px rgba(0,0,0,0.15)'}}><img src={ISOTIPO} alt="Moditex" style={{width:'46px',objectFit:'contain',display:'block',marginLeft:'2px'}}/></div></div><div className="empty-txt" style={{fontFamily:"'DM Mono', monospace", letterSpacing:'.1em'}}>CARGANDO CATÁLOGO...</div></div>
      ) : error ? (
        <div className="empty"><div className="empty-icon">⚠️</div><div className="empty-txt">{error}</div><button className="empty-btn" onClick={cargar}>Reintentar</button></div>
      ) : modelos.length===0 ? (
        <div className="empty"><div className="empty-icon" style={{display:'flex',justifyContent:'center',marginBottom:'15px'}}><div style={{background:'#0a0a0a',width:'80px',height:'80px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}><img src={ISOTIPO} alt="Moditex" style={{width:'46px',opacity:0.6,objectFit:'contain',display:'block',marginLeft:'2px'}}/></div></div><div className="empty-txt">El catálogo está vacío por el momento.<br/>Pronto habrá novedades.</div></div>
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
                  
                  const bannersToRender = (settings.grid_banners || []).filter(b => b.posicion === globalIdx + 1);

                  return (
                    <div key={modelo.key} style={{ display: 'contents' }}>
                      <div className="card" onClick={()=>abrirModal(modelo, globalIdx)}>
                        <div className="card-img">
                          {modelo.foto_url
                            ? <img src={safeUrl(modelo.foto_url)} alt={modelo.modelo} loading="lazy"/>
                            : <div className="card-no-img" style={{background:'#1a1a1a'}}><img src={ISOTIPO} alt="Moditex" style={{width:'40px',height:'40px',objectFit:'contain',opacity:0.5}}/></div>
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
                      
                      {bannersToRender.map(b => {
                        if (b.enlace && b.enlace.trim() !== '') {
                          return (
                            <a key={`banner-${b.id}`} href={b.enlace} target="_blank" rel="noopener noreferrer" className="grid-banner" style={{ backgroundImage: `url(${safeUrl(b.imagen_url)})` }} />
                          );
                        }
                        return (
                          <div key={`banner-${b.id}`} className="grid-banner" style={{ backgroundImage: `url(${safeUrl(b.imagen_url)})` }} />
                        );
                      })}
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
                  : <div style={{width:'100%',height:'100%',minHeight:'220px',display:'flex',alignItems:'center',justifyContent:'center',background:'#1a1a1a'}}><img src={ISOTIPO} alt="Moditex" style={{width:'70px',height:'70px',objectFit:'contain',opacity:0.5}}/></div>
                }
                <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.35) 65%,transparent 100%)',padding:'36px 18px 14px',display:'flex',gap:'0',alignItems:'flex-end'}}>
                  <div style={{flex:1,borderRight:'1px solid rgba(255,255,255,.1)',paddingRight:'14px',marginRight:'14px'}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'rgba(255,255,255,.45)',letterSpacing:'.25em',textTransform:'uppercase',marginBottom:'4px'}}>AL MAYOR</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:'30px',fontWeight:700,color:'#c9a84c',textShadow:'0 2px 12px rgba(0,0,0,1)',lineHeight:1}}>€{(modal.precioMayor||0).toFixed(2)}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'rgba(255,255,255,.3)',marginTop:'3px'}}>Mín. 6 piezas · 3 por modelo</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'7px',color:'rgba(255,255,255,.45)',letterSpacing:'.25em',textTransform:'uppercase',marginBottom:'4px'}}>AL DETAL</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:'30px',fontWeight:700,color:'#fff',textShadow:'0 2px 12px rgba(0,0,0,1)',lineHeight:1}}>€{(modal.precioDetal||0).toFixed(2)}</div>
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
                  <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:'9px',fontWeight:700,color:'#92400e',letterSpacing:'.05em'}}>Ver pedido →</span>
                </div>
              )}
              <div>
                <div className="mb-cat">{catIcon(modal.categoria)} {modal.categoria}</div>
                <div className="mb-name">{modal.modelo}</div>
              </div>
              {modal.descripcion && <div className="mb-desc">{modal.descripcion}</div>}
              {modal.tela && <div className="mb-tela">Tela: {modal.tela}</div>}

              {modal.disponible_produccion && modal.nota_produccion && (
                <div style={{padding:'8px 12px', background:'rgba(59,130,246,.08)', borderLeft:'3px solid #3b82f6', fontFamily:"'Montserrat',sans-serif", fontSize:'11px', color:'#1e40af', lineHeight:1.5}}>
                  <strong style={{display:'block', marginBottom:'2px', fontFamily:"'DM Mono',monospace", fontSize:'9px', letterSpacing:'.05em'}}>🏭 INFORMACIÓN DE PRODUCCIÓN</strong>
                  {modal.nota_produccion}
                </div>
              )}

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
                <button onClick={()=>setCartOpen(false)} style={{padding:'8px 18px',background:'#0a0a0a',color:'#fff',border:'none',cursor:'pointer',fontFamily:"'Montserrat',sans-serif",fontSize:'11px',fontWeight:600,marginTop:'5px'}}>Ver catálogo</button>
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

      {/* Botón volver arriba */}
      <button
        className={`top-btn${showTop ? ' vis' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Volver arriba"
        aria-label="Volver arriba"
      >↑</button>
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