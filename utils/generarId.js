export function generarId(prefix) {
  const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand  = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${fecha}-${rand}`;
}
