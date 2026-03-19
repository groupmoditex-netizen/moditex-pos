'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useAppData } from '@/lib/AppContext';

export default function LoginPage() {
  const { login, usuario } = useAuth() || {};
  const { recargar } = useAppData() || {};
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin,      setPin]      = useState('');
  const [err,      setErr]      = useState('');
  const [load,     setLoad]     = useState(false);

  useEffect(() => {
    if (usuario) router.replace('/dashboard');
  }, [usuario]);

  async function handleLogin(e) {
    e.preventDefault();
    setErr(''); setLoad(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      }).then(r => r.json());

      if (res.ok) {
        // 1. Actualizar estado de auth
        login(res.usuario);
        // 2. Disparar carga de datos INMEDIATAMENTE — la cookie ya está activa
        //    No esperamos a que el usuario haga clic en "Recargar"
        if (recargar) recargar();
        // 3. Navegar al dashboard
        router.replace('/dashboard');
      } else {
        setErr(res.error || 'Error al iniciar sesión');
      }
    } catch {
      setErr('Error de conexión');
    }
    setLoad(false);
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'36px'}}>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'38px',fontWeight:900,letterSpacing:'.05em',lineHeight:1}}>MODITEX</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'var(--red)',letterSpacing:'.3em',textTransform:'uppercase',marginTop:'4px'}}>GROUP ●</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666',marginTop:'8px'}}>Fabricamos tu propia marca de ropa</div>
        </div>

        {/* Card */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderTop:'3px solid var(--red)',padding:'32px'}}>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'18px',fontWeight:700,marginBottom:'6px'}}>Iniciar Sesión</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#888',marginBottom:'24px'}}>Ingresa tus credenciales de acceso</div>

          {err && (
            <div style={{padding:'10px 14px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'11px',marginBottom:'16px',border:'1px solid rgba(217,30,30,.2)'}}>
              ⚠️ {err}
            </div>
          )}

          <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div>
              <label style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'6px'}}>
                Usuario
              </label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="ej: administrador" required autoFocus
                autoCapitalize="off" autoComplete="username"
                style={{width:'100%',padding:'11px 13px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'}}
              />
            </div>
            <div>
              <label style={{fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'6px'}}>
                PIN de acceso
              </label>
              <input
                type="password" value={pin} onChange={e => setPin(e.target.value)}
                placeholder="••••••" required maxLength={6}
                style={{width:'100%',padding:'11px 13px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'20px',letterSpacing:'.3em',outline:'none',boxSizing:'border-box',textAlign:'center'}}
              />
            </div>
            <button type="submit" disabled={load}
              style={{padding:'13px',background:'var(--red)',color:'#fff',border:'none',cursor:load?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',fontSize:'13px',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',opacity:load?.7:1,marginTop:'8px'}}>
              {load ? '⏳ Verificando...' : '→ Entrar al Sistema'}
            </button>
          </form>
        </div>

        <div style={{textAlign:'center',marginTop:'20px',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888'}}>
          MODITEX POS v1.0 · Barquisimeto, Venezuela
        </div>
      </div>
    </div>
  );
}
