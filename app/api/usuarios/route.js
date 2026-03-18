export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const {data,error}=await supabase.from('usuarios').select('email,nombre,rol,activo,ultimo_acceso').order('rol').order('nombre');
    if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,usuarios:data||[]});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}

// Crear usuario — usa "email" como campo username único
export async function POST(request) {
  try {
    const {nombre,username,rol,pin,activo}=await request.json();
    if(!username||!pin||!rol) return NextResponse.json({ok:false,error:'Usuario, PIN y rol son requeridos'},{status:400});
    if(pin.toString().length<4) return NextResponse.json({ok:false,error:'El PIN debe tener al menos 4 dígitos'},{status:400});
    const user=username.trim().toLowerCase().replace(/\s+/g,'_');
    const {error}=await supabase.from('usuarios').upsert({
      email: user,
      nombre: nombre||user,
      rol, pin:pin.toString(), activo:activo!==false
    },{onConflict:'email'});
    if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}

// Editar usuario
export async function PUT(request) {
  try {
    const {email, username_actual, nombre, nuevo_username, rol, pin, activo}=await request.json();
    const id = email || username_actual;
    if(!id) return NextResponse.json({ok:false,error:'Identificador requerido'},{status:400});
    const campos={};
    if(nombre != null)          campos.nombre  = nombre.trim();
    if(rol != null)             campos.rol     = rol;
    if(activo != null)          campos.activo  = activo;
    if(pin != null && pin !== '') campos.pin   = pin.toString().trim();
    if(nuevo_username != null && nuevo_username.trim()) {
      campos.email = nuevo_username.trim().toLowerCase().replace(/\s+/g,'_');
    }
    const {error}=await supabase.from('usuarios').update(campos).eq('email',id);
    if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}