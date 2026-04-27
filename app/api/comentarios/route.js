export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';

/* GET /api/comentarios — lista comentarios. Soporta comanda_id o devuelve los últimos 200 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const comanda_id = searchParams.get('comanda_id');
    const limit = parseInt(searchParams.get('limit')) || 200;

    let query = supabase
      .from('comanda_comentarios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (comanda_id) {
      // Si hay comanda_id, los queremos en orden cronológico (asc) para el hilo
      query = supabase
        .from('comanda_comentarios')
        .select('*')
        .eq('comanda_id', comanda_id)
        .order('created_at', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ ok: true, comentarios: [] });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, comentarios: data || [] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

/* POST /api/comentarios — crear comentario */
export async function POST(request) {
  try {
    const { comanda_id, texto, usuario, tipo, parent_id } = await request.json();
    if (!comanda_id) return NextResponse.json({ ok: false, error: 'comanda_id requerido' }, { status: 400 });
    if (!texto?.trim()) return NextResponse.json({ ok: false, error: 'El texto no puede estar vacío' }, { status: 400 });
    if (!usuario?.trim()) return NextResponse.json({ ok: false, error: 'Usuario requerido' }, { status: 400 });

    const { data, error } = await supabase
      .from('comanda_comentarios')
      .insert({
        comanda_id,
        texto: texto.trim(),
        usuario: usuario.trim(),
        tipo: tipo || 'nota',
        parent_id
      })
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, comentario: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

/* PUT /api/comentarios — editar comentario o gestionar reacciones */
export async function PUT(request) {
  try {
    const { id, texto, tipo, toggleReaccion, usuarioReaccion, togglePinned } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });

    // 1. Obtener el comentario actual
    const { data: existing, error: errFetch } = await supabase
      .from('comanda_comentarios')
      .select('*')
      .eq('id', id)
      .single();

    if (errFetch || !existing) return NextResponse.json({ ok: false, error: 'Comentario no encontrado' }, { status: 404 });

    // CASO A: Toglear Reacción
    if (toggleReaccion && usuarioReaccion) {
      const reacciones = existing.reacciones || {};
      const actual = reacciones[toggleReaccion] || [];
      
      let nuevas;
      if (actual.includes(usuarioReaccion)) {
        nuevas = actual.filter(u => u !== usuarioReaccion);
      } else {
        nuevas = [...actual, usuarioReaccion];
      }

      const updatedReacciones = { ...reacciones, [toggleReaccion]: nuevas };
      const { data, error } = await supabase
        .from('comanda_comentarios')
        .update({ reacciones: updatedReacciones })
        .eq('id', id)
        .select().single();

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, comentario: data });
    }

    // CASO B: Toglear Pin (Destacar)
    if (togglePinned !== undefined) {
      const { data, error } = await supabase
        .from('comanda_comentarios')
        .update({ pinned: !!togglePinned })
        .eq('id', id)
        .select().single();

      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, comentario: data });
    }

    // CASO B: Editar Texto (solo 10 min)
    const creado = new Date(existing.created_at).getTime();
    const ahora  = Date.now();
    const diffMin = (ahora - creado) / (1000 * 60);

    if (diffMin > 10) {
      return NextResponse.json({ ok: false, error: 'Tiempo de edición expirado (máx 10 min por auditoría)' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('comanda_comentarios')
      .update({
        texto: texto?.trim() || existing.texto,
        tipo: tipo || existing.tipo
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, comentario: data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

/* DELETE /api/comentarios?id=uuid — borrar comentario (tiempo limitado) */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });

    // 1. Obtener el comentario actual para ver el tiempo
    const { data: existing, error: errFetch } = await supabase
      .from('comanda_comentarios')
      .select('created_at')
      .eq('id', id)
      .single();

    if (errFetch || !existing) return NextResponse.json({ ok: false, error: 'Comentario no encontrado' }, { status: 404 });

    // 2. Verificar tiempo (10 minutos)
    const creado = new Date(existing.created_at).getTime();
    const ahora  = Date.now();
    const diffMin = (ahora - creado) / (1000 * 60);

    if (diffMin > 10) {
      return NextResponse.json({ ok: false, error: 'No se puede eliminar tras 10 minutos (bloqueo de auditoría)' }, { status: 403 });
    }

    const { error } = await supabase
      .from('comanda_comentarios')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
