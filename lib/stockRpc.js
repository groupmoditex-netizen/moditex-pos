/**
 * lib/stockRpc.js
 *
 * Wrappers para las funciones RPC atómicas de inventario en Supabase.
 * REGLA: Ninguna ruta de API debe modificar `inventario` directamente.
 *        Todo movimiento de stock pasa por estas funciones.
 *
 * RPCs disponibles en Postgres:
 *   - registrar_movimiento_atomico()  → ENTRADA | SALIDA | AJUSTE
 *   - despachar_comanda()             → descuenta stock de todos los items de una comanda
 */

import { supabase } from '@/lib/supabase-server';

// ─────────────────────────────────────────────────────────────────────────────
// registrarMovimiento
// Wrapper de registrar_movimiento_atomico() en Postgres.
// Usa SELECT ... FOR UPDATE para prevenir race conditions.
//
// tipos soportados:
//   ENTRADA            → incrementa stock_total
//   SALIDA             → decrementa stock_total (valida stock_disponible)
//   AJUSTE             → fija stock_total al valor exacto dado
// ─────────────────────────────────────────────────────────────────────────────
export async function registrarMovimiento({
  sku,
  tipo,
  cantidad,
  concepto     = '',
  contacto     = '',
  referencia   = '',
  tipo_venta   = '',
  precio_venta = 0,
  cliente_id   = '',
  usuario      = 'sistema',
}) {
  const { data, error } = await supabase.rpc('registrar_movimiento_atomico', {
    p_sku:          sku.toUpperCase(),
    p_tipo:         tipo.toUpperCase(),
    p_cantidad:     Number(cantidad),
    p_concepto:     concepto      || '',
    p_contacto:     contacto      || '',
    p_referencia:   referencia    || '',
    p_tipo_venta:   tipo_venta    || '',
    p_precio_venta: parseFloat(precio_venta) || 0,
    p_cliente_id:   cliente_id   || '',
    p_usuario:      usuario       || 'sistema',
  });

  if (error) return { ok: false, error: error.message };

  // La función retorna un SETOF con una fila
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) {
    return { ok: false, error: row?.error_msg || 'Error desconocido en operación de stock' };
  }

  return { ok: true, id: String(row.id), stockActual: row.stock_total };
}

// ─────────────────────────────────────────────────────────────────────────────
// despacharComanda
// Wrapper de despachar_comanda() en Postgres.
// Lee los items de `comandas_items`, descuenta stock atómicamente,
// y actualiza status → 'DESPACHADO'.
// ─────────────────────────────────────────────────────────────────────────────
export async function despacharComanda(comanda_id, usuario = 'sistema') {
  const { data, error } = await supabase.rpc('despachar_comanda', {
    p_comanda_id: comanda_id,
    p_usuario:    usuario,
  });

  if (error) return { ok: false, error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) {
    return { ok: false, error: row?.error_msg || 'Error al despachar comanda' };
  }

  return { ok: true };
}


// ─────────────────────────────────────────────────────────────────────────────
// getStockSku
// Lee el estado de stock de un SKU desde inventario.
// Retorna { stock_total, stock_reservado, stock_disponible } o null.
// ─────────────────────────────────────────────────────────────────────────────
export async function getStockSku(sku) {
  const { data } = await supabase
    .from('inventario')
    .select('sku, stock_total')
    .eq('sku', sku.toUpperCase())
    .single();

  return data || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getStockMultiple
// Lee el estado de stock de múltiples SKUs en una sola query.
// Retorna un Map: { [sku]: { stock_total } }
// ─────────────────────────────────────────────────────────────────────────────
export async function getStockMultiple(skus) {
  const skusUpper = skus.map(s => s.toUpperCase());
  const { data } = await supabase
    .from('inventario')
    .select('sku, stock_total')
    .in('sku', skusUpper);

  const map = {};
  (data || []).forEach(r => { map[r.sku] = r; });
  return map;
}
