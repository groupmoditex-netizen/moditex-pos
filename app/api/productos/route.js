export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { generarSku as genSku } from '@/utils/generarSku';
import { NextResponse } from 'next/server';

// GET /api/productos
// Antes: leía de tabla `inventario.stock` (campo ambiguo, diferente al dashboard).
// Ahora: lee `inventario.stock_disponible` → fuente única de verdad, igual que el dashboard.
export async function GET() {
  try {
    const [{ data: prods, error: errP }, { data: inv, error: errI }] = await Promise.all([
      supabase.from('productos').select('*').order('categoria').order('modelo'),
      supabase.from('inventario').select('sku,stock_total'),
    ]);

    if (errP) return NextResponse.json({ ok: false, error: errP.message }, { status: 500 });

    // Mapear inventario por SKU
    const stockMap = {};
    (inv || []).forEach(r => { stockMap[r.sku] = r; });

    const resultado = (prods || []).map(p => ({
      sku:          p.sku,
      categoria:    p.categoria,
      modelo:       p.modelo,
      talla:        p.talla,
      color:        p.color,
      precioDetal:  p.precio_detal,
      precioMayor:  p.precio_mayor,
      precioCosto:  p.precio_costo  || 0,
      stockInicial: p.stock_inicial || 0,
      tela:         p.tela || '',
      activo:       p.activo,

      // ✅ Reglas de precio mayorista configurables por modelo
      minMayorista:        p.min_mayorista        ?? 6,
      modelosMinMayorista: p.modelos_min_mayorista ?? 3,

      // ✅ Fuente única: inventario.stock_disponible (mismo que el dashboard)
      disponible:      stockMap[p.sku]?.stock_total    ?? p.stock_inicial ?? 0,
      stockTotal:      stockMap[p.sku]?.stock_total    ?? p.stock_inicial ?? 0,

      // Estos campos se calculan en el dashboard; aquí son 0 para no duplicar queries
      entradas: 0,
      salidas:  0,
    }));

    return NextResponse.json(resultado, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma':        'no-cache',
      },
    });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// POST /api/productos — crea múltiples variantes de un modelo
export async function POST(request) {
  try {
    const body = await request.json();
    const { categoria, modelo, talla, precioDetal, precioMayor, precioCosto, colores } = body;

    if (!categoria) return NextResponse.json({ ok: false, error: 'Categoría requerida' }, { status: 400 });
    if (!modelo)    return NextResponse.json({ ok: false, error: 'Modelo requerido' },    { status: 400 });
    if (!precioDetal || precioDetal <= 0)
      return NextResponse.json({ ok: false, error: 'Precio detal requerido' }, { status: 400 });
    if (!colores?.length)
      return NextResponse.json({ ok: false, error: 'Al menos un color requerido' }, { status: 400 });

    const skusCreados = [];

    for (const c of colores) {
      if (!c.color?.trim()) continue;

      // Generar SKU único
      let sku = c.sku || genSku(categoria, modelo, talla);
      for (let intentos = 0; intentos < 5; intentos++) {
        const { data: existe } = await supabase.from('productos').select('sku').eq('sku', sku).single();
        if (!existe) break;
        sku = genSku(categoria, modelo, talla);
      }

      const stockIni = parseInt(c.stockInicial) || 0;

      const { error: errProd } = await supabase.from('productos').insert({
        sku,
        categoria:    categoria.toUpperCase(),
        modelo:       modelo.toUpperCase(),
        talla,
        color:        c.color.toUpperCase(),
        precio_detal: parseFloat(precioDetal),
        precio_mayor: parseFloat(precioMayor) || 0,
        precio_costo: parseFloat(precioCosto) || 0,
        stock_inicial: stockIni,
      });
      if (errProd) continue;

      // El trigger fn_init_inventario crea la fila en inventario automáticamente.
      // Si el stock inicial > 0, hacemos un AJUSTE para sincronizarlo.
      if (stockIni > 0) {
        try {
          await supabase.rpc('registrar_movimiento_atomico', {
            p_sku:         sku,
            p_tipo:        'AJUSTE',
            p_cantidad:    stockIni,
            p_concepto:    'Stock inicial al crear producto',
            p_contacto:    '',
            p_referencia:  '',
            p_tipo_venta:  '',
            p_precio_venta: 0,
            p_cliente_id:  '',
            p_usuario:     'sistema',
          });
        } catch (_) {}
      }

      skusCreados.push(sku);
    }

    if (!skusCreados.length)
      return NextResponse.json({ ok: false, error: 'No se pudo crear ninguna variante' }, { status: 500 });

    await supabase.from('logs').insert({
      usuario: 'sistema', accion: 'REGISTRAR_PRODUCTO',
      detalle: `Modelo:${modelo} | SKUs:${skusCreados.join(', ')}`, resultado: 'OK',
    });

    return NextResponse.json({ ok: true, skus: skusCreados, count: skusCreados.length });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}