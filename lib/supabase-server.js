import { createClient } from '@supabase/supabase-js';

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_KEY;

// ── Validación de arranque ────────────────────────────────────────────────────
// Si falta SUPABASE_SERVICE_KEY, todas las escrituras fallarán silenciosamente
// porque el cliente actuará con rol anon y RLS bloqueará los UPDATEs/INSERTs.
//
// Solución: Vercel → tu proyecto → Settings → Environment Variables
//   SUPABASE_SERVICE_KEY = (la clave service_role de Supabase → Settings → API)
//   ⚠️  NO uses NEXT_PUBLIC_ — eso la expone en el browser
//
if (!url) {
  console.error('[supabase-server] CRÍTICO: NEXT_PUBLIC_SUPABASE_URL no está configurado');
}
if (!service) {
  console.error(
    '[supabase-server] CRÍTICO: SUPABASE_SERVICE_KEY no está configurado en las variables de entorno.\n' +
    '  Sin esta clave, los UPDATEs e INSERTs fallan silenciosamente (RLS bloquea con rol anon).\n' +
    '  Ve a Vercel → Settings → Environment Variables y agrega SUPABASE_SERVICE_KEY.'
  );
}

// Singleton — una sola instancia durante toda la vida del proceso
let _instance = null;

export function getSupabase() {
  if (!_instance) {
    _instance = createClient(url || '', service || '', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _instance;
}

// Export de conveniencia — compatible con el código existente
export const supabase = getSupabase();