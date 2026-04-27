export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';
import { registrarMovimiento } from '@/lib/stockRpc';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const usuario = getUsuarioCookie(request);
    if (!usuario) return NextResponse.json({ ok: false, error: 'Sesión no válida' }, { status: 401 });

    const { comanda_id, sku, cantidad, modelo, color } = await request.json();
    if (!comanda_id || !sku || cantidad === undefined) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros' }, { status: 400 });
    }

    // 1. Obtener item actual de la tabla rápida
    let { data: item, error: errItem } = await supabase
      .from('comandas_items')
      .select('id, cantidad, cant_empacada, despachado, sku')
      .eq('comanda_id', comanda_id)
      .eq('sku', sku.toUpperCase())
      .single();

    if (errItem || !item) {
      // AUTO-CURACIÓN: Si no está en comandas_items, buscar en el JSON original
      const { data: cmd } = await supabase.from('comandas').select('productos').eq('id', comanda_id).single();
      if (cmd) {
        let prods = cmd.productos;
        while (typeof prods === 'string') { try { prods = JSON.parse(prods); } catch { break; } }
        const pMatch = Array.isArray(prods) ? prods.find(p => (p.sku||'').toUpperCase() === sku.toUpperCase()) : null;
        
        if (pMatch) {
          // Insertar en comandas_items sobre la marcha
          const { data: newItem, error: errIns } = await supabase.from('comandas_items').insert({
            comanda_id,
            sku: sku.toUpperCase(),
            modelo: pMatch.modelo || '',
            cantidad: parseInt(pMatch.cant || pMatch.cantidad || 1),
            cant_empacada: 0,
            despachado: 0
          }).select().single();
          
          if (!errIns) item = newItem;
        }
      }
    }

    if (!item) {
      return NextResponse.json({ ok: false, error: 'Prenda no encontrada en la comanda' }, { status: 404 });
    }

    const actual = item.cant_empacada !== undefined ? item.cant_empacada : (item.despachado || 0);
    const nuevoTotal = actual + cantidad;

    if (nuevoTotal > item.cantidad) {
      return NextResponse.json({ ok: false, error: 'No puedes empacar más de lo pedido' }, { status: 400 });
    }
    if (nuevoTotal < 0) {
      return NextResponse.json({ ok: false, error: 'El empaque no puede ser negativo' }, { status: 400 });
    }

    // 2. Movimiento de Inventario
    const resMov = await registrarMovimiento({
      sku: item.sku,
      tipo: cantidad > 0 ? 'SALIDA' : 'ENTRADA',
      cantidad: Math.abs(cantidad),
      concepto: cantidad > 0 ? `Empaque parcial comanda ${comanda_id}` : `Reversión empaque comanda ${comanda_id}`,
      referencia: comanda_id,
      usuario: usuario.email
    });

    if (!resMov.ok) {
      return NextResponse.json({ ok: false, error: resMov.error }, { status: 400 });
    }

    // 3. Actualizar tabla comandas_items
    await supabase.from('comandas_items').update({
      cant_empacada: nuevoTotal,
      despachado: nuevoTotal, // Sincronizamos para que el Despacho Final sepa que ya salió de stock
      empacado: nuevoTotal === item.cantidad,
      empacado_at: nuevoTotal === item.cantidad ? new Date().toISOString() : null,
      empacado_por: nuevoTotal === item.cantidad ? usuario.email : null
    }).eq('id', item.id);

    // 4. Disparar Realtime
    await supabase.from('comandas').update({ updated_at: new Date().toISOString() }).eq('id', comanda_id);

    // 5. Auditoría
    await supabase.from('comanda_comentarios').insert({
      comanda_id,
      usuario: usuario.nombre || usuario.email,
      tipo: 'log',
      texto: `${usuario.nombre || usuario.email} ${cantidad > 0 ? 'agregó' : 'quitó'} ${Math.abs(cantidad)} ud. de ${modelo || sku}${color ? ' - ' + color : ''} al paquete. (Total: ${nuevoTotal})`
    });

    return NextResponse.json({ ok: true, nuevoEmpacado: nuevoTotal });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
