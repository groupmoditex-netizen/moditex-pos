'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * BarcodeScanner v3 — MODITEX POS
 * ✓ Sonidos musicales (no pitidos)
 * ✓ Multiplicador para lector físico Y cámara
 * ✓ Último escaneo siempre visible
 * ✓ Cámara en todos los dispositivos
 */
export default function BarcodeScanner({ productos = [], onAdd, disabled = false, skipStockCheck = false }) {
  const bufRef       = useRef('');
  const lastKeyRef   = useRef(0);
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const nativeDetRef = useRef(null);
  const zxingRef     = useRef(null);
  const animRef      = useRef(null);
  const scannedRef   = useRef(false);
  const audioCtxRef  = useRef(null);

  const [camOpen,    setCamOpen]    = useState(false);
  const [camErr,     setCamErr]     = useState('');
  const [scannerMsg, setScannerMsg] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [lastScan,   setLastScan]   = useState(null);

  // Multiplicador
  const [multMode, setMultMode] = useState(false);
  const [multSku,  setMultSku]  = useState(null);
  const [multQty,  setMultQty]  = useState('');
  const multInputRef = useRef(null);

  // Refs anti-stale-closure
  const multModeRef = useRef(false);
  const multSkuRef  = useRef(null);
  const multQtyRef  = useRef('');
  useEffect(() => { multModeRef.current = multMode; }, [multMode]);
  useEffect(() => { multSkuRef.current  = multSku;  }, [multSku]);
  useEffect(() => { multQtyRef.current  = multQty;  }, [multQty]);

  // ── Sonidos musicales ───────────────────────────────────────────
  function getCtx() {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    // Desbloquear contexto suspendido (iOS requiere gesto de usuario)
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {});
    return audioCtxRef.current;
  }

  function playSound(type) {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'ok') {
      // Dos notas ascendentes tipo "ding-ding" — Do5 + Mi5
      [[523.25, 0], [659.25, 0.12]].forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 3000;
        osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.28, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
        osc.start(now + delay); osc.stop(now + delay + 0.22);
      });
    } else if (type === 'error') {
      // Nota grave disonante — La3 bajando
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'warn') {
      // Nota media repetida — Sol4 doble
      [[392, 0], [392, 0.15]].forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.22, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
        osc.start(now + delay); osc.stop(now + delay + 0.12);
      });
    } else if (type === 'mult') {
      // Tres notas ascendentes — Do Re Mi (espera cantidad)
      [[523, 0], [587, 0.1], [659, 0.2]].forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
        osc.start(now + delay); osc.stop(now + delay + 0.1);
      });
    }
  }

  // ── Procesar SKU ───────────────────────────────────────────────
  const processSku = useCallback((sku, forzarQty = null) => {
    const clean = sku.trim().toUpperCase();
    const prod  = productos.find(p => p.sku?.toUpperCase() === clean);

    if (!prod) {
      playSound('error');
      setScannerMsg({ t: 'error', m: `⚠ SKU no encontrado: ${clean}` });
      setTimeout(() => setScannerMsg(null), 3500);
      return;
    }

    const sinStock = !skipStockCheck && (prod.disponible ?? prod.stock ?? 0) <= 0;

    // Modo multiplicador: pedir cantidad
    if (multModeRef.current && !forzarQty) {
      playSound('mult');
      setMultSku(clean);
      setMultQty('');
      setScannerMsg({ t: 'mult', m: `📦 ${prod.modelo} — ${prod.color} · ¿Cuántas unidades?` });
      setTimeout(() => multInputRef.current?.focus(), 80);
      return;
    }

    const qty = forzarQty || 1;

    if (sinStock) {
      playSound('warn');
      setScannerMsg({ t: 'warn', m: `⚠ Sin stock: ${prod.modelo} — ${prod.color}` });
      setTimeout(() => setScannerMsg(null), 3000);
    } else {
      playSound('ok');
      setScannerMsg({ t: 'ok', m: `✓ ${prod.modelo} — ${prod.color}${qty > 1 ? ` ×${qty}` : ''}` });
      setTimeout(() => setScannerMsg(null), 2500);
    }

    onAdd?.(prod, qty);
    setLastScan({ modelo: prod.modelo, color: prod.color, qty, ts: Date.now() });
  }, [productos, onAdd, skipStockCheck]);

  function confirmar() {
    const qty = parseInt(multQtyRef.current) || 1;
    const sku = multSkuRef.current;
    if (!sku) return;
    setMultSku(null); setMultQty(''); setScannerMsg(null);
    processSku(sku, qty);
  }
  function cancelar() {
    setMultSku(null); setMultQty(''); setScannerMsg(null);
  }

  // ── Lector físico ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (disabled || camOpen) return;
      if (multSkuRef.current) {
        if (e.key === 'Enter')  { e.preventDefault(); confirmar(); }
        if (e.key === 'Escape') cancelar();
        return;
      }
      const now = Date.now(), gap = now - lastKeyRef.current;
      lastKeyRef.current = now;
      const active = document.activeElement;
      const isText = active && (active.tagName==='INPUT'||active.tagName==='TEXTAREA') &&
                     active.type!=='hidden' && active.type!=='number';
      if (isText && gap > 50) return;
      if (e.key === 'Enter') {
        const s = bufRef.current.trim(); bufRef.current = '';
        if (s.length >= 4) processSku(s);
        return;
      }
      if (e.key.length === 1) {
        if (gap > 500) bufRef.current = '';
        bufRef.current += e.key;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, camOpen, processSku]);

  // ── Cámara ─────────────────────────────────────────────────────
  const cerrar = useCallback(() => {
    if (animRef.current)   cancelAnimationFrame(animRef.current);
    if (zxingRef.current)  { try { zxingRef.current.reset(); } catch {} zxingRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current)  videoRef.current.srcObject = null;
    scannedRef.current = false;
    setCamOpen(false); setLoading(false);
  }, []);
  useEffect(() => () => cerrar(), []);

  const scanNative = useCallback(() => {
    if (!videoRef.current || !nativeDetRef.current) return;
    nativeDetRef.current.detect(videoRef.current)
      .then(codes => {
        if (codes.length > 0 && !scannedRef.current) {
          scannedRef.current = true; cerrar(); processSku(codes[0].rawValue);
        } else animRef.current = requestAnimationFrame(scanNative);
      })
      .catch(() => { animRef.current = requestAnimationFrame(scanNative); });
  }, [processSku, cerrar]);

  async function abrirCamara() {
    setCamErr(''); setLoading(true);
    const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream; setCamOpen(true); setLoading(false);
      await new Promise(r => setTimeout(r, 150));
      if (!videoRef.current) { cerrar(); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (hasNative) {
        nativeDetRef.current = new window.BarcodeDetector({
          formats: ['code_128','ean_13','ean_8','qr_code','upc_a','upc_e','code_39','itf']
        });
        scanNative();
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        zxingRef.current = reader;
        reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true; cerrar(); processSku(result.getText());
          }
        });
      }
    } catch (e) {
      cerrar();
      if (e.name === 'NotAllowedError') setCamErr('❌ Permiso de cámara denegado. Ve a Ajustes y actívala.');
      else if (e.name === 'NotFoundError') setCamErr('❌ No se encontró cámara.');
      else setCamErr('❌ Error: ' + e.message);
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      {/* Modal cámara */}
      {camOpen && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.93)',zIndex:400,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'20px' }}>
          <div style={{ fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#aaa',letterSpacing:'.14em',textTransform:'uppercase' }}>
            Apunta al código de barras
          </div>
          <div style={{ position:'relative',width:'min(88vw,380px)',aspectRatio:'4/3',
            background:'#000',overflow:'hidden',borderRadius:'8px',
            boxShadow:'0 0 0 2px #f59e0b, 0 0 0 6px rgba(245,158,11,.15)' }}>
            <video ref={videoRef} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline autoPlay/>
            <div style={{ position:'absolute',inset:'14%',border:'1.5px solid rgba(245,158,11,.6)',borderRadius:'6px',pointerEvents:'none' }}/>
            <div style={{ position:'absolute',left:'14%',right:'14%',height:'2px',
              background:'linear-gradient(90deg,transparent,#f59e0b,transparent)',
              animation:'scanline 2s ease-in-out infinite',pointerEvents:'none' }}/>
            {/* Esquinas */}
            {[[0,'top','left'],[1,'top','right'],[2,'bottom','left'],[3,'bottom','right']].map(([i,v,h])=>(
              <div key={i} style={{ position:'absolute',width:'20px',height:'20px',
                [v]:'14%',[h]:'14%',
                borderTopWidth:   v==='top'    ? '3px' : 0,
                borderBottomWidth:v==='bottom' ? '3px' : 0,
                borderLeftWidth:  h==='left'   ? '3px' : 0,
                borderRightWidth: h==='right'  ? '3px' : 0,
                borderStyle:'solid',borderColor:'#f59e0b',pointerEvents:'none' }}/>
            ))}
          </div>
          {multModeRef.current && (
            <div style={{ background:'rgba(245,158,11,.15)',border:'1px solid #f59e0b',
              borderRadius:'6px',padding:'8px 20px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#f59e0b' }}>
              MULTIPLICADOR ACTIVO — te pedirá la cantidad al escanear
            </div>
          )}
          <button onClick={cerrar}
            style={{ padding:'10px 32px',background:'none',border:'1px solid rgba(255,255,255,.3)',color:'#fff',
              cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600,borderRadius:'4px' }}>
            Cancelar
          </button>
          <style>{`@keyframes scanline{0%,100%{top:16%;opacity:.3}50%{top:80%;opacity:1}}`}</style>
        </div>
      )}

      {/* Modal multiplicador (cantidad) */}
      {multSku && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:500,
          display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' }}>
          <div style={{ background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'12px',
            padding:'28px 24px',width:'min(340px,92vw)',textAlign:'center',
            boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ fontSize:'32px',marginBottom:'8px' }}>📦</div>
            <div style={{ fontFamily:'Poppins,sans-serif',fontSize:'15px',fontWeight:700,marginBottom:'4px' }}>
              {productos.find(p=>p.sku===multSku)?.modelo || multSku}
            </div>
            <div style={{ fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888',marginBottom:'20px' }}>
              {productos.find(p=>p.sku===multSku)?.color}
            </div>
            <div style={{ fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#aaa',
              textTransform:'uppercase',letterSpacing:'.12em',marginBottom:'8px' }}>
              ¿Cuántas unidades?
            </div>
            <input ref={multInputRef} type="number" min="1" max="9999"
              value={multQty}
              onChange={e => { setMultQty(e.target.value); multQtyRef.current = e.target.value; }}
              onKeyDown={e => { if(e.key==='Enter') confirmar(); if(e.key==='Escape') cancelar(); }}
              placeholder="ej: 10"
              style={{ width:'100%',padding:'14px',fontSize:'28px',textAlign:'center',
                fontFamily:'DM Mono,monospace',fontWeight:700,
                border:'2px solid var(--border)',borderRadius:'8px',
                background:'var(--bg2)',outline:'none',boxSizing:'border-box',marginBottom:'16px' }}/>
            <div style={{ display:'flex',gap:'10px' }}>
              <button onClick={cancelar}
                style={{ flex:1,padding:'11px',background:'none',border:'1px solid var(--border)',
                  cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',borderRadius:'6px' }}>
                Cancelar
              </button>
              <button onClick={confirmar}
                style={{ flex:2,padding:'11px',background:'var(--ink)',color:'#fff',border:'none',
                  cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,borderRadius:'6px' }}>
                Confirmar ×{parseInt(multQty)||1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra del lector */}
      <div style={{ background:'#111',border:'1px solid #2a2a2a',borderRadius:'4px',marginBottom:'10px',overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'0',padding:'0' }}>
          {/* Icono */}
          <div style={{ padding:'10px 12px',flexShrink:0,borderRight:'1px solid #2a2a2a' }}>
            <span style={{ fontSize:'17px' }}>🔫</span>
          </div>
          {/* Texto de estado */}
          <div style={{ flex:1,padding:'8px 12px',minWidth:0 }}>
            {scannerMsg ? (
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700,
                color: scannerMsg.t==='ok'?'#4ade80':scannerMsg.t==='warn'?'#fbbf24':scannerMsg.t==='mult'?'#60a5fa':'#f87171',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                {scannerMsg.m}
              </div>
            ) : lastScan ? (
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                Último: {lastScan.modelo} — {lastScan.color}{lastScan.qty > 1 ? ` ×${lastScan.qty}` : ''}
              </div>
            ) : (
              <div style={{ fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',letterSpacing:'.06em' }}>
                LECTOR ACTIVO{multMode ? ' · MULTIPLICADOR ON' : ''}
              </div>
            )}
          </div>
          {/* Botón multiplicador */}
          <button onClick={() => { setMultMode(m => !m); setMultSku(null); setMultQty(''); }}
            title="Multiplicador: el próximo escaneo te pedirá la cantidad"
            style={{ padding:'10px 12px',background:multMode?'#f59e0b':'transparent',
              color:multMode?'#000':'#555',border:'none',borderLeft:'1px solid #2a2a2a',
              cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700,
              flexShrink:0,transition:'all .15s',letterSpacing:'.04em' }}>
            ×{multMode ? '✓' : '?'}
          </button>
          {/* Botón cámara */}
          <button onClick={abrirCamara} disabled={loading || disabled}
            title="Escanear con cámara del teléfono"
            style={{ padding:'10px 14px',background:loading?'#333':'#f59e0b',color:loading?'#888':'#000',
              border:'none',borderLeft:'1px solid #2a2a2a',
              cursor:loading||disabled?'not-allowed':'pointer',
              fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,
              display:'flex',alignItems:'center',gap:'5px',flexShrink:0,
              transition:'background .15s',opacity:disabled?.5:1 }}>
            {loading ? '⏳' : '📷'}<span style={{display:'none'}} className="cam-label"> Cámara</span>
          </button>
        </div>
        {/* Error de cámara */}
        {camErr && (
          <div style={{ padding:'8px 12px',background:'rgba(217,30,30,.1)',borderTop:'1px solid #2a2a2a',
            color:'#f87171',fontFamily:'DM Mono,monospace',fontSize:'10px',whiteSpace:'pre-line' }}>
            {camErr}
          </div>
        )}
      </div>
    </>
  );
}
