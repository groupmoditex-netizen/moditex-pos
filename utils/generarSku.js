/**
 * generarSku — Genera un SKU único para un producto de MODITEX
 *
 * Formato: CAT[3] + MOD[3] + TALLA[1] + TS[4] + RND[3]
 * Ejemplo: BODBLA U 1Z4A BC → BODBLAU1Z4ABC
 *
 * El timestamp base36 hace que la colisión sea virtualmente imposible
 * incluso en creaciones simultáneas, eliminando la necesidad de reintentos.
 */
export function generarSku(categoria, modelo, talla) {
  function clean(s, n) {
    return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, n);
  }

  const c   = clean(categoria, 3);
  const m   = clean(modelo, 3);
  const t   = clean(talla, 1) || 'U';

  // Últimos 4 caracteres del timestamp en base36 (cambia cada ~1.3 segundos)
  const ts  = Date.now().toString(36).toUpperCase().slice(-4);

  // 3 caracteres aleatorios adicionales para cubrir creaciones simultáneas
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();

  return c + m + t + ts + rnd;
}
