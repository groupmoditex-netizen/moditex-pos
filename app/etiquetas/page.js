'use client';
import { useState, useMemo, useRef } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { colorHex } from '@/utils/colores';

function fmt(n) { return '€ ' + Number(n||0).toFixed(2); }

// ── Layouts ──
const PAGE_W = 204, PAGE_H = 291;
const LAYOUTS = {
  pent10: { cols:5, rows:10, label:'5×10', sub:'50/pág ⭐', rec:true,  cw:PAGE_W/5,  ch:PAGE_H/10, bcH:12, bcScale:2, fontSize:4.2 },
  quad8:  { cols:4, rows:8,  label:'4×8',  sub:'32/pág',   rec:false, cw:PAGE_W/4,  ch:PAGE_H/8,  bcH:16, bcScale:2, fontSize:5   },
  tri6:   { cols:3, rows:6,  label:'3×6',  sub:'18/pág',   rec:false, cw:PAGE_W/3,  ch:PAGE_H/6,  bcH:20, bcScale:3, fontSize:6.5 },
  duo5:   { cols:2, rows:5,  label:'2×5',  sub:'10/pág',   rec:false, cw:PAGE_W/2,  ch:PAGE_H/5,  bcH:26, bcScale:3, fontSize:8   },
  strip2: { cols:1, rows:2,  label:'1×2',  sub:'2/pág',    rec:false, cw:PAGE_W,    ch:PAGE_H/2,  bcH:55, bcScale:4, fontSize:12  },
};
function barcodeURL(sku, lay) {
  const h = Math.round(lay.bcH * 2.5);
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(sku)}&scale=${lay.bcScale}&height=${h}&paddingwidth=0&paddingheight=0`;
}

// ── Etiqueta individual (para vista previa e impresión) ──
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
    border:'0.4px solid rgba(0,0,0,.18)', background:'#fff',
    display:'flex', flexDirection:'column', overflow:'hidden', aspectRatio:`${lay.cw}/${lay.ch}`,
  };
  return (
    <div style={cellStyle}>
      <div style={{display:'flex',flex:1,minHeight:0,overflow:'hidden'}}>
        <div style={{width:forPrint?`${Math.max(3,lay.cw*0.07)}mm`:'7px',background:'#111',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          flexShrink:0,gap:'1px',padding:'1px 0'}}>
          <span style={{writingMode:'vertical-rl',transform:'rotate(180deg)',fontFamily:'serif',
            fontSize:forPrint?`${Math.max(3,fs-1)}pt`:'5px',
            fontWeight:900,color:'#fff',letterSpacing:'.02em',lineHeight:1}}>MTX</span>
          <span style={{width:'2px',height:'2px',background:'#d91e1e',borderRadius:'50%',flexShrink:0}}/>
        </div>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
          padding:forPrint?'0.5mm 1mm':'1px 2px',overflow:'hidden'}}>
          <img src={barcodeURL(p.sku, lay)} alt={p.sku}
            style={{width:'100%',height:forPrint?`${lay.bcH}mm`:'100%',objectFit:'contain',display:'block'}} loading="lazy"/>
        </div>
      </div>
      <div style={{fontFamily:'DM Mono,monospace',fontSize:forPrint?`${fs*0.85}pt`:`${fs}px`,
        textAlign:'center',padding:forPrint?'0.3mm 1mm':'1px 2px',
        borderTop:'0.3px solid rgba(0,0,0,.12)',color:'#444',letterSpacing:'.03em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {p.sku}
      </div>
      <div style={{fontFamily:'Poppins,sans-serif',fontWeight:700,
        fontSize:forPrint?`${fs}pt`:`${fs+0.5}px`,textAlign:'center',
        padding:forPrint?'0.3mm 1mm':'1px 2px',borderTop:'0.3px solid rgba(0,0,0,.06)',
        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {nombre}
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'2px',
        padding:forPrint?'0.3mm 1mm':'1px 2px',borderTop:'0.3px solid rgba(0,0,0,.04)'}}>
        <span style={{width:forPrint?`${fs*0.6}mm`:'4px',height:forPrint?`${fs*0.6}mm`:'4px',
          borderRadius:'50%',background:dot,border:'0.3px solid rgba(0,0,0,.12)',display:'inline-block',flexShrink:0}}/>
        <span style={{fontFamily:'DM Mono,monospace',fontSize:forPrint?`${fs*0.85}pt`:`${fs*0.9}px`,
          textTransform:'uppercase',letterSpacing:'.04em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {p.color}
        </span>
      </div>
      {priceVal > 0 && (
        <div style={{fontFamily:'DM Mono,monospace',fontWeight:700,color:'#d91e1e',textAlign:'center',
          fontSize:forPrint?`${fs}pt`:`${fs+0.5}px`,padding:forPrint?'0.3mm 1mm':'1px 2px',
          borderTop:'0.3px solid rgba(0,0,0,.04)'}}>
          {fmt(priceVal)}
        </div>
      )}
    </div>
  );
}

export default function EtiquetasPage() {
  const { data, cargando } = useAppData() || {};
  const { productos = [] } = data || {};

  // ── Estado ──
  const [buscar, setBuscar]       = useState('');
  const [cat, setCat]             = useState('');
  const [carrito, setCarrito]     = useState({}); // { sku: cantidad }
  const [layout, setLayout]       = useState('pent10');
  const [precio, setPrecio]       = useState('detal');
  const [vista, setVista]         = useState(false);
  const [importando, setImport]   = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const searchRef = useRef(null);

  async function importarAEntradas() {
    const skus = Object.keys(carrito);
    if (!skus.length) return;
    if (!confirm(`¿Registrar ${totalEtiquetas} unidades como entrada al almacén?`)) return;
    setImport(true);
    try {
      const fecha = new Date().toISOString().split('T')[0];
      const lote = skus.map(sku => ({
        sku, tipo: 'ENTRADA', cantidad: carrito[sku],
        fecha, concepto: 'Importado desde etiquetas',
      }));
      const res = await fetch('/api/movimientos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lote),
      }).then(r => r.json());
      if (res.ok) {
        setImportMsg({ t: 'ok', m: `✓ ${totalEtiquetas} uds registradas en el almacén` });
      } else {
        setImportMsg({ t: 'error', m: res.error || 'Error al registrar' });
      }
    } catch {
      setImportMsg({ t: 'error', m: 'Error de conexión' });
    }
    setImport(false);
    setTimeout(() => setImportMsg(null), 5000);
  }

  const lay = LAYOUTS[layout];

  // ── Categorías ──
  const categorias = useMemo(() =>
    [...new Set(productos.map(p => p.categoria))].sort(), [productos]);

  // ── Productos filtrados para búsqueda ──
  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase().trim();
    return productos.filter(p => {
      const matchQ = !q || `${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q);
      const matchC = !cat || p.categoria === cat;
      return matchQ && matchC;
    });
  }, [productos, buscar, cat]);

  // ── Modelos agrupados para búsqueda rápida ──
  const modelosAgrupados = useMemo(() => {
    const map = {};
    filtrados.forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!map[key]) map[key] = { categoria: p.categoria, modelo: p.modelo, variantes: [] };
      map[key].variantes.push(p);
    });
    return Object.values(map).slice(0, 80); // max 80 grupos visibles
  }, [filtrados]);

  // ── Acciones carrito ──
  function addSku(sku, delta = 1) {
    setCarrito(prev => {
      const actual = prev[sku] || 0;
      const nuevo = Math.max(0, actual + delta);
      if (nuevo === 0) { const n = {...prev}; delete n[sku]; return n; }
      return { ...prev, [sku]: nuevo };
    });
  }
  function setSku(sku, n) {
    const v = Math.max(0, parseInt(n) || 0);
    setCarrito(prev => {
      if (v === 0) { const nx = {...prev}; delete nx[sku]; return nx; }
      return { ...prev, [sku]: v };
    });
  }
  function addVariantes(variantes) {
    setCarrito(prev => {
      const n = {...prev};
      variantes.forEach(p => { n[p.sku] = (n[p.sku] || 0) + 1; });
      return n;
    });
  }
  function removeAll() { setCarrito({}); }

  // ── Carrito como lista de productos ──
  const carritoItems = useMemo(() =>
    Object.entries(carrito).map(([sku, cant]) => {
      const p = productos.find(x => x.sku === sku);
      return p ? { ...p, cant } : null;
    }).filter(Boolean), [carrito, productos]);

  const totalEtiquetas = carritoItems.reduce((a, x) => a + x.cant, 0);

  // ── Items expandidos para impresión ──
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

  return (
    <Shell title="Etiquetas de Código de Barras">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
          .no-print { display:none!important; }
          .print-area { display:block!important; }
          body,html { margin:0; padding:0; background:#fff!important; }
          .sheet-page {
            display:grid; page-break-after:always; break-after:page;
            margin:0!important; padding:3mm; box-sizing:border-box;
            width:210mm; height:297mm;
          }
          .sheet-page:last-child { page-break-after:avoid; break-after:avoid; }
          @page { size:A4 portrait; margin:0; }
        }
        .print-area { display:none; }

        .prod-row { display:flex; align-items:center; gap:8px; padding:7px 10px;
          border-bottom:1px solid var(--border); cursor:pointer; transition:background .1s; }
        .prod-row:hover { background:var(--bg2); }
        .prod-row:last-child { border-bottom:none; }
        .add-btn { display:flex; align-items:center; justify-content:center;
          width:26px; height:26px; border-radius:50%; background:var(--ink);
          color:#fff; border:none; cursor:pointer; font-size:16px; line-height:1;
          flex-shrink:0; transition:transform .1s; }
        .add-btn:hover { transform:scale(1.12); }
        .add-all-btn { padding:4px 10px; background:none; border:1px solid var(--border);
          cursor:pointer; font-size:10px; font-family:'DM Mono',monospace;
          border-radius:3px; transition:background .1s; white-space:nowrap; }
        .add-all-btn:hover { background:var(--bg3); }
        .qty-ctrl { display:flex; align-items:center; gap:0; border:1px solid var(--border); border-radius:4px; overflow:hidden; }
        .qty-btn { width:26px; height:26px; border:none; background:var(--bg3); cursor:pointer;
          font-size:15px; display:flex; align-items:center; justify-content:center; transition:background .1s; }
        .qty-btn:hover { background:var(--border); }
        .qty-input { width:36px; height:26px; border:none; border-left:1px solid var(--border);
          border-right:1px solid var(--border); text-align:center; font-family:'DM Mono',monospace;
          font-size:12px; background:var(--bg2); outline:none; }
        .cat-chip { padding:5px 12px; border:1px solid var(--border); border-radius:20px;
          font-size:10px; font-family:'DM Mono',monospace; cursor:pointer;
          background:var(--bg2); white-space:nowrap; transition:all .12s; }
        .cat-chip.active { background:var(--ink); color:#fff; border-color:var(--ink); }
        .carrito-item { display:flex; align-items:center; gap:8px; padding:8px 10px;
          border-bottom:1px solid var(--border); }
        .carrito-item:last-child { border-bottom:none; }
        .layout-btn { display:flex; align-items:center; justify-content:space-between;
          padding:7px 12px; border:1px solid var(--border); cursor:pointer;
          background:var(--bg2); transition:all .12s; border-radius:3px; }
        .layout-btn.active { background:var(--ink); color:#fff; border-color:var(--ink); }
        .modelo-group { border-bottom:1px solid var(--border); }
        .modelo-header { display:flex; align-items:center; justify-content:space-between;
          padding:7px 10px; background:var(--bg2); cursor:pointer; }
        .modelo-header:hover { background:var(--bg3); }
      `}</style>

      {/* ── Info banner ── */}
      <div className="no-print" style={{padding:'9px 14px',background:'var(--blue-soft)',
        border:'1px solid rgba(20,64,176,.2)',marginBottom:'14px',
        fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)',lineHeight:1.7}}>
        📄 <strong>Papel A4 vertical</strong> — 210 × 297 mm · Márgenes 3mm ·
        Busca un producto y haz clic en <strong>+</strong> para añadirlo al carrito · Ajusta las copias y pulsa Imprimir
      </div>

      {/* Mensaje importar a entradas */}
      {importMsg && (
        <div className="no-print" style={{padding:'10px 14px',marginBottom:'12px',borderRadius:'3px',
          background: importMsg.t === 'ok' ? 'var(--green-soft)' : 'var(--red-soft)',
          border: `1px solid ${importMsg.t === 'ok' ? 'rgba(26,122,60,.3)' : 'rgba(217,30,30,.3)'}`,
          color: importMsg.t === 'ok' ? 'var(--green)' : 'var(--red)',
          fontFamily:'DM Mono,monospace',fontSize:'11px'}}>
          {importMsg.m}
        </div>
      )}

      {/* ── Layout principal: 3 columnas ── */}
      <div className="no-print" style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'12px',alignItems:'start'}}>

        {/* ── COL 1: Búsqueda y lista de productos ── */}
        <div style={{border:'1px solid var(--border)',background:'var(--surface)',overflow:'hidden',borderRadius:'3px'}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg2)'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',
              letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'8px'}}>
              Buscar producto
            </div>
            <input
              ref={searchRef}
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder="Modelo, SKU, color..."
              autoFocus
              style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',
                fontFamily:'Poppins,sans-serif',fontSize:'12px',background:'var(--bg)',
                outline:'none',boxSizing:'border-box',borderRadius:'3px'}}
            />
            {/* Chips de categorías */}
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'8px'}}>
              <button className={`cat-chip${!cat?' active':''}`} onClick={() => setCat('')}>Todas</button>
              {categorias.map(c => (
                <button key={c} className={`cat-chip${cat===c?' active':''}`} onClick={() => setCat(c === cat ? '' : c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de modelos agrupados */}
          <div style={{maxHeight:'60vh',overflowY:'auto'}}>
            {cargando ? (
              <div style={{padding:'40px',textAlign:'center',color:'#888',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>
                Cargando...
              </div>
            ) : modelosAgrupados.length === 0 ? (
              <div style={{padding:'40px',textAlign:'center',color:'#888',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>
                Sin resultados
              </div>
            ) : (
              modelosAgrupados.map(({ categoria, modelo, variantes }) => (
                <div key={`${categoria}_${modelo}`} className="modelo-group">
                  {/* Cabecera del modelo */}
                  <div className="modelo-header">
                    <div>
                      <span style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600}}>{modelo}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginLeft:'8px'}}>{categoria}</span>
                    </div>
                    <button className="add-all-btn" onClick={() => addVariantes(variantes)}>
                      + {variantes.length} var.
                    </button>
                  </div>
                  {/* Variantes del modelo */}
                  {variantes.map(p => {
                    const inCart = carrito[p.sku] || 0;
                    const dot = colorHex(p.color);
                    return (
                      <div key={p.sku} className="prod-row">
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flex:1,minWidth:0}}>
                          <span style={{width:'10px',height:'10px',borderRadius:'50%',background:dot,
                            border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                          <div style={{minWidth:0}}>
                            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)',
                              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.sku}</div>
                            <div style={{fontSize:'11px',color:'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {p.color}{p.talla && p.talla !== 'UNICA' ? ` · ${p.talla}` : ''}
                              {' '}<span style={{color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{fmt(p.precioDetal)}</span>
                            </div>
                          </div>
                        </div>
                        {inCart > 0 ? (
                          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                            <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',
                              color:'var(--green)',fontWeight:700}}>×{inCart}</span>
                            <button className="add-btn" onClick={() => addSku(p.sku, 1)}
                              style={{width:'24px',height:'24px',fontSize:'14px'}}>+</button>
                          </div>
                        ) : (
                          <button className="add-btn" onClick={() => addSku(p.sku, 1)}>+</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div style={{padding:'8px 12px',borderTop:'1px solid var(--border)',background:'var(--bg2)',
            fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>
            {filtrados.length} productos · {modelosAgrupados.length} modelos
          </div>
        </div>

        {/* ── COL 2: Carrito de etiquetas ── */}
        <div style={{border:'1px solid var(--border)',background:'var(--surface)',overflow:'hidden',borderRadius:'3px'}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',
                letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'2px'}}>
                Carrito de etiquetas
              </div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--red)',fontWeight:700}}>
                {carritoItems.length} productos · {totalEtiquetas} etiquetas
              </div>
            </div>
            {carritoItems.length > 0 && (
              <button onClick={removeAll}
                style={{padding:'4px 10px',background:'none',border:'1px solid var(--border)',
                  cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',
                  color:'var(--ink-muted)',borderRadius:'3px'}}>
                ✕ Vaciar
              </button>
            )}
          </div>

          <div style={{maxHeight:'60vh',overflowY:'auto'}}>
            {carritoItems.length === 0 ? (
              <div style={{padding:'40px 20px',textAlign:'center'}}>
                <div style={{fontSize:'32px',marginBottom:'8px'}}>🏷️</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>
                  Haz clic en + en un producto<br/>para añadirlo aquí
                </div>
              </div>
            ) : (
              carritoItems.map(p => {
                const dot = colorHex(p.color);
                return (
                  <div key={p.sku} className="carrito-item">
                    {/* Mini preview de etiqueta */}
                    <div style={{width:'32px',height:'20px',flexShrink:0,overflow:'hidden',
                      border:'0.5px solid rgba(0,0,0,.15)',background:'#fff',borderRadius:'2px'}}>
                      <img src={barcodeURL(p.sku, LAYOUTS.pent10)} alt="" loading="lazy"
                        style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.modelo}</div>
                      <div style={{display:'flex',alignItems:'center',gap:'4px',marginTop:'1px'}}>
                        <span style={{width:'7px',height:'7px',borderRadius:'50%',background:dot,
                          border:'0.5px solid rgba(0,0,0,.12)',flexShrink:0}}/>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>
                          {p.color}{p.talla && p.talla !== 'UNICA' ? ` · ${p.talla}` : ''}
                        </span>
                      </div>
                    </div>
                    {/* Control de cantidad */}
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => addSku(p.sku, -1)}>−</button>
                      <input className="qty-input" type="number" min="1" max="999"
                        value={p.cant}
                        onChange={e => setSku(p.sku, e.target.value)}/>
                      <button className="qty-btn" onClick={() => addSku(p.sku, 1)}>+</button>
                    </div>
                    <button onClick={() => setSku(p.sku, 0)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',
                        fontSize:'16px',padding:'2px',lineHeight:1,flexShrink:0}}
                      title="Eliminar">×</button>
                  </div>
                );
              })
            )}
          </div>

          {/* Total y acciones rápidas */}
          {carritoItems.length > 0 && (
            <div style={{padding:'10px 12px',borderTop:'1px solid var(--border)',background:'var(--bg2)'}}>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',
                textAlign:'center',marginBottom:'8px'}}>
                ✓ {totalEtiquetas} etiquetas · {pages.length} hoja{pages.length !== 1 ? 's' : ''} A4
                {' '}({lay.cols}×{lay.rows})
              </div>
              <div style={{display:'flex',gap:'6px',marginBottom:'6px'}}>
                <button onClick={() => setVista(v => !v)}
                  style={{flex:1,padding:'8px',background:'var(--ink)',color:'#fff',border:'none',
                    cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',
                    fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',borderRadius:'3px'}}>
                  {vista ? '⊡ Ocultar' : '⬛ Preview'}
                </button>
                <button onClick={() => window.print()}
                  style={{flex:1,padding:'8px',background:'var(--red)',color:'#fff',border:'none',
                    cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',
                    fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',borderRadius:'3px'}}>
                  🖨 Imprimir ({totalEtiquetas})
                </button>
              </div>
              {/* Importar a Entradas — opcional */}
              <button onClick={importarAEntradas} disabled={importando}
                style={{width:'100%',padding:'7px',background:'none',
                  border:'1px dashed rgba(26,122,60,.5)',color:'var(--green)',
                  cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',
                  borderRadius:'3px',transition:'all .12s',
                  opacity: importando ? .6 : 1}}>
                {importando ? 'Registrando...' : '↑ Importar como entrada al almacén (opcional)'}
              </button>
            </div>
          )}
        </div>

        {/* ── COL 3: Opciones de impresión ── */}
        <div style={{minWidth:'220px',border:'1px solid var(--border)',background:'var(--surface)',
          overflow:'hidden',borderRadius:'3px'}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',
            fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',
            letterSpacing:'.14em',textTransform:'uppercase'}}>
            Opciones de impresión
          </div>
          <div style={{padding:'12px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',
              marginBottom:'6px',letterSpacing:'.1em'}}>Layout A4</div>
            <div style={{display:'flex',flexDirection:'column',gap:'5px',marginBottom:'14px'}}>
              {Object.entries(LAYOUTS).map(([k, v]) => (
                <button key={k} className={`layout-btn${layout === k ? ' active' : ''}`}
                  onClick={() => setLayout(k)}>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700}}>
                    {v.label}
                  </span>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',opacity:.8}}>
                    {v.sub}
                  </span>
                </button>
              ))}
            </div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',
              marginBottom:'6px',letterSpacing:'.1em'}}>Precio en etiqueta</div>
            <select value={precio} onChange={e => setPrecio(e.target.value)}
              style={{width:'100%',padding:'8px 10px',background:'var(--bg2)',
                border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',
                fontSize:'12px',outline:'none',borderRadius:'3px'}}>
              <option value="ninguno">Sin precio</option>
              <option value="detal">Precio Detal</option>
              <option value="mayor">Precio Mayor</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Vista previa ── */}
      {vista && items.length > 0 && (
        <div className="no-print" style={{marginTop:'18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700}}>
              Vista Previa — {items.length} etiqueta{items.length !== 1 ? 's' : ''} · {pages.length} hoja{pages.length !== 1 ? 's' : ''}
            </div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>
              Celda: {lay.cw.toFixed(1)}×{lay.ch.toFixed(1)}mm
            </div>
          </div>
          {pages.map((page, pi) => (
            <div key={pi} style={{
              background:'#fff',border:'1px solid #bbb',marginBottom:'14px',padding:'3mm',
              boxSizing:'border-box',display:'grid',gap:0,
              gridTemplateColumns:`repeat(${lay.cols},1fr)`,
              gridTemplateRows:`repeat(${lay.rows},1fr)`,
              width:'100%',aspectRatio:`${210/297}`,boxShadow:'0 2px 12px rgba(0,0,0,.1)',
            }}>
              {page.map((p, i) => <Etiqueta key={i} p={p} lay={lay} precio={precio}/>)}
              {Array.from({length: perPage - page.length}).map((_, i) => (
                <div key={`e${i}`} style={{border:'0.3px solid transparent'}}/>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Print area ── */}
      <div className="print-area">
        {pages.map((page, pi) => (
          <div key={pi} className="sheet-page" style={{
            gridTemplateColumns:`repeat(${lay.cols},${lay.cw}mm)`,
            gridTemplateRows:`repeat(${lay.rows},${lay.ch}mm)`,
            gap:0,
          }}>
            {page.map((p, i) => <Etiqueta key={i} p={p} lay={lay} precio={precio} forPrint={true}/>)}
            {Array.from({length: perPage - page.length}).map((_, i) => (
              <div key={`e${i}`} style={{width:`${lay.cw}mm`,height:`${lay.ch}mm`}}/>
            ))}
          </div>
        ))}
      </div>
    </Shell>
  );
}
