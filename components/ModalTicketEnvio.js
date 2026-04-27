'use client';
import { useState, useRef, useEffect } from 'react';

function fmtFecha(d) {
  if (!d) return '—';
  const p = (d || '').split('T')[0].split('-');
  return (p[2] || '') + '/' + (p[1] || '') + '/' + (p[0] || '');
}

const METODOS_ENVIO = ['Zoom', 'MRW', 'Delivery propio', 'Pick-up / Retiro', 'Domesa', 'Otro'];

const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.15em',textTransform:'uppercase',color:'#888',display:'block',marginBottom:'5px',fontWeight:700};
const inp = {width:'100%',padding:'8px 10px',background:'var(--bg)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',boxSizing:'border-box'};

// ── Vista previa de guía ─────────────────────────────────────────────────────
function GuiaPreview({ cmd, metodoEnvio, destino, receptor, items = [] }) {
  let prods = items;
  if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }
  if (!Array.isArray(prods)) prods = [];
  const cli = cmd._cliente;

  return (
    <div style={{padding:'20px',maxWidth:'620px',margin:'0 auto',fontFamily:'Arial,sans-serif',fontSize:'12px',color:'#111',border:'1px solid #ddd',background:'#fff'}}>
      {/* Cabecera */}
      <div style={{borderBottom:'3px solid #000',paddingBottom:'12px',marginBottom:'18px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:'20px',fontWeight:900,letterSpacing:'.04em',color:'#000'}}>MODITEX GROUP</div>
          <div style={{fontSize:'9px',color:'#555',marginTop:'2px',letterSpacing:'.12em'}}>FABRICAMOS TU PROPIA MARCA DE ROPA · BARQUISIMETO</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'8px',fontFamily:'monospace',color:'#888',letterSpacing:'.1em',textTransform:'uppercase'}}>Guía de Envío</div>
          <div style={{fontSize:'13px',fontWeight:700,fontFamily:'monospace',color:'#000',marginTop:'2px'}}>{cmd.id}</div>
          <div style={{fontSize:'9px',color:'#666',marginTop:'2px'}}>{fmtFecha(cmd.fecha_creacion||cmd.created_at)}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
        {/* Destinatario */}
        <div>
          <div style={{fontSize:'7px',letterSpacing:'.16em',textTransform:'uppercase',color:'#888',marginBottom:'6px',fontFamily:'monospace',fontWeight:700}}>Datos del Comprador</div>
          <div style={{border:'2px solid #C5A021',padding:'10px 12px',background:'#fafafa'}}>
            <div style={{fontWeight:900,fontSize:'15px',marginBottom:'5px'}}>{cmd.cliente||'—'}</div>
            {cli?.cedula   && <div style={{fontSize:'11px',color:'#333',marginBottom:'2px'}}>C.I.: <strong>{cli.cedula}</strong></div>}
            {cli?.telefono && <div style={{fontSize:'11px',color:'#333',marginBottom:'2px'}}>Tel: <strong>{cli.telefono}</strong></div>}
            {cli?.ciudad   && <div style={{fontSize:'12px',fontWeight:700,color:'#C5A021',marginTop:'5px'}}>📍 {cli.ciudad}</div>}
          </div>
        </div>
        {/* Envío */}
        <div>
          <div style={{fontSize:'7px',letterSpacing:'.16em',textTransform:'uppercase',color:'#888',marginBottom:'6px',fontFamily:'monospace',fontWeight:700}}>Detalles de Envío</div>
          <div style={{border:'1px solid #ddd',padding:'10px 12px',background:'#fafafa',fontSize:'11px',display:'flex',flexDirection:'column',gap:'5px'}}>
            <div><span style={{color:'#666'}}>Método: </span><strong>🚚 {metodoEnvio||'—'}</strong></div>
            {destino && <div><span style={{color:'#666'}}>Destino: </span><strong>{destino}</strong></div>}
            {receptor && <div style={{background:'#fff8e1',border:'1px solid #f59e0b44',padding:'4px 7px',marginTop:'2px'}}><span style={{color:'#92400e',fontWeight:700,fontSize:'10px'}}>Recibe: </span><strong>{receptor}</strong></div>}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{marginBottom:'12px'}}>
        <div style={{fontSize:'7px',letterSpacing:'.16em',textTransform:'uppercase',color:'#888',marginBottom:'6px',fontFamily:'monospace',fontWeight:700}}>
          Contenido del Paquete — {prods.length} ítem{prods.length!==1?'s':''}
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
          <thead>
            <tr style={{background:'#000',color:'#fff'}}>
              <th style={{padding:'5px 8px',textAlign:'left',fontWeight:600}}>Producto</th>
              <th style={{padding:'5px 8px',textAlign:'center',fontWeight:600,width:'55px'}}>Cant.</th>
            </tr>
          </thead>
          <tbody>
            {prods.map((p,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #eee',background:i%2===0?'#fff':'#fafafa'}}>
                <td style={{padding:'5px 8px',fontWeight:600}}>
                  {p.modelo||p.sku||'—'}
                  {p.sku&&<div style={{fontFamily:'monospace',fontSize:'9px',color:'#888',marginTop:'1px'}}>{p.sku}</div>}
                </td>
                <td style={{padding:'5px 8px',textAlign:'center',fontWeight:700,fontSize:'13px'}}>{p.cant||p.qty||1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cmd.notas&&<div style={{background:'#fffbeb',border:'1px solid #f59e0b44',padding:'7px 10px',fontSize:'10px',color:'#666',marginBottom:'10px'}}><strong style={{color:'#92400e'}}>📝 Notas:</strong> {cmd.notas}</div>}

      <div style={{borderTop:'1px dashed #bbb',paddingTop:'8px',display:'flex',justifyContent:'space-between',fontSize:'9px',color:'#888'}}>
        <span>moditex.group — Barquisimeto, Venezuela</span>
        <span style={{fontFamily:'monospace'}}>ID: {cmd.id}</span>
      </div>
    </div>
  );
}

// ── Modal principal ──────────────────────────────────────────────────────────
export default function ModalTicketEnvio({ comandas, clientes=[], onClose }) {
  const esUnica  = !Array.isArray(comandas);
  const lista    = esUnica ? [comandas] : comandas;

  const [buscar,       setBuscar]      = useState('');
  const [selec,        setSelec]       = useState(() => new Set(lista.map(c=>c.id)));
  const [metodoMap,    setMetodoMap]   = useState({});
  const [destinoMap,   setDestinoMap]  = useState({});
  const [receptorMap,  setReceptorMap] = useState({});
  const [vista,        setVista]       = useState('lista');
  const [itemsMap,     setItemsMap]    = useState({});
  const [loading,      setLoading]     = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/comandas/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: lista.map(c => c.id) })
    })
    .then(r => r.json())
    .then(d => {
      if (d.ok) setItemsMap(d.map || {});
      setLoading(false);
    });
  }, []);

  const conCliente = lista.map(cmd=>{
    const cli = clientes.find(c=>c.id===cmd.cliente_id||c.nombre===cmd.cliente);
    return {...cmd, _cliente:cli||null};
  });

  // Filtrar por búsqueda
  const listaFiltrada = buscar.trim()
    ? conCliente.filter(c=>`${c.id} ${c.cliente}`.toLowerCase().includes(buscar.toLowerCase()))
    : conCliente;

  function toggleSel(id){ setSelec(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;}); }

  const selArr = conCliente.filter(c=>selec.has(c.id));

  // ── Imprimir usando iframe (evita páginas en blanco) ──────────────
  function imprimir() {
    const fmtF = d=>{if(!d)return'—';const p=(d||'').split('T')[0].split('-');return(p[2]||'')+'/'+(p[1]||'')+'/'+(p[0]||'');};

    const html = selArr.map((cmd,idx)=>{
      let prods = itemsMap[cmd.id] || [];
      if(!Array.isArray(prods))prods=[];
      const cli=cmd._cliente;
      const metodo=metodoMap[cmd.id]||'';
      const destino=destinoMap[cmd.id]||'';
      const receptor=receptorMap[cmd.id]||'';

      return `
        <div style="page-break-inside:avoid;padding:22px 22px 40px;max-width:660px;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;color:#111;${idx<selArr.length-1?'border-bottom:1px dashed #ccc;margin-bottom:20px;':''}">
          <div style="border-bottom:3px solid #000;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:20px;font-weight:900;letter-spacing:.04em;color:#000;">MODITEX GROUP</div>
              <div style="font-size:9px;color:#555;margin-top:2px;letter-spacing:.12em;">FABRICAMOS TU PROPIA MARCA DE ROPA · BARQUISIMETO</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:8px;font-family:monospace;color:#888;letter-spacing:.1em;text-transform:uppercase;">Guía de Envío</div>
              <div style="font-size:13px;font-weight:700;font-family:monospace;color:#000;margin-top:2px;">${cmd.id}</div>
              <div style="font-size:9px;color:#666;margin-top:2px;">${fmtF(cmd.fecha_creacion||cmd.created_at)}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div>
              <div style="font-size:7px;letter-spacing:.16em;text-transform:uppercase;color:#888;margin-bottom:6px;font-family:monospace;font-weight:700;">Datos del Comprador</div>
              <div style="border:2px solid #C5A021;padding:10px 12px;background:#fafafa;">
                <div style="font-weight:900;font-size:15px;margin-bottom:5px;">${cmd.cliente||'—'}</div>
                ${cli?.cedula?`<div style="font-size:11px;color:#333;margin-bottom:2px;">C.I.: <strong>${cli.cedula}</strong></div>`:''}
                ${cli?.telefono?`<div style="font-size:11px;color:#333;margin-bottom:2px;">Tel: <strong>${cli.telefono}</strong></div>`:''}
                ${cli?.ciudad?`<div style="font-size:12px;font-weight:700;color:#C5A021;margin-top:5px;">📍 ${cli.ciudad}</div>`:''}
              </div>
            </div>
            <div>
              <div style="font-size:7px;letter-spacing:.16em;text-transform:uppercase;color:#888;margin-bottom:6px;font-family:monospace;font-weight:700;">Detalles de Envío</div>
              <div style="border:1px solid #ddd;padding:10px 12px;background:#fafafa;font-size:11px;">
                <div style="margin-bottom:4px;"><span style="color:#666;">Método: </span><strong>🚚 ${metodo||'—'}</strong></div>
                ${destino?`<div style="margin-bottom:4px;"><span style="color:#666;">Destino: </span><strong>${destino}</strong></div>`:''}
                ${receptor?`<div style="background:#fff8e1;border:1px solid #f59e0b44;padding:4px 7px;margin-top:4px;"><span style="color:#92400e;font-weight:700;font-size:10px;">Recibe: </span><strong>${receptor}</strong></div>`:''}
              </div>
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <div style="font-size:7px;letter-spacing:.16em;text-transform:uppercase;color:#888;margin-bottom:6px;font-family:monospace;font-weight:700;">Contenido — ${prods.length} ítem${prods.length!==1?'s':''}</div>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead><tr style="background:#000;color:#fff;"><th style="padding:5px 8px;text-align:left;">Producto</th><th style="padding:5px 8px;text-align:center;width:55px;">Cant.</th></tr></thead>
              <tbody>${prods.map((p,i)=>`<tr style="border-bottom:1px solid #eee;background:${i%2===0?'#fff':'#fafafa'};"><td style="padding:5px 8px;font-weight:600;">${p.modelo||p.sku||'—'}<br><span style="font-family:monospace;font-size:9px;color:#888;">${p.sku||''}</span></td><td style="padding:5px 8px;text-align:center;font-weight:700;font-size:13px;">${p.cant||p.qty||1}</td></tr>`).join('')}</tbody>
            </table>
          </div>
          ${cmd.notas?`<div style="background:#fffbeb;border:1px solid #f59e0b44;padding:7px 10px;font-size:10px;color:#666;margin-bottom:10px;"><strong style="color:#92400e;">📝 Notas:</strong> ${cmd.notas}</div>`:''}
          <div style="border-top:1px dashed #bbb;padding-top:8px;display:flex;justify-content:space-between;font-size:9px;color:#888;">
            <span>moditex.group — Barquisimeto, Venezuela</span>
            <span style="font-family:monospace;">ID: ${cmd.id}</span>
          </div>
        </div>`;
    }).join('');

    // Escribir en iframe y luego imprimir — evita páginas en blanco
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #fff; }
      @page { margin: 12mm; size: A4; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>${html}</body></html>`);
    doc.close();
    setTimeout(() => iframe.contentWindow.print(), 300);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>

      {/* iframe oculto para impresión limpia */}
      <iframe ref={iframeRef} style={{position:'absolute',left:'-9999px',top:0,width:'800px',height:'600px',border:'none'}} title="print"/>

      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'680px',maxHeight:'92vh',display:'flex',flexDirection:'column',borderTop:'2px solid #000'}}>

        {/* Header */}
        <div style={{padding:'13px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>🖨️ Guías de Envío</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>{selec.size} de {lista.length} seleccionada{selec.size!==1?'s':''}</div>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {!esUnica&&<button onClick={()=>setVista(v=>v==='lista'?'preview':'lista')} style={{padding:'6px 12px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase'}}>{vista==='lista'?'👁 Vista Previa':'← Lista'}</button>}
            <button onClick={imprimir} disabled={selec.size===0} style={{padding:'6px 16px',background:'#000',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',opacity:selec.size===0?.4:1}}>🖨️ Imprimir ({selec.size})</button>
            <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>

        {/* Buscador */}
        {!esUnica&&(
          <div style={{padding:'10px 18px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px'}}>
              <span style={{color:'#555',fontSize:'13px'}}>🔍</span>
              <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por ID de comanda o nombre del cliente…"
                style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',width:'100%'}}/>
              {buscar&&<button onMouseDown={e=>{e.preventDefault();setBuscar('');}} style={{background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:'13px',padding:0}}>✕</button>}
            </div>
          </div>
        )}

        {/* Contenido */}
        <div style={{flex:1,overflowY:'auto',padding:'14px 18px'}}>

          {/* LISTA */}
          {loading ? (
            <div style={{padding:'50px',textAlign:'center',color:'#888',fontFamily:'DM Mono,monospace',fontSize:'12px'}}>
              ⏳ Preparando datos de impresión...
            </div>
          ) : (vista==='lista'||esUnica)&&(
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {!esUnica&&(
                <div style={{display:'flex',gap:'8px',marginBottom:'2px'}}>
                  <button onClick={()=>setSelec(new Set(listaFiltrada.map(c=>c.id)))} style={{padding:'4px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>✓ Todas</button>
                  <button onClick={()=>setSelec(new Set())} style={{padding:'4px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>✕ Ninguna</button>
                </div>
              )}

              {listaFiltrada.length===0&&(
                <div style={{textAlign:'center',padding:'32px',color:'#999',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Sin resultados para "{buscar}"</div>
              )}

              {listaFiltrada.map(cmd=>{
                const isSel = selec.has(cmd.id);
                const cli   = cmd._cliente;
                return (
                  <div key={cmd.id} style={{border:`1px solid ${isSel?'#000':'var(--border)'}`,background:isSel?'rgba(0,0,0,.03)':'var(--bg2)',padding:'12px 14px',transition:'all .12s'}}>
                    {/* Fila superior — selección */}
                    <div style={{display:'flex',alignItems:'center',gap:'10px',cursor:esUnica?'default':'pointer',marginBottom:'11px'}} onClick={()=>!esUnica&&toggleSel(cmd.id)}>
                      {!esUnica&&(
                        <div style={{width:'18px',height:'18px',border:`2px solid ${isSel?'#000':'#ccc'}`,background:isSel?'#000':'transparent',borderRadius:'3px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .12s'}}>
                          {isSel&&<span style={{color:'#fff',fontSize:'11px',fontWeight:700}}>✓</span>}
                        </div>
                      )}
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:'13px'}}>{cmd.cliente||'—'}</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'1px'}}>{cmd.id}</div>
                        {cli?.telefono&&<div style={{fontSize:'11px',color:'#555',marginTop:'2px'}}>📱 {cli.telefono}</div>}
                        {cli?.ciudad&&<div style={{fontSize:'11px',color:'#C5A021',fontWeight:600,marginTop:'2px'}}>📍 {cli.ciudad}</div>}
                      </div>
                    </div>

                    {/* Método de envío */}
                    <div style={{marginBottom:'10px'}}>
                      <div style={lbl}>Método de envío</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>
                        {METODOS_ENVIO.map(m=>(
                          <button key={m} onClick={()=>setMetodoMap(prev=>({...prev,[cmd.id]:m}))}
                            style={{padding:'4px 10px',border:`1px solid ${metodoMap[cmd.id]===m?'#000':'var(--border)'}`,background:metodoMap[cmd.id]===m?'#000':'var(--bg)',color:metodoMap[cmd.id]===m?'#fff':'#555',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:metodoMap[cmd.id]===m?700:400,transition:'all .12s'}}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Destino */}
                    <div style={{marginBottom:'8px'}}>
                      <label style={lbl}>Destino / Dirección (opcional)</label>
                      <input value={destinoMap[cmd.id]||''} onChange={e=>setDestinoMap(prev=>({...prev,[cmd.id]:e.target.value}))}
                        placeholder="Ciudad, sector, dirección de entrega…" style={inp}/>
                    </div>

                    {/* Receptor opcional */}
                    <div>
                      <label style={lbl}>Quien recibe (si no es el comprador — opcional)</label>
                      <input value={receptorMap[cmd.id]||''} onChange={e=>setReceptorMap(prev=>({...prev,[cmd.id]:e.target.value}))}
                        placeholder="Nombre del receptor + teléfono…" style={inp}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISTA PREVIA */}
          {vista==='preview'&&!esUnica&&(
            <div>
              {selArr.length===0
                ?<div style={{textAlign:'center',padding:'40px',color:'#999',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Selecciona al menos una comanda</div>
                :selArr.map((cmd,idx)=>(
                  <div key={cmd.id} style={{marginBottom: idx<selArr.length-1?'32px':0}}>
                    <GuiaPreview cmd={cmd} items={itemsMap[cmd.id]} metodoEnvio={metodoMap[cmd.id]||''} destino={destinoMap[cmd.id]||''} receptor={receptorMap[cmd.id]||''}/>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'11px 18px',borderTop:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>
            {selec.size>0?`Se imprimirán ${selec.size} guía${selec.size!==1?'s':''}.`:'Selecciona las comandas a imprimir.'}
          </div>
          <button onClick={imprimir} disabled={selec.size===0}
            style={{padding:'8px 20px',background:'#000',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',opacity:selec.size===0?.4:1}}>
            🖨️ Imprimir Ahora
          </button>
        </div>
      </div>
    </div>
  );
}
