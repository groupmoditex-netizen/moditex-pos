'use client';
import { useState } from 'react';

// ── Colores helpers ────────────────────────────────────────────────────────
const CM={BLANCO:'#d0d0d0',NEGRO:'#1a1a1a',AZUL:'#3b6fd4',ROJO:'#d63b3b',VERDE:'#2d9e4a',ROSA:'#f07aa0',GRIS:'#6b7280',AMARILLO:'#f5c842',NARANJA:'#f57c42',MORADO:'#7c4fd4',VINOTINTO:'#8b2035',BEIGE:'#d4b896',CORAL:'#f26e5b',CELESTE:'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return CM[k]||CM[k.split(' ')[0]]||'#9ca3af';}
function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtFecha(d){if(!d)return '—';const p=(d||'').split('T')[0].split('-');return(p[2]||'')+'/'+(p[1]||'')+'/'+(p[0]||'');}

// ── Ticket individual (diseño imprimible) ─────────────────────────────────
function TicketImpreso({ cmd, idx, total }) {
  let prods = cmd.productos;
  if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }
  if (!Array.isArray(prods)) prods = [];

  const totalProd = prods.reduce((a, p) => a + (parseFloat(p.precio || p.precioDetal || 0) * (parseInt(p.cant || p.qty || 1))), 0);
  const saldo     = totalProd - parseFloat(cmd.monto_pagado || 0);

  return (
    <div className="ticket-print-page" style={{
      pageBreakAfter: idx < total - 1 ? 'always' : 'auto',
      padding: '20px',
      maxWidth: '680px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#111',
      border: '1px solid #ccc',
      marginBottom: idx < total - 1 ? '40px' : '0',
    }}>

      {/* Cabecera empresa */}
      <div style={{ borderBottom: '3px solid #c0392b', paddingBottom: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '0.04em', color: '#c0392b' }}>
              MODITEX GROUP
            </div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '2px', letterSpacing: '0.12em' }}>
              FABRICAMOS TU PROPIA MARCA DE ROPA · BARQUISIMETO
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#888', letterSpacing: '0.08em' }}>GUÍA DE ENVÍO</div>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#c0392b' }}>{cmd.id}</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '3px' }}>
              {fmtFecha(cmd.fecha_creacion || cmd.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Datos del destinatario */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '6px', fontFamily: 'monospace' }}>
            DATOS DEL DESTINATARIO
          </div>
          <div style={{ border: '1px solid #ddd', padding: '10px 12px', background: '#fafafa' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{cmd.cliente || '—'}</div>
            {cmd._cliente && (
              <>
                {cmd._cliente.cedula   && <div style={{ fontSize: '11px', color: '#444' }}>C.I.: {cmd._cliente.cedula}</div>}
                {cmd._cliente.telefono && <div style={{ fontSize: '11px', color: '#444' }}>Tel: {cmd._cliente.telefono}</div>}
                {cmd._cliente.email    && <div style={{ fontSize: '11px', color: '#444' }}>{cmd._cliente.email}</div>}
                {cmd._cliente.ciudad   && <div style={{ fontSize: '12px', fontWeight: 600, color: '#c0392b', marginTop: '5px' }}>📍 {cmd._cliente.ciudad}</div>}
              </>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '6px', fontFamily: 'monospace' }}>
            DETALLES DEL PEDIDO
          </div>
          <div style={{ border: '1px solid #ddd', padding: '10px 12px', background: '#fafafa', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#666' }}>Estado:</span>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', color: cmd.status === 'entregado' ? '#16a34a' : cmd.status === 'listo' ? '#2563eb' : '#d97706' }}>
                {cmd.status}
              </span>
            </div>
            {cmd.fecha_entrega && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>Entrega:</span>
                <span style={{ fontWeight: 600 }}>{fmtFecha(cmd.fecha_entrega)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#666' }}>Total:</span>
              <span style={{ fontWeight: 700, color: '#c0392b' }}>€ {fmtNum(totalProd)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#666' }}>Pagado:</span>
              <span style={{ fontWeight: 600, color: '#16a34a' }}>€ {fmtNum(cmd.monto_pagado || 0)}</span>
            </div>
            {saldo > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '4px', marginTop: '4px' }}>
                <span style={{ color: '#c0392b', fontWeight: 600 }}>Saldo:</span>
                <span style={{ fontWeight: 700, color: '#c0392b' }}>€ {fmtNum(saldo)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Productos */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '6px', fontFamily: 'monospace' }}>
          DETALLE DEL PEDIDO ({prods.length} ítem{prods.length !== 1 ? 's' : ''})
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#c0392b', color: '#fff' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, letterSpacing: '0.06em' }}>Producto</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, width: '40px' }}>Cant</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, width: '80px' }}>Precio</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, width: '80px' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {prods.map((p, i) => {
              const precio = parseFloat(p.precio || p.precioDetal || 0);
              const cant   = parseInt(p.cant || p.qty || 1);
              const sub    = precio * cant;
              return (
                <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <div style={{ fontWeight: 600 }}>
                      {p.color && (
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: colorHex(p.color), border: '1px solid rgba(0,0,0,.15)', marginRight: '5px', verticalAlign: 'middle' }} />
                      )}
                      {p.modelo || p.sku || '—'}
                    </div>
                    {p.sku && <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#888', marginTop: '1px' }}>{p.sku}</div>}
                    {p.tipoVenta && p.tipoVenta !== 'DETAL' && (
                      <div style={{ fontSize: '9px', color: '#2563eb', marginTop: '1px' }}>Venta Mayor</div>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{cant}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>€ {fmtNum(precio)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>€ {fmtNum(sub)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f5f5f5', borderTop: '2px solid #c0392b' }}>
              <td colSpan={3} style={{ padding: '7px 8px', fontWeight: 700, textAlign: 'right', fontSize: '12px' }}>TOTAL</td>
              <td style={{ padding: '7px 8px', fontWeight: 700, textAlign: 'right', fontSize: '13px', color: '#c0392b' }}>€ {fmtNum(totalProd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notas */}
      {cmd.notas && (
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b44', padding: '8px 11px', fontSize: '11px', color: '#666', marginBottom: '12px' }}>
          <span style={{ fontWeight: 600, color: '#92400e', marginRight: '6px' }}>📝 Notas:</span>
          {cmd.notas}
        </div>
      )}

      {/* Pie de ticket */}
      <div style={{ borderTop: '1px dashed #bbb', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }}>
        <span>moditex.group — Barquisimeto, Venezuela</span>
        <span style={{ fontFamily: 'monospace' }}>ID: {cmd.id}</span>
      </div>
    </div>
  );
}

// ── Modal principal con selección y previsualización ──────────────────────
export default function ModalTicketEnvio({ comandas, clientes = [], onClose }) {
  // Si viene una sola comanda, seleccionarla por defecto
  const esUnica = !Array.isArray(comandas);
  const lista   = esUnica ? [comandas] : comandas;

  const [seleccionadas, setSelec] = useState(() => new Set(lista.map(c => c.id)));
  const [vista, setVista]         = useState('lista'); // 'lista' | 'preview'

  // Enriquecer comandas con datos de clientes
  const conCliente = lista.map(cmd => {
    const cli = clientes.find(c => c.id === cmd.cliente_id || c.nombre === cmd.cliente);
    return { ...cmd, _cliente: cli || null };
  });

  function toggleSel(id) {
    setSelec(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const selArr = conCliente.filter(c => seleccionadas.has(c.id));

  function imprimir() {
    // Inyectar estilos de impresión temporalmente
    const styleId = '__ticket_print_style__';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      @media print {
        body > * { display: none !important; }
        #ticket-print-area { display: block !important; }
        #ticket-print-area .ticket-print-page { border: none !important; }
        @page { margin: 15mm; size: A4; }
      }
    `;

    // Crear área de impresión
    let area = document.getElementById('ticket-print-area');
    if (!area) {
      area = document.createElement('div');
      area.id = 'ticket-print-area';
      area.style.display = 'none';
      document.body.appendChild(area);
    }

    // Renderizar tickets en el área
    // Usamos innerHTML con datos simples para máxima compatibilidad
    area.innerHTML = selArr.map((cmd, idx) => {
      let prods = cmd.productos;
      if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }
      if (!Array.isArray(prods)) prods = [];
      const totalProd = prods.reduce((a, p) => a + (parseFloat(p.precio || p.precioDetal || 0) * parseInt(p.cant || p.qty || 1)), 0);
      const saldo = totalProd - parseFloat(cmd.monto_pagado || 0);
      const cli = cmd._cliente;

      const fmtN = n => Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
      const fmtF = d => { if(!d) return '—'; const p=(d||'').split('T')[0].split('-'); return(p[2]||'')+'/'+(p[1]||'')+'/'+(p[0]||''); };

      return `
        <div style="page-break-after:${idx < selArr.length-1?'always':'auto'};padding:20px;max-width:680px;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;color:#111;">
          <div style="border-bottom:3px solid #c0392b;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:22px;font-weight:900;letter-spacing:.04em;color:#c0392b;">MODITEX GROUP</div>
              <div style="font-size:10px;color:#555;margin-top:2px;letter-spacing:.12em;">FABRICAMOS TU PROPIA MARCA DE ROPA · BARQUISIMETO</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:10px;font-family:monospace;color:#888;letter-spacing:.08em;">GUÍA DE ENVÍO</div>
              <div style="font-size:14px;font-weight:700;font-family:monospace;color:#c0392b;">${cmd.id}</div>
              <div style="font-size:10px;color:#666;margin-top:3px;">${fmtF(cmd.fecha_creacion||cmd.created_at)}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
            <div>
              <div style="font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#888;margin-bottom:6px;font-family:monospace;">DATOS DEL DESTINATARIO</div>
              <div style="border:1px solid #ddd;padding:10px 12px;background:#fafafa;">
                <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${cmd.cliente||'—'}</div>
                ${cli?.cedula   ? `<div style="font-size:11px;color:#444;">C.I.: ${cli.cedula}</div>` : ''}
                ${cli?.telefono ? `<div style="font-size:11px;color:#444;">Tel: ${cli.telefono}</div>` : ''}
                ${cli?.email    ? `<div style="font-size:11px;color:#444;">${cli.email}</div>` : ''}
                ${cli?.ciudad   ? `<div style="font-size:12px;font-weight:600;color:#c0392b;margin-top:5px;">📍 ${cli.ciudad}</div>` : ''}
              </div>
            </div>
            <div>
              <div style="font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#888;margin-bottom:6px;font-family:monospace;">DETALLES DEL PEDIDO</div>
              <div style="border:1px solid #ddd;padding:10px 12px;background:#fafafa;font-size:11px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#666">Estado:</span><strong style="text-transform:uppercase">${cmd.status}</strong></div>
                ${cmd.fecha_entrega ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#666">Entrega:</span><strong>${fmtF(cmd.fecha_entrega)}</strong></div>` : ''}
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#666">Total:</span><strong style="color:#c0392b">€ ${fmtN(totalProd)}</strong></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#666">Pagado:</span><strong style="color:#16a34a">€ ${fmtN(cmd.monto_pagado||0)}</strong></div>
                ${saldo > 0 ? `<div style="display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:4px;margin-top:4px;"><span style="color:#c0392b;font-weight:600">Saldo:</span><strong style="color:#c0392b">€ ${fmtN(saldo)}</strong></div>` : ''}
              </div>
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <div style="font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:#888;margin-bottom:6px;font-family:monospace;">DETALLE DEL PEDIDO (${prods.length} ítems)</div>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead><tr style="background:#c0392b;color:#fff;">
                <th style="padding:6px 8px;text-align:left;">Producto</th>
                <th style="padding:6px 8px;text-align:center;width:40px;">Cant</th>
                <th style="padding:6px 8px;text-align:right;width:80px;">Precio</th>
                <th style="padding:6px 8px;text-align:right;width:80px;">Subtotal</th>
              </tr></thead>
              <tbody>
                ${prods.map((p,i)=>{
                  const precio=parseFloat(p.precio||p.precioDetal||0);
                  const cant=parseInt(p.cant||p.qty||1);
                  return `<tr style="border-bottom:1px solid #eee;background:${i%2===0?'#fff':'#fafafa'}">
                    <td style="padding:6px 8px;font-weight:600;">${p.modelo||p.sku||'—'}<br><span style="font-family:monospace;font-size:9px;color:#888;">${p.sku||''}</span></td>
                    <td style="padding:6px 8px;text-align:center;font-weight:700;">${cant}</td>
                    <td style="padding:6px 8px;text-align:right;">€ ${fmtN(precio)}</td>
                    <td style="padding:6px 8px;text-align:right;font-weight:600;">€ ${fmtN(precio*cant)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
              <tfoot><tr style="background:#f5f5f5;border-top:2px solid #c0392b;">
                <td colspan="3" style="padding:7px 8px;font-weight:700;text-align:right;font-size:12px;">TOTAL</td>
                <td style="padding:7px 8px;font-weight:700;text-align:right;font-size:13px;color:#c0392b;">€ ${fmtN(totalProd)}</td>
              </tr></tfoot>
            </table>
          </div>
          ${cmd.notas ? `<div style="background:#fffbeb;border:1px solid #f59e0b44;padding:8px 11px;font-size:11px;color:#666;margin-bottom:12px;"><strong style="color:#92400e;">📝 Notas:</strong> ${cmd.notas}</div>` : ''}
          <div style="border-top:1px dashed #bbb;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#888;">
            <span>moditex.group — Barquisimeto, Venezuela</span>
            <span style="font-family:monospace;">ID: ${cmd.id}</span>
          </div>
        </div>`;
    }).join('');

    window.print();

    // Limpiar después de imprimir
    setTimeout(() => {
      if (area) area.innerHTML = '';
      if (style) style.textContent = '';
    }, 2000);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'720px',maxHeight:'90vh',display:'flex',flexDirection:'column',borderTop:'2px solid #c0392b'}}>

        {/* Header */}
        <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>🖨️ Guías de Envío</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>{seleccionadas.size} de {lista.length} comanda{lista.length!==1?'s':''} seleccionada{seleccionadas.size!==1?'s':''}</div>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {!esUnica && (
              <>
                <button onClick={()=>setVista(v=>v==='lista'?'preview':'lista')} style={{padding:'6px 12px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>
                  {vista==='lista'?'👁 Vista Previa':'← Lista'}
                </button>
              </>
            )}
            <button onClick={imprimir} disabled={seleccionadas.size===0} style={{padding:'6px 16px',background:'#c0392b',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',opacity:seleccionadas.size===0?.4:1}}>
              🖨️ Imprimir ({seleccionadas.size})
            </button>
            <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>

          {/* Modo lista (selección) */}
          {(vista==='lista' || esUnica) && (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {!esUnica && (
                <div style={{display:'flex',gap:'8px',marginBottom:'6px'}}>
                  <button onClick={()=>setSelec(new Set(lista.map(c=>c.id)))} style={{padding:'5px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>✓ Todas</button>
                  <button onClick={()=>setSelec(new Set())} style={{padding:'5px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>✕ Ninguna</button>
                </div>
              )}
              {conCliente.map(cmd => {
                let prods = cmd.productos;
                if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }
                if (!Array.isArray(prods)) prods = [];
                const isSel = seleccionadas.has(cmd.id);
                const cli = cmd._cliente;
                return (
                  <div key={cmd.id} onClick={()=>!esUnica&&toggleSel(cmd.id)} style={{
                    border: `1px solid ${isSel ? '#c0392b' : 'var(--border)'}`,
                    background: isSel ? 'rgba(192,57,43,.04)' : 'var(--bg2)',
                    padding: '11px 14px',
                    cursor: esUnica ? 'default' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all .12s',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1}}>
                      {!esUnica && (
                        <div style={{width:'18px',height:'18px',border:`2px solid ${isSel?'#c0392b':'#ccc'}`,background:isSel?'#c0392b':'transparent',borderRadius:'3px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .12s'}}>
                          {isSel && <span style={{color:'#fff',fontSize:'11px',fontWeight:700}}>✓</span>}
                        </div>
                      )}
                      <div>
                        <div style={{fontWeight:700,fontSize:'13px'}}>{cmd.cliente}</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'1px'}}>{cmd.id}</div>
                        {cli?.ciudad && <div style={{fontSize:'10px',color:'#c0392b',marginTop:'2px'}}>📍 {cli.ciudad}</div>}
                        {cli?.telefono && <div style={{fontSize:'10px',color:'#666'}}>📱 {cli.telefono}</div>}
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:'13px',fontWeight:700,color:'#c0392b'}}>€ {fmtNum(cmd.precio || 0)}</div>
                      <div style={{fontSize:'10px',color:'#888',marginTop:'2px'}}>{prods.length} ítem{prods.length!==1?'s':''}</div>
                      {cmd.fecha_entrega && <div style={{fontSize:'9px',color:'#666',fontFamily:'DM Mono,monospace',marginTop:'2px'}}>{fmtFecha(cmd.fecha_entrega)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modo preview */}
          {vista==='preview' && !esUnica && (
            <div>
              {selArr.length === 0
                ? <div style={{textAlign:'center',padding:'40px',color:'#999',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Selecciona al menos una comanda para previsualizar</div>
                : selArr.map((cmd, idx) => <TicketImpreso key={cmd.id} cmd={cmd} idx={idx} total={selArr.length} />)
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'11px 20px',borderTop:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>
            {seleccionadas.size > 0
              ? `Se imprimirán ${seleccionadas.size} guía${seleccionadas.size!==1?'s':''}. Asegúrate que el cliente tiene datos registrados.`
              : 'Selecciona las comandas que deseas imprimir.'}
          </div>
          <button onClick={imprimir} disabled={seleccionadas.size===0} style={{padding:'8px 20px',background:'#c0392b',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',opacity:seleccionadas.size===0?.4:1}}>
            🖨️ Imprimir Ahora
          </button>
        </div>
      </div>
    </div>
  );
}
