'use client';
import { colorHex } from '@/utils/colores';
import { useState, useCallback } from 'react';
import Shell from '@/components/Shell';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import ScannerInput from '@/components/ScannerInput';
import ModalPromo from '@/components/ModalPromo';
import { useAppData } from '@/lib/AppContext';

const METODOS = [
  { id:'pago_movil',    label:'Pago Móvil',  icon:'📱', divisa:'BS'   },
  { id:'transferencia', label:'Transf. BS',  icon:'🏦', divisa:'BS'   },
  { id:'efectivo_bs',   label:'Efect. BS',   icon:'💵', divisa:'BS'   },
  { id:'punto_venta',   label:'Punto Venta', icon:'💳', divisa:'BS'   },
  { id:'zelle',         label:'Zelle',       icon:'💸', divisa:'USD'  },
  { id:'efectivo_usd',  label:'Efect. USD',  icon:'🇺🇸', divisa:'USD' },
  { id:'binance',       label:'Binance',     icon:'🔶', divisa:'USDT' },
  { id:'efectivo_eur',  label:'Efectivo €',  icon:'💶', divisa:'EUR'  },
  { id:'transf_eur',    label:'Transf. €',   icon:'🇪🇺', divisa:'EUR' },
];

function fmtNum(n) { return Number(n||0).toLocaleString('es-VE', { minimumFractionDigits:2, maximumFractionDigits:2 }); }

export default function VentaDirectaPage() {
  const { data, recargar } = useAppData() || {};
  const productos = data?.productos || [];

  const [cart,     setCart]    = useState([]);
  const [catalogo, setCat]     = useState(false);
  const [cliente,  setCliente] = useState('');
  const [metodo,   setMetodo]  = useState('');
  const [divisa,   setDivisa]  = useState('EUR');
  const [monto,    setMonto]   = useState('');
  const [tasa,     setTasa]    = useState('');
  const [ref,      setRef]     = useState('');
  const [guardando,setGuard]   = useState(false);
  const [msg,      setMsg]     = useState(null);
  const [tab,      setTab]     = useState('carrito'); // 'carrito' | 'cobro' (mobile tabs)
  const [promoModal, setPromoModal] = useState(false);

  function precioItem(item) { if(item.tipoVenta==='PROMO') return item.precio||0; return item.tipoVenta==='MAYOR' ? (item.precioMayor||0) : (item.precioDetal||0); }

  const onScannerAdd = useCallback((prod, qty = 1) => {
    setCart(prev => {
      const ex = prev.find(x => x.sku === prod.sku);
      if (ex) return prev.map(x => x.sku === prod.sku ? {...x, qty: x.qty + qty} : x);
      return [...prev, {...prod, qty, tipoVenta:'DETAL'}];
    });
  }, []);

  function addFromPromo(items) {
    items.forEach(item => {
      setCart(prev => {
        const ex = prev.find(x => x.sku === item.sku && x.promoTag === item.promoTag);
        if (ex) return prev.map(x => x.sku === item.sku && x.promoTag === item.promoTag ? {...x, qty: x.qty+1} : x);
        return [...prev, {...item, tipoVenta:'PROMO'}];
      });
    });
  }

  function addFromCatalog(p, qty, tv) {
    setCart(prev => {
      const ex = prev.find(x => x.sku === p.sku);
      if (ex) return prev.map(x => x.sku === p.sku ? {...x, qty: x.qty + qty, tipoVenta: tv} : x);
      return [...prev, {...p, qty, tipoVenta: tv}];
    });
  }
  function setItemTV(sku, tv) { setCart(prev => prev.map(x => x.sku===sku ? {...x, tipoVenta:tv} : x)); }
  function changeQty(sku, d)  { setCart(prev => prev.map(x => x.sku===sku ? {...x, qty: Math.max(1, x.qty+d)} : x)); }
  function removeItem(sku)    { setCart(prev => prev.filter(x => x.sku !== sku)); }

  const totalEUR = cart.reduce((a, it) => a + precioItem(it) * it.qty, 0);
  const totalUds = cart.reduce((a, it) => a + it.qty, 0);

  const md  = parseFloat(monto) || 0;
  const ts  = parseFloat(tasa)  || 0;
  const pagandoEUR = divisa === 'BS' ? (ts > 0 ? md/ts : 0) : md;
  const vuelto = pagandoEUR > totalEUR + 0.005 ? pagandoEUR - totalEUR : 0;
  const falta  = pagandoEUR < totalEUR - 0.005 ? totalEUR - pagandoEUR : 0;
  const listo  = cart.length > 0 && metodo && md > 0;

  async function registrar() {
    if (!cart.length) { setMsg({ t:'error', m:'Agrega al menos un producto' }); return; }
    if (!metodo)      { setMsg({ t:'error', m:'Selecciona el método de pago' }); return; }
    if (md <= 0)      { setMsg({ t:'error', m:'Ingresa el monto recibido' }); return; }
    setGuard(true);
    try {
      const fecha = new Date().toISOString();
      const lote = cart.map(item => ({
        sku: item.sku, tipo:'SALIDA', cantidad: item.qty, fecha,
        concepto:'Venta Directa', contacto: cliente||'CONSUMIDOR FINAL',
        tipo_venta: item.tipoVenta, precio_venta: precioItem(item),
      }));
      const res = await fetch('/api/movimientos', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(lote)
      }).then(r => r.json());

      if (!res.ok) { setMsg({ t:'error', m: res.error }); setGuard(false); return; }

      const cmdRes = await fetch('/api/comandas', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          cliente: cliente || 'CONSUMIDOR FINAL',
          productos: cart.map(it => ({ sku:it.sku, modelo:`${it.modelo} — ${it.color}`, cant:it.qty, precio:precioItem(it), tipoVenta:it.tipoVenta })),
          precio: totalEUR, monto_pagado: Math.min(pagandoEUR, totalEUR), status:'entregado',
          notas: `Venta Directa | ${METODOS.find(m=>m.id===metodo)?.label||metodo} | ${divisa} ${md}${ref?' | Ref:'+ref:''}`,
        })
      }).then(r => r.json());

      if (cmdRes.ok && cmdRes.comanda) {
        await fetch('/api/pagos', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ comanda_id:cmdRes.comanda.id, metodo, divisa, monto_divisa:md, tasa_bs:ts, referencia:ref })
        }).catch(() => {});
      }

      const vueltoStr = vuelto > 0.01 ? ` · Vuelto € ${fmtNum(vuelto)}` : '';
      setMsg({ t:'success', m:`✅ Venta · ${totalUds} uds · € ${fmtNum(totalEUR)}${vueltoStr}` });
      setCart([]); setCliente(''); setMonto(''); setTasa(''); setRef(''); setMetodo('');
      setTab('carrito'); recargar();
    } catch { setMsg({ t:'error', m:'Error de conexión' }); }
    setGuard(false);
    setTimeout(() => setMsg(null), 6000);
  }

  return (
    <Shell title="⚡ Venta Directa">
      <style>{`
        .vd-grid { display:grid; grid-template-columns:1.15fr 0.85fr; gap:14px; align-items:start; }
        .vd-tabs { display:none; }
        .vd-panel { display:block !important; }
        @media(max-width:840px){
          .vd-grid { display:block; }
          .vd-tabs { display:flex; margin-bottom:12px; border:1px solid var(--border); border-radius:6px; overflow:hidden; }
          .vd-tab-btn { flex:1; padding:11px; border:none; cursor:pointer; font-family:'DM Mono',monospace;
            font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
            background:var(--bg2); color:#888; border-right:1px solid var(--border); transition:all .12s; }
          .vd-tab-btn:last-child { border-right:none; }
          .vd-tab-btn.active { background:var(--ink); color:#fff; }
          .vd-panel-cobro { display:none; }
          .vd-panel-cobro.visible { display:block !important; }
          .vd-panel-carrito.hidden { display:none !important; }
        }
        .item-row { display:grid; grid-template-columns:1fr auto auto auto auto; gap:8px;
          padding:10px 13px; border-bottom:1px solid var(--border); align-items:center; }
        @media(max-width:500px){
          .item-row { grid-template-columns:1fr auto auto; }
          .item-detal-mayor { display:none; }
          .item-total { display:none; }
        }
        .tv-btn { padding:5px 8px; border:none; cursor:pointer; font-family:'DM Mono',monospace;
          font-size:9px; font-weight:700; transition:all .12s; }
        .met-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }
        @media(max-width:400px){ .met-grid { grid-template-columns:repeat(2,1fr); } }
        .met-btn { padding:8px 4px; border:1px solid var(--border); cursor:pointer; text-align:center;
          background:var(--bg2); transition:all .12s; border-radius:4px; border-top:2px solid transparent; }
        .met-btn.active { background:var(--ink); color:#fff; border-top-color:#f59e0b; }
        .cobro-box { display:grid; grid-template-columns:1fr 1fr 1fr; border:1px solid var(--border);
          border-radius:4px; overflow:hidden; }
        @media(max-width:380px){ .cobro-box { grid-template-columns:1fr 1fr; } }
        .cobro-cell { padding:10px 8px; text-align:center; border-right:1px solid var(--border); }
        .cobro-cell:last-child { border-right:none; }
      `}</style>

      {catalogo && (
        <CatalogoExplorer productos={productos} modo="salida" tipoVenta="DETAL"
          onAdd={addFromCatalog} onClose={() => setCat(false)}/>
      )}

      {/* Mensaje */}
      {msg && (
        <div style={{ padding:'11px 14px', marginBottom:'12px', borderRadius:'4px',
          background: msg.t==='error' ? 'var(--red-soft)' : 'var(--green-soft)',
          borderLeft: `4px solid ${msg.t==='error' ? 'var(--red)' : 'var(--green)'}`,
          color: msg.t==='error' ? 'var(--red)' : 'var(--green)',
          fontFamily:'DM Mono,monospace', fontSize:'11px', fontWeight:700 }}>
          {msg.m}
        </div>
      )}

      {/* Cliente */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ padding:'9px 14px', background:'#fff8e1', border:'1px solid #f59e0b44',
          borderLeft:'3px solid #f59e0b', flex:1, minWidth:'200px',
          fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#92400e',
          fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase' }}>
          ⚡ Venta Directa — stock se descuenta inmediatamente
        </div>
        <input value={cliente} onChange={e => setCliente(e.target.value)}
          placeholder="Cliente (opcional)"
          style={{ padding:'9px 11px', border:'1px solid var(--border)', borderRadius:'4px',
            fontFamily:'Poppins,sans-serif', fontSize:'13px', background:'var(--bg2)',
            outline:'none', minWidth:'180px', flex:'0 0 auto' }}/>
      </div>

      {/* Tabs móvil */}
      <div className="vd-tabs">
        <button className={`vd-tab-btn${tab==='carrito'?' active':''}`} onClick={() => setTab('carrito')}>
          🛒 Carrito {cart.length > 0 ? `(${totalUds})` : ''}
        </button>
        <button className={`vd-tab-btn${tab==='cobro'?' active':''}`} onClick={() => setTab('cobro')}>
          💰 Cobrar {totalEUR > 0 ? `€${fmtNum(totalEUR)}` : ''}
        </button>
      </div>

      <div className="vd-grid">

        {/* ── IZQUIERDA: Carrito ── */}
        <div className={`vd-panel-carrito${tab==='cobro'?' hidden':''}`}>

          {/* Scanner */}
          <div style={{ display:'flex', gap:'0', alignItems:'stretch', marginBottom:'0' }}>
            <div style={{ flex:1 }}>
              <ScannerInput productos={productos} onAdd={onScannerAdd}/>
            </div>
            <button onClick={() => setCat(true)}
              style={{ padding:'0 16px', background:'#f59e0b', color:'#000', border:'none',
                cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.04em', flexShrink:0,
                whiteSpace:'nowrap', alignSelf:'stretch', marginBottom:'10px' }}>
              ⊞ Catálogo
            </button>
            <button onClick={() => setPromoModal(true)}
              style={{ padding:'0 14px', background:'#7c3aed', color:'#fff', border:'none',
                cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.04em', flexShrink:0,
                whiteSpace:'nowrap', alignSelf:'stretch', marginBottom:'10px',
                borderRadius:'0 4px 4px 0' }}>
              🎁 Promo
            </button>
          </div>

          {/* Lista carrito */}
          <div style={{ border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden', background:'var(--surface)' }}>
            <div style={{ padding:'9px 13px', background:'var(--bg2)', borderBottom:'1px solid var(--border)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#555',
                textTransform:'uppercase', letterSpacing:'.1em' }}>🛒 Carrito</span>
              {cart.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#888' }}>
                    {totalUds} uds
                  </span>
                  <button onClick={() => setCart([])}
                    style={{ padding:'2px 8px', background:'none', border:'1px solid var(--border)',
                      cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#aaa' }}>
                    ✕ VACIAR
                  </button>
                </div>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ padding:'48px 24px', textAlign:'center', color:'#aaa' }}>
                <div style={{ fontSize:'36px', marginBottom:'10px' }}>🛒</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'11px' }}>
                  Escanea un código o abre el catálogo
                </div>
              </div>
            ) : (
              <>
                {[...cart].reverse().map(item => {
                  const precio = precioItem(item);
                  const dot    = colorHex(item.color);
                  return (
                    <div key={item.sku} className="item-row">
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:dot,
                            border:'1px solid rgba(0,0,0,.12)', flexShrink:0 }}/>
                          <span style={{ fontSize:'13px', fontWeight:600,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {item.modelo} — {item.color}
                          </span>
                        </div>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', marginTop:'2px' }}>
                          {item.sku} · <strong style={{ color: item.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)' }}>
                            €{precio.toFixed(2)} ×{item.qty} = €{(precio*item.qty).toFixed(2)}
                          </strong>
                        </div>
                      </div>
                      {/* D/M buttons */}
                      <div className="item-detal-mayor" style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'3px', overflow:'hidden', flexShrink:0 }}>
                        {['DETAL','MAYOR'].map(tv => (
                          <button key={tv} className="tv-btn" onClick={() => setItemTV(item.sku, tv)}
                            style={{ background: item.tipoVenta===tv ? (tv==='DETAL'?'var(--blue)':'var(--warn)') : 'var(--bg3)',
                              color: item.tipoVenta===tv ? '#fff' : '#777' }}>
                            {tv[0]}
                          </button>
                        ))}
                      </div>
                      {/* Qty control */}
                      <div style={{ display:'flex', alignItems:'center', border:'1px solid var(--border)',
                        borderRadius:'3px', overflow:'hidden', flexShrink:0 }}>
                        <button onClick={() => changeQty(item.sku, -1)}
                          style={{ width:'28px', height:'28px', background:'var(--bg3)', border:'none', cursor:'pointer', fontSize:'15px' }}>−</button>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:'13px', fontWeight:700,
                          width:'30px', textAlign:'center', borderLeft:'1px solid var(--border)',
                          borderRight:'1px solid var(--border)', lineHeight:'28px' }}>{item.qty}</span>
                        <button onClick={() => changeQty(item.sku, 1)}
                          style={{ width:'28px', height:'28px', background:'var(--bg3)', border:'none', cursor:'pointer', fontSize:'15px' }}>+</button>
                      </div>
                      {/* Total */}
                      <div className="item-total" style={{ fontFamily:'DM Mono,monospace', fontSize:'12px',
                        fontWeight:700, minWidth:'56px', textAlign:'right', flexShrink:0 }}>
                        €{(precio*item.qty).toFixed(2)}
                      </div>
                      <button onClick={() => removeItem(item.sku)}
                        style={{ width:'22px', height:'22px', background:'none', border:'1px solid var(--border)',
                          cursor:'pointer', fontSize:'11px', color:'#888', flexShrink:0, borderRadius:'3px' }}>✕</button>
                    </div>
                  );
                })}
                {/* Total */}
                <div style={{ padding:'12px 14px', background:'var(--bg3)',
                  borderTop:'1px solid var(--border)', display:'flex',
                  justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#555',
                    textTransform:'uppercase', letterSpacing:'.1em' }}>Total</div>
                  <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'22px', fontWeight:700, color:'var(--red)' }}>
                    € {fmtNum(totalEUR)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Botón "ir a cobrar" en móvil */}
          {cart.length > 0 && (
            <button onClick={() => setTab('cobro')}
              style={{ display:'none', width:'100%', marginTop:'10px', padding:'13px',
                background:'#f59e0b', color:'#000', border:'none', cursor:'pointer',
                fontFamily:'Poppins,sans-serif', fontSize:'13px', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.06em', borderRadius:'4px' }}
              className="vd-ir-cobro">
              💰 Ir a cobrar · € {fmtNum(totalEUR)}
            </button>
          )}
        </div>

        {/* ── DERECHA: Cobro ── */}
        <div className={`vd-panel-cobro vd-panel${tab==='cobro'?' visible':''}`}
          style={{ border:'1px solid var(--border)', borderRadius:'4px',
            overflow:'hidden', background:'var(--surface)', position:'sticky', top:'70px' }}>

          {/* Header cobro */}
          <div style={{ padding:'12px 14px', background:'#fffbeb', borderBottom:'1px solid #f59e0b44',
            display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'18px' }}>💰</span>
            <div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#92400e',
                fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase' }}>Registrar Cobro</div>
              {cart.length > 0 && (
                <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'18px', fontWeight:700,
                  color:'#92400e', lineHeight:1.1, marginTop:'2px' }}>
                  € {fmtNum(totalEUR)}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:'12px', overflowY:'auto' }}>

            {/* Método de pago */}
            <div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555',
                textTransform:'uppercase', letterSpacing:'.14em', marginBottom:'7px' }}>Método de pago *</div>
              <div className="met-grid">
                {METODOS.map(m => (
                  <button key={m.id} className={`met-btn${metodo===m.id?' active':''}`}
                    onClick={() => { setMetodo(m.id); setDivisa(m.divisa); }}>
                    <div style={{ fontSize:'16px' }}>{m.icon}</div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px',
                      marginTop:'2px', lineHeight:1.2 }}>{m.label}</div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'7px', opacity:.6 }}>{m.divisa}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Monto + tasa */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555',
                  textTransform:'uppercase', letterSpacing:'.14em', marginBottom:'5px' }}>Monto recibido *</div>
                <div style={{ display:'flex', gap:'4px' }}>
                  <select value={divisa} onChange={e => setDivisa(e.target.value)}
                    style={{ width:'60px', padding:'9px 4px', background:'var(--bg2)',
                      border:'1px solid var(--border)', fontFamily:'Poppins,sans-serif',
                      fontSize:'12px', outline:'none', borderRadius:'3px 0 0 3px', flexShrink:0 }}>
                    <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
                  </select>
                  <input type="number" min="0" step="0.01" value={monto}
                    onChange={e => setMonto(e.target.value)} placeholder="0.00"
                    style={{ flex:1, padding:'9px 8px', border:'1px solid var(--border)',
                      borderLeft:'none', fontFamily:'DM Mono,monospace', fontSize:'13px',
                      background:'var(--bg2)', outline:'none', borderRadius:'0 3px 3px 0' }}/>
                </div>
              </div>
              {divisa === 'BS' ? (
                <div>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555',
                    textTransform:'uppercase', letterSpacing:'.14em', marginBottom:'5px' }}>Tasa BS/EUR</div>
                  <input type="number" value={tasa} onChange={e => setTasa(e.target.value)}
                    placeholder="96.50"
                    style={{ width:'100%', padding:'9px 8px', border:'1px solid var(--border)',
                      fontFamily:'DM Mono,monospace', fontSize:'13px', background:'var(--bg2)',
                      outline:'none', boxSizing:'border-box', borderRadius:'3px' }}/>
                  {tasa > 0 && monto > 0 && (
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px',
                      color:'var(--warn)', marginTop:'4px' }}>
                      ≈ € {fmtNum(parseFloat(monto)/parseFloat(tasa))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'flex-end' }}>
                  <div style={{ padding:'9px 10px', background:'var(--green-soft)',
                    border:'1px solid rgba(26,122,60,.2)', borderRadius:'3px',
                    fontFamily:'DM Mono,monospace', fontSize:'10px', color:'var(--green)',
                    fontWeight:700, width:'100%' }}>
                    ✓ Sin conversión
                  </div>
                </div>
              )}
            </div>

            {/* Resumen total/pagando/vuelto */}
            <div className="cobro-box">
              <div className="cobro-cell" style={{ background:'var(--bg2)' }}>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'7px', color:'#555',
                  textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'4px' }}>Total</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'14px',
                  fontWeight:700, color:'var(--red)' }}>€ {fmtNum(totalEUR)}</div>
              </div>
              <div className="cobro-cell" style={{ background:'var(--bg2)' }}>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'7px', color:'#555',
                  textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'4px' }}>Pagando</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'13px', fontWeight:700, color:'var(--green)' }}>
                  {md > 0 ? `${divisa==='BS'?'Bs.':divisa+' '}${fmtNum(md)}` : '—'}
                </div>
                {divisa==='BS' && pagandoEUR > 0 && (
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#888' }}>
                    ≈ € {fmtNum(pagandoEUR)}
                  </div>
                )}
              </div>
              {md > 0 && totalEUR > 0 ? (
                vuelto > 0.01 ? (
                  <div className="cobro-cell" style={{ background:'var(--green-soft)' }}>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'7px', color:'var(--green)',
                      textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'4px' }}>Vuelto</div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'14px',
                      fontWeight:700, color:'var(--green)' }}>€ {fmtNum(vuelto)}</div>
                    {divisa==='BS' && ts > 0 && (
                      <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'var(--green)' }}>
                        Bs. {fmtNum(vuelto*ts)}
                      </div>
                    )}
                  </div>
                ) : falta > 0.01 ? (
                  <div className="cobro-cell" style={{ background:'#fff8e1' }}>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'7px', color:'#92400e',
                      textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'4px' }}>Falta</div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'14px',
                      fontWeight:700, color:'#f59e0b' }}>€ {fmtNum(falta)}</div>
                  </div>
                ) : (
                  <div className="cobro-cell" style={{ background:'var(--green-soft)',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:'24px', color:'var(--green)' }}>✓</span>
                  </div>
                )
              ) : (
                <div className="cobro-cell" style={{ background:'var(--bg2)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#ccc' }}>—</span>
                </div>
              )}
            </div>

            {/* Referencia */}
            <div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555',
                textTransform:'uppercase', letterSpacing:'.14em', marginBottom:'5px' }}>
                Referencia / N° operación
              </div>
              <input value={ref} onChange={e => setRef(e.target.value)}
                placeholder="Últimos 6 dígitos..."
                style={{ width:'100%', padding:'9px 10px', border:'1px solid var(--border)',
                  borderRadius:'3px', fontFamily:'Poppins,sans-serif', fontSize:'13px',
                  background:'var(--bg2)', outline:'none', boxSizing:'border-box' }}/>
            </div>

          </div>

          {/* Botón COBRAR */}
          <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', background:'var(--bg2)' }}>
            <button onClick={registrar} disabled={guardando || !cart.length}
              style={{ width:'100%', padding:'14px', background: listo?'var(--green)':'#ccc',
                color:'#fff', border:'none', cursor: cart.length?'pointer':'not-allowed',
                fontFamily:'Poppins,sans-serif', fontSize:'14px', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.06em', borderRadius:'4px',
                opacity: guardando ? .65 : 1, transition:'background .2s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
              {guardando ? '⏳ Procesando...' : <><span>⚡</span><span>COBRAR · € {fmtNum(totalEUR)}</span></>}
            </button>
            {!cart.length && (
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#aaa',
                textAlign:'center', marginTop:'6px' }}>
                Agrega productos al carrito
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS extra para botón móvil "Ir a cobrar" */}
      <style>{`
        @media(max-width:840px){
          .vd-ir-cobro { display:block !important; }
        }
      `}</style>
    </Shell>
  );
}
