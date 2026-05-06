import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Instanciación movida dentro de los handlers para evitar errores de build
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase.from('auditoria_stock').select('*').order('fecha', { ascending: false });
    
    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta + 'T23:59:59');

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, registros: data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
