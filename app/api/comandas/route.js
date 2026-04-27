export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { generarId } from '@/utils/generarId';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';
import { registrarMovimiento, despacharComanda, cancelarComanda, getStockMultiple } from '@/lib/stockRpc';
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
export async function PUT(request) {
  try {
    const usuario = getUsuarioCookie(request);
    const body = await request.json();
    const { id, status, monto_pagado, notas, fecha_entrega, productos, precio, agencia_envio, guia_envio } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 });

    // ── Si cambia a ENVIADO → despachar atomicamente ──────────────────────
    if (status === 'enviado' || status === 'ENVIADO' || status === 'DESPACHADO') {

      const { data: cmdActual } = await supabase
        .from('comandas').select('status, cliente').eq('id', id).single();

      const yaEnviado = ['enviado','ENVIADO','DESPACHADO'].includes(cmdActual?.status);
      if (cmdActual && !yaEnviado) {

        // Verificar si hay items en comandas_items (requerido por RPC)
        const { data: items } = await supabase
          .from('comandas_items')
          .select('id, sku, cantidad, despachado, desde_produccion')
          .eq('comanda_id', id)
          .gt('cantidad', 0);

        if (items && items.length > 0) {
          const sinStock = [];
          for (const it of items) {
            const falta = it.cantidad - (it.despachado || 0);
            if (falta > 0) {
              // 🏭 Lógica Atómica: Producción Directa
              if (it.desde_produccion) {
                // Inyectamos stock físico antes de sacarlo
                await registrarMovimiento({
                  sku: it.sku,
                  tipo: 'ENTRADA',
                  cantidad: falta,
                  concepto: `Entrada producción rápida (Cmd ${id})`,
                  referencia: id,
                  usuario: usuario?.email || 'sistema'
                });
              }

              // Deducción del resto
              const resSalida = await registrarMovimiento({
                sku: it.sku,
                tipo: 'SALIDA',
                cantidad: falta,
                concepto: `Despacho final comanda ${id}`,
                referencia: id,
                usuario: usuario?.email || 'sistema'
              });

              if (!resSalida.ok) {
                sinStock.push({ sku: it.sku, error: resSalida.error });
                continue;
              }

              // Sincronizar item
              await supabase.from('comandas_items').update({ despachado: it.cantidad }).eq('id', it.id);
            }
          }

          if (sinStock.length > 0) {
             return NextResponse.json({
              ok: false,
              errorTipo: 'SIN_STOCK',
              error: `Stock insuficiente para completar envío en ${sinStock.length} items.`,
            }, { status: 400 });
          }

          // La comanda se marca como enviada
          await supabase.from('comandas')
            .update({ 
              status: 'enviado', 
              fecha_envio: new Date().toISOString(),
              updated_at: new Date().toISOString() 
            })
            .eq('id', id);

        } else {
          // ⚠️ Ruta de compatibilidad: comanda sin items en comandas_items
          // Leer productos del JSONB y usar la RPC de movimiento individual
          const { data: cmdFull } = await supabase
            .from('comandas').select('productos, cliente').eq('id', id).single();

          let prods = cmdFull?.productos || [];
          while (typeof prods === 'string') {
            try { prods = JSON.parse(prods); } catch { prods = []; break; }
          }

          if (Array.isArray(prods) && prods.length > 0) {
            // Prevenir doble descuento
            const { data: movsExist } = await supabase
              .from('movimientos').select('id')
              .eq('referencia', id).eq('tipo', 'SALIDA').limit(1);

            if (!movsExist || movsExist.length === 0) {
              const sinStock = [];

              for (const p of prods) {
                const sku = (p.sku || '').trim().toUpperCase();
                const qty = parseInt(p.cant || p.cantidad || 1);
                if (!sku || qty <= 0) continue;

                const res = await registrarMovimiento({
                  sku,
                  tipo:        'SALIDA',
                  cantidad:    qty,
                  concepto:    `Comanda ${id}`,
                  contacto:    cmdFull?.cliente || '',
                  referencia:  id,
                  tipo_venta:  p.tipoVenta || 'MAYOR',
                  precio_venta: parseFloat(p.precio || 0),
                  usuario:     usuario?.email || 'sistema',
                });

                if (!res.ok) {
                  sinStock.push({ sku, error: res.error });
                }
              }

              if (sinStock.length > 0) {
                return NextResponse.json({
                  ok: false, errorTipo: 'SIN_STOCK',
                  error: `Stock insuficiente en ${sinStock.length} producto(s)`,
                  sinStock,
                }, { status: 400 });
              }
            }
          }

          await supabase.from('comandas')
            .update({ 
               status: 'enviado', 
               fecha_envio: new Date().toISOString(),
               updated_at: new Date().toISOString() 
            })
            .eq('id', id);
        }
      }
    }

    // ── Si se cancela → No se requiere liberar stock (modelo físico directo) ──
    if (status === 'cancelado' || status === 'CANCELADO') {
      await supabase.from('comandas')
        .update({ status: 'cancelado', updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    // ── Sincronización Completa de Items y Stock (NUEVO) ──────────────────
    let parsedProds = productos;
    while (typeof parsedProds === 'string') {
      try { parsedProds = JSON.parse(parsedProds); } catch { parsedProds = undefined; break; }
    }

    if (parsedProds !== undefined && Array.isArray(parsedProds)) {
      const { data: dbItems } = await supabase.from('comandas_items').select('*').eq('comanda_id', id);
      const dbItemsMap = (dbItems || []).reduce((acc, it) => { acc[it.sku.toUpperCase()] = it; return acc; }, {});
      const processedSkus = new Set();

      // 1. Procesar productos del JSONB (Nuevos o Existentes)
      for (const p of parsedProds) {
        const skuUpper = (p.sku || '').toUpperCase();
        if (!skuUpper) continue;
        const oldIt = dbItemsMap[skuUpper];
        const newQty = parseInt(p.cant || p.cantidad || 0);
        processedSkus.add(skuUpper);

        if (oldIt) {
          // EXISTENTE: Reconciliar cantidad y stock
          const empacado = oldIt.cant_empacada !== undefined ? oldIt.cant_empacada : (oldIt.despachado || 0);
          
          if (newQty < oldIt.cantidad && empacado > newQty) {
            // Devolver stock si lo que se pide ahora es menor a lo que ya se empacó
            const aDevolver = empacado - newQty;
            await registrarMovimiento({
              sku: oldIt.sku,
              tipo: 'ENTRADA',
              cantidad: aDevolver,
              concepto: `Reconciliación: Reducción en comanda ${id}`,
              referencia: id,
              usuario: usuario?.email || 'sistema'
            });
            await supabase.from('comandas_items').update({ 
               cantidad: newQty, 
               cant_empacada: newQty, 
               despachado: Math.min(oldIt.despachado || 0, newQty) 
            }).eq('id', oldIt.id);
          } else {
            // Actualización normal (incluye subidas de cantidad)
            await supabase.from('comandas_items').update({ 
              cantidad: newQty,
              precio: parseFloat(p.precio || 0),
              talla: p.talla || null, color: p.color || null, modelo: p.modelo || null
            }).eq('id', oldIt.id);
          }
        } else {
          // NUEVO: No estaba en la tabla, insertar
          await supabase.from('comandas_items').insert({
            comanda_id: id,
            sku: skuUpper,
            cantidad: newQty,
            precio: parseFloat(p.precio || 0),
            talla: p.talla || null, color: p.color || null, modelo: p.modelo || null,
            tipo_precio: p.tipoVenta || p.tipo_precio || 'detal',
            cant_empacada: 0,
            despachado: 0
          });
        }
      }

      // 2. Procesar items de la BD que ya NO están en el JSONB (Borrados)
      if (dbItems) {
        for (const oldIt of dbItems) {
          const skuUpper = oldIt.sku.toUpperCase();
          if (!processedSkus.has(skuUpper) && oldIt.cantidad > 0) {
            const empacado = oldIt.cant_empacada !== undefined ? oldIt.cant_empacada : (oldIt.despachado || 0);
            if (empacado > 0) {
              await registrarMovimiento({
                sku: oldIt.sku,
                tipo: 'ENTRADA',
                cantidad: empacado,
                concepto: `Reconciliación: Eliminación SKU ${skuUpper} en comanda ${id}`,
                referencia: id,
                usuario: usuario?.email || 'sistema'
              });
            }
            await supabase.from('comandas_items').update({ cantidad: 0, cant_empacada: 0, despachado: 0 }).eq('id', oldIt.id);
          }
        }
      }
    }

    // ── Actualizar campos de la comanda ───────────────────────────────────
    const campos = { updated_at: new Date().toISOString() };
    if (status        !== undefined) {
      campos.status = status;
      if (status === 'empacado' || status === 'EMPACADO') {
        campos.fecha_empaque = new Date().toISOString();
      }
      if (status === 'enviado' || status === 'ENVIADO') {
        campos.fecha_envio = new Date().toISOString();
      }
    }
    if (monto_pagado  !== undefined) campos.monto_pagado  = parseFloat(monto_pagado) || 0;
    if (notas         !== undefined) campos.notas         = notas;
    if (fecha_entrega !== undefined) campos.fecha_entrega = fecha_entrega || null;
    if (productos     !== undefined) {
      let pToSave = productos;
      while (typeof pToSave === 'string') {
         try { pToSave = JSON.parse(pToSave); } catch { break; }
      }
      campos.productos = pToSave;
    }
    if (precio        !== undefined) campos.precio        = parseFloat(precio) || 0;
    if (agencia_envio !== undefined) campos.agencia_envio = agencia_envio;
    if (guia_envio    !== undefined) campos.guia_envio    = guia_envio;

    let { error } = await supabase.from('comandas').update(campos).eq('id', id);
    if (error?.message?.includes('column') || error?.message?.includes('schema cache')) {
      const base = { updated_at: new Date().toISOString() };
      if (status       !== undefined) base.status       = status;
      if (monto_pagado !== undefined) base.monto_pagado = parseFloat(monto_pagado) || 0;
      const r2 = await supabase.from('comandas').update(base).eq('id', id);
      if (r2.error) return NextResponse.json({ ok: false, error: r2.error.message }, { status: 500 });
    } else if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Log
    supabase.from('logs').insert({
      usuario:   usuario?.email || 'sistema',
      accion:    'ACTUALIZAR_COMANDA',
      detalle:   `ID:${id} status:${status || '—'} | por:${usuario?.nombre || '?'}`,
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

    // Borrar pagos e items relacionados

    // Borrar pagos e items relacionados
    await supabase.from('pagos').delete().eq('comanda_id', id);
    await supabase.from('comandas_items').delete().eq('comanda_id', id);

    const { error } = await supabase.from('comandas').delete().eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    supabase.from('logs').insert({
      usuario:   usuario?.email || 'admin',
      accion:    'ELIMINAR_COMANDA',
      detalle:   `ID:${id} | por:${usuario?.nombre || '?'}`,
      resultado: 'OK',
    }).then(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}