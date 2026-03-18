'use client';
import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/Shell';

const PER = 25;

export default function LogsPage() {
  const [logs, setLogs]     = useState([]);
  const [cargando, setLoad] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [resultado, setRes] = useState('');
  const [pagina, setPag]    = useState(1);

  async function cargar() {
    setLoad(true);
    try {
      const res = await fetch('/api/logs').then(r=>r.json());
      setLogs(Array.isArray(res)?res:[]);
    } catch(e) { setLogs([]); }
    setLoad(false);
  }

  useEffect(()=>{cargar();},[]);

  const filtrados = useMemo(()=>{
    const q=buscar.toLowerCase();
    return logs.filter(l=>{
      if(q&&!`${l.accion||''} ${l.usuario||''} ${l.detalle||''}`.toLowerCase().includes(q)) return false;
      if(resultado==='OK'&&l.resultado!=='OK') return false;
      if(resultado==='ERROR'&&l.resultado==='OK') return false;
      return true;
    });
  },[logs,buscar,resultado]);

  const totalPag = Math.max(1,Math.ceil(filtrados.length/PER));
  const slice    = filtrados.slice((pagina-1)*PER,pagina*PER);

  const inp={padding:'7px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',outline:'none'};

  return (
    <Shell title="Registro de Auditoría">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Registro de Auditoría</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#555',marginTop:'2px'}}>Historial de acciones del sistema</div>
        </div>
        <button onClick={cargar} style={{padding:'6px 13px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',color:'#444'}}>↺ Actualizar</button>
      </div>

      <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',flex:1}}>
          <span style={{color:'#555'}}>🔍</span>
          <input value={buscar} onChange={e=>{setBuscar(e.target.value);setPag(1);}} placeholder="Buscar acción, usuario, detalle..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',width:'100%'}} />
        </div>
        <select value={resultado} onChange={e=>{setRes(e.target.value);setPag(1);}} style={{...inp,minWidth:'130px'}}>
          <option value="">Todos</option>
          <option value="OK">OK</option>
          <option value="ERROR">Errores</option>
        </select>
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
        {cargando ? (
          <div style={{padding:'40px',textAlign:'center',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Cargando logs...</div>
        ) : (
          <>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:'700px'}}>
                <thead>
                  <tr style={{background:'#efefef'}}>
                    {['Fecha / Hora','Usuario','Acción','Detalle','Resultado'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#444',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slice.map((l,i)=>{
                    const ok=l.resultado==='OK';
                    return (
                      <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666',whiteSpace:'nowrap'}}>{l.timestamp||'—'}</td>
                        <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{l.usuario||'—'}</td>
                        <td style={{padding:'9px 12px'}}>
                          <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'2px 7px',background:'var(--bg3)',border:'1px solid var(--border)',color:ok?'#155e30':'#a81818'}}>
                            {l.accion||'—'}
                          </span>
                        </td>
                        <td style={{padding:'9px 12px',fontSize:'11px',color:'#444',maxWidth:'260px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.detalle||'—'}</td>
                        <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:ok?'var(--green)':'var(--red)',fontWeight:700}}>{l.resultado||'—'}</td>
                      </tr>
                    );
                  })}
                  {!slice.length&&<tr><td colSpan={5} style={{textAlign:'center',padding:'40px',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Sin registros</td></tr>}
                </tbody>
              </table>
            </div>
            {totalPag>1&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid var(--border)',background:'var(--bg2)'}}>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>{filtrados.length} registros</span>
                <div style={{display:'flex',gap:'4px'}}>
                  <button disabled={pagina===1} onClick={()=>setPag(p=>p-1)} style={{padding:'4px 9px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',opacity:pagina===1?.3:1}}>‹</button>
                  <button disabled={pagina===totalPag} onClick={()=>setPag(p=>p+1)} style={{padding:'4px 9px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',opacity:pagina===totalPag?.3:1}}>›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
