/**
 * utils/getUsuarioCookie.js
 *
 * Lee el usuario autenticado desde la cookie firmada en cualquier API route.
 * Uso:
 *   import { getUsuarioCookie } from '@/utils/getUsuarioCookie';
 *   const usuario = getUsuarioCookie(request);  // { email, nombre, rol } | null
 */
import { createHmac } from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'moditex-dev-secret-CHANGE_IN_PRODUCTION';

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function getUsuarioCookie(request) {
  try {
    const cookie = request.cookies.get('moditex_session');
    if (!cookie?.value) return null;
    const dot = cookie.value.lastIndexOf('.');
    if (dot < 1) return null;
    const b64 = cookie.value.slice(0, dot);
    const sig  = cookie.value.slice(dot + 1);
    const expected = createHmac('sha256', SECRET).update(b64).digest('hex');
    if (!timingSafeEqual(sig, expected)) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.expira && Date.now() > payload.expira) return null;
    return payload.usuario || null;
  } catch {
    return null;
  }
}
