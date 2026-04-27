'use client';
import { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/AuthContext';

const DEFAULT_SHORTCUTS = {
  c: '/comandas',
  p: '/productos',
  i: '/inventario',
  v: '/venta-directa',
  d: '/dashboard',
  e: '/entrada',
  s: '/salida'
};

const ACCIONES = [
  { id: 'c', label: 'Comandas', icon: '📋' },
  { id: 'p', label: 'Productos', icon: '👕' },
  { id: 'i', label: 'Inventario', icon: '▦' },
  { id: 'v', label: 'Venta Directa', icon: '⚡' },
  { id: 'd', label: 'Dashboard', icon: '⬡' },
  { id: 'e', label: 'Nueva Entrada', icon: '↑' },
  { id: 's', label: 'Nueva Salida', icon: '↓' },
];

export default function AjustesPage() {
  const { usuario } = useAuth();
  const [shortcuts, setShortcuts] = useState({});
  const [activeBinding, setActiveBinding] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (usuario?.preferencias) {
      // Invertir el mapeo para poder editarlo fácilmente
      // preferences es: { key: path }
      // Queremos: { path: key } para la UI de ACCIONES
      const inverted = {};
      Object.entries(usuario.preferencias).forEach(([key, path]) => {
        inverted[path] = key;
      });
      setShortcuts(inverted);
    } else {
      const inverted = {};
      Object.entries(DEFAULT_SHORTCUTS).forEach(([key, path]) => {
        inverted[path] = key;
      });
      setShortcuts(inverted);
    }
  }, [usuario]);

  useEffect(() => {
    if (!activeBinding) return;
    function handleGlobalKeyDown(e) {
      e.preventDefault();
      const key = e.key.toLowerCase();
      if (key === 'escape') { setActiveBinding(null); return; }
      
      // No permitir teclas especiales solas
      if (['control','shift','alt','meta','capslock','tab'].includes(key)) return;

      const newShortcuts = { ...shortcuts };
      // Limpiar si esta tecla ya estaba asignada a otra cosa
      Object.keys(newShortcuts).forEach(path => {
        if (newShortcuts[path] === key) newShortcuts[path] = null;
      });
      
      newShortcuts[activeBinding] = key;
      setShortcuts(newShortcuts);
      setActiveBinding(null);
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeBinding, shortcuts]);

  async function handleSave() {
    setGuardando(true);
    setStatus('');
    
    // Volver a formato { key: path }
    const prefs = {};
    Object.entries(shortcuts).forEach(([path, key]) => {
      if (key) prefs[key] = path;
    });

    try {
      const res = await fetch('/api/usuarios/preferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferencias: prefs })
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('✅ Ajustes guardados correctamente.');
        setTimeout(() => setStatus(''), 3000);
      } else {
        setStatus('❌ Error: ' + data.error);
      }
    } catch (err) {
      setStatus('❌ Error de conexión');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Shell title="Ajustes de Usuario">
      <div style={{maxWidth:'800px', margin:'0 auto'}}>
        <header style={{marginBottom:'30px'}}>
          <h2 style={{fontFamily:'Playfair Display,serif', fontSize:'24px', color:'#111', marginBottom:'8px'}}>Personalización</h2>
          <p style={{fontSize:'14px', color:'#666', lineHeight:1.6}}> Configura tus atajos de teclado para navegar más rápido. Haz clic en una tecla para cambiarla.</p>
        </header>

        <div style={{background:'#fff', border:'1px solid var(--border)', borderRadius:'4px', overflow:'hidden'}}>
          <div style={{padding:'20px', borderBottom:'1px solid var(--border)', background:'var(--bg2)'}}>
            <h3 style={{fontSize:'12px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555'}}>Atajos de Navegación</h3>
          </div>
          
          <div style={{padding:'10px 0'}}>
            {ACCIONES.map(acc => {
              const currentKey = shortcuts[acc.id] || shortcuts[acc.id.startsWith('/') ? acc.id : '/'+acc.id];
              const isBinding = activeBinding === acc.id;

              return (
                <div key={acc.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid var(--bg2)'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <span style={{fontSize:'18px'}}>{acc.icon}</span>
                    <div>
                      <div style={{fontSize:'14px', fontWeight:600, color:'#333'}}>{acc.label}</div>
                      <div style={{fontSize:'10px', color:'#999', fontFamily:'DM Mono,monospace'}}>{acc.id.startsWith('/') ? acc.id : '/'+acc.id}</div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveBinding(acc.id)}
                    style={{
                      minWidth:'45px',
                      height:'45px',
                      background: isBinding ? '#c9a84c' : '#f8f8f8',
                      border: `1px solid ${isBinding ? '#c9a84c' : '#ddd'}`,
                      borderRadius:'4px',
                      fontFamily:'DM Mono,monospace',
                      fontSize:'18px',
                      fontWeight:700,
                      color: isBinding ? '#000' : '#333',
                      textTransform:'uppercase',
                      cursor:'pointer',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      transition:'all .15s',
                      boxShadow: isBinding ? '0 0 15px rgba(201,168,76,0.3)' : 'none'
                    }}
                  >
                    {isBinding ? '...' : (currentKey || '-')}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{padding:'20px', background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid var(--border)'}}>
            <div style={{fontSize:'12px', color: status.includes('✅') ? 'var(--green)' : status.includes('❌') ? 'var(--red)' : '#888'}}>
              {status || (activeBinding ? 'Presiona una tecla para asignar...' : 'Cambios pendientes de guardar.')}
            </div>
            <button 
              onClick={handleSave}
              disabled={guardando || !!activeBinding}
              style={{
                padding:'10px 24px',
                background:'#111',
                color:'#fff',
                border:'none',
                borderRadius:'4px',
                fontWeight:600,
                fontSize:'13px',
                cursor:'pointer',
                opacity: (guardando || !!activeBinding) ? .6 : 1
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        <div style={{marginTop:'30px', padding:'15px', border:'1px dashed #ddd', borderRadius:'4px', fontSize:'12px', color:'#777'}}>
          <strong>Nota:</strong> Los atajos se activan solo con la letra (Ej: presiona "c" para comandas). No funcionarán mientras estés escribiendo en un formulario o buscador.
        </div>
      </div>
    </Shell>
  );
}
