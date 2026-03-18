'use client';
import { useState, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

// ── Colores ampliados con variantes oscuro/claro ──
const CM={
  'BLANCO':'#d0d0d0','BLANCO CREMA':'#f5f0e0','NEGRO':'#1a1a1a',
  'GRIS':'#6b7280','GRIS CLARO':'#b0b7c3','GRIS OSCURO':'#374151',
  'AZUL':'#3b6fd4','AZUL REY':'#1a4fc4','AZUL MARINO':'#0f1f5c','AZUL CLARO':'#7ec8e3',
  'CELESTE':'#7ec8e3',
  'ROJO':'#d63b3b','ROJO OSCURO':'#8b1515',
  'ROSA':'#f07aa0','ROSA CLARO':'#f9b8cc',
  'VINOTINTO':'#8b2035','CORAL':'#f26e5b',
  'VERDE':'#2d9e4a','VERDE CLARO':'#5dc878','VERDE OSCURO':'#1a6b32','VERDE PISTACHO':'#8db84a',
  'AMARILLO':'#f5c842','NARANJA':'#f57c42',
  'MORADO':'#7c4fd4','LILA':'#b48fe8',
  'BEIGE':'#d4b896','BEIGE CLARO':'#ecdfc8','BEIGE OSCURO':'#b89a6e',
  'MARRON':'#7a4a2a','MARRON CLARO':'#a06040','MARRON OSCURO':'#4a2a14',
};
function colorHex(n){const k=(n||'').toUpperCase().trim();return CM[k]||CM[k.split(' ')[0]]||'#9ca3af';}
function fmt(n){return'€ '+Number(n||0).toFixed(2);}

const PAGE_W = 204;
const PAGE_H = 291;

const LAYOUTS = {
  pent10: { cols:5, rows:10, label:'5×10 — 50/pág ⭐', rec:true,
            cw: PAGE_W/5, ch: PAGE_H/10,
            bcH:12, bcScale:2, fontSize:4.2 },
  quad8:  { cols:4, rows:8,  label:'4×8 — 32/pág',    rec:false,
            cw: PAGE_W/4, ch: PAGE_H/8,
            bcH:16, bcScale:2, fontSize:5 },
  tri6:   { cols:3, rows:6,  label:'3×6 — 18/pág',    rec:false,
            cw: PAGE_W/3, ch: PAGE_H/6,
            bcH:20, bcScale:3, fontSize:6.5 },
  duo5:   { cols:2, rows:5,  label:'2×5 — 10/pág',    rec:false,
            cw: PAGE_W/2, ch: PAGE_H/5,
            bcH:26, bcScale:3, fontSize:8 },
  strip2: { cols:1, rows:2,  label:'1×2 — 2/pág (grande)', rec:false,
            cw: PAGE_W,   ch: PAGE_H/2,
            bcH:55, bcScale:4, fontSize:12 },
};

function barcodeURL(sku, lay) {
  const h = Math.round(lay.bcH * 2.5);
  return `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(sku)}&scale=${lay.bcScale}&height=${h}&paddingwidth=0&paddingheight=0`;
}

export default function EtiquetasPage() {
  const { data, cargando } = useAppData() || {};
  const { productos = [] } = data || {};

  const [buscar, setBuscar] = useState('');
  const [cat,    setCat]    = useState('');
  const [sel,    setSel]    = useState({});
  const [layout, setLayout] = useState('pent10');
  const [precio, setPrecio] = useState('detal');
  const [vista,  setVista]  = useState(false);

  const categorias = useMemo(()=>[...new Set(productos.map(p=>p.categoria))].sort(),[productos]);

  const filtrados = useMemo(()=>productos.filter(p=>{
    const q=buscar.toLowerCase();
    return(!buscar||`${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q))
      &&(!cat||p.categoria===cat);
  }),[productos,buscar,cat]);

  function toggleSel(sku){setSel(prev=>{if(prev[sku]){const n={...prev};delete n[sku];return n;}return{...prev,[sku]:1};});}
  function setCopies(sku,n){setSel(prev=>({...prev,[sku]:Math.max(1,parseInt(n)||1)}));}
  function selAll(){const n={};filtrados.forEach(p=>n[p.sku]=1);setSel(n);}
  function deselAll(){setSel({});}

  const selCount = Object.keys(sel).length;
  const totalEtiquetas = Object.values(sel).reduce((a,v)=>a+v,0);

  const items = [];
  Object.entries(sel).forEach(([sku,copies])=>{
    const p=productos.find(x=>x.sku===sku);
    if(!p)return;
    for(let i=0;i<copies;i++) items.push(p);
  });

  const lay = LAYOUTS[layout];
  const perPage = lay.cols * lay.rows;
  const pages = [];
  for(let i=0;i<items.length;i+=perPage) pages.push(items.slice(i,i+perPage));

  function Etiqueta({ p, forPrint=false }) {
    if (!p) return <div/>;
    const priceVal = precio==='detal'?p.precioDetal:precio==='mayor'?p.precioMayor:null;
    const dot = colorHex(p.color);
    const nombre = `${p.modelo}${p.talla&&p.talla!=='UNICA'?' '+p.talla:''}`;
    const fs = lay.fontSize;

    const cellStyle = forPrint ? {
      width: `${lay.cw}mm`,
      height: `${lay.ch}mm`,
      border: '0.3px solid rgba(0,0,0,.2)',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box',
      pageBreakInside: 'avoid',
    } : {
      border: '0.4px solid rgba(0,0,0,.18)',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      aspectRatio: `${lay.cw}/${lay.ch}`,
    };

    return (
      <div style={cellStyle}>
        <div style={{display:'flex',flex:1,minHeight:0,overflow:'hidden'}}>
          <div style={{
            width: forPrint?`${Math.max(3,lay.cw*0.07)}mm`:'7px',
            background:'#111',
            display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            flexShrink:0,gap:'1px',padding:'1px 0',
          }}>
            <span style={{writingMode:'vertical-rl',transform:'rotate(180deg)',fontFamily:'serif',
              fontSize:forPrint?`${Math.max(3,fs-1)}pt`:'5px',
              fontWeight:900,color:'#fff',letterSpacing:'.02em',lineHeight:1}}>MTX</span>
            <span style={{width:'2px',height:'2px',background:'#d91e1e',borderRadius:'50%',flexShrink:0}}/>
          </div>
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
            padding: forPrint?'0.5mm 1mm':'1px 2px',overflow:'hidden'}}>
            <img
              src={barcodeURL(p.sku, lay)}
              alt={p.sku}
              style={{
                width:'100%',
                height: forPrint?`${lay.bcH}mm`:'100%',
                objectFit:'contain',display:'block',
              }}
              loading="lazy"
            />
          </div>
        </div>
        <div style={{
          fontFamily:'DM Mono,monospace',
          fontSize: forPrint?`${fs*0.85}pt`:`${fs}px`,
          textAlign:'center',padding:forPrint?'0.3mm 1mm':'1px 2px',
          borderTop:'0.3px solid rgba(0,0,0,.12)',color:'#444',
          letterSpacing:'.03em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
        }}>{p.sku}</div>
        <div style={{
          fontFamily:'Poppins,sans-serif',fontWeight:700,
          fontSize: forPrint?`${fs}pt`:`${fs+0.5}px`,
          textAlign:'center',padding:forPrint?'0.3mm 1mm':'1px 2px',
          borderTop:'0.3px solid rgba(0,0,0,.06)',
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
        }}>{nombre}</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'2px',
          padding:forPrint?'0.3mm 1mm':'1px 2px',borderTop:'0.3px solid rgba(0,0,0,.04)'}}>
          <span style={{
            width: forPrint?`${fs*0.6}mm`:'4px',
            height: forPrint?`${fs*0.6}mm`:'4px',
            borderRadius:'50%',background:dot,border:'0.3px solid rgba(0,0,0,.12)',
            display:'inline-block',flexShrink:0,
          }}/>
          <span style={{
            fontFamily:'DM Mono,monospace',
            fontSize: forPrint?`${fs*0.85}pt`:`${fs*0.9}px`,
            textTransform:'uppercase',letterSpacing:'.04em',
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
          }}>{p.color}</span>
        </div>
        {priceVal > 0 && (
          <div style={{
            fontFamily:'DM Mono,monospace',fontWeight:700,color:'#d91e1e',textAlign:'center',
            fontSize: forPrint?`${fs}pt`:`${fs+0.5}px`,
            padding:forPrint?'0.3mm 1mm':'1px 2px',
            borderTop:'0.3px solid rgba(0,0,0,.04)',
          }}>{fmt(priceVal)}</div>
        )}
      </div>
    );
  }

  return (
    <Shell title="Etiquetas de Código de Barras">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          body, html { margin:0; padding:0; background:#fff !important; }
          .sheet-page {
            display: grid;
            page-break-after: always;
            break-after: page;
            margin: 0 !important;
            padding: 3mm;
            box-sizing: border-box;
            width: 210mm;
            height: 297mm;
          }
          .sheet-page:last-child { page-break-after: avoid; break-after: avoid; }
          @page { size: A4 portrait; margin: 0; }
        }
        .print-area { display: none; }
      `}</style>

      <div className="no-print">
        <div style={{padding:'10px 14px',background:'var(--blue-soft)',border:'1px solid rgba(20,64,176,.2)',marginBottom:'16px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)',lineHeight:1.7}}>
          📄 <strong>Papel A4 en vertical</strong> — 210 × 297 mm · Márgenes 3mm · El layout 5×10 imprime 50 etiquetas por hoja (recomendado)
        </div>

        <div style={{display:'flex',gap:'14px',flexWrap:'wrap',marginBottom:'18px',alignItems:'flex-start'}}>
          <div style={{flex:1,minWidth:'280px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.16em',textTransform:'uppercase',marginBottom:'8px'}}>Filtrar productos</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'8px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',flex:1,minWidth:'180px'}}>
                <span style={{color:'#555'}}>🔍</span>
                <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Modelo, SKU, color..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',width:'100%'}}/>
              </div>
              <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'7px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',minWidth:'140px'}}>
                <option value="">Todas las categorías</option>
                {categorias.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
              <button onClick={selAll} style={{padding:'5px 12px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px'}}>☑ Todos ({filtrados.length})</button>
              <button onClick={deselAll} style={{padding:'5px 12px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px'}}>☐ Ninguno</button>
              {selCount > 0 && <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--red)'}}>{selCount} seleccionados · {totalEtiquetas} etiquetas</span>}
            </div>
          </div>

          <div style={{minWidth:'260px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.16em',textTransform:'uppercase',marginBottom:'8px'}}>Opciones de impresión</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',marginBottom:'5px'}}>Layout (hoja A4 vertical)</div>
                <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                  {Object.entries(LAYOUTS).map(([k,v])=>(
                    <button key={k} onClick={()=>setLayout(k)}
                      style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',
                        background:layout===k?'var(--ink)':'var(--bg2)',
                        color:layout===k?'#fff':'#333',
                        border:`1px solid ${layout===k?'var(--ink)':'var(--border)'}`,
                        cursor:'pointer',transition:'all .13s'}}>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700}}>{v.cols}×{v.rows}</span>
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',opacity:.85}}>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',marginBottom:'5px'}}>Precio en etiqueta</div>
                <select value={precio} onChange={e=>setPrecio(e.target.value)} style={{width:'100%',padding:'8px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none'}}>
                  <option value="ninguno">Sin precio</option>
                  <option value="detal">Precio Detal</option>
                  <option value="mayor">Precio Mayor</option>
                </select>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={()=>setVista(v=>!v)}
                  style={{flex:1,padding:'9px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>
                  {vista?'⊡ Ocultar':'⬛ Vista Previa'}
                </button>
                <button onClick={()=>window.print()} disabled={!items.length}
                  style={{flex:1,padding:'9px',background:items.length?'var(--red)':'#ccc',color:'#fff',border:'none',cursor:items.length?'pointer':'not-allowed',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>
                  🖨 Imprimir {items.length>0?`(${items.length})`:''}
                </button>
              </div>
              {items.length > 0 && (
                <div style={{padding:'8px 10px',background:'var(--green-soft)',border:'1px solid rgba(26,122,60,.2)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',textAlign:'center'}}>
                  ✓ {items.length} etiquetas · {pages.length} hoja{pages.length!==1?'s':''} A4
                  {' '}· celda {lay.cw.toFixed(1)}×{lay.ch.toFixed(1)}mm
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{padding:'8px 12px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',letterSpacing:'.1em',textTransform:'uppercase'}}>
            <span>Selecciona los productos a etiquetar</span>
            <span style={{color:'var(--red)'}}>{selCount} seleccionados · {totalEtiquetas} etiquetas</span>
          </div>
          <div style={{overflowX:'auto',maxHeight:'55vh'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:'650px'}}>
              <thead>
                <tr style={{background:'#efefef',position:'sticky',top:0,zIndex:1}}>
                  <th style={{padding:'7px 11px',width:'34px'}}>
                    <input type="checkbox" style={{cursor:'pointer'}}
                      checked={selCount>0&&selCount===filtrados.length}
                      onChange={e=>e.target.checked?selAll():deselAll()}/>
                  </th>
                  {['SKU','Categoría','Modelo','Color','Talla','Detal','Mayor','Stock','Copias'].map(h=>(
                    <th key={h} style={{padding:'7px 11px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#444',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(cargando?[]:filtrados).map(p=>{
                  const isSel=!!sel[p.sku];
                  const dot=colorHex(p.color);
                  const sc=p.disponible<=0?'var(--red)':p.disponible<=3?'var(--warn)':'var(--green)';
                  return(
                    <tr key={p.sku} onClick={()=>toggleSel(p.sku)}
                      style={{borderBottom:'1px solid var(--border)',background:isSel?'rgba(217,30,30,.03)':'',cursor:'pointer',transition:'background .1s'}}
                      onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='var(--bg2)';}}
                      onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='';}}>
                      <td style={{padding:'7px 11px'}}><input type="checkbox" checked={isSel} onChange={()=>toggleSel(p.sku)} onClick={e=>e.stopPropagation()} style={{cursor:'pointer'}}/></td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)'}}>{p.sku}</td>
                      <td style={{padding:'7px 11px'}}><span style={{background:'var(--bg3)',padding:'2px 6px',fontFamily:'DM Mono,monospace',fontSize:'8px'}}>{p.categoria}</span></td>
                      <td style={{padding:'7px 11px',fontSize:'12px',fontWeight:500}}>{p.modelo}</td>
                      <td style={{padding:'7px 11px',fontSize:'12px'}}>
                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,display:'inline-block',verticalAlign:'middle',marginRight:'4px',border:'1px solid rgba(0,0,0,.1)'}}/>
                        {p.color}
                      </td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888'}}>{p.talla}</td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--red)'}}>€ {p.precioDetal?.toFixed(2)}</td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--warn)'}}>€ {p.precioMayor?.toFixed(2)}</td>
                      <td style={{padding:'7px 11px',fontFamily:'DM Mono,monospace',fontWeight:700,color:sc}}>{p.disponible}</td>
                      <td style={{padding:'7px 11px'}} onClick={e=>e.stopPropagation()}>
                        {isSel&&(
                          <input type="number" min="1" max="99" value={sel[p.sku]||1}
                            onChange={e=>setCopies(p.sku,e.target.value)}
                            style={{width:'52px',padding:'4px 7px',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'12px',textAlign:'center',background:'var(--bg2)',outline:'none'}}/>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!cargando&&!filtrados.length&&(
                  <tr><td colSpan={10} style={{padding:'36px',textAlign:'center',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {vista && items.length > 0 && (
          <div style={{marginTop:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <div style={{fontFamily:'Playfair Display,serif',fontSize:'14px',fontWeight:700}}>
                Vista Previa — {items.length} etiqueta{items.length!==1?'s':''} · {pages.length} hoja{pages.length!==1?'s':''} A4
              </div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>
                Celda: {lay.cw.toFixed(1)}×{lay.ch.toFixed(1)}mm · {lay.cols}×{lay.rows}
              </div>
            </div>
            {pages.map((page,pi)=>(
              <div key={pi} style={{
                background:'#fff',border:'1px solid #bbb',marginBottom:'14px',
                padding:'3mm',boxSizing:'border-box',
                display:'grid',gap:0,
                gridTemplateColumns:`repeat(${lay.cols},1fr)`,
                gridTemplateRows:`repeat(${lay.rows},1fr)`,
                width:'100%',aspectRatio:`${210/297}`,
                boxShadow:'0 2px 12px rgba(0,0,0,.1)',
              }}>
                {page.map((p,i)=><Etiqueta key={i} p={p}/>)}
                {Array.from({length:perPage-page.length}).map((_,i)=>(
                  <div key={`e${i}`} style={{border:'0.3px solid transparent'}}/>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRINT AREA — exactamente igual al original que funcionaba */}
      <div className="print-area">
        {pages.map((page,pi)=>(
          <div key={pi} className="sheet-page" style={{
            gridTemplateColumns:`repeat(${lay.cols},${lay.cw}mm)`,
            gridTemplateRows:`repeat(${lay.rows},${lay.ch}mm)`,
            gap:0,
          }}>
            {page.map((p,i)=><Etiqueta key={i} p={p} forPrint={true}/>)}
            {Array.from({length:perPage-page.length}).map((_,i)=>(
              <div key={`e${i}`} style={{width:`${lay.cw}mm`,height:`${lay.ch}mm`}}/>
            ))}
          </div>
        ))}
      </div>
    </Shell>
  );
}