export const dynamic    = 'force-dynamic';
export const revalidate = 0;  // ✅ Vercel Edge: nunca cachear esta ruta

import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('productos').select('sku,categoria,modelo,talla,color,precio_detal,precio_mayor,precio_costo,stock_inicial').order('categoria').order('modelo'),
      supabase.from('movimientos').select('sku,tipo,cantidad,id,fecha,concepto,contacto,tipo_venta,precio_venta,cliente_id,created_at').order('created_at',{ascending:false}).limit(500),
      supabase.from('clientes').select('id,nombre,cedula,telefono,email,ciudad,fecha_registro').order('nombre').limit(2000),
      supabase.from('comandas').select('id,cliente,cliente_id,productos,precio,monto_pagado,status,notas,fecha_entrega,fecha_creacion,created_at').order('created_at',{ascending:false}).limit(100),
    ]);

    const entMap = {}, salMap = {};
    (r2.data||[]).forEach(m => {
      if      (m.tipo==='ENTRADA') entMap[m.sku] = (entMap[m.sku]||0) + m.cantidad;
      else if (m.tipo==='SALIDA')  salMap[m.sku] = (salMap[m.sku]||0) + m.cantidad;
    });

    const productos = (r1.data||[]).map(p => ({
      sku:          p.sku,
      categoria:    p.categoria,
      modelo:       p.modelo,
      talla:        p.talla,
      color:        p.color,
      precioDetal:  p.precio_detal,
      precioMayor:  p.precio_mayor,
      precioCosto:  p.precio_costo || 0,
      stockInicial: p.stock_inicial || 0,
      disponible:   Math.max(0, (p.stock_inicial||0) + (entMap[p.sku]||0) - (salMap[p.sku]||0)),
      entradas:     entMap[p.sku] || 0,
      salidas:      salMap[p.sku] || 0,
    }));

    const gMap = {}, pMap = {};
    (r2.data||[]).forEach(m => {
      if (m.tipo !== 'SALIDA') return;
      const ref = m.cliente_id || m.contacto || '';
      if (!ref) return;
      gMap[ref] = (gMap[ref]||0) + ((m.precio_venta||0) * m.cantidad);
      pMap[ref] = (pMap[ref]||0) + 1;
    });

    const clientes = (r3.data||[]).map(c => ({
      ...c,
      totalGastado: gMap[c.id] || gMap[c.nombre] || 0,
      totalPedidos: pMap[c.id] || pMap[c.nombre] || 0,
    }));

    const movimientos = (r2.data||[]).map(m => ({
      id:          m.id,
      fecha:       m.fecha ? String(m.fecha).split('T')[0] : String(m.created_at||'').split('T')[0],
      sku:         m.sku,
      tipo:        m.tipo,
      cantidad:    m.cantidad,
      concepto:    m.concepto    || '',
      contacto:    m.contacto    || '',
      tipoVenta:   m.tipo_venta  || '',
      precioVenta: m.precio_venta || 0,
      clienteId:   m.cliente_id  || '',
    }));

    return NextResponse.json(
      { ok:true, productos, movimientos, clientes, comandas: r4.data||[] },
      {
        headers: {
          // ✅ Triple cobertura anti-caché:
          // 1. Vercel Edge CDN no cachea
          // 2. Navegador no cachea
          // 3. Proxies intermedios no cachean
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma':        'no-cache',
          'Expires':       '0',
        },
      }
    );
  } catch(err) {
    return NextResponse.json({ ok:false, error:err.message }, { status:500 });
  }
}