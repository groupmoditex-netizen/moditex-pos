'use client';
import { colorHex } from '@/utils/colores';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

function fmtNum(n) {
  return Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function estD(n) {
  if (n <= 0) return 'zero';
  if (n <= 3) return 'low';
  return 'ok';
}

export default function DashboardPage() {
  const { data, cargando } = useAppData() || {};

  if (cargando || !data) return (
    <Shell title="Dashboard">
      <div style={{ textAlign: 'center', padding: '100px', fontFamily: 'DM Mono, monospace', fontSize: '14px', color: '#666' }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>⚡</div>
        Sincronizando con Moditex Cloud...
      </div>
    </Shell>
  );

  const { productos, movimientos, comandas } = data;
  const stockTotal = productos.reduce((a, p) => a + (p.disponible || 0), 0);
  const modelosUnicos = new Set(productos.map(p => p.modelo)).size;
  const stockCritico = productos.filter(p => p.disponible === 0).length;
  const today = new Date().toISOString().split('T')[0];
  const movsHoy = movimientos.filter(m => m.fecha === today).length;
  const cmdsPend = (comandas || []).filter(c => c.status === 'pendiente').length;
  const cmdsProd = (comandas || []).filter(c => c.status === 'produccion').length;
  const recientes = movimientos.slice(0, 8);
  const criticos = productos.filter(p => p.disponible <= 3).sort((a, b) => a.disponible - b.disponible).slice(0, 6);

  return (
    <Shell title="Panel de Control">
      <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
        
        {/* Banner Hero Premium */}
        <div style={{
          position: 'relative',
          borderRadius: '32px',
          overflow: 'hidden',
          marginBottom: '32px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.2)',
          background: '#000'
        }}>
          <img
            src="https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/moditex-hero.png"
            style={{ width: '100%', height: '260px', objectFit: 'cover', opacity: 0.6 }}
            alt="Hero"
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 60px'
          }}>
            <img src="https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/moditex-logo.jpg" 
                 style={{ height: '50px', width: 'auto', alignSelf: 'flex-start', borderRadius: '8px', marginBottom: '16px' }} 
                 alt="Logo" />
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', color: '#fff', fontWeight: 900 }}>Moditex Group POS</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', maxWidth: '400px', marginTop: '8px' }}>
              Gestión inteligente de inventario y ventas mayoristas. 
              Control total desde Barquisimeto para el mundo.
            </p>
          </div>
        </div>

        {/* KPIs Modernos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Unidades en Stock', val: stockTotal, sub: 'Total disponible', col: 'var(--green)', icon: '📦' },
            { label: 'Modelos Activos', val: modelosUnicos, sub: 'Diseños únicos', col: 'var(--blue)', icon: '🎨' },
            { label: 'Operaciones Hoy', val: movsHoy, sub: 'Entradas/Salidas', col: '#8b5cf6', icon: '🔄' },
            { label: 'Stock Crítico', val: stockCritico, sub: 'Colores agotados', col: 'var(--red)', icon: '⚠️' }
          ].map((k, i) => (
            <div key={i} style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '24px',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 10px 20px rgba(0,0,0,0.02)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>{k.icon}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', textTransform: 'uppercase', color: '#999', letterSpacing: '1px' }}>{k.label}</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: k.col, marginTop: '4px' }}>{fmtNum(k.val)}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
          
          {/* Lado Izquierdo: Movimientos y Comandas */}
          <div>
            {/* Alertas de Comandas */}
            {(cmdsPend > 0 || cmdsProd > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: 'linear-gradient(135deg, #fff 0%, #fff8e1 100%)', padding: '24px', borderRadius: '24px', border: '1px solid #ffe082', boxShadow: '0 10px 30px rgba(255,193,7,0.1)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#f57c00', textTransform: 'uppercase' }}>Comandas Pendientes</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, color: '#f57c00' }}>{cmdsPend}</div>
                  <p style={{ fontSize: '12px', color: '#f57c00', opacity: 0.8 }}>Esperando acción comercial</p>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fff 0%, #e3f2fd 100%)', padding: '24px', borderRadius: '24px', border: '1px solid #90caf9', boxShadow: '0 10px 30px rgba(33,150,243,0.1)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#1976d2', textTransform: 'uppercase' }}>En Producción</div>
                  <div style={{ fontSize: '36px', fontWeight: 900, color: '#1976d2' }}>{cmdsProd}</div>
                  <p style={{ fontSize: '12px', color: '#1976d2', opacity: 0.8 }}>Proceso de confección activo</p>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Actividad Reciente</h3>
                <a href="/historial" style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Ver todo →</a>
              </div>
              <div style={{ padding: '10px' }}>
                {recientes.map((m, i) => {
                  const p = productos.find(x => x.sku === m.sku);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', borderRadius: '16px', borderBottom: i < recientes.length - 1 ? '1px solid #f8f9fa' : 'none' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: m.tipo === 'ENTRADA' ? 'rgba(26,122,60,0.1)' : 'rgba(217,30,30,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        {m.tipo === 'ENTRADA' ? '↑' : '↓'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{p?.modelo || 'Movimiento'}</div>
                        <div style={{ fontSize: '10px', color: '#999' }}>{m.concepto || 'Sin concepto'} · {m.fecha}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: m.tipo === 'ENTRADA' ? 'var(--green)' : 'var(--red)' }}>
                          {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 600 }}>{m.sku}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lado Derecho: Alertas de Stock */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '20px 24px', background: 'rgba(217,30,30,0.02)', borderBottom: '1px solid rgba(217,30,30,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--red)' }}>Alertas de Reabastecimiento</h3>
              </div>
              <div style={{ padding: '10px' }}>
                {criticos.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--green)', fontSize: '12px', fontWeight: 600 }}>✓ Todo el stock está ok</div>
                ) : (
                  criticos.map(p => {
                    const e = estD(p.disponible);
                    return (
                      <div key={p.sku} style={{ padding: '14px', borderRadius: '16px', background: 'rgba(0,0,0,0.01)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '40px', borderRadius: '4px', background: e === 'zero' ? 'var(--red)' : 'var(--warn)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>{p.modelo}</div>
                          <div style={{ fontSize: '10px', color: '#999' }}>{p.color} · {p.talla}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 900, color: e === 'zero' ? 'var(--red)' : 'var(--warn)' }}>{p.disponible}</div>
                          <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: '#aaa' }}>Unidades</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ padding: '20px', background: '#f8f9fa' }}>
                <a href="/alertas" style={{ display: 'block', textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: 700, textDecoration: 'none' }}>Ver todas las alertas de stock →</a>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      ` }} />
    </Shell>
  );
}