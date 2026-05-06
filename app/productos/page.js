'use client';
import { colorHex } from '@/utils/colores';
import { useState, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { generarSku } from '@/utils/generarSku.js';

const MOBILE_CSS = `
  @media (max-width: 600px) {
    .modal-overlay { padding: 15px !important; align-items: center !important; }
    .modal-card { border-radius: 20px !important; max-height: 92vh !important; }
    .modal-header { padding: 16px 20px !important; }
    .modal-header div:first-child div:first-child { font-size: 16px !important; }
    .modal-body { padding: 16px 20px !important; gap: 12px !important; }
    .modal-footer { padding: 16px 20px !important; }
    .modal-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
    .modal-grid > div { grid-column: span 1 !important; }
    .modal-footer button { flex: 1; padding: 10px !important; font-size: 11px !important; }
    
    .kpi-grid { grid-template-columns: 1fr !important; }
    .header-row { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
    .header-btn { width: 100% !important; }
  }
`;


function estD(n){if(n<=0)return 'zero';if(n<=3)return 'low';return 'ok';}

const CATEGORIAS=['BODIES','CHAQUETA','CONJUNTO','ENTERIZO','FALDA','PANTS','SHORT','TOPS','TRAJE DE BANO','TRIKINIS','VESTIDO'];
const TALLAS=['UNICA','XS','S','M','L','XL','XXL'];
const COLORES_COMUNES=['NEGRO','BLANCO','AZUL','ROJO','VERDE','ROSA','GRIS','AMARILLO','NARANJA','MORADO','VINOTINTO','BEIGE','CORAL','CELESTE','AZUL MARINO'];
const TIPOS_TELA = [
  '', // vacío = sin especificar
  'MICRODURAZNO','ALO','SEUL','RIB','TELA JEAN','LINO','NYLON','MODAL','BAMBÚ','TELA DEPORTIVA','ENCAJE','GASA / CHIFFON','SATÉN / SEDA','LANA / POLAR','DOBLE TELA','OTRO',
];



const inp={width:'100%',padding:'12px 16px',background:'#f9fafb',border:'1px solid var(--border)',borderRadius:'12px',fontFamily:'Poppins,sans-serif',fontSize:'13px',color:'var(--ink)',outline:'none',transition:'border-color 0.2s, box-shadow 0.2s'};
const lbl={fontFamily:'DM Mono,monospace',fontSize:'10px',letterSpacing:'.1em',textTransform:'uppercase',color:'#888',display:'block',marginBottom:'6px',fontWeight:700};
const sectionBox={padding:'16px', borderRadius:'16px', border:'1px solid var(--border-soft)', marginBottom:'12px'};

// ── Modal para editar UN producto (precios, categoría, modelo, talla, color) ─────
function ModalEditarProducto({ prod, onClose, onSave }) {
  const [form, setForm] = useState({
    categoria:           prod.categoria,
    modelo:              prod.modelo,
    talla:               prod.talla,
    color:               prod.color,
    precioDetal:         prod.precioDetal,
    precioMayor:         prod.precioMayor,
    precioCosto:         prod.precioCosto || 0,
    tela:                prod.tela || '',
    minMayorista:        prod.minMayorista        ?? 6,
    modelosMinMayorista: prod.modelosMinMayorista ?? 3,
    alias:               prod.alias               || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  async function guardar() {
    if (!form.precioDetal || form.precioDetal <= 0) { setErr('Precio detal requerido'); return; }
    setGuardando(true);
    try {
      const res = await fetch(`/api/productos/${prod.sku}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          ...form,
          minMayorista:        form.minMayorista,
          modelosMinMayorista: form.modelosMinMayorista,
        }),
      }).then(r=>r.json());
      if (res.ok) onSave();
      else setErr(res.error || 'Error al guardar');
    } catch(e) { setErr('Error de conexión'); }
    setGuardando(false);
  }

  const margin = form.precioCosto > 0 && form.precioDetal > 0
    ? ((form.precioDetal - form.precioCosto) / form.precioDetal * 100).toFixed(1) : null;

  return (
    <div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'100px 20px 40px',overflowY:'auto'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-card" style={{background:'#fff', borderRadius:'28px', width:'100%',maxWidth:'500px', maxHeight:'85vh', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)', overflow:'hidden', display:'flex', flexDirection:'column'}}>
        <div className="modal-header" style={{padding:'24px 30px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center', background:'#fcfcfc'}}>
          <div>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'18px',fontWeight:900, color:'var(--ink)'}}>Editar Producto</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)',marginTop:'2px', fontWeight:700}}>{prod.sku} — {prod.color}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'32px',height:'32px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center', borderRadius:'10px'}}>✕</button>
        </div>
        <div className="modal-body" style={{padding:'24px 30px',display:'flex',flexDirection:'column',gap:'16px', maxHeight:'70vh', overflowY:'auto'}}>
          {err && <div style={{padding:'12px 16px',background:'#fee2e2',color:'#b91c1c',borderRadius:'12px',fontFamily:'Poppins,sans-serif',fontSize:'12px', fontWeight:600}}>{err}</div>}
          
          <div className="modal-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div>
              <label style={lbl}>Categoría</label>
              <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} style={inp}>
                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Talla</label>
              <select value={form.talla} onChange={e=>setForm(f=>({...f,talla:e.target.value}))} style={inp}>
                {TALLAS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label style={lbl}>Nombre del Modelo *</label>
              <input value={form.modelo} onChange={e=>setForm(f=>({...f,modelo:e.target.value}))} style={inp} placeholder="Nombre del modelo"/>
            </div>

            <div style={{gridColumn:'span 2'}}>
              <label style={lbl}>Variante de Color</label>
              <div style={{display:'flex',gap:'12px',alignItems:'center', background:'#f3f4f6', padding:'12px', borderRadius:'12px', border:'1px solid var(--border)'}}>
                <span style={{width:'32px',height:'32px',borderRadius:'10px',background:colorHex(form.color),border:'2px solid #fff',boxShadow:'0 0 0 1px var(--border)',flexShrink:0}}/>
                <input
                  list="colores-edit-lista"
                  value={form.color}
                  onChange={e=>setForm(f=>({...f,color:e.target.value.toUpperCase()}))}
                  style={{...inp, border:'none', background:'none', padding:0}}
                  placeholder="Ej: NEGRO, ROSA..."/>
              </div>
              <datalist id="colores-edit-lista">
                {COLORES_COMUNES.map(c=><option key={c} value={c}/>)}
              </datalist>
            </div>

            <div style={{gridColumn:'span 2'}}>
              <label style={lbl}>🧵 Composición / Tela</label>
              <div style={{display:'flex',gap:'8px'}}>
                <select
                  value={TIPOS_TELA.includes((form.tela||'').toUpperCase()) ? (form.tela||'').toUpperCase() : form.tela ? 'OTRO' : ''}
                  onChange={e=>{
                    if(e.target.value !== 'OTRO') setForm(f=>({...f,tela:e.target.value}));
                    else setForm(f=>({...f,tela:''}));
                  }}
                  style={{...inp,flex:1}}>
                  {TIPOS_TELA.map(t=><option key={t} value={t}>{t || '— Sin especificar'}</option>)}
                </select>
                <input
                  value={form.tela}
                  onChange={e=>setForm(f=>({...f,tela:e.target.value.toUpperCase()}))}
                  style={{...inp,flex:1}}
                  placeholder="Escribe tela personalizada..."/>
              </div>
            </div>

            <div>
              <label style={lbl}>Precio Detal €</label>
              <input type="number" min="0" step="0.01" value={form.precioDetal} onChange={e=>setForm(f=>({...f,precioDetal:parseFloat(e.target.value)||0}))} style={{...inp, fontWeight:800, color:'var(--red)'}}/>
            </div>
            <div>
              <label style={lbl}>Precio Mayor €</label>
              <input type="number" min="0" step="0.01" value={form.precioMayor} onChange={e=>setForm(f=>({...f,precioMayor:parseFloat(e.target.value)||0}))} style={{...inp, fontWeight:800, color:'var(--green)'}}/>
            </div>

            <div style={{gridColumn:'span 2', background:'rgba(245,158,11,0.03)', border:'1px solid rgba(245,158,11,0.1)', padding:'20px', borderRadius:'16px'}}>
              <label style={{...lbl,color:'#d97706'}}>⚡ Código Rápido / Alias (Búsqueda)</label>
              <input value={form.alias} onChange={e=>setForm(f=>({...f,alias:e.target.value.toUpperCase()}))} style={inp} placeholder="Ej: A, BABYML..."/>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888',marginTop:'8px'}}>
                Úsalo en el POS para buscar rápido (ej: "A ROJO")
              </div>
            </div>

            <div style={{gridColumn:'span 2', background:'rgba(239,68,68,0.03)', border:'1px solid rgba(239,68,68,0.1)', padding:'20px', borderRadius:'16px'}}>
              <label style={{...lbl,color:'#b91c1c'}}>🔒 Precio de Costo (Interno)</label>
              <input type="number" min="0" step="0.01" value={form.precioCosto} onChange={e=>setForm(f=>({...f,precioCosto:parseFloat(e.target.value)||0}))} style={inp} placeholder="0.00"/>
              {margin !== null && (
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#15803d',marginTop:'10px', fontWeight:700}}>
                  Margen de ganancia: <strong style={{fontSize:'13px'}}>+€ {(form.precioDetal-form.precioCosto).toFixed(2)} ({margin}%)</strong>
                </div>
              )}
            </div>

            <div style={{gridColumn:'span 2', background:'rgba(59,130,246,0.03)', border:'1px solid rgba(59,130,246,0.1)', padding:'20px', borderRadius:'16px'}}>
              <label style={{...lbl,color:'var(--blue)',marginBottom:'12px'}}>⚡ Configuración Mayorista</label>
              <div className="modal-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'15px'}}>
                <div>
                  <label style={{...lbl, fontSize:'9px'}}>Mín. piezas pedido</label>
                  <input type="number" min="1" value={form.minMayorista}
                    onChange={e=>setForm(f=>({...f,minMayorista:parseInt(e.target.value)||6}))}
                    style={inp}/>
                </div>
                <div>
                  <label style={{...lbl, fontSize:'9px'}}>Mín. piezas modelo</label>
                  <input type="number" min="1" value={form.modelosMinMayorista}
                    onChange={e=>setForm(f=>({...f,modelosMinMayorista:parseInt(e.target.value)||3}))}
                    style={inp}/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{padding:'20px 30px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'12px',background:'#fcfcfc'}}>
          <button onClick={onClose} style={{padding:'12px 20px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700, borderRadius:'14px', color:'#666'}}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{padding:'12px 24px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:800, borderRadius:'14px', opacity:guardando?.6:1, boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
            {guardando?'Sincronizando...':'✓ Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal para agregar color nuevo a un modelo existente ──────────────────
function ModalAgregarColor({ prod, onClose, onSave }) {
  // prod tiene: categoria, modelo, talla, precioDetal, precioMayor, precioCosto, tela
  const [colores,   setColores]   = useState([{ color: '', stock: 0 }]);
  const [guardando, setGuardando] = useState(false);
  const [err,       setErr]       = useState('');
  const [ok,        setOk]        = useState('');

  function updateColor(idx, field, val) {
    setColores(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  }
  function addRow()       { setColores(prev => [...prev, { color: '', stock: 0 }]); }
  function removeRow(idx) { if (colores.length <= 1) return; setColores(prev => prev.filter((_, i) => i !== idx)); }

  async function guardar() {
    const validos = colores.filter(c => c.color.trim());
    if (!validos.length) { setErr('Escribe al menos un color'); return; }
    setErr(''); setGuardando(true);
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria:   prod.categoria,
          modelo:      prod.modelo,
          talla:       prod.talla,
          precioDetal: prod.precioDetal,
          precioMayor: prod.precioMayor || 0,
          precioCosto: prod.precioCosto || 0,
          tela:        prod.tela || '',
          colores:     validos.map(c => ({ color: c.color.trim().toUpperCase(), stockInicial: parseInt(c.stock) || 0 })),
        }),
      }).then(r => r.json());

      if (res.ok) {
        setOk(`✓ ${res.skus?.length || validos.length} color(es) agregado(s) correctamente`);
        setTimeout(() => { onSave(); }, 1400);
      } else {
        setErr(res.error || 'Error al guardar');
      }
    } catch { setErr('Error de conexión'); }
    setGuardando(false);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'100px 20px 40px',overflowY:'auto'}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{background:'#fff', borderRadius:'28px', width:'100%',maxWidth:'500px', maxHeight:'85vh', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)', overflow:'hidden', display:'flex', flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'24px 30px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start', background:'#fcfcfc'}}>
          <div>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'18px',fontWeight:900, color:'var(--ink)'}}>＋ Agregar Color</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'3px',lineHeight:1.7}}>
              <span style={{color:'var(--blue)',fontWeight:700}}>{prod.modelo}</span>
              {' · '}{prod.categoria}{' · '}{prod.talla}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'32px',height:'32px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center', borderRadius:'10px'}}>✕</button>
        </div>

        {/* Body */}
        <div style={{padding:'24px 30px',display:'flex',flexDirection:'column',gap:'16px'}}>
          {err && <div style={{padding:'12px 16px',background:'#fee2e2',color:'#b91c1c',borderRadius:'12px',fontFamily:'Poppins,sans-serif',fontSize:'12px', fontWeight:600}}>{err}</div>}
          {ok  && <div style={{padding:'12px 16px',background:'#f0fdf4',color:'#15803d',borderRadius:'12px',fontFamily:'Poppins,sans-serif',fontSize:'12px', fontWeight:700}}>{ok}</div>}

          <div style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#888',lineHeight:1.6}}>
            Se creará una nueva variante por cada color. El SKU se genera automáticamente heredando los precios del modelo: <strong style={{color:'var(--red)'}}>€{prod.precioDetal?.toFixed(2)}</strong> detal.
          </div>

          <div style={{background:'#fcfcfc', border:'1px solid var(--border)', borderRadius:'20px', overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 100px 40px',gap:'0',padding:'12px 20px',background:'#f3f4f6',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888',fontWeight:800, textTransform:'uppercase'}}>
              <span>Color</span><span style={{textAlign:'center'}}>Stock</span><span/>
            </div>
            {colores.map((c, idx) => (
              <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 100px 40px',gap:'12px',padding:'12px 20px',borderBottom:'1px solid var(--border-soft)',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{width:'24px',height:'24px',borderRadius:'8px',background:colorHex(c.color||''),border:'2px solid #fff', boxShadow:'0 0 0 1px var(--border)',flexShrink:0}}/>
                  <input
                    list="colores-agregar-lista"
                    value={c.color}
                    onChange={e=>updateColor(idx,'color',e.target.value.toUpperCase())}
                    placeholder="Ej: ROSA"
                    style={{...inp, padding:'10px 14px'}}/>
                </div>
                <input
                  type="number" min="0" value={c.stock}
                  onChange={e=>updateColor(idx,'stock',e.target.value)}
                  placeholder="0"
                  style={{...inp, padding:'10px 14px', textAlign:'center'}}/>
                <button onClick={()=>removeRow(idx)} disabled={colores.length<=1}
                  style={{width:'32px',height:'32px',background:'none',border:'none',cursor:'pointer',fontSize:'14px',color:'#999',opacity:colores.length<=1?.3:1}}>✕</button>
              </div>
            ))}
            <button onClick={addRow}
              style={{display:'block',width:'100%',padding:'14px',background:'none',border:'none',borderTop:'1px dashed var(--border)',color:'var(--blue)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:800,textAlign:'center'}}>
              + Añadir otra variante de color
            </button>
          </div>
          <datalist id="colores-agregar-lista">
            {COLORES_COMUNES.map(c=><option key={c} value={c}/>)}
          </datalist>
        </div>

        <div style={{padding:'20px 30px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'12px',background:'#fcfcfc'}}>
          <button onClick={onClose} style={{padding:'12px 20px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700, borderRadius:'14px', color:'#666'}}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando || !!ok}
            style={{padding:'12px 24px',background:'var(--blue)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:800, borderRadius:'14px', opacity:(guardando||!!ok)?.6:1, boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
            {guardando ? 'Creando...' : `✓ Crear ${colores.filter(c=>c.color.trim()).length} Variante(s)`}
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
  const [alias, setAlias]           = useState('');
  const [guardando, setGuardando]   = useState(false);
  const [err, setErr]               = useState('');

  // Sugerencia de alias basada en iniciales
  const sugerirAlias = (val) => {
    if (!val) return '';
    return val.split(' ').map(w => w[0]).join('').toUpperCase();
  };

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
          alias: alias.trim().toUpperCase(),
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
    <div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'100px 20px 40px',overflowY:'auto'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-card" style={{background:'#fff',width:'100%',maxWidth:'580px',borderRadius:'28px',maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)'}}>
        <div className="modal-header" style={{padding:'24px 30px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0, background:'#fcfcfc'}}>
          <div>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'18px',fontWeight:900, color:'var(--ink)'}}>Nuevo Producto</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'2px'}}>Creación de múltiples variantes por modelo</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'32px',height:'32px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center', borderRadius:'10px'}}>✕</button>
        </div>

        <div className="modal-body" style={{padding:'24px 30px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'16px'}}>
          {err && <div style={{padding:'12px 16px',background:'#fee2e2',color:'#b91c1c',borderRadius:'12px',fontFamily:'Poppins,sans-serif',fontSize:'12px', fontWeight:600}}>{err}</div>}

          <div className="modal-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div>
              <label style={lbl}>Categoría *</label>
              <select value={categoria} onChange={e=>setCategoria(e.target.value)} style={inp}>
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
              <select value={talla} onChange={e=>setTalla(e.target.value)} style={inp}>
                {TALLAS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label style={lbl}>Modelo / Nombre *</label>
              <input value={modelo} 
                onChange={e=>{
                  const v = e.target.value;
                  setModelo(v);
                  if(!alias) setAlias(sugerirAlias(v));
                }} 
                style={inp} placeholder="Ej: Jacket Slim, Body Licra..."/>
            </div>
            <div style={{gridColumn:'span 2', background:'rgba(245,158,11,0.03)', border:'1.5px dashed rgba(245,158,11,0.3)', padding:'15px', borderRadius:'16px'}}>
              <label style={{...lbl, color:'#d97706'}}>⚡ Alias Sugerido / Código Rápido</label>
              <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                <input value={alias} onChange={e=>setAlias(e.target.value.toUpperCase())} style={{...inp, flex:1, border:'1px solid #fcd34d'}} placeholder="Ej: BTML"/>
                <button onClick={()=>setAlias(sugerirAlias(modelo))} style={{padding:'8px 12px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'10px', cursor:'pointer', fontSize:'10px', fontWeight:800}}>↺ REINICIAR</button>
              </div>
              <div style={{fontSize:'9px', color:'#92400e', marginTop:'6px', fontFamily:'DM Mono,monospace'}}>Para buscar como "BTML NEGRO" en el punto de venta</div>
            </div>
            <div>
              <label style={lbl}>Precio Detal € *</label>
              <input type="number" min="0" step="0.01" value={precioDetal} onChange={e=>setPD(e.target.value)} style={{...inp, color:'var(--red)', fontWeight:800}} placeholder="0.00"/>
            </div>
            <div>
              <label style={lbl}>Precio Mayor €</label>
              <input type="number" min="0" step="0.01" value={precioMayor} onChange={e=>setPM(e.target.value)} style={{...inp, color:'var(--green)', fontWeight:800}} placeholder="0.00"/>
            </div>
            <div style={{gridColumn:'span 2', background:'rgba(239,68,68,0.03)', border:'1px solid rgba(239,68,68,0.1)', padding:'20px', borderRadius:'16px'}}>
              <label style={{...lbl,color:'#b91c1c'}}>🔒 Precio de Costo (Interno)</label>
              <input type="number" min="0" step="0.01" value={precioCosto} onChange={e=>setPC(e.target.value)} style={inp} placeholder="0.00"/>
              {margin !== null && precioDetal && (
                <div style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#15803d',marginTop:'10px', fontWeight:700}}>
                  Margen proyectado: <strong style={{fontSize:'14px'}}>+€ {(precioDetal-precioCosto).toFixed(2)} ({margin}%)</strong>
                </div>
              )}
            </div>
          </div>

          {/* Colores */}
          <div>
            <label style={{...lbl,marginBottom:'12px'}}>Variantes y Stock Inicial *</label>
            <div style={{background:'#fcfcfc', border:'1px solid var(--border)', borderRadius:'20px', overflow:'hidden'}}>
              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',background:'#f3f4f6',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888', fontWeight:800, textTransform:'uppercase'}}>
                <span>Variante / SKU Auto / Stock</span>
                <span style={{color:'var(--red)'}}>{colores.filter(c=>c.color.trim()).length} Colores</span>
              </div>
              {colores.map((c, idx) => (
                <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 120px 80px 40px',gap:'12px',padding:'12px 20px',borderBottom:'1px solid var(--border-soft)',alignItems:'center'}}>
                  <input
                    list="colores-lista"
                    value={c.color}
                    onChange={e=>updateColor(idx,'color',e.target.value.toUpperCase())}
                    placeholder="Color"
                    style={{...inp, padding:'10px 14px'}}/>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis'}}>
                    {c.color.trim() && catReal && modelo ? genSku(c.color) : '—'}
                  </div>
                  <input type="number" min="0" value={c.stock} onChange={e=>updateColor(idx,'stock',e.target.value)}
                    placeholder="0" style={{...inp, padding:'10px 14px', textAlign:'center'}}/>
                  <button onClick={()=>removeColor(idx)} disabled={colores.length<=1}
                    style={{width:'32px',height:'32px',background:'none',border:'none',cursor:'pointer',fontSize:'14px',color:'#999',opacity:colores.length<=1?.3:1}}>✕</button>
                </div>
              ))}
              <button onClick={addColor}
                style={{display:'block',width:'100%',padding:'14px',background:'none',border:'none',borderTop:'1px dashed var(--border)',color:'var(--red)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:800,textAlign:'center'}}>
                + Añadir otro color
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{padding:'20px 30px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'12px',background:'#fcfcfc',flexShrink:0}}>
          <button onClick={onClose} style={{padding:'12px 20px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700, borderRadius:'14px', color:'#666'}}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{padding:'12px 24px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:800, borderRadius:'14px', opacity:guardando?.6:1, boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
            {guardando?'Creando...':'✓ Guardar Producto Completo'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Modal edición masiva por modelo — cambia precio detal/mayor/costo a todos los SKUs del grupo ──
function ModalEditarGrupo({ modelo, variantes, onClose, onSave }) {
  const base = variantes[0] || {};
  const [nuevoModelo, setNuevoModelo] = useState(modelo);
  const [precioDetal, setPD] = useState(base.precioDetal  || 0);
  const [precioMayor, setPM] = useState(base.precioMayor  || 0);
  const [precioCosto, setPC] = useState(base.precioCosto  || 0);
  const [tela,        setTela] = useState(base.tela || '');
  const [editarTela,  setEditarTela] = useState(false);
  const [minMayorista,        setMinMay] = useState(base.minMayorista        ?? 6);
  const [modelosMinMayorista, setMinMod] = useState(base.modelosMinMayorista ?? 3);
  const [alias, setAlias] = useState(base.alias || '');
  const [editarMayorista, setEditarMay] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');
  const [ok,  setOk]  = useState('');

  const detalesDifieren = [...new Set(variantes.map(v=>v.precioDetal))].length > 1;
  const mayoresDifieren = [...new Set(variantes.map(v=>v.precioMayor))].length > 1;
  const costosDifieren  = [...new Set(variantes.map(v=>v.precioCosto))].length > 1;
  const telasDifieren   = [...new Set(variantes.map(v=>v.tela||''))].length > 1;
  const telaActual      = telasDifieren ? 'Variado' : (base.tela || '— Sin especificar');

  const margin = precioCosto > 0 && precioDetal > 0
    ? ((precioDetal - precioCosto) / precioDetal * 100).toFixed(1) : null;

  async function guardar() {
    if (!nuevoModelo.trim()) { setErr('El nombre del modelo no puede estar vacío'); return; }
    if (precioDetal <= 0) { setErr('Precio detal requerido'); return; }
    setGuardando(true); setErr('');
    try {
      const promises = variantes.map(v =>
        fetch(`/api/productos/${v.sku}`, {
          method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            precioDetal, precioMayor, precioCosto,
            categoria: v.categoria, modelo: nuevoModelo.trim().toUpperCase(), talla: v.talla,
            alias: alias.trim().toUpperCase(),
            ...(editarTela && tela !== undefined ? { tela } : {}),
            ...(editarMayorista ? { minMayorista, modelosMinMayorista } : {}),
          }),
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

  // colorHex debe estar disponible en el scope (ya está en el archivo original)
  return (
    <div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'100px 20px 40px',overflowY:'auto'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-card" style={{background:'#fff', borderRadius:'28px', width:'100%',maxWidth:'520px', maxHeight:'85vh', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)', overflow:'hidden', display:'flex', flexDirection:'column'}}>

        <div className="modal-header" style={{padding:'24px 30px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start', background:'#fcfcfc'}}>
          <div>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'18px',fontWeight:900, color:'var(--ink)'}}>✏️ Editar grupo completo</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--warn)',marginTop:'3px', fontWeight:700}}>
              {modelo} · {variantes.length} variante{variantes.length!==1?'s':''}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'32px',height:'32px',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center', borderRadius:'10px'}}>✕</button>
        </div>

        <div className="modal-body" style={{padding:'24px 30px',display:'flex',flexDirection:'column',gap:'16px', maxHeight:'70vh', overflowY:'auto'}}>
          {err && <div style={{padding:'12px 16px',background:'#fee2e2',color:'#b91c1c',borderRadius:'12px',fontFamily:'Poppins,sans-serif',fontSize:'12px', fontWeight:600}}>{err}</div>}
          {ok  && <div style={{padding:'12px 16px',background:'#f0fdf4',color:'#15803d',borderRadius:'12px',fontFamily:'Poppins,sans-serif',fontSize:'12px', fontWeight:700}}>{ok}</div>}

          {(detalesDifieren||mayoresDifieren||costosDifieren) && (
            <div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fef3c7',borderRadius:'12px',fontFamily:'Poppins,sans-serif',fontSize:'11px',color:'#92400e',lineHeight:1.5, fontWeight:600}}>
              ⚠️ Las variantes tienen precios distintos. Al guardar se unificarán todos con los valores que ingreses a continuación.
            </div>
          )}

          <div>
            <label style={lbl}>Nombre del Modelo del Grupo</label>
            <input value={nuevoModelo} onChange={e=>setNuevoModelo(e.target.value)} style={inp} placeholder="Ej: BODY LICRA SEUL" />
          </div>

          <div style={{background:'rgba(245,158,11,0.03)', border:'1px solid rgba(245,158,11,0.1)', padding:'20px', borderRadius:'16px'}}>
            <label style={{...lbl,color:'#d97706'}}>⚡ Código Rápido / Alias para todo el grupo</label>
            <input value={alias} onChange={e=>setAlias(e.target.value.toUpperCase())} style={inp} placeholder="Ej: A, BABYML..."/>
          </div>

          <div>
            <label style={lbl}>Variantes afectadas ({variantes.length})</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',padding:'12px',background:'#f9fafb',border:'1px solid var(--border)', borderRadius:'12px'}}>
              {variantes.map(v=>(
                <span key={v.sku} style={{background:'#fff',border:'1px solid var(--border-soft)',padding:'4px 10px', borderRadius:'8px', fontFamily:'DM Mono,monospace',fontSize:'10px',display:'flex',alignItems:'center',gap:'6px', fontWeight:700}}>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(v.color),border:'1px solid rgba(0,0,0,.1)',display:'inline-block'}}/>
                  {v.color}
                </span>
              ))}
            </div>
          </div>

          <div className="modal-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'15px'}}>
            <div>
              <label style={lbl}>Precio Detal €</label>
              <input type="number" min="0" step="0.01" value={precioDetal}
                onChange={e=>setPD(parseFloat(e.target.value)||0)} style={{...inp, fontWeight:800, color:'var(--red)'}}/>
            </div>
            <div>
              <label style={lbl}>Precio Mayor €</label>
              <input type="number" min="0" step="0.01" value={precioMayor}
                onChange={e=>setPM(parseFloat(e.target.value)||0)} style={{...inp, fontWeight:800, color:'var(--green)'}}/>
            </div>
          </div>

          <div style={{background:'rgba(239,68,68,0.03)', border:'1px solid rgba(239,68,68,0.1)', padding:'20px', borderRadius:'16px'}}>
            <label style={{...lbl,color:'#b91c1c'}}>🔒 Precio de Costo (Interno)</label>
            <input type="number" min="0" step="0.01" value={precioCosto}
              onChange={e=>setPC(parseFloat(e.target.value)||0)} style={inp} placeholder="0.00"/>
            {margin !== null && (
              <div style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#15803d',marginTop:'10px', fontWeight:700}}>
                Margen unificado: <strong style={{fontSize:'14px'}}>+€ {(precioDetal-precioCosto).toFixed(2)} ({margin}%)</strong>
              </div>
            )}
          </div>

          <div style={{border:'1px solid var(--border)',borderRadius:'16px',overflow:'hidden'}}>
            <button
              onClick={()=>setEditarTela(v=>!v)}
              style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%',padding:'14px 20px',background:editarTela?'rgba(59,130,246,0.05)':'#fcfcfc',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:800,textAlign:'left'}}>
              <span>🧵 Editar Tela en Masa</span>
              <span style={{display:'flex',gap:'12px',alignItems:'center'}}>
                {!editarTela && <span style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:telasDifieren?'var(--warn)':'#999',fontWeight:700}}>{telaActual}</span>}
                <span style={{fontSize:'12px',color:'#999'}}>{editarTela?'▲':'▼'}</span>
              </span>
            </button>
            {editarTela && (
              <div style={{padding:'20px',borderTop:'1px solid var(--border)',background:'#fff'}}>
                <div style={{display:'flex',gap:'8px'}}>
                  <select
                    value={TIPOS_TELA.includes((tela||'').toUpperCase()) ? (tela||'').toUpperCase() : tela ? 'OTRO' : ''}
                    onChange={e=>{ if(e.target.value !== 'OTRO') setTela(e.target.value); }}
                    style={{...inp,flex:1}}>
                    {TIPOS_TELA.map(t=><option key={t} value={t}>{t || '— Sin especificar'}</option>)}
                  </select>
                  <input
                    value={tela}
                    onChange={e=>setTela(e.target.value.toUpperCase())}
                    style={{...inp,flex:1}}
                    placeholder="Escribe tela..."/>
                </div>
              </div>
            )}
          </div>

          <div style={{border:'1px solid rgba(59,130,246,0.2)',borderRadius:'16px',overflow:'hidden'}}>
            <button
              onClick={()=>setEditarMay(v=>!v)}
              style={{display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%',padding:'14px 20px',background:editarMayorista?'rgba(59,130,246,0.05)':'#f0f9ff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:800,textAlign:'left',color:'var(--blue)'}}>
              <span>⚡ Reglas Mayoristas Masivas</span>
              <span style={{display:'flex',gap:'12px',alignItems:'center'}}>
                <span style={{fontSize:'12px',color:'#999'}}>{editarMayorista?'▲':'▼'}</span>
              </span>
            </button>
            {editarMayorista && (
              <div style={{padding:'20px',borderTop:'1px solid rgba(59,130,246,0.1)',background:'#fff'}}>
                <div className="modal-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'15px'}}>
                  <div>
                    <label style={lbl}>Mín. piezas pedido</label>
                    <input type="number" min="1" value={minMayorista}
                      onChange={e=>setMinMay(parseInt(e.target.value)||6)}
                      style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>Mín. piezas modelo</label>
                    <input type="number" min="1" value={modelosMinMayorista}
                      onChange={e=>setMinMod(parseInt(e.target.value)||3)}
                      style={inp}/>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{padding:'20px 30px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fcfcfc'}}>
          <div style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#999', fontWeight:700}}>
            Afectará a <strong>{variantes.length}</strong> variantes
          </div>
          <div className="modal-footer" style={{display:'flex',gap:'12px'}}>
            <button onClick={onClose} style={{padding:'12px 20px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700, borderRadius:'14px', color:'#666'}}>Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              style={{padding:'12px 24px',background:'var(--warn)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:800, borderRadius:'14px', boxShadow:'0 4px 12px rgba(0,0,0,0.1)', opacity:guardando?.6:1}}>
              {guardando?'Aplicando...':'✓ Actualizar Todo'}
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
  const [modal, setModal]     = useState(null); // null | 'nuevo' | prodObj | {type:'grupo',...} | {type:'agregarColor', prod}
  const [msgGlobal, setMsg]   = useState(null);

  // ✅ ORDEN CORRECTO: productos → categorias → filtrados → grupos
  const { productos = [] } = data || {};

  const categorias = useMemo(()=>[...new Set(productos.map(p=>p.categoria))].sort(),[productos]);

  const filtrados = useMemo(()=>productos.filter(p=>{
    if (!buscar && !cat) return true;
    const q = buscar.toLowerCase();
    const words = q.split(' ').filter(w => w.length > 0);
    const target = `${p.modelo} ${p.color} ${p.sku} ${p.categoria} ${p.alias || ''}`.toLowerCase();
    const targetWords = target.split(/[\s\-_/.]+/);
    const matchBusqueda = !buscar || words.every(word => targetWords.some(tw => tw.startsWith(word)));
    const matchCat = !cat || p.categoria === cat;
    return matchBusqueda && matchCat;
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

  async function handleDelete(p) {
    if (!window.confirm(`¿Eliminar "${p.modelo} — ${p.color}" (${p.sku})?\n\nEsta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/productos/${encodeURIComponent(p.sku)}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) {
        showMsg('success', `✓ ${p.sku} eliminado`);
        setTimeout(() => recargar(), 200);
      } else {
        showMsg('error', 'Error al eliminar: ' + (res.error || 'desconocido'));
      }
    } catch {
      showMsg('error', 'Error de conexión al eliminar');
    }
  }

  return (
    <Shell title="Productos">
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }} />
      {modal === 'nuevo' && <ModalNuevoProducto onClose={()=>setModal(null)} onSave={handleSaveNuevo}/>}
      {modal && typeof modal === 'object' && modal.type === 'agregarColor' && <ModalAgregarColor prod={modal.prod} onClose={()=>setModal(null)} onSave={handleSaveEditar}/>}
      {modal && typeof modal === 'object' && modal.type !== 'grupo' && modal.type !== 'agregarColor' && <ModalEditarProducto prod={modal} onClose={()=>setModal(null)} onSave={handleSaveEditar}/>}
      {modal && modal.type === 'grupo' && <ModalEditarGrupo modelo={modal.modelo} variantes={modal.variantes} onClose={()=>setModal(null)} onSave={handleSaveEditar}/>}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'15px'}}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'16px',fontWeight:800, textTransform: 'uppercase', letterSpacing: '.05em'}}>Catálogo de Productos</div>
            <span style={{fontSize:'10px', color:'var(--blue)', background: 'rgba(59,130,246,0.1)', padding: '2px 10px', borderRadius: '12px', fontWeight: 800}}>● {productos.length} SKUS</span>
          </div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>Gestión maestra de precios, categorías y variantes</div>
        </div>
        <button onClick={()=>setModal('nuevo')} style={{padding:'12px 24px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:800, borderRadius:'16px', boxShadow:'0 4px 15px rgba(0,0,0,0.1)', textTransform:'uppercase'}}>
          + NUEVO PRODUCTO
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'16px',marginBottom:'30px'}}>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'8px'}}>Modelos Únicos</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--ink)'}}>{[...new Set(productos.map(p=>p.modelo))].length}</div>
         </div>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'8px'}}>Variantes de Color</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--blue)'}}>{productos.length}</div>
         </div>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'8px'}}>Precio Promedio</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--green)'}}>
              € {(productos.reduce((a,p)=>a+(p.precioDetal||0),0) / (productos.length||1)).toFixed(2)}
            </div>
         </div>
      </div>

      {msgGlobal && (
        <div style={{padding:'12px 18px',marginBottom:'24px',background:msgGlobal.type==='error'?'#fee2e2':'#f0fdf4', borderRadius:'16px', border:`1px solid ${msgGlobal.type==='error'?'#fecaca':'#bbf7d0'}`,color:msgGlobal.type==='error'?'#b91c1c':'#15803d',fontFamily:'Poppins,sans-serif',fontSize:'13px', fontWeight:600}}>
          {msgGlobal.text}
        </div>
      )}

      <div style={{display:'flex',gap:'12px',marginBottom:'24px',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',background:'#fff',padding:'10px 18px',borderRadius:'16px',border:'1px solid var(--border)',flex:1,minWidth:'250px', boxShadow:'0 2px 8px rgba(0,0,0,0.02)'}}>
          <span style={{fontSize:'16px', opacity:0.5}}>🔍</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar modelo, color, SKU..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'13px',color:'#111',width:'100%'}}/>
        </div>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{padding:'10px 15px',background:'#fff',borderRadius:'16px',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,outline:'none',minWidth:'180px', cursor:'pointer'}}>
          <option value="">Todas las categorías</option>
          {categorias.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {cargando && <div style={{textAlign:'center',padding:'80px',fontFamily:'Poppins,sans-serif',fontSize:'14px',color:'#aaa', fontWeight:600}}>
          <div style={{fontSize:'24px', marginBottom:'10px'}}>⏳</div>
          Sincronizando catálogo...
      </div>}

      {!cargando && (
        <div style={{background:'#fff', borderRadius:'24px', border:'1px solid var(--border)', overflow:'hidden', boxShadow:'0 8px 25px rgba(0,0,0,0.04)'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:'900px'}}>
              <thead><tr style={{background:'#f9fafb', borderBottom:'1px solid var(--border)'}}>
                {['SKU','Categoría','Modelo','Alias','Tela','Color','Talla','Precio Detal','Precio Mayor','Stock',''].map(h=>(
                  <th key={h} style={{padding:'16px 20px',textAlign:'left',fontFamily:'Poppins,sans-serif',fontSize:'10px',fontWeight:800,letterSpacing:'.05em',textTransform:'uppercase',color:'#aaa',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.map(p=>{
                  const e=estD(p.disponible);
                  return(
                    <tr key={p.sku} className="product-row" style={{borderBottom:'1px solid var(--border-soft)', transition:'background 0.2s'}}>
                      <td style={{padding:'14px 20px',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--blue)', fontWeight:700}}>{p.sku}</td>
                      <td style={{padding:'14px 20px'}}><span style={{background:'var(--bg3)',padding:'4px 10px', borderRadius:'8px', fontFamily:'DM Mono,monospace',fontSize:'9px', fontWeight:800, textTransform:'uppercase', color:'#666'}}>{p.categoria}</span></td>
                      <td style={{padding:'14px 20px',fontFamily:'Poppins,sans-serif', fontWeight:700,fontSize:'13px', color:'var(--ink)'}}>{p.modelo}</td>
                      <td style={{padding:'14px 20px'}}>
                        {p.alias ? <span style={{background:'rgba(245,158,11,0.1)', color:'#d97706', padding:'4px 8px', borderRadius:'6px', fontFamily:'DM Mono,monospace', fontSize:'10px', fontWeight:900}}>{p.alias}</span> : <span style={{color:'#ccc'}}>—</span>}
                      </td>
                      <td style={{padding:'14px 20px',fontFamily:'Poppins,sans-serif',fontSize:'11px',color:'#888', fontWeight:600}}>{p.tela || '—'}</td>
                      <td style={{padding:'14px 20px',fontFamily:'Poppins,sans-serif',fontSize:'12px', fontWeight:700, color:'var(--ink)'}}>
                        <span style={{width:'10px',height:'10px',borderRadius:'50%',background:colorHex(p.color),display:'inline-block',verticalAlign:'middle',marginRight:'8px',border:'2px solid #fff', boxShadow:'0 0 0 1px var(--border)'}}/>
                        {p.color}
                      </td>
                      <td style={{padding:'14px 20px',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#777', fontWeight:800}}>{p.talla}</td>
                      <td style={{padding:'14px 20px',fontFamily:'Poppins,sans-serif',fontWeight:900,color:'var(--red)', fontSize:'14px'}}>€ {p.precioDetal?.toFixed(2)}</td>
                      <td style={{padding:'14px 20px',fontFamily:'Poppins,sans-serif',color:'var(--green)', fontWeight:800, fontSize:'12px'}}>€ {p.precioMayor?.toFixed(2)}</td>
                      <td style={{padding:'14px 20px'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                           <span style={{fontFamily:'Poppins,sans-serif',fontSize:'16px',fontWeight:900,color:e==='zero'?'var(--red)':e==='low'?'var(--warn)':'var(--green)'}}>{p.disponible}</span>
                           <span style={{width:'6px', height:'6px', borderRadius:'50%', background:e==='zero'?'var(--red)':e==='low'?'var(--warn)':'var(--green)'}}></span>
                        </div>
                      </td>
                      <td style={{padding:'14px 20px'}}>
                        <div style={{display:'flex',gap:'6px',alignItems:'center', justifyContent:'flex-end'}}>
                          <button onClick={()=>setModal(p)}
                            style={{padding:'6px 14px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'10px',color:'var(--blue)', fontWeight:800, textTransform:'uppercase'}}>
                            ✏ Editar
                          </button>
                          <button onClick={()=>setModal({type:'agregarColor', prod:p})}
                            title="Agregar nuevo color a este modelo"
                            style={{padding:'6px 14px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'10px',color:'var(--green)', fontWeight:800, textTransform:'uppercase'}}>
                            ＋ Color
                          </button>
                          {grupos[p.modelo]?.length > 1 && (
                            <button
                              onClick={()=>setModal({type:'grupo',modelo:p.modelo,variantes:grupos[p.modelo]})}
                              style={{padding:'6px 10px',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'10px',color:'var(--warn)', fontWeight:800}}
                              title={`Editar precios de los ${grupos[p.modelo]?.length} colores de ${p.modelo}`}>
                              ⚡ {grupos[p.modelo]?.length}
                            </button>
                          )}
                          <button onClick={()=>handleDelete(p)}
                            style={{padding:'6px',background:'none',border:'none',cursor:'pointer',fontSize:'14px',color:'var(--red)', opacity:0.6}}
                            title={`Eliminar ${p.sku}`}>
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtrados.length && <tr><td colSpan={10} style={{textAlign:'center',padding:'80px',color:'#aaa',fontFamily:'Poppins,sans-serif',fontSize:'14px', fontWeight:600}}>
                   <div style={{fontSize:'32px', marginBottom:'10px'}}>📦</div>
                   Sin resultados para esta búsqueda
                </td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .product-row:hover { background: #fcfcfc; }
      ` }} />
    </Shell>
  );
}