'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Shell from '@/components/Shell';
import ProductSearch from '@/components/ProductSearch';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useAppData } from '@/lib/AppContext';

const inpS={width:'100%',padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'};
const lblS={fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};

/* ── Cada item del carrito tiene: sku, modelo, color, talla, disponible,
       precioDetal, precioMayor, qty, tipoVenta ('DETAL'|'MAYOR') ── */

export default function SalidaPage() {
  const { data, recargar } = useAppData() || {};
  const productos = data?.productos || [];
  const clientes  = data?.clientes  || [];

  const [cart, setCart]           = useState([]);
  const [fecha, setFecha]         = useState(()=>new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto]   = useState('');
  const [cliNombre, setCliNombre] = useState('');
  const [cliId, setCliId]         = useState('');
  const [cliQuery, setCliQuery]   = useState('');
  const [cliRes, setCliRes]       = useState([]);
  const [cliOpen, setCliOpen]     = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg]             = useState(null);
  const [catalogo, setCatalogo]   = useState(false);
  const [ventaDirecta, setVD]     = useState(false);

  // Búsqueda de cliente
  useEffect(()=>{
    if(ventaDirecta||!cliQuery||cliQuery.length<2){setCliRes([]);setCliOpen(false);return;}
    const q=cliQuery.toLowerCase();
    const m=clientes.filter(c=>`${c.nombre} ${c.cedula||''} ${c.telefono||''}`.toLowerCase().includes(q)).slice(0,6);
    setCliRes(m); setCliOpen(m.length>0);
  },[cliQuery,clientes,ventaDirecta]);

  function toggleVD(){
    const n=!ventaDirecta; setVD(n);
    if(n){setCliNombre('CONSUMIDOR FINAL');setCliId('');setCliQuery('CONSUMIDOR FINAL');}
    else{setCliNombre('');setCliId('');setCliQuery('');}
  }

  // Precio de un item según su tipoVenta
  function precioItem(p, tv){ return tv==='MAYOR'?(p.precioMayor||0):(p.precioDetal||0); }

  // Agregar al carrito (desde buscador) — toma tipo venta por defecto DETAL
  function addToCart(p){
    const pa = productos.find(x=>x.sku===p.sku)||p;
    if(pa.disponible<=0){showMsg('error',`Sin stock: ${pa.modelo} — ${pa.color}`);return;}
    setCart(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex){
        if(ex.qty>=pa.disponible){showMsg('error',`Stock máximo: ${pa.disponible}`);return prev;}
        return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+1}:x);
      }
      return[...prev,{...pa,qty:1,tipoVenta:'DETAL'}];
    });
  }

  // Agregar desde el catálogo (ya incluye tipoVenta elegido)
  function addFromCatalog(p, qty, tv){
    const pa=productos.find(x=>x.sku===p.sku)||p;
    if(pa.disponible<=0){showMsg('error',`Sin stock: ${pa.modelo} — ${pa.color}`);return;}
    setCart(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty,tipoVenta:tv}:x);
      return[...prev,{...pa,qty,tipoVenta:tv}];
    });
  }

  function setItemTV(sku,tv){setCart(prev=>prev.map(x=>x.sku===sku?{...x,tipoVenta:tv}:x));}
  function changeQty(sku,delta){
    setCart(prev=>prev.map(x=>{
      if(x.sku!==sku) return x;
      const nq=Math.max(1,x.qty+delta);
      if(delta>0&&nq>x.disponible){showMsg('error',`Stock disponible: ${x.disponible}`);return x;}
      return{...x,qty:nq};
    }));
  }
  function removeItem(sku){setCart(prev=>prev.filter(x=>x.sku!==sku));}

  // Totales calculados por tipo de venta
  const totalDetal = cart.reduce((a,i)=>a+(i.tipoVenta==='DETAL'?(i.precioDetal||0)*i.qty:0),0);
  const totalMayor = cart.reduce((a,i)=>a+(i.tipoVenta==='MAYOR'?(i.precioMayor||0)*i.qty:0),0);
  const totalVenta = totalDetal + totalMayor;
  const totalUds   = cart.reduce((a,i)=>a+i.qty,0);

  async function registrar(){
    if(!cart.length){showMsg('error','Agrega al menos un producto');return;}
    setGuardando(true);
    try{
      const lote=cart.map(item=>({
        sku:item.sku, tipo:'SALIDA', cantidad:item.qty, fecha,
        concepto: concepto||(ventaDirecta?'Venta directa':''),
        contacto: ventaDirecta?'CONSUMIDOR FINAL':cliNombre,
        tipo_venta: item.tipoVenta,
        precio_venta: precioItem(item, item.tipoVenta),
        cliente_id: cliId,
      }));
      const res=await fetch('/api/movimientos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lote)}).then(r=>r.json());
      if(res.ok){
        showMsg('success',`✓ Venta de ${totalUds} uds · € ${totalVenta.toFixed(2)}`);
        setCart([]); setConcepto('');
        if(!ventaDirecta){setCliNombre('');setCliId('');setCliQuery('');}
        recargar();
      } else { showMsg('error',res.error||'Error al guardar'); }
    }catch(e){showMsg('error','Error de conexión');}
    setGuardando(false);
  }

  function showMsg(type,text){setMsg({type,text});setTimeout(()=>setMsg(null),5000);}

  const COLOR_MAP={BLANCO:'#d0d0d0',NEGRO:'#1a1a1a',AZUL:'#3b6fd4',ROJO:'#d63b3b',VERDE:'#2d9e4a',ROSA:'#f07aa0',GRIS:'#6b7280',AMARILLO:'#f5c842',NARANJA:'#f57c42',MORADO:'#7c4fd4',VINOTINTO:'#8b2035',BEIGE:'#d4b896',CORAL:'#f26e5b',CELESTE:'#7ec8e3'};
  function colorHex(n){const k=(n||'').toUpperCase().trim();return COLOR_MAP[k]||COLOR_MAP[k.split(' ')[0]]||'#9ca3af';}

  return (
    <Shell title="Nueva Salida">
      {catalogo&&<CatalogoExplorer productos={productos} modo="salida" tipoVenta="DETAL" onAdd={(p,qty,tv)=>{addFromCatalog(p,qty,tv);setCatalogo(false);}} onClose={()=>setCatalogo(false)}/>}
      <div style={{maxWidth:'800px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'12px 16px',background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'3px solid var(--red)',marginBottom:'14px'}}>
          <span style={{fontSize:'18px'}}>↓</span>
          <div>
            <div style={{fontSize:'12px',fontWeight:700,color:'var(--red)',textTransform:'uppercase',letterSpacing:'.03em'}}>Registro de Salida — Múltiples Productos</div>
            <div style={{fontSize:'11px',color:'#666',fontFamily:'DM Mono,monospace'}}>Cada producto puede ser Detal o Mayor por separado</div>
          </div>
        </div>

        {/* ⚡ Toggle Venta Directa */}
        <div onClick={toggleVD} style={{display:'flex',alignItems:'center',gap:'14px',padding:'11px 16px',background:ventaDirecta?'rgba(26,122,60,.06)':'var(--bg2)',border:`1px solid ${ventaDirecta?'rgba(26,122,60,.3)':'var(--border)'}`,cursor:'pointer',marginBottom:'14px',transition:'all .15s'}}>
          <div style={{width:'36px',height:'20px',background:ventaDirecta?'var(--green)':'#ccc',borderRadius:'10px',position:'relative',transition:'background .2s',flexShrink:0}}>
            <div style={{width:'14px',height:'14px',background:'#fff',borderRadius:'50%',position:'absolute',top:'3px',left:ventaDirecta?'19px':'3px',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
          </div>
          <div>
            <div style={{fontSize:'12px',fontWeight:700,color:ventaDirecta?'var(--green)':'#444'}}>⚡ Venta Directa — Consumidor Final</div>
            <div style={{fontSize:'10px',color:'#777',fontFamily:'DM Mono,monospace'}}>{ventaDirecta?'Activo — sin datos del cliente':'Activa para registrar sin datos del cliente'}</div>
          </div>
          {ventaDirecta&&<span style={{marginLeft:'auto',background:'var(--green)',color:'#fff',fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'2px 9px',flexShrink:0}}>ACTIVO</span>}
        </div>

        {/* Mensaje */}
        {msg&&<div style={{padding:'10px 14px',marginBottom:'12px',background:msg.type==='error'?'var(--red-soft)':'var(--green-soft)',border:`1px solid ${msg.type==='error'?'rgba(217,30,30,.3)':'rgba(26,122,60,.3)'}`,color:msg.type==='error'?'var(--red)':'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{msg.text}</div>}

        {/* Datos — cliente o consumidor final */}
        {!ventaDirecta ? (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div style={{position:'relative'}}>
              <label style={lblS}>Cliente</label>
              <input type="text" placeholder="Buscar cliente..." value={cliQuery}
                onChange={e=>{setCliQuery(e.target.value);setCliNombre(e.target.value);setCliId('');}}
                onFocus={()=>cliRes.length>0&&setCliOpen(true)}
                onBlur={()=>setTimeout(()=>setCliOpen(false),150)}
                style={inpS} autoComplete="off"/>
              {cliId&&<span style={{position:'absolute',right:'10px',top:'62%',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)'}}>✓</span>}
              {cliOpen&&cliRes.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--surface)',border:'1px solid var(--border-strong)',borderTop:'none',zIndex:999,maxHeight:'200px',overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,.1)'}}>
                  {cliRes.map(c=><div key={c.id} onMouseDown={e=>{e.preventDefault();setCliNombre(c.nombre);setCliId(c.id);setCliQuery(c.nombre);setCliOpen(false);}} style={{padding:'9px 12px',cursor:'pointer',borderBottom:'1px solid var(--border)',fontSize:'12px'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'} onMouseLeave={e=>e.currentTarget.style.background=''}><strong>{c.nombre}</strong><span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',marginLeft:'8px'}}>{c.id}</span></div>)}
                </div>
              )}
            </div>
            <div><label style={lblS}>Fecha *</label><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inpS}/></div>
            <div style={{gridColumn:'span 2'}}><label style={lblS}>Concepto</label><input type="text" placeholder="Descripción de la venta..." value={concepto} onChange={e=>setConcepto(e.target.value)} style={inpS}/></div>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'10px 14px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',marginBottom:'14px'}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--green)',fontWeight:700}}>👤 CONSUMIDOR FINAL</span>
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'8px'}}>
              <label style={{...lblS,marginBottom:0,color:'#555'}}>Fecha:</label>
              <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{...inpS,width:'auto',padding:'6px 9px'}}/>
            </div>
          </div>
        )}

        {/* AVISO sobre tipo de venta por item */}
        <div style={{padding:'8px 13px',background:'var(--blue-soft)',border:'1px solid rgba(20,64,176,.18)',marginBottom:'10px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)',lineHeight:1.6}}>
          💡 Cada producto tiene su propio selector <strong>D (Detal)</strong> / <strong>M (Mayor)</strong>. Puedes mezclar tipos en la misma venta.
        </div>

        {/* Buscador + Scanner */}
        <BarcodeScanner productos={productos} onAdd={addToCart} disabled={guardando}/>
        <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
          <div style={{flex:1}}><ProductSearch productos={productos} onAdd={addToCart} modo="salida"/></div>
          <button onClick={()=>setCatalogo(true)} style={{padding:'8px 14px',background:'var(--bg2)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--ink)',whiteSpace:'nowrap',flexShrink:0}}>
            ⊞ Catálogo
          </button>
        </div>

        {/* Carrito */}
        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',padding:'8px 14px',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'#555'}}>
            <span>Productos a despachar</span>
            <span style={{color:'var(--red)'}}>{cart.length} ref · {totalUds} uds</span>
          </div>

          {cart.length===0?(
            <div style={{padding:'36px',textAlign:'center',color:'#888',fontSize:'13px'}}>Busca o explora el catálogo 👆</div>
          ):cart.map(item=>{
            const precio = precioItem(item,item.tipoVenta);
            const dot    = colorHex(item.color);
            return(
              <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',alignItems:'center',gap:'10px',padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
                {/* Info producto */}
                <div style={{minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'1px'}}>
                    <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                    <span style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.modelo} — {item.color}{item.talla&&item.talla!=='UNICA'?` T:${item.talla}`:''}</span>
                  </div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)'}}>{item.sku} · Stock: {item.disponible}</div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'1px'}}>
                    D: €{item.precioDetal?.toFixed(2)} · M: €{item.precioMayor?.toFixed(2)} →
                    <strong style={{color:item.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',marginLeft:'3px'}}>€{precio.toFixed(2)} c/u</strong>
                  </div>
                </div>

                {/* Toggle D / M por item */}
                <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                  {['DETAL','MAYOR'].map(tv=>(
                    <button key={tv} onClick={()=>setItemTV(item.sku,tv)}
                      style={{
                        padding:'5px 9px', border:'none', cursor:'pointer',
                        fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700,
                        letterSpacing:'.06em', textTransform:'uppercase',
                        background: item.tipoVenta===tv ? (tv==='DETAL'?'var(--blue)':'var(--warn)') : 'var(--bg3)',
                        color: item.tipoVenta===tv ? '#fff' : '#777',
                        transition:'all .12s',
                      }}>
                      {tv==='DETAL'?'D':'M'}
                    </button>
                  ))}
                </div>

                {/* Cantidad */}
                <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                  <button onClick={()=>changeQty(item.sku,-1)} style={{width:'28px',height:'28px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'15px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:700,minWidth:'32px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'28px'}}>{item.qty}</span>
                  <button onClick={()=>changeQty(item.sku,1)} style={{width:'28px',height:'28px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'15px',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                </div>

                {/* Subtotal */}
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,minWidth:'70px',textAlign:'right',flexShrink:0}}>€{(precio*item.qty).toFixed(2)}</div>

                {/* Eliminar */}
                <button onClick={()=>removeItem(item.sku)} style={{width:'24px',height:'24px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'12px',color:'#888',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
              </div>
            );
          })}

          {/* Footer carrito */}
          <div style={{padding:'12px 14px',background:'var(--bg3)',borderTop:'1px solid var(--border)'}}>
            {cart.length>0&&(
              <div style={{display:'flex',gap:'18px',flexWrap:'wrap',marginBottom:'10px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555'}}>
                {totalDetal>0&&<span>🏷️ Detal: <strong style={{color:'var(--blue)'}}>€{totalDetal.toFixed(2)}</strong></span>}
                {totalMayor>0&&<span>📦 Mayor: <strong style={{color:'var(--warn)'}}>€{totalMayor.toFixed(2)}</strong></span>}
                <span>🛒 Unidades: <strong>{totalUds}</strong></span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.12em',textTransform:'uppercase'}}>Total venta</div>
                <div style={{fontFamily:'Playfair Display,serif',fontSize:'24px',fontWeight:700,lineHeight:1.1}}>€ {totalVenta.toFixed(2)}</div>
              </div>
              <div style={{display:'flex',gap:'9px'}}>
                <button onClick={()=>setCart([])} style={{padding:'8px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Limpiar</button>
                <button onClick={registrar} disabled={guardando}
                  style={{padding:'9px 22px',background:ventaDirecta?'var(--green)':'var(--red)',color:'#fff',border:'none',cursor:guardando?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',minWidth:'200px',opacity:guardando?.6:1}}>
                  {guardando?'⏳ Guardando...':`${ventaDirecta?'⚡ Venta Directa':'✓ Registrar Salida'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}