import { supabase } from '@/lib/supabase-server';
import { registrarMovimiento } from '@/lib/stockRpc';
import { NextResponse } from 'next/server';

// POST /api/stock/devolver
// Registra una devolución de stock (cliente devuelve una pieza al almacén).
// Antes: modificaba inventario directamente SIN crear movimiento → stock fantasma.
// Ahora: usa registrar_movimiento_atomico('ENTRADA') → trazable y atómico.
export async function POST(request) {
  try {
    const { sku, cantidad, concepto, contacto, referencia, cliente_id } = await request.json();

    if (!sku)      return NextResponse.json({ ok: false, mensaje: 'SKU requerido' }, { status: 400 });
    if (!cantidad || Number(cantidad) < 1)
      return NextResponse.json({ ok: false, mensaje: 'Cantidad mínima: 1' }, { status: 400 });

    // ✅ ENTRADA atómica al almacén — queda registrada en historial de movimientos
    const res = await registrarMovimiento({
      sku,
      tipo:        'ENTRADA',
      cantidad:    Number(cantidad),
      concepto:    concepto   || 'Devolución de cliente',
      contacto:    contacto   || '',
      referencia:  referencia || '',
      cliente_id:  cliente_id || '',
      tipo_venta:  'DEVOLUCION',
      usuario:     'sistema',
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, mensaje: res.error }, { status: 500 });
    }

    // Leer el stock actualizado para devolverlo al cliente
    const { data: inv } = await supabase
      .from('inventario')
      .select('stock_total, stock_disponible, stock_reservado')
      .eq('sku', sku.toUpperCase())
      .single();

    return NextResponse.json({
      ok:           true,
      stockActual:  inv?.stock_total     ?? res.stockActual,
      disponible:   inv?.stock_total     ?? res.stockActual,
    });

  } catch (error) {
    return NextResponse.json({ ok: false, mensaje: error.message }, { status: 500 });
  }
}
