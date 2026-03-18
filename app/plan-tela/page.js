'use client';
import { useState, useEffect } from 'react';
import Shell from '@/components/Shell';

const COLOR_MAP={BLANCO:'#d0d0d0',NEGRO:'#1a1a1a',AZUL:'#3b6fd4',ROJO:'#d63b3b',VERDE:'#2d9e4a',ROSA:'#f07aa0',GRIS:'#6b7280',AMARILLO:'#f5c842',NARANJA:'#f57c42',MORADO:'#7c4fd4',VINOTINTO:'#8b2035',BEIGE:'#d4b896',CORAL:'#f26e5b',CELESTE:'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return COLOR_MAP[k]||COLOR_MAP[k.split(' ')[0]]||'#9ca3af';}

export default function PlanTelaPage() {
  const [data, setData]     = useState(null);
  const [cargando, setCarg] = useState(true);
  const [error, setError]   = useState('');

  async function cargar() {
    setCarg(true); setError('');
    try {
      const res = await fetch('/api/plan-tela').then(r=>r.json());
      if (res.ok) setData(res.data);
      else setError(res.error || 'Error al generar el plan');
    } catch(e) { setError('Error de conexión'); }
    setCarg(false);
  }

  useEffect(() => { cargar(); }, []);

  const d = data || {};

  return (
    <Shell title="🧵 Plan de Tela">
      <style>{`@media print { .no-print{display:none!important} @page{size:A4;margin:12mm} }`}</style>

      {/* Header */}
      <div className="no-print" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>🧵 Plan de Compra de Tela</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#555',marginTop:'2px'}}>Calculado desde comandas en estado PRODUCCIÓN</div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {data?.resumen?.length>0&&<button onClick={()=>window.print()} style={{padding:'6px 13px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',color:'#444'}}>🖨 Imprimir</button>}
          <button onClick={cargar} disabled={cargando} style={{padding:'6px 13px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',color:'#444'}}>↺ Actualizar</button>
        </div>
      </div>

      {/* Loading */}
      {cargando && <div style={{textAlign:'center',padding:'60px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Calculando plan de tela...</div>}

      {/* Error */}
      {!cargando && error && (
        <div style={{padding:'18px',background:'var(--red-soft)',border:'1px solid rgba(217,30,30,.3)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>
          ❌ Error: {error}
        </div>
      )}

      {/* Sin comandas */}
      {!cargando && !error && !d.resumen?.length && (
        <div style={{textAlign:'center',padding:'60px 20px',background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'36px',marginBottom:'12px'}}>📦</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>{d.aviso||'No hay comandas en estado PRODUCCIÓN.'}</div>
          <a href="/comandas" style={{display:'inline-block',marginTop:'14px',padding:'7px 16px',background:'none',border:'1px solid var(--border)',color:'#444',textDecoration:'none',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>→ Ir a Comandas</a>
        </div>
      )}

      {/* Plan completo */}
      {!cargando && !error && d.resumen?.length > 0 && (
        <>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'22px'}}>
            {[
              ['Comandas activas', d.comandas, 'en PRODUCCIÓN',    'var(--warn)'],
              ['Total prendas',    d.totalPrendas, 'a confeccionar','var(--blue)'],
              ['Metros netos',     `${d.totalMetros?.toFixed(2)} m`, 'sin merma', 'var(--green)'],
              ['Metros + merma 8%',`${d.totalMetrosMerma?.toFixed(2)} m`,'recomendado comprar','var(--red)'],
            ].map(([lbl,val,sub,col])=>(
              <div key={lbl} style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:`3px solid ${col}`,padding:'18px 16px'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'9px'}}>{lbl}</div>
                <div style={{fontFamily:'Playfair Display,serif',fontSize:'32px',fontWeight:700,lineHeight:1,color:col,marginBottom:'4px'}}>{val}</div>
                <div style={{fontSize:'10px',color:'#555',fontFamily:'DM Mono,monospace'}}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Advertencia merma */}
          <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',background:'var(--warn-soft)',border:'1px solid rgba(154,71,0,.2)',borderLeft:'3px solid var(--warn)',marginBottom:'18px',fontSize:'11px',color:'#6a3500'}}>
            <span style={{fontSize:'15px'}}>⚠️</span>
            <span><strong>Merma textil del 8%</strong> incluida en la columna "Metros + Merma". Corresponde al desperdicio promedio de corte.</span>
          </div>

          {/* Tabla principal */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden',marginBottom:'16px'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'var(--ink)',color:'#fff'}}>
                  {['Tela','Color','Prendas','Metros netos','Metros + Merma (8%)'].map((h,i)=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:i>=2?'right':'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.resumen.map((r,i)=>{
                  const dot=colorHex(r.color);
                  return(
                    <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2?'var(--bg2)':'var(--surface)'}}>
                      <td style={{padding:'11px 14px'}}><strong style={{fontFamily:'Playfair Display,serif',fontSize:'13px'}}>{r.tela}</strong></td>
                      <td style={{padding:'11px 14px'}}>
                        {r.color!=='SEGUN_PRENDA'&&<span style={{width:'9px',height:'9px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.12)',display:'inline-block',verticalAlign:'middle',marginRight:'5px'}}/>}
                        {r.color==='SEGUN_PRENDA'?<em style={{color:'#888',fontSize:'11px'}}>Según prenda</em>:r.color}
                      </td>
                      <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700}}>{r.totalPrendas} uds</td>
                      <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700}}>{r.metros.toFixed(2)} m</td>
                      <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700,color:'var(--warn)'}}>{r.metrosConMerma.toFixed(2)} m</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'var(--ink)',color:'#fff'}}>
                  <td colSpan={2} style={{padding:'10px 14px',fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.14em',textTransform:'uppercase'}}>TOTALES</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700}}>{d.totalPrendas} uds</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700}}>{d.totalMetros?.toFixed(2)} m</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700,color:'#c9a84c'}}>{d.totalMetrosMerma?.toFixed(2)} m</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Detalle por tela (expandible) */}
          {d.resumen.map((r,ri)=>(
            <details key={ri} style={{marginBottom:'8px'}}>
              <summary style={{cursor:'pointer',padding:'9px 14px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'10px',listStyle:'none',display:'flex',justifyContent:'space-between'}}>
                <span>▸ Detalle: <strong>{r.tela}</strong> {r.color!=='SEGUN_PRENDA'?`— ${r.color}`:''}</span>
                <span style={{color:'var(--warn)'}}>{r.metrosConMerma.toFixed(2)} m</span>
              </summary>
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:'none',overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:'#efefef'}}>
                    {['Modelo','Color prenda','Talla','Prendas','Metros'].map(h=>(
                      <th key={h} style={{padding:'7px 12px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#555'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {r.detalle.map((d,di)=>(
                      <tr key={di} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'7px 12px',fontSize:'12px',fontWeight:500}}>{d.modelo}</td>
                        <td style={{padding:'7px 12px',fontSize:'12px'}}>
                          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(d.color),display:'inline-block',verticalAlign:'middle',marginRight:'4px',border:'1px solid rgba(0,0,0,.1)'}}/>
                          {d.color}
                        </td>
                        <td style={{padding:'7px 12px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>{d.talla}</td>
                        <td style={{padding:'7px 12px',fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700}}>{d.prendas}</td>
                        <td style={{padding:'7px 12px',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{d.metros.toFixed(2)} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}

          {/* Sin receta */}
          {d.sinReceta?.length>0&&(
            <div style={{padding:'14px 18px',background:'var(--warn-soft)',border:'1px solid rgba(154,71,0,.3)',borderLeft:'4px solid var(--warn)',marginTop:'16px'}}>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--warn)',marginBottom:'10px',fontWeight:700}}>⚠ Modelos sin receta configurada ({d.sinReceta.length})</div>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'10px'}}>Estos productos no pudieron incluirse en el plan. Configura sus recetas en la tabla <strong>recetas</strong> de Supabase.</div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'rgba(154,71,0,.1)'}}>
                  {['Modelo','Color','Talla','Prendas'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--warn)'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {d.sinReceta.map((p,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid rgba(154,71,0,.15)'}}>
                      <td style={{padding:'6px 10px',fontSize:'12px'}}>{p.modelo}</td>
                      <td style={{padding:'6px 10px',fontSize:'12px'}}>{p.color||'—'}</td>
                      <td style={{padding:'6px 10px',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{p.talla||'—'}</td>
                      <td style={{padding:'6px 10px',fontFamily:'DM Mono,monospace',fontWeight:700,fontSize:'11px'}}>{p.totalPrendas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {d.generadoEn&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',textAlign:'right',marginTop:'12px'}}>Generado: {new Date(d.generadoEn).toLocaleString('es-VE')}</div>}
        </>
      )}
    </Shell>
  );
}
