'use client';
import { colorHex } from '@/utils/colores';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

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
      {/* ── Hero Banner con foto real ── */}
      <div style={{
        position:'relative', marginBottom:'20px',
        minHeight:'220px', overflow:'hidden',
        background:'#0a0a0a',
      }}>
        {/* Foto de fondo */}
        <img
          src="https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/moditex-hero.png"
          alt="Moditex Group"
          style={{
            position:'absolute', inset:0, width:'100%', height:'100%',
            objectFit:'cover', objectPosition:'center top',
            opacity:0.45,
          }}
        />
        {/* Overlay gradiente */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(to right, rgba(10,10,10,.92) 0%, rgba(10,10,10,.6) 50%, rgba(10,10,10,.3) 100%)',
        }}/>
        {/* Contenido */}
        <div style={{
          position:'relative', zIndex:2,
          padding:'30px 28px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:'20px', flexWrap:'wrap',
        }}>
          <div>
            <img src="https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/moditex-logo.jpg" alt="Moditex Group"
              style={{ height:'64px', width:'auto', objectFit:'contain', marginBottom:'12px', display:'block' }} />
            <div style={{
              fontFamily:"'DM Mono',monospace", fontSize:'9px',
              color:'#c9a84c', letterSpacing:'.22em',
              textTransform:'uppercase', marginBottom:'8px',
            }}>
              Fábrica de Ropa Mayorista · Barquisimeto
            </div>
            <div style={{
              fontFamily:"'Playfair Display',serif", fontSize:'13px',
              color:'rgba(255,255,255,.7)', lineHeight:1.6,
            }}>
              Venta mayorista · Enterizos · Jackets · Conjuntos · Marca Propia
            </div>
          </div>
          <a href="https://wa.me/584120363131?text=Hola%20Moditex" target="_blank" rel="noreferrer"
            style={{
              padding:'11px 20px', background:'#25d366', color:'#000',
              fontWeight:700, textDecoration:'none', fontSize:'12px',
              fontFamily:"'Poppins',sans-serif", textTransform:'uppercase',
              flexShrink:0, display:'flex', alignItems:'center', gap:'7px',
              letterSpacing:'.06em',
            }}>
            📱 WhatsApp
          </a>
        </div>
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