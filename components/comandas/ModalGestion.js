'use client';
import React, { useState, useEffect } from 'react';
import WidgetPago from './WidgetPago';
import CatalogoExplorer from '../CatalogoExplorer';

const S = {
  pendiente: {bg:'#fff8e1',color:'#f59e0b',border:'#f59e0b',label:'Pendiente',  icon:'🕐'},
  empacado:  {bg:'#eff6ff',color:'#3b82f6',border:'#3b82f6',label:'Empacado',   icon:'📦'},
  enviado:   {bg:'#f0fdf4',color:'#22c55e',border:'#22c55e',label:'Enviado',    icon:'🚀'},
  cancelado: {bg:'#fff1f2',color:'#ef4444',border:'#ef4444',label:'Cancelado',  icon:'❌'},
};

const METODOS = [
  {id:'pago_movil',  label:'Pago Móvil',   icon:'📱', divisa:'BS'},
  {id:'transferencia',label:'Transf. BS',   icon:'🏦', divisa:'BS'},
  {id:'efectivo_bs', label:'Efectivo BS',   icon:'💵', divisa:'BS'},
  {id:'punto_venta', label:'Punto Venta',   icon:'💳', divisa:'BS'},
  {id:'zelle',       label:'Zelle',         icon:'💸', divisa:'USD'},
  {id:'efectivo_usd',label:'Efectivo USD',  icon:'🇺🇸', divisa:'USD'},
  {id:'binance',     label:'Binance/USDT',  icon:'🔶', divisa:'USDT'},
  {id:'efectivo_eur',label:'Efectivo €',    icon:'💶', divisa:'EUR'},
  {id:'transferencia_eur',label:'Transf. €',icon:'🇪🇺', divisa:'EUR'},
];

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};

function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function parseProd(cmd){let p=cmd.productos;if(typeof p==='string')try{p=JSON.parse(p);}catch{p=[];}return Array.isArray(p)?p:[];}
function colorHex(n){
  const CM={BLANCO:'#d0d0d0',NEGRO:'#1a1a1a',AZUL:'#3b6fd4',ROJO:'#d63b3b',VERDE:'#2d9e4a',ROSA:'#f07aa0',GRIS:'#6b7280',AMARILLO:'#f5c842',NARANJA:'#f57c42',MORADO:'#7c4fd4',VINOTINTO:'#8b2035',BEIGE:'#d4b896',CORAL:'#f26e5b',CELESTE:'#7ec8e3'};
  const k=(n||'').toUpperCase().trim();return CM[k]||CM[k.split(' ')[0]]||'#9ca3af';
}

const fmtSmartDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${d.getDate()}/${d.getMonth() + 1} ${time}`;
};

export default function ModalGestion({ cmd, onClose, onSave, isAdmin, usuario, usuariosDB, productos }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');
  const [notas, setNotas] = useState(cmd.notas || '');
  const [editMode, setEditMode] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editItems, setEditItems] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loadP, setLoadP] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [comsLocal, setComsLocal] = useState([]);
  const [nuevoCom, setNuevoCom] = useState('');
  const [tipoCom, setTipoCom] = useState('nota');
  const [chatFilter, setChatFilter] = useState('todo');
  const [editId, setEditId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showPago, setShowPago] = useState(false);
  const [showCatalogo, setShowCatalogo] = useState(false);

  useEffect(() => {
    // Bloquear el scroll del fondo mientras el modal está abierto
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  useEffect(() => {
    fetch(`/api/pagos?comanda_id=${cmd.id}`).then(r => r.json()).then(d => { if (d.ok) setPagos(d.pagos); setLoadP(false); });
    fetch(`/api/comentarios?comanda_id=${cmd.id}`).then(r => r.json()).then(d => { if (d.ok) setComsLocal(d.comentarios); });
    
    // Cargar productos lazy
    setLoadingItems(true);
    fetch(`/api/comandas/items?comanda_id=${cmd.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          let p = d.productos;
          while (typeof p === 'string') {
            try { p = JSON.parse(p); } catch { p = []; break; }
          }
          setEditItems(Array.isArray(p) ? p : []);
        }
        setLoadingItems(false);
      });
  }, [cmd.id]);

  const saldo = Math.max(0, (cmd.precio || 0) - (cmd.monto_pagado || 0));
  const prods = editItems; // Siempre usamos editItems que ahora cargamos al inicio
  const sigStatus = cmd.status === 'pendiente' ? 'empacado' : (cmd.status === 'empacado' ? 'enviado' : null);

  async function cambiarStatus(st) {
    if (!confirm(`¿Mover comanda a ${st.toUpperCase()}?`)) return;
    setSaving(true);
    const res = await fetch('/api/comandas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cmd.id, status: st }) }).then(r => r.json());
    if (res.ok) { onSave(); onClose(); } else { setErr(res.error); setSaving(false); }
  }

  async function eliminarComanda() {
    if (!confirm('¿ELIMINAR ESTA COMANDA PERMANENTEMENTE?')) return;
    setDeleting(true);
    const res = await fetch('/api/comandas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cmd.id }) }).then(r => r.json());
    if (res.ok) { onSave(); onClose(); } else { setErr(res.error); setDeleting(false); }
  }

  async function guardarEdicion() {
    setSaving(true);
    const total = editItems.reduce((a, b) => a + (b.precio * (b.cant || b.cantidad || 0)), 0);
    const res = await fetch('/api/comandas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cmd.id, productos: editItems, precio: total }) }).then(r => r.json());
    if (res.ok) { onSave(); setEditMode(false); setSaving(false); } else { setErr(res.error); setSaving(false); }
  }

  async function enviarComentario() {
    if (!nuevoCom.trim()) return;
    setSaving(true);
    const method = editId ? 'PUT' : 'POST';
    const body = { comanda_id: cmd.id, texto: nuevoCom, tipo: tipoCom, parent_id: replyTo, usuario: usuario?.nombre || usuario?.email || 'Sistema' };
    if (editId) body.id = editId;
    const res = await fetch('/api/comentarios', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
    if (res.ok) {
      setNuevoCom(''); setEditId(null); setReplyTo(null); setSaving(false);
      fetch(`/api/comentarios?comanda_id=${cmd.id}`).then(r => r.json()).then(d => { if (d.ok) setComsLocal(d.comentarios); });
    } else { setErr(res.error); setSaving(false); }
  }

  async function eliminarComentario(id) {
    if (!confirm('¿Eliminar comentario?')) return;
    const res = await fetch(`/api/comentarios?id=${id}`, { method: 'DELETE' }).then(r => r.json());
    if (res.ok) fetch(`/api/comentarios?comanda_id=${cmd.id}`).then(r => r.json()).then(d => { if (d.ok) setComsLocal(d.comentarios); });
  }

  async function toggleReaccionComentario(comId, emoji) {
    const uName = usuario?.nombre || usuario?.email || 'Sistema';
    await fetch('/api/comentarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: comId, toggleReaccion: emoji, usuarioReaccion: uName }) });
    fetch(`/api/comentarios?comanda_id=${cmd.id}`).then(r => r.json()).then(d => { if (d.ok) setComsLocal(d.comentarios); });
  }

  async function togglePinnedComentario(comId) {
    await fetch('/api/comentarios/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: comId }) });
    fetch(`/api/comentarios?comanda_id=${cmd.id}`).then(r => r.json()).then(d => { if (d.ok) setComsLocal(d.comentarios); });
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,animation:'fadeIn .2s ease'}}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .mg-header { padding: 10px 12px !important; }
          .mg-header h3 { font-size: 14px !important; }
          .mg-header span { font-size: 9px !important; padding: 2px 6px !important; }
          .mg-header button { width: 28px !important; height: 28px !important; font-size: 14px !important; }
          .mg-body { padding: 12px !important; gap: 12px !important; }
          .mg-body h4 { font-size: 13px !important; }
          .mg-prod-row { padding: 6px 10px !important; gap: 8px !important; }
          .mg-prod-row .prod-name { font-size: 11px !important; }
          .mg-btn { padding: 10px !important; font-size: 10px !important; border-radius: 8px !important; }
          .mg-footer { padding: 10px 12px !important; }
          .mg-footer button { padding: 8px 12px !important; font-size: 11px !important; border-radius: 8px !important; }
        }
      ` }} />
      <div className="modal-content" onClick={e=>e.stopPropagation()} style={{background:'var(--bg)',width:'100%',maxWidth:'600px',maxHeight:'92vh',borderRadius:'24px',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.1)'}}>
        
        <div className="mg-header" style={{padding:'20px 24px',background:'var(--surface)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <h3 style={{margin:0,fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700}}>Comanda #{cmd.id}</h3>
              <span style={{background:S[cmd.status]?.bg||'#eee',color:S[cmd.status]?.color||'#666',fontSize:'10px',padding:'2px 8px',borderRadius:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>{S[cmd.status]?.label||cmd.status}</span>
            </div>
            <div style={{fontSize:'12px',color:'#888',marginTop:'2px'}}>{cmd.cliente} · {new Date(cmd.created_at).toLocaleString()}</div>
          </div>
          <button onClick={onClose} style={{background:'var(--bg2)',border:'none',width:'36px',height:'36px',borderRadius:'50%',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        <div className="mg-body" style={{flex:1,overflowY:'auto',padding:'24px',display:'flex',flexDirection:'column',gap:'20px'}}>
          {err && <div style={{padding:'12px',background:'var(--red-soft)',color:'var(--red)',fontSize:'13px',borderRadius:'8px',border:'1px solid rgba(217,30,30,0.1)'}}>⚠️ {err}</div>}

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'15px'}}>
            <h4 style={{margin:0,fontFamily:'Playfair Display,serif',fontSize:'16px'}}>Resumen de Pedido</h4>
            {isAdmin && !editMode && <button className="mg-btn" onClick={()=>setEditMode(true)} style={{padding:'6px 12px',background:'none',border:'1px solid var(--border)',borderRadius:'12px',fontSize:'11px',cursor:'pointer',color:'#777'}}>✏️ Editar Items</button>}
            {isAdmin && editMode && <button className="mg-btn" onClick={()=>setShowCatalogo(!showCatalogo)} style={{padding:'6px 12px',background:'var(--blue)',color:'#fff',border:'none',borderRadius:'12px',fontSize:'11px',cursor:'pointer',fontWeight:700}}>{showCatalogo ? '✕ Cerrar Catálogo' : '➕ Añadir Prenda'}</button>}
          </div>

          {editMode && showCatalogo && (
            <div style={{height:'400px', border:'1px solid var(--border)', borderRadius:'12px', overflow:'hidden', marginBottom:'15px'}}>
               <CatalogoExplorer
                 productos={productos}
                 modo="salida"
                 compact
                 onAdd={(p, qty, tv) => {
                   setEditItems(prev => {
                     const next = [...prev];
                     const ex = next.find(x => x.sku === p.sku);
                     if(ex) {
                        ex.cant = (ex.cant || ex.cantidad || 0) + qty;
                        ex.cantidad = ex.cant;
                     } else {
                        next.push({ ...p, cant: qty, cantidad: qty, tipoVenta: tv, precio: p.precio });
                     }
                     return next;
                   });
                 }}
                 onClose={() => setShowCatalogo(false)}
               />
            </div>
          )}

          <div style={{background:'var(--surface)',borderRadius:'16px',border:'1px solid var(--border)',overflowY:'auto',maxHeight:'40vh'}}>
            {loadingItems ? (
              <div style={{padding:'30px',textAlign:'center',color:'#888',fontSize:'12px'}}>Cargando productos...</div>
            ) : prods.length === 0 ? (
              <div style={{padding:'30px',textAlign:'center',color:'#888',fontSize:'12px'}}>No hay productos en esta orden.</div>
            ) : prods.map((p,i)=>{
              const dot=colorHex(p.color);
              return(
                <div key={i} className="mg-prod-row" style={{padding:'12px 16px',borderBottom:i===prods.length-1?'none':'1px solid var(--border-soft)',display:'flex',alignItems:'center',gap:'15px'}}>
                   <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1}}>
                     <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,0.1)'}}/>
                     <div>
                       <div className="prod-name" style={{fontSize:'13px',fontWeight:600}}>{p.modelo||p.sku}</div>
                       <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>{p.sku}</div>
                     </div>
                   </div>
                   {editMode ? (
                     <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <input type="number" value={p.cant || p.cantidad} onChange={e=>{const next=[...editItems]; next[i].cant=parseInt(e.target.value); setEditItems(next);}} style={{width:'50px',textAlign:'center',padding:'4px',border:'1px solid var(--border)',borderRadius:'4px'}}/>
                        <button onClick={()=>{const n=[...editItems]; n.splice(i,1); setEditItems(n);}} style={{background:'none', border:'none', cursor:'pointer', fontSize:'14px', color:'var(--red)', padding:'4px'}} title="Eliminar item">🗑️</button>
                     </div>
                   ):(
                     <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,background:'var(--bg2)',padding:'4px 10px',borderRadius:'6px'}}>{p.cant || p.cantidad} ud{(p.cant || p.cantidad)!==1?'s':''}</div>
                   )}
                   <div style={{textAlign:'right',minWidth:'80px'}}>
                     <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700}}>€ {fmtNum((p.precio || 0) * (p.cant || p.cantidad || 0))}</div>
                   </div>
                </div>
              );
            })}
          </div>

          {!editMode && (
            <>
              <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
                {sigStatus && (
                  <button className="mg-btn" onClick={()=>cambiarStatus(sigStatus)} disabled={saving} style={{flex:2,padding:'14px',background:S[sigStatus].border,color:'#fff',border:'none',borderRadius:'12px',cursor:'pointer',fontSize:'14px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',opacity:saving?.6:1}}>
                    {S[sigStatus].icon} Avanzar a {S[sigStatus].label}
                  </button>
                )}
                <button className="mg-btn" onClick={()=>cambiarStatus('cancelado')} disabled={saving} style={{flex:1,padding:'14px',background:'var(--bg2)',color:'var(--red)',border:'1px solid var(--red)',borderRadius:'12px',cursor:'pointer',fontSize:'12px',fontWeight:600}}>❌ Cancelar</button>
              </div>

              {saldo > 0.01 && (
                <div>
                   {!showPago ? (
                     <button className="mg-btn" onClick={()=>setShowPago(true)} style={{width:'100%',padding:'14px',background:'var(--green)',color:'#fff',border:'none',borderRadius:'12px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>💰 Registrar Pago (€ {fmtNum(saldo)} pendiente)</button>
                   ):(
                     <div style={{position:'relative'}}>
                        <button onClick={()=>setShowPago(false)} style={{position:'absolute',right:'12px',top:'12px',zIndex:10,background:'none',border:'none',cursor:'pointer',fontSize:'14px',opacity:.5}}>✕</button>
                        <WidgetPago comandaId={cmd.id} saldo={saldo} onPagoRegistrado={()=>{ onSave(); setShowPago(false); }} />
                     </div>
                   )}
                </div>
              )}

              {pagos.length > 0 && (
                <div>
                  <div style={lbl}>Historial de Pagos</div>
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden'}}>
                     {pagos.map((p,i)=>{
                       const mcfg=METODOS.find(m=>m.id===p.metodo);
                       return(
                         <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',borderBottom:'1px solid var(--border-soft)'}}>
                            <span style={{fontSize:'18px'}}>{mcfg?.icon||'💰'}</span>
                            <div style={{flex:1}}>
                               <div style={{fontSize:'12px',fontWeight:600}}>{mcfg?.label||p.metodo}</div>
                               <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>{fmtSmartDate(p.created_at)} · {p.referencia||'Sin ref'}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                               <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'var(--green)'}}>{p.divisa} {fmtNum(p.monto_divisa)}</div>
                               {p.divisa!=='EUR' && <div style={{fontSize:'8px',color:'#888'}}>≈ € {fmtNum(p.monto)}</div>}
                            </div>
                         </div>
                       )
                     })}
                  </div>
                </div>
              )}

              <div style={{borderTop:'2px solid var(--border)',paddingTop:'20px'}}>
                <div onClick={()=>setShowChat(!showChat)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',paddingBottom:'12px'}}>
                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                    <span style={lbl}>👥 Notas del Equipo</span>
                    {comsLocal.length > 0 && <span style={{background:'var(--ink)',color:'#fff',fontSize:'9px',padding:'1px 6px',borderRadius:'10px'}}>{comsLocal.length}</span>}
                  </div>
                  <span style={{fontSize:'10px'}}>{showChat?'▲ Cerrar':'▼ Abrir'}</span>
                </div>

                {showChat && (
                  <div style={{display:'flex',flexDirection:'column',gap:'15px'}}>
                     <div style={{display:'flex',gap:'8px'}}>
                        <textarea value={nuevoCom} onChange={e=>setNuevoCom(e.target.value)} placeholder="Agrega un comentario..." style={{...inp,flex:1,borderRadius:'12px',minHeight:'60px'}}/>
                        <button className="mg-btn" onClick={enviarComentario} disabled={saving||!nuevoCom.trim()} style={{width:'50px',background:'var(--ink)',color:'#fff',border:'none',borderRadius:'12px',cursor:'pointer',fontSize:'20px'}}>➤</button>
                     </div>
                     <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                       {comsLocal.map((c,i)=>(
                         <div key={i} style={{display:'flex',gap:'10px',background:'#fff',padding:'10px',borderRadius:'12px',border:'1px solid var(--border)'}}>
                            <div style={{flex:1}}>
                               <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                                  <span style={{fontWeight:700,fontSize:'11px'}}>{c.usuario}</span>
                                  <span style={{fontSize:'8px',color:'#999'}}>{fmtSmartDate(c.created_at)}</span>
                               </div>
                               <div style={{fontSize:'12px',lineHeight:1.4}}>{c.texto}</div>
                               <div style={{marginTop:'4px',display:'flex',gap:'8px'}}>
                                  {c.usuario===(usuario?.nombre||usuario?.email) && <button onClick={()=>eliminarComentario(c.id)} style={{background:'none',border:'none',fontSize:'9px',color:'var(--red)',cursor:'pointer'}}>Eliminar</button>}
                               </div>
                            </div>
                         </div>
                       ))}
                     </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mg-footer" style={{padding:'16px 24px',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}>
          {isAdmin && !editMode && <button className="mg-btn" onClick={eliminarComanda} disabled={deleting} style={{background:'none',border:'1px solid var(--red)',color:'var(--red)',padding:'8px 15px',borderRadius:'8px',fontSize:'11px',fontWeight:700,cursor:'pointer'}}>{deleting?'⏳':'🗑 ELIMINAR'}</button>}
          <div style={{display:'flex',gap:'10px',marginLeft:'auto'}}>
            {editMode ? (
              <>
                <button className="mg-btn" onClick={()=>{setEditMode(false);setShowCatalogo(false);}} style={{background:'none',border:'1px solid var(--border)',padding:'10px 16px',borderRadius:'12px',fontSize:'13px',cursor:'pointer'}}>Cancelar</button>
                <button className="mg-btn" onClick={guardarEdicion} disabled={saving} style={{background:'var(--warn)',color:'#000',border:'none',padding:'10px 20px',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>💾 Guardar Cambios</button>
              </>
            ):(
              <button className="mg-btn" onClick={onClose} style={{background:'var(--ink)',color:'#fff',border:'none',padding:'10px 24px',borderRadius:'12px',fontSize:'14px',fontWeight:700,cursor:'pointer'}}>Cerrar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
