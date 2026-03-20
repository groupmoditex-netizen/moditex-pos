export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verificarSesion } from '@/app/api/auth/route';

export async function GET(request) {
  try {
    const sessionCookie = request.cookies.get('moditex_session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Sin sesión' }, { status: 401 });
    }

    // verificarSesion lanza si la firma es inválida o el payload está corrupto
    const parsed = verificarSesion(sessionCookie.value);

    if (parsed.expira && Date.now() > parsed.expira) {
      const res = NextResponse.json({ ok: false, error: 'Sesión expirada' }, { status: 401 });
      res.cookies.set('moditex_session', '', { maxAge: 0, path: '/' });
      return res;
    }

    return NextResponse.json({ ok: true, usuario: parsed.usuario });
  } catch (err) {
    // Firma inválida o payload corrupto — limpiar cookie y rechazar
    const res = NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 401 });
    res.cookies.set('moditex_session', '', { maxAge: 0, path: '/' });
    return res;
  }
}
