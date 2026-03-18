export function generarSku(categoria, modelo, talla) {
  function clean(s, n) {
    return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, n);
  }
  const c    = clean(categoria, 3);
  const m    = clean(modelo, 3);
  const t    = clean(talla, 1) || 'U';
  const rand = Math.floor(100000 + Math.random() * 899999);
  return c + m + t + rand;
}
