'use client';
import { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { fetchApi } from '@/utils/fetchApi';

function fmtEur(n) { return '€ ' + Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtNum(n) { return Number(n || 0).toLocaleString('es-VE'); }
function fmtFecha(d) { if (!d) return '—'; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }

// Obtener primer y último día del mes actual
function rangoMesActual() {
  const hoy   = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hasta = hoy.toISOString().split('T')[0];
  return { desde, hasta };
}

export default function ReportesPage() {
  const hoy         = new Date().toISOString().split('T')[0];
  const { desde: d0, hasta: h0 } = rangoMesActual();

  const [desde,    setDesde]    = useState(d0);
  const [hasta,    setHasta]    = useState(h0);
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');

  async function cargar() {
    setCargando(true); setError('');
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await fetchApi(`/api/reportes?${params}`).then(r => r.json());
      if (res.ok) setData(res);
      else setError(res.error || 'Error al cargar reporte');
    } catch (e) {
      setError('Error de conexión');
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  const inp = { padding:'8px 11px', background:'var(--bg2)', border:'1px solid var(--border)', fontFamily:'Poppins,sans-serif', fontSize:'12px', color:'#111', outline:'none' };

  // Barra de porcentaje simple
  function Barra({ pct, color = 'var(--red)' }) {
    return (
      <div style={{ height:'6px', background:'var(--border)', borderRadius:'3px', overflow:'hidden', marginTop:'4px' }}>
        <div style={{ width:`${Math.min(100, pct)}%`, height:'100%', background:color, borderRadius:'3px', transition:'width .4s' }}/>
      </div>
    );
  }

  const r = data?.resumen || {};
  const maxModVentas = Math.max(...(data?.topModelos || []).map(m => m.unidades), 1);
  const maxCatVentas = Math.max(...(data?.topCategorias || []).map(c => c.ventas), 1);

  return (
    <Shell title="Reporte de Ventas">
      {/* Filtros de período */}
      <div style={{ display:'flex', gap:'10px', alignItems:'flex-end', marginBottom:'20px', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:'5px' }}>Desde</div>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inp}/>
        </div>
        <div>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:'5px' }}>Hasta</div>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inp}/>
        </div>
        <button onClick={cargar} disabled={cargando}
          style={{ padding:'9px 20px', background:'var(--ink)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', fontSize:'12px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', opacity:cargando?.6:1 }}>
          {cargando ? '⏳ Cargando...' : '↺ Generar Reporte'}
        </button>
        {/* Accesos rápidos */}
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {[
            ['Hoy',           hoy,                    hoy],
            ['Esta semana',   (() => { const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().split('T')[0]; })(), hoy],
            ['Este mes',      d0,                     hoy],
          ].map(([label, d, h]) => (
            <button key={label} onClick={() => { setDesde(d); setHasta(h); }}
              style={{ padding:'8px 12px', background:'var(--bg2)', border:`1px solid ${desde===d&&hasta===h?'var(--red)':'var(--border)'}`, cursor:'pointer', fontFamily:'DM Mono,monospace', fontSize:'10px', color:desde===d&&hasta===h?'var(--red)':'#555' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding:'12px 16px', background:'var(--red-soft)', color:'var(--red)', fontFamily:'DM Mono,monospace', fontSize:'11px', marginBottom:'16px', border:'1px solid rgba(217,30,30,.2)' }}>
          ❌ {error}
        </div>
      )}

      {!data && !cargando && !error && (
        <div style={{ textAlign:'center', padding:'60px', background:'var(--surface)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:'36px', marginBottom:'12px' }}>📊</div>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'12px', color:'#666' }}>Selecciona un período y genera el reporte</div>
        </div>
      )}

      {data && (
        <>
          {/* KPIs principales */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px', marginBottom:'20px' }}>
            {[
              ['Total vendido',    fmtEur(r.totalVentas),    `${fmtNum(r.totalTransacciones)} ventas`,   'var(--red)'],
              ['Unidades despachadas', fmtNum(r.totalUnidades), 'prendas vendidas',                     'var(--blue)'],
              ['Ganancia estimada', fmtEur(r.totalGanancia), 'productos con costo definido',            'var(--green)'],
              ['Ticket promedio',  fmtEur(r.totalTransacciones > 0 ? r.totalVentas / r.totalTransacciones : 0), 'por transacción', 'var(--warn)'],
            ].map(([lbl, val, sub, col]) => (
              <div key={lbl} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderTop:`3px solid ${col}`, padding:'16px 14px' }}>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555', letterSpacing:'.16em', textTransform:'uppercase', marginBottom:'8px' }}>{lbl}</div>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:'28px', fontWeight:700, lineHeight:1, color:col, marginBottom:'4px' }}>{val}</div>
                <div style={{ fontSize:'10px', color:'#666', fontFamily:'DM Mono,monospace' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Detal vs Mayor */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
            {[
              ['Ventas Detal',  r.porTipo?.DETAL,  'var(--blue)'],
              ['Ventas Mayor',  r.porTipo?.MAYOR,  'var(--warn)'],
            ].map(([lbl, tv, col]) => (
              <div key={lbl} style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:'14px' }}>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#555', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:'8px' }}>{lbl}</div>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:'22px', fontWeight:700, color:col }}>{fmtEur(tv?.ventas || 0)}</div>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'#666', marginTop:'3px' }}>{fmtNum(tv?.unidades || 0)} uds</div>
                <Barra pct={r.totalVentas > 0 ? ((tv?.ventas || 0) / r.totalVentas) * 100 : 0} color={col}/>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' }}>
            {/* Top modelos */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#555', letterSpacing:'.14em', textTransform:'uppercase' }}>
                Top modelos vendidos
              </div>
              {(data.topModelos || []).slice(0, 8).map((m, i) => (
                <div key={i} style={{ padding:'9px 14px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ fontSize:'12px', fontWeight:500 }}>{m.modelo}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', fontWeight:700, color:'var(--red)' }}>{m.unidades} uds</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888' }}>{m.categoria}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'var(--green)' }}>{fmtEur(m.ventas)}</span>
                  </div>
                  <Barra pct={(m.unidades / maxModVentas) * 100} color="var(--red)"/>
                </div>
              ))}
              {!data.topModelos?.length && (
                <div style={{ padding:'30px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888' }}>Sin ventas en este período</div>
              )}
            </div>

            {/* Top categorías */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#555', letterSpacing:'.14em', textTransform:'uppercase' }}>
                Ventas por categoría
              </div>
              {(data.topCategorias || []).map((c, i) => (
                <div key={i} style={{ padding:'9px 14px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ fontSize:'12px', fontWeight:500 }}>{c.categoria}</span>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', fontWeight:700, color:'var(--blue)' }}>{fmtEur(c.ventas)}</span>
                  </div>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', marginBottom:'3px' }}>{c.unidades} uds</div>
                  <Barra pct={(c.ventas / maxCatVentas) * 100} color="var(--blue)"/>
                </div>
              ))}
              {!data.topCategorias?.length && (
                <div style={{ padding:'30px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888' }}>Sin ventas en este período</div>
              )}
            </div>
          </div>

          {/* Top clientes */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden', marginBottom:'20px' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#555', letterSpacing:'.14em', textTransform:'uppercase' }}>
              Top clientes / compradores
            </div>
            {(data.topClientes || []).map((c, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Playfair Display,serif', fontSize:'12px', fontWeight:700, flexShrink:0 }}>
                  {i + 1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'12px', fontWeight:600 }}>{c.cliente}</div>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888' }}>{c.unidades} unidades compradas</div>
                </div>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:'18px', fontWeight:700, color:'var(--green)' }}>
                  {fmtEur(c.ventas)}
                </div>
              </div>
            ))}
            {!data.topClientes?.length && (
              <div style={{ padding:'30px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888' }}>Sin datos de clientes en este período</div>
            )}
          </div>

          {/* Ventas por día */}
          {data.porDia?.length > 1 && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#555', letterSpacing:'.14em', textTransform:'uppercase' }}>
                Ventas diarias
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'500px' }}>
                  <thead><tr style={{ background:'#efefef' }}>
                    {['Fecha','Unidades','Ventas €'].map(h => (
                      <th key={h} style={{ padding:'7px 14px', textAlign:'left', fontFamily:'DM Mono,monospace', fontSize:'8px', letterSpacing:'.12em', textTransform:'uppercase', color:'#444' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.porDia.map((d, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding:'8px 14px', fontFamily:'DM Mono,monospace', fontSize:'12px' }}>{fmtFecha(d.fecha)}</td>
                        <td style={{ padding:'8px 14px', fontFamily:'DM Mono,monospace', fontSize:'12px', fontWeight:700 }}>{d.unidades} uds</td>
                        <td style={{ padding:'8px 14px', fontFamily:'DM Mono,monospace', fontSize:'12px', fontWeight:700, color:'var(--green)' }}>{fmtEur(d.ventas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', textAlign:'right', marginTop:'12px' }}>
            Generado: {new Date(data.generadoEn).toLocaleString('es-VE')}
            {data.periodo?.desde && ` · Período: ${fmtFecha(data.periodo.desde)} — ${fmtFecha(data.periodo.hasta)}`}
          </div>
        </>
      )}
    </Shell>
  );
}
