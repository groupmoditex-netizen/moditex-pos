export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const comandaId = searchParams.get('comanda_id');
    let q = supabase.from('pagos').select('*').order('fecha', {ascending: false});
    if (comandaId) q = q.eq('comanda_id', comandaId);
    const { data, error } = await q;
    if (error) return NextResponse.json({ok:true, pagos:[], aviso: error.message});
    return NextResponse.json({ok:true, pagos: data||[]});
  } catch(err) { return NextResponse.json({ok:true, pagos:[]}); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { comanda_id, metodo, divisa, monto_divisa, tasa_bs, referencia, notas } = body;

    if (!comanda_id) return NextResponse.json({ok:false, error:'comanda_id requerido'},{status:400});
    if (!metodo)     return NextResponse.json({ok:false, error:'Método requerido'},{status:400});
    const md = parseFloat(monto_divisa)||0;
    if (md <= 0)     return NextResponse.json({ok:false, error:'Monto requerido'},{status:400});

    const ts  = parseFloat(tasa_bs)||0;
    const div = divisa||'EUR';

    // ── Conversión correcta ─────────────────────────────────────
    // Tasa = cuántos BS vale 1 EUR  (ej: 96.50 BS/€)
    // USD/USDT = precio directo en EUR (sin conversión), igual que el frontend
    let montoEUR = 0;
    let montoBs  = 0;
    if      (div==='BS')              { montoBs=md; montoEUR=ts>0?md/ts:0; }
    else if (div==='EUR')             { montoEUR=md; montoBs=0; }
    else if (div==='USD'||div==='USDT') { montoEUR=md; montoBs=0; } // precio divisa directo
    else                              { montoEUR=md; montoBs=0; }

    montoEUR = Math.round(montoEUR*100)/100;
    montoBs  = Math.round(montoBs*100)/100;

    // ── Insertar con las columnas REALES de la tabla pagos ──────
    // Columnas que existen: id(uuid-auto), comanda_id, cliente, tipo, monto,
    //   monto_pagado, monto_bs, metodo, moneda, fecha
    // Columnas que agregamos con SCHEMA_FIX.sql: divisa, monto_divisa, tasa_bs, referencia, notas
    const fila = {
      comanda_id,
      metodo,
      moneda:      div,          // columna original
      divisa:      div,          // columna nueva
      monto:       montoEUR,     // columna original (en EUR)
      monto_pagado:montoEUR,     // columna original
      monto_bs:    montoBs,      // columna original
      monto_divisa:md,           // columna nueva
      tasa_bs:     ts,           // columna nueva
      referencia:  referencia||'', // columna nueva
      notas:       notas||'',    // columna nueva
    };

    const { data, error } = await supabase.from('pagos').insert(fila).select().single();

    if (error) {
      // Si fallan las columnas nuevas, intentar con solo las columnas originales
      if (error.message?.includes('column')) {
        const filaMin = { comanda_id, metodo, moneda:div, monto:montoEUR, monto_pagado:montoEUR, monto_bs:montoBs };
        const r2 = await supabase.from('pagos').insert(filaMin).select().single();
        if (r2.error) return NextResponse.json({ok:false, error:r2.error.message},{status:500});
      } else {
        return NextResponse.json({ok:false, error:error.message},{status:500});
      }
    }

    // Actualizar monto_pagado en la comanda
    try {
      const {data:cmd} = await supabase.from('comandas').select('precio,monto_pagado').eq('id',comanda_id).single();
      if (cmd) {
        const nuevo = Math.min(Math.round(((cmd.monto_pagado||0)+montoEUR)*100)/100, cmd.precio||99999);
        await supabase.from('comandas').update({monto_pagado:nuevo}).eq('id',comanda_id);
      }
    } catch(_){}

    try {
      await supabase.from('logs').insert({
        usuario:'sistema', accion:'REGISTRAR_PAGO',
        detalle:`${comanda_id} | ${metodo} | ${div} ${md} | tasa:${ts} | ref:${referencia||'—'}`,
        resultado:'OK'
      });
    } catch(_){}

    return NextResponse.json({ok:true, montoEUR, montoBs});
  } catch(err) { return NextResponse.json({ok:false, error:err.message},{status:500}); }
}
