'use client';
import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/Shell';
import { fetchApi } from '@/utils/fetchApi';
import { colorHex } from '@/utils/colores';

function fmtEur(n) { return '€ ' + Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtNum(n) { return Number(n || 0).toLocaleString('es-VE'); }
function fmtFecha(d) { if (!d) return '—'; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }

function rangoMesActual() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hasta = hoy.toISOString().split('T')[0];
  return { desde, hasta };
}

export default function ReportesPage() {
  const hoy = new Date().toISOString().split('T')[0];
  const { desde: d0, hasta: h0 } = rangoMesActual();

  const [desde, setDesde] = useState(d0);
  const [hasta, setHasta] = useState(h0);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);

      const [res, resAud] = await Promise.all([
        fetchApi(`/api/reportes?${params}`).then(r => r.json()),
        fetchApi(`/api/auditoria?${params}`).then(r => r.json()).catch(() => ({ ok: false, registros: [] }))
      ]);

      if (res.ok) {
        res.auditoria = resAud.ok ? resAud.registros : [];
        setData(res);
      } else {
        setError(res.error || 'Error al cargar reporte');
      }
    } catch (e) {
      setError('Error de conexión');
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  const r = data?.resumen || {};
  const maxModVentas = useMemo(() => Math.max(...(data?.topModelos || []).map(m => m.unidades), 1), [data]);
  const maxCatVentas = useMemo(() => Math.max(...(data?.topCategorias || []).map(c => c.ventas), 1), [data]);
  const maxTelaVentas = useMemo(() => Math.max(...(data?.topTelas || []).map(t => t.unidades), 1), [data]);

  const KPI = ({ label, value, sub, color, icon, trend }) => (
    <div style={{
      background: '#fff',
      padding: '24px',
      borderRadius: '24px',
      border: '1px solid rgba(0,0,0,0.05)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{label}</div>
        <span style={{ fontSize: '20px' }}>{icon}</span>
      </div>
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '30px', fontWeight: 900, color: color || '#111', fontFamily: 'Poppins, sans-serif', lineHeight: 1 }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <div style={{ fontSize: '11px', color: '#666', fontWeight: 500 }}>{sub}</div>
          {trend && <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>↑ {trend}</div>}
        </div>
      </div>
    </div>
  );

  return (
    <Shell title="Inteligencia de Negocio">
      <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
        
        {/* Header con Filtros */}
        <div style={{
          background: 'linear-gradient(135deg, #111 0%, #333 100%)',
          borderRadius: '32px',
          padding: '30px 40px',
          color: '#fff',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Analítica de Negocio</h1>
            <p style={{ opacity: 0.6, fontSize: '13px' }}>Descubre qué es lo que realmente está funcionando.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', padding: '4px 8px', outline: 'none' }} />
              <span style={{ opacity: 0.3, padding: '0 4px' }}>→</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', padding: '4px 8px', outline: 'none' }} />
            </div>
            <button onClick={cargar} disabled={cargando} style={{
              padding: '12px 24px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
            }}>
              {cargando ? '⌛' : 'ACTUALIZAR'}
            </button>
          </div>
        </div>

        {/* Quick Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
          {[
            ['Hoy', hoy, hoy],
            ['Últimos 7 días', (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })(), hoy],
            ['Este mes', d0, hoy],
          ].map(([label, d, h]) => (
            <button key={label} onClick={() => { setDesde(d); setHasta(h); }} style={{
              padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', background: desde === d ? '#111' : '#fff', color: desde === d ? '#fff' : '#666', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
            }}>
              {label}
            </button>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(217,30,30,0.1)', color: 'var(--red)', padding: '20px', borderRadius: '20px', marginBottom: '30px', fontWeight: 700 }}>⚠️ {error}</div>}

        {data && (
          <>
            {/* Grid de KPIs Principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <KPI label="Ingresos" value={fmtEur(r.totalVentas)} sub="Venta Bruta" color="var(--red)" icon="💰" />
              <KPI label="Unidades" value={fmtNum(r.totalUnidades)} sub="Volumen Despachado" color="var(--blue)" icon="📦" />
              <KPI label="Utilidad" value={fmtEur(r.totalGanancia)} sub="Margen Bruto" color="var(--green)" icon="📈" />
              <KPI label="Transacciones" value={fmtNum(r.totalTransacciones)} sub="Ticket Promedio" color="var(--warn)" icon="🎫" />
            </div>

            {/* Fila 2: Colores y Telas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
              
              <div style={{ background: '#fff', borderRadius: '32px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>🎨 Colores más Demandados</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {data.topColores?.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', background: 'rgba(0,0,0,0.02)' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: colorHex(c.color), border: '1px solid rgba(0,0,0,0.1)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 800 }}>{c.color}</div>
                        <div style={{ fontSize: '10px', color: '#999' }}>{c.unidades} uds vendidas</div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: '#111' }}>{((c.unidades / r.totalUnidades) * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '32px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>🧵 Telas más Vendidas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.topTelas?.map((t, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800 }}>{t.tela}</span>
                        <span style={{ fontSize: '11px', fontWeight: 800 }}>{t.unidades} uds</span>
                      </div>
                      <div style={{ height: '4px', background: '#f0f0f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${(t.unidades / maxTelaVentas) * 100}%`, height: '100%', background: 'var(--ink)', borderRadius: '10px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Fila 3: Modelos y Categorías */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', marginBottom: '40px' }}>
              
              <div style={{ background: '#fff', borderRadius: '32px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>🥇 Ranking de Modelos (TOP 10)</h3>
                  <span style={{ fontSize: '10px', color: '#999', fontWeight: 600 }}>Basado en unidades vendidas</span>
                </div>
                <div style={{ padding: '10px' }}>
                  {data.topModelos?.map((m, i) => (
                    <div key={i} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: i === data.topModelos.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ width: '28px', fontSize: '14px', fontWeight: 900, color: i < 3 ? 'var(--red)' : '#ccc' }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{m.modelo}</div>
                        <div style={{ fontSize: '10px', color: '#999' }}>{m.categoria}</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: '80px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800 }}>{m.unidades}</div>
                        <div style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase' }}>Uds</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '100px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--green)' }}>{fmtEur(m.ventas)}</div>
                        <div style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase' }}>Ventas</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Categorías */}
                <div style={{ background: '#fff', borderRadius: '32px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>📊 Desempeño por Categoría</h3>
                  {data.topCategorias?.slice(0, 6).map((c, i) => (
                    <div key={i} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{c.categoria}</span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--blue)' }}>{fmtEur(c.ventas)}</span>
                      </div>
                      <div style={{ height: '5px', background: '#f0f0f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${(c.ventas / maxCatVentas) * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: '10px' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* VIP Clients */}
                <div style={{ background: '#111', borderRadius: '32px', padding: '24px', color: '#fff' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', color: 'rgba(255,255,255,0.6)' }}>🌟 Clientes VIP</h3>
                  {data.topClientes?.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none', fontFamily: 'Poppins, sans-serif' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{c.cliente}</div>
                        <div style={{ fontSize: '10px', opacity: 0.5 }}>{c.unidades} unidades compradas</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--green)' }}>{fmtEur(c.ventas)}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Auditoria de Stock (Si existe) */}
            {data.auditoria?.length > 0 && (
              <div style={{ marginTop: '40px', background: 'rgba(0,0,0,0.02)', borderRadius: '32px', padding: '30px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--warn)', marginBottom: '20px' }}>⚠️ Alertas de Auditoría (Entradas Forzadas)</h3>
                <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead style={{ background: '#fafafa', color: '#aaa' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left' }}>FECHA</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>USUARIO</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>SKU</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>CANT.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.auditoria.slice(0, 10).map((a, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8f9fa' }}>
                          <td style={{ padding: '12px' }}>{new Date(a.fecha).toLocaleString()}</td>
                          <td style={{ padding: '12px', fontWeight: 700 }}>{a.usuario_id}</td>
                          <td style={{ padding: '12px', color: 'var(--blue)' }}>{a.producto_id}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, color: 'var(--warn)' }}>+{a.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginTop: '60px', padding: '20px', textAlign: 'center', opacity: 0.3, fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Moditex Business Intelligence Module · {new Date().getFullYear()}
            </div>

          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      ` }} />
    </Shell>
  );
}
