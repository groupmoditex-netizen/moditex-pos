'use client';
import { useState } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

const COLOR_MAP={'BLANCO':'#d0d0d0','NEGRO':'#1a1a1a','AZUL':'#3b6fd4','ROJO':'#d63b3b','VERDE':'#2d9e4a','ROSA':'#f07aa0','GRIS':'#6b7280','AMARILLO':'#f5c842','NARANJA':'#f57c42','MORADO':'#7c4fd4','VINOTINTO':'#8b2035','BEIGE':'#d4b896','CORAL':'#f26e5b','CELESTE':'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return COLOR_MAP[k]||COLOR_MAP[k.split(' ')[0]]||'#9ca3af';}

export default function AlertasPage() {
  const { data, cargando, recargar } = useAppData() || {};
  const [loading, setLoading] = useState({});
  const [msgs, setMsgs]       = useState({});

  const { productos = [] } = data || {};
  const criticos = productos.filter(p=>p.disponible===0).sort((a,b)=>a.modelo.localeCompare(b.modelo));
  const bajos    = productos.filter(p=>p.disponible>0&&p.disponible<=3).sort((a,b)=>a.disponible-b.disponible);

  async function entradaRapida(sku, cant=1) {
    setLoading(l=>({...l,[sku]:true}));
    try {
      const res = await fetch('/api/movimientos', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ sku, tipo:'ENTRADA', cantidad:cant, concepto:'Entrada rápida desde alertas' }),
      }).then(r=>r.json());
      if (res.ok) {
        setMsgs(m=>({...m,[sku]:{type:'ok',text:`✓ +${cant} ud${cant>1?'s':''} agregada${cant>1?'s':''}`}}));
        recargar();
      } else {
        setMsgs(m=>({...m,[sku]:{type:'err',text:res.error}}));
      }
    } catch(e) {
      setMsgs(m=>({...m,[sku]:{type:'err',text:'Error de conexión'}}));
    }
    setLoading(l=>({...l,[sku]:false}));
    setTimeout(()=>setMsgs(m=>{const n={...m};delete n[sku];return n;}),3000);
  }

  function AlertItem({ p, esCritico }) {
    const msg = msgs[p.sku];
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:'14px',
        padding:'14px 18px', background:'var(--surface)',
        border:'1px solid var(--border)',
        borderLeft:`3px solid ${esCritico?'var(--red)':'var(--warn)'}`,
        marginBottom:'8px',
      }}>
        <span style={{
          width:'12px', height:'12px', borderRadius:'50%',
          background:esCritico?'var(--red)':'var(--warn)',
          flexShrink:0,
        }}/>
        <div style={{flex:1}}>
          <div style={{fontSize:'13px',fontWeight:600}}>
            {p.modelo} — <span style={{display:'inline-flex',alignItems:'center',gap:'4px'}}>
              <span style={{width:'9px',height:'9px',borderRadius:'50%',background:colorHex(p.color),display:'inline-block',border:'1px solid rgba(0,0,0,.1)'}}/>
              {p.color}
            </span>
          </div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',marginTop:'2px'}}>
            {p.sku} · {p.categoria}
          </div>
          {msg && (
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:msg.type==='ok'?'var(--green)':'var(--red)',marginTop:'4px'}}>{msg.text}</div>
          )}
        </div>
        <div style={{textAlign:'right',marginRight:'8px'}}>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'22px',fontWeight:700,color:esCritico?'var(--red)':'var(--warn)',lineHeight:1}}>{p.disponible}</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',marginTop:'2px'}}>disponible</div>
        </div>
        <button
          onClick={() => entradaRapida(p.sku)}
          disabled={loading[p.sku]}
          style={{
            padding:'7px 14px', background:'var(--red)', color:'#fff',
            border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif',
            fontSize:'11px', fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase',
            opacity:loading[p.sku]?.6:1, flexShrink:0,
          }}>
          {loading[p.sku] ? '⏳' : '+ ENTRADA'}
        </button>
      </div>
    );
  }

  return (
    <Shell title="Alertas de Stock">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Alertas de Stock</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#555',marginTop:'2px'}}>Colores que necesitan reposición</div>
        </div>
        <button onClick={recargar} style={{padding:'6px 13px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',color:'#444'}}>
          ↺ Actualizar
        </button>
      </div>

      {cargando && <div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando...</div>}

      {!cargando && criticos.length === 0 && bajos.length === 0 && (
        <div style={{textAlign:'center',padding:'60px',background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'36px',marginBottom:'12px'}}>✅</div>
          <div style={{color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'12px'}}>¡Todo el inventario está bien abastecido!</div>
        </div>
      )}

      {criticos.length > 0 && (
        <>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--red)',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'10px',marginTop:'4px',display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{width:'8px',height:'8px',background:'var(--red)',borderRadius:'50%',display:'inline-block'}}/>
            SIN STOCK ({criticos.length})
          </div>
          {criticos.map(p=><AlertItem key={p.sku} p={p} esCritico={true}/>)}
        </>
      )}

      {bajos.length > 0 && (
        <>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--warn)',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'10px',marginTop:'20px',display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{width:'8px',height:'8px',background:'var(--warn)',borderRadius:'50%',display:'inline-block'}}/>
            STOCK BAJO ({bajos.length})
          </div>
          {bajos.map(p=><AlertItem key={p.sku} p={p} esCritico={false}/>)}
        </>
      )}
    </Shell>
  );
}
