import { createClient } from '@supabase/supabase-js';

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_KEY;

if (!url || !service) {
  console.warn('[supabase-server] Variables de entorno faltantes: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY');
}

// Singleton — una sola instancia durante toda la vida del proceso
let _instance = null;

export const supabase = (() => {
  if (!_instance) {
    _instance = createClient(url || '', service || '', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _instance;
})();
