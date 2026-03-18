'use client';
import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useAppData } from '@/lib/AppContext';

/* ─── Constantes ─────────────────────────────────────────────────── */
const S = {
  pendiente: {bg:'#fff8e1',color:'#f59e0b',border:'#f59e0b',label:'Pendiente',  icon:'🕐'},
  produccion:{bg:'#eff6ff',color:'#3b82f6',border:'#3b82f6',label:'Producción', icon:'⚙️'},
  listo:     {bg:'#f0fdf4',color:'#22c55e',border:'#22c55e',label:'Listo',       icon:'✅'},
  entregado: {bg:'#f9fafb',color:'#6b7280',border:'#9ca3af',label:'Entregado',  icon:'📦'},
  cancelado: {bg:'#fff1f2',color:'#ef4444',border:'#ef4444',label:'Cancelado',  icon:'❌'},
};
const FLUJO = ['pendiente','produccion','listo','entregado'];

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

function precioItem(it){ return it.tipoVenta==='MAYOR'?(it.precioMayor||0):(it.precioDetal||0); }
const CM={BLANCO:'#d0d0d0',NEGRO:'#1a1a1a',AZUL:'#3b6fd4',ROJO:'#d63b3b',VERDE:'#2d9e4a',ROSA:'#f07aa0',GRIS:'#6b7280',AMARILLO:'#f5c842',NARANJA:'#f57c42',MORADO:'#7c4fd4',VINOTINTO:'#8b2035',BEIGE:'#d4b896',CORAL:'#f26e5b',CELESTE:'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return CM[k]||CM[k.split(' ')[0]]||'#9ca3af';}
function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}

/* ═══════════════════════════════════════════════════════════════════
   WIDGET DE PAGO — reutilizable en nueva comanda y en gestión
═══════════════════════════════════════════════════════════════════ */
function WidgetPago({ comandaId, saldo=0, onPagoRegistrado }) {
  const [metodo,   setMetodo]  = useState('');
  const [divisa,   setDivisa]  = useState('EUR');
  const [monto,    setMonto]   = useState('');
  const [tasa,     setTasa]    = useState('');
  const [ref,      setRef]     = useState('');
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');
  const [ok,       setOk]      = useState('');

  const metodoCfg = METODOS.find(m=>m.id===metodo);

  // Al seleccionar método → auto-set divisa
  function selMetodo(id) {
    const cfg = METODOS.find(m=>m.id===id);
    setMetodo(id);
    if (cfg) setDivisa(cfg.divisa);
  }

  const md   = parseFloat(monto)||0;
  const ts   = parseFloat(tasa)||0;

  // Cálculo en tiempo real corregido
  let previewBS  = 0;
  let previewEUR = 0;
  if (divisa==='BS')   { previewBS=md; previewEUR=ts>0?md/ts:0; }
  if (divisa==='EUR')  { previewEUR=md; previewBS=ts>0?md*ts:0; }
  if (divisa==='USD'||divisa==='USDT') { previewEUR=md*0.93; previewBS=ts>0?md*ts:0; }

  async function registrar() {
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

  return (
    <div style={{background:'#fffbeb',border:'1px solid #f59e0b44',borderLeft:'3px solid #f59e0b',padding:'14px'}}>
      <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.14em',textTransform:'uppercase',color:'#92400e',fontWeight:700,marginBottom:'12px'}}>
        💰 Registrar Pago
      </div>

      {err&&<div style={{padding:'7px 10px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',marginBottom:'10px'}}>{err}</div>}
      {ok &&<div style={{padding:'7px 10px',background:'var(--green-soft)',color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'10px',marginBottom:'10px'}}>{ok}</div>}

      {/* Métodos de pago */}
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

      {/* Monto + tasa */}
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
        <div>
          <label style={lbl}>Tasa BS / {divisa==='BS'?'EUR':divisa==='EUR'?'EUR':divisa} *</label>
          <input type="number" min="0" step="0.01" value={tasa} onChange={e=>setTasa(e.target.value)} placeholder="Ej: 96.50" style={inp}/>
        </div>
      </div>

      {/* Preview conversión */}
      {md>0&&ts>0&&(
        <div style={{padding:'8px 11px',background:'var(--surface)',border:'1px solid var(--border)',marginBottom:'10px',fontFamily:'DM Mono,monospace',fontSize:'11px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>
            {divisa==='BS'&&<><strong style={{color:'#333'}}>Bs. {fmtNum(previewBS)}</strong><span style={{color:'#888',margin:'0 6px'}}>÷</span>{fmtNum(ts)} BS/€<span style={{margin:'0 6px'}}>→</span><strong style={{color:'var(--green)'}}>€ {fmtNum(previewEUR)}</strong></>}
            {divisa==='EUR'&&<><strong style={{color:'var(--green)'}}>€ {fmtNum(previewEUR)}</strong><span style={{color:'#888',margin:'0 6px'}}>×</span>{fmtNum(ts)} BS/€<span style={{margin:'0 6px'}}>→</span><strong style={{color:'#333'}}>Bs. {fmtNum(previewBS)}</strong></>}
            {(divisa==='USD'||divisa==='USDT')&&<><strong style={{color:'#1a9e4e'}}>{divisa} {fmtNum(md)}</strong><span style={{color:'#888',margin:'0 6px'}}>→</span><strong style={{color:'var(--green)'}}>≈ € {fmtNum(previewEUR)}</strong><span style={{color:'#888',margin:'0 6px'}}>/ Bs. {fmtNum(previewBS)}</span></>}
          </span>
        </div>
      )}
      {/* Resumen tipo POS: Saldo, Pagando, Falta/Vuelto */}
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
        <div style={{display:'flex',alignItems:'flex-end'}}>
          <button onClick={registrar} disabled={saving}
            style={{padding:'9px 18px',background:'#1a1a1a',color:'#fff',border:'none',cursor:saving?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',opacity:saving?.6:1,height:'40px',whiteSpace:'nowrap'}}>
            {saving?'⏳':'💰 Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL NUEVA COMANDA
═══════════════════════════════════════════════════════════════════ */
function ModalNueva({ clientes, productos, onClose, onSave }) {
  const [cliQuery, setCliQ]    = useState('');
  const [cliRes,   setCliRes]  = useState([]);
  const [cliOpen,  setCliOpen] = useState(false);
  const [cliId,    setCliId]   = useState('');
  const [nuevoMode,setNuevo]   = useState(false);
  const [nuevoDoc, setNDoc]    = useState('');
  const [nuevoTel, setNTel]    = useState('');
  const [items,    setItems]   = useState([]);
  const [catalogo, setCatalogo]= useState(false);
  const [fechaEnt, setFechaEnt]= useState('');
  const [notas,    setNotas]   = useState('');
  const [abono,    setAbono]   = useState('');
  const [abonoMetodo, setAM]   = useState('');
  const [abonoDiv,    setAD]   = useState('EUR');
  const [abonoTasa,   setAT]   = useState('');
  const [abonoRef,    setAR]   = useState('');
  const [showAbono,   setSA]   = useState(false);
  const [guardando,setGuard]   = useState(false);
  const [err,      setErr]     = useState('');

  function buscarCli(q){
    setCliQ(q); setCliId(''); setNuevo(false);
    if(q.length<2){setCliRes([]);setCliOpen(false);return;}
    const r=clientes.filter(c=>`${c.nombre} ${c.cedula||''} ${c.telefono||''}`.toLowerCase().includes(q.toLowerCase())).slice(0,5);
    setCliRes(r); setCliOpen(true);
  }

  function addFromCatalog(p,qty,tv){
    setCatalogo(false);
    setItems(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty,tipoVenta:tv}:x);
      return[...prev,{...p,qty,tipoVenta:tv}];
    });
  }

  function setItemTV(sku,tv){setItems(prev=>prev.map(x=>x.sku===sku?{...x,tipoVenta:tv}:x));}
  function changeQty(sku,d){setItems(prev=>prev.map(x=>x.sku===sku?{...x,qty:Math.max(1,x.qty+d)}:x));}
  function removeItem(sku){setItems(prev=>prev.filter(x=>x.sku!==sku));}

  const totalCalc = items.reduce((a,it)=>a+precioItem(it)*it.qty,0);

  async function guardar(){
    const nombre=cliQuery.trim();
    if(!nombre){setErr('Cliente requerido');return;}
    if(!items.length){setErr('Agrega al menos un producto');return;}
    setGuard(true);
    try {
      let clienteId=cliId;
      if(nuevoMode&&!cliId){
        const r=await fetch('/api/clientes',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({nombre,cedula:nuevoDoc||'S/C',telefono:nuevoTel||''})}).then(r=>r.json());
        if(r.ok) clienteId=r.cliente?.id||'';
      }

      // Calcular monto abono en EUR si lo pusieron
      let montoAbonoEUR = 0;
      if(abono && parseFloat(abono)>0) {
        const ma=parseFloat(abono)||0, ta=parseFloat(abonoTasa)||0;
        if(abonoDiv==='BS')        montoAbonoEUR = ta>0?ma/ta:0;
        else if(abonoDiv==='EUR')  montoAbonoEUR = ma;
        else montoAbonoEUR = ma*0.93;
        montoAbonoEUR = Math.round(montoAbonoEUR*100)/100;
      }

      const res=await fetch('/api/comandas',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          cliente:nombre, cliente_id:clienteId||'',
          productos:items.map(it=>({sku:it.sku,modelo:`${it.modelo} — ${it.color}${it.talla&&it.talla!=='UNICA'?' '+it.talla:''}`,cant:it.qty,precio:precioItem(it),tipoVenta:it.tipoVenta})),
          precio:totalCalc, monto_pagado:montoAbonoEUR,
          fecha_entrega:fechaEnt||null, notas, status:'pendiente',
        })}).then(r=>r.json());

      if(!res.ok){setErr(res.error||'Error al guardar');setGuard(false);return;}

      // Si hay abono, registrar el pago
      if(montoAbonoEUR>0 && abonoMetodo) {
        await fetch('/api/pagos',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            comanda_id:res.comanda.id, metodo:abonoMetodo,
            divisa:abonoDiv, monto_divisa:parseFloat(abono),
            tasa_bs:parseFloat(abonoTasa)||0, referencia:abonoRef,
          })}).then(r=>r.json());
      }
      onSave();
    }catch(e){setErr('Error de conexión');}
    setGuard(false);
  }

  return (
    <>
    {catalogo&&<CatalogoExplorer productos={productos} modo="entrada" tipoVenta="MAYOR" onAdd={addFromCatalog} onClose={()=>setCatalogo(false)}/>}
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0',overflowY:'auto'}} className="modal-wrap" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-fullscreen" style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'680px',borderTop:'3px solid #f59e0b',maxHeight:'96vh',display:'flex',flexDirection:'column'}}>
        {/* Header */}
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'17px',fontWeight:700}}>📋 Nueva Comanda</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',marginTop:'2px'}}>Stock se descuenta automáticamente al marcar como LISTO</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        <div style={{padding:'16px 18px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'14px'}}>
          {err&&<div style={{padding:'8px 11px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{err}</div>}

          {/* CLIENTE */}
          <div style={{position:'relative'}}>
            <label style={lbl}>Cliente *</label>
            <div style={{display:'flex',gap:'8px'}}>
              <div style={{flex:1,position:'relative'}}>
                <input value={cliQuery} onChange={e=>buscarCli(e.target.value)} onBlur={()=>setTimeout(()=>setCliOpen(false),180)} placeholder="Buscar o escribir nombre..." style={inp}/>
                {cliId&&<span style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',color:'var(--green)',fontSize:'14px'}}>✓</span>}
              </div>
              <button onClick={()=>setNuevo(n=>!n)} style={{padding:'9px 12px',background:nuevoMode?'var(--green)':'var(--bg2)',color:nuevoMode?'#fff':'#444',border:`1px solid ${nuevoMode?'var(--green)':'var(--border)'}`,cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,whiteSpace:'nowrap'}}>
                + Nuevo
              </button>
            </div>
            {cliOpen&&(cliRes.length>0||cliQuery.length>=2)&&(
              <div style={{position:'absolute',top:'100%',left:0,right:'90px',background:'var(--surface)',border:'1px solid var(--border-strong)',borderTop:'none',zIndex:999,boxShadow:'0 8px 24px rgba(0,0,0,.1)',maxHeight:'180px',overflowY:'auto'}}>
                {cliRes.map(c=><div key={c.id} onMouseDown={e=>{e.preventDefault();setCliQ(c.nombre);setCliId(c.id);setCliOpen(false);setNuevo(false);}} style={{padding:'9px 12px',cursor:'pointer',fontSize:'12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'} onMouseLeave={e=>e.currentTarget.style.background=''}><strong>{c.nombre}</strong><span style={{color:'#666',fontSize:'10px'}}>{c.cedula||c.telefono||''}</span></div>)}
                {cliQuery.length>=2&&<div onMouseDown={e=>{e.preventDefault();setNuevo(true);setCliOpen(false);}} style={{padding:'9px 12px',cursor:'pointer',color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,textAlign:'center',background:'var(--green-soft)'}} onMouseEnter={e=>e.currentTarget.style.opacity='.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>+ Registrar "{cliQuery}" como nuevo</div>}
              </div>
            )}
            {nuevoMode&&(
              <div style={{marginTop:'8px',padding:'11px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                <div style={{gridColumn:'span 2',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)',fontWeight:700}}>👤 Datos del nuevo cliente</div>
                <div><label style={lbl}>Cédula / RIF</label><input value={nuevoDoc} onChange={e=>setNDoc(e.target.value)} placeholder="V-12345678" style={inp}/></div>
                <div><label style={lbl}>Teléfono</label><input value={nuevoTel} onChange={e=>setNTel(e.target.value)} placeholder="+58 412..." style={inp}/></div>
              </div>
            )}
          </div>

          {/* PRENDAS */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
              <label style={lbl}>Prendas * ({items.length})</label>
              <button onClick={()=>setCatalogo(true)} style={{padding:'7px 14px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>
                ⊞ Abrir Catálogo
              </button>
            </div>

            <BarcodeScanner
              productos={productos}
              onAdd={(prod)=>{setItems(prev=>{const ex=prev.find(x=>x.sku===prod.sku);if(ex)return prev.map(x=>x.sku===prod.sku?{...x,qty:x.qty+1}:x);return[...prev,{...prod,qty:1,tipoVenta:'MAYOR'}];});}}
              disabled={guardando}
            />
            {items.length===0?(
              <div style={{padding:'24px',textAlign:'center',background:'var(--bg2)',border:'1px dashed var(--border-strong)',color:'#888',fontSize:'12px',borderRadius:'2px'}}>
                Escanea un código o toca "Abrir Catálogo"
              </div>
            ):(
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
                {items.map(item=>{
                  const precio=precioItem(item); const dot=colorHex(item.color);
                  return(
                    <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'8px',padding:'10px 13px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                          <span style={{fontSize:'12px',fontWeight:600}}>{item.modelo} — {item.color}</span>
                        </div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>
                          {item.sku} · D:€{item.precioDetal?.toFixed(2)} M:€{item.precioMayor?.toFixed(2)} → <strong style={{color:item.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)'}}>€{precio.toFixed(2)} × {item.qty} = €{(precio*item.qty).toFixed(2)}</strong>
                        </div>
                      </div>
                      <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                        {['DETAL','MAYOR'].map(tv=><button key={tv} onClick={()=>setItemTV(item.sku,tv)} style={{padding:'5px 8px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,background:item.tipoVenta===tv?(tv==='DETAL'?'var(--blue)':'var(--warn)'):'var(--bg3)',color:item.tipoVenta===tv?'#fff':'#777'}}>{tv[0]}</button>)}
                      </div>
                      <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',flexShrink:0}}>
                        <button onClick={()=>changeQty(item.sku,-1)} style={{width:'26px',height:'26px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px'}}>−</button>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,width:'30px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'26px'}}>{item.qty}</span>
                        <button onClick={()=>changeQty(item.sku,1)} style={{width:'26px',height:'26px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px'}}>+</button>
                      </div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,minWidth:'58px',textAlign:'right',flexShrink:0}}>€{(precio*item.qty).toFixed(2)}</div>
                      <button onClick={()=>removeItem(item.sku)} style={{width:'22px',height:'22px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'11px',color:'#888'}}>✕</button>
                    </div>
                  );
                })}
                <div style={{padding:'8px 13px',background:'var(--bg3)',display:'flex',justifyContent:'flex-end',fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'#f59e0b'}}>
                  Total: € {totalCalc.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Fecha + notas */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={lbl}>Fecha de entrega</label><input type="date" value={fechaEnt} onChange={e=>setFechaEnt(e.target.value)} style={inp}/></div>
            <div><label style={lbl}>Notas / Instrucciones</label><input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Colores, tallas, instrucciones..." style={inp}/></div>
          </div>

          {/* ABONO INICIAL */}
          <div style={{border:'1px solid var(--border)',overflow:'hidden'}}>
            <button onClick={()=>setSA(s=>!s)}
              style={{width:'100%',padding:'10px 14px',background:'var(--bg2)',border:'none',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>
              <span>💰 ¿El cliente abona ahora?</span>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>{showAbono?'▲ Cerrar':'▼ Sí, agregar abono'}</span>
            </button>
            {showAbono&&(
              <div style={{padding:'14px',borderTop:'1px solid var(--border)'}}>
                {/* Fila 1: método y monto */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>
                    <label style={lbl}>Método de pago *</label>
                    <select value={abonoMetodo} onChange={e=>{setAM(e.target.value);const m=METODOS.find(x=>x.id===e.target.value);if(m)setAD(m.divisa);}} style={{...inp,padding:'8px 6px'}}>
                      <option value="">Selecciona...</option>
                      {METODOS.map(m=><option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Monto *</label>
                    <div style={{display:'flex',gap:'5px'}}>
                      <select value={abonoDiv} onChange={e=>setAD(e.target.value)} style={{width:'65px',padding:'9px 4px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'}}>
                        <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
                      </select>
                      <input type="number" min="0" step="0.01" value={abono} onChange={e=>setAbono(e.target.value)} placeholder="0.00" style={{...inp,flex:1}}/>
                    </div>
                  </div>
                </div>
                {/* Fila 2: tasa y referencia — SIEMPRE VISIBLE */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                  <div>
                    <label style={lbl}>Tasa BS / {abonoDiv==='BS'?'EUR':abonoDiv} *</label>
                    <input type="number" value={abonoTasa} onChange={e=>setAT(e.target.value)} placeholder="Ej: 96.50" style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Referencia / N° operación</label>
                    <input value={abonoRef} onChange={e=>setAR(e.target.value)} placeholder="Últimos 6 dígitos" style={inp}/>
                  </div>
                </div>
                {/* Preview conversión en tiempo real */}
                {(() => {
                  const ma = parseFloat(abono)||0;
                  const ta = parseFloat(abonoTasa)||0;
                  if(ma <= 0) return null;
                  let abonoEUR = 0, abonoBs = 0;
                  if(abonoDiv==='BS')   { abonoBs=ma; abonoEUR=ta>0?ma/ta:0; }
                  if(abonoDiv==='EUR')  { abonoEUR=ma; abonoBs=ta>0?ma*ta:0; }
                  if(abonoDiv==='USD'||abonoDiv==='USDT') { abonoEUR=ma*0.93; abonoBs=ta>0?ma*ta:0; }
                  const falta = totalCalc - abonoEUR;
                  return (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'7px',marginBottom:'8px'}}>
                      <div style={{padding:'8px',background:'var(--bg2)',border:'1px solid var(--border)',textAlign:'center'}}>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#555',marginBottom:'3px',textTransform:'uppercase'}}>Total comanda</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'var(--red)'}}>€ {fmtNum(totalCalc)}</div>
                      </div>
                      <div style={{padding:'8px',background:'var(--bg2)',border:'1px solid var(--border)',textAlign:'center'}}>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#555',marginBottom:'3px',textTransform:'uppercase'}}>Abonando</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'var(--green)'}}>
                          {abonoDiv==='BS'?`Bs. ${fmtNum(ma)}`:`${abonoDiv} ${fmtNum(ma)}`}
                        </div>
                        {abonoDiv==='BS'&&abonoEUR>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>≈ € {fmtNum(abonoEUR)}</div>}
                        {abonoDiv==='EUR'&&abonoBs>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>Bs. {fmtNum(abonoBs)}</div>}
                      </div>
                      {falta > 0.01
                        ? <div style={{padding:'8px',background:'#fff8e1',border:'1px solid #f59e0b44',textAlign:'center'}}>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#92400e',marginBottom:'3px',textTransform:'uppercase'}}>Falta</div>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'#f59e0b'}}>€ {fmtNum(falta)}</div>
                            {ta>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>Bs. {fmtNum(falta*ta)}</div>}
                          </div>
                        : <div style={{padding:'8px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.3)',textAlign:'center'}}>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'var(--green)',marginBottom:'3px',textTransform:'uppercase'}}>Vuelto</div>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'var(--green)'}}>€ {fmtNum(-falta)}</div>
                            {ta>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)'}}>Bs. {fmtNum(-falta*ta)}</div>}
                          </div>
                      }
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer-bar" style={{borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg2)',flexShrink:0}}>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'18px',fontWeight:700,color:'#f59e0b'}}>€ {totalCalc.toFixed(2)}</div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={onClose} style={{padding:'11px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600,textTransform:'uppercase'}}>Cancelar</button>
            <button onClick={guardar} disabled={guardando} style={{padding:'11px 20px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',opacity:guardando?.6:1}}>
              {guardando?'⏳ Guardando...':'📋 Crear Comanda'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL GESTIÓN — vista clara con botones de acción
═══════════════════════════════════════════════════════════════════ */
function ModalGestion({ cmd, onClose, onSave }) {
  const sc = S[cmd.status]||S.pendiente;
  const [pagos,    setPagos]   = useState([]);
  const [loadP,    setLoadP]   = useState(true);
  const [notas,    setNotas]   = useState(cmd.notas||'');
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');

  const saldo = Math.max(0,(cmd.precio||0)-(cmd.monto_pagado||0));
  const pct   = cmd.precio>0?Math.min(100,((cmd.monto_pagado||0)/cmd.precio)*100):0;

  useEffect(()=>{
    fetch(`/api/pagos?comanda_id=${cmd.id}`).then(r=>r.json())
      .then(d=>{if(d.ok)setPagos(d.pagos);}).finally(()=>setLoadP(false));
  },[cmd.id]);

  async function cambiarStatus(s){
    setSaving(true); setErr('');
    const res=await fetch('/api/comandas',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cmd.id,status:s,notas})}).then(r=>r.json());
    if(res.ok){
      onSave();
    } else if (res.errorTipo === 'SIN_STOCK') {
      // Error de stock — mostrar detalle claro
      const detalle = res.sinStock.map(x=>`• ${x.modelo}: necesitas ${x.requerido} ud${x.requerido>1?'s':''}, tienes ${x.stockReal} (faltan ${x.falta})`).join('\n');
      setErr(`❌ Sin stock suficiente:\n${detalle}\n\nRegistra una Entrada primero.`);
    } else {
      setErr(res.error||'Error');
    }
    setSaving(false);
  }

  function parseProd(cmd){let p=cmd.productos;if(typeof p==='string')try{p=JSON.parse(p);}catch{p=[];}return Array.isArray(p)?p:[];}
  const prods = parseProd(cmd);

  // Obtener el índice actual en el flujo
  const idxActual = FLUJO.indexOf(cmd.status);
  const sigStatus = FLUJO[idxActual+1];

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0',overflowY:'auto'}} className="modal-wrap" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-fullscreen" style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'640px',borderTop:`3px solid ${sc.border}`,maxHeight:'96vh',display:'flex',flexDirection:'column'}}>
        {/* Header */}
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'17px',fontWeight:700}}>{cmd.cliente}</div>
            <div style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'4px'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>{cmd.id}</span>
              <span style={{background:sc.bg,color:sc.color,fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'2px 10px',fontWeight:700,border:`1px solid ${sc.border}44`}}>{sc.icon} {sc.label}</span>
              {cmd.fecha_entrega&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>📅 {cmd.fecha_entrega}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
        </div>

        <div style={{padding:'14px 18px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'14px'}}>
          {err&&<div style={{padding:'8px 11px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',whiteSpace:'pre-line',lineHeight:1.6}}>{err}</div>}

          {/* ── RESUMEN FINANCIERO ── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px'}}>
            {[['💶 Total',`€ ${fmtNum(cmd.precio)}`,'#333'],
              ['✅ Pagado',`€ ${fmtNum(cmd.monto_pagado)}`,'var(--green)'],
              ['⏳ Saldo',`€ ${fmtNum(saldo)}`,saldo>0.01?'var(--red)':'var(--green)']
            ].map(([l,v,c])=>(
              <div key={l} style={{padding:'11px 10px',background:'var(--bg2)',border:'1px solid var(--border)',textAlign:'center'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',marginBottom:'4px'}}>{l}</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'16px',fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Barra de pago */}
          {cmd.precio>0&&(
            <div>
              <div style={{height:'6px',background:'var(--border)',borderRadius:'3px',overflow:'hidden'}}>
                <div style={{width:`${pct}%`,height:'100%',background:pct>=100?'var(--green)':pct>50?'var(--warn)':'var(--red)',borderRadius:'3px',transition:'width .4s'}}/>
              </div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'4px',textAlign:'right'}}>{pct.toFixed(0)}% pagado</div>
            </div>
          )}

          {/* ── PRENDAS ── */}
          {prods.length>0&&(
            <div style={{padding:'11px 13px',background:'var(--bg2)',border:'1px solid var(--border)'}}>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#555',marginBottom:'8px'}}>Prendas del pedido</div>
              <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                {prods.map((p,i)=>(
                  <span key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'3px 9px',fontFamily:'DM Mono,monospace',fontSize:'9px',display:'flex',alignItems:'center',gap:'4px'}}>
                    <strong>{p.cant}×</strong> {p.modelo||p.sku||'—'}
                    {p.tipoVenta&&<span style={{background:p.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:p.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',padding:'0 3px',fontSize:'8px'}}>{p.tipoVenta[0]}</span>}
                    {p.precio>0&&<span style={{color:'var(--red)',fontSize:'9px'}}>€{p.precio}</span>}
                  </span>
                ))}
              </div>
              {cmd.status==='listo'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)',marginTop:'7px',fontWeight:700}}>✅ Stock descontado al marcar LISTO</div>}
              {cmd.status!=='listo'&&cmd.status!=='entregado'&&cmd.status!=='cancelado'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'7px'}}>⚠️ El stock se descuenta automáticamente al marcar como LISTO</div>}
            </div>
          )}

          {/* ── BOTONES DE ACCIÓN DEL FLUJO ── */}
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'4px'}}>Acciones del pedido</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {sigStatus&&(
                <button onClick={()=>cambiarStatus(sigStatus)} disabled={saving}
                  style={{flex:2,padding:'11px 16px',background:S[sigStatus].border,color:'#fff',border:`2px solid ${S[sigStatus].border}`,cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',opacity:saving?.6:1}}>
                  {S[sigStatus].icon} Avanzar a {S[sigStatus].label}
                  {sigStatus==='listo'&&<span style={{fontSize:'10px',fontWeight:400,opacity:.8}}>(descuenta stock)</span>}
                </button>
              )}
              {cmd.status!=='cancelado'&&(
                <button onClick={()=>cambiarStatus('cancelado')} disabled={saving}
                  style={{flex:1,padding:'11px 10px',background:'var(--bg2)',color:'var(--red)',border:'1px solid var(--red)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,opacity:saving?.6:1}}>
                  ❌ Cancelar
                </button>
              )}
              {cmd.status==='cancelado'&&(
                <button onClick={()=>cambiarStatus('pendiente')} disabled={saving}
                  style={{flex:1,padding:'11px 10px',background:'var(--warn-soft)',color:'var(--warn)',border:'1px solid var(--warn)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>
                  ↩ Reactivar
                </button>
              )}
            </div>
          </div>

          {/* ── PAGO ── */}
          {saldo>0.01&&(
            <WidgetPago
              comandaId={cmd.id}
              saldo={saldo}
              onPagoRegistrado={()=>{ onSave(); }}
            />
          )}
          {saldo<=0.01&&cmd.precio>0&&(
            <div style={{padding:'11px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--green)',textAlign:'center',fontWeight:700}}>
              ✅ Comanda pagada completamente
            </div>
          )}

          {/* ── HISTORIAL DE PAGOS ── */}
          {!loadP&&pagos.length>0&&(
            <div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#555',marginBottom:'8px'}}>Historial de pagos</div>
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
                {pagos.map((p,i)=>{
                  const mcfg=METODOS.find(m=>m.id===p.metodo);
                  return(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 13px',borderBottom:'1px solid var(--border)'}}>
                      <span style={{fontSize:'16px',flexShrink:0}}>{mcfg?.icon||'💰'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'12px',fontWeight:600}}>{mcfg?.label||p.metodo}</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>{p.fecha}{p.referencia?` · Ref: ${p.referencia}`:''}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'var(--green)'}}>
                          {p.divisa==='BS'?`Bs. ${fmtNum(p.monto_bs||p.monto_divisa)}`:`${p.divisa} ${fmtNum(p.monto_divisa)}`}
                        </div>
                        {p.tasa_bs>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>@ {fmtNum(p.tasa_bs)} Bs/{p.divisa}</div>}
                        {p.monto_bs>0&&p.divisa!=='BS'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>= Bs. {fmtNum(p.monto_bs)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── NOTAS ── */}
          <div>
            <label style={lbl}>Notas</label>
            <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Instrucciones, observaciones..." style={inp}/>
          </div>
        </div>

        <div className="modal-footer-bar" style={{borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'8px',background:'var(--bg2)',flexShrink:0}}>
          <button onClick={onClose} style={{padding:'11px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>Cerrar</button>
          <button onClick={async()=>{
            const res=await fetch('/api/comandas',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cmd.id,notas})}).then(r=>r.json());
            if(res.ok)onSave();else setErr(res.error);
          }} style={{padding:'8px 15px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>
            Guardar notas
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function ComandasPage() {
  return (
    <Suspense fallback={<div style={{textAlign:'center',padding:'60px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando...</div>}>
      <ComandasInner />
    </Suspense>
  );
}

function ComandasInner() {
  const { data, recargar } = useAppData()||{};
  const { clientes=[], productos=[] } = data||{};

  const [comandas, setComandas] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState('todos');
  const [buscar,   setBuscar]   = useState('');
  const [modal,    setModal]    = useState(null);

  const searchParams = useSearchParams();
  const verRef = useRef(null); // guardamos el ?ver= para no perderlo por timing

  // Capturar el parámetro ?ver= apenas llega, antes de que cambie
  useEffect(() => {
    const ver = searchParams?.get('ver');
    if (ver) verRef.current = ver;
  }, [searchParams]);

  // Deep link desde historial: /comandas?ver=CMD-xxx
  // Se ejecuta cuando cargan las comandas O cuando llega el parámetro
  useEffect(()=>{
    const ver = verRef.current || searchParams?.get('ver');
    if (ver && comandas.length > 0) {
      const cmd = comandas.find(c => c.id === ver);
      if (cmd) {
        setModal(cmd);
        verRef.current = null; // limpiar para no reabrir en cada render
      }
    }
  },[searchParams, comandas]);

  async function cargar(){
    setLoading(true);
    const res=await fetch('/api/comandas').then(r=>r.json()).catch(()=>({ok:false}));
    if(res.ok) setComandas(res.comandas||[]);
    setLoading(false);
  }

  useEffect(()=>{
    cargar();
    // ── Realtime: recargar cuando cambie cualquier comanda ──
    let channel = null;
    async function conectarRealtime() {
      try {
        const { supabasePublic } = await import('@/lib/supabase');
        if (!supabasePublic) return;
        let debounce = null;
        channel = supabasePublic.channel('comandas-live')
          .on('postgres_changes',{event:'*',schema:'public',table:'comandas'},()=>{
            clearTimeout(debounce);
            debounce = setTimeout(()=>cargar(),800);
          })
          .on('postgres_changes',{event:'*',schema:'public',table:'movimientos'},()=>{
            clearTimeout(debounce);
            debounce = setTimeout(()=>cargar(),800);
          })
          .subscribe();
      } catch(e) { console.warn('[Realtime comandas]',e.message); }
    }
    conectarRealtime();
    return ()=>{ if(channel) import('@/lib/supabase').then(({supabasePublic})=>supabasePublic?.removeChannel(channel)).catch(()=>{}); };
  },[]);

  const filtradas = useMemo(()=>{
    let r=filtro==='todos'?comandas:comandas.filter(c=>c.status===filtro);
    if(buscar){const q=buscar.toLowerCase();r=r.filter(c=>`${c.cliente} ${c.id} ${c.notas||''}`.toLowerCase().includes(q));}
    return r;
  },[comandas,filtro,buscar]);

  const conteos = useMemo(()=>Object.fromEntries(Object.keys(S).map(s=>[s,comandas.filter(c=>c.status===s).length])),[comandas]);

  function onSave(){setModal(null);recargar();cargar();}
  function parseProd(cmd){let p=cmd.productos;if(typeof p==='string')try{p=JSON.parse(p);}catch{p=[];}return Array.isArray(p)?p:[];}

  return (
    <Shell title="Comandas">
      {modal==='nueva'&&<ModalNueva clientes={clientes} productos={productos} onClose={()=>setModal(null)} onSave={onSave}/>}
      {modal&&typeof modal==='object'&&<ModalGestion cmd={modal} onClose={()=>setModal(null)} onSave={onSave}/>}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Comandas</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'2px'}}>Stock se descuenta al marcar LISTO · Pagos con BS/USD/EUR/USDT</div>
        </div>
        <button onClick={()=>setModal('nueva')} style={{padding:'9px 18px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase'}}>
          📋 Nueva Comanda
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',marginBottom:'14px'}}>
        {Object.entries(S).map(([s,cfg])=>(
          <div key={s} onClick={()=>setFiltro(filtro===s?'todos':s)}
            style={{background:filtro===s?cfg.bg:'var(--surface)',border:`1px solid ${filtro===s?cfg.border:'var(--border)'}`,borderTop:`3px solid ${cfg.border}`,padding:'10px 12px',cursor:'pointer',transition:'all .13s'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',letterSpacing:'.14em',textTransform:'uppercase',color:cfg.color,marginBottom:'4px'}}>{cfg.icon} {cfg.label}</div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'26px',fontWeight:700,color:cfg.color,lineHeight:1}}>{conteos[s]||0}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',flex:1,minWidth:'180px'}}>
          <span>🔍</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar cliente, ID..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',width:'100%'}}/>
        </div>
        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
          {[['todos','Todas'],['pendiente','Pendiente'],['produccion','Prod.'],['listo','Listo'],['entregado','Entregado']].map(([s,l])=>(
            <button key={s} onClick={()=>setFiltro(s)} style={{padding:'5px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:filtro===s?700:500,background:filtro===s?'var(--ink)':'#eee',color:filtro===s?'#fff':'#333'}}>
              {l} ({s==='todos'?comandas.length:conteos[s]||0})
            </button>
          ))}
        </div>
        <button onClick={cargar} style={{padding:'6px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555'}}>↺</button>
      </div>

      {loading&&<div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando...</div>}

      {!loading&&filtradas.length===0&&(
        <div style={{textAlign:'center',padding:'50px',background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'32px',marginBottom:'10px'}}>📋</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666',marginBottom:'14px'}}>{comandas.length===0?'Sin comandas aún':'Sin resultados'}</div>
          <button onClick={()=>setModal('nueva')} style={{padding:'9px 18px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase'}}>
            📋 Crear Primera Comanda
          </button>
        </div>
      )}

      {!loading&&filtradas.map(cmd=>{
        const sc=S[cmd.status]||S.pendiente;
        const saldo=Math.max(0,(cmd.precio||0)-(cmd.monto_pagado||0));
        const pct=cmd.precio>0?Math.min(100,((cmd.monto_pagado||0)/cmd.precio)*100):0;
        const prods=parseProd(cmd);
        return(
          <div key={cmd.id} onClick={()=>setModal(cmd)}
            style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`4px solid ${sc.border}`,padding:'14px 16px',marginBottom:'8px',cursor:'pointer',transition:'background .12s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px',marginBottom:'7px'}}>
              <div>
                <span style={{fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700}}>{cmd.cliente}</span>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#999',marginLeft:'10px'}}>{cmd.id}</span>
                {cmd.fecha_entrega&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',marginLeft:'8px'}}>📅 {cmd.fecha_entrega}</span>}
              </div>
              <span style={{background:sc.bg,color:sc.color,fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'3px 12px',fontWeight:700}}>{sc.icon} {sc.label}</span>
            </div>

            {prods.length>0&&(
              <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'7px'}}>
                {prods.slice(0,5).map((p,i)=>(
                  <span key={i} style={{background:'var(--bg3)',padding:'2px 7px',fontFamily:'DM Mono,monospace',fontSize:'9px'}}>
                    {p.cant}× {p.modelo||p.sku||'—'}
                  </span>
                ))}
                {prods.length>5&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>+{prods.length-5} más</span>}
              </div>
            )}

            <div style={{display:'flex',gap:'16px',flexWrap:'wrap',fontSize:'11px',fontFamily:'DM Mono,monospace',color:'#555',marginBottom:'6px'}}>
              <span>💶 <strong style={{color:sc.color}}>€ {fmtNum(cmd.precio)}</strong></span>
              <span>✅ <strong style={{color:'var(--green)'}}>€ {fmtNum(cmd.monto_pagado)}</strong></span>
              {saldo>0.01&&<span style={{color:'var(--red)',fontWeight:700}}>⏳ Saldo € {fmtNum(saldo)}</span>}
              {saldo<=0.01&&cmd.precio>0&&<span style={{color:'var(--green)',fontWeight:700}}>✓ Pagada</span>}
              {cmd.notas&&<span style={{color:'#888',fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'200px',whiteSpace:'nowrap'}}>📝 {cmd.notas}</span>}
            </div>
            {cmd.precio>0&&(
              <div style={{height:'3px',background:'var(--border)',borderRadius:'2px',overflow:'hidden'}}>
                <div style={{width:`${pct}%`,height:'100%',background:pct>=100?'var(--green)':pct>50?'var(--warn)':'var(--red)',borderRadius:'2px'}}/>
              </div>
            )}
          </div>
        );
      })}
    <style>{`
        @media (max-width: 767px) {
          .modal-footer-bar {
            padding: 12px 14px !important;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .modal-fullscreen {
            max-height: calc(100dvh - 60px) !important;
            border-radius: 12px 12px 0 0 !important;
          }
          .modal-wrap {
            align-items: flex-end !important;
          }
        }
        @media (min-width: 768px) {
          .modal-footer-bar { padding: 12px 18px; }
          .modal-fullscreen { max-height: 96vh !important; border-radius: 0 !important; }
          .modal-wrap { align-items: center !important; }
        }
      `}</style>
    </Shell>
  );
}