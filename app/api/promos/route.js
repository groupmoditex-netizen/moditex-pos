export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase.from('promos').select('*').order('nombre');
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, promos: data || [] });
  } catch (err) { return NextResponse.json({ ok: false, error: err.message }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const { nombre, precio_mayor, precio_detal, num_piezas, descripcion, activo, piezas_modelos, foto_url, fotos_extra } = await request.json();
    if (!nombre?.trim())      return NextResponse.json({ ok: false, error: 'Nombre requerido' }, { status: 400 });
    if (!precio_mayor || precio_mayor <= 0) return NextResponse.json({ ok: false, error: 'Precio al mayor requerido' }, { status: 400 });
    if (!precio_detal || precio_detal <= 0) return NextResponse.json({ ok: false, error: 'Precio al detal requerido' }, { status: 400 });
    if (!num_piezas || num_piezas < 2)      return NextResponse.json({ ok: false, error: 'Mínimo 2 piezas' }, { status: 400 });

    const { data, error } = await supabase.from('promos').insert({
      nombre: nombre.trim(),
      precio_mayor: parseFloat(precio_mayor),
      precio_detal: parseFloat(precio_detal),
      num_piezas: parseInt(num_piezas),
      descripcion: descripcion || '',
      activo: activo !== false,
      piezas_modelos: piezas_modelos || null,
      foto_url: foto_url || '',
      fotos_extra: fotos_extra || '',
    }).select().single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    try { await supabase.from('logs').insert({ usuario:'sistema', accion:'CREAR_PROMO', detalle:`${nombre} — M:€${precio_mayor} D:€${precio_detal}`, resultado:'OK' }); } catch(_){}
    return NextResponse.json({ ok: true, promo: data });
  } catch (err) { return NextResponse.json({ ok: false, error: err.message }, { status: 500 }); }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nombre, precio_mayor, precio_detal, num_piezas, descripcion, activo, piezas_modelos, foto_url, fotos_extra } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
    const campos = {};
    if (nombre      !== undefined) campos.nombre      = nombre.trim();
    if (precio_mayor!== undefined) campos.precio_mayor= parseFloat(precio_mayor);
    if (precio_detal!== undefined) campos.precio_detal= parseFloat(precio_detal);
    if (num_piezas  !== undefined) campos.num_piezas  = parseInt(num_piezas);
    if (descripcion !== undefined) campos.descripcion = descripcion;
    if (activo      !== undefined) campos.activo      = activo;
    if (piezas_modelos !== undefined) campos.piezas_modelos = piezas_modelos;
    if (foto_url    !== undefined) campos.foto_url    = foto_url;
    if (fotos_extra !== undefined) campos.fotos_extra = fotos_extra;
    const { error } = await supabase.from('promos').update(campos).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id });
  } catch (err) { return NextResponse.json({ ok: false, error: err.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
    const { error } = await supabase.from('promos').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id });
  } catch (err) { return NextResponse.json({ ok: false, error: err.message }, { status: 500 }); }
}