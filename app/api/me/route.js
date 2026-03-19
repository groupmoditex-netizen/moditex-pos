export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Leer la cookie HttpOnly (no accesible desde JS en el cliente)
    const sessionCookie = request.cookies.get('moditex_session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Sin sesión' }, { status: 401 });
    }

    const parsed = JSON.parse(sessionCookie.value);

    // Verificar expiración
    if (parsed.expira && Date.now() > parsed.expira) {
      const res = NextResponse.json({ ok: false, error: 'Sesión expirada' }, { status: 401 });
      // Limpiar cookie expirada
      res.cookies.set('moditex_session', '', { maxAge: 0, path: '/' });
      return res;
    }

    return NextResponse.json({ ok: true, usuario: parsed.usuario });
  } catch {
    return NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 401 });
  }
}
