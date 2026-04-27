import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { fetchApi } from '@/utils/fetchApi';
import { supabasePublic } from '@/lib/supabase-client';

/* ─── Constantes & Helpers ───────────────────────────────────────── */
const S = {
  pendiente: {bg:'#fff8e1',color:'#f59e0b',border:'#f59e0b',label:'Pendiente',  icon:'🕐'},
  empacado:  {bg:'#eff6ff',color:'#3b82f6',border:'#3b82f6',label:'Empacado',   icon:'📦'},
  enviado:   {bg:'#f0fdf4',color:'#22c55e',border:'#22c55e',label:'Enviado',    icon:'🚀'},
  cancelado: {bg:'#fff1f2',color:'#ef4444',border:'#ef4444',label:'Cancelado',  icon:'❌'},
};

function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function parseProd(cmd){let p=cmd.productos;if(typeof p==='string')try{p=JSON.parse(p);}catch{p=[];}return Array.isArray(p)?p:[];}

const fmtSmartDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${d.getDate()}/${d.getMonth() + 1} ${time}`;
};

/* ═══════════════════════════════════════════════════════════════════
   COMPONENTE: TARJETA DE COMANDA (Kanban/Lista)
   (Extraído de app/comandas/page.js)
═══════════════════════════════════════════════════════════════════ */
const ComandaCard = memo(({ 
  cmd, status, usuario, usuariosDB, savingGlobal, buscar, expandedItems, partialMode, 
  partialItems, toggleItems, setPartialMode, setPartialItems, confirmarEntregaParcial, 
  marcarEmpacadoRapido, cambiarStatusRapido, setModal, setTicketModal, 
  marcarTodoEmpacado, eliminarComanda, onCommentChange
}) => {
  const [localComs, setLocalComs] = useState([]);
  const [loadingComs, setLoadingComs] = useState(false);
  const [localProds, setLocalProds] = useState([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editIdCom, setEditIdCom] = useState(null);
  const [editTextCom, setEditTextCom] = useState('');
  
  const [tipo, setTipo] = useState('nota');
  const cfg = S[status] || S.pendiente;
  const saldo = Math.max(0, (cmd.precio || 0) - (cmd.monto_pagado || 0));
  const isSaving = savingGlobal === cmd.id;
  
  const totalItems = cmd.items_count || 0;
  const isExpanded = !!buscar || expandedItems[cmd.id];
  const isPartial = partialMode === cmd.id;

  const hoyStr = new Date().toISOString().slice(0, 10);
  const vencida = cmd.fecha_entrega && cmd.fecha_entrega < hoyStr && status !== 'enviado' && status !== 'cancelado';
  const chatBodyRef = useRef(null);

  // --- CARGA LAZY DE COMENTARIOS ---
  const cargarLocal = useCallback(async () => {
    if (!isExpanded) return;
    setLoadingComs(true);
    try {
      const res = await fetchApi(`/api/comentarios?comanda_id=${cmd.id}`).then(r => r.json());
      if (res.ok) setLocalComs(res.comentarios || []);
    } catch (e) { console.warn('[CardChat] Error:', e.message); }
    setLoadingComs(false);
  }, [isExpanded, cmd.id]);

  // --- CARGA LAZY DE PRODUCTOS ---
  const cargarProds = useCallback(async () => {
    if (!isExpanded) return;
    setLoadingProds(true);
    try {
      const res = await fetchApi(`/api/comandas/items?comanda_id=${cmd.id}`).then(r => r.json());
      if (res.ok) setLocalProds(Array.isArray(res.productos) ? res.productos : []);
    } catch (e) { console.warn('[CardProds] Error:', e.message); }
    setLoadingProds(false);
  }, [isExpanded, cmd.id]);

  useEffect(() => {
    if (isExpanded) {
      if (localComs.length === 0) cargarLocal();
      if (localProds.length === 0) cargarProds();
    }
  }, [isExpanded, cargarLocal, cargarProds, localComs.length, localProds.length]);

  // --- REALTIME FILTRADO ---
  useEffect(() => {
    if (!isExpanded) return;
    // Escuchar cambios en comentarios
    const channelChat = supabasePublic.channel(`chat-${cmd.id}`)
      .on('postgres_changes', { 
         event: '*', schema: 'public', table: 'comanda_comentarios', 
         filter: `comanda_id=eq.${cmd.id}` 
      }, () => cargarLocal())
      .subscribe();

    // Escuchar cambios en la comanda real (para refrescar productos e historial si alguien los cambia)
    const channelCmd = supabasePublic.channel(`cmd-${cmd.id}`)
      .on('postgres_changes', { 
         event: 'UPDATE', schema: 'public', table: 'comandas', 
         filter: `id=eq.${cmd.id}` 
      }, () => {
        cargarProds();
        cargarLocal(); // <-- IMPORTANTE: Refrescar también el Team Sync
      })
      .subscribe();

    return () => { 
      supabasePublic.removeChannel(channelChat); 
      supabasePublic.removeChannel(channelCmd); 
    };
  }, [isExpanded, cmd.id, cargarLocal, cargarProds]);

  // --- CRUD CHAT LOCAL ---
  async function enviarMensajePro(comanda_id, texto, tipo_msg = 'nota', p_id = null) {
    if (!texto.trim()) return;
    try {
      const payload = { comanda_id, texto: texto.trim(), usuario: usuario ? (usuario.nombre || usuario.email) : 'Usuario', tipo: tipo_msg, parent_id: p_id };
      const res = await fetchApi('/api/comentarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());
      if (res.ok) { setLocalComs(prev => [...prev, res.comentario]); setReplyTo(null); }
    } catch (e) {}
  }

  async function eliminarComentario(id) {
    if (!window.confirm('¿Eliminar mensaje?')) return;
    try {
      const res = await fetchApi(`/api/comentarios?id=${id}`, { method: 'DELETE' }).then(r=>r.json());
      if (res.ok) setLocalComs(p => p.filter(c => c.id !== id));
    } catch {}
  }

  async function guardarEdicionComentario(id, nt) {
    try {
      const res = await fetchApi('/api/comentarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, texto: nt }) }).then(r => r.json());
      if (res.ok) { setLocalComs(p => p.map(c => c.id === id ? res.comentario : c)); setEditIdCom(null); }
    } catch {}
  }

  async function toggleReaccionComentario(id, emoji) {
    if (!usuario) return;
    const uNombre = usuario.nombre || usuario.email;
    setLocalComs(prev => prev.map(c => {
      if (c.id !== id) return c;
      const r = { ...(c.reacciones || {}) };
      const list = [...(r[emoji] || [])];
      const idx = list.indexOf(uNombre);
      if (idx > -1) list.splice(idx, 1); else list.push(uNombre);
      r[emoji] = list;
      return { ...c, reacciones: r };
    }));
    try {
      await fetchApi('/api/comentarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, toggleReaccion: emoji, usuarioReaccion: uNombre }) });
    } catch (e) {}
  }

  async function togglePinnedComentario(id) {
    const target = localComs.find(c => c.id === id);
    if (!target) return;
    const isPinning = !target.pinned;
    setLocalComs(prev => prev.map(c => {
      if (c.id === id) return { ...c, pinned: isPinning };
      if (isPinning && c.pinned) return { ...c, pinned: false };
      return c;
    }));
    try {
      await fetchApi('/api/comentarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, togglePinned: isPinning }) });
    } catch (e) {}
  }

  const [chatFilter, setChatFilter] = useState('todo'); 
  const filteredComs = localComs.filter(c => chatFilter === 'todo' || c.tipo === chatFilter);

  // --- AUTO-SCROLL AL FONDO ---
  useEffect(() => {
    if (isExpanded && chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [filteredComs.length, chatFilter, isExpanded]);



  return (
    <div key={cmd.id} style={{
      background: isExpanded ? 'var(--bg)' : 'var(--surface)',
      border: `1px solid ${vencida?'var(--red)': isExpanded ? 'var(--border-strong)' : 'var(--border)'}`,
      marginBottom: isExpanded ? '16px' : '8px',
      borderRadius: '12px',
      transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: isExpanded ? '0 10px 25px rgba(0,0,0,.08)' : '0 2px 5px rgba(0,0,0,.02)',
      opacity: isSaving ? .6 : 1,
      pointerEvents: isSaving ? 'none' : 'auto',
      overflow: 'hidden'
    }} className="premium-row kanban-card">
      <style>{`
          .delete-btn-card:hover { background: var(--red) !important; color: #fff !important; transform: translateY(-50%) scale(1.1) !important; }
          .kanban-card:hover .delete-btn-card { right: 8px !important; }
      `}</style>
      <div className="premium-row-header"
           onClick={(e)=>{ if(e.target.tagName !== 'BUTTON' && !e.target.closest('button')) toggleItems(cmd.id); }}
           style={{display:'flex', alignItems:'center', padding:'12px 18px', cursor:'pointer', gap:'16px', flexWrap:'wrap', position:'relative'}}>
        
        <div className="col-id" style={{flex:'0 0 100px', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#777', fontWeight:600}}>
          #{cmd.id}
        </div>
        
        <div className="col-client" style={{flex:'1 1 200px', display:'flex', alignItems:'center', gap:'12px'}}>
          <div style={{width:'32px', height:'32px', borderRadius:'50%', background:vencida?'var(--red-soft)':cfg.bg, color:vencida?'var(--red)':cfg.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, border:`1px solid ${vencida?'var(--red)':cfg.border}`}}>
            {cmd.cliente.slice(0,1).toUpperCase()}
          </div>
          <div>
            <div style={{fontFamily:'Playfair Display,serif', fontSize:'15px', fontWeight:700, color:'var(--ink)', lineHeight:1.2, display:'flex', alignItems:'center', gap:'6px'}}>
              {cmd.cliente}
              {localComs.some(c => c.comanda_id === cmd.id && c.texto?.includes('📌 BAJO PEDIDO')) && (
                <span style={{background:'var(--red)', color:'#fff', fontSize:'8px', fontWeight:900, padding:'2px 5px', borderRadius:'4px', letterSpacing:'.05em'}}>BAJO PEDIDO</span>
              )}
            </div>
            {cmd.fecha_entrega && <div style={{fontFamily:'DM Mono,monospace', fontSize:'9px', color:vencida?'var(--red)':'#999', marginTop:'2px'}}>{vencida?'⚠️ Límite:':'📅'} {cmd.fecha_entrega}</div>}
          </div>
        </div>

        <div className="col-status" style={{flex:'0 0 120px'}}>
          <span style={{background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, padding:'4px 10px', borderRadius:'20px', fontFamily:'Poppins,sans-serif', fontSize:'10px', fontWeight:600, display:'inline-block'}}>
            {cfg.label}
          </span>
        </div>

        <div className="col-items" style={{flex:'0 0 80px', fontFamily:'DM Mono,monospace', fontSize:'12px', fontWeight:700, color:'#555', textAlign:'center'}}>
          x{totalItems}
        </div>

        <div className="col-total" style={{flex:'0 0 110px'}}>
          <div style={{fontFamily:'Playfair Display,serif', fontSize:'14px', fontWeight:700, color:'var(--ink)'}}>€ {fmtNum(cmd.precio)}</div>
          {saldo > 0.01 && <div style={{fontFamily:'DM Mono,monospace', fontSize:'9px', color:'var(--red)'}}>⏳ -€{fmtNum(saldo)}</div>}
          {saldo <= 0.01 && cmd.precio > 0 && <div style={{fontFamily:'DM Mono,monospace', fontSize:'8px', color:'var(--green)', fontWeight:700}}>✓ PAGADA</div>}
        </div>

        <div className="col-sync" style={{flex:'0 0 60px', display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'12px'}}>
          {(isExpanded ? localComs.length : (cmd.comentarios_count || 0)) > 0 && (
            <span style={{fontSize:'12px', opacity:.6, display:'flex', alignItems:'center', gap:'4px'}}>
              <span style={{fontSize:'10px'}}>💬</span>
              {isExpanded ? localComs.length : (cmd.comentarios_count || 0)}
            </span>
          )}
          <button style={{background:'none', border:'none', fontSize:'16px', color:'#aaa', transition:'transform .2s', transform: isExpanded?'rotate(180deg)':'rotate(0deg)'}}>⌄</button>
        </div>

        {isExpanded && !isSaving && (
          <button 
            onClick={(e) => { e.stopPropagation(); eliminarComanda(cmd.id); }}
            style={{position:'absolute', right:'-30px', top:'50%', transform:'translateY(-50%)', background:'var(--red-soft)', color:'var(--red)', border:'1px solid var(--red)', width:'28px', height:'28px', borderRadius:'50%', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', zIndex:10}}
            title="Eliminar Comanda"
            className="delete-btn-card"
          >
            🗑️
          </button>
        )}
      </div>

      {isExpanded && (
        <div style={{borderTop:'1px solid var(--border-soft)', padding:'18px', background:'rgba(0,0,0,.015)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px'}} className="premium-expanded-grid">
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
              <h4 style={{margin:0, fontFamily:'Playfair Display,serif', fontSize:'14px', color:'var(--ink)', display:'flex', alignItems:'center', gap:'8px'}}>
                📋 Detalles de la Orden
              </h4>
              <div style={{display:'flex', gap:'8px'}}>
                {status === 'pendiente' && !isPartial && (
                  <>
                    <button 
                      onClick={(e)=>{e.stopPropagation(); setPartialMode(cmd.id); setPartialItems({});}} 
                      style={{background:'var(--bg)', border:'1px solid var(--border)', padding:'4px 12px', borderRadius:'20px', fontSize:'9px', cursor:'pointer', fontWeight:700, color:'var(--blue)'}}>
                      📦 ENTREGA PARCIAL
                    </button>
                    <button 
                      onClick={(e)=>{e.stopPropagation(); marcarTodoEmpacado && marcarTodoEmpacado(cmd.id);}} 
                      disabled={isSaving}
                      style={{background:'var(--ink)', color:'#fff', border:'none', padding:'4px 14px', borderRadius:'20px', fontSize:'9px', cursor:'pointer', fontWeight:700, letterSpacing:'.03em', boxShadow:'0 2px 5px rgba(0,0,0,.1)', display:'flex', alignItems:'center', gap:'4px'}}>
                      {isSaving ? '⏳...' : '✨ EMPACAR TODO'}
                    </button>
                  </>
                )}
                <button onClick={(e)=>{e.stopPropagation();setModal(cmd);}} style={{background:'none', border:'1px solid var(--border)', padding:'4px 10px', borderRadius:'4px', fontSize:'9px', cursor:'pointer', fontWeight:600, fontFamily:'Poppins,sans-serif'}}>✏️ EDITAR</button>
              </div>
            </div>

            {isPartial && (
              <div style={{marginBottom:'14px', padding:'12px', background:'rgba(59,130,246,.05)', border:'1px dashed var(--blue)', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                 <div style={{fontFamily:'DM Mono,monospace', fontSize:'10px', color:'var(--blue)', fontWeight:700}}>📋 MODO: SELECCIÓN DE SALIDA PARCIAL</div>
                 <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={()=>setPartialMode(null)} style={{background:'none', border:'none', fontSize:'10px', cursor:'pointer', color:'#888'}}>Cancelar</button>
                    <button onClick={confirmarEntregaParcial} style={{background:'var(--blue)', color:'#fff', border:'none', padding:'4px 12px', borderRadius:'4px', fontSize:'10px', fontWeight:700, cursor:'pointer'}}>Confirmar Salida</button>
                 </div>
              </div>
            )}

            <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px', marginBottom:'16px', background:'var(--surface)', padding:'10px', borderRadius:'8px', border:'1px solid var(--border)'}}>
              <div><div style={{fontSize:'8px', color:'#999', textTransform:'uppercase'}}>Solicitud</div><div style={{fontFamily:'DM Mono,monospace', fontSize:'10px', fontWeight:700}}>{new Date(cmd.created_at).toLocaleDateString()}</div></div>
              <div><div style={{fontSize:'8px', color:'#999', textTransform:'uppercase'}}>Empaque</div><div style={{fontFamily:'DM Mono,monospace', fontSize:'10px', color:cmd.fecha_empaque?'var(--warn)':'#ccc', fontWeight:700}}>{cmd.fecha_empaque ? new Date(cmd.fecha_empaque).toLocaleDateString() : '—'}</div></div>
              <div><div style={{fontSize:'8px', color:'#999', textTransform:'uppercase'}}>Envío</div><div style={{fontFamily:'DM Mono,monospace', fontSize:'10px', color:cmd.fecha_envio?'var(--green)':'#ccc', fontWeight:700}}>{cmd.fecha_envio ? new Date(cmd.fecha_envio).toLocaleDateString() : '—'}</div></div>
            </div>

            <div style={{marginBottom:'16px'}}>
              <div style={{display:'flex', padding:'4px 12px', fontSize:'9px', color:'#999', fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--border)', marginBottom:'8px'}}>
                 <div style={{flex:1}}>Producto</div>
                 <div style={{width:'40px', textAlign:'center'}}>🛒</div>
                 <div style={{width:'70px', textAlign:'center'}}>📦</div>
                 <div style={{width:'50px', textAlign:'right'}}>🚀</div>
              </div>
              {loadingProds ? (
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'10px', color:'#888', textAlign:'center', padding:'20px'}}>Cargando productos...</div>
                  </div>
                ) : !Array.isArray(localProds) || localProds.length === 0 ? (
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'10px', color:'#888', textAlign:'center', padding:'20px'}}>No hay productos en esta orden.</div>
                  </div>
                ) : (
                  localProds.map((p, i) => {
                const sku = (p.sku || '').toUpperCase();
                const total = parseInt(p.cant || p.cantidad || 1);
                const empacados = parseInt(p.cant_empacada || p.despachado || 0);
                const despachados = parseInt(p.despachado || 0);
                
                const stylePack = empacados >= total ? {color:'var(--blue)', fontWeight:800} : (empacados > 0 ? {color:'var(--warn)', fontWeight:700} : {color:'#ccc'});
                const styleShip = despachados >= total ? {color:'var(--green)', fontWeight:800} : (despachados > 0 ? {color:'var(--warn)', fontWeight:700} : {color:'#ccc'});

                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', padding:'8px 12px', background: despachados >= total ? 'var(--green-soft)' : 'var(--surface)', borderBottom: '1px solid var(--border-soft)', opacity: despachados >= total ? 0.7 : 1 }}>
                     <div style={{flex:1, minWidth:0}}>
                       <div style={{fontFamily:'Poppins,sans-serif', fontSize:'12px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={p.modelo || p.sku}>{p.modelo || p.sku || '—'}</div>
                       <div style={{fontSize:'10px', color:'#888'}}>
                          {p.talla && <span>Talla: {p.talla}</span>}
                          {p.color && <span>{p.talla ? ' · ' : ''}Color: {p.color}</span>}
                       </div>
                     </div>

                     <div style={{width:'40px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'12px', fontWeight:700}}>
                        {total}
                     </div>

                     <div style={{width:'70px', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px'}}>
                        {status === 'pendiente' || status === 'empacado' ? (
                           <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                             <input 
                               type="checkbox" 
                               checked={empacados >= total} 
                               onChange={(e) => {
                                 e.stopPropagation(); 
                                 const isChecked = e.target.checked;
                                 const delta = isChecked ? (total - empacados) : -empacados;
                                 
                                 if(delta !== 0) {
                                   // --- ACTUALIZACIÓN INSTANTÁNEA (Optimistic UI) ---
                                   setLocalProds(prev => prev.map(item => {
                                      if ((item.sku||'').toUpperCase() === sku) {
                                        const current = parseInt(item.cant_empacada || item.despachado || 0);
                                        return { ...item, cant_empacada: Math.min(total, current + delta) };
                                      }
                                      return item;
                                   }));
                                   
                                   // Llamada al servidor en segundo plano
                                   marcarEmpacadoRapido(cmd.id, sku, delta, p.modelo, p.color);
                                 }
                               }} 
                               style={{width:'18px', height:'18px', cursor:'pointer', accentColor:'var(--blue)'}} 
                             />
                             <button onClick={(e) => {
                               e.stopPropagation();
                               const val = window.prompt(`Cantidad empacada de ${sku} (Máximo ${total}):`, empacados);
                               if(val !== null && !isNaN(val)) {
                                  const parsed = parseInt(val);
                                  if(parsed >= 0 && parsed <= total) {
                                    marcarEmpacadoRapido(cmd.id, sku, parsed - empacados, p.modelo, p.color);
                                  }
                               }
                             }} style={{background:'none', border:'none', fontSize:'12px', color:'#ccc', cursor:'pointer', padding:0}} title="Empaque Parcial">
                               {empacados > 0 && empacados < total ? <span style={{color:'var(--warn)', fontWeight:700, fontSize:'10px'}}>{empacados}</span> : '✏️'}
                             </button>
                           </div>
                        ) : (
                          <span style={{fontSize:'11px', ...stylePack}}>{empacados}/{total}</span>
                        )}
                     </div>

                     <div style={{width:'50px', textAlign:'right'}}>
                        {isPartial && despachados < total ? (
                           <div style={{display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'2px'}}>
                              <button onClick={()=>setPartialItems(prev=>({ ...prev, [sku]: Math.max(0, (prev[sku]||0)-1) }))} style={{width:'16px', height:'16px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:'2px', fontSize:'10px', cursor:'pointer'}}>–</button>
                              <span style={{fontSize:'10px', fontWeight:900, color:'var(--blue)', minWidth:'12px', textAlign:'center'}}>{partialItems[sku] || 0}</span>
                              <button onClick={()=>setPartialItems(prev=>({ ...prev, [sku]: Math.min(total-despachados, (prev[sku]||0)+1) }))} style={{width:'16px', height:'16px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:'2px', fontSize:'10px', cursor:'pointer'}}>+</button>
                           </div>
                        ) : (
                          <span style={{fontSize:'11px', fontFamily:'DM Mono,monospace', ...styleShip}}>
                             {despachados >= total ? '✓' : `${despachados}/${total}`}
                          </span>
                        )}
                     </div>
                  </div>
                );
              })
            )}
          </div>
            
            <div style={{display:'flex', gap:'8px', marginTop:'20px'}}>
              {cmd.status === 'pendiente' && (
                <button onClick={(e)=>{e.stopPropagation(); cambiarStatusRapido(cmd.id, 'empacado');}} style={{flex:1, padding:'10px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', textTransform:'uppercase'}}>📦 Enviar a Empaque</button>
              )}
              {cmd.status === 'empacado' && (
                <button onClick={(e)=>{e.stopPropagation(); cambiarStatusRapido(cmd.id, 'enviado');}} style={{flex:1, padding:'10px', background:'var(--green)', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', textTransform:'uppercase'}}>🚀 Despachar</button>
              )}
              {cmd.status === 'enviado' && (
                <button onClick={(e)=>{e.stopPropagation(); cambiarStatusRapido(cmd.id, 'empacado');}} style={{padding:'10px', background:'var(--bg2)', color:'#777', border:'1px solid var(--border)', borderRadius:'6px', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}>↩ Deshacer envío</button>
              )}
              {(cmd.status === 'empacado' || cmd.status === 'enviado') && (
                 <button onClick={e=>{e.stopPropagation();setTicketModal({cmd});}} style={{padding:'10px 16px', background:'var(--surface)', border:'1px solid var(--border)', cursor:'pointer', borderRadius:'6px', fontSize:'14px'}} title="🖨️ Guía de envío">🖨️</button>
              )}
            </div>
          </div>

          <div style={{background:'var(--surface)', borderRadius:'12px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'420px', shadow:'inset 0 2px 10px rgba(0,0,0,0.02)'}}>
            <div style={{padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', zIndex:5}}>
              <div style={{fontFamily:'DM Mono,monospace', fontSize:'10px', fontWeight:700, color:'#777', textTransform:'uppercase', letterSpacing:'.1em'}}>💬 Team Sync</div>
              <div style={{display:'flex', gap:'4px', background:'var(--bg3)', padding:'2px', borderRadius:'15px'}}>
                {[ ['todo','Todo'], ['nota','Chat'], ['log','Historial'] ].map(([f, l]) => (
                  <button key={f} onClick={()=>setChatFilter(f)} style={{padding:'3px 10px', border:'none', borderRadius:'12px', cursor:'pointer', fontSize:'9px', fontWeight:700, background: chatFilter===f?'var(--ink)':'none', color: chatFilter===f?'#fff':'#888', transition:'all .2s'}}>{l}</button>
                ))}
              </div>
            </div>

            {filteredComs.filter(c => c.pinned).length > 0 && (
              <div style={{background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'8px 12px', display:'flex', flexDirection:'column', gap:'4px'}}>
                <div style={{fontSize:'8px', fontWeight:900, color:'var(--warn)', letterSpacing:'.1em', display:'flex', alignItems:'center', gap:'4px', marginBottom:'4px'}}>
                  📌 MENSAJE DESTACADO
                </div>
                {filteredComs.filter(c => c.pinned).map(p => (
                   <div key={p.id} style={{fontSize:'10px', background:'#fff', padding:'6px 10px', borderRadius:'6px', border:'1px solid var(--border-soft)', position:'relative', cursor:'help'}} title="Mensaje importante fijado">
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                        <div style={{flex:1, color:'#333', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'220px'}}>{p.texto}</div>
                        <button onClick={(e)=>{e.stopPropagation(); togglePinnedComentario(p.id);}} style={{background:'none', border:'none', padding:0, cursor:'pointer', fontSize:'10px'}}>⭐</button>
                      </div>
                      <div style={{fontSize:'8px', color:'#999', marginTop:'2px'}}>{p.usuario} · {new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                   </div>
                ))}
              </div>
            )}
            
            <div ref={chatBodyRef} style={{flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px'}}>
              {loadingComs ? (
                <div style={{textAlign:'center', padding:'40px', fontSize:'10px', color:'#999'}}>Cargando mensajes...</div>
              ) : (Array.isArray(filteredComs) ? filteredComs : []).map((c, i) => {
                const uSearch = (c.usuario || '').toLowerCase();
                const userObj = (usuariosDB || []).find(u => 
                  u.nombre?.toLowerCase() === uSearch || 
                  u.email?.toLowerCase() === uSearch
                );
                const canModify = (usuario?.nombre === c.usuario || usuario?.email === c.usuario) && (Date.now() - new Date(c.created_at).getTime() < 10*60*1000);
                const isEditing = editIdCom === c.id;
                const parent = c.parent_id ? localComs.find(pc => pc.id === c.parent_id) : null;

                if (c.tipo === 'log') {
                  return (
                    <div key={i} style={{padding:'6px 10px', background:'var(--bg2)', borderRadius:'6px', borderLeft:'3px solid #6366f1', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#555', opacity:0.8}}>
                      {c.texto} <span style={{fontSize:'8px', color:'#aaa', marginLeft:'6px'}}>— {fmtSmartDate(c.created_at)}</span>
                    </div>
                  );
                }

                return (
                  <div key={i} id={`msg-${c.id}`} style={{ display:'flex', gap:'10px', alignItems:'flex-start', position:'relative' }}>
                    <div style={{width:'30px', height:'30px', borderRadius:'50%', background:'var(--bg3)', overflow:'hidden', border:'1px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700}}>
                       {userObj?.avatar ? (
                         <img 
                           src={userObj.avatar.startsWith('http') ? userObj.avatar : `https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/avatars/${userObj.avatar}.png`} 
                           alt={c.usuario} 
                           style={{width:'100%', height:'100%', objectFit:'cover'}} 
                           onError={(e)=>{
                             e.target.src=`https://ui-avatars.com/api/?name=${encodeURIComponent(c.usuario)}&background=random&color=fff`;
                           }} 
                         />
                       ) : (
                         <img 
                           src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.usuario)}&background=random&color=fff`} 
                           alt={c.usuario} 
                           style={{width:'100%', height:'100%', objectFit:'cover'}} 
                         />
                       )}
                    </div>
                    
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px'}}>
                        <span style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700}}>{c.usuario}</span>
                        <span style={{fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#999'}}>{fmtSmartDate(c.created_at)}</span>
                      </div>

                      {parent && (
                        <div 
                          style={{
                            background: 'rgba(0,0,0,.04)', 
                            borderLeft: '3px solid var(--blue)', 
                            padding: '6px 10px', 
                            fontSize: '10px', 
                            color: '#666', 
                            marginBottom: '6px', 
                            borderRadius: '4px', 
                            display: 'flex',
                            alignItems:'center',
                            gap:'6px'
                          }}
                        >
                          <span style={{opacity:0.5}}>↳</span>
                          <strong style={{fontSize:'9px'}}>{parent.usuario}:</strong>
                          <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {parent.texto}
                          </span>
                        </div>
                      )}

                      {isEditing ? (
                        <div style={{display:'flex', gap:'5px', marginTop:'4px'}}>
                          <input autoFocus value={editTextCom} onChange={e=>setEditTextCom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') guardarEdicionComentario(c.id, editTextCom); if(e.key==='Escape') setEditIdCom(null);}} style={{flex:1, padding:'4px 8px', fontSize:'11px', border:'1px solid var(--ink)', borderRadius:'4px', outline:'none'}} />
                          <button onClick={()=>guardarEdicionComentario(c.id, editTextCom)} style={{padding:'4px 8px', background:'var(--ink)', color:'#fff', border:'none', borderRadius:'4px', fontSize:'10px', cursor:'pointer'}}>✓</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ background: c.tipo === 'alerta' ? 'var(--red-soft)' : 'var(--bg2)', padding:'8px 12px', borderRadius:'0 10px 10px 10px', fontSize:'12px', color: c.tipo === 'alerta' ? 'var(--red)' : '#333', lineHeight:1.4, border: c.tipo === 'alerta' ? '1px solid rgba(217,30,30,.2)' : 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                             {c.texto}
                          </div>

                          <div style={{display:'flex', gap:'12px', marginTop:'4px', alignItems:'center'}}>
                            <button onClick={()=>setReplyTo(c.id)} style={{background:'none', border:'none', fontSize:'9px', fontWeight:700, color:'#888', cursor:'pointer', padding:0}}>Responder</button>
                            {canModify && (
                              <>
                                <button onClick={()=>{setEditIdCom(c.id); setEditTextCom(c.texto);}} style={{background:'none', border:'none', fontSize:'9px', fontWeight:700, color:'var(--blue)', cursor:'pointer', padding:0}}>Editar</button>
                                <button onClick={()=>eliminarComentario(c.id)} style={{background:'none', border:'none', fontSize:'9px', fontWeight:700, color:'var(--red)', cursor:'pointer', padding:0}}>Eliminar</button>
                              </>
                            )}
                            <button onClick={(e)=>{e.stopPropagation(); togglePinnedComentario(c.id);}} title="Destacar mensaje (máx 1)" style={{background:'none', border:'none', cursor:'pointer', padding:0, fontSize:'11px', opacity: c.pinned?1:.3, transition:'opacity .2s'}} className="pin-star-btn">
                              {c.pinned ? '⭐' : '☆'}
                            </button>
                          </div>

                          <div style={{display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'4px'}}>
                             {['👍','👀','✅','🔥','❤️','🙌'].map(emoji => {
                               const list = c.reacciones?.[emoji] || [];
                               const count = list.length;
                               const active = list.includes(usuario?.nombre || usuario?.email);
                               if (count === 0) return null;
                               return (
                                 <button key={emoji} onClick={()=>toggleReaccionComentario(c.id, emoji)} title={list.join(', ')} style={{padding:'1px 5px', background: active ? 'rgba(59,130,246,.1)' : 'var(--bg2)', border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`, borderRadius:'10px', fontSize:'9px', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px'}}>
                                   <span>{emoji}</span>
                                   {count > 0 && <span style={{fontWeight:700, color: active?'var(--blue)':'#777'}}>{count}</span>}
                                 </button>
                               );
                             })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredComs.length === 0 && !loadingComs && <div style={{textAlign:'center', color:'#aaa', fontSize:'11px', fontStyle:'italic', marginTop:'40px'}}>Sin mensajes.</div>}
            </div>

            <div style={{padding:'12px 16px', borderTop:'1px solid var(--border)', background:'var(--bg)'}}>
                {replyTo && (
                  <div style={{background:'var(--bg3)', padding:'6px 10px', borderRadius:'6px 6px 0 0', border:'1px solid var(--border)', borderBottom:'none', fontSize:'9px', color:'#666', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                     <span>↳ Respondiendo a <strong>{localComs.find(x=>x.id===replyTo)?.usuario}</strong></span>
                     <button onClick={()=>setReplyTo(null)} style={{background:'none', border:'none', cursor:'pointer'}}>✕</button>
                  </div>
                )}
               <div className="quick-comment-type-selector" style={{display:'flex', gap:'6px', marginBottom:'6px'}}>
                  {['nota', 'alerta'].map(t => (
                    <button key={t} onClick={(e)=>{e.stopPropagation(); setTipo(t);}} style={{
                      padding:'2px 8px', border:'1px solid var(--border)', borderRadius:'10px', fontSize:'8px', cursor:'pointer',
                      background: tipo === t ? (t==='alerta'?'var(--red)':'var(--ink)') : 'var(--bg2)',
                      color: tipo === t ? '#fff' : '#666',
                      fontWeight:700, textTransform:'uppercase', transition:'all .2s'
                    }}>
                      {t === 'alerta' ? '🚨 Alerta' : 'Nota'}
                    </button>
                  ))}
               </div>
               <div className="quick-comment-trigger" style={{display:'flex', gap:'8px'}}>
                 <input type="text" placeholder={tipo === 'alerta' ? "Escribe una alerta urgente..." : "Agrega una nota..."} onKeyDown={e => {
                   if (e.key === 'Enter' && e.target.value.trim()) { 
                     enviarMensajePro(cmd.id, e.target.value, tipo, replyTo); 
                     e.target.value = ''; 
                     setTipo('nota');
                   }
                 }} onClick={e => e.stopPropagation()} style={{flex:1, background: tipo === 'alerta' ? 'var(--red-soft)' : 'var(--surface)', border: tipo === 'alerta' ? '1px solid var(--red)' : '1px solid var(--border)', color: tipo === 'alerta' ? 'var(--red)' : 'inherit', padding:'8px 15px', fontSize:'12px', outline:'none', borderRadius: replyTo?'0 0 20px 20px':'20px', fontFamily:'Poppins,sans-serif'}} />
                 <span style={{fontSize:'16px', alignSelf:'center', opacity:.5, cursor:'pointer'}} onClick={(e)=>{const input=e.currentTarget.previousElementSibling; if(input.value.trim()){ enviarMensajePro(cmd.id, input.value, tipo, replyTo); input.value=''; setTipo('nota'); }}}>➤</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ComandaCard;
