'use client';
/**
 * ScannerInput — Campo de escaneo unificado para MODITEX POS
 *
 * Features:
 *  - Caja de texto oscura (igual que en Comandas) — el código se ve mientras se escanea
 *  - Auto-submit cuando el lector físico termina (chars < 50ms → silencio 100ms → agrega)
 *  - Enter manual como fallback
 *  - Modo ×N (multiplicador): activa con el botón ×N → pide cantidad al escanear
 *  - Botón 📷 para cámara nativa (BarcodeDetector) o ZXing (iOS)
 *  - skipStockCheck: true para entradas/comandas donde el stock no importa
 *  - Re-enfoca automáticamente tras cada escaneo
 */
import { useRef, useState, useEffect, useCallback } from 'react';

export default function ScannerInput({
  productos = [],
  onAdd,
  disabled = false,
  skipStockCheck = false,
  accentColor = '#f59e0b',
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

  const audioCtxRef = useRef(null);
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
      [[523.25, 0], [659.25, 0.12]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.25, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
        osc.start(now + delay); osc.stop(now + delay + 0.2);
      });
    } else if (type === 'error') {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'mult') {
      [[523, 0], [587, 0.1], [659, 0.2]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.18, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
        osc.start(now + delay); osc.stop(now + delay + 0.1);
      });
    }
  }

  const procesar = useCallback((raw, forzarQty = null) => {
    const sku = (raw || '').trim().toUpperCase();
    if (!sku) return;
    setVal('');
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    const prod = productos.find(p => p.sku?.toUpperCase() === sku);
    if (!prod) {
      playSound('error');
      setMsg({ t: 'err', m: `⚠ SKU no encontrado: ${sku}` });
      setTimeout(() => setMsg(null), 3000);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    if (!skipStockCheck && (prod.disponible ?? prod.stock ?? 0) <= 0) {
      playSound('error');
      setMsg({ t: 'warn', m: `⚠ Sin stock: ${prod.modelo} — ${prod.color}` });
      setTimeout(() => setMsg(null), 3000);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    if (multModeRef.current && !forzarQty) {
      playSound('mult');
      setMultPend({ sku: prod.sku, prod });
      setMultQty('');
      setTimeout(() => multInputRef.current?.focus(), 80);
      return;
    }
    const qty = forzarQty || 1;
    playSound('ok');
    onAdd?.(prod, qty);
    setLastScan({ modelo: prod.modelo, color: prod.color, qty });
    setMsg({ t: 'ok', m: `✓ ${prod.modelo} — ${prod.color}${qty > 1 ? ` ×${qty}` : ''}` });
    setTimeout(() => setMsg(null), 2500);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [productos, onAdd, skipStockCheck]);

  function confirmarMult() {
    const qty = parseInt(multQty) || 1;
    const pend = multPendRef.current;
    setMultPend(null); setMultQty('');
    if (pend) procesar(pend.sku, qty);
  }
  function cancelarMult() {
    setMultPend(null); setMultQty('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleChange(e) {
    const v = e.target.value; setVal(v);
    const now = Date.now(), gap = now - lastCharMs.current;
    lastCharMs.current = now;
    if (gap < 50 && v.trim()) {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(() => {
        const cur = inputRef.current?.value || v;
        if (cur.trim()) procesar(cur);
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

  const procesarCam = useCallback((sku) => { cerrarCamara(); procesar(sku); }, [cerrarCamara, procesar]);
  const scanFrameNative = useCallback(() => {
    if (!videoRef.current || !nativeDetRef.current) return;
    nativeDetRef.current.detect(videoRef.current)
      .then(codes => {
        if (codes.length > 0 && !scannedRef.current) { scannedRef.current = true; procesarCam(codes[0].rawValue); }
        else animRef.current = requestAnimationFrame(scanFrameNative);
      }).catch(() => { animRef.current = requestAnimationFrame(scanFrameNative); });
  }, [procesarCam]);

  async function abrirCamara() {
    setCamErr(''); setCamLoad(true);
    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
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
          if (result && !scannedRef.current) { scannedRef.current = true; procesarCam(result.getText()); }
        });
      }
    } catch(e) {
      cerrarCamara();
      setCamErr(e.name === 'NotAllowedError' ? '❌ Permiso de cámara denegado. Ve a Ajustes.' : '❌ Error al abrir cámara: ' + e.message);
    }
  }

  return (
    <>
      {camOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.93)',zIndex:9998,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'20px'}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#aaa',letterSpacing:'.14em',textTransform:'uppercase'}}>📷 Apunta al código de barras</div>
          <div style={{position:'relative',width:'min(90vw,400px)',aspectRatio:'4/3',background:'#000',overflow:'hidden',borderRadius:'6px',boxShadow:`0 0 0 2px ${accentColor}, 0 0 0 6px ${accentColor}26`}}>
            <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline autoPlay/>
            <div style={{position:'absolute',inset:'14%',border:`1.5px solid ${accentColor}80`,borderRadius:'6px',pointerEvents:'none'}}/>
            <div style={{position:'absolute',left:'14%',right:'14%',height:'2px',background:`linear-gradient(90deg,transparent,${accentColor},transparent)`,animation:'si_scan 2s ease-in-out infinite',pointerEvents:'none'}}/>
          </div>
          {multMode && <div style={{background:`${accentColor}22`,border:`1px solid ${accentColor}`,padding:'7px 18px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:accentColor}}>MULTIPLICADOR ACTIVO</div>}
          <button onClick={cerrarCamara} style={{padding:'10px 28px',background:'none',border:'1px solid rgba(255,255,255,.3)',color:'#fff',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>✕ Cancelar</button>
          <style>{`@keyframes si_scan{0%,100%{top:16%;opacity:.3}50%{top:78%;opacity:1}}`}</style>
        </div>
      )}

      {multPend && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'var(--bg)',border:`2px solid ${accentColor}`,padding:'28px 24px',width:'min(340px,92vw)',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>📦</div>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'15px',fontWeight:700,marginBottom:'4px'}}>{multPend.prod.modelo}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888',marginBottom:'6px'}}>{multPend.prod.color} · {multPend.sku}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#aaa',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'8px'}}>¿Cuántas unidades?</div>
            <input ref={multInputRef} type="number" min="1" max="9999" value={multQty}
              onChange={e => setMultQty(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') confirmarMult(); if(e.key==='Escape') cancelarMult(); }}
              placeholder="ej: 10"
              style={{width:'100%',padding:'14px',fontSize:'28px',textAlign:'center',fontFamily:'DM Mono,monospace',fontWeight:700,border:'2px solid var(--border)',background:'var(--bg2)',outline:'none',boxSizing:'border-box',marginBottom:'16px'}}/>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={cancelarMult} style={{flex:1,padding:'11px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px'}}>Cancelar</button>
              <button onClick={confirmarMult} style={{flex:2,padding:'11px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700}}>Confirmar ×{parseInt(multQty)||1}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginBottom:'2px'}}>
        <div style={{display:'flex'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1,background:'#111',border:'1px solid #2a2a2a',borderRight:'none',padding:'10px 14px'}}>
            <span style={{fontSize:'18px',flexShrink:0}}>🔫</span>
            <input
              ref={inputRef} value={val} onChange={handleChange}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); procesar(val); } }}
              placeholder="Escanea el código — se agrega automáticamente…"
              disabled={disabled} autoComplete="off" spellCheck={false}
              style={{background:'none',border:'none',outline:'none',fontFamily:'DM Mono,monospace',fontSize:'12px',color:disabled?'#555':'#fff',width:'100%',letterSpacing:'.04em'}}
            />
          </div>
          <button onClick={() => { setMultMode(m => !m); setMultPend(null); setMultQty(''); }}
            title={multMode ? 'Multiplicador ON — click para desactivar' : 'Activar multiplicador ×N'}
            style={{padding:'10px 13px',background:multMode?accentColor:'#1a1a1a',color:multMode?'#000':'#666',border:'1px solid #2a2a2a',borderRight:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700,flexShrink:0,transition:'all .15s',whiteSpace:'nowrap'}}>
            ×{multMode ? '✓' : 'N'}
          </button>
          <button onClick={abrirCamara} disabled={camLoad || disabled}
            style={{padding:'10px 13px',background:camLoad?'#333':accentColor,color:camLoad?'#888':'#000',border:'none',cursor:camLoad||disabled?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,flexShrink:0,opacity:disabled?.5:1,transition:'background .15s'}}>
            {camLoad ? '⏳' : '📷'}
          </button>
        </div>
        {!msg && lastScan && (
          <div style={{padding:'5px 12px',background:'#0d0d0d',border:'1px solid #1a1a1a',borderTop:'none',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#444',letterSpacing:'.06em'}}>
            Último: {lastScan.modelo} — {lastScan.color}{lastScan.qty > 1 ? ` ×${lastScan.qty}` : ''}
          </div>
        )}
        {camErr && <div style={{padding:'7px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',background:'var(--red-soft)',color:'var(--red)',borderLeft:'3px solid var(--red)',lineHeight:1.5}}>{camErr}</div>}
        {msg && (
          <div style={{padding:'6px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,
            background:msg.t==='ok'?'var(--green-soft)':msg.t==='warn'?'#fff8e1':'var(--red-soft)',
            color:msg.t==='ok'?'var(--green)':msg.t==='warn'?'#f59e0b':'var(--red)',
            borderLeft:`3px solid ${msg.t==='ok'?'var(--green)':msg.t==='warn'?'#f59e0b':'var(--red)'}`}}>
            {msg.m}
          </div>
        )}
        {multMode && !msg && !lastScan && (
          <div style={{padding:'5px 12px',background:'#1a1200',border:`1px solid ${accentColor}33`,borderTop:'none',fontFamily:'DM Mono,monospace',fontSize:'9px',color:accentColor,letterSpacing:'.08em'}}>
            MULTIPLICADOR ACTIVO — te pedirá la cantidad al escanear
          </div>
        )}
      </div>
    </>
  );
}