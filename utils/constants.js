/**
 * constants.js — MODITEX POS
 * Constantes compartidas en todo el sistema.
 */

/**
 * Métodos de pago disponibles.
 */
export const METODOS = [
  { id: 'pago_movil',   label: 'Pago Móvil',          icon: '📱' },
  { id: 'transferencia', label: 'Transferencia',       icon: '🏦' },
  { id: 'efectivo_bs',  label: 'Efectivo Bs',          icon: '💵' },
  { id: 'efectivo_usd', label: 'Efectivo USD',         icon: '💲' },
  { id: 'efectivo_eur', label: 'Efectivo EUR',         icon: '💶' },
  { id: 'zelle',        label: 'Zelle',                icon: '⚡' },
  { id: 'binance',      label: 'Binance / USDT',       icon: '🪙' },
  { id: 'zinli',        label: 'Zinli',                icon: '💳' },
  { id: 'paypal',       label: 'PayPal',               icon: '🅿️' },
  { id: 'otro',         label: 'Otro',                 icon: '💰' },
];

/**
 * Estados de comanda con su configuración visual.
 */
export const CMD_STATUS = {
  pendiente:  { bg: '#fff8e1', color: '#f59e0b', border: '#f59e0b', label: 'Pendiente', icon: '🕐' },
  empacado:   { bg: '#eff6ff', color: '#3b82f6', border: '#3b82f6', label: 'Empacado',  icon: '📦' },
  enviado:    { bg: '#f0fdf4', color: '#22c55e', border: '#22c55e', label: 'Enviado',   icon: '🚀' },
  cancelado:  { bg: '#fff1f2', color: '#ef4444', border: '#ef4444', label: 'Cancelado', icon: '❌' },
  reembolsado:{ bg: '#eef2ff', color: '#4338ca', border: '#6366f1', label: 'Reembolso', icon: '↩️' },
};

/**
 * Flujo de estados de comanda (orden de avance).
 */
export const CMD_FLUJO = ['pendiente', 'empacado', 'enviado'];

/**
 * Estilos inline compartidos para formularios.
 */
export const formStyles = {
  inp: {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    fontFamily: 'Poppins,sans-serif',
    fontSize: '12px',
    color: '#111',
    outline: 'none',
    boxSizing: 'border-box',
  },
  lbl: {
    display: 'block',
    fontFamily: "'DM Mono',monospace",
    fontSize: '8px',
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: '6px',
  },
};
