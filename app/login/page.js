'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useAppData } from '@/lib/AppContext';

const ISOTIPO_URL = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/ISOTIPO%20PNG.png";
const HERO_URL    = "https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/moditex-hero.png";

export default function LoginPage() {
  const { login, usuario } = useAuth() || {};
  const { recargar } = useAppData() || {};
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin,      setPin]      = useState('');
  const [err,      setErr]      = useState('');
  const [load,     setLoad]     = useState(false);
  const [cutting,  setCutting]  = useState(false); // animation state

  useEffect(() => {
    if (usuario) router.replace('/dashboard');
  }, [usuario]);

  async function handleLogin(e) {
    e.preventDefault();
    setErr(''); setLoad(true);
    try {
      const res = await fetch('/api/auth', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, pin }),
      }).then(r => r.json());

      if (res.ok) {
        // Animate scissors then navigate
        setCutting(true);
        login(res.usuario);
        if (recargar) recargar();
        setTimeout(() => { router.replace('/dashboard'); }, 1200);
      } else {
        setErr(res.error || 'Error al iniciar sesión');
        setLoad(false);
      }
    } catch {
      setErr('Error de conexión');
      setLoad(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Poppins',sans-serif", overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700;900&family=Poppins:wght@300;400;600;700&family=DM+Mono:wght@400;700&display=swap');

        .li { width:100%; padding:13px 16px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#fff; font-family:'Poppins',sans-serif; font-size:13px; outline:none; box-sizing:border-box; transition:border-color .2s; border-radius:0; }
        .li::placeholder { color:rgba(255,255,255,.25); }
        .li:focus { border-color:#c9a84c; background:rgba(255,255,255,.09); }
        .li.pin { font-family:'DM Mono',monospace; font-size:22px; letter-spacing:.4em; text-align:center; }
        .lb { display:block; margin-bottom:7px; font-family:'DM Mono',monospace; font-size:8px; letter-spacing:.22em; text-transform:uppercase; color:rgba(255,255,255,.35); }

        /* ── SCISSORS ANIMATION ── */
        .scissors-overlay {
          position:fixed; inset:0; z-index:1000;
          pointer-events:none;
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity .15s;
        }
        .scissors-overlay.active { opacity:1; pointer-events:all; }

        /* Two halves that split apart */
        .cut-top, .cut-bot {
          position:fixed; left:0; right:0; height:50vh;
          background:#0a0a0a;
          transition:transform .55s cubic-bezier(.77,0,.175,1);
          z-index:999;
        }
        .cut-top { top:0; transform:translateY(0); }
        .cut-bot { bottom:0; transform:translateY(0); }
        .scissors-overlay.active .cut-top { transform:translateY(-100%); }
        .scissors-overlay.active .cut-bot { transform:translateY(100%); }

        /* Scissors icon in the center, cuts then follows */
        .scissors-icon {
          position:fixed; top:50%; left:50%;
          transform:translate(-50%,-50%) rotate(-90deg) scale(0.5);
          z-index:1000; font-size:60px;
          animation:none;
          filter:drop-shadow(0 0 20px rgba(201,168,76,.8));
        }
        .scissors-overlay.active .scissors-icon {
          animation:scissorsCut .6s cubic-bezier(.68,-0.55,.27,1.55) forwards;
        }
        @keyframes scissorsCut {
          0%   { transform:translate(-50%,-50%) rotate(-90deg) scale(0.5); opacity:0; }
          15%  { transform:translate(-50%,-50%) rotate(-90deg) scale(1.2); opacity:1; }
          40%  { transform:translate(-50%,-50%) rotate(-90deg) scale(1);   opacity:1; }
          70%  { transform:translate(-50%,-50%) rotate(-90deg) scale(1.1); opacity:1; }
          100% { transform:translate(-50%,-120vh) rotate(-90deg) scale(0.8); opacity:0; }
        }

        /* The cut line flash */
        .cut-line {
          position:fixed; left:0; right:0; top:50%; height:2px;
          background:linear-gradient(to right,transparent,#c9a84c,#fff,#c9a84c,transparent);
          z-index:1001; opacity:0;
          transform:scaleX(0);
        }
        .scissors-overlay.active .cut-line {
          animation:cutFlash .25s ease .15s forwards;
        }
        @keyframes cutFlash {
          0%   { opacity:0; transform:scaleX(0); }
          50%  { opacity:1; transform:scaleX(1); }
          100% { opacity:0; transform:scaleX(1); }
        }

        @media(max-width:767px){ .login-photo { display:none !important; } .login-form { width:100% !important; } }
      `}</style>

      {/* ── SCISSORS TRANSITION ── */}
      <div className={`scissors-overlay${cutting ? ' active' : ''}`}>
        <div className="cut-top"/>
        <div className="cut-bot"/>
        <div className="cut-line"/>
        <div className="scissors-icon">✂️</div>
      </div>

      {/* ── FOTO IZQUIERDA ── */}
      <div className="login-photo" style={{ flex:1, position:'relative', overflow:'hidden', background:'#0a0a0a' }}>
        <img src={HERO_URL} alt="Moditex"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', opacity:.5 }}
        />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(10,10,10,.05) 0%,rgba(10,10,10,.65) 100%)' }}/>
        <div style={{ position:'absolute', bottom:'40px', left:'40px', right:'40px', zIndex:2 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#c9a84c', letterSpacing:'.28em', textTransform:'uppercase', marginBottom:'10px' }}>
            Barquisimeto · Venezuela
          </div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'30px', fontWeight:900, color:'#fff', lineHeight:1.2 }}>
            Fabricamos<br/>tu propia marca
          </div>
          <div style={{ marginTop:'10px', fontFamily:"'Poppins',sans-serif", fontSize:'12px', color:'rgba(255,255,255,.45)' }}>
            Venta mayorista · Enterizos · Jackets · Conjuntos
          </div>
        </div>
      </div>

      {/* ── FORMULARIO DERECHO ── */}
      <div className="login-form" style={{ width:'420px', flexShrink:0, background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 44px', borderLeft:'1px solid rgba(255,255,255,.07)' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'14px', marginBottom:'6px' }}>
            <img src={ISOTIPO_URL} alt="M"
              style={{ height:'56px', width:'56px', objectFit:'contain' }}
            />
            <div style={{ textAlign:'left' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'24px', fontWeight:900, color:'#fff', letterSpacing:'.06em', lineHeight:1 }}>MODITEX</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'7.5px', color:'#c9a84c', letterSpacing:'.35em', textTransform:'uppercase', marginTop:'4px' }}>GROUP</div>
            </div>
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'8px', color:'rgba(255,255,255,.2)', letterSpacing:'.18em', textTransform:'uppercase', marginTop:'10px' }}>
            Panel de Control
          </div>
        </div>

        {/* Título */}
        <div style={{ width:'100%', marginBottom:'28px' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'24px', fontWeight:700, color:'#fff', marginBottom:'5px' }}>
            Iniciar Sesión
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'rgba(255,255,255,.25)', letterSpacing:'.08em' }}>
            Ingresa tus credenciales de acceso
          </div>
        </div>

        {/* Error */}
        {err && (
          <div style={{ width:'100%', padding:'10px 14px', marginBottom:'16px', background:'rgba(220,38,38,.12)', border:'1px solid rgba(220,38,38,.3)', borderLeft:'3px solid #ef4444', color:'#fca5a5', fontFamily:"'DM Mono',monospace", fontSize:'10px', borderRadius:'0' }}>
            ⚠ {err}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ width:'100%', display:'flex', flexDirection:'column', gap:'20px' }}>
          <div>
            <label className="lb">Usuario</label>
            <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
              placeholder="ej: admin" required autoFocus autoCapitalize="off" autoComplete="username"
              className="li"/>
          </div>
          <div>
            <label className="lb">PIN de acceso</label>
            <input type="password" value={pin} onChange={e=>setPin(e.target.value)}
              placeholder="······" required maxLength={6}
              className="li pin"/>
          </div>
          <button type="submit" disabled={load || cutting}
            style={{ padding:'14px', background: cutting ? '#333' : load ? '#555' : '#c9a84c', color: cutting ? '#c9a84c' : '#000', border:'none', cursor:(load||cutting)?'not-allowed':'pointer', fontFamily:"'Poppins',sans-serif", fontSize:'13px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', transition:'background .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
            {cutting ? '✂️ Ingresando...' : load ? '⏳ Verificando...' : '→ Entrar al Sistema'}
          </button>
        </form>

        <div style={{ marginTop:'40px', textAlign:'center', fontFamily:"'DM Mono',monospace", fontSize:'8px', color:'rgba(255,255,255,.12)', letterSpacing:'.1em', lineHeight:1.8 }}>
          MODITEX POS v1.0<br/>Barquisimeto, Venezuela
        </div>
      </div>
    </div>
  );
}
