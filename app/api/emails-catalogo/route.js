export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const HEADERS = { 'Access-Control-Allow-Origin': '*' };

// POST — guardar correo capturado desde el catálogo público
export async function POST(request) {
  try {
    const { email, nombre } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Correo inválido' }, { status: 400 });
    }

    // Guardar en emails_catalogo (permite duplicados: útil para tracking de pedidos)
    const { error } = await supabase
      .from('emails_catalogo')
      .insert({ email: email.trim().toLowerCase(), nombre: nombre?.trim() || null });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: HEADERS });

    return NextResponse.json({ ok: true }, { headers: HEADERS });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500, headers: HEADERS });
  }
}

// GET — listar correos (solo para uso interno / admin)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('emails_catalogo')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, emails: data || [] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
