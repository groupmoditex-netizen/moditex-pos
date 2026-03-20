export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';

// ── Cookie signing helpers ────────────────────────────────────────────────────
// La cookie se firma con HMAC-SHA256 para que nadie pueda modificar el rol u
// otros campos sin que el servidor lo detecte.
//
// Formato: base64(payload) + "." + hmac-hex
//
// IMPORTANTE: Define SESSION_SECRET en tu .env (mínimo 32 caracteres aleatorios).
// Sin esta variable en producción, la cookie NO es segura — es solo "mejor que nada".

const SECRET = process.env.SESSION_SECRET || 'moditex-dev-secret-CHANGE_IN_PRODUCTION';

export function firmarSesion(payload) {
  const str = JSON.stringify(payload);
  const b64 = Buffer.from(str).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(b64).digest('hex');
  return `${b64}.${sig}`;
}

export function verificarSesion(cookie) {
  if (!cookie) throw new Error('Sin cookie');
  const dot = cookie.lastIndexOf('.');
  if (dot < 1) throw new Error('Formato inválido');
  const b64 = cookie.slice(0, dot);
  const sig  = cookie.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(b64).digest('hex');
  // Comparación en tiempo constante — evita timing attacks
  if (!timingSafeEqual(sig, expected)) throw new Error('Firma inválida');
  return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
}

// Comparación en tiempo constante para strings hex (mismo largo siempre)
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Cookie options ────────────────────────────────────────────────────────────
function cookieOpts(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
  };
}

// ── POST /api/auth — Login ────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { username, email, pin } = await request.json();
    const identifier = (username || email || '').trim().toLowerCase();
    if (!identifier || !pin) {
      return NextResponse.json({ ok: false, error: 'Usuario y PIN requeridos' }, { status: 400 });
    }

    // Buscar por email O por username (campo nombre_usuario si existe, o email)
    // Primero intenta email exacto, luego username
    let userData = null;

    const byEmail = await supabase
      .from('usuarios')
      .select('email, nombre, rol, activo, pin')
      .eq('email', identifier)
      .single();

    if (byEmail.data) {
      userData = byEmail.data;
    } else {
      // Buscar por campo username si existe en la tabla
      const byUsername = await supabase
        .from('usuarios')
        .select('email, nombre, rol, activo, pin')
        .eq('username', identifier)
        .single();
      if (byUsername.data) userData = byUsername.data;
    }

    if (!userData) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 401 });
    }
    if (!userData.activo) {
      return NextResponse.json({ ok: false, error: 'Usuario inactivo. Contacta al administrador' }, { status: 401 });
    }

    const pinValido = await bcrypt.compare(pin.trim(), userData.pin);
    if (!pinValido) {
      return NextResponse.json({ ok: false, error: 'PIN incorrecto' }, { status: 401 });
    }

    // Actualizar último acceso y log (fire-and-forget)
    supabase.from('usuarios').update({ ultimo_acceso: new Date().toISOString() }).eq('email', userData.email).then(() => {});
    supabase.from('logs').insert({ usuario: userData.email, accion: 'LOGIN', detalle: userData.rol, resultado: 'OK' }).then(() => {});

    const sesionPayload = {
      usuario: { email: userData.email, nombre: userData.nombre, rol: userData.rol },
      expira: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    const cookieValue = firmarSesion(sesionPayload);

    const response = NextResponse.json({ ok: true, usuario: sesionPayload.usuario });
    response.cookies.set('moditex_session', cookieValue, cookieOpts());
    return response;

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── DELETE /api/auth — Logout ─────────────────────────────────────────────────
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('moditex_session', '', cookieOpts(0));
  return response;
}
