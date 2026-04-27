export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { registrarMovimiento } from '@/lib/stockRpc';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { comanda_id, items, usuario } = await request.json(); // items: { SKU: qty }
    if (!comanda_id || !items) return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });

    const results = [];
    const errors = [];

    // 1. Obtener items actuales para validar y sincronizar
    const { data: dbItems } = await supabase
      .from('comandas_items')
      .select('*')
      .eq('comanda_id', comanda_id);

    if (!dbItems) return NextResponse.json({ ok: false, error: 'No se encontraron items' }, { status: 404 });

    for (const [sku, qtyToDeliver] of Object.entries(items)) {
      if (qtyToDeliver <= 0) continue;

      const item = dbItems.find(it => it.sku.toUpperCase() === sku.toUpperCase());
      if (!item) { errors.push(`SKU ${sku} no encontrado en comanda`); continue; }

      const maxPosible = item.cantidad - (item.despachado || 0);
      if (qtyToDeliver > maxPosible) {
        errors.push(`No puedes entregar ${qtyToDeliver}x ${sku}, solo quedan ${maxPosible} pendientes.`);
        continue;
      }

      // ── CÁLCULO DE DEDUCCIÓN DE STOCK (NUEVO) ──
      // Lo que ya está empacado físicamente ya se restó del inventario.
      // Solo restamos si lo que queremos entregar HOY supera lo que quedaba "en la bolsa" (empacado pero no enviado).
      const empacado = item.cant_empacada !== undefined ? item.cant_empacada : (item.despachado || 0);
      const enBolsaEncargado = Math.max(0, empacado - (item.despachado || 0));
      const qtyToDeduct = Math.max(0, qtyToDeliver - enBolsaEncargado);

      if (qtyToDeduct > 0) {
        const resSalida = await registrarMovimiento({
          sku,
          tipo: 'SALIDA',
          cantidad: qtyToDeduct,
          concepto: `Salida (Directa) comanda ${comanda_id}`,
          referencia: comanda_id,
          usuario: usuario || 'sistema'
        });

        if (!resSalida.ok) {
          errors.push(`Error stock ${sku}: ${resSalida.error}`);
          continue;
        }
      }

      // Si entregamos algo que NO estaba empacado, también debemos subir el contador de cant_empacada
      // para mantener la coherencia (lo enviado siempre se considera empacado).
      const nuevoDespachado = (item.despachado || 0) + qtyToDeliver;
      const nuevoEmpacado = Math.max(empacado, nuevoDespachado);

      await supabase
        .from('comandas_items')
        .update({ 
          despachado: nuevoDespachado,
          cant_empacada: nuevoEmpacado
        })
        .eq('id', item.id);

      results.push({ sku, delivered: qtyToDeliver, stockDeducted: qtyToDeduct });
    }

    // 2. Sincronizar el JSONB en la tabla principal de comandas
    const { data: cmd } = await supabase.from('comandas').select('productos').eq('id', comanda_id).single();
    if (cmd) {
      let prods = [];
      try { prods = typeof cmd.productos === 'string' ? JSON.parse(cmd.productos) : cmd.productos; } catch {}
      
      const updatedProds = (prods || []).map(p => {
        const deliverQty = items[p.sku.toUpperCase()];
        if (deliverQty) {
          const oldDelivered = parseInt(p.despachado || 0);
          const oldPacked = parseInt(p.cant_empacada || p.despachado || 0);
          const newDelivered = oldDelivered + parseInt(deliverQty);
          return { 
            ...p, 
            despachado: newDelivered,
            cant_empacada: Math.max(oldPacked, newDelivered)
          };
        }
        return p;
      });

      await supabase.from('comandas').update({ productos: JSON.stringify(updatedProds) }).eq('id', comanda_id);
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json({ ok: false, error: errors.join('. ') }, { status: 400 });
    }

    return NextResponse.json({ ok: true, results, warnings: errors });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
