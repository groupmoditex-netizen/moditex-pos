export const dynamic = 'force-dynamic';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const HEADERS = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };

export async function GET() {
  noStore();
  try {
    const { data, error } = await supabase
      .from('catalogo_settings')
      .select('clave, valor');

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: HEADERS });

    const cfg = {};
    (data || []).forEach(row => { cfg[row.clave] = row.valor; });

    return NextResponse.json({
      ok: true,
      // Email
      email_requerido:   cfg.email_requerido  === 'true',
      email_incentivo:   cfg.email_incentivo  || '',
      email_boton_texto: cfg.email_boton_texto || 'Obtener oferta',
      // Banner de mensaje admin
      mensaje_banner:    cfg.mensaje_banner   || '',
      mensaje_tipo:      cfg.mensaje_tipo     || 'info',   // info | warn | promo
      mensaje_activo:    cfg.mensaje_activo   === 'true',
      // Oferta flash
      flash_activo:      cfg.flash_activo     === 'true',
      flash_texto:       cfg.flash_texto      || '',
      flash_hasta:       cfg.flash_hasta      || '',      // ISO datetime o ''
      flash_color:       cfg.flash_color      || '#ef4444',
    }, { headers: HEADERS });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500, headers: HEADERS });
  }
}

export async function PUT(request) {
  noStore();
  try {
    const body = await request.json();
    const updates = [];

    const add = (clave, valor) => updates.push({ clave, valor: String(valor) });

    if (typeof body.email_requerido  === 'boolean') add('email_requerido',  body.email_requerido);
    if (typeof body.email_incentivo  === 'string')  add('email_incentivo',  body.email_incentivo);
    if (typeof body.email_boton_texto=== 'string')  add('email_boton_texto',body.email_boton_texto);

    if (typeof body.mensaje_banner   === 'string')  add('mensaje_banner',   body.mensaje_banner);
    if (typeof body.mensaje_tipo     === 'string')  add('mensaje_tipo',     body.mensaje_tipo);
    if (typeof body.mensaje_activo   === 'boolean') add('mensaje_activo',   body.mensaje_activo);

    if (typeof body.flash_activo     === 'boolean') add('flash_activo',     body.flash_activo);
    if (typeof body.flash_texto      === 'string')  add('flash_texto',      body.flash_texto);
    if (typeof body.flash_hasta      === 'string')  add('flash_hasta',      body.flash_hasta);
    if (typeof body.flash_color      === 'string')  add('flash_color',      body.flash_color);

    for (const update of updates) {
      const { error } = await supabase
        .from('catalogo_settings')
        .upsert(update, { onConflict: 'clave' });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}