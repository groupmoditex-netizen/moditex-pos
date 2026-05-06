'use client';
import { colorHex } from '@/utils/colores';
import { useState, useMemo, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { fetchApi } from '@/utils/fetchApi';

const COLOR_MOV = { ENTRADA: 'var(--green)', SALIDA: 'var(--red)' };

function fmtF(d) {
  if (!d) return '—';
  const p = String(d).split('T')[0].split('-');
  return (p[2] || '') + '/' + (p[1] || '') + '/' + (p[0] || '');
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const inpStyle = {
  padding: '10px 14px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  fontFamily: 'Poppins, sans-serif',
  fontSize: '13px',
  outline: 'none',
  transition: 'all 0.2s ease'
};

const lblStyle = {
  fontFamily: 'DM Mono, monospace',
  fontSize: '8px',
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: 'var(--ink-muted)',
  display: 'block',
  marginBottom: '6px',
  fontWeight: '600'
};

export default function HistorialPage() {
  const ctx = useAppData() || {};
  const ctxProds = ctx.data?.productos || [];

  const [productos, setProductos] = useState(ctxProds);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPags, setTotalPags] = useState(1);

  const [buscar, setBuscar] = useState('');
  const [tipo, setTipo] = useState('');
  const [cat, setCat] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [editando, setEditando] = useState(null);
  const [guardandoE, setGuardandoE] = useState(false);
  const [msgE, setMsgE] = useState(null);
  const [skuBuscar, setSkuBuscar] = useState('');

  const skuResultados = useMemo(() => {
    if (!skuBuscar || skuBuscar.length < 2) return [];
    const q = skuBuscar.toLowerCase();
    return productos.filter(p =>
      `${p.sku} ${p.modelo} ${p.color}`.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [skuBuscar, productos]);

  function abrirEdicion(m) {
    setEditando({ id: m.id, sku: m.sku, cantidad: m.cantidad, concepto: m.concepto, fecha: m.fecha, tipo: m.tipo });
    setSkuBuscar('');
  }

  async function guardarEdicion() {
    if (!editando) return;
    setGuardandoE(true);
    try {
      const res = await fetch('/api/movimientos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando),
      }).then(r => r.json());
      if (res.ok) {
        setMsgE({ t: 'ok', m: '✓ Movimiento actualizado' });
        setEditando(null);
        cargarMovimientos(pagina);
      } else {
        setMsgE({ t: 'err', m: res.error || 'Error al guardar' });
      }
    } catch (e) { setMsgE({ t: 'err', m: 'Error de conexión' }); }
    setGuardandoE(false);
    setTimeout(() => setMsgE(null), 3500);
  }

  async function eliminarMovimiento(id, sku, tipo, cantidad) {
    if (!confirm(`¿Eliminar este movimiento?\n${tipo} ${cantidad} uds de ${sku}\n\nEl inventario se recalculará automáticamente.`)) return;
    try {
      const res = await fetch(`/api/movimientos?id=${id}`, { method: 'DELETE' }).then(r => r.json());
      if (res.ok) {
        setMsgE({ t: 'ok', m: `✓ Movimiento ${id} eliminado.` });
        cargarMovimientos(pagina);
      } else {
        setMsgE({ t: 'err', m: res.error || 'Error al eliminar' });
      }
    } catch (e) { setMsgE({ t: 'err', m: 'Error de conexión' }); }
    setTimeout(() => setMsgE(null), 4000);
  }

  const LIMIT = 25;

  const cargarMovimientos = useCallback(async (pag = 1) => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page: String(pag), limit: String(LIMIT) });
      if (tipo) params.set('tipo', tipo);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      if (buscar) params.set('search', buscar);
      if (cat) params.set('categoria', cat);

      const res = await fetchApi(`/api/movimientos?${params}`).then(r => r.json());

      if (res.ok) {
        setMovimientos((res.data || []).map(m => ({
          id: m.id || '', fecha: m.fecha ? String(m.fecha).split('T')[0] : '',
          sku: m.sku || '', tipo: m.tipo || '', cantidad: m.cantidad || 0,
          concepto: m.concepto || '', contacto: m.contacto || '',
          tipoVenta: m.tipo_venta || '', precioVenta: m.precio_venta || 0,
          clienteId: m.cliente_id || '', createdAt: m.created_at || '',
        })));
        setTotal(res.total || 0);
        setTotalPags(res.pages || 1);
      }
    } catch (e) { console.warn('[Historial] Error:', e.message); }
    setCargando(false);
  }, [tipo, desde, hasta, buscar, cat]);

  useEffect(() => { setPagina(1); cargarMovimientos(1); }, [tipo, desde, hasta, buscar, cat]);
  useEffect(() => { cargarMovimientos(pagina); }, [pagina]);
  useEffect(() => { if (ctxProds.length > 0) setProductos(ctxProds); }, [ctxProds.length]);

  const categorias = useMemo(() =>
    [...new Set(productos.map(p => p.categoria))].filter(Boolean).sort(), [productos]);

  function exportCSV() {
    const hdr = ['ID', 'Fecha', 'SKU', 'Categoría', 'Modelo', 'Color', 'Tipo', 'Tipo Venta', 'Cantidad', 'Precio €', 'Concepto', 'Cliente'];
    const rows = movimientos.map(m => {
      const p = productos.find(x => x.sku === m.sku);
      return [m.id, m.fecha, m.sku, p?.categoria || '', p?.modelo || '', p?.color || '',
      m.tipo, m.tipoVenta, m.cantidad, m.precioVenta || 0, m.concepto, m.contacto];
    });
    const csv = [hdr, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <Shell title="Historial Maestro">
      
      {/* Modal Edición Styled */}
      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
             onClick={e => e.target === e.currentTarget && setEditando(null)}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'modalIn 0.3s ease', margin: 'auto' }}>
            <div style={{ padding: '24px 30px', background: 'linear-gradient(135deg, #111 0%, #333 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Modificar Registro</h3>
                <p style={{ fontSize: '11px', opacity: 0.6 }}>ID: {editando.id}</p>
              </div>
              <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <label style={lblStyle}>Producto Seleccionado</label>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{editando.sku}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lblStyle}>Tipo</label>
                  <select value={editando.tipo} onChange={e => setEditando({ ...editando, tipo: e.target.value })} style={{ ...inpStyle, width: '100%' }}>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                  </select>
                </div>
                <div>
                  <label style={lblStyle}>Cantidad</label>
                  <input type="number" value={editando.cantidad} onChange={e => setEditando({ ...editando, cantidad: parseInt(e.target.value) })} style={{ ...inpStyle, width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={lblStyle}>Concepto / Referencia</label>
                <input value={editando.concepto} onChange={e => setEditando({ ...editando, concepto: e.target.value })} style={{ ...inpStyle, width: '100%' }} />
              </div>
            </div>

            <div style={{ padding: '20px 30px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setEditando(null)} style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
              <button onClick={guardarEdicion} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#000', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
        
        {/* Banner Superior */}
        <div style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          padding: '24px 30px',
          borderRadius: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#111' }}>Historial de Movimientos</h1>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Auditoría completa de entradas, salidas y ajustes de inventario.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportCSV} style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--green)', color: 'var(--green)', background: 'transparent', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>⬇ Exportar CSV</button>
            <button onClick={() => cargarMovimientos(pagina)} style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #ccc', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>↺ Refrescar</button>
          </div>
        </div>

        {/* Barra de Filtros Premium */}
        <div style={{
          background: '#fff',
          padding: '20px 24px',
          borderRadius: '24px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
          gap: '12px',
          alignItems: 'end'
        }}>
          <div>
            <label style={lblStyle}>Búsqueda Inteligente</label>
            <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="SKU, Concepto, Cliente..." style={{ ...inpStyle, width: '100%' }} />
          </div>
          <div>
            <label style={lblStyle}>Tipo de Operación</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...inpStyle, width: '100%' }}>
              <option value="">Todos los Tipos</option>
              <option value="ENTRADA">Solo Entradas</option>
              <option value="SALIDA">Solo Salidas</option>
            </select>
          </div>
          <div>
            <label style={lblStyle}>Categoría</label>
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inpStyle, width: '100%' }}>
              <option value="">Todas las Categorías</option>
              {categorias.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lblStyle}>Rango de Fechas</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ ...inpStyle, padding: '8px 10px', flex: 1, fontSize: '11px' }} />
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ ...inpStyle, padding: '8px 10px', flex: 1, fontSize: '11px' }} />
            </div>
          </div>
          <button onClick={() => { setBuscar(''); setTipo(''); setCat(''); setDesde(''); setHasta(''); }} style={{ padding: '12px 16px', borderRadius: '12px', background: 'var(--bg3)', border: 'none', color: '#666', fontWeight: 600, cursor: 'pointer' }}>Limpiar</button>
        </div>

        {/* Tabla Refinada */}
        <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 24px', background: '#f8f9fa', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Registro Maestro — Página {pagina}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#111' }}>{fmtNum(total)} Movimientos Totales</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff', borderBottom: '2px solid #f1f3f5' }}>
                  {['Fecha', 'Producto', 'Tipo', 'Cant.', 'Concepto', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '9px', textTransform: 'uppercase', color: '#999', fontWeight: 800 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={6} style={{ padding: '100px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>Cargando datos maestros...</td></tr>
                ) : movimientos.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '100px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}>No se encontraron registros coincidentes.</td></tr>
                ) : (
                  movimientos.map((m, i) => {
                    const p = productos.find(x => x.sku === m.sku);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f8f9fa', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fcfcfc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{fmtF(m.fecha)}</div>
                          <div style={{ fontSize: '10px', color: '#aaa' }}>ID: {m.id}</div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colorHex(p?.color), border: '1px solid rgba(0,0,0,0.1)' }} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700 }}>{p?.modelo || 'Desconocido'}</div>
                              <div style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 600 }}>{m.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ 
                            padding: '6px 12px', 
                            borderRadius: '20px', 
                            fontSize: '9px', 
                            fontWeight: 800, 
                            background: m.tipo === 'ENTRADA' ? 'rgba(26,122,60,0.1)' : 'rgba(217,30,30,0.1)',
                            color: m.tipo === 'ENTRADA' ? 'var(--green)' : 'var(--red)'
                          }}>
                            {m.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'DM Mono, monospace', color: COLOR_MOV[m.tipo] }}>
                            {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div title={m.concepto} style={{ fontSize: '12px', color: '#555', maxWidth: '280px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.5' }}>{m.concepto}</div>
                          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>{m.contacto}</div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => abrirEdicion(m)} style={{ background: 'none', border: '1px solid #ddd', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>✏️</button>
                            <button onClick={() => eliminarMovimiento(m.id, m.sku, m.tipo, m.cantidad)} style={{ background: 'none', border: '1px solid #ddd', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación Premium */}
          <div style={{ padding: '20px 24px', background: '#f8f9fa', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Mostrando {movimientos.length} de {fmtNum(total)} registros</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', opacity: pagina === 1 ? 0.5 : 1 }}>Anterior</button>
              <div style={{ display: 'flex', alignItems: 'center', px: '10px', fontSize: '13px', fontWeight: 700 }}>{pagina} / {totalPags}</div>
              <button disabled={pagina === totalPags} onClick={() => setPagina(pagina + 1)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', opacity: pagina === totalPags ? 0.5 : 1 }}>Siguiente</button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      ` }} />
    </Shell>
  );
}
