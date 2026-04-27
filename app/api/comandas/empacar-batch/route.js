export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';
import { registrarMovimiento, getStockMultiple } from '@/lib/stockRpc';
import { NextResponse } from 'next/server';

/**
 * POST /api/comandas/empacar-batch
 * Empaca TODO lo pendiente de una comanda de forma atómica (validación previa).
 */
export async function POST(request) {
  try {
    const usuario = getUsuarioCookie(request);
    if (!usuario) return NextResponse.json({ ok: false, error: 'Sesión no válida' }, { status: 401 });

    const { comanda_id } = await request.json();
    if (!comanda_id) return NextResponse.json({ ok: false, error: 'Faltan comanda_id' }, { status: 400 });

    // 1. Obtener todos los items de la comanda
    let { data: items, error: errItems } = await supabase
      .from('comandas_items')
      .select('*')
      .eq('comanda_id', comanda_id);

    if ((errItems || !items?.length)) {
      // AUTO-CURACIÓN: Importar desde el JSON si la tabla rápida está vacía
      const { data: cmd } = await supabase.from('comandas').select('productos').eq('id', comanda_id).single();
      if (cmd) {
        let prods = cmd.productos;
        while (typeof prods === 'string') { try { prods = JSON.parse(prods); } catch { break; } }
        if (Array.isArray(prods) && prods.length > 0) {
           const toInsert = prods.map(p => ({
             comanda_id,
             sku: (p.sku || '').toUpperCase(),
             modelo: p.modelo || '',
             cantidad: parseInt(p.cant || p.cantidad || 1),
             cant_empacada: 0,
             despachado: 0
           }));
           await supabase.from('comandas_items').insert(toInsert);
           // Volver a cargar
           const { data: reloaded } = await supabase.from('comandas_items').select('*').eq('comanda_id', comanda_id);
           items = reloaded;
        }
      }
    }

    if (!items || !items.length) {
      return NextResponse.json({ ok: false, error: 'Comanda sin items o no encontrada' }, { status: 404 });
    }

    // 2. Calcular qué necesitamos empacar (delta > 0)
    const itemsPendientes = items
      .map(it => {
        const empacado = it.cant_empacada !== undefined ? it.cant_empacada : (it.despachado || 0);
        return { ...it, delta: it.cantidad - empacado };
      })
      .filter(it => it.delta > 0);

    if (itemsPendientes.length === 0) {
      // Si ya está todo empacado, solo aseguramos el estado
      await supabase.from('comandas').update({ status: 'empacado' }).eq('id', comanda_id);
      return NextResponse.json({ ok: true, message: 'Ya estaba todo empacado' });
    }

    // 3. Validación Masiva de Stock
    const skus = itemsPendientes.map(it => it.sku);
    const stockMap = await getStockMultiple(skus);

    const faltantes = [];
    for (const it of itemsPendientes) {
      const info = stockMap[it.sku.toUpperCase()];
      const disponible = info ? info.stock_total : 0;
      if (disponible < it.delta) {
        faltantes.push(`${it.sku} (Faltan: ${it.delta - disponible})`);
      }
    }

    if (faltantes.length > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: `No hay stock suficiente para: ${faltantes.join(', ')}` 
      }, { status: 400 });
    }

    // 4. Ejecutar movimientos de stock e ir actualizando
    for (const it of itemsPendientes) {
      await registrarMovimiento({
        sku: it.sku,
        tipo: 'SALIDA',
        cantidad: it.delta,
        concepto: `Empaque masivo comanda ${comanda_id}`,
        referencia: comanda_id,
        usuario: usuario.email
      });

      await supabase
        .from('comandas_items')
        .update({ 
          cant_empacada: it.cantidad,
          empacado: true,
          empacado_at: new Date().toISOString(),
          empacado_por: usuario.email
        })
        .eq('id', it.id);
    }

    // 5. Actualizar la Comanda Principal (Status y JSONB)
    const updatedProds = items.map(it => ({
      ...it,
      cant_empacada: it.cantidad,
      empacado: true
    }));

    const { error: errFinal } = await supabase
      .from('comandas')
      .update({ 
        status: 'empacado',
        productos: JSON.stringify(updatedProds),
        fecha_empaque: new Date().toISOString()
      })
      .eq('id', comanda_id);

    if (errFinal) throw errFinal;

    // 6. Log auditivo
    await supabase.from('logs').insert({
      usuario: usuario.email,
      accion: 'EMPACADO_MASIVO',
      detalle: `Comanda:${comanda_id} Items:${itemsPendientes.length}`,
      resultado: 'OK'
    });

    // 7. Team Sync Log
    await supabase.from('comanda_comentarios').insert({
      comanda_id,
      usuario: usuario.nombre || usuario.email,
      texto: `📦 ${usuario.nombre || usuario.email} marcó TODO como EMPACADO (${itemsPendientes.length} prendas).`,
      tipo: 'log'
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[EmpacarBatch] Error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
