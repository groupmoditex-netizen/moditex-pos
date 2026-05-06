export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { generarId } from '@/utils/generarId';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';
import { NextResponse } from 'next/server';

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    let r = await supabase
      .from('comandas')
      .select('id, cliente, cliente_id, productos, precio, monto_pagado, status, notas, fecha_entrega, fecha_creacion, created_at, agencia_envio, guia_envio')
      .order('created_at', { ascending: false })
      .limit(300);

    if (r.error) return NextResponse.json({ ok: false, error: r.error.message }, { status: 500 });

    const rawComandas = r.data || [];
    
    // --- OPTIMIZACIÓN DE COMENTARIOS ---
    const { data: countsData } = await supabase
      .from('comanda_comentarios')
      .select('comanda_id');
    
    const countsMap = (countsData || []).reduce((acc, c) => {
      acc[c.comanda_id] = (acc[c.comanda_id] || 0) + 1;
      return acc;
    }, {});

    // --- OPTIMIZACIÓN DE PRODUCTOS (LAZY LOADING) ---
    const comandas = rawComandas.map(cmd => {
      let p = cmd.productos;
      while (typeof p === 'string') {
        try { p = JSON.parse(p); } catch { p = []; break; }
      }
      if (!Array.isArray(p)) p = [];

      const resumen = p.map(i => `${i.modelo || ''} ${i.sku || ''}`).join(' ');
      const totalItems = p.reduce((a, b) => a + (parseInt(b.cant || b.cantidad || 1)), 0);
      
      // Índices para filtros rápidos sin cargar JSON completo
      const telasSet = new Set();
      p.forEach(i => { if (i.tela) telasSet.add(i.tela); });
      const telasIdx = Array.from(telasSet).join(' ');

      const cleaned = { ...cmd };
      delete cleaned.productos; // Quitamos el JSON pesado

      return {
        ...cleaned,
        comentarios_count: countsMap[cmd.id] || 0,
        items_resumen: resumen,
        items_count: totalItems,
        telas_idx: telasIdx
      };
    });

    return NextResponse.json({ ok: true, comandas }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── Función Auxiliar para preparar fila de pago ─────────────────────────────
function prepararFilaPago(p, comanda_id) {
  const md = parseFloat(p.monto_divisa || p.monto || 0);
  const ts = parseFloat(p.tasa_bs || p.tasa || 0);
  const div = p.divisa || 'EUR';

  let montoEUR = 0;
  let montoBs = 0;
  if (div === 'BS') {
    montoBs = md;
    montoEUR = ts > 0 ? md / ts : 0;
  } else {
    montoEUR = md;
    montoBs = 0;
  }

  montoEUR = Math.round(montoEUR * 100) / 100;
  montoBs = Math.round(montoBs * 100) / 100;

  return {
    comanda_id,
    metodo:       p.metodo,
    moneda:       div,
    divisa:       div,
    monto:        montoEUR,
    monto_pagado: montoEUR,
    monto_bs:     montoBs,
    monto_divisa: md,
    tasa_bs:      ts,
    referencia:   p.referencia || p.ref || '',
    notas:        p.notas || '',
  };
}

// ── POST — Nueva comanda (SÚPER PROCEDIMIENTO RPC) ─────────────────────────────
export async function POST(request) {
  try {
    const usuario = getUsuarioCookie(request);
    const body = await request.json();
    const { cliente, cliente_nombre, cliente_cedula, cliente_email, cliente_ciudad, cliente_id, productos, precio, monto_pagado, fecha_entrega, notas, status, pagos, agencia_envio, guia_envio } = body;
    const finalCliente = (cliente_nombre || cliente || '').trim();
    if (!finalCliente)
      return NextResponse.json({ ok: false, error: 'Cliente requerido' }, { status: 400 });

    const hoy = new Date().toISOString().split('T')[0];
    const cmdId = generarId('CMD');
    const esEmpacado = status?.toUpperCase() === 'EMPACADO';

    // 1. Preparar Payload Comanda
    const payloadComanda = {
      id:           cmdId,
      cliente:      finalCliente,
      cedula:       (cliente_cedula || '').trim(),
      email:        (cliente_email || '').trim(),
      ciudad:       (cliente_ciudad || '').trim(),
      productos:    productos || [],
      precio:       parseFloat(precio) || 0,
      monto_pagado: parseFloat(monto_pagado) || 0,
      status:       status || 'PENDIENTE',
      cliente_id:   cliente_id || '',
      notas:        notas || '',
      agencia_envio: agencia_envio || null,
      guia_envio:   guia_envio || null,
      fecha_entrega: fecha_entrega || null,
      fecha_creacion: hoy,
      created_at:   new Date().toISOString(),
    };

    // 2. Preparar Payload Items
    const prods = Array.isArray(productos) ? productos.filter(Boolean) : [];
    const payloadItems = prods.map(p => {
      const qty = parseInt(p.cant || p.cantidad || 1);
      const isFull = esEmpacado;
      return {
        sku: (p.sku || '').trim().toUpperCase(),
        cantidad: qty,
        precio: parseFloat(p.precio || 0),
        talla: p.talla || null, color: p.color || null, modelo: p.modelo || null,
        cant_empacada: isFull ? qty : 0,
        despachado: isFull ? qty : 0,
        tipo_precio: p.tipoVenta || p.tipo_precio || 'detal',
        desde_produccion: p.desde_produccion || false,
        precio_aplicado: parseFloat(p.precio || 0),
      };
    }).filter(p => p.sku && p.cantidad > 0);

    // 3. Preparar Payload Pagos
    const payloadPagos = (Array.isArray(pagos) ? pagos : []).map(p => prepararFilaPago(p, cmdId));

    // ── MAGIA: Ejecutar el Súper Procedimiento RPC ────────────────────────────
    const { data: resRpc, error: errRpc } = await supabase.rpc('crear_comanda_maestra', {
      p_payload: {
        comanda: payloadComanda,
        items: payloadItems,
        pagos: payloadPagos,
      },
      p_usuario: usuario?.email || 'sistema'
    });

    if (errRpc) {
      return NextResponse.json({ ok: false, error: errRpc.message || 'Error en BD (RPC)' }, { status: 500 });
    }

    if (!resRpc || !resRpc.ok) {
      console.error('RPC Error:', resRpc);
      return NextResponse.json({ 
        ok: false, 
        error: resRpc?.error || 'Inventario insuficiente', 
        detalles: resRpc?.detalles || []
      }, { status: 400 });
    }

    // Log en background
    supabase.from('logs').insert({
      usuario:   usuario?.email || 'sistema',
      accion:    'NUEVA_COMANDA_RPC',
      detalle:   `Cliente:${cliente} | $${precio} | Status:${status} | Items:${prods.length}`,
      resultado: 'OK',
    }).then(() => {});

    // Guardar flags de producción y precios (por si el RPC no extrae las nuevas columnas)
    try {
      for (const it of payloadItems) {
        if (it.desde_produccion || it.precio_aplicado) {
          await supabase.from('comandas_items')
            .update({ 
              desde_produccion: it.desde_produccion,
              precio_aplicado: it.precio_aplicado,
              tipo_precio: it.tipo_precio
            })
            .eq('comanda_id', cmdId)
            .eq('sku', it.sku);
        }
      }
    } catch(e) {}

    return NextResponse.json({
      ok: true,
      comanda: payloadComanda,
      // Ajuste atómico — actualiza stock_total (disponible)
      alertasStock: resRpc.alertasStock || []
    });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ── PUT — Actualizar comanda ──────────────────────────────────────────────────
// ── PUT — Actualizar comanda (ATÓMICO RPC) ──────────────────────────────────
export async function PUT(request) {
  try {
    const usuario = getUsuarioCookie(request);
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    // 1. Obtener estado actual de la comanda para completar el payload si es necesario
    const { data: cmdActual, error: errFetch } = await supabase
      .from('comandas').select('*').eq('id', id).single();
    if (errFetch || !cmdActual) 
      return NextResponse.json({ ok: false, error: 'Comanda no encontrada' }, { status: 404 });

    // 2. Preparar Datos de Comanda (Merge)
    const payloadComanda = {
      cliente:       (body.cliente_nombre || body.cliente || cmdActual.cliente || '').trim(),
      cliente_id:    body.cliente_id    !== undefined ? body.cliente_id    : cmdActual.cliente_id,
      productos:     body.productos     !== undefined ? body.productos     : cmdActual.productos,
      precio:        body.precio        !== undefined ? parseFloat(body.precio) : cmdActual.precio,
      monto_pagado:  body.monto_pagado  !== undefined ? parseFloat(body.monto_pagado) : cmdActual.monto_pagado,
      status:        body.status        !== undefined ? body.status        : cmdActual.status,
      notas:         body.notas         !== undefined ? body.notas         : cmdActual.notas,
      agencia_envio: body.agencia_envio !== undefined ? body.agencia_envio : cmdActual.agencia_envio,
      guia_envio:    body.guia_envio    !== undefined ? body.guia_envio    : cmdActual.guia_envio,
      fecha_entrega: body.fecha_entrega !== undefined ? body.fecha_entrega : cmdActual.fecha_entrega,
    };

    // Asegurar que productos sea array
    let prodsArr = payloadComanda.productos || [];
    while (typeof prodsArr === 'string') {
      try { prodsArr = JSON.parse(prodsArr); } catch { prodsArr = []; break; }
    }

    // 3. Preparar Datos de Items
    let payloadItems = [];
    if (body.productos !== undefined) {
      payloadItems = prodsArr.map(p => ({
        sku: (p.sku || '').trim().toUpperCase(),
        cantidad: parseInt(p.cant || p.cantidad || 0),
        precio: parseFloat(p.precio || 0),
        talla: p.talla || null, 
        color: p.color || null, 
        modelo: p.modelo || null,
        tipo_precio: p.tipoVenta || p.tipo_precio || 'detal',
        desde_produccion: p.desde_produccion || false
      })).filter(it => it.sku && it.cantidad >= 0);
    } else {
      const { data: dbItems } = await supabase.from('comandas_items').select('*').eq('comanda_id', id);
      payloadItems = (dbItems || []).map(it => ({
        sku: it.sku, cantidad: it.cantidad, precio: it.precio, talla: it.talla,
        color: it.color, modelo: it.modelo, tipo_precio: it.tipo_precio,
        desde_produccion: it.desde_produccion
      }));
    }

    // 4. Preparar Datos de Pagos
    let payloadPagos = [];
    if (body.pagos !== undefined) {
      payloadPagos = (Array.isArray(body.pagos) ? body.pagos : []).map(p => prepararFilaPago(p, id));
    } else {
      const { data: dbPagos } = await supabase.from('pagos').select('*').eq('comanda_id', id);
      payloadPagos = (dbPagos || []).map(p => ({
        metodo: p.metodo, moneda: p.moneda, divisa: p.divisa, monto: p.monto,
        monto_pagado: p.monto_pagado, monto_bs: p.monto_bs, monto_divisa: p.monto_divisa,
        tasa_bs: p.tasa_bs, referencia: p.referencia, notas: p.notas
      }));
    }

    // ── MAGIA: Ejecutar el Súper Procedimiento RPC ────────────────────────────
    const { data: resRpc, error: errRpc } = await supabase.rpc('editar_comanda_maestra', {
      p_id: id,
      p_payload: {
        comanda: payloadComanda,
        items: payloadItems,
        pagos: payloadPagos
      },
      p_usuario: usuario?.email || 'sistema'
    });

    if (errRpc) {
      return NextResponse.json({ ok: false, error: errRpc.message || 'Error en BD (RPC)' }, { status: 500 });
    }

    if (!resRpc || !resRpc.ok) {
      return NextResponse.json({ 
        ok: false, 
        error: resRpc?.error || 'Error al actualizar comanda', 
        detalles: resRpc?.detalles || []
      }, { status: 400 });
    }

    // Log en background
    supabase.from('logs').insert({
      usuario:   usuario?.email || 'sistema',
      accion:    'ACTUALIZAR_COMANDA_RPC',
      detalle:   `ID:${id} | Status:${payloadComanda.status} | por:${usuario?.nombre || '?'}`,
      resultado: 'OK',
    }).then(() => {});

    return NextResponse.json({ ok: true, id, alertasStock: [] });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}


// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const usuario = getUsuarioCookie(req);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    // 1. Obtener la comanda actual
    const { data: cmdActual } = await supabase.from('comandas').select('status').eq('id', id).single();

    // 2. Si la comanda ya descontó stock (empacada/enviada/despachada/entregada),
    // primero forzamos una edición atómica pasando status CANCELADO e items vacíos
    // para que la base de datos devuelva todo el stock físico reservado.
    if (cmdActual && ['empacado', 'enviado', 'despachado', 'entregado'].includes((cmdActual.status || '').toLowerCase())) {
      await supabase.rpc('editar_comanda_maestra', {
        p_id: id,
        p_payload: {
          comanda: { status: 'CANCELADO' },
          items: [], // Enviar items vacíos obliga al RPC a devolver el stock de todo
          pagos: []
        },
        p_usuario: usuario?.email || 'sistema'
      });
    }

    // 3. Borrar pagos e items relacionados
    await supabase.from('pagos').delete().eq('comanda_id', id);
    await supabase.from('comandas_items').delete().eq('comanda_id', id);

    // 4. Borrar comanda principal
    const { error } = await supabase.from('comandas').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    supabase.from('logs').insert({
      usuario:   usuario?.email || 'admin',
      accion:    'ELIMINAR_COMANDA',
      detalle:   `ID:${id} | por:${usuario?.nombre || '?'} | Stock recuperado si aplicaba`,
      resultado: 'OK',
    }).then(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}