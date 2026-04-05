// ══════════════════════════════════════════════════════════════
// ENDPOINT DE DIAGNÓSTICO — Solo para depuración
// URL: GET /api/catalogo/debug
//
// Úsalo temporalmente para verificar que Supabase funciona en producción.
// Elimina o protege este archivo una vez resuelto el problema.
// ══════════════════════════════════════════════════════════════

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_KEY;
  const anon    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const checks = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL:     url     ? '✓ presente' : '✗ FALTA',
      SUPABASE_SERVICE_KEY:         service ? '✓ presente' : '✗ FALTA — causa principal del bug',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon   ? '✓ presente' : '✗ falta',
      service_key_starts_with:      service ? service.substring(0, 20) + '...' : 'N/A',
    },
    tests: {}
  };

  if (!url || !service) {
    return NextResponse.json({
      ok: false,
      problema: 'Variables de entorno faltantes — ver checks.env',
      checks,
    }, { status: 500 });
  }

  // Test 1: SELECT (debe funcionar siempre)
  try {
    const client = createClient(url, service, { auth: { persistSession: false } });
    const { data, error } = await client
      .from('catalogo_config')
      .select('id, modelo_key, en_catalogo')
      .limit(5);

    checks.tests.select = error
      ? { ok: false, error: error.message }
      : { ok: true, filas: data?.length ?? 0, muestra: data };
  } catch (e) {
    checks.tests.select = { ok: false, error: e.message };
  }

  // Test 2: UPDATE en seco — actualiza y restaura inmediatamente
  try {
    const client = createClient(url, service, { auth: { persistSession: false } });

    // Buscar el primer registro
    const { data: existing } = await client
      .from('catalogo_config')
      .select('id, en_catalogo')
      .limit(1)
      .maybeSingle();

    if (!existing) {
      checks.tests.update = { ok: null, msg: 'No hay registros para probar el UPDATE' };
    } else {
      // Marcar con el mismo valor (no-op lógico pero confirma que el UPDATE llega)
      const { data: updated, error: updateError } = await client
        .from('catalogo_config')
        .update({ orden: 999 })      // campo neutro, no cambia comportamiento
        .eq('id', existing.id)
        .select('id');

      checks.tests.update = updateError
        ? { ok: false, error: updateError.message, id_probado: existing.id }
        : updated?.length > 0
          ? { ok: true, msg: 'UPDATE exitoso', id_probado: existing.id }
          : { ok: false, msg: 'UPDATE devolvió 0 filas — RLS bloqueando (policy de UPDATE falta)', id_probado: existing.id };
    }
  } catch (e) {
    checks.tests.update = { ok: false, error: e.message };
  }

  const allOk = Object.values(checks.tests).every(t => t.ok === true || t.ok === null);

  return NextResponse.json({
    ok: allOk,
    resumen: allOk
      ? '✓ Todo funciona correctamente'
      : '✗ Hay problemas — revisa checks.tests',
    checks,
  });
}