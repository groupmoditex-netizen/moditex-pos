export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';

import { supabase } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const usuarioCookie = getUsuarioCookie(request);

    if (!usuarioCookie) {
      const res = NextResponse.json({ ok: false, error: 'Sin sesión o expirada' }, { status: 401 });
      res.cookies.set('moditex_session', '', { maxAge: 0, path: '/' });
      return res;
    }

    // Buscar preferencias y avatar frescos en la DB
    const { data: dbUser } = await supabase
      .from('usuarios')
      .select('preferencias, avatar')
      .eq('email', usuarioCookie.email)
      .single();

    const usuario = {
      ...usuarioCookie,
      preferencias: dbUser?.preferencias || {},
      avatar: dbUser?.avatar || '1'
    };

    return NextResponse.json({ ok: true, usuario });
  } catch (err) {
    console.error('Error en /api/me:', err);
    return NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 401 });
  }
}

