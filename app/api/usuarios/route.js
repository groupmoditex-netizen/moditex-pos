export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('email, nombre, rol, activo, ultimo_acceso')
      .order('rol')
      .order('nombre');
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, usuarios: data || [] });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// Crear usuario — hashea el PIN automáticamente
export async function POST(request) {
  try {
    const { nombre, username, rol, pin, activo } = await request.json();
    if (!username || !pin || !rol) {
      return NextResponse.json({ ok: false, error: 'Usuario, PIN y rol son requeridos' }, { status: 400 });
    }
    if (pin.toString().length < 4) {
      return NextResponse.json({ ok: false, error: 'El PIN debe tener al menos 4 dígitos' }, { status: 400 });
    }

    const user = username.trim().toLowerCase().replace(/\s+/g, '_');

    // Hashear PIN con bcrypt antes de guardar
    const pinHasheado = await bcrypt.hash(pin.toString(), 10);

    const { error } = await supabase.from('usuarios').upsert({
      email: user,
      nombre: nombre || user,
      rol,
      pin: pinHasheado,
      activo: activo !== false,
    }, { onConflict: 'email' });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// Editar usuario — hashea el PIN solo si se envió uno nuevo
export async function PUT(request) {
  try {
    const { email, username_actual, nombre, nuevo_username, rol, pin, activo } = await request.json();
    const id = email || username_actual;
    if (!id) return NextResponse.json({ ok: false, error: 'Identificador requerido' }, { status: 400 });

    const campos = {};
    if (nombre != null)   campos.nombre = nombre.trim();
    if (rol != null)      campos.rol    = rol;
    if (activo != null)   campos.activo = activo;

    // Solo hashear si se envió un PIN nuevo (no vacío)
    if (pin != null && pin.toString().trim() !== '') {
      if (pin.toString().length < 4) {
        return NextResponse.json({ ok: false, error: 'El PIN debe tener al menos 4 dígitos' }, { status: 400 });
      }
      campos.pin = await bcrypt.hash(pin.toString().trim(), 10);
    }

    if (nuevo_username != null && nuevo_username.trim()) {
      campos.email = nuevo_username.trim().toLowerCase().replace(/\s+/g, '_');
    }

    const { error } = await supabase.from('usuarios').update(campos).eq('email', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
