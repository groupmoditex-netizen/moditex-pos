'use client';
import { useState } from 'react';

function fmtFecha(d) {
  if (!d) return '—';
  const p = (d || '').split('T')[0].split('-');
  return (p[2] || '') + '/' + (p[1] || '') + '/' + (p[0] || '');
}

const METODOS_ENVIO = ['Zoom', 'MRW', 'Delivery propio', 'Pick-up / Retiro', 'Domesa', 'Otro'];

// ── Guía de envío imprimible (sin precios, solo envío) ─────────────
function GuiaImpresa({ cmd, metodoEnvio, idx, total }) {
  let prods = cmd.productos;
  if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }
  if (!Array.isArray(prods)) prods = [];
  const cli = cmd._cliente;

  return (
    <div className="ticket-print-page" style={{
      pageBreakAfter: idx < total - 1 ? 'always' : 'auto',
      padding: '24px', maxWidth: '680px', margin: '0 auto',
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#111',
      border: '1px solid #ccc', marginBottom: idx < total - 1 ? '40px' : '0',
    }}>
      {/* Cabecera */}
      <div style={{ borderBottom: '3px solid #c0392b', paddingBottom: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '0.04em', color: '#c0392b' }}>MODITEX GROUP</div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', letterSpacing: '0.12em' }}>FABRICAMOS TU PROPIA MARCA DE ROPA · BARQUISIMETO</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Guía de Envío</div>
          <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#c0392b', marginTop: '2px' }}>{cmd.id}</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '3px' }}>{fmtFecha(cmd.fecha_creacion || cmd.created_at)}</div>
        </div>
      </div>

      {/* Destinatario */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '8px', fontFamily: 'monospace', fontWeight: 700 }}>Datos del Destinatario</div>
        <div style={{ border: '2px solid #c0392b', padding: '14px 16px', background: '#fafafa' }}>
          <div style={{ fontWeight: 900, fontSize: '18px', marginBottom: '6px' }}>{cmd.cliente || '—'}</div>
          {cli?.cedula   && <div style={{ fontSize: '12px', color: '#333', marginBottom: '3px' }}>C.I.: <strong>{cli.cedula}</strong></div>}
          {cli?.telefono && <div style={{ fontSize: '12px', color: '#333', marginBottom: '3px' }}>Tel: <strong>{cli.telefono}</strong></div>}
          {cli?.email    && <div style={{ fontSize: '11px', color: '#555', marginBottom: '3px' }}>{cli.email}</div>}
          {cli?.ciudad   && <div style={{ fontSize: '14px', fontWeight: 700, color: '#c0392b', marginTop: '8px' }}>📍 {cli.ciudad}</div>}
        </div>
      </div>

      {/* Método de envío */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '8px', fontFamily: 'monospace', fontWeight: 700 }}>Método de Envío</div>
        <div style={{ border: '1px solid #ddd', padding: '12px 16px', background: '#fff', fontSize: '14px', fontWeight: 700 }}>
          🚚 {metodoEnvio || 'No especificado'}
        </div>
      </div>

      {/* Contenido del paquete — sin precios */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '8px', fontFamily: 'monospace', fontWeight: 700 }}>
          Contenido del Paquete — {prods.length} ítem{prods.length !== 1 ? 's' : ''}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#c0392b', color: '#fff' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Producto</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, width: '60px' }}>Cant.</th>
            </tr>
          </thead>
          <tbody>
            {prods.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                  {p.modelo || p.sku || '—'}
                  {p.sku && <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#888', marginTop: '1px' }}>{p.sku}</div>}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>{p.cant || p.qty || 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cmd.notas && (
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b44', padding: '8px 11px', fontSize: '11px', color: '#666', marginBottom: '14px' }}>
          <strong style={{ color: '#92400e' }}>📝 Notas:</strong> {cmd.notas}
        </div>
      )}

      <div style={{ borderTop: '1px dashed #bbb', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }}>
        <span>moditex.group — Barquisimeto, Venezuela</span>
        <span style={{ fontFamily: 'monospace' }}>ID: {cmd.id}</span>
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────
export default function ModalTicketEnvio({ comandas, clientes = [], onClose }) {
  const esUnica = !Array.isArray(comandas);
  const lista   = esUnica ? [comandas] : comandas;

  const [seleccionadas, setSelec] = useState(() => new Set(lista.map(c => c.id)));
  const [vista, setVista]         = useState('lista');
  const [metodoMap, setMetodoMap] = useState({});

  const conCliente = lista.map(cmd => {
    const cli = clientes.find(c => c.id === cmd.cliente_id || c.nombre === cmd.cliente);
    return { ...cmd, _cliente: cli || null };
  });

  function toggleSel(id) {
    setSelec(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selArr = conCliente.filter(c => seleccionadas.has(c.id));

  function imprimir() {
    const styleId = '__ticket_print_style__';
    let style = document.getElementById(styleId);
    if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style); }
    style.textContent = `@media print { body > * { display: none !important; } #ticket-print-area { display: block !important; } #ticket-print-area .ticket-print-page { border: none !important; } @page { margin: 15mm; size: A4; } }`;

    let area = document.getElementById('ticket-print-area');
    if (!area) { area = document.createElement('div'); area.id = 'ticket-print-area'; area.style.display = 'none'; document.body.appendChild(area); }

    const fmtF = d => { if (!d) return '—'; const p = (d||'').split('T')[0].split('-'); return (p[2]||'')+'/'+(p[1]||'')+'/'+(p[0]||''); };

    area.innerHTML = selArr.map((cmd, idx) => {
      let prods = cmd.productos;
      if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }
      if (!Array.isArray(prods)) prods = [];
      const cli = cmd._cliente;
      const metodo = metodoMap[cmd.id] || '';

      return `
        <div style="page-break-after:${idx < selArr.length - 1 ? 'always' : 'auto'};padding:24px;max-width:680px;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;color:#111;">
          <div style="border-bottom:3px solid #c0392b;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;">
            <div><div style="font-size:22px;font-weight:900;letter-spacing:.04em;color:#c0392b;">MODITEX GROUP</div><div style="font-size:10px;color:#555;margin-top:2px;letter-spacing:.12em;">FABRICAMOS TU PROPIA MARCA DE ROPA · BARQUISIMETO</div></div>
            <div style="text-align:right;"><div style="font-size:9px;font-family:monospace;color:#888;letter-spacing:.1em;text-transform:uppercase;">Guía de Envío</div><div style="font-size:14px;font-weight:700;font-family:monospace;color:#c0392b;margin-top:2px;">${cmd.id}</div><div style="font-size:10px;color:#666;margin-top:3px;">${fmtF(cmd.fecha_creacion||cmd.created_at)}</div></div>
          </div>
          <div style="margin-bottom:18px;">
            <div style="font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#888;margin-bottom:8px;font-family:monospace;font-weight:700;">Datos del Destinatario</div>
            <div style="border:2px solid #c0392b;padding:14px 16px;background:#fafafa;">
              <div style="font-weight:900;font-size:18px;margin-bottom:6px;">${cmd.cliente||'—'}</div>
              ${cli?.cedula   ? `<div style="font-size:12px;color:#333;margin-bottom:3px;">C.I.: <strong>${cli.cedula}</strong></div>` : ''}
              ${cli?.telefono ? `<div style="font-size:12px;color:#333;margin-bottom:3px;">Tel: <strong>${cli.telefono}</strong></div>` : ''}
              ${cli?.email    ? `<div style="font-size:11px;color:#555;margin-bottom:3px;">${cli.email}</div>` : ''}
              ${cli?.ciudad   ? `<div style="font-size:14px;font-weight:700;color:#c0392b;margin-top:8px;">📍 ${cli.ciudad}</div>` : ''}
            </div>
          </div>
          <div style="margin-bottom:18px;">
            <div style="font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#888;margin-bottom:8px;font-family:monospace;font-weight:700;">Método de Envío</div>
            <div style="border:1px solid #ddd;padding:12px 16px;background:#fff;font-size:14px;font-weight:700;">🚚 ${metodo||'No especificado'}</div>
          </div>
          <div style="margin-bottom:18px;">
            <div style="font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#888;margin-bottom:8px;font-family:monospace;font-weight:700;">Contenido del Paquete — ${prods.length} ítem${prods.length!==1?'s':''}</div>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead><tr style="background:#c0392b;color:#fff;"><th style="padding:6px 8px;text-align:left;">Producto</th><th style="padding:6px 8px;text-align:center;width:60px;">Cant.</th></tr></thead>
              <tbody>${prods.map((p,i)=>`<tr style="border-bottom:1px solid #eee;background:${i%2===0?'#fff':'#fafafa'};"><td style="padding:6px 8px;font-weight:600;">${p.modelo||p.sku||'—'}<br><span style="font-family:monospace;font-size:9px;color:#888;">${p.sku||''}</span></td><td style="padding:6px 8px;text-align:center;font-weight:700;font-size:13px;">${p.cant||p.qty||1}</td></tr>`).join('')}</tbody>
            </table>
          </div>
          ${cmd.notas?`<div style="background:#fffbeb;border:1px solid #f59e0b44;padding:8px 11px;font-size:11px;color:#666;margin-bottom:14px;"><strong style="color:#92400e;">📝 Notas:</strong> ${cmd.notas}</div>`:''}
          <div style="border-top:1px dashed #bbb;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#888;"><span>moditex.group — Barquisimeto, Venezuela</span><span style="font-family:monospace;">ID: ${cmd.id}</span></div>
        </div>`;
    }).join('');

    window.print();
    setTimeout(() => { if (area) area.innerHTML = ''; if (style) style.textContent = ''; }, 2000);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'620px',maxHeight:'90vh',display:'flex',flexDirection:'column',borderTop:'2px solid #c0392b'}}>

        {/* Header */}
        <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>🖨️ Guías de Envío</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>{seleccionadas.size} de {lista.length} comanda{lista.length!==1?'s':''} seleccionada{seleccionadas.size!==1?'s':''}</div>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {!esUnica&&(
              <button onClick={()=>setVista(v=>v==='lista'?'preview':'lista')}
                style={{padding:'6px 12px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>
                {vista==='lista'?'👁 Vista Previa':'← Lista'}
              </button>
            )}
            <button onClick={imprimir} disabled={seleccionadas.size===0}
              style={{padding:'6px 16px',background:'#c0392b',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',opacity:seleccionadas.size===0?.4:1}}>
              🖨️ Imprimir ({seleccionadas.size})
            </button>
            <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>

          {(vista==='lista'||esUnica)&&(
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {!esUnica&&(
                <div style={{display:'flex',gap:'8px',marginBottom:'4px'}}>
                  <button onClick={()=>setSelec(new Set(lista.map(c=>c.id)))} style={{padding:'5px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>✓ Todas</button>
                  <button onClick={()=>setSelec(new Set())} style={{padding:'5px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>✕ Ninguna</button>
                </div>
              )}
              {conCliente.map(cmd=>{
                const isSel = seleccionadas.has(cmd.id);
                const cli   = cmd._cliente;
                return (
                  <div key={cmd.id} style={{border:`1px solid ${isSel?'#c0392b':'var(--border)'}`,background:isSel?'rgba(192,57,43,.04)':'var(--bg2)',padding:'12px 14px',transition:'all .12s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',cursor:esUnica?'default':'pointer',marginBottom:'10px'}}
                      onClick={()=>!esUnica&&toggleSel(cmd.id)}>
                      {!esUnica&&(
                        <div style={{width:'18px',height:'18px',border:`2px solid ${isSel?'#c0392b':'#ccc'}`,background:isSel?'#c0392b':'transparent',borderRadius:'3px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .12s'}}>
                          {isSel&&<span style={{color:'#fff',fontSize:'11px',fontWeight:700}}>✓</span>}
                        </div>
                      )}
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:'13px'}}>{cmd.cliente||'—'}</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'1px'}}>{cmd.id}</div>
                        {cli?.telefono&&<div style={{fontSize:'11px',color:'#555',marginTop:'2px'}}>📱 {cli.telefono}</div>}
                        {cli?.ciudad&&<div style={{fontSize:'11px',color:'#c0392b',fontWeight:600,marginTop:'2px'}}>📍 {cli.ciudad}</div>}
                      </div>
                    </div>
                    {/* Método de envío */}
                    <div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'5px'}}>Método de envío</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>
                        {METODOS_ENVIO.map(m=>(
                          <button key={m} onClick={()=>setMetodoMap(prev=>({...prev,[cmd.id]:m}))}
                            style={{padding:'4px 10px',border:`1px solid ${metodoMap[cmd.id]===m?'#c0392b':'var(--border)'}`,background:metodoMap[cmd.id]===m?'#c0392b':'var(--bg)',color:metodoMap[cmd.id]===m?'#fff':'#555',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:metodoMap[cmd.id]===m?700:400,transition:'all .12s'}}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {vista==='preview'&&!esUnica&&(
            <div>
              {selArr.length===0
                ?<div style={{textAlign:'center',padding:'40px',color:'#999',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Selecciona al menos una comanda para previsualizar</div>
                :selArr.map((cmd,idx)=><GuiaImpresa key={cmd.id} cmd={cmd} metodoEnvio={metodoMap[cmd.id]||''} idx={idx} total={selArr.length}/>)
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'11px 20px',borderTop:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>
            {seleccionadas.size>0?`Se imprimirán ${seleccionadas.size} guía${seleccionadas.size!==1?'s':''}.`:'Selecciona las comandas a imprimir.'}
          </div>
          <button onClick={imprimir} disabled={seleccionadas.size===0}
            style={{padding:'8px 20px',background:'#c0392b',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',opacity:seleccionadas.size===0?.4:1}}>
            🖨️ Imprimir Ahora
          </button>
        </div>
      </div>
    </div>
  );
}
