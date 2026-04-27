'use client';
import { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/AuthContext';

const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};
const inp = {width:'100%',padding:'10px 12px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'15px',outline:'none',boxSizing:'border-box',fontWeight:700};

export default function TasaPage() {
  const { usuario } = useAuth() || {};
  const [config,      setConfig]      = useState(null);
  const [historial,   setHistorial]   = useState([]);
  const [loadH,       setLoadH]       = useState(true);
  const [editando,    setEditando]    = useState(false);
  const [nuevaTasa,   setNuevaTasa]   = useState('');
  const [motivo,      setMotivo]      = useState('');
  const [guardando,   setGuardando]   = useState(false);
  const [msg,         setMsg]         = useState('');
  const [err,         setErr]         = useState('');
  // ── Fetch automático BCV ─────────────────────────────────────
  const [bcvData,     setBcvData]     = useState(null);   // { tasa, venta, compra, fuente, fecha }
  const [fetchingBCV, setFetchingBCV] = useState(false);
  const [bcvErr,      setBcvErr]      = useState('');

  async function cargar() {
    const [rc, rh] = await Promise.all([
      fetch('/api/tasa').then(r=>r.json()),
      fetch('/api/tasa/historial').then(r=>r.json()).catch(()=>({ok:false,historial:[]})),
    ]);
    if(rc.ok) setConfig(rc);
    if(rh.ok) setHistorial(rh.historial||[]);
    setLoadH(false);
  }

  useEffect(()=>{ cargar(); },[]);

  async function fetchDesdeBCV() {
    setFetchingBCV(true); setBcvErr('');
    try {
      const res = await fetch('/api/tasa/bcv').then(r=>r.json());
      if(res.ok && res.tasa) {
        setBcvData(res);
        setNuevaTasa(res.tasa.toFixed(2));
        setMotivo(`BCV oficial ${res.fuente||''} — ${res.fechaActualizacion ? new Date(res.fechaActualizacion).toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric'}) : 'hoy'}`.trim());
        if(!editando) setEditando(true);
      } else {
        setBcvErr(res.error||'No se pudo obtener la tasa del BCV');
      }
    } catch(e) {
      setBcvErr('Error de conexión con DolarApi');
    }
    setFetchingBCV(false);
  }

  async function guardar() {
    const t = parseFloat(nuevaTasa);
    if(!t||t<=0) { setErr('Ingresa una tasa válida'); return; }
    setGuardando(true); setErr(''); setMsg('');
    const res = await fetch('/api/tasa',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ tasa_nueva:t, usuario: usuario?.nombre||'Sistema', motivo:motivo||'Actualización manual' }),
    }).then(r=>r.json());
    if(res.ok){
      setMsg(`✅ Tasa actualizada: ${res.tasa_anterior??'—'} → ${res.tasa_nueva} Bs/€`);
      setEditando(false); setNuevaTasa(''); setMotivo('');
      cargar();
    } else {
      setErr(res.error||'Error al guardar');
    }
    setGuardando(false);
  }

  return (
    <Shell title="Tasa Cambiaria">
      <div style={{maxWidth:'640px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'18px'}}>

        {/* Card tasa actual */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:'3px solid #c9a84c',padding:'20px 22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px'}}>
            <div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.18em',textTransform:'uppercase',color:'#888',marginBottom:'8px'}}>
                TASA ACTUAL BS/€
              </div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'36px',fontWeight:900,color:'#c9a84c',lineHeight:1}}>
                {config ? config.tasa_bs_eur?.toFixed(2) : '—'}
              </div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'6px'}}>
                1 EUR = {config ? config.tasa_bs_eur?.toFixed(2) : '—'} Bs
                {config?.updated_at && (
                  <span style={{marginLeft:'10px',color:'#bbb'}}>
                    · Actualizado {new Date(config.updated_at).toLocaleString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    {config.updated_by && ` por ${config.updated_by}`}
                  </span>
                )}
              </div>
            </div>
            {!editando && (
              <div style={{display:'flex',gap:'8px',flexShrink:0,flexWrap:'wrap'}}>
                {/* Botón fetch BCV */}
                <button
                  onClick={fetchDesdeBCV}
                  disabled={fetchingBCV}
                  title="Obtiene la tasa EUR oficial del BCV desde DolarApi"
                  style={{padding:'9px 14px',background:fetchingBCV?'#f5f5f5':'#eff6ff',color:'#3b82f6',border:'1px solid #3b82f6',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,flexShrink:0,display:'flex',alignItems:'center',gap:'5px',opacity:fetchingBCV?.7:1}}>
                  {fetchingBCV ? '⏳ Buscando...' : '🏦 Tasa BCV'}
                </button>
                <button onClick={()=>{ setEditando(true); setNuevaTasa(config?.tasa_bs_eur?.toString()||''); setBcvData(null); setErr(''); setMsg(''); }}
                  style={{padding:'9px 16px',background:'#c9a84c',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,flexShrink:0}}>
                  ✏️ Manual
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form edición */}
        {editando && (
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:'3px solid #f59e0b',padding:'20px 22px',display:'flex',flexDirection:'column',gap:'14px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#f59e0b',fontWeight:700}}>
              ✏️ ACTUALIZAR TASA — esta acción queda en el historial de auditoría
            </div>

            {/* Banner BCV si se fetchó */}
            {bcvData && (
              <div style={{padding:'10px 13px',background:'#eff6ff',border:'1px solid #93c5fd',borderLeft:'3px solid #3b82f6',display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontSize:'16px'}}>🏦</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,color:'#1d4ed8',letterSpacing:'.06em'}}>TASA BCV OFICIAL ({bcvData.fuente})</div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#1e40af',marginTop:'2px'}}>
                    Compra: <strong>{bcvData.compra?.toFixed(2)}</strong> · Venta: <strong style={{color:'#c9a84c'}}>{bcvData.venta?.toFixed(2)}</strong> Bs/€
                    {bcvData.fechaActualizacion && (
                      <span style={{marginLeft:'10px',color:'#60a5fa',fontSize:'9px'}}>
                        · {new Date(bcvData.fechaActualizacion).toLocaleString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#60a5fa'}}>✓ Pre-rellenado</span>
              </div>
            )}

            {bcvErr && <div style={{padding:'8px 11px',background:'#fff1f2',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>⚠️ {bcvErr}</div>}
            {err && <div style={{padding:'8px 11px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{err}</div>}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={lbl}>Nueva tasa Bs/€</label>
                <input
                  type="number" step="0.01" min="0"
                  value={nuevaTasa}
                  onChange={e=>setNuevaTasa(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') guardar(); }}
                  placeholder="ej: 97.50"
                  autoFocus
                  style={inp}
                />
                {nuevaTasa && parseFloat(nuevaTasa)>0 && (
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'4px'}}>
                    Preview: 1 EUR = {parseFloat(nuevaTasa).toFixed(2)} Bs
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Motivo del cambio</label>
                <input
                  value={motivo}
                  onChange={e=>setMotivo(e.target.value)}
                  placeholder="ej: BCV oficial del día"
                  style={{...inp, fontSize:'13px', fontWeight:400, fontFamily:'Poppins,sans-serif'}}
                />
              </div>
            </div>

            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
              <button onClick={()=>{setEditando(false);setErr('');}}
                style={{padding:'9px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando||!nuevaTasa}
                style={{padding:'9px 24px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,opacity:guardando?.6:1}}>
                {guardando ? '⏳ Guardando...' : '💾 Guardar tasa'}
              </button>
            </div>
          </div>
        )}

        {msg && (
          <div style={{padding:'11px 14px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--green)',fontWeight:700}}>
            {msg}
          </div>
        )}

        {/* Historial de auditoría */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{padding:'11px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#555',fontWeight:700}}>
              📋 Historial de auditoría
            </span>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#999'}}>{historial.length} cambios</span>
          </div>
          {loadH ? (
            <div style={{padding:'24px',textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>Cargando historial...</div>
          ) : historial.length===0 ? (
            <div style={{padding:'24px',textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#bbb'}}>Sin cambios registrados aún</div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>
                <thead>
                  <tr style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)'}}>
                    {['Fecha','Anterior','Nueva','Cambio','Usuario','Motivo'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.1em',textTransform:'uppercase',color:'#666',fontWeight:700}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...historial].reverse().map((h,i)=>{
                    const diff = h.tasa_nueva - (h.tasa_anterior||0);
                    return(
                      <tr key={h.id||i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'var(--surface)':'var(--bg2)'}}>
                        <td style={{padding:'9px 12px',color:'#999',fontSize:'9px',whiteSpace:'nowrap'}}>
                          {new Date(h.created_at).toLocaleString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td style={{padding:'9px 12px',color:'#888'}}>{h.tasa_anterior!=null?h.tasa_anterior.toFixed(2):'—'}</td>
                        <td style={{padding:'9px 12px',fontWeight:700,color:'#c9a84c'}}>{h.tasa_nueva.toFixed(2)}</td>
                        <td style={{padding:'9px 12px',color:diff>0?'var(--red)':diff<0?'var(--green)':'#aaa',fontWeight:700}}>
                          {diff===0?'=':diff>0?`+${diff.toFixed(2)}`:`${diff.toFixed(2)}`}
                        </td>
                        <td style={{padding:'9px 12px',color:'#555'}}>{h.usuario||'—'}</td>
                        <td style={{padding:'9px 12px',color:'#888',fontSize:'9px'}}>{h.motivo||'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Calculadora rápida */}
        {config?.tasa_bs_eur && (
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',padding:'16px 18px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#555',marginBottom:'12px',fontWeight:700}}>
              🧮 CALCULADORA RÁPIDA
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              {[
                {label:'€1 →', val:`Bs. ${config.tasa_bs_eur.toFixed(2)}`},
                {label:'€5 →', val:`Bs. ${(config.tasa_bs_eur*5).toFixed(2)}`},
                {label:'€10 →', val:`Bs. ${(config.tasa_bs_eur*10).toFixed(2)}`},
                {label:'€50 →', val:`Bs. ${(config.tasa_bs_eur*50).toFixed(2)}`},
                {label:'€100 →', val:`Bs. ${(config.tasa_bs_eur*100).toFixed(2)}`},
                {label:'€500 →', val:`Bs. ${(config.tasa_bs_eur*500).toFixed(2)}`},
              ].map(({label,val})=>(
                <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>{label}</span>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:'#333'}}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}
