'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * BarcodeScanner — Lector de código de barras para MODITEX POS
 *
 * Modos soportados:
 *  1. Lector físico USB/Bluetooth — detecta entrada rápida + Enter (todos los dispositivos)
 *  2. Cámara nativa BarcodeDetector API — Chrome/Android (rápido, sin librería)
 *  3. Cámara con @zxing/browser — iOS Safari, Firefox, cualquier navegador (fallback JS)
 *
 * Props:
 *  productos  — array de productos para buscar por SKU
 *  onAdd      — callback(producto) cuando se detecta un SKU válido
 *  disabled   — deshabilitar el lector mientras se procesa
 */
export default function BarcodeScanner({ productos = [], onAdd, disabled = false, skipStockCheck = false }) {
  // ── Lector físico ─────────────────────────────────────────────────
  const bufRef     = useRef('');
  const lastKeyRef = useRef(0);

  // ── Cámara ────────────────────────────────────────────────────────
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const nativeDetRef= useRef(null); // BarcodeDetector nativo
  const zxingRef    = useRef(null);  // ZXing reader
  const animRef     = useRef(null);
  const scannedRef  = useRef(false); // bloquea re-escaneos en iOS

  const [camOpen,     setCamOpen]    = useState(false);
  const [camErr,      setCamErr]     = useState('');
  const [scannerMsg,  setScannerMsg] = useState(null);
  const [loading,     setLoading]    = useState(false);

  // ── Procesar SKU detectado ────────────────────────────────────────
  const processSku = useCallback((sku) => {
    const clean = sku.trim().toUpperCase();
    const prod = productos.find(p => p.sku?.toUpperCase() === clean);
    if (!prod) {
      setScannerMsg({ t: 'error', m: `⚠ SKU no encontrado: ${clean}` });
    } else if (!skipStockCheck && (prod.disponible ?? prod.stock ?? 0) <= 0) {
      setScannerMsg({ t: 'warn',  m: `⚠ Sin stock: ${prod.modelo} — ${prod.color}` });
    } else {
      onAdd?.(prod);
      setScannerMsg({ t: 'ok',   m: `✓ ${prod.modelo} — ${prod.color}` });
    }
    setTimeout(() => setScannerMsg(null), 2800);
  }, [productos, onAdd, skipStockCheck]);

  // ── Lector físico: keydown global ────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (disabled || camOpen) return;
      const now = Date.now();
      const gap = now - lastKeyRef.current;
      lastKeyRef.current = now;

      // Si hay un input de texto con foco Y el gap es > 50ms → es escritura humana, ignorar.
      // Si el gap < 50ms → es un lector físico (dispara chars a ~10-30ms), procesar siempre.
      const active = document.activeElement;
      const isTextInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') &&
                          active.type !== 'hidden' && active.type !== 'number';
      if (isTextInput && gap > 50) return;

      if (e.key === 'Enter') {
        const sku = bufRef.current.trim();
        bufRef.current = '';
        if (sku.length >= 4) processSku(sku);
        return;
      }
      if (e.key.length === 1) {
        if (gap > 500) bufRef.current = ''; // reset si hubo pausa larga
        bufRef.current += e.key;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, camOpen, processSku]);

  // ── Cerrar cámara ────────────────────────────────────────────────
  const cerrarCamara = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (zxingRef.current) {
      try { zxingRef.current.reset(); } catch (_) {}
      zxingRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    scannedRef.current = false; // resetear para próximo escaneo
    setCamOpen(false);
    setLoading(false);
  }, []);

  useEffect(() => () => cerrarCamara(), []);

  // ── Frame loop para BarcodeDetector nativo ───────────────────────
  const scanFrameNative = useCallback(() => {
    if (!videoRef.current || !nativeDetRef.current) return;
    nativeDetRef.current.detect(videoRef.current)
      .then(codes => {
        if (codes.length > 0 && !scannedRef.current) {
          scannedRef.current = true; // bloquear re-disparo
          cerrarCamara();
          processSku(codes[0].rawValue);
        } else {
          animRef.current = requestAnimationFrame(scanFrameNative);
        }
      })
      .catch(() => { animRef.current = requestAnimationFrame(scanFrameNative); });
  }, [processSku, cerrarCamara]);

  // ── Abrir cámara: detecta si usa nativo o ZXing ──────────────────
  const abrirCamara = async () => {
    setCamErr('');
    setLoading(true);

    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setCamOpen(true);
      setLoading(false);

      // Pequeño delay para que el DOM monte el <video>
      await new Promise(r => setTimeout(r, 150));

      if (!videoRef.current) { cerrarCamara(); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      if (hasNative) {
        // ── Modo 2: BarcodeDetector nativo (Chrome/Android) ──────
        nativeDetRef.current = new window.BarcodeDetector({
          formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'code_39', 'itf']
        });
        scanFrameNative();
      } else {
        // ── Modo 3: ZXing (iOS Safari, Firefox, etc.) ────────────
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        zxingRef.current = reader;
        reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true; // bloquear re-disparo (fix iOS/iPhone)
            cerrarCamara();
            processSku(result.getText());
          }
          // err es normal cuando no hay código en frame — ignorar
        });
      }
    } catch (e) {
      cerrarCamara();
      if (e.name === 'NotAllowedError') {
        setCamErr('❌ Permiso de cámara denegado.\nVe a Ajustes del navegador y permite el acceso a la cámara.');
      } else if (e.name === 'NotFoundError') {
        setCamErr('❌ No se encontró cámara en este dispositivo.');
      } else {
        setCamErr('❌ Error al abrir la cámara: ' + e.message);
      }
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      {/* Modal cámara */}
      {camOpen && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.9)', zIndex:300,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px',
          padding:'20px'
        }}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#fff',letterSpacing:'.12em',textTransform:'uppercase'}}>
            📷 Apunta al código de barras
          </div>

          {/* Visor */}
          <div style={{
            position:'relative', width:'min(92vw,400px)', aspectRatio:'4/3',
            background:'#000', overflow:'hidden', borderRadius:'4px',
            border:'2px solid #f59e0b', boxShadow:'0 0 0 4px rgba(245,158,11,.15)'
          }}>
            <video
              ref={videoRef}
              style={{width:'100%',height:'100%',objectFit:'cover'}}
              muted playsInline autoPlay
            />
            {/* Guía de encuadre */}
            <div style={{position:'absolute',inset:'15%',border:'2px solid rgba(245,158,11,.5)',borderRadius:'6px',pointerEvents:'none'}}/>
            {/* Línea de escaneo animada */}
            <div style={{
              position:'absolute',left:'15%',right:'15%',height:'2px',
              background:'rgba(245,158,11,.7)',borderRadius:'1px',
              animation:'scanline 2s ease-in-out infinite',
              pointerEvents:'none'
            }}/>
            {/* Esquinas decorativas */}
            {[['top:15%','left:15%'],['top:15%','right:15%'],['bottom:15%','left:15%'],['bottom:15%','right:15%']].map((pos,i)=>(
              <div key={i} style={{
                position:'absolute', width:'18px', height:'18px',
                borderColor:'#f59e0b', borderStyle:'solid', borderWidth:0,
                ...Object.fromEntries(pos.map(p=>{const[k,v]=p.split(':');return[k,v];})),
                ...(i===0?{borderTopWidth:'3px',borderLeftWidth:'3px'}:
                    i===1?{borderTopWidth:'3px',borderRightWidth:'3px'}:
                    i===2?{borderBottomWidth:'3px',borderLeftWidth:'3px'}:
                           {borderBottomWidth:'3px',borderRightWidth:'3px'}),
                pointerEvents:'none'
              }}/>
            ))}
          </div>

          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#aaa',textAlign:'center',maxWidth:'300px',lineHeight:1.6}}>
            Mantén el código centrado y bien iluminado.<br/>La detección es automática.
          </div>

          <button onClick={cerrarCamara}
            style={{padding:'10px 28px',background:'none',border:'1px solid rgba(255,255,255,.4)',color:'#fff',
              cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600,borderRadius:'2px'}}>
            ✕ Cancelar
          </button>

          <style>{`
            @keyframes scanline {
              0%,100% { top:18%; opacity:.4; }
              50%      { top:78%; opacity:1;  }
            }
          `}</style>
        </div>
      )}

      {/* Barra del lector */}
      <div style={{
        display:'flex', gap:'8px', alignItems:'center',
        padding:'9px 13px', background:'#111', border:'1px solid #2a2a2a',
        marginBottom:'10px'
      }}>
        <span style={{fontSize:'18px', flexShrink:0}}>🔫</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',letterSpacing:'.1em'}}>
            LECTOR ACTIVO — Escanea y el producto se agrega solo
          </div>
          {scannerMsg && (
            <div style={{
              fontFamily:'DM Mono,monospace', fontSize:'10px', fontWeight:700, marginTop:'2px',
              color: scannerMsg.t==='ok' ? '#4ade80' : scannerMsg.t==='warn' ? '#fbbf24' : '#f87171'
            }}>
              {scannerMsg.m}
            </div>
          )}
        </div>
        <button
          onClick={abrirCamara}
          disabled={loading || disabled}
          title="Escanear con cámara — funciona en iOS y Android"
          style={{
            padding:'7px 13px', background: loading?'#555':'#f59e0b', color:'#000',
            border:'none', cursor: loading||disabled ? 'not-allowed':'pointer',
            fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700,
            display:'flex', alignItems:'center', gap:'5px', flexShrink:0,
            opacity: disabled ? .5 : 1, borderRadius:'2px', transition:'background .15s'
          }}>
          {loading ? '⏳' : '📷'} {loading ? 'Abriendo...' : 'Cámara'}
        </button>
      </div>

      {camErr && (
        <div style={{
          padding:'9px 13px', background:'var(--red-soft)', color:'var(--red)',
          fontFamily:'DM Mono,monospace', fontSize:'10px', marginBottom:'10px',
          whiteSpace:'pre-line', border:'1px solid rgba(217,30,30,.2)', lineHeight:1.6
        }}>
          {camErr}
        </div>
      )}
    </>
  );
}