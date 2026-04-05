'use client';
import { colorHex } from '@/utils/colores';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { fetchApi } from '@/utils/fetchApi';

const COLOR_MOV = { ENTRADA: 'var(--green)', SALIDA: 'var(--red)' };

function fmtF(d) {
  if (!d) return '—';
  const p = String(d).split('T')[0].split('-');
  return (p[2] || '') + '/' + (p[1] || '') + '/' + (p[0] || '');
}

export default function HistorialPage() {
  const ctx      = useAppData() || {};
  const ctxProds = ctx.data?.productos || [];

  const [productos,   setProductos]   = useState(ctxProds);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [total,       setTotal]       = useState(0);
  const [pagina,      setPagina]      = useState(1);
  const [totalPags,   setTotalPags]   = useState(1);

  const [buscar, setBuscar] = useState('');
  const [tipo,   setTipo]   = useState('');
  const [cat,    setCat]    = useState('');
  const [desde,  setDesde]  = useState('');
  const [hasta,  setHasta]  = useState('');

  // ── Edición inline ────────────────────────────────────────────────
  const [editando,   setEditando]  = useState(null); // { id, sku, cantidad, concepto, fecha, tipo }
  const [guardandoE, setGuardandoE]= useState(false);
  const [msgE,       setMsgE]      = useState(null);
  const [skuBuscar,  setSkuBuscar] = useState('');   // búsqueda de nuevo SKU al editar

  // Productos filtrados para el buscador de SKU en el modal de edición
  const skuResultados = useMemo(() => {
    if (!skuBuscar || skuBuscar.length < 2) return [];
    const q = skuBuscar.toLowerCase();
    return productos.filter(p =>
      `${p.sku} ${p.modelo} ${p.color}`.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [skuBuscar, productos]);

  function abrirEdicion(m) {
    setEditando({ id: m.id, sku: m.sku, cantidad: m.cantidad, concepto: m.concepto, fecha: m.fecha, tipo: m.tipo });
    setSkuBuscar('');
  }

  async function guardarEdicion() {
    if (!editando) return;
    setGuardandoE(true);
    try {
      const res = await fetch('/api/movimientos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando),
      }).then(r => r.json());
      if (res.ok) {
        setMsgE({ t: 'ok', m: '✓ Movimiento actualizado' });
        setEditando(null);
        cargarMovimientos(pagina);
      } else {
        setMsgE({ t: 'err', m: res.error || 'Error al guardar' });
      }
    } catch(e) { setMsgE({ t: 'err', m: 'Error de conexión' }); }
    setGuardandoE(false);
    setTimeout(() => setMsgE(null), 3500);
  }

  async function eliminarMovimiento(id, sku, tipo, cantidad) {
    if (!confirm(`¿Eliminar este movimiento?\n${tipo} ${cantidad} uds de ${sku}\n\nEl inventario se recalculará automáticamente.`)) return;
    try {
      const res = await fetch(`/api/movimientos?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) {
        setMsgE({ t: 'ok', m: `✓ Movimiento ${id} eliminado. Inventario recalculado.` });
        cargarMovimientos(pagina);
      } else {
        setMsgE({ t: 'err', m: res.error || 'Error al eliminar' });
      }
    } catch(e) { setMsgE({ t: 'err', m: 'Error de conexión' }); }
    setTimeout(() => setMsgE(null), 4000);
  }

  const LIMIT = 25;

  const cargarMovimientos = useCallback(async (pag = 1) => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page: String(pag), limit: String(LIMIT) });
      if (tipo)  params.set('tipo',  tipo);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);

      const res = await fetchApi(`/api/movimientos?${params}`).then(r => r.json());

      if (res.ok) {
        setMovimientos((res.data || []).map(m => ({
          id: m.id || '', fecha: m.fecha ? String(m.fecha).split('T')[0] : '',
          sku: m.sku || '', tipo: m.tipo || '', cantidad: m.cantidad || 0,
          concepto: m.concepto || '', contacto: m.contacto || '',
          tipoVenta: m.tipo_venta || '', precioVenta: m.precio_venta || 0,
          clienteId: m.cliente_id || '', createdAt: m.created_at || '',
        })));
        setTotal(res.total || 0);
        setTotalPags(res.pages || 1);
      }
    } catch (e) {
      console.warn('[Historial] Error:', e.message);
    }
    setCargando(false);
  }, [tipo, desde, hasta]);

  useEffect(() => { setPagina(1); cargarMovimientos(1); }, [cargarMovimientos]);
  useEffect(() => { cargarMovimientos(pagina); }, [pagina]);
  useEffect(() => { if (ctxProds.length > 0) setProductos(ctxProds); }, [ctxProds.length]);
  useEffect(() => {
    if (ctxProds.length === 0 && productos.length === 0) {
      fetchApi('/api/productos').then(r => r.json())
        .then(d => { if (Array.isArray(d)) setProductos(d); }).catch(() => {});
    }
  }, []);

  const categorias = useMemo(() =>
    [...new Set(productos.map(p => p.categoria))].filter(Boolean).sort(), [productos]);

  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return movimientos.filter(m => {
      const p = productos.find(x => x.sku === m.sku);
      if (q && !`${m.sku} ${m.concepto} ${m.contacto} ${p?.modelo||''} ${p?.color||''}`.toLowerCase().includes(q)) return false;
      if (cat && p?.categoria !== cat) return false;
      return true;
    });
  }, [movimientos, productos, buscar, cat]);

  function exportCSV() {
    const hdr = ['ID','Fecha','SKU','Categoría','Modelo','Color','Tipo','Tipo Venta','Cantidad','Precio €','Concepto','Cliente'];
    const rows = filtrados.map(m => {
      const p = productos.find(x => x.sku === m.sku);
      return [m.id, m.fecha, m.sku, p?.categoria||'', p?.modelo||'', p?.color||'',
        m.tipo, m.tipoVenta, m.cantidad, m.precioVenta||0, m.concepto, m.contacto];
    });
    const csv = [hdr, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'}));
    a.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const inp = {padding:'7px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',outline:'none'};

  return (
    <Shell title="Historial de Movimientos">

      {/* ── Modal edición de movimiento ───────────────────────────── */}
      {editando && (() => {
        const prodActual = productos.find(p => p.sku === editando.sku);
        return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}
          onClick={e=>{if(e.target===e.currentTarget){setEditando(null);setSkuBuscar('');}}}>
          <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'500px',borderTop:'3px solid #f59e0b'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>✏️ Editar Movimiento</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>{editando.id}</div>
              </div>
              <button onClick={()=>{setEditando(null);setSkuBuscar('');}} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:'12px'}}>

              {/* Producto actual */}
              <div style={{padding:'11px 13px',background:'var(--bg2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'12px'}}>
                {prodActual ? (
                  <>
                    <span style={{width:'14px',height:'14px',borderRadius:'50%',background:colorHex(prodActual.color),border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:700}}>{prodActual.modelo} — {prodActual.color}</div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)',marginTop:'1px'}}>{prodActual.sku} · {prodActual.categoria}</div>
                    </div>
                  </>
                ) : (
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>SKU: <strong style={{color:'var(--blue)'}}>{editando.sku}</strong></div>
                )}
              </div>

              {/* Buscador de SKU — para cambiar producto */}
              <div style={{position:'relative'}}>
                <label style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.15em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px',fontWeight:700}}>
                  Cambiar producto (opcional)
                </label>
                <input
                  value={skuBuscar}
                  onChange={e => setSkuBuscar(e.target.value)}
                  placeholder="Buscar por SKU, modelo o color..."
                  style={{width:'100%',padding:'8px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',boxSizing:'border-box'}}
                />
                {skuResultados.length > 0 && (
                  <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--surface)',border:'1px solid var(--border-strong)',borderTop:'none',zIndex:99,maxHeight:'180px',overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,.12)'}}>
                    {skuResultados.map(p => (
                      <div key={p.sku}
                        onMouseDown={e => { e.preventDefault(); setEditando(v => ({...v, sku: p.sku})); setSkuBuscar(''); }}
                        style={{padding:'9px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',borderBottom:'1px solid var(--border)'}}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
                        onMouseLeave={e=>e.currentTarget.style.background=''}>
                        <span style={{width:'10px',height:'10px',borderRadius:'50%',background:colorHex(p.color),border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'12px',fontWeight:600}}>{p.modelo} — {p.color}</div>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)'}}>{p.sku}</div>
                        </div>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:p.disponible>0?'var(--green)':'#aaa'}}>{p.disponible} uds</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{padding:'9px 12px',background:'#fff8e1',border:'1px solid #f59e0b44',borderLeft:'3px solid #f59e0b',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#92400e'}}>
                ⚠️ El inventario del SKU <strong>{editando.sku}</strong> se recalculará automáticamente al guardar.
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.15em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px',fontWeight:700}}>Tipo</label>
                  <select value={editando.tipo} onChange={e=>setEditando(v=>({...v,tipo:e.target.value}))}
                    style={{width:'100%',padding:'8px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'}}>
                    <option value="ENTRADA">↑ ENTRADA</option>
                    <option value="SALIDA">↓ SALIDA</option>
                  </select>
                </div>
                <div>
                  <label style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.15em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px',fontWeight:700}}>Cantidad *</label>
                  <input type="number" min="1" value={editando.cantidad} onChange={e=>setEditando(v=>({...v,cantidad:parseInt(e.target.value)||1}))}
                    style={{width:'100%',padding:'8px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:700,outline:'none'}}/>
                </div>
              </div>
              <div>
                <label style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.15em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px',fontWeight:700}}>Fecha</label>
                <input type="date" value={editando.fecha} onChange={e=>setEditando(v=>({...v,fecha:e.target.value}))}
                  style={{width:'100%',padding:'8px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'}}/>
              </div>
              <div>
                <label style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.15em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px',fontWeight:700}}>Concepto</label>
                <input value={editando.concepto||''} onChange={e=>setEditando(v=>({...v,concepto:e.target.value}))}
                  placeholder="Descripción del movimiento..."
                  style={{width:'100%',padding:'8px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'}}/>
              </div>
            </div>
            <div style={{padding:'12px 18px',borderTop:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'flex-end',gap:'8px'}}>
              <button onClick={()=>{setEditando(null);setSkuBuscar('');}} style={{padding:'9px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardandoE}
                style={{padding:'9px 20px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',opacity:guardandoE?.6:1}}>
                {guardandoE?'⏳ Guardando...':'💾 Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Banner de resultado */}
      {msgE&&(
        <div style={{padding:'10px 14px',marginBottom:'12px',background:msgE.t==='ok'?'var(--green-soft)':'var(--red-soft)',border:`1px solid ${msgE.t==='ok'?'rgba(26,122,60,.3)':'rgba(217,30,30,.3)'}`,color:msgE.t==='ok'?'var(--green)':'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700}}>
          {msgE.m}
        </div>
      )}
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',flex:1,minWidth:'200px'}}>
          <span>🔍</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar SKU, concepto, cliente..."
            style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',width:'100%'}}/>
        </div>
        <select value={tipo} onChange={e=>setTipo(e.target.value)} style={{...inp,minWidth:'150px'}}>
          <option value="">Entradas y Salidas</option>
          <option value="ENTRADA">Solo Entradas</option>
          <option value="SALIDA">Solo Salidas</option>
        </select>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{...inp,minWidth:'150px'}}>
          <option value="">Todas las categorías</option>
          {categorias.map(c=><option key={c}>{c}</option>)}
        </select>
        <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={inp} title="Desde"/>
        <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={inp} title="Hasta"/>
        <button onClick={()=>{setBuscar('');setTipo('');setCat('');setDesde('');setHasta('');setPagina(1);}} style={{...inp,cursor:'pointer'}}>Limpiar</button>
        <button onClick={exportCSV} style={{...inp,cursor:'pointer',color:'var(--green)',borderColor:'rgba(26,122,60,.3)'}}>⬇ CSV</button>
        <button onClick={()=>cargarMovimientos(pagina)} style={{...inp,cursor:'pointer'}}>↺</button>
      </div>

      {cargando&&<div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando movimientos...</div>}

      {!cargando&&(
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',letterSpacing:'.1em',textTransform:'uppercase'}}>
            <span>{filtrados.length} en pantalla · {total} total en BD</span>
            <span>Página {pagina}/{totalPags}</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:'900px'}}>
              <thead><tr style={{background:'#efefef'}}>
                {['ID','Fecha','SKU','Cat.','Modelo','Color','Tipo','Cant.','Precio','Concepto','Cliente','Acciones'].map(h=>(
                  <th key={h} style={{padding:'7px 11px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#444',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.map((m,i)=>{
                  const p=productos.find(x=>x.sku===m.sku);
                  const tvBadge=m.tipoVenta?<span style={{fontFamily:'DM Mono,monospace',fontSize:'7px',padding:'1px 4px',background:m.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:m.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',marginLeft:'4px'}}>{m.tipoVenta}</span>:null;
                  return(
                    <tr key={i} style={{borderBottom:'1px solid var(--border)'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888'}}>{m.id||'—'}</td>
                      <td style={{padding:'7px 11px',fontSize:'12px',whiteSpace:'nowrap'}}>{fmtF(m.fecha)}</td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)'}}>{m.sku}</td>
                      <td style={{padding:'7px 11px'}}>{p&&<span style={{background:'var(--bg3)',padding:'2px 5px',fontFamily:'DM Mono,monospace',fontSize:'8px'}}>{p.categoria}</span>}</td>
                      <td style={{padding:'7px 11px',fontSize:'11px',fontWeight:500}}>{p?.modelo||'—'}</td>
                      <td style={{padding:'7px 11px',fontSize:'11px'}}>{p&&<><span style={{width:'7px',height:'7px',borderRadius:'50%',background:colorHex(p.color),display:'inline-block',verticalAlign:'middle',marginRight:'3px',border:'1px solid rgba(0,0,0,.1)'}}/>{p.color}</>}</td>
                      <td style={{padding:'7px 11px'}}>
                        <span style={{padding:'2px 6px',fontFamily:'DM Mono,monospace',fontSize:'8px',background:m.tipo==='ENTRADA'?'var(--green-soft)':'var(--red-soft)',color:m.tipo==='ENTRADA'?'#155e30':'#a81818'}}>
                          {m.tipo==='ENTRADA'?'↑':'↓'} {m.tipo}
                        </span>{tvBadge}
                      </td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontWeight:700,color:COLOR_MOV[m.tipo]||'#333'}}>{m.tipo==='ENTRADA'?'+':'-'}{m.cantidad}</td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{m.precioVenta>0?`€ ${m.precioVenta.toFixed(2)}`:'—'}</td>
                      <td style={{padding:'7px 11px',fontSize:'11px',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.concepto||'—'}</td>
                      <td style={{padding:'7px 11px',fontSize:'11px'}}>{m.contacto||'—'}</td>
                      <td style={{padding:'7px 11px',whiteSpace:'nowrap'}}>
                        <div style={{display:'flex',gap:'5px'}}>
                          <button
                            onClick={()=>abrirEdicion(m)}
                            title="Editar movimiento"
                            style={{padding:'3px 8px',background:'none',border:'1px solid #f59e0b',color:'#f59e0b',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700}}>
                            ✏️
                          </button>
                          <button
                            onClick={()=>eliminarMovimiento(m.id,m.sku,m.tipo,m.cantidad)}
                            title="Eliminar movimiento"
                            style={{padding:'3px 8px',background:'none',border:'1px solid var(--red)',color:'var(--red)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700}}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtrados.length&&<tr><td colSpan={12} style={{textAlign:'center',padding:'40px',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{movimientos.length===0?'Sin movimientos registrados aún':'Sin resultados'}</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPags>1&&(
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',borderTop:'1px solid var(--border)',background:'var(--bg2)'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>{total} registros · {LIMIT} por página</span>
              <div style={{display:'flex',gap:'4px'}}>
                <button disabled={pagina===1} onClick={()=>setPagina(p=>p-1)} style={{padding:'4px 9px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',opacity:pagina===1?.3:1}}>‹</button>
                {Array.from({length:Math.min(7,totalPags)},(_,i)=>{
                  let p=pagina<=4?i+1:pagina>=totalPags-3?totalPags-6+i:pagina-3+i;
                  if(p<1||p>totalPags) return null;
                  return <button key={p} onClick={()=>setPagina(p)} style={{padding:'4px 9px',background:pagina===p?'var(--ink)':'none',color:pagina===p?'#fff':'#333',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{p}</button>;
                })}
                <button disabled={pagina===totalPags} onClick={()=>setPagina(p=>p+1)} style={{padding:'4px 9px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',opacity:pagina===totalPags?.3:1}}>›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
