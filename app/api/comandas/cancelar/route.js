export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    const usuario = getUsuarioCookie(request);

    const { data, error } = await supabase.rpc('cancelar_comanda', {
      p_comanda_id: id,
      p_usuario:    usuario?.email || null,
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const r = data?.[0];
    if (!r?.ok) return NextResponse.json({ ok: false, error: r?.error_msg }, { status: 409 });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
