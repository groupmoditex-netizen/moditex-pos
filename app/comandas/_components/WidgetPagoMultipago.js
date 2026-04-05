'use client';
import { useState } from 'react';
import { fmtNum } from '@/utils/formatters';

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

export { METODOS };

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};

export default function WidgetPago({ comandaId, saldo=0, onPagoRegistrado }) {
  const [metodo,   setMetodo]  = useState('');
  const [divisa,   setDivisa]  = useState('EUR');
  const [monto,    setMonto]   = useState('');
  const [tasa,     setTasa]    = useState('');
  const [ref,      setRef]     = useState('');
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');
  const [ok,       setOk]      = useState('');

  // Multipagos state
  const [pagosMultiples, setPagosMultiples] = useState([]);
  const [modoMultipago, setModoMultipago] = useState(false);
  const [totalPagado, setTotalPagado] = useState(0);

  const metodoCfg = METODOS.find(m=>m.id===metodo);

  function selMetodo(id) {
    const cfg = METODOS.find(m=>m.id===id);
    setMetodo(id);
    if (cfg) setDivisa(cfg.divisa);
  }

  const md   = parseFloat(monto)||0;
  const ts   = parseFloat(tasa)||0;

  let previewBS  = 0;
  let previewEUR = 0;
  if (divisa==='BS')                   { previewBS=md; previewEUR=ts>0?md/ts:0; }
  if (divisa==='EUR')                  { previewEUR=md; previewBS=0; }
  if (divisa==='USD'||divisa==='USDT') { previewEUR=md; previewBS=0; }

  // Agregar pago a la lista de multipagos
  function agregarPago() {
    if (!metodo || md <= 0) return;
    
    const pago = {
      metodo,
      divisa,
      monto: md,
      tasa: ts,
      referencia: ref,
      montoEUR: previewEUR,
      montoBS: previewBS
    };
    
    setPagosMultiples([...pagosMultiples, pago]);
    setTotalPagado(totalPagado + previewEUR);
    
    // Limpiar formulario
    setMetodo('');
    setMonto('');
    setTasa('');
    setRef('');
    setDivisa('EUR');
  }

  // Eliminar pago de la lista
  function eliminarPago(index) {
    const pagoEliminado = pagosMultiples[index];
    setPagosMultiples(pagosMultiples.filter((_, i) => i !== index));
    setTotalPagado(totalPagado - pagoEliminado.montoEUR);
  }

  async function registrarPagoIndividual() {
    setErr(''); setOk('');
    if (!metodo) { setErr('Selecciona un método'); return; }
    if (md<=0)   { setErr('Ingresa el monto'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/pagos',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({comanda_id:comandaId, metodo, divisa, monto_divisa:md, tasa_bs:ts, referencia:ref}),
      }).then(r=>r.json());
      if (res.ok) {
        setOk(`✓ Pago registrado: ${divisa==='BS'?`Bs. ${fmtNum(md)}`:`€ ${fmtNum(res.montoEUR)}`}`);
        setMetodo(''); setMonto(''); setTasa(''); setRef(''); setDivisa('EUR');
        if(onPagoRegistrado) onPagoRegistrado(res.montoEUR);
      } else setErr(res.error||'Error');
    } catch(e){setErr('Error de conexión');}
    setSaving(false);
    setTimeout(()=>setOk(''),4000);
  }

  async function registrarMultipagos() {
    if (pagosMultiples.length === 0) return;
    
    setSaving(true);
    setErr('');
    
    try {
      // Registrar cada pago individualmente y verificar respuesta
      const resultados = [];
      for (const pago of pagosMultiples) {
        const res = await fetch('/api/pagos', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            comanda_id:comandaId, 
            metodo: pago.metodo,
            divisa: pago.divisa,
            monto_divisa: pago.monto,
            tasa_bs: pago.tasa,
            referencia: pago.referencia
          })
        });
        
        const data = await res.json();
        if (!data.ok) {
          throw new Error(`Error en pago ${pago.metodo}: ${data.error}`);
        }
        resultados.push(data);
      }
      
      const totalRegistrado = resultados.reduce((sum, r) => sum + r.montoEUR, 0);
      setOk(`✓ ${pagosMultiples.length} pagos registrados: € ${fmtNum(totalRegistrado)}`);
      setPagosMultiples([]);
      setTotalPagado(0);
      setModoMultipago(false);
      if(onPagoRegistrado) onPagoRegistrado(totalRegistrado);
      
    } catch(e) {
      setErr(e.message || 'Error de conexión al registrar pagos');
    }
    
    setSaving(false);
    setTimeout(()=>setOk(''),4000);
  }

  return (
    <div style={{background:'#fffbeb',border:'1px solid #f59e0b44',borderLeft:'3px solid #f59e0b',padding:'14px'}}>
      <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.14em',textTransform:'uppercase',color:'#92400e',fontWeight:700,marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>💰 Registrar Pago</span>
        <button 
          onClick={() => setModoMultipago(!modoMultipago)}
          style={{padding:'4px 8px',background:modoMultipago?'#f59e0b':'var(--bg2)',color:modoMultipago?'#000':'#666',border:'1px solid #f59e0b',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',borderRadius:'4px'}}
        >
          {modoMultipago?'🔄 Simple':'🔄 Multipago'}
        </button>
      </div>

      {err&&<div style={{padding:'7px 10px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',marginBottom:'10px'}}>{err}</div>}
      {ok &&<div style={{padding:'7px 10px',background:'var(--green-soft)',color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'10px',marginBottom:'10px'}}>{ok}</div>}

      {/* Lista de pagos múltiples */}
      {modoMultipago && pagosMultiples.length > 0 && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'4px',padding:'10px',marginBottom:'12px'}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'.1em'}}>
            Pagos a registrar ({pagosMultiples.length})
          </div>
          {pagosMultiples.map((pago, index) => (
            <div key={index} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 8px',background:'var(--bg2)',borderRadius:'4px',marginBottom:'4px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span>{METODOS.find(m=>m.id===pago.metodo)?.icon}</span>
                <div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:600}}>
                    {pago.divisa} {fmtNum(pago.monto)} {pago.referencia && `· ${pago.referencia}`}
                  </div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666'}}>
                    ≈ € {fmtNum(pago.montoEUR)}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => eliminarPago(index)}
                style={{padding:'2px 6px',background:'var(--red)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',borderRadius:'3px'}}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px',background:'#f0fdf4',borderRadius:'4px',marginTop:'4px'}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,color:'var(--green)'}}>
              Total a registrar: € {fmtNum(totalPagado)}
            </span>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'5px',marginBottom:'12px'}}>
        {METODOS.map(m=>(
          <button key={m.id} onClick={()=>selMetodo(m.id)}
            style={{padding:'7px 4px',background:metodo===m.id?'#1a1a1a':'var(--bg2)',color:metodo===m.id?'#fff':'#333',border:`1px solid ${metodo===m.id?'#1a1a1a':'var(--border)'}`,cursor:'pointer',textAlign:'center',transition:'all .12s'}}>
            <div style={{fontSize:'14px'}}>{m.icon}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',marginTop:'2px',lineHeight:1.2}}>{m.label}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',opacity:.6,marginTop:'1px'}}>{m.divisa}</div>
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
        <div>
          <label style={lbl}>Monto recibido *</label>
          <div style={{display:'flex',gap:'6px'}}>
            <select value={divisa} onChange={e=>setDivisa(e.target.value)}
              style={{width:'70px',padding:'9px 4px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',flexShrink:0}}>
              <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
            </select>
            <input type="number" min="0" step="0.01" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0.00" style={{...inp,flex:1}}/>
          </div>
        </div>
        {divisa === 'BS' && (
          <div>
            <label style={lbl}>Tasa BS / {divisa} *</label>
            <input type="number" min="0" step="0.01" value={tasa} onChange={e=>setTasa(e.target.value)} placeholder="Ej: 96.50" style={inp}/>
          </div>
        )}
        {divisa !== 'BS' && (
          <div style={{display:'flex',alignItems:'flex-end',paddingBottom:'2px'}}>
            <div style={{padding:'9px 12px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700,width:'100%'}}>
              ✓ Precio divisa — sin conversión
            </div>
          </div>
        )}
      </div>

      {md>0&&(divisa!=='BS'||ts>0)&&(
        <div style={{padding:'8px 11px',background:'var(--surface)',border:'1px solid var(--border)',marginBottom:'10px',fontFamily:'DM Mono,monospace',fontSize:'11px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>
            {divisa==='BS'&&<><strong style={{color:'#333'}}>Bs. {fmtNum(previewBS)}</strong><span style={{color:'#888',margin:'0 6px'}}>÷</span>{fmtNum(ts)} BS/€<span style={{margin:'0 6px'}}>→</span><strong style={{color:'var(--green)'}}>€ {fmtNum(previewEUR)}</strong></>}
            {divisa!=='BS'&&<><strong style={{color:'var(--green)'}}>{divisa} {fmtNum(md)}</strong><span style={{color:'#888',margin:'0 6px',fontSize:'9px'}}>precio divisa sin conversión → </span><strong style={{color:'var(--green)'}}>€ {fmtNum(previewEUR)}</strong></>}
          </span>
        </div>
      )}
      {md>0&&saldo>0&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',marginBottom:'10px'}}>
          <div style={{padding:'8px',background:'var(--bg2)',border:'1px solid var(--border)',textAlign:'center'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',marginBottom:'3px'}}>SALDO PENDIENTE</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:700,color:'var(--red)'}}>€ {fmtNum(saldo)}</div>
            {ts>0&&divisa==='BS'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>Bs. {fmtNum(saldo*ts)}</div>}
          </div>
          <div style={{padding:'8px',background:'var(--bg2)',border:'1px solid var(--border)',textAlign:'center'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',marginBottom:'3px'}}>PAGANDO</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:700,color:'var(--green)'}}>
              {divisa==='BS'?'Bs.':divisa+' '} {fmtNum(md)}
            </div>
            {divisa==='BS'&&previewEUR>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>≈ € {fmtNum(previewEUR)}</div>}
          </div>
          {previewEUR>=saldo-0.01
            ? <div style={{padding:'8px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.3)',textAlign:'center'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'var(--green)',marginBottom:'3px'}}>VUELTO</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:700,color:'var(--green)'}}>€ {fmtNum(previewEUR-saldo)}</div>
                {ts>0&&divisa==='BS'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)'}}>Bs. {fmtNum((previewEUR-saldo)*ts)}</div>}
              </div>
            : <div style={{padding:'8px',background:'var(--warn-soft)',border:'1px solid rgba(245,158,11,.3)',textAlign:'center'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'var(--warn)',marginBottom:'3px'}}>FALTA</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'14px',fontWeight:700,color:'var(--warn)'}}>€ {fmtNum(saldo-previewEUR)}</div>
                {ts>0&&divisa==='BS'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--warn)'}}>Bs. {fmtNum((saldo-previewEUR)*ts)}</div>}
              </div>
          }
        </div>
      )}

      <div style={{display:'flex',gap:'10px'}}>
        <div style={{flex:1}}>
          <label style={lbl}>Referencia / N° operación</label>
          <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Últimos 6 dígitos..." style={inp}/>
        </div>
        <div style={{display:'flex',alignItems:'flex-end',gap:'6px'}}>
          {modoMultipago && metodo && md > 0 && (
            <button 
              onClick={agregarPago}
              style={{padding:'9px 14px',background:'var(--blue)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,height:'40px'}}
            >
              + Agregar
            </button>
          )}
          <button 
            onClick={modoMultipago ? registrarMultipagos : registrarPagoIndividual} 
            disabled={saving || (modoMultipago ? pagosMultiples.length === 0 : (!metodo || md <= 0))}
            style={{padding:'9px 18px',background:'#1a1a1a',color:'#fff',border:'none',cursor:saving?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',opacity:saving?0.6:1,height:'40px',whiteSpace:'nowrap'}}>
            {saving?'⏳':modoMultipago?`💰 Registrar ${pagosMultiples.length} pago${pagosMultiples.length !== 1 ? 's' : ''}`:'💰 Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
