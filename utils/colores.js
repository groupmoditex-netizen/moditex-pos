/**
 * utils/colores.js — Paleta de colores de prendas MODITEX
 *
 * Una sola fuente de verdad para el mapeo de nombres de colores a hex.
 * Antes estaba copiado en 8 archivos distintos.
 *
 * Para agregar un color nuevo: solo editar este archivo.
 */

export const COLOR_MAP = {
  'BLANCO':     '#d0d0d0',
  'BLANCO CREMA': '#f5f0e0',
  'NEGRO':      '#1a1a1a',
  'GRIS':       '#6b7280',
  'GRIS CLARO': '#b0b7c3',
  'GRIS OSCURO':'#374151',
  'AZUL':       '#3b6fd4',
  'AZUL REY':   '#1a4fc4',
  'AZUL MARINO':'#0f1f5c',
  'AZUL CLARO': '#7ec8e3',
  'CELESTE':    '#7ec8e3',
  'ROJO':       '#d63b3b',
  'ROJO OSCURO':'#8b1515',
  'ROSA':       '#f07aa0',
  'ROSA CLARO': '#f9b8cc',
  'VINOTINTO':  '#8b2035',
  'CORAL':      '#f26e5b',
  'VERDE':      '#2d9e4a',
  'VERDE CLARO':'#5dc878',
  'VERDE OSCURO':'#1a6b32',
  'AMARILLO':   '#f5c842',
  'NARANJA':    '#f57c42',
  'MORADO':     '#7c4fd4',
  'LILA':       '#b48fe8',
  'BEIGE':      '#d4b896',
  'BEIGE CLARO':'#ecdfc8',
  'BEIGE OSCURO':'#b89a6e',
  'MARRON':     '#7a4a2a',
  'TURQUESA':   '#00b4b4',
};

/**
 * Devuelve el hex de un color por nombre.
 * Busca exacto primero, luego por primera palabra.
 * Si no encuentra nada, devuelve gris neutro.
 *
 * @param {string} nombre - Nombre del color (ej: "AZUL MARINO", "Rosa")
 * @returns {string} Color en hex (ej: "#0f1f5c")
 */
export function colorHex(nombre) {
  const k = (nombre || '').toUpperCase().trim();
  return COLOR_MAP[k] || COLOR_MAP[k.split(' ')[0]] || '#9ca3af';
}
