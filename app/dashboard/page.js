'use client';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

const COLOR_MAP={'BLANCO':'#d0d0d0','NEGRO':'#1a1a1a','AZUL':'#3b6fd4','ROJO':'#d63b3b','VERDE':'#2d9e4a','ROSA':'#f07aa0','GRIS':'#6b7280','AMARILLO':'#f5c842','NARANJA':'#f57c42','MORADO':'#7c4fd4','VINOTINTO':'#8b2035','BEIGE':'#d4b896','CORAL':'#f26e5b','CELESTE':'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return COLOR_MAP[k]||COLOR_MAP[k.split(' ')[0]]||'#9ca3af';}
function fmtF(d){if(!d)return '—';const p=d.split('-');return (p[2]||'')+'/'+(p[1]||'')+'/'+(p[0]||'');}
function estD(n){if(n<=0)return 'zero';if(n<=3)return 'low';return 'ok';}

export default function DashboardPage() {
  const { data, cargando } = useAppData() || {};

  if (cargando || !data) return (
    <Shell title="Dashboard">
      <div style={{textAlign:'center',padding:'60px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>
        ⏳ Cargando datos de Supabase...
      </div>
    </Shell>
  );

  const { productos, movimientos, comandas } = data;
  const stockTotal    = productos.reduce((a,p)=>a+(p.disponible||0),0);
  const modelosUnicos = new Set(productos.map(p=>p.modelo)).size;
  const stockCritico  = productos.filter(p=>p.disponible===0).length;
  const today         = new Date().toISOString().split('T')[0];
  const movsHoy       = movimientos.filter(m=>m.fecha===today).length;
  const cmdsPend      = (comandas||[]).filter(c=>c.status==='pendiente').length;
  const cmdsProd      = (comandas||[]).filter(c=>c.status==='produccion').length;
  const recientes     = movimientos.slice(0,10);
  const criticos      = productos.filter(p=>p.disponible<=3).sort((a,b)=>a.disponible-b.disponible).slice(0,10);

  return (
    <Shell title="Dashboard">
      {/* Hero */}
      <div style={{background:'var(--ink)',padding:'20px 22px',marginBottom:'18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'14px',flexWrap:'wrap'}}>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--red)',letterSpacing:'.2em',textTransform:'uppercase',marginBottom:'5px'}}>Fábrica de Ropa Mayorista</div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'18px',fontWeight:700,color:'#fff',lineHeight:1.25,marginBottom:'5px'}}>Moditex Group:<br/>Fabricamos tu propia marca</div>
          <div style={{fontSize:'11px',color:'rgba(255,255,255,.6)'}}>Venta mayorista · Enterizos · Jackets · Conjuntos</div>
        </div>
        <a href="https://wa.me/584120363131?text=Hola%20Moditex" target="_blank" rel="noreferrer"
          style={{padding:'10px 16px',background:'#25d366',color:'#000',fontWeight:700,textDecoration:'none',fontSize:'12px',fontFamily:'Poppins,sans-serif',textTransform:'uppercase',flexShrink:0,display:'flex',alignItems:'center',gap:'6px'}}>
          📱 WhatsApp
        </a>
      </div>

      {/* KPIs — 2 col en mobile, 4 en desktop */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px',marginBottom:'20px'}}>
        {[
          ['Modelos únicos',   modelosUnicos, 'productos distintos',    'var(--red)'],
          ['Stock disponible', stockTotal,    'unidades en inventario', 'var(--green)'],
          ['Movimientos hoy',  movsHoy,       'entradas + salidas',     '#1440b0'],
          ['Stock crítico',    stockCritico,  'colores en 0 unidades',  'var(--warn)'],
        ].map(([lbl,val,sub,col]) => (
          <div key={lbl} style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:`3px solid ${col}`,padding:'14px 12px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'10px'}}>{lbl}</div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'28px',fontWeight:700,lineHeight:1,color:col,marginBottom:'4px'}}>{val}</div>
            <div style={{fontSize:'10px',color:'#555',fontFamily:'DM Mono,monospace'}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Comandas mini */}
      {(cmdsPend > 0 || cmdsProd > 0) && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'22px'}}>
          <div style={{background:'#fff3cd',border:'1px solid rgba(133,100,4,.2)',padding:'14px 16px',borderLeft:'3px solid #856404'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#856404',marginBottom:'5px'}}>Comandas pendientes</div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'26px',fontWeight:700,color:'#856404'}}>{cmdsPend}</div>
          </div>
          <div style={{background:'#cfe2ff',border:'1px solid rgba(10,88,202,.2)',padding:'14px 16px',borderLeft:'3px solid #0a58ca'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#0a58ca',marginBottom:'5px'}}>En producción</div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'26px',fontWeight:700,color:'#0a58ca'}}>{cmdsProd}</div>
          </div>
        </div>
      )}

      {/* Últimos movimientos */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
        <div style={{fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700}}>Últimos Movimientos</div>
        <a href="/historial" style={{fontSize:'11px',color:'var(--red)',textDecoration:'none'}}>Ver historial completo →</a>
      </div>
      <div class="table-scroll" style={{marginBottom:'20px'}}><div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden',minWidth:'500px'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#efefef'}}>
              {['Fecha','SKU','Modelo','Color','Tipo','Cant.','Concepto'].map(h=>(
                <th key={h} style={{padding:'8px 12px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#444'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recientes.map((m,i) => {
              const p = productos.find(x=>x.sku===m.sku);
              return (
                <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'9px 12px',fontSize:'12px'}}>{fmtF(m.fecha)}</td>
                  <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)'}}>{m.sku}</td>
                  <td style={{padding:'9px 12px',fontSize:'12px',fontWeight:500}}>{p?.modelo||'—'}</td>
                  <td style={{padding:'9px 12px',fontSize:'12px'}}>
                    {p&&<><span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(p.color),display:'inline-block',verticalAlign:'middle',marginRight:'4px'}}/>  {p.color}</>}
                  </td>
                  <td style={{padding:'9px 12px'}}>
                    {m.tipo==='ENTRADA'
                      ? <span style={{background:'var(--green-soft)',color:' #155e30',padding:'2px 8px',fontFamily:'DM Mono,monospace',fontSize:'9px'}}>↑ Entrada</span>
                      : <span style={{background:'var(--red-soft)',color:'#a81818',padding:'2px 8px',fontFamily:'DM Mono,monospace',fontSize:'9px'}}>↓ Salida</span>}
                  </td>
                  <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontWeight:700,color:m.tipo==='ENTRADA'?'var(--green)':'var(--red)'}}>{m.tipo==='ENTRADA'?'+':'-'}{m.cantidad}</td>
                  <td style={{padding:'9px 12px',fontSize:'11px',color:'#666'}}>{m.concepto||'—'}</td>
                </tr>
              );
            })}
            {!recientes.length && <tr><td colSpan={7} style={{textAlign:'center',padding:'36px',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Sin movimientos aún</td></tr>}
          </tbody>
        </table>
      </div></div>

      {/* Stock crítico */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
        <div style={{fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700}}>Stock Bajo / Crítico</div>
        <a href="/alertas" style={{fontSize:'11px',color:'var(--red)',textDecoration:'none'}}>Ver todas las alertas →</a>
      </div>
      {criticos.length ? (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#efefef'}}>
              {['SKU','Categoría','Modelo','Color','Disponible','Estado'].map(h=>(
                <th key={h} style={{padding:'8px 12px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#444'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {criticos.map(p=>{
                const e=estD(p.disponible);
                return <tr key={p.sku} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)'}}>{p.sku}</td>
                  <td style={{padding:'9px 12px'}}><span style={{background:'var(--bg3)',padding:'2px 7px',fontFamily:'DM Mono,monospace',fontSize:'9px'}}>{p.categoria}</span></td>
                  <td style={{padding:'9px 12px',fontWeight:600}}>{p.modelo}</td>
                  <td style={{padding:'9px 12px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(p.color),display:'inline-block',verticalAlign:'middle',marginRight:'4px'}}/>{p.color}</td>
                  <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontWeight:700,color:e==='zero'?'var(--red)':e==='low'?'var(--warn)':'var(--green)'}}>{p.disponible}</td>
                  <td style={{padding:'9px 12px'}}><span style={{padding:'2px 8px',fontFamily:'DM Mono,monospace',fontSize:'9px',background:e==='zero'?'var(--red-soft)':e==='low'?'var(--warn-soft)':'var(--green-soft)',color:e==='zero'?'#a81818':e==='low'?'#7a3500':'#155e30'}}>{e==='zero'?'Sin stock':e==='low'?'Stock bajo':'En stock'}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{padding:'24px',background:'var(--surface)',border:'1px solid var(--border)',textAlign:'center',color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>
          ✓ Todo el inventario está bien abastecido
        </div>
      )}
    </Shell>
  );
}