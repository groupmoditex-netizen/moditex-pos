export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/* PATCH /api/comandas-items — marcar/desmarcar empacado de un item */
export async function PATCH(request) {
  try {
    const { id, empacado, usuario } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });

    const update = {
      empacado: !!empacado,
      empacado_por: empacado ? (usuario || 'sistema') : null,
      empacado_at: empacado ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('comandas_items')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

/* GET /api/comandas-items?comanda_id=CMD-xxx — items con estado empacado */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const comanda_id = searchParams.get('comanda_id');
    if (!comanda_id) return NextResponse.json({ ok: false, error: 'comanda_id requerido' }, { status: 400 });

    const { data, error } = await supabase
      .from('comandas_items')
      .select('*')
      .eq('comanda_id', comanda_id)
      .order('modelo', { ascending: true });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
