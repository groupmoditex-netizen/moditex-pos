/**
 * utils/colores.js — Paleta de colores de prendas MODITEX
 *
 * Una sola fuente de verdad para el mapeo de nombres de colores a hex.
 * Para agregar un color nuevo: solo editar este archivo.
 */

export const COLOR_MAP = {
  // ── Blancos ──
  'BLANCO':           '#e8e8e8',
  'BLANCO CREMA':     '#f5f0e0',
  'BLANCO ROTO':      '#ede8d8',
  'CREMA':            '#f5f0e0',
  'MARFIL':           '#ece8d0',

  // ── Negros y grises ──
  'NEGRO':            '#1a1a1a',
  'GRIS':             '#6b7280',
  'GRIS CLARO':       '#b0b7c3',
  'GRIS OSCURO':      '#374151',
  'GRIS MEDIO':       '#8d949e',
  'GRIS PERLA':       '#c8cdd6',
  'GRIS MARENGO':     '#4b5263',
  'PLOMO':            '#8a9099',
  'CARBON':           '#2d2d2d',

  // ── Azules ──
  'AZUL':             '#3b6fd4',
  'AZUL REY':         '#1a4fc4',
  'AZUL MARINO':      '#0f1f5c',
  'AZUL CLARO':       '#7ec8e3',
  'AZUL CIELO':       '#87ceeb',
  'AZUL TURQUESA':    '#00b4b4',
  'AZUL PETROLEO':    '#1a6b7a',
  'AZUL INDIGO':      '#3f51b5',
  'AZUL ELECTRICO':   '#0066ff',
  'CELESTE':          '#87ceeb',
  'CELESTE CLARO':    '#b8e4f5',

  // ── Rojos ──
  'ROJO':             '#d63b3b',
  'ROJO OSCURO':      '#8b1515',
  'ROJO CLARO':       '#f06060',
  'ROJO VINO':        '#8b2035',
  'VINOTINTO':        '#8b2035',
  'VINO':             '#8b2035',
  'BURDEOS':          '#7d1128',
  'GRANATE':          '#6b1028',
  'TINTO':            '#8b2035',

  // ── Rosas y fucsia ──
  'ROSA':             '#f07aa0',
  'ROSADO':           '#f4a0b8',
  'ROSADO CLARO':     '#f9c8d8',
  'ROSADO OSCURO':    '#e06080',
  'ROSA CLARO':       '#f9b8cc',
  'ROSA OSCURO':      '#d45c80',
  'ROSA FUCSIA':      '#e8187c',
  'FUCSIA':           '#e8187c',
  'FUCSIA CLARO':     '#f060a8',
  'SALMON':           '#fa8072',
  'SALMON CLARO':     '#fca090',
  'CORAL':            '#f26e5b',
  'NUDE':             '#e8b89a',
  'PALO DE ROSA':     '#d4a0a8',

  // ── Morados y lilas ──
  'MORADO':           '#7c4fd4',
  'MORADO CLARO':     '#9e74e0',
  'MORADO OSCURO':    '#4a2890',
  'LILA':             '#b48fe8',
  'LILA CLARO':       '#cdb0f0',
  'VIOLETA':          '#8b00ff',
  'VIOLETA CLARO':    '#a060e0',
  'LAVANDA':          '#c8a8e8',
  'LAVANDA CLARO':    '#dcc0f4',
  'MALVA':            '#c080a0',
  'CIRUELA':          '#6a0040',

  // ── Verdes ──
  'VERDE':            '#2d9e4a',
  'VERDE CLARO':      '#5dc878',
  'VERDE OSCURO':     '#1a6b32',
  'VERDE PISTACHO':   '#8db84a',
  'VERDE MENTA':      '#3cb371',
  'VERDE AGUA':       '#40e0d0',
  'VERDE ESMERALDA':  '#009473',
  'VERDE MILITAR':    '#4a6741',
  'VERDE OLIVA':      '#6b7c3b',
  'VERDE LIMON':      '#9acd32',
  'VERDE BOTELLA':    '#234b28',
  'MENTA':            '#98d8b8',
  'TURQUESA':         '#00b4b4',
  'PETROLEO':         '#1a6b7a',

  // ── Amarillos y naranjas ──
  'AMARILLO':         '#f5c842',
  'AMARILLO CLARO':   '#f8e070',
  'AMARILLO OSCURO':  '#d4a000',
  'AMARILLO MOSTAZA': '#c8960c',
  'MOSTAZA':          '#c8960c',
  'DORADO':           '#d4a843',
  'OCRE':             '#c08020',
  'NARANJA':          '#f57c42',
  'NARANJA CLARO':    '#f8a060',
  'NARANJA OSCURO':   '#c85a18',
  'DURAZNO':          '#ffb080',
  'MELON':            '#fda060',
  'MANGO':            '#f8a000',

  // ── Marrones y tierra ──
  'MARRON':           '#7a4a2a',
  'MARRON CLARO':     '#a06040',
  'MARRON OSCURO':    '#4a2a14',
  'CAFE':             '#7a4a2a',
  'CAFE CLARO':       '#a07050',
  'CAFE OSCURO':      '#4a2a18',
  'CHOCOLATE':        '#5c3018',
  'CARAMELO':         '#c08040',
  'TOSTADO':          '#b8864e',
  'CANELA':           '#c87840',
  'TABACO':           '#8b6020',
  'ARENA':            '#d4b896',
  'TIERRA':           '#9b6b3a',

  // ── Beiges y crudos ──
  'BEIGE':            '#d4b896',
  'BEIGE CLARO':      '#ecdfc8',
  'BEIGE OSCURO':     '#b89a6e',
  'BEIGE ROSADO':     '#e0c4b0',
  'CRUDO':            '#e8e0c8',
  'NATURAL':          '#ddd0b8',
  'CAMEL':            '#c49a58',

  // ── Metálicos ──
  'PLATEADO':         '#b0b8c8',
  'PLATA':            '#b0b8c8',
  'DORADO':           '#d4a843',
  'BRONCE':           '#a07030',
  'COBRE':            '#b86030',

  // ── Otros ──
  'MULTICOLOR':       '#9ca3af',
  'ESTAMPADO':        '#9ca3af',
  'TIE DYE':          '#9ca3af',
};

/**
 * Devuelve el hex de un color por nombre.
 * Busca exacto primero, luego por primera palabra.
 * Si no encuentra nada, devuelve gris neutro.
 *
 * @param {string} nombre - Nombre del color (ej: "AZUL MARINO", "Rosado")
 * @returns {string} Color en hex (ej: "#0f1f5c")
 */
export function colorHex(nombre) {
  const k = (nombre || '').toUpperCase().trim();
  return COLOR_MAP[k] || COLOR_MAP[k.split(' ')[0]] || '#9ca3af';
}
