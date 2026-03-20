'use client';
import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { colorHex } from '@/utils/colores';

function fmt(n) { return '€ ' + Number(n||0).toFixed(2); }

const ESTADOS = {
  activo:   { label: 'En mostrador', color: '#1a7a3c', bg: 'rgba(26,122,60,.1)'  },
  vendido:  { label: 'Vendido',      color: '#d91e1e', bg: 'rgba(217,30,30,.1)'  },
  devuelto: { label: 'Al almacén',   color: '#9a4700', bg: 'rgba(154,71,0,.1)'   },
};

export default function ExhibicionPage() {
  const { data, recargar } = useAppData() || {};
  const productos = data?.productos || [];

  const [items,     setItems]     = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [filtro,    setFiltro]    = useState('activo');
  const [buscar,    setBuscar]    = useState('');
  const [guardando, setGuardando] = useState(false);
  const [msg,       setMsg]       = useState(null);

  // ── Modal agregar ──
  const [modalAgregar, setModalAgregar] = useState(false);
  const [buscarProd,   setBuscarProd]   = useState('');
  const [carrito,      setCarrito]      = useState({}); // { sku: cant }
  const [notas,        setNotas]        = useState('');

  // ── Modal vender ──
  const [modalVender, setModalVender] = useState(null); // item seleccionado
  const [precioVenta, setPrecioVenta] = useState('');

  function showMsg(t, m) { setMsg({ t, m }); setTimeout(() => setMsg(null), 4000); }

  async function cargarItems() {
    setCargando(true);
    try {
      const res = await fetch('/api/exhibicion?estado=all').then(r => r.json());
      if (res.ok) setItems(res.items || []);
    } catch { showMsg('error', 'Error al cargar'); }
    setCargando(false);
  }

  useEffect(() => { cargarItems(); }, []);

  // ── Filtrar lista ──
  const filtrados = useMemo(() => {
    const q = buscar.toLowerCase();
    return items.filter(i => {
      const matchEstado = filtro === 'all' || i.estado === filtro;
      const matchQ = !q || `${i.sku} ${i.modelo} ${i.color}`.toLowerCase().includes(q);
      return matchEstado && matchQ;
    });
  }, [items, filtro, buscar]);

  // ── Conteos ──
  const counts = useMemo(() => {
    const c = { activo: 0, vendido: 0, devuelto: 0 };
    items.forEach(i => { if (c[i.estado] !== undefined) c[i.estado]++; });
    return c;
  }, [items]);

  // ── Productos para el buscador del modal ──
  const prodsFiltrados = useMemo(() => {
    const q = buscarProd.toLowerCase().trim();
    if (!q) return [];
    return productos.filter(p =>
      `${p.sku} ${p.modelo} ${p.color} ${p.categoria}`.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [productos, buscarProd]);

  function addCarrito(sku, delta = 1) {
    setCarrito(prev => {
      const n = Math.max(0, (prev[sku] || 0) + delta);
      if (n === 0) { const x = {...prev}; delete x[sku]; return x; }
      return { ...prev, [sku]: n };
    });
  }

  async function enviarAMostrador() {
    const skus = Object.keys(carrito);
    if (!skus.length) { showMsg('error', 'Agrega al menos un producto'); return; }
    setGuardando(true);
    try {
      const payload = skus.map(sku => {
        const p = productos.find(x => x.sku === sku);
        return { sku, modelo: p?.modelo||'', color: p?.color||'', talla: p?.talla||'', cantidad: carrito[sku], notas };
      });
      const res = await fetch('/api/exhibicion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json());
      if (res.ok) {
        showMsg('ok', `✓ ${res.count} producto(s) enviados al mostrador`);
        setModalAgregar(false); setCarrito({}); setBuscarProd(''); setNotas('');
        cargarItems(); recargar();
      } else showMsg('error', res.error || 'Error al guardar');
    } catch { showMsg('error', 'Error de conexión'); }
    setGuardando(false);
  }

  async function cambiarEstado(id, estado, extra = {}) {
    setGuardando(true);
    try {
      const res = await fetch('/api/exhibicion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado, ...extra }),
      }).then(r => r.json());
      if (res.ok) {
        showMsg('ok', estado === 'vendido' ? '✓ Venta registrada' : '✓ Devuelto al almacén');
        setModalVender(null); setPrecioVenta('');
        cargarItems(); recargar();
      } else showMsg('error', res.error || 'Error');
    } catch { showMsg('error', 'Error de conexión'); }
    setGuardando(false);
  }

  const totalActivo = items.filter(i => i.estado === 'activo').reduce((a, i) => a + i.cantidad, 0);

  return (
    <Shell title="Exhibición / Mostrador">
      <style>{`
        .exh-tab { padding:6px 14px; border:1px solid var(--border); cursor:pointer;
          background:var(--bg2); font-family:'DM Mono',monospace; font-size:10px;
          border-radius:3px; transition:all .12s; }
        .exh-tab.active { background:var(--ink); color:#fff; border-color:var(--ink); }
        .exh-row { display:grid; grid-template-columns:1fr auto; gap:12px; align-items:center;
          padding:11px 14px; border-bottom:1px solid var(--border); }
        .exh-row:last-child { border-bottom:none; }
        .estado-badge { display:inline-flex; align-items:center; padding:3px 9px;
          border-radius:12px; font-size:10px; font-family:'DM Mono',monospace; white-space:nowrap; }
        .btn-accion { padding:5px 12px; border:1px solid var(--border); border-radius:3px;
          cursor:pointer; font-size:11px; background:var(--bg2); transition:all .12s; }
        .btn-accion:hover { background:var(--bg3); }
        .btn-rojo { background:var(--red); color:#fff; border-color:var(--red); }
        .btn-rojo:hover { opacity:.9; }
        .btn-verde { background:#1a7a3c; color:#fff; border-color:#1a7a3c; }
        .btn-verde:hover { opacity:.9; }
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:100;
          display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal-box { background:var(--bg); border:1px solid var(--border); border-radius:6px;
          width:100%; max-width:520px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; }
        .modal-head { padding:14px 16px; border-bottom:1px solid var(--border);
          font-family:'Poppins',sans-serif; font-size:14px; font-weight:600;
          display:flex; justify-content:space-between; align-items:center; }
        .modal-body { flex:1; overflow-y:auto; padding:16px; }
        .modal-foot { padding:12px 16px; border-top:1px solid var(--border); display:flex; gap:8px; }
        .prod-chip { display:flex; align-items:center; gap:8px; padding:8px 10px;
          border:1px solid var(--border); border-radius:4px; cursor:pointer; transition:background .1s; }
        .prod-chip:hover { background:var(--bg2); }
        .qty-ctrl { display:flex; align-items:center; gap:0; border:1px solid var(--border); border-radius:4px; overflow:hidden; }
        .qty-btn { width:26px; height:26px; border:none; background:var(--bg3);
          cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; }
        .qty-btn:hover { background:var(--border); }
        .qty-num { width:32px; text-align:center; font-family:'DM Mono',monospace; font-size:12px;
          border:none; border-left:1px solid var(--border); border-right:1px solid var(--border);
          background:var(--bg2); padding:4px 0; }
      `}</style>

      {/* Mensaje de estado */}
      {msg && (
        <div style={{ padding:'10px 14px', marginBottom:'12px', borderRadius:'3px',
          background: msg.t === 'ok' ? 'var(--green-soft)' : 'var(--red-soft)',
          border: `1px solid ${msg.t === 'ok' ? 'rgba(26,122,60,.3)' : 'rgba(217,30,30,.3)'}`,
          color: msg.t === 'ok' ? 'var(--green)' : 'var(--red)',
          fontFamily:'DM Mono,monospace', fontSize:'11px' }}>
          {msg.m}
        </div>
      )}

      {/* Header con stats */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:'140px', background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:'4px', padding:'12px 14px' }}>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#888',
            textTransform:'uppercase', letterSpacing:'.12em', marginBottom:'4px' }}>En mostrador</div>
          <div style={{ fontSize:'22px', fontWeight:500, color:'var(--green)' }}>{counts.activo}</div>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#888' }}>
            {totalActivo} uds. totales
          </div>
        </div>
        <div style={{ flex:1, minWidth:'140px', background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:'4px', padding:'12px 14px' }}>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#888',
            textTransform:'uppercase', letterSpacing:'.12em', marginBottom:'4px' }}>Vendidos</div>
          <div style={{ fontSize:'22px', fontWeight:500, color:'var(--red)' }}>{counts.vendido}</div>
        </div>
        <div style={{ flex:1, minWidth:'140px', background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:'4px', padding:'12px 14px' }}>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#888',
            textTransform:'uppercase', letterSpacing:'.12em', marginBottom:'4px' }}>Devueltos</div>
          <div style={{ fontSize:'22px', fontWeight:500, color:'var(--warn)' }}>{counts.devuelto}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center' }}>
          <button onClick={() => setModalAgregar(true)}
            style={{ padding:'10px 18px', background:'var(--ink)', color:'#fff', border:'none',
              cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'12px',
              fontWeight:600, borderRadius:'4px', whiteSpace:'nowrap' }}>
            + Enviar al mostrador
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center' }}>
        {[['activo','En mostrador'],['vendido','Vendidos'],['devuelto','Devueltos'],['all','Todos']].map(([k,l]) => (
          <button key={k} className={`exh-tab${filtro===k?' active':''}`} onClick={() => setFiltro(k)}>
            {l} {k !== 'all' ? `(${counts[k]||0})` : `(${items.length})`}
          </button>
        ))}
        <input value={buscar} onChange={e => setBuscar(e.target.value)}
          placeholder="Buscar SKU, modelo, color..."
          style={{ flex:1, minWidth:'180px', padding:'7px 10px', border:'1px solid var(--border)',
            fontFamily:'Poppins,sans-serif', fontSize:'12px', background:'var(--bg2)',
            outline:'none', borderRadius:'3px' }}/>
      </div>

      {/* Lista */}
      <div style={{ border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden', background:'var(--surface)' }}>
        {cargando ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888', fontFamily:'DM Mono,monospace', fontSize:'11px' }}>
            Cargando...
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center' }}>
            <div style={{ fontSize:'28px', marginBottom:'8px' }}>🏷️</div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888' }}>
              {filtro === 'activo' ? 'No hay prendas en el mostrador aún' : 'Sin resultados'}
            </div>
          </div>
        ) : (
          filtrados.map(item => {
            const est = ESTADOS[item.estado] || ESTADOS.activo;
            const dot = colorHex(item.color);
            return (
              <div key={item.id} className="exh-row">
                <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0 }}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:dot,
                    border:'1px solid rgba(0,0,0,.12)', flexShrink:0 }}/>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'13px', fontWeight:600 }}>
                      {item.modelo}
                      <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#888',
                        fontWeight:400, marginLeft:'8px' }}>×{item.cantidad}</span>
                    </div>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#666',
                      display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'2px' }}>
                      <span>{item.color}</span>
                      {item.talla && item.talla !== 'UNICA' && <span>· {item.talla}</span>}
                      <span style={{ color:'var(--blue)' }}>{item.sku}</span>
                      <span>· {item.fecha_entrada}</span>
                      {item.notas && <span style={{ color:'#999' }}>· {item.notas}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                  <span className="estado-badge"
                    style={{ background: est.bg, color: est.color }}>
                    {est.label}
                  </span>
                  {item.estado === 'activo' && (
                    <>
                      <button className="btn-accion btn-rojo"
                        onClick={() => { setModalVender(item); setPrecioVenta(item.precio_venta||''); }}>
                        Vendido
                      </button>
                      <button className="btn-accion"
                        onClick={() => { if(confirm('¿Devolver al almacén?')) cambiarEstado(item.id, 'devuelto'); }}>
                        → Almacén
                      </button>
                    </>
                  )}
                  {item.estado === 'vendido' && item.precio_venta > 0 && (
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', color:'var(--red)', fontWeight:700 }}>
                      {fmt(item.precio_venta)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal: Agregar al mostrador ── */}
      {modalAgregar && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModalAgregar(false)}>
          <div className="modal-box">
            <div className="modal-head">
              Enviar al mostrador
              <button onClick={() => setModalAgregar(false)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', color:'#999' }}>×</button>
            </div>
            <div className="modal-body">
              <input value={buscarProd} onChange={e => setBuscarProd(e.target.value)}
                placeholder="Buscar modelo, SKU, color..."
                autoFocus
                style={{ width:'100%', padding:'9px 11px', border:'1px solid var(--border)',
                  fontFamily:'Poppins,sans-serif', fontSize:'12px', background:'var(--bg2)',
                  outline:'none', borderRadius:'3px', boxSizing:'border-box', marginBottom:'10px' }}/>

              {/* Resultados de búsqueda */}
              {prodsFiltrados.length > 0 && (
                <div style={{ border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden', marginBottom:'12px' }}>
                  {prodsFiltrados.map(p => {
                    const inCart = carrito[p.sku] || 0;
                    const dot = colorHex(p.color);
                    return (
                      <div key={p.sku} className="prod-chip" style={{ borderRadius:0,
                        borderBottom:'1px solid var(--border)', background: inCart ? 'rgba(26,122,60,.04)' : '' }}>
                        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:dot,
                          border:'0.5px solid rgba(0,0,0,.12)', flexShrink:0 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'12px', fontWeight:500 }}>
                            {p.modelo}
                          </div>
                          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888' }}>
                            {p.color}{p.talla && p.talla !== 'UNICA' ? ` · ${p.talla}` : ''} · Stock: {p.disponible}
                          </div>
                        </div>
                        {inCart > 0 ? (
                          <div className="qty-ctrl">
                            <button className="qty-btn" onClick={() => addCarrito(p.sku, -1)}>−</button>
                            <span className="qty-num">{inCart}</span>
                            <button className="qty-btn" onClick={() => addCarrito(p.sku, 1)}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addCarrito(p.sku, 1)}
                            style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--ink)',
                              color:'#fff', border:'none', cursor:'pointer', fontSize:'18px', lineHeight:1 }}>+</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Carrito seleccionado */}
              {Object.keys(carrito).length > 0 && (
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#888',
                    textTransform:'uppercase', letterSpacing:'.12em', marginBottom:'6px' }}>
                    Seleccionados ({Object.keys(carrito).length})
                  </div>
                  {Object.entries(carrito).map(([sku, cant]) => {
                    const p = productos.find(x => x.sku === sku);
                    return (
                      <div key={sku} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'6px 8px', background:'var(--bg2)', borderRadius:'3px', marginBottom:'4px' }}>
                        <span style={{ fontFamily:'Poppins,sans-serif', fontSize:'12px' }}>
                          {p?.modelo || sku} <span style={{ color:'#888', fontSize:'11px' }}>×{cant}</span>
                        </span>
                        <div className="qty-ctrl">
                          <button className="qty-btn" onClick={() => addCarrito(sku, -1)}>−</button>
                          <span className="qty-num">{cant}</span>
                          <button className="qty-btn" onClick={() => addCarrito(sku, 1)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <input value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Notas (opcional)..."
                style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)',
                  fontFamily:'Poppins,sans-serif', fontSize:'12px', background:'var(--bg2)',
                  outline:'none', borderRadius:'3px', boxSizing:'border-box' }}/>
            </div>
            <div className="modal-foot">
              <button onClick={() => setModalAgregar(false)}
                style={{ flex:1, padding:'9px', background:'var(--bg2)', border:'1px solid var(--border)',
                  cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'12px', borderRadius:'3px' }}>
                Cancelar
              </button>
              <button onClick={enviarAMostrador} disabled={!Object.keys(carrito).length || guardando}
                className="btn-verde"
                style={{ flex:2, padding:'9px', border:'none', cursor:'pointer',
                  fontFamily:'Poppins,sans-serif', fontSize:'12px', fontWeight:600, borderRadius:'3px',
                  opacity: !Object.keys(carrito).length ? .5 : 1 }}>
                {guardando ? 'Enviando...' : `Enviar ${Object.keys(carrito).length} al mostrador`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Registrar venta ── */}
      {modalVender && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModalVender(null)}>
          <div className="modal-box" style={{ maxWidth:'360px' }}>
            <div className="modal-head">
              Registrar venta
              <button onClick={() => setModalVender(null)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', color:'#999' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ fontFamily:'Poppins,sans-serif', fontSize:'13px', marginBottom:'14px' }}>
                <strong>{modalVender.modelo}</strong>
                <span style={{ color:'#888', fontWeight:400 }}> — {modalVender.color}</span>
                {modalVender.talla && modalVender.talla !== 'UNICA' && (
                  <span style={{ color:'#888' }}> · {modalVender.talla}</span>
                )}
              </div>
              <label style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#888',
                textTransform:'uppercase', letterSpacing:'.12em', display:'block', marginBottom:'5px' }}>
                Precio de venta (€) — opcional
              </label>
              <input type="number" step="0.01" min="0" value={precioVenta}
                onChange={e => setPrecioVenta(e.target.value)}
                placeholder="0.00"
                style={{ width:'100%', padding:'9px 11px', border:'1px solid var(--border)',
                  fontFamily:'DM Mono,monospace', fontSize:'14px', background:'var(--bg2)',
                  outline:'none', borderRadius:'3px', boxSizing:'border-box' }}/>
            </div>
            <div className="modal-foot">
              <button onClick={() => setModalVender(null)}
                style={{ flex:1, padding:'9px', background:'var(--bg2)', border:'1px solid var(--border)',
                  cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'12px', borderRadius:'3px' }}>
                Cancelar
              </button>
              <button disabled={guardando}
                onClick={() => cambiarEstado(modalVender.id, 'vendido', { precio_venta: parseFloat(precioVenta)||0 })}
                className="btn-rojo"
                style={{ flex:2, padding:'9px', border:'none', cursor:'pointer',
                  fontFamily:'Poppins,sans-serif', fontSize:'12px', fontWeight:600, borderRadius:'3px' }}>
                {guardando ? 'Guardando...' : 'Confirmar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
