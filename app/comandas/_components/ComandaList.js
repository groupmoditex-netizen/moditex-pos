'use client';
import { fmtNum, parseProd } from '@/utils/formatters';
import { CMD_STATUS } from '@/utils/constants';

export default function ComandaList({ comandas, onSelect, empProgMap, onShowTicket }) {
  return (
    <>
      {comandas.map(cmd => {
        const sc = CMD_STATUS[cmd.status] || CMD_STATUS.pendiente;
        const saldo = Math.max(0, (cmd.precio || 0) - (cmd.monto_pagado || 0));
        const pct = cmd.precio > 0 ? Math.min(100, ((cmd.monto_pagado || 0) / cmd.precio) * 100) : 0;
        const prods = parseProd(cmd);
        
        return (
          <div key={cmd.id} onClick={() => onSelect(cmd)} className="list-item-comanda">
            <div className="list-item-header">
              <div>
                <span className="list-item-client">{cmd.cliente}</span>
                <span className="list-item-id">{cmd.id}</span>
                {cmd.fecha_entrega && <span className="list-item-date">📅 {cmd.fecha_entrega}</span>}
              </div>
              <span className="status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {sc.icon} {sc.label}
              </span>
            </div>
            
            {prods.length > 0 && (
              <div className="list-item-prods">
                {prods.slice(0, 5).map((p, i) => (
                  <span key={i} className="prod-tag">
                    {p.cant || p.cantidad}× {p.modelo || p.sku || '—'}
                  </span>
                ))}
                {prods.length > 5 && <span className="more-prods">+{prods.length - 5} más</span>}
              </div>
            )}
            
            <div className="list-item-footer">
              <span>💶 <strong style={{ color: sc.color }}>€ {fmtNum(cmd.precio)}</strong></span>
              <span>✅ <strong className="text-green">€ {fmtNum(cmd.monto_pagado)}</strong></span>
              {saldo > 0.01 && <span className="text-red font-bold">⏳ Saldo € {fmtNum(saldo)}</span>}
              {saldo <= 0.01 && cmd.precio > 0 && <span className="text-green font-bold">✓ Pagada</span>}
              {cmd.notas && <span className="list-item-notes">📝 {cmd.notas}</span>}
            </div>
            
            {cmd.precio > 0 && (
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${pct}%`, 
                    background: pct >= 100 ? 'var(--green)' : pct > 50 ? 'var(--warn)' : 'var(--red)' 
                  }}
                />
              </div>
            )}
            
            {cmd.status === 'empacado' && empProgMap[cmd.id] && (
              <div className="packing-progress-container">
                <div style={{ flex: 1 }}>
                  <div className="packing-progress-header">
                    <span className="packing-label">📦 Empacado</span>
                    <span className={`packing-count ${empProgMap[cmd.id].completo ? 'text-green' : 'text-blue'}`}>
                      {empProgMap[cmd.id].empacado}/{empProgMap[cmd.id].total} uds
                      {empProgMap[cmd.id].completo ? ' ✓' : ''}
                    </span>
                  </div>
                  <div className="packing-bar-bg">
                    <div 
                      className="packing-bar-fill" 
                      style={{ 
                        width: `${Math.round(empProgMap[cmd.id].empacado / empProgMap[cmd.id].total * 100)}%`,
                        background: empProgMap[cmd.id].completo ? 'var(--green)' : '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {(cmd.status === 'empacado' || cmd.status === 'enviado') && (
              <div className="list-item-actions">
                <button 
                  onClick={e => { e.stopPropagation(); onShowTicket(cmd); }}
                  className="btn-print-guide"
                >
                  🖨️ Guía de envío
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
