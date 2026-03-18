'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

// Páginas accesibles por rol
export const PERMISOS = {
  admin:    ['/dashboard','/inventario','/productos','/entrada','/salida','/historial','/alertas','/clientes','/comandas','/venta-directa','/etiquetas','/plan-tela','/logs','/usuarios'],
  vendedor: ['/dashboard','/inventario','/historial','/alertas','/clientes','/comandas','/venta-directa'],
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
    {href:'/comandas',   icon:'📋', label:'Comandas'},
    {section:'Reportes'},
    {href:'/alertas',    icon:'⚠', label:'Alertas', badge:true},
    {section:'CRM'},
    {href:'/clientes',   icon:'◎', label:'Clientes'},
    {section:'Herramientas'},
    {href:'/etiquetas',  icon:'▦', label:'Etiquetas'},
    {href:'/plan-tela',  icon:'🧵', label:'Plan de Tela'},
    {section:'Admin'},
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
    {href:'/comandas',      icon:'📋', label:'Comandas'},
    {section:'Reportes'},
    {href:'/alertas',       icon:'⚠', label:'Alertas', badge:true},
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
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Cargar sesión del localStorage
    try {
      const saved = localStorage.getItem('moditex_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verificar que no expiró (24 horas)
        if (parsed.expira && Date.now() < parsed.expira) {
          setUsuario(parsed.usuario);
        } else {
          localStorage.removeItem('moditex_session');
        }
      }
    } catch {}
    setCargando(false);
  }, []);

  // Redirigir si no tiene permiso
  useEffect(() => {
    if (cargando) return;
    if (pathname === '/login') return;
    if (!usuario) { router.replace('/login'); return; }
    const perms = PERMISOS[usuario.rol] || [];
    const tienePermiso = perms.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (!tienePermiso) router.replace('/dashboard');
  }, [usuario, cargando, pathname]);

  function login(userData) {
    setUsuario(userData);
    // Guardar sesión por 7 días
    localStorage.setItem('moditex_session', JSON.stringify({
      usuario: userData,
      expira: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }));
  }

  function logout() {
    setUsuario(null);
    localStorage.removeItem('moditex_session');
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