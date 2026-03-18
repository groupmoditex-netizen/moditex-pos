export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, email, pin } = await request.json();
    const identifier = (username || email || '').trim().toLowerCase();
    if (!identifier || !pin) return NextResponse.json({ok:false,error:'Usuario y PIN requeridos'},{status:400});

    // El campo "email" en la tabla almacena el username único del operador
    const { data: user, error } = await supabase
      .from('usuarios').select('email,nombre,rol,activo,pin')
      .eq('email', identifier).single();

    if (error || !user) return NextResponse.json({ok:false,error:'Usuario no encontrado'},{status:401});
    if (!user.activo)   return NextResponse.json({ok:false,error:'Usuario inactivo. Contacta al administrador'},{status:401});
    if (user.pin !== pin.trim()) return NextResponse.json({ok:false,error:'PIN incorrecto'},{status:401});
    try { await supabase.from('usuarios').update({ultimo_acceso:new Date().toISOString()}).eq('email',user.email); } catch(_){}
    try { await supabase.from('logs').insert({usuario:user.email,accion:'LOGIN',detalle:`${user.rol}`,resultado:'OK'}); } catch(_){}
    return NextResponse.json({ok:true,usuario:{email:user.email,nombre:user.nombre,rol:user.rol}});
  } catch(err){return NextResponse.json({ok:false,error:err.message},{status:500});}
}