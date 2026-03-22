export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const HEADERS = { 'Cache-Control':'no-store', 'Access-Control-Allow-Origin':'*' };

export async function GET() {
  try {
    const [
      { data: cfg,   error: eCfg  },
      { data: prods, error: eProds },
      { data: inv                  },
    ] = await Promise.all([
      supabase.from('catalogo_config').select('*').eq('en_catalogo', true),
      supabase.from('productos').select('sku,categoria,modelo,talla,color,precio_detal,precio_mayor,stock_inicial,tela').order('categoria').order('modelo'),
      supabase.from('inventario').select('sku,stock'),
    ]);

    if (eCfg)   return NextResponse.json({ ok:false, error:'catalogo_config: '+eCfg.message,   step:'cfg'   }, { status:500, headers:HEADERS });
    if (eProds) return NextResponse.json({ ok:false, error:'productos: '+eProds.message,        step:'prods' }, { status:500, headers:HEADERS });
    if (!cfg || cfg.length === 0) return NextResponse.json({ ok:true, modelos:[], debug:'No items configured' }, { headers:HEADERS });

    const stockMap = {};
    (inv||[]).forEach(r => { stockMap[r.sku] = r.stock; });

    const cfgMap = {};
    cfg.forEach(c => { cfgMap[c.modelo_key] = c; });

    const modelos = {};
    (prods||[]).forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!cfgMap[key]) return;
      if (!modelos[key]) {
        const c = cfgMap[key];
        modelos[key] = {
          key, categoria:p.categoria, modelo:p.modelo, talla:p.talla, tela:p.tela||'',
          precioDetal:p.precio_detal, precioMayor:p.precio_mayor,
          en_catalogo:true, foto_url:c.foto_url||'', descripcion:c.descripcion||'',
          fotos_extra:c.fotos_extra||'', orden:c.orden??999, variantes:[],
        };
      }
      const stock = stockMap[p.sku] !== undefined ? stockMap[p.sku] : (p.stock_inicial||0);
      const disp = Math.max(0, stock);
      modelos[key].variantes.push({ sku:p.sku, color:p.color, talla:p.talla, disponible:disp, nivel:disp<=0?'agotado':disp<=3?'pocas':'disponible' });
    });

    const resultado = Object.values(modelos).sort((a,b) => (a.orden-b.orden)||a.categoria.localeCompare(b.categoria));
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

    // ── Check if record exists ────────────────────────────────────
    const { data: existing, error: selectError } = await supabase
      .from('catalogo_config')
      .select('id')
      .eq('modelo_key', modelo_key)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ ok:false, error:'Error al buscar registro: ' + selectError.message, step:'select' }, { status:500 });
    }

    const campos = {};
    if (en_catalogo  !== undefined) campos.en_catalogo  = en_catalogo;
    if (foto_url     !== undefined) campos.foto_url     = foto_url;
    if (descripcion  !== undefined) campos.descripcion  = descripcion;
    if (fotos_extra  !== undefined) campos.fotos_extra  = fotos_extra;
    if (orden        !== undefined) campos.orden        = parseInt(orden)||0;

    let resultId;
    let action;

    if (existing?.id) {
      // ── UPDATE — pedir de vuelta el registro para confirmar que cambió ──
      const { data: updated, error: updateError } = await supabase
        .from('catalogo_config')
        .update(campos)
        .eq('id', existing.id)
        .select('id, en_catalogo');  // <-- CRÍTICO: detecta si RLS bloqueó silenciosamente

      if (updateError) {
        return NextResponse.json({
          ok: false,
          error: 'Error en UPDATE: ' + updateError.message,
          step: 'update',
        }, { status:500 });
      }

      // Si RLS bloquea el UPDATE, Supabase devuelve data:[] sin error.
      // Sin este check, el API respondería ok:true aunque nada haya cambiado.
      if (!updated || updated.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'El UPDATE no afectó ninguna fila. Posible bloqueo de RLS o permisos insuficientes. Verifica SUPABASE_SERVICE_KEY en Vercel y ejecuta CATALOGO.sql en Supabase.',
          step: 'update_zero_rows',
          debug: { id: existing.id, campos },
        }, { status:500 });
      }

      resultId = updated[0].id;
      action = 'updated';

    } else {
      // ── INSERT ────────────────────────────────────────────────────
      const { data: inserted, error: insertError } = await supabase
        .from('catalogo_config')
        .insert({ modelo_key, ...campos })
        .select('id');

      if (insertError) {
        return NextResponse.json({
          ok: false,
          error: 'Error en INSERT: ' + insertError.message,
          step: 'insert',
        }, { status:500 });
      }

      if (!inserted || inserted.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'El INSERT no devolvió datos. Verifica permisos RLS.',
          step: 'insert_zero_rows',
        }, { status:500 });
      }

      resultId = inserted[0].id;
      action = 'inserted';
    }

    return NextResponse.json({ ok:true, id: resultId, action });

  } catch(err) {
    return NextResponse.json({ ok:false, error:err.message, step:'catch' }, { status:500 });
  }
}