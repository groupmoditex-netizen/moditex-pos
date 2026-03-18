export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const FACTOR_MERMA = 1.10;

export async function GET() {
  try {
    // 1. Comandas en producción
    const { data: comandas, error: errCmd } = await supabase
      .from('comandas').select('id,cliente,productos').eq('status','produccion');
    if (errCmd) return NextResponse.json({ ok: false, error: errCmd.message }, { status: 500 });

    if (!comandas?.length) {
      return NextResponse.json({ ok: true, data: {
        resumen:[], totalPrendas:0, totalMetros:0, totalMetrosMerma:0,
        comandas:0, sinReceta:[],
        aviso:'No hay comandas en estado PRODUCCIÓN.', generadoEn:new Date().toISOString(),
      }});
    }

    // 2. Construir mapa SKU → cantidad
    const pedidoMap = {};
    (comandas || []).forEach(c => {
      let prods = c.productos;
      if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }
      if (!Array.isArray(prods)) prods = [];
      prods.forEach(p => {
        const sku  = (p.sku || p.nombre || '').trim().toUpperCase();
        const cant = parseInt(p.cant) || parseInt(p.cantidad) || 1;
        if (sku) pedidoMap[sku] = (pedidoMap[sku] || 0) + cant;
      });
    });

    if (!Object.keys(pedidoMap).length) {
      return NextResponse.json({ ok: true, data: {
        resumen:[], totalPrendas:0, totalMetros:0, totalMetrosMerma:0,
        comandas: comandas.length, sinReceta:[],
        aviso:'Las comandas en PRODUCCIÓN no tienen productos registrados.', generadoEn:new Date().toISOString(),
      }});
    }

    // 3. Productos y recetas
    const skus = Object.keys(pedidoMap);
    const [{ data: prods }, { data: recetas }] = await Promise.all([
      supabase.from('productos').select('sku,modelo,talla,color').in('sku', skus),
      supabase.from('recetas').select('*'),
    ]);

    const prodMap = {};
    (prods || []).forEach(p => { prodMap[p.sku] = p; });

    // 4. Calcular plan
    const telaMap = {};
    const sinReceta = [];

    Object.entries(pedidoMap).forEach(([sku, cantidad]) => {
      const prod = prodMap[sku];
      if (!prod) { sinReceta.push({ modelo: sku, color: '', talla: '', totalPrendas: cantidad }); return; }

      const modelo = (prod.modelo || '').toUpperCase().trim();
      const talla  = (prod.talla  || '').toUpperCase().trim();

      // Buscar receta exacta, luego TODAS
      const receta = (recetas || []).find(r =>
        r.modelo?.toUpperCase().trim() === modelo && r.talla?.toUpperCase().trim() === talla
      ) || (recetas || []).find(r =>
        r.modelo?.toUpperCase().trim() === modelo && r.talla?.toUpperCase().trim() === 'TODAS'
      );

      if (!receta) {
        sinReceta.push({ modelo: prod.modelo, color: prod.color, talla: prod.talla, totalPrendas: cantidad });
        return;
      }

      const tela    = (receta.tela || '').toUpperCase().trim();
      const colorT  = (receta.color_tela || 'SEGUN_PRENDA').toUpperCase().trim();
      const key     = `${tela}||${colorT}`;
      const metros  = (receta.metros_por_prenda || 0) * cantidad;

      if (!telaMap[key]) telaMap[key] = { tela, color: colorT, metros: 0, totalPrendas: 0, detalle: [] };
      telaMap[key].metros       += metros;
      telaMap[key].totalPrendas += cantidad;
      telaMap[key].detalle.push({ modelo: prod.modelo, color: prod.color, talla: prod.talla, prendas: cantidad, metros: Math.round(metros*100)/100 });
    });

    const resumen = Object.values(telaMap).map(r => ({
      tela:           r.tela,
      color:          r.color,
      metros:         Math.round(r.metros*100)/100,
      metrosConMerma: Math.round(r.metros*FACTOR_MERMA*100)/100,
      totalPrendas:   r.totalPrendas,
      detalle:        r.detalle,
    })).sort((a,b) => b.metros - a.metros);

    const totalPrendas = resumen.reduce((a,r) => a + r.totalPrendas, 0);
    const totalMetros  = resumen.reduce((a,r) => a + r.metros, 0);

    return NextResponse.json({ ok: true, data: {
      resumen, totalPrendas,
      totalMetros:      Math.round(totalMetros*100)/100,
      totalMetrosMerma: Math.round(totalMetros*FACTOR_MERMA*100)/100,
      comandas: comandas.length,
      sinReceta, generadoEn: new Date().toISOString(),
    }});
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
