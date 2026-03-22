'use client';
/**
 * ModalPromo — Selector de combos/promociones MODITEX POS
 * Cada promo tiene precio_mayor y precio_detal independientes.
 * El picker muestra toggle M/D por prenda y calcula el precio unitario correcto.
 */
import { useState, useMemo, useEffect } from 'react';
import { colorHex } from '@/utils/colores';

const lbl = { fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.14em', textTransform:'uppercase', color:'#666', display:'block', marginBottom:'5px' };
const inp = { width:'100%', padding:'9px 11px', background:'var(--bg2)', border:'1px solid var(--border)', fontFamily:'Poppins,sans-serif', fontSize:'13px', outline:'none', boxSizing:'border-box' };

export default function ModalPromo({ productos = [], onAdd, onClose, isAdmin = false }) {
  const [promos,    setPromos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');
  const [vista,     setVista]     = useState('lista');
  const [promoSel,  setPromoSel]  = useState(null);
  const [selected,  setSelected]  = useState([]);

  const [buscar,    setBuscar]    = useState('');

  const [formNombre, setFormNombre] = useState('');
  const [formMayor,  setFormMayor]  = useState('');
  const [formDetal,  setFormDetal]  = useState('');
  const [formPiezas, setFormPiezas] = useState('3');
  const [formDesc,   setFormDesc]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [adminMsg,   setAdminMsg]   = useState(null);

  useEffect(() => { cargarPromos(); }, []);

  async function cargarPromos() {
    setLoading(true); setLoadError('');
    try {
      const res = await fetch('/api/promos').then(r => r.json());
      if (res.ok) setPromos(res.promos.filter(p => p.activo));
      else setLoadError(res.error || 'Error al cargar');
    } catch { setLoadError('No se pudo conectar'); }
    setLoading(false);
  }

  async function cargarTodas() {
    try { const res = await fetch('/api/promos').then(r => r.json()); if (res.ok) setPromos(res.promos); } catch {}
  }

  const prodsFiltrados = useMemo(() => {
    const q = buscar.toLowerCase().trim();
    const base = productos.filter(p => p.disponible > 0);
    if (!q) return base.slice(0, 60);
    return base.filter(p => `${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q)).slice(0, 60);
  }, [productos, buscar]);

  function abrirPicker(promo) { setPromoSel(promo); setSelected([]); setComboTv('MAYOR'); setBuscar(''); setVista('picker'); }

  function togglePieza(prod) {
    setSelected(prev => {
      const existe = prev.find(x => x.sku === prod.sku);
      if (existe) return prev.filter(x => x.sku !== prod.sku);
      if (prev.length >= promoSel.num_piezas) return prev;
      return [...prev, prod];
    });
  }

  function confirmar() {
    if (!promoSel || selected.length !== promoSel.num_piezas) return;
    const precioTotal = comboTv === 'MAYOR' ? (promoSel.precio_mayor || 0) : (promoSel.precio_detal || 0);
    const precioUnitario = precioTotal / promoSel.num_piezas;
    const items = selected.map(prod => ({
      ...prod, qty: 1, tipoVenta: comboTv,
      promoTag: promoSel.id, promoNombre: promoSel.nombre,
      precioPromo: precioUnitario, precio: precioUnitario,
    }));
    onAdd(items);
    onClose();
  }

  function abrirAdmin() { cargarTodas(); resetForm(); setVista('admin'); }

  function resetForm() { setFormNombre(''); setFormMayor(''); setFormDetal(''); setFormPiezas('3'); setFormDesc(''); setEditId(null); setAdminMsg(null); }

  function editarPromo(p) { setFormNombre(p.nombre); setFormMayor(String(p.precio_mayor||'')); setFormDetal(String(p.precio_detal||'')); setFormPiezas(String(p.num_piezas)); setFormDesc(p.descripcion||''); setEditId(p.id); setAdminMsg(null); }

  async function guardarPromo() {
    if (!formNombre.trim() || !formMayor || !formDetal || !formPiezas) { setAdminMsg({ t:'err', m:'Completa todos los campos' }); return; }
    setSaving(true);
    const body = { nombre:formNombre, precio_mayor:parseFloat(formMayor), precio_detal:parseFloat(formDetal), num_piezas:parseInt(formPiezas), descripcion:formDesc, activo:true };
    if (editId) body.id = editId;
    const res = await fetch('/api/promos', { method: editId?'PUT':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(r=>r.json());
    if (res.ok) { setAdminMsg({ t:'ok', m: editId?'✓ Promo actualizada':'✓ Promo creada' }); resetForm(); cargarTodas(); }
    else setAdminMsg({ t:'err', m:res.error });
    setSaving(false);
  }

  async function toggleActivo(p) { await fetch('/api/promos',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,activo:!p.activo})}); cargarTodas(); }
  async function eliminarPromo(p) { if(!confirm(`¿Eliminar "${p.nombre}"?`)) return; await fetch('/api/promos',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id})}); cargarTodas(); }

  const falta = promoSel ? promoSel.num_piezas - selected.length : 0;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',width:'100%',maxWidth:'640px',maxHeight:'90vh',display:'flex',flexDirection:'column',borderTop:'3px solid #7c3aed',border:'1px solid var(--border-strong)'}}>

        {/* Header */}
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            {vista!=='lista'&&<button onClick={()=>{setVista('lista');setPromoSel(null);setBuscar('');resetForm();}} style={{padding:'4px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>← Atrás</button>}
            <div>
              <div style={{fontFamily:'Poppins,sans-serif',fontSize:'15px',fontWeight:700}}>
                {vista==='lista'?'🎁 Promos / Combos':vista==='picker'?promoSel?.nombre:'⚙️ Gestionar Promos'}
              </div>
              {vista==='picker'&&(
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',marginTop:'2px',color:falta===0?'var(--green)':'#888'}}>
                  {selected.length}/{promoSel?.num_piezas} prendas{falta===0?' ✓ completo':` — faltan ${falta}`}
                  {' · '}<span style={{color:'#f59e0b'}}>M:€{(promoSel?.precio_mayor||0).toFixed(2)}</span>
                  {' · '}<span style={{color:'#3b82f6'}}>D:€{(promoSel?.precio_detal||0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {isAdmin&&vista==='lista'&&<button onClick={abrirAdmin} style={{padding:'5px 12px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>⚙️ Gestionar</button>}
            <button onClick={onClose} style={{width:'28px',height:'28px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'13px'}}>✕</button>
          </div>
        </div>

        {/* ── LISTA DE PROMOS ── */}
        {vista==='lista'&&(
          <div style={{overflowY:'auto',flex:1,padding:'16px 18px'}}>
            {loading?(
              <div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>⏳ Cargando promos...</div>
            ):loadError?(
              <div style={{padding:'18px',background:'var(--red-soft)',border:'1px solid rgba(217,30,30,.2)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--red)',lineHeight:1.8}}>
                <div style={{fontWeight:700,marginBottom:'6px'}}>⚠ {loadError}</div>
                {(loadError.toLowerCase().includes('relation')||loadError.toLowerCase().includes('column')||loadError.toLowerCase().includes('table'))&&(
                  <div style={{background:'#fff8e1',border:'1px solid #f59e0b44',padding:'10px 12px',color:'#92400e',marginBottom:'10px',fontSize:'9px'}}>
                    💡 Ejecuta <strong>PROMOS.sql</strong> en Supabase → SQL Editor y recarga.
                  </div>
                )}
                <button onClick={cargarPromos} style={{padding:'6px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px'}}>↺ Reintentar</button>
              </div>
            ):promos.length===0?(
              <div style={{textAlign:'center',padding:'40px'}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>🎁</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888',marginBottom:'16px'}}>No hay promos activas</div>
                {isAdmin&&<button onClick={abrirAdmin} style={{padding:'9px 18px',background:'#7c3aed',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700}}>⚙️ Crear primera promo</button>}
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {promos.map(p=>(
                  <button key={p.id} onClick={()=>abrirPicker(p)}
                    style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:'var(--surface)',border:'1px solid #7c3aed33',borderLeft:'4px solid #7c3aed',cursor:'pointer',textAlign:'left',width:'100%',transition:'all .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
                    onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
                    <div style={{fontSize:'28px',flexShrink:0}}>🎁</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:'Poppins,sans-serif',fontSize:'14px',fontWeight:700,marginBottom:'4px'}}>{p.nombre}</div>
                      {p.descripcion&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginBottom:'5px'}}>{p.descripcion}</div>}
                      <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',background:'#7c3aed22',color:'#7c3aed',padding:'2px 8px',fontWeight:700}}>{p.num_piezas} PIEZAS</span>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0,display:'flex',flexDirection:'column',gap:'5px'}}>
                      <div style={{display:'flex',gap:'8px',alignItems:'center',justifyContent:'flex-end'}}>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#fff',background:'#f59e0b',padding:'2px 6px',fontWeight:700}}>MAYOR</span>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'17px',fontWeight:700,color:'#f59e0b'}}>€{(p.precio_mayor||0).toFixed(2)}</span>
                      </div>
                      <div style={{display:'flex',gap:'8px',alignItems:'center',justifyContent:'flex-end'}}>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#fff',background:'#3b82f6',padding:'2px 6px',fontWeight:700}}>DETAL</span>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'17px',fontWeight:700,color:'#3b82f6'}}>€{(p.precio_detal||0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div style={{color:'#7c3aed',fontSize:'16px',flexShrink:0}}>→</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PICKER DE PIEZAS ── */}
        {vista==='picker'&&promoSel&&(
          <>
            {selected.length>0&&(
              <div style={{padding:'10px 18px',background:'#f5f3ff',borderBottom:'1px solid #7c3aed33',display:'flex',gap:'6px',flexWrap:'wrap',flexShrink:0,alignItems:'center'}}>
                {selected.map(prod=>{
                  const precioUnit=((comboTv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0))/promoSel.num_piezas);
                  return(
                    <div key={prod.sku} style={{display:'flex',alignItems:'center',gap:'0',border:`1px solid ${comboTv==='MAYOR'?'#f59e0b':'#3b82f6'}`,overflow:'hidden',background:'#fff',flexShrink:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'5px',padding:'5px 10px',fontSize:'11px',fontWeight:600,color:'#000'}}>
                        <span style={{width:'7px',height:'7px',borderRadius:'50%',background:colorHex(prod.color),border:'1px solid rgba(0,0,0,.15)',flexShrink:0}}/>
                        {prod.modelo}
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:comboTv==='MAYOR'?'#f59e0b':'#3b82f6',fontWeight:700}}>€{precioUnit.toFixed(2)}</span>
                      </div>
                      <button onClick={()=>togglePieza(prod)} style={{padding:'5px 8px',border:'none',borderLeft:`1px solid ${comboTv==='MAYOR'?'#f59e0b44':'#3b82f644'}`,cursor:'pointer',background:'transparent',color:'#bbb',fontSize:'13px',lineHeight:1}}>✕</button>
                    </div>
                  );
                })}
                {Array.from({length:falta}).map((_,i)=>(
                  <div key={`v${i}`} style={{padding:'5px 14px',border:'2px dashed #7c3aed55',color:'#7c3aed',fontFamily:'DM Mono,monospace',fontSize:'9px',opacity:.5,flexShrink:0}}>
                    + prenda {selected.length+i+1}
                  </div>
                ))}
              </div>
            )}

            {/* Toggle M/D único para todo el combo */}
            <div style={{padding:'10px 18px',background:'var(--bg2)',borderBottom:'1px solid var(--border)',flexShrink:0,display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',letterSpacing:'.1em',textTransform:'uppercase',flexShrink:0}}>Precio del combo:</span>
              <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',borderRadius:'4px'}}>
                {[['MAYOR','#f59e0b'],['DETAL','#3b82f6']].map(([tv,color])=>(
                  <button key={tv} onClick={()=>setComboTv(tv)}
                    style={{padding:'7px 20px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700,
                      background:comboTv===tv?color:'var(--bg3)',
                      color:comboTv===tv?'#fff':'#888',transition:'all .15s',letterSpacing:'.08em'}}>
                    {tv} · €{(tv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0)).toFixed(2)}
                  </button>
                ))}
              </div>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>€{((comboTv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0))/promoSel.num_piezas).toFixed(2)}/prenda</span>
            </div>

            <div style={{padding:'10px 18px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'8px 12px'}}>
                <span style={{color:'#888'}}>🔍</span>
                <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por modelo, SKU, color…" autoFocus
                  style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',width:'100%'}}/>
              </div>
            </div>

            <div style={{overflowY:'auto',flex:1}}>
              {prodsFiltrados.map(prod=>{
                const isSelected=selected.some(x=>x.sku===prod.sku);
                const lleno=selected.length>=promoSel.num_piezas&&!isSelected;
                const dot=colorHex(prod.color);
                const precioUnit=((comboTv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0))/promoSel.num_piezas);
                return(
                  <div key={prod.sku} onClick={()=>!lleno&&togglePieza(prod)}
                    style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:'12px',padding:'10px 18px',borderBottom:'1px solid var(--border)',
                      background:isSelected?'#f5f3ff':'transparent',cursor:lleno?'not-allowed':'pointer',opacity:lleno?.35:1,transition:'background .1s'}}
                    onMouseEnter={e=>{if(!lleno&&!isSelected)e.currentTarget.style.background='var(--bg2)';}}
                    onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background='transparent';}}>
                    <div style={{width:'20px',height:'20px',border:`2px solid ${isSelected?'#7c3aed':'var(--border)'}`,background:isSelected?'#7c3aed':'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:'2px'}}>
                      {isSelected&&<span style={{color:'#fff',fontSize:'12px',fontWeight:700}}>✓</span>}
                    </div>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{width:'9px',height:'9px',borderRadius:'50%',background:dot,border:'1px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                        <span style={{fontSize:'13px',fontWeight:600}}>{prod.modelo} — {prod.color}</span>
                        {prod.talla&&prod.talla!=='UNICA'&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',background:'var(--bg3)',padding:'1px 5px'}}>T:{prod.talla}</span>}
                      </div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>
                        {prod.sku} · Stock: <strong style={{color:'var(--blue)'}}>{prod.disponible}</strong>
                        {' · '}Ind. M:€{(prod.precioMayor||0).toFixed(2)} D:€{(prod.precioDetal||0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0,minWidth:'80px'}}>
                      {isSelected?(
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:comboTv==='MAYOR'?'#f59e0b':'#3b82f6'}}>
                          €{precioUnit.toFixed(2)}
                        </div>
                      ):(
                        <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#ccc'}}>
                          €{precioUnit.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{padding:'12px 18px',borderTop:'1px solid var(--border)',background:'var(--bg2)',display:'flex',gap:'10px',alignItems:'center',flexShrink:0}}>
              <div style={{flex:1,fontFamily:'DM Mono,monospace',fontSize:'10px'}}>
                {falta>0
                  ?<span style={{color:'#888'}}>Selecciona {falta} prenda{falta!==1?'s':''} más</span>
                  :<span style={{color:'var(--green)',fontWeight:700}}>✅ Combo listo — {comboTv} €{(comboTv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0)).toFixed(2)}</span>
                }
              </div>
              <button onClick={confirmar} disabled={falta>0}
                style={{padding:'11px 24px',background:falta===0?'#7c3aed':'#ccc',color:'#fff',border:'none',cursor:falta===0?'pointer':'not-allowed',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',transition:'background .15s'}}>
                🎁 Agregar Combo
              </button>
            </div>
          </>
        )}

        {/* ── ADMIN ── */}
        {vista==='admin'&&(
          <div style={{overflowY:'auto',flex:1,padding:'16px 18px'}}>
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderTop:'3px solid #7c3aed',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'#7c3aed',marginBottom:'14px',fontWeight:700}}>
                {editId?'✏️ Editando promo':'+ Nueva promo'}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:'10px',marginBottom:'10px'}}>
                <div>
                  <label style={lbl}>Nombre de la promo</label>
                  <input value={formNombre} onChange={e=>setFormNombre(e.target.value)} placeholder="ej: Tri Set Deportivo" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Nº piezas</label>
                  <input type="number" min="2" max="10" value={formPiezas} onChange={e=>setFormPiezas(e.target.value)} style={inp}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                <div>
                  <label style={{...lbl,color:'#f59e0b'}}>💰 Precio MAYOR (€) — combo completo</label>
                  <input type="number" step="0.01" min="0" value={formMayor} onChange={e=>setFormMayor(e.target.value)} placeholder="ej: 25.00" style={{...inp,border:'1px solid #f59e0b66'}}/>
                  {formMayor&&formPiezas&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#f59e0b',marginTop:'3px'}}>→ €{(parseFloat(formMayor)/(parseInt(formPiezas)||1)).toFixed(2)}/prenda</div>}
                </div>
                <div>
                  <label style={{...lbl,color:'#3b82f6'}}>💰 Precio DETAL (€) — combo completo</label>
                  <input type="number" step="0.01" min="0" value={formDetal} onChange={e=>setFormDetal(e.target.value)} placeholder="ej: 30.00" style={{...inp,border:'1px solid #3b82f666'}}/>
                  {formDetal&&formPiezas&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#3b82f6',marginTop:'3px'}}>→ €{(parseFloat(formDetal)/(parseInt(formPiezas)||1)).toFixed(2)}/prenda</div>}
                </div>
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={lbl}>Descripción (opcional)</label>
                <input value={formDesc} onChange={e=>setFormDesc(e.target.value)} placeholder="ej: Cuerpo + Top + Short — elige tus colores" style={inp}/>
              </div>
              {adminMsg&&<div style={{padding:'7px 10px',marginBottom:'10px',background:adminMsg.t==='ok'?'var(--green-soft)':'var(--red-soft)',color:adminMsg.t==='ok'?'var(--green)':'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700}}>{adminMsg.m}</div>}
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={guardarPromo} disabled={saving} style={{padding:'9px 20px',background:'#7c3aed',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',opacity:saving?.6:1}}>
                  {saving?'⏳':editId?'✓ Guardar cambios':'+ Crear promo'}
                </button>
                {editId&&<button onClick={resetForm} style={{padding:'9px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px'}}>Cancelar</button>}
              </div>
            </div>

            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#555',marginBottom:'10px'}}>Promos existentes ({promos.length})</div>
            {promos.map(p=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px',background:'var(--surface)',border:'1px solid var(--border)',marginBottom:'6px',borderLeft:`3px solid ${p.activo?'#7c3aed':'#ccc'}`}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:600}}>{p.nombre}</span>
                    {!p.activo&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',background:'#eee',color:'#888',padding:'1px 6px'}}>INACTIVA</span>}
                  </div>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>
                    {p.num_piezas} piezas
                    <span style={{color:'#f59e0b',margin:'0 8px'}}>M: €{(p.precio_mayor||0).toFixed(2)}</span>
                    <span style={{color:'#3b82f6'}}>D: €{(p.precio_detal||0).toFixed(2)}</span>
                    {p.descripcion&&` · ${p.descripcion}`}
                  </div>
                </div>
                <button onClick={()=>toggleActivo(p)} style={{padding:'4px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:p.activo?'var(--green)':'#aaa',flexShrink:0}}>{p.activo?'✓ Activa':'○ Inactiva'}</button>
                <button onClick={()=>editarPromo(p)} style={{padding:'4px 10px',background:'none',border:'1px solid #7c3aed',color:'#7c3aed',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',flexShrink:0}}>✏️ Editar</button>
                <button onClick={()=>eliminarPromo(p)} style={{padding:'4px 10px',background:'none',border:'1px solid var(--red)',color:'var(--red)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',flexShrink:0}}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
