'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { colorHex } from '@/utils/colores';

const lbl = { fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.14em', textTransform:'uppercase', color:'#666', display:'block', marginBottom:'5px' };
const inp = { width:'100%', padding:'9px 11px', background:'var(--bg2)', border:'1px solid var(--border)', fontFamily:'Poppins,sans-serif', fontSize:'13px', outline:'none', boxSizing:'border-box' };

export default function PromosPage() {
  const { data } = useAppData() || {};
  const productos = data?.productos || [];

  const [promos,    setPromos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [combos,    setCombos]    = useState([]);
  const [combosLoad,setCombosLoad]= useState(true);
  const [msg,       setMsg]       = useState(null);

  // ── Formulario ──
  const [editId,            setEditId]            = useState(null);
  const [formNombre,        setFormNombre]        = useState('');
  const [formMayor,         setFormMayor]         = useState('');
  const [formDetal,         setFormDetal]         = useState('');
  const [formPiezas,        setFormPiezas]        = useState('3');
  const [formDesc,          setFormDesc]          = useState('');
  const [formFotoUrl,       setFormFotoUrl]       = useState('');
  const [formFotosExtra,    setFormFotosExtra]    = useState('');
  const [formPiezasModelos, setFormPiezasModelos] = useState([]);
  const [formActivo,        setFormActivo]        = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [modelSearch,       setModelSearch]       = useState('');
  const [vistaAdmin,        setVistaAdmin]        = useState(false);

  useEffect(() => { cargarPromos(); cargarCombos(); }, []);

  async function cargarPromos() {
    setLoading(true);
    try {
      const res = await fetch('/api/promos').then(r => r.json());
      if (res.ok) setPromos(res.promos);
    } catch {}
    setLoading(false);
  }

  async function cargarCombos() {
    setCombosLoad(true);
    try {
      const res = await fetch('/api/combos').then(r => r.json());
      if (res.ok) setCombos(res.combos || []);
    } catch {}
    setCombosLoad(false);
  }

  const modelosDisponibles = useMemo(() => {
    const seen = new Set(); const lista = [];
    productos.forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!seen.has(key)) { seen.add(key); lista.push({ key, categoria:p.categoria, modelo:p.modelo }); }
    });
    return lista.sort((a,b) => a.categoria.localeCompare(b.categoria)||a.modelo.localeCompare(b.modelo));
  }, [productos]);

  const modelosFiltrados = useMemo(() => {
    const q = modelSearch.toLowerCase().trim();
    if (!q) return modelosDisponibles;
    return modelosDisponibles.filter(m => `${m.categoria} ${m.modelo}`.toLowerCase().includes(q));
  }, [modelosDisponibles, modelSearch]);

  function resetForm() {
    setEditId(null); setFormNombre(''); setFormMayor(''); setFormDetal('');
    setFormPiezas('3'); setFormDesc(''); setFormFotoUrl(''); setFormFotosExtra(''); setFormPiezasModelos([]);
    setFormActivo(true); setModelSearch('');
  }

  function editarPromo(p) {
    setEditId(p.id); setFormNombre(p.nombre); setFormMayor(String(p.precio_mayor||''));
    setFormDetal(String(p.precio_detal||'')); setFormPiezas(String(p.num_piezas));
    setFormDesc(p.descripcion||''); setFormFotoUrl(p.foto_url||''); setFormFotosExtra(p.fotos_extra||'');
    setFormPiezasModelos(Array.isArray(p.piezas_modelos)?p.piezas_modelos:[]);
    setFormActivo(p.activo); setModelSearch(''); setVistaAdmin(true);
    setTimeout(() => document.getElementById('promo-form')?.scrollIntoView({behavior:'smooth'}), 100);
  }

  function toggleModelKey(key) {
    setFormPiezasModelos(prev => prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);
  }

  async function guardar() {
    if (!formNombre.trim()||!formMayor||!formDetal||!formPiezas) {
      setMsg({t:'err',m:'Completa todos los campos'}); return;
    }
    const nPiezas = parseInt(formPiezas);
    if (formPiezasModelos.length>0 && formPiezasModelos.length!==nPiezas) {
      setMsg({t:'err',m:`Selecciona exactamente ${nPiezas} modelos (tienes ${formPiezasModelos.length})`}); return;
    }
    setSaving(true);
    const body = {
      nombre:formNombre, precio_mayor:parseFloat(formMayor), precio_detal:parseFloat(formDetal),
      num_piezas:nPiezas, descripcion:formDesc, activo:formActivo,
      foto_url:formFotoUrl.trim(),
      fotos_extra:formFotosExtra.trim(),
      piezas_modelos:formPiezasModelos.length===nPiezas?formPiezasModelos:null,
    };
    if (editId) body.id = editId;
    const res = await fetch('/api/promos',{
      method:editId?'PUT':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
    }).then(r=>r.json());
    if (res.ok) {
      setMsg({t:'ok',m:editId?'✓ Promo actualizada':'✓ Promo creada'});
      resetForm(); cargarPromos(); cargarCombos();
    } else setMsg({t:'err',m:res.error});
    setSaving(false);
    setTimeout(()=>setMsg(null),4000);
  }

  async function toggleActivo(p) {
    await fetch('/api/promos',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,activo:!p.activo})});
    cargarPromos(); cargarCombos();
  }

  async function eliminar(p) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    await fetch('/api/promos',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id})});
    cargarPromos(); cargarCombos();
  }

  const nPiezasInt = parseInt(formPiezas)||0;

  return (
    <Shell>
      <div style={{maxWidth:'960px',margin:'0 auto',padding:'20px 16px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.2em',textTransform:'uppercase',color:'#c9a84c',marginBottom:'4px'}}>
              ✨ CATÁLOGO WEB
            </div>
            <h1 style={{fontFamily:'Poppins,sans-serif',fontSize:'22px',fontWeight:700,margin:0}}>Sets & Combos</h1>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'3px'}}>
              {promos.length} promo{promos.length!==1?'s':''} · {promos.filter(p=>p.activo).length} activas
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button onClick={()=>{resetForm();setVistaAdmin(v=>!v);}}
              style={{padding:'9px 18px',background:vistaAdmin?'var(--ink)':'#7c3aed',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700}}>
              {vistaAdmin?'← Ver promos':'+ Nueva promo'}
            </button>
            <a href="/catalogo" target="_blank" rel="noreferrer"
              style={{padding:'9px 16px',background:'#0a0a0a',color:'#c9a84c',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
              🌐 Ver catálogo →
            </a>
          </div>
        </div>

        {msg && (
          <div style={{padding:'10px 14px',marginBottom:'16px',background:msg.t==='ok'?'var(--green-soft)':'var(--red-soft)',borderLeft:`3px solid ${msg.t==='ok'?'var(--green)':'var(--red)'}`,color:msg.t==='ok'?'var(--green)':'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',fontWeight:700}}>
            {msg.m}
          </div>
        )}

        {/* ══ FORMULARIO ══ */}
        {vistaAdmin && (
          <div id="promo-form" style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:'3px solid #7c3aed',padding:'20px',marginBottom:'24px'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',letterSpacing:'.12em',textTransform:'uppercase',color:'#7c3aed',marginBottom:'16px',fontWeight:700}}>
              {editId?'✏️ Editando promo':'+ Nueva promo'}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:'10px',marginBottom:'10px'}}>
              <div><label style={lbl}>Nombre *</label><input value={formNombre} onChange={e=>setFormNombre(e.target.value)} placeholder="ej: Tri Set Deportivo" style={inp}/></div>
              <div>
                <label style={lbl}>Nº piezas *</label>
                <input type="number" min="2" max="10" value={formPiezas} onChange={e=>{setFormPiezas(e.target.value);setFormPiezasModelos([]);}} style={inp}/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
              <div>
                <label style={{...lbl,color:'#f59e0b'}}>💰 Precio MAYOR (€) *</label>
                <input type="number" step="0.01" min="0" value={formMayor} onChange={e=>setFormMayor(e.target.value)} placeholder="25.00" style={{...inp,border:'1px solid #f59e0b66'}}/>
                {formMayor&&nPiezasInt>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#f59e0b',marginTop:'3px'}}>→ €{(parseFloat(formMayor)/nPiezasInt).toFixed(2)}/prenda</div>}
              </div>
              <div>
                <label style={{...lbl,color:'#3b82f6'}}>💰 Precio DETAL (€) *</label>
                <input type="number" step="0.01" min="0" value={formDetal} onChange={e=>setFormDetal(e.target.value)} placeholder="30.00" style={{...inp,border:'1px solid #3b82f666'}}/>
                {formDetal&&nPiezasInt>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#3b82f6',marginTop:'3px'}}>→ €{(parseFloat(formDetal)/nPiezasInt).toFixed(2)}/prenda</div>}
              </div>
            </div>

            <div style={{marginBottom:'10px'}}><label style={lbl}>Descripción</label><input value={formDesc} onChange={e=>setFormDesc(e.target.value)} placeholder="ej: Legging + Jacket + Top Halter" style={inp}/></div>

            <div style={{marginBottom:'10px'}}>
              <label style={lbl}>📸 Foto principal URL</label>
              <input value={formFotoUrl} onChange={e=>setFormFotoUrl(e.target.value)} placeholder="https://..." style={inp}/>
              {formFotoUrl.trim()&&(
                <div style={{marginTop:'6px',display:'flex',alignItems:'center',gap:'8px'}}>
                  <img src={formFotoUrl.trim()} alt="preview" style={{width:'50px',height:'60px',objectFit:'cover',border:'1px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>Preview</span>
                </div>
              )}
            </div>

            <div style={{marginBottom:'14px'}}>
              <label style={lbl}>🖼️ Fotos extra — URLs separadas por coma (galería en catálogo público)</label>
              <textarea
                value={formFotosExtra}
                onChange={e=>setFormFotosExtra(e.target.value)}
                placeholder="https://url2.jpg, https://url3.jpg, https://url4.jpg"
                style={{...inp, height:'60px', resize:'vertical', fontFamily:'DM Mono,monospace', fontSize:'11px'}}
              />
              {formFotosExtra.trim() && (
                <div style={{display:'flex',gap:'5px',marginTop:'6px',flexWrap:'wrap'}}>
                  {formFotosExtra.split(',').map(u=>u.trim()).filter(Boolean).map((u,i)=>(
                    <img key={i} src={u} alt="" style={{width:'40px',height:'50px',objectFit:'cover',border:'1px solid var(--border)'}} onError={e=>e.target.style.display='none'}/>
                  ))}
                </div>
              )}
            </div>

            {/* Estado activo */}
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px',padding:'10px 12px',background:'var(--bg2)',border:'1px solid var(--border)'}}>
              <label style={{...lbl,marginBottom:0,flex:1}}>Promo activa (visible en catálogo)</label>
              <button onClick={()=>setFormActivo(v=>!v)}
                style={{width:'44px',height:'24px',borderRadius:'12px',border:'none',cursor:'pointer',background:formActivo?'#7c3aed':'var(--bg3)',position:'relative',transition:'background .2s',flexShrink:0}}>
                <span style={{position:'absolute',top:'2px',left:formActivo?'22px':'2px',width:'20px',height:'20px',borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)',display:'block'}}/>
              </button>
            </div>

            {/* ── Selector piezas_modelos ── */}
            <div style={{borderTop:'1px solid var(--border)',paddingTop:'14px',marginBottom:'14px'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',marginBottom:'8px'}}>
                <div style={{flex:1}}>
                  <label style={{...lbl,marginBottom:'3px',color:formPiezasModelos.length===nPiezasInt&&nPiezasInt>0?'#16c65a':'#c9a84c'}}>
                    ✨ MODELOS DEL SET (catálogo automático)
                  </label>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#888',lineHeight:1.7}}>
                    Selecciona exactamente {nPiezasInt} modelo{nPiezasInt!==1?'s':''}. El catálogo web mostrará los colores donde <strong>todas</strong> las prendas tienen stock ≥ 1.
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                  <span style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,
                    color:formPiezasModelos.length===nPiezasInt&&nPiezasInt>0?'#16c65a':formPiezasModelos.length>0?'#f59e0b':'#aaa'}}>
                    {formPiezasModelos.length}/{nPiezasInt}
                  </span>
                  {formPiezasModelos.length>0&&<button onClick={()=>setFormPiezasModelos([])} style={{padding:'2px 8px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>Limpiar</button>}
                </div>
              </div>

              {formPiezasModelos.length>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'10px'}}>
                  {formPiezasModelos.map((key,idx)=>{
                    const colors=['rgba(201,168,76,.12)','rgba(59,130,246,.1)','rgba(22,198,90,.1)','rgba(168,85,247,.1)'];
                    const borders=['rgba(201,168,76,.4)','rgba(59,130,246,.35)','rgba(22,198,90,.35)','rgba(168,85,247,.35)'];
                    const txts=['#c9a84c','#3b82f6','#16c65a','#a855f7'];
                    const ci=idx%4;
                    return(
                      <div key={key} style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 9px',background:colors[ci],border:`1px solid ${borders[ci]}`,borderRadius:'2px'}}>
                        <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:txts[ci],fontWeight:700}}>{idx+1}. {key.split('__')[1]||key}</span>
                        <button onClick={()=>toggleModelKey(key)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:'10px',padding:'0 0 0 2px',lineHeight:1}}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {nPiezasInt>=2&&formPiezasModelos.length<nPiezasInt&&(
                <div>
                  <input value={modelSearch} onChange={e=>setModelSearch(e.target.value)} placeholder="Buscar modelo… (ej: legging, jacket, top)" style={{...inp,marginBottom:'7px',fontSize:'12px'}}/>
                  <div style={{maxHeight:'180px',overflowY:'auto',border:'1px solid var(--border)',background:'var(--bg)'}}>
                    {modelosFiltrados.length===0
                      ?<div style={{padding:'16px',textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#aaa'}}>Sin resultados</div>
                      :modelosFiltrados.map(m=>{
                        const ya=formPiezasModelos.includes(m.key);
                        return(
                          <div key={m.key} onClick={()=>{if(!ya&&formPiezasModelos.length<nPiezasInt)toggleModelKey(m.key);}}
                            style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderBottom:'1px solid var(--border)',
                              cursor:ya?'default':'pointer',background:ya?'var(--bg2)':'var(--bg)',opacity:ya?.4:1,transition:'background .1s'}}
                            onMouseEnter={e=>{if(!ya)e.currentTarget.style.background='var(--bg2)';}}
                            onMouseLeave={e=>{if(!ya)e.currentTarget.style.background='var(--bg)';}} >
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.modelo}</div>
                              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa',letterSpacing:'.08em'}}>{m.categoria}</div>
                            </div>
                            {ya?<span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#aaa'}}>ya incluida</span>
                              :<span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#7c3aed',fontWeight:700}}>+ Añadir</span>}
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}

              {formPiezasModelos.length===nPiezasInt&&nPiezasInt>0&&(
                <div style={{marginTop:'8px',padding:'8px 11px',background:'rgba(22,198,90,.08)',border:'1px solid rgba(22,198,90,.25)',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#16c65a',lineHeight:1.8}}>
                  ✅ Set listo — el catálogo mostrará los colores donde <strong>{formPiezasModelos.map(k=>k.split('__')[1]||k).join(', ')}</strong> tengan stock completo.
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={guardar} disabled={saving}
                style={{padding:'10px 24px',background:'#7c3aed',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700,textTransform:'uppercase',opacity:saving?.6:1}}>
                {saving?'⏳':editId?'✓ Guardar cambios':'+ Crear promo'}
              </button>
              {editId&&<button onClick={()=>{resetForm();}} style={{padding:'10px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px'}}>Cancelar</button>}
            </div>
          </div>
        )}

        {/* ══ LISTA DE PROMOS ══ */}
        {loading ? (
          <div style={{padding:'48px',textAlign:'center',fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>⏳ Cargando...</div>
        ) : promos.length===0 ? (
          <div style={{padding:'48px',textAlign:'center'}}>
            <div style={{fontSize:'44px',marginBottom:'12px'}}>🎁</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888',marginBottom:'16px'}}>No hay promos aún</div>
            <button onClick={()=>setVistaAdmin(true)} style={{padding:'10px 20px',background:'#7c3aed',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700}}>+ Crear primera promo</button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {promos.map(p => {
              const tieneModelos = Array.isArray(p.piezas_modelos)&&p.piezas_modelos.length>0;
              const comboData    = combos.find(c=>c.id===p.id);
              return (
                <div key={p.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`4px solid ${p.activo?'#7c3aed':'#ccc'}`,overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:'14px',padding:'14px 16px',alignItems:'start'}}>
                    {/* Foto */}
                    <div style={{width:'56px',height:'68px',background:'var(--bg3)',border:'1px solid var(--border)',overflow:'hidden',flexShrink:0,marginTop:'2px'}}>
                      {p.foto_url
                        ?<img src={p.foto_url} alt={p.nombre} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>
                        :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',color:'#ccc'}}>✨</div>
                      }
                    </div>

                    {/* Info */}
                    <div style={{minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'5px'}}>
                        <span style={{fontFamily:'Poppins,sans-serif',fontSize:'15px',fontWeight:700}}>{p.nombre}</span>
                        {!p.activo&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',background:'#f5f5f5',color:'#999',border:'1px solid #e5e5e5',padding:'1px 7px'}}>INACTIVA</span>}
                        {tieneModelos&&<span style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',background:'rgba(201,168,76,.1)',color:'#c9a84c',border:'1px solid rgba(201,168,76,.3)',padding:'1px 7px',letterSpacing:'.08em'}}>✨ AUTO</span>}
                      </div>
                      <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',lineHeight:1.8}}>
                        <span style={{color:'#f59e0b',fontWeight:700}}>Mayor: €{(p.precio_mayor||0).toFixed(2)}</span>
                        {' · '}
                        <span style={{color:'#3b82f6',fontWeight:700}}>Detal: €{(p.precio_detal||0).toFixed(2)}</span>
                        {' · '}
                        {p.num_piezas} piezas
                      </div>
                      {p.descripcion&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8.5px',color:'#aaa',marginTop:'2px'}}>{p.descripcion}</div>}
                      {tieneModelos&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'8.5px',color:'#c9a84c',marginTop:'3px'}}>{p.piezas_modelos.map(k=>k.split('__')[1]||k).join(' + ')}</div>}

                      {/* Disponibilidad en tiempo real */}
                      {p.activo&&tieneModelos&&!combosLoad&&(
                        <div style={{marginTop:'8px',display:'flex',flexWrap:'wrap',gap:'5px'}}>
                          {comboData?.colores_disponibles?.length>0
                            ?comboData.colores_disponibles.map(cd=>(
                              <span key={cd.color} style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'3px 8px',
                                background:'rgba(22,198,90,.08)',border:'1px solid rgba(22,198,90,.2)',
                                fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#16c65a'}}>
                                <span style={{width:'8px',height:'8px',borderRadius:'50%',background:colorHex(cd.color),display:'inline-block',border:'1px solid rgba(0,0,0,.1)'}}/>
                                {cd.color} · {cd.stock} disp.
                              </span>
                            ))
                            :<span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#dc2626',background:'rgba(220,38,38,.06)',border:'1px solid rgba(220,38,38,.15)',padding:'3px 8px'}}>
                              Sin colores disponibles actualmente
                            </span>
                          }
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{display:'flex',flexDirection:'column',gap:'6px',flexShrink:0}}>
                      <button onClick={()=>editarPromo(p)}
                        style={{padding:'6px 14px',background:'none',border:'1px solid #7c3aed',color:'#7c3aed',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,whiteSpace:'nowrap'}}>
                        ✏️ Editar
                      </button>
                      <button onClick={()=>toggleActivo(p)}
                        style={{padding:'6px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:p.activo?'var(--green)':'#aaa',whiteSpace:'nowrap'}}>
                        {p.activo?'✓ Activa':'○ Inactiva'}
                      </button>
                      <button onClick={()=>eliminar(p)}
                        style={{padding:'6px 14px',background:'none',border:'1px solid var(--red)',color:'var(--red)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',whiteSpace:'nowrap'}}>
                        ✕ Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}