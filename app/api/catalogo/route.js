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
      { data: movs                  },
    ] = await Promise.all([
      supabase.from('catalogo_config').select('*').eq('en_catalogo', true),
      supabase.from('productos').select('sku,categoria,modelo,talla,color,precio_detal,precio_mayor,stock_inicial').order('categoria').order('modelo'),
      supabase.from('movimientos').select('sku,tipo,cantidad').in('tipo', ['ENTRADA','SALIDA','RESERVA']),
    ]);

    if (eCfg)   return NextResponse.json({ ok: false, error: 'catalogo_config: ' + eCfg.message,   step: 'cfg'   }, { status: 500, headers: HEADERS });
    if (eProds) return NextResponse.json({ ok: false, error: 'productos: '       + eProds.message, step: 'prods' }, { status: 500, headers: HEADERS });
    if (!cfg || cfg.length === 0) return NextResponse.json({ ok: true, modelos: [], debug: 'No items configured' }, { headers: HEADERS });

    // Mismo criterio que /api/dashboard:
    // disponible = stock_inicial + entradas - salidas  (calculado desde movimientos)
    const entMap = {}, salMap = {}, resMap = {};
    (movs || []).forEach(m => {
      if (m.tipo === 'ENTRADA')       entMap[m.sku] = (entMap[m.sku] || 0) + m.cantidad;
      else if (m.tipo === 'SALIDA')   salMap[m.sku] = (salMap[m.sku] || 0) + m.cantidad;
      else if (m.tipo === 'RESERVA')  resMap[m.sku] = (resMap[m.sku] || 0) + m.cantidad;
    });
    const stockMap = {};

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
          variantes:   [],
        };
      }

      // Misma lógica que /api/productos — inventario primero, stock_inicial como respaldo
      const disp = Math.max(0, (p.stock_inicial || 0) + (entMap[p.sku] || 0) - (salMap[p.sku] || 0) - (resMap[p.sku] || 0));
      modelos[key].variantes.push({
        sku:        p.sku,
        color:      p.color,
        talla:      p.talla,
        disponible: disp,
        nivel:      disp <= 0 ? 'agotado' : disp <= 3 ? 'pocas' : 'disponible',
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
    const { modelo_key, en_catalogo, foto_url, descripcion, fotos_extra, orden } = body;
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