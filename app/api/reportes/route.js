export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get('desde'); // YYYY-MM-DD
    const hasta = searchParams.get('hasta'); // YYYY-MM-DD

    // Traer movimientos de salida del período
    let q = supabase
      .from('movimientos')
      .select('sku, tipo, cantidad, precio_venta, tipo_venta, contacto, cliente_id, fecha, created_at')
      .eq('tipo', 'SALIDA');

    if (desde) q = q.gte('fecha', desde + 'T00:00:00.000Z');
    if (hasta) q = q.lte('fecha', hasta + 'T23:59:59.999Z');
    q = q.order('fecha', { ascending: false }).limit(5000); // Safety cap

    const { data: movs, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // Traer productos para enriquecer con modelo/categoría
    const skusUnicos = [...new Set((movs || []).map(m => m.sku))];
    let prodMap = {};
    if (skusUnicos.length > 0) {
      const { data: prods } = await supabase
        .from('productos')
        .select('sku, modelo, categoria, precio_costo')
        .in('sku', skusUnicos);
      (prods || []).forEach(p => { prodMap[p.sku] = p; });
    }

    const lista = movs || [];

    // ── KPIs generales ────────────────────────────────────────────────
    const totalVentas   = lista.reduce((a, m) => a + (m.precio_venta || 0) * m.cantidad, 0);
    const totalUnidades = lista.reduce((a, m) => a + m.cantidad, 0);
    const totalTransacciones = lista.length;

    // Ganancia total (solo para productos con precio_costo definido)
    const totalGanancia = lista.reduce((a, m) => {
      const prod = prodMap[m.sku];
      if (!prod?.precio_costo) return a;
      return a + ((m.precio_venta || 0) - prod.precio_costo) * m.cantidad;
    }, 0);

    // ── Desglose por tipo de venta ────────────────────────────────────
    const porTipo = { DETAL: { ventas: 0, unidades: 0 }, MAYOR: { ventas: 0, unidades: 0 } };
    lista.forEach(m => {
      const tv = m.tipo_venta === 'MAYOR' ? 'MAYOR' : 'DETAL';
      porTipo[tv].ventas   += (m.precio_venta || 0) * m.cantidad;
      porTipo[tv].unidades += m.cantidad;
    });

    // ── Top modelos más vendidos ──────────────────────────────────────
    const modeloMap = {};
    lista.forEach(m => {
      const prod   = prodMap[m.sku];
      const modelo = prod?.modelo || m.sku;
      const cat    = prod?.categoria || '—';
      if (!modeloMap[modelo]) modeloMap[modelo] = { modelo, categoria: cat, unidades: 0, ventas: 0 };
      modeloMap[modelo].unidades += m.cantidad;
      modeloMap[modelo].ventas   += (m.precio_venta || 0) * m.cantidad;
    });
    const topModelos = Object.values(modeloMap)
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 10);

    // ── Top categorías ────────────────────────────────────────────────
    const catMap = {};
    lista.forEach(m => {
      const cat = prodMap[m.sku]?.categoria || 'Sin categoría';
      if (!catMap[cat]) catMap[cat] = { categoria: cat, unidades: 0, ventas: 0 };
      catMap[cat].unidades += m.cantidad;
      catMap[cat].ventas   += (m.precio_venta || 0) * m.cantidad;
    });
    const topCategorias = Object.values(catMap)
      .sort((a, b) => b.ventas - a.ventas);

    // ── Top clientes ──────────────────────────────────────────────────
    const cliMap = {};
    lista.forEach(m => {
      const ref = m.cliente_id || m.contacto || 'Consumidor final';
      if (!cliMap[ref]) cliMap[ref] = { cliente: ref, unidades: 0, ventas: 0 };
      cliMap[ref].unidades += m.cantidad;
      cliMap[ref].ventas   += (m.precio_venta || 0) * m.cantidad;
    });
    const topClientes = Object.values(cliMap)
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 10);

    // ── Ventas por día (para gráfica de tendencia) ────────────────────
    const diaMap = {};
    lista.forEach(m => {
      const dia = String(m.fecha || m.created_at || '').split('T')[0];
      if (!dia) return;
      if (!diaMap[dia]) diaMap[dia] = { fecha: dia, ventas: 0, unidades: 0 };
      diaMap[dia].ventas   += (m.precio_venta || 0) * m.cantidad;
      diaMap[dia].unidades += m.cantidad;
    });
    const porDia = Object.values(diaMap).sort((a, b) => a.fecha.localeCompare(b.fecha));

    return NextResponse.json({
      ok: true,
      resumen: {
        totalVentas:      Math.round(totalVentas * 100) / 100,
        totalUnidades,
        totalTransacciones,
        totalGanancia:    Math.round(totalGanancia * 100) / 100,
        porTipo,
      },
      topModelos,
      topCategorias,
      topClientes,
      porDia,
      periodo: { desde: desde || null, hasta: hasta || null },
      generadoEn: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
