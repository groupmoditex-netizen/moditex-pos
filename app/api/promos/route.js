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
    const { nombre, precio, num_piezas, descripcion, activo } = await request.json();
    if (!nombre?.trim()) return NextResponse.json({ ok: false, error: 'Nombre requerido' }, { status: 400 });
    if (!precio || precio <= 0) return NextResponse.json({ ok: false, error: 'Precio requerido' }, { status: 400 });
    if (!num_piezas || num_piezas < 2) return NextResponse.json({ ok: false, error: 'Mínimo 2 piezas' }, { status: 400 });
    const { data, error } = await supabase.from('promos').insert({
      nombre: nombre.trim(), precio: parseFloat(precio),
      num_piezas: parseInt(num_piezas), descripcion: descripcion || '', activo: activo !== false,
    }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    try { await supabase.from('logs').insert({ usuario:'sistema', accion:'CREAR_PROMO', detalle:`${nombre} — €${precio}`, resultado:'OK' }); } catch(_){}
    return NextResponse.json({ ok: true, promo: data });
  } catch (err) { return NextResponse.json({ ok: false, error: err.message }, { status: 500 }); }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nombre, precio, num_piezas, descripcion, activo } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });
    const campos = {};
    if (nombre !== undefined) campos.nombre = nombre.trim();
    if (precio !== undefined) campos.precio = parseFloat(precio);
    if (num_piezas !== undefined) campos.num_piezas = parseInt(num_piezas);
    if (descripcion !== undefined) campos.descripcion = descripcion;
    if (activo !== undefined) campos.activo = activo;
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
