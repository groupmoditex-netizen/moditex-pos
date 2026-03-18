'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

const PER_PAGE = 25;
const COLOR_MAP={BLANCO:'#d0d0d0',NEGRO:'#1a1a1a',AZUL:'#3b6fd4',ROJO:'#d63b3b',VERDE:'#2d9e4a',ROSA:'#f07aa0',GRIS:'#6b7280',AMARILLO:'#f5c842',NARANJA:'#f57c42',MORADO:'#7c4fd4',VINOTINTO:'#8b2035',BEIGE:'#d4b896',CORAL:'#f26e5b',CELESTE:'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return COLOR_MAP[k]||COLOR_MAP[k.split(' ')[0]]||'#9ca3af';}
function fmtF(d){if(!d)return '—';const p=String(d).split('T')[0].split('-');return(p[2]||'')+'/'+(p[1]||'')+'/'+(p[0]||'');}

export default function HistorialPage() {
  const ctx = useAppData() || {};
  const ctxProds = ctx.data?.productos || [];

  // Movimientos se cargan directamente, no desde contexto
  const [movimientos, setMovimientos] = useState([]);
  const [productos,   setProductos]   = useState(ctxProds);
  const [cargando,    setCargando]    = useState(true);

  const [buscar, setBuscar] = useState('');
  const [tipo,   setTipo]   = useState('');
  const [cat,    setCat]    = useState('');
  const [desde,  setDesde]  = useState('');
  const [hasta,  setHasta]  = useState('');
  const [pagina, setPagina] = useState(1);

  async function cargarMovimientos() {
    setCargando(true);
    try {
      const res = await fetch('/api/movimientos?limit=1000').then(r=>r.json());
      const movs = Array.isArray(res) ? res : (res.data || []);
      setMovimientos(movs.map(m=>({
        id:m.id||'', fecha:m.fecha?String(m.fecha).split('T')[0]:'',
        sku:m.sku||'', tipo:m.tipo||'', cantidad:m.cantidad||0,
        concepto:m.concepto||'', contacto:m.contacto||'',
        tipoVenta:m.tipo_venta||'', precioVenta:m.precio_venta||0,
        clienteId:m.cliente_id||'', createdAt:m.created_at||'',
      })));
    } catch(e) { console.error(e); }
    setCargando(false);
  }

  useEffect(()=>{ cargarMovimientos(); },[]);

  // Cuando el contexto cargue los productos, usarlos
  useEffect(()=>{ if(ctxProds.length>0) setProductos(ctxProds); },[ctxProds.length]);

  // Si contexto no tiene productos, buscarlos
  useEffect(()=>{
    if(ctxProds.length===0 && productos.length===0) {
      fetch('/api/productos').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setProductos(d); }).catch(()=>{});
    }
  },[]);

  const categorias = useMemo(()=>[...new Set(productos.map(p=>p.categoria||p.categoria))].filter(Boolean).sort(),[productos]);

  const filtrados = useMemo(()=>{
    const q=buscar.toLowerCase();
    return movimientos.filter(m=>{
      const p=productos.find(x=>x.sku===m.sku);
      if(q&&!`${m.sku} ${m.concepto||''} ${m.contacto||''} ${p?.modelo||''} ${p?.color||''}`.toLowerCase().includes(q)) return false;
      if(tipo&&m.tipo!==tipo) return false;
      if(cat&&p?.categoria!==cat) return false;
      if(desde&&m.fecha<desde) return false;
      if(hasta&&m.fecha>hasta) return false;
      return true;
    }).sort((a,b)=>(b.createdAt||b.fecha)>(a.createdAt||a.fecha)?1:-1);
  },[movimientos,productos,buscar,tipo,cat,desde,hasta]);

  const totalPag = Math.max(1,Math.ceil(filtrados.length/PER_PAGE));
  const slice    = filtrados.slice((pagina-1)*PER_PAGE,pagina*PER_PAGE);

  function exportCSV(){
    const hdr=['ID','Fecha','SKU','Categoría','Modelo','Color','Tipo','Tipo Venta','Cantidad','Precio Venta €','Ganancia €','Concepto','Cliente/Prov'];
    const rows=filtrados.map(m=>{
      const p=productos.find(x=>x.sku===m.sku);
      const gan=p&&p.precioCosto>0&&m.tipo==='SALIDA'?(m.precioVenta-p.precioCosto)*m.cantidad:'';
      return[m.id,m.fecha,m.sku,p?.categoria||'',p?.modelo||'',p?.color||'',m.tipo,m.tipoVenta||'',m.cantidad,m.precioVenta||0,gan,m.concepto||'',m.contacto||''];
    });
    const csv=[hdr,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    a.download=`movimientos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const inp={padding:'7px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',outline:'none'};

  return (
    <Shell title="Historial de Movimientos">
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',flex:1,minWidth:'200px'}}>
          <span>🔍</span>
          <input value={buscar} onChange={e=>{setBuscar(e.target.value);setPagina(1);}} placeholder="Buscar SKU, concepto, cliente..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',width:'100%'}}/>
        </div>
        <select value={tipo} onChange={e=>{setTipo(e.target.value);setPagina(1);}} style={{...inp,minWidth:'150px'}}>
          <option value="">Entradas y Salidas</option>
          <option value="ENTRADA">Solo Entradas</option>
          <option value="SALIDA">Solo Salidas</option>
        </select>
        <select value={cat} onChange={e=>{setCat(e.target.value);setPagina(1);}} style={{...inp,minWidth:'150px'}}>
          <option value="">Todas las categorías</option>
          {categorias.map(c=><option key={c}>{c}</option>)}
        </select>
        <input type="date" value={desde} onChange={e=>{setDesde(e.target.value);setPagina(1);}} style={inp}/>
        <input type="date" value={hasta} onChange={e=>{setHasta(e.target.value);setPagina(1);}} style={inp}/>
        <button onClick={()=>{setBuscar('');setTipo('');setCat('');setDesde('');setHasta('');setPagina(1);}} style={{...inp,cursor:'pointer'}}>Limpiar</button>
        <button onClick={exportCSV} style={{...inp,cursor:'pointer',color:'var(--green)',borderColor:'rgba(26,122,60,.3)'}}>⬇ CSV</button>
        <button onClick={cargarMovimientos} style={{...inp,cursor:'pointer'}}>↺</button>
      </div>

      {cargando&&<div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando movimientos...</div>}

      {!cargando&&(
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',letterSpacing:'.1em',textTransform:'uppercase'}}>
            <span>{filtrados.length} registros · {movimientos.length} total en BD</span>
            <span>Página {pagina}/{totalPag}</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:'900px'}}>
              <thead><tr style={{background:'#efefef'}}>
                {['ID','Fecha','SKU','Cat.','Modelo','Color','Tipo','Cant.','Precio','Ganancia','Concepto','Cliente'].map(h=>(
                  <th key={h} style={{padding:'7px 11px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#444',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {slice.map((m,i)=>{
                  const p=productos.find(x=>x.sku===m.sku);
                  const gan=p&&(p.precioCosto||0)>0&&m.tipo==='SALIDA'?(m.precioVenta-(p.precioCosto||0)):null;
                  const tvBadge=m.tipoVenta?<span style={{fontFamily:'DM Mono,monospace',fontSize:'7px',padding:'1px 4px',background:m.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:m.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',marginLeft:'4px'}}>{m.tipoVenta}</span>:null;
                  return(
                    <tr key={i} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
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
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontWeight:700,color:m.tipo==='ENTRADA'?'var(--green)':'var(--red)'}}>{m.tipo==='ENTRADA'?'+':'-'}{m.cantidad}</td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{m.precioVenta>0?`€ ${m.precioVenta.toFixed(2)}`:'—'}</td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:gan>0?'var(--green)':gan<0?'var(--red)':'#888'}}>{gan!==null?(gan>=0?'+':'')+`€ ${gan.toFixed(2)}`:'—'}</td>
                      <td style={{padding:'7px 11px',fontSize:'11px',maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {(() => {
                          // Usar referencia directa si existe, o extraer del concepto como fallback
                          const cmdId = m.referencia?.startsWith('CMD-')
                            ? m.referencia
                            : m.concepto?.match(/CMD-[A-Z0-9-]+/)?.[0];
                          if (cmdId) {
                            return (
                              <span
                                onClick={()=>router.push('/comandas?ver='+cmdId)}
                                style={{color:'var(--blue)',cursor:'pointer',textDecoration:'underline',fontFamily:'DM Mono,monospace',fontSize:'9px',display:'flex',alignItems:'center',gap:'3px'}}
                                title={`Ver comanda ${cmdId}`}
                              >
                                📋 <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{cmdId}</span>
                              </span>
                            );
                          }
                          if (m.concepto?.toLowerCase().includes('venta directa')) {
                            return <span style={{color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'9px'}}>⚡ {m.concepto}</span>;
                          }
                          return <span style={{color:'#555'}}>{m.concepto||'—'}</span>;
                        })()}
                      </td>
                      <td style={{padding:'7px 11px',fontSize:'11px'}}>{m.contacto||'—'}</td>
                    </tr>
                  );
                })}
                {!slice.length&&<tr><td colSpan={12} style={{textAlign:'center',padding:'40px',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{movimientos.length===0?'Sin movimientos registrados aún':'Sin resultados para los filtros actuales'}</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPag>1&&(
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',borderTop:'1px solid var(--border)',background:'var(--bg2)'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>{filtrados.length} registros</span>
              <div style={{display:'flex',gap:'4px'}}>
                <button disabled={pagina===1} onClick={()=>setPagina(p=>p-1)} style={{padding:'4px 9px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',opacity:pagina===1?.3:1}}>‹</button>
                {Array.from({length:Math.min(7,totalPag)},(_, i)=>{
                  let p=pagina<=4?i+1:pagina>=totalPag-3?totalPag-6+i:pagina-3+i;
                  if(p<1||p>totalPag) p=i+1;
                  return <button key={p} onClick={()=>setPagina(p)} style={{padding:'4px 9px',background:pagina===p?'var(--ink)':'none',color:pagina===p?'#fff':'#333',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{p}</button>;
                })}
                <button disabled={pagina===totalPag} onClick={()=>setPagina(p=>p+1)} style={{padding:'4px 9px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',opacity:pagina===totalPag?.3:1}}>›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}