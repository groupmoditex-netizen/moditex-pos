export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const id = params.id;
    const {nombre,cedula,telefono,email,ciudad}=await request.json();
    if(!nombre)return NextResponse.json({ok:false,error:'Nombre obligatorio'},{status:400});
    if(!cedula)return NextResponse.json({ok:false,error:'Cédula obligatoria'},{status:400});
    // Verificar cédula duplicada (excluyendo este cliente)
    const {data:dup}=await supabase.from('clientes').select('id').eq('cedula',cedula.trim()).neq('id',id);
    if(dup&&dup.length)return NextResponse.json({ok:false,error:`La cédula "${cedula}" ya pertenece a otro cliente`},{status:400});
    const {error}=await supabase.from('clientes').update({nombre:nombre.trim(),cedula:cedula.trim(),telefono:telefono||null,email:email||null,ciudad:ciudad||null}).eq('id',id);
    if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,id});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}

export async function DELETE(request, { params }) {
  try {
    const id = params.id;
    const {error}=await supabase.from('clientes').delete().eq('id',id);
    if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,id});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}
