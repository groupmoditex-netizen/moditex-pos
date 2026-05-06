'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAppData } from '@/lib/AppContext';
import { useAuth, NAV_POR_ROL } from '@/lib/AuthContext';

/* ── Grupos del menú ───────────────────────────────────────────── */
const MENU_GRUPOS = {
  admin: [
    {
      label: 'Principal',
      items: [
        { href:'/dashboard',  label:'Dashboard',  icon:'◈', desc:'Resumen general' },
        { href:'/inventario', label:'Inventario',  icon:'◧', desc:'Stock en tiempo real' },
        { href:'/productos',  label:'Productos',   icon:'🏷️', desc:'Catálogo de prendas' },
      ],
    },
    {
      label: 'Movimientos',
      items: [
        { href:'/entrada',   label:'Nueva Entrada',  icon:'📥', desc:'Registro de compras/producción' },
        { href:'/salida',    label:'Nueva Salida',   icon:'📤', desc:'Descartes y ajustes' },
        { href:'/historial', label:'Historial',      icon:'📋', desc:'Todos los movimientos' },
      ],
    },
    {
      label: 'Ventas',
      items: [
        { href:'/venta-directa', label:'Venta Directa',  icon:'⚡', desc:'Venta con cobro inmediato' },
        { href:'/envio-rapido',  label:'Envío Rápido',   icon:'🚚', desc:'Despacho sin seguimiento' },
        { href:'/comandas',      label:'Comandas',       icon:'◻', desc:'Pedidos y producción' },
        { href:'/exhibicion',    label:'Mostrador',      icon:'🖥️', desc:'Vista de exhibición' },
      ],
    },
    {
      label: 'Reportes',
      items: [
        { href:'/alertas',  label:'Alertas de Stock',  icon:'⚠', desc:'Prendas sin disponibilidad', badge:true },
        { href:'/reportes', label:'Reportes',          icon:'📊', desc:'Ventas y estadísticas' },
        { href:'/clientes', label:'Clientes',          icon:'👥', desc:'CRM y base de clientes' },
      ],
    },
    {
      label: 'Herramientas',
      items: [
        { href:'/etiquetas',  label:'Etiquetas',      icon:'🖨️', desc:'Impresión de códigos' },
        { href:'/ajustes',    label:'Ajustes',        icon:'⚙️', desc:'Atajos y personalización' },
        { href:'/plan-tela',  label:'Plan de Tela',   icon:'🧵', desc:'Consumo de materiales' },
        { href:'/tasa',       label:'Tasa Cambiaria', icon:'💱', desc:'Bs/€ — historial auditado' },
        { href:'/usuarios',   label:'Usuarios',       icon:'👤', desc:'Gestión de accesos' },
        { href:'/logs',       label:'Logs del Sistema', icon:'📝', desc:'Auditoría de acciones' },
        { href:'/catalogo-admin', label:'Catálogo Web', icon:'🌐', desc:'Gestionar tienda online' },
        { href:'/promos',         label:'Sets & Combos', icon:'🎁', desc:'Promos y combos del catálogo' },
        { href:'/catalogo',       label:'Ver Catálogo', icon:'👁️', desc:'Vista del cliente' },
      ],
    },
  ],
  vendedor: [
    {
      label: 'Principal',
      items: [
        { href:'/dashboard',  label:'Dashboard',  icon:'◈', desc:'Resumen general' },
        { href:'/inventario', label:'Inventario',  icon:'◧', desc:'Stock en tiempo real' },
        { href:'/historial',  label:'Historial',   icon:'📋', desc:'Movimientos' },
      ],
    },
    {
      label: 'Ventas',
      items: [
        { href:'/venta-directa', label:'Venta Directa',  icon:'⚡', desc:'Venta con cobro inmediato' },
        { href:'/envio-rapido',  label:'Envío Rápido',   icon:'🚚', desc:'Despacho sin seguimiento' },
        { href:'/comandas',      label:'Comandas',       icon:'◻', desc:'Pedidos y producción' },
        { href:'/exhibicion',    label:'Mostrador',      icon:'🖥️', desc:'Vista de exhibición' },
      ],
    },
    {
      label: 'Reportes',
      items: [
        { href:'/alertas',  label:'Alertas',   icon:'⚠', desc:'Prendas sin stock', badge:true },
        { href:'/reportes', label:'Reportes',  icon:'📊', desc:'Estadísticas' },
        { href:'/clientes', label:'Clientes',  icon:'👥', desc:'CRM' },
      ],
    },
  ],
  viewer: [
    {
      label: 'Principal',
      items: [
        { href:'/dashboard',  label:'Dashboard',  icon:'◈', desc:'Resumen' },
        { href:'/inventario', label:'Inventario',  icon:'◧', desc:'Stock' },
        { href:'/historial',  label:'Historial',   icon:'📋', desc:'Movimientos' },
        { href:'/alertas',    label:'Alertas',     icon:'⚠', desc:'Stock crítico', badge:true },
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
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    setFecha(new Date().toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short', year:'numeric' }));
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [path]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);
  
  // ⌨️ ATAJOS DE TECLADO GLOBALES
  useEffect(() => {
    function handleKeyDown(e) {
      if (!usuario) return;
      const active = document.activeElement;
      const isInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable;
      if (isInput) return;

      const hasPrefs = usuario.preferencias && Object.keys(usuario.preferencias).length > 0;
      const prefs = hasPrefs ? usuario.preferencias : {
        c: '/comandas?nueva=t',
        p: '/productos',
        i: '/inventario',
        v: '/venta-directa',
        d: '/dashboard',
        e: '/entrada',
        s: '/salida'
      };

      if (!e.key) return;
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      const key = e.key.toLowerCase();
      if (prefs[key]) {
        e.preventDefault();
        router.push(prefs[key]);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [usuario, router]);

  const alertCount = data ? data.productos.filter(p => p.disponible <= 0).length : 0;
  const grupos = MENU_GRUPOS[usuario?.rol] || MENU_GRUPOS.viewer;
  const bottomNav = BOTTOM_NAV[usuario?.rol] || BOTTOM_NAV.viewer;

  const activeLabel = grupos.flatMap(g => g.items).find(i => i.href === path)?.label || '';

  return (
    <div className="shell-root">
      <style dangerouslySetInnerHTML={{__html:`
        /* ══ SHELL v3 — Collapsible Sidebar ══════════════════════════════ */
        
        .shell-root {
          display: flex;
          min-height: 100vh;
          background: #fdfdfd;
        }

        /* SIDEBAR (Desktop) */
        .sh-sidebar {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          width: 68px; /* Collapsed width */
          background: #0a0a0a;
          border-right: 1px solid #1a1a1a;
          z-index: 500;
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
          overflow: hidden;
        }
        .sh-sidebar:hover {
          width: 260px; /* Expanded width */
          box-shadow: 4px 0 24px rgba(0,0,0,0.5);
        }

        /* Sidebar Logo */
        .sh-sb-logo-area {
          height: 64px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          border-bottom: 1px solid #1a1a1a;
          flex-shrink: 0;
          min-width: 260px; /* Keep layout steady during transition */
        }
        .sh-sb-logo-icon {
          width: 40px; height: 40px; object-fit: contain; flex-shrink: 0;
        }
        .sh-sb-logo-text {
          margin-left: 12px;
          display: flex; flex-direction: column; line-height: 1.1;
          opacity: 0; transition: opacity 0.2s; white-space: nowrap;
        }
        .sh-sidebar:hover .sh-sb-logo-text { opacity: 1; transition-delay: 0.1s; }
        .sh-sb-moditex { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 900; color: #fff; letter-spacing: .05em; }
        .sh-sb-group { font-family: 'DM Mono', monospace; font-size: 7px; color: #c9a84c; letter-spacing: .35em; text-transform: uppercase; margin-top: 2px; }

        /* Sidebar Content Scroll */
        .sh-sb-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px 0;
          min-width: 260px;
        }
        /* Scrollbar styles for sidebar */
        .sh-sb-content::-webkit-scrollbar { width: 8px; }
        .sh-sb-content::-webkit-scrollbar-track { background: transparent; }
        .sh-sb-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 8px; border: 2px solid #0a0a0a; }
        .sh-sb-content::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }

        /* Sidebar Sections */
        .sh-sb-section { margin-bottom: 16px; }
        .sh-sb-section-title {
          font-family: 'DM Mono', monospace; font-size: 8px; font-weight: 600;
          color: #555; letter-spacing: .15em; text-transform: uppercase;
          padding: 0 24px; margin-bottom: 8px;
          opacity: 0; transition: opacity 0.2s; white-space: nowrap;
        }
        .sh-sidebar:hover .sh-sb-section-title { opacity: 1; }
        
        /* Sidebar Divider for collapsed state */
        .sh-sb-divider {
          height: 1px; background: #1a1a1a; margin: 8px 20px 16px;
          opacity: 1; transition: opacity 0.2s;
        }
        .sh-sidebar:hover .sh-sb-divider { opacity: 0; display: none; }

        /* Sidebar Links */
        .sh-sb-link {
          display: flex; align-items: center;
          height: 44px; padding: 0 22px;
          text-decoration: none; color: #888;
          transition: all 0.2s;
          position: relative;
        }
        .sh-sb-link:hover { color: #fff; background: rgba(255,255,255,0.03); }
        .sh-sb-link.active { color: #c9a84c; background: rgba(201,168,76,0.05); }
        .sh-sb-link.active::before {
          content: ''; position: absolute; left: 0; top: 8px; bottom: 8px;
          width: 3px; background: #c9a84c; border-radius: 0 4px 4px 0;
        }
        
        .sh-sb-icon {
          font-size: 18px; width: 24px; text-align: center; flex-shrink: 0;
          filter: grayscale(1) opacity(0.8); transition: filter 0.2s;
        }
        .sh-sb-link:hover .sh-sb-icon { filter: grayscale(0) opacity(1); }
        .sh-sb-link.active .sh-sb-icon { filter: grayscale(0) opacity(1); }

        .sh-sb-label-area {
          margin-left: 16px; display: flex; align-items: center; justify-content: space-between; flex: 1;
          opacity: 0; transition: opacity 0.2s; white-space: nowrap; overflow: hidden;
        }
        .sh-sidebar:hover .sh-sb-label-area { opacity: 1; transition-delay: 0.05s; }
        .sh-sb-label { font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 500; }
        .sh-sb-badge { background: #c9a84c; color: #000; font-family: 'DM Mono', monospace; font-size: 9px; padding: 2px 6px; font-weight: 800; border-radius: 10px; }
        
        /* Collapsed Badge Indicator */
        .sh-sb-dot {
          position: absolute; left: 38px; top: 12px;
          width: 6px; height: 6px; background: #c9a84c; border-radius: 50%;
          opacity: 1; transition: opacity 0.2s;
        }
        .sh-sidebar:hover .sh-sb-dot { opacity: 0; }

        /* Sidebar Footer (User info) */
        .sh-sb-footer {
          border-top: 1px solid #1a1a1a;
          padding: 16px;
          min-width: 260px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .sh-sb-user { display: flex; align-items: center; gap: 12px; opacity: 0; transition: opacity 0.2s; white-space: nowrap; overflow: hidden; }
        .sh-sidebar:hover .sh-sb-user { opacity: 1; transition-delay: 0.1s; }
        .sh-sb-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #333; flex-shrink: 0; }
        .sh-sb-user-info { display: flex; flex-direction: column; }
        .sh-sb-user-name { font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600; color: #ddd; }
        .sh-sb-user-rol { font-family: 'DM Mono', monospace; font-size: 8px; color: #c9a84c; text-transform: uppercase; letter-spacing: .08em; }
        .sh-sb-logout {
          background: none; border: none; color: #666; cursor: pointer; padding: 8px; font-size: 14px;
          opacity: 0; transition: opacity 0.2s, color 0.2s;
        }
        .sh-sb-logout:hover { color: #fff; }
        .sh-sidebar:hover .sh-sb-logout { opacity: 1; transition-delay: 0.1s; }

        /* MAIN WRAPPER */
        .sh-main-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: 68px; /* Offset for collapsed sidebar */
          min-width: 0; /* Prevent horizontal overflow */
          transition: margin-left 0.3s cubic-bezier(0.2, 0, 0, 1);
        }

        /* Top navbar (Slimmer, contextual) */
        .sh-navbar {
          position: sticky; top: 0; z-index: 400;
          background: rgba(253, 253, 253, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px;
        }

        /* Left side of navbar (Title) */
        .sh-nav-left { display: flex; align-items: center; gap: 16px; }
        .sh-hamburger { display: none; background: none; border: 1px solid #ddd; width: 36px; height: 36px; border-radius: 8px; font-size: 18px; cursor: pointer; align-items: center; justify-content: center; }
        .sh-page-title {
          font-family: 'Poppins', sans-serif;
          font-size: 18px; font-weight: 900; color: #111;
          display: flex; align-items: center; gap: 12px;
        }
        .sh-page-breadcrumb {
          font-family: 'DM Mono', monospace; font-size: 10px;
          color: #888; letter-spacing: .15em; text-transform: uppercase;
          font-weight: 600; padding-left: 12px; border-left: 1px solid #eee;
        }

        /* Right side of navbar */
        .sh-nav-right { display: flex; align-items: center; gap: 16px; }
        .sh-date { font-family: 'DM Mono', monospace; font-size: 10px; color: #777; letter-spacing: .05em; font-weight: 600; }
        .sh-reload {
          padding: 8px 12px; background: #fff;
          border: 1px solid #ddd; border-radius: 8px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600;
          color: #444; transition: all .15s;
          display: flex; align-items: center; gap: 6px;
        }
        .sh-reload:hover { border-color: #aaa; color: #111; }

        /* Content */
        .sh-content { padding: 24px 32px; flex: 1; }

        /* ══ MOBILE DRAWER ══════════════════════════════════════════ */
        /* Drawer overlay */
        .sh-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.65); z-index: 600; }
        .sh-overlay.open { display: block; }

        /* Drawer panel */
        .sh-drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(80vw, 300px);
          background: #0a0a0a;
          border-right: 1px solid #1f1f1f;
          z-index: 650;
          display: flex; flex-direction: column;
          transform: translateX(-110%);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
          overflow-y: auto;
        }
        .sh-drawer.open { transform: translateX(0); box-shadow: 4px 0 32px rgba(0,0,0,.6); }

        .sh-drawer-header { padding: 20px 18px 16px; border-bottom: 1px solid #1f1f1f; display: flex; align-items: center; justify-content: space-between; }
        .sh-drawer-close { width: 30px; height: 30px; background: none; border: 1px solid #333; cursor: pointer; color: #666; font-size: 12px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
        .sh-drawer-section { font-family: 'DM Mono', monospace; font-size: 8px; color: #555; letter-spacing: .2em; text-transform: uppercase; padding: 16px 18px 8px; }
        .sh-drawer-link {
          display: flex; align-items: center; gap: 12px; padding: 12px 18px; text-decoration: none;
          font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 500; color: #888;
          border-left: 2px solid transparent; transition: all .12s;
        }
        .sh-drawer-link:hover { color: #fff; background: rgba(255,255,255,0.03); }
        .sh-drawer-link.active { color: #c9a84c; border-left-color: #c9a84c; background: rgba(201,168,76,0.05); }
        .sh-drawer-footer { margin-top: auto; padding: 20px 18px; border-top: 1px solid #1f1f1f; }

        /* Bottom nav */
        .sh-bottom-nav { display: none; }
        .sh-bnav-item {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          padding: 8px 0 6px; background: none; border: none; cursor: pointer; text-decoration: none; color: inherit; position: relative;
        }
        .sh-bnav-icon { font-size: 20px; line-height: 1; opacity: .65; transition: opacity 0.2s; }
        .sh-bnav-label { font-family: 'DM Mono', monospace; font-size: 9px; color: #888; letter-spacing:.04em; transition: color 0.2s; }
        .sh-bnav-item.active .sh-bnav-icon { opacity: 1; color: #c9a84c; }
        .sh-bnav-item.active .sh-bnav-label { color: #c9a84c; font-weight: 700; }
        .sh-bnav-item.active::before { content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 3px; background: #c9a84c; border-radius: 0 0 4px 4px; }

        /* ══ RESPONSIVE ═════════════════════════════════════════════ */
        @media (max-width: 900px) {
          .sh-sidebar { display: none; }
          .sh-main-wrapper { margin-left: 0; }
          .sh-navbar { padding: 0 16px; }
          .sh-hamburger { display: flex; }
          .sh-page-breadcrumb { display: none; }
          .sh-date { display: none; }
          .sh-reload .sh-reload-label { display: none; }
          .sh-content { padding: 16px 16px 24px; }
          .sh-bottom-nav { display: none !important; }
        }
      `}}/>

      {/* ── SIDEBAR DESKTOP ── */}
      <nav className="sh-sidebar" onMouseEnter={() => setSidebarHover(true)} onMouseLeave={() => setSidebarHover(false)}>
        <div className="sh-sb-logo-area">
          <img src="https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/ISOTIPO%20PNG.png" alt="Moditex" className="sh-sb-logo-icon"/>
          <div className="sh-sb-logo-text">
            <div className="sh-sb-moditex">MODITEX</div>
            <div className="sh-sb-group">GROUP</div>
          </div>
        </div>

        <div className="sh-sb-content">
          {grupos.map((g, gi) => (
            <div key={g.label} className="sh-sb-section">
              <div className="sh-sb-section-title">{g.label}</div>
              {gi > 0 && <div className="sh-sb-divider" />}
              {g.items.map(item => {
                const isActive = path === item.href;
                const hasAlert = item.badge && alertCount > 0;
                return (
                  <Link key={item.href} href={item.href} className={`sh-sb-link${isActive ? ' active' : ''}`} title={!sidebarHover ? item.label : ''}>
                    <span className="sh-sb-icon">{item.icon}</span>
                    {hasAlert && <span className="sh-sb-dot" />}
                    <div className="sh-sb-label-area">
                      <span className="sh-sb-label">{item.label}</span>
                      {hasAlert && <span className="sh-sb-badge">{alertCount}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {usuario && (
          <div className="sh-sb-footer">
            <img src={`https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/avatars/${usuario.avatar || '1'}.png`} alt="Avatar" className="sh-sb-avatar"/>
            <div className="sh-sb-user">
              <div className="sh-sb-user-info">
                <span className="sh-sb-user-name">{usuario.nombre}</span>
                <span className="sh-sb-user-rol">{usuario.rol}</span>
              </div>
              <button onClick={logout} className="sh-sb-logout" title="Cerrar sesión">🚪</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── MAIN WRAPPER ── */}
      <div className="sh-main-wrapper">
        {/* TOP NAVBAR */}
        <header className="sh-navbar">
          <div className="sh-nav-left">
            <button className="sh-hamburger" onClick={() => setDrawerOpen(true)}>☰</button>
            <div className="sh-page-title">
              {title}
              {activeLabel && <span className="sh-page-breadcrumb">{activeLabel}</span>}
            </div>
          </div>
          
          <div className="sh-nav-right">
            <span className="sh-date">{fecha}</span>
            <button onClick={recargar} disabled={cargando} className="sh-reload">
              {cargando ? '⏳' : '↺'}
              <span className="sh-reload-label"> Recargar</span>
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="sh-content">
          {children}
        </main>
      </div>

      {/* ── OVERLAY DRAWER (Mobile) ── */}
      <div className={`sh-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)}/>
      <div className={`sh-drawer${drawerOpen ? ' open' : ''}`}>
        <div className="sh-drawer-header">
          <img src="https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/MODITEX%20GROUP/ISOTIPO%20PNG.png" alt="Moditex Group" style={{ height:'36px', width:'36px', objectFit:'contain' }} />
          <button className="sh-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        {grupos.map(g => (
          <div key={g.label}>
            <div className="sh-drawer-section">{g.label}</div>
            {g.items.map(item => {
              const isActive = path === item.href;
              const hasAlert = item.badge && alertCount > 0;
              return (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} className={`sh-drawer-link${isActive ? ' active' : ''}`}>
                  <span style={{ fontSize:'18px', filter:'grayscale(1)', opacity:0.8 }}>{item.icon}</span>
                  {item.label}
                  {hasAlert && <span style={{ marginLeft:'auto', background:'#c9a84c', color:'#000', fontFamily:"'DM Mono',monospace", fontSize:'10px', padding:'2px 6px', fontWeight:800, borderRadius:'8px' }}>{alertCount}</span>}
                </Link>
              );
            })}
          </div>
        ))}
        <div className="sh-drawer-footer">
          {usuario && (
            <div style={{ marginBottom:'16px', display:'flex', alignItems:'center', gap:'12px' }}>
              <img src={`https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/avatars/${usuario.avatar || '1'}.png`} alt="avatar" style={{width:'36px',height:'36px',borderRadius:'50%',objectFit:'cover',border:'1px solid #333'}}/>
              <div>
                <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:'14px', fontWeight:600, color:'#ddd' }}>{usuario.nombre}</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'9px', color:'#c9a84c', textTransform:'uppercase', letterSpacing:'.1em', marginTop:'2px' }}>{usuario.rol}</div>
              </div>
            </div>
          )}
          <button onClick={logout} style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,0.05)', border:'1px solid #333', borderRadius:'8px', cursor:'pointer', fontFamily:"'DM Mono',monospace", fontSize:'11px', color:'#aaa', letterSpacing:'.05em' }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* ── BOTTOM NAV (Mobile) ── */}
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