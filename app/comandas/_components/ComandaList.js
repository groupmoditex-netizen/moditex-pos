'use client';
import { fmtNum, parseProd } from '@/utils/formatters';
import { CMD_STATUS } from '@/utils/constants';
import { colorHex } from '@/utils/colores';

/* ─── Deduce categoría desde el modelo/SKU ─────────────────────────── */
function getCategoria(modelo='', sku='') {
  const text = (modelo || sku).toUpperCase();
  if (text.includes('JACKET') || text.includes('CHAQUETA')) return 'JACKETS';
  if (text.includes('BODY') || text.includes('BODI'))       return 'BODIES';
  if (text.includes('LEGGIN') || text.includes('LEGGING'))  return 'LEGGINGS';
  if (text.includes('SHORT'))                               return 'SHORTS';
  if (text.includes('TOP'))                                 return 'TOPS';
  if (text.includes('TRAJE') || text.includes('CONJUNTO'))  return 'CONJUNTOS';
  if (text.includes('FALDA'))                               return 'FALDAS';
  return 'OTROS';
}

/* ─── Colores de categoría ─────────────────────────────────────────── */
const CAT_COLORS = {
  JACKETS:   { bg:'#fff8e1', color:'#b45309', border:'#fbbf24' },
  BODIES:    { bg:'#fdf2f8', color:'#9d174d', border:'#f9a8d4' },
  LEGGINGS:  { bg:'#f0fdf4', color:'#166534', border:'#86efac' },
  SHORTS:    { bg:'#eff6ff', color:'#1e40af', border:'#93c5fd' },
  TOPS:      { bg:'#fff1f2', color:'#9f1239', border:'#fda4af' },
  CONJUNTOS: { bg:'#f5f3ff', color:'#5b21b6', border:'#c4b5fd' },
  FALDAS:    { bg:'#ecfdf5', color:'#065f46', border:'#6ee7b7' },
  OTROS:     { bg:'var(--bg2)', color:'#555', border:'var(--border)' },
};

export default function ComandaList({ comandas, onSelect, empProgMap, onShowTicket }) {
  return (
    <>
      {comandas.map(cmd => {
        const sc    = CMD_STATUS[cmd.status] || CMD_STATUS.pendiente;
        const saldo = Math.max(0, (cmd.precio || 0) - (cmd.monto_pagado || 0));
        const pct   = cmd.precio > 0 ? Math.min(100, ((cmd.monto_pagado || 0) / cmd.precio) * 100) : 0;
        const prods = parseProd(cmd);
        const totalUds = prods.reduce((a,p)=>a+parseInt(p.cant||p.cantidad||1),0);

        // Agrupar productos por categoría
        const grupos = {};
        prods.forEach(p => {
          const cat = getCategoria(p.modelo||'', p.sku||'');
          if (!grupos[cat]) grupos[cat] = [];
          grupos[cat].push(p);
        });
        const catKeys = Object.keys(grupos);

        // Progreso de empacado (desde localStorage a través del padre)
        const prog   = empProgMap?.[cmd.id];
        const progPct = prog?.total > 0 ? Math.round(prog.empacado/prog.total*100) : 0;

        return (
          <div
            key={cmd.id}
            onClick={() => onSelect(cmd)}
            className="list-item-comanda"
            style={{cursor:'pointer', marginBottom:'12px', background:'var(--surface)', border:'1px solid var(--border)', borderTop:`3px solid ${sc.border}`, overflow:'hidden', transition:'box-shadow .15s'}}
          >
            {/* ── Header: cliente + status ── */}
            <div style={{padding:'11px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', borderBottom:'1px solid var(--border)', background:'var(--bg2)'}}>
              <div style={{minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                  <span style={{fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700,color:'var(--ink)'}}>{cmd.cliente}</span>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa',letterSpacing:'.04em'}}>{cmd.id}</span>
                </div>
                <div style={{display:'flex',gap:'10px',marginTop:'4px',flexWrap:'wrap',alignItems:'center'}}>
                  {cmd.fecha_entrega && (
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>
                      📅 {cmd.fecha_entrega}
                    </span>
                  )}
                  {cmd.telefono && (
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>
                      📱 {cmd.telefono}
                    </span>
                  )}
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#aaa'}}>
                    {totalUds} pz{totalUds!==1?'s':''}
                  </span>
                </div>
              </div>
              <span style={{background:sc.bg,color:sc.color,border:`1px solid ${sc.border}44`,fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'3px 10px',fontWeight:700,flexShrink:0}}>
                {sc.icon} {sc.label}
              </span>
            </div>

            {/* ── Tabla productos agrupados ── */}
            {prods.length > 0 && (
              <div>
                {catKeys.map(cat => {
                  const cc = CAT_COLORS[cat] || CAT_COLORS.OTROS;
                  return (
                    <div key={cat}>
                      {/* Encabezado de categoría */}
                      <div style={{padding:'4px 14px',background:cc.bg,borderBottom:`1px solid ${cc.border}22`,display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',fontWeight:700,color:cc.color,letterSpacing:'.16em',textTransform:'uppercase'}}>{cat}</span>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:cc.color,opacity:.6}}>
                          {grupos[cat].reduce((a,p)=>a+parseInt(p.cant||p.cantidad||1),0)} uds
                        </span>
                      </div>
                      {/* Productos de esta categoría */}
                      {grupos[cat].map((p, pi) => {
                        const cant   = parseInt(p.cant || p.cantidad || 1);
                        const dot    = colorHex(p.color || '');
                        const isDone = prog?.completo;
                        return (
                          <div key={pi} style={{display:'grid',gridTemplateColumns:'36px 1fr auto',alignItems:'center',padding:'6px 14px',borderBottom:'1px solid var(--border)',background:'var(--surface)'}}>
                            {/* Cantidad */}
                            <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:'#333',textAlign:'center',background:'var(--bg2)',border:'1px solid var(--border)',width:'28px',height:'22px',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
                              {cant}
                            </span>
                            {/* Modelo + color */}
                            <div style={{paddingLeft:'10px'}}>
                              <span style={{fontSize:'12px',fontWeight:600,color:'var(--ink)'}}>{p.modelo || p.sku || '—'}</span>
                              {p.color && dot && (
                                <span style={{display:'inline-flex',alignItems:'center',gap:'3px',marginLeft:'6px'}}>
                                  <span style={{width:'7px',height:'7px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',display:'inline-block'}}/>
                                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888'}}>{p.color}</span>
                                </span>
                              )}
                              {p.tipoVenta && (
                                <span style={{marginLeft:'6px',fontFamily:'DM Mono,monospace',fontSize:'7px',background:p.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:p.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',padding:'0 4px'}}>
                                  {p.tipoVenta[0]}
                                </span>
                              )}
                            </div>
                            {/* Precio + empacado indicator */}
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              {p.precio > 0 && (
                                <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>€{p.precio}</span>
                              )}
                              {/* Indicador de empacado (solo visual, editable en modal) */}
                              {cmd.status === 'empacado' && (
                                <span style={{
                                  width:'16px',height:'16px',border:`1.5px solid ${isDone?'var(--green)':'var(--border)'}`,
                                  background:isDone?'var(--green)':'var(--bg2)',
                                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                                  fontSize:'10px',flexShrink:0,
                                }}>
                                  {isDone ? '✓' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Notas ── */}
            {cmd.notas && (
              <div style={{padding:'5px 14px',background:'#fffbeb',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#92400e',display:'flex',alignItems:'center',gap:'5px'}}>
                <span>📝</span><span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cmd.notas}</span>
              </div>
            )}

            {/* ── Footer: financiero ── */}
            <div style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',background:'var(--bg2)',borderTop:'1px solid var(--border)'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>
                💶 <strong style={{color:'var(--ink)'}}>€ {fmtNum(cmd.precio)}</strong>
              </span>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>
                ✅ <strong style={{color:'var(--green)'}}>€ {fmtNum(cmd.monto_pagado)}</strong>
              </span>
              {saldo > 0.01
                ? <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--red)',fontWeight:700}}>⏳ Saldo: € {fmtNum(saldo)}</span>
                : cmd.precio > 0 && <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700}}>✓ Pagada</span>
              }

              {/* Barra de pago */}
              {cmd.precio > 0 && (
                <div style={{flex:1,minWidth:'80px',height:'4px',background:'var(--border)',borderRadius:'2px',overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:pct>=100?'var(--green)':pct>50?'var(--warn)':'var(--red)',borderRadius:'2px',transition:'width .4s'}}/>
                </div>
              )}

              {/* Botón guía + progreso empacado */}
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginLeft:'auto'}}>
                {prog && prog.total > 0 && cmd.status === 'empacado' && (
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color: prog.completo?'var(--green)':'#3b82f6',fontWeight:700}}>
                    📦 {prog.empacado}/{prog.total}{prog.completo?' ✓':''}
                  </span>
                )}
                {(cmd.status === 'empacado' || cmd.status === 'enviado') && (
                  <button onClick={e=>{e.stopPropagation(); onShowTicket?.(cmd);}}
                    style={{padding:'4px 10px',background:'var(--surface)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',whiteSpace:'nowrap'}}>
                    🖨️ Guía
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
