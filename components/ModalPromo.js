'use client';
/**
 * ModalPromo — Selector de combos/promociones MODITEX POS
 *
 * ── Nuevas funciones v2 ──────────────────────────────────────────────
 * • Admin: campo "piezas_modelos" — selector de modelo_keys que forman el set.
 *   Cuando está configurado, el catálogo web calcula disponibilidad automática
 *   por color (solo muestra el color si TODAS las prendas tienen stock ≥ 1).
 * • Admin: campo "foto_url" para imagen del combo en el catálogo público.
 * • Lista: badge "✨ SET AUTO" si piezas_modelos está configurado.
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { colorHex } from '@/utils/colores';
import CatalogoExplorer from '@/components/CatalogoExplorer';

const lbl = { fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.14em', textTransform:'uppercase', color:'#666', display:'block', marginBottom:'5px' };
const inp = { width:'100%', padding:'9px 11px', background:'var(--bg2)', border:'1px solid var(--border)', fontFamily:'Poppins,sans-serif', fontSize:'13px', outline:'none', boxSizing:'border-box' };

export default function ModalPromo({ productos = [], onAdd, onClose, isAdmin = false }) {
  const [promos,    setPromos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');
  const [vista,     setVista]     = useState('lista');
  const [promoSel,  setPromoSel]  = useState(null);
  const [selected,  setSelected]  = useState([]);
  const [comboTv,   setComboTv]   = useState('MAYOR');
  const [showCat,   setShowCat]   = useState(false);
  const comboBuffer = useRef([]);

  const [buscar, setBuscar] = useState('');

  // ── Formulario admin ──
  const [formNombre,        setFormNombre]        = useState('');
  const [formMayor,         setFormMayor]         = useState('');
  const [formDetal,         setFormDetal]         = useState('');
  const [formPiezas,        setFormPiezas]        = useState('3');
  const [formDesc,          setFormDesc]          = useState('');
  const [formFotoUrl,       setFormFotoUrl]       = useState('');
  const [formPiezasModelos, setFormPiezasModelos] = useState([]);
  const [saving,            setSaving]            = useState(false);
  const [editId,            setEditId]            = useState(null);
  const [adminMsg,          setAdminMsg]          = useState(null);
  const [modelSearch,       setModelSearch]       = useState('');

  useEffect(() => { cargarPromos(); }, []);

  async function cargarPromos() {
    setLoading(true); setLoadError('');
    try {
      const [resPromos, resCombos] = await Promise.all([
        fetch('/api/promos').then(r => r.json()),
        fetch('/api/combos').then(r => r.json()).catch(() => ({ ok: false })),
      ]);
      if (resPromos.ok) {
        const promosList = resPromos.promos.filter(p => p.activo);
        // Enriquecer con colores_disponibles del endpoint /api/combos
        if (resCombos.ok && resCombos.combos?.length) {
          const comboMap = {};
          resCombos.combos.forEach(c => { comboMap[c.id] = c; });
          promosList.forEach(p => {
            if (comboMap[p.id]) {
              p.colores_disponibles = comboMap[p.id].colores_disponibles;
              p.total_disponible    = comboMap[p.id].total_disponible;
            }
          });
        }
        setPromos(promosList);
      } else setLoadError(resPromos.error || 'Error al cargar');
    } catch { setLoadError('No se pudo conectar'); }
    setLoading(false);
  }

  async function cargarTodas() {
    try { const res = await fetch('/api/promos').then(r => r.json()); if (res.ok) setPromos(res.promos); } catch {}
  }

  // ── Lista de modelo_keys únicos derivada de los productos ──────────
  const modelosDisponibles = useMemo(() => {
    const seen = new Set();
    const lista = [];
    productos.forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!seen.has(key)) {
        seen.add(key);
        lista.push({ key, categoria: p.categoria, modelo: p.modelo });
      }
    });
    return lista.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.modelo.localeCompare(b.modelo));
  }, [productos]);

  const modelosFiltrados = useMemo(() => {
    const q = modelSearch.toLowerCase().trim();
    if (!q) return modelosDisponibles;
    return modelosDisponibles.filter(m => `${m.categoria} ${m.modelo}`.toLowerCase().includes(q));
  }, [modelosDisponibles, modelSearch]);

  const prodsFiltrados = useMemo(() => {
    const q = buscar.toLowerCase().trim();
    const base = productos.filter(p => p.disponible > 0);
    if (!q) return base.slice(0, 60);
    return base.filter(p => `${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q)).slice(0, 60);
  }, [productos, buscar]);

  function abrirPicker(promo) {
    setPromoSel(promo); setSelected([]); setComboTv('MAYOR');
    setBuscar(''); setShowCat(false); comboBuffer.current = [];
    setVista('picker');
  }

  // Confirmar un set automático eligiendo un color — agrega las piezas directamente
  function _doConfirmarSet(promo, colorDatos, tv) {
    const precioTotal    = tv === 'MAYOR' ? (promo.precio_mayor || 0) : (promo.precio_detal || 0);
    const precioUnitario = precioTotal / promo.num_piezas;
    // Buscar los productos reales de cada pieza en el color elegido
    const items = colorDatos.piezas.map(pieza => {
      const prod = productos.find(p => p.sku === pieza.sku);
      return {
        ...(prod || { sku: pieza.sku, modelo: pieza.modelo, color: colorDatos.color, talla: pieza.talla || 'UNICA', precioDetal: precioUnitario, precioMayor: precioUnitario }),
        qty: 1, tipoVenta: tv,
        promoTag: promo.id, promoNombre: promo.nombre,
        precioPromo: precioUnitario, precio: precioUnitario,
      };
    });
    onAdd(items);
    onClose();
  }

  function confirmarDesdeCatalogo() {
    const buf = comboBuffer.current || [];
    if (!promoSel || buf.length === 0) { setShowCat(false); return; }
    const expanded = [];
    buf.forEach(({ prod, qty }) => { for (let i = 0; i < qty; i++) expanded.push(prod); });
    const piezas = expanded.slice(0, promoSel.num_piezas);
    setSelected(piezas);
    comboBuffer.current = [];
    setShowCat(false);
    _doConfirmar(piezas);
  }

  function _doConfirmar(piezas) {
    const precioTotal    = comboTv === 'MAYOR' ? (promoSel.precio_mayor || 0) : (promoSel.precio_detal || 0);
    const precioUnitario = precioTotal / promoSel.num_piezas;
    const items = piezas.map(prod => ({
      ...prod, qty: 1, tipoVenta: comboTv,
      promoTag: promoSel.id, promoNombre: promoSel.nombre,
      precioPromo: precioUnitario, precio: precioUnitario,
    }));
    onAdd(items);
    onClose();
  }

  function abrirAdmin() { cargarTodas(); resetForm(); setVista('admin'); }

  function resetForm() {
    setFormNombre(''); setFormMayor(''); setFormDetal('');
    setFormPiezas('3'); setFormDesc(''); setFormFotoUrl('');
    setFormPiezasModelos([]); setEditId(null); setAdminMsg(null); setModelSearch('');
  }

  function editarPromo(p) {
    setFormNombre(p.nombre);
    setFormMayor(String(p.precio_mayor || ''));
    setFormDetal(String(p.precio_detal || ''));
    setFormPiezas(String(p.num_piezas));
    setFormDesc(p.descripcion || '');
    setFormFotoUrl(p.foto_url || '');
    setFormPiezasModelos(Array.isArray(p.piezas_modelos) ? p.piezas_modelos : []);
    setEditId(p.id);
    setAdminMsg(null);
    setModelSearch('');
  }

  function toggleModelKey(key) {
    setFormPiezasModelos(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function guardarPromo() {
    if (!formNombre.trim() || !formMayor || !formDetal || !formPiezas) {
      setAdminMsg({ t:'err', m:'Completa todos los campos obligatorios' }); return;
    }
    const nPiezas = parseInt(formPiezas);
    if (formPiezasModelos.length > 0 && formPiezasModelos.length !== nPiezas) {
      setAdminMsg({ t:'err', m:`Selecciona exactamente ${nPiezas} modelos (tienes ${formPiezasModelos.length})` }); return;
    }
    setSaving(true);
    const body = {
      nombre:         formNombre,
      precio_mayor:   parseFloat(formMayor),
      precio_detal:   parseFloat(formDetal),
      num_piezas:     nPiezas,
      descripcion:    formDesc,
      activo:         true,
      foto_url:       formFotoUrl.trim(),
      piezas_modelos: formPiezasModelos.length === nPiezas ? formPiezasModelos : null,
    };
    if (editId) body.id = editId;
    const res = await fetch('/api/promos', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
    if (res.ok) { setAdminMsg({ t:'ok', m: editId ? '✓ Promo actualizada' : '✓ Promo creada' }); resetForm(); cargarTodas(); }
    else setAdminMsg({ t:'err', m: res.error });
    setSaving(false);
  }

  async function toggleActivo(p) {
    await fetch('/api/promos', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:p.id, activo:!p.activo }) });
    cargarTodas();
  }
  async function eliminarPromo(p) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    await fetch('/api/promos', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:p.id }) });
    cargarTodas();
  }

  const falta       = promoSel ? promoSel.num_piezas - selected.length : 0;
  const nPiezasInt  = parseInt(formPiezas) || 0;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',width:'100%',maxWidth:'640px',maxHeight:'90vh',display:'flex',flexDirection:'column',borderTop:'3px solid #7c3aed',border:'1px solid var(--border-strong)'}}>

        {/* Header */}
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            {vista !== 'lista' && (
              <button onClick={()=>{setVista('lista');setPromoSel(null);setBuscar('');resetForm();}}
                style={{padding:'4px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>
                ← Atrás
              </button>
            )}
            <div>
              <div style={{fontFamily:'Poppins,sans-serif',fontSize:'15px',fontWeight:700}}>
                {vista==='lista'?'🎁 Promos / Combos':vista==='picker'?promoSel?.nombre:'⚙️ Gestionar Promos'}
              </div>
              {vista==='picker' && (
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',marginTop:'2px',color:falta===0?'var(--green)':'#888'}}>
                  {selected.length}/{promoSel?.num_piezas} prendas{falta===0?' ✓ completo':` — faltan ${falta}`}
                  {' · '}<span style={{color:'#f59e0b'}}>M:€{(promoSel?.precio_mayor||0).toFixed(2)}</span>
                  {' · '}<span style={{color:'#3b82f6'}}>D:€{(promoSel?.precio_detal||0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {isAdmin && vista==='lista' && (
              <button onClick={abrirAdmin}
                style={{padding:'5px 12px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>
                ⚙️ Gestionar
              </button>
            )}
            <button onClick={onClose} style={{width:'28px',height:'28px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'13px'}}>✕</button>
          </div>
        </div>

        {/* ══ LISTA ══ */}
        {vista==='lista' && (
          <div style={{overflowY:'auto',flex:1,padding:'16px 18px'}}>
            {loading ? (
              <div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>⏳ Cargando promos...</div>
            ) : loadError ? (
              <div style={{padding:'18px',background:'var(--red-soft)',border:'1px solid rgba(217,30,30,.2)',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--red)',lineHeight:1.8}}>
                <div style={{fontWeight:700,marginBottom:'6px'}}>⚠ {loadError}</div>
                {(loadError.toLowerCase().includes('relation')||loadError.toLowerCase().includes('column')||loadError.toLowerCase().includes('table')) && (
                  <div style={{background:'#fff8e1',border:'1px solid #f59e0b44',padding:'10px 12px',color:'#92400e',marginBottom:'10px',fontSize:'9px'}}>
                    💡 Ejecuta <strong>PROMOS.sql</strong> y <strong>COMBOS.sql</strong> en Supabase → SQL Editor y recarga.
                  </div>
                )}
                <button onClick={cargarPromos} style={{padding:'6px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px'}}>↺ Reintentar</button>
              </div>
            ) : promos.length===0 ? (
              <div style={{textAlign:'center',padding:'40px'}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>🎁</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888',marginBottom:'16px'}}>No hay promos activas</div>
                {isAdmin && <button onClick={abrirAdmin} style={{padding:'9px 18px',background:'#7c3aed',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700}}>⚙️ Crear primera promo</button>}
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {promos.map(p => {
                  const tieneModelos = Array.isArray(p.piezas_modelos) && p.piezas_modelos.length > 0;
                  return (
                    <button key={p.id} onClick={()=>abrirPicker(p)}
                      style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:'var(--surface)',border:'1px solid #7c3aed33',borderLeft:'4px solid #7c3aed',cursor:'pointer',textAlign:'left',width:'100%',transition:'all .15s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
                      onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
                      <div style={{fontSize:'28px',flexShrink:0}}>🎁</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'7px',flexWrap:'wrap',marginBottom:'4px'}}>
                          <span style={{fontFamily:'Poppins,sans-serif',fontSize:'14px',fontWeight:700}}>{p.nombre}</span>
                          {tieneModelos && (
                            <span style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',background:'rgba(201,168,76,.12)',color:'#c9a84c',border:'1px solid rgba(201,168,76,.3)',padding:'1px 7px',letterSpacing:'.1em',flexShrink:0}}>✨ SET AUTO</span>
                          )}
                        </div>
                        {p.descripcion && <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginBottom:'5px'}}>{p.descripcion}</div>}
                        {tieneModelos && (
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'8.5px',color:'#aaa',marginBottom:'5px'}}>
                            {p.piezas_modelos.map(k=>k.split('__')[1]||k).join(' + ')}
                          </div>
                        )}
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ PICKER ══ */}
        {vista==='picker' && promoSel && !showCat && (
          <div style={{display:'flex',flexDirection:'column',flex:1,overflowY:'auto'}}>
            {/* Toggle M/D */}
            <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',flexShrink:0}}>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.12em',textTransform:'uppercase',color:'#888',marginBottom:'10px'}}>
                Precio del combo — {promoSel.num_piezas} piezas
              </div>
              <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
                <div style={{display:'flex',border:'1px solid var(--border)',overflow:'hidden',borderRadius:'4px'}}>
                  {[['MAYOR','#f59e0b'],['DETAL','#3b82f6']].map(([tv,color]) => (
                    <button key={tv} onClick={()=>setComboTv(tv)}
                      style={{padding:'10px 24px',border:'none',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700,
                        background:comboTv===tv?color:'var(--bg3)',color:comboTv===tv?'#fff':'#888',transition:'all .15s',letterSpacing:'.08em'}}>
                      {tv}<br/><span style={{fontSize:'14px'}}>€{(tv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0)).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',lineHeight:1.7}}>
                  <div>€{((comboTv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0))/promoSel.num_piezas).toFixed(2)} / prenda</div>
                  <div style={{color:comboTv==='MAYOR'?'#f59e0b':'#3b82f6',fontWeight:700}}>Total: €{(comboTv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0)).toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* SET AUTOMÁTICO — muestra colores disponibles directo */}
            {Array.isArray(promoSel.colores_disponibles) ? (
              <div style={{flex:1,overflowY:'auto',padding:'16px 18px'}}>
                {promoSel.colores_disponibles.length === 0 ? (
                  <div style={{textAlign:'center',padding:'40px 20px'}}>
                    <div style={{fontSize:'36px',marginBottom:'12px'}}>😔</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888',lineHeight:1.9}}>
                      Sin colores completos disponibles.<br/>Falta stock en alguna pieza del set.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8.5px',color:'#888',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'10px'}}>
                      Elige el color del set — {promoSel.colores_disponibles.length} disponible{promoSel.colores_disponibles.length!==1?'s':''}
                    </div>
                    {promoSel.colores_disponibles.map(cd => (
                      <button key={cd.color}
                        onClick={() => _doConfirmarSet(promoSel, cd, comboTv)}
                        style={{display:'flex',alignItems:'center',gap:'12px',padding:'13px 14px',marginBottom:'7px',
                          background:'var(--surface)',border:'1px solid var(--border)',
                          cursor:'pointer',textAlign:'left',width:'100%',transition:'all .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--bg2)'}
                        onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
                        <span style={{width:'28px',height:'28px',borderRadius:'50%',background:colorHex(cd.color),border:'2px solid rgba(0,0,0,.1)',flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700}}>{cd.color}</div>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'8.5px',color:'#888',marginTop:'2px'}}>
                            {cd.piezas.map(p=>p.modelo).join(' + ')}
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:cd.stock<=2?'#f59e0b':'#16c65a',fontWeight:700}}>
                            {cd.stock} disp.
                          </div>
                          <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa',marginTop:'2px'}}>→ confirmar</div>
                        </div>
                      </button>
                    ))}
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa',marginTop:'8px',lineHeight:1.8,padding:'8px 10px',background:'var(--bg2)',border:'1px solid var(--border)'}}>
                      ℹ️ Solo colores donde <strong>todas las piezas</strong> tienen stock. Al confirmar se agrega cada pieza al precio promo.
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* PROMO MANUAL — abre CatalogoExplorer */
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'32px 24px'}}>
                <div style={{fontSize:'48px'}}>🗂️</div>
                <div style={{fontFamily:'Poppins,sans-serif',fontSize:'15px',fontWeight:700,textAlign:'center'}}>
                  Selecciona {promoSel.num_piezas} prendas del catálogo
                </div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888',textAlign:'center'}}>
                  El precio de cada pieza será €{((comboTv==='MAYOR'?(promoSel.precio_mayor||0):(promoSel.precio_detal||0))/promoSel.num_piezas).toFixed(2)} ({comboTv}).
                </div>
                <button onClick={()=>setShowCat(true)}
                  style={{padding:'12px 32px',background:'#7c3aed',color:'#fff',border:'none',cursor:'pointer',
                    fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',borderRadius:'4px'}}>
                  🗂️ Abrir Catálogo
                </button>
              </div>
            )}
          </div>
        )}

        {vista==='picker' && promoSel && showCat && (
          <CatalogoExplorer
            productos={productos}
            modo="salida"
            tipoVenta={comboTv}
            onAdd={(prod, qty, tv) => {
              comboBuffer.current = comboBuffer.current || [];
              comboBuffer.current.push({ prod, qty, tv });
            }}
            onClose={confirmarDesdeCatalogo}
          />
        )}

        {/* ══ ADMIN ══ */}
        {vista==='admin' && (
          <div style={{overflowY:'auto',flex:1,padding:'16px 18px'}}>
            <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderTop:'3px solid #7c3aed',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'#7c3aed',marginBottom:'14px',fontWeight:700}}>
                {editId ? '✏️ Editando promo' : '+ Nueva promo'}
              </div>

              {/* Nombre + Piezas */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:'10px',marginBottom:'10px'}}>
                <div>
                  <label style={lbl}>Nombre de la promo *</label>
                  <input value={formNombre} onChange={e=>setFormNombre(e.target.value)} placeholder="ej: Tri Set Deportivo" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Nº piezas *</label>
                  <input type="number" min="2" max="10" value={formPiezas}
                    onChange={e=>{ setFormPiezas(e.target.value); setFormPiezasModelos([]); }} style={inp}/>
                </div>
              </div>

              {/* Precios */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                <div>
                  <label style={{...lbl,color:'#f59e0b'}}>💰 Precio MAYOR (€) *</label>
                  <input type="number" step="0.01" min="0" value={formMayor} onChange={e=>setFormMayor(e.target.value)} placeholder="25.00" style={{...inp,border:'1px solid #f59e0b66'}}/>
                  {formMayor && nPiezasInt > 0 && <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#f59e0b',marginTop:'3px'}}>→ €{(parseFloat(formMayor)/nPiezasInt).toFixed(2)}/prenda</div>}
                </div>
                <div>
                  <label style={{...lbl,color:'#3b82f6'}}>💰 Precio DETAL (€) *</label>
                  <input type="number" step="0.01" min="0" value={formDetal} onChange={e=>setFormDetal(e.target.value)} placeholder="30.00" style={{...inp,border:'1px solid #3b82f666'}}/>
                  {formDetal && nPiezasInt > 0 && <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#3b82f6',marginTop:'3px'}}>→ €{(parseFloat(formDetal)/nPiezasInt).toFixed(2)}/prenda</div>}
                </div>
              </div>

              {/* Descripción */}
              <div style={{marginBottom:'10px'}}>
                <label style={lbl}>Descripción (opcional)</label>
                <input value={formDesc} onChange={e=>setFormDesc(e.target.value)} placeholder="ej: Legging + Jacket + Top Halter" style={inp}/>
              </div>

              {/* Foto URL */}
              <div style={{marginBottom:'14px'}}>
                <label style={lbl}>📸 Foto del combo — URL (opcional, aparece en catálogo web)</label>
                <input value={formFotoUrl} onChange={e=>setFormFotoUrl(e.target.value)} placeholder="https://..." style={inp}/>
                {formFotoUrl.trim() && (
                  <div style={{marginTop:'6px',display:'flex',alignItems:'center',gap:'8px'}}>
                    <img src={formFotoUrl.trim()} alt="preview" style={{width:'50px',height:'60px',objectFit:'cover',border:'1px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>Preview</span>
                  </div>
                )}
              </div>

              {/* ── Selector piezas_modelos ── */}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:'14px',marginBottom:'12px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',marginBottom:'8px'}}>
                  <div style={{flex:1}}>
                    <label style={{...lbl, marginBottom:'3px',
                      color: formPiezasModelos.length === nPiezasInt && nPiezasInt > 0 ? '#16c65a' : '#c9a84c'}}>
                      ✨ MODELOS QUE FORMAN EL SET (catálogo auto)
                    </label>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',lineHeight:1.7}}>
                      Selecciona exactamente {nPiezasInt} modelo{nPiezasInt!==1?'s':''}.
                      El catálogo web mostrará los colores donde <strong>todas</strong> las prendas tienen stock ≥ 1.
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                    <span style={{fontFamily:'DM Mono,monospace',fontSize:'11px',fontWeight:700,
                      color: formPiezasModelos.length === nPiezasInt && nPiezasInt > 0 ? '#16c65a'
                           : formPiezasModelos.length > 0 ? '#f59e0b' : '#aaa'}}>
                      {formPiezasModelos.length}/{nPiezasInt}
                    </span>
                    {formPiezasModelos.length > 0 && (
                      <button onClick={()=>setFormPiezasModelos([])}
                        style={{padding:'2px 8px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {/* Chips de modelos seleccionados */}
                {formPiezasModelos.length > 0 && (
                  <div style={{display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'10px'}}>
                    {formPiezasModelos.map((key, idx) => {
                      const colors = ['rgba(201,168,76,.12)','rgba(59,130,246,.1)','rgba(22,198,90,.1)','rgba(168,85,247,.1)'];
                      const borders = ['rgba(201,168,76,.4)','rgba(59,130,246,.35)','rgba(22,198,90,.35)','rgba(168,85,247,.35)'];
                      const txts = ['#c9a84c','#3b82f6','#16c65a','#a855f7'];
                      const ci = idx % colors.length;
                      return (
                        <div key={key} style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 9px',
                          background:colors[ci],border:`1px solid ${borders[ci]}`,borderRadius:'2px'}}>
                          <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:txts[ci],fontWeight:700,letterSpacing:'.06em'}}>
                            {idx+1}. {key.split('__')[1] || key}
                          </span>
                          <button onClick={()=>toggleModelKey(key)}
                            style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:'10px',padding:'0 0 0 2px',lineHeight:1}}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Buscador + lista de modelos */}
                {nPiezasInt >= 2 && formPiezasModelos.length < nPiezasInt && (
                  <div>
                    <input value={modelSearch} onChange={e=>setModelSearch(e.target.value)}
                      placeholder="Buscar modelo… (ej: legging, jacket, top)" style={{...inp,marginBottom:'7px',fontSize:'12px'}}/>
                    <div style={{maxHeight:'200px',overflowY:'auto',border:'1px solid var(--border)',background:'var(--bg)'}}>
                      {modelosFiltrados.length === 0 ? (
                        <div style={{padding:'16px',textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#aaa'}}>Sin resultados</div>
                      ) : (
                        modelosFiltrados.map(m => {
                          const yaSeleccionado = formPiezasModelos.includes(m.key);
                          return (
                            <div key={m.key}
                              onClick={()=>{ if(!yaSeleccionado && formPiezasModelos.length < nPiezasInt) toggleModelKey(m.key); }}
                              style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',
                                borderBottom:'1px solid var(--border)',
                                cursor: yaSeleccionado ? 'default' : 'pointer',
                                background: yaSeleccionado ? 'var(--bg2)' : 'var(--bg)',
                                opacity: yaSeleccionado ? .4 : 1,
                                transition:'background .1s'}}
                              onMouseEnter={e=>{ if(!yaSeleccionado) e.currentTarget.style.background='var(--bg2)'; }}
                              onMouseLeave={e=>{ if(!yaSeleccionado) e.currentTarget.style.background='var(--bg)'; }}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.modelo}</div>
                                <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa',letterSpacing:'.08em'}}>{m.categoria}</div>
                              </div>
                              {yaSeleccionado
                                ? <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>ya incluida</span>
                                : <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#7c3aed',fontWeight:700}}>+ Añadir</span>
                              }
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {formPiezasModelos.length === nPiezasInt && nPiezasInt > 0 && (
                  <div style={{marginTop:'8px',padding:'8px 11px',background:'rgba(22,198,90,.08)',border:'1px solid rgba(22,198,90,.25)',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#16c65a',lineHeight:1.8}}>
                    ✅ Set listo — el catálogo mostrará este combo solo en los colores donde <strong>{formPiezasModelos.map(k=>k.split('__')[1]||k).join(', ')}</strong> tengan stock completo.
                  </div>
                )}
                {formPiezasModelos.length === 0 && (
                  <div style={{marginTop:'8px',padding:'8px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',lineHeight:1.8}}>
                    💡 Opcional — sin modelos configurados la promo funciona en el POS pero no aparece en el catálogo web automáticamente.
                  </div>
                )}
              </div>

              {adminMsg && (
                <div style={{padding:'7px 10px',marginBottom:'10px',
                  background:adminMsg.t==='ok'?'var(--green-soft)':'var(--red-soft)',
                  color:adminMsg.t==='ok'?'var(--green)':'var(--red)',
                  fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700}}>
                  {adminMsg.m}
                </div>
              )}

              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={guardarPromo} disabled={saving}
                  style={{padding:'9px 20px',background:'#7c3aed',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',opacity:saving?.6:1}}>
                  {saving ? '⏳' : editId ? '✓ Guardar cambios' : '+ Crear promo'}
                </button>
                {editId && (
                  <button onClick={resetForm}
                    style={{padding:'9px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px'}}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Lista existentes */}
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.14em',textTransform:'uppercase',color:'#555',marginBottom:'10px'}}>
              Promos existentes ({promos.length})
            </div>
            {promos.map(p => {
              const tieneModelos = Array.isArray(p.piezas_modelos) && p.piezas_modelos.length > 0;
              return (
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px',
                  background:'var(--surface)',border:'1px solid var(--border)',marginBottom:'6px',
                  borderLeft:`3px solid ${p.activo?'#7c3aed':'#ccc'}`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'7px',flexWrap:'wrap'}}>
                      <span style={{fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:600}}>{p.nombre}</span>
                      {!p.activo && <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',background:'#eee',color:'#888',padding:'1px 6px'}}>INACTIVA</span>}
                      {tieneModelos && <span style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',background:'rgba(201,168,76,.1)',color:'#c9a84c',border:'1px solid rgba(201,168,76,.3)',padding:'1px 6px',letterSpacing:'.08em'}}>✨ AUTO</span>}
                    </div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'2px'}}>
                      {p.num_piezas} pzs
                      <span style={{color:'#f59e0b',margin:'0 6px'}}>M:€{(p.precio_mayor||0).toFixed(2)}</span>
                      <span style={{color:'#3b82f6'}}>D:€{(p.precio_detal||0).toFixed(2)}</span>
                      {tieneModelos && <span style={{color:'#c9a84c',marginLeft:'6px'}}>{p.piezas_modelos.map(k=>k.split('__')[1]||k).join(' + ')}</span>}
                    </div>
                  </div>
                  <button onClick={()=>toggleActivo(p)}
                    style={{padding:'4px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:p.activo?'var(--green)':'#aaa',flexShrink:0}}>
                    {p.activo?'✓ Activa':'○ Inactiva'}
                  </button>
                  <button onClick={()=>editarPromo(p)}
                    style={{padding:'4px 10px',background:'none',border:'1px solid #7c3aed',color:'#7c3aed',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',flexShrink:0}}>
                    ✏️ Editar
                  </button>
                  <button onClick={()=>eliminarPromo(p)}
                    style={{padding:'4px 10px',background:'none',border:'1px solid var(--red)',color:'var(--red)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',flexShrink:0}}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}