'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAppData } from '@/lib/AppContext';
import { useAuth, NAV_POR_ROL } from '@/lib/AuthContext';

/* ── Grupos del menú top ───────────────────────────────────────────── */
const MENU_GRUPOS = {
  admin: [
    {
      label: 'Principal',
      items: [
        { href:'/dashboard',  label:'Dashboard',  desc:'Resumen general' },
        { href:'/inventario', label:'Inventario',  desc:'Stock en tiempo real' },
        { href:'/productos',  label:'Productos',   desc:'Catálogo de prendas' },
      ],
    },
    {
      label: 'Movimientos',
      items: [
        { href:'/entrada',   label:'Nueva Entrada',  desc:'Registro de compras/producción' },
        { href:'/salida',    label:'Nueva Salida',   desc:'Descartes y ajustes' },
        { href:'/historial', label:'Historial',      desc:'Todos los movimientos' },
      ],
    },
    {
      label: 'Ventas',
      items: [
        { href:'/venta-directa', label:'Venta Directa',  desc:'Venta con cobro inmediato' },
        { href:'/envio-rapido',  label:'Envío Rápido',   desc:'Despacho sin seguimiento' },
        { href:'/comandas',      label:'Comandas',       desc:'Pedidos y producción' },
        { href:'/exhibicion',    label:'Mostrador',      desc:'Vista de exhibición' },
      ],
    },
    {
      label: 'Reportes',
      items: [
        { href:'/alertas',  label:'Alertas de Stock',  desc:'Prendas sin disponibilidad', badge:true },
        { href:'/reportes', label:'Reportes',          desc:'Ventas y estadísticas' },
        { href:'/clientes', label:'Clientes',          desc:'CRM y base de clientes' },
      ],
    },
    {
      label: 'Herramientas',
      items: [
        { href:'/etiquetas',  label:'Etiquetas',      desc:'Impresión de códigos' },
        { href:'/plan-tela',  label:'Plan de Tela',   desc:'Consumo de materiales' },
        { href:'/usuarios',   label:'Usuarios',       desc:'Gestión de accesos' },
        { href:'/logs',       label:'Logs del Sistema', desc:'Auditoría de acciones' },
      ],
    },
  ],
  vendedor: [
    {
      label: 'Principal',
      items: [
        { href:'/dashboard',  label:'Dashboard',  desc:'Resumen general' },
        { href:'/inventario', label:'Inventario',  desc:'Stock en tiempo real' },
        { href:'/historial',  label:'Historial',   desc:'Movimientos' },
      ],
    },
    {
      label: 'Ventas',
      items: [
        { href:'/venta-directa', label:'Venta Directa',  desc:'Venta con cobro inmediato' },
        { href:'/envio-rapido',  label:'Envío Rápido',   desc:'Despacho sin seguimiento' },
        { href:'/comandas',      label:'Comandas',       desc:'Pedidos y producción' },
        { href:'/exhibicion',    label:'Mostrador',      desc:'Vista de exhibición' },
      ],
    },
    {
      label: 'Reportes',
      items: [
        { href:'/alertas',  label:'Alertas',   desc:'Prendas sin stock', badge:true },
        { href:'/reportes', label:'Reportes',  desc:'Estadísticas' },
        { href:'/clientes', label:'Clientes',  desc:'CRM' },
      ],
    },
  ],
  viewer: [
    {
      label: 'Principal',
      items: [
        { href:'/dashboard',  label:'Dashboard',  desc:'Resumen' },
        { href:'/inventario', label:'Inventario',  desc:'Stock' },
        { href:'/historial',  label:'Historial',   desc:'Movimientos' },
        { href:'/alertas',    label:'Alertas',     desc:'Stock crítico', badge:true },
      ],
    },
  ],
};

/* ── Bottom nav mobile ──────────────────────────────────────────────── */
const BOTTOM_NAV = {
  admin:    [
    { href:'/dashboard',     icon:'◈', label:'Inicio'  },
    { href:'/venta-directa', icon:'⚡', label:'Venta'   },
    { href:'/comandas',      icon:'◻', label:'Pedidos' },
    { href:'/inventario',    icon:'◧', label:'Stock'   },
    { href:'#menu',          icon:'≡',  label:'Menú'    },
  ],
  vendedor: [
    { href:'/dashboard',     icon:'◈', label:'Inicio'  },
    { href:'/venta-directa', icon:'⚡', label:'Venta'   },
    { href:'/comandas',      icon:'◻', label:'Pedidos' },
    { href:'/inventario',    icon:'◧', label:'Stock'   },
    { href:'#menu',          icon:'≡',  label:'Menú'    },
  ],
  viewer:   [
    { href:'/dashboard',  icon:'◈', label:'Inicio'   },
    { href:'/inventario', icon:'◧', label:'Stock'    },
    { href:'/historial',  icon:'≡',  label:'Historial'},
    { href:'/alertas',    icon:'⚠', label:'Alertas'  },
    { href:'#menu',       icon:'≡',  label:'Más'      },
  ],
};

export default function Shell({ children, title }) {
  const path = usePathname();
  const { data, cargando, recargar } = useAppData() || {};
  const { usuario, logout } = useAuth() || {};
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [fecha, setFecha] = useState('');
  const dropdownRef = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    setFecha(new Date().toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short', year:'numeric' }));
  }, []);

  useEffect(() => { setDrawerOpen(false); setActiveGroup(null); }, [path]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveGroup(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const alertCount = data ? data.productos.filter(p => p.disponible <= 0).length : 0;
  const grupos = MENU_GRUPOS[usuario?.rol] || MENU_GRUPOS.viewer;
  const bottomNav = BOTTOM_NAV[usuario?.rol] || BOTTOM_NAV.viewer;

  // Flat nav for mobile drawer
  const allItems = grupos.flatMap(g => g.items);

  function handleGroupEnter(label) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveGroup(label);
  }
  function handleGroupLeave() {
    closeTimer.current = setTimeout(() => setActiveGroup(null), 150);
  }
  function handleDropdownEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  const activeLabel = grupos.find(g => g.items.some(i => i.href === path))?.label;

  return (
    <div className="shell-root">
      <style>{`
        /* ══ SHELL v2 — Fashion Navbar ══════════════════════════════ */

        /* Top navbar */
        .sh-navbar {
          position: sticky; top: 0; z-index: 500;
          background: #0a0a0a;
          border-bottom: 1px solid #1f1f1f;
          height: 60px;
          display: flex; align-items: center;
          padding: 0 28px;
          gap: 0;
        }

        /* Logo */
        .sh-logo {
          display: flex; align-items: center; gap: 0;
          text-decoration: none; flex-shrink: 0;
          margin-right: 36px;
        }
        .sh-logo-text {
          display: flex; flex-direction: column; line-height: 1.1;
        }
        .sh-logo-moditex {
          font-family: 'Playfair Display', serif;
          font-size: 18px; font-weight: 900;
          color: #fff; letter-spacing: .06em;
        }
        .sh-logo-group {
          font-family: 'DM Mono', monospace;
          font-size: 7px; letter-spacing: .38em;
          color: #c9a84c; text-transform: uppercase;
          margin-top: 1px;
        }

        /* Nav groups */
        .sh-nav-groups {
          display: flex; align-items: stretch; height: 60px; flex: 1;
        }
        .sh-nav-group {
          position: relative;
        }
        .sh-nav-group-btn {
          height: 60px; padding: 0 18px;
          background: none; border: none; cursor: pointer;
          font-family: 'Poppins', sans-serif; font-size: 11px;
          font-weight: 500; letter-spacing: .08em; text-transform: uppercase;
          color: #aaa; transition: color .15s;
          display: flex; align-items: center; gap: 5px;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          position: relative;
        }
        .sh-nav-group-btn:hover,
        .sh-nav-group-btn.active { color: #fff; }
        .sh-nav-group-btn.active { border-bottom-color: #c9a84c; }
        .sh-nav-group-btn .arrow {
          font-size: 8px; opacity: .5; transition: transform .15s;
        }
        .sh-nav-group-btn.open .arrow { transform: rotate(180deg); opacity: 1; }

        /* Dropdown */
        .sh-dropdown {
          position: absolute; top: 60px; left: 0;
          min-width: 240px;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          border-top: 2px solid #c9a84c;
          box-shadow: 0 16px 40px rgba(0,0,0,.5);
          z-index: 600;
          animation: sh-fadein .15s ease;
        }
        @keyframes sh-fadein { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        .sh-dropdown-item {
          display: flex; flex-direction: column;
          padding: 12px 18px;
          text-decoration: none;
          border-bottom: 1px solid #161616;
          transition: background .12s;
          cursor: pointer;
        }
        .sh-dropdown-item:hover { background: #161616; }
        .sh-dropdown-item.active { background: #1a1a0e; border-left: 2px solid #c9a84c; }
        .sh-dropdown-label {
          font-family: 'Poppins', sans-serif; font-size: 12px;
          font-weight: 600; color: #fff; letter-spacing: .02em;
          display: flex; align-items: center; gap: 8px;
        }
        .sh-dropdown-desc {
          font-family: 'DM Mono', monospace; font-size: 9px;
          color: #555; margin-top: 2px; letter-spacing: .04em;
        }
        .sh-dd-badge {
          background: #c9a84c; color: #000;
          font-family: 'DM Mono', monospace; font-size: 8px;
          padding: 1px 6px; font-weight: 700;
        }

        /* Right side of navbar */
        .sh-navbar-right {
          display: flex; align-items: center; gap: 12px;
          margin-left: auto; flex-shrink: 0;
        }
        .sh-date {
          font-family: 'DM Mono', monospace; font-size: 9px;
          color: #555; letter-spacing: .06em; white-space: nowrap;
        }
        .sh-user-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 6px 12px;
          border: 1px solid #2a2a2a;
          background: #111;
        }
        .sh-user-name {
          font-family: 'Poppins', sans-serif; font-size: 11px;
          font-weight: 600; color: #ddd;
        }
        .sh-user-rol {
          font-family: 'DM Mono', monospace; font-size: 8px;
          color: #c9a84c; letter-spacing: .08em; text-transform: uppercase;
        }
        .sh-logout {
          padding: 6px 12px;
          background: none; border: 1px solid #333; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 9px;
          color: #666; transition: all .15s; white-space: nowrap;
        }
        .sh-logout:hover { border-color: #c9a84c; color: #c9a84c; }
        .sh-reload {
          padding: 6px 10px; background: none;
          border: 1px solid #2a2a2a; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 11px;
          color: #666; transition: all .15s;
          display: flex; align-items: center; gap: 3px;
        }
        .sh-reload:hover { border-color: #555; color: #fff; }

        /* Page title bar */
        .sh-page-bar {
          background: #fff; border-bottom: 1px solid var(--border);
          padding: 10px 28px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .sh-page-title {
          font-family: 'Playfair Display', serif;
          font-size: 16px; font-weight: 700; color: #111;
        }
        .sh-page-breadcrumb {
          font-family: 'DM Mono', monospace; font-size: 9px;
          color: #aaa; letter-spacing: .1em; text-transform: uppercase;
        }

        /* Content */
        .sh-content { padding: 24px 28px; flex: 1; }

        /* Main layout */
        .sh-main { display: flex; flex-direction: column; flex: 1; min-width: 0; }

        /* ══ MOBILE DRAWER ══════════════════════════════════════════ */
        .sh-hamburger {
          display: none;
          width: 38px; height: 38px;
          background: none; border: 1px solid #333;
          cursor: pointer; font-size: 16px; color: #fff;
          align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sh-mobile-logo {
          display: none;
          font-family: 'Playfair Display', serif;
          font-size: 16px; font-weight: 900;
          color: #fff; letter-spacing: .06em;
        }
        .sh-mobile-logo span {
          font-family: 'DM Mono', monospace;
          font-size: 8px; letter-spacing: .3em;
          color: #c9a84c;
        }

        /* Drawer overlay */
        .sh-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,.65); z-index: 400;
        }
        .sh-overlay.open { display: block; }

        /* Drawer panel */
        .sh-drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(80vw, 300px);
          background: #0a0a0a;
          border-right: 1px solid #1f1f1f;
          z-index: 450;
          display: flex; flex-direction: column;
          transform: translateX(-110%);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
          overflow-y: auto;
        }
        .sh-drawer.open { transform: translateX(0); box-shadow: 4px 0 32px rgba(0,0,0,.6); }

        .sh-drawer-header {
          padding: 20px 18px 16px;
          border-bottom: 1px solid #1f1f1f;
          display: flex; align-items: center; justify-content: space-between;
        }
        .sh-drawer-close {
          width: 30px; height: 30px; background: none;
          border: 1px solid #333; cursor: pointer;
          color: #666; font-size: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .sh-drawer-section {
          font-family: 'DM Mono', monospace; font-size: 7.5px;
          color: #444; letter-spacing: .24em; text-transform: uppercase;
          padding: 14px 18px 5px;
        }
        .sh-drawer-link {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 18px;
          text-decoration: none;
          font-family: 'Poppins', sans-serif; font-size: 12px;
          font-weight: 500; color: #777;
          border-left: 2px solid transparent;
          transition: all .12s;
        }
        .sh-drawer-link:hover { color: #fff; background: #111; }
        .sh-drawer-link.active { color: #c9a84c; border-left-color: #c9a84c; background: #0e0e08; }
        .sh-drawer-footer {
          margin-top: auto; padding: 16px 18px;
          border-top: 1px solid #1f1f1f;
        }

        /* Bottom nav */
        .sh-bottom-nav { display: none; }
        .sh-bnav-item {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 2px; padding: 6px 0 4px;
          background: none; border: none; cursor: pointer;
          text-decoration: none; color: inherit;
          position: relative;
        }
        .sh-bnav-icon { font-size: 18px; line-height: 1; opacity: .5; }
        .sh-bnav-label { font-family: 'DM Mono', monospace; font-size: 8px; color: #888; letter-spacing:.04em; }
        .sh-bnav-item.active .sh-bnav-icon { opacity: 1; }
        .sh-bnav-item.active .sh-bnav-label { color: #c9a84c; font-weight: 700; }
        .sh-bnav-item.active::before {
          content: ''; position: absolute; top: 0; left: 20%; right: 20%;
          height: 2px; background: #c9a84c;
        }

        /* ══ RESPONSIVE ═════════════════════════════════════════════ */
        @media (max-width: 900px) {
          .sh-navbar { padding: 0 14px; }
          .sh-nav-groups { display: none; }
          .sh-hamburger { display: flex; }
          .sh-mobile-logo { display: block; margin-left: 10px; }
          .sh-date { display: none; }
          .sh-user-chip .sh-user-rol { display: none; }
          .sh-user-chip { padding: 5px 8px; }
          .sh-reload .sh-reload-label { display: none; }
          .sh-page-bar { padding: 8px 14px; }
          .sh-content { padding: 12px 14px 80px; }
          .sh-bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0;
            height: 60px; background: #0a0a0a;
            border-top: 1px solid #1f1f1f; z-index: 200;
          }
        }
        @media (max-width: 480px) {
          .sh-user-chip { display: none; }
          .sh-logout { display: none; }
        }

        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
      `}</style>

      {/* ── OVERLAY DRAWER ── */}
      <div className={`sh-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)}/>

      {/* ── DRAWER MOBILE ── */}
      <div className={`sh-drawer${drawerOpen ? ' open' : ''}`} ref={dropdownRef}>
        <div className="sh-drawer-header">
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'16px', fontWeight:900, color:'#fff', letterSpacing:'.06em' }}>Moditex</div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'7px', color:'#c9a84c', letterSpacing:'.3em', textTransform:'uppercase' }}>GROUP</div>
          </div>
          <button className="sh-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        {grupos.map(g => (
          <div key={g.label}>
            <div className="sh-drawer-section">{g.label}</div>
            {g.items.map(item => (
              <Link key={item.href} href={item.href}
                className={`sh-drawer-link${path === item.href ? ' active' : ''}`}>
                {item.label}
                {item.badge && alertCount > 0 && (
                  <span style={{ marginLeft:'auto', background:'#c9a84c', color:'#000', fontFamily:"'DM Mono',monospace", fontSize:'8px', padding:'1px 6px', fontWeight:700 }}>{alertCount}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
        <div className="sh-drawer-footer">
          {usuario && (
            <div style={{ marginBottom:'10px' }}>
              <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:'12px', fontWeight:600, color:'#ddd' }}>{usuario.nombre}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'8px', color:'#c9a84c', textTransform:'uppercase', letterSpacing:'.08em', marginTop:'2px' }}>{usuario.rol}</div>
            </div>
          )}
          <button onClick={logout} style={{ width:'100%', padding:'9px', background:'none', border:'1px solid #333', cursor:'pointer', fontFamily:"'DM Mono',monospace", fontSize:'10px', color:'#666', letterSpacing:'.08em' }}>
            Cerrar sesión
          </button>
          <a href="https://wa.me/584120363131" target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:'7px', marginTop:'10px', padding:'7px 9px', background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.2)', textDecoration:'none' }}>
            <span style={{ fontSize:'14px' }}>📱</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'8px', color:'#1a9e4e', lineHeight:1.5 }}>04120363131<br/>04127534435</span>
          </a>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'7.5px', color:'#333', letterSpacing:'.12em', marginTop:'12px' }}>MODITEX POS v1.0</div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="sh-main">

        {/* TOP NAVBAR */}
        <nav className="sh-navbar" ref={dropdownRef}>
          {/* Hamburger mobile */}
          <button className="sh-hamburger" onClick={() => setDrawerOpen(o => !o)}>☰</button>

          {/* Logo */}
          <Link href="/dashboard" className="sh-logo">
            <div className="sh-logo-text">
              <span className="sh-logo-moditex">Moditex</span>
              <span className="sh-logo-group">Group</span>
            </div>
          </Link>

          {/* Mobile logo text */}
          <div className="sh-mobile-logo">
            Moditex <span>GROUP</span>
          </div>

          {/* Nav groups — desktop */}
          <div className="sh-nav-groups">
            {grupos.map(g => {
              const isOpen = activeGroup === g.label;
              const isActive = activeLabel === g.label;
              const hasBadge = g.items.some(i => i.badge) && alertCount > 0;
              return (
                <div key={g.label} className="sh-nav-group"
                  onMouseEnter={() => handleGroupEnter(g.label)}
                  onMouseLeave={handleGroupLeave}>
                  <button className={`sh-nav-group-btn${isOpen ? ' open' : ''}${isActive ? ' active' : ''}`}>
                    {g.label}
                    {hasBadge && <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#c9a84c', display:'inline-block', marginLeft:'2px' }}/>}
                    <span className="arrow">▾</span>
                  </button>
                  {isOpen && (
                    <div className="sh-dropdown"
                      onMouseEnter={handleDropdownEnter}
                      onMouseLeave={handleGroupLeave}>
                      {g.items.map(item => (
                        <Link key={item.href} href={item.href}
                          className={`sh-dropdown-item${path === item.href ? ' active' : ''}`}>
                          <span className="sh-dropdown-label">
                            {item.label}
                            {item.badge && alertCount > 0 && (
                              <span className="sh-dd-badge">{alertCount}</span>
                            )}
                          </span>
                          <span className="sh-dropdown-desc">{item.desc}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side */}
          <div className="sh-navbar-right">
            <span className="sh-date">{fecha}</span>
            {usuario && (
              <div className="sh-user-chip">
                <div>
                  <div className="sh-user-name">{usuario.nombre}</div>
                  <div className="sh-user-rol">{usuario.rol}</div>
                </div>
              </div>
            )}
            <button onClick={logout} className="sh-logout">Salir</button>
            <button onClick={recargar} disabled={cargando} className="sh-reload">
              {cargando ? '⏳' : '↺'}
              <span className="sh-reload-label"> Recargar</span>
            </button>
          </div>
        </nav>

        {/* PAGE TITLE BAR */}
        <div className="sh-page-bar">
          <div className="sh-page-title">{title}</div>
          <div className="sh-page-breadcrumb">
            Moditex POS {activeLabel ? `· ${activeLabel}` : ''}
          </div>
        </div>

        {/* CONTENT */}
        <div className="sh-content">
          {children}
        </div>
      </div>

      {/* ── BOTTOM NAV MOBILE ── */}
      <nav className="sh-bottom-nav">
        {bottomNav.map(item => {
          const isMenu   = item.href === '#menu';
          const isActive = !isMenu && path === item.href;
          return isMenu ? (
            <button key="#menu" onClick={() => setDrawerOpen(o => !o)} className="sh-bnav-item">
              <span className="sh-bnav-icon">{item.icon}</span>
              <span className="sh-bnav-label">{item.label}</span>
            </button>
          ) : (
            <Link key={item.href} href={item.href} className={`sh-bnav-item${isActive ? ' active' : ''}`}>
              <span className="sh-bnav-icon">{item.icon}</span>
              <span className="sh-bnav-label">
                {item.label}
                {item.label === 'Alertas' && alertCount > 0 ? ` (${alertCount})` : ''}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
