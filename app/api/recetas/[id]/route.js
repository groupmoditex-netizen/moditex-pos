export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// PUT /api/recetas/[id] — actualizar receta
export async function PUT(request, { params }) {
  try {
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });

    const body = await request.json();
    const { modelo, talla, tela, color_tela, metros_por_prenda, ancho_tela, precio_metro, otros_costos, observaciones, sku_ref } = body;

    if (!modelo?.trim()) return NextResponse.json({ ok: false, error: 'Modelo requerido' }, { status: 400 });
    if (!tela?.trim())   return NextResponse.json({ ok: false, error: 'Tipo de tela requerido' }, { status: 400 });

    const campos = {
      modelo:            modelo.trim().toUpperCase(),
      talla:             (talla || 'TODAS').trim().toUpperCase(),
      tela:              tela.trim().toUpperCase(),
      color_tela:        (color_tela || 'SEGUN_PRENDA').trim().toUpperCase(),
      metros_por_prenda: parseFloat(metros_por_prenda) || 0,
      ancho_tela:        parseFloat(ancho_tela) || 1.50,
      precio_metro:      parseFloat(precio_metro) || 0,
      otros_costos:      parseFloat(otros_costos) || 0,
      observaciones:     observaciones || '',
      sku_ref:           sku_ref || '',
    };

    const { error } = await supabase.from('recetas').update(campos).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    try { await supabase.from('logs').insert({ usuario: 'sistema', accion: 'EDITAR_RECETA', detalle: `ID ${id} — ${campos.modelo}`, resultado: 'OK' }); } catch (_) {}
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/recetas/[id]
export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });

    const { error } = await supabase.from('recetas').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    try { await supabase.from('logs').insert({ usuario: 'sistema', accion: 'ELIMINAR_RECETA', detalle: `ID ${id}`, resultado: 'OK' }); } catch (_) {}
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
