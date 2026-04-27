'use client';
import { useState, useMemo } from 'react';
import Shell from '@/components/Shell';
import ScannerInput from '@/components/ScannerInput';
import ModalPromo from '@/components/ModalPromo';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import { useAppData } from '@/lib/AppContext';
import { colorHex } from '@/utils/colores';

function fmt(n) { return '€ ' + Number(n||0).toFixed(2); }

const METODOS = [
  { id:'efectivo',      label:'Efectivo',  icon:'💵', divisa:'EUR'  },
  { id:'transferencia', label:'Transfer',  icon:'🏦', divisa:'EUR'  },
  { id:'bs',            label:'Bs',        icon:'🇻🇪', divisa:'BS'   },
  { id:'usd',           label:'USD',       icon:'💵', divisa:'USD'  },
  { id:'usdt',          label:'USDT',      icon:'💎', divisa:'USDT' },
];

export default function EnvioRapidoPage() {
  const { data, recargar } = useAppData() || {};
  const productos = data?.productos || [];

  const [cart,       setCart]       = useState([]);
  const [metodo,     setMetodo]     = useState('efectivo');
  const [divisa,     setDivisa]     = useState('EUR');
  const [tasaBs,     setTasaBs]     = useState('');
  const [montoPag,   setMontoPag]   = useState('');
  const [contacto,   setContacto]   = useState('');
  const [notas,      setNotas]      = useState('');
  const [guardando,  setGuardando]  = useState(false);
  const [msg,        setMsg]        = useState(null);
  const [promoModal, setPromoModal] = useState(false);
  const [catModal,   setCatModal]   = useState(false);
  const [buscar,     setBuscar]     = useState('');

  // ── Multi-pago ──
  const [modoMultipago,  setModoMultipago]  = useState(false);
  const [pagosAgregados, setPagosAgregados] = useState([]);
  const [metodoMulti,    setMetodoMulti]    = useState('efectivo');
  const [montoMulti,     setMontoMulti]     = useState('');
  const [tasaMulti,      setTasaMulti]      = useState('');
  const [divisaMulti,    setDivisaMulti]    = useState('EUR');

  // ── Búsqueda rápida ──
  const prodsFiltrados = useMemo(() => {
    const q = buscar.toLowerCase().trim();
    if (!q) return [];
    return productos.filter(p =>
      `${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [productos, buscar]);

  function addFromPromo(items) {
    items.forEach(item => {
      setCart(prev => {
        const ex = prev.find(x => x.sku === item.sku && x.promoTag === item.promoTag);
        if (ex) return prev.map(x => x.sku===item.sku&&x.promoTag===item.promoTag ? {...x,qty:x.qty+1} : x);
        return [...prev, {...item, precio: item.precio || item.precioDetal || 0}];
      });
    });
  }

  function addToCart(prod, qty = 1) {
    setCart(prev => {
      const ex = prev.find(x => x.sku === prod.sku);
      if (ex) return prev.map(x => x.sku === prod.sku ? {...x, qty: x.qty + qty} : x);
      return [...prev, {...prod, qty, precio: prod.precioDetal || 0}];
    });
    setBuscar('');
  }

  function addFromCatalog(prod, qty = 1, tv = 'MAYOR') {
    setCart(prev => {
      const ex = prev.find(x => x.sku === prod.sku);
      if (ex) return prev.map(x => x.sku === prod.sku ? {...x, qty: x.qty + qty} : x);
      return [...prev, {...prod, qty, precio: tv === 'MAYOR' ? (prod.precioMayor || prod.precioDetal || 0) : (prod.precioDetal || 0)}];
    });
  }

  function setQty(sku, delta) {
    setCart(prev => prev.map(x => x.sku === sku ? {...x, qty: Math.max(1, x.qty + delta)} : x));
  }
  function setPrecio(sku, val) {
    setCart(prev => prev.map(x => x.sku === sku ? {...x, precio: parseFloat(val)||0} : x));
  }
  function removeItem(sku) {
    setCart(prev => prev.filter(x => x.sku !== sku));
  }

  const totalEUR      = cart.reduce((a, x) => a + x.precio * x.qty, 0);
  const totalUds      = cart.reduce((a, x) => a + x.qty, 0);
  const totalMultiEUR = pagosAgregados.reduce((a, p) => a + p.montoEUR, 0);

  // ── Multi-pago helpers ──
  function agregarPagoMulti() {
    const md = parseFloat(montoMulti) || 0;
    const ts = parseFloat(tasaMulti)  || 0;
    if (!metodoMulti || md <= 0) return;
    const montoEUR = divisaMulti === 'BS' ? (ts > 0 ? md / ts : 0) : md;
    setPagosAgregados(prev => [...prev, { metodo: metodoMulti, divisa: divisaMulti, monto: md, tasa: ts, montoEUR }]);
    setMontoMulti('');
  }
  function quitarPagoMulti(i) {
    setPagosAgregados(prev => prev.filter((_, j) => j !== i));
  }

  // ── Registrar envío ──
  async function registrar() {
    if (!cart.length)       { setMsg({ t:'error', m:'Agrega al menos un producto' }); return; }
    if (!contacto.trim())   { setMsg({ t:'error', m:'El nombre del cliente es requerido' }); return; }
    setGuardando(true);
    try {
      const fecha = new Date().toISOString().split('T')[0];

      // Construir string de pagos para el concepto/log
      let pagosStr = '';
      if (modoMultipago && pagosAgregados.length > 0) {
        pagosStr = pagosAgregados.map(p => {
          const m = METODOS.find(x => x.id === p.metodo);
          return `${m?.label || p.metodo}: ${p.divisa} ${p.monto.toFixed(2)}`;
        }).join(' + ');
      } else {
        const m = METODOS.find(x => x.id === metodo);
        const montoStr = montoPag ? `${divisa} ${montoPag}` : fmt(totalEUR);
        pagosStr = `${m?.label || metodo}: ${montoStr}`;
      }

      const concepto = `Envío rápido — ${contacto}${notas ? ' | ' + notas : ''} | ${pagosStr}`;

      // 1. Registrar salidas de almacén
      const movs = cart.map(item => ({
        sku: item.sku,
        tipo: 'SALIDA',
        cantidad: item.qty,
        fecha,
        concepto,
        contacto,
        tipo_venta: 'MAYOR',
        precio_venta: item.precio,
      }));
      const resMov = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movs),
      }).then(r => r.json());

      if (!resMov.ok) {
        setMsg({ t:'error', m: resMov.error || 'Error al registrar movimientos' });
        setGuardando(false);
        return;
      }

      // 2. Log
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'ENVIO_RAPIDO',
          detalle: `${contacto} | ${totalUds} uds | €${totalEUR.toFixed(2)} | ${pagosStr}`,
        }),
      }).catch(() => {});

      setMsg({ t:'ok', m:`✅ Envío registrado — ${totalUds} uds · ${fmt(totalEUR)} · ${contacto}` });
      setCart([]); setContacto(''); setNotas(''); setMontoPag('');
      setPagosAgregados([]); setMontoMulti(''); setTasaMulti('');
      recargar();
    } catch {
      setMsg({ t:'error', m:'Error de conexión' });
    }
    setGuardando(false);
    setTimeout(() => setMsg(null), 7000);
  }

  return (
    <Shell title="Envío Rápido">
      {promoModal && <ModalPromo productos={productos} isAdmin={true} onAdd={addFromPromo} onClose={()=>setPromoModal(false)}/>}
      {catModal   && <CatalogoExplorer productos={productos} modo="salida" tipoVenta="MAYOR" onAdd={addFromCatalog} onClose={()=>setCatModal(false)}/>}

      <style>{`
        .er-inp { width:100%; padding:9px 11px; border:1px solid var(--border);
          font-family:'Poppins',sans-serif; font-size:13px; background:var(--bg2);
          outline:none; box-sizing:border-box; border-radius:3px; }
        .er-lbl { font-family:'DM Mono',monospace; font-size:8px; letter-spacing:.16em;
          text-transform:uppercase; color:#666; display:block; margin-bottom:5px; }
        .met-btn { padding:8px 14px; border:1px solid var(--border); border-radius:4px;
          cursor:pointer; background:var(--bg2); font-size:12px;
          font-family:'Poppins',sans-serif; transition:all .12s; white-space:nowrap; }
        .met-btn.active { background:var(--ink); color:#fff; border-color:var(--ink); }
        .qty-ctrl { display:flex; align-items:center; border:1px solid var(--border); border-radius:3px; overflow:hidden; }
        .qty-btn { width:26px; height:26px; border:none; background:var(--bg3); cursor:pointer; font-size:15px; }
        .qty-btn:hover { background:var(--border); }
        .qty-n { width:34px; text-align:center; font-family:'DM Mono',monospace; font-size:12px;
          font-weight:700; border-left:1px solid var(--border); border-right:1px solid var(--border);
          background:var(--bg2); padding:4px 0; }
        .mp-met-btn { padding:6px 4px; border:1px solid var(--border); border-radius:3px;
          cursor:pointer; background:var(--bg2); font-family:'Poppins',sans-serif;
          transition:all .12s; text-align:center; }
        .mp-met-btn.active { background:var(--ink); color:#fff; border-color:var(--ink); }
        .mp-met-btn:hover:not(.active) { background:var(--bg3); }
      `}</style>

      {/* Banner */}
      <div style={{ padding:'9px 14px', background:'rgba(245,158,11,.08)',
        border:'1px solid rgba(245,158,11,.3)', marginBottom:'16px',
        fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#9a6700', lineHeight:1.7, borderRadius:'3px' }}>
        ⚡ <strong>Envío Rápido</strong> — Escanea o busca productos, registra el pago y despacha.
        Sin etapas ni seguimiento de comanda. Solo para pedidos que salen en el momento.
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{ padding:'11px 14px', marginBottom:'14px', borderRadius:'3px',
          background: msg.t==='ok' ? 'var(--green-soft)' : 'var(--red-soft)',
          border: `1px solid ${msg.t==='ok' ? 'rgba(26,122,60,.3)' : 'rgba(217,30,30,.3)'}`,
          color: msg.t==='ok' ? 'var(--green)' : 'var(--red)',
          fontFamily:'DM Mono,monospace', fontSize:'11px', fontWeight:700 }}>
          {msg.m}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'16px', alignItems:'start' }}>

        {/* ── COL 1: Productos ── */}
        <div>
          {/* Scanner — skipStockCheck evita la verificación de stock sin interrumpir */}
          <ScannerInput
            productos={productos}
            onAdd={addToCart}
            skipStockCheck={true}
            extraActions={[
              { label:'⊞ Catálogo',      onClick:()=>setCatModal(true),   bg:'#f59e0b', color:'#000' },
              { label:'🎁 Promo / Combo', onClick:()=>setPromoModal(true), bg:'#7c3aed', color:'#fff' },
            ]}
          />

          {/* Búsqueda manual */}
          <div style={{ marginBottom:'10px', position:'relative', marginTop:'8px' }}>
            <input className="er-inp"
              value={buscar} onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar por modelo, SKU, color…"/>
            {prodsFiltrados.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50,
                background:'var(--bg)', border:'1px solid var(--border)', borderTop:'none',
                borderRadius:'0 0 4px 4px', maxHeight:'240px', overflowY:'auto',
                boxShadow:'0 4px 12px rgba(0,0,0,.12)' }}>
                {prodsFiltrados.map(p => (
                  <div key={p.sku} onClick={() => addToCart(p)}
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px',
                      cursor:'pointer', borderBottom:'1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <span style={{ width:'9px', height:'9px', borderRadius:'50%',
                      background:colorHex(p.color), border:'0.5px solid rgba(0,0,0,.12)', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'12px', fontWeight:500 }}>
                        {p.modelo} — {p.color}
                        {p.talla && p.talla !== 'UNICA' && <span style={{ color:'#888', fontWeight:400 }}> · {p.talla}</span>}
                      </div>
                      <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888' }}>
                        {p.sku} · Stock: {p.disponible} · {fmt(p.precioDetal)}
                      </div>
                    </div>
                    <span style={{ fontSize:'18px', color:'var(--green)', fontWeight:700 }}>+</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Lista de items del carrito ── */}
          <div style={{ border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden' }}>
            {/* Header fijo */}
            <div style={{ padding:'9px 13px', background:'var(--bg2)', borderBottom:'1px solid var(--border)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#555',
                textTransform:'uppercase', letterSpacing:'.1em' }}>
                Productos del envío
                {cart.length > 0 && <span style={{ marginLeft:'8px', color:'var(--blue)', fontWeight:700 }}>
                  ({cart.length} líneas)
                </span>}
              </span>
              <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px',
                  color: cart.length ? 'var(--blue)' : '#aaa' }}>
                  {totalUds} uds · {fmt(totalEUR)}
                </span>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])}
                    style={{ padding:'2px 8px', background:'none', border:'1px solid var(--border)',
                      cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#aaa' }}>
                    ✕ LIMPIAR
                  </button>
                )}
              </div>
            </div>

            {/* ── Zona scrollable ── */}
            <div style={{ maxHeight:'52vh', overflowY:'auto' }}>
              {cart.length === 0 ? (
                <div style={{ padding:'40px', textAlign:'center', color:'#aaa' }}>
                  <div style={{ fontSize:'32px', marginBottom:'8px' }}>📦</div>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'11px' }}>
                    Escanea o busca para agregar productos
                  </div>
                </div>
              ) : (
                [...cart].reverse().map(item => {
                  const dot = colorHex(item.color);
                  return (
                    <div key={item.sku} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto',
                      gap:'10px', padding:'10px 13px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:dot,
                            border:'1px solid rgba(0,0,0,.12)', flexShrink:0 }}/>
                          <span style={{ fontSize:'13px', fontWeight:600 }}>{item.modelo} — {item.color}</span>
                        </div>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', marginTop:'2px' }}>
                          {item.sku} · Stock: {item.disponible}
                          {item.precio > 0 && <span style={{ color:'var(--ink)', fontWeight:600 }}> · subtotal {fmt(item.precio * item.qty)}</span>}
                        </div>
                      </div>
                      {/* Precio editable */}
                      <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#888' }}>€</span>
                        <input type="number" step="0.01" min="0"
                          value={item.precio}
                          onChange={e => setPrecio(item.sku, e.target.value)}
                          style={{ width:'68px', padding:'4px 7px', border:'1px solid var(--border)',
                            fontFamily:'DM Mono,monospace', fontSize:'12px', textAlign:'right',
                            background:'var(--bg2)', outline:'none', borderRadius:'3px' }}/>
                      </div>
                      {/* Cantidad */}
                      <div className="qty-ctrl">
                        <button className="qty-btn" onClick={() => setQty(item.sku, -1)}>−</button>
                        <span className="qty-n">{item.qty}</span>
                        <button className="qty-btn" onClick={() => setQty(item.sku, 1)}>+</button>
                      </div>
                      <button onClick={() => removeItem(item.sku)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#bbb',
                          fontSize:'18px', padding:'2px', lineHeight:1 }}>×</button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con total — siempre visible */}
            {cart.length > 0 && (
              <div style={{ padding:'9px 13px', background:'var(--bg3)',
                borderTop:'2px solid var(--border)',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#666',
                  textTransform:'uppercase', letterSpacing:'.1em' }}>
                  {totalUds} unidades
                </span>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'17px', fontWeight:700, color:'var(--red)' }}>
                  {fmt(totalEUR)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── COL 2: Pago y despacho ── */}
        <div style={{ border:'1px solid var(--border)', borderRadius:'4px',
          overflow:'hidden', background:'var(--surface)', position:'sticky', top:'80px' }}>

          {/* Header con total */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555',
              textTransform:'uppercase', letterSpacing:'.14em', marginBottom:'2px' }}>Pago y despacho</div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'18px', fontWeight:700, color:'var(--red)' }}>
              {fmt(totalEUR)}
            </div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#888' }}>
              {totalUds} unidades
            </div>
          </div>

          <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:'12px' }}>
            {/* Cliente */}
            <div>
              <label className="er-lbl">Cliente / Destinatario *</label>
              <input className="er-inp" value={contacto} onChange={e => setContacto(e.target.value)}
                placeholder="Nombre o WhatsApp…"/>
            </div>

            {/* Toggle UN PAGO / MULTIPAGO */}
            <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden' }}>
              <button
                onClick={() => { setModoMultipago(false); setPagosAgregados([]); }}
                style={{ flex:1, padding:'8px', border:'none', cursor:'pointer',
                  fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700,
                  letterSpacing:'.08em', textTransform:'uppercase', transition:'all .12s',
                  background: !modoMultipago ? 'var(--ink)' : 'var(--bg2)',
                  color:       !modoMultipago ? '#fff'      : '#666',
                  borderRight: '1px solid var(--border)' }}>
                💵 Un pago
              </button>
              <button
                onClick={() => setModoMultipago(true)}
                style={{ flex:1, padding:'8px', border:'none', cursor:'pointer',
                  fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700,
                  letterSpacing:'.08em', textTransform:'uppercase', transition:'all .12s',
                  background: modoMultipago  ? 'var(--ink)' : 'var(--bg2)',
                  color:      modoMultipago  ? '#fff'      : '#666' }}>
                🔀 Multipago
              </button>
            </div>

            {/* ═══════ MODO PAGO ÚNICO ═══════ */}
            {!modoMultipago && <>
              {/* Método */}
              <div>
                <label className="er-lbl">Método de pago</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {METODOS.map(m => (
                    <button key={m.id} className={`met-btn${metodo===m.id?' active':''}`}
                      onClick={() => { setMetodo(m.id); setDivisa(m.divisa); }}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tasa BS */}
              {metodo === 'bs' && (
                <div>
                  <label className="er-lbl">Tasa BS/€</label>
                  <input className="er-inp" type="number" step="0.01"
                    value={tasaBs} onChange={e => setTasaBs(e.target.value)}
                    placeholder="ej: 96.50"/>
                  {tasaBs > 0 && totalEUR > 0 && (
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'var(--warn)', marginTop:'4px' }}>
                      = Bs {(totalEUR * parseFloat(tasaBs)).toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {/* Monto pagado */}
              <div>
                <label className="er-lbl">Monto recibido ({divisa})</label>
                <input className="er-inp" type="number" step="0.01"
                  value={montoPag} onChange={e => setMontoPag(e.target.value)}
                  placeholder={fmt(totalEUR)}/>
                {montoPag > 0 && parseFloat(montoPag) >= totalEUR && (
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'var(--green)', marginTop:'4px' }}>
                    Cambio: {fmt(parseFloat(montoPag) - totalEUR)}
                  </div>
                )}
              </div>
            </>}

            {/* ═══════ MODO MULTIPAGO ═══════ */}
            {modoMultipago && <>
              {/* Lista de pagos ya agregados */}
              {pagosAgregados.length > 0 && (
                <div style={{ border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden' }}>
                  {pagosAgregados.map((p, i) => {
                    const mCfg = METODOS.find(m => m.id === p.metodo);
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'8px 12px', background:'var(--bg2)',
                        borderBottom: i < pagosAgregados.length-1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'15px' }}>{mCfg?.icon}</span>
                          <div>
                            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', fontWeight:700 }}>
                              {p.divisa} {p.monto.toFixed(2)}
                              {p.tasa > 0 && p.divisa === 'BS' && (
                                <span style={{ color:'#888', fontWeight:400 }}> ÷ {p.tasa} → </span>
                              )}
                            </div>
                            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#666' }}>
                              {mCfg?.label} · ≈ € {p.montoEUR.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => quitarPagoMulti(i)}
                          style={{ background:'none', border:'none', cursor:'pointer',
                            color:'#bbb', fontSize:'18px', lineHeight:1, padding:'2px' }}>×</button>
                      </div>
                    );
                  })}
                  {/* Barra de progreso / resumen */}
                  <div style={{
                    padding:'8px 12px',
                    background: totalMultiEUR >= totalEUR ? 'var(--green-soft)' : 'rgba(245,158,11,.08)',
                    borderTop:'1px solid var(--border)',
                    display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700,
                      color: totalMultiEUR >= totalEUR ? 'var(--green)' : '#9a6700', textTransform:'uppercase' }}>
                      {totalMultiEUR >= totalEUR
                        ? `✓ Cubierto (vuelto ${fmt(totalMultiEUR - totalEUR)})`
                        : `Falta ${fmt(totalEUR - totalMultiEUR)}`}
                    </span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', fontWeight:700,
                      color: totalMultiEUR >= totalEUR ? 'var(--green)' : 'var(--warn)' }}>
                      € {totalMultiEUR.toFixed(2)} / € {totalEUR.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Formulario agregar pago */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
                borderRadius:'4px', padding:'11px 12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555',
                  textTransform:'uppercase', letterSpacing:'.14em', marginBottom:'2px' }}>
                  + Agregar pago
                </div>

                {/* Selección de método */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'4px' }}>
                  {METODOS.map(m => (
                    <button key={m.id} className={`mp-met-btn${metodoMulti===m.id?' active':''}`}
                      onClick={() => { setMetodoMulti(m.id); setDivisaMulti(m.divisa); }}>
                      <div style={{ fontSize:'13px' }}>{m.icon}</div>
                      <div style={{ fontFamily:'DM Mono,monospace', fontSize:'7px', marginTop:'2px', lineHeight:1.2 }}>
                        {m.label}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Divisa + monto + botón agregar */}
                <div style={{ display:'flex', gap:'6px' }}>
                  <select value={divisaMulti} onChange={e => setDivisaMulti(e.target.value)}
                    style={{ width:'58px', padding:'8px 4px', background:'var(--bg)', border:'1px solid var(--border)',
                      fontFamily:'Poppins,sans-serif', fontSize:'12px', outline:'none',
                      borderRadius:'3px', flexShrink:0 }}>
                    <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
                  </select>
                  <input type="number" step="0.01" min="0"
                    value={montoMulti} onChange={e => setMontoMulti(e.target.value)}
                    placeholder="0.00"
                    onKeyDown={e => e.key === 'Enter' && agregarPagoMulti()}
                    style={{ flex:1, padding:'8px 10px', border:'1px solid var(--border)',
                      fontFamily:'DM Mono,monospace', fontSize:'13px', background:'var(--bg)',
                      outline:'none', borderRadius:'3px' }}/>
                  <button onClick={agregarPagoMulti}
                    disabled={!montoMulti || parseFloat(montoMulti) <= 0}
                    style={{ padding:'8px 12px', background:'var(--green)', color:'#fff',
                      border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif',
                      fontSize:'12px', fontWeight:700, borderRadius:'3px', flexShrink:0,
                      opacity: (!montoMulti || parseFloat(montoMulti) <= 0) ? .45 : 1,
                      transition:'opacity .12s' }}>
                    + Agregar
                  </button>
                </div>

                {/* Tasa si BS */}
                {divisaMulti === 'BS' && (
                  <input type="number" step="0.01" min="0"
                    value={tasaMulti} onChange={e => setTasaMulti(e.target.value)}
                    placeholder="Tasa BS/€ — ej: 96.50"
                    style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)',
                      fontFamily:'DM Mono,monospace', fontSize:'13px', background:'var(--bg)',
                      outline:'none', borderRadius:'3px', boxSizing:'border-box' }}/>
                )}
                {divisaMulti === 'BS' && tasaMulti > 0 && montoMulti > 0 && (
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'var(--warn)' }}>
                    Bs {parseFloat(montoMulti).toFixed(2)} ÷ {parseFloat(tasaMulti).toFixed(2)} = € {(parseFloat(montoMulti)/parseFloat(tasaMulti)).toFixed(2)}
                  </div>
                )}
              </div>
            </>}

            {/* Notas */}
            <div>
              <label className="er-lbl">Notas (opcional)</label>
              <input className="er-inp" value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Dirección, referencia, observación…"/>
            </div>

            {/* Botón despachar */}
            <button onClick={registrar} disabled={guardando || !cart.length}
              style={{ width:'100%', padding:'13px',
                background: cart.length ? '#d91e1e' : '#ccc',
                color:'#fff', border:'none', cursor: cart.length ? 'pointer' : 'not-allowed',
                fontFamily:'Poppins,sans-serif', fontSize:'13px', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.08em', borderRadius:'4px',
                transition:'opacity .12s', opacity: guardando ? .7 : 1 }}>
              {guardando ? 'Registrando...' : `⚡ Despachar (${totalUds} uds · ${fmt(totalEUR)})`}
            </button>

            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#aaa',
              textAlign:'center', lineHeight:1.6 }}>
              Registra la salida del almacén y el movimiento.<br/>No crea comanda ni requiere seguimiento.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}