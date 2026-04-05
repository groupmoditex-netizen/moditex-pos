import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { accion, datos } = body;

    // Validar stock
    if (accion === 'validar_stock') {
      const { sku, cantidad } = datos;
      
      const { data, error } = await supabase
        .from('inventario')
        .select('stock')
        .eq('sku', sku)
        .single();
      
      if (error || !data) {
        return NextResponse.json({
          success: false,
          valido: false,
          error: 'Producto no encontrado'
        });
      }
      
      const valido = data.stock >= cantidad;
      
      return NextResponse.json({
        success: true,
        valido,
        stockDisponible: data.stock,
        mensaje: valido ? 'Stock suficiente' : `Solo hay ${data.stock} disponibles` 
      });
    }

    // Calcular precio
    if (accion === 'calcular_precio') {
      const { sku, tipoVenta } = datos;
      
      const { data, error } = await supabase
        .from('productos')
        .select('precio_mayor, precio_detal')
        .eq('sku', sku)
        .single();
      
      if (error || !data) {
        return NextResponse.json({
          success: false,
          precio: 0,
          error: 'Producto no encontrado'
        });
      }
      
      const precio = tipoVenta === 'MAYOR' ? data.precio_mayor : data.precio_detal;
      
      return NextResponse.json({
        success: true,
        precio: parseFloat(precio)
      });
    }

    // Validar cliente
    if (accion === 'validar_cliente') {
      const { clienteId } = datos;
      
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .eq('id', clienteId)
        .single();
      
      return NextResponse.json({
        success: true,
        valido: !!data && !error,
        cliente: data
      });
    }

    // Validar comanda completa
    if (accion === 'validar_comanda') {
      const { items, clienteId } = datos;
      
      // Validar cliente si se proporciona
      let clienteValido = true;
      if (clienteId) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('id')
          .eq('id', clienteId)
          .single();
        clienteValido = !!cliente;
      }
      
      // Validar stock de cada item
      const validacionesDetalle = [];
      let stockValido = true;
      
      for (const item of items) {
        const { data: inv } = await supabase
          .from('inventario')
          .select('stock')
          .eq('sku', item.sku)
          .single();
        
        const stockSuficiente = inv && inv.stock >= item.qty;
        if (!stockSuficiente) stockValido = false;
        
        validacionesDetalle.push({
          sku: item.sku,
          stockValido: stockSuficiente,
          stockDisponible: inv?.stock || 0,
          cantidad: item.qty
        });
      }
      
      return NextResponse.json({
        success: true,
        valida: clienteValido && stockValido,
        clienteValido,
        stockValido,
        validacionesDetalle
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Acción no reconocida'
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
