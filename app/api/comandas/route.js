export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { generarId } from '@/utils/generarId';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let r = await supabase.from('comandas').select('*').order('created_at',{ascending:false}).limit(300);
    if (r.error?.message?.includes('created_at')||r.error?.message?.includes('column'))
      r = await supabase.from('comandas').select('*').limit(300);
    if (r.error) return NextResponse.json({ok:false,error:r.error.message},{status:500});
    return NextResponse.json({ok:true,comandas:r.data||[]},{headers:{'Cache-Control':'no-store'}});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {cliente,cliente_id,productos,precio,monto_pagado,fecha_entrega,notas,status} = body;
    if (!cliente?.trim()) return NextResponse.json({ok:false,error:'Cliente requerido'},{status:400});

    const hoy = new Date().toISOString().split('T')[0];
    const filaFull = {
      id:generarId('CMD'), cliente:cliente.trim(),
      productos:JSON.stringify(productos||[]),
      precio:parseFloat(precio)||0,
      monto_pagado:parseFloat(monto_pagado)||0,
      status:status||'pendiente',
      cliente_id:cliente_id||'', notas:notas||'',
      fecha_entrega:fecha_entrega||null,
      fecha_creacion:hoy, created_at:new Date().toISOString(),
    };

    let {data,error} = await supabase.from('comandas').insert(filaFull).select().single();
    if (error?.message?.includes('column')||error?.message?.includes('schema cache')) {
      const {id,cliente:c,productos:p,precio:pr,monto_pagado:mp,status:st} = filaFull;
      const r2 = await supabase.from('comandas').insert({id,cliente:c,productos:p,precio:pr,monto_pagado:mp,status:st}).select().single();
      if (r2.error) return NextResponse.json({ok:false,error:r2.error.message},{status:500});
      data = r2.data;
    } else if (error) {
      return NextResponse.json({ok:false,error:error.message},{status:500});
    }

    try { await supabase.from('logs').insert({usuario:'sistema',accion:'NUEVA_COMANDA',detalle:`Cliente: ${cliente} | €${precio}`,resultado:'OK'}); } catch(_){}
    return NextResponse.json({ok:true,comanda:data});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const {id,status,monto_pagado,notas,fecha_entrega,productos,precio} = body;
    if (!id) return NextResponse.json({ok:false,error:'ID requerido'},{status:400});

    // ── Si cambia a LISTO → descontar stock ──────────────────────────
    if (status === 'listo') {
      const {data:cmdActual} = await supabase.from('comandas').select('status,productos,cliente').eq('id',id).single();

      if (cmdActual && cmdActual.status !== 'listo' && cmdActual.status !== 'entregado') {
        let prods = cmdActual.productos;
        if (typeof prods === 'string') try { prods = JSON.parse(prods); } catch { prods = []; }

        if (Array.isArray(prods) && prods.length > 0) {

          // ── PREVENIR DOBLE DESCUENTO: verificar si ya hay movimientos de esta comanda ──
          const {data:movsExist} = await supabase
            .from('movimientos').select('id').eq('referencia', id).limit(1);
          if (movsExist && movsExist.length > 0) {
            // Ya hay movimientos — solo actualizar status
            await supabase.from('comandas').update({status:'listo'}).eq('id',id);
            return NextResponse.json({ok:true, id, alertasStock:[], warning:'Movimientos ya registrados'});
          }

          const fecha = new Date().toISOString();
          const skusComanda = [...new Set(prods.map(p=>(p.sku||'').trim().toUpperCase()).filter(Boolean))];

          const [prodsBatch, movsBatch] = await Promise.all([
            supabase.from('productos').select('sku,stock_inicial').in('sku', skusComanda),
            supabase.from('movimientos').select('sku,tipo,cantidad').in('sku', skusComanda),
          ]);

          const prodMap = {};
          (prodsBatch.data||[]).forEach(p => { prodMap[p.sku] = p.stock_inicial||0; });

          const stockRealMap = {};
          skusComanda.forEach(sku => {
            let stock = prodMap[sku] || 0;
            (movsBatch.data||[]).filter(m=>m.sku===sku).forEach(m => {
              if (m.tipo==='ENTRADA') stock += m.cantidad;
              else if (m.tipo==='SALIDA') stock -= m.cantidad;
            });
            stockRealMap[sku] = stock;
          });

          // ── BLOQUEAR si no hay stock suficiente — NO insertar nada ──
          const sinStock = [];
          for (const p of prods) {
            const sku = (p.sku||'').trim().toUpperCase();
            const qty = parseInt(p.cant||p.cantidad||1);
            if (!sku || qty <= 0) continue;
            if ((stockRealMap[sku]||0) < qty) {
              sinStock.push({
                sku, modelo: p.modelo||sku,
                stockReal: Math.max(0, stockRealMap[sku]||0),
                requerido: qty,
                falta: qty - Math.max(0, stockRealMap[sku]||0),
              });
            }
          }

          if (sinStock.length > 0) {
            return NextResponse.json({
              ok: false,
              errorTipo: 'SIN_STOCK',
              error: `No se puede marcar como LISTO: stock insuficiente en ${sinStock.length} producto(s)`,
              sinStock,
            }, {status: 400});
          }

          // ── Stock OK — insertar movimientos ──────────────────────────
          const movFilas = prods
            .map(p => {
              const sku = (p.sku||'').trim().toUpperCase();
              const qty = parseInt(p.cant||p.cantidad||1);
              if (!sku || qty <= 0) return null;
              return {
                id:           generarId('MOV'),
                fecha, sku, tipo: 'SALIDA', cantidad: qty,
                referencia:   id,
                concepto:     'Comanda ' + id,
                contacto:     cmdActual.cliente || '',
                tipo_venta:   p.tipoVenta || 'MAYOR',
                precio_venta: parseFloat(p.precio || 0),
              };
            })
            .filter(Boolean);

          if (movFilas.length > 0) {
            let {error:errMov} = await supabase.from('movimientos').insert(movFilas);
            if (errMov?.message?.includes('column')||errMov?.message?.includes('schema')) {
              const min = movFilas.map(m=>({id:m.id,fecha:m.fecha,sku:m.sku,tipo:m.tipo,cantidad:m.cantidad,concepto:m.concepto,referencia:m.referencia}));
              errMov = (await supabase.from('movimientos').insert(min)).error;
            }
            if (errMov) return NextResponse.json({ok:false,error:'Error al registrar movimientos: '+errMov.message},{status:500});

            for (const m of movFilas) {
              const nuevoStock = Math.max(0, (stockRealMap[m.sku]||0) - m.cantidad);
              const {error:eInv} = await supabase.from('inventario')
                .update({stock:nuevoStock,updated_at:new Date().toISOString()}).eq('sku',m.sku);
              if (eInv) await supabase.from('inventario').insert({sku:m.sku,stock:nuevoStock});
            }
          }
        }
      }
    }

    // ── Actualizar campos de la comanda ───────────────────────────────
    const campos = {};
    if (status        !== undefined) campos.status        = status;
    if (monto_pagado  !== undefined) campos.monto_pagado  = parseFloat(monto_pagado)||0;
    if (notas         !== undefined) campos.notas         = notas;
    if (fecha_entrega !== undefined) campos.fecha_entrega = fecha_entrega||null;
    if (productos     !== undefined) campos.productos     = JSON.stringify(productos);
    if (precio        !== undefined) campos.precio        = parseFloat(precio)||0;

    let {error} = await supabase.from('comandas').update(campos).eq('id',id);
    if (error?.message?.includes('column')||error?.message?.includes('schema cache')) {
      const base={};
      if (status       !== undefined) base.status       = status;
      if (monto_pagado !== undefined) base.monto_pagado = parseFloat(monto_pagado)||0;
      const r2 = await supabase.from('comandas').update(base).eq('id',id);
      if (r2.error) return NextResponse.json({ok:false,error:r2.error.message},{status:500});
    } else if (error) {
      return NextResponse.json({ok:false,error:error.message},{status:500});
    }

    try { await supabase.from('logs').insert({usuario:'sistema',accion:'ACTUALIZAR_COMANDA',detalle:`ID:${id} status:${status||'—'}`,resultado:'OK'}); } catch(_){}
    return NextResponse.json({ok:true, id, alertasStock:[]});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ok:false,error:'ID requerido'},{status:400});
    await supabase.from('pagos').delete().eq('comanda_id', id);
    const { error } = await supabase.from('comandas').delete().eq('id', id);
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    try { await supabase.from('logs').insert({usuario:'admin',accion:'ELIMINAR_COMANDA',detalle:`ID:${id}`,resultado:'OK'}); } catch(_){}
    return NextResponse.json({ok:true});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}
