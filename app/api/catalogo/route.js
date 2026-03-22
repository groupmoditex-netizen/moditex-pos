export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const HEADERS = { 'Cache-Control':'no-store', 'Access-Control-Allow-Origin':'*' };

export async function GET() {
  try {
    // Step 1: Get catalog config (which items to show + their photos/descriptions)
    const { data: cfg, error: eCfg } = await supabase
      .from('catalogo_config')
      .select('*')
      .eq('en_catalogo', true);

    if (eCfg) {
      return NextResponse.json({ ok:false, error:'catalogo_config: '+eCfg.message, step:'cfg' }, { status:500, headers:HEADERS });
    }

    // If no items configured, return empty early
    if (!cfg || cfg.length === 0) {
      return NextResponse.json({ ok:true, modelos:[], debug:'No items in catalog' }, { headers:HEADERS });
    }

    // Step 2: Get products
    const { data: prods, error: eProds } = await supabase
      .from('productos')
      .select('sku,categoria,modelo,talla,color,precio_detal,precio_mayor,stock_inicial,tela')
      .order('categoria').order('modelo');

    if (eProds) {
      return NextResponse.json({ ok:false, error:'productos: '+eProds.message, step:'prods' }, { status:500, headers:HEADERS });
    }

    // Step 3: Get stock
    const { data: inv } = await supabase.from('inventario').select('sku,stock');
    const stockMap = {};
    (inv||[]).forEach(r => { stockMap[r.sku] = r.stock; });

    // Build config map keyed by modelo_key
    const cfgMap = {};
    cfg.forEach(c => { cfgMap[c.modelo_key] = c; });

    // Group products by model key
    const modelos = {};
    (prods||[]).forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!cfgMap[key]) return; // Skip if not in catalog

      if (!modelos[key]) {
        const c = cfgMap[key];
        modelos[key] = {
          key, categoria:p.categoria, modelo:p.modelo,
          talla:p.talla, tela:p.tela||'',
          precioDetal:p.precio_detal, precioMayor:p.precio_mayor,
          en_catalogo:true,
          foto_url:    c.foto_url    || '',
          descripcion: c.descripcion || '',
          fotos_extra: c.fotos_extra || '',
          orden:       c.orden       ?? 999,
          variantes:[],
        };
      }
      const stock = stockMap[p.sku] !== undefined ? stockMap[p.sku] : (p.stock_inicial||0);
      const disp  = Math.max(0, stock);
      modelos[key].variantes.push({
        sku:p.sku, color:p.color, talla:p.talla,
        disponible: disp,
        nivel: disp<=0 ? 'agotado' : disp<=3 ? 'pocas' : 'disponible',
      });
    });

    const resultado = Object.values(modelos)
      .sort((a,b) => (a.orden-b.orden) || a.categoria.localeCompare(b.categoria));

    return NextResponse.json({ ok:true, modelos:resultado, total:resultado.length }, { headers:HEADERS });

  } catch(err) {
    return NextResponse.json({ ok:false, error:err.message, step:'catch' }, { status:500, headers:HEADERS });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { modelo_key, en_catalogo, foto_url, descripcion, fotos_extra, orden } = body;
    if (!modelo_key) return NextResponse.json({ ok:false, error:'modelo_key requerido' }, { status:400 });

    const campos = { modelo_key };
    if (en_catalogo  !== undefined) campos.en_catalogo  = en_catalogo;
    if (foto_url     !== undefined) campos.foto_url     = foto_url;
    if (descripcion  !== undefined) campos.descripcion  = descripcion;
    if (fotos_extra  !== undefined) campos.fotos_extra  = fotos_extra;
    if (orden        !== undefined) campos.orden        = parseInt(orden)||0;

    const { error } = await supabase
      .from('catalogo_config')
      .upsert(campos, { onConflict:'modelo_key' });

    if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 });
    return NextResponse.json({ ok:true });
  } catch(err) {
    return NextResponse.json({ ok:false, error:err.message }, { status:500 });
  }
}
