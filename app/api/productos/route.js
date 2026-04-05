export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { generarSku as genSku } from '@/utils/generarSku';
import { NextResponse } from 'next/server';


// GET /api/productos
export async function GET() {
  try {
    const [{ data: prods }, { data: inv }] = await Promise.all([
      supabase.from('productos').select('*').order('categoria').order('modelo'),
      supabase.from('inventario').select('sku,stock'),
    ]);
    // inventario.stock ES el stock actualizado — ya incluye entradas/salidas
    const stockMap={};
    (inv||[]).forEach(r=>{ stockMap[r.sku]=r.stock; });

    const resultado = (prods||[]).map(p=>({
      sku:p.sku, categoria:p.categoria, modelo:p.modelo, talla:p.talla, color:p.color,
      precioDetal:p.precio_detal, precioMayor:p.precio_mayor, precioCosto:p.precio_costo||0,
      stockInicial:p.stock_inicial, tela:p.tela||'',
      disponible: stockMap[p.sku] !== undefined ? stockMap[p.sku] : p.stock_inicial,
      entradas:0, salidas:0,
    }));

    // ✅ Cache-Control explícito — evita que el navegador y CDN cacheen esta respuesta
    return NextResponse.json(resultado, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });
  } catch(err) {
    return NextResponse.json({ ok:false, error:err.message }, { status:500 });
  }
}

// POST /api/productos — crea múltiples variantes (una por color)
export async function POST(request) {
  try {
    const body = await request.json();
    const { categoria, modelo, talla, precioDetal, precioMayor, precioCosto, colores } = body;

    if (!categoria) return NextResponse.json({ok:false,error:'Categoría requerida'},{status:400});
    if (!modelo)    return NextResponse.json({ok:false,error:'Modelo requerido'},{status:400});
    if (!precioDetal || precioDetal<=0) return NextResponse.json({ok:false,error:'Precio detal requerido'},{status:400});
    if (!colores?.length) return NextResponse.json({ok:false,error:'Al menos un color requerido'},{status:400});

    const skusCreados = [];

    for (const c of colores) {
      if (!c.color?.trim()) continue;

      let sku = c.sku || genSku(categoria, modelo, talla);
      let intentos = 0;
      while (intentos < 5) {
        const { data: existe } = await supabase.from('productos').select('sku').eq('sku', sku).single();
        if (!existe) break;
        sku = genSku(categoria, modelo, talla);
        intentos++;
      }

      const stockIni = parseInt(c.stockInicial) || 0;

      const { error: errProd } = await supabase.from('productos').insert({
        sku, categoria: categoria.toUpperCase(), modelo: modelo.toUpperCase(),
        talla, color: c.color.toUpperCase(),
        precio_detal: parseFloat(precioDetal), precio_mayor: parseFloat(precioMayor)||0,
        precio_costo: parseFloat(precioCosto)||0, stock_inicial: stockIni,
      });
      if (errProd) continue;

      await supabase.from('inventario').insert({ sku, stock: stockIni });
      skusCreados.push(sku);
    }

    if (!skusCreados.length)
      return NextResponse.json({ok:false,error:'No se pudo crear ninguna variante'},{status:500});

    await supabase.from('logs').insert({
      usuario:'sistema', accion:'REGISTRAR_PRODUCTO',
      detalle:`Modelo: ${modelo} | SKUs: ${skusCreados.join(', ')}`, resultado:'OK',
    });

    return NextResponse.json({ ok: true, skus: skusCreados, count: skusCreados.length });
  } catch(err) {
    return NextResponse.json({ok:false,error:err.message},{status:500});
  }
}