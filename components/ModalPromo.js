'use client';
/**
 * ModalPromo — Selector de combos/promociones para MODITEX POS
 *
 * Flujo:
 *   1. Se muestran las promos activas definidas por el admin
 *   2. Al seleccionar una promo, aparece un selector de prendas para escoger
 *      exactamente N piezas (el usuario elige color/variante libremente)
 *   3. Al confirmar, se llama onAdd con cada pieza a precio_promo / N
 *      marcadas con promoTag para agruparlas visualmente en el carrito
 *
 * Props:
 *   productos  — array global de productos
 *   onAdd(items) — array de items { ...prod, qty:1, precio, tipoVenta, promoTag, promoNombre }
 *   onClose
 *   isAdmin — muestra botón para gestionar promos
 */
import { useState, useMemo, useEffect } from 'react';
import { colorHex } from '@/utils/colores';

const lbl = { fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.14em', textTransform:'uppercase', color:'#666', display:'block', marginBottom:'5px' };
const inp = { width:'100%', padding:'9px 11px', background:'var(--bg2)', border:'1px solid var(--border)', fontFamily:'Poppins,sans-serif', fontSize:'13px', outline:'none', boxSizing:'border-box' };

export default function ModalPromo({ productos = [], onAdd, onClose, isAdmin = false }) {
  const [promos,    setPromos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [vista,     setVista]     = useState('lista');   // 'lista' | 'picker' | 'admin'
  const [promoSel,  setPromoSel]  = useState(null);
  const [selected,  setSelected]  = useState([]);        // SKUs seleccionados para el combo
  const [buscar,    setBuscar]    = useState('');

  // Admin — crear/editar promo
  const [formNombre,  setFormNombre]  = useState('');
  const [formPrecio,  setFormPrecio]  = useState('');
  const [formPiezas,  setFormPiezas]  = useState('3');
  const [formDesc,    setFormDesc]    = useState('');
  const [saving,      setSaving]      = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [adminMsg,    setAdminMsg]    = useState(null);

  useEffect(() => { cargarPromos(); }, []);

  const [loadError, setLoadError] = useState('');

  async function cargarPromos() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/promos').then(r => r.json());
      if (res.ok) {
        setPromos(res.promos.filter(p => p.activo));
      } else {
        setLoadError(res.error || 'Error al cargar promos');
      }
    } catch(e) {
      setLoadError('No se pudo conectar. Verifica tu conexión.');
    }
    setLoading(false);
  }

  async function cargarTodas() {
    try {
      const res = await fetch('/api/promos').then(r => r.json());
      if (res.ok) setPromos(res.promos);
    } catch {}
  }

  // ── Picker de piezas ───────────────────────────────────────────
  const prodsFiltrados = useMemo(() => {
    const q = buscar.toLowerCase().trim();
    if (!q) return productos.filter(p => p.disponible > 0).slice(0, 60);
    return productos.filter(p =>
      `${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q) &&
      p.disponible > 0
    ).slice(0, 60);
  }, [productos, buscar]);

  function abrirPicker(promo) {
    setPromoSel(promo);
    setSelected([]);
    setBuscar('');
    setVista('picker');
  }

  function togglePieza(prod) {
    setSelected(prev => {
      const existe = prev.find(x => x.sku === prod.sku);
      if (existe) return prev.filter(x => x.sku !== prod.sku);
      if (prev.length >= promoSel.num_piezas) return prev; // ya lleno
      return [...prev, prod];
    });
  }

  function confirmar() {
    if (!promoSel || selected.length !== promoSel.num_piezas) return;
    const precioUnitario = promoSel.precio / promoSel.num_piezas;
    const items = selected.map(prod => ({
      ...prod,
      qty: 1,
      precio: precioUnitario,
      tipoVenta: 'PROMO',
      promoTag: promoSel.id,
      promoNombre: promoSel.nombre,
    }));
    onAdd(items);
    onClose();
  }

  // ── Admin CRUD ─────────────────────────────────────────────────
  function abrirAdmin() {
    cargarTodas();
    resetForm();
    setVista('admin');
  }

  function resetForm() {
    setFormNombre(''); setFormPrecio(''); setFormPiezas('3');
    setFormDesc(''); setEditId(null); setAdminMsg(null);
  }

  function editarPromo(p) {
    setFormNombre(p.nombre); setFormPrecio(String(p.precio));
    setFormPiezas(String(p.num_piezas)); setFormDesc(p.descripcion || '');
    setEditId(p.id); setAdminMsg(null);
  }

  async function guardarPromo() {
    if (!formNombre.trim() || !formPrecio || !formPiezas) { setAdminMsg({ t: 'err', m: 'Completa todos los campos' }); return; }
    setSaving(true);
    const body = { nombre: formNombre, precio: parseFloat(formPrecio), num_piezas: parseInt(formPiezas), descripcion: formDesc, activo: true };
    const method = editId ? 'PUT' : 'POST';
    if (editId) body.id = editId;
    const res = await fetch('/api/promos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
    if (res.ok) {
      setAdminMsg({ t: 'ok', m: editId ? '✓ Promo actualizada' : '✓ Promo creada' });
      resetForm(); cargarTodas();
    } else {
      setAdminMsg({ t: 'err', m: res.error });
    }
    setSaving(false);
  }

  async function toggleActivo(p) {
    await fetch('/api/promos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, activo: !p.activo }) }).then(r => r.json());
    cargarTodas();
  }

  async function eliminarPromo(p) {
    if (!confirm(`¿Eliminar la promo "${p.nombre}"?`)) return;
    await fetch('/api/promos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) });
    cargarTodas();
  }

  const falta = promoSel ? promoSel.num_piezas - selected.length : 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:300,
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'var(--bg)', width:'100%', maxWidth:'640px',
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        borderTop:'3px solid #f59e0b', border:'1px solid var(--border-strong)' }}>

        {/* Header */}
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {vista !== 'lista' && (
              <button onClick={() => { setVista('lista'); setPromoSel(null); setBuscar(''); resetForm(); }}
                style={{ padding:'4px 10px', background:'none', border:'1px solid var(--border)',
                  cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'10px' }}>← Atrás</button>
            )}
            <div>
              <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'15px', fontWeight:700 }}>
                {vista === 'lista' ? '🎁 Promos / Combos' :
                 vista === 'picker' ? `${promoSel?.nombre} — Selecciona ${promoSel?.num_piezas} prendas` :
                 '⚙️ Gestionar Promos'}
              </div>
              {vista === 'picker' && (
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px',
                  color: falta === 0 ? 'var(--green)' : '#f59e0b', fontWeight:700, marginTop:'2px' }}>
                  {selected.length}/{promoSel?.num_piezas} seleccionadas
                  {falta > 0 ? ` — faltan ${falta}` : ' ✓ LISTO'}
                  {promoSel && <span style={{ color:'#888', marginLeft:'8px' }}>€{promoSel.precio.toFixed(2)} total</span>}
                </div>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            {isAdmin && vista === 'lista' && (
              <button onClick={abrirAdmin}
                style={{ padding:'5px 12px', background:'none', border:'1px solid var(--border)',
                  cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#666' }}>
                ⚙️ Gestionar
              </button>
            )}
            <button onClick={onClose}
              style={{ width:'28px', height:'28px', background:'none', border:'1px solid var(--border)',
                cursor:'pointer', fontSize:'13px' }}>✕</button>
          </div>
        </div>

        {/* ── VISTA LISTA DE PROMOS ─────────────────────────────── */}
        {vista === 'lista' && (
          <div style={{ overflowY:'auto', flex:1, padding:'16px 18px' }}>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888' }}>
                ⏳ Cargando promos...
              </div>
            ) : loadError ? (
              <div style={{ padding:'24px', background:'var(--red-soft)', border:'1px solid rgba(217,30,30,.2)',
                fontFamily:'DM Mono,monospace', fontSize:'10px', color:'var(--red)', lineHeight:1.7 }}>
                <div style={{ fontWeight:700, marginBottom:'8px' }}>⚠ No se pudieron cargar las promos</div>
                <div style={{ color:'#888', marginBottom:'12px' }}>{loadError}</div>
                {loadError.toLowerCase().includes('relation') || loadError.toLowerCase().includes('table') ? (
                  <div style={{ background:'#fff8e1', border:'1px solid #f59e0b44', padding:'10px 12px', color:'#92400e', fontSize:'9px' }}>
                    💡 <strong>Falta crear la tabla en Supabase.</strong><br/>
                    Ejecuta el archivo <strong>PROMOS.sql</strong> en Supabase → SQL Editor y recarga.
                  </div>
                ) : null}
                <button onClick={cargarPromos} style={{ marginTop:'12px', padding:'7px 16px',
                  background:'none', border:'1px solid var(--border)', cursor:'pointer',
                  fontFamily:'Poppins,sans-serif', fontSize:'11px' }}>↺ Reintentar</button>
              </div>
            ) : promos.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎁</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888', marginBottom:'16px' }}>
                  No hay promos activas
                </div>
                {isAdmin && (
                  <button onClick={abrirAdmin}
                    style={{ padding:'9px 18px', background:'#f59e0b', color:'#000', border:'none',
                      cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700 }}>
                    ⚙️ Crear primera promo
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {promos.map(p => (
                  <button key={p.id} onClick={() => abrirPicker(p)}
                    style={{ display:'flex', alignItems:'center', gap:'14px',
                      padding:'16px 18px', background:'var(--surface)',
                      border:'2px solid #f59e0b44', borderLeft:'4px solid #f59e0b',
                      cursor:'pointer', textAlign:'left', transition:'all .15s',
                      width:'100%' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#fff8e1'; e.currentTarget.style.borderColor='#f59e0b'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--surface)'; e.currentTarget.style.borderLeftColor='#f59e0b'; e.currentTarget.style.borderColor='#f59e0b44'; e.currentTarget.style.borderLeftWidth='4px'; }}>
                    <div style={{ fontSize:'32px', flexShrink:0 }}>🎁</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'14px', fontWeight:700, marginBottom:'3px' }}>
                        {p.nombre}
                      </div>
                      {p.descripcion && (
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', marginBottom:'4px' }}>
                          {p.descripcion}
                        </div>
                      )}
                      <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px',
                          background:'#f59e0b', color:'#000', padding:'2px 8px', fontWeight:700 }}>
                          {p.num_piezas} PIEZAS
                        </span>
                        <span style={{ fontFamily:'Poppins,sans-serif', fontSize:'11px', color:'#888' }}>
                          Selecciona {p.num_piezas} prendas
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:'DM Mono,monospace', fontSize:'20px', fontWeight:700, color:'#f59e0b' }}>
                        €{p.precio.toFixed(2)}
                      </div>
                      <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#aaa' }}>
                        €{(p.precio / p.num_piezas).toFixed(2)}/prenda
                      </div>
                    </div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'18px', color:'#f59e0b', flexShrink:0 }}>→</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VISTA PICKER DE PIEZAS ────────────────────────────── */}
        {vista === 'picker' && promoSel && (
          <>
            {/* Piezas ya seleccionadas */}
            {selected.length > 0 && (
              <div style={{ padding:'10px 18px', background:'#fff8e1', borderBottom:'1px solid #f59e0b44',
                display:'flex', gap:'6px', flexWrap:'wrap', flexShrink:0 }}>
                {selected.map((prod, i) => (
                  <div key={prod.sku} onClick={() => togglePieza(prod)}
                    style={{ display:'flex', alignItems:'center', gap:'5px', padding:'4px 8px 4px 10px',
                      background:'#f59e0b', color:'#000', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                    <span style={{ width:'8px', height:'8px', borderRadius:'50%',
                      background:colorHex(prod.color), border:'1px solid rgba(0,0,0,.2)', flexShrink:0 }}/>
                    {prod.modelo} — {prod.color}
                    <span style={{ fontSize:'14px', marginLeft:'2px', opacity:.7 }}>✕</span>
                  </div>
                ))}
                {Array.from({ length: falta }).map((_, i) => (
                  <div key={`empty-${i}`}
                    style={{ padding:'4px 14px', border:'2px dashed #f59e0b', color:'#f59e0b',
                      fontFamily:'DM Mono,monospace', fontSize:'10px', opacity:.6 }}>
                    + pieza {selected.length + i + 1}
                  </div>
                ))}
              </div>
            )}

            {/* Buscador */}
            <div style={{ padding:'10px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'var(--bg2)',
                border:'1px solid var(--border)', padding:'8px 12px' }}>
                <span>🔍</span>
                <input value={buscar} onChange={e => setBuscar(e.target.value)}
                  placeholder="Buscar por modelo, SKU, color…"
                  autoFocus
                  style={{ background:'none', border:'none', outline:'none',
                    fontFamily:'Poppins,sans-serif', fontSize:'12px', width:'100%' }}/>
              </div>
            </div>

            {/* Lista de productos */}
            <div style={{ overflowY:'auto', flex:1 }}>
              {prodsFiltrados.length === 0 ? (
                <div style={{ padding:'30px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#aaa' }}>
                  Sin resultados
                </div>
              ) : (
                prodsFiltrados.map(prod => {
                  const isSelected = selected.some(x => x.sku === prod.sku);
                  const dot = colorHex(prod.color);
                  const lleno = selected.length >= promoSel.num_piezas && !isSelected;
                  return (
                    <div key={prod.sku} onClick={() => !lleno && togglePieza(prod)}
                      style={{ display:'grid', gridTemplateColumns:'auto 1fr auto',
                        gap:'12px', padding:'10px 18px',
                        borderBottom:'1px solid var(--border)',
                        background: isSelected ? '#fff8e1' : 'transparent',
                        cursor: lleno ? 'not-allowed' : 'pointer',
                        opacity: lleno ? .4 : 1,
                        transition:'background .1s' }}
                      onMouseEnter={e => { if (!lleno && !isSelected) e.currentTarget.style.background='var(--bg2)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background='transparent'; }}>
                      {/* Checkbox */}
                      <div style={{ width:'20px', height:'20px', border:`2px solid ${isSelected?'#f59e0b':'var(--border)'}`,
                        background: isSelected ? '#f59e0b' : 'var(--bg2)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0, marginTop:'1px' }}>
                        {isSelected && <span style={{ color:'#000', fontSize:'13px', fontWeight:700 }}>✓</span>}
                      </div>
                      {/* Info */}
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ width:'9px', height:'9px', borderRadius:'50%',
                            background:dot, border:'1px solid rgba(0,0,0,.1)', flexShrink:0 }}/>
                          <span style={{ fontSize:'13px', fontWeight:600 }}>
                            {prod.modelo} — {prod.color}
                          </span>
                          {prod.talla && prod.talla !== 'UNICA' && (
                            <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px',
                              background:'var(--bg3)', padding:'1px 5px' }}>T:{prod.talla}</span>
                          )}
                        </div>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', marginTop:'2px' }}>
                          {prod.sku} · Stock: <strong style={{ color:'var(--blue)' }}>{prod.disponible}</strong>
                        </div>
                      </div>
                      {/* Stock badge */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px',
                          color:'#888', marginBottom:'2px' }}>€{(prod.precioDetal||0).toFixed(2)}</div>
                        {isSelected && (
                          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px',
                            color:'#f59e0b', fontWeight:700 }}>→ €{(promoSel.precio/promoSel.num_piezas).toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer confirmar */}
            <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', flexShrink:0,
              background:'var(--bg2)', display:'flex', gap:'10px', alignItems:'center' }}>
              <div style={{ flex:1, fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#888' }}>
                {falta > 0
                  ? `Selecciona ${falta} prenda${falta !== 1 ? 's' : ''} más para completar el combo`
                  : <span style={{ color:'var(--green)', fontWeight:700 }}>✅ Combo completo — €{promoSel.precio.toFixed(2)}</span>}
              </div>
              <button onClick={confirmar} disabled={falta > 0}
                style={{ padding:'11px 24px', background: falta === 0 ? '#f59e0b' : '#ccc',
                  color: falta === 0 ? '#000' : '#fff', border:'none',
                  cursor: falta === 0 ? 'pointer' : 'not-allowed',
                  fontFamily:'Poppins,sans-serif', fontSize:'12px', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'.05em', transition:'background .15s' }}>
                🎁 Agregar Combo
              </button>
            </div>
          </>
        )}

        {/* ── VISTA ADMIN ────────────────────────────────────────── */}
        {vista === 'admin' && (
          <div style={{ overflowY:'auto', flex:1, padding:'16px 18px' }}>
            {/* Formulario crear/editar */}
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
              borderTop:'3px solid #f59e0b', padding:'16px', marginBottom:'16px' }}>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', letterSpacing:'.12em',
                textTransform:'uppercase', color:'#f59e0b', marginBottom:'12px', fontWeight:700 }}>
                {editId ? '✏️ Editando promo' : '+ Nueva promo'}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 100px', gap:'10px', marginBottom:'10px' }}>
                <div>
                  <label style={lbl}>Nombre de la promo</label>
                  <input value={formNombre} onChange={e => setFormNombre(e.target.value)}
                    placeholder="ej: Set Comfy 3 Piezas" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Precio total (€)</label>
                  <input type="number" step="0.01" min="0" value={formPrecio}
                    onChange={e => setFormPrecio(e.target.value)}
                    placeholder="30.00" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Nº piezas</label>
                  <input type="number" min="2" max="10" value={formPiezas}
                    onChange={e => setFormPiezas(e.target.value)}
                    style={inp}/>
                </div>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={lbl}>Descripción (opcional)</label>
                <input value={formDesc} onChange={e => setFormDesc(e.target.value)}
                  placeholder="ej: Cuerpo + Top + Short — escoge tus colores" style={inp}/>
              </div>
              {adminMsg && (
                <div style={{ padding:'7px 10px', marginBottom:'10px',
                  background: adminMsg.t === 'ok' ? 'var(--green-soft)' : 'var(--red-soft)',
                  color: adminMsg.t === 'ok' ? 'var(--green)' : 'var(--red)',
                  fontFamily:'DM Mono,monospace', fontSize:'10px', fontWeight:700 }}>
                  {adminMsg.m}
                </div>
              )}
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={guardarPromo} disabled={saving}
                  style={{ padding:'9px 20px', background:'#f59e0b', color:'#000', border:'none',
                    cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px',
                    fontWeight:700, textTransform:'uppercase', opacity:saving?.6:1 }}>
                  {saving ? '⏳' : editId ? '✓ Guardar cambios' : '+ Crear Promo'}
                </button>
                {editId && (
                  <button onClick={resetForm}
                    style={{ padding:'9px 16px', background:'none', border:'1px solid var(--border)',
                      cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px' }}>
                    Cancelar edición
                  </button>
                )}
              </div>
            </div>

            {/* Lista de promos existentes */}
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.14em',
              textTransform:'uppercase', color:'#555', marginBottom:'10px' }}>
              Promos existentes ({promos.length})
            </div>
            {promos.length === 0 ? (
              <div style={{ padding:'24px', textAlign:'center', fontFamily:'DM Mono,monospace',
                fontSize:'11px', color:'#aaa', border:'1px dashed var(--border)' }}>
                Sin promos aún
              </div>
            ) : (
              promos.map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'10px',
                  padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)',
                  marginBottom:'6px', borderLeft:`3px solid ${p.activo ? '#f59e0b' : '#ccc'}` }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontFamily:'Poppins,sans-serif', fontSize:'13px', fontWeight:600 }}>
                        {p.nombre}
                      </span>
                      {!p.activo && (
                        <span style={{ fontFamily:'DM Mono,monospace', fontSize:'8px',
                          background:'#eee', color:'#888', padding:'1px 6px' }}>INACTIVA</span>
                      )}
                    </div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', marginTop:'2px' }}>
                      {p.num_piezas} piezas · €{p.precio.toFixed(2)} total · €{(p.precio/p.num_piezas).toFixed(2)}/prenda
                      {p.descripcion && ` · ${p.descripcion}`}
                    </div>
                  </div>
                  <button onClick={() => toggleActivo(p)}
                    style={{ padding:'4px 10px', background:'none', border:'1px solid var(--border)',
                      cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px',
                      color: p.activo ? 'var(--green)' : '#aaa' }}>
                    {p.activo ? '✓ Activa' : '○ Inactiva'}
                  </button>
                  <button onClick={() => editarPromo(p)}
                    style={{ padding:'4px 10px', background:'none', border:'1px solid #f59e0b',
                      color:'#f59e0b', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px' }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => eliminarPromo(p)}
                    style={{ padding:'4px 10px', background:'none', border:'1px solid var(--red)',
                      color:'var(--red)', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px' }}>
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
