'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppData } from '@/lib/AppContext';
import { useAuth, NAV_POR_ROL } from '@/lib/AuthContext';

/* Accesos rápidos del bottom nav por rol */
const BOTTOM_NAV = {
  admin:    [
    { href:'/dashboard',     icon:'⬡', label:'Inicio'    },
    { href:'/venta-directa', icon:'⚡', label:'Venta'     },
    { href:'/comandas',      icon:'📋', label:'Pedidos'   },
    { href:'/inventario',    icon:'▦',  label:'Stock'     },
    { href:'#menu',          icon:'☰',  label:'Más'       },
  ],
  vendedor: [
    { href:'/dashboard',     icon:'⬡', label:'Inicio'    },
    { href:'/venta-directa', icon:'⚡', label:'Venta'     },
    { href:'/comandas',      icon:'📋', label:'Pedidos'   },
    { href:'/inventario',    icon:'▦',  label:'Stock'     },
    { href:'#menu',          icon:'☰',  label:'Más'       },
  ],
  viewer:   [
    { href:'/dashboard',     icon:'⬡', label:'Inicio'    },
    { href:'/inventario',    icon:'▦',  label:'Stock'     },
    { href:'/historial',     icon:'≡',  label:'Historial' },
    { href:'/alertas',       icon:'⚠',  label:'Alertas'   },
    { href:'#menu',          icon:'☰',  label:'Más'       },
  ],
};

export default function Shell({ children, title }) {
  const path = usePathname();
  const { data, cargando, recargar } = useAppData() || {};
  const { usuario, logout } = useAuth() || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const [fecha,    setFecha]    = useState('');

  useEffect(() => {
    setFecha(new Date().toLocaleDateString('es-ES', {weekday:'short',day:'numeric',month:'short',year:'numeric'}));
  }, []);

  // Cerrar menú al navegar
  useEffect(() => { setMenuOpen(false); }, [path]);

  // Bloquear scroll del body cuando el menú está abierto en mobile
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const alertCount = data ? data.productos.filter(p => p.disponible <= 0).length : 0;
  const navItems   = NAV_POR_ROL[usuario?.rol] || NAV_POR_ROL.viewer;
  const bottomNav  = BOTTOM_NAV[usuario?.rol]  || BOTTOM_NAV.viewer;

  const rolColor = { admin:'var(--red)', vendedor:'var(--blue)', viewer:'var(--green)' };
  const rolLabel = { admin:'Admin', vendedor:'Vendedor', viewer:'Solo Vista' };

  return (
    <div className="shell-root">

      {/* ── OVERLAY (solo mobile, cuando menú abierto) ── */}
      <div
        className={`shell-overlay${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* ── SIDEBAR ── */}
      <aside className={`shell-sidebar${menuOpen ? ' open' : ''}`}>

        {/* Botón cerrar (mobile) */}
        <button className="shell-close-btn" onClick={() => setMenuOpen(false)}>✕</button>

        {/* Brand */}
        <div className="shell-brand">
          <div className="sb-eyebrow">Panel de Control</div>
          <span className="logo-moditex">MODITEX</span>
          <span className="logo-group">
            GROUP <span className="logo-dot"/>
          </span>
          <div className="sb-tagline">Fabricamos tu propia marca<br/>de ropa · Barquisimeto</div>
        </div>

        {/* Usuario */}
        {usuario && (
          <div className="shell-user">
            <div style={{minWidth:0}}>
              <div style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{usuario.nombre}</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:rolColor[usuario.rol]||'#555',marginTop:'1px',letterSpacing:'.06em',textTransform:'uppercase'}}>{rolLabel[usuario.rol]||usuario.rol}</div>
            </div>
            <button onClick={logout} className="shell-logout-btn">⬡ Salir</button>
          </div>
        )}

        {/* Nav */}
        <nav style={{flex:1,padding:'10px 0',overflowY:'auto'}}>
          {navItems.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section-label">{item.section}</div>
            ) : (
              <Link key={item.href} href={item.href}
                className={`nav-link${path === item.href ? ' active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && alertCount > 0 && (
                  <span className="nav-badge">{alertCount}</span>
                )}
              </Link>
            )
          )}
        </nav>

        {/* Footer */}
        <div className="shell-footer">
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'7.5px',color:'#666',letterSpacing:'.12em'}}>MODITEX POS v1.0</div>
          <a href="https://wa.me/584120363131" target="_blank" rel="noreferrer" className="shell-wa-link">
            <span>📱</span>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#1a9e4e',lineHeight:1.5}}>04120363131<br/>04127534435</span>
          </a>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="shell-main">

        {/* Topbar */}
        <div className="shell-topbar">
          {/* Hamburger — solo visible en mobile (CSS) */}
          <button className="shell-hamburger" onClick={() => setMenuOpen(o => !o)}>☰</button>

          {/* Logo mobile (CSS lo muestra solo en mobile) */}
          <span className="shell-topbar-logo">MODITEX</span>

          {/* Título desktop (CSS lo muestra solo en desktop) */}
          <div className="shell-topbar-title">{title}</div>

          <div style={{display:'flex',alignItems:'center',gap:'6px',marginLeft:'auto',flexShrink:0}}>
            <span className="shell-topbar-date">{fecha}</span>
            <button onClick={recargar} disabled={cargando} className="shell-reload-btn">
              <span>{cargando ? '⏳' : '↺'}</span>
              <span className="shell-reload-label"> Recargar</span>
            </button>
          </div>
        </div>

        {/* Título de página — solo mobile, debajo del topbar */}
        <div className="shell-page-title">{title}</div>

        {/* Contenido */}
        <div className="shell-content">
          {children}
        </div>
      </main>

      {/* ── BOTTOM NAV (solo mobile, CSS) ── */}
      <nav className="shell-bottom-nav">
        {bottomNav.map(item => {
          const isMenu   = item.href === '#menu';
          const isActive = !isMenu && path === item.href;
          return isMenu ? (
            <button key="#menu" onClick={() => setMenuOpen(o => !o)} className="bnav-item">
              <span className="bnav-icon">{item.icon}</span>
              <span className="bnav-label">{item.label}</span>
            </button>
          ) : (
            <Link key={item.href} href={item.href} className={`bnav-item${isActive ? ' active' : ''}`}>
              <span className="bnav-icon">{item.icon}</span>
              <span className="bnav-label">
                {item.label}
                {item.label === 'Alertas' && alertCount > 0 ? ` (${alertCount})` : ''}
              </span>
            </Link>
          );
        })}
      </nav>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
    </div>
  );
}