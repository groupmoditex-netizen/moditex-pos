export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

function generarId() {
  const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand  = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EXH-${fecha}-${rand}`;
}

// ── GET — listar piezas en exhibición ─────────────────────────────────
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

// ── POST — agregar piezas a exhibición ────────────────────────────────
// Body: [{ sku, modelo, color, talla, cantidad, notas }]
// La pieza pasa de almacén a mostrador (se descuenta del almacén)
export async function POST(request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];
    if (!items.length) return NextResponse.json({ ok: false, error: 'Sin items' }, { status: 400 });

    const filas = [];
    const movimientos = [];
    const fecha = new Date().toISOString().split('T')[0];

    for (const item of items) {
      const { sku, modelo, color, talla, cantidad = 1, notas = '' } = item;
      if (!sku) continue;

      filas.push({
        id: generarId(),
        sku: sku.toUpperCase(),
        modelo: modelo || '',
        color: color || '',
        talla: talla || '',
        cantidad: parseInt(cantidad) || 1,
        estado: 'activo',
        fecha_entrada: fecha,
        notas,
      });

      // Registrar como salida del almacén (tipo EXHIBICION)
      movimientos.push({
        id: `MOV-${fecha.replace(/-/g,'')}-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
        fecha,
        sku: sku.toUpperCase(),
        tipo: 'SALIDA',
        cantidad: parseInt(cantidad) || 1,
        concepto: `Exhibición mostrador${notas ? ' — ' + notas : ''}`,
        contacto: 'MOSTRADOR',
        tipo_venta: 'EXHIBICION',
        precio_venta: 0,
      });
    }

    if (!filas.length) return NextResponse.json({ ok: false, error: 'Sin datos válidos' }, { status: 400 });

    // Insertar en exhibición
    const { error: errExh } = await supabase.from('exhibicion').insert(filas);
    if (errExh) return NextResponse.json({ ok: false, error: errExh.message }, { status: 500 });

    // Registrar salida del almacén
    if (movimientos.length) {
      await supabase.from('movimientos').insert(movimientos).catch(() => {});
      // Actualizar inventario
      for (const mov of movimientos) {
        const { data: prod } = await supabase.from('productos').select('sku,stock_inicial').eq('sku', mov.sku).single();
        const { data: movs } = await supabase.from('movimientos').select('tipo,cantidad').eq('sku', mov.sku);
        let stock = prod?.stock_inicial || 0;
        (movs || []).forEach(m => {
          if (m.tipo === 'ENTRADA') stock += m.cantidad;
          else if (m.tipo === 'SALIDA') stock -= m.cantidad;
        });
        stock = Math.max(0, stock);
        const { error: eInv } = await supabase.from('inventario').update({ stock, updated_at: new Date().toISOString() }).eq('sku', mov.sku);
        if (eInv) await supabase.from('inventario').insert({ sku: mov.sku, stock });
      }
    }

    await supabase.from('logs').insert({
      usuario: 'sistema', accion: 'ENVIAR_EXHIBICION',
      detalle: `${filas.length} SKU(s) → Mostrador`,
      resultado: 'OK'
    }).catch(() => {});

    return NextResponse.json({ ok: true, ids: filas.map(f => f.id), count: filas.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── PUT — actualizar estado de una pieza ──────────────────────────────
// Body: { id, estado, precio_venta?, notas? }
// estados: 'vendido' | 'devuelto' | 'activo'
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, estado, precio_venta, notas } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    const campos = { updated_at: new Date().toISOString() };
    if (estado        !== undefined) campos.estado        = estado;
    if (precio_venta  !== undefined) campos.precio_venta  = parseFloat(precio_venta) || 0;
    if (notas         !== undefined) campos.notas         = notas;
    if (estado === 'vendido' || estado === 'devuelto') {
      campos.fecha_salida = new Date().toISOString().split('T')[0];
    }

    const { data: item } = await supabase.from('exhibicion').select('*').eq('id', id).single();

    const { error } = await supabase.from('exhibicion').update(campos).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Si se devuelve al almacén → registrar ENTRADA
    if (estado === 'devuelto' && item) {
      const fecha = new Date().toISOString().split('T')[0];
      const movId = `MOV-${fecha.replace(/-/g,'')}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      await supabase.from('movimientos').insert({
        id: movId, fecha, sku: item.sku, tipo: 'ENTRADA',
        cantidad: item.cantidad,
        concepto: 'Devolución desde mostrador / exhibición',
        contacto: 'MOSTRADOR',
      }).catch(() => {});
      // Actualizar inventario
      const { data: prod } = await supabase.from('productos').select('sku,stock_inicial').eq('sku', item.sku).single();
      const { data: movs } = await supabase.from('movimientos').select('tipo,cantidad').eq('sku', item.sku);
      let stock = prod?.stock_inicial || 0;
      (movs || []).forEach(m => {
        if (m.tipo === 'ENTRADA') stock += m.cantidad;
        else if (m.tipo === 'SALIDA') stock -= m.cantidad;
      });
      stock = Math.max(0, stock);
      const { error: eInv } = await supabase.from('inventario').update({ stock, updated_at: new Date().toISOString() }).eq('sku', item.sku);
      if (eInv) await supabase.from('inventario').insert({ sku: item.sku, stock });
    }

    await supabase.from('logs').insert({
      usuario: 'sistema', accion: 'ACTUALIZAR_EXHIBICION',
      detalle: `ID:${id} → ${estado}`,
      resultado: 'OK'
    }).catch(() => {});

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── DELETE — eliminar registro de exhibición ──────────────────────────
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
