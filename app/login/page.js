'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useAppData } from '@/lib/AppContext';

const LOGO_URL  = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/moditex-logo.jpg";
const ISOTIPO_URL = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/ISOTIPO%20PNG.png";
const HERO_URL = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/moditex-hero.png";

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
        login(res.usuario);
        if (recargar) recargar();
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
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Poppins',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Playfair+Display:wght@700;900&family=DM+Mono&display=swap');

        .login-input {
          width: 100%; padding: 13px 16px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 4px;
          color: #fff;
          font-family: 'Poppins', sans-serif; font-size: 13px;
          outline: none; box-sizing: border-box;
          transition: border-color .2s;
        }
        .login-input::placeholder { color: rgba(255,255,255,.25); }
        .login-input:focus { border-color: #c9a84c; background: rgba(255,255,255,.09); }
        .login-input.pin-input {
          font-family: 'DM Mono', monospace;
          font-size: 22px; letter-spacing: .4em;
          text-align: center;
        }
        .login-btn {
          width: 100%; padding: 14px;
          background: #c9a84c; color: #000;
          border: none; border-radius: 4px;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: .1em; text-transform: uppercase;
          transition: background .2s, opacity .2s;
          margin-top: 8px;
        }
        .login-btn:hover:not(:disabled) { background: #e0bc5e; }
        .login-btn:disabled { opacity: .6; cursor: not-allowed; }
        .login-label {
          display: block; margin-bottom: 7px;
          font-family: 'DM Mono', monospace;
          font-size: 8px; letter-spacing: .22em;
          text-transform: uppercase; color: rgba(255,255,255,.4);
        }
        @media (max-width: 767px) {
          .login-right { display: none !important; }
          .login-left { width: 100% !important; }
        }
      `}</style>

      {/* ── LADO IZQUIERDO — Foto ── */}
      <div className="login-right" style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: '#0a0a0a',
      }}>
        <img src={HERO_URL} alt="Moditex Group"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', opacity:.55 }}
        />
        {/* Gradiente sobre foto */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(to right, rgba(10,10,10,.1) 0%, rgba(10,10,10,.6) 100%)',
        }}/>
        {/* Tagline bottom */}
        <div style={{
          position:'absolute', bottom:'40px', left:'40px', right:'40px',
          zIndex: 2,
        }}>
          <div style={{
            fontFamily:"'DM Mono',monospace", fontSize:'9px',
            color:'#c9a84c', letterSpacing:'.28em', textTransform:'uppercase',
            marginBottom:'10px',
          }}>
            Barquisimeto · Venezuela
          </div>
          <div style={{
            fontFamily:"'Playfair Display',serif", fontSize:'28px',
            fontWeight:900, color:'#fff', lineHeight:1.25,
          }}>
            Fabricamos<br/>tu propia marca
          </div>
          <div style={{
            marginTop:'10px', fontFamily:"'Poppins',sans-serif",
            fontSize:'12px', color:'rgba(255,255,255,.5)',
          }}>
            Venta mayorista · Enterizos · Jackets · Conjuntos
          </div>
        </div>
      </div>

      {/* ── LADO DERECHO — Formulario ── */}
      <div className="login-left" style={{
        width: '420px', flexShrink: 0,
        background: '#0a0a0a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 44px',
        borderLeft: '1px solid rgba(255,255,255,.07)',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'4px' }}>
            <img src={ISOTIPO_URL} alt="M" style={{ height:'56px', width:'56px', objectFit:'contain' }}/>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'22px', fontWeight:900, color:'#fff', letterSpacing:'.05em', lineHeight:1 }}>MODITEX</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'7.5px', color:'#c9a84c', letterSpacing:'.35em', textTransform:'uppercase', marginTop:'4px' }}>GROUP</div>
            </div>
          </div>
          <div style={{
            fontFamily:"'DM Mono',monospace", fontSize:'8px',
            color:'rgba(255,255,255,.25)', letterSpacing:'.18em',
            textTransform:'uppercase', marginTop:'8px',
          }}>
            Panel de Control
          </div>
        </div>

        {/* Título */}
        <div style={{ width:'100%', marginBottom:'28px' }}>
          <div style={{
            fontFamily:"'Playfair Display',serif",
            fontSize:'22px', fontWeight:700, color:'#fff',
            marginBottom:'5px',
          }}>
            Iniciar Sesión
          </div>
          <div style={{
            fontFamily:"'DM Mono',monospace", fontSize:'9px',
            color:'rgba(255,255,255,.3)', letterSpacing:'.08em',
          }}>
            Ingresa tus credenciales de acceso
          </div>
        </div>

        {/* Error */}
        {err && (
          <div style={{
            width:'100%', padding:'10px 14px', marginBottom:'16px',
            background:'rgba(220,38,38,.12)',
            border:'1px solid rgba(220,38,38,.3)',
            borderLeft:'3px solid #ef4444',
            color:'#fca5a5',
            fontFamily:"'DM Mono',monospace", fontSize:'10px',
            borderRadius:'3px',
          }}>
            ⚠ {err}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} style={{ width:'100%', display:'flex', flexDirection:'column', gap:'20px' }}>
          <div>
            <label className="login-label">Usuario</label>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ej: admin" required autoFocus
              autoCapitalize="off" autoComplete="username"
              className="login-input"
            />
          </div>
          <div>
            <label className="login-label">PIN de acceso</label>
            <input
              type="password" value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="······" required maxLength={6}
              className="login-input pin-input"
            />
          </div>
          <button type="submit" disabled={load} className="login-btn">
            {load ? '⏳ Verificando...' : '→ Entrar al Sistema'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop:'40px', textAlign:'center',
          fontFamily:"'DM Mono',monospace", fontSize:'8px',
          color:'rgba(255,255,255,.15)', letterSpacing:'.1em',
          lineHeight:1.8,
        }}>
          MODITEX POS v1.0<br/>
          Barquisimeto, Venezuela
        </div>
      </div>
    </div>
  );
}
