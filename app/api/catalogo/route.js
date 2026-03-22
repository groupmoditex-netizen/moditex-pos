export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

export async function GET() {
  try {
    // Productos + stock de inventario + config del catálogo
    const [
      { data: prods,  error: eProds  },
      { data: inv,    error: eInv    },
      { data: cfg,    error: eCfg   },
    ] = await Promise.all([
      supabase.from('productos').select('sku,categoria,modelo,talla,color,precio_detal,precio_mayor,stock_inicial,tela').order('categoria').order('modelo'),
      supabase.from('inventario').select('sku,stock'),
      supabase.from('catalogo_config').select('*'),
    ]);

    if (eProds) {
      console.error('[catalogo] error prods:', eProds.message);
      return NextResponse.json({ ok: false, error: eProds.message }, { status: 500, headers: HEADERS });
    }

    // Stock map: inventario.stock es el stock actualizado
    const stockMap = {};
    (inv||[]).forEach(r => { stockMap[r.sku] = r.stock; });

    // Config map
    const cfgMap = {};
    (cfg||[]).forEach(c => { cfgMap[c.modelo_key] = c; });

    // Agrupar por modelo
    const modelos = {};
    (prods||[]).forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!modelos[key]) {
        const c = cfgMap[key] || {};
        modelos[key] = {
          key, categoria: p.categoria, modelo: p.modelo,
          talla: p.talla, tela: p.tela||'',
          precioDetal:  p.precio_detal,
          precioMayor:  p.precio_mayor,
          en_catalogo:  c.en_catalogo  || false,
          foto_url:     c.foto_url     || '',
          descripcion:  c.descripcion  || '',
          fotos_extra:  c.fotos_extra  || '',
          orden:        c.orden        ?? 999,
          variantes: [],
        };
      }
      const disp = stockMap[p.sku] !== undefined
        ? stockMap[p.sku]
        : (p.stock_inicial || 0);
      const stock = Math.max(0, disp);

      modelos[key].variantes.push({
        sku:       p.sku,
        color:     p.color,
        talla:     p.talla,
        disponible: stock,
        nivel:     stock <= 0 ? 'agotado' : stock <= 3 ? 'pocas' : 'disponible',
      });
    });

    const resultado = Object.values(modelos)
      .filter(m => m.en_catalogo)
      .sort((a, b) => (a.orden - b.orden) || a.categoria.localeCompare(b.categoria) || a.modelo.localeCompare(b.modelo));

    return NextResponse.json({ ok: true, modelos: resultado }, { headers: HEADERS });
  } catch(err) {
    console.error('[catalogo] catch:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500, headers: HEADERS });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { modelo_key, en_catalogo, foto_url, descripcion, fotos_extra, orden } = body;
    if (!modelo_key) return NextResponse.json({ ok: false, error: 'modelo_key requerido' }, { status: 400 });

    const campos = { modelo_key };
    if (en_catalogo  !== undefined) campos.en_catalogo  = en_catalogo;
    if (foto_url     !== undefined) campos.foto_url     = foto_url;
    if (descripcion  !== undefined) campos.descripcion  = descripcion;
    if (fotos_extra  !== undefined) campos.fotos_extra  = fotos_extra;
    if (orden        !== undefined) campos.orden        = parseInt(orden)||0;

    const { error } = await supabase
      .from('catalogo_config')
      .upsert(campos, { onConflict: 'modelo_key' });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch(err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
