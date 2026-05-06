import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ ok: false, error: 'Email requerido' }, { status: 400 });

  try {
    const { data, error } = await supabase
      .from('borradores_venta')
      .select('*')
      .eq('usuario_email', email)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, borradores: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { id, email, payload } = await request.json();
    if (!id || !email || !payload) return NextResponse.json({ ok: false, error: 'Faltan datos' }, { status: 400 });

    const { data, error } = await supabase
      .from('borradores_venta')
      .upsert({ id, usuario_email: email, payload, updated_at: new Date().toISOString() });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    const { error } = await supabase.from('borradores_venta').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
