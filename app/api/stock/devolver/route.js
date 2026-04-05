import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { sku, cantidad } = await request.json();

    const { data: inv } = await supabase
      .from('inventario')
      .select('stock')
      .eq('sku', sku)
      .single();

    if (!inv) {
      return NextResponse.json({
        ok: false,
        mensaje: 'Producto no encontrado'
      }, { status: 404 });
    }

    await supabase
      .from('inventario')
      .update({ 
        stock: inv.stock + cantidad,
        updated_at: new Date().toISOString()
      })
      .eq('sku', sku);

    return NextResponse.json({
      ok: true,
      stockActual: inv.stock + cantidad
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      mensaje: error.message
    }, { status: 500 });
  }
}
