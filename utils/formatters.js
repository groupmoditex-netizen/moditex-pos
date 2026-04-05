/**
 * formatters.js — MODITEX POS
 * Funciones de formato compartidas en todo el sistema.
 */

/**
 * Formatea un número con separador de miles y decimales.
 * @param {number|string} n - Número a formatear
 * @param {number} decimals - Cantidad de decimales (default: 2)
 * @returns {string} Número formateado (ej: "1,234.56")
 */
export function fmtNum(n, decimals = 2) {
  const num = parseFloat(n) || 0;
  return num.toLocaleString('en', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parsea la propiedad "productos" de una comanda.
 * Puede ser un string JSON o ya un array.
 * @param {object} cmd - Objeto comanda con propiedad `productos`
 * @returns {Array} Array de productos
 */
export function parseProd(cmd) {
  let p = cmd?.productos;
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch { p = []; }
  }
  return Array.isArray(p) ? p : [];
}
