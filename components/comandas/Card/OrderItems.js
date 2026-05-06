import React from 'react';

const OrderItems = ({ 
  cmd, status, isPartial, isSaving, setPartialMode, setPartialItems, marcarTodoEmpacado, 
  setModal, confirmarEntregaParcial, loadingProds, localProds, setLocalProds, 
  marcarEmpacadoRapido, partialItems, cambiarStatusRapido, setTicketModal, cliente 
}) => {
  const saldoPendiente = (cmd.precio || 0) - (cmd.monto_pagado || 0);
  const tieneDeuda = saldoPendiente > 0;
  const autorizaDeuda = cliente?.autoriza_deuda === true;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontFamily: 'Playfair Display,serif', fontSize: '14px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📋 Detalles de la Orden
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {status === 'pendiente' && !isPartial && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setPartialMode(cmd.id); setPartialItems({}); }} 
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: '20px', fontSize: '9px', cursor: 'pointer', fontWeight: 700, color: 'var(--blue)' }}>
                📦 ENTREGA PARCIAL
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); marcarTodoEmpacado && marcarTodoEmpacado(cmd.id); }} 
                disabled={isSaving}
                style={{ background: 'var(--ink)', color: '#fff', border: 'none', padding: '4px 14px', borderRadius: '20px', fontSize: '9px', cursor: 'pointer', fontWeight: 700, letterSpacing: '.03em', boxShadow: '0 2px 5px rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isSaving ? '⏳...' : '✨ EMPACAR TODO'}
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); setModal(cmd); }} style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins,sans-serif' }}>✏️ EDITAR</button>
        </div>
      </div>

      {isPartial && (
        <div style={{ marginBottom: '14px', padding: '12px', background: 'rgba(59,130,246,.05)', border: '1px dashed var(--blue)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: 'var(--blue)', fontWeight: 700 }}>📋 MODO: SELECCIÓN DE SALIDA PARCIAL</div>
           <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPartialMode(null)} style={{ background: 'none', border: 'none', fontSize: '10px', cursor: 'pointer', color: '#888' }}>Cancelar</button>
              <button onClick={confirmarEntregaParcial} style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>Confirmar Salida</button>
           </div>
        </div>
      )}

      <div className="grid-dates" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px', background: 'var(--surface)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div><div style={{ fontSize: '8px', color: '#999', textTransform: 'uppercase' }}>Solicitud</div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', fontWeight: 700 }}>{new Date(cmd.created_at).toLocaleDateString()}</div></div>
        <div><div style={{ fontSize: '8px', color: '#999', textTransform: 'uppercase' }}>Empaque</div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: cmd.fecha_empaque ? 'var(--warn)' : '#ccc', fontWeight: 700 }}>{cmd.fecha_empaque ? new Date(cmd.fecha_empaque).toLocaleDateString() : '—'}</div></div>
        <div><div style={{ fontSize: '8px', color: '#999', textTransform: 'uppercase' }}>Envío</div><div style={{ fontFamily: 'DM Mono,monospace', fontSize: '10px', color: cmd.fecha_envio ? 'var(--green)' : '#ccc', fontWeight: 700 }}>{cmd.fecha_envio ? new Date(cmd.fecha_envio).toLocaleDateString() : '—'}</div></div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', padding: '4px 12px', fontSize: '9px', color: '#999', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
           <div style={{ flex: 1 }}>Producto</div>
           <div style={{ width: '40px', textAlign: 'center' }}>🛒</div>
           <div style={{ width: '70px', textAlign: 'center' }}>📦</div>
           <div style={{ width: '50px', textAlign: 'right' }}>🚀</div>
        </div>
        {loadingProds ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', padding: '20px' }}>Cargando productos...</div>
            </div>
          ) : !Array.isArray(localProds) || localProds.length === 0 ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', padding: '20px' }}>No hay productos en esta orden.</div>
            </div>
          ) : (
            localProds.map((p, i) => {
          const sku = (p.sku || '').toUpperCase();
          const total = parseInt(p.cant || p.cantidad || 1);
          const empacados = parseInt(p.cant_empacada || p.despachado || 0);
          const despachados = parseInt(p.despachado || 0);
          
          const stylePack = empacados >= total ? { color: 'var(--blue)', fontWeight: 800 } : (empacados > 0 ? { color: 'var(--warn)', fontWeight: 700 } : { color: '#ccc' });
          const styleShip = despachados >= total ? { color: 'var(--green)', fontWeight: 800 } : (despachados > 0 ? { color: 'var(--warn)', fontWeight: 700 } : { color: '#ccc' });

          return (
            <div key={i} className="prod-row" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: despachados >= total ? 'var(--green-soft)' : 'var(--surface)', borderBottom: '1px solid var(--border-soft)', opacity: despachados >= total ? 0.7 : 1 }}>
               <div style={{ flex: 1, minWidth: 0 }}>
                 <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.modelo || p.sku}>{p.modelo || p.sku || '—'}</div>
                 <div style={{ fontSize: '10px', color: '#888' }}>
                    {p.talla && <span>Talla: {p.talla}</span>}
                    {p.color && <span>{p.talla ? ' · ' : ''}Color: {p.color}</span>}
                 </div>
               </div>

               <div style={{ width: '40px', textAlign: 'center', fontFamily: 'DM Mono,monospace', fontSize: '12px', fontWeight: 700 }}>
                  {total}
               </div>

               <div style={{ width: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  {status === 'pendiente' || status === 'empacado' ? (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <input 
                         type="checkbox" 
                         checked={empacados >= total} 
                         onChange={(e) => {
                           e.stopPropagation(); 
                           const isChecked = e.target.checked;
                           const delta = isChecked ? (total - empacados) : -empacados;
                           
                           if (delta !== 0) {
                             setLocalProds(prev => prev.map(item => {
                                if ((item.sku || '').toUpperCase() === sku) {
                                  const current = parseInt(item.cant_empacada || item.despachado || 0);
                                  return { ...item, cant_empacada: Math.min(total, current + delta) };
                                }
                                return item;
                             }));
                             marcarEmpacadoRapido(cmd.id, sku, delta, p.modelo, p.color);
                           }
                         }} 
                         style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--blue)' }} 
                       />
                       <button onClick={(e) => {
                         e.stopPropagation();
                         const val = window.prompt(`Cantidad empacada de ${sku} (Máximo ${total}):`, empacados);
                         if (val !== null && !isNaN(val)) {
                            const parsed = parseInt(val);
                            if (parsed >= 0 && parsed <= total) {
                              marcarEmpacadoRapido(cmd.id, sku, parsed - empacados, p.modelo, p.color);
                            }
                         }
                       }} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#ccc', cursor: 'pointer', padding: 0 }} title="Empaque Parcial">
                         {empacados > 0 && empacados < total ? <span style={{ color: 'var(--warn)', fontWeight: 700, fontSize: '10px' }}>{empacados}</span> : '✏️'}
                       </button>
                     </div>
                  ) : (
                    <span style={{ fontSize: '11px', ...stylePack }}>{empacados}/{total}</span>
                  )}
               </div>

               <div style={{ width: '50px', textAlign: 'right' }}>
                  {isPartial && despachados < total ? (
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                        <button onClick={() => setPartialItems(prev => ({ ...prev, [sku]: Math.max(0, (prev[sku] || 0) - 1) }))} style={{ width: '16px', height: '16px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '2px', fontSize: '10px', cursor: 'pointer' }}>–</button>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--blue)', minWidth: '12px', textAlign: 'center' }}>{partialItems[sku] || 0}</span>
                        <button onClick={() => setPartialItems(prev => ({ ...prev, [sku]: Math.min(total - despachados, (prev[sku] || 0) + 1) }))} style={{ width: '16px', height: '16px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '2px', fontSize: '10px', cursor: 'pointer' }}>+</button>
                     </div>
                  ) : (
                    <span style={{ fontSize: '11px', fontFamily: 'DM Mono,monospace', ...styleShip }}>
                       {despachados >= total ? '✓' : `${despachados}/${total}`}
                    </span>
                  )}
               </div>
            </div>
          );
        })
      )}
      </div>
        
      <div className="action-btns" style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
        {cmd.status === 'pendiente' && (
          <button onClick={(e) => { e.stopPropagation(); cambiarStatusRapido(cmd.id, 'empacado'); }} style={{ flex: 1, padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textTransform: 'uppercase' }}>📦 Enviar a Empaque</button>
        )}
        {cmd.status === 'empacado' && (
          tieneDeuda && !autorizaDeuda ? (
            <button disabled style={{ flex: 1, padding: '10px', background: 'var(--surface)', color: '#999', border: '1px solid var(--border)', borderRadius: '6px', fontFamily: 'Poppins,sans-serif', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textTransform: 'uppercase', cursor: 'not-allowed' }}>
              🔒 PENDIENTE POR PAGO
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); cambiarStatusRapido(cmd.id, 'enviado'); }} style={{ flex: 1, padding: '10px', background: tieneDeuda ? '#f59e0b' : 'var(--green)', color: tieneDeuda ? '#000' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textTransform: 'uppercase' }}>
              {tieneDeuda ? '🚀 Despacho bajo crédito autorizado' : '🚀 Despachar'}
            </button>
          )
        )}
        {cmd.status === 'enviado' && (
          <button onClick={(e) => { e.stopPropagation(); cambiarStatusRapido(cmd.id, 'empacado'); }} style={{ padding: '10px', background: 'var(--bg2)', color: '#777', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>↩ Deshacer envío</button>
        )}
        {(cmd.status === 'empacado' || cmd.status === 'enviado') && (
           <button onClick={e => { e.stopPropagation(); setTicketModal({ cmd }); }} style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', borderRadius: '6px', fontSize: '14px' }} title="🖨️ Guía de envío">🖨️</button>
        )}
      </div>
    </div>
  );
};

export default OrderItems;
