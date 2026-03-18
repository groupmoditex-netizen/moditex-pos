'use client';
import { useState, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

const CM={'BLANCO':'#d0d0d0','NEGRO':'#1a1a1a','AZUL':'#3b6fd4','ROJO':'#d63b3b','VERDE':'#2d9e4a','ROSA':'#f07aa0','GRIS':'#6b7280','AMARILLO':'#f5c842','NARANJA':'#f57c42','MORADO':'#7c4fd4','VINOTINTO':'#8b2035','BEIGE':'#d4b896','CORAL':'#f26e5b','CELESTE':'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return CM[k]||CM[k.split(' ')[0]]||'#9ca3af';}
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
    const q=buscar.toLowerCase();
    return(!buscar||`${p.modelo} ${p.color} ${p.sku} ${p.categoria}`.toLowerCase().includes(q))
      &&(!cat||p.categoria===cat)&&(!estado||estD(p.disponible)===estado);
  }),[productos,buscar,cat,estado]);

  const grupos = useMemo(()=>agrupar(filtrados),[filtrados]);

  return (
    <Shell title="Inventario">
      {/* Filtros */}
      <div style={{display:'flex',gap:'7px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',flex:1,minWidth:'160px'}}>
          <span style={{color:'#555'}}>🔍</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar modelo, color, SKU..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',width:'100%'}}/>
        </div>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'7px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',minWidth:'130px'}}>
          <option value="">Todas las categorías</option>
          {categorias.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={estado} onChange={e=>setEstado(e.target.value)} style={{padding:'7px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'}}>
          <option value="">Todos los estados</option>
          <option value="ok">En stock</option>
          <option value="low">Stock bajo</option>
          <option value="zero">Sin stock</option>
        </select>
        <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666',whiteSpace:'nowrap'}}>{grupos.length} modelos · {filtrados.reduce((a,p)=>a+(p.disponible||0),0)} uds</span>
      </div>

      {cargando&&<div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando inventario...</div>}
      {!cargando&&grupos.length===0&&<div style={{textAlign:'center',padding:'60px',background:'var(--surface)',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>🔍 Sin resultados</div>}

      {!cargando&&grupos.map((g,gi)=>{
        const hasAlert=g.colores.some(c=>c.disponible===0);
        const hasWarn=!hasAlert&&g.colores.some(c=>c.disponible<=3);
        const borderColor=hasAlert?'var(--red)':hasWarn?'var(--warn)':'var(--border)';
        const totalDisp=g.colores.reduce((a,c)=>a+c.disponible,0);
        return(
          <div key={gi} style={{marginBottom:'10px',border:'1px solid var(--border)',borderTop:`3px solid ${borderColor}`,background:'var(--surface)'}}>
            {/* Header del modelo */}
            <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg2)'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',flexWrap:'wrap'}}>
                <div>
                  <span style={{fontFamily:'Playfair Display,serif',fontSize:'14px',fontWeight:700}}>{g.modelo}</span>
                  <span style={{background:'var(--bg3)',padding:'2px 6px',fontFamily:'DM Mono,monospace',fontSize:'8px',marginLeft:'7px'}}>{g.categoria}</span>
                  {hasAlert&&<span style={{background:'var(--red-soft)',color:'#a81818',padding:'2px 6px',fontFamily:'DM Mono,monospace',fontSize:'8px',marginLeft:'4px'}}>⛔ sin stock</span>}
                  {hasWarn&&<span style={{background:'var(--warn-soft)',color:'#7a3500',padding:'2px 6px',fontFamily:'DM Mono,monospace',fontSize:'8px',marginLeft:'4px'}}>⚠ bajo</span>}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--red)',fontWeight:700}}>€{g.precioDetal?.toFixed(2)} / €{g.precioMayor?.toFixed(2)}</div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',marginTop:'1px'}}>{g.colores.length} var · {totalDisp} uds</div>
                </div>
              </div>
            </div>

            {/* Colores — tabla desktop / tarjetas mobile */}
            <div>
              {/* Cabecera desktop (oculta en mobile via CSS) */}
              <div className="inv-table-header" style={{display:'grid',gridTemplateColumns:'2fr 60px 55px 55px 55px 65px 75px',padding:'5px 12px',background:'#f8f8f8',borderBottom:'1px solid var(--border)'}}>
                {['Color / SKU','Talla','Ini.','Ent.','Sal.','Disp.','Estado'].map(h=>(
                  <span key={h} style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.1em',textTransform:'uppercase',color:'#555'}}>{h}</span>
                ))}
              </div>

              {g.colores.map(c=>{
                const e=estD(c.disponible);
                const sc=e==='ok'?'var(--green)':e==='low'?'var(--warn)':'var(--red)';
                const es=EST_STYLE[e];
                return(
                  <div key={c.sku}>
                    {/* Fila desktop */}
                    <div className="inv-row-desktop" style={{display:'grid',gridTemplateColumns:'2fr 60px 55px 55px 55px 65px 75px',padding:'8px 12px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(c.color),border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:'12px',fontWeight:500}}>{c.color}</div>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)'}}>{c.sku}</div>
                        </div>
                      </div>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>{c.talla}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px'}}>{c.stockInicial}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--green)'}}>+{c.entradas||0}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'var(--red)'}}>-{c.salidas||0}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:700,color:sc}}>{c.disponible}</span>
                      <span style={{background:es.bg,color:es.color,padding:'2px 6px',fontFamily:'DM Mono,monospace',fontSize:'8px'}}>{es.label}</span>
                    </div>

                    {/* Fila mobile: compacta con solo lo esencial */}
                    <div className="inv-row-mobile" style={{display:'flex',alignItems:'center',padding:'9px 12px',borderBottom:'1px solid var(--border)',gap:'8px'}}>
                      <span style={{width:'10px',height:'10px',borderRadius:'50%',background:colorHex(c.color),border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'12px',fontWeight:600}}>{c.color}</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>{c.sku}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'20px',fontWeight:700,color:sc,lineHeight:1}}>{c.disponible}</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginTop:'1px'}}>
                          +{c.entradas||0} / -{c.salidas||0}
                        </div>
                      </div>
                      <span style={{background:es.bg,color:es.color,padding:'3px 7px',fontFamily:'DM Mono,monospace',fontSize:'8px',flexShrink:0,minWidth:'52px',textAlign:'center'}}>{es.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <style>{`
        /* Desktop: mostrar tabla, ocultar mobile */
        .inv-table-header, .inv-row-desktop { display: grid !important; }
        .inv-row-mobile { display: none !important; }

        /* Mobile: mostrar cards, ocultar tabla */
        @media (max-width: 767px) {
          .inv-table-header, .inv-row-desktop { display: none !important; }
          .inv-row-mobile { display: flex !important; }
        }
      `}</style>
    </Shell>
  );
}