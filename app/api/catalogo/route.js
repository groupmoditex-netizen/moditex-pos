export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
};

// GET /api/catalogo — público, sin auth
// Devuelve productos configurados para el catálogo con stock simplificado
export async function GET() {
  try {
    const [{ data: prods }, { data: inv }, { data: movs }, { data: cfg }] = await Promise.all([
      supabase.from('productos').select('*').order('categoria').order('modelo'),
      supabase.from('inventario').select('sku,stock'),
      supabase.from('movimientos').select('sku,tipo,cantidad'),
      supabase.from('catalogo_config').select('*'),
    ]);

    // Calcular stock real por SKU
    const stockMap = {};
    (inv||[]).forEach(r => { stockMap[r.sku] = r.stock; });
    (movs||[]).forEach(m => {
      if (m.tipo === 'ENTRADA') stockMap[m.sku] = (stockMap[m.sku]||0) + m.cantidad;
      else if (m.tipo === 'SALIDA') stockMap[m.sku] = (stockMap[m.sku]||0) - m.cantidad;
    });

    // Config del catálogo por modelo
    const cfgMap = {};
    (cfg||[]).forEach(c => { cfgMap[c.modelo_key] = c; });

    // Agrupar productos por modelo
    const modelos = {};
    (prods||[]).forEach(p => {
      const key = `${p.categoria}__${p.modelo}`;
      if (!modelos[key]) {
        modelos[key] = {
          key, categoria: p.categoria, modelo: p.modelo,
          talla: p.talla, tela: p.tela||'',
          precioDetal: p.precio_detal, precioMayor: p.precio_mayor,
          variantes: [],
          // Config del catálogo
          en_catalogo: cfgMap[key]?.en_catalogo ?? false,
          foto_url: cfgMap[key]?.foto_url || '',
          descripcion: cfgMap[key]?.descripcion || '',
          fotos_extra: cfgMap[key]?.fotos_extra || '',
          orden: cfgMap[key]?.orden || 999,
        };
      }
      const disp = stockMap[p.sku] !== undefined ? stockMap[p.sku] : (p.stock_inicial||0);
      modelos[key].variantes.push({
        sku: p.sku, color: p.color, talla: p.talla,
        disponible: Math.max(0, disp),
        // Nivel de stock para mostrar al cliente (sin números exactos)
        nivel: disp <= 0 ? 'agotado' : disp <= 3 ? 'pocas' : 'disponible',
      });
    });

    // Solo retornar los que están en catálogo, ordenados
    const resultado = Object.values(modelos)
      .filter(m => m.en_catalogo)
      .sort((a, b) => a.orden - b.orden || a.categoria.localeCompare(b.categoria));

    return NextResponse.json({ ok: true, modelos: resultado }, { headers: HEADERS });
  } catch(err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500, headers: HEADERS });
  }
}

// PUT /api/catalogo — actualizar config de un modelo (requiere auth via header check)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { modelo_key, en_catalogo, foto_url, descripcion, fotos_extra, orden } = body;
    if (!modelo_key) return NextResponse.json({ ok: false, error: 'modelo_key requerido' }, { status: 400 });

    const campos = { modelo_key };
    if (en_catalogo  !== undefined) campos.en_catalogo  = en_catalogo;
    if (foto_url     !== undefined) campos.foto_url      = foto_url;
    if (descripcion  !== undefined) campos.descripcion   = descripcion;
    if (fotos_extra  !== undefined) campos.fotos_extra   = fotos_extra;
    if (orden        !== undefined) campos.orden         = parseInt(orden)||0;

    const { error } = await supabase
      .from('catalogo_config')
      .upsert(campos, { onConflict: 'modelo_key' });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch(err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
