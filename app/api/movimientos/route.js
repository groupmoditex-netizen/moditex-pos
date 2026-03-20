export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { generarId } from '@/utils/generarId';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parámetros de filtrado server-side
    const sku    = searchParams.get('sku');
    const tipo   = searchParams.get('tipo');   // ENTRADA | SALIDA
    const desde  = searchParams.get('desde');  // YYYY-MM-DD
    const hasta  = searchParams.get('hasta');  // YYYY-MM-DD
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit  = Math.min(100, parseInt(searchParams.get('limit') || '25'));
    const offset = (page - 1) * limit;

    // Construir query con filtros
    let q = supabase
      .from('movimientos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (sku)   q = q.eq('sku',  sku.toUpperCase());
    if (tipo)  q = q.eq('tipo', tipo.toUpperCase());
    if (desde) q = q.gte('fecha', desde);
    if (hasta) q = q.lte('fecha', hasta);

    // Paginación
    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body  = await request.json();
    const items = Array.isArray(body) ? body : [body];
    if (!items.length) return NextResponse.json({ ok: false, error: 'Sin movimientos' }, { status: 400 });

    // 1. Validar estructura
    for (const d of items) {
      if (!d.sku) return NextResponse.json({ ok: false, error: 'SKU requerido' }, { status: 400 });
      const t = (d.tipo || '').toUpperCase();
      if (t !== 'ENTRADA' && t !== 'SALIDA')
        return NextResponse.json({ ok: false, error: `Tipo inválido: ${d.tipo}` }, { status: 400 });
      if (!d.cantidad || d.cantidad < 1)
        return NextResponse.json({ ok: false, error: 'Cantidad mínima: 1' }, { status: 400 });
    }

    const skusUnicos = [...new Set(items.map(d => d.sku.toUpperCase()))];

    // 2. Verificar que los SKUs existen
    const { data: prods, error: errP } = await supabase
      .from('productos').select('sku, stock_inicial').in('sku', skusUnicos);
    if (errP) return NextResponse.json({ ok: false, error: errP.message }, { status: 500 });

    const prodMap = {};
    (prods || []).forEach(p => { prodMap[p.sku] = p.stock_inicial || 0; });
    for (const sku of skusUnicos) {
      if (prodMap[sku] === undefined)
        return NextResponse.json({ ok: false, error: `SKU "${sku}" no encontrado` }, { status: 404 });
    }

    // 3. Calcular stock real desde movimientos históricos
    const { data: movsPrev } = await supabase
      .from('movimientos').select('sku, tipo, cantidad').in('sku', skusUnicos);

    const realStock = {};
    for (const sku of skusUnicos) {
      let stock = prodMap[sku];
      (movsPrev || []).forEach(m => {
        if (m.sku !== sku) return;
        if (m.tipo === 'ENTRADA') stock += m.cantidad;
        else if (m.tipo === 'SALIDA') stock -= m.cantidad;
      });
      realStock[sku] = Math.max(0, stock);
    }

    // 4. Validar stock para SALIDAS
    const acum = {};
    for (const d of items) {
      const sku = d.sku.toUpperCase();
      if (d.tipo.toUpperCase() !== 'SALIDA') continue;
      acum[sku] = (acum[sku] || 0) + d.cantidad;
      if (acum[sku] > realStock[sku]) {
        return NextResponse.json({
          ok: false,
          error: `Stock insuficiente para "${sku}". Disponible: ${realStock[sku]}, solicitado: ${acum[sku]}`,
        }, { status: 400 });
      }
    }

    // 5. INSERT de movimientos
    const filas = items.map(d => ({
      id:           generarId('MOV'),
      fecha:        d.fecha ? new Date(d.fecha).toISOString() : new Date().toISOString(),
      sku:          d.sku.toUpperCase(),
      tipo:         d.tipo.toUpperCase(),
      cantidad:     d.cantidad,
      concepto:     d.concepto     || '',
      contacto:     d.contacto     || '',
      tipo_venta:   d.tipo_venta   || '',
      precio_venta: d.precio_venta || 0,
      cliente_id:   d.cliente_id   || '',
    }));

    const { error: errM } = await supabase.from('movimientos').insert(filas);
    if (errM) return NextResponse.json({ ok: false, error: errM.message }, { status: 500 });

    // 6. Actualizar inventario
    const deltaMap = {};
    for (const d of items) {
      const sku   = d.sku.toUpperCase();
      const delta = d.tipo.toUpperCase() === 'ENTRADA' ? d.cantidad : -d.cantidad;
      deltaMap[sku] = (deltaMap[sku] || 0) + delta;
    }
    for (const [sku, delta] of Object.entries(deltaMap)) {
      const nuevoStock = Math.max(0, realStock[sku] + delta);
      const { error: eInv } = await supabase
        .from('inventario')
        .update({ stock: nuevoStock, updated_at: new Date().toISOString() })
        .eq('sku', sku);
      if (eInv) await supabase.from('inventario').insert({ sku, stock: nuevoStock });
    }

    // 7. Log
    supabase.from('logs').insert(filas.map(m => ({
      usuario: 'sistema', accion: 'REGISTRAR_MOVIMIENTO',
      detalle: `${m.tipo} | SKU: ${m.sku} | Cant: ${m.cantidad}`,
      resultado: 'OK',
    }))).then(() => {});

    return NextResponse.json({ ok: true, ids: filas.map(m => m.id), count: filas.length });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, sku: nuevoSku, cantidad, concepto, fecha, tipo } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
    if (cantidad !== undefined && cantidad < 1)
      return NextResponse.json({ ok: false, error: 'Cantidad mínima: 1' }, { status: 400 });

    // ── Obtener el movimiento ANTES de modificar para saber el SKU original ──
    const { data: movAntes, error: errLeer } = await supabase
      .from('movimientos').select('sku').eq('id', id).single();
    if (errLeer || !movAntes)
      return NextResponse.json({ ok: false, error: 'Movimiento no encontrado' }, { status: 404 });

    const skuOriginal = movAntes.sku;

    // ── Armar los campos a actualizar ─────────────────────────────────────────
    const campos = {};
    if (nuevoSku  !== undefined && nuevoSku)  campos.sku      = nuevoSku.toUpperCase();
    if (cantidad  !== undefined) campos.cantidad  = parseInt(cantidad);
    if (concepto  !== undefined) campos.concepto  = concepto;
    if (fecha     !== undefined) campos.fecha     = new Date(fecha).toISOString();
    if (tipo      !== undefined) campos.tipo      = tipo.toUpperCase();

    const { error } = await supabase.from('movimientos').update(campos).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // ── Recalcular inventario: si cambió el SKU, recalcular ambos ─────────────
    async function recalcularSku(sku) {
      const { data: prod } = await supabase
        .from('productos').select('sku,stock_inicial').eq('sku', sku).single();
      const { data: movs } = await supabase
        .from('movimientos').select('tipo,cantidad').eq('sku', sku);
      let stock = prod?.stock_inicial || 0;
      (movs || []).forEach(m => {
        if (m.tipo === 'ENTRADA') stock += m.cantidad;
        else if (m.tipo === 'SALIDA') stock -= m.cantidad;
      });
      stock = Math.max(0, stock);
      const { error: eInv } = await supabase
        .from('inventario')
        .update({ stock, updated_at: new Date().toISOString() })
        .eq('sku', sku);
      if (eInv) await supabase.from('inventario').insert({ sku, stock });
    }

    await recalcularSku(skuOriginal);
    if (nuevoSku && nuevoSku.toUpperCase() !== skuOriginal) {
      await recalcularSku(nuevoSku.toUpperCase());
    }

    const skuFinal = nuevoSku ? nuevoSku.toUpperCase() : skuOriginal;
    try { await supabase.from('logs').insert({
      usuario: 'admin', accion: 'EDITAR_MOVIMIENTO',
      detalle: `ID: ${id} | SKU: ${skuOriginal}${skuFinal !== skuOriginal ? ' → '+skuFinal : ''} | Cant: ${cantidad||'—'} | Tipo: ${tipo||'—'}`,
      resultado: 'OK'
    }); } catch(_){}
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    // Guardar datos del movimiento antes de borrar para recalcular inventario
    const { data: mov } = await supabase.from('movimientos').select('sku,tipo,cantidad').eq('id', id).single();

    const { error } = await supabase.from('movimientos').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Recalcular inventario
    if (mov?.sku) {
      const { data: prod } = await supabase.from('productos').select('sku,stock_inicial').eq('sku', mov.sku).single();
      const { data: movs } = await supabase.from('movimientos').select('tipo,cantidad').eq('sku', mov.sku);
      let stock = prod?.stock_inicial || 0;
      (movs || []).forEach(m => { if (m.tipo === 'ENTRADA') stock += m.cantidad; else stock -= m.cantidad; });
      stock = Math.max(0, stock);
      const { error: eInv } = await supabase.from('inventario').update({ stock, updated_at: new Date().toISOString() }).eq('sku', mov.sku);
      if (eInv) await supabase.from('inventario').insert({ sku: mov.sku, stock });
    }

    try { await supabase.from('logs').insert({ usuario: 'admin', accion: 'ELIMINAR_MOVIMIENTO', detalle: `ID: ${id} | SKU: ${mov?.sku} | ${mov?.tipo} ${mov?.cantidad} uds`, resultado: 'OK' }); } catch(_){}
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
