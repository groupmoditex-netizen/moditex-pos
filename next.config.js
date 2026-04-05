/** @type {import('next').NextConfig} */
const nextConfig = {
  // No intentar pre-renderizar nada durante el build
  // Todas las páginas se renderizan en el servidor bajo demanda
  output: 'standalone',

  // Ignorar errores de TypeScript y ESLint durante el build
  typescript:  { ignoreBuildErrors: true },
  eslint:      { ignoreDuringBuilds: true },

  // Suprimir errores de variables de entorno faltantes durante build
  env: {
    NEXT_PUBLIC_SUPABASE_URL:       process.env.NEXT_PUBLIC_SUPABASE_URL       || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  || '',
  },
};

module.exports = nextConfig;
