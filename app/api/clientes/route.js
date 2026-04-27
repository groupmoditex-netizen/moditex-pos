export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { generarId } from '@/utils/generarId';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data: clientes, error } = await supabase.from('vista_clientes_stats').select('*').order('nombre');
    if (error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json((clientes||[]).map(c=>({
      ...c,
      totalGastado: Number(c.total_gastado || 0),
      totalPedidos: Number(c.total_pedidos || 0)
    })));
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
