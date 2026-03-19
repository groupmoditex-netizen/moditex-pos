'use client';
import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/Shell';

const COLOR_MAP={BLANCO:'#d0d0d0',NEGRO:'#1a1a1a',AZUL:'#3b6fd4',ROJO:'#d63b3b',VERDE:'#2d9e4a',ROSA:'#f07aa0',GRIS:'#6b7280',AMARILLO:'#f5c842',NARANJA:'#f57c42',MORADO:'#7c4fd4',VINOTINTO:'#8b2035',BEIGE:'#d4b896',CORAL:'#f26e5b',CELESTE:'#7ec8e3'};
function colorHex(n){const k=(n||'').toUpperCase().trim();return COLOR_MAP[k]||COLOR_MAP[k.split(' ')[0]]||'#9ca3af';}

const TALLAS_OPT = ['TODAS','UNICA','XS','S','M','L','XL','XXL'];
const TIPOS_TELA = ['ALGODÓN','LICRA / SPANDEX','POLIÉSTER','VISCOSA / RAYÓN','TELA JEAN / DENIM','LINO','NYLON','MODAL','BAMBÚ','TELA DEPORTIVA','ENCAJE','GASA / CHIFFON','SATÉN / SEDA','LANA / POLAR','DOBLE TELA'];

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'4px'};

/* ══════════════════════════════════════════════════════════════
   MODAL RECETA — crear / editar
══════════════════════════════════════════════════════════════ */
function ModalReceta({ receta, onClose, onSave }) {
  const esNueva = !receta;
  const [form, setForm] = useState(receta ? {
    modelo:            receta.modelo || '',
    talla:             receta.talla  || 'TODAS',
    tela:              receta.tela   || '',
    color_tela:        receta.color_tela || 'SEGUN_PRENDA',
    metros_por_prenda: receta.metros_por_prenda || '',
    ancho_tela:        receta.ancho_tela || 1.50,
    precio_metro:      receta.precio_metro || '',
    otros_costos:      receta.otros_costos || '',
    observaciones:     receta.observaciones || '',
    sku_ref:           receta.sku_ref || '',
  } : {
    modelo:'', talla:'TODAS', tela:'', color_tela:'SEGUN_PRENDA',
    metros_por_prenda:'', ancho_tela:1.50,
    precio_metro:'', otros_costos:'', observaciones:'', sku_ref:'',
  });
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  // Cálculo de costo estimado
  const costoTela  = (parseFloat(form.metros_por_prenda)||0) * (parseFloat(form.precio_metro)||0);
  const costoTotal = costoTela + (parseFloat(form.otros_costos)||0);

  async function guardar() {
    if (!form.modelo.trim())          { setErr('Modelo requerido'); return; }
    if (!form.tela.trim())            { setErr('Tipo de tela requerido'); return; }
    if (!form.metros_por_prenda || parseFloat(form.metros_por_prenda) <= 0) { setErr('Metros por prenda requerido'); return; }
    setGuardando(true);
    try {
      const url    = esNueva ? '/api/recetas' : `/api/recetas/${receta.id}`;
      const method = esNueva ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method, headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form),
      }).then(r=>r.json());
      if (res.ok) onSave();
      else setErr(res.error || 'Error al guardar');
    } catch(e) { setErr('Error de conexión'); }
    setGuardando(false);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',overflowY:'auto'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'560px',borderTop:'2px solid var(--green)',maxHeight:'96vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>

        <div style={{padding:'14px 20px 12px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>
              {esNueva ? '🧵 Nueva Receta' : '✏️ Editar Receta'}
            </div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',marginTop:'2px'}}>
              Metros de tela necesarios por prenda para el plan de producción
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'26px',height:'26px',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        <div style={{padding:'16px 20px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:'13px'}}>
          {err && <div style={{padding:'8px 12px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{err}</div>}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div style={{gridColumn:'span 2'}}>
              <label style={lbl}>Modelo * <span style={{color:'#999',fontWeight:400}}>— debe coincidir exactamente con el nombre en Productos</span></label>
              <input value={form.modelo} onChange={e=>setForm(f=>({...f,modelo:e.target.value.toUpperCase()}))} style={inp} placeholder="Ej: BODY LAZO LICRA SEUL"/>
            </div>
            <div>
              <label style={lbl}>Aplica a talla</label>
              <select value={form.talla} onChange={e=>setForm(f=>({...f,talla:e.target.value}))} style={{...inp,padding:'8px 11px'}}>
                {TALLAS_OPT.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>SKU referencia <span style={{color:'#999',fontWeight:400}}>(opcional)</span></label>
              <input value={form.sku_ref} onChange={e=>setForm(f=>({...f,sku_ref:e.target.value.toUpperCase()}))} style={inp} placeholder="BOD..."/>
            </div>
          </div>

          <div style={{borderTop:'1px solid var(--border)',paddingTop:'13px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'var(--green)',marginBottom:'10px'}}>🧵 Datos de la Tela</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={lbl}>Tipo de tela *</label>
                <div style={{display:'flex',gap:'6px'}}>
                  <select
                    value={TIPOS_TELA.includes(form.tela) ? form.tela : form.tela ? '__custom__' : ''}
                    onChange={e=>{ if(e.target.value!=='__custom__') setForm(f=>({...f,tela:e.target.value})); }}
                    style={{...inp,flex:1,padding:'8px 9px'}}>
                    <option value="">— Seleccionar</option>
                    {TIPOS_TELA.map(t=><option key={t}>{t}</option>)}
                    <option value="__custom__">Otro...</option>
                  </select>
                </div>
                <input value={form.tela} onChange={e=>setForm(f=>({...f,tela:e.target.value.toUpperCase()}))}
                  style={{...inp,marginTop:'6px'}} placeholder="O escribe directo..."/>
              </div>
              <div>
                <label style={lbl}>Color de la tela</label>
                <input value={form.color_tela} onChange={e=>setForm(f=>({...f,color_tela:e.target.value.toUpperCase()}))}
                  style={inp} placeholder="SEGUN_PRENDA"/>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'4px'}}>
                  Usa SEGUN_PRENDA si el color cambia por variante
                </div>
              </div>
              <div>
                <label style={lbl}>Metros por prenda *</label>
                <input type="number" min="0" step="0.05" value={form.metros_por_prenda}
                  onChange={e=>setForm(f=>({...f,metros_por_prenda:e.target.value}))}
                  style={inp} placeholder="1.20"/>
              </div>
              <div>
                <label style={lbl}>Ancho de tela (m)</label>
                <input type="number" min="0" step="0.05" value={form.ancho_tela}
                  onChange={e=>setForm(f=>({...f,ancho_tela:e.target.value}))}
                  style={inp} placeholder="1.50"/>
              </div>
            </div>
          </div>

          <div style={{borderTop:'1px solid var(--border)',paddingTop:'13px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#888',marginBottom:'10px'}}>💰 Costos (opcional — para calcular precio de producción)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={lbl}>Precio por metro (€/$)</label>
                <input type="number" min="0" step="0.01" value={form.precio_metro}
                  onChange={e=>setForm(f=>({...f,precio_metro:e.target.value}))}
                  style={inp} placeholder="0.00"/>
              </div>
              <div>
                <label style={lbl}>Otros costos (confección, etc.)</label>
                <input type="number" min="0" step="0.01" value={form.otros_costos}
                  onChange={e=>setForm(f=>({...f,otros_costos:e.target.value}))}
                  style={inp} placeholder="0.00"/>
              </div>
            </div>
            {costoTotal > 0 && (
              <div style={{marginTop:'10px',padding:'10px 12px',background:'var(--green-soft)',border:'1px solid rgba(34,197,94,.2)',fontFamily:'DM Mono,monospace',fontSize:'11px',display:'flex',gap:'20px'}}>
                <span>Costo tela: <strong>€ {costoTela.toFixed(2)}</strong></span>
                <span>Costo total estimado: <strong style={{color:'var(--green)'}}>€ {costoTotal.toFixed(2)}/prenda</strong></span>
              </div>
            )}
          </div>

          <div>
            <label style={lbl}>Observaciones</label>
            <textarea value={form.observaciones} onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))}
              style={{...inp,height:'56px',resize:'vertical'}} placeholder="Notas adicionales sobre corte, confección..."/>
          </div>
        </div>

        <div style={{padding:'12px 20px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'9px',background:'var(--bg2)',flexShrink:0}}>
          <button onClick={onClose} style={{padding:'8px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{padding:'8px 20px',background:'var(--green)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',opacity:guardando?.6:1}}>
            {guardando?'⏳ Guardando...':'✓ '+(esNueva?'Crear Receta':'Guardar Cambios')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PESTAÑA: GESTOR DE RECETAS
══════════════════════════════════════════════════════════════ */
function TabRecetas() {
  const [recetas,   setRecetas]  = useState([]);
  const [cargando,  setCarg]     = useState(true);
  const [modal,     setModal]    = useState(null); // null | 'nueva' | recetaObj
  const [buscar,    setBuscar]   = useState('');
  const [eliminar,  setEliminar] = useState(null); // receta a confirmar eliminación
  const [errElim,   setErrElim]  = useState('');

  async function cargar() {
    setCarg(true);
    try {
      const res = await fetch('/api/recetas').then(r=>r.json());
      if (res.ok) setRecetas(res.recetas || []);
    } catch(e) {}
    setCarg(false);
  }

  useEffect(() => { cargar(); }, []);

  async function borrar(r) {
    setErrElim('');
    try {
      const res = await fetch(`/api/recetas/${r.id}`, { method:'DELETE' }).then(r=>r.json());
      if (res.ok) { setEliminar(null); cargar(); }
      else setErrElim(res.error || 'Error al eliminar');
    } catch(e) { setErrElim('Error de conexión'); }
  }

  const filtradas = useMemo(() => {
    if (!buscar) return recetas;
    const q = buscar.toLowerCase();
    return recetas.filter(r => `${r.modelo} ${r.tela} ${r.color_tela}`.toLowerCase().includes(q));
  }, [recetas, buscar]);

  // Agrupar por modelo
  const grupos = useMemo(() => {
    const g = {};
    filtradas.forEach(r => {
      const k = r.modelo || '—';
      if (!g[k]) g[k] = [];
      g[k].push(r);
    });
    return g;
  }, [filtradas]);

  return (
    <div>
      {modal && (
        <ModalReceta
          receta={modal === 'nueva' ? null : modal}
          onClose={()=>setModal(null)}
          onSave={()=>{ setModal(null); cargar(); }}
        />
      )}
      {eliminar && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',maxWidth:'380px',width:'100%',borderTop:'2px solid var(--red)',padding:'20px'}}>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700,marginBottom:'8px'}}>¿Eliminar receta?</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#555',marginBottom:'14px'}}>
              <strong>{eliminar.modelo}</strong> — {eliminar.tela} ({eliminar.talla})<br/>
              Esta acción no se puede deshacer.
            </div>
            {errElim && <div style={{padding:'7px 10px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',marginBottom:'10px'}}>{errElim}</div>}
            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
              <button onClick={()=>{setEliminar(null);setErrElim('');}} style={{padding:'7px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>Cancelar</button>
              <button onClick={()=>borrar(eliminar)} style={{padding:'7px 14px',background:'var(--red)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700}}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700}}>Recetas de Producción</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'2px'}}>
            {recetas.length} receta{recetas.length!==1?'s':''} · Define metros de tela por modelo
          </div>
        </div>
        <button onClick={()=>setModal('nueva')} style={{padding:'8px 16px',background:'var(--green)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>
          + Nueva Receta
        </button>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',marginBottom:'14px'}}>
        <span>🔍</span>
        <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por modelo o tela..."
          style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',width:'100%'}}/>
      </div>

      {cargando && <div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando recetas...</div>}

      {!cargando && recetas.length === 0 && (
        <div style={{textAlign:'center',padding:'50px',background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'36px',marginBottom:'12px'}}>🧵</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666',marginBottom:'14px'}}>
            Sin recetas aún.<br/>Crea una receta para que el Plan de Tela pueda calcular cuántos metros comprar.
          </div>
          <button onClick={()=>setModal('nueva')} style={{padding:'9px 18px',background:'var(--green)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase'}}>
            + Crear Primera Receta
          </button>
        </div>
      )}

      {!cargando && Object.entries(grupos).map(([modelo, items]) => (
        <div key={modelo} style={{marginBottom:'10px',border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{padding:'9px 14px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:'Playfair Display,serif',fontSize:'13px',fontWeight:700}}>{modelo}</span>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>{items.length} variante{items.length!==1?'s':''}</span>
          </div>
          {items.map(r => {
            const costoTela  = (r.metros_por_prenda||0) * (r.precio_metro||0);
            const costoTotal = costoTela + (r.otros_costos||0);
            return (
              <div key={r.id} style={{padding:'11px 14px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
                <div style={{display:'flex',gap:'20px',flexWrap:'wrap',flex:1}}>
                  <div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginBottom:'2px',letterSpacing:'.1em'}}>TALLA</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700}}>{r.talla}</div>
                  </div>
                  <div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginBottom:'2px',letterSpacing:'.1em'}}>TELA</div>
                    <div style={{fontSize:'12px',fontWeight:600}}>{r.tela}</div>
                  </div>
                  <div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginBottom:'2px',letterSpacing:'.1em'}}>COLOR TELA</div>
                    <div style={{fontSize:'11px',display:'flex',alignItems:'center',gap:'4px'}}>
                      {r.color_tela !== 'SEGUN_PRENDA' && (
                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(r.color_tela),border:'1px solid rgba(0,0,0,.1)',display:'inline-block'}}/>
                      )}
                      {r.color_tela === 'SEGUN_PRENDA' ? <em style={{color:'#888'}}>Según prenda</em> : r.color_tela}
                    </div>
                  </div>
                  <div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginBottom:'2px',letterSpacing:'.1em'}}>METROS/PRENDA</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:'var(--green)'}}>{r.metros_por_prenda} m</div>
                  </div>
                  {costoTotal > 0 && (
                    <div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginBottom:'2px',letterSpacing:'.1em'}}>COSTO EST.</div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--blue)'}}>€ {costoTotal.toFixed(2)}</div>
                    </div>
                  )}
                  {r.observaciones && (
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',marginBottom:'2px',letterSpacing:'.1em'}}>NOTA</div>
                      <div style={{fontSize:'11px',color:'#666',fontStyle:'italic'}}>{r.observaciones}</div>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                  <button onClick={()=>setModal(r)} style={{padding:'5px 11px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>✏️ Editar</button>
                  <button onClick={()=>setEliminar(r)} style={{padding:'5px 11px',background:'none',border:'1px solid rgba(217,30,30,.3)',color:'var(--red)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PESTAÑA: PLAN DE COMPRA (reporte existente mejorado)
══════════════════════════════════════════════════════════════ */
function TabPlan() {
  const [data, setData]     = useState(null);
  const [cargando, setCarg] = useState(true);
  const [error, setError]   = useState('');

  async function cargar() {
    setCarg(true); setError('');
    try {
      const res = await fetch('/api/plan-tela').then(r=>r.json());
      if (res.ok) setData(res.data);
      else setError(res.error || 'Error al generar el plan');
    } catch(e) { setError('Error de conexión'); }
    setCarg(false);
  }

  useEffect(() => { cargar(); }, []);
  const d = data || {};

  return (
    <div>
      <style>{`@media print { .no-print{display:none!important} @page{size:A4;margin:12mm} }`}</style>

      <div className="no-print" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'8px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700}}>Plan de Compra de Tela</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'2px'}}>Calculado desde comandas en estado PRODUCCIÓN</div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {data?.resumen?.length>0 && <button onClick={()=>window.print()} style={{padding:'6px 13px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',color:'#444'}}>🖨 Imprimir</button>}
          <button onClick={cargar} disabled={cargando} style={{padding:'6px 13px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',color:'#444'}}>↺ Actualizar</button>
        </div>
      </div>

      {cargando && <div style={{textAlign:'center',padding:'60px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Calculando plan de tela...</div>}
      {!cargando && error && <div style={{padding:'18px',background:'var(--red-soft)',border:'1px solid rgba(217,30,30,.3)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>❌ Error: {error}</div>}

      {!cargando && !error && !d.resumen?.length && (
        <div style={{textAlign:'center',padding:'60px 20px',background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'36px',marginBottom:'12px'}}>📦</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666',marginBottom:'8px'}}>{d.aviso||'No hay comandas en estado PRODUCCIÓN.'}</div>
          {d.sinReceta?.length > 0 && (
            <div style={{fontSize:'11px',color:'var(--warn)',marginTop:'8px'}}>
              ⚠️ {d.sinReceta.length} modelo(s) sin receta configurada. Ve a la pestaña Recetas para agregarlas.
            </div>
          )}
          <a href="/comandas" style={{display:'inline-block',marginTop:'14px',padding:'7px 16px',background:'none',border:'1px solid var(--border)',color:'#444',textDecoration:'none',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600}}>→ Ir a Comandas</a>
        </div>
      )}

      {!cargando && !error && d.resumen?.length > 0 && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'22px'}}>
            {[
              ['Comandas activas', d.comandas, 'en PRODUCCIÓN',    'var(--warn)'],
              ['Total prendas',    d.totalPrendas, 'a confeccionar','var(--blue)'],
              ['Metros netos',     `${d.totalMetros?.toFixed(2)} m`, 'sin merma', 'var(--green)'],
              ['Metros + merma 8%',`${d.totalMetrosMerma?.toFixed(2)} m`,'recomendado comprar','var(--red)'],
            ].map(([lbl,val,sub,col])=>(
              <div key={lbl} style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:`3px solid ${col}`,padding:'18px 16px'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.18em',textTransform:'uppercase',marginBottom:'9px'}}>{lbl}</div>
                <div style={{fontFamily:'Playfair Display,serif',fontSize:'32px',fontWeight:700,lineHeight:1,color:col,marginBottom:'4px'}}>{val}</div>
                <div style={{fontSize:'10px',color:'#555',fontFamily:'DM Mono,monospace'}}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',background:'var(--warn-soft)',border:'1px solid rgba(154,71,0,.2)',borderLeft:'3px solid var(--warn)',marginBottom:'18px',fontSize:'11px',color:'#6a3500'}}>
            <span style={{fontSize:'15px'}}>⚠️</span>
            <span><strong>Merma textil del 8%</strong> incluida en la columna "Metros + Merma". Corresponde al desperdicio promedio de corte.</span>
          </div>

          <div style={{background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden',marginBottom:'16px'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'var(--ink)',color:'#fff'}}>
                  {['Tela','Color','Prendas','Metros netos','Metros + Merma (8%)'].map((h,i)=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:i>=2?'right':'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.resumen.map((r,i)=>{
                  const dot=colorHex(r.color);
                  return(
                    <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2?'var(--bg2)':'var(--surface)'}}>
                      <td style={{padding:'11px 14px'}}><strong style={{fontFamily:'Playfair Display,serif',fontSize:'13px'}}>{r.tela}</strong></td>
                      <td style={{padding:'11px 14px'}}>
                        {r.color!=='SEGUN_PRENDA'&&<span style={{width:'9px',height:'9px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.12)',display:'inline-block',verticalAlign:'middle',marginRight:'5px'}}/>}
                        {r.color==='SEGUN_PRENDA'?<em style={{color:'#888',fontSize:'11px'}}>Según prenda</em>:r.color}
                      </td>
                      <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700}}>{r.totalPrendas} uds</td>
                      <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700}}>{r.metros.toFixed(2)} m</td>
                      <td style={{padding:'11px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700,color:'var(--warn)'}}>{r.metrosConMerma.toFixed(2)} m</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'var(--ink)',color:'#fff'}}>
                  <td colSpan={2} style={{padding:'10px 14px',fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.14em',textTransform:'uppercase'}}>TOTALES</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700}}>{d.totalPrendas} uds</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700}}>{d.totalMetros?.toFixed(2)} m</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'DM Mono,monospace',fontWeight:700,color:'#c9a84c'}}>{d.totalMetrosMerma?.toFixed(2)} m</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {d.resumen.map((r,ri)=>(
            <details key={ri} style={{marginBottom:'8px'}}>
              <summary style={{cursor:'pointer',padding:'9px 14px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'10px',listStyle:'none',display:'flex',justifyContent:'space-between'}}>
                <span>▸ Detalle: <strong>{r.tela}</strong> {r.color!=='SEGUN_PRENDA'?`— ${r.color}`:''}</span>
                <span style={{color:'var(--warn)'}}>{r.metrosConMerma.toFixed(2)} m</span>
              </summary>
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:'none',overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:'#efefef'}}>
                    {['Modelo','Color prenda','Talla','Prendas','Metros'].map(h=>(
                      <th key={h} style={{padding:'7px 12px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#555'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {r.detalle.map((dd,di)=>(
                      <tr key={di} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'7px 12px',fontSize:'12px',fontWeight:500}}>{dd.modelo}</td>
                        <td style={{padding:'7px 12px',fontSize:'12px'}}>
                          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(dd.color),display:'inline-block',verticalAlign:'middle',marginRight:'4px',border:'1px solid rgba(0,0,0,.1)'}}/>
                          {dd.color}
                        </td>
                        <td style={{padding:'7px 12px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>{dd.talla}</td>
                        <td style={{padding:'7px 12px',fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700}}>{dd.prendas}</td>
                        <td style={{padding:'7px 12px',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{dd.metros.toFixed(2)} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}

          {d.sinReceta?.length > 0 && (
            <div style={{padding:'14px 18px',background:'var(--warn-soft)',border:'1px solid rgba(154,71,0,.3)',borderLeft:'4px solid var(--warn)',marginTop:'16px'}}>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--warn)',marginBottom:'10px',fontWeight:700}}>
                ⚠ Modelos sin receta configurada ({d.sinReceta.length})
              </div>
              <div style={{fontSize:'11px',color:'#666',marginBottom:'10px'}}>
                Estos productos no pudieron incluirse en el plan.
                <strong> Ve a la pestaña "Recetas" para configurarlas.</strong>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'rgba(154,71,0,.1)'}}>
                  {['Modelo','Color','Talla','Prendas'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--warn)'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {d.sinReceta.map((p,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid rgba(154,71,0,.15)'}}>
                      <td style={{padding:'6px 10px',fontSize:'12px'}}>{p.modelo}</td>
                      <td style={{padding:'6px 10px',fontSize:'12px'}}>{p.color||'—'}</td>
                      <td style={{padding:'6px 10px',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>{p.talla||'—'}</td>
                      <td style={{padding:'6px 10px',fontFamily:'DM Mono,monospace',fontWeight:700,fontSize:'11px'}}>{p.totalPrendas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {d.generadoEn && <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',textAlign:'right',marginTop:'12px'}}>Generado: {new Date(d.generadoEn).toLocaleString('es-VE')}</div>}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL — con pestañas
══════════════════════════════════════════════════════════════ */
export default function PlanTelaPage() {
  const [tab, setTab] = useState('recetas'); // 'recetas' | 'plan'

  const tabStyle = (activo) => ({
    padding: '9px 20px',
    background: activo ? 'var(--bg)' : 'var(--bg2)',
    border: '1px solid var(--border)',
    borderBottom: activo ? '1px solid var(--bg)' : '1px solid var(--border)',
    cursor: 'pointer',
    fontFamily: 'Poppins,sans-serif',
    fontSize: '12px',
    fontWeight: activo ? 700 : 500,
    color: activo ? 'var(--ink)' : '#666',
    marginBottom: '-1px',
    position: 'relative',
    zIndex: activo ? 1 : 0,
    borderTop: activo ? '2px solid var(--green)' : '2px solid transparent',
    transition: 'all .12s',
  });

  return (
    <Shell title="🧵 Plan de Tela">
      {/* Pestañas */}
      <div style={{display:'flex',gap:'4px',marginBottom:'0',borderBottom:'1px solid var(--border)'}}>
        <button style={tabStyle(tab==='recetas')} onClick={()=>setTab('recetas')}>
          📋 Recetas
        </button>
        <button style={tabStyle(tab==='plan')} onClick={()=>setTab('plan')}>
          🧵 Plan de Compra
        </button>
      </div>

      <div style={{border:'1px solid var(--border)',borderTop:'none',padding:'20px',background:'var(--bg)'}}>
        {tab === 'recetas' && <TabRecetas />}
        {tab === 'plan'    && <TabPlan    />}
      </div>
    </Shell>
  );
}
