export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { registrarMovimiento } from '@/lib/stockRpc';
import { NextResponse } from 'next/server';

function generarIdExh() {
  const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand  = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EXH-${fecha}-${rand}`;
}

// ── GET — listar piezas en exhibición ─────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado'); // activo | vendido | devuelto | all

    let q = supabase.from('exhibicion').select('*').order('created_at', { ascending: false });
    if (estado && estado !== 'all') q = q.eq('estado', estado);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, items: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── POST — enviar piezas al mostrador ─────────────────────────────────────────
// Descuenta del almacén (SALIDA atómica) y registra en tabla exhibicion
export async function POST(request) {
  try {
    const body  = await request.json();
    const items = Array.isArray(body) ? body : [body];
    if (!items.length) return NextResponse.json({ ok: false, error: 'Sin items' }, { status: 400 });

    const filas      = [];
    const erroresStock = [];

    for (const item of items) {
      const { sku, modelo, color, talla, cantidad = 1, notas = '' } = item;
      if (!sku) continue;

      const skuUp = sku.toUpperCase();
      const qty   = parseInt(cantidad) || 1;

      // ✅ Descontar del almacén atómicamente (FOR UPDATE en Postgres)
      const res = await registrarMovimiento({
        sku:       skuUp,
        tipo:      'SALIDA',
        cantidad:  qty,
        concepto:  `Exhibición mostrador${notas ? ' — ' + notas : ''}`,
        contacto:  'MOSTRADOR',
        tipo_venta: 'EXHIBICION',
        usuario:   'sistema',
      });

      if (!res.ok) {
        erroresStock.push({ sku: skuUp, error: res.error });
        continue; // Saltar este item — stock insuficiente
      }

      filas.push({
        id:           generarIdExh(),
        sku:          skuUp,
        modelo:       modelo || '',
        color:        color  || '',
        talla:        talla  || '',
        cantidad:     qty,
        estado:       'activo',
        fecha_entrada: new Date().toISOString().split('T')[0],
        notas,
      });
    }

    if (filas.length === 0) {
      return NextResponse.json({
        ok:     false,
        error:  'Sin items válidos (posible stock insuficiente)',
        erroresStock,
      }, { status: 400 });
    }

    // Registrar en tabla exhibicion
    const { error: errExh } = await supabase.from('exhibicion').insert(filas);
    if (errExh) return NextResponse.json({ ok: false, error: errExh.message }, { status: 500 });

    try {
      await supabase.from('logs').insert({
        usuario: 'sistema', accion: 'ENVIAR_EXHIBICION',
        detalle: `${filas.length} SKU(s) → Mostrador`,
        resultado: 'OK',
      });
    } catch (_) {}

    return NextResponse.json({
      ok:    true,
      ids:   filas.map(f => f.id),
      count: filas.length,
      ...(erroresStock.length > 0 && { erroresStock }),
    });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── PUT — actualizar estado de una pieza ──────────────────────────────────────
// estados: 'vendido' | 'devuelto' | 'activo'
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, estado, precio_venta, notas } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    // Leer la pieza actual para conocer sku y cantidad
    const { data: item, error: errItem } = await supabase
      .from('exhibicion').select('*').eq('id', id).single();
    if (errItem || !item)
      return NextResponse.json({ ok: false, error: 'Pieza no encontrada' }, { status: 404 });

    // ── devuelto → ENTRADA al almacén ─────────────────────────────────────
    if (estado === 'devuelto' && item.estado === 'activo') {
      const res = await registrarMovimiento({
        sku:      item.sku,
        tipo:     'ENTRADA',
        cantidad: item.cantidad,
        concepto: 'Devolución desde mostrador / exhibición',
        contacto: 'MOSTRADOR',
        usuario:  'sistema',
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
      }
    }

    // ── vendido desde mostrador → no mueve almacén (ya salió en POST) ─────
    // Solo actualizamos el estado del registro

    const campos = { updated_at: new Date().toISOString() };
    if (estado       !== undefined) campos.estado       = estado;
    if (precio_venta !== undefined) campos.precio_venta = parseFloat(precio_venta) || 0;
    if (notas        !== undefined) campos.notas        = notas;
    if (estado === 'vendido' || estado === 'devuelto') {
      campos.fecha_salida = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase.from('exhibicion').update(campos).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    try {
      await supabase.from('logs').insert({
        usuario: 'sistema', accion: 'ACTUALIZAR_EXHIBICION',
        detalle: `ID:${id} SKU:${item.sku} → ${estado}`,
        resultado: 'OK',
      });
    } catch (_) {}

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── DELETE — eliminar registro de exhibición ──────────────────────────────────
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    const { error } = await supabase.from('exhibicion').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
