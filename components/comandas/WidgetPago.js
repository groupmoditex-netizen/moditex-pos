'use client';
import React, { useState, useEffect } from 'react';

const METODOS = [
  {id:'pago_movil',  label:'Pago Móvil',   icon:'📱', divisa:'BS'},
  {id:'transferencia',label:'Transf. BS',   icon:'🏦', divisa:'BS'},
  {id:'efectivo_bs', label:'Efectivo BS',   icon:'💵', divisa:'BS'},
  {id:'punto_venta', label:'Punto Venta',   icon:'💳', divisa:'BS'},
  {id:'zelle',       label:'Zelle',         icon:'💸', divisa:'USD'},
  {id:'efectivo_usd',label:'Efectivo USD',  icon:'🇺🇸', divisa:'USD'},
  {id:'binance',     label:'Binance/USDT',  icon:'🔶', divisa:'USDT'},
  {id:'efectivo_eur',label:'Efectivo €',    icon:'💶', divisa:'EUR'},
  {id:'transferencia_eur',label:'Transf. €',icon:'🇪🇺', divisa:'EUR'},
];

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};

function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}

export default function WidgetPago({ comandaId, saldo=0, onPagoRegistrado }) {
  const [tasaConfig, setTasaConfig] = useState(null);
  useEffect(()=>{
    fetch('/api/tasa').then(r=>r.json())
      .then(d=>{ if(d.ok&&d.tasa_bs_eur) setTasaConfig(d.tasa_bs_eur); })
      .catch(()=>{});
  },[]);

  const [metodo,  setMetodo]  = useState('');
  const [divisa,  setDivisa]  = useState('EUR');
  const [monto,   setMonto]   = useState('');
  const [tasa,    setTasa]    = useState('');
  const [ref,     setRef]     = useState('');
  const [lineas,  setLineas]  = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [ok,      setOk]      = useState('');

  function preRellenarTasa(){ if(tasaConfig&&!tasa) setTasa(tasaConfig.toFixed(2)); }

  function selMetodo(id){
    const cfg=METODOS.find(m=>m.id===id);
    setMetodo(id);
    if(cfg){ setDivisa(cfg.divisa); if(cfg.divisa==='BS') preRellenarTasa(); }
  }
  function handleDivisaChange(v){ setDivisa(v); if(v==='BS') preRellenarTasa(); }

  const md=parseFloat(monto)||0;
  const ts=parseFloat(tasa)||0;
  const previewEUR = divisa==='BS'?(ts>0?md/ts:0):md;
  const totalLineas = lineas.reduce((a,l)=>a+l.previewEUR,0);
  const saldoRestante = Math.max(0,saldo-totalLineas);
  const puedAgregar = metodo&&md>0&&(divisa!=='BS'||ts>0);

  function agregarLinea(){
    setErr('');
    if(!metodo){ setErr('Selecciona un método'); return; }
    if(md<=0)  { setErr('Ingresa el monto'); return; }
    if(divisa==='BS'&&ts<=0){ setErr('Ingresa la tasa BS/€'); return; }
    const mcfg=METODOS.find(m=>m.id===metodo);
    setLineas(prev=>[...prev,{ metodo, divisa, monto:md, tasa:ts, ref, previewEUR, label:mcfg?.label||metodo, icon:mcfg?.icon||'💰' }]);
    setMonto(''); setRef('');
  }

  async function registrar(){
    setErr(''); setOk('');
    const todas = lineas.length>0 ? lineas : (md>0&&metodo ? [{metodo,divisa,monto:md,tasa:ts,ref,previewEUR,label:METODOS.find(m=>m.id===metodo)?.label||metodo}] : []);
    if(todas.length===0){ setErr('Agrega al menos un pago'); return; }
    setSaving(true);
    let montoTotal=0;
    for(const l of todas){
      try{
        const res=await fetch('/api/pagos',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({comanda_id:comandaId,metodo:l.metodo,divisa:l.divisa,monto_divisa:l.monto,tasa_bs:l.tasa||0,referencia:l.ref||''})
        }).then(r=>r.json());
        if(!res.ok){ setErr(res.error||'Error al registrar pago'); setSaving(false); return; }
        montoTotal+=res.montoEUR||l.previewEUR;
      }catch(e){ setErr('Error de conexión'); setSaving(false); return; }
    }
    const n=todas.length;
    setOk(`✓ ${n} pago${n!==1?'s':''} registrado${n!==1?'s':''} · € ${fmtNum(montoTotal)}`);
    setLineas([]); setMetodo(''); setMonto(''); setTasa(''); setRef(''); setDivisa('EUR');
    if(onPagoRegistrado) onPagoRegistrado(montoTotal);
    setSaving(false);
    setTimeout(()=>setOk(''), 5000);
  }

  return (
    <div className="premium-pago-widget" style={{
      background: 'rgba(245,158,11,0.03)',
      border: '1px solid rgba(245,158,11,0.15)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      marginTop: '10px'
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700,color:'var(--ink)'}}>💰 Registro de Pago</div>
        {tasaConfig&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',background:'var(--bg2)',padding:'4px 10px',borderRadius:'20px',border:'1px solid var(--border)',color:'#777'}}>Tasa: <strong>{tasaConfig.toFixed(2)}</strong> Bs/€</div>}
      </div>

      {err&&<div style={{padding:'10px 14px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'Poppins,sans-serif',fontSize:'11px',borderRadius:'8px',border:'1px solid rgba(217,30,30,0.1)'}}>⚠️ {err}</div>}
      {ok &&<div style={{padding:'10px 14px',background:'var(--green-soft)',color:'var(--green)',fontFamily:'Poppins,sans-serif',fontSize:'11px',borderRadius:'8px',border:'1px solid rgba(34,197,94,0.1)'}}>✅ {ok}</div>}

      {lineas.length>0&&(
        <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden',boxShadow:'0 4px 12px rgba(0,0,0,0.03)'}}>
          <div style={{padding:'10px 15px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,color:'#777',textTransform:'uppercase'}}>Resumen Multipago</span>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:'var(--green)'}}>Total: € {fmtNum(totalLineas)}</span>
          </div>
          {lineas.map((l,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 15px',borderBottom:'1px solid var(--border-soft)'}}>
              <span style={{fontSize:'18px'}}>{l.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:'12px',fontWeight:600}}>{l.label}</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>{l.ref ? `Ref: ${l.ref}` : 'Sin referencia'} · {l.divisa==='BS'?`Bs.${fmtNum(l.monto)} @ ${l.tasa}`:`${l.divisa} ${fmtNum(l.monto)}`}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:'var(--green)'}}>€ {fmtNum(l.previewEUR)}</div>
              </div>
              <button onClick={()=>setLineas(p=>p.filter((_,j)=>j!==i))} style={{marginLeft:'10px',background:'none',border:'none',cursor:'pointer',fontSize:'14px',opacity:.4}}>✕</button>
            </div>
          ))}
          <div style={{padding:'8px 15px',textAlign:'right',background:'var(--bg3)',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,color:saldoRestante<=0.01?'var(--green)':'var(--red)'}}>
            {saldoRestante<=0.01?'✓ Saldo cubierto':`Pendiente: € ${fmtNum(saldoRestante)}`}
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))',gap:'8px'}}>
        {METODOS.map(m=>(
          <button key={m.id} onClick={()=>selMetodo(m.id)}
            style={{
              padding:'12px 8px',
              background:metodo===m.id?'var(--ink)':'#fff',
              color:metodo===m.id?'#fff':'var(--ink)',
              border:metodo===m.id?'1px solid var(--ink)':'1px solid var(--border)',
              borderRadius:'12px',
              cursor:'pointer',
              textAlign:'center',
              transition:'all .2s',
              boxShadow: metodo===m.id ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
            }}>
            <div style={{fontSize:'20px',marginBottom:'4px'}}>{m.icon}</div>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'9px',fontWeight:700,lineHeight:1.1}}>{m.label}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',opacity:.6,marginTop:'2px'}}>{m.divisa}</div>
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:'12px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          <label style={{...lbl,marginBottom:0}}>Monto Recibido</label>
          <div style={{display:'flex',background:'#fff',border:'1px solid var(--border)',borderRadius:'10px',overflow:'hidden',height:'42px'}}>
            <select value={divisa} onChange={e=>handleDivisaChange(e.target.value)} style={{width:'70px',border:'none',borderRight:'1px solid var(--border)',padding:'0 8px',fontSize:'12px',fontWeight:700,outline:'none',background:'var(--bg2)'}}>
              <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
            </select>
            <input type="number" min="0" step="0.01" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0.00" style={{flex:1,border:'none',padding:'0 12px',fontSize:'16px',fontWeight:700,outline:'none'}}/>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          <label style={{...lbl,marginBottom:0}}>{divisa==='BS'?'Tasa Cambio':'Información'}</label>
          {divisa==='BS'?(
            <div style={{display:'flex',background:'#fff',border:'1px solid var(--border)',borderRadius:'10px',overflow:'hidden',height:'42px'}}>
              <input type="number" step="0.01" value={tasa} onChange={e=>setTasa(e.target.value)} placeholder="Tasa BS/€" style={{flex:1,border:'none',padding:'0 12px',fontSize:'16px',fontWeight:700,outline:'none'}}/>
              {tasaConfig && (
                <button type="button" onClick={()=>setTasa(tasaConfig.toFixed(2))} style={{background:'var(--warn)',border:'none',padding:'0 10px',color:'#fff',fontSize:'14px',cursor:'pointer'}}>↙</button>
              )}
            </div>
          ):(
             <div style={{background:'var(--bg2)',borderRadius:'10px',border:'1px solid var(--border)',height:'42px',display:'flex',alignItems:'center',padding:'0 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#777'}}>
               ✓ Pago Directo ({divisa})
             </div>
          )}
        </div>
      </div>

      <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200}}>
          <label style={lbl}>Referencia / Comprobante</label>
          <input value={ref} onChange={e=>setRef(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&puedAgregar)agregarLinea();}} placeholder="N° de operación..." style={{...inp,borderRadius:'10px',height:'42px'}}/>
        </div>
        <div style={{display:'flex',gap:'8px',alignSelf:'flex-end',height:'42px'}}>
           <button type="button" onClick={agregarLinea} disabled={!puedAgregar||saving}
             style={{padding:'0 20px',borderRadius:'10px',background:puedAgregar?'#fff':'var(--bg2)',color:puedAgregar?'var(--ink)':'#aaa',border:'1px solid var(--border)',cursor:puedAgregar?'pointer':'default',fontFamily:'Poppins,sans-serif',fontWeight:700,fontSize:'12px',opacity:puedAgregar?1:.5}}>
             + Añadir
           </button>
           <button type="button" onClick={registrar} disabled={saving||(lineas.length===0&&!puedAgregar)}
             style={{padding:'0 24px',borderRadius:'10px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontWeight:700,fontSize:'12px',opacity:(saving||(lineas.length===0&&!puedAgregar))?.5:1}}>
             {saving?'⏳':lineas.length>0?`Registrar ${lineas.length+1} Pagos`:'Registrar Pago'}
           </button>
        </div>
      </div>
    </div>
  );
}
