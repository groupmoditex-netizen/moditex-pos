export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/recetas — todas las recetas
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .order('modelo')
      .order('talla');
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, recetas: data || [] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// POST /api/recetas — crear nueva receta
export async function POST(request) {
  try {
    const body = await request.json();
    const { modelo, talla, tela, color_tela, metros_por_prenda, ancho_tela, precio_metro, otros_costos, observaciones, sku_ref } = body;

    if (!modelo?.trim()) return NextResponse.json({ ok: false, error: 'Modelo requerido' }, { status: 400 });
    if (!tela?.trim())   return NextResponse.json({ ok: false, error: 'Tipo de tela requerido' }, { status: 400 });
    if (!metros_por_prenda || metros_por_prenda <= 0)
      return NextResponse.json({ ok: false, error: 'Metros por prenda requerido' }, { status: 400 });

    const fila = {
      modelo:            modelo.trim().toUpperCase(),
      talla:             (talla || 'TODAS').trim().toUpperCase(),
      tela:              tela.trim().toUpperCase(),
      color_tela:        (color_tela || 'SEGUN_PRENDA').trim().toUpperCase(),
      metros_por_prenda: parseFloat(metros_por_prenda),
      ancho_tela:        parseFloat(ancho_tela) || 1.50,
      precio_metro:      parseFloat(precio_metro) || 0,
      otros_costos:      parseFloat(otros_costos) || 0,
      observaciones:     observaciones || '',
      sku_ref:           sku_ref || '',
    };

    const { data, error } = await supabase.from('recetas').insert(fila).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    try { await supabase.from('logs').insert({ usuario: 'sistema', accion: 'CREAR_RECETA', detalle: `${fila.modelo} — ${fila.tela}`, resultado: 'OK' }); } catch (_) {}
    return NextResponse.json({ ok: true, receta: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
