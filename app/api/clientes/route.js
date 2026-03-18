export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { generarId } from '@/utils/generarId';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data: clientes, error } = await supabase.from('clientes').select('*').order('nombre');
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    const { data: movs } = await supabase.from('movimientos').select('cliente_id,contacto,tipo,cantidad,precio_venta').eq('tipo','SALIDA');
    const gMap={},pMap={};
    (movs||[]).forEach(m=>{const ref=m.cliente_id||m.contacto||'';if(!ref)return;gMap[ref]=(gMap[ref]||0)+((m.precio_venta||0)*m.cantidad);pMap[ref]=(pMap[ref]||0)+1;});
    return NextResponse.json((clientes||[]).map(c=>({...c,totalGastado:gMap[c.id]||gMap[c.nombre]||0,totalPedidos:pMap[c.id]||pMap[c.nombre]||0})));
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}

export async function POST(request) {
  try {
    const {nombre,cedula,telefono,email,ciudad}=await request.json();
    if(!nombre)return NextResponse.json({ok:false,error:'Nombre obligatorio'},{status:400});
    if(!cedula)return NextResponse.json({ok:false,error:'Cédula obligatoria'},{status:400});
    const {data:dup}=await supabase.from('clientes').select('id').eq('cedula',cedula.trim());
    if(dup&&dup.length)return NextResponse.json({ok:false,error:`Ya existe un cliente con la cédula "${cedula}"`},{status:400});
    const {data,error}=await supabase.from('clientes').insert({nombre:nombre.trim(),cedula:cedula.trim(),telefono:telefono||null,email:email||null,ciudad:ciudad||null}).select().single();
    if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,cliente:data});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}
