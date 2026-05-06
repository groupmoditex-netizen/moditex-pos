'use client';
import { colorHex } from '@/utils/colores';
import { useState, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

function estD(n){if(n<=0)return 'zero';if(n<=3)return 'low';return 'ok';}
function agrupar(prods){const map={},order=[];prods.forEach(p=>{const key=`${p.categoria}||${p.modelo}`;if(!map[key]){map[key]={categoria:p.categoria,modelo:p.modelo,precioDetal:p.precioDetal,precioMayor:p.precioMayor,colores:[]};order.push(key);}map[key].colores.push(p);});return order.map(k=>map[k]);}

const EST_STYLE = {
  zero: {bg:'var(--red-soft)',   color:'#a81818', label:'Sin stock'},
  low:  {bg:'var(--warn-soft)',  color:'#7a3500', label:'Bajo'},
  ok:   {bg:'var(--green-soft)', color:'#155e30', label:'OK'},
};

export default function InventarioPage() {
  const { data, cargando } = useAppData() || {};
  const [buscar, setBuscar] = useState('');
  const [cat, setCat]       = useState('');
  const [estado, setEstado] = useState('');

  const { productos = [] } = data || {};
  const categorias = useMemo(()=>[...new Set(productos.map(p=>p.categoria))].sort(),[productos]);

  const filtrados = useMemo(()=>productos.filter(p=>{
    if (!buscar && !cat && !estado) return true;
    const q = buscar.toLowerCase();
    const words = q.split(' ').filter(w => w.length > 0);
    const target = `${p.modelo} ${p.color} ${p.sku} ${p.categoria} ${p.alias || ''}`.toLowerCase();
    const targetWords = target.split(/[\s\-_/.]+/);
    
    const matchBusqueda = !buscar || words.every(word => targetWords.some(tw => tw.startsWith(word)));
    const matchCat = !cat || p.categoria === cat;
    const matchEst = !estado || estD(p.disponible) === estado;
    
    return matchBusqueda && matchCat && matchEst;
  }),[productos,buscar,cat,estado]);

  const grupos = useMemo(()=>agrupar(filtrados),[filtrados]);

  return (
    <Shell title="Inventario">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'15px'}}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'16px',fontWeight:800, textTransform: 'uppercase', letterSpacing: '.05em'}}>Control de Inventario</div>
            <span style={{fontSize:'10px', color:'var(--red)', background: 'rgba(239,68,68,0.1)', padding: '2px 10px', borderRadius: '12px', fontWeight: 800}}>● {grupos.length} MODELOS</span>
          </div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>Gestión de stock físico y variantes por modelo</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:'16px',marginBottom:'30px'}}>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)', boxShadow:'0 4px 12px rgba(0,0,0,0.02)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'10px'}}>Unidades Totales</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--ink)'}}>
              {productos.reduce((a,p)=>a+(p.disponible||0),0).toLocaleString()} <span style={{fontSize:'12px', fontWeight:600}}>UDS</span>
            </div>
         </div>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)', boxShadow:'0 4px 12px rgba(0,0,0,0.02)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'10px'}}>Modelos Activos</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--blue)'}}>
              {[...new Set(productos.map(p=>p.modelo))].length}
            </div>
         </div>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)', boxShadow:'0 4px 12px rgba(0,0,0,0.02)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'10px'}}>Alertas de Stock</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--red)'}}>
              {productos.filter(p=>(p.disponible||0)<=0).length} <span style={{fontSize:'10px', color:'#aaa'}}>AGOTADOS</span>
            </div>
         </div>
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'30px',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',background:'#fff',padding:'10px 18px',borderRadius:'16px',border:'1px solid var(--border)',flex:1,minWidth:'250px', boxShadow:'0 2px 8px rgba(0,0,0,0.02)'}}>
          <span style={{fontSize:'16px', opacity:0.5}}>🔍</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar modelo, color, SKU..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'13px',color:'#111',width:'100%'}}/>
        </div>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'10px 15px',background:'#fff',borderRadius:'16px',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,outline:'none',minWidth:'180px', cursor:'pointer'}}>
          <option value="">Todas las categorías</option>
          {categorias.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={estado} onChange={e=>setEstado(e.target.value)} style={{padding:'10px 15px',background:'#fff',borderRadius:'16px',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,outline:'none',cursor:'pointer'}}>
          <option value="">Todos los estados</option>
          <option value="ok">En stock</option>
          <option value="low">Stock bajo</option>
          <option value="zero">Sin stock</option>
        </select>
      </div>

      {cargando && <div style={{textAlign:'center',padding:'80px',fontFamily:'Poppins,sans-serif',fontSize:'14px',color:'#aaa', fontWeight:600}}>
          <div style={{fontSize:'24px', marginBottom:'10px'}}>⏳</div>
          Actualizando almacén...
      </div>}

      {!cargando && grupos.length === 0 && (
        <div style={{textAlign:'center',padding:'80px',background:'#fff',borderRadius:'24px',border:'1px dashed var(--border)'}}>
          <div style={{fontSize:'48px',marginBottom:'15px'}}>📦</div>
          <div style={{fontFamily:'Poppins,sans-serif',fontSize:'14px',color:'#999', fontWeight:700}}>{productos.length===0?'No hay productos en inventario':'Sin resultados para la búsqueda'}</div>
        </div>
      )}

      {!cargando && grupos.map((g,gi)=>{
        const hasAlert=g.colores.some(c=>c.disponible===0);
        const hasWarn=!hasAlert&&g.colores.some(c=>c.disponible<=3);
        const totalDisp=g.colores.reduce((a,c)=>a+c.disponible,0);
        
        return(
          <div key={gi} style={{marginBottom:'24px',border:'1px solid var(--border)', borderRadius:'28px', background:'#fff', overflow:'hidden', boxShadow:'0 8px 25px rgba(0,0,0,0.04)'}}>
            
            {/* Header del modelo */}
            <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border)',background:'#fcfcfc', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'15px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                <div style={{width:'48px', height:'48px', borderRadius:'16px', background:hasAlert?'rgba(239,68,68,0.1)':'rgba(59,130,246,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px'}}>
                  {hasAlert ? '🚨' : '📦'}
                </div>
                <div>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'18px', fontWeight:900, color:'var(--ink)'}}>{g.modelo}</div>
                  <div style={{display:'flex', gap:'8px', marginTop:'4px'}}>
                    <span style={{background:'var(--bg3)', color:'#666', padding:'2px 10px', borderRadius:'8px', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700, textTransform:'uppercase'}}>{g.categoria}</span>
                    {hasAlert && <span style={{background:'#fee2e2', color:'#b91c1c', padding:'2px 10px', borderRadius:'8px', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:800, textTransform:'uppercase'}}>Sin Stock</span>}
                    {hasWarn && <span style={{background:'#fef3c7', color:'#92400e', padding:'2px 10px', borderRadius:'8px', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:800, textTransform:'uppercase'}}>Bajo Stock</span>}
                  </div>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'Poppins,sans-serif',fontSize:'16px',color:'var(--red)',fontWeight:900}}>€ {g.precioDetal?.toFixed(2)} <span style={{fontSize:'9px', color:'#aaa'}}>DETAL</span></div>
                <div style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'var(--green)',fontWeight:800, marginTop:'2px'}}>€ {g.precioMayor?.toFixed(2)} <span style={{fontSize:'9px', color:'#aaa'}}>MAYOR</span></div>
              </div>
            </div>

            {/* Colores — tabla desktop / tarjetas mobile */}
            <div>
              {/* Cabecera desktop */}
              <div className="inv-table-header" style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 60px 60px 60px 80px 100px',padding:'12px 24px',background:'#f9fafb',borderBottom:'1px solid var(--border)'}}>
                {['Color / SKU','Tela','Talla','Ini.','Ent.','Sal.','Disp.','Estado'].map(h=>(
                  <span key={h} style={{fontFamily:'Poppins,sans-serif',fontSize:'9px',fontWeight:800,letterSpacing:'.05em',textTransform:'uppercase',color:'#aaa'}}>{h}</span>
                ))}
              </div>

              {g.colores.map(c=>{
                const e=estD(c.disponible);
                const sc=e==='ok'?'var(--green)':e==='low'?'var(--warn)':'var(--red)';
                const es=EST_STYLE[e];
                return(
                  <div key={c.sku} className="inv-row-premium">
                    {/* Fila desktop */}
                    <div className="inv-row-desktop" style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 60px 60px 60px 80px 100px',padding:'16px 24px',borderBottom:'1px solid var(--border-soft)',alignItems:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <span style={{width:'12px',height:'12px',borderRadius:'50%',background:colorHex(c.color),border:'2px solid #fff', boxShadow:'0 0 0 1px var(--border)',flexShrink:0}}/>
                        <div style={{overflow:'hidden'}}>
                          <div style={{fontFamily:'Poppins,sans-serif', fontSize:'13px',fontWeight:700, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.color}</div>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)', fontWeight:700}}>{c.sku}</div>
                        </div>
                      </div>
                      <span style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#777', fontWeight:600}}>{c.tela || '—'}</span>
                      <span style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#777', fontWeight:700}}>{c.talla}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px', color:'#aaa'}}>{c.stockInicial}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--green)', fontWeight:700}}>+{c.entradas||0}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--red)', fontWeight:700}}>-{c.salidas||0}</span>
                      <span style={{fontFamily:'Poppins,sans-serif',fontSize:'16px',fontWeight:900,color:sc}}>{c.disponible}</span>
                      <span style={{background:es.bg,color:es.color,padding:'4px 10px', borderRadius:'8px', fontFamily:'Poppins,sans-serif',fontSize:'9px', fontWeight:900, textTransform:'uppercase', textAlign:'center', display:'inline-block'}}>{es.label}</span>
                    </div>

                    {/* Fila mobile */}
                    <div className="inv-row-mobile" style={{display:'flex',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid var(--border-soft)',gap:'12px'}}>
                      <span style={{width:'14px',height:'14px',borderRadius:'50%',background:colorHex(c.color),border:'2px solid #fff', boxShadow:'0 0 0 1px var(--border)',flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:'Poppins,sans-serif', fontSize:'13px',fontWeight:800}}>{c.color}</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888', fontWeight:600}}>{c.sku}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'Poppins,sans-serif',fontSize:'20px',fontWeight:900,color:sc,lineHeight:1}}>{c.disponible}</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#aaa',marginTop:'4px', fontWeight:700}}>
                          +{c.entradas||0} / -{c.salidas||0}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{padding:'12px 24px', background:'#fdfdfd', borderTop:'1px solid var(--border-soft)', textAlign:'center'}}>
               <span style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', color:'#bbb', fontWeight:600}}>Resumen: {g.colores.length} variantes con un total de <strong>{totalDisp}</strong> unidades disponibles.</span>
            </div>
          </div>
        );
      })}

      <style dangerouslySetInnerHTML={{ __html: `
        .inv-table-header, .inv-row-desktop { display: grid !important; }
        .inv-row-mobile { display: none !important; }
        .inv-row-premium { transition: background 0.2s; }
        .inv-row-premium:hover { background: #fcfcfc; }
        @media (max-width: 850px) {
          .inv-table-header, .inv-row-desktop { display: none !important; }
          .inv-row-mobile { display: flex !important; }
        }
      ` }} />
    </Shell>
  );
}