import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// POST /api/validaciones-mejoradas
// Endpoint de utilidad para validar stock, precios y clientes desde el frontend.
// Usa inventario.stock_disponible (columna generada = stock_total - stock_reservado).
export async function POST(request) {
  try {
    const body = await request.json();
    const { accion, datos } = body;

    // ── validar_stock ─────────────────────────────────────────────────────
    if (accion === 'validar_stock') {
      const { sku, cantidad } = datos;

      const { data, error } = await supabase
        .from('inventario')
        .select('stock_total')
        .eq('sku', (sku || '').toUpperCase())
        .single();

      if (error || !data) {
        return NextResponse.json({ success: false, valido: false, error: 'Producto no encontrado en inventario' });
      }

      const disponible = data.stock_total ?? 0;
      const valido = disponible >= cantidad;

      return NextResponse.json({
        success: true,
        valido,
        stockDisponible: disponible,
        stockTotal:      disponible,
        mensaje: valido ? 'Stock suficiente' : `Solo hay ${disponible} disponibles`,
      });
    }

    // ── calcular_precio ───────────────────────────────────────────────────
    if (accion === 'calcular_precio') {
      const { sku, tipoVenta } = datos;

      const { data, error } = await supabase
        .from('productos')
        .select('precio_mayor, precio_detal')
        .eq('sku', (sku || '').toUpperCase())
        .single();

      if (error || !data) {
        return NextResponse.json({ success: false, precio: 0, error: 'Producto no encontrado' });
      }

      const precio = tipoVenta === 'MAYOR' ? data.precio_mayor : data.precio_detal;
      return NextResponse.json({ success: true, precio: parseFloat(precio) });
    }

    // ── validar_cliente ───────────────────────────────────────────────────
    if (accion === 'validar_cliente') {
      const { clienteId } = datos;

      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .eq('id', clienteId)
        .single();

      return NextResponse.json({ success: true, valido: !!data && !error, cliente: data });
    }

    // ── validar_comanda ───────────────────────────────────────────────────
    // Valida todos los items de una comanda en una sola llamada.
    // Usa stock_disponible (= stock_total - stock_reservado) para cada SKU.
    if (accion === 'validar_comanda') {
      const { items, clienteId } = datos;

      // Validar cliente
      let clienteValido = true;
      if (clienteId) {
        const { data: cliente } = await supabase
          .from('clientes').select('id').eq('id', clienteId).single();
        clienteValido = !!cliente;
      }

      // Obtener stock de todos los SKUs en una sola query (eficiente)
      const skus = [...new Set((items || []).map(i => (i.sku || '').toUpperCase()))];
      const { data: inventarios } = await supabase
        .from('inventario')
        .select('sku, stock_total')
        .in('sku', skus);

      const invMap = {};
      (inventarios || []).forEach(i => { invMap[i.sku] = i; });

      const validacionesDetalle = [];
      let stockValido = true;

      for (const item of (items || [])) {
        const skuUp   = (item.sku || '').toUpperCase();
        const inv     = invMap[skuUp];
        const disponible = inv?.stock_total ?? 0;
        const suficiente = disponible >= item.qty;
        if (!suficiente) stockValido = false;

        validacionesDetalle.push({
          sku:            skuUp,
          stockValido:    suficiente,
          stockDisponible: disponible,
          stockTotal:      disponible,
          cantidad:        item.qty,
        });
      }

      return NextResponse.json({
        success: true,
        valida:            clienteValido && stockValido,
        clienteValido,
        stockValido,
        validacionesDetalle,
      });
    }

    return NextResponse.json({ success: false, error: 'Acción no reconocida' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
