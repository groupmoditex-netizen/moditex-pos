'use client';
import { colorHex } from '@/utils/colores';
import { useState, useMemo, useRef, useLayoutEffect } from 'react';

const CAT_ICONS = {
  'BODIES':'👙','BODY':'👙','CHAQUETA':'🧥','CONJUNTO':'👗','ENTERIZO':'🩱',
  'FALDA':'👘','PANTS':'👖','SHORT':'🩳','TOPS':'👕','TOP':'👕',
  'TRAJE DE BANO':'🩱','TRIKINIS':'🩱','VESTIDO':'💃','DEFAULT':'🏷️',
};
function catIcon(c){const k=(c||'').toUpperCase();for(const [key,v] of Object.entries(CAT_ICONS)){if(k.includes(key))return v;}return CAT_ICONS.DEFAULT;}

/**
 * CatalogoExplorer — Multi-selección acumulativa
 * Props:
 *   productos: []
 *   modo: 'entrada' | 'salida'
 *   tipoVenta: 'DETAL' | 'MAYOR'
 *   onAdd: (prod, qty, tipoVenta) => void   ← llamado POR CADA ítem al confirmar
 *   onClose: () => void
 */
export default function CatalogoExplorer({ productos, modo, tipoVenta: tipoVentaInit = 'DETAL', onAdd, onRemove, itemsEnCesta = [], onClose, compact = false }) {
  const [vista,   setVista]  = useState('categorias');
  const [catSel,  setCatSel] = useState('');
  const [modSel,  setModSel] = useState('');
  const [buscar,  setBuscar] = useState('');
  const [qtyMap,  setQtyMap]   = useState({});
  const [tvMap,   setTvMap]    = useState({});

  // ── Mapeo de lo que ya está en la cesta ───────────────────────────
  const cestaMap = useMemo(() => {
    return itemsEnCesta.reduce((acc, it) => {
      acc[it.sku] = (acc[it.sku] || 0) + (it.cant || 1);
      return acc;
    }, {});
  }, [itemsEnCesta]);

  const totalCestaItems = itemsEnCesta.length;
  const totalCestaUds = itemsEnCesta.reduce((a,b)=>a+(b.cant||1), 0);

  // ── Preservar scroll al cambiar qty/tv ───────────────────────────
  const bodyRef     = useRef(null);
  const savedScroll = useRef(0);
  const skipRestore = useRef(false);

  useLayoutEffect(() => {
    if (!bodyRef.current) return;
    if (skipRestore.current) { skipRestore.current = false; return; }
    // Si el usuario está escribiendo en un input dentro del catálogo, no restaurar.
    // Actualizar savedScroll con la posición actual para que quede en sync.
    const active = document.activeElement;
    if (active && bodyRef.current.contains(active) &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      savedScroll.current = bodyRef.current.scrollTop;
      return;
    }
    bodyRef.current.scrollTop = savedScroll.current;
  });

  function saveScroll()  { if (bodyRef.current) savedScroll.current = bodyRef.current.scrollTop; }
  function resetScroll() { savedScroll.current = 0; skipRestore.current = true; }

  function getQty(sku) { return qtyMap[sku] || 1; }
  function getTv(sku)  { return tvMap[sku]  || tipoVentaInit; }
  function setQty(sku, v) { saveScroll(); setQtyMap(m=>({...m,[sku]:Math.max(1,v)})); }
  function setTv(sku, v)  { saveScroll(); setTvMap(m=>({...m,[sku]:v})); }

  // Agrupaciones
  const categorias = useMemo(()=>{
    const map={};
    productos.forEach(p=>{
      if(!map[p.categoria]) map[p.categoria]={total:0,conStock:0};
      map[p.categoria].total++;
      if(p.disponible>0) map[p.categoria].conStock++;
    });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([cat,info])=>({cat,...info}));
  },[productos]);

  const modelos = useMemo(()=>{
    if(!catSel) return [];
    const map={};
    productos.filter(p=>p.categoria===catSel).forEach(p=>{
      if(!map[p.modelo]) map[p.modelo]={stock:0,conStock:0,vars:[]};
      map[p.modelo].stock+=p.disponible;
      if(p.disponible>0) map[p.modelo].conStock++;
      map[p.modelo].vars.push(p);
    });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([m,info])=>({modelo:m,...info}));
  },[productos,catSel]);

  const variantes = useMemo(()=>{
    if(!modSel||!catSel) return [];
    return productos.filter(p=>p.categoria===catSel&&p.modelo===modSel)
      .sort((a,b)=>b.disponible-a.disponible);
  },[productos,catSel,modSel]);

  const resultadosBusq = useMemo(()=>{
    if(buscar.length<2) return [];
    const q=buscar.toLowerCase();
    return productos.filter(p=>`${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q))
      .sort((a,b)=>b.disponible-a.disponible).slice(0,20);
  },[productos,buscar]);

  function irCategoria(cat){ resetScroll(); setCatSel(cat); setModSel(''); setVista('modelos'); setBuscar(''); }
  function irModelo(mod){ resetScroll(); setModSel(mod); setVista('variantes'); }
  function irCats(){ resetScroll(); setCatSel(''); setModSel(''); setVista('categorias'); }
  function irModelos(){ resetScroll(); setModSel(''); setVista('modelos'); }

  // ── Agregar directo (Modo Supermercado) ────────────
  function handleAdd(p) {
    const qty = getQty(p.sku);
    const tv  = getTv(p.sku);
    saveScroll();
    onAdd(p, qty, tv);
    setQtyMap(m => ({ ...m, [p.sku]: 1 }));
  }

  // ── Quitar de la cesta ────────────────────────────────────────────
  function handleRemove(p) {
    saveScroll();
    if(onRemove) onRemove(p.sku);
  }

  // ── Confirmar (Solo cerrar modal) ─────────
  function confirmar() {
    if (onClose) onClose();
  }

  const estilo = {
    overlay: compact ? {display:'flex',flexDirection:'column',flex:1, height:'100%'} : {position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',backdropFilter:'blur(3px)'},
    box:     compact ? {background:'var(--bg)',border:'none',borderRadius:'0',display:'flex',flexDirection:'column',overflow:'hidden',height:'100%'} : {background:'var(--bg)',border:'1px solid var(--border-strong)',borderTop:'3px solid var(--red)',width:'100%',maxWidth:'900px',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.2)'},
    hdr:     {display:'flex',alignItems:'center',gap:'12px',padding:compact?'12px 0':'14px 20px',borderBottom:compact?'none':'1px solid var(--border)',background:compact?'transparent':'var(--bg2)',flexShrink:0},
    body:    {flex:1,overflowY:'auto',padding:compact?'0':'16px 20px'},
    secLbl:  {fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'15px',fontWeight:700},
  };

  function Breadcrumb() {
    return (
      <div style={{display:'flex',alignItems:'center',gap:'5px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666',flexWrap:'wrap',marginTop:'4px'}}>
        <span onClick={irCats} style={{color:'var(--blue)',cursor:'pointer',textDecoration:'underline'}}>Categorías</span>
        {catSel && <><span>›</span>{modSel
          ? <><span onClick={irModelos} style={{color:'var(--blue)',cursor:'pointer',textDecoration:'underline'}}>{catSel}</span><span>›</span><span style={{color:'var(--ink)',fontWeight:700}}>{modSel}</span></>
          : <span style={{color:'var(--ink)',fontWeight:700}}>{catSel}</span>
        }</>}
        {vista==='busqueda' && <><span>›</span><span style={{color:'var(--ink)',fontWeight:700}}>Búsqueda: "{buscar}"</span></>}
      </div>
    );
  }

  function ProdCard({ p }) {
    const noStock = modo==='salida' && p.disponible<=0;
    const dot     = colorHex(p.color);
    const sc      = p.disponible>3?'var(--green)':p.disponible>0?'var(--warn)':'var(--red)';
    const inPending = cestaMap[p.sku] > 0;
    const pendQty   = cestaMap[p.sku] || 0;

    return (
      <div style={{background:'var(--surface)',border:`1px solid ${inPending?'var(--green)':'var(--border)'}`,borderRadius:'10px',padding:'10px',display:'flex',flexDirection:'column',gap:'6px',position:'relative',transition:'all 0.2s',boxShadow:inPending?'0 4px 12px rgba(34,197,94,0.1)':'none'}}>
        {/* Badge de cantidad en carrito */}
        {inPending && (
          <div style={{position:'absolute',top:'-8px',right:'-8px',background:'var(--green)',color:'#fff',borderRadius:'50%',width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,boxShadow:'0 2px 6px rgba(0,0,0,.2)',zIndex:2,animation:'fadeIn 0.2s'}}>
            {pendQty}
          </div>
        )}
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:dot,border:'1.5px solid #fff',boxShadow:'0 2px 4px rgba(0,0,0,0.1)',flexShrink:0}}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:'12px',fontWeight:800,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',lineHeight:'1.1',minHeight:'2.2em'}}>{p.modelo}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'var(--blue)',marginTop:'2px'}}>{p.sku}</div>
          </div>
        </div>
        <div style={{fontSize:'10px',color:'#888',fontFamily:'DM Mono,monospace',height:'15px'}}>
          {p.color}{p.talla&&p.talla!=='UNICA'?` · T:${p.talla}`:''}
        </div>
        
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'4px'}}>
          <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,color:sc}}>
            {p.disponible>0?`${p.disponible} uds`:'🏭 Sin stock'}
          </span>
          {inPending && (
            <button onClick={()=>handleRemove(p)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',padding:'2px 0',fontWeight:700}}>
              ✕ Borrar todo
            </button>
          )}
        </div>

        <button onClick={() => handleAdd(p)}
          style={{width:'100%',padding:'10px 5px',borderRadius:'8px',
            background: inPending ? 'var(--green-soft)' : (p.disponible<=0 ? 'var(--warn-soft)' : 'var(--ink)'),
            color: inPending ? 'var(--green)' : ((p.disponible<=0) ? '#000' : '#fff'), 
            border: inPending ? '1.5px solid var(--green)' : 'none', 
            cursor:'pointer',
            fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:900,letterSpacing:'.05em',textTransform:'uppercase',
            transition:'all .2s'}}>
          {inPending ? `✓ CARGADO` : (p.disponible<=0 ? '+ SOLICITAR' : '+ AÑADIR')}
        </button>
      </div>
    );
  }

  return (
    <div style={estilo.overlay}>      <div style={estilo.box}>
        {/* Header */}
        <div style={estilo.hdr}>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:compact?'14px':'16px',fontWeight:700,display:'flex',alignItems:'center',gap:'10px'}}>
              {compact ? '⊞ Catálogo' : '⊞ Explorar Catálogo'}
              {!compact && (
                <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',padding:'2px 9px',background:modo==='entrada'?'var(--green-soft)':'var(--red-soft)',color:modo==='entrada'?'var(--green)':'var(--red)'}}>
                  {modo?.toUpperCase() || 'SALIDA'}
                </span>
              )}
            </div>
            <Breadcrumb/>
          </div>
          {!compact && <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>}
        </div>

        {/* Search bar */}
        <div style={{padding:compact?'10px 0':'10px 20px',borderBottom:compact?'none':'1px solid var(--border)',background:'transparent',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:compact?'none':'1px solid var(--border)',borderRadius:compact?'12px':'0',padding:'10px 14px',boxShadow:compact?'inset 0 2px 4px rgba(0,0,0,0.03)':'none'}}>
            <span style={{color:'#666',fontSize:'14px'}}>🔍</span>
            <input value={buscar}
              onChange={e=>{const v=e.target.value;setBuscar(v);if(v.length>=2){resetScroll();setVista('busqueda');}else if(vista==='busqueda'){resetScroll();setVista('categorias');}}}
              placeholder={compact ? "Busca SKU, modelo..." : "Búsqueda rápida: modelo, color o SKU…"}
              style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'13px',color:'#111',width:'100%'}}/>
            {buscar&&<button onMouseDown={e=>{e.preventDefault();setBuscar('');setVista('categorias');}} style={{background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:'14px',padding:0}}>✕</button>}
          </div>
        </div>

        {/* Body */}
        <div style={estilo.body} ref={bodyRef}>

          {vista==='categorias'&&(
            <>
              <div style={estilo.secLbl}>Categorías ({categorias.length})</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'10px'}}>
                {categorias.map(({cat,total,conStock})=>(
                  <button key={cat} onClick={()=>irCategoria(cat)}
                    style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'16px 10px 12px',cursor:'pointer',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:'7px',transition:'all .14s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--red)';e.currentTarget.style.background='var(--red-soft)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--surface)';}}>
                    <span style={{fontSize:'26px'}}>{catIcon(cat)}</span>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.08em',textTransform:'uppercase',color:'var(--ink)',fontWeight:700,lineHeight:1.2}}>{cat}</span>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>{conStock} con stock</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {vista==='modelos'&&(
            <>
              <div style={estilo.secLbl}>{catSel} — {modelos.length} modelos</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'9px'}}>
                {modelos.map(({modelo,stock,conStock,vars})=>(
                  <button key={modelo} onClick={()=>irModelo(modelo)}
                    style={{background:'var(--surface)',border:`1px solid var(--border)`,borderLeft:`3px solid ${stock>0?'var(--green)':'var(--border)'}`,padding:'12px 14px',cursor:'pointer',textAlign:'left',transition:'all .14s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--red)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderLeft=`3px solid ${stock>0?'var(--green)':'var(--border)'}`;e.currentTarget.style.borderColor='var(--border)';}}>
                    <div style={{fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,marginBottom:'4px'}}>{modelo}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>
                      {vars.length} variantes · <span style={{color:stock>0?'var(--green)':'var(--red)',fontWeight:700}}>{stock>0?`${stock} uds`:'Sin stock'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {vista==='variantes'&&(
            <>
              <div style={estilo.secLbl}>{modSel} — {variantes.length} variante{variantes.length!==1?'s':''}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'10px'}}>
                {variantes.map(p=><ProdCard key={p.sku} p={p}/>)}
              </div>
            </>
          )}

          {vista==='busqueda'&&(
            <>
              <div style={estilo.secLbl}>{resultadosBusq.length} resultado{resultadosBusq.length!==1?'s':''}</div>
              {resultadosBusq.length===0
                ? <div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>Sin resultados para "{buscar}"</div>
                : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'10px'}}>
                    {resultadosBusq.map(p=><ProdCard key={p.sku} p={p}/>)}
                  </div>
              }
            </>
          )}
        </div>

        {/* Footer — barra de confirmación */}
        <div style={{padding:'8px 20px',borderTop:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,gap:'12px', minHeight: '40px'}}>
          <div>
            {totalCestaItems > 0 ? (
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{background:'var(--green)',color:'#fff',borderRadius:'50%',width:'20px',height:'20px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,flexShrink:0}}>
                  {totalCestaItems}
                </span>
                <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--green)',fontWeight:700}}>
                  {totalCestaItems} SKU{totalCestaItems!==1?'s':''} · {totalCestaUds} ud{totalCestaUds!==1?'s':''}
                </span>
              </div>
            ) : (
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>
                Selecciona productos...
              </span>
            )}
          </div>
          {!compact && (
            <button onClick={confirmar}
              style={{padding:'9px 20px',background: 'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',transition:'background .15s',whiteSpace:'nowrap'}}>
              ✓ Cerrar Catálogo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
