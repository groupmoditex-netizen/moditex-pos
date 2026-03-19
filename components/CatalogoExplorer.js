'use client';
import { colorHex } from '@/utils/colores';
import { useState, useMemo } from 'react';

const CAT_ICONS = {
  'BODIES':'👙','BODY':'👙','CHAQUETA':'🧥','CONJUNTO':'👗','ENTERIZO':'🩱',
  'FALDA':'👘','PANTS':'👖','SHORT':'🩳','TOPS':'👕','TOP':'👕',
  'TRAJE DE BANO':'🩱','TRIKINIS':'🩱','VESTIDO':'💃','DEFAULT':'🏷️',
};

function catIcon(c){const k=(c||'').toUpperCase();for(const [key,v] of Object.entries(CAT_ICONS)){if(k.includes(key))return v;}return CAT_ICONS.DEFAULT;}

/**
 * CatalogoExplorer
 * Props:
 *   productos: []
 *   modo: 'entrada' | 'salida'
 *   tipoVenta: 'DETAL' | 'MAYOR'
 *   onAdd: (prod, qty, tipoVenta) => void
 *   onClose: () => void
 */
export default function CatalogoExplorer({ productos, modo, tipoVenta: tipoVentaInit = 'DETAL', onAdd, onClose }) {
  const [vista, setVista]   = useState('categorias'); // 'categorias' | 'modelos' | 'variantes' | 'busqueda'
  const [catSel, setCatSel] = useState('');
  const [modSel, setModSel] = useState('');
  const [buscar, setBuscar] = useState('');
  const [qtyMap, setQtyMap] = useState({});
  const [tvMap, setTvMap]   = useState({});

  function getQty(sku) { return qtyMap[sku] || 1; }
  function getTv(sku)  { return tvMap[sku]  || tipoVentaInit; }
  function setQty(sku, v) { setQtyMap(m=>({...m,[sku]:Math.max(1,v)})); }
  function setTv(sku, v)  { setTvMap(m=>({...m,[sku]:v})); }

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

  function irCategoria(cat){ setCatSel(cat); setModSel(''); setVista('modelos'); setBuscar(''); }
  function irModelo(mod){ setModSel(mod); setVista('variantes'); }
  function irCats(){ setCatSel(''); setModSel(''); setVista('categorias'); }
  function irModelos(){ setModSel(''); setVista('modelos'); }

  function handleAdd(p) {
    onAdd(p, getQty(p.sku), getTv(p.sku));
  }

  const estilo = {
    overlay: {position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',backdropFilter:'blur(3px)'},
    box:     {background:'var(--bg)',border:'1px solid var(--border-strong)',borderTop:'3px solid var(--red)',width:'100%',maxWidth:'840px',maxHeight:'88vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.2)'},
    hdr:     {display:'flex',alignItems:'center',gap:'12px',padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',flexShrink:0},
    body:    {flex:1,overflowY:'auto',padding:'18px 20px'},
    secLbl:  {fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#666',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'13px'},
  };

  // Breadcrumb
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
    const tv      = getTv(p.sku);
    const qty     = getQty(p.sku);
    const precio  = tv==='MAYOR' ? p.precioMayor : p.precioDetal;
    const noStock = modo==='salida' && p.disponible<=0;
    const dot     = colorHex(p.color);
    const sc      = p.disponible>3?'var(--green)':p.disponible>0?'var(--warn)':'var(--red)';

    return (
      <div style={{background:'var(--surface)',border:'1.5px solid var(--border)',padding:'13px',display:'flex',flexDirection:'column',gap:'8px',opacity:noStock?.45:1}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{width:'12px',height:'12px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.12)',flexShrink:0}}/>
          <div>
            <div style={{fontSize:'12px',fontWeight:700}}>{p.modelo}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'var(--blue)'}}>{p.sku}</div>
          </div>
        </div>
        <div style={{fontSize:'11px',color:'#666',fontFamily:'DM Mono,monospace'}}>
          {p.color}{p.talla&&p.talla!=='UNICA'?` · T:${p.talla}`:''}
        </div>
        {/* Tipo venta toggle */}
        <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden'}}>
          {['DETAL','MAYOR'].map(t=>(
            <button key={t} onClick={()=>setTv(p.sku,t)}
              style={{flex:1,padding:'4px 6px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.08em',textTransform:'uppercase',
                background:tv===t?(t==='DETAL'?'var(--blue)':'var(--warn)'):'var(--bg3)',
                color:tv===t?'#fff':'var(--muted)',fontWeight:tv===t?700:400,transition:'all .12s'}}>
              {t==='DETAL'?`D: € ${(p.precioDetal||0).toFixed(2)}`:`M: € ${(p.precioMayor||0).toFixed(2)}`}
            </button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700,color:sc}}>
            {p.disponible>0?`${p.disponible} uds`:'🏭 Sin stock'}
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden'}}>
            <button onClick={()=>setQty(p.sku,qty-1)} style={{width:'28px',height:'28px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
            <input type="number" value={qty} min="1" onChange={e=>setQty(p.sku,parseInt(e.target.value)||1)}
              style={{width:'40px',textAlign:'center',border:'none',borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,outline:'none',background:'var(--surface)'}}/>
            <button onClick={()=>setQty(p.sku,qty+1)} style={{width:'28px',height:'28px',background:'var(--bg3)',border:'none',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
          </div>
          <button onClick={()=>!noStock&&handleAdd(p)}
            disabled={noStock}
            style={{flex:1,padding:'7px 10px',background:'var(--ink)',color:'#fff',border:'none',cursor:noStock?'not-allowed':'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',opacity:noStock?.4:1}}>
            + AGREGAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={estilo.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={estilo.box}>
        {/* Header */}
        <div style={estilo.hdr}>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700,display:'flex',alignItems:'center',gap:'10px'}}>
              ⊞ Explorar Catálogo
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',padding:'2px 9px',background:modo==='entrada'?'var(--green-soft)':'var(--red-soft)',color:modo==='entrada'?'var(--green)':'var(--red)'}}>
                {modo.toUpperCase()}
              </span>
            </div>
            <Breadcrumb/>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'28px',height:'28px',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Search bar */}
        <div style={{padding:'10px 20px',borderBottom:'1px solid var(--border)',background:'var(--bg)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'8px 12px'}}>
            <span style={{color:'#555'}}>🔍</span>
            <input value={buscar}
              onChange={e=>{setBuscar(e.target.value);if(e.target.value.length>=2)setVista('busqueda');else if(vista==='busqueda')setVista('categorias');}}
              placeholder="Búsqueda rápida: modelo, color o SKU…"
              style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',width:'100%'}}/>
            {buscar&&<button onMouseDown={e=>{e.preventDefault();setBuscar('');setVista('categorias');}} style={{background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:'14px',padding:0}}>✕</button>}
          </div>
        </div>

        {/* Body */}
        <div style={estilo.body}>

          {/* CATEGORIAS */}
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

          {/* MODELOS */}
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

          {/* VARIANTES */}
          {vista==='variantes'&&(
            <>
              <div style={estilo.secLbl}>{modSel} — {variantes.length} variante{variantes.length!==1?'s':''}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'9px'}}>
                {variantes.map(p=><ProdCard key={p.sku} p={p}/>)}
              </div>
            </>
          )}

          {/* BUSQUEDA */}
          {vista==='busqueda'&&(
            <>
              <div style={estilo.secLbl}>{resultadosBusq.length} resultado{resultadosBusq.length!==1?'s':''}</div>
              {resultadosBusq.length===0
                ? <div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>Sin resultados para "{buscar}"</div>
                : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'9px'}}>
                    {resultadosBusq.map(p=><ProdCard key={p.sku} p={p}/>)}
                  </div>
              }
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'11px 20px',borderTop:'1px solid var(--border)',background:'var(--bg2)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',fontWeight:700}}>
            Selecciona un producto y ajusta la cantidad
          </span>
          <button onClick={onClose} style={{padding:'7px 16px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase'}}>
            ✓ Listo — volver al formulario
          </button>
        </div>
      </div>
    </div>
  );
}
