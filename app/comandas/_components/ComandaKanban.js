'use client';
import { fmtNum, parseProd } from '@/utils/formatters';
import { CMD_STATUS } from '@/utils/constants';

export default function ComandaKanban({ comandas, filtro, onSelect, empProgMap, onShowTicket }) {
  const cols = ['pendiente', 'empacado', 'enviado', 'cancelado'];
  const grupos = {};
  cols.forEach(s => { grupos[s] = []; });
  comandas.forEach(cmd => { (grupos[cmd.status] || grupos['pendiente']).push(cmd); });
  
  const colsVisibles = filtro === 'todos' ? cols.filter(s => grupos[s].length > 0) : [filtro].filter(s => grupos[s]);
  
  if (colsVisibles.length === 0) return null;

  return (
    <div className="kanban-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(colsVisibles.length, 4)}, 1fr)`, gap: '12px', alignItems: 'start' }}>
      {colsVisibles.map(status => {
        const cfg = CMD_STATUS[status] || CMD_STATUS.pendiente;
        const cmds = grupos[status] || [];
        return (
          <div key={status} className="kanban-col">
            <div className="kanban-col-header" style={{ background: cfg.bg, border: `1px solid ${cfg.border}44`, borderTop: `3px solid ${cfg.border}` }}>
              <span className="kanban-col-title" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>
              <span className="kanban-col-count" style={{ color: cfg.color }}>{cmds.length}</span>
            </div>
            
            {cmds.map(cmd => {
              const saldo = Math.max(0, (cmd.precio || 0) - (cmd.monto_pagado || 0));
              const pct = cmd.precio > 0 ? Math.min(100, ((cmd.monto_pagado || 0) / cmd.precio) * 100) : 0;
              const prods = parseProd(cmd);
              const hoy = new Date().toISOString().slice(0, 10);
              const vencida = cmd.fecha_entrega && cmd.fecha_entrega < hoy && status !== 'enviado' && status !== 'cancelado';
              
              return (
                <div 
                  key={cmd.id} 
                  onClick={() => onSelect(cmd)} 
                  className="kanban-card"
                  style={{ borderTopColor: cfg.border, borderLeft: vencida ? '1px solid var(--red)' : '1px solid var(--border)', borderRight: vencida ? '1px solid var(--red)' : '1px solid var(--border)', borderBottom: vencida ? '1px solid var(--red)' : '1px solid var(--border)' }}
                >
                  <div style={{ marginBottom: '7px' }}>
                    <div className="kanban-card-title">{cmd.cliente}</div>
                    <div className="kanban-card-meta">
                      <span className="kanban-card-id">{cmd.id}</span>
                      {cmd.fecha_entrega && (
                        <span className="kanban-card-date" style={{ color: vencida ? 'var(--red)' : '#777', fontWeight: vencida ? 700 : 400 }}>
                          {vencida ? '⚠️' : '📅'} {cmd.fecha_entrega}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {prods.length > 0 && (
                    <div className="kanban-card-prods">
                      {prods.slice(0, 3).map((p, i) => (
                        <span key={i} className="kanban-prod-tag">
                          {p.cant || p.cantidad}× {(p.modelo || p.sku || '—').split('—')[0].trim().slice(0, 12)}
                        </span>
                      ))}
                      {prods.length > 3 && <span className="more-prods" style={{ fontSize: '8px' }}>+{prods.length - 3}</span>}
                    </div>
                  )}
                  
                  <div className="kanban-price-row">
                    <span className="kanban-card-price">€ {fmtNum(cmd.precio)}</span>
                    {saldo > 0.01
                      ? <span className="kanban-saldo-badge" style={{ color: 'var(--red)' }}>⏳ -€{fmtNum(saldo)}</span>
                      : <span className="text-green font-bold" style={{ fontSize: '9px' }}>✓ Pagada</span>
                    }
                  </div>
                  
                  {cmd.precio > 0 && (
                    <div className="progress-bar-container" style={{ marginBottom: '6px' }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : pct > 50 ? 'var(--warn)' : 'var(--red)', transition: 'width .4s' }}
                      />
                    </div>
                  )}
                  
                  {status === 'empacado' && empProgMap[cmd.id] && (
                    <div className="kanban-packing-mini">
                      <div className="kanban-packing-header">
                        <span className="kanban-packing-label">📦 EMPACADO</span>
                        <span className={`kanban-packing-count ${empProgMap[cmd.id].completo ? 'text-green' : 'text-blue'}`}>
                          {empProgMap[cmd.id].empacado}/{empProgMap[cmd.id].total}{empProgMap[cmd.id].completo ? ' ✓' : ''}
                        </span>
                      </div>
                      <div className="kanban-packing-bar-bg">
                        <div 
                          className="packing-bar-fill" 
                          style={{ width: `${Math.round(empProgMap[cmd.id].empacado / empProgMap[cmd.id].total * 100)}%`, background: empProgMap[cmd.id].completo ? 'var(--green)' : '#3b82f6' }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {(status === 'empacado' || status === 'enviado') && (
                    <button 
                      onClick={e => { e.stopPropagation(); onShowTicket(cmd); }}
                      className="kanban-btn-guide"
                    >
                      🖨️ Guía
                    </button>
                  )}
                </div>
              );
            })}
            
            {cmds.length === 0 && (
              <div className="kanban-empty">
                Sin pedidos
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
