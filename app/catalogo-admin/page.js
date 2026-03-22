'use client';
import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

const lbl = { fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.14em', textTransform:'uppercase', color:'#666', display:'block', marginBottom:'5px' };
const inp = { width:'100%', padding:'8px 10px', background:'var(--bg2)', border:'1px solid var(--border)', fontFamily:'Poppins,sans-serif', fontSize:'12px', outline:'none', boxSizing:'border-box' };

export default function CatalogoAdminPage() {
  const { data } = useAppData() || {};
  const productos = data?.productos || [];

  const [cfgMap,   setCfgMap]   = useState({}); // { modelo_key: config }
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null);
  const [buscar,   setBuscar]   = useState('');
  const [filtrocat,setFiltro]   = useState('');
  const [editKey,  setEditKey]  = useState(null); // modal de edición
  const [editData, setEditData] = useState({});
  const [msg,      setMsg]      = useState(null);

  useEffect(() => { cargarConfig(); }, []);

  async function cargarConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/catalogo').then(r => r.json());
      if (res.ok) {
        const map = {};
        // La API retorna solo los en_catalogo=true. Necesitamos traer todos.
        // Por ahora cargamos lo que hay y el resto empieza en false
        res.modelos.forEach(m => { map[m.key] = m; });
        setCfgMap(map);
      }
    } catch {}
    // También fetch directo de la tabla
    try {
      const res2 = await fetch('/api/catalogo-config').then(r => r.json()).catch(() => ({ ok:false }));
      if (res2.ok) {
        const map2 = {};
        res2.configs.forEach(c => { map2[c.modelo_key] = c; });
        setCfgMap(map2);
      }
    } catch {}
    setLoading(false);
  }

  // Agrupar productos por modelo
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
    await fetch('/api/catalogo', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ modelo_key:key, en_catalogo: !current }),
    });
    setCfgMap(prev => ({ ...prev, [key]: { ...(prev[key]||{}), modelo_key:key, en_catalogo:!current } }));
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
                {editData.foto_url && (
                  <div style={{ marginTop:'8px', width:'80px', height:'100px', overflow:'hidden', border:'1px solid var(--border)' }}>
                    <img src={editData.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}
                      onError={e => e.target.style.display='none'}/>
                  </div>
                )}
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
          <div style={{ display:'flex', gap:'14px', alignItems:'center' }}>
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#7c3aed', fontWeight:700 }}>
              {enCatalogoCount} / {modelos.length} prendas visibles
            </span>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <a href="/catalogo" target="_blank" rel="noreferrer"
            style={{ padding:'9px 16px', background:'#0a0a0a', color:'#c9a84c', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:'6px' }}>
            🌐 Ver catálogo →
          </a>
        </div>
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', marginBottom:'16px', background:msg.t==='ok'?'var(--green-soft)':'var(--red-soft)', borderLeft:`3px solid ${msg.t==='ok'?'var(--green)':'var(--red)'}`, color:msg.t==='ok'?'var(--green)':'var(--red)', fontFamily:'DM Mono,monospace', fontSize:'10px', fontWeight:700 }}>
          {msg.m}
        </div>
      )}

      {/* Info */}
      <div style={{ padding:'12px 16px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderLeft:'3px solid #7c3aed', marginBottom:'16px', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#5b21b6', lineHeight:1.8 }}>
        <strong>Cómo funciona:</strong> Activa la prenda en el catálogo → agrega foto y descripción → los clientes la ven en tiempo real en <strong>/catalogo</strong> con el nivel de stock (Disponible / Pocas unidades / Bajo pedido) sin ver cantidades exactas.
        Para las fotos: sube las imágenes a <strong>Supabase Storage → Bucket: MODITEX GROUP</strong> y copia la URL pública.
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
                    {activo && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', background:'#ede9fe', color:'#7c3aed', padding:'1px 6px', fontWeight:700 }}>VISIBLE</span>}
                    {!tienesFoto && activo && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', background:'#fff8e1', color:'#f59e0b', padding:'1px 6px', fontWeight:700 }}>SIN FOTO</span>}
                    {!tieneDesc && activo && <span style={{ fontFamily:'DM Mono,monospace', fontSize:'7.5px', background:'#fff8e1', color:'#f59e0b', padding:'1px 6px', fontWeight:700 }}>SIN DESC.</span>}
                  </div>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8.5px', color:'#888', marginTop:'2px' }}>
                    {modelo.categoria} {modelo.tela ? `· ${modelo.tela}` : ''}
                    {cfg.descripcion && <span style={{ color:'#aaa' }}> · "{cfg.descripcion.slice(0, 40)}{cfg.descripcion.length > 40 ? '…' : ''}"</span>}
                  </div>
                </div>

                {/* Foto thumbnail */}
                <div style={{ width:'36px', height:'45px', background:'var(--bg3)', border:'1px solid var(--border)', overflow:'hidden', flexShrink:0 }}>
                  {tienesFoto ? (
                    <img src={cfg.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}
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
        📌 URL del catálogo para compartir con clientes: <strong style={{ color:'#7c3aed' }}>{typeof window !== 'undefined' ? window.location.origin : 'tu-dominio.vercel.app'}/catalogo</strong>
      </div>
    </Shell>
  );
}
