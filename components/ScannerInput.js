'use client';
/**
 * ScannerInput v2 — MODITEX POS
 * Diseño limpio: barra oscura sin iconos excesivos.
 * Props:
 *   productos       — array de productos
 *   onAdd(prod,qty) — callback
 *   disabled
 *   skipStockCheck
 *   accentColor     — color del feedback ok (default: #f59e0b)
 *   extraActions    — [{ label, onClick, bg, color }] botones debajo del scanner
 */
import { useRef, useState, useEffect, useCallback } from 'react';

export default function ScannerInput({
  productos = [],
  onAdd,
  disabled = false,
  skipStockCheck = false,
  accentColor = '#f59e0b',
  extraActions = [],
}) {
  const inputRef     = useRef(null);
  const autoTimer    = useRef(null);
  const lastCharMs   = useRef(0);
  const streamRef    = useRef(null);
  const videoRef     = useRef(null);
  const nativeDetRef = useRef(null);
  const zxingRef     = useRef(null);
  const animRef      = useRef(null);
  const scannedRef   = useRef(false);
  const multInputRef = useRef(null);
  const audioCtxRef  = useRef(null);

  const [val,      setVal]      = useState('');
  const [msg,      setMsg]      = useState(null);
  const [camOpen,  setCamOpen]  = useState(false);
  const [camErr,   setCamErr]   = useState('');
  const [camLoad,  setCamLoad]  = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [multMode, setMultMode] = useState(false);
  const [multPend, setMultPend] = useState(null);
  const [multQty,  setMultQty]  = useState('');

  const multModeRef = useRef(false);
  const multPendRef = useRef(null);
  useEffect(() => { multModeRef.current = multMode; }, [multMode]);
  useEffect(() => { multPendRef.current = multPend; }, [multPend]);

  function getCtx() {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {});
    return audioCtxRef.current;
  }
  function playSound(type) {
    const ctx = getCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    if (type === 'ok') {
      [[523.25,0],[659.25,.12]].forEach(([f,d])=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);o.type='sine';
        o.frequency.setValueAtTime(f,now+d);
        g.gain.setValueAtTime(0,now+d);g.gain.linearRampToValueAtTime(.22,now+d+.02);
        g.gain.exponentialRampToValueAtTime(.001,now+d+.2);
        o.start(now+d);o.stop(now+d+.2);
      });
    } else if (type==='error') {
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);o.type='sawtooth';
      o.frequency.setValueAtTime(220,now);o.frequency.exponentialRampToValueAtTime(150,now+.3);
      g.gain.setValueAtTime(.13,now);g.gain.exponentialRampToValueAtTime(.001,now+.3);
      o.start(now);o.stop(now+.3);
    } else if (type==='mult') {
      [[523,0],[587,.1],[659,.2]].forEach(([f,d])=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);o.type='sine';
        o.frequency.setValueAtTime(f,now+d);
        g.gain.setValueAtTime(.16,now+d);g.gain.exponentialRampToValueAtTime(.001,now+d+.1);
        o.start(now+d);o.stop(now+d+.1);
      });
    }
  }

  const procesar = useCallback((raw, forzarQty = null) => {
    const sku = (raw||'').trim().toUpperCase();
    if (!sku) return;
    setVal('');
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    const prod = productos.find(p => p.sku?.toUpperCase() === sku);
    if (!prod) {
      playSound('error');
      setMsg({ t:'err', m:`SKU no encontrado: ${sku}` });
      setTimeout(()=>setMsg(null), 3000);
      setTimeout(()=>inputRef.current?.focus(), 50);
      return;
    }
    if (!skipStockCheck && (prod.disponible ?? prod.stock ?? 0) <= 0) {
      playSound('error');
      setMsg({ t:'warn', m:`Sin stock: ${prod.modelo} — ${prod.color}` });
      setTimeout(()=>setMsg(null), 3000);
      setTimeout(()=>inputRef.current?.focus(), 50);
      return;
    }
    if (multModeRef.current && !forzarQty) {
      playSound('mult');
      setMultPend({ sku: prod.sku, prod });
      setMultQty('');
      setTimeout(()=>multInputRef.current?.focus(), 80);
      return;
    }
    const qty = forzarQty || 1;
    playSound('ok');
    onAdd?.(prod, qty);
    setLastScan({ modelo: prod.modelo, color: prod.color, qty });
    setMsg({ t:'ok', m:`${prod.modelo} — ${prod.color}${qty>1?` ×${qty}`:''}` });
    setTimeout(()=>setMsg(null), 2500);
    setTimeout(()=>inputRef.current?.focus(), 30);
  }, [productos, onAdd, skipStockCheck]);

  function confirmarMult() {
    const qty = parseInt(multQty)||1;
    const pend = multPendRef.current;
    setMultPend(null); setMultQty('');
    if (pend) procesar(pend.sku, qty);
  }
  function cancelarMult() {
    setMultPend(null); setMultQty('');
    setTimeout(()=>inputRef.current?.focus(), 50);
  }

  function handleChange(e) {
    const v = e.target.value; setVal(v);
    const now = Date.now(), gap = now - lastCharMs.current;
    lastCharMs.current = now;
    if (gap < 50 && v.trim()) {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(()=>{
        const cur = inputRef.current?.value || v;
        if (cur.trim()) procesar(cur);
      }, 100);
    }
  }

  const cerrarCam = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (zxingRef.current) { try { zxingRef.current.reset(); } catch(_){} zxingRef.current=null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    if (videoRef.current) videoRef.current.srcObject=null;
    scannedRef.current=false; setCamOpen(false); setCamLoad(false);
  }, []);

  useEffect(()=>()=>{ cerrarCam(); if(autoTimer.current) clearTimeout(autoTimer.current); }, []);

  const procesarCam = useCallback((sku)=>{ cerrarCam(); procesar(sku); }, [cerrarCam, procesar]);
  const scanNative = useCallback(()=>{
    if (!videoRef.current || !nativeDetRef.current) return;
    nativeDetRef.current.detect(videoRef.current)
      .then(codes=>{
        if (codes.length>0 && !scannedRef.current) { scannedRef.current=true; procesarCam(codes[0].rawValue); }
        else animRef.current=requestAnimationFrame(scanNative);
      }).catch(()=>{ animRef.current=requestAnimationFrame(scanNative); });
  }, [procesarCam]);

  async function abrirCam() {
    setCamErr(''); setCamLoad(true);
    const hasNative = typeof window!=='undefined' && 'BarcodeDetector' in window;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }
      });
      streamRef.current=stream; setCamOpen(true); setCamLoad(false);
      await new Promise(r=>setTimeout(r,150));
      if (!videoRef.current) { cerrarCam(); return; }
      videoRef.current.srcObject=stream;
      await videoRef.current.play();
      if (hasNative) {
        nativeDetRef.current=new window.BarcodeDetector({formats:['code_128','ean_13','ean_8','qr_code','upc_a','upc_e','code_39','itf']});
        scanNative();
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader=new BrowserMultiFormatReader(); zxingRef.current=reader;
        reader.decodeFromVideoElement(videoRef.current,(result)=>{
          if (result && !scannedRef.current) { scannedRef.current=true; procesarCam(result.getText()); }
        });
      }
    } catch(e) {
      cerrarCam();
      setCamErr(e.name==='NotAllowedError'?'Permiso de cámara denegado':'Error al abrir cámara: '+e.message);
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {/* Modal cámara */}
      {camOpen&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.93)',zIndex:9998,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'20px'}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666',letterSpacing:'.16em',textTransform:'uppercase'}}>Apunta al código</div>
          <div style={{position:'relative',width:'min(90vw,400px)',aspectRatio:'4/3',background:'#000',overflow:'hidden',borderRadius:'8px',outline:`2px solid ${accentColor}`}}>
            <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline autoPlay/>
            <div style={{position:'absolute',inset:'14%',border:`1.5px solid ${accentColor}70`,borderRadius:'4px',pointerEvents:'none'}}/>
            <div style={{position:'absolute',left:'14%',right:'14%',height:'1px',background:accentColor,animation:'si2_scan 2s ease-in-out infinite',pointerEvents:'none'}}/>
          </div>
          {multMode&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:accentColor,background:`${accentColor}18`,padding:'6px 16px',border:`1px solid ${accentColor}40`}}>MULTIPLICADOR ACTIVO</div>}
          <button onClick={cerrarCam} style={{padding:'9px 28px',background:'none',border:'1px solid rgba(255,255,255,.25)',color:'#fff',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600,borderRadius:'4px'}}>Cancelar</button>
          <style>{`@keyframes si2_scan{0%,100%{top:16%;opacity:.2}50%{top:80%;opacity:.9}}`}</style>
        </div>
      )}

      {/* Modal multiplicador */}
      {multPend&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'var(--bg)',border:`2px solid ${accentColor}`,padding:'28px 24px',width:'min(340px,92vw)',textAlign:'center'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:'6px'}}>Multiplicador</div>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'15px',fontWeight:700,marginBottom:'2px'}}>{multPend.prod.modelo}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888',marginBottom:'20px'}}>{multPend.prod.color} · {multPend.sku}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#aaa',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'8px'}}>¿Cuántas unidades?</div>
            <input ref={multInputRef} type="number" min="1" max="9999" value={multQty}
              onChange={e=>setMultQty(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')confirmarMult();if(e.key==='Escape')cancelarMult();}}
              placeholder="ej: 10"
              style={{width:'100%',padding:'14px',fontSize:'28px',textAlign:'center',fontFamily:'DM Mono,monospace',fontWeight:700,border:'2px solid var(--border)',background:'var(--bg2)',outline:'none',boxSizing:'border-box',marginBottom:'16px'}}/>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={cancelarMult} style={{flex:1,padding:'11px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px'}}>Cancelar</button>
              <button onClick={confirmarMult} style={{flex:2,padding:'11px',background:accentColor,color:'#000',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700}}>Confirmar ×{parseInt(multQty)||1}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra del scanner ── */}
      <div style={{marginBottom:'0'}}>
        {/* Input field */}
        <div style={{display:'flex',alignItems:'stretch',background:'#111',border:'1px solid #252525'}}>
          <input
            ref={inputRef} value={val} onChange={handleChange}
            onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();procesar(val);}}}
            placeholder="Escanea el código — se agrega automáticamente…"
            disabled={disabled} autoComplete="off" spellCheck={false}
            style={{flex:1,padding:'11px 14px',background:'none',border:'none',outline:'none',
              fontFamily:'DM Mono,monospace',fontSize:'12px',
              color:disabled?'#444':'#e8e8e8',letterSpacing:'.04em'}}
          />
          {/* Multiplicador */}
          <button
            onClick={()=>{setMultMode(m=>!m);setMultPend(null);setMultQty('');}}
            title={multMode?'Desactivar multiplicador':'Activar multiplicador ×N'}
            style={{padding:'0 14px',background:multMode?accentColor:'transparent',
              color:multMode?'#000':'#444',border:'none',borderLeft:'1px solid #252525',
              cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,
              flexShrink:0,transition:'all .15s',letterSpacing:'.06em',
              whiteSpace:'nowrap'}}>
            ×N
          </button>
          {/* Cámara */}
          <button onClick={abrirCam} disabled={camLoad||disabled}
            title="Escanear con cámara"
            style={{padding:'0 13px',background:camLoad?'#1a1a1a':accentColor,
              color:camLoad?'#555':'#000',border:'none',borderLeft:'1px solid #252525',
              cursor:camLoad||disabled?'not-allowed':'pointer',
              fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,
              flexShrink:0,opacity:disabled?.4:1,transition:'background .15s',
              whiteSpace:'nowrap'}}>
            {camLoad?'…':'CAM'}
          </button>
        </div>

        {/* Feedback strip */}
        {(msg || lastScan || camErr || (multMode && !msg)) && (
          <div style={{
            padding:'5px 14px',
            background: msg?.t==='ok' ? '#0d1f0d' : msg?.t==='err'||msg?.t==='warn' ? '#1f0d0d' : '#0d0d0d',
            borderLeft: `2px solid ${msg?.t==='ok'?'var(--green)':msg?.t==='err'||msg?.t==='warn'?'var(--red)':multMode?accentColor:'#252525'}`,
            borderBottom:'1px solid #252525', borderRight:'1px solid #252525',
            fontFamily:'DM Mono,monospace', fontSize:'9px',
            color: msg?.t==='ok'?'var(--green)':msg?.t==='err'||msg?.t==='warn'?'#f87171':multMode&&!msg?accentColor:'#444',
            letterSpacing:'.06em', minHeight:'24px', display:'flex', alignItems:'center',
            transition:'color .2s'
          }}>
            {msg ? `${msg.t==='ok'?'✓':msg.t==='warn'?'⚠':msg.t==='err'?'✕':''} ${msg.m}`
              : multMode ? '× MULTIPLICADOR ACTIVO — te pedirá la cantidad al escanear'
              : lastScan ? `↑ ${lastScan.modelo} — ${lastScan.color}${lastScan.qty>1?` ×${lastScan.qty}`:''}`
              : ''}
          </div>
        )}

        {camErr && (
          <div style={{padding:'7px 14px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',borderLeft:'2px solid var(--red)'}}>
            {camErr}
          </div>
        )}

        {/* Botones de acción extra (Catálogo, Promo, etc.) */}
        {extraActions.length > 0 && (
          <div style={{display:'flex',gap:'0',borderTop:'none'}}>
            {extraActions.map((a, i) => (
              <button key={i} onClick={a.onClick}
                style={{flex:1,padding:'8px 12px',
                  background:a.bg||'var(--bg2)',color:a.color||'var(--ink)',
                  border:'1px solid var(--border)',borderTop:'none',
                  ...(i>0?{borderLeft:'none'}:{}),
                  cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',
                  fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',
                  transition:'opacity .15s'}}
                onMouseEnter={e=>e.currentTarget.style.opacity='.8'}
                onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
