'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard',  label: '📊 Dashboard'  },
  { href: '/productos',  label: '👕 Productos'   },
  { href: '/inventario', label: '📦 Inventario'  },
  { href: '/clientes',   label: '👤 Clientes'    },
  { href: '/comandas',   label: '📋 Comandas'    },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav style={{
      width: '220px',
      minHeight: '100vh',
      background: '#1a1a2e',
      padding: '1.5rem 0',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 1.5rem 1.5rem', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid #333' }}>
        🧵 MODITEX
      </div>
      {links.map(l => (
        <Link key={l.href} href={l.href} style={{
          display: 'block',
          padding: '0.8rem 1.5rem',
          color: path === l.href ? '#4cc9f0' : '#aaa',
          textDecoration: 'none',
          background: path === l.href ? 'rgba(76,201,240,0.1)' : 'transparent',
          borderLeft: path === l.href ? '3px solid #4cc9f0' : '3px solid transparent',
          fontSize: '0.95rem',
          transition: 'all 0.2s',
        }}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
