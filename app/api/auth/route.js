export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { username, email, pin } = await request.json();
    const identifier = (username || email || '').trim().toLowerCase();
    if (!identifier || !pin) {
      return NextResponse.json({ ok: false, error: 'Usuario y PIN requeridos' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('email, nombre, rol, activo, pin')
      .eq('email', identifier)
      .single();

    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 401 });
    }
    if (!user.activo) {
      return NextResponse.json({ ok: false, error: 'Usuario inactivo. Contacta al administrador' }, { status: 401 });
    }

    const pinValido = await bcrypt.compare(pin.trim(), user.pin);
    if (!pinValido) {
      return NextResponse.json({ ok: false, error: 'PIN incorrecto' }, { status: 401 });
    }

    try { await supabase.from('usuarios').update({ ultimo_acceso: new Date().toISOString() }).eq('email', user.email); } catch (_) {}
    try { await supabase.from('logs').insert({ usuario: user.email, accion: 'LOGIN', detalle: user.rol, resultado: 'OK' }); } catch (_) {}

    const userData = { email: user.email, nombre: user.nombre, rol: user.rol };

    const sesionJSON = JSON.stringify({
      usuario: userData,
      expira: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const { createHmac } = await import('crypto');
    const SECRET = process.env.SESSION_SECRET || 'moditex-dev-secret-CHANGE_IN_PRODUCTION';
    const b64 = Buffer.from(sesionJSON).toString('base64url');
    const sig = createHmac('sha256', SECRET).update(b64).digest('hex');
    const sesion = `${b64}.${sig}`;

    const response = NextResponse.json({ ok: true, usuario: userData });

    response.cookies.set('moditex_session', sesion, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('moditex_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
