import React from 'react';

const TeamSync = ({ 
  cmd, chatFilter, setChatFilter, filteredComs, localComs, togglePinnedComentario, 
  chatBodyRef, loadingComs, usuariosDB, usuario, editIdCom, setEditIdCom, 
  editTextCom, setEditTextCom, guardarEdicionComentario, fmtSmartDate, 
  setReplyTo, eliminarComentario, toggleReaccionComentario, replyTo, 
  tipo, setTipo, enviarMensajePro 
}) => {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '420px', shadow: 'inset 0 2px 10px rgba(0,0,0,0.02)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 5 }}>
        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '.1em' }}>💬 Team Sync</div>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg3)', padding: '2px', borderRadius: '15px' }}>
          {[ ['todo', 'Todo'], ['nota', 'Chat'], ['log', 'Historial'] ].map(([f, l]) => (
            <button key={f} onClick={() => setChatFilter(f)} style={{ padding: '3px 10px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '9px', fontWeight: 700, background: chatFilter === f ? 'var(--ink)' : 'none', color: chatFilter === f ? '#fff' : '#888', transition: 'all .2s' }}>{l}</button>
          ))}
        </div>
      </div>

      {filteredComs.filter(c => c.pinned).length > 0 && (
        <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '8px', fontWeight: 900, color: 'var(--warn)', letterSpacing: '.1em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            📌 MENSAJE DESTACADO
          </div>
          {filteredComs.filter(c => c.pinned).map(p => (
             <div key={p.id} style={{ fontSize: '10px', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-soft)', position: 'relative', cursor: 'help' }} title="Mensaje importante fijado">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1, color: '#333', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{p.texto}</div>
                  <button onClick={(e) => { e.stopPropagation(); togglePinnedComentario(p.id); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '10px' }}>⭐</button>
                </div>
                <div style={{ fontSize: '8px', color: '#999', marginTop: '2px' }}>{p.usuario} · {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
             </div>
          ))}
        </div>
      )}
      
      <div ref={chatBodyRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loadingComs ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '10px', color: '#999' }}>Cargando mensajes...</div>
        ) : (Array.isArray(filteredComs) ? filteredComs : []).map((c, i) => {
          const uSearch = (c.usuario || '').toLowerCase();
          const userObj = (usuariosDB || []).find(u => 
            u.nombre?.toLowerCase() === uSearch || 
            u.email?.toLowerCase() === uSearch
          );
          const canModify = (usuario?.nombre === c.usuario || usuario?.email === c.usuario) && (Date.now() - new Date(c.created_at).getTime() < 10 * 60 * 1000);
          const isEditing = editIdCom === c.id;
          const parent = c.parent_id ? localComs.find(pc => pc.id === c.parent_id) : null;

          if (c.tipo === 'log') {
            return (
              <div key={i} style={{ padding: '6px 10px', background: 'var(--bg2)', borderRadius: '6px', borderLeft: '3px solid #6366f1', fontFamily: 'DM Mono,monospace', fontSize: '9px', color: '#555', opacity: 0.8 }}>
                {c.texto} <span style={{ fontSize: '8px', color: '#aaa', marginLeft: '6px' }}>— {fmtSmartDate(c.created_at)}</span>
              </div>
            );
          }

          return (
            <div key={i} id={`msg-${c.id}`} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', position: 'relative' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg3)', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                 {userObj?.avatar ? (
                   <img 
                     src={userObj.avatar.startsWith('http') ? userObj.avatar : `https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/avatars/${userObj.avatar}.png`} 
                     alt={c.usuario} 
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                     onError={(e) => {
                       e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.usuario)}&background=random&color=fff`;
                     }} 
                   />
                 ) : (
                   <img 
                     src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.usuario)}&background=random&color=fff`} 
                     alt={c.usuario} 
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                   />
                 )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: '11px', fontWeight: 700 }}>{c.usuario}</span>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontSize: '8px', color: '#999' }}>{fmtSmartDate(c.created_at)}</span>
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
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ opacity: 0.5 }}>↳</span>
                    <strong style={{ fontSize: '9px' }}>{parent.usuario}:</strong>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {parent.texto}
                    </span>
                  </div>
                )}

                {isEditing ? (
                  <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                    <input autoFocus value={editTextCom} onChange={e => setEditTextCom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') guardarEdicionComentario(c.id, editTextCom); if (e.key === 'Escape') setEditIdCom(null); }} style={{ flex: 1, padding: '4px 8px', fontSize: '11px', border: '1px solid var(--ink)', borderRadius: '4px', outline: 'none' }} />
                    <button onClick={() => guardarEdicionComentario(c.id, editTextCom)} style={{ padding: '4px 8px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>✓</button>
                  </div>
                ) : (
                  <>
                    <div style={{ background: c.tipo === 'alerta' ? 'var(--red-soft)' : 'var(--bg2)', padding: '8px 12px', borderRadius: '0 10px 10px 10px', fontSize: '12px', color: c.tipo === 'alerta' ? 'var(--red)' : '#333', lineHeight: 1.4, border: c.tipo === 'alerta' ? '1px solid rgba(217,30,30,.2)' : 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                       {c.texto}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', alignItems: 'center' }}>
                      <button onClick={() => setReplyTo(c.id)} style={{ background: 'none', border: 'none', fontSize: '9px', fontWeight: 700, color: '#888', cursor: 'pointer', padding: 0 }}>Responder</button>
                      {canModify && (
                        <>
                          <button onClick={() => { setEditIdCom(c.id); setEditTextCom(c.texto); }} style={{ background: 'none', border: 'none', fontSize: '9px', fontWeight: 700, color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>Editar</button>
                          <button onClick={() => eliminarComentario(c.id)} style={{ background: 'none', border: 'none', fontSize: '9px', fontWeight: 700, color: 'var(--red)', cursor: 'pointer', padding: 0 }}>Eliminar</button>
                        </>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); togglePinnedComentario(c.id); }} title="Destacar mensaje (máx 1)" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '11px', opacity: c.pinned ? 1 : .3, transition: 'opacity .2s' }} className="pin-star-btn">
                        {c.pinned ? '⭐' : '☆'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                       {['👍', '👀', '✅', '🔥', '❤️', '🙌'].map(emoji => {
                         const list = c.reacciones?.[emoji] || [];
                         const count = list.length;
                         const active = list.includes(usuario?.nombre || usuario?.email);
                         if (count === 0) return null;
                         return (
                           <button key={emoji} onClick={() => toggleReaccionComentario(c.id, emoji)} title={list.join(', ')} style={{ padding: '1px 5px', background: active ? 'rgba(59,130,246,.1)' : 'var(--bg2)', border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`, borderRadius: '10px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                             <span>{emoji}</span>
                             {count > 0 && <span style={{ fontWeight: 700, color: active ? 'var(--blue)' : '#777' }}>{count}</span>}
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
        {filteredComs.length === 0 && !loadingComs && <div style={{ textAlign: 'center', color: '#aaa', fontSize: '11px', fontStyle: 'italic', marginTop: '40px' }}>Sin mensajes.</div>}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          {replyTo && (
            <div style={{ background: 'var(--bg3)', padding: '6px 10px', borderRadius: '6px 6px 0 0', border: '1px solid var(--border)', borderBottom: 'none', fontSize: '9px', color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span>↳ Respondiendo a <strong>{localComs.find(x => x.id === replyTo)?.usuario}</strong></span>
               <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          )}
         <div className="quick-comment-type-selector" style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            {['nota', 'alerta'].map(t => (
              <button key={t} onClick={(e) => { e.stopPropagation(); setTipo(t); }} style={{
                padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '8px', cursor: 'pointer',
                background: tipo === t ? (t === 'alerta' ? 'var(--red)' : 'var(--ink)') : 'var(--bg2)',
                color: tipo === t ? '#fff' : '#666',
                fontWeight: 700, textTransform: 'uppercase', transition: 'all .2s'
              }}>
                {t === 'alerta' ? '🚨 Alerta' : 'Nota'}
              </button>
            ))}
         </div>
         <div className="quick-comment-trigger" style={{ display: 'flex', gap: '8px' }}>
           <input type="text" placeholder={tipo === 'alerta' ? "Escribe una alerta urgente..." : "Agrega una nota..."} onKeyDown={e => {
             if (e.key === 'Enter' && e.target.value.trim()) { 
               enviarMensajePro(cmd.id, e.target.value, tipo, replyTo); 
               e.target.value = ''; 
               setTipo('nota');
             }
           }} onClick={e => e.stopPropagation()} style={{ flex: 1, background: tipo === 'alerta' ? 'var(--red-soft)' : 'var(--surface)', border: tipo === 'alerta' ? '1px solid var(--red)' : '1px solid var(--border)', color: tipo === 'alerta' ? 'var(--red)' : 'inherit', padding: '8px 15px', fontSize: '12px', outline: 'none', borderRadius: replyTo ? '0 0 20px 20px' : '20px', fontFamily: 'Poppins,sans-serif' }} />
           <span style={{ fontSize: '16px', alignSelf: 'center', opacity: .5, cursor: 'pointer' }} onClick={(e) => { const input = e.currentTarget.previousElementSibling; if (input.value.trim()) { enviarMensajePro(cmd.id, input.value, tipo, replyTo); input.value = ''; setTipo('nota'); } }}>➤</span>
         </div>
      </div>
    </div>
  );
};

export default TeamSync;
