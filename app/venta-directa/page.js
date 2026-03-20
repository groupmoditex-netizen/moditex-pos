'use client';
import { colorHex } from '@/utils/colores';
import { useState, useEffect, useRef, useCallback } from 'react';
import Shell from '@/components/Shell';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useAppData } from '@/lib/AppContext';

const METODOS=[
  {id:'pago_movil',  label:'Pago Móvil',  icon:'📱',divisa:'BS'},
  {id:'transferencia',label:'Transf. BS', icon:'🏦',divisa:'BS'},
  {id:'efectivo_bs', label:'Efect. BS',   icon:'💵',divisa:'BS'},
  {id:'punto_venta', label:'Punto Venta', icon:'💳',divisa:'BS'},
  {id:'zelle',       label:'Zelle',       icon:'💸',divisa:'USD'},
  {id:'efectivo_usd',label:'Efect. USD',  icon:'🇺🇸',divisa:'USD'},
  {id:'binance',     label:'Binance',     icon:'🔶',divisa:'USDT'},
  {id:'efectivo_eur',label:'Efectivo €',  icon:'💶',divisa:'EUR'},
  {id:'transf_eur',  label:'Transf. €',   icon:'🇪🇺',divisa:'EUR'},
];

const inp={width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',boxSizing:'border-box'};
const lbl={fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'4px'};
function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}

export default function VentaDirectaPage() {
  const { data, recargar } = useAppData()||{};
  const productos = data?.productos || [];

  const [cart,    setCart]   = useState([]);
  const [catalogo,setCat]    = useState(false);
  const [cliente, setCliente]= useState('');
  const [metodo,  setMetodo] = useState('');
  const [divisa,  setDivisa] = useState('EUR');
  const [monto,   setMonto]  = useState('');
  const [tasa,    setTasa]   = useState('');
  const [ref,     setRef]    = useState('');
  const [guardando,setGuard] = useState(false);
  const [msg,     setMsg]    = useState(null);

  function precioItem(item){ return item.tipoVenta==='MAYOR'?(item.precioMayor||0):(item.precioDetal||0); }

  function addProd(p) {
    const prod = productos.find(x=>x.sku===p.sku)||p;
    setCart(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+1}:x);
      return[...prev,{...prod,qty:1,tipoVenta:'DETAL'}];
    });
  }

  function addFromCatalog(p, qty, tv) {
    setCart(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty,tipoVenta:tv}:x);
      return[...prev,{...p,qty,tipoVenta:tv}];
    });
  }

  function setItemTV(sku,tv){setCart(prev=>prev.map(x=>x.sku===sku?{...x,tipoVenta:tv}:x));}
  function changeQty(sku,d){setCart(prev=>prev.map(x=>x.sku===sku?{...x,qty:Math.max(1,x.qty+d)}:x));}
  function removeItem(sku){setCart(prev=>prev.filter(x=>x.sku!==sku));}

  const totalEUR = cart.reduce((a,it)=>a+precioItem(it)*it.qty,0);

  const md=parseFloat(monto)||0, ts=parseFloat(tasa)||0;
  let previewEUR=0, previewBS=0;
  if(divisa==='BS')                       {previewBS=md;previewEUR=ts>0?md/ts:0;}
  else if(divisa==='EUR')                 {previewEUR=md;previewBS=ts>0?md*ts:0;}
  else if(divisa==='USD'||divisa==='USDT'){previewEUR=md*0.93;previewBS=ts>0?md*ts:0;}

  const vuelto = previewEUR>totalEUR ? previewEUR-totalEUR : 0;
  const falta  = previewEUR<totalEUR ? totalEUR-previewEUR : 0;

  async function registrar() {
    if(!cart.length){setMsg({t:'error',m:'Agrega al menos un producto'});return;}
    if(!metodo){setMsg({t:'error',m:'Selecciona el método de pago'});return;}
    if(md<=0){setMsg({t:'error',m:'Ingresa el monto recibido'});return;}
    setGuard(true);
    try {
      const fecha=new Date().toISOString();
      const lote=cart.map(item=>({
        sku:item.sku,tipo:'SALIDA',cantidad:item.qty,fecha,
        concepto:'Venta Directa',
        contacto:cliente||'CONSUMIDOR FINAL',
        tipo_venta:item.tipoVenta,
        precio_venta:precioItem(item),
      }));
      const res=await fetch('/api/movimientos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lote)}).then(r=>r.json());
      if(!res.ok){setMsg({t:'error',m:res.error});setGuard(false);return;}

      const cmdRes=await fetch('/api/comandas',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          cliente:cliente||'CONSUMIDOR FINAL',
          productos:cart.map(it=>({sku:it.sku,modelo:`${it.modelo} — ${it.color}`,cant:it.qty,precio:precioItem(it),tipoVenta:it.tipoVenta})),
          precio:totalEUR, monto_pagado:Math.min(previewEUR,totalEUR), status:'entregado',
          notas:`Venta Directa | ${METODOS.find(m=>m.id===metodo)?.label||metodo} | ${divisa} ${md}${ref?' | Ref:'+ref:''}`,
        })}).then(r=>r.json());

      if(cmdRes.ok&&cmdRes.comanda) {
        try { await fetch('/api/pagos',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({comanda_id:cmdRes.comanda.id,metodo,divisa,monto_divisa:md,tasa_bs:ts,referencia:ref})
        }).then(r=>r.json()); } catch(_){}
      }

      setMsg({t:'success',m:`✅ Venta registrada · ${cart.reduce((a,i)=>a+i.qty,0)} uds · € ${fmtNum(totalEUR)}`});
      setCart([]); setCliente(''); setMonto(''); setTasa(''); setRef(''); setMetodo('');
      recargar();
    } catch(e){setMsg({t:'error',m:'Error de conexión'});}
    setGuard(false);
    setTimeout(()=>setMsg(null),5000);
  }

  return (
    <Shell title="⚡ Venta Directa">
      {catalogo&&<CatalogoExplorer productos={productos} modo="salida" tipoVenta="DETAL" onAdd={addFromCatalog} onClose={()=>setCat(false)}/>}

      <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'14px',flexWrap:'wrap'}}>
        <div style={{padding:'10px 16px',background:'#fff8e1',border:'1px solid #f59e0b44',borderLeft:'4px solid #f59e0b',flex:1,minWidth:'250px'}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#92400e',fontWeight:700,marginBottom:'2px'}}>⚡ VENTA DIRECTA — Stock se descuenta inmediatamente</div>
          <div style={{fontSize:'11px',color:'#666'}}>Cada producto puede ser Detal o Mayor por separado con los botones D/M.</div>
        </div>
        <div style={{minWidth:'200px'}}>
          <label style={lbl}>Cliente (opcional)</label>
          <input value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="CONSUMIDOR FINAL" style={inp}/>
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',marginBottom:'14px',background:msg.t==='error'?'var(--red-soft)':'var(--green-soft)',border:`1px solid ${msg.t==='error'?'rgba(217,30,30,.3)':'rgba(26,122,60,.3)'}`,color:msg.t==='error'?'var(--red)':'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{msg.m}</div>}

      <div className="vd-layout">
        {/* IZQUIERDA — Productos */}
        <div>
          {/* Scanner de código de barras */}
          <BarcodeScanner productos={productos} onAdd={addProd} disabled={guardando}/>

          <button onClick={()=>setCat(true)}
            style={{width:'100%',padding:'10px',background:'var(--bg2)',color:'var(--ink)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'10px'}}>
            <span style={{fontSize:'15px'}}>⊞</span> Abrir Catálogo
          </button>

          <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
            <div style={{padding:'8px 13px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',letterSpacing:'.1em',textTransform:'uppercase'}}>
              <span>Carrito</span>
              <span style={{color:'var(--red)'}}>{cart.reduce((a,i)=>a+i.qty,0)} uds</span>
            </div>
            {cart.length===0
              ?<div style={{padding:'36px',textAlign:'center',color:'#888',fontSize:'13px'}}>Escanea un código o abre el catálogo 👆</div>
              :cart.map(item=>{
                const precio=precioItem(item),dot=colorHex(item.color);
                return(
                  <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'8px',padding:'9px 13px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                        <span style={{width:'7px',height:'7px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                        <span style={{fontSize:'12px',fontWeight:600}}>{item.modelo} — {item.color}</span>
                      </div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'1px'}}>{item.sku} · <strong style={{color:item.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)'}}>€{precio.toFixed(2)} × {item.qty} = €{(precio*item.qty).toFixed(2)}</strong></div>
                    </div>
                    {/* Toggle D/M por item */}
                    <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                      {['DETAL','MAYOR'].map(tv=><button key={tv} onClick={()=>setItemTV(item.sku,tv)} style={{padding:'4px 7px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,background:item.tipoVenta===tv?(tv==='DETAL'?'var(--blue)':'var(--warn)'):'var(--bg3)',color:item.tipoVenta===tv?'#fff':'#777'}}>{tv[0]}</button>)}
                    </div>
                    <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',flexShrink:0}}>
                      <button onClick={()=>changeQty(item.sku,-1)} style={{width:'26px',height:'26px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px'}}>−</button>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,width:'28px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'26px'}}>{item.qty}</span>
                      <button onClick={()=>changeQty(item.sku,1)} style={{width:'26px',height:'26px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px'}}>+</button>
                    </div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,minWidth:'55px',textAlign:'right',flexShrink:0}}>€{(precio*item.qty).toFixed(2)}</div>
                    <button onClick={()=>removeItem(item.sku)} style={{width:'22px',height:'22px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'11px',color:'#888'}}>✕</button>
                  </div>
                );
              })
            }
            {cart.length>0&&(
              <div style={{padding:'10px 13px',background:'var(--bg3)',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',textTransform:'uppercase'}}>Total a cobrar</div>
                <div style={{fontFamily:'Playfair Display,serif',fontSize:'22px',fontWeight:700,color:'var(--red)'}}>€ {fmtNum(totalEUR)}</div>
              </div>
            )}
          </div>
        </div>

        {/* DERECHA — Cobro */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{padding:'10px 14px',background:'#fffbeb',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#92400e',letterSpacing:'.12em',textTransform:'uppercase',fontWeight:700}}>
            💰 Registrar Cobro
          </div>
          <div style={{padding:'14px',display:'flex',flexDirection:'column',gap:'12px'}}>
            <div>
              <label style={lbl}>Método de Pago *</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'5px'}}>
                {METODOS.map(m=>(
                  <button key={m.id} onClick={()=>{setMetodo(m.id);setDivisa(m.divisa);}}
                    style={{padding:'7px 4px',background:metodo===m.id?'var(--ink)':'var(--bg2)',color:metodo===m.id?'#fff':'#333',border:`1px solid ${metodo===m.id?'var(--ink)':'var(--border)'}`,cursor:'pointer',textAlign:'center',transition:'all .12s'}}>
                    <div style={{fontSize:'14px'}}>{m.icon}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',marginTop:'2px'}}>{m.label}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',opacity:.6}}>{m.divisa}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div>
                <label style={lbl}>Monto recibido *</label>
                <div style={{display:'flex',gap:'5px'}}>
                  <select value={divisa} onChange={e=>setDivisa(e.target.value)} style={{width:'60px',padding:'9px 4px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'11px',outline:'none'}}>
                    <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
                  </select>
                  <input type="number" min="0" step="0.01" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0.00" style={{...inp,flex:1}}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Tasa BS/{divisa==='BS'?'EUR':divisa}</label>
                <input type="number" value={tasa} onChange={e=>setTasa(e.target.value)} placeholder="96.50" style={inp}/>
              </div>
            </div>

            <div>
              <label style={lbl}>Referencia / N° operación</label>
              <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Últimos 6 dígitos..." style={inp}/>
            </div>

            {md>0&&totalEUR>0&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
                <div style={{padding:'9px',background:'var(--bg2)',border:'1px solid var(--border)',textAlign:'center'}}>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#555',marginBottom:'3px',textTransform:'uppercase'}}>Total</div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'var(--red)'}}>€{fmtNum(totalEUR)}</div>
                </div>
                <div style={{padding:'9px',background:'var(--bg2)',border:'1px solid var(--border)',textAlign:'center'}}>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#555',marginBottom:'3px',textTransform:'uppercase'}}>Pagando</div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:'var(--green)'}}>
                    {divisa==='BS'?`Bs.${fmtNum(md)}`:`${divisa} ${fmtNum(md)}`}
                  </div>
                  {divisa==='BS'&&previewEUR>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>≈€{fmtNum(previewEUR)}</div>}
                </div>
                {vuelto>0.01
                  ?<div style={{padding:'9px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.3)',textAlign:'center'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'var(--green)',marginBottom:'3px',textTransform:'uppercase'}}>Vuelto</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'var(--green)'}}>€{fmtNum(vuelto)}</div>
                    {ts>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)'}}>Bs.{fmtNum(vuelto*ts)}</div>}
                  </div>
                  :<div style={{padding:'9px',background:falta<0.01?'var(--green-soft)':'#fff8e1',border:`1px solid ${falta<0.01?'rgba(26,122,60,.3)':'#f59e0b44'}`,textAlign:'center'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:falta<0.01?'var(--green)':'var(--warn)',marginBottom:'3px',textTransform:'uppercase'}}>{falta<0.01?'Exacto':'Falta'}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:falta<0.01?'var(--green)':'var(--warn)'}}>€{fmtNum(falta)}</div>
                    {falta>0.01&&ts>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--warn)'}}>Bs.{fmtNum(falta*ts)}</div>}
                  </div>
                }
              </div>
            )}

            <button onClick={registrar} disabled={guardando||!cart.length}
              style={{padding:'13px',background:cart.length&&metodo&&md>0?'var(--green)':'#ccc',color:'#fff',border:'none',cursor:cart.length&&metodo&&md>0?'pointer':'not-allowed',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',opacity:guardando?.6:1,transition:'background .2s'}}>
              {guardando?'⏳ Procesando...':`⚡ COBRAR · € ${fmtNum(totalEUR)}`}
            </button>
          </div>
        </div>
      </div>
    <style>{`
        .vd-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 767px) {
          .vd-layout {
            grid-template-columns: 1fr !important;
            gap: 14px;
          }
        }
      `}</style>
    </Shell>
  );
}