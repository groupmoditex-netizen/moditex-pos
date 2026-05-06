'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { colorHex } from '@/utils/colores';
import { useRouter } from 'next/navigation';

function fmt(n) { return '€ ' + Number(n||0).toFixed(2); }

// ── Layouts ──
const PAGE_W = 202, PAGE_H = 290;
const LAYOUTS = {
  hexa10: { cols:6, rows:10, label:'6×10', sub:'60 por página', cw:PAGE_W/6,  ch:PAGE_H/10, bcH:11, bcScale:3, fontSize:3.8, icon: '📋' },
  pent10: { cols:5, rows:10, label:'5×10', sub:'50 por página', cw:PAGE_W/5,  ch:PAGE_H/10, bcH:12, bcScale:3, fontSize:4.2, icon: '⭐' },
  quad8:  { cols:4, rows:8,  label:'4×8',  sub:'32 por página', cw:PAGE_W/4,  ch:PAGE_H/8,  bcH:16, bcScale:3, fontSize:5,   icon: '📄' },
  tri6:   { cols:3, rows:6,  label:'3×6',  sub:'18 por página', cw:PAGE_W/3,  ch:PAGE_H/6,  bcH:20, bcScale:4, fontSize:6.5, icon: '🖨️' },
  vretti4x6: { cols:1, rows:1, label:'Vretti 4×6', sub:'Térmico Envío', isThermal:true, cw:101.6, ch:152.4, bcH:100, bcScale:3, fontSize:15, icon: '🚚' },
  thermal2x1: { cols:1, rows:1, label:'Térmico 2×1"', sub:'Ropa/Estándar', isThermal:true, cw:50.8, ch:25.4, bcH:12, bcScale:4, fontSize:8, icon: '🏷️' },
  thermal40x30: { cols:1, rows:1, label:'Térmico 40×30', sub:'Mediano', isThermal:true, cw:40, ch:30, bcH:14, bcScale:3, fontSize:8, icon: '📦' },
  thermal30x20: { cols:1, rows:1, label:'Térmico 30×20', sub:'Pequeño', isThermal:true, cw:30, ch:20, bcH:10, bcScale:3, fontSize:6, icon: '💎' },
};

function barcodeURL(sku, lay) {
  const h = Math.round(lay.bcH * 2);
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(sku)}&scale=2&height=${h}&includetext=false&monochrome=true`;
}

function Etiqueta({ p, lay, precio, forPrint = false }) {
  if (!p) return <div />;
  const priceVal = precio === 'detal' ? p.precioDetal : precio === 'mayor' ? p.precioMayor : null;
  const dot = colorHex(p.color);
  const nombre = `${p.modelo}${p.talla && p.talla !== 'UNICA' ? ' ' + p.talla : ''}`;
  const fs = lay.fontSize;
  
  const cellStyle = forPrint ? {
    width:`${lay.cw}mm`, height:`${lay.ch}mm`,
    border:'0.3px solid rgba(0,0,0,.2)', background:'#fff',
    display:'flex', flexDirection:'column', overflow:'hidden', boxSizing:'border-box', pageBreakInside:'avoid',
  } : {
    border:'1px solid rgba(0,0,0,.1)', background:'#fff',
    display:'flex', flexDirection:'column', overflow:'hidden', 
    aspectRatio:`${lay.cw}/${lay.ch}`,
    maxWidth: lay.isThermal ? '280px' : 'none',
    margin: lay.isThermal ? '10px auto' : '0',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  };

  return (
    <div style={cellStyle}>
      <div style={{display:'flex',flex:1,minHeight:0,overflow:'hidden'}}>
        <div style={{width:forPrint?`${Math.max(3,lay.cw*0.07)}mm`:'10px',background:'#111',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          flexShrink:0,gap:'1px',padding:0}}>
          <span style={{writingMode:'vertical-rl',transform:'rotate(180deg)',fontFamily:'serif',
            fontSize:forPrint?`${Math.max(3,fs-1)}pt`:'6px',
            fontWeight:900,color:'#fff',letterSpacing:'.02em',lineHeight:1}}>MTX</span>
        </div>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
          padding:forPrint?'2mm':'6px',overflow:'hidden'}}>
          <img src={barcodeURL(p.sku, lay)} alt={p.sku}
            style={{
              width: '100%',
              height: forPrint ? `${lay.bcH}mm` : '100%',
              objectFit:lay.isThermal ? 'fill' : 'contain',
              display:'block', 
              imageRendering:'pixelated'
            }} />
        </div>
      </div>
      <div style={{fontFamily:'DM Mono,monospace',fontSize:forPrint?`${fs*0.85}pt`:`${fs+1}px`,
        textAlign:'center',padding:'2px', background: '#fafafa',
        borderTop:'1px solid rgba(0,0,0,.05)',color:'#666',letterSpacing:'.03em'}}>
        {p.sku}
      </div>
      <div style={{fontFamily:'Poppins,sans-serif',fontWeight:800,
        fontSize:forPrint?`${fs}pt`:`${fs+2}px`,textAlign:'center',
        padding:'2px', textTransform: 'uppercase', color: '#111'}}>
        {nombre}
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'4px', padding:'2px'}}>
        {!lay.isThermal && (
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)'}}/>
        )}
        <span style={{fontFamily:'Poppins,sans-serif',fontSize:forPrint?`${fs*0.8}pt`:`${fs}px`, fontWeight: 600, color: '#888', textTransform: 'uppercase'}}>
          {p.color}
        </span>
      </div>
      {priceVal > 0 && (
        <div style={{fontFamily:'Poppins,sans-serif',fontWeight:900,color:'#d91e1e',textAlign:'center',
          fontSize:forPrint?`${fs+1}pt`:`${fs+3}px`,padding:'4px 0', borderTop: '1px dashed #eee'}}>
          {fmt(priceVal)}
        </div>
      )}
    </div>
  );
}

export default function EtiquetasPage() {
  const router = useRouter();
  const { data, cargando } = useAppData() || {};
  const { productos = [] } = data || {};

  const [buscar, setBuscar] = useState('');
  const [cat, setCat] = useState('');
  const [carrito, setCarrito] = useState({});
  const [layout, setLayout] = useState('hexa10');
  const [precio, setPrecio] = useState('detal');
  const [vista, setVista] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem('moditex_carrito_etiquetas');
    if (guardado) try { setCarrito(JSON.parse(guardado)); } catch(e){}
  }, []);

  useEffect(() => {
    localStorage.setItem('moditex_carrito_etiquetas', JSON.stringify(carrito));
  }, [carrito]);

  const lay = LAYOUTS[layout] || LAYOUTS.hexa10;

  const categorias = useMemo(() => [...new Set(productos.map(p => p.categoria))].sort(), [productos]);

  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase().trim();
    return productos.filter(p => {
      const matchQ = !q || `${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q);
      const matchC = !cat || p.categoria === cat;
      return matchQ && matchC;
    });
  }, [productos, buscar, cat]);

  const modelosAgrupados = useMemo(() => {
    const map = {};
    filtrados.forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!map[key]) map[key] = { categoria: p.categoria, modelo: p.modelo, variantes: [] };
      map[key].variantes.push(p);
    });
    return Object.values(map).slice(0, 50);
  }, [filtrados]);

  const carritoItems = useMemo(() =>
    Object.entries(carrito).map(([sku, cant]) => {
      const p = productos.find(x => x.sku === sku);
      return p ? { ...p, cant } : null;
    }).filter(Boolean), [carrito, productos]);

  const totalEtiquetas = carritoItems.reduce((a, x) => a + x.cant, 0);

  const items = useMemo(() => {
    const arr = [];
    carritoItems.forEach(p => { for (let i = 0; i < p.cant; i++) arr.push(p); });
    return arr;
  }, [carritoItems]);

  const perPage = lay.cols * lay.rows;
  const pages = useMemo(() => {
    const ps = [];
    for (let i = 0; i < items.length; i += perPage) ps.push(items.slice(i, i + perPage));
    return ps;
  }, [items, perPage]);

  function addSku(sku, delta = 1) {
    setCarrito(prev => {
      const v = (prev[sku] || 0) + delta;
      if (v <= 0) { const n = {...prev}; delete n[sku]; return n; }
      return { ...prev, [sku]: v };
    });
  }

  function printBlankLabels() {
    // Formato fijo: 7 columnas × 17 filas = 119 etiquetas por hoja A4
    const COLS = 7;
    const ROWS = 17;
    const TOTAL = COLS * ROWS; // 119

    // Dimensiones de cada celda (A4 210×297mm, sin márgenes)
    const CW = (210 / COLS).toFixed(4); // ≈ 30mm
    const CH = (297 / ROWS).toFixed(4); // ≈ 17.47mm
    // Margen superior = 1/3 de la altura de 1 ticket
    const MT = (parseFloat(CH) / 3).toFixed(4);  // ≈ 5.82mm

    const cell = `
      <div class="etiq">
        <div class="marca">MODITEX</div>
        <div class="fila">
          <span class="lbl">REF</span>
          <span class="linea"></span>
        </div>
        <div class="fila">
          <span class="lbl">COL</span>
          <span class="linea"></span>
        </div>
        <div class="cc">CONTROL DE CALIDAD</div>
      </div>`;

    const cells = Array(TOTAL).fill(cell).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4 portrait; margin: 0; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; margin: 0; padding: 0; }
      body, html { margin: 0; padding: 0; background: #fff; }
      .grid {
        display: grid;
        grid-template-columns: repeat(${COLS}, ${CW}mm);
        grid-template-rows: repeat(${ROWS}, ${CH}mm);
        width: 210mm;
        height: 297mm;
        gap: 0;
        margin-top: ${MT}mm;
      }
      .etiq {
        border: 0.5px dashed #999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 1.2mm;
        padding: 0.8mm 1.5mm 1mm 1.5mm;
        overflow: hidden;
        position: relative;
      }
      .marca {
        font-family: 'Arial', sans-serif;
        font-size: 4pt;
        font-weight: 400;
        color: #000;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        text-align: center;
        line-height: 1;
        margin-bottom: 0.5mm;
        opacity: 1;
      }
      .fila {
        display: flex;
        align-items: flex-end;
        gap: 1mm;
        height: 2.8mm;
      }
      .lbl {
        font-family: 'Arial', sans-serif;
        font-size: 4pt;
        font-weight: 700;
        color: #444;
        line-height: 1;
        flex-shrink: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .linea {
        flex: 1;
        border-bottom: 0.4px solid #bbb;
        height: 100%;
      }
      .cc {
        position: absolute;
        bottom: 0.5mm;
        left: 0;
        right: 0;
        text-align: center;
        font-family: 'Arial', sans-serif;
        font-size: 2.5pt;
        font-weight: 400;
        color: #aaa;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        line-height: 1;
      }
    </style></head><body>
      <div class="grid">${cells}</div>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  function sendToEntrada() {
    if (!totalEtiquetas) return;
    const pending = JSON.parse(localStorage.getItem('moditex_add_to_cart') || '[]');
    Object.entries(carrito).forEach(([sku, qty]) => {
      const ex = pending.find(x => x.sku === sku);
      if (ex) ex.qty += qty; else pending.push({ sku, qty });
    });
    localStorage.setItem('moditex_add_to_cart', JSON.stringify(pending));
    setCarrito({});
    router.push('/entrada');
  }

  return (
    <Shell title="Generador de Etiquetas">
      <div style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
        
        {/* Header Visual */}
        <div style={{
          background: 'linear-gradient(135deg, #111 0%, #333 100%)',
          borderRadius: '32px',
          padding: '30px 40px',
          color: '#fff',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }} className="no-print">
          <div>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Control de Etiquetado</h1>
            <p style={{ opacity: 0.6, fontSize: '13px' }}>Prepara tus productos para la venta y el almacén.</p>
          </div>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
             <button onClick={() => setVista(!vista)} style={{
                padding: '12px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer'
             }}>
                {vista ? 'OCULTAR PREVIEW' : 'VER PREVIEW'}
             </button>
             <button onClick={() => printBlankLabels()} style={{
                padding: '12px 24px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer'
             }}>
                🏷️ ETIQUETAS EN BLANCO
             </button>
             <button onClick={() => window.print()} disabled={!totalEtiquetas} style={{
                padding: '12px 24px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer'
             }}>
                🖨️ IMPRIMIR ({totalEtiquetas})
             </button>
          </div>
        </div>

        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 380px 280px', gap: '30px', alignItems: 'start' }}>
          
          {/* COL 1: Catálogo */}
          <div style={{ background: '#fff', borderRadius: '32px', padding: '24px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <input 
                value={buscar} 
                onChange={e => setBuscar(e.target.value)}
                placeholder="Busca por modelo, SKU o color..."
                style={{ width: '100%', padding: '16px 24px', borderRadius: '20px', border: '1px solid #eee', outline: 'none', fontSize: '14px', fontFamily: 'Poppins, sans-serif', background: '#f9f9f9' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <button onClick={() => setCat('')} style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', background: !cat ? '#111' : '#f0f0f0', color: !cat ? '#fff' : '#666', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>TODAS</button>
              {categorias.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', background: cat === c ? '#111' : '#f0f0f0', color: cat === c ? '#fff' : '#666', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>{c}</button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
              {modelosAgrupados.map(m => (
                <div key={m.modelo} style={{ background: '#fcfcfc', borderRadius: '24px', border: '1px solid #f0f0f0', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase' }}>{m.modelo} <span style={{ opacity: 0.4, fontWeight: 400, fontSize: '10px' }}>({m.categoria})</span></div>
                    <button onClick={() => { m.variantes.forEach(v => addSku(v.sku, 1)) }} style={{ padding: '6px 12px', borderRadius: '10px', background: '#111', color: '#fff', border: 'none', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>+ TODAS</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                    {m.variantes.map(v => (
                      <div key={v.sku} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorHex(v.color), flexShrink: 0 }} />
                            <div style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.color}</div>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {carrito[v.sku] && <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--green)' }}>{carrito[v.sku]}</span>}
                            <button onClick={() => addSku(v.sku, 1)} style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#eee', border: 'none', cursor: 'pointer', fontWeight: 900 }}>+</button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COL 2: Carrito */}
          <div style={{ background: '#fff', borderRadius: '32px', padding: '24px', border: '1px solid rgba(0,0,0,0.05)', position: 'sticky', top: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>🏷️ Selección</h3>
              {totalEtiquetas > 0 && <button onClick={() => setCarrito({})} style={{ background: 'none', border: 'none', color: '#999', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>VACIAR</button>}
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {carritoItems.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.3 }}>
                  <div style={{ fontSize: '30px' }}>📦</div>
                  <p style={{ fontSize: '11px', fontWeight: 700 }}>Carrito vacío</p>
                </div>
              ) : (
                carritoItems.map(p => (
                  <div key={p.sku} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #f9f9f9' }}>
                    <div style={{ width: '40px', height: '24px', background: '#fff', border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={barcodeURL(p.sku, LAYOUTS.pent10)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>{p.modelo}</div>
                      <div style={{ fontSize: '9px', color: '#999' }}>{p.color} · {p.sku}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0f0f0', borderRadius: '10px', padding: '2px' }}>
                      <button onClick={() => addSku(p.sku, -1)} style={{ width: '24px', height: '24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 900 }}>-</button>
                      <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '11px', fontWeight: 900 }}>{p.cant}</span>
                      <button onClick={() => addSku(p.sku, 1)} style={{ width: '24px', height: '24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 900 }}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalEtiquetas > 0 && (
              <div style={{ borderTop: '2px solid #f9f9f9', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#666' }}>TOTAL ETIQUETAS:</span>
                  <span style={{ fontSize: '16px', fontWeight: 900 }}>{totalEtiquetas}</span>
                </div>
                <button onClick={sendToEntrada} style={{ width: '100%', padding: '16px', borderRadius: '20px', background: 'var(--green)', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  📤 ENVIAR A ENTRADAS STOCK
                </button>
              </div>
            )}
          </div>

          {/* COL 3: Opciones */}
          <div style={{ background: '#fff', borderRadius: '32px', padding: '24px', border: '1px solid rgba(0,0,0,0.05)', position: 'sticky', top: '100px' }}>
             <h3 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>⚙️ Configuración</h3>
             
             <label style={{ fontSize: '10px', fontWeight: 900, color: '#999', display: 'block', marginBottom: '8px' }}>PRECIO A MOSTRAR</label>
             <select value={precio} onChange={e => setPrecio(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '24px', fontFamily: 'Poppins, sans-serif', fontSize: '12px' }}>
                <option value="ninguno">SIN PRECIO</option>
                <option value="detal">PRECIO DETAL</option>
                <option value="mayor">PRECIO MAYOR</option>
             </select>

             <label style={{ fontSize: '10px', fontWeight: 900, color: '#999', display: 'block', marginBottom: '8px' }}>DISEÑO DE IMPRESIÓN</label>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {Object.entries(LAYOUTS).map(([k, v]) => (
                  <button key={k} onClick={() => setLayout(k)} style={{
                    padding: '12px', borderRadius: '16px', border: '1px solid #eee', background: layout === k ? '#111' : '#fff', color: layout === k ? '#fff' : '#111',
                    display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    <span style={{ fontSize: '18px' }}>{v.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800 }}>{v.label}</div>
                      <div style={{ fontSize: '9px', opacity: 0.6 }}>{v.sub}</div>
                    </div>
                  </button>
                ))}
             </div>
          </div>

        </div>

        {/* Vista Previa */}
        {vista && items.length > 0 && (
          <div className="no-print" style={{ marginTop: '40px', padding: '40px', background: '#f5f5f5', borderRadius: '40px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>VISTA PREVIA DEL PLIEGO</h3>
                <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.5 }}>{pages.length} HOJA(S)</span>
             </div>
             {pages.map((page, pi) => (
                <div key={pi} style={{
                  background:'#fff', marginBottom:'30px', padding:'3mm', boxSizing:'border-box', display:'grid',
                  gridTemplateColumns:`repeat(${lay.cols},1fr)`,
                  gridTemplateRows:`repeat(${lay.rows},1fr)`,
                  width:'100%', aspectRatio: lay.isThermal ? `${lay.cw}/${lay.ch}` : `${210/297}`, boxShadow:'0 20px 60px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden'
                }}>
                  {page.map((p, i) => <Etiqueta key={i} p={p} lay={lay} precio={precio}/>)}
                </div>
             ))}
          </div>
        )}

        {/* Área de Impresión Real */}
        <div className="print-area">
          {pages.map((page, pi) => (
            <div key={pi} className="sheet-page" style={{
              gridTemplateColumns:`repeat(${lay.cols},${lay.cw}mm)`,
              gridTemplateRows:`repeat(${lay.rows},${lay.ch}mm)`,
              gap:0,
            }}>
              {page.map((p, i) => <Etiqueta key={i} p={p} lay={lay} precio={precio} forPrint={true}/>)}
            </div>
          ))}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
          .no-print { display:none!important; }
          .print-area { display:block!important; }
          body,html { margin:0; padding:0; background:#fff!important; }
          .sheet-page {
            display:grid; page-break-after:always; break-after:page;
            margin:0!important; padding:${lay.isThermal ? '0' : '4mm'}; box-sizing:border-box;
            width:${lay.isThermal ? `${lay.cw}mm` : '210mm'};
            height:${lay.isThermal ? `${lay.ch}mm` : '297mm'};
          }
          .sheet-page:last-child { page-break-after:avoid; break-after:avoid; }
          @page { size: ${lay.isThermal ? `${lay.cw}mm ${lay.ch}mm` : 'A4 portrait'}; margin:0; }
        }
        .print-area { display:none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      ` }} />
    </Shell>
  );
}
