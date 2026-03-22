'use client';
import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useAppData } from '@/lib/AppContext';
import { useAuth } from '@/lib/AuthContext';
import { fetchApi } from '@/utils/fetchApi';
import ModalTicketEnvio from '@/components/ModalTicketEnvio';
import ScannerInput from '@/components/ScannerInput';
import ModalPromo from '@/components/ModalPromo';

/* ─── Constantes ─────────────────────────────────────────────────── */
const S = {
  pendiente: {bg:'#fff8e1',color:'#f59e0b',border:'#f59e0b',label:'Pendiente',  icon:'🕐'},
  empacado:  {bg:'#eff6ff',color:'#3b82f6',border:'#3b82f6',label:'Empacado',   icon:'📦'},
  enviado:   {bg:'#f0fdf4',color:'#22c55e',border:'#22c55e',label:'Enviado',    icon:'🚀'},
  cancelado: {bg:'#fff1f2',color:'#ef4444',border:'#ef4444',label:'Cancelado',  icon:'❌'},
};
const FLUJO = ['pendiente','empacado','enviado'];

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
   WIDGET DE PAGO
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
        {/* Tasa solo cuando la divisa es BS */}
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
   MODAL NUEVA COMANDA — WIZARD
═══════════════════════════════════════════════════════════════════ */
function ModalNueva({ clientes, productos, onClose, onSave }) {
  /* ── Wizard ─────────────────────────────────────── */
  const [paso,     setPaso]    = useState(1); // 1=Cliente 2=Prendas 3=Entrega&Pago

  /* ── Paso 1: Cliente ─────────────────────────────── */
  const [cliQuery, setCliQ]    = useState('');
  const [cliRes,   setCliRes]  = useState([]);
  const [cliOpen,  setCliOpen] = useState(false);
  const [cliId,    setCliId]   = useState('');
  const [nuevoMode,setNuevo]   = useState(false);
  const [nuevoDoc, setNDoc]    = useState('');
  const [nuevoTel, setNTel]    = useState('');

  /* ── Paso 2: Prendas ─────────────────────────────── */
  const [items,    setItems]   = useState([]);
  const [catalogo, setCatalogo]= useState(false);

  /* ── Paso 3: Entrega & Pago ──────────────────────── */
  const [fechaEnt, setFechaEnt]= useState('');
  const [notas,    setNotas]   = useState('');
  const [abono,    setAbono]   = useState('');
  const [abonoMetodo, setAM]   = useState('');
  const [abonoDiv,    setAD]   = useState('EUR');
  const [abonoTasa,   setAT]   = useState('');
  const [abonoRef,    setAR]   = useState('');

  const [guardando,setGuard]   = useState(false);
  const [err,      setErr]     = useState('');

  function buscarCli(q){
    setCliQ(q); setCliId(''); setNuevo(false);
    if(q.length<2){setCliRes([]);setCliOpen(false);return;}
    const r=clientes.filter(c=>`${c.nombre} ${c.cedula||''} ${c.telefono||''}`.toLowerCase().includes(q.toLowerCase())).slice(0,5);
    setCliRes(r); setCliOpen(true);
  }

  function addFromCatalog(p,qty,tv){
    setItems(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty,tipoVenta:tv}:x);
      return[...prev,{...p,qty,tipoVenta:tv}];
    });
  }

  // ── Campo SKU con auto-submit y cámara ────────────────────────────
  const skuRef       = useRef(null);
  const autoTimer    = useRef(null);
  const lastCharMs   = useRef(0);
  const [skuVal,  setSkuVal]  = useState('');
  const [skuMsg,  setSkuMsg]  = useState(null);
  const [camOpen, setCamOpen] = useState(false);
  const [camErr,  setCamErr]  = useState('');
  const [camLoad, setCamLoad] = useState(false);
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const nativeDetRef = useRef(null);
  const zxingRef     = useRef(null);
  const animRef      = useRef(null);
  const scannedRef   = useRef(false);

  function agregarPorSku(raw) {
    const sku = (raw||'').trim().toUpperCase();
    if (!sku) return;
    setSkuVal('');
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    const prod = productos.find(p => p.sku?.toUpperCase() === sku);
    if (!prod) {
      setSkuMsg({ t: 'err', m: `⚠ SKU no encontrado: ${sku}` });
      setTimeout(() => setSkuMsg(null), 3000);
      setTimeout(() => skuRef.current?.focus(), 50);
      return;
    }
    setItems(prev => {
      const ex = prev.find(x => x.sku === prod.sku);
      if (ex) return prev.map(x => x.sku === prod.sku ? {...x, qty: x.qty + 1} : x);
      return [...prev, {...prod, qty: 1, tipoVenta: 'MAYOR'}];
    });
    setSkuMsg({ t: 'ok', m: `✓ ${prod.modelo} — ${prod.color}` });
    setTimeout(() => setSkuMsg(null), 2500);
    setTimeout(() => skuRef.current?.focus(), 30);
  }

  function handleSkuChange(e) {
    const val = e.target.value;
    setSkuVal(val);
    const now = Date.now();
    const gap = now - lastCharMs.current;
    lastCharMs.current = now;
    // Lector físico: chars llegan en < 50ms entre sí → auto-submit tras 100ms de silencio
    if (gap < 50 && val.trim()) {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(() => {
        const cur = skuRef.current?.value || val;
        if (cur.trim()) agregarPorSku(cur);
      }, 100);
    }
  }

  const cerrarCamara = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (zxingRef.current) { try { zxingRef.current.reset(); } catch(_){} zxingRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    scannedRef.current = false;
    setCamOpen(false); setCamLoad(false);
  }, []);

  useEffect(() => () => { cerrarCamara(); if (autoTimer.current) clearTimeout(autoTimer.current); }, []);

  const processCamSku = useCallback((sku) => { cerrarCamara(); agregarPorSku(sku); }, []); // eslint-disable-line

  const scanFrameNative = useCallback(() => {
    if (!videoRef.current || !nativeDetRef.current) return;
    nativeDetRef.current.detect(videoRef.current)
      .then(codes => {
        if (codes.length > 0 && !scannedRef.current) { scannedRef.current = true; processCamSku(codes[0].rawValue); }
        else animRef.current = requestAnimationFrame(scanFrameNative);
      })
      .catch(() => { animRef.current = requestAnimationFrame(scanFrameNative); });
  }, [processCamSku]);

  async function abrirCamara() {
    setCamErr(''); setCamLoad(true);
    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream; setCamOpen(true); setCamLoad(false);
      await new Promise(r => setTimeout(r, 150));
      if (!videoRef.current) { cerrarCamara(); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (hasNative) {
        nativeDetRef.current = new window.BarcodeDetector({ formats: ['code_128','ean_13','ean_8','qr_code','upc_a','upc_e','code_39','itf'] });
        scanFrameNative();
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        zxingRef.current = reader;
        reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && !scannedRef.current) { scannedRef.current = true; processCamSku(result.getText()); }
        });
      }
    } catch(e) {
      cerrarCamara();
      setCamErr(e.name === 'NotAllowedError' ? '❌ Permiso de cámara denegado.' : '❌ Error al abrir cámara: ' + e.message);
    }
  }

  function changeQty(sku,d){setItems(prev=>prev.map(x=>x.sku===sku?{...x,qty:Math.max(1,x.qty+d)}:x));}
  function removeItem(sku){setItems(prev=>prev.filter(x=>x.sku!==sku));}
  function setItemTV(sku,tv){setItems(prev=>prev.map(x=>x.sku===sku?{...x,tipoVenta:tv}:x));}

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

      let montoAbonoEUR = 0;
      if(abono && parseFloat(abono)>0) {
        const ma=parseFloat(abono)||0, ta=parseFloat(abonoTasa)||0;
        if(abonoDiv==='BS')        montoAbonoEUR = ta>0?ma/ta:0;
        else                       montoAbonoEUR = ma; // EUR, USD, USDT = precio directo
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

  /* ── helpers de paso ────────────────────────────────────────────── */
  function avanzar() { setErr(''); setPaso(p => p + 1); }
  function retroceder() { setErr(''); setPaso(p => p - 1); }

  function validarPaso1() {
    if (!cliQuery.trim()) { setErr('Escribe o selecciona un cliente'); return false; }
    return true;
  }
  function validarPaso2() {
    if (items.length === 0) { setErr('Agrega al menos una prenda'); return false; }
    return true;
  }

  /* ── barra de pasos ─────────────────────────────────────────────── */
  const PASOS = ['Cliente', 'Prendas', 'Entrega & Pago'];
  function StepBar() {
    return (
      <div style={{display:'flex',alignItems:'center',padding:'12px 18px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',flexShrink:0,gap:0}}>
        {PASOS.map((label, i) => {
          const num = i + 1;
          const done = paso > num;
          const active = paso === num;
          return (
            <div key={num} style={{display:'flex',alignItems:'center',flex: i < PASOS.length - 1 ? 1 : 'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:'7px',cursor:done?'pointer':'default'}}
                onClick={()=>{ if(done) { setErr(''); setPaso(num); } }}>
                <div style={{
                  width:'22px',height:'22px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'11px',fontWeight:700,flexShrink:0,
                  background: done ? 'var(--green)' : active ? '#f59e0b' : 'var(--bg3)',
                  color: done || active ? '#fff' : '#888',
                  border: active ? 'none' : done ? 'none' : '1px solid var(--border)',
                  transition:'all .2s',
                }}>
                  {done ? '✓' : num}
                </div>
                <span style={{
                  fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight: active ? 700 : 400,
                  color: active ? '#f59e0b' : done ? 'var(--green)' : '#888',
                  whiteSpace:'nowrap',
                }}>
                  {label}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div style={{flex:1,height:'1px',background: paso > num+1 ? 'var(--green)' : 'var(--border)',margin:'0 10px',transition:'background .3s'}}/>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
    {catalogo&&<CatalogoExplorer productos={productos} modo="entrada" tipoVenta="MAYOR" onAdd={addFromCatalog} onClose={()=>setCatalogo(false)}/>}
      {promoModal&&<ModalPromo productos={productos} isAdmin={true}
        onAdd={(promItems)=>{
          promItems.forEach(item=>{
            setItems(prev=>{
              const ex=prev.find(x=>x.sku===item.sku&&x.promoTag===item.promoTag);
              if(ex) return prev.map(x=>x.sku===item.sku&&x.promoTag===item.promoTag?{...x,qty:x.qty+1}:x);
              return [...prev,{...item,tipoVenta:'PROMO'}];
            });
          });
        }}
        onClose={()=>setPromoModal(false)}/>}

    {/* ── Modal cámara ─────────────────────────────────────────── */}
    {camOpen && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:500,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'20px'}}>
        <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#fff',letterSpacing:'.12em',textTransform:'uppercase'}}>📷 Apunta al código de barras</div>
        <div style={{position:'relative',width:'min(92vw,400px)',aspectRatio:'4/3',background:'#000',overflow:'hidden',borderRadius:'4px',border:'2px solid #f59e0b',boxShadow:'0 0 0 4px rgba(245,158,11,.15)'}}>
          <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline autoPlay/>
          <div style={{position:'absolute',inset:'15%',border:'2px solid rgba(245,158,11,.5)',borderRadius:'6px',pointerEvents:'none'}}/>
          <div style={{position:'absolute',left:'15%',right:'15%',height:'2px',background:'rgba(245,158,11,.7)',borderRadius:'1px',animation:'scanline 2s ease-in-out infinite',pointerEvents:'none'}}/>
        </div>
        <button onClick={cerrarCamara} style={{padding:'10px 28px',background:'none',border:'1px solid rgba(255,255,255,.4)',color:'#fff',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>✕ Cancelar</button>
        <style>{`@keyframes scanline{0%,100%{top:18%;opacity:.4;}50%{top:78%;opacity:1;}}`}</style>
      </div>
    )}

    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0',overflowY:'auto'}} className="modal-wrap">
      <div className="modal-fullscreen" style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'620px',borderTop:'3px solid #f59e0b',maxHeight:'96vh',display:'flex',flexDirection:'column'}}>

        {/* ── Cabecera ─────────────────────────────────────────── */}
        <div style={{padding:'13px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>📋 Nueva Comanda</div>
          <button onClick={()=>{
            const tieneContenido = cliQuery.trim() || items.length > 0;
            if (tieneContenido) {
              if (window.confirm('¿Seguro que quieres cerrar? Se perderán los datos ingresados.')) onClose();
            } else {
              onClose();
            }
          }} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* ── Barra de pasos ───────────────────────────────────── */}
        <StepBar/>

        {/* ── Error global ─────────────────────────────────────── */}
        {err && (
          <div style={{margin:'10px 18px 0',padding:'8px 11px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',flexShrink:0}}>
            {err}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PASO 1 — CLIENTE
        ══════════════════════════════════════════════════════ */}
        {paso === 1 && (
          <>
          <div style={{padding:'20px 18px',flex:1,display:'flex',flexDirection:'column',gap:'14px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'-6px'}}>
              ¿Para quién es este pedido?
            </div>

            <div style={{position:'relative'}}>
              <label style={lbl}>Nombre del cliente *</label>
              <div style={{display:'flex',gap:'8px'}}>
                <div style={{flex:1,position:'relative'}}>
                  <input
                    value={cliQuery}
                    onChange={e=>buscarCli(e.target.value)}
                    onBlur={()=>setTimeout(()=>setCliOpen(false),180)}
                    placeholder="Buscar o escribir nombre..."
                    autoFocus
                    style={inp}
                  />
                  {cliId&&<span style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',color:'var(--green)',fontSize:'14px'}}>✓</span>}
                </div>
                <button onClick={()=>setNuevo(n=>!n)} style={{padding:'9px 12px',background:nuevoMode?'var(--green)':'var(--bg2)',color:nuevoMode?'#fff':'#444',border:`1px solid ${nuevoMode?'var(--green)':'var(--border)'}`,cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,whiteSpace:'nowrap'}}>
                  + Nuevo
                </button>
              </div>
              {cliOpen&&(cliRes.length>0||cliQuery.length>=2)&&(
                <div style={{position:'absolute',top:'100%',left:0,right:'90px',background:'var(--surface)',border:'1px solid var(--border-strong)',borderTop:'none',zIndex:999,boxShadow:'0 8px 24px rgba(0,0,0,.1)',maxHeight:'200px',overflowY:'auto'}}>
                  {cliRes.map(c=>(
                    <div key={c.id}
                      onMouseDown={e=>{e.preventDefault();setCliQ(c.nombre);setCliId(c.id);setCliOpen(false);setNuevo(false);}}
                      style={{padding:'10px 12px',cursor:'pointer',fontSize:'12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <strong>{c.nombre}</strong>
                      <span style={{color:'#666',fontSize:'10px'}}>{c.cedula||c.telefono||''}</span>
                    </div>
                  ))}
                  {cliQuery.length>=2&&(
                    <div onMouseDown={e=>{e.preventDefault();setNuevo(true);setCliOpen(false);}}
                      style={{padding:'9px 12px',cursor:'pointer',color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,textAlign:'center',background:'var(--green-soft)'}}
                      onMouseEnter={e=>e.currentTarget.style.opacity='.7'}
                      onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      + Registrar "{cliQuery}" como nuevo
                    </div>
                  )}
                </div>
              )}
            </div>

            {nuevoMode&&(
              <div style={{padding:'12px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div style={{gridColumn:'span 2',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)',fontWeight:700}}>👤 Datos del nuevo cliente (opcional)</div>
                <div><label style={lbl}>Cédula / RIF</label><input value={nuevoDoc} onChange={e=>setNDoc(e.target.value)} placeholder="V-12345678" style={inp}/></div>
                <div><label style={lbl}>Teléfono</label><input value={nuevoTel} onChange={e=>setNTel(e.target.value)} placeholder="+58 412..." style={inp}/></div>
              </div>
            )}

            {/* Indicador de cliente seleccionado */}
            {cliId && (
              <div style={{padding:'10px 14px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',borderLeft:'3px solid var(--green)',display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'18px'}}>✓</span>
                <div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700}}>CLIENTE ENCONTRADO</div>
                  <div style={{fontSize:'14px',fontWeight:600,marginTop:'2px'}}>{cliQuery}</div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer-bar" style={{borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg2)',flexShrink:0}}>
            <button onClick={onClose} style={{padding:'11px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>
              Cancelar
            </button>
            <button onClick={()=>{ if(validarPaso1()) avanzar(); }}
              style={{padding:'11px 24px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>
              Siguiente →
            </button>
          </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            PASO 2 — PRENDAS
        ══════════════════════════════════════════════════════ */}
        {paso === 2 && (
          <>
          {/* Chip cliente confirmado */}
          <div style={{padding:'8px 18px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)',fontWeight:700,letterSpacing:'.12em'}}>CLIENTE:</span>
            <span style={{fontSize:'13px',fontWeight:600}}>{cliQuery}</span>
            <button onClick={()=>{setErr('');setPaso(1);}} style={{marginLeft:'auto',padding:'2px 8px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>✏️ cambiar</button>
          </div>

          <div style={{padding:'16px 18px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'10px'}}>
            {/* Scanner con catálogo y promo integrados */}
            <ScannerInput
              productos={productos}
              skipStockCheck={true}
              onAdd={(prod, qty=1)=>{
                setItems(prev=>{
                  const ex=prev.find(x=>x.sku===prod.sku);
                  if(ex) return prev.map(x=>x.sku===prod.sku?{...x,qty:x.qty+qty}:x);
                  return [...prev,{...prod,qty,tipoVenta:'MAYOR'}];
                });
              }}
              extraActions={[
                { label:'⊞ Catálogo', onClick:()=>setCatalogo(true), bg:'#f59e0b', color:'#000' },
                { label:'🎁 Promo', onClick:()=>setPromoModal(true), bg:'#7c3aed', color:'#fff' },
              ]}
            />



            {/* Lista de items */}
            {items.length===0 ? (
              <div style={{padding:'32px',textAlign:'center',background:'var(--bg2)',border:'1px dashed var(--border-strong)',color:'#888',fontSize:'12px'}}>
                Escanea un código o abre el Catálogo para agregar prendas
              </div>
            ) : (
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
                {[...items].reverse().map(item=>{
                  const precio=precioItem(item); const dot=colorHex(item.color);
                  return (
                    <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'8px',padding:'11px 14px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <span style={{width:'9px',height:'9px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                          <span style={{fontSize:'13px',fontWeight:600}}>{item.modelo} — {item.color}</span>
                        </div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'3px'}}>
                          {item.sku} · <strong style={{color:item.tipoVenta==='PROMO'?'#7c3aed':item.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)'}}>€{precio.toFixed(2)} × {item.qty} = €{(precio*item.qty).toFixed(2)}</strong>{item.promoNombre&&<span style={{marginLeft:'6px',background:'#ede9fe',color:'#7c3aed',fontFamily:'DM Mono,monospace',fontSize:'8px',padding:'1px 5px',fontWeight:700}}>🎁 {item.promoNombre}</span>}
                        </div>
                      </div>
                      <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                        {['DETAL','MAYOR'].map(tv=>(
                          <button key={tv} onClick={()=>setItemTV(item.sku,tv)}
                            style={{padding:'5px 8px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,background:item.tipoVenta===tv?(tv==='DETAL'?'var(--blue)':'var(--warn)'):'var(--bg3)',color:item.tipoVenta===tv?'#fff':'#777'}}>
                            {tv[0]}
                          </button>
                        ))}
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
              </div>
            )}
          </div>

          <div className="modal-footer-bar" style={{borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg2)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <button onClick={retroceder} style={{padding:'11px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>← Volver</button>
              {items.length>0&&<span style={{fontFamily:'Playfair Display,serif',fontSize:'18px',fontWeight:700,color:'#f59e0b'}}>€ {totalCalc.toFixed(2)}</span>}
            </div>
            <button onClick={()=>{ if(validarPaso2()) avanzar(); }}
              style={{padding:'11px 24px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>
              Siguiente →
            </button>
          </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            PASO 3 — ENTREGA & PAGO
        ══════════════════════════════════════════════════════ */}
        {paso === 3 && (
          <>
          {/* Chips resumen */}
          <div style={{padding:'8px 18px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',gap:'12px',alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>
              <span style={{color:'var(--green)',fontWeight:700}}>✓ {cliQuery}</span>
              <span style={{margin:'0 8px',opacity:.4}}>·</span>
              <span style={{color:'var(--warn)',fontWeight:700}}>{items.length} prenda{items.length!==1?'s':''}</span>
              <span style={{margin:'0 8px',opacity:.4}}>·</span>
              <span style={{color:'var(--warn)',fontWeight:700}}>€ {totalCalc.toFixed(2)}</span>
            </span>
          </div>

          <div style={{padding:'16px 18px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'14px'}}>
            {/* Fecha + urgencia */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={lbl}>📅 Fecha de entrega</label>
                <input type="date" value={fechaEnt} onChange={e=>setFechaEnt(e.target.value)} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Urgencia</label>
                <select value={notas.startsWith('URGENTE')?'urgente':'normal'} onChange={e=>{ if(e.target.value==='urgente') setNotas(n=>n.startsWith('URGENTE')?n:'URGENTE – '+n); else setNotas(n=>n.replace(/^URGENTE\s*–\s*/,''));}} style={{...inp,padding:'8px 6px'}}>
                  <option value="normal">Normal</option>
                  <option value="urgente">🔴 Urgente</option>
                </select>
              </div>
            </div>

            {/* Notas como textarea */}
            <div>
              <label style={lbl}>📝 Notas / Instrucciones</label>
              <textarea
                value={notas}
                onChange={e=>setNotas(e.target.value)}
                placeholder="Colores específicos, tallas, instrucciones de entrega, observaciones..."
                rows={2}
                style={{...inp,resize:'vertical',minHeight:'54px',lineHeight:'1.5'}}
              />
            </div>

            {/* Abono — siempre visible, campos compactos */}
            <div style={{border:'1px solid var(--border)',overflow:'hidden'}}>
              <div style={{padding:'10px 14px',background:'#fffbeb',borderBottom:'1px solid #f59e0b33',display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#92400e',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase'}}>💰 Abono inicial</span>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#999'}}>— opcional</span>
              </div>
              <div style={{padding:'12px 14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={lbl}>Método de pago</label>
                  <select value={abonoMetodo} onChange={e=>{setAM(e.target.value);const m=METODOS.find(x=>x.id===e.target.value);if(m)setAD(m.divisa);}} style={{...inp,padding:'8px 6px'}}>
                    <option value="">Sin abono</option>
                    {METODOS.map(m=><option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Monto</label>
                  <div style={{display:'flex',gap:'5px'}}>
                    <select value={abonoDiv} onChange={e=>setAD(e.target.value)} style={{width:'65px',padding:'9px 4px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'}}>
                      <option>EUR</option><option>BS</option><option>USD</option><option>USDT</option>
                    </select>
                    <input type="number" min="0" step="0.01" value={abono} onChange={e=>setAbono(e.target.value)} placeholder="0.00" style={{...inp,flex:1}}/>
                  </div>
                </div>
                {/* Tasa solo cuando la divisa es BS */}
                {abonoMetodo && abonoDiv === 'BS' && (
                  <div>
                    <label style={lbl}>Tasa BS / {abonoDiv}</label>
                    <input type="number" value={abonoTasa} onChange={e=>setAT(e.target.value)} placeholder="Ej: 96.50" style={inp}/>
                  </div>
                )}
                {abonoMetodo && (
                  <div>
                    <label style={lbl}>Referencia</label>
                    <input value={abonoRef} onChange={e=>setAR(e.target.value)} placeholder="Últimos 6 dígitos" style={inp}/>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Preview pago — barra fija siempre visible ──────────── */}
          {(()=>{
            const ma=parseFloat(abono)||0; const ta=parseFloat(abonoTasa)||0;
            let abonoEUR = abonoDiv==='BS' ? (ta>0?ma/ta:0) : ma;
            const falta=totalCalc-abonoEUR;
            return(
              <div style={{borderTop:'1px solid #f59e0b55',background:'#fffbeb',flexShrink:0,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0',padding:'0'}}>
                <div style={{textAlign:'center',padding:'10px 8px',borderRight:'1px solid #f59e0b33'}}>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#92400e',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.1em'}}>Total</div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'16px',fontWeight:700,color:'var(--red)'}}>€ {fmtNum(totalCalc)}</div>
                </div>
                <div style={{textAlign:'center',padding:'10px 8px',borderRight:'1px solid #f59e0b33'}}>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#92400e',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.1em'}}>Abonando</div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'16px',fontWeight:700,color:'var(--green)'}}>€ {fmtNum(abonoEUR)}</div>
                  {abonoDiv==='BS'&&ma>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888'}}>Bs. {fmtNum(ma)}</div>}
                  {(abonoDiv==='USD'||abonoDiv==='USDT')&&ma>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888'}}>{abonoDiv} {fmtNum(ma)}</div>}
                </div>
                {ma>0&&abonoMetodo
                  ? falta>0.01
                    ? <div style={{textAlign:'center',padding:'10px 8px',background:'#fff8e1'}}>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#92400e',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.1em'}}>Falta</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'16px',fontWeight:700,color:'#f59e0b'}}>€ {fmtNum(falta)}</div>
                      </div>
                    : <div style={{textAlign:'center',padding:'10px 8px',background:'var(--green-soft)'}}>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'var(--green)',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.1em'}}>Vuelto</div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'16px',fontWeight:700,color:'var(--green)'}}>€ {fmtNum(-falta)}</div>
                      </div>
                  : <div style={{textAlign:'center',padding:'10px 8px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#bbb'}}>sin abono</span>
                    </div>
                }
              </div>
            );
          })()}

          <div className="modal-footer-bar" style={{borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg2)',flexShrink:0}}>
            <button onClick={retroceder} style={{padding:'11px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>← Volver</button>
            <button onClick={guardar} disabled={guardando}
              style={{padding:'11px 22px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',opacity:guardando?.6:1}}>
              {guardando?'⏳ Guardando...':'📋 Crear Comanda'}
            </button>
          </div>
          </>
        )}

      </div>
    </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL GESTIÓN
═══════════════════════════════════════════════════════════════════ */
function ModalGestion({ cmd, productos=[], isAdmin=false, onClose, onSave, onDelete }) {
  const sc = S[cmd.status]||S.pendiente;
  const [pagos,    setPagos]   = useState([]);
  const [loadP,    setLoadP]   = useState(true);
  const [notas,    setNotas]   = useState(cmd.notas||'');
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');
  const [deleting, setDeleting]= useState(false);

  // ── Estado de empacado ────────────────────────────────────────────
  // Guarda cuántas unidades de cada SKU ya fueron empacadas físicamente
  const [empacadoMap, setEmpacadoMap] = useState(() => {
    // Inicializar desde localStorage si existe para esta comanda
    try {
      const saved = localStorage.getItem('emp_' + cmd.id);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  function marcarEmpacado(sku, delta) {
    setEmpacadoMap(prev => {
      const pedido = parseProd(cmd).find(p => (p.sku||'').toUpperCase() === sku.toUpperCase());
      const max = parseInt(pedido?.cant || pedido?.cantidad || 1);
      const cur = prev[sku] || 0;
      const next = Math.max(0, Math.min(cur + delta, max));
      const updated = { ...prev, [sku]: next };
      try { localStorage.setItem('emp_' + cmd.id, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function scanEmpacado(prod) {
    const sku = prod.sku?.toUpperCase() || '';
    const pedido = parseProd(cmd).find(p => (p.sku||'').toUpperCase() === sku);
    if (!pedido) return;
    marcarEmpacado(sku, 1);
  }

  const prodsParaEmpacar = parseProd(cmd);
  const totalPedido = prodsParaEmpacar.reduce((a, p) => a + parseInt(p.cant||p.cantidad||1), 0);
  const totalEmpacado = prodsParaEmpacar.reduce((a, p) => {
    const sku = (p.sku||'').toUpperCase();
    return a + Math.min(empacadoMap[sku]||0, parseInt(p.cant||p.cantidad||1));
  }, 0);
  const empacadoCompleto = totalEmpacado >= totalPedido && totalPedido > 0;

  async function eliminarComanda() {
    if (!window.confirm(`⚠️ ¿Eliminar la comanda de "${cmd.cliente}" (${cmd.id})?\n\nEsta acción no se puede deshacer. Se eliminarán también todos los pagos asociados.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/comandas', {method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:cmd.id})}).then(r=>r.json());
      if (res.ok) { onDelete?.(); onClose(); }
      else setErr(res.error||'Error al eliminar');
    } catch(e){ setErr('Error de conexión'); }
    setDeleting(false);
  }

  // ── Modo edición ──────────────────────────────────────────────────
  const [editMode,    setEditMode]  = useState(false);
  const [editItems,   setEditItems] = useState([]);
  const [editCatalog, setEditCat]   = useState(false);

  function parseProd(c){let p=c.productos;if(typeof p==='string')try{p=JSON.parse(p);}catch{p=[];}return Array.isArray(p)?p:[];}

  function abrirEdicion() {
    // Convertir productos guardados al formato editable
    const prods = parseProd(cmd).map(p => ({
      sku: p.sku||'', modelo: p.modelo||p.sku||'', color: p.color||'', talla: p.talla||'',
      precioDetal: p.precio||0, precioMayor: p.precio||0,
      tipoVenta: p.tipoVenta||'MAYOR', qty: parseInt(p.cant||p.cantidad||1),
      disponible: 999,
    }));
    setEditItems(prods);
    setEditMode(true);
    setErr('');
  }

  function editChangeQty(sku,d){ setEditItems(prev=>prev.map(x=>x.sku===sku?{...x,qty:Math.max(1,x.qty+d)}:x)); }
  function editSetTV(sku,tv)   { setEditItems(prev=>prev.map(x=>x.sku===sku?{...x,tipoVenta:tv}:x)); }
  function editRemove(sku)     { setEditItems(prev=>prev.filter(x=>x.sku!==sku)); }
  function editAddFromCatalog(p,qty,tv) {
    setEditItems(prev=>{
      const ex=prev.find(x=>x.sku===p.sku);
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty,tipoVenta:tv}:x);
      return[...prev,{...p,qty,tipoVenta:tv}];
    });
  }

  const editTotal = editItems.reduce((a,it)=>a+(it.tipoVenta==='MAYOR'?(it.precioMayor||0):(it.precioDetal||0))*it.qty, 0);

  async function guardarEdicion() {
    if (!editItems.length) { setErr('Agrega al menos un producto'); return; }
    setSaving(true); setErr('');
    const productosPayload = editItems.map(it=>({
      sku: it.sku,
      modelo: `${it.modelo}${it.color?' — '+it.color:''}${it.talla&&it.talla!=='UNICA'?' '+it.talla:''}`,
      cant: it.qty,
      precio: it.tipoVenta==='MAYOR'?(it.precioMayor||0):(it.precioDetal||0),
      tipoVenta: it.tipoVenta,
    }));
    const res = await fetch('/api/comandas',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:cmd.id, productos:productosPayload, precio:editTotal, notas})}).then(r=>r.json());
    if(res.ok){ setEditMode(false); onSave(); }
    else setErr(res.error||'Error al guardar');
    setSaving(false);
  }

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
      const detalle = res.sinStock.map(x=>`• ${x.modelo}: necesitas ${x.requerido} ud${x.requerido>1?'s':''}, tienes ${x.stockReal} (faltan ${x.falta})`).join('\n');
      setErr(`❌ Sin stock suficiente:\n${detalle}\n\nRegistra una Entrada primero.`);
    } else {
      setErr(res.error||'Error');
    }
    setSaving(false);
  }

  const prods = parseProd(cmd);

  const idxActual = FLUJO.indexOf(cmd.status);
  const sigStatus = FLUJO[idxActual+1];

  return (
    <>
    {editCatalog&&<CatalogoExplorer productos={productos} modo="salida" tipoVenta="MAYOR" onAdd={editAddFromCatalog} onClose={()=>setEditCat(false)}/>}
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0',overflowY:'auto'}} className="modal-wrap" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-fullscreen" style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'640px',borderTop:`3px solid ${editMode?'#f59e0b':sc.border}`,maxHeight:'96vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'17px',fontWeight:700}}>{cmd.cliente}</div>
            <div style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'4px'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>{cmd.id}</span>
              <span style={{background:sc.bg,color:sc.color,fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'2px 10px',fontWeight:700,border:`1px solid ${sc.border}44`}}>{sc.icon} {sc.label}</span>
              {cmd.fecha_entrega&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>📅 {cmd.fecha_entrega}</span>}
              {editMode&&<span style={{background:'#fff8e1',color:'#f59e0b',fontFamily:'DM Mono,monospace',fontSize:'9px',padding:'2px 8px',fontWeight:700,border:'1px solid #f59e0b44'}}>✏️ MODO EDICIÓN</span>}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
        </div>

        <div style={{padding:'14px 18px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'14px'}}>
          {err&&<div style={{padding:'8px 11px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',whiteSpace:'pre-line',lineHeight:1.6}}>{err}</div>}

          {/* ── MODO EDICIÓN ─────────────────────────────────────── */}
          {editMode ? (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{padding:'10px 12px',background:'#fff8e1',border:'1px solid #f59e0b44',borderLeft:'3px solid #f59e0b',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#92400e'}}>
                ✏️ Editando prendas del pedido. Los cambios se guardan al presionar <strong>Guardar cambios</strong>.
                {cmd.status==='empacado'&&<span style={{display:'block',marginTop:'4px',color:'var(--red)',fontWeight:700}}>⚠️ Esta comanda ya está en LISTO. El stock se recalculará al avanzar de nuevo.</span>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.14em',textTransform:'uppercase'}}>Prendas ({editItems.length})</div>
                <button onClick={()=>setEditCat(true)} style={{padding:'6px 12px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase'}}>
                  ⊞ Agregar del Catálogo
                </button>
              </div>
              {editItems.length===0 ? (
                <div style={{padding:'20px',textAlign:'center',background:'var(--bg2)',border:'1px dashed var(--border-strong)',color:'#888',fontSize:'12px'}}>Sin productos. Abre el catálogo para agregar.</div>
              ) : (
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
                  {[...editItems].reverse().map(item=>{
                    const precio=item.tipoVenta==='MAYOR'?(item.precioMayor||0):(item.precioDetal||0);
                    const dot=colorHex(item.color||'')||'#9ca3af';
                    return(
                      <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'6px',padding:'9px 12px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                            <span style={{fontSize:'12px',fontWeight:600}}>{item.modelo}</span>
                          </div>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>{item.sku} · €{precio.toFixed(2)} × {item.qty} = <strong>€{(precio*item.qty).toFixed(2)}</strong></div>
                        </div>
                        <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                          {['DETAL','MAYOR'].map(tv=><button key={tv} onClick={()=>editSetTV(item.sku,tv)} style={{padding:'4px 6px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,background:item.tipoVenta===tv?(tv==='DETAL'?'var(--blue)':' var(--warn)'):'var(--bg3)',color:item.tipoVenta===tv?'#fff':'#777'}}>{tv[0]}</button>)}
                        </div>
                        <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',flexShrink:0}}>
                          <button onClick={()=>editChangeQty(item.sku,-1)} style={{width:'24px',height:'24px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px'}}>−</button>
                          <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,width:'28px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'24px'}}>{item.qty}</span>
                          <button onClick={()=>editChangeQty(item.sku,1)} style={{width:'24px',height:'24px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px'}}>+</button>
                        </div>
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,minWidth:'52px',textAlign:'right',flexShrink:0}}>€{(precio*item.qty).toFixed(2)}</div>
                        <button onClick={()=>editRemove(item.sku)} style={{width:'22px',height:'22px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'11px',color:'#888'}}>✕</button>
                      </div>
                    );
                  })}
                  <div style={{padding:'8px 13px',background:'var(--bg3)',display:'flex',justifyContent:'flex-end',fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:'#f59e0b'}}>
                    Nuevo total: € {editTotal.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── VISTA NORMAL ──────────────────────────────────────── */
            <>
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

              {cmd.precio>0&&(
                <div>
                  <div style={{height:'6px',background:'var(--border)',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{width:`${pct}%`,height:'100%',background:pct>=100?'var(--green)':pct>50?'var(--warn)':'var(--red)',borderRadius:'3px',transition:'width .4s'}}/>
                  </div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'4px',textAlign:'right'}}>{pct.toFixed(0)}% pagado</div>
                </div>
              )}

              {/* ── Lista de prendas — con progreso de empacado si status=empacado ── */}
              {prods.length>0&&(
                <div style={{background:'var(--bg2)',border:'1px solid var(--border)'}}>
                  <div style={{padding:'10px 13px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#555'}}>
                      Prendas del pedido
                      {cmd.status==='empacado'&&(
                        <span style={{marginLeft:'8px',color: empacadoCompleto?'var(--green)':'#3b82f6',fontWeight:700}}>
                          · {totalEmpacado}/{totalPedido} uds
                        </span>
                      )}
                    </div>
                    {cmd.status!=='enviado'&&cmd.status!=='cancelado'&&(
                      <button onClick={abrirEdicion} style={{padding:'3px 10px',background:'none',border:'1px solid #f59e0b',color:'#f59e0b',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700}}>
                        ✏️ Editar
                      </button>
                    )}
                  </div>

                  {/* Barra de progreso empacado */}
                  {cmd.status==='empacado'&&totalPedido>0&&(
                    <div style={{padding:'0 13px'}}>
                      <div style={{height:'4px',background:'var(--border)',margin:'8px 0 0'}}>
                        <div style={{width:`${Math.round(totalEmpacado/totalPedido*100)}%`,height:'100%',background:empacadoCompleto?'var(--green)':'#3b82f6',transition:'width .3s'}}/>
                      </div>
                    </div>
                  )}

                  {/* Tabla de prendas */}
                  {cmd.status==='empacado' ? (
                    /* Vista detallada con scanner de empacado */
                    <div style={{padding:'10px 13px',display:'flex',flexDirection:'column',gap:'8px'}}>
                      {/* Scanner para escanear lo que ya se empacó */}
                      <ScannerInput
                        productos={prods.map(p=>({sku:p.sku||'',modelo:p.modelo||p.sku||'',color:p.color||'',disponible:999,...p}))}
                        skipStockCheck={true}
                        accentColor="#3b82f6"
                        onAdd={(prod) => scanEmpacado(prod)}
                      />
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',letterSpacing:'.08em',marginBottom:'2px'}}>
                        Escanea cada prenda al empacarla — o usa los botones +/−
                      </div>
                      {prods.map((p,i)=>{
                        const sku=(p.sku||'').toUpperCase();
                        const total=parseInt(p.cant||p.cantidad||1);
                        const empacadas=Math.min(empacadoMap[sku]||0, total);
                        const falta=total-empacadas;
                        const done=falta===0;
                        return(
                          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'10px',padding:'9px 10px',background:done?'var(--green-soft)':'var(--surface)',border:`1px solid ${done?'rgba(26,122,60,.25)':'var(--border)'}`,alignItems:'center',transition:'background .2s'}}>
                            <div>
                              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',background:done?'var(--green)':'#3b82f6',color:'#fff',padding:'1px 6px',fontWeight:700,minWidth:'24px',textAlign:'center'}}>
                                  {done?'✓':empacadas+'/'+total}
                                </span>
                                <span style={{fontSize:'12px',fontWeight:600}}>{p.modelo||p.sku||'—'}</span>
                                {p.tipoVenta&&<span style={{background:p.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:p.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',padding:'0 4px',fontFamily:'DM Mono,monospace',fontSize:'8px'}}>{p.tipoVenta[0]}</span>}
                              </div>
                              {p.sku&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginTop:'2px'}}>{p.sku}{p.color?' · '+p.color:''}</div>}
                              {!done&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'var(--red)',marginTop:'1px',fontWeight:700}}>Faltan {falta} ud{falta!==1?'s':''}</div>}
                            </div>
                            <div style={{display:'flex',alignItems:'center',border:'1px solid var(--border)',flexShrink:0}}>
                              <button onClick={()=>marcarEmpacado(sku,-1)} style={{width:'26px',height:'26px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'14px',color:'var(--red)'}}>−</button>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,width:'32px',textAlign:'center',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',lineHeight:'26px',color:done?'var(--green)':'var(--ink)'}}>{empacadas}</span>
                              <button onClick={()=>marcarEmpacado(sku,1)} disabled={done} style={{width:'26px',height:'26px',background:'var(--bg3)',border:'none',cursor:done?'default':'pointer',fontSize:'14px',color:done?'#aaa':'var(--green)',opacity:done?.4:1}}>+</button>
                            </div>
                          </div>
                        );
                      })}
                      {empacadoCompleto&&(
                        <div style={{padding:'9px 12px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.3)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700,textAlign:'center'}}>
                          ✅ Todo empacado — listo para enviar
                        </div>
                      )}
                      {!empacadoCompleto&&totalPedido>0&&(
                        <div style={{padding:'9px 12px',background:'#eff6ff',border:'1px solid #93c5fd44',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#3b82f6',fontWeight:700,textAlign:'center'}}>
                          📦 Faltan {totalPedido-totalEmpacado} uds por empacar
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Vista compacta para pendiente/enviado */
                    <div style={{padding:'10px 13px'}}>
                      <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                        {prods.map((p,i)=>(
                          <span key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'3px 9px',fontFamily:'DM Mono,monospace',fontSize:'9px',display:'flex',alignItems:'center',gap:'4px'}}>
                            <strong>{p.cant}×</strong> {p.modelo||p.sku||'—'}
                            {p.tipoVenta&&<span style={{background:p.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:p.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',padding:'0 3px',fontSize:'8px'}}>{p.tipoVenta[0]}</span>}
                            {p.precio>0&&<span style={{color:'var(--red)',fontSize:'9px'}}>€{p.precio}</span>}
                          </span>
                        ))}
                      </div>
                      {cmd.status==='pendiente'&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'7px'}}>⚠️ El stock se descuenta al marcar Empacado</div>}
                    </div>
                  )}
                </div>
              )}

              {/* ── Acciones ── */}
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'4px'}}>Acciones del pedido</div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {sigStatus&&(
                    <button onClick={()=>cambiarStatus(sigStatus)} disabled={saving}
                      style={{flex:2,padding:'11px 16px',background:S[sigStatus].border,color:'#fff',border:`2px solid ${S[sigStatus].border}`,cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',opacity:saving?.6:1}}>
                      {S[sigStatus].icon} Avanzar a {S[sigStatus].label}
                      {sigStatus==='enviado'&&<span style={{fontSize:'10px',fontWeight:400,opacity:.8}}>(descuenta stock)</span>}
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

              {saldo>0.01&&<WidgetPago comandaId={cmd.id} saldo={saldo} onPagoRegistrado={()=>onSave()}/>}
              {saldo<=0.01&&cmd.precio>0&&(
                <div style={{padding:'11px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--green)',textAlign:'center',fontWeight:700}}>
                  ✅ Comanda pagada completamente
                </div>
              )}

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
            </>
          )}

          <div>
            <label style={lbl}>Notas</label>
            <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Instrucciones, observaciones..." style={inp}/>
          </div>
        </div>

        <div className="modal-footer-bar" style={{borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px',background:'var(--bg2)',flexShrink:0}}>
          {/* Botón eliminar — solo admin */}
          {isAdmin && !editMode ? (
            <button onClick={eliminarComanda} disabled={deleting}
              style={{padding:'9px 13px',background:'none',border:'1px solid var(--red)',color:'var(--red)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,letterSpacing:'.08em',opacity:deleting?.5:1,whiteSpace:'nowrap'}}>
              {deleting?'⏳':'🗑'} ELIMINAR
            </button>
          ) : <div/>}

          {editMode ? (
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>setEditMode(false)} style={{padding:'11px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>✕ Cancelar edición</button>
              <button onClick={guardarEdicion} disabled={saving||!editItems.length}
                style={{padding:'11px 20px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',opacity:saving?.6:1}}>
                {saving?'⏳ Guardando...':'💾 Guardar cambios'}
              </button>
            </div>
          ) : (
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={onClose} style={{padding:'11px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>Cerrar</button>
              <button onClick={async()=>{const res=await fetch('/api/comandas',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cmd.id,notas})}).then(r=>r.json());if(res.ok)onSave();else setErr(res.error);}} style={{padding:'8px 15px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>Guardar notas</button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
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
  const { usuario } = useAuth()||{};
  const isAdmin = usuario?.rol === 'admin';

  const [comandas,    setComandas]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filtro,      setFiltro]      = useState('todos');
  const [buscar,      setBuscar]      = useState('');
  const [desde,       setDesde]       = useState('');
  const [hasta,       setHasta]       = useState('');
  const [modal,       setModal]       = useState(null);
  const [ticketModal, setTicketModal] = useState(null);
  const [filtroTela,  setFiltroTela]  = useState('');
  const [vistaCards,  setVistaCards]  = useState(false);

  const searchParams = useSearchParams();
  const verRef = useRef(null);

  useEffect(() => {
    const ver = searchParams?.get('ver');
    if (ver) verRef.current = ver;
  }, [searchParams]);

  useEffect(()=>{
    const ver = verRef.current || searchParams?.get('ver');
    if (ver && comandas.length > 0) {
      const cmd = comandas.find(c => c.id === ver);
      if (cmd) { setModal(cmd); verRef.current = null; }
    }
  },[searchParams, comandas]);

  async function cargar(){
    setLoading(true);
    const res=await fetchApi('/api/comandas').then(r=>r.json()).catch((e)=>{ console.warn('[Comandas] Error cargando:', e.message); return {ok:false}; });
    if(res.ok) setComandas(res.comandas||[]);
    setLoading(false);
  }

  useEffect(()=>{
    cargar();
    let channel = null;
    async function conectarRealtime() {
      try {
        const { supabasePublic } = await import('@/lib/supabase-client');
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
    return ()=>{ if(channel) import('@/lib/supabase-client').then(({supabasePublic})=>supabasePublic?.removeChannel(channel)).catch((e)=>console.warn('[Realtime comandas] cleanup:', e.message)); };
  },[]);

  const conteos = useMemo(()=>Object.fromEntries(Object.keys(S).map(s=>[s,comandas.filter(c=>c.status===s).length])),[comandas]);

  // ── Telas disponibles para el filtro ─────────────────────────────────────
  const telasDisponibles = useMemo(() => {
    const set = new Set();
    comandas.forEach(cmd => {
      let prods = cmd.productos;
      if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }
      (prods || []).forEach(p => {
        const prod = productos.find(x => x.sku === p.sku);
        if (prod?.tela) set.add(prod.tela);
      });
    });
    return [...set].sort();
  }, [comandas, productos]);

  // ── filtradas: status + búsqueda + fechas + tela ──────────────────────────
  const filtradas = useMemo(()=>{
    let r = filtro==='todos' ? comandas : comandas.filter(c=>c.status===filtro);
    if(buscar){
      const q=buscar.toLowerCase();
      r=r.filter(c=>{
        let prods=c.productos;
        if(typeof prods==='string') try{prods=JSON.parse(prods);}catch{prods=[];}
        const textoProds=Array.isArray(prods)?prods.map(p=>`${p.modelo||''} ${p.sku||''}`).join(' '):'';
        return `${c.cliente} ${c.id} ${c.notas||''} ${textoProds}`.toLowerCase().includes(q);
      });
    }
    if(desde) r=r.filter(c=>(c.fecha_creacion||c.created_at||'')>=desde);
    if(hasta) r=r.filter(c=>(c.fecha_creacion||c.created_at||'')<=hasta+'T99');
    if(filtroTela){
      r=r.filter(cmd=>{
        let prods=cmd.productos;
        if(typeof prods==='string') try{prods=JSON.parse(prods);}catch{prods=[];}
        return (prods||[]).some(p=>{
          const prod=productos.find(x=>x.sku===p.sku);
          return prod?.tela===filtroTela;
        });
      });
    }
    return r;
  },[comandas,filtro,buscar,desde,hasta,filtroTela,productos]);

  function onSave(){setModal(null);recargar();cargar();}
  function onDelete(){recargar();cargar();}
  function parseProd(cmd){let p=cmd.productos;if(typeof p==='string')try{p=JSON.parse(p);}catch{p=[];}return Array.isArray(p)?p:[];}

  // ── Progreso de empacado (leído de localStorage por comanda) ──────
  const [empProgMap, setEmpProgMap] = useState({});
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const map = {};
    comandas.forEach(cmd => {
      if (cmd.status !== 'empacado') return;
      try {
        const saved = localStorage.getItem('emp_' + cmd.id);
        if (!saved) return;
        const empMap = JSON.parse(saved);
        const prods = parseProd(cmd);
        const total = prods.reduce((a, p) => a + parseInt(p.cant||p.cantidad||1), 0);
        const empacado = prods.reduce((a, p) => {
          const sku = (p.sku||'').toUpperCase();
          return a + Math.min(empMap[sku]||0, parseInt(p.cant||p.cantidad||1));
        }, 0);
        if (total > 0) map[cmd.id] = { total, empacado, completo: empacado >= total };
      } catch {}
    });
    setEmpProgMap(map);
  }, [comandas]);

  return (
    <Shell title="Comandas">
      {modal==='nueva'&&<ModalNueva clientes={clientes} productos={productos} onClose={()=>setModal(null)} onSave={onSave}/>}
      {modal&&typeof modal==='object'&&<ModalGestion cmd={modal} productos={productos} isAdmin={isAdmin} onClose={()=>setModal(null)} onSave={onSave} onDelete={onDelete}/>}
      {ticketModal&&(
        <ModalTicketEnvio
          comandas={ticketModal.cmd||ticketModal.cmds}
          clientes={clientes}
          onClose={()=>setTicketModal(null)}
        />
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Comandas</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'2px'}}>Stock se descuenta al empacar · Pagos con BS/USD/EUR/USDT</div>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {/* Toggle vista */}
          <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden'}}>
            <button onClick={()=>setVistaCards(false)}
              title="Vista lista"
              style={{padding:'7px 11px',background:!vistaCards?'var(--ink)':'var(--bg2)',color:!vistaCards?'#fff':'#666',border:'none',cursor:'pointer',fontSize:'13px',transition:'all .15s'}}>
              ☰
            </button>
            <button onClick={()=>setVistaCards(true)}
              title="Vista tarjetas"
              style={{padding:'7px 11px',background:vistaCards?'var(--ink)':'var(--bg2)',color:vistaCards?'#fff':'#666',border:'none',cursor:'pointer',fontSize:'13px',transition:'all .15s'}}>
              ⊞
            </button>
          </div>
          {filtradas.length>0&&(
            <button onClick={()=>setTicketModal({cmds:filtradas})}
              style={{padding:'9px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.04em',color:'#444'}}>
              🖨️ Guías ({filtradas.length})
            </button>
          )}
          <button onClick={()=>setModal('nueva')} style={{padding:'9px 18px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase'}}>
            📋 Nueva Comanda
          </button>
        </div>
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
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar cliente, ID, modelo..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',width:'100%'}}/>
        </div>
        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
          {[['todos','Todas'],['pendiente','Pendiente'],['empacado','Empacado'],['enviado','Enviado']].map(([s,l])=>(
            <button key={s} onClick={()=>setFiltro(s)} style={{padding:'5px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:filtro===s?700:500,background:filtro===s?'var(--ink)':'#eee',color:filtro===s?'#fff':'#333'}}>
              {l} ({s==='todos'?comandas.length:conteos[s]||0})
            </button>
          ))}
        </div>
        <input type="date" value={desde} onChange={e=>setDesde(e.target.value)}
          style={{padding:'6px 9px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',outline:'none'}}
          title="Desde"/>
        <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}
          style={{padding:'6px 9px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',outline:'none'}}
          title="Hasta"/>
        {(desde||hasta)&&<button onClick={()=>{setDesde('');setHasta('');}}
          style={{padding:'6px 9px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>✕</button>}
        <button onClick={cargar} style={{padding:'6px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555'}}>↺</button>
      </div>

      {/* Filtro por tipo de tela */}
      {telasDisponibles.length>0&&(
        <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#888',marginRight:'2px'}}>🧵 Tela:</span>
          <button onClick={()=>setFiltroTela('')}
            style={{padding:'4px 11px',borderRadius:'20px',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:!filtroTela?700:500,background:!filtroTela?'var(--ink)':'#eee',color:!filtroTela?'#fff':'#333',transition:'all .12s'}}>
            Todas
          </button>
          {telasDisponibles.map(t=>(
            <button key={t} onClick={()=>setFiltroTela(filtroTela===t?'':t)}
              style={{padding:'4px 11px',borderRadius:'20px',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:filtroTela===t?700:500,background:filtroTela===t?'#2d9e4a':'#eee',color:filtroTela===t?'#fff':'#333',transition:'all .12s'}}>
              {t}
            </button>
          ))}
        </div>
      )}

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

      {/* ── VISTA LISTA ─────────────────────────────────────────── */}
      {!loading&&!vistaCards&&filtradas.map(cmd=>{
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
            {/* ── Barra de empacado (solo status=empacado) ── */}
            {cmd.status==='empacado'&&empProgMap[cmd.id]&&(
              <div style={{marginTop:'8px',padding:'8px 10px',background:'#eff6ff',border:'1px solid #bfdbfe44',display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#3b82f6',letterSpacing:'.08em',textTransform:'uppercase'}}>📦 Empacado</span>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,color:empProgMap[cmd.id].completo?'var(--green)':'#3b82f6'}}>
                      {empProgMap[cmd.id].empacado}/{empProgMap[cmd.id].total} uds
                      {empProgMap[cmd.id].completo?' ✓':''}
                    </span>
                  </div>
                  <div style={{height:'4px',background:'#dbeafe',borderRadius:'2px',overflow:'hidden'}}>
                    <div style={{width:`${Math.round(empProgMap[cmd.id].empacado/empProgMap[cmd.id].total*100)}%`,height:'100%',background:empProgMap[cmd.id].completo?'var(--green)':'#3b82f6',transition:'width .3s',borderRadius:'2px'}}/>
                  </div>
                </div>
              </div>
            )}
            {(cmd.status==='empacado'||cmd.status==='enviado')&&(
              <div style={{marginTop:'8px',display:'flex',justifyContent:'flex-end'}}>
                <button onClick={e=>{e.stopPropagation();setTicketModal({cmd});}}
                  style={{padding:'4px 11px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'10px',fontWeight:600,color:'#555'}}>
                  🖨️ Guía de envío
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* ── VISTA TARJETAS (Kanban) ──────────────────────────────── */}
      {!loading&&vistaCards&&filtradas.length>0&&(()=>{
        // Agrupar por status en el orden del flujo
        const cols = ['pendiente','empacado','enviado','cancelado'];
        const grupos = {};
        cols.forEach(s=>{ grupos[s]=[]; });
        filtradas.forEach(cmd=>{ (grupos[cmd.status]||grupos['pendiente']).push(cmd); });
        const colsVisibles = filtro==='todos' ? cols.filter(s=>grupos[s].length>0) : [filtro].filter(s=>grupos[s]);
        if(colsVisibles.length===0) return null;
        return(
          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(colsVisibles.length,4)},1fr)`,gap:'12px',alignItems:'start'}}>
            {colsVisibles.map(status=>{
              const cfg=S[status]||S.pendiente;
              const cmds=grupos[status]||[];
              return(
                <div key={status}>
                  {/* Cabecera columna */}
                  <div style={{padding:'8px 12px',background:cfg.bg,border:`1px solid ${cfg.border}44`,borderTop:`3px solid ${cfg.border}`,marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,color:cfg.color,letterSpacing:'.1em',textTransform:'uppercase'}}>{cfg.icon} {cfg.label}</span>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,color:cfg.color,background:'rgba(255,255,255,.6)',borderRadius:'12px',padding:'1px 8px'}}>{cmds.length}</span>
                  </div>
                  {/* Cards */}
                  {cmds.map(cmd=>{
                    const saldo=Math.max(0,(cmd.precio||0)-(cmd.monto_pagado||0));
                    const pct=cmd.precio>0?Math.min(100,((cmd.monto_pagado||0)/cmd.precio)*100):0;
                    const prods=parseProd(cmd);
                    const hoy=new Date().toISOString().slice(0,10);
                    const vencida=cmd.fecha_entrega&&cmd.fecha_entrega<hoy&&status!=='enviado'&&status!=='cancelado';
                    return(
                      <div key={cmd.id} onClick={()=>setModal(cmd)}
                        style={{background:'var(--surface)',border:`1px solid ${vencida?'var(--red)':'var(--border)'}`,borderTop:`2px solid ${cfg.border}`,padding:'11px 12px',marginBottom:'7px',cursor:'pointer',transition:'all .13s',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='var(--bg2)';e.currentTarget.style.boxShadow='0 3px 12px rgba(0,0,0,.1)';e.currentTarget.style.transform='translateY(-1px)';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='var(--surface)';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.06)';e.currentTarget.style.transform='translateY(0)';}}>
                        {/* Cliente + fecha */}
                        <div style={{marginBottom:'7px'}}>
                          <div style={{fontFamily:'Playfair Display,serif',fontSize:'13px',fontWeight:700,lineHeight:1.2,marginBottom:'3px'}}>{cmd.cliente}</div>
                          <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
                            <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>{cmd.id}</span>
                            {cmd.fecha_entrega&&(
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:vencida?'var(--red)':'#777',fontWeight:vencida?700:400}}>
                                {vencida?'⚠️':'📅'} {cmd.fecha_entrega}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Prendas */}
                        {prods.length>0&&(
                          <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'8px'}}>
                            {prods.slice(0,3).map((p,i)=>(
                              <span key={i} style={{background:'var(--bg3)',padding:'2px 6px',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555'}}>
                                {p.cant}× {(p.modelo||p.sku||'—').split('—')[0].trim().slice(0,12)}
                              </span>
                            ))}
                            {prods.length>3&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>+{prods.length-3}</span>}
                          </div>
                        )}
                        {/* Precio + saldo */}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                          <span style={{fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700,color:'var(--ink)'}}>€ {fmtNum(cmd.precio)}</span>
                          {saldo>0.01
                            ?<span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--red)',fontWeight:700,background:'var(--red-soft)',padding:'2px 6px'}}>⏳ -€{fmtNum(saldo)}</span>
                            :<span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)',fontWeight:700}}>✓ Pagada</span>
                          }
                        </div>
                        {/* Barra de pago */}
                        {cmd.precio>0&&(
                          <div style={{height:'3px',background:'var(--border)',borderRadius:'2px',overflow:'hidden',marginBottom:'6px'}}>
                            <div style={{width:`${pct}%`,height:'100%',background:pct>=100?'var(--green)':pct>50?'var(--warn)':'var(--red)',borderRadius:'2px',transition:'width .4s'}}/>
                          </div>
                        )}
                        {/* Barra de empacado en kanban */}
                        {status==='empacado'&&empProgMap[cmd.id]&&(
                          <div style={{padding:'5px 7px',background:'#eff6ff',border:'1px solid #bfdbfe55',marginBottom:'5px'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:'#3b82f6',letterSpacing:'.06em'}}>📦 EMPACADO</span>
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',fontWeight:700,color:empProgMap[cmd.id].completo?'var(--green)':'#3b82f6'}}>
                                {empProgMap[cmd.id].empacado}/{empProgMap[cmd.id].total}{empProgMap[cmd.id].completo?' ✓':''}
                              </span>
                            </div>
                            <div style={{height:'3px',background:'#dbeafe',borderRadius:'2px',overflow:'hidden'}}>
                              <div style={{width:`${Math.round(empProgMap[cmd.id].empacado/empProgMap[cmd.id].total*100)}%`,height:'100%',background:empProgMap[cmd.id].completo?'var(--green)':'#3b82f6',borderRadius:'2px'}}/>
                            </div>
                          </div>
                        )}
                        {/* Ticket button */}
                        {(status==='empacado'||status==='enviado')&&(
                          <button onClick={e=>{e.stopPropagation();setTicketModal({cmd});}}
                            style={{width:'100%',padding:'4px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'10px',fontWeight:600,color:'#666',marginTop:'2px'}}>
                            🖨️ Guía
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {cmds.length===0&&(
                    <div style={{padding:'20px',textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#ccc',border:'1px dashed var(--border)',borderRadius:'2px'}}>
                      Sin pedidos
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

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
        @media (max-width: 900px) {
          .kanban-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 560px) {
          .kanban-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Shell>
  );
}