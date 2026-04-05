/**
 * /api/combos — Disponibilidad de combos/sets por color
 *
 * Un combo (triset, biset, etc.) tiene `piezas_modelos`: array de modelo_key.
 * Un color está disponible para el combo si TODAS las piezas tienen stock ≥ 1.
 * El stock disponible del combo en ese color = min(stocks de cada pieza).
 */
export const dynamic = 'force-dynamic';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Access-Control-Allow-Origin': '*',
};

export async function GET() {
  noStore();
  try {
    // ── 1. Promos activas con piezas configuradas ──────────────────────
    const { data: promos, error: ePromos } = await supabase
      .from('promos')
      .select('id,nombre,precio_mayor,precio_detal,num_piezas,descripcion,piezas_modelos,foto_url,fotos_extra')
      .eq('activo', true)
      .not('piezas_modelos', 'is', null);

    if (ePromos) return NextResponse.json({ ok: false, error: ePromos.message }, { status: 500, headers: HEADERS });
    if (!promos?.length) return NextResponse.json({ ok: true, combos: [] }, { headers: HEADERS });

    // ── 2. Todos los productos ─────────────────────────────────────────
    const { data: prods, error: eProds } = await supabase
      .from('productos')
      .select('sku,categoria,modelo,talla,color,stock_inicial');

    if (eProds) return NextResponse.json({ ok: false, error: eProds.message }, { status: 500, headers: HEADERS });

    // ── 3. Movimientos para stock real ─────────────────────────────────
    const { data: movs } = await supabase
      .from('movimientos')
      .select('sku,tipo,cantidad')
      .in('tipo', ['ENTRADA','SALIDA','RESERVA']);

    // ── 4. Stock real por SKU ──────────────────────────────────────────
    const entMap = {}, salMap = {}, resMap = {};
    (movs || []).forEach(m => {
      if (m.tipo === 'ENTRADA')       entMap[m.sku] = (entMap[m.sku] || 0) + m.cantidad;
      else if (m.tipo === 'SALIDA')   salMap[m.sku] = (salMap[m.sku] || 0) + m.cantidad;
      else if (m.tipo === 'RESERVA')  resMap[m.sku] = (resMap[m.sku] || 0) + m.cantidad;
    });

    // ── 5. Índice: modelKey|color → { stock total, mejor SKU } ─────────
    // stock total = suma de todas las tallas de ese modelo+color
    // mejor SKU   = el de mayor stock individual (para hacer el pedido)
    const stockIndex  = {};  // "CATEGORIA__MODELO|COLOR" → stock total
    const skuIndex    = {};  // "CATEGORIA__MODELO|COLOR" → { sku, modelo, talla }

    (prods || []).forEach(p => {
      const modelKey = `${p.categoria}__${p.modelo}`;
      const mcKey    = `${modelKey}|${p.color}`;
      const realStock = Math.max(0, (p.stock_inicial || 0) + (entMap[p.sku] || 0) - (salMap[p.sku] || 0) - (resMap[p.sku] || 0));

      stockIndex[mcKey] = (stockIndex[mcKey] || 0) + realStock;

      // Guardamos el SKU del mayor stock individual por talla (para el pedido)
      if (!skuIndex[mcKey] || realStock > (skuIndex[mcKey].stockSku || 0)) {
        skuIndex[mcKey] = {
          sku:      p.sku,
          modelo:   p.modelo,
          talla:    p.talla,
          stockSku: realStock,
        };
      }
    });

    // ── 6. Calcular disponibilidad por combo y por color ───────────────
    const combos = promos.map(promo => {
      const piezas = Array.isArray(promo.piezas_modelos) ? promo.piezas_modelos : [];
      if (!piezas.length) return null;

      // Recopilar todos los colores que aparecen en AL MENOS UNA pieza
      const coloresSet = new Set();
      piezas.forEach(modelKey => {
        Object.keys(stockIndex).forEach(k => {
          if (k.startsWith(`${modelKey}|`)) {
            coloresSet.add(k.split('|')[1]);
          }
        });
      });

      const colores_disponibles = [];

      coloresSet.forEach(color => {
        const piezasColor = piezas.map(modelKey => {
          const mcKey      = `${modelKey}|${color}`;
          const totalStock = stockIndex[mcKey]  || 0;
          const skuInfo    = skuIndex[mcKey];
          const modelName  = modelKey.split('__')[1] || modelKey;

          return {
            modelKey,
            modelo:  modelName,
            sku:     skuInfo?.sku  || null,
            talla:   skuInfo?.talla || 'UNICA',
            stock:   totalStock,
          };
        });

        // Un color está disponible SOLO si TODAS las piezas tienen stock ≥ 1
        const todasDisponibles = piezasColor.every(p => p.stock >= 1);
        if (!todasDisponibles) return;

        // Stock del combo = mínimo entre las piezas (cuántos conjuntos completos hay)
        const stockCombo = Math.min(...piezasColor.map(p => p.stock));

        colores_disponibles.push({
          color,
          stock:  stockCombo,
          piezas: piezasColor,
        });
      });

      // Ordenar por stock disponible descendente
      colores_disponibles.sort((a, b) => b.stock - a.stock);

      return {
        id:               promo.id,
        nombre:           promo.nombre,
        precio_mayor:     promo.precio_mayor,
        precio_detal:     promo.precio_detal,
        num_piezas:       promo.num_piezas,
        descripcion:      promo.descripcion || '',
        piezas_modelos:   piezas,
        foto_url:         promo.foto_url || '',
        fotos_extra:      promo.fotos_extra || '',
        colores_disponibles,
        total_disponible: colores_disponibles.length,
      };
    }).filter(Boolean);

    return NextResponse.json({ ok: true, combos }, { headers: HEADERS });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message, step: 'catch' }, { status: 500, headers: HEADERS });
  }
}