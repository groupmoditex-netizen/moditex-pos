import React from 'react';

const CardHeader = ({ 
  cmd, cfg, vencida, isExpanded, totalItems, fmtNum, saldo, localComs, toggleItems, eliminarComanda, isSaving 
}) => {
  return (
    <div className="premium-row-header"
         onClick={(e) => { if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) toggleItems(cmd.id); }}
         style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', cursor: 'pointer', gap: '16px', flexWrap: 'wrap', position: 'relative' }}>
      
      <div className="col-id" style={{ flex: '0 0 100px', fontFamily: 'DM Mono,monospace', fontSize: '11px', color: '#777', fontWeight: 600 }}>
        #{cmd.id}
      </div>
      
      <div className="col-client" style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: vencida ? 'var(--red-soft)' : cfg.bg, color: vencida ? 'var(--red)' : cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, border: `1px solid ${vencida ? 'var(--red)' : cfg.border}`, fontFamily: 'Poppins, sans-serif' }}>
          {(cmd.cliente || 'C').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="client-name" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
            {cmd.cliente}
            {localComs.some(c => c.comanda_id === cmd.id && c.texto?.includes('📌 BAJO PEDIDO')) && (
              <span style={{ background: 'var(--red)', color: '#fff', fontSize: '8px', fontWeight: 900, padding: '2px 5px', borderRadius: '4px', letterSpacing: '.05em' }}>BAJO PEDIDO</span>
            )}
          </div>
          {cmd.fecha_entrega && <div style={{ fontFamily: 'DM Mono,monospace', fontSize: '9px', color: vencida ? 'var(--red)' : '#999', marginTop: '2px' }}>{vencida ? '⚠️ Límite:' : '📅'} {cmd.fecha_entrega}</div>}
        </div>
      </div>

      <div className="col-status" style={{ flex: '0 0 120px' }}>
        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '4px 10px', borderRadius: '20px', fontFamily: 'Poppins,sans-serif', fontSize: '10px', fontWeight: 700, display: 'inline-block', textTransform: 'uppercase' }}>
          {cfg.label}
        </span>
      </div>

      <div className="col-items" style={{ flex: '0 0 80px', fontFamily: 'DM Mono,monospace', fontSize: '12px', fontWeight: 700, color: '#555', textAlign: 'center' }}>
        x{totalItems}
      </div>

      <div className="col-total" style={{ flex: '0 0 110px' }}>
        <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 900, color: 'var(--ink)' }}>€ {fmtNum(cmd.precio)}</div>
        {saldo > 0.01 && <div style={{ fontFamily: 'DM Mono,monospace', fontSize: '9px', color: 'var(--red)', fontWeight: 700 }}>⏳ -€{fmtNum(saldo)}</div>}
        {saldo <= 0.01 && cmd.precio > 0 && <div style={{ fontFamily: 'DM Mono,monospace', fontSize: '8px', color: 'var(--green)', fontWeight: 700 }}>✓ PAGADA</div>}
      </div>

      <div className="col-sync" style={{ flex: '0 0 60px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
        {(isExpanded ? localComs.length : (cmd.comentarios_count || 0)) > 0 && (
          <span style={{ fontSize: '12px', opacity: .6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px' }}>💬</span>
            {isExpanded ? localComs.length : (cmd.comentarios_count || 0)}
          </span>
        )}
        <button style={{ background: 'none', border: 'none', fontSize: '16px', color: '#aaa', transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>⌄</button>
      </div>

      {isExpanded && !isSaving && (
        <button 
          onClick={(e) => { e.stopPropagation(); eliminarComanda(cmd.id); }}
          style={{ position: 'absolute', right: '-30px', top: '50%', transform: 'translateY(-50%)', background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red)', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 10 }}
          title="Eliminar Comanda"
          className="delete-btn-card"
        >
          🗑️
        </button>
      )}
    </div>
  );
};

export default CardHeader;
