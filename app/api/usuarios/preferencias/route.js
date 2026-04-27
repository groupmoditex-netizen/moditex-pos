export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';

export async function POST(request) {
  try {
    const usuario = getUsuarioCookie(request);
    if (!usuario) {
      return NextResponse.json({ ok: false, error: 'Sesión no válida' }, { status: 401 });
    }

    const { preferencias } = await request.json();
    if (!preferencias) {
      return NextResponse.json({ ok: false, error: 'Preferencias requeridas' }, { status: 400 });
    }

    const { error } = await supabase
      .from('usuarios')
      .update({ preferencias })
      .eq('email', usuario.email);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
