'use client';
import { useAuth } from '@/lib/AuthContext';
import { usePathname } from 'next/navigation';

/**
 * Evita montar páginas protegidas hasta saber si hay sesión (reduce pantalla en blanco / parpadeos).
 * Login y catálogo público no se bloquean.
 */
export default function AuthGate({ children }) {
  const { cargando } = useAuth() || {};
  const pathname = usePathname() || '';
  const isPublic =
    pathname === '/login' || pathname.startsWith('/catalogo');

  if (cargando && !isPublic) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg, #ffffff)',
          color: '#666',
          fontFamily: "'DM Mono', monospace",
          fontSize: '12px',
        }}
      >
        Verificando sesión…
      </div>
    );
  }

  return children;
}
