'use client';
import { colorHex } from '@/utils/colores';
import { useState, useRef } from 'react';
import Shell from '@/components/Shell';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import ScannerInput from '@/components/ScannerInput';
import { useAppData } from '@/lib/AppContext';

/* ─── Motivos de entrada con icono, color y concepto auto ─────────── */
const MOTIVOS_ENTRADA = [
  { id:'compra',      label:'Compra',         icon:'🛍️',  color:'#3b82f6', desc:'Reposición de mercancía del proveedor' },
  { id:'produccion',  label:'Producción',     icon:'🧵',  color:'#8b5cf6', desc:'Prendas producidas internamente' },
  { id:'devolucion',  label:'Devolución',     icon:'↩️',  color:'#f59e0b', desc:'Producto devuelto por el cliente' },
  { id:'consignacion',label:'Consignación',   icon:'📦',  color:'#06b6d4', desc:'Stock recibido en consignación' },
  { id:'ajuste',      label:'Ajuste +',       icon:'⚖️',  color:'#10b981', desc:'Corrección positiva de inventario' },
  { id:'otro',        label:'Otro',           icon:'📋',  color:'#6b7280', desc:'Motivo personalizado' },
];

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#666',display:'block',marginBottom:'5px'};
function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:0,maximumFractionDigits:0});}

export default function EntradaPage() {
  const { data, recargar } = useAppData()||{};
  const productos = data?.productos || [];

  const [motivo,   setMotivo]   = useState('compra');
  const [fecha,    setFecha]    = useState(()=>new Date().toISOString().split('T')[0]);
  const [contacto, setContacto] = useState('');
  const [notas,    setNotas]    = useState('');
  const [cart,     setCart]     = useState([]);
  const [catalogo, setCatalogo] = useState(false);
  const [guardando,setGuard]    = useState(false);
  const [msg,      setMsg]      = useState(null);

  /* ── Scanner ─────────────────────────────────────── */
  const skuRef     = useRef(null);
  const autoTimer  = useRef(null);
  const lastCharMs = useRef(0);
  const [skuVal, setSkuVal] = useState('');
  const [skuMsg, setSkuMsg] = useState(null);

  function agregarPorSku(raw) {
    const sku=(raw||'').trim().toUpperCase();
    if(!sku) return;
    setSkuVal('');
    if(autoTimer.current){ clearTimeout(autoTimer.current); autoTimer.current=null; }
    const prod=productos.find(p=>p.sku?.toUpperCase()===sku);
    if(!prod){ setSkuMsg({t:'err',m:`⚠ SKU no encontrado: ${sku}`}); setTimeout(()=>setSkuMsg(null),3000); setTimeout(()=>skuRef.current?.focus(),50); return; }
    setCart(prev=>{ const ex=prev.find(x=>x.sku===prod.sku); if(ex) return prev.map(x=>x.sku===prod.sku?{...x,qty:x.qty+1}:x); return [...prev,{...prod,qty:1}]; });
    setSkuMsg({t:'ok',m:`✓ ${prod.modelo} — ${prod.color}`});
    setTimeout(()=>setSkuMsg(null),2000); setTimeout(()=>skuRef.current?.focus(),30);
  }
  function handleSkuChange(e){
    const val=e.target.value; setSkuVal(val);
    const now=Date.now(); const gap=now-lastCharMs.current; lastCharMs.current=now;
    if(gap<50&&val.trim()){ if(autoTimer.current) clearTimeout(autoTimer.current); autoTimer.current=setTimeout(()=>{ const cur=skuRef.current?.value||val; if(cur.trim()) agregarPorSku(cur); },100); }
  }

  function addFromCatalog(p, qty) {
    setCart(prev=>{ const ex=prev.find(x=>x.sku===p.sku); if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty}:x); return [...prev,{...p,qty}]; });
  }
  function changeQty(sku,d){ setCart(prev=>prev.map(x=>x.sku===sku?{...x,qty:Math.max(1,x.qty+d)}:x)); }
  function removeItem(sku){ setCart(prev=>prev.filter(x=>x.sku!==sku)); }
  const totalUds = cart.reduce((a,i)=>a+i.qty, 0);

  const motivoCfg = MOTIVOS_ENTRADA.find(m=>m.id===motivo)||MOTIVOS_ENTRADA[0];

  async function registrar() {
    if(!cart.length){ setMsg({t:'error',m:'Agrega al menos un producto'}); return; }
    setGuard(true);
    const conceptoFinal = `${motivoCfg.label}${contacto?' — '+contacto:''}${notas?' | '+notas:''}`;
    try{
      const lote=cart.map(item=>({sku:item.sku,tipo:'ENTRADA',cantidad:item.qty,fecha,concepto:conceptoFinal,contacto}));
      const res=await fetch('/api/movimientos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lote)}).then(r=>r.json());
      if(res.ok){
        setMsg({t:'success',m:`✅ Entrada registrada: ${totalUds} uds — ${motivoCfg.label}`});
        setCart([]); setContacto(''); setNotas(''); recargar();
      } else setMsg({t:'error',m:res.error||'Error al guardar'});
    }catch(e){ setMsg({t:'error',m:'Error de conexión'}); }
    setGuard(false); setTimeout(()=>setMsg(null),5000);
  }

  return (
    <Shell title="Nueva Entrada">
      {catalogo&&<CatalogoExplorer productos={productos} modo="entrada" onAdd={addFromCatalog} onClose={()=>setCatalogo(false)}/>}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'13px 18px',background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:`4px solid var(--green)`,marginBottom:'20px'}}>
        <span style={{fontSize:'22px'}}>↑</span>
        <div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,color:'var(--green)',textTransform:'uppercase',letterSpacing:'.08em'}}>Registro de Entrada — Múltiples Productos</div>
          <div style={{fontSize:'11px',color:'#666',marginTop:'2px'}}>Compras, producciones, devoluciones y ajustes de inventario</div>
        </div>
      </div>

      {msg&&(
        <div style={{padding:'11px 16px',marginBottom:'16px',background:msg.t==='error'?'var(--red-soft)':'var(--green-soft)',borderLeft:`4px solid ${msg.t==='error'?'var(--red)':'var(--green)'}`,color:msg.t==='error'?'var(--red)':'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700}}>
          {msg.m}
        </div>
      )}

      <div style={{maxWidth:'820px',display:'flex',flexDirection:'column',gap:'16px'}}>

        {/* ── Motivo de entrada ── */}
        <div>
          <label style={{...lbl,marginBottom:'10px'}}>Motivo de entrada</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'8px'}}>
            {MOTIVOS_ENTRADA.map(m=>(
              <button key={m.id} onClick={()=>setMotivo(m.id)}
                style={{padding:'12px 10px',background:motivo===m.id?m.color:'var(--surface)',color:motivo===m.id?'#fff':'var(--ink)',
                  border:`1px solid ${motivo===m.id?m.color:'var(--border)'}`,cursor:'pointer',textAlign:'center',transition:'all .15s',
                  borderTop: motivo===m.id?`3px solid rgba(255,255,255,.4)`:`3px solid ${m.color}`}}>
                <div style={{fontSize:'20px',marginBottom:'5px'}}>{m.icon}</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase'}}>{m.label}</div>
              </button>
            ))}
          </div>
          {/* Descripción del motivo */}
          <div style={{marginTop:'8px',padding:'8px 12px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',borderLeft:`3px solid ${motivoCfg.color}`,fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555'}}>
            {motivoCfg.icon} <strong style={{color:motivoCfg.color}}>{motivoCfg.label}:</strong> {motivoCfg.desc}
          </div>
        </div>

        {/* ── Datos del registro ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          <div>
            <label style={lbl}>📅 Fecha</label>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>{motivo==='compra'?'🏭 Proveedor':motivo==='devolucion'?'👤 Cliente':motivo==='consignacion'?'📦 Origen':'📋 Referencia / Responsable'}</label>
            <input value={contacto} onChange={e=>setContacto(e.target.value)}
              placeholder={motivo==='compra'?'Nombre del proveedor...':motivo==='devolucion'?'Cliente que devuelve...':motivo==='consignacion'?'Empresa / persona...':'Opcional...'}
              style={inp}/>
          </div>
        </div>

        <div>
          <label style={lbl}>📝 Notas adicionales</label>
          <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Observaciones, número de factura, lote..." style={inp}/>
        </div>

        {/* ── Scanner + catálogo ── */}
        <div>
          <label style={{...lbl,marginBottom:'8px'}}>Agregar productos</label>
          <div style={{display:'flex',gap:'0',alignItems:'stretch'}}>
            <div style={{flex:1}}>
              <ScannerInput
                productos={productos}
                skipStockCheck={true}
                accentColor="var(--green)"
                onAdd={(prod, qty = 1) => {
                  setCart(prev => {
                    const ex = prev.find(x => x.sku === prod.sku);
                    if (ex) return prev.map(x => x.sku === prod.sku ? {...x, qty: x.qty + qty} : x);
                    return [...prev, {...prod, qty}];
                  });
                }}
              />
            </div>
            <button onClick={()=>setCatalogo(true)}
              style={{padding:'0 16px',background:'var(--green)',color:'#fff',border:'none',cursor:'pointer',
                fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',
                letterSpacing:'.04em',flexShrink:0,whiteSpace:'nowrap',alignSelf:'stretch',
                marginBottom:'10px'}}>
              ⊞ Catálogo
            </button>
          </div>
        </div>

        {/* ── Lista de productos ── */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{padding:'10px 14px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'#555'}}>Productos a ingresar</span>
            <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:totalUds>0?'var(--green)':'#aaa',fontWeight:700}}>{totalUds} uds</span>
              {cart.length>0&&<button onClick={()=>setCart([])} style={{padding:'2px 8px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>✕ LIMPIAR</button>}
            </div>
          </div>

          {cart.length===0?(
            <div style={{padding:'40px 24px',textAlign:'center',color:'#aaa'}}>
              <div style={{fontSize:'32px',marginBottom:'8px'}}>📦</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Escanea o abre el catálogo para agregar productos</div>
            </div>
          ):(
            <>
              {[...cart].reverse().map(item=>{
                const dot=colorHex(item.color);
                return(
                  <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'10px',padding:'10px 14px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                        <span style={{fontSize:'13px',fontWeight:600}}>{item.modelo} — {item.color}</span>
                        {item.talla&&item.talla!=='UNICA'&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',background:'var(--bg3)',padding:'1px 5px'}}>T:{item.talla}</span>}
                      </div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>
                        {item.sku} · Stock actual: <strong style={{color:'var(--blue)'}}>{fmtNum(item.disponible||0)} uds</strong> → después: <strong style={{color:'var(--green)'}}>{fmtNum((item.disponible||0)+item.qty)} uds</strong>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',flexShrink:0}}>
                      <button onClick={()=>changeQty(item.sku,-1)} style={{width:'28px',height:'28px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'15px'}}>−</button>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,width:'36px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'28px'}}>{item.qty}</span>
                      <button onClick={()=>changeQty(item.sku,1)} style={{width:'28px',height:'28px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'15px'}}>+</button>
                    </div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700,color:'var(--green)',minWidth:'50px',textAlign:'right'}}>+{item.qty} uds</div>
                    <button onClick={()=>removeItem(item.sku)} style={{width:'22px',height:'22px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'11px',color:'#888'}}>✕</button>
                  </div>
                );
              })}
              {/* Total */}
              <div style={{padding:'12px 14px',background:'var(--green-soft)',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'var(--green)',textTransform:'uppercase',letterSpacing:'.1em'}}>Total a ingresar</div>
                  <div style={{fontFamily:'Playfair Display,serif',fontSize:'22px',fontWeight:700,color:'var(--green)',lineHeight:1}}>{fmtNum(totalUds)} uds</div>
                </div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700,textAlign:'right'}}>
                  {cart.length} SKU{cart.length!==1?'s':''}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Botones acción ── */}
        <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
          <button onClick={()=>setCart([])} style={{padding:'11px 18px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>
            Limpiar
          </button>
          <button onClick={registrar} disabled={guardando||!cart.length}
            style={{padding:'11px 28px',background:cart.length?'var(--green)':'#ccc',color:'#fff',border:'none',cursor:cart.length?'pointer':'not-allowed',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',opacity:guardando?.6:1,transition:'background .2s'}}>
            {guardando?'⏳ Registrando...`':`↑ REGISTRAR ENTRADA · ${fmtNum(totalUds)} UDS`}
          </button>
        </div>

      </div>
    </Shell>
  );
}
