export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { username, pin } = await request.json();
    const identifier = (username || '').trim().toLowerCase();
    
    if (!identifier || !pin) {
      return NextResponse.json({ ok: false, error: 'Usuario y PIN requeridos para autorización' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('email, nombre, rol, activo, pin')
      .eq('email', identifier)
      .single();

    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 401 });
    }
    
    // Solo administradores pueden autorizar excepciones.
    if (user.rol !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Se requieren permisos de Administrador' }, { status: 403 });
    }
    if (!user.activo) {
      return NextResponse.json({ ok: false, error: 'El usuario administrador está inactivo' }, { status: 401 });
    }

    const pinValido = await bcrypt.compare(pin.trim(), user.pin);
    if (!pinValido) {
      return NextResponse.json({ ok: false, error: 'PIN incorrecto' }, { status: 401 });
    }

    try { await supabase.from('logs').insert({ usuario: user.email, accion: 'AUTORIZACION_EXCEPCION', detalle: 'Aprobó un cambio de tasa manual', resultado: 'OK' }); } catch (_) {}

    return NextResponse.json({ ok: true, usuario: { email: user.email, nombre: user.nombre, rol: user.rol } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
