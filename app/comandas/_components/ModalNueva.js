'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import ScannerInput from '@/components/ScannerInput';
import ModalPromo from '@/components/ModalPromo';
import { colorHex } from '@/utils/colores';
import { fmtNum } from '@/utils/formatters';
import { calcularPreciosCarrito } from '@/lib/precioMayorista';

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

function precioItem(it){ if(it.promoTag) return it.precioPromo||it.precio||0; return it.tipoVenta==='MAYOR'?(it.precioMayor||0):(it.precioDetal||0); }

export default
function ModalNueva({ clientes, productos, onClose, onSave, initialDraft = null, onDraftSaved }) {
  /* ── Wizard ─────────────────────────────────────── */
  const [paso,     setPaso]    = useState(initialDraft?.paso || 1);

  /* ── Paso 1: Cliente ─────────────────────────────── */
  const [cliQuery, setCliQ]    = useState(initialDraft?.cliQuery || '');
  const [cliRes,   setCliRes]  = useState([]);
  const [cliOpen,  setCliOpen] = useState(false);
  const [cliId,    setCliId]   = useState(initialDraft?.cliId || '');
  const [nuevoMode,setNuevo]   = useState(false);
  const [nuevoDoc, setNDoc]    = useState('');
  const [nuevoTel, setNTel]    = useState('');

  /* ── Paso 2: Prendas ─────────────────────────────── */
  const [items,    setItems]   = useState(initialDraft?.items || []);
  const [catalogo, setCatalogo]= useState(false);
  const [promoModal, setPromoModal] = useState(false);

  /* ── Borrador (En espera) — sistema multi-draft ─────── */
  const DRAFTS_KEY = 'moditex_comandas_espera';
  const draftId = useRef(initialDraft?.id || null); // null = nueva sin ID aún

  // No mostramos banner de "hay borrador" — la lista está en la página
  const [draftAlert, setDraftAlert] = useState(false); // disabled

  function cargarBorrador() {}   // no-op (kept for compat)
  function descartarBorrador() {} // no-op

  function guardarEnEspera() {
    try {
      const existing = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
      const id = draftId.current || `draft_${Date.now()}`;
      draftId.current = id;
      const draft = {
        id,
        cliQuery, cliId, items, fechaEnt, notas, paso,
        guardadoEn: new Date().toLocaleString('es-VE'),
        timestamp: Date.now(),
      };
      // Update if exists, otherwise add
      const idx = existing.findIndex(d => d.id === id);
      if (idx >= 0) existing[idx] = draft;
      else existing.unshift(draft);
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(existing));
      if (onDraftSaved) onDraftSaved();
    } catch {}
    onClose();
  }

  /* ── Paso 3: Entrega & Pago ──────────────────────── */
  const [fechaEnt, setFechaEnt]= useState(initialDraft?.fechaEnt || '');
  const [notas,    setNotas]   = useState(initialDraft?.notas || '');
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
      if(ex) return prev.map(x=>x.sku===p.sku?{...x,qty:x.qty+qty,tipo_precio:tv}:x);
      return[...prev,{...p,qty,tipo_precio:tv}];
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
      return [...prev, {...prod, qty: 1, tipo_precio: 'AUTO'}];
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
  function setItemTV(sku,tv){setItems(prev=>prev.map(x=>x.sku===sku?{...x,tipo_precio:tv}:x));}

  // Integrar el motor de precios
  const itemsEnriquecidos = calcularPreciosCarrito(items.map(it => ({
    ...it,
    precio_detal: it.precioDetal,
    precio_mayor: it.precioMayor,
    min_mayorista: it.minMayorista,
    modelos_min_mayorista: it.modelosMinMayorista,
    tipo_precio: it.tipo_precio || 'AUTO'
  })));

  const totalCalc = itemsEnriquecidos.reduce((a,it)=>a+(it.subtotal||0),0);

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
          productos:itemsEnriquecidos.map(it=>({
            sku:it.sku,
            modelo:`${it.modelo} — ${it.color}${it.talla&&it.talla!=='UNICA'?' '+it.talla:''}`,
            cant:it.qty,
            precio:it.precio_aplicado,
            tipoVenta:it.tipo_precio_resultado,
            desde_produccion: (it.disponible || 0) <= 0
          })),
          precio:totalCalc, monto_pagado:montoAbonoEUR,
          tiene_items_produccion: itemsEnriquecidos.some(it => (it.disponible || 0) <= 0),
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
      // Si venía de un borrador, eliminarlo
      if (draftId.current) {
        try {
          const existing = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
          localStorage.setItem(DRAFTS_KEY, JSON.stringify(existing.filter(d => d.id !== draftId.current)));
          if (onDraftSaved) onDraftSaved();
        } catch {}
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
    {catalogo&&<CatalogoExplorer productos={productos} modo="entrada" tipoVenta="AUTO" onAdd={addFromCatalog} onClose={()=>setCatalogo(false)}/>}
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
      <div className="modal-fullscreen" style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'620px',borderTop:'3px solid #f59e0b',maxHeight:'calc(100dvh - 10px)',display:'flex',flexDirection:'column'}}>

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
              <div style={{display:'flex',gap:'12px'}}>
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
            <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
              {cliQuery.trim() && (
                <button onClick={guardarEnEspera}
                  title="Pausa y retoma después"
                  style={{padding:'11px 14px',background:'none',border:'1px solid rgba(245,158,11,.5)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,color:'#f59e0b',whiteSpace:'nowrap'}}>
                  ⏸ En espera
                </button>
              )}
              <button onClick={()=>{ if(validarPaso1()) avanzar(); }}
                style={{padding:'11px 24px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>
                Siguiente →
              </button>
            </div>
          </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            PASO 2 — PRENDAS
        ══════════════════════════════════════════════════════ */}
        {paso === 2 && (
          <>
          {/* Chip cliente confirmado */}
          <div style={{padding:'8px 18px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)',fontWeight:700,letterSpacing:'.12em'}}>CLIENTE:</span>
            <span style={{fontSize:'13px',fontWeight:600}}>{cliQuery}</span>
            <button onClick={()=>{setErr('');setPaso(1);}} style={{marginLeft:'auto',padding:'2px 8px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>✏️ cambiar</button>
          </div>

          {/* ── Layout flex: scanner fijo arriba, items scrollable abajo ── */}
          <div style={{flex:1,minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>

            {/* Scanner — siempre visible, no se va con el scroll */}
            <div style={{flexShrink:0,padding:'10px 18px 6px'}}>
              <ScannerInput
                productos={productos}
                skipStockCheck={true}
                onAdd={(prod, qty=1)=>{
                  setItems(prev=>{
                    const ex=prev.find(x=>x.sku===prod.sku);
                    if(ex) return prev.map(x=>x.sku===prod.sku?{...x,qty:x.qty+qty}:x);
                    return [...prev,{...prod,qty,tipo_precio:'AUTO'}];
                  });
                }}
                extraActions={[
                  { label:'⊞ Catálogo', onClick:()=>setCatalogo(true), bg:'#f59e0b', color:'#000' },
                  { label:'🎁 Promo', onClick:()=>setPromoModal(true), bg:'#7c3aed', color:'#fff' },
                ]}
              />
            </div>

            {/* Lista de items — ocupa todo el espacio restante y scrollea dentro */}
            <div style={{flex:1,minHeight:0,overflowY:'auto',padding:'6px 18px 10px'}}>
              {items.length===0 ? (
                <div style={{padding:'32px',textAlign:'center',background:'var(--bg2)',border:'1px dashed var(--border-strong)',color:'#888',fontSize:'12px'}}>
                  Escanea un código o abre el Catálogo para agregar prendas
                </div>
              ) : (
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
                  {/* Header contador */}
                  <div style={{padding:'7px 13px',background:'var(--bg3)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',textTransform:'uppercase',letterSpacing:'.12em'}}>
                      {items.length} prenda{items.length!==1?'s':''} · {items.reduce((a,it)=>a+it.qty,0)} uds
                    </span>
                    <button onClick={()=>setItems([])} style={{padding:'2px 8px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#bbb'}}>
                      ✕ limpiar
                    </button>
                  </div>

                  {[...itemsEnriquecidos].reverse().map(item=>{
                    const precio=item.precio_aplicado; const dot=colorHex(item.color);
                    const dispItem = item.disponible ?? null;
                    const sobreStock = dispItem !== null && item.qty > dispItem;
                    const desdeProduccion = dispItem !== null && dispItem <= 0;
                    return (
                      <div key={item.sku} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'12px',padding:'11px 14px',borderBottom:'1px solid var(--border)',alignItems:'center',
                        background: desdeProduccion ? 'rgba(59,130,246,.04)' : sobreStock ? 'rgba(245,158,11,.04)' : ''}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                            <span style={{width:'9px',height:'9px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                            <span style={{fontSize:'13px',fontWeight:600}}>{item.modelo} — {item.color}</span>
                            {desdeProduccion ? (
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',background:'rgba(59,130,246,.1)',color:'#3b82f6',border:'1px solid rgba(59,130,246,.3)',padding:'1px 7px',fontWeight:700,letterSpacing:'.06em',flexShrink:0}}>
                                🏭 DESDE PRODUCCIÓN
                              </span>
                            ) : sobreStock ? (
                              <span style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',background:'rgba(245,158,11,.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,.3)',padding:'1px 7px',fontWeight:700,letterSpacing:'.06em',flexShrink:0}}>
                                ⚠ PIDE {item.qty} · HAY {dispItem}
                              </span>
                            ) : null}
                          </div>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'3px'}}>
                            {item.sku} · <strong style={{color:item.tipo_precio_resultado==='MAYOR'?'var(--warn)':'var(--blue)'}}>€{precio.toFixed(2)} × {item.qty} = €{(precio*item.qty).toFixed(2)}</strong>
                            <span style={{marginLeft:'6px',color:'#aaa'}}>(Regla: ≥{item.min_mayorista} pzs total / ≥{item.modelos_min_mayorista} modelo)</span>
                          </div>
                        </div>
                        <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0}}>
                          {['AUTO','DETAL_FORZADO','MAYOR_FORZADO'].map(tv=>{
                            const lbl = tv==='AUTO'?'AUTO':tv==='DETAL_FORZADO'?'D':'M';
                            const act = item.tipo_precio === tv;
                            return (
                              <button key={tv} onClick={()=>setItemTV(item.sku,tv)}
                                style={{padding:'5px 8px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,background:act?(tv==='MAYOR_FORZADO'?'var(--warn)':tv==='DETAL_FORZADO'?'var(--blue)':'#333'):'var(--bg3)',color:act?'#fff':'#777'}}
                                title={tv}>
                                {lbl}
                              </button>
                            );
                          })}
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

                  {/* Total fijo al pie de la lista */}
                  <div style={{padding:'9px 14px',background:'var(--bg3)',borderTop:'2px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',textTransform:'uppercase',letterSpacing:'.1em'}}>
                      Total · {items.reduce((a,it)=>a+it.qty,0)} uds
                    </span>
                    <span style={{fontFamily:'Playfair Display,serif',fontSize:'17px',fontWeight:700,color:'var(--red)'}}>€ {totalCalc.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer-bar" style={{borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg2)',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <button onClick={retroceder} style={{padding:'11px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>← Volver</button>
              {items.length>0&&<span style={{fontFamily:'Playfair Display,serif',fontSize:'18px',fontWeight:700,color:'#f59e0b'}}>€ {totalCalc.toFixed(2)}</span>}
            </div>
            <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
              {(cliQuery.trim()||items.length>0) && (
                <button onClick={guardarEnEspera}
                  title="Pausa esta comanda para atender otra y la retomas después"
                  style={{padding:'11px 14px',background:'none',border:'1px solid rgba(245,158,11,.5)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,color:'#f59e0b',display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap'}}>
                  ⏸ En espera
                </button>
              )}
              <button onClick={()=>{ if(validarPaso2()) avanzar(); }}
                style={{padding:'11px 24px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>
                Siguiente →
              </button>
            </div>
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
              <div style={{padding:'10px 14px',background:'#fffbeb',borderBottom:'1px solid #f59e0b33',display:'flex',alignItems:'center',gap:'12px'}}>
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
