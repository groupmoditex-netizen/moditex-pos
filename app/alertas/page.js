'use client';
import { colorHex } from '@/utils/colores';
import { useState } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { useRouter } from 'next/navigation';

export default function AlertasPage() {
  const router = useRouter();
  const { data, cargando, recargar } = useAppData() || {};
  const [loading, setLoading] = useState({});
  const [msgs, setMsgs] = useState({});

  const { productos = [] } = data || {};
  const criticos = productos.filter(p => p.disponible === 0).sort((a, b) => a.modelo.localeCompare(b.modelo));
  const bajos = productos.filter(p => p.disponible > 0 && p.disponible <= 3).sort((a, b) => a.disponible - b.disponible);

  function sendToEntrada(prod, qty = 1) {
    try {
      const pending = JSON.parse(localStorage.getItem('moditex_add_to_cart') || '[]');
      const ex = pending.find(x => x.sku === prod.sku);
      if (ex) ex.qty += qty;
      else pending.push({ sku: prod.sku, qty });
      
      localStorage.setItem('moditex_add_to_cart', JSON.stringify(pending));
      router.push('/entrada');
    } catch (e) { console.error(e); }
  }

  function AlertCard({ p, esCritico }) {
    const msg = msgs[p.sku];
    return (
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '12px'
      }} onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)';
      }} onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.02)';
      }}>
        {/* Indicador de estado lateral */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '6px',
          background: esCritico ? 'var(--red)' : 'var(--warn)'
        }} />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: colorHex(p.color), 
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>{p.modelo}</h4>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--blue)', fontWeight: 700 }}>{p.sku}</span>
            <span style={{ fontSize: '10px', color: '#999' }}>·</span>
            <span style={{ fontSize: '11px', color: '#666', fontWeight: 500 }}>{p.color} · {p.talla || 'T-Única'}</span>
          </div>
          {msg && (
            <div style={{ 
              marginTop: '8px', 
              fontSize: '11px', 
              fontWeight: 700, 
              color: msg.type === 'ok' ? 'var(--green)' : 'var(--red)',
              fontFamily: 'DM Mono, monospace'
            }}>
              {msg.text}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', padding: '0 20px' }}>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 900, 
            color: esCritico ? 'var(--red)' : 'var(--warn)',
            fontFamily: 'DM Mono, monospace',
            lineHeight: 1
          }}>
            {p.disponible}
          </div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#aaa', fontWeight: 800, letterSpacing: '1px' }}>Unidades</div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 6, 12].map(n => (
            <button
              key={n}
              onClick={() => sendToEntrada(p, n)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: 'none',
                background: n === 1 ? 'rgba(0,0,0,0.05)' : n === 6 ? 'rgba(0,0,0,0.1)' : '#000',
                color: n === 12 ? '#fff' : '#000',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              +{n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Shell title="Inteligencia de Inventario">
      <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
        
        {/* Header con Stats */}
        <div style={{
          background: 'linear-gradient(135deg, #111 0%, #333 100%)',
          borderRadius: '32px',
          padding: '40px',
          color: '#fff',
          marginBottom: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 900 }}>Gestor de Alertas</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '4px' }}>Optimización de stock en tiempo real.</p>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--red)' }}>{criticos.length}</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6 }}>Agotados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--warn)' }}>{bajos.length}</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6 }}>Bajo Stock</div>
            </div>
            <button onClick={recargar} style={{
              width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '18px'
            }}>↺</button>
          </div>
        </div>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '100px' }}>
            <div style={{ fontSize: '40px', animation: 'pulse 1.5s infinite' }}>📡</div>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '10px', fontFamily: 'DM Mono, monospace' }}>Analizando niveles de stock...</p>
          </div>
        )}

        {!cargando && criticos.length === 0 && bajos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px', background: '#fff', borderRadius: '32px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✨</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Inventario Impecable</h2>
            <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>No hay alertas críticas en este momento.</p>
          </div>
        )}

        {!cargando && criticos.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '18px' }}>🚨</span>
              <h3 style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--red)' }}>Prioridad Máxima: Agotados</h3>
            </div>
            {criticos.map(p => <AlertCard key={p.sku} p={p} esCritico={true} />)}
          </div>
        )}

        {!cargando && bajos.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <h3 style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--warn)' }}>Reposición Necesaria: Stock Bajo</h3>
            </div>
            {bajos.map(p => <AlertCard key={p.sku} p={p} esCritico={false} />)}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.5; } }
      ` }} />
    </Shell>
  );
}
