import { NextResponse } from 'next/server';

const RUTAS_PUBLICAS = ['/api/auth', '/api/me'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const esPublica = RUTAS_PUBLICAS.some(ruta => pathname.startsWith(ruta));
    if (!esPublica) {
      const sessionCookie = request.cookies.get('moditex_session');

      if (!sessionCookie?.value) {
        return NextResponse.json(
          { ok: false, error: 'No autorizado. Inicia sesión.' },
          { status: 401 }
        );
      }

      try {
        const parsed = JSON.parse(sessionCookie.value);
        if (parsed.expira && Date.now() > parsed.expira) {
          return NextResponse.json(
            { ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' },
            { status: 401 }
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: 'Sesión inválida.' },
          { status: 401 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
