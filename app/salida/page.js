'use client';
import { colorHex } from '@/utils/colores';
import { useState, useRef, useEffect } from 'react';
import Shell from '@/components/Shell';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import ScannerInput from '@/components/ScannerInput';
import { useAppData } from '@/lib/AppContext';

/* ─── Motivos de salida con estética premium ─────────── */
const MOTIVOS_SALIDA = [
  { id:'cortesia',    label:'Cortesía',       icon:'🎁',  color:'#ec4899', bg:'rgba(236, 72, 153, 0.1)', desc:'Regalo o muestra sin cobro al cliente' },
  { id:'descarte',    label:'Descarte',       icon:'🗑️',  color:'#ef4444', bg:'rgba(239, 68, 68, 0.1)', desc:'Prenda dañada, defectuosa o en mal estado' },
  { id:'muestra',     label:'Muestra',        icon:'👀',  color:'#8b5cf6', bg:'rgba(139, 92, 246, 0.1)', desc:'Enviada para evaluación o exhibición' },
  { id:'prestamo',    label:'Préstamo',       icon:'🤝',  color:'#f59e0b', bg:'rgba(245, 158, 11, 0.1)', desc:'Prenda prestada temporalmente' },
  { id:'consignacion',label:'Consignación',   icon:'📤',  color:'#06b6d4', bg:'rgba(6, 182, 212, 0.1)', desc:'Enviada en consignación a terceros' },
  { id:'perdida',     label:'Pérdida',        icon:'❓',  color:'#6b7280', bg:'rgba(107, 114, 128, 0.1)', desc:'Extravío, robo o desaparición' },
  { id:'devolucion',  label:'Devolución',     icon:'↩️',  color:'#3b82f6', bg:'rgba(59, 130, 246, 0.1)', desc:'Regresada al proveedor o fabricante' },
  { id:'ajuste',      label:'Ajuste −',       icon:'⚖️',  color:'#f97316', bg:'rgba(249, 115, 22, 0.1)', desc:'Corrección negativa de inventario' },
];

const inpStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  fontFamily: 'Poppins, sans-serif',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.2s ease',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
};

const lblStyle = {
  fontFamily: 'DM Mono, monospace',
  fontSize: '9px',
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: 'var(--ink-muted)',
  display: 'block',
  marginBottom: '8px',
  fontWeight: '600'
};

function fmtNum(n) {
  return Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SalidaPage() {
  const { data, recargar } = useAppData() || {};
  const productos = data?.productos || [];

  const [motivo, setMotivo] = useState('descarte');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [contacto, setContacto] = useState('');
  const [notas, setNotas] = useState('');
  const [cart, setCart] = useState([]);
  const [catalogo, setCatalogo] = useState(false);
  const [guardando, setGuard] = useState(false);
  const [msg, setMsg] = useState(null);

  const totalUds = cart.reduce((a, i) => a + i.qty, 0);
  const motivoCfg = MOTIVOS_SALIDA.find(m => m.id === motivo) || MOTIVOS_SALIDA[0];

  function changeQty(sku, d) {
    setCart(prev => prev.map(x => {
      if (x.sku !== sku) return x;
      const max = productos.find(p => p.sku === sku)?.disponible || 999;
      return { ...x, qty: Math.max(1, Math.min(x.qty + d, max)) };
    }));
  }

  function removeItem(sku) {
    setCart(prev => prev.filter(x => x.sku !== sku));
  }

  async function registrar() {
    if (!cart.length) {
      setMsg({ t: 'error', m: 'Agrega al menos un producto' });
      return;
    }
    setGuard(true);
    const conceptoFinal = `${motivoCfg.label}${contacto ? ' — ' + contacto : ''}${notas ? ' | ' + notas : ''}`;
    try {
      const lote = cart.map(item => ({
        sku: item.sku,
        tipo: 'SALIDA',
        cantidad: item.qty,
        fecha,
        concepto: conceptoFinal,
        contacto
      }));
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lote)
      }).then(r => r.json());

      if (res.ok) {
        setMsg({ t: 'success', m: `✅ Salida registrada: ${totalUds} uds — ${motivoCfg.label}` });
        setCart([]);
        setContacto('');
        setNotas('');
        recargar();
      } else {
        setMsg({ t: 'error', m: res.error || 'Error al guardar' });
      }
    } catch (e) {
      setMsg({ t: 'error', m: 'Error de conexión' });
    }
    setGuard(false);
    setTimeout(() => setMsg(null), 5000);
  }

  return (
    <Shell title="Control de Salidas">
      {catalogo && (
        <CatalogoExplorer
          productos={productos}
          modo="salida"
          onAdd={(p, qty) => {
            const prod = productos.find(x => x.sku === p.sku) || p;
            if (prod.disponible <= 0) {
              setMsg({ t: 'error', m: `Sin stock: ${prod.modelo}` });
              return;
            }
            setCart(prev => {
              const ex = prev.find(x => x.sku === p.sku);
              if (ex) return prev.map(x => x.sku === p.sku ? { ...x, qty: Math.min(x.qty + qty, prod.disponible) } : x);
              return [...prev, { ...prod, qty: Math.min(qty, prod.disponible) }];
            });
          }}
          onClose={() => setCatalogo(false)}
        />
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
        
        {/* Banner de Bienvenida */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0a0a 0%, #441111 100%)',
          padding: '30px 40px',
          borderRadius: '24px',
          marginBottom: '30px',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(217,30,30,0.1)', borderRadius: '50%' }} />
          <div style={{ zIndex: 1 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>Nueva Salida de Stock</h1>
            <p style={{ opacity: 0.7, fontSize: '14px', fontWeight: 400 }}>Registra descartes, muestras y ajustes. (Operaciones sin venta directa)</p>
          </div>
          <div style={{ textAlign: 'right', zIndex: 1 }}>
            <div style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Unidades a Egresar</div>
            <div style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'DM Mono, monospace', color: 'var(--red)' }}>{fmtNum(totalUds)}</div>
          </div>
        </div>

        {msg && (
          <div style={{
            padding: '16px 24px',
            marginBottom: '30px',
            borderRadius: '16px',
            background: msg.t === 'error' ? 'rgba(217, 30, 30, 0.1)' : 'rgba(26, 122, 60, 0.1)',
            border: `1px solid ${msg.t === 'error' ? 'rgba(217, 30, 30, 0.3)' : 'rgba(26, 122, 60, 0.3)'}`,
            color: msg.t === 'error' ? 'var(--red)' : 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: 600,
            animation: 'slideIn 0.3s ease'
          }}>
            <span>{msg.t === 'error' ? '⚠️' : '✅'}</span>
            {msg.m}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
          
          {/* Lado Izquierdo: Configuración */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Sección: Motivo */}
            <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <label style={lblStyle}>1. Motivo de la Salida</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {MOTIVOS_SALIDA.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMotivo(m.id)}
                    style={{
                      padding: '14px 8px',
                      borderRadius: '16px',
                      background: motivo === m.id ? m.color : 'rgba(0,0,0,0.02)',
                      color: motivo === m.id ? '#fff' : 'var(--ink)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: motivo === m.id ? 'scale(1.05)' : 'scale(1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: motivo === m.id ? `0 8px 16px ${m.bg}` : 'none'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{m.icon}</span>
                    <span style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>{m.label}</span>
                  </button>
                ))}
              </div>
              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: motivoCfg.bg,
                color: motivoCfg.color,
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: `1px solid ${motivoCfg.color}22`
              }}>
                <span style={{ opacity: 0.7 }}>💡</span>
                {motivoCfg.desc}
              </div>
            </div>

            {/* Sección: Detalles */}
            <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <label style={lblStyle}>2. Detalles del Egreso</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ ...lblStyle, fontSize: '8px', opacity: 0.6 }}>Fecha del Movimiento</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inpStyle} />
                </div>
                <div>
                  <label style={{ ...lblStyle, fontSize: '8px', opacity: 0.6 }}>
                    {motivo === 'cortesia' ? 'Destinatario' : motivo === 'prestamo' ? 'Responsable' : 'Referencia'}
                  </label>
                  <input
                    value={contacto}
                    onChange={e => setContacto(e.target.value)}
                    placeholder="Nombre o entidad..."
                    style={inpStyle}
                  />
                </div>
              </div>
              <div>
                <label style={{ ...lblStyle, fontSize: '8px', opacity: 0.6 }}>Justificación / Notas</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Explica el motivo detallado de la salida..."
                  style={{ ...inpStyle, minHeight: '80px', resize: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Lado Derecho: Carrito */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '80px', alignSelf: 'start' }}>
            
            {/* Barra de Búsqueda / Scanner */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <label style={lblStyle}>3. Seleccionar Prendas</label>
              <ScannerInput
                productos={productos}
                accentColor="var(--red)"
                onAdd={(prod, qty = 1) => {
                  setCart(prev => {
                    const ex = prev.find(x => x.sku === prod.sku);
                    if (ex) return prev.map(x => x.sku === prod.sku ? { ...x, qty: Math.min(x.qty + qty, prod.disponible) } : x);
                    return [...prev, { ...prod, qty: Math.min(qty, prod.disponible) }];
                  });
                }}
                extraActions={[
                  { label: '📦 Catálogo', onClick: () => setCatalogo(true), bg: 'var(--ink)', color: '#fff' },
                ]}
              />
            </div>

            {/* Lista de Items */}
            <div style={{
              background: '#fff',
              borderRadius: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden',
              maxHeight: '450px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: '16px 20px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)' }}>PRENDAS A DESPACHAR</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--red)' }}>{cart.length} ITEMS</span>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {cart.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.3 }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>📦</div>
                    <p style={{ fontSize: '12px', fontWeight: 600 }}>No hay prendas en lista</p>
                  </div>
                ) : (
                  [...cart].reverse().map(item => {
                    const max = productos.find(p => p.sku === item.sku)?.disponible || item.disponible || 0;
                    return (
                      <div key={item.sku} style={{
                        padding: '12px',
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.03)',
                        marginBottom: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        background: 'rgba(0,0,0,0.01)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{item.modelo}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorHex(item.color), border: '1px solid rgba(0,0,0,0.1)' }} />
                              <span style={{ fontSize: '10px', color: 'var(--ink-muted)', fontWeight: 500 }}>{item.color} {item.talla ? `· ${item.talla}` : ''}</span>
                            </div>
                          </div>
                          <button onClick={() => removeItem(item.sku)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <button onClick={() => changeQty(item.sku, -1)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>−</button>
                            <span style={{ padding: '0 12px', fontSize: '13px', fontWeight: 900, fontFamily: 'DM Mono, monospace' }}>{item.qty}</span>
                            <button onClick={() => changeQty(item.sku, 1)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>+</button>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Final</div>
                            <div style={{ fontSize: '11px', fontWeight: 700 }}>{fmtNum(max)} → <span style={{ color: 'var(--red)' }}>{fmtNum(max - item.qty)}</span></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Botones Finales */}
              <div style={{ padding: '20px', background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={registrar}
                  disabled={guardando || !cart.length}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    background: cart.length ? `linear-gradient(135deg, ${motivoCfg.color} 0%, #000 150%)` : '#ccc',
                    color: '#fff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: cart.length ? 'pointer' : 'not-allowed',
                    boxShadow: cart.length ? `0 10px 20px ${motivoCfg.bg}` : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {guardando ? '⏳ REGISTRANDO...' : `↓ EJECUTAR SALIDA · ${fmtNum(totalUds)} UDS`}
                </button>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: '#888', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    Limpiar lista
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      ` }} />
    </Shell>
  );
}

