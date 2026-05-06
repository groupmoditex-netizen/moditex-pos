import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabasePublic as supabase } from '@/lib/supabase-client';
import CardHeader from './Card/CardHeader';
import OrderItems from './Card/OrderItems';
import TeamSync from './Card/TeamSync';

const ComandaCard = ({ cmd, index, isExpanded, toggleItems, statusColors, clientes, setModal, eliminarComanda, marcarTodoEmpacado, cambiarStatusRapido, marcarEmpacadoRapido, setTicketModal, usuariosDB, usuario }) => {
  const [localComs, setLocalComs] = useState([]);
  const [localProds, setLocalProds] = useState([]);
  const [loadingComs, setLoadingComs] = useState(false);
  const [loadingProds, setLoadingProds] = useState(false);
  const [chatFilter, setChatFilter] = useState('todo');
  const [tipo, setTipo] = useState('nota');
  const [replyTo, setReplyTo] = useState(null);
  const [editIdCom, setEditIdCom] = useState(null);
  const [editTextCom, setEditTextCom] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPartial, setPartialMode] = useState(null);
  const [partialItems, setPartialItems] = useState({});
  const [mobileTab, setMobileTab] = useState('orden'); // 'orden' o 'chat'
  
  const chatBodyRef = useRef(null);

  // Carga de Comentarios y Productos (On-Demand)
  useEffect(() => {
    if (isExpanded) {
      cargarComentarios();
      cargarProductos();
      const channel = supabase.channel(`coms-${cmd.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comanda_comentarios', filter: `comanda_id=eq.${cmd.id}` }, () => cargarComentarios())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isExpanded, cmd.id]);

  const cargarComentarios = async () => {
    setLoadingComs(true);
    const { data } = await supabase.from('comanda_comentarios').select('*').eq('comanda_id', cmd.id).order('created_at', { ascending: true });
    setLocalComs(data || []);
    setLoadingComs(false);
    setTimeout(() => { if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight; }, 100);
  };

  const cargarProductos = async () => {
    setLoadingProds(true);
    const { data } = await supabase.from('comandas_items').select('*').eq('comanda_id', cmd.id).gt('cantidad', 0);
    setLocalProds(data || []);
    setLoadingProds(false);
  };

  // Handlers para comentarios
  const enviarMensajePro = async (cid, txt, t, rId) => {
    const { error } = await supabase.from('comanda_comentarios').insert({
      comanda_id: cid, usuario: usuario?.nombre || usuario?.email || 'Sistema',
      texto: txt, tipo: t, parent_id: rId
    });
    if (!error) { setReplyTo(null); setTipo('nota'); cargarComentarios(); }
  };

  const eliminarComentario = async (id) => {
    if (window.confirm('¿Eliminar mensaje?')) {
      await supabase.from('comanda_comentarios').delete().eq('id', id);
      cargarComentarios();
    }
  };

  const guardarEdicionComentario = async (id, txt) => {
    await supabase.from('comanda_comentarios').update({ texto: txt, updated_at: new Date().toISOString() }).eq('id', id);
    setEditIdCom(null);
    cargarComentarios();
  };

  const togglePinnedComentario = async (id) => {
    const target = localComs.find(c => c.id === id);
    if (!target) return;
    if (!target.pinned) await supabase.from('comanda_comentarios').update({ pinned: false }).eq('comanda_id', cmd.id);
    await supabase.from('comanda_comentarios').update({ pinned: !target.pinned }).eq('id', id);
    cargarComentarios();
  };

  const toggleReaccionComentario = async (id, emoji) => {
    const c = localComs.find(x => x.id === id);
    if (!c) return;
    let r = c.reacciones || {};
    let list = r[emoji] || [];
    const u = usuario?.nombre || usuario?.email;
    if (list.includes(u)) list = list.filter(x => x !== u); else list.push(u);
    r[emoji] = list;
    await supabase.from('comanda_comentarios').update({ reacciones: r }).eq('id', id);
    cargarComentarios();
  };

  const confirmarEntregaParcial = async () => {
    const skus = Object.keys(partialItems).filter(s => partialItems[s] > 0);
    if (skus.length === 0) return alert('Selecciona al menos un item');
    setIsSaving(true);
    try {
      for (const s of skus) {
        await marcarEmpacadoRapido(cmd.id, s, partialItems[s], s, '');
      }
      setPartialMode(null);
      setPartialItems({});
      cargarProductos();
    } finally { setIsSaving(false); }
  };

  // Auxiliares de formato
  const fmtNum = (n) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(n || 0);
  const fmtSmartDate = (d) => {
    const date = new Date(d);
    const hoy = new Date();
    if (date.toDateString() === hoy.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const status = (cmd.status || 'pendiente').toLowerCase();
  const cfg = statusColors[status] || statusColors.pendiente;
  const totalItems = (cmd.productos && Array.isArray(cmd.productos)) ? cmd.productos.reduce((acc, p) => acc + parseInt(p.cant || p.cantidad || 0), 0) : 0;
  const saldo = (cmd.precio || 0) - (cmd.monto_pagado || 0);
  const vencida = cmd.fecha_entrega && new Date(cmd.fecha_entrega) < new Date() && status !== 'enviado';

  const filteredComs = localComs.filter(c => {
    if (chatFilter === 'todo') return true;
    if (chatFilter === 'nota') return c.tipo === 'nota' || c.tipo === 'alerta';
    return c.tipo === 'log';
  });

  return (
    <div className={`premium-card ${isExpanded ? 'expanded' : ''}`} 
         style={{ background: '#fff', borderRadius: '16px', border: `1px solid ${isExpanded ? 'var(--ink)' : 'var(--border)'}`, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: '12px', boxShadow: isExpanded ? '0 10px 30px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.03)' }}>
      
      <CardHeader 
        cmd={cmd} cfg={cfg} vencida={vencida} isExpanded={isExpanded} totalItems={totalItems} 
        fmtNum={fmtNum} saldo={saldo} localComs={localComs} toggleItems={toggleItems} 
        eliminarComanda={eliminarComanda} isSaving={isSaving}
      />

      {isExpanded && (
        <div className="card-expanded-content" style={{ padding: '20px', borderTop: '1px solid var(--border-soft)', background: 'var(--bg)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Selector de Pestañas Móvil */}
          <div className="mobile-tabs-switcher" style={{ display: 'none', width: '100%', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => setMobileTab('orden')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, background: mobileTab === 'orden' ? 'var(--ink)' : 'var(--bg3)', color: mobileTab === 'orden' ? '#fff' : '#888' }}>📋 ORDEN</button>
            <button onClick={() => setMobileTab('chat')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, background: mobileTab === 'chat' ? 'var(--ink)' : 'var(--bg3)', color: mobileTab === 'chat' ? '#fff' : '#888' }}>💬 CHAT {localComs.length > 0 && `(${localComs.length})`}</button>
          </div>

          <style jsx>{`
            @media (max-width: 800px) {
              .mobile-tabs-switcher { display: flex !important; }
              .order-details-col, .team-sync-col { width: 100% !important; flex: none !important; }
              .order-details-col { display: ${mobileTab === 'orden' ? 'block' : 'none'} !important; }
              .team-sync-col { display: ${mobileTab === 'chat' ? 'block' : 'none'} !important; }
            }
          `}</style>

          <div className="order-details-col" style={{ flex: '1 1 400px', minWidth: '300px' }}>
            <OrderItems 
              cmd={cmd} status={status} isPartial={isPartial} isSaving={isSaving} setPartialMode={setPartialMode} 
              setPartialItems={setPartialItems} marcarTodoEmpacado={marcarTodoEmpacado} setModal={setModal} 
              confirmarEntregaParcial={confirmarEntregaParcial} loadingProds={loadingProds} localProds={localProds} 
              setLocalProds={setLocalProds} marcarEmpacadoRapido={marcarEmpacadoRapido} partialItems={partialItems} 
              cambiarStatusRapido={cambiarStatusRapido} setTicketModal={setTicketModal}
              cliente={Array.isArray(clientes) ? clientes.find(c => c.id === cmd.cliente_id) : null}
            />
          </div>

          <div className="team-sync-col" style={{ flex: '0 0 340px', minWidth: '300px' }}>
            <TeamSync 
              cmd={cmd} chatFilter={chatFilter} setChatFilter={setChatFilter} filteredComs={filteredComs} 
              localComs={localComs} togglePinnedComentario={togglePinnedComentario} chatBodyRef={chatBodyRef} 
              loadingComs={loadingComs} usuariosDB={usuariosDB} usuario={usuario} editIdCom={editIdCom} 
              setEditIdCom={setEditIdCom} editTextCom={editTextCom} setEditTextCom={setEditTextCom} 
              guardarEdicionComentario={guardarEdicionComentario} fmtSmartDate={fmtSmartDate} 
              setReplyTo={setReplyTo} eliminarComentario={eliminarComentario} toggleReaccionComentario={toggleReaccionComentario} 
              replyTo={replyTo} tipo={tipo} setTipo={setTipo} enviarMensajePro={enviarMensajePro}
            />
          </div>

        </div>
      )}
    </div>
  );
};

export default ComandaCard;
