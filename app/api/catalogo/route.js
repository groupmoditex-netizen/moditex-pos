export const dynamic = 'force-dynamic';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Access-Control-Allow-Origin': '*' };

export async function GET() {
  noStore();
  try {
    const [
      { data: cfg,   error: eCfg   },
      { data: prods, error: eProds },
      { data: inv                   },
    ] = await Promise.all([
      supabase.from('catalogo_config').select('*').eq('en_catalogo', true),
      supabase.from('productos').select('sku,categoria,modelo,talla,color,precio_detal,precio_mayor,stock_inicial').order('categoria').order('modelo'),
      supabase.from('inventario').select('sku,stock_total'),
    ]);

    if (eCfg)   return NextResponse.json({ ok: false, error: 'catalogo_config: ' + eCfg.message,   step: 'cfg'   }, { status: 500, headers: HEADERS });
    if (eProds) return NextResponse.json({ ok: false, error: 'productos: '       + eProds.message, step: 'prods' }, { status: 500, headers: HEADERS });
    if (!cfg || cfg.length === 0) return NextResponse.json({ ok: true, modelos: [], debug: 'No items configured' }, { headers: HEADERS });

    // Stock real desde inventario — fuente única de verdad, consistente con dashboard
    const invMap = {};
    (inv || []).forEach(r => { invMap[r.sku] = r.stock_total; });

    const cfgMap = {};
    cfg.forEach(c => { cfgMap[c.modelo_key] = c; });

    const modelos = {};
    (prods || []).forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!cfgMap[key]) return;

      if (!modelos[key]) {
        const c = cfgMap[key];
        modelos[key] = {
          key,
          categoria:   p.categoria,
          modelo:      p.modelo,
          precioDetal: p.precio_detal || 0,
          precioMayor: p.precio_mayor || 0,
          en_catalogo: true,
          foto_url:    c.foto_url    || '',
          descripcion: c.descripcion || '',
          fotos_extra: c.fotos_extra || '',
          orden:       c.orden ?? 999,
          disponible_produccion: c.disponible_produccion || false,
          nota_produccion: c.nota_produccion || '',
          variantes:   [],
        };
      }

      // Stock desde inventario (O(1) por SKU), consistente con el POS
      const disp = Math.max(0, invMap[p.sku] ?? (p.stock_inicial || 0));
      modelos[key].variantes.push({
        sku:        p.sku,
        color:      p.color,
        talla:      p.talla,
        disponible: disp,
        nivel:      disp <= 0 ? (cfgMap[key]?.disponible_produccion ? 'produccion' : 'agotado') : disp <= 3 ? 'pocas' : 'disponible',
      });
    });

    const resultado = Object.values(modelos).sort(
      (a, b) => (a.orden - b.orden) || a.categoria.localeCompare(b.categoria)
    );

    return NextResponse.json(
      { ok: true, modelos: resultado, total: resultado.length },
      { headers: HEADERS }
    );
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message, step: 'catch' }, { status: 500, headers: HEADERS });
  }
}

export async function PUT(request) {
  noStore();
  try {
    const body = await request.json();
    const { modelo_key, en_catalogo, foto_url, descripcion, fotos_extra, orden, disponible_produccion, nota_produccion } = body;
    if (!modelo_key) return NextResponse.json({ ok: false, error: 'modelo_key requerido' }, { status: 400 });

    const { data: existing, error: selectError } = await supabase
      .from('catalogo_config')
      .select('id')
      .eq('modelo_key', modelo_key)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ ok: false, error: 'Select error: ' + selectError.message }, { status: 500 });
    }

    const campos = {};
    if (en_catalogo  !== undefined) campos.en_catalogo  = en_catalogo;
    if (foto_url     !== undefined) campos.foto_url     = foto_url;
    if (descripcion  !== undefined) campos.descripcion  = descripcion;
    if (fotos_extra  !== undefined) campos.fotos_extra  = fotos_extra;
    if (orden        !== undefined) campos.orden        = parseInt(orden) || 0;
    if (disponible_produccion !== undefined) campos.disponible_produccion = disponible_produccion;
    if (nota_produccion !== undefined)       campos.nota_produccion       = nota_produccion;
    campos.updated_at = new Date().toISOString();

    let resultId, action;

    if (existing?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('catalogo_config')
        .update(campos)
        .eq('id', existing.id)
        .select('id');

      if (updateError) {
        return NextResponse.json({ ok: false, error: 'Update error: ' + updateError.message, step: 'update' }, { status: 500 });
      }
      if (!updated || updated.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'UPDATE bloqueado (0 filas). Verifica SUPABASE_SERVICE_KEY en Vercel → Settings → Environment Variables.',
          step: 'update_zero_rows',
        }, { status: 500 });
      }
      resultId = updated[0].id;
      action = 'updated';
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('catalogo_config')
        .insert({ modelo_key, ...campos })
        .select('id');

      if (insertError) {
        return NextResponse.json({ ok: false, error: 'Insert error: ' + insertError.message, step: 'insert' }, { status: 500 });
      }
      if (!inserted || inserted.length === 0) {
        return NextResponse.json({ ok: false, error: 'INSERT bloqueado (0 filas). Verifica RLS.', step: 'insert_zero_rows' }, { status: 500 });
      }
      resultId = inserted[0].id;
      action = 'inserted';
    }

    return NextResponse.json({ ok: true, id: resultId, action });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message, step: 'catch' }, { status: 500 });
  }
}