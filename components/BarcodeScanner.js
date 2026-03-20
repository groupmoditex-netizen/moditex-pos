'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * BarcodeScanner — Lector de código de barras MODITEX POS
 * 
 * Mejoras v2:
 *  - Sonido OK (bip corto agradable) y ERROR (bip grave doble)
 *  - Modo multiplicador: activa y el próximo escaneo pide cantidad
 *  - Último escaneo: siempre visible hasta que escanees otro
 *  - Cámara en todos los modos (nativo + ZXing fallback)
 */
export default function BarcodeScanner({ productos = [], onAdd, disabled = false, skipStockCheck = false }) {
  const bufRef      = useRef('');
  const lastKeyRef  = useRef(0);
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const nativeDetRef= useRef(null);
  const zxingRef    = useRef(null);
  const animRef     = useRef(null);
  const scannedRef  = useRef(false);
  const audioCtxRef = useRef(null);

  const [camOpen,    setCamOpen]    = useState(false);
  const [camErr,     setCamErr]     = useState('');
  const [scannerMsg, setScannerMsg] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [lastScan,   setLastScan]   = useState(null); // { modelo, color, qty, t }

  // ── Modo multiplicador ──────────────────────────────────────────
  const [multMode,   setMultMode]   = useState(false); // multiplicador activado
  const [multQty,    setMultQty]    = useState('');    // cantidad escrita
  const [multSku,    setMultSku]    = useState(null);  // sku pendiente de confirmar
  const multInputRef = useRef(null);

  // ── Web Audio: generar sonidos sin archivos externos ────────────
  function getAudioCtx() {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    return audioCtxRef.current;
  }

  function playBeep(type) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'ok') {
      // Bip corto y agudo — confirmación
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'error') {
      // Dos bips graves — error
      [0, 0.18].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
        osc.start(now + offset); osc.stop(now + offset + 0.12);
      });
    } else if (type === 'warn') {
      // Bip medio — advertencia
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    }
  }

  // ── Procesar SKU detectado ──────────────────────────────────────
  const processSku = useCallback((sku, forzarQty = null) => {
    const clean = sku.trim().toUpperCase();
    const prod = productos.find(p => p.sku?.toUpperCase() === clean);

    if (!prod) {
      playBeep('error');
      setScannerMsg({ t: 'error', m: `⚠ SKU no encontrado: ${clean}` });
      setTimeout(() => setScannerMsg(null), 3500);
      return;
    }

    if (!skipStockCheck && (prod.disponible ?? prod.stock ?? 0) <= 0) {
      playBeep('warn');
      setScannerMsg({ t: 'warn', m: `⚠ Sin stock: ${prod.modelo} — ${prod.color}` });
      setTimeout(() => setScannerMsg(null), 3000);
      // Igual agregar aunque sin stock (para entradas)
      onAdd?.(prod, forzarQty || 1);
      setLastScan({ modelo: prod.modelo, color: prod.color, qty: forzarQty || 1, t: Date.now() });
      return;
    }

    // Modo multiplicador activo: pedir cantidad antes de agregar
    if (multMode && !forzarQty) {
      setMultSku(clean);
      setMultQty('');
      setScannerMsg({ t: 'mult', m: `📦 ${prod.modelo} — ${prod.color} · ¿Cuántas unidades?` });
      setTimeout(() => multInputRef.current?.focus(), 50);
      return;
    }

    const qty = forzarQty || 1;
    playBeep('ok');
    onAdd?.(prod, qty);
    setLastScan({ modelo: prod.modelo, color: prod.color, qty, t: Date.now() });
    setScannerMsg({ t: 'ok', m: `✓ ${prod.modelo} — ${prod.color}${qty > 1 ? ` × ${qty}` : ''}` });
    setTimeout(() => setScannerMsg(null), 2800);
  }, [productos, onAdd, skipStockCheck, multMode]);

  function confirmarMultiplier() {
    const qty = parseInt(multQty) || 1;
    if (!multSku) return;
    setMultSku(null);
    setMultQty('');
    setScannerMsg(null);
    processSku(multSku, qty);
  }

  function cancelarMultiplier() {
    setMultSku(null);
    setMultQty('');
    setScannerMsg(null);
  }

  // ── Lector físico: keydown global ──────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (disabled || camOpen) return;

      // Si hay modal de multiplicador abierto: Enter confirma
      if (multSku) {
        if (e.key === 'Enter') { e.preventDefault(); confirmarMultiplier(); }
        return;
      }

      const now = Date.now();
      const gap = now - lastKeyRef.current;
      lastKeyRef.current = now;

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
        if (gap > 500) bufRef.current = '';
        bufRef.current += e.key;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, camOpen, processSku, multSku]);

  // ── Cámara ─────────────────────────────────────────────────────
  const cerrarCamara = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (zxingRef.current) { try { zxingRef.current.reset(); } catch (_) {} zxingRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    scannedRef.current = false;
    setCamOpen(false);
    setLoading(false);
  }, []);

  useEffect(() => () => cerrarCamara(), []);

  const scanFrameNative = useCallback(() => {
    if (!videoRef.current || !nativeDetRef.current) return;
    nativeDetRef.current.detect(videoRef.current)
      .then(codes => {
        if (codes.length > 0 && !scannedRef.current) {
          scannedRef.current = true;
          cerrarCamara();
          processSku(codes[0].rawValue);
        } else {
          animRef.current = requestAnimationFrame(scanFrameNative);
        }
      })
      .catch(() => { animRef.current = requestAnimationFrame(scanFrameNative); });
  }, [processSku, cerrarCamara]);

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
      await new Promise(r => setTimeout(r, 150));
      if (!videoRef.current) { cerrarCamara(); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (hasNative) {
        nativeDetRef.current = new window.BarcodeDetector({
          formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'code_39', 'itf']
        });
        scanFrameNative();
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        zxingRef.current = reader;
        reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            cerrarCamara();
            processSku(result.getText());
          }
        });
      }
    } catch (e) {
      cerrarCamara();
      if (e.name === 'NotAllowedError') setCamErr('❌ Permiso de cámara denegado.\nVe a Ajustes y permite el acceso a la cámara.');
      else if (e.name === 'NotFoundError') setCamErr('❌ No se encontró cámara en este dispositivo.');
      else setCamErr('❌ Error al abrir la cámara: ' + e.message);
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {/* Modal cámara */}
      {camOpen && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:300,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'20px' }}>
          <div style={{ fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#fff',letterSpacing:'.12em',textTransform:'uppercase' }}>
            📷 Apunta al código de barras
          </div>
          <div style={{ position:'relative',width:'min(92vw,400px)',aspectRatio:'4/3',
            background:'#000',overflow:'hidden',borderRadius:'4px',
            border:'2px solid #f59e0b',boxShadow:'0 0 0 4px rgba(245,158,11,.15)' }}>
            <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline autoPlay/>
            <div style={{position:'absolute',inset:'15%',border:'2px solid rgba(245,158,11,.5)',borderRadius:'6px',pointerEvents:'none'}}/>
            <div style={{ position:'absolute',left:'15%',right:'15%',height:'2px',
              background:'rgba(245,158,11,.7)',borderRadius:'1px',
              animation:'scanline 2s ease-in-out infinite',pointerEvents:'none' }}/>
            {[['top:15%','left:15%'],['top:15%','right:15%'],['bottom:15%','left:15%'],['bottom:15%','right:15%']].map((pos,i)=>(
              <div key={i} style={{ position:'absolute',width:'18px',height:'18px',
                borderColor:'#f59e0b',borderStyle:'solid',borderWidth:0,
                ...Object.fromEntries(pos.map(p=>{const[k,v]=p.split(':');return[k,v];})),
                ...(i===0?{borderTopWidth:'3px',borderLeftWidth:'3px'}:
                    i===1?{borderTopWidth:'3px',borderRightWidth:'3px'}:
                    i===2?{borderBottomWidth:'3px',borderLeftWidth:'3px'}:
                           {borderBottomWidth:'3px',borderRightWidth:'3px'}),
                pointerEvents:'none' }}/>
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
          <style>{`@keyframes scanline{0%,100%{top:18%;opacity:.4}50%{top:78%;opacity:1}}`}</style>
        </div>
      )}

      {/* Modal multiplicador */}
      {multSku && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:200,
          display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' }}>
          <div style={{ background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'8px',
            padding:'24px',width:'min(340px,90vw)',textAlign:'center' }}>
            <div style={{ fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888',
              textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'8px' }}>
              Cantidad a registrar
            </div>
            <div style={{ fontFamily:'Poppins,sans-serif',fontSize:'14px',fontWeight:600,marginBottom:'16px' }}>
              {productos.find(p=>p.sku===multSku)?.modelo || multSku}
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888',fontWeight:400}}>
                {productos.find(p=>p.sku===multSku)?.color}
              </div>
            </div>
            <input ref={multInputRef} type="number" min="1" max="9999"
              value={multQty} onChange={e => setMultQty(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') confirmarMultiplier(); if(e.key==='Escape') cancelarMultiplier(); }}
              placeholder="¿Cuántas?"
              style={{ width:'100%',padding:'12px',fontSize:'24px',textAlign:'center',fontFamily:'DM Mono,monospace',
                fontWeight:700,border:'2px solid var(--border)',borderRadius:'6px',
                background:'var(--bg2)',outline:'none',boxSizing:'border-box',marginBottom:'14px' }}/>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={cancelarMultiplier}
                style={{flex:1,padding:'10px',background:'none',border:'1px solid var(--border)',
                  cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',borderRadius:'4px'}}>
                Cancelar
              </button>
              <button onClick={confirmarMultiplier}
                style={{flex:2,padding:'10px',background:'var(--ink)',color:'#fff',border:'none',
                  cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600,borderRadius:'4px'}}>
                Confirmar ×{parseInt(multQty)||1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra del lector */}
      <div style={{ background:'#111',border:'1px solid #2a2a2a',marginBottom:'10px' }}>
        <div style={{ display:'flex',gap:'8px',alignItems:'center',padding:'9px 13px' }}>
          <span style={{fontSize:'18px',flexShrink:0}}>🔫</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',letterSpacing:'.1em'}}>
              LECTOR ACTIVO — Escanea y el producto se agrega solo
              {multMode && <span style={{color:'#f59e0b',marginLeft:'8px'}}>· MULTIPLICADOR ON ×?</span>}
            </div>
            {/* Mensaje actual */}
            {scannerMsg && (
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,marginTop:'2px',
                color: scannerMsg.t==='ok'?'#4ade80':scannerMsg.t==='warn'?'#fbbf24':scannerMsg.t==='mult'?'#60a5fa':'#f87171' }}>
                {scannerMsg.m}
              </div>
            )}
            {/* Último escaneo — siempre visible */}
            {!scannerMsg && lastScan && (
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'2px' }}>
                Último: {lastScan.modelo} — {lastScan.color}{lastScan.qty > 1 ? ` × ${lastScan.qty}` : ''}
              </div>
            )}
          </div>
          {/* Botón multiplicador */}
          <button
            onClick={() => { setMultMode(m => !m); setMultSku(null); setMultQty(''); }}
            title="Modo multiplicador: el próximo escaneo te pide la cantidad"
            style={{ padding:'7px 11px',background:multMode?'#f59e0b':'#1a1a1a',
              color:multMode?'#000':'#888',border:`1px solid ${multMode?'#f59e0b':'#333'}`,
              cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,
              flexShrink:0,borderRadius:'2px',transition:'all .15s' }}>
            ×?
          </button>
          {/* Botón cámara */}
          <button onClick={abrirCamara} disabled={loading||disabled}
            title="Escanear con cámara"
            style={{ padding:'7px 13px',background:loading?'#555':'#f59e0b',color:'#000',
              border:'none',cursor:loading||disabled?'not-allowed':'pointer',
              fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,
              display:'flex',alignItems:'center',gap:'5px',flexShrink:0,
              opacity:disabled?.5:1,borderRadius:'2px',transition:'background .15s' }}>
            {loading?'⏳':'📷'} {loading?'Abriendo...':'Cámara'}
          </button>
        </div>
      </div>

      {camErr && (
        <div style={{ padding:'9px 13px',background:'var(--red-soft)',color:'var(--red)',
          fontFamily:'DM Mono,monospace',fontSize:'10px',marginBottom:'10px',
          whiteSpace:'pre-line',border:'1px solid rgba(217,30,30,.2)',lineHeight:1.6 }}>
          {camErr}
        </div>
      )}
    </>
  );
}
