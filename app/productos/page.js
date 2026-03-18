'use client';
import { useState, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { generarSku } from '@/utils/generarSku.js';

const CM={'BLANCO':'#d0d0d0','NEGRO':'#1a1a1a','AZUL':'#3b6fd4','ROJO':'#d63b3b','VERDE':'#2d9e4a','ROSA':'#f07aa0','GRIS':'#6b7280','AMARILLO':'#f5c842','NARANJA':'#f57c42','MORADO':'#7c4fd4','VINOTINTO':'#8b2035','BEIGE':'#d4b896','CORAL':'#f26e5b','CELESTE':'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return CM[k]||CM[k.split(' ')[0]]||'#9ca3af';}
function estD(n){if(n<=0)return 'zero';if(n<=3)return 'low';return 'ok';}

const CATEGORIAS=['BODIES','CHAQUETA','CONJUNTO','ENTERIZO','FALDA','PANTS','SHORT','TOPS','TRAJE DE BANO','TRIKINIS','VESTIDO'];
const TALLAS=['UNICA','XS','S','M','L','XL','XXL'];
const COLORES_COMUNES=['NEGRO','BLANCO','AZUL','ROJO','VERDE','ROSA','GRIS','AMARILLO','NARANJA','MORADO','VINOTINTO','BEIGE','CORAL','CELESTE','AZUL MARINO'];
const TELAS_COMUNES=['LICRA','ALGODÓN','LYCRA','SPANDEX','POLIÉSTER','SEDA','LINO','DENIM','FRANELA','MODAL','BAMBÚ','VISCOSA','NYLON','MICROFIBRA'];

const inp={width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',outline:'none'};
const lbl={fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'4px'};

// ── Modal para editar UN producto (precios, categoría, modelo, talla) ─────
function ModalEditarProducto({ prod, onClose, onSave }) {
  const [form, setForm] = useState({
    categoria: prod.categoria, modelo: prod.modelo, talla: prod.talla,
    precioDetal: prod.precioDetal, precioMayor: prod.precioMayor, precioCosto: prod.precioCosto || 0,
  });
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  async function guardar() {
    if (!form.precioDetal || form.precioDetal <= 0) { setErr('Precio detal requerido'); return; }
    setGuardando(true);
    try {
      const res = await fetch(`/api/productos/${prod.sku}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(form),
      }).then(r=>r.json());
      if (res.ok) onSave();
      else setErr(res.error || 'Error al guardar');
    } catch(e) { setErr('Error de conexión'); }
    setGuardando(false);
  }

  const margin = form.precioCosto > 0 && form.precioDetal > 0
    ? ((form.precioDetal - form.precioCosto) / form.precioDetal * 100).toFixed(1) : null;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'500px',borderTop:'2px solid var(--red)'}}>
        <div style={{padding:'16px 20px 12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Editar Producto</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)',marginTop:'2px'}}>{prod.sku} — {prod.color}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'26px',height:'26px',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:'12px'}}>
          {err && <div style={{padding:'8px 12px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{err}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={lbl}>Categoría</label>
              <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} style={{...inp,padding:'8px 11px'}}>
                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Talla</label>
              <select value={form.talla} onChange={e=>setForm(f=>({...f,talla:e.target.value}))} style={{...inp,padding:'8px 11px'}}>
                {TALLAS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label style={lbl}>Modelo *</label>
              <input value={form.modelo} onChange={e=>setForm(f=>({...f,modelo:e.target.value}))} style={inp} placeholder="Nombre del modelo"/>
            </div>
            <div>
              <label style={lbl}>Precio Detal € *</label>
              <input type="number" min="0" step="0.01" value={form.precioDetal} onChange={e=>setForm(f=>({...f,precioDetal:parseFloat(e.target.value)||0}))} style={inp}/>
            </div>
            <div>
              <label style={lbl}>Precio Mayor €</label>
              <input type="number" min="0" step="0.01" value={form.precioMayor} onChange={e=>setForm(f=>({...f,precioMayor:parseFloat(e.target.value)||0}))} style={inp}/>
            </div>
            <div style={{gridColumn:'span 2',background:'var(--red-soft)',border:'1px solid rgba(217,30,30,.15)',padding:'12px'}}>
              <label style={{...lbl,color:'var(--red)'}}>🔒 Precio de Costo (interno)</label>
              <input type="number" min="0" step="0.01" value={form.precioCosto} onChange={e=>setForm(f=>({...f,precioCosto:parseFloat(e.target.value)||0}))} style={inp} placeholder="0.00"/>
              {margin !== null && (
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',marginTop:'6px'}}>
                  Margen detal: <strong>+€ {(form.precioDetal-form.precioCosto).toFixed(2)} ({margin}%)</strong>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{padding:'12px 20px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'9px',background:'var(--bg2)'}}>
          <button onClick={onClose} style={{padding:'8px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{padding:'8px 18px',background:'var(--red)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',opacity:guardando?.6:1}}>
            {guardando?'⏳ Guardando...':'✓ Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal para agregar nuevo producto (con múltiples colores) ─────────────
function ModalNuevoProducto({ onClose, onSave }) {
  const [categoria, setCategoria]   = useState('BODIES');
  const [categoriaCustom, setCatC]  = useState('');
  const [modelo, setModelo]         = useState('');
  const [talla, setTalla]           = useState('UNICA');
  const [precioDetal, setPD]        = useState('');
  const [precioMayor, setPM]        = useState('');
  const [precioCosto, setPC]        = useState('');
  const [colores, setColores]       = useState([{color:'',stock:0}]);
  const [guardando, setGuardando]   = useState(false);
  const [err, setErr]               = useState('');

  const catReal = categoria === '__nuevo__' ? categoriaCustom.trim().toUpperCase() : categoria;

  function genSku(color) {
    if (!catReal || !modelo) return '';
    function clean(s,n){return(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,n);}
    const c=clean(catReal,3),m=clean(modelo,3),t=clean(talla,1)||'U';
    const rand=Math.floor(100000+Math.random()*899999);
    return c+m+t+rand;
  }

  function updateColor(idx, field, val) {
    setColores(prev => prev.map((c,i) => i===idx ? {...c,[field]:val} : c));
  }
  function addColor() { setColores(prev=>[...prev,{color:'',stock:0}]); }
  function removeColor(idx) { if(colores.length<=1)return; setColores(prev=>prev.filter((_,i)=>i!==idx)); }

  async function guardar() {
    if (!catReal)     { setErr('Categoría requerida'); return; }
    if (!modelo.trim()){ setErr('Modelo requerido'); return; }
    if (!precioDetal || parseFloat(precioDetal)<=0) { setErr('Precio detal requerido'); return; }
    const coloresValidos = colores.filter(c=>c.color.trim());
    if (!coloresValidos.length) { setErr('Agrega al menos un color'); return; }

    const coloresConSku = coloresValidos.map(c => ({
      color: c.color.trim().toUpperCase(),
      stockInicial: parseInt(c.stock)||0,
      sku: genSku(c.color),
    }));

    setGuardando(true);
    try {
      const res = await fetch('/api/productos', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          categoria: catReal, modelo: modelo.trim().toUpperCase(), talla,
          precioDetal: parseFloat(precioDetal), precioMayor: parseFloat(precioMayor)||0,
          precioCosto: parseFloat(precioCosto)||0, colores: coloresConSku,
        }),
      }).then(r=>r.json());
      if (res.ok) onSave(res.skus?.length || coloresConSku.length);
      else setErr(res.error || 'Error al guardar');
    } catch(e) { setErr('Error de conexión'); }
    setGuardando(false);
  }

  const margin = precioCosto > 0 && precioDetal > 0
    ? ((precioDetal-precioCosto)/precioDetal*100).toFixed(1) : null;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',overflowY:'auto'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'580px',borderTop:'2px solid var(--red)',maxHeight:'95vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'16px 22px 12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Agregar Nuevo Producto</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',marginTop:'2px'}}>Se creará una variante por cada color</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'26px',height:'26px',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        <div style={{padding:'18px 22px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'14px'}}>
          {err && <div style={{padding:'8px 12px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{err}</div>}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={lbl}>Categoría *</label>
              <select value={categoria} onChange={e=>setCategoria(e.target.value)} style={{...inp,padding:'8px 11px'}}>
                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
                <option value="__nuevo__">+ Nueva categoría...</option>
              </select>
            </div>
            {categoria==='__nuevo__' && (
              <div>
                <label style={lbl}>Nueva Categoría</label>
                <input value={categoriaCustom} onChange={e=>setCatC(e.target.value)} style={inp} placeholder="Nombre de la categoría"/>
              </div>
            )}
            <div>
              <label style={lbl}>Talla</label>
              <select value={talla} onChange={e=>setTalla(e.target.value)} style={{...inp,padding:'8px 11px'}}>
                {TALLAS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label style={lbl}>Modelo / Nombre *</label>
              <input value={modelo} onChange={e=>setModelo(e.target.value)} style={inp} placeholder="Ej: Jacket Slim, Body Licra..."/>
            </div>
            <div>
              <label style={lbl}>Precio Detal € *</label>
              <input type="number" min="0" step="0.01" value={precioDetal} onChange={e=>setPD(e.target.value)} style={inp} placeholder="0.00"/>
            </div>
            <div>
              <label style={lbl}>Precio Mayor €</label>
              <input type="number" min="0" step="0.01" value={precioMayor} onChange={e=>setPM(e.target.value)} style={inp} placeholder="0.00"/>
            </div>
            <div style={{gridColumn:'span 2',background:'var(--red-soft)',border:'1px solid rgba(217,30,30,.15)',padding:'12px'}}>
              <label style={{...lbl,color:'var(--red)'}}>🔒 Precio de Costo / Producción (interno)</label>
              <input type="number" min="0" step="0.01" value={precioCosto} onChange={e=>setPC(e.target.value)} style={inp} placeholder="0.00 — opcional"/>
              {margin !== null && precioDetal && (
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',marginTop:'6px'}}>
                  Margen detal: <strong>+€ {(precioDetal-precioCosto).toFixed(2)} ({margin}%)</strong>
                </div>
              )}
            </div>
          </div>

          {/* Colores */}
          <div>
            <label style={{...lbl,marginBottom:'8px'}}>Colores y Stock Inicial *</label>
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',overflow:'hidden'}}>
              <div style={{display:'flex',justifyContent:'space-between',padding:'7px 12px',background:'var(--bg3)',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.1em',textTransform:'uppercase'}}>
                <span>Color — SKU generado — Stock inicial</span>
                <span style={{color:'var(--red)'}}>{colores.filter(c=>c.color.trim()).length} color(es)</span>
              </div>
              {colores.map((c, idx) => (
                <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 140px 80px 28px',gap:'6px',padding:'8px 10px',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
                  <div>
                    <input
                      list="colores-lista"
                      value={c.color}
                      onChange={e=>updateColor(idx,'color',e.target.value.toUpperCase())}
                      placeholder="Color (ej: NEGRO)"
                      style={{...inp,padding:'6px 9px',fontSize:'11px'}}/>
                  </div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)',padding:'0 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {c.color.trim() && catReal && modelo ? genSku(c.color) : '—'}
                  </div>
                  <input type="number" min="0" value={c.stock} onChange={e=>updateColor(idx,'stock',e.target.value)}
                    placeholder="0" style={{...inp,padding:'6px 9px',fontSize:'11px',textAlign:'center'}}/>
                  <button onClick={()=>removeColor(idx)} disabled={colores.length<=1}
                    style={{width:'26px',height:'26px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'12px',color:'#666',display:'flex',alignItems:'center',justifyContent:'center',opacity:colores.length<=1?.3:1}}>✕</button>
                </div>
              ))}
              <button onClick={addColor}
                style={{display:'block',width:'100%',padding:'9px',background:'none',border:'none',borderTop:'1px dashed var(--border-strong)',color:'var(--red)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.04em',textAlign:'center',transition:'background .13s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--red-soft)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                + Agregar color
              </button>
            </div>
            <datalist id="colores-lista">
              {COLORES_COMUNES.map(c=><option key={c} value={c}/>)}
            </datalist>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'6px'}}>
              SKU auto: <strong style={{color:'var(--red)'}}>CAT[3] + MOD[3] + TALLA[1] + RANDOM[6]</strong>
            </div>
          </div>
        </div>

        <div style={{padding:'12px 22px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'9px',background:'var(--bg2)',flexShrink:0}}>
          <button onClick={onClose} style={{padding:'8px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{padding:'8px 18px',background:'var(--red)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',opacity:guardando?.6:1}}>
            {guardando?'⏳ Guardando...':'✓ Guardar Producto'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Modal edición masiva por modelo — cambia precio detal/mayor/costo a todos los SKUs del grupo ──
function ModalEditarGrupo({ modelo, variantes, onClose, onSave }) {
  const base = variantes[0] || {};
  const [precioDetal,  setPD] = useState(base.precioDetal  || 0);
  const [precioMayor,  setPM] = useState(base.precioMayor  || 0);
  const [precioCosto,  setPC] = useState(base.precioCosto  || 0);
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');
  const [ok,  setOk]  = useState('');

  const detalesDifieren = [...new Set(variantes.map(v=>v.precioDetal))].length > 1;
  const mayoresDifieren = [...new Set(variantes.map(v=>v.precioMayor))].length > 1;
  const costosDifieren  = [...new Set(variantes.map(v=>v.precioCosto))].length > 1;

  const margin = precioCosto > 0 && precioDetal > 0
    ? ((precioDetal - precioCosto) / precioDetal * 100).toFixed(1) : null;

  async function guardar() {
    if (precioDetal <= 0) { setErr('Precio detal requerido'); return; }
    setGuardando(true); setErr('');
    try {
      const promises = variantes.map(v =>
        fetch(`/api/productos/${v.sku}`, {
          method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ precioDetal, precioMayor, precioCosto,
            categoria: v.categoria, modelo: v.modelo, talla: v.talla }),
        }).then(r=>r.json())
      );
      const results = await Promise.all(promises);
      const errores = results.filter(r=>!r.ok);
      if (errores.length > 0) {
        setErr(`${errores.length} error(es) al guardar`);
      } else {
        setOk(`✓ ${variantes.length} variantes actualizadas`);
        setTimeout(()=>{ onSave(); },1200);
      }
    } catch(e) { setErr('Error de conexión'); }
    setGuardando(false);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'520px',borderTop:'3px solid var(--warn)'}}>

        <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>✏️ Editar precios del grupo</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--warn)',marginTop:'3px'}}>
              {modelo} · {variantes.length} variante{variantes.length!==1?'s':''}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'26px',height:'26px',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:'12px'}}>
          {err && <div style={{padding:'8px 12px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{err}</div>}
          {ok  && <div style={{padding:'8px 12px',background:'var(--green-soft)',color:'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700}}>{ok}</div>}

          {(detalesDifieren||mayoresDifieren||costosDifieren) && (
            <div style={{padding:'9px 12px',background:'#fff8e1',border:'1px solid #f59e0b44',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#92400e',lineHeight:1.6}}>
              ⚠️ Las variantes tienen precios distintos actualmente.
              Al guardar se unificarán todos con los valores de abajo.
            </div>
          )}

          <div>
            <label style={lbl}>Variantes afectadas ({variantes.length})</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:'5px',padding:'9px',background:'var(--bg2)',border:'1px solid var(--border)'}}>
              {variantes.map(v=>(
                <span key={v.sku} style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'2px 8px',fontFamily:'DM Mono,monospace',fontSize:'9px',display:'flex',alignItems:'center',gap:'4px'}}>
                  <span style={{width:'7px',height:'7px',borderRadius:'50%',background:colorHex(v.color),border:'1px solid rgba(0,0,0,.1)',display:'inline-block'}}/>
                  {v.color}
                </span>
              ))}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div>
              <label style={lbl}>Precio Detal € *</label>
              <input type="number" min="0" step="0.01" value={precioDetal}
                onChange={e=>setPD(parseFloat(e.target.value)||0)} style={inp}/>
              {detalesDifieren && <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--warn)',marginTop:'3px'}}>Valores actuales distintos</div>}
            </div>
            <div>
              <label style={lbl}>Precio Mayor €</label>
              <input type="number" min="0" step="0.01" value={precioMayor}
                onChange={e=>setPM(parseFloat(e.target.value)||0)} style={inp}/>
              {mayoresDifieren && <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--warn)',marginTop:'3px'}}>Valores actuales distintos</div>}
            </div>
          </div>

          <div style={{background:'var(--red-soft)',border:'1px solid rgba(217,30,30,.15)',padding:'12px'}}>
            <label style={{...lbl,color:'var(--red)'}}>🔒 Precio de Costo (interno)</label>
            <input type="number" min="0" step="0.01" value={precioCosto}
              onChange={e=>setPC(parseFloat(e.target.value)||0)} style={inp} placeholder="0.00"/>
            {costosDifieren && <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--red)',marginTop:'4px'}}>Los costos actuales difieren entre variantes</div>}
            {margin !== null && (
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--green)',marginTop:'6px'}}>
                Margen detal: <strong>+€ {(precioDetal-precioCosto).toFixed(2)} ({margin}%)</strong>
              </div>
            )}
          </div>
        </div>

        <div style={{padding:'12px 20px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg2)'}}>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>
            Aplica a <strong>{variantes.length}</strong> variantes
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={onClose} style={{padding:'8px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase'}}>Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              style={{padding:'8px 18px',background:'var(--warn)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',opacity:guardando?.6:1}}>
              {guardando?'⏳ Guardando...':'✓ Aplicar a todos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function ProductosPage() {
  const { data, cargando, recargar } = useAppData() || {};
  const [buscar, setBuscar]   = useState('');
  const [cat, setCat]         = useState('');
  const [modal, setModal]     = useState(null); // null | 'nuevo' | prodObj | {type:'grupo',modelo,variantes}
  const [msgGlobal, setMsg]   = useState(null);

  // ✅ ORDEN CORRECTO: productos → categorias → filtrados → grupos
  const { productos = [] } = data || {};

  const categorias = useMemo(()=>[...new Set(productos.map(p=>p.categoria))].sort(),[productos]);

  const filtrados = useMemo(()=>productos.filter(p=>{
    const q=buscar.toLowerCase();
    return(!buscar||`${p.modelo} ${p.color} ${p.sku} ${p.categoria}`.toLowerCase().includes(q))&&(!cat||p.categoria===cat);
  }),[productos,buscar,cat]);

  // ✅ grupos DESPUÉS de filtrados — esto corrige el ReferenceError TDZ
  const grupos = useMemo(()=>{
    const map = {};
    filtrados.forEach(p=>{
      if (!map[p.modelo]) map[p.modelo] = [];
      map[p.modelo].push(p);
    });
    return map;
  },[filtrados]);

  function showMsg(type, text) { setMsg({type,text}); setTimeout(()=>setMsg(null),4000); }

  function handleSaveNuevo(count) {
    setModal(null);
    showMsg('success', `✓ ${count} variante(s) guardadas correctamente`);
    recargar();
  }

  function handleSaveEditar() {
    setModal(null);
    showMsg('success', '✓ Producto actualizado');
    setTimeout(()=>recargar(), 200);
  }

  return (
    <Shell title="Productos">
      {modal === 'nuevo' && <ModalNuevoProducto onClose={()=>setModal(null)} onSave={handleSaveNuevo}/>}
      {modal && typeof modal === 'object' && modal.type !== 'grupo' && <ModalEditarProducto prod={modal} onClose={()=>setModal(null)} onSave={handleSaveEditar}/>}
      {modal && modal.type === 'grupo' && <ModalEditarGrupo modelo={modal.modelo} variantes={modal.variantes} onClose={()=>setModal(null)} onSave={handleSaveEditar}/>}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Productos</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#555',marginTop:'2px'}}>{filtrados.length} variantes · {[...new Set(filtrados.map(p=>p.modelo))].length} modelos únicos</div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>setModal('nuevo')} style={{padding:'8px 16px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase'}}>
            + Nuevo Producto
          </button>
        </div>
      </div>

      {msgGlobal && (
        <div style={{padding:'10px 14px',marginBottom:'14px',background:msgGlobal.type==='error'?'var(--red-soft)':'var(--green-soft)',border:`1px solid ${msgGlobal.type==='error'?'rgba(217,30,30,.3)':'rgba(26,122,60,.3)'}`,color:msgGlobal.type==='error'?'var(--red)':'var(--green)',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>
          {msgGlobal.text}
        </div>
      )}

      <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',flex:1,minWidth:'200px'}}>
          <span style={{color:'#555'}}>🔍</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar modelo, color, SKU..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',width:'100%'}}/>
        </div>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'7px 10px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',minWidth:'150px'}}>
          <option value="">Todas las categorías</option>
          {categorias.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {cargando && <div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando...</div>}

      {!cargando && (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:'750px'}}>
              <thead><tr style={{background:'#efefef'}}>
                {['SKU','Categoría','Modelo','Color','Talla','P. Detal €','P. Mayor €','Costo €','Stock',''].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#444',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.map(p=>{
                  const e=estD(p.disponible);
                  return(
                    <tr key={p.sku} style={{borderBottom:'1px solid var(--border)'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)'}}>{p.sku}</td>
                      <td style={{padding:'9px 12px'}}><span style={{background:'var(--bg3)',padding:'2px 7px',fontFamily:'DM Mono,monospace',fontSize:'8px'}}>{p.categoria}</span></td>
                      <td style={{padding:'9px 12px',fontWeight:600,fontSize:'12px'}}>{p.modelo}</td>
                      <td style={{padding:'9px 12px',fontSize:'12px'}}>
                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(p.color),display:'inline-block',verticalAlign:'middle',marginRight:'4px',border:'1px solid rgba(0,0,0,.1)'}}/>
                        {p.color}
                      </td>
                      <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>{p.talla}</td>
                      <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontWeight:700,color:'var(--red)'}}>€ {p.precioDetal?.toFixed(2)}</td>
                      <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',color:'var(--warn)'}}>€ {p.precioMayor?.toFixed(2)}</td>
                      <td style={{padding:'9px 12px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>{p.precioCosto>0?`€ ${p.precioCosto?.toFixed(2)}`:'—'}</td>
                      <td style={{padding:'9px 12px'}}>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'13px',fontWeight:700,color:e==='zero'?'var(--red)':e==='low'?'var(--warn)':'var(--green)'}}>{p.disponible}</span>
                      </td>
                      <td style={{padding:'9px 12px'}}>
                        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                          <button onClick={()=>setModal(p)}
                            style={{padding:'4px 10px',background:'none',border:'1px solid var(--blue)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)',letterSpacing:'.06em',textTransform:'uppercase'}}>
                            ✏ Editar
                          </button>
                          {grupos[p.modelo]?.length > 1 && (
                            <button
                              onClick={()=>setModal({type:'grupo',modelo:p.modelo,variantes:grupos[p.modelo]})}
                              style={{padding:'4px 8px',background:'var(--warn-soft)',border:'1px solid rgba(154,71,0,.3)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--warn)',whiteSpace:'nowrap'}}
                              title={`Editar precios de los ${grupos[p.modelo]?.length} colores de ${p.modelo}`}>
                              ⚡ {grupos[p.modelo]?.length}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtrados.length && <tr><td colSpan={10} style={{textAlign:'center',padding:'40px',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}