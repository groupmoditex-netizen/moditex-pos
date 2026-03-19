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
                {['ID','Fecha','SKU','Cat.','Modelo','Color','Tipo','Cant.','Precio','Concepto','Cliente'].map(h=>(
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
                    </tr>
                  );
                })}
                {!filtrados.length&&<tr><td colSpan={11} style={{textAlign:'center',padding:'40px',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{movimientos.length===0?'Sin movimientos registrados aún':'Sin resultados'}</td></tr>}
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
