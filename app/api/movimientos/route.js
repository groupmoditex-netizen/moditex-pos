export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { registrarMovimiento } from '@/lib/stockRpc';
import { NextResponse } from 'next/server';

// ── GET — listar movimientos con filtros y paginación ────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const sku   = searchParams.get('sku');
    const tipo  = searchParams.get('tipo');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '25'));
    const offset = (page - 1) * limit;

    let q = supabase
      .from('movimientos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (sku)   q = q.eq('sku',  sku.toUpperCase());
    if (tipo)  q = q.eq('tipo', tipo.toUpperCase());
    if (desde) q = q.gte('fecha', desde);
    if (hasta) q = q.lte('fecha', hasta);

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      data:  data || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── POST — registrar uno o varios movimientos (atómico vía RPC) ──────────────
export async function POST(request) {
  try {
    const body  = await request.json();
    const items = Array.isArray(body) ? body : [body];
    if (!items.length)
      return NextResponse.json({ ok: false, error: 'Sin movimientos' }, { status: 400 });

    // Validar estructura
    for (const d of items) {
      if (!d.sku)
        return NextResponse.json({ ok: false, error: 'SKU requerido' }, { status: 400 });
      const t = (d.tipo || '').toUpperCase();
      if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(t))
        return NextResponse.json({ ok: false, error: `Tipo inválido: ${d.tipo}` }, { status: 400 });
      if (!d.cantidad || Number(d.cantidad) < 1)
        return NextResponse.json({ ok: false, error: 'Cantidad mínima: 1' }, { status: 400 });
    }

    // Ejecutar cada movimiento vía RPC atómica (FOR UPDATE en Postgres)
    const resultados = [];
    for (const d of items) {
      const res = await registrarMovimiento({
        sku:          d.sku,
        tipo:         d.tipo,
        cantidad:     d.cantidad,
        concepto:     d.concepto      || '',
        contacto:     d.contacto      || '',
        referencia:   d.referencia    || '',
        tipo_venta:   d.tipo_venta    || '',
        precio_venta: d.precio_venta  || 0,
        cliente_id:   d.cliente_id    || '',
        usuario:      'sistema',
      });

      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
      }
      resultados.push(res);
    }

    return NextResponse.json({
      ok:    true,
      ids:   resultados.map(r => r.id),
      count: resultados.length,
    });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── PUT — editar un movimiento existente ────────────────────────────────────
// Editar movimientos históricos es una operación admin poco frecuente.
// Estrategia: actualizar el registro, luego hacer un AJUSTE atómico
// para sincronizar el stock real del SKU.
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, sku: nuevoSku, cantidad, concepto, fecha, tipo } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
    if (cantidad !== undefined && Number(cantidad) < 1)
      return NextResponse.json({ ok: false, error: 'Cantidad mínima: 1' }, { status: 400 });

    // Leer el movimiento original
    const { data: movAntes, error: errLeer } = await supabase
      .from('movimientos').select('sku, tipo, cantidad').eq('id', id).single();
    if (errLeer || !movAntes)
      return NextResponse.json({ ok: false, error: 'Movimiento no encontrado' }, { status: 404 });

    // Actualizar el registro del movimiento
    const campos = {};
    if (nuevoSku !== undefined && nuevoSku) campos.sku      = nuevoSku.toUpperCase();
    if (cantidad !== undefined)              campos.cantidad = parseInt(cantidad);
    if (concepto !== undefined)              campos.concepto = concepto;
    if (fecha    !== undefined)              campos.fecha    = new Date(fecha).toISOString();
    if (tipo     !== undefined)              campos.tipo     = tipo.toUpperCase();

    const { error } = await supabase.from('movimientos').update(campos).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Recalcular stock correcto para el o los SKUs afectados y hacer AJUSTE atómico
    const skusAfectados = [...new Set([
      movAntes.sku,
      ...(nuevoSku ? [nuevoSku.toUpperCase()] : []),
    ])];

    for (const sku of skusAfectados) {
      await ajustarStockDesdHistorial(sku, `Edición movimiento ${id}`);
    }

    try {
      await supabase.from('logs').insert({
        usuario: 'admin', accion: 'EDITAR_MOVIMIENTO',
        detalle: `ID:${id} | SKU:${movAntes.sku}${nuevoSku ? ' → ' + nuevoSku.toUpperCase() : ''} | Cant:${cantidad || '—'}`,
        resultado: 'OK',
      });
    } catch (_) {}

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── DELETE — eliminar un movimiento y corregir stock ────────────────────────
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    const { data: mov } = await supabase
      .from('movimientos').select('sku, tipo, cantidad').eq('id', id).single();

    const { error } = await supabase.from('movimientos').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Recalcular y ajuste atómico del stock real
    if (mov?.sku) {
      await ajustarStockDesdHistorial(mov.sku, `Eliminación movimiento ${id}`);
    }

    try {
      await supabase.from('logs').insert({
        usuario: 'admin', accion: 'ELIMINAR_MOVIMIENTO',
        detalle: `ID:${id} | SKU:${mov?.sku} | ${mov?.tipo} ${mov?.cantidad} uds`,
        resultado: 'OK',
      });
    } catch (_) {}

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── Helper: recalcular stock desde historial y hacer AJUSTE atómico ─────────
// Solo se usa en PUT y DELETE (operaciones admin poco frecuentes).
// El AJUSTE via RPC garantiza que `inventario` quede correcto sin race conditions.
async function ajustarStockDesdHistorial(sku, concepto) {
  const { data: prod } = await supabase
    .from('productos').select('stock_inicial').eq('sku', sku).single();

  const { data: movs } = await supabase
    .from('movimientos')
    .select('tipo, cantidad')
    .eq('sku', sku)
    .in('tipo', ['ENTRADA', 'SALIDA']);

  let stockCorrecto = prod?.stock_inicial || 0;
  (movs || []).forEach(m => {
    if (m.tipo === 'ENTRADA')     stockCorrecto += m.cantidad;
    else if (m.tipo === 'SALIDA') stockCorrecto -= m.cantidad;
  });
  stockCorrecto = Math.max(0, stockCorrecto);

  // Ajuste atómico — actualiza stock_total (disponible)
  await registrarMovimiento({
    sku,
    tipo:      'AJUSTE',
    cantidad:  stockCorrecto,
    concepto:  concepto || 'Ajuste automático',
    usuario:   'admin',
  });
}
