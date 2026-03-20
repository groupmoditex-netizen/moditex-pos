'use client';
/**
 * ScannerInput — Campo de escaneo unificado para MODITEX POS
 *
 * Features:
 *  - Auto-submit cuando el lector físico termina (chars < 50ms → silencio 100ms → agrega solo)
 *  - Enter manual como fallback
 *  - Botón 📷 para cámara nativa (BarcodeDetector) o ZXing (iOS)
 *  - skipStockCheck: true para entradas/comandas donde el stock no importa
 *  - Re-enfoca automáticamente tras cada escaneo
 *
 * Props:
 *   productos      — array de productos para buscar por SKU
 *   onAdd(prod)    — callback cuando se encuentra y agrega el producto
 *   disabled       — deshabilitar durante guardado
 *   skipStockCheck — no bloquear si disponible <= 0 (entradas, comandas)
 *   accentColor    — color del borde/botón cámara (default: #f59e0b)
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

  const [val,     setVal]     = useState('');
  const [msg,     setMsg]     = useState(null);   // { t: 'ok'|'err', m: string }
  const [camOpen, setCamOpen] = useState(false);
  const [camErr,  setCamErr]  = useState('');
  const [camLoad, setCamLoad] = useState(false);

  // ── Procesar SKU ───────────────────────────────────────────────────
  const procesar = useCallback((raw) => {
    const sku = (raw || '').trim().toUpperCase();
    if (!sku) return;
    setVal('');
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }

    const prod = productos.find(p => p.sku?.toUpperCase() === sku);
    if (!prod) {
      setMsg({ t: 'err', m: `⚠ SKU no encontrado: ${sku}` });
      setTimeout(() => setMsg(null), 3000);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    if (!skipStockCheck && (prod.disponible ?? prod.stock ?? 0) <= 0) {
      setMsg({ t: 'warn', m: `⚠ Sin stock: ${prod.modelo} — ${prod.color}` });
      setTimeout(() => setMsg(null), 3000);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    onAdd?.(prod);
    setMsg({ t: 'ok', m: `✓ ${prod.modelo} — ${prod.color}` });
    setTimeout(() => setMsg(null), 2500);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [productos, onAdd, skipStockCheck]);

  // ── Detectar scanner físico: chars < 50ms = lector, silencio 100ms = fin ──
  function handleChange(e) {
    const v = e.target.value;
    setVal(v);
    const now = Date.now();
    const gap = now - lastCharMs.current;
    lastCharMs.current = now;
    if (gap < 50 && v.trim()) {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(() => {
        const cur = inputRef.current?.value || v;
        if (cur.trim()) procesar(cur);
      }, 100);
    }
  }

  // ── Cámara ─────────────────────────────────────────────────────────
  const cerrarCamara = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (zxingRef.current) { try { zxingRef.current.reset(); } catch(_){} zxingRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    scannedRef.current = false;
    setCamOpen(false); setCamLoad(false);
  }, []);

  useEffect(() => () => {
    cerrarCamara();
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }, []);

  const procesarCam = useCallback((sku) => { cerrarCamara(); procesar(sku); }, [cerrarCamara, procesar]);

  const scanFrameNative = useCallback(() => {
    if (!videoRef.current || !nativeDetRef.current) return;
    nativeDetRef.current.detect(videoRef.current)
      .then(codes => {
        if (codes.length > 0 && !scannedRef.current) { scannedRef.current = true; procesarCam(codes[0].rawValue); }
        else animRef.current = requestAnimationFrame(scanFrameNative);
      })
      .catch(() => { animRef.current = requestAnimationFrame(scanFrameNative); });
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
        nativeDetRef.current = new window.BarcodeDetector({
          formats: ['code_128','ean_13','ean_8','qr_code','upc_a','upc_e','code_39','itf']
        });
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
      setCamErr(e.name === 'NotAllowedError'
        ? '❌ Permiso de cámara denegado. Ve a Ajustes del navegador.'
        : '❌ Error al abrir cámara: ' + e.message);
    }
  }

  return (
    <>
      {/* Modal cámara */}
      {camOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:9998,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'20px'}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#fff',letterSpacing:'.12em',textTransform:'uppercase'}}>
            📷 Apunta al código de barras
          </div>
          <div style={{position:'relative',width:'min(92vw,400px)',aspectRatio:'4/3',background:'#000',overflow:'hidden',borderRadius:'4px',border:`2px solid ${accentColor}`,boxShadow:`0 0 0 4px ${accentColor}26`}}>
            <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline autoPlay/>
            <div style={{position:'absolute',inset:'15%',border:`2px solid ${accentColor}80`,borderRadius:'6px',pointerEvents:'none'}}/>
            <div style={{position:'absolute',left:'15%',right:'15%',height:'2px',background:`${accentColor}b3`,borderRadius:'1px',animation:'modscan 2s ease-in-out infinite',pointerEvents:'none'}}/>
            {[['top:15%','left:15%'],['top:15%','right:15%'],['bottom:15%','left:15%'],['bottom:15%','right:15%']].map((pos,i)=>(
              <div key={i} style={{position:'absolute',width:'18px',height:'18px',borderColor:accentColor,borderStyle:'solid',borderWidth:0,
                ...Object.fromEntries(pos.map(p=>{const[k,v]=p.split(':');return[k,v];})),
                ...(i===0?{borderTopWidth:'3px',borderLeftWidth:'3px'}:i===1?{borderTopWidth:'3px',borderRightWidth:'3px'}:i===2?{borderBottomWidth:'3px',borderLeftWidth:'3px'}:{borderBottomWidth:'3px',borderRightWidth:'3px'}),
                pointerEvents:'none'}}/>
            ))}
          </div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#aaa',textAlign:'center',maxWidth:'300px',lineHeight:1.6}}>
            Mantén el código centrado y bien iluminado.<br/>La detección es automática.
          </div>
          <button onClick={cerrarCamara} style={{padding:'10px 28px',background:'none',border:'1px solid rgba(255,255,255,.4)',color:'#fff',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>
            ✕ Cancelar
          </button>
          <style>{`@keyframes modscan{0%,100%{top:18%;opacity:.4;}50%{top:78%;opacity:1;}}`}</style>
        </div>
      )}

      {/* Barra del scanner */}
      <div style={{marginBottom:'2px'}}>
        <div style={{display:'flex'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1,background:'#111',border:'1px solid #2a2a2a',borderRight:'none',padding:'10px 14px'}}>
            <span style={{fontSize:'18px',flexShrink:0}}>🔫</span>
            <input
              ref={inputRef}
              value={val}
              onChange={handleChange}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); procesar(val); } }}
              placeholder="Escanea el código — se agrega automáticamente…"
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              style={{background:'none',border:'none',outline:'none',fontFamily:'DM Mono,monospace',fontSize:'12px',color:disabled?'#666':'#fff',width:'100%',letterSpacing:'.04em'}}
            />
          </div>
          <button
            onClick={abrirCamara}
            disabled={camLoad || disabled}
            title="Escanear con cámara"
            style={{padding:'10px 13px',background:camLoad?'#555':accentColor,color:'#000',border:'none',cursor:camLoad||disabled?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,flexShrink:0,opacity:disabled?.5:1,transition:'background .15s'}}
          >
            {camLoad ? '⏳' : '📷'}
          </button>
        </div>

        {camErr && (
          <div style={{padding:'7px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',background:'var(--red-soft)',color:'var(--red)',borderLeft:'3px solid var(--red)',lineHeight:1.5}}>
            {camErr}
          </div>
        )}
        {msg && (
          <div style={{padding:'6px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,
            background:msg.t==='ok'?'var(--green-soft)':msg.t==='warn'?'#fff8e1':'var(--red-soft)',
            color:msg.t==='ok'?'var(--green)':msg.t==='warn'?'#f59e0b':'var(--red)',
            borderLeft:`3px solid ${msg.t==='ok'?'var(--green)':msg.t==='warn'?'#f59e0b':'var(--red)'}`}}>
            {msg.m}
          </div>
        )}
      </div>
    </>
  );
}
