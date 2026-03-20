import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const RUTAS_PUBLICAS = ['/api/auth', '/api/me'];
const SECRET = process.env.SESSION_SECRET || 'moditex-dev-secret-CHANGE_IN_PRODUCTION';

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function verificarCookie(value) {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot < 1) return null;
  const b64 = value.slice(0, dot);
  const sig  = value.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(b64).digest('hex');
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.expira && Date.now() > payload.expira) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const esPublica = RUTAS_PUBLICAS.some(r => pathname.startsWith(r));
    if (!esPublica) {
      const sessionCookie = request.cookies.get('moditex_session');
      const payload = verificarCookie(sessionCookie?.value);

      if (!payload) {
        return NextResponse.json(
          { ok: false, error: 'No autorizado. Inicia sesión.' },
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
