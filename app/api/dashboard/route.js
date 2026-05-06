export const dynamic    = 'force-dynamic';
export const revalidate = 0;

import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/dashboard
// Antes: recalculaba stock desde stock_inicial + movimientos (full-table-scan, limitado a 500 movs).
// Ahora: lee stock_disponible directamente de inventario (O(1) por SKU).
export async function GET() {
  try {
    const [rProductos, rInventario, rMovimientos, rClientes, rComandas, rComentarios] = await Promise.all([
      supabase
        .from('productos')
        .select('sku,categoria,modelo,talla,color,precio_detal,precio_mayor,precio_costo,stock_inicial,tela,alias')
        .order('categoria')
        .order('modelo'),

      // ✅ Stock real desde inventario — sin recalcular
      supabase
        .from('inventario')
        .select('sku,stock_total'),

      // Movimientos solo para historial/métricas de ventas (no para calcular stock)
      supabase
        .from('movimientos')
        .select('sku,tipo,cantidad,id,fecha,concepto,contacto,tipo_venta,precio_venta,cliente_id,created_at')
        .order('created_at', { ascending: false })
        .limit(500),

      supabase
        .from('clientes')
        .select('id,nombre,cedula,telefono,email,ciudad,fecha_registro')
        .order('nombre')
        .limit(2000),

      supabase
        .from('comandas')
        .select('id,cliente,cliente_id,productos,precio,monto_pagado,status,notas,fecha_entrega,fecha_creacion,created_at')
        .order('created_at', { ascending: false })
        .limit(100),

      supabase
        .from('comanda_comentarios')
        .select('comanda_id')
    ]);

    // Mapear inventario por SKU → O(1) lookup
    const invMap = {};
    (rInventario.data || []).forEach(i => { invMap[i.sku] = i; });

    // Mapear conteos de comentarios
    const countsMap = (rComentarios.data || []).reduce((acc, c) => {
      acc[c.comanda_id] = (acc[c.comanda_id] || 0) + 1;
      return acc;
    }, {});

    // Calcular entradas/salidas desde movimientos (solo para display)
    const entMap = {}, salMap = {};
    (rMovimientos.data || []).forEach(m => {
      if      (m.tipo === 'ENTRADA') entMap[m.sku] = (entMap[m.sku] || 0) + m.cantidad;
      else if (m.tipo === 'SALIDA')  salMap[m.sku] = (salMap[m.sku] || 0) + m.cantidad;
    });

    const productos = (rProductos.data || []).map(p => ({
      sku:            p.sku,
      categoria:      p.categoria,
      modelo:         p.modelo,
      talla:          p.talla,
      color:          p.color,
      precioDetal:    p.precio_detal,
      precioMayor:    p.precio_mayor,
      precioCosto:    p.precio_costo || 0,
      stockInicial:   p.stock_inicial || 0,
      tela:           p.tela || '',
      alias:          p.alias || '',

      // ✅ Fuente única de verdad: inventario.stock_disponible
      disponible:     invMap[p.sku]?.stock_total     ?? p.stock_inicial ?? 0,
      stockTotal:     invMap[p.sku]?.stock_total     ?? p.stock_inicial ?? 0,

      // Entradas/salidas del período (limitado a últimos 500 movs, para display)
      entradas: entMap[p.sku] || 0,
      salidas:  salMap[p.sku] || 0,
    }));

    // Métricas de clientes (gasto y pedidos)
    const gastoMap = {}, pedidosMap = {};
    (rMovimientos.data || []).forEach(m => {
      if (m.tipo !== 'SALIDA') return;
      const ref = m.cliente_id || m.contacto || '';
      if (!ref) return;
      gastoMap[ref]   = (gastoMap[ref]   || 0) + ((m.precio_venta || 0) * m.cantidad);
      pedidosMap[ref] = (pedidosMap[ref] || 0) + 1;
    });

    const clientes = (rClientes.data || []).map(c => ({
      ...c,
      totalGastado: gastoMap[c.id]     || gastoMap[c.nombre] || 0,
      totalPedidos: pedidosMap[c.id]   || pedidosMap[c.nombre] || 0,
    }));

    const movimientos = (rMovimientos.data || []).map(m => ({
      id:          m.id,
      fecha:       m.fecha ? String(m.fecha).split('T')[0] : String(m.created_at || '').split('T')[0],
      sku:         m.sku,
      tipo:        m.tipo,
      cantidad:    m.cantidad,
      concepto:    m.concepto    || '',
      contacto:    m.contacto   || '',
      tipoVenta:   m.tipo_venta || '',
      precioVenta: m.precio_venta || 0,
      clienteId:   m.cliente_id  || '',
    }));

    const comandas = (rComandas.data || []).map(cmd => {
      let p = cmd.productos;
      if (typeof p === 'string') try { p = JSON.parse(p); } catch { p = []; }
      if (!Array.isArray(p)) p = [];
      const resumen = p.map(i => `${i.modelo || ''} ${i.sku || ''}`).join(' ');
      const totalItems = p.reduce((a, b) => a + (parseInt(b.cant || b.cantidad || 1)), 0);

      const telasSet = new Set();
      p.forEach(i => { if (i.tela) telasSet.add(i.tela); });
      const telasIdx = Array.from(telasSet).join(' ');

      const cleaned = { ...cmd };
      delete cleaned.productos;

      return {
        ...cleaned,
        comentarios_count: countsMap[cmd.id] || 0,
        items_resumen: resumen,
        items_count: totalItems,
        telas_idx: telasIdx
      };
    });

    return NextResponse.json(
      { ok: true, productos, movimientos, clientes, comandas },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma':        'no-cache',
          'Expires':       '0',
        },
      }
    );

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}