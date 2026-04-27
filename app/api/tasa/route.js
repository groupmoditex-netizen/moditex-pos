export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/* GET /api/tasa — devuelve tasa actual */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('tasa_config')
      .select('*')
      .eq('id', 'current')
      .single();

    if (error || !data) {
      // Tabla aún no existe o no hay fila — devolver valor por defecto
      return NextResponse.json({ ok: true, tasa: 1.0, updated_at: null, updated_by: 'sistema', sinTabla: true });
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ ok: true, tasa: 1.0, updated_at: null, updated_by: 'sistema' });
  }
}

/* POST /api/tasa — actualiza tasa y registra cambio */
export async function POST(request) {
  try {
    const { tasa_nueva, usuario, motivo } = await request.json();
    const t = parseFloat(tasa_nueva);
    if (!t || t <= 0) return NextResponse.json({ ok: false, error: 'Tasa inválida' }, { status: 400 });

    // Obtener tasa anterior para el historial
    const { data: actual } = await supabase
      .from('tasa_config')
      .select('tasa_bs_eur')
      .eq('id', 'current')
      .single();

    const tasa_anterior = actual?.tasa_bs_eur ?? null;

    // Actualizar tasa actual (upsert)
    const { error: errUpd } = await supabase
      .from('tasa_config')
      .upsert({
        id: 'current',
        tasa_bs_eur: t,
        updated_at: new Date().toISOString(),
        updated_by: usuario || 'sistema',
      });

    if (errUpd) return NextResponse.json({ ok: false, error: errUpd.message }, { status: 500 });

    // Registrar en historial para auditoría
    await supabase.from('tasa_historial').insert({
      tasa_anterior,
      tasa_nueva: t,
      motivo: motivo || 'manual',
      usuario: usuario || 'sistema',
    });

    // Registrar en logs generales
    try {
      await supabase.from('logs').insert({
        usuario: usuario || 'sistema',
        accion: 'CAMBIO_TASA',
        detalle: `Tasa BS/€: ${tasa_anterior ?? '—'} → ${t} | motivo: ${motivo || 'manual'}`,
        resultado: 'OK',
      });
    } catch (_) {}

    return NextResponse.json({ ok: true, tasa_nueva: t, tasa_anterior });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
