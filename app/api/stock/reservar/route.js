import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { sku, cantidad, tipo_venta } = await request.json();

    // Validar input
    if (!sku || !cantidad) {
      return NextResponse.json({
        ok: false,
        exitoso: false,
        mensaje: 'SKU y cantidad son requeridos'
      }, { status: 400 });
    }

    // Llamar función atómica de Supabase
    const { data, error } = await supabase
      .rpc('reservar_stock_atomico', {
        p_sku: sku.toUpperCase(),
        p_cantidad: parseInt(cantidad),
        p_tipo_venta: tipo_venta || 'MAYOR'
      });

    if (error) {
      return NextResponse.json({
        ok: false,
        exitoso: false,
        mensaje: error.message
      }, { status: 500 });
    }

    const resultado = data[0];

    return NextResponse.json({
      ok: true,
      exitoso: resultado.exitoso,
      stockRestante: resultado.stock_restante,
      precioAplicado: resultado.precio_aplicado,
      mensaje: resultado.mensaje
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      exitoso: false,
      mensaje: error.message
    }, { status: 500 });
  }
}
