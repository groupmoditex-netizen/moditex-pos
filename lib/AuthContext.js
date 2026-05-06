'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

// Páginas accesibles por rol
export const PERMISOS = {
  admin:    ['/dashboard','/inventario','/productos','/entrada','/salida','/historial','/alertas','/clientes','/comandas','/venta-directa','/etiquetas','/plan-tela','/tasa','/logs','/usuarios','/reportes','/exhibicion','/envio-rapido','/catalogo-admin','/promos','/ajustes'],
  vendedor: ['/dashboard','/inventario','/historial','/alertas','/clientes','/comandas','/venta-directa','/tasa','/reportes','/exhibicion','/envio-rapido','/ajustes'],
  viewer:   ['/dashboard','/inventario','/historial','/alertas'],
};

export const NAV_POR_ROL = {
  admin: [
    {section:'Principal'},
    {href:'/dashboard',  icon:'⬡', label:'Dashboard'},
    {href:'/inventario', icon:'▦', label:'Inventario'},
    {href:'/productos',  icon:'👕', label:'Productos'},
    {section:'Movimientos'},
    {href:'/entrada',    icon:'↑', label:'Nueva Entrada'},
    {href:'/salida',     icon:'↓', label:'Nueva Salida'},
    {href:'/historial',  icon:'≡', label:'Historial'},
    {section:'Ventas'},
    {href:'/venta-directa',icon:'⚡',label:'Venta Directa'},
    {href:'/envio-rapido', icon:'🚀',label:'Envío Rápido'},
    {href:'/comandas',   icon:'📋', label:'Comandas'},
    {href:'/exhibicion', icon:'👗', label:'Mostrador'},
    {section:'Reportes'},
    {href:'/alertas',    icon:'⚠', label:'Alertas', badge:true},
    {href:'/reportes',   icon:'📊', label:'Reportes'},
    {section:'CRM'},
    {href:'/clientes',   icon:'◎', label:'Clientes'},
    {section:'Herramientas'},
    {href:'/etiquetas',  icon:'▦', label:'Etiquetas'},
    {href:'/plan-tela',  icon:'🧵', label:'Plan de Tela'},
    {href:'/ajustes',    icon:'⚙️', label:'Ajustes'},
    {section:'Admin'},
    {href:'/catalogo-admin', icon:'🌐', label:'Catálogo Web'},
    {href:'/promos',         icon:'✨', label:'Sets & Combos'},
    {href:'/usuarios',   icon:'👤', label:'Usuarios'},
    {href:'/logs',       icon:'📋', label:'Logs'},
  ],
  vendedor: [
    {section:'Principal'},
    {href:'/dashboard',     icon:'⬡', label:'Dashboard'},
    {href:'/inventario',    icon:'▦', label:'Inventario'},
    {href:'/historial',     icon:'≡', label:'Historial'},
    {section:'Ventas'},
    {href:'/venta-directa', icon:'⚡', label:'Venta Directa'},
    {href:'/envio-rapido',  icon:'🚀', label:'Envío Rápido'},
    {href:'/comandas',      icon:'📋', label:'Comandas'},
    {href:'/exhibicion',    icon:'👗', label:'Mostrador'},
    {section:'Reportes'},
    {href:'/alertas',       icon:'⚠', label:'Alertas', badge:true},
    {href:'/reportes',      icon:'📊', label:'Reportes'},
    {section:'CRM'},
    {href:'/clientes',      icon:'◎', label:'Clientes'},
  ],
  viewer: [
    {section:'Principal'},
    {href:'/dashboard',  icon:'⬡', label:'Dashboard'},
    {href:'/inventario', icon:'▦', label:'Inventario'},
    {href:'/historial',  icon:'≡', label:'Historial'},
    {section:'Reportes'},
    {href:'/alertas',    icon:'⚠', label:'Alertas', badge:true},
  ],
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null);
  const [cargando, setCargando] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Verificar sesión activa llamando a /api/me
    // La cookie HttpOnly se envía automáticamente — el servidor la valida
    fetch('/api/me')
      .then(r => r.json())
      .then(res => {
        if (res.ok && res.usuario) {
          setUsuario(res.usuario);
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  // Redirigir si no tiene permiso
  useEffect(() => {
    if (cargando) return;
    if (pathname === '/login') return;
    if (pathname.startsWith('/catalogo')) return; // Catálogo público
    if (pathname.startsWith('/tickets-blancos')) return; // Etiquetas en blanco
    if (!usuario) { router.replace('/login'); return; }
    const perms = PERMISOS[usuario.rol] || [];
    const tienePermiso = perms.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (!tienePermiso) router.replace('/dashboard');
  }, [usuario, cargando, pathname]);

  async function login(userData) {
    setUsuario(userData);
  }

  async function logout() {
    // Borrar la cookie desde el servidor
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch (_) {}
    setUsuario(null);
    router.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}