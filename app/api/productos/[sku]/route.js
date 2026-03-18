export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// PUT /api/productos/[sku] — editar un producto
export async function PUT(request, { params }) {
  try {
    const sku = params.sku;
    const { categoria, modelo, talla, color, tela, precioDetal, precioMayor, precioCosto } = await request.json();

    if (!precioDetal || precioDetal <= 0)
      return NextResponse.json({ ok: false, error: 'Precio detal requerido' }, { status: 400 });

    const campos = {};
    if (categoria)           campos.categoria    = categoria.trim().toUpperCase();
    if (modelo)              campos.modelo       = modelo.trim().toUpperCase();
    if (talla)               campos.talla        = talla;
    if (color != null)       campos.color        = color.trim().toUpperCase();
    if (tela  != null)       campos.tela         = tela.trim().toUpperCase();
    if (precioDetal != null) campos.precio_detal = parseFloat(precioDetal);
    if (precioMayor != null) campos.precio_mayor = parseFloat(precioMayor) || 0;
    if (precioCosto != null) campos.precio_costo = parseFloat(precioCosto) || 0;

    const { error } = await supabase.from('productos').update(campos).eq('sku', sku);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Log
    await supabase.from('logs').insert({ usuario:'sistema', accion:'ACTUALIZAR_PRODUCTO', detalle:`SKU: ${sku}`, resultado:'OK' });
    return NextResponse.json({ ok: true, sku });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/productos/[sku]
export async function DELETE(request, { params }) {
  try {
    const sku = params.sku;
    await supabase.from('inventario').delete().eq('sku', sku);
    const { error } = await supabase.from('productos').delete().eq('sku', sku);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await supabase.from('logs').insert({ usuario:'sistema', accion:'ELIMINAR_PRODUCTO', detalle:`SKU: ${sku}`, resultado:'OK' });
    return NextResponse.json({ ok: true, sku });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}