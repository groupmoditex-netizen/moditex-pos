import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// ── GET: Obtener productos de una comanda específica ─────────────────────────
// Ruta: /api/comandas/items?comanda_id=XXX
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const comanda_id = searchParams.get('comanda_id') || searchParams.get('id');
    if (!comanda_id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    const { data, error } = await supabase
      .from('comandas')
      .select('productos')
      .eq('id', comanda_id)
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    
    let productos = data.productos;
    while (typeof productos === 'string') {
      try { productos = JSON.parse(productos); } catch { productos = []; break; }
    }

    const { data: dbItems } = await supabase.from('comandas_items').select('sku, cant_empacada, despachado').eq('comanda_id', comanda_id);
    if (dbItems && dbItems.length > 0 && Array.isArray(productos)) {
      const dbMap = dbItems.reduce((acc, i) => { acc[i.sku.toUpperCase()] = i; return acc; }, {});
      productos = productos.map(p => {
        const dbIt = dbMap[(p.sku||'').toUpperCase()];
        if (dbIt) {
           return {
             ...p,
             cant_empacada: dbIt.cant_empacada !== undefined ? dbIt.cant_empacada : p.cant_empacada,
             despachado: dbIt.despachado !== undefined ? dbIt.despachado : p.despachado,
           };
        }
        return p;
      });
    }

    return NextResponse.json({ ok: true, productos: productos || [] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── POST: Obtener productos en lote (Bulk) para impresión ────────────────────
// Ruta: /api/comandas/items
export async function POST(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) 
      return NextResponse.json({ ok: false, error: 'Lista de IDs requerida' }, { status: 400 });

    const { data, error } = await supabase
      .from('comandas')
      .select('id, productos')
      .in('id', ids);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const { data: allDbItems } = await supabase.from('comandas_items').select('comanda_id, sku, cant_empacada, despachado').in('comanda_id', ids);
    const allDbMap = {};
    if (allDbItems) {
      allDbItems.forEach(i => {
        if (!allDbMap[i.comanda_id]) allDbMap[i.comanda_id] = {};
        allDbMap[i.comanda_id][i.sku.toUpperCase()] = i;
      });
    }

    const resMap = {};
    (data || []).forEach(row => {
      let p = row.productos;
      while (typeof p === 'string') {
        try { p = JSON.parse(p); } catch { p = []; break; }
      }
      if (Array.isArray(p) && allDbMap[row.id]) {
        p = p.map(item => {
           const dbIt = allDbMap[row.id][(item.sku||'').toUpperCase()];
           if (dbIt) {
             return {
               ...item,
               cant_empacada: dbIt.cant_empacada !== undefined ? dbIt.cant_empacada : item.cant_empacada,
               despachado: dbIt.despachado !== undefined ? dbIt.despachado : item.despachado,
             };
           }
           return item;
        });
      }
      resMap[row.id] = p || [];
    });

    return NextResponse.json({ ok: true, map: resMap });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
