'use client';
import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

const lbl = { fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.14em', textTransform:'uppercase', color:'#666', display:'block', marginBottom:'5px' };
const inp = { width:'100%', padding:'8px 10px', background:'var(--bg2)', border:'1px solid var(--border)', fontFamily:'Poppins,sans-serif', fontSize:'12px', outline:'none', boxSizing:'border-box' };

// FIX PROBLEMA 1: mismo helper que en /catalogo/page.js
// Codifica espacios literales en URLs del bucket "MODITEX GROUP" → "MODITEX%20GROUP"
function safeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.replace(/ /g, '%20');
}

export default function CatalogoAdminPage() {
  const { data } = useAppData() || {};
  const productos = data?.productos || [];

  const [cfgMap,   setCfgMap]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null);
  const [buscar,   setBuscar]   = useState('');
  const [filtrocat,setFiltro]   = useState('');
  const [editKey,  setEditKey]  = useState(null);
  const [editData, setEditData] = useState({});
  const [msg,      setMsg]      = useState(null);

  const [dbOk,       setDbOk]       = useState(null);
  const [tabActivo,  setTabActivo]  = useState('prendas'); // 'prendas' | 'promos' | 'correos'
  // ── Promos ─────────────────────────────────────────────────────────────────
  const [promos,         setPromos]         = useState([]);
  const [promosLoading,  setPromosLoading]  = useState(false);
  const [promoEditId,    setPromoEditId]    = useState(null);
  const [promoFoto,      setPromoFoto]      = useState('');
  const [promoDesc,      setPromoDesc]      = useState('');
  const [promoActivo,    setPromoActivo]    = useState(true);
  const [promoSaving,    setPromoSaving]    = useState(null);
  const [promoMsg,       setPromoMsg]       = useState(null);
  // ── Configuración de email ──────────────────────────────────────────────────
  const [settings,   setSettings]   = useState({
    email_requerido: false, email_incentivo: '', email_boton_texto: 'Obtener oferta',
    mensaje_banner: '', mensaje_tipo: 'info', mensaje_activo: false,
    flash_activo: false, flash_texto: '', flash_hasta: '', flash_color: '#ef4444',
  });
  const [savingCfg,  setSavingCfg]  = useState(false);
  const [emailCount, setEmailCount] = useState(null);
  const [exportandoCSV, setExportandoCSV] = useState(false);

  useEffect(() => {
    cargarConfig();
    cargarPromos();
    fetch('/api/catalogo-config')
      .then(r => r.json())
      .then(res => { setDbOk(res.ok !== false); })
      .catch(() => setDbOk(false));
    // Cargar settings de email
    fetch('/api/catalogo-settings')
      .then(r => r.json())
      .then(res => { if (res.ok) setSettings({
        email_requerido: res.email_requerido,
        email_incentivo: res.email_incentivo || '',
        email_boton_texto: res.email_boton_texto || '',
        mensaje_banner: res.mensaje_banner || '',
        mensaje_tipo: res.mensaje_tipo || 'info',
        mensaje_activo: res.mensaje_activo || false,
        flash_activo: res.flash_activo || false,
        flash_texto: res.flash_texto || '',
        flash_hasta: res.flash_hasta || '',
        flash_color: res.flash_color || '#ef4444',
        flash_imagen: res.flash_imagen || '',
        flash_marquee: res.flash_marquee || 'ALERTA OFERTA ESPECIAL',
        grid_banners: res.grid_banners || [],
      }); })
      .catch(() => {});
    // Contar correos capturados
    fetch('/api/emails-catalogo')
      .then(r => r.json())
      .then(res => { if (res.ok) setEmailCount(res.emails?.length || 0); })
      .catch(() => {});
  }, []);

  async function guardarSettings() {
    setSavingCfg(true);
    try {
      const res = await fetch('/api/catalogo-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }).then(r => r.json());
      setMsg({ t: res.ok ? 'ok' : 'err', m: res.ok ? '✓ Configuración guardada' : 'Error: ' + res.error });
      setTimeout(() => setMsg(null), 3000);
    } catch(e) {
      setMsg({ t:'err', m:'Error: ' + e.message });
    }
    setSavingCfg(false);
  }

  async function exportarCSV() {
    setExportandoCSV(true);
    try {
      const res = await fetch('/api/emails-catalogo').then(r => r.json());
      if (!res.ok || !res.emails?.length) {
        setMsg({ t:'err', m:'No hay correos para exportar.' });
        setTimeout(() => setMsg(null), 3000);
        setExportandoCSV(false);
        return;
      }
      const headers = ['correo', 'nombre', 'fecha'];
      const rows = res.emails.map(e => [
        `"${(e.email||'').replace(/"/g,'""')}"`,
        `"${(e.nombre||'').replace(/"/g,'""')}"`,
        `"${e.created_at ? new Date(e.created_at).toLocaleDateString('es-VE') : ''}"`,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `correos-moditex-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg({ t:'ok', m:`✓ ${res.emails.length} correos exportados` });
      setTimeout(() => setMsg(null), 3000);
    } catch(e) {
      setMsg({ t:'err', m:'Error al exportar: ' + e.message });
    }
    setExportandoCSV(false);
  }

  async function cargarPromos() {
    setPromosLoading(true);
    try { const r = await fetch('/api/promos').then(x=>x.json()); if(r.ok) setPromos(r.promos); } catch {}
    setPromosLoading(false);
  }

  async function abrirPromoEdit(p) {
    setPromoEditId(p.id); setPromoFoto(p.foto_url||'');
    setPromoDesc(p.descripcion||''); setPromoActivo(p.activo); setPromoMsg(null);
  }

  async function guardarPromo() {
    if (!promoEditId) return;
    setPromoSaving(promoEditId);
    const res = await fetch('/api/promos',{
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:promoEditId, foto_url:promoFoto.trim(), descripcion:promoDesc, activo:promoActivo })
    }).then(r=>r.json());
    if (res.ok) { setPromoMsg({t:'ok',m:'✓ Guardado'}); cargarPromos(); setTimeout(()=>setPromoMsg(null),3000); }
    else setPromoMsg({t:'err',m:res.error});
    setPromoSaving(null);
  }

  async function togglePromoActivo(p) {
    await fetch('/api/promos',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,activo:!p.activo})});
    if (promoEditId===p.id) setPromoActivo(!p.activo);
    cargarPromos();
  }

  async function cargarConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/catalogo-config').then(r => r.json());
      if (res.ok) {
        const map = {};
        (res.configs||[]).forEach(cfg => { map[cfg.modelo_key] = cfg; });
        setCfgMap(map);
      } else {
        setMsg({ t:'err', m:'No se pudo cargar config: ' + (res.error||'error') });
      }
    } catch(e) {
      setMsg({ t:'err', m:'Error de conexión: ' + e.message });
    }
    setLoading(false);
  }

  const modelos = useMemo(() => {
    const map = {};
    productos.forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!map[key]) map[key] = { key, categoria:p.categoria, modelo:p.modelo, skus:[], tela:p.tela||'' };
      map[key].skus.push({ sku:p.sku, color:p.color, disponible:p.disponible||0 });
    });
    return Object.values(map).sort((a,b) => a.categoria.localeCompare(b.categoria) || a.modelo.localeCompare(b.modelo));
  }, [productos]);

  const categorias = useMemo(() => [...new Set(modelos.map(m => m.categoria))].sort(), [modelos]);

  const filtrados = useMemo(() => {
    let r = modelos;
    if (filtrocat) r = r.filter(m => m.categoria === filtrocat);
    if (buscar.trim()) {
      const q = buscar.toLowerCase();
      r = r.filter(m => `${m.modelo} ${m.categoria}`.toLowerCase().includes(q));
    }
    return r;
  }, [modelos, filtrocat, buscar]);

  async function toggleCatalogo(key, current) {
    setSaving(key);
    const newVal = !current;
    setCfgMap(prev => ({ ...prev, [key]: { ...(prev[key]||{}), modelo_key:key, en_catalogo:newVal } }));
    try {
      const res = await fetch('/api/catalogo', {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ modelo_key:key, en_catalogo: newVal }),
      }).then(r=>r.json());
      if (res.ok) {
        setMsg({ t:'ok', m: newVal ? '✓ Prenda visible en catálogo' : '✓ Prenda ocultada del catálogo' });
        setTimeout(() => { cargarConfig(); setMsg(null); }, 2000);
      } else {
        setCfgMap(prev => ({ ...prev, [key]: { ...(prev[key]||{}), modelo_key:key, en_catalogo:current } }));
        setMsg({ t:'err', m:'Error: ' + (res.error||'desconocido') });
      }
    } catch(e) {
      setCfgMap(prev => ({ ...prev, [key]: { ...(prev[key]||{}), modelo_key:key, en_catalogo:current } }));
      setMsg({ t:'err', m:'Error de conexión: ' + e.message });
    }
    setSaving(null);
  }

  function abrirEdicion(modelo) {
    const cfg = cfgMap[modelo.key] || {};
    setEditData({
      modelo_key: modelo.key,
      foto_url:    cfg.foto_url || '',
      fotos_extra: cfg.fotos_extra || '',
      descripcion: cfg.descripcion || '',
      orden:       cfg.orden !== undefined ? String(cfg.orden) : '999',
      disponible_produccion: cfg.disponible_produccion || false,
      nota_produccion: cfg.nota_produccion || '',
    });
    setEditKey(modelo.key);
  }

  async function guardarEdicion() {
    setSaving('edit');
    const res = await fetch('/api/catalogo', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(editData),
    }).then(r => r.json());
    if (res.ok) {
      setCfgMap(prev => ({ ...prev, [editData.modelo_key]: { ...(prev[editData.modelo_key]||{}), ...editData } }));
      setMsg({ t:'ok', m:'✓ Guardado correctamente' });
      setEditKey(null);
    } else {
      setMsg({ t:'err', m:'Error: ' + res.error });
    }
    setSaving(null);
    setTimeout(() => setMsg(null), 3000);
  }

  const enCatalogoCount = modelos.filter(m => cfgMap[m.key]?.en_catalogo).length;
  const ocultasCount    = modelos.filter(m => cfgMap[m.key] && !cfgMap[m.key]?.en_catalogo).length;

  return (
    <Shell title="Catálogo Web">
      {/* Modal edición */}
      {editKey && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border-strong)', width:'100%', maxWidth:'520px', borderTop:'3px solid #7c3aed', padding:'24px' }}>
            <div style={{ fontFamily:'Playfair Display,serif', fontSize:'16px', fontWeight:700, marginBottom:'20px' }}>
              Configurar prenda en catálogo
            </div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', marginBottom:'20px' }}>
              {editKey}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div>
                <label style={lbl}>📸 URL foto principal</label>
                <input style={inp} value={editData.foto_url}
                  onChange={e => setEditData(p => ({...p, foto_url:e.target.value}))}
                  placeholder="https://... (desde Supabase Storage, Imgur, etc.)"/>
                {/* FIX PROBLEMA 1: safeUrl() en la preview del admin también */}
                {editData.foto_url && (
                  <div style={{ marginTop:'8px', width:'80px', height:'100px', overflow:'hidden', border:'1px solid var(--border)' }}>
                    <img src={safeUrl(editData.foto_url)} style={{ width:'100%', height:'100%', objectFit:'cover' }}
                      onError={e => e.target.style.display='none'}/>
                  </div>
                )}
                <div style={{ marginTop:'6px', fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#aaa', lineHeight:1.7 }}>
                  💡 Tip: si la imagen no aparece en la preview, verifica que la URL no tenga espacios sin codificar.<br/>
                  Ejemplo correcto: <code style={{color:'#7c3aed'}}>.../MODITEX%20GROUP/foto.jpg</code>
                </div>
              </div>
              <div>
                <label style={lbl}>🖼️ Fotos extra (URLs separadas por coma)</label>
                <textarea style={{ ...inp, height:'70px', resize:'vertical', fontFamily:'DM Mono,monospace', fontSize:'10px' }}
                  value={editData.fotos_extra}
                  onChange={e => setEditData(p => ({...p, fotos_extra:e.target.value}))}
                  placeholder="https://url1.jpg, https://url2.jpg, https://url3.jpg"/>
              </div>
              <div>
                <label style={lbl}>📝 Descripción para el cliente</label>
                <textarea style={{ ...inp, height:'80px', resize:'vertical' }}
                  value={editData.descripcion}
                  onChange={e => setEditData(p => ({...p, descripcion:e.target.value}))}
                  placeholder="ej: Conjunto deportivo de lycra cuatro vías. Tela premium con tecnología anti-humedad..."/>
              </div>
              <div>
                <label style={lbl}>🔢 Orden de aparición (menor = primero)</label>
                <input type="number" min="0" max="999" style={{ ...inp, width:'120px' }}
                  value={editData.orden}
                  onChange={e => setEditData(p => ({...p, orden:e.target.value}))}/>
              </div>

              {/* 🏭 Configuración de Producción */}
              <div style={{ padding:'12px', background:'rgba(59,130,246,.05)', border:'1px solid rgba(59,130,246,.3)', borderRadius:'4px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div>
                    <label style={{...lbl, marginBottom:0, color:'#1e40af'}}>🏭 Disponible desde Producción</label>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#3b82f6', marginTop:'2px' }}>
                      Permite vender aunque el stock sea 0 (sale directo de producción).
                    </div>
                  </div>
                  <button onClick={() => setEditData(p => ({...p, disponible_produccion: !p.disponible_produccion}))}
                    style={{ width:'40px', height:'20px', borderRadius:'10px', border:'none', cursor:'pointer', background:editData.disponible_produccion?'#3b82f6':'var(--bg3)', position:'relative', transition:'background .2s', flexShrink:0 }}>
                    <span style={{ position:'absolute', top:'2px', left:editData.disponible_produccion?'22px':'2px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)', display:'block' }}/>
                  </button>
                </div>
                
                {editData.disponible_produccion && (
                  <div>
                    <label style={{...lbl, color:'#1e40af'}}>📝 Nota para el cliente (aparece cuando no hay stock físico)</label>
                    <input style={{...inp, borderColor:'rgba(59,130,246,.3)', background:'#fff'}} 
                      value={editData.nota_produccion}
                      onChange={e => setEditData(p => ({...p, nota_produccion:e.target.value}))}
                      placeholder="ej: Producción en curso, tiempo de envío: 48h"/>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display:'flex', gap:'10px', marginTop:'20px', justifyContent:'flex-end' }}>
              <button onClick={() => setEditKey(null)}
                style={{ padding:'9px 18px', background:'none', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px' }}>
                Cancelar
              </button>
              <button onClick={guardarEdicion} disabled={saving === 'edit'}
                style={{ padding:'9px 22px', background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, opacity:saving==='edit'?.6:1 }}>
                {saving === 'edit' ? '⏳ Guardando...' : '✓ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', letterSpacing:'.12em', marginBottom:'4px', textTransform:'uppercase' }}>
            Gestión de catálogo público
          </div>
          <div style={{ display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#7c3aed', fontWeight:700, background:'#f5f3ff', padding:'3px 10px', border:'1px solid #ddd6fe' }}>
              ● {enCatalogoCount} visibles en catálogo
            </span>
            {ocultasCount > 0 && (
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#dc2626', fontWeight:700, background:'#fef2f2', padding:'3px 10px', border:'1px solid #fecaca' }}>
                ✕ {ocultasCount} ocultas
              </span>
            )}
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={cargarConfig}
            style={{ padding:'9px 14px', background:'none', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#666', letterSpacing:'.08em' }}>
            ↺ Actualizar
          </button>
          <a href="/catalogo" target="_blank" rel="noreferrer"
            style={{ padding:'9px 16px', background:'#0a0a0a', color:'#c9a84c', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:'6px' }}>
            🌐 Ver catálogo →
          </a>
        </div>
      </div>

      {/* Database status */}
      {dbOk === false && (
        <div style={{ padding:'12px 16px', marginBottom:'16px', background:'#fff1f2', border:'1px solid rgba(217,30,30,.3)', borderLeft:'4px solid var(--red)', fontFamily:'DM Mono,monospace', fontSize:'10px', color:'var(--red)', lineHeight:1.8 }}>
          ⚠️ <strong>La tabla catalogo_config no existe en Supabase.</strong><br/>
          Debes ejecutar <strong>CATALOGO.sql</strong> en <strong>Supabase → SQL Editor → Run</strong> antes de usar esta pantalla.<br/>
          Sin eso los cambios que hagas aquí NO se guardan aunque se vean en pantalla.
        </div>
      )}
      {dbOk === true && (
        <div style={{ padding:'8px 16px', marginBottom:'12px', background:'var(--green-soft)', borderLeft:'3px solid var(--green)', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'var(--green)', fontWeight:700 }}>
          ✓ Base de datos conectada correctamente
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:'0', marginBottom:'20px', borderBottom:'2px solid var(--border)' }}>
        {[
          { key:'prendas', label:'👗 Prendas', count: enCatalogoCount },
          { key:'promos',  label:'✨ Sets & Combos', count: promos.filter(p=>p.activo).length },
          { key:'publicidad', label:'📸 Publicidad', count: settings.grid_banners?.length || 0 },
          { key:'correos', label:'📧 Correos & Config', count: null },
        ].map(tab => (
          <button key={tab.key} onClick={() => setTabActivo(tab.key)}
            style={{ padding:'10px 18px', background:'none', border:'none', borderBottom:`2px solid ${tabActivo===tab.key?'#7c3aed':'transparent'}`,
              cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase',
              color: tabActivo===tab.key ? '#7c3aed' : '#888', marginBottom:'-2px', transition:'all .15s', whiteSpace:'nowrap' }}>
            {tab.label}
            {tab.count !== null && <span style={{ marginLeft:'6px', background: tabActivo===tab.key?'#7c3aed':'#e5e5e5', color: tabActivo===tab.key?'#fff':'#888', borderRadius:'10px', padding:'1px 6px', fontSize:'8px' }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', marginBottom:'16px', background:msg.t==='ok'?'var(--green-soft)':'var(--red-soft)', borderLeft:`3px solid ${msg.t==='ok'?'var(--green)':'var(--red)'}`, color:msg.t==='ok'?'var(--green)':'var(--red)', fontFamily:'DM Mono,monospace', fontSize:'10px', fontWeight:700 }}>
          {msg.m}
        </div>
      )}

      {/* ══ TAB: SETS & COMBOS ══ */}
      {tabActivo === 'promos' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888' }}>
              {promos.length} promo{promos.length!==1?'s':''} · {promos.filter(p=>p.activo).length} activas
            </div>
            <a href="/promos" style={{ padding:'8px 16px', background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'6px' }}>
              ⚙️ Gestionar completo →
            </a>
          </div>
          {promosLoading ? (
            <div style={{ padding:'32px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888' }}>⏳ Cargando...</div>
          ) : promos.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center' }}>
              <div style={{ fontSize:'36px', marginBottom:'10px' }}>✨</div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888', marginBottom:'14px' }}>No hay promos creadas</div>
              <a href="/promos" style={{ padding:'9px 18px', background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, textDecoration:'none', display:'inline-block' }}>+ Crear primera promo</a>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {promos.map(p => {
                const tieneModelos = Array.isArray(p.piezas_modelos) && p.piezas_modelos.length > 0;
                const isEditing = promoEditId === p.id;
                return (
                  <div key={p.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderLeft:`4px solid ${p.activo?'#7c3aed':'#ccc'}` }}>
                    <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:'12px', padding:'12px 14px', alignItems:'center' }}>
                      {/* Thumb */}
                      <div style={{ width:'44px', height:'54px', background:'var(--bg3)', border:'1px solid var(--border)', overflow:'hidden', flexShrink:0 }}>
                        {p.foto_url
                          ? <img src={p.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
                          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', color:'#ccc' }}>✨</div>
                        }
                      </div>
                      {/* Info */}
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'7px', flexWrap:'wrap', marginBottom:'3px' }}>
                          <span style={{ fontFamily:'Poppins,sans-serif', fontSize:'13px', fontWeight:700 }}>{p.nombre}</span>
                          {!p.activo && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7px', background:'#f5f5f5', color:'#999', border:'1px solid #e5e5e5', padding:'1px 6px' }}>INACTIVA</span>}
                          {tieneModelos && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7px', background:'rgba(201,168,76,.1)', color:'#c9a84c', border:'1px solid rgba(201,168,76,.3)', padding:'1px 6px' }}>✨ AUTO</span>}
                        </div>
                        <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8.5px', color:'#888' }}>
                          <span style={{ color:'#f59e0b' }}>M:€{(p.precio_mayor||0).toFixed(2)}</span>
                          {' · '}<span style={{ color:'#3b82f6' }}>D:€{(p.precio_detal||0).toFixed(2)}</span>
                          {' · '}{p.num_piezas} pzs
                          {tieneModelos && <span style={{ color:'#c9a84c', marginLeft:'6px' }}>{p.piezas_modelos.map(k=>k.split('__')[1]||k).join(' + ')}</span>}
                        </div>
                      </div>
                      {/* Botones */}
                      <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                        <button onClick={() => isEditing ? setPromoEditId(null) : abrirPromoEdit(p)}
                          style={{ padding:'5px 12px', background:isEditing?'#7c3aed':'none', color:isEditing?'#fff':'#7c3aed', border:'1px solid #7c3aed', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700, whiteSpace:'nowrap' }}>
                          {isEditing ? '▲ Cerrar' : '✏️ Editar'}
                        </button>
                        <button onClick={() => togglePromoActivo(p)}
                          style={{ padding:'5px 10px', background:'none', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', color:p.activo?'var(--green)':'#aaa', whiteSpace:'nowrap' }}>
                          {p.activo ? '✓ ON' : '○ OFF'}
                        </button>
                      </div>
                    </div>

                    {/* Panel edición inline */}
                    {isEditing && (
                      <div style={{ borderTop:'1px solid var(--border)', padding:'14px 16px', background:'var(--bg2)' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                          <div>
                            <label style={lbl}>📸 Foto URL</label>
                            <input style={inp} value={promoFoto} onChange={e=>setPromoFoto(e.target.value)} placeholder="https://..."/>
                            {promoFoto.trim() && (
                              <img src={promoFoto.trim()} alt="preview" style={{ marginTop:'6px', width:'44px', height:'54px', objectFit:'cover', border:'1px solid var(--border)' }} onError={e=>e.target.style.display='none'}/>
                            )}
                          </div>
                          <div>
                            <label style={lbl}>📝 Descripción</label>
                            <textarea style={{ ...inp, height:'72px', resize:'vertical', fontSize:'12px' }} value={promoDesc} onChange={e=>setPromoDesc(e.target.value)} placeholder="Descripción breve del set…"/>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                          <label style={{ ...lbl, marginBottom:0 }}>Promo activa</label>
                          <button onClick={() => setPromoActivo(v=>!v)}
                            style={{ width:'40px', height:'22px', borderRadius:'11px', border:'none', cursor:'pointer', background:promoActivo?'#7c3aed':'var(--bg3)', position:'relative', transition:'background .2s', flexShrink:0 }}>
                            <span style={{ position:'absolute', top:'2px', left:promoActivo?'20px':'2px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)', display:'block' }}/>
                          </button>
                          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:promoActivo?'var(--green)':'#aaa' }}>{promoActivo?'Visible en catálogo':'Oculta'}</span>
                        </div>
                        {promoMsg && (
                          <div style={{ padding:'6px 10px', marginBottom:'10px', background:promoMsg.t==='ok'?'var(--green-soft)':'var(--red-soft)', color:promoMsg.t==='ok'?'var(--green)':'var(--red)', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700 }}>
                            {promoMsg.m}
                          </div>
                        )}
                        <div style={{ display:'flex', gap:'8px' }}>
                          <button onClick={guardarPromo} disabled={promoSaving===p.id}
                            style={{ padding:'8px 18px', background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, opacity:promoSaving===p.id?.6:1 }}>
                            {promoSaving===p.id ? '⏳ Guardando...' : '✓ Guardar'}
                          </button>
                          <button onClick={() => setPromoEditId(null)}
                            style={{ padding:'8px 14px', background:'none', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px' }}>
                            Cancelar
                          </button>
                        </div>
                        <div style={{ marginTop:'8px', fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#aaa' }}>
                          💡 Para editar modelos, precios o piezas del set → usa <a href="/promos" style={{ color:'#7c3aed', textDecoration:'none' }}>Gestión completa</a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: CORREOS & CONFIG ══ */}
      {tabActivo === 'correos' && (
      <div>
      {/* ── PANEL DE CORREOS ──────────────────────────────────────────── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', marginBottom:'20px' }}>
        <div style={{ padding:'12px 16px', background:'linear-gradient(135deg,#fffbf0,#fef3c7)', borderBottom:'1px solid #fde68a44', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
          <div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#c9a84c', letterSpacing:'.18em', textTransform:'uppercase', fontWeight:700 }}>
              📧 Captura de Correos · Publicidad
            </div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#92400e', marginTop:'3px' }}>
              {emailCount !== null ? <><strong>{emailCount}</strong> correos capturados hasta ahora</> : 'Cargando...'}
            </div>
          </div>
          <button onClick={exportarCSV} disabled={exportandoCSV || emailCount === 0}
            style={{ padding:'8px 16px', background:'#0a0a0a', color:'#c9a84c', border:'none', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700, letterSpacing:'.1em', opacity:(exportandoCSV||emailCount===0)?.5:1, whiteSpace:'nowrap' }}>
            {exportandoCSV ? '⏳ Exportando...' : '⬇ Exportar CSV'}
          </button>
        </div>
        <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
            <div>
              <div style={{ ...lbl, marginBottom:'2px' }}>Correo obligatorio en el pedido</div>
              <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'11px', color:'#888', lineHeight:1.5 }}>
                Si está activo, el cliente <strong>debe</strong> ingresar su correo antes de enviar por WhatsApp.
              </div>
            </div>
            <button onClick={() => setSettings(s => ({...s, email_requerido: !s.email_requerido}))}
              style={{ width:'44px', height:'24px', borderRadius:'12px', border:'none', cursor:'pointer',
                background: settings.email_requerido ? '#7c3aed' : 'var(--bg3)', position:'relative', transition:'background .2s', flexShrink:0 }}>
              <span style={{ position:'absolute', top:'2px', left: settings.email_requerido ? '22px' : '2px',
                width:'20px', height:'20px', borderRadius:'50%', background:'#fff', transition:'left .2s',
                boxShadow:'0 1px 3px rgba(0,0,0,.2)', display:'block' }}/>
            </button>
          </div>
          <div>
            <label style={lbl}>🎁 Mensaje incentivo (se muestra en el carrito del cliente)</label>
            <input style={inp} value={settings.email_incentivo}
              onChange={e => setSettings(s => ({...s, email_incentivo: e.target.value}))}
              placeholder="ej: Registra tu correo y recibe ofertas exclusivas antes que nadie 🎁"/>
            <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'10px', color:'#aaa', marginTop:'4px' }}>
              Déjalo vacío para no mostrar ningún incentivo.
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={guardarSettings} disabled={savingCfg}
              style={{ padding:'8px 20px', background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer',
                fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, opacity:savingCfg?.6:1 }}>
              {savingCfg ? '⏳ Guardando...' : '✓ Guardar configuración'}
            </button>
          </div>
        </div>
      </div>

      {/* ── PANEL MENSAJE DEL ADMIN ─────────────────────────────── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', marginBottom:'20px' }}>
        <div style={{ padding:'12px 16px', background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderBottom:'1px solid #bae6fd44', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
          <div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#0369a1', letterSpacing:'.18em', textTransform:'uppercase', fontWeight:700 }}>
              📢 Mensaje del Admin en el Catálogo
            </div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#075985', marginTop:'3px' }}>
              Aparece en la parte superior del catálogo público cuando está activo.
            </div>
          </div>
          <button onClick={() => setSettings(s => ({...s, mensaje_activo: !s.mensaje_activo}))}
            style={{ width:'44px', height:'24px', borderRadius:'12px', border:'none', cursor:'pointer',
              background: settings.mensaje_activo ? '#0ea5e9' : 'var(--bg3)', position:'relative', transition:'background .2s', flexShrink:0 }}>
            <span style={{ position:'absolute', top:'2px', left: settings.mensaje_activo ? '22px' : '2px',
              width:'20px', height:'20px', borderRadius:'50%', background:'#fff', transition:'left .2s',
              boxShadow:'0 1px 3px rgba(0,0,0,.2)', display:'block' }}/>
          </button>
        </div>
        <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div>
            <label style={lbl}>Tipo de mensaje</label>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {[
                { key:'info',  label:'ℹ️ Información', bg:'#0ea5e9', bg2:'rgba(14,165,233,.08)', border:'rgba(14,165,233,.3)' },
                { key:'warn',  label:'⚠️ Aviso',        bg:'#f59e0b', bg2:'rgba(245,158,11,.08)', border:'rgba(245,158,11,.3)' },
                { key:'promo', label:'🎉 Promo',        bg:'#7c3aed', bg2:'rgba(124,58,237,.08)', border:'rgba(124,58,237,.3)' },
              ].map(t => (
                <button key={t.key} onClick={() => setSettings(s => ({...s, mensaje_tipo: t.key}))}
                  style={{ padding:'6px 14px', border:`1px solid ${settings.mensaje_tipo===t.key?t.bg:t.border}`,
                    background: settings.mensaje_tipo===t.key ? t.bg2 : 'none',
                    cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700,
                    color: settings.mensaje_tipo===t.key ? t.bg : '#888', borderRadius:'3px', transition:'all .12s' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>Texto del mensaje</label>
            <textarea style={{ ...inp, height:'72px', resize:'vertical', fontSize:'12px' }}
              value={settings.mensaje_banner}
              onChange={e => setSettings(s => ({...s, mensaje_banner: e.target.value}))}
              placeholder="ej: 🚚 Despachos los martes y jueves. Pedidos hasta el lunes 12pm."/>
          </div>
          {settings.mensaje_banner && (
            <div style={{ padding:'10px 14px', fontFamily:'Poppins,sans-serif', fontSize:'12px', lineHeight:1.6,
              background: settings.mensaje_tipo==='warn'?'rgba(245,158,11,.08)':settings.mensaje_tipo==='promo'?'rgba(124,58,237,.08)':'rgba(14,165,233,.08)',
              border: `1px solid ${settings.mensaje_tipo==='warn'?'rgba(245,158,11,.3)':settings.mensaje_tipo==='promo'?'rgba(124,58,237,.3)':'rgba(14,165,233,.3)'}`,
              borderLeft: `3px solid ${settings.mensaje_tipo==='warn'?'#f59e0b':settings.mensaje_tipo==='promo'?'#7c3aed':'#0ea5e9'}`,
              color: settings.mensaje_tipo==='warn'?'#92400e':settings.mensaje_tipo==='promo'?'#4c1d95':'#075985' }}>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.1em', opacity:.6 }}>PREVIEW: </span>
              {settings.mensaje_banner}
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={guardarSettings} disabled={savingCfg}
              style={{ padding:'8px 20px', background:'#0ea5e9', color:'#fff', border:'none', cursor:'pointer',
                fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, opacity:savingCfg?.6:1 }}>
              {savingCfg ? '⏳ Guardando...' : '✓ Guardar mensaje'}
            </button>
          </div>
        </div>
      </div>

      {/* ── PANEL OFERTA FLASH ───────────────────────────────────── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', marginBottom:'20px' }}>
        <div style={{ padding:'12px 16px', background:'linear-gradient(135deg,#fff1f2,#ffe4e6)', borderBottom:'1px solid #fecdd344', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
          <div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#e11d48', letterSpacing:'.18em', textTransform:'uppercase', fontWeight:700 }}>
              ⚡ Oferta Flash
            </div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#be123c', marginTop:'3px' }}>
              Banner urgente con cuenta regresiva visible en el catálogo público.
            </div>
          </div>
          <button onClick={() => setSettings(s => ({...s, flash_activo: !s.flash_activo}))}
            style={{ width:'44px', height:'24px', borderRadius:'12px', border:'none', cursor:'pointer',
              background: settings.flash_activo ? '#e11d48' : 'var(--bg3)', position:'relative', transition:'background .2s', flexShrink:0 }}>
            <span style={{ position:'absolute', top:'2px', left: settings.flash_activo ? '22px' : '2px',
              width:'20px', height:'20px', borderRadius:'50%', background:'#fff', transition:'left .2s',
              boxShadow:'0 1px 3px rgba(0,0,0,.2)', display:'block' }}/>
          </button>
        </div>
        <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div>
            <label style={lbl}>Texto de la oferta</label>
            <input style={inp} value={settings.flash_texto}
              onChange={e => setSettings(s => ({...s, flash_texto: e.target.value}))}
              placeholder="ej: ⚡ 20% OFF en todos los conjuntos deportivos — Solo hoy"/>
          </div>
          <div>
            <label style={lbl}>URL Imagen de Fondo (Supabase Storage)</label>
            <input style={inp} value={settings.flash_imagen}
              onChange={e => setSettings(s => ({...s, flash_imagen: e.target.value}))}
              placeholder="https://..."/>
          </div>
          <div>
            <label style={lbl}>Texto en movimiento (Alerta Superior)</label>
            <input style={inp} value={settings.flash_marquee}
              onChange={e => setSettings(s => ({...s, flash_marquee: e.target.value}))}
              placeholder="ej: ALERTA OFERTA ESPECIAL"/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <label style={lbl}>Válida hasta (fecha y hora)</label>
              <input type="datetime-local" style={inp} value={settings.flash_hasta}
                onChange={e => setSettings(s => ({...s, flash_hasta: e.target.value}))}/>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#aaa', marginTop:'4px' }}>
                Muestra una cuenta regresiva al cliente. Vacío = sin countdown.
              </div>
            </div>
            <div>
              <label style={lbl}>Color del banner</label>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'4px' }}>
                {['#ef4444','#f59e0b','#7c3aed','#0ea5e9','#16a34a','#0a0a0a'].map(c => (
                  <button key={c} onClick={() => setSettings(s => ({...s, flash_color: c}))}
                    style={{ width:'28px', height:'28px', background:c, border:`2px solid ${settings.flash_color===c?'var(--ink)':'transparent'}`,
                      borderRadius:'50%', cursor:'pointer', transition:'border .12s', outline: settings.flash_color===c?'2px solid #fff':'' }}/>
                ))}
                <input type="color" value={settings.flash_color}
                  onChange={e => setSettings(s => ({...s, flash_color: e.target.value}))}
                  style={{ width:'28px', height:'28px', border:'none', borderRadius:'50%', cursor:'pointer', padding:0, background:'none' }}
                  title="Color personalizado"/>
              </div>
            </div>
          </div>
          {settings.flash_texto && (
            <div style={{ position:'relative', overflow:'hidden', minHeight:'120px', display:'flex', alignItems:'center', justifyContent:'center', background:settings.flash_color, color:'#fff', borderRadius:'2px', backgroundImage: settings.flash_imagen ? `url(${settings.flash_imagen})` : 'none', backgroundSize:'cover', backgroundPosition:'center' }}>
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.4)' }}/>
              <div style={{ position:'absolute', top:0, left:0, right:0, background:'repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, #facc15 10px, #facc15 20px)', padding:'3px', opacity:0.8 }}>
                 <div style={{ background:'#000', color:'#fff', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'8px', fontWeight:700, letterSpacing:'.2em' }}>{settings.flash_marquee}</div>
              </div>
              
              {/* Contenedor central (diagonal design in preview is simplified) */}
              <div style={{ position:'relative', zIndex:2, background:'rgba(0,0,0,.7)', padding:'15px 30px', transform:'skew(-10deg)', transition:'background .3s', border:`2px solid ${settings.flash_color}` }}>
                <span style={{ fontFamily:'Poppins,sans-serif', fontSize:'16px', fontWeight:800, transform:'skew(10deg)', display:'block', textAlign:'center', letterSpacing:'.05em' }}>
                  {settings.flash_texto}
                </span>
                {settings.flash_hasta && (
                  <span style={{ display:'block', textAlign:'center', marginTop:'4px', fontFamily:'DM Mono,monospace', fontSize:'9px', transform:'skew(10deg)', color:settings.flash_color }}>⏱ PREVIEW COUNTDOWN</span>
                )}
              </div>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={guardarSettings} disabled={savingCfg}
              style={{ padding:'8px 20px', background:'#e11d48', color:'#fff', border:'none', cursor:'pointer',
                fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, opacity:savingCfg?.6:1 }}>
              {savingCfg ? '⏳ Guardando...' : '✓ Guardar oferta flash'}
            </button>
          </div>
        </div>
      </div>

      </div>
      )} {/* end TAB correos */}

      {/* ══ TAB: PUBLICIDAD INTERCALADA ══ */}
      {tabActivo === 'publicidad' && (
      <div>
        <div style={{ padding:'12px 16px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderLeft:'3px solid #22c55e', marginBottom:'16px', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#166534', lineHeight:1.8 }}>
          <strong>Cómo funciona:</strong> Agrega banners publicitarios que aparecerán mezclados con las prendas en el catálogo. Define en qué <strong>posición</strong> quieres que aparezca cada foto (ej: 4, 12, etc). Estas imágenes ocupan el ancho completo en móviles (doble columna en PC) creando un efecto visual espectacular tipo Zara.
        </div>
        
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
          <button onClick={() => setSettings(s => ({...s, grid_banners: [...(s.grid_banners||[]), {id:Date.now(), imagen_url:'', posicion:4, enlace:''}]}))}
            style={{ padding:'8px 16px', background:'#22c55e', color:'#fff', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700 }}>
            + Añadir Nuevo Banner
          </button>
        </div>

        {(!settings.grid_banners || settings.grid_banners.length === 0) ? (
          <div style={{ padding:'40px 20px', textAlign:'center', border:'1px dashed var(--border)', color:'#888', fontFamily:'DM Mono,monospace', fontSize:'10px' }}>
            No hay banners publicitarios configurados.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            {settings.grid_banners.map((b, i) => (
              <div key={b.id || i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderLeft:'4px solid #22c55e', padding:'16px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'80px 1fr auto', gap:'16px' }}>
                  {/* Preview */}
                  <div style={{ width:'80px', height:'100px', background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                    {b.imagen_url ? <img src={b.imagen_url} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} onError={e=>e.target.style.display='none'}/> : '📸'}
                  </div>
                  {/* Configs */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    <div>
                      <label style={lbl}>URL de la Imagen (Supabase Storage)</label>
                      <input style={inp} value={b.imagen_url} placeholder="https://..."
                        onChange={e => setSettings(s => ({...s, grid_banners: s.grid_banners.map(x => x===b ? {...x, imagen_url: e.target.value} : x)}))}/>
                    </div>
                    <div style={{ display:'flex', gap:'16px' }}>
                      <div style={{ width:'120px' }}>
                        <label style={lbl}>Posición</label>
                        <input type="number" min="1" style={inp} value={b.posicion}
                          onChange={e => setSettings(s => ({...s, grid_banners: s.grid_banners.map(x => x===b ? {...x, posicion: parseInt(e.target.value)||1} : x)}))}/>
                        <div style={{ fontSize:'8px', color:'#aaa', marginTop:'4px', fontFamily:'DM Mono,monospace' }}>Después de la prenda N°</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <label style={lbl}>Enlace al hacer clic (Opcional)</label>
                        <input style={inp} value={b.enlace || ''} placeholder="ej: https://wa.me/..."
                          onChange={e => setSettings(s => ({...s, grid_banners: s.grid_banners.map(x => x===b ? {...x, enlace: e.target.value} : x)}))}/>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div>
                    <button onClick={() => setSettings(s => ({...s, grid_banners: s.grid_banners.filter(x => x!==b)}))}
                      style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:'16px' }} title="Eliminar banner">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'8px' }}>
              <button onClick={guardarSettings} disabled={savingCfg}
                style={{ padding:'10px 24px', background:'#22c55e', color:'#fff', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'12px', fontWeight:700, opacity:savingCfg?.6:1 }}>
                {savingCfg ? '⏳ Guardando...' : '✓ Guardar Cambios de Publicidad'}
              </button>
            </div>
          </div>
        )}
      </div>
      )} {/* end TAB publicidad */}

      {/* ══ TAB: PRENDAS ══ */}
      {tabActivo === 'prendas' && (
      <div>
      {/* Info */}
      <div style={{ padding:'12px 16px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderLeft:'3px solid #7c3aed', marginBottom:'16px', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#5b21b6', lineHeight:1.8 }}>
        <strong>Cómo funciona:</strong> Activa la prenda en el catálogo → agrega foto y descripción → los clientes la ven en tiempo real en <strong>/catalogo</strong> con el nivel de stock (Disponible / Pocas unidades / Bajo pedido) sin ver cantidades exactas.
        Para las fotos: sube las imágenes a <strong>Supabase Storage → Bucket: MODITEX GROUP</strong> y copia la URL pública.<br/>
        <strong>⚡ Realtime:</strong> Los cambios se reflejan en el catálogo en menos de 5 s si ejecutaste <strong>REALTIME_CATALOGO.sql</strong>.
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'14px', flexWrap:'wrap', alignItems:'center' }}>
        <input value={buscar} onChange={e => setBuscar(e.target.value)}
          placeholder="🔍 Buscar modelo..."
          style={{ ...inp, flex:1, minWidth:'180px', maxWidth:'280px' }}/>
        <button onClick={() => setFiltro('')}
          style={{ padding:'7px 12px', background:!filtrocat?'var(--ink)':'var(--bg2)', color:!filtrocat?'#fff':'#555', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700, letterSpacing:'.1em' }}>
          Todos ({modelos.length})
        </button>
        {categorias.map(cat => (
          <button key={cat} onClick={() => setFiltro(filtrocat===cat?'':cat)}
            style={{ padding:'7px 12px', background:filtrocat===cat?'var(--ink)':'var(--bg2)', color:filtrocat===cat?'#fff':'#555', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:filtrocat===cat?700:500, letterSpacing:'.08em', whiteSpace:'nowrap' }}>
            {cat} ({modelos.filter(m=>m.categoria===cat).length})
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
        <div style={{ padding:'10px 14px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'auto 1fr auto auto auto', gap:'12px', alignItems:'center' }}>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', color:'#666', letterSpacing:'.16em', textTransform:'uppercase' }}>Activo</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', color:'#666', letterSpacing:'.16em', textTransform:'uppercase' }}>Prenda</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', color:'#666', letterSpacing:'.16em', textTransform:'uppercase', textAlign:'center' }}>Foto</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', color:'#666', letterSpacing:'.16em', textTransform:'uppercase' }}>Variantes</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', color:'#666', letterSpacing:'.16em', textTransform:'uppercase' }}>Editar</span>
        </div>

        {loading ? (
          <div style={{ padding:'40px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888' }}>⏳ Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888' }}>Sin resultados</div>
        ) : (
          filtrados.map(modelo => {
            const cfg = cfgMap[modelo.key] || {};
            const activo = cfg.en_catalogo || false;
            const tienesFoto = !!cfg.foto_url;
            const tieneDesc = !!cfg.descripcion;
            const dispCount = modelo.skus.filter(s => s.disponible > 0).length;

            return (
              <div key={modelo.key}
                style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto auto', gap:'12px', padding:'10px 14px', borderBottom:'1px solid var(--border)', alignItems:'center', background:activo?'var(--bg)':'transparent', opacity: saving===modelo.key ? .5 : 1 }}>
                {/* Toggle */}
                <button onClick={() => toggleCatalogo(modelo.key, activo)}
                  style={{ width:'42px', height:'22px', borderRadius:'11px', border:'none', cursor:'pointer', background:activo?'#7c3aed':'var(--bg3)', position:'relative', transition:'background .2s', flexShrink:0 }}>
                  <span style={{ position:'absolute', top:'2px', left:activo?'22px':'2px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)', display:'block' }}/>
                </button>

                {/* Info */}
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'13px', fontWeight:600 }}>{modelo.modelo}</span>
                    {activo
                      ? <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', background:'#ede9fe', color:'#7c3aed', padding:'2px 7px', fontWeight:700, border:'1px solid #ddd6fe' }}>● VISIBLE EN CATÁLOGO</span>
                      : <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', background:'#fef2f2', color:'#dc2626', padding:'2px 7px', fontWeight:700, border:'1px solid #fecaca' }}>✕ OCULTA DEL CATÁLOGO</span>
                    }
                    {!tienesFoto && activo && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', background:'#fff8e1', color:'#f59e0b', padding:'1px 6px', fontWeight:700 }}>⚠ SIN FOTO</span>}
                    {!tieneDesc && activo && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', background:'#fff8e1', color:'#f59e0b', padding:'1px 6px', fontWeight:700 }}>⚠ SIN DESC.</span>}
                    {cfg.disponible_produccion && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', background:'#eff6ff', color:'#3b82f6', padding:'1px 6px', fontWeight:700, border:'1px solid #bfdbfe' }}>🏭 PRODUCCIÓN</span>}
                  </div>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8.5px', color:'#888', marginTop:'2px' }}>
                    {modelo.categoria} {modelo.tela ? `· ${modelo.tela}` : ''}
                    {cfg.descripcion && <span style={{ color:'#aaa' }}> · "{cfg.descripcion.slice(0, 40)}{cfg.descripcion.length > 40 ? '…' : ''}"</span>}
                  </div>
                </div>

                {/* Foto thumbnail — FIX PROBLEMA 1: safeUrl() aquí también */}
                <div style={{ width:'36px', height:'45px', background:'var(--bg3)', border:'1px solid var(--border)', overflow:'hidden', flexShrink:0 }}>
                  {tienesFoto ? (
                    <img src={safeUrl(cfg.foto_url)} style={{ width:'100%', height:'100%', objectFit:'cover' }}
                      onError={e => { e.target.style.display='none'; }}/>
                  ) : (
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:'#ccc' }}>📷</div>
                  )}
                </div>

                {/* Variantes */}
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', textAlign:'center', minWidth:'60px' }}>
                  <div style={{ fontWeight:700, color:dispCount>0?'var(--green)':'var(--red)' }}>{dispCount}</div>
                  <div>/{modelo.skus.length} disp.</div>
                </div>

                {/* Botón editar */}
                <button onClick={() => abrirEdicion(modelo)}
                  style={{ padding:'5px 12px', background:'none', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'9px', fontWeight:700, color:'#7c3aed', borderColor:'#7c3aed', whiteSpace:'nowrap' }}>
                  ✏️ Editar
                </button>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop:'16px', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#aaa', lineHeight:2 }}>
        📌 URL del catálogo para compartir con clientes: <strong style={{ color:'#7c3aed' }}>/catalogo</strong>
      </div>
      </div>
      )} {/* end TAB prendas */}
    </Shell>
  );
}