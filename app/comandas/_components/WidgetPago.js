'use client';
import { useState, useEffect } from 'react';
import { fmtNum } from '@/utils/formatters';
import { METODOS } from '@/utils/constants';

export { METODOS };

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};

export default function WidgetPago({ comandaId, saldo=0, onPagoRegistrado }) {
  // ── Tasa del sistema ─────────────────────────────────────────────────
  const [tasaConfig, setTasaConfig] = useState(null);

  useEffect(() => {
    fetch('/api/tasa').then(r=>r.json())
      .then(d => { if(d.ok && d.tasa_bs_eur) setTasaConfig(d.tasa_bs_eur); })
      .catch(()=>{});
  }, []);

  // ── Entrada actual ───────────────────────────────────────────────────
  const [metodo,  setMetodo]  = useState('');
  const [divisa,  setDivisa]  = useState('EUR');
  const [monto,   setMonto]   = useState('');
  const [tasa,    setTasa]    = useState('');
  const [ref,     setRef]     = useState('');

  // ── Lista de pagos (multipago) ───────────────────────────────────────
  const [lineas,  setLineas]  = useState([]);

  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [ok,      setOk]      = useState('');

  // Pre-rellenar tasa desde config cuando se selecciona BS
  function preRellenarTasa() {
    if (tasaConfig && !tasa) setTasa(tasaConfig.toFixed(2));
  }

  function selMetodo(id) {
    const cfg = METODOS.find(m=>m.id===id);
    setMetodo(id);
    if (cfg) {
      setDivisa(cfg.divisa);
      if (cfg.divisa === 'BS') preRellenarTasa();
    }
  }

  function handleDivisaChange(v) {
    setDivisa(v);
    if (v === 'BS') preRellenarTasa();
  }

  // Calculos de la entrada actual
  const md  = parseFloat(monto) || 0;
  const ts  = parseFloat(tasa)  || 0;
  const previewEUR = divisa === 'BS' ? (ts > 0 ? md / ts : 0) : md;

  // Total ya capturado en las lineas
  const totalLineas   = lineas.reduce((a, l) => a + l.previewEUR, 0);
  const saldoRestante = Math.max(0, saldo - totalLineas);

  function agregarLinea() {
    setErr('');
    if (!metodo)              { setErr('Selecciona un método de pago'); return; }
    if (md <= 0)              { setErr('Ingresa el monto'); return; }
    if (divisa==='BS'&&ts<=0) { setErr('Ingresa la tasa BS/€ para convertir'); return; }

    const mcfg = METODOS.find(m=>m.id===metodo);
    setLineas(prev => [...prev, {
      metodo, divisa, monto:md, tasa:ts, ref,
      previewEUR,
      label: mcfg?.label || metodo,
      icon:  mcfg?.icon  || '💰',
    }]);

    // Limpiar monto y ref, mantener método y tasa para próximo pago rápido
    setMonto(''); setRef('');
  }

  function quitarLinea(i) {
    setLineas(prev => prev.filter((_,idx)=>idx!==i));
  }

  async function registrar() {
    setErr(''); setOk('');

    // Si hay lineas acumuladas, usar esas; si no, registrar la entrada actual
    const todas = lineas.length > 0
      ? lineas
      : (md > 0 && metodo ? [{ metodo, divisa, monto:md, tasa:ts, ref, previewEUR, label: METODOS.find(m=>m.id===metodo)?.label||metodo }]
        : []);

    if (todas.length === 0) { setErr('Agrega al menos un pago'); return; }
    setSaving(true);

    let montoTotal = 0;
    for (const l of todas) {
      try {
        const res = await fetch('/api/pagos', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            comanda_id: comandaId,
            metodo: l.metodo,
            divisa: l.divisa,
            monto_divisa: l.monto,
            tasa_bs: l.tasa || 0,
            referencia: l.ref || '',
          }),
        }).then(r=>r.json());

        if (!res.ok) { setErr(res.error || 'Error al registrar pago'); setSaving(false); return; }
        montoTotal += res.montoEUR || l.previewEUR;
      } catch(e) { setErr('Error de conexión'); setSaving(false); return; }
    }

    const n = todas.length;
    setOk(`✓ ${n} pago${n!==1?'s':''} registrado${n!==1?'s':''} · € ${fmtNum(montoTotal)}`);
    setLineas([]);
    setMetodo(''); setMonto(''); setTasa(''); setRef(''); setDivisa('EUR');
    if (onPagoRegistrado) onPagoRegistrado(montoTotal);
    setSaving(false);
    setTimeout(() => setOk(''), 5000);
  }

  const puedAgregar = metodo && md > 0 && (divisa !== 'BS' || ts > 0);

  return (
    <div style={{background:'#fffbeb',border:'1px solid #f59e0b44',borderLeft:'3px solid #f59e0b',padding:'14px',display:'flex',flexDirection:'column',gap:'12px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.14em',textTransform:'uppercase',color:'#92400e',fontWeight:700}}>
          💰 Registrar Pago
        </div>
        {tasaConfig && (
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',display:'flex',alignItems:'center',gap:'4px'}}>
            <span style={{color:'#c9a84c',fontWeight:700}}>Tasa: {tasaConfig.toFixed(2)} Bs/€</span>
            <span style={{color:'#bbb'}}>· auto</span>
          </div>
        )}
      </div>

      {err && <div style={{padding:'7px 10px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{err}</div>}
      {ok  && <div style={{padding:'7px 10px',background:'var(--green-soft)',color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{ok}</div>}

      {/* Lista de pagos acumulados */}
      {lineas.length > 0 && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{padding:'6px 11px',background:'var(--bg3)',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.1em',textTransform:'uppercase',display:'flex',justifyContent:'space-between'}}>
            <span>Pagos a registrar ({lineas.length})</span>
            <span style={{color:'var(--green)',fontWeight:700}}>€ {fmtNum(totalLineas)}</span>
          </div>
          {lineas.map((l,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 11px',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:'14px',flexShrink:0}}>{l.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>{l.label}</span>
                {l.ref && <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginLeft:'6px'}}>Ref: {l.ref}</span>}
                {l.divisa==='BS' && (
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginLeft:'6px'}}>
                    Bs. {fmtNum(l.monto)} ÷ {l.tasa} = € {fmtNum(l.previewEUR)}
                  </span>
                )}
              </div>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:'var(--green)',flexShrink:0}}>
                {l.divisa==='BS' ? `Bs. ${fmtNum(l.monto)}` : `${l.divisa} ${fmtNum(l.monto)}`}
              </span>
              <button onClick={()=>quitarLinea(i)} style={{width:'20px',height:'20px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'10px',color:'#aaa',flexShrink:0}}>✕</button>
            </div>
          ))}
          {/* Saldo restante después de las lineas */}
          {saldoRestante > 0.01 && (
            <div style={{padding:'6px 11px',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--red)',fontWeight:700,textAlign:'right'}}>
              Falta: € {fmtNum(saldoRestante)}
            </div>
          )}
          {saldoRestante <= 0.01 && (
            <div style={{padding:'6px 11px',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)',fontWeight:700,textAlign:'right'}}>
              ✓ Saldo cubierto completamente
            </div>
          )}
        </div>
      )}

      {/* Selector de método */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'5px'}}>
        {METODOS.map(m=>(
          <button key={m.id} onClick={()=>selMetodo(m.id)}
            style={{padding:'7px 4px',background:metodo===m.id?'#1a1a1a':'var(--bg2)',color:metodo===m.id?'#fff':'#333',border:`1px solid ${metodo===m.id?'#1a1a1a':'var(--border)'}`,cursor:'pointer',textAlign:'center',transition:'all .12s'}}>
            <div style={{fontSize:'14px'}}>{m.icon}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',marginTop:'2px',lineHeight:1.2}}>{m.label}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',opacity:.6,marginTop:'1px'}}>{m.divisa}</div>
          </button>
        ))}
      </div>

      {/* Monto + Tasa */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        <div>
          <label style={lbl}>Monto recibido *</label>
          <div style={{display:'flex',gap:'6px'}}>
            <select value={divisa} onChange={e=>handleDivisaChange(e.target.value)}
              style={{width:'70px',padding:'9px 4px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',flexShrink:0}}>
              <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
            </select>
            <input type="number" min="0" step="0.01" value={monto} onChange={e=>setMonto(e.target.value)}
              placeholder="0.00" style={{...inp,flex:1}}/>
          </div>
        </div>

        {divisa==='BS' ? (
          <div>
            <label style={lbl}>
              Tasa BS/€ *
              {tasaConfig && !tasa && (
                <button onClick={()=>setTasa(tasaConfig.toFixed(2))}
                  style={{marginLeft:'8px',padding:'1px 6px',background:'#c9a84c',color:'#000',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'7px',fontWeight:700}}>
                  ↙ {tasaConfig.toFixed(2)}
                </button>
              )}
            </label>
            <input type="number" min="0" step="0.01" value={tasa} onChange={e=>setTasa(e.target.value)}
              placeholder={tasaConfig ? `Ej: ${tasaConfig.toFixed(2)}` : 'Ej: 96.50'} style={inp}/>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'flex-end',paddingBottom:'2px'}}>
            <div style={{padding:'9px 12px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700,width:'100%'}}>
              ✓ Precio en divisa — sin conversión
            </div>
          </div>
        )}
      </div>

      {/* Preview conversión */}
      {md>0 && (divisa!=='BS' || ts>0) && (
        <div style={{padding:'8px 11px',background:'var(--surface)',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'11px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>
            {divisa==='BS'
              ? <><strong style={{color:'#333'}}>Bs. {fmtNum(md)}</strong><span style={{color:'#888',margin:'0 6px'}}>÷</span>{fmtNum(ts)} BS/€<span style={{margin:'0 6px'}}>→</span><strong style={{color:'var(--green)'}}>€ {fmtNum(previewEUR)}</strong></>
              : <><strong style={{color:'var(--green)'}}>{divisa} {fmtNum(md)}</strong><span style={{color:'#888',margin:'0 6px',fontSize:'9px'}}> → </span><strong style={{color:'var(--green)'}}>€ {fmtNum(previewEUR)}</strong></>
            }
          </span>
          {saldo>0 && (
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color: previewEUR+totalLineas >= saldo-0.01 ? 'var(--green)' : 'var(--warn)',fontWeight:700}}>
              {previewEUR+totalLineas >= saldo-0.01 ? '✓ Cubre total' : `Falta € ${fmtNum(saldo - previewEUR - totalLineas)}`}
            </span>
          )}
        </div>
      )}

      {/* Referencia + Botones */}
      <div style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:'8px',alignItems:'flex-end'}}>
        <div>
          <label style={lbl}>Referencia / N° operación</label>
          <input value={ref} onChange={e=>setRef(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter' && puedAgregar) agregarLinea(); }}
            placeholder="Últimos 6 dígitos..."
            style={inp}/>
        </div>

        {/* Agregar a lista (multipago) */}
        <button onClick={agregarLinea} disabled={!puedAgregar || saving}
          title="Agregar este pago y continuar (para registrar varios métodos)"
          style={{padding:'9px 12px',background:puedAgregar?'var(--bg3)':'var(--bg2)',color:puedAgregar?'#333':'#bbb',border:'1px solid var(--border)',cursor:puedAgregar?'pointer':'not-allowed',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,height:'40px',whiteSpace:'nowrap',opacity:puedAgregar?1:.5}}>
          + Agregar
        </button>

        {/* Registrar todo */}
        <button onClick={registrar} disabled={saving || (lineas.length===0 && !puedAgregar)}
          style={{padding:'9px 16px',background:'#1a1a1a',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,height:'40px',whiteSpace:'nowrap',opacity:(saving||(lineas.length===0&&!puedAgregar))?.5:1}}>
          {saving ? '⏳' : lineas.length > 0 ? `💾 Registrar ${lineas.length+1}` : '💰 Registrar'}
        </button>
      </div>
    </div>
  );
}
