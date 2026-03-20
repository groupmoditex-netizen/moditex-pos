'use client';
import { colorHex } from '@/utils/colores';
import { useState } from 'react';
import Shell from '@/components/Shell';
import ProductSearch from '@/components/ProductSearch';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useAppData } from '@/lib/AppContext';

const inpS={width:'100%',padding:'9px 12px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'};
const lblS={fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};

export default function EntradaPage() {
  const { data, recargar } = useAppData() || {};
  const productos = data?.productos || [];

  const [cart, setCart]           = useState([]);
  const [fecha, setFecha]         = useState(()=>new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto]   = useState('');
  const [contacto, setContacto]   = useState('');
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg]             = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const [catalogo, setCatalogo]   = useState(false);

  function addToCart(p) {
    setCart(prev=>{const ex=prev.find(x=>x.sku===p.sku);if(ex)return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+1}:x);return [...prev,{...p,qty:1}];});
  }
  function addToCartQty(p, qty) {
    setCart(prev=>{const ex=prev.find(x=>x.sku===p.sku);if(ex)return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty}:x);return [...prev,{...p,qty}];});
  }

  function changeQty(sku,delta){setCart(prev=>prev.map(x=>x.sku===sku?{...x,qty:Math.max(1,x.qty+delta)}:x));}
  function removeItem(sku){setCart(prev=>prev.filter(x=>x.sku!==sku));}

  async function registrar() {
    if(!cart.length){showMsg('error','Agrega al menos un producto');return;}
    setGuardando(true);
    try{
      const lote=cart.map(item=>({sku:item.sku,tipo:'ENTRADA',cantidad:item.qty,fecha,concepto,contacto}));
      const res=await fetch('/api/movimientos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lote)}).then(r=>r.json());
      if(res.ok){showMsg('success',`✓ Entrada de ${cart.reduce((a,i)=>a+i.qty,0)} uds registrada`);setCart([]);setConcepto('');setContacto('');recargar();}
      else showMsg('error',res.error||'Error al guardar');
    }catch(e){showMsg('error','Error de conexión');}
    setGuardando(false);
  }

  function showMsg(type,text){setMsg({type,text});setTimeout(()=>setMsg(null),4000);}
  const totalUds=cart.reduce((a,i)=>a+i.qty,0);

  return (
    <Shell title="Nueva Entrada">
      {catalogo && <CatalogoExplorer productos={productos} modo="entrada" onAdd={(p,qty)=>{addToCartQty(p,qty);}} onClose={()=>setCatalogo(false)}/>}
      <div style={{maxWidth:'760px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'13px 18px',background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'3px solid var(--green)',marginBottom:'20px'}}>
          <span style={{fontSize:'20px'}}>↑</span>
          <div>
            <div style={{fontSize:'13px',fontWeight:700,color:'var(--green)',textTransform:'uppercase',letterSpacing:'.03em'}}>Registro de Entrada — Múltiples Productos</div>
            <div style={{fontSize:'11px',color:'#666',fontFamily:'DM Mono,monospace'}}>Agrega varios productos y registra todo de una vez</div>
          </div>
        </div>
        {msg&&<div style={{padding:'11px 15px',marginBottom:'14px',background:msg.type==='error'?'var(--red-soft)':'var(--green-soft)',border:`1px solid ${msg.type==='error'?'rgba(217,30,30,.3)':'rgba(26,122,60,.3)'}`,color:msg.type==='error'?'var(--red)':'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{msg.text}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'16px'}}>
          <div><label style={lblS}>Fecha *</label><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inpS}/></div>
          <div><label style={lblS}>Proveedor</label><input type="text" placeholder="Proveedor o referencia" value={contacto} onChange={e=>setContacto(e.target.value)} style={inpS}/></div>
          <div style={{gridColumn:'span 2'}}><label style={lblS}>Concepto</label><input type="text" placeholder="Reposición de stock, producción nueva..." value={concepto} onChange={e=>setConcepto(e.target.value)} style={inpS}/></div>
        </div>
        <div style={{marginBottom:'8px'}}>
          <label style={lblS}>Buscar y agregar producto</label>
          {/* Lector físico + cámara */}
          <BarcodeScanner productos={productos} onAdd={addToCart} disabled={guardando}/>
          <div style={{display:'flex',gap:'8px'}}>
            <div style={{flex:1}}><ProductSearch productos={productos} onAdd={addToCart} modo="entrada"/></div>
            <button onClick={()=>setCatalogo(true)} style={{padding:'8px 14px',background:'var(--bg2)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--ink)',whiteSpace:'nowrap',flexShrink:0}}>
              ⊞ Explorar Catálogo
            </button>
          </div>
        </div>
        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',overflow:'hidden',marginTop:'8px'}}>
          <div style={{display:'flex',justifyContent:'space-between',padding:'9px 14px',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.1em',textTransform:'uppercase',color:'#555'}}>
            <span>Productos a ingresar</span>
            <span style={{color:'var(--green)'}}>{cart.length} producto{cart.length!==1?'s':''} · {totalUds} uds</span>
          </div>
          {cart.length===0?<div style={{padding:'40px',textAlign:'center',color:'#888',fontSize:'13px'}}>Busca o explora el catálogo 👆</div>:
            [...cart].reverse().map(item=>(
              <div key={item.sku} style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 14px',borderBottom:'1px solid var(--border)'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'12px',fontWeight:600}}>{item.modelo} — {item.color}{item.talla&&item.talla!=='UNICA'?` T:${item.talla}`:''}</div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)',marginTop:'2px'}}>{item.sku}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <button onClick={()=>changeQty(item.sku,-1)} style={{width:'28px',height:'28px',background:'var(--bg3)',border:'1px solid var(--border)',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'15px',fontWeight:700,minWidth:'32px',textAlign:'center'}}>{item.qty}</span>
                  <button onClick={()=>changeQty(item.sku,1)} style={{width:'28px',height:'28px',background:'var(--bg3)',border:'1px solid var(--border)',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                </div>
                <button onClick={()=>removeItem(item.sku)} style={{width:'24px',height:'24px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'12px',color:'#666',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>
            ))
          }
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'var(--bg3)',borderTop:'1px solid var(--border)'}}>
            <div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.12em',textTransform:'uppercase'}}>Total unidades</div>
              <div style={{fontFamily:'Playfair Display,serif',fontSize:'24px',fontWeight:700,color:'var(--green)'}}>{totalUds} uds</div>
            </div>
            <div style={{display:'flex',gap:'9px'}}>
              <button className="btn btn-ghost" onClick={()=>setCart([])}>Limpiar</button>
              <button className="btn btn-green" onClick={()=>setConfirmar(true)} disabled={guardando||!cart.length} style={{minWidth:'200px'}}>✓ Registrar Entrada</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de confirmación ── */}
      {confirmar && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}
          onClick={e=>{if(e.target===e.currentTarget)setConfirmar(false);}}>
          <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'460px',borderTop:'3px solid var(--green)'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)'}}>
              <div style={{fontFamily:'Playfair Display,serif',fontSize:'17px',fontWeight:700}}>Confirmar Entrada</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666',marginTop:'3px'}}>Revisá el resumen antes de confirmar</div>
            </div>
            <div style={{padding:'16px 20px',maxHeight:'280px',overflowY:'auto'}}>
              {cart.map(item=>(
                <div key={item.sku} style={{display:'flex',alignItems:'center',gap:'12px',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{width:'10px',height:'10px',borderRadius:'50%',background:colorHex(item.color),border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'13px',fontWeight:600}}>{item.modelo} — {item.color}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>{item.sku}</div>
                  </div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'15px',fontWeight:700,color:'var(--green)'}}>+{item.qty} uds</div>
                </div>
              ))}
            </div>
            <div style={{padding:'14px 20px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',textTransform:'uppercase',letterSpacing:'.12em'}}>Total unidades</div>
                <div style={{fontFamily:'Playfair Display,serif',fontSize:'26px',fontWeight:700,color:'var(--green)'}}>{totalUds} uds</div>
              </div>
              <div style={{display:'flex',gap:'9px'}}>
                <button onClick={()=>setConfirmar(false)} style={{padding:'9px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase'}}>Cancelar</button>
                <button onClick={()=>{setConfirmar(false);registrar();}} disabled={guardando}
                  style={{padding:'9px 20px',background:'var(--green)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>
                  {guardando?'⏳ Guardando...':'✓ Confirmar Entrada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}