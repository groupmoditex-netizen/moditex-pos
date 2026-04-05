// BUGFIX: faltaba export const dynamic — Next.js podía cachear esta ruta en producción
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { generarId } from '@/utils/generarId';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const items = await request.json();

    const filas = items.map(d => ({
      id: generarId('MOV'),
      fecha: d.fecha || new Date().toISOString(),
      sku: d.sku.toUpperCase(),
      tipo: d.tipo.toUpperCase(),
      cantidad: d.cantidad,
      concepto: d.concepto || '',
      contacto: d.contacto || '',
      tipo_venta: d.tipo_venta || '',
      precio_venta: d.precio_venta || 0,
      cliente_id: d.cliente_id || null
    }));

    const { error } = await supabase
      .from('movimientos')
      .insert(filas);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: filas.length
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}
