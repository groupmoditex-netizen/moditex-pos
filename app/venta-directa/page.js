'use client';
import { colorHex } from '@/utils/colores';
import { useState, useEffect, useRef, useCallback } from 'react';
import Shell from '@/components/Shell';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import { useAppData } from '@/lib/AppContext';

const METODOS = [
  {id:'pago_movil',   label:'Pago Móvil',  icon:'📱', divisa:'BS'},
  {id:'transferencia',label:'Transf. BS',  icon:'🏦', divisa:'BS'},
  {id:'efectivo_bs',  label:'Efect. BS',   icon:'💵', divisa:'BS'},
  {id:'punto_venta',  label:'Punto Venta', icon:'💳', divisa:'BS'},
  {id:'zelle',        label:'Zelle',       icon:'💸', divisa:'USD'},
  {id:'efectivo_usd', label:'Efect. USD',  icon:'🇺🇸', divisa:'USD'},
  {id:'binance',      label:'Binance',     icon:'🔶', divisa:'USDT'},
  {id:'efectivo_eur', label:'Efectivo €',  icon:'💶', divisa:'EUR'},
  {id:'transf_eur',   label:'Transf. €',   icon:'🇪🇺', divisa:'EUR'},
];

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#666',display:'block',marginBottom:'5px'};
function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}

export default function VentaDirectaPage() {
  const { data, recargar } = useAppData()||{};
  const productos = data?.productos || [];

  const [cart,     setCart]    = useState([]);
  const [catalogo, setCat]     = useState(false);
  const [cliente,  setCliente] = useState('');

  const skuRef       = useRef(null);
  const autoTimer    = useRef(null);
  const lastCharMs   = useRef(0);
  const [skuVal,  setSkuVal]  = useState('');
  const [skuMsg,  setSkuMsg]  = useState(null);
  const [camOpen, setCamOpen] = useState(false);
  const [camLoad, setCamLoad] = useState(false);
  const [camErr,  setCamErr]  = useState('');
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const nativeDetRef = useRef(null);
  const zxingRef     = useRef(null);
  const animRef      = useRef(null);
  const scannedRef   = useRef(false);

  const [metodo,   setMetodo]  = useState('');
  const [divisa,   setDivisa]  = useState('EUR');
  const [monto,    setMonto]   = useState('');
  const [tasa,     setTasa]    = useState('');
  const [ref,      setRef]     = useState('');
  const [guardando,setGuard]   = useState(false);
  const [msg,      setMsg]     = useState(null);

  function precioItem(item){ return item.tipoVenta==='MAYOR'?(item.precioMayor||0):(item.precioDetal||0); }

  function addFromCatalog(p, qty, tv) {
    setCart(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty,tipoVenta:tv}:x);
      return [...prev,{...p,qty,tipoVenta:tv}];
    });
  }
  function setItemTV(sku,tv){ setCart(prev=>prev.map(x=>x.sku===sku?{...x,tipoVenta:tv}:x)); }
  function changeQty(sku,d){ setCart(prev=>prev.map(x=>x.sku===sku?{...x,qty:Math.max(1,x.qty+d)}:x)); }
  function removeItem(sku){ setCart(prev=>prev.filter(x=>x.sku!==sku)); }

  const totalEUR = cart.reduce((a,it)=>a+precioItem(it)*it.qty, 0);
  const totalUds = cart.reduce((a,it)=>a+it.qty, 0);

  function agregarPorSku(raw) {
    const sku=(raw||'').trim().toUpperCase();
    if(!sku) return;
    setSkuVal('');
    if(autoTimer.current){ clearTimeout(autoTimer.current); autoTimer.current=null; }
    const prod=productos.find(p=>p.sku?.toUpperCase()===sku);
    if(!prod){
      setSkuMsg({t:'err',m:`⚠ SKU no encontrado: ${sku}`});
      setTimeout(()=>setSkuMsg(null),3000);
      setTimeout(()=>skuRef.current?.focus(),50);
      return;
    }
    setCart(prev=>{
      const ex=prev.find(x=>x.sku===prod.sku);
      if(ex) return prev.map(x=>x.sku===prod.sku?{...x,qty:x.qty+1}:x);
      return [...prev,{...prod,qty:1,tipoVenta:'DETAL'}];
    });
    setSkuMsg({t:'ok',m:`✓ ${prod.modelo} — ${prod.color}`});
    setTimeout(()=>setSkuMsg(null),2500);
    setTimeout(()=>skuRef.current?.focus(),30);
  }

  function handleSkuChange(e){
    const val=e.target.value;
    setSkuVal(val);
    const now=Date.now(); const gap=now-lastCharMs.current; lastCharMs.current=now;
    if(gap<50&&val.trim()){
      if(autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current=setTimeout(()=>{ const cur=skuRef.current?.value||val; if(cur.trim()) agregarPorSku(cur); },100);
    }
  }

  const cerrarCamara=useCallback(()=>{
    if(animRef.current) cancelAnimationFrame(animRef.current);
    if(zxingRef.current){ try{zxingRef.current.reset();}catch(_){} zxingRef.current=null; }
    if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    if(videoRef.current) videoRef.current.srcObject=null;
    scannedRef.current=false; setCamOpen(false); setCamLoad(false);
  },[]);

  useEffect(()=>()=>{cerrarCamara();if(autoTimer.current)clearTimeout(autoTimer.current);},[]);
  const processCamSku=useCallback((sku)=>{cerrarCamara();agregarPorSku(sku);},[]);// eslint-disable-line

  const scanFrameNative=useCallback(()=>{
    if(!videoRef.current||!nativeDetRef.current) return;
    nativeDetRef.current.detect(videoRef.current)
      .then(codes=>{
        if(codes.length>0&&!scannedRef.current){scannedRef.current=true;processCamSku(codes[0].rawValue);}
        else animRef.current=requestAnimationFrame(scanFrameNative);
      }).catch(()=>{ animRef.current=requestAnimationFrame(scanFrameNative); });
  },[processCamSku]);

  async function abrirCamara(){
    setCamErr(''); setCamLoad(true);
    const hasNative=typeof window!=='undefined'&&'BarcodeDetector' in window;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}});
      streamRef.current=stream; setCamOpen(true); setCamLoad(false);
      await new Promise(r=>setTimeout(r,150));
      if(!videoRef.current){cerrarCamara();return;}
      videoRef.current.srcObject=stream; await videoRef.current.play();
      if(hasNative){
        nativeDetRef.current=new window.BarcodeDetector({formats:['code_128','ean_13','ean_8','qr_code','upc_a','upc_e','code_39','itf']});
        scanFrameNative();
      } else {
        const{BrowserMultiFormatReader}=await import('@zxing/browser');
        const reader=new BrowserMultiFormatReader(); zxingRef.current=reader;
        reader.decodeFromVideoElement(videoRef.current,(result)=>{
          if(result&&!scannedRef.current){scannedRef.current=true;processCamSku(result.getText());}
        });
      }
    }catch(e){
      cerrarCamara();
      setCamErr(e.name==='NotAllowedError'?'❌ Permiso de cámara denegado.':'❌ Error: '+e.message);
    }
  }

  const md=parseFloat(monto)||0, ts=parseFloat(tasa)||0;
  let previewEUR=0;
  if(divisa==='BS')                        previewEUR=ts>0?md/ts:0;
  else                                     previewEUR=md;
  const vuelto=previewEUR>totalEUR+0.01?previewEUR-totalEUR:0;
  const falta =previewEUR<totalEUR-0.01?totalEUR-previewEUR:0;

  async function registrar(){
    if(!cart.length){setMsg({t:'error',m:'Agrega al menos un producto'});return;}
    if(!metodo){setMsg({t:'error',m:'Selecciona el método de pago'});return;}
    if(md<=0){setMsg({t:'error',m:'Ingresa el monto recibido'});return;}
    setGuard(true);
    try{
      const fecha=new Date().toISOString();
      const lote=cart.map(item=>({
        sku:item.sku,tipo:'SALIDA',cantidad:item.qty,fecha,
        concepto:'Venta Directa',contacto:cliente||'CONSUMIDOR FINAL',
        tipo_venta:item.tipoVenta,precio_venta:precioItem(item),
      }));
      const res=await fetch('/api/movimientos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lote)}).then(r=>r.json());
      if(!res.ok){setMsg({t:'error',m:res.error});setGuard(false);return;}
      const cmdRes=await fetch('/api/comandas',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          cliente:cliente||'CONSUMIDOR FINAL',
          productos:cart.map(it=>({sku:it.sku,modelo:`${it.modelo} — ${it.color}`,cant:it.qty,precio:precioItem(it),tipoVenta:it.tipoVenta})),
          precio:totalEUR,monto_pagado:Math.min(previewEUR,totalEUR),status:'entregado',
          notas:`Venta Directa | ${METODOS.find(m=>m.id===metodo)?.label||metodo} | ${divisa} ${md}${ref?' | Ref:'+ref:''}`,
        })}).then(r=>r.json());
      if(cmdRes.ok&&cmdRes.comanda){
        try{await fetch('/api/pagos',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({comanda_id:cmdRes.comanda.id,metodo,divisa,monto_divisa:md,tasa_bs:ts,referencia:ref})
        }).then(r=>r.json());}catch(_){}
      }
      setMsg({t:'success',m:`✅ Venta registrada · ${totalUds} uds · € ${fmtNum(totalEUR)}${vuelto>0.01?` · Vuelto € ${fmtNum(vuelto)}`:''}`});
      setCart([]); setCliente(''); setMonto(''); setTasa(''); setRef(''); setMetodo(''); setDivisa('EUR');
      recargar();
    }catch(e){setMsg({t:'error',m:'Error de conexión'});}
    setGuard(false); setTimeout(()=>setMsg(null),6000);
  }

  const listo = cart.length>0 && metodo && md>0;

  return (
    <Shell title="⚡ Venta Directa">
      {catalogo&&<CatalogoExplorer productos={productos} modo="salida" tipoVenta="DETAL" onAdd={addFromCatalog} onClose={()=>setCat(false)}/>}

      {camOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:500,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'20px'}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#fff',letterSpacing:'.12em',textTransform:'uppercase'}}>📷 Apunta al código de barras</div>
          <div style={{position:'relative',width:'min(92vw,400px)',aspectRatio:'4/3',background:'#000',overflow:'hidden',borderRadius:'4px',border:'2px solid #f59e0b',boxShadow:'0 0 0 4px rgba(245,158,11,.15)'}}>
            <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline autoPlay/>
            <div style={{position:'absolute',inset:'15%',border:'2px solid rgba(245,158,11,.5)',borderRadius:'6px',pointerEvents:'none'}}/>
            <div style={{position:'absolute',left:'15%',right:'15%',height:'2px',background:'rgba(245,158,11,.7)',borderRadius:'1px',animation:'scanline 2s ease-in-out infinite',pointerEvents:'none'}}/>
          </div>
          <button onClick={cerrarCamara} style={{padding:'10px 28px',background:'none',border:'1px solid rgba(255,255,255,.4)',color:'#fff',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>✕ Cancelar</button>
          <style>{`@keyframes scanline{0%,100%{top:18%;opacity:.4;}50%{top:78%;opacity:1;}}`}</style>
        </div>
      )}

      {/* Banner + cliente */}
      <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap',alignItems:'stretch'}}>
        <div style={{padding:'12px 16px',background:'#fff8e1',border:'1px solid #f59e0b44',borderLeft:'4px solid #f59e0b',flex:1,minWidth:'220px',display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'20px'}}>⚡</span>
          <div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#92400e',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase'}}>Venta Directa — Stock se descuenta inmediatamente</div>
            <div style={{fontSize:'11px',color:'#78350f',marginTop:'2px'}}>Botones D/M para cambiar precio por prenda individualmente</div>
          </div>
        </div>
        <div style={{minWidth:'220px',flex:'0 0 auto'}}>
          <label style={lbl}>Cliente (opcional)</label>
          <input value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="CONSUMIDOR FINAL" style={inp}/>
        </div>
      </div>

      {msg&&(
        <div style={{padding:'12px 16px',marginBottom:'16px',background:msg.t==='error'?'var(--red-soft)':'var(--green-soft)',borderLeft:`4px solid ${msg.t==='error'?'var(--red)':'var(--green)'}`,color:msg.t==='error'?'var(--red)':'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700}}>
          {msg.m}
        </div>
      )}

      <div className="vd-layout">

        {/* IZQUIERDA — Scanner + Carrito */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>

          {/* Scanner bar */}
          <div style={{display:'flex'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1,background:'#111',border:'1px solid #333',borderRight:'none',padding:'10px 14px'}}>
              <span style={{fontSize:'18px',flexShrink:0}}>🔫</span>
              <input ref={skuRef} value={skuVal} onChange={handleSkuChange}
                onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();agregarPorSku(skuVal);}}}
                placeholder="Escanea el código — se agrega automáticamente…"
                autoComplete="off" spellCheck={false}
                style={{background:'none',border:'none',outline:'none',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#fff',width:'100%',letterSpacing:'.04em'}}/>
            </div>
            <button onClick={abrirCamara} disabled={camLoad||guardando} title="Escanear con cámara"
              style={{padding:'10px 12px',background:camLoad?'#555':'#333',color:'#fff',border:'1px solid #333',cursor:'pointer',fontSize:'14px',flexShrink:0,borderRight:'none'}}>
              {camLoad?'⏳':'📷'}
            </button>
            <button onClick={()=>setCat(true)}
              style={{padding:'10px 16px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',flexShrink:0,whiteSpace:'nowrap'}}>
              ⊞ Catálogo
            </button>
          </div>

          {camErr&&<div style={{padding:'6px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',background:'var(--red-soft)',color:'var(--red)',borderLeft:'3px solid var(--red)'}}>{camErr}</div>}
          {skuMsg&&(
            <div style={{padding:'8px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,background:skuMsg.t==='ok'?'var(--green-soft)':'var(--red-soft)',color:skuMsg.t==='ok'?'var(--green)':'var(--red)',borderLeft:`3px solid ${skuMsg.t==='ok'?'var(--green)':'var(--red)'}`}}>
              {skuMsg.m}
            </div>
          )}

          {/* Carrito */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
            <div style={{padding:'10px 14px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'#555'}}>🛒 Carrito</span>
              {cart.length>0&&(
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>{totalUds} ud{totalUds!==1?'s':''}</span>
                  <button onClick={()=>setCart([])} style={{padding:'2px 8px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa',letterSpacing:'.06em'}}>✕ VACIAR</button>
                </div>
              )}
            </div>

            {cart.length===0?(
              <div style={{padding:'48px 24px',textAlign:'center',color:'#aaa'}}>
                <div style={{fontSize:'36px',marginBottom:'10px'}}>🛒</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Escanea un código o abre el catálogo</div>
              </div>
            ):(
              <>
                {[...cart].reverse().map(item=>{
                  const precio=precioItem(item); const dot=colorHex(item.color);
                  return(
                    <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'8px',padding:'10px 14px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                          <span style={{fontSize:'13px',fontWeight:600}}>{item.modelo} — {item.color}</span>
                        </div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>
                          {item.sku} · <strong style={{color:item.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)'}}>€{precio.toFixed(2)} × {item.qty} = €{(precio*item.qty).toFixed(2)}</strong>
                        </div>
                      </div>
                      <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                        {['DETAL','MAYOR'].map(tv=>(
                          <button key={tv} onClick={()=>setItemTV(item.sku,tv)}
                            style={{padding:'5px 8px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,
                              background:item.tipoVenta===tv?(tv==='DETAL'?'var(--blue)':'var(--warn)'):'var(--bg3)',
                              color:item.tipoVenta===tv?'#fff':'#777'}}>
                            {tv[0]}
                          </button>
                        ))}
                      </div>
                      <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',flexShrink:0}}>
                        <button onClick={()=>changeQty(item.sku,-1)} style={{width:'27px',height:'27px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'15px'}}>−</button>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,width:'30px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'27px'}}>{item.qty}</span>
                        <button onClick={()=>changeQty(item.sku,1)} style={{width:'27px',height:'27px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'15px'}}>+</button>
                      </div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,minWidth:'56px',textAlign:'right',flexShrink:0}}>€{(precio*item.qty).toFixed(2)}</div>
                      <button onClick={()=>removeItem(item.sku)} style={{width:'22px',height:'22px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'11px',color:'#888',flexShrink:0}}>✕</button>
                    </div>
                  );
                })}
                <div style={{padding:'12px 14px',background:'var(--bg3)',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',textTransform:'uppercase',letterSpacing:'.1em'}}>Total a cobrar</div>
                  <div style={{fontFamily:'Playfair Display,serif',fontSize:'24px',fontWeight:700,color:'var(--red)'}}>€ {fmtNum(totalEUR)}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* DERECHA — Panel cobro */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden'}}>

          <div style={{padding:'12px 16px',background:'#fffbeb',borderBottom:'1px solid #f59e0b44',display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{fontSize:'18px'}}>💰</span>
            <div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#92400e',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase'}}>Registrar Cobro</div>
              {cart.length>0&&<div style={{fontFamily:'Playfair Display,serif',fontSize:'18px',fontWeight:700,color:'#92400e',lineHeight:1.1,marginTop:'2px'}}>€ {fmtNum(totalEUR)}</div>}
            </div>
          </div>

          <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:'13px',overflowY:'auto',flex:1}}>

            <div>
              <label style={lbl}>Método de Pago *</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'5px'}}>
                {METODOS.map(m=>(
                  <button key={m.id} onClick={()=>{setMetodo(m.id);setDivisa(m.divisa);}}
                    style={{padding:'8px 4px',background:metodo===m.id?'#1a1a1a':'var(--bg2)',color:metodo===m.id?'#fff':'#333',
                      border:`1px solid ${metodo===m.id?'#1a1a1a':'var(--border)'}`,cursor:'pointer',textAlign:'center',transition:'all .12s',
                      borderTop:metodo===m.id?'2px solid #f59e0b':'2px solid transparent'}}>
                    <div style={{fontSize:'15px'}}>{m.icon}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',marginTop:'2px',lineHeight:1.2}}>{m.label}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',opacity:.6,marginTop:'1px'}}>{m.divisa}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div>
                <label style={lbl}>Monto recibido *</label>
                <div style={{display:'flex',gap:'5px'}}>
                  <select value={divisa} onChange={e=>setDivisa(e.target.value)}
                    style={{width:'64px',padding:'9px 4px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',flexShrink:0}}>
                    <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
                  </select>
                  <input type="number" min="0" step="0.01" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0.00" style={{...inp,flex:1}}/>
                </div>
              </div>
              {divisa==='BS'?(
                <div>
                  <label style={lbl}>Tasa BS/EUR</label>
                  <input type="number" value={tasa} onChange={e=>setTasa(e.target.value)} placeholder="96.50" style={inp}/>
                </div>
              ):(
                <div style={{display:'flex',alignItems:'flex-end',paddingBottom:'1px'}}>
                  <div style={{padding:'9px 12px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700,width:'100%'}}>
                    ✓ Precio divisa — sin conversión
                  </div>
                </div>
              )}
            </div>

            {/* Preview cobro */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0',border:'1px solid var(--border)',overflow:'hidden'}}>
              <div style={{padding:'10px 8px',textAlign:'center',borderRight:'1px solid var(--border)',background:'var(--bg2)'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#555',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'4px'}}>Total</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'15px',fontWeight:700,color:'var(--red)'}}>€ {fmtNum(totalEUR)}</div>
              </div>
              <div style={{padding:'10px 8px',textAlign:'center',borderRight:'1px solid var(--border)',background:'var(--bg2)'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#555',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'4px'}}>Pagando</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:700,color:'var(--green)'}}>
                  {md>0?`${divisa==='BS'?'Bs.':divisa+' '}${fmtNum(md)}`:'—'}
                </div>
                {divisa==='BS'&&previewEUR>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888'}}>≈ € {fmtNum(previewEUR)}</div>}
              </div>
              {md>0&&totalEUR>0?(
                vuelto>0.01?(
                  <div style={{padding:'10px 8px',textAlign:'center',background:'var(--green-soft)'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'var(--green)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'4px'}}>Vuelto</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'15px',fontWeight:700,color:'var(--green)'}}>€ {fmtNum(vuelto)}</div>
                    {divisa==='BS'&&ts>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'var(--green)'}}>Bs. {fmtNum(vuelto*ts)}</div>}
                  </div>
                ):falta>0.01?(
                  <div style={{padding:'10px 8px',textAlign:'center',background:'#fff8e1'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#92400e',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'4px'}}>Falta</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'15px',fontWeight:700,color:'#f59e0b'}}>€ {fmtNum(falta)}</div>
                    {divisa==='BS'&&ts>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#92400e'}}>Bs. {fmtNum(falta*ts)}</div>}
                  </div>
                ):(
                  <div style={{padding:'10px 8px',textAlign:'center',background:'var(--green-soft)'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'var(--green)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'4px'}}>Exacto</div>
                    <div style={{fontSize:'22px',fontWeight:700,color:'var(--green)',lineHeight:1.2}}>✓</div>
                  </div>
                )
              ):(
                <div style={{padding:'10px 8px',textAlign:'center',background:'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#ccc'}}>—</span>
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>Referencia / N° operación</label>
              <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Últimos 6 dígitos..." style={inp}/>
            </div>

          </div>

          {/* Botón COBRAR fijo */}
          <div style={{padding:'14px 16px',borderTop:'1px solid var(--border)',background:'var(--bg2)',flexShrink:0}}>
            <button onClick={registrar} disabled={guardando||!cart.length}
              style={{width:'100%',padding:'15px',background:listo?'var(--green)':'#ccc',color:'#fff',border:'none',
                cursor:cart.length?'pointer':'not-allowed',fontFamily:'Poppins,sans-serif',fontSize:'15px',fontWeight:700,
                textTransform:'uppercase',letterSpacing:'.06em',opacity:guardando?.6:1,transition:'background .2s',
                display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
              {guardando?'⏳ Procesando...':<><span>⚡</span><span>COBRAR · € {fmtNum(totalEUR)}</span></>}
            </button>
            {!cart.length&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#aaa',textAlign:'center',marginTop:'6px'}}>Agrega productos al carrito para cobrar</div>}
          </div>
        </div>
      </div>

      <style>{`
        .vd-layout { display:grid; grid-template-columns:1.1fr 0.9fr; gap:16px; align-items:start; }
        @media(max-width:900px){ .vd-layout{ grid-template-columns:1fr !important; } }
      `}</style>
    </Shell>
  );
}
