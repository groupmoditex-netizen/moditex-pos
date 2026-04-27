'use client';
import { useState, useEffect, useRef } from 'react';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import ScannerInput from '@/components/ScannerInput';
import WidgetPago, { METODOS } from './WidgetPago';
import { colorHex } from '@/utils/colores';
import { fmtNum, parseProd } from '@/utils/formatters';
import { useAuth } from '@/lib/AuthContext';
import { generarNotaEnvio } from '@/lib/generarNotaEnvio';

const S = {
  pendiente: {bg:'#fff8e1',color:'#f59e0b',border:'#f59e0b',label:'Pendiente',  icon:'🕐'},
  empacado:  {bg:'#eff6ff',color:'#3b82f6',border:'#3b82f6',label:'Empacado',   icon:'📦'},
  enviado:   {bg:'#f0fdf4',color:'#22c55e',border:'#22c55e',label:'Enviado',    icon:'🚀'},
  cancelado: {bg:'#fff1f2',color:'#ef4444',border:'#ef4444',label:'Cancelado',  icon:'❌'},
};
const FLUJO = ['pendiente','empacado','enviado'];

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};

export default
function ModalGestion({ cmd, productos=[], isAdmin=false, onClose, onSave, onDelete }) {
  const sc = S[cmd.status]||S.pendiente;
  const { usuario } = useAuth() || {};
  const [pagos,    setPagos]   = useState([]);
  const [loadP,    setLoadP]   = useState(true);
  const [notas,    setNotas]   = useState(cmd.notas||'');
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');
  const [deleting, setDeleting]= useState(false);

  // ── Comentarios del equipo ────────────────────────────────────────
  const [comentarios,      setComentarios]      = useState([]);
  const [loadC,            setLoadC]            = useState(true);
  const [nuevoComentario,  setNuevoComentario]  = useState('');
  const [tipoComentario,   setTipoComentario]   = useState('nota');
  const [enviandoC,        setEnviandoC]        = useState(false);
  const comentariosEndRef = useRef(null);

  // â”€â”€ Estado de empacado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Guarda cuÃ¡ntas unidades de cada SKU ya fueron empacadas fÃ­sicamente
  const [empacadoMap, setEmpacadoMap] = useState(() => {
    // Inicializar desde localStorage si existe para esta comanda
    try {
      const saved = localStorage.getItem('emp_' + cmd.id);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  function marcarEmpacado(sku, delta) {
    setEmpacadoMap(prev => {
      const pedido = parseProd(cmd).find(p => (p.sku||'').toUpperCase() === sku.toUpperCase());
      const max = parseInt(pedido?.cant || pedido?.cantidad || 1);
      const cur = prev[sku] || 0;
      const next = Math.max(0, Math.min(cur + delta, max));
      const updated = { ...prev, [sku]: next };
      try { localStorage.setItem('emp_' + cmd.id, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function scanEmpacado(prod) {
    const sku = prod.sku?.toUpperCase() || '';
    const pedido = parseProd(cmd).find(p => (p.sku||'').toUpperCase() === sku);
    if (!pedido) return;
    marcarEmpacado(sku, 1);
  }

  const prodsParaEmpacar = parseProd(cmd);
  const totalPedido = prodsParaEmpacar.reduce((a, p) => a + parseInt(p.cant||p.cantidad||1), 0);
  const totalEmpacado = prodsParaEmpacar.reduce((a, p) => {
    const sku = (p.sku||'').toUpperCase();
    return a + Math.min(empacadoMap[sku]||0, parseInt(p.cant||p.cantidad||1));
  }, 0);
  const empacadoCompleto = totalEmpacado >= totalPedido && totalPedido > 0;

  async function eliminarComanda() {
    if (!window.confirm(`âš ï¸ Â¿Eliminar la comanda de "${cmd.cliente}" (${cmd.id})?\n\nEsta acciÃ³n no se puede deshacer. Se eliminarÃ¡n tambiÃ©n todos los pagos asociados.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/comandas', {method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:cmd.id})}).then(r=>r.json());
      if (res.ok) { onDelete?.(); onClose(); }
      else setErr(res.error||'Error al eliminar');
    } catch(e){ setErr('Error de conexiÃ³n'); }
    setDeleting(false);
  }

  // â”€â”€ Modo ediciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [editMode,    setEditMode]  = useState(false);
  const [editItems,   setEditItems] = useState([]);
  const [editCatalog, setEditCat]   = useState(false);

  function parseProd(c){let p=c.productos;if(typeof p==='string')try{p=JSON.parse(p);}catch{p=[];}return Array.isArray(p)?p:[];}

  function abrirEdicion() {
    // Convertir productos guardados al formato editable
    const prods = parseProd(cmd).map(p => ({
      sku: p.sku||'', modelo: p.modelo||p.sku||'', color: p.color||'', talla: p.talla||'',
      precioDetal: p.precio||0, precioMayor: p.precio||0,
      tipoVenta: p.tipoVenta||'MAYOR', qty: parseInt(p.cant||p.cantidad||1),
      disponible: 999,
    }));
    setEditItems(prods);
    setEditMode(true);
    setErr('');
  }

  function editChangeQty(sku,d){ setEditItems(prev=>prev.map(x=>x.sku===sku?{...x,qty:Math.max(1,x.qty+d)}:x)); }
  function editSetTV(sku,tv)   { setEditItems(prev=>prev.map(x=>x.sku===sku?{...x,tipoVenta:tv}:x)); }
  function editRemove(sku)     { setEditItems(prev=>prev.filter(x=>x.sku!==sku)); }
  function editAddFromCatalog(p,qty,tv) {
    setEditItems(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty,tipoVenta:tv}:x);
      return[...prev,{...p,qty,tipoVenta:tv}];
    });
  }

  const editTotal = editItems.reduce((a,it)=>a+(it.tipoVenta==='MAYOR'?(it.precioMayor||0):(it.precioDetal||0))*it.qty, 0);

  async function guardarEdicion() {
    if (!editItems.length) { setErr('Agrega al menos un producto'); return; }
    setSaving(true); setErr('');
    const productosPayload = editItems.map(it=>({
      sku: it.sku,
      modelo: `${it.modelo}${it.color?' â€” '+it.color:''}${it.talla&&it.talla!=='UNICA'?' '+it.talla:''}`,
      cant: it.qty,
      precio: it.tipoVenta==='MAYOR'?(it.precioMayor||0):(it.precioDetal||0),
      tipoVenta: it.tipoVenta,
    }));
    const res = await fetch('/api/comandas',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:cmd.id, productos:productosPayload, precio:editTotal, notas})}).then(r=>r.json());
    if(res.ok){ setEditMode(false); onSave(); }
    else setErr(res.error||'Error al guardar');
    setSaving(false);
  }

  const saldo = Math.max(0,(cmd.precio||0)-(cmd.monto_pagado||0));
  const pct   = cmd.precio>0?Math.min(100,((cmd.monto_pagado||0)/cmd.precio)*100):0;

  useEffect(()=>{
    fetch(`/api/pagos?comanda_id=${cmd.id}`).then(r=>r.json())
      .then(d=>{if(d.ok)setPagos(d.pagos);}).finally(()=>setLoadP(false));
  },[cmd.id]);

  useEffect(()=>{
    fetch(`/api/comentarios?comanda_id=${cmd.id}`).then(r=>r.json())
      .then(d=>{if(d.ok)setComentarios(d.comentarios||[]);}).finally(()=>setLoadC(false));
  },[cmd.id]);

  async function enviarComentario(){
    const texto = nuevoComentario.trim();
    if(!texto) return;
    setEnviandoC(true);
    try{
      const res = await fetch('/api/comentarios',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ comanda_id:cmd.id, texto, usuario:usuario?.nombre||'Sistema', tipo:tipoComentario }),
      }).then(r=>r.json());
      if(res.ok){
        setComentarios(prev=>[...prev, res.comentario]);
        setNuevoComentario('');
        setTimeout(()=>comentariosEndRef.current?.scrollIntoView({behavior:'smooth'}),80);
      }
    }catch(e){}
    setEnviandoC(false);
  }

  async function cambiarStatus(s){
    setSaving(true); setErr('');
    const res=await fetch('/api/comandas',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cmd.id,status:s,notas})}).then(r=>r.json());
    if(res.ok){
      onSave();
    } else if (res.errorTipo === 'SIN_STOCK') {
      const detalle = res.sinStock.map(x=>`â€¢ ${x.modelo}: necesitas ${x.requerido} ud${x.requerido>1?'s':''}, tienes ${x.stockReal} (faltan ${x.falta})`).join('\n');
      setErr(`âŒ Sin stock suficiente:\n${detalle}\n\nRegistra una Entrada primero.`);
    } else {
      setErr(res.error||'Error');
    }
    setSaving(false);
  }

  const prods = parseProd(cmd);

  const idxActual = FLUJO.indexOf(cmd.status);
  const sigStatus = FLUJO[idxActual+1];

  return (
    <>
    {editCatalog&&<CatalogoExplorer productos={productos} modo="salida" tipoVenta="MAYOR" onAdd={editAddFromCatalog} onClose={()=>setEditCat(false)}/>}
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0',overflowY:'auto'}} className="modal-wrap" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-fullscreen" style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'640px',borderTop:`3px solid ${editMode?'#f59e0b':sc.border}`,maxHeight:'96vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'17px',fontWeight:700}}>{cmd.cliente}</div>
            <div style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'4px'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>{cmd.id}</span>
              <span style={{background:sc.bg,color:sc.color,fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'2px 10px',fontWeight:700,border:`1px solid ${sc.border}44`}}>{sc.icon} {sc.label}</span>
              {cmd.fecha_entrega&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>ðŸ“… {cmd.fecha_entrega}</span>}
              {editMode&&<span style={{background:'#fff8e1',color:'#f59e0b',fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'2px 8px',fontWeight:700,border:'1px solid #f59e0b44'}}>âœï¸ MODO EDICIÃ“N</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>âœ•</button>
        </div>

        <div style={{padding:'14px 18px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'14px'}}>
          {err&&<div style={{padding:'8px 11px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',whiteSpace:'pre-line',lineHeight:1.6}}>{err}</div>}

          {/* â”€â”€ MODO EDICIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {editMode ? (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{padding:'10px 12px',background:'#fff8e1',border:'1px solid #f59e0b44',borderLeft:'3px solid #f59e0b',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#92400e'}}>
                âœï¸ Editando prendas del pedido. Los cambios se guardan al presionar <strong>Guardar cambios</strong>.
                {cmd.status==='empacado'&&<span style={{display:'block',marginTop:'4px',color:'var(--red)',fontWeight:700}}>âš ï¸ Esta comanda ya estÃ¡ en LISTO. El stock se recalcularÃ¡ al avanzar de nuevo.</span>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.14em',textTransform:'uppercase'}}>Prendas ({editItems.length})</div>
                <button onClick={()=>setEditCat(true)} style={{padding:'6px 12px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase'}}>
                  âŠž Agregar del CatÃ¡logo
                </button>
              </div>
              {editItems.length===0 ? (
                <div style={{padding:'20px',textAlign:'center',background:'var(--bg2)',border:'1px dashed var(--border-strong)',color:'#888',fontSize:'12px'}}>Sin productos. Abre el catÃ¡logo para agregar.</div>
              ) : (
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
                  {[...editItems].reverse().map(item=>{
                    const precio=item.tipoVenta==='MAYOR'?(item.precioMayor||0):(item.precioDetal||0);
                    const dot=colorHex(item.color||'')||'#9ca3af';
                    return(
                      <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'6px',padding:'9px 12px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                            <span style={{fontSize:'12px',fontWeight:600}}>{item.modelo}</span>
                          </div>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>{item.sku} Â· â‚¬{precio.toFixed(2)} Ã— {item.qty} = <strong>â‚¬{(precio*item.qty).toFixed(2)}</strong></div>
                        </div>
                        <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                          {['DETAL','MAYOR'].map(tv=><button key={tv} onClick={()=>editSetTV(item.sku,tv)} style={{padding:'4px 6px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,background:item.tipoVenta===tv?(tv==='DETAL'?'var(--blue)':' var(--warn)'):'var(--bg3)',color:item.tipoVenta===tv?'#fff':'#777'}}>{tv[0]}</button>)}
                        </div>
                        <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',flexShrink:0}}>
                          <button onClick={()=>editChangeQty(item.sku,-1)} style={{width:'24px',height:'24px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px'}}>âˆ’</button>
                          <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,width:'28px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'24px'}}>{item.qty}</span>
                          <button onClick={()=>editChangeQty(item.sku,1)} style={{width:'24px',height:'24px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px'}}>+</button>
                        </div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,minWidth:'52px',textAlign:'right',flexShrink:0}}>â‚¬{(precio*item.qty).toFixed(2)}</div>
                        <button onClick={()=>editRemove(item.sku)} style={{width:'22px',height:'22px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'11px',color:'#888'}}>âœ•</button>
                      </div>
                    );
                  })}
                  <div style={{padding:'8px 13px',background:'var(--bg3)',display:'flex',justifyContent:'flex-end',fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'#f59e0b'}}>
                    Nuevo total: â‚¬ {editTotal.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* â”€â”€ VISTA NORMAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
            <>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px'}}>
                {[['ðŸ’¶ Total',`â‚¬ ${fmtNum(cmd.precio)}`,'#333'],
                  ['âœ… Pagado',`â‚¬ ${fmtNum(cmd.monto_pagado)}`,'var(--green)'],
                  ['â³ Saldo',`â‚¬ ${fmtNum(saldo)}`,saldo>0.01?'var(--red)':'var(--green)']
                ].map(([l,v,c])=>(
                  <div key={l} style={{padding:'11px 10px',background:'var(--bg2)',border:'1px solid var(--border)',textAlign:'center'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',marginBottom:'4px'}}>{l}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'16px',fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>

              {cmd.precio>0&&(
                <div>
                  <div style={{height:'6px',background:'var(--border)',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{width:`${pct}%`,height:'100%',background:pct>=100?'var(--green)':pct>50?'var(--warn)':'var(--red)',borderRadius:'3px',transition:'width .4s'}}/>
                  </div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'4px',textAlign:'right'}}>{pct.toFixed(0)}% pagado</div>
                </div>
              )}

              {/* â”€â”€ Lista de prendas â€” con progreso de empacado si status=empacado â”€â”€ */}
              {prods.length>0&&(
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)'}}>
                  <div style={{padding:'10px 13px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#555'}}>
                      Prendas del pedido
                      {cmd.status==='empacado'&&(
                        <span style={{marginLeft:'8px',color: empacadoCompleto?'var(--green)':'#3b82f6',fontWeight:700}}>
                          Â· {totalEmpacado}/{totalPedido} uds
                        </span>
                      )}
                    </div>
                    {cmd.status!=='enviado'&&cmd.status!=='cancelado'&&(
                      <button onClick={abrirEdicion} style={{padding:'3px 10px',background:'none',border:'1px solid #f59e0b',color:'#f59e0b',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700}}>
                        âœï¸ Editar
                      </button>
                    )}
                  </div>

                  {/* Barra de progreso empacado */}
                  {cmd.status==='empacado'&&totalPedido>0&&(
                    <div style={{padding:'0 13px'}}>
                      <div style={{height:'4px',background:'var(--border)',margin:'8px 0 0'}}>
                        <div style={{width:`${Math.round(totalEmpacado/totalPedido*100)}%`,height:'100%',background:empacadoCompleto?'var(--green)':'#3b82f6',transition:'width .3s'}}/>
                      </div>
                    </div>
                  )}

                  {/* Tabla de prendas */}
                  {cmd.status==='empacado' ? (
                    /* Vista detallada con scanner de empacado */
                    <div style={{padding:'10px 13px',display:'flex',flexDirection:'column',gap:'8px'}}>
                      {/* Scanner para escanear lo que ya se empacÃ³ */}
                      <ScannerInput
                        productos={prods.map(p=>({sku:p.sku||'',modelo:p.modelo||p.sku||'',color:p.color||'',disponible:999,...p}))}
                        skipStockCheck={true}
                        accentColor="#3b82f6"
                        onAdd={(prod) => scanEmpacado(prod)}
                      />
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',letterSpacing:'.08em',marginBottom:'2px'}}>
                        Escanea cada prenda al empacarla â€” o usa los botones +/âˆ’
                      </div>
                      {prods.map((p,i)=>{
                        const sku=(p.sku||'').toUpperCase();
                        const total=parseInt(p.cant||p.cantidad||1);
                        const empacadas=Math.min(empacadoMap[sku]||0, total);
                        const falta=total-empacadas;
                        const done=falta===0;
                        return(
                          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'10px',padding:'9px 10px',background:done?'var(--green-soft)':'var(--surface)',border:`1px solid ${done?'rgba(26,122,60,.25)':'var(--border)'}`,alignItems:'center',transition:'background .2s'}}>
                            <div>
                              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',background:done?'var(--green)':'#3b82f6',color:'#fff',padding:'1px 6px',fontWeight:700,minWidth:'24px',textAlign:'center'}}>
                                  {done?'âœ“':empacadas+'/'+total}
                                </span>
                                <span style={{fontSize:'12px',fontWeight:600}}>{p.modelo||p.sku||'â€”'}</span>
                                {p.tipoVenta&&<span style={{background:p.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:p.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',padding:'0 4px',fontFamily:'DM Mono,monospace',fontSize:'8px'}}>{p.tipoVenta[0]}</span>}
                              </div>
                              {p.sku&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginTop:'2px'}}>
                                {p.sku}{p.color?' · '+p.color:''}
                                {p.desde_produccion && <span style={{marginLeft:'6px', background:'#eff6ff', color:'#3b82f6', border:'1px solid #bfdbfe', padding:'1px 4px', fontWeight:700}}>🏭 PRODUCCIÓN</span>}
                              </div>}
                              {!done&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'var(--red)',marginTop:'1px',fontWeight:700}}>Faltan {falta} ud{falta!==1?'s':''}</div>}
                            </div>
                            <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',flexShrink:0}}>
                              <button onClick={()=>marcarEmpacado(sku,-1)} style={{width:'26px',height:'26px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px',color:'var(--red)'}}>âˆ’</button>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,width:'32px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'26px',color:done?'var(--green)':'var(--ink)'}}>{empacadas}</span>
                              <button onClick={()=>marcarEmpacado(sku,1)} disabled={done} style={{width:'26px',height:'26px',background:'var(--bg3)',border:'none',cursor:done?'default':'pointer',fontSize:'14px',color:done?'#aaa':'var(--green)',opacity:done?.4:1}}>+</button>
                            </div>
                          </div>
                        );
                      })}
                      {empacadoCompleto&&(
                        <div style={{padding:'9px 12px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.3)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700,textAlign:'center'}}>
                          âœ… Todo empacado â€” listo para enviar
                        </div>
                      )}
                      {!empacadoCompleto&&totalPedido>0&&(
                        <div style={{padding:'9px 12px',background:'#eff6ff',border:'1px solid #93c5fd44',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#3b82f6',fontWeight:700,textAlign:'center'}}>
                          ðŸ“¦ Faltan {totalPedido-totalEmpacado} uds por empacar
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Vista compacta para pendiente/enviado */
                    <div style={{padding:'10px 13px'}}>
                      <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                        {prods.map((p,i)=>(
                          <span key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'3px 9px',fontFamily:'DM Mono,monospace',fontSize:'9px',display:'flex',alignItems:'center',gap:'4px'}}>
                            <strong>{p.cant}×</strong> {p.modelo||p.sku||'—'}
                            {p.tipoVenta&&<span style={{background:p.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:p.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',padding:'0 3px',fontSize:'8px'}}>{p.tipoVenta[0]}</span>}
                            {p.precio>0&&<span style={{color:'var(--red)',fontSize:'9px'}}>€{p.precio}</span>}
                            {p.desde_produccion && <span style={{background:'#eff6ff', color:'#3b82f6', border:'1px solid #bfdbfe', padding:'0 3px', fontSize:'8px', fontWeight:700}}>🏭 PROD</span>}
                          </span>
                        ))}
                      </div>
                      {cmd.status==='pendiente'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'7px'}}>âš ï¸ El stock se descuenta al marcar Empacado</div>}
                    </div>
                  )}
                </div>
              )}

              {/* â”€â”€ Acciones â”€â”€ */}
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'4px'}}>Acciones del pedido</div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {sigStatus&&(
                    <button onClick={()=>cambiarStatus(sigStatus)} disabled={saving}
                      style={{flex:2,padding:'11px 16px',background:S[sigStatus].border,color:'#fff',border:`2px solid ${S[sigStatus].border}`,cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',opacity:saving?.6:1}}>
                      {S[sigStatus].icon} Avanzar a {S[sigStatus].label}
                      {sigStatus==='enviado'&&<span style={{fontSize:'10px',fontWeight:400,opacity:.8}}>(descuenta stock)</span>}
                    </button>
                  )}
                  {cmd.status!=='cancelado'&&(
                    <button onClick={()=>cambiarStatus('cancelado')} disabled={saving}
                      style={{flex:1,padding:'11px 10px',background:'var(--bg2)',color:'var(--red)',border:'1px solid var(--red)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,opacity:saving?.6:1}}>
                      âŒ Cancelar
                    </button>
                  )}
                  {cmd.status==='cancelado'&&(
                    <button onClick={()=>cambiarStatus('pendiente')} disabled={saving}
                      style={{flex:1,padding:'11px 10px',background:'var(--warn-soft)',color:'var(--warn)',border:'1px solid var(--warn)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>
                      ↩ Reactivar
                    </button>
                  )}
                  {(cmd.status==='empacado' || cmd.status==='enviado' || totalEmpacado > 0) && (
                    <button onClick={()=>generarNotaEnvio(cmd, prods, empacadoMap)} disabled={saving}
                      style={{flex:1,padding:'11px 10px',background:'#eff6ff',color:'#3b82f6',border:'1px solid #3b82f6',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>
                      🖨️ Imprimir Nota
                    </button>
                  )}
                </div>
              </div>

              {saldo>0.01&&<WidgetPago comandaId={cmd.id} saldo={saldo} onPagoRegistrado={()=>onSave()}/>}
              {saldo<=0.01&&cmd.precio>0&&(
                <div style={{padding:'11px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--green)',textAlign:'center',fontWeight:700}}>
                  âœ… Comanda pagada completamente
                </div>
              )}

              {!loadP&&pagos.length>0&&(
                <div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#555',marginBottom:'8px'}}>Historial de pagos</div>
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
                    {pagos.map((p,i)=>{
                      const mcfg=METODOS.find(m=>m.id===p.metodo);
                      return(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 13px',borderBottom:'1px solid var(--border)'}}>
                          <span style={{fontSize:'16px',flexShrink:0}}>{mcfg?.icon||'ðŸ’°'}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'12px',fontWeight:600}}>{mcfg?.label||p.metodo}</div>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>{p.fecha}{p.referencia?` Â· Ref: ${p.referencia}`:''}</div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'var(--green)'}}>
                              {p.divisa==='BS'?`Bs. ${fmtNum(p.monto_bs||p.monto_divisa)}`:`${p.divisa} ${fmtNum(p.monto_divisa)}`}
                            </div>
                            {p.tasa_bs>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>@ {fmtNum(p.tasa_bs)} Bs/{p.divisa}</div>}
                            {p.monto_bs>0&&p.divisa!=='BS'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>= Bs. {fmtNum(p.monto_bs)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Notas rápidas ── */}
          <div>
            <label style={lbl}>📝 Notas generales de entrega</label>
            <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Instrucciones de entrega, observaciones rápidas..." style={inp}/>
          </div>

          {/* ── Comentarios del equipo ── */}
          <div style={{border:'1px solid var(--border)',borderRadius:'3px',overflow:'hidden'}}>
            {/* Header */}
            <div style={{padding:'9px 14px',background:'var(--bg3)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#555',fontWeight:700}}>💬 Notas del equipo</span>
              {comentarios.length>0&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#999'}}>· {comentarios.length} nota{comentarios.length!==1?'s':''}</span>}
            </div>

            {/* Lista de comentarios */}
            <div style={{maxHeight:'220px',overflowY:'auto',background:'var(--bg2)'}}>
              {loadC ? (
                <div style={{padding:'14px',textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>Cargando...</div>
              ) : comentarios.length===0 ? (
                <div style={{padding:'20px',textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#bbb'}}>Sin notas aún — sé el primero en agregar una</div>
              ) : (
                comentarios.map(c=>{
                  const cfg = {
                    nota:    {icon:'🗒️',lborder:'#d1d5db',bg:'var(--surface)'},
                    alerta:  {icon:'⚠️', lborder:'#f59e0b',bg:'#fffbeb'},
                    logo:    {icon:'📌',lborder:'#3b82f6',bg:'#eff6ff'},
                    empaque: {icon:'📦',lborder:'#22c55e',bg:'#f0fdf4'},
                  }[c.tipo]||{icon:'🗒️',lborder:'#d1d5db',bg:'var(--surface)'};
                  return (
                    <div key={c.id} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:cfg.bg,borderLeft:`3px solid ${cfg.lborder}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,color:'#444'}}>{cfg.icon} {c.usuario}</span>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#bbb'}}>
                          {new Date(c.created_at).toLocaleString('es-VE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                      <div style={{fontSize:'12px',color:'#222',lineHeight:1.5}}>{c.texto}</div>
                    </div>
                  );
                })
              )}
              <div ref={comentariosEndRef}/>
            </div>

            {/* Form nuevo comentario */}
            <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',background:'var(--surface)',display:'flex',flexDirection:'column',gap:'7px'}}>
              <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                {[
                  {id:'nota',   icon:'🗒️', label:'Nota'},
                  {id:'alerta', icon:'⚠️',  label:'Alerta'},
                  {id:'logo',   icon:'📌', label:'Logo / Diseño'},
                  {id:'empaque',icon:'📦', label:'Empaque'},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setTipoComentario(t.id)}
                    style={{padding:'3px 8px',background:tipoComentario===t.id?'#f59e0b':'var(--bg2)',color:tipoComentario===t.id?'#000':'#666',border:`1px solid ${tipoComentario===t.id?'#f59e0b':'var(--border)'}`,cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:tipoComentario===t.id?700:400,whiteSpace:'nowrap'}}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <input
                  value={nuevoComentario}
                  onChange={e=>setNuevoComentario(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviarComentario();}}}
                  placeholder="Escribe una nota para el equipo... (Enter para enviar)"
                  style={{flex:1,padding:'8px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'}}
                />
                <button onClick={enviarComentario} disabled={enviandoC||!nuevoComentario.trim()}
                  style={{padding:'8px 14px',background:'#1a1a1a',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,whiteSpace:'nowrap',opacity:(enviandoC||!nuevoComentario.trim())?.5:1}}>
                  {enviandoC?'⏳':'+ Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer-bar" style={{borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px',background:'var(--bg2)',flexShrink:0}}>
          {/* BotÃ³n eliminar â€” solo admin */}
          {isAdmin && !editMode ? (
            <button onClick={eliminarComanda} disabled={deleting}
              style={{padding:'9px 13px',background:'none',border:'1px solid var(--red)',color:'var(--red)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,letterSpacing:'.08em',opacity:deleting?.5:1,whiteSpace:'nowrap'}}>
              {deleting?'â³':'ðŸ—‘'} ELIMINAR
            </button>
          ) : <div/>}

          {editMode ? (
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>setEditMode(false)} style={{padding:'11px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>âœ• Cancelar ediciÃ³n</button>
              <button onClick={guardarEdicion} disabled={saving||!editItems.length}
                style={{padding:'11px 20px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',opacity:saving?.6:1}}>
                {saving?'â³ Guardando...':'ðŸ’¾ Guardar cambios'}
              </button>
            </div>
          ) : (
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={onClose} style={{padding:'11px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>Cerrar</button>
              <button onClick={async()=>{const res=await fetch('/api/comandas',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cmd.id,notas})}).then(r=>r.json());if(res.ok)onSave();else setErr(res.error);}} style={{padding:'8px 15px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>Guardar notas</button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}