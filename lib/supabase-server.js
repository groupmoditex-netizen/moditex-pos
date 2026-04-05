import { createClient } from '@supabase/supabase-js';

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_KEY;

if (!url || !service) {
  console.error(
    '\n[supabase-server] ══════════════════════════════════════════\n' +
    '  CRÍTICO: Variable de entorno faltante:\n' +
    (url     ? '' : '  ✗ NEXT_PUBLIC_SUPABASE_URL\n') +
    (service ? '' : '  ✗ SUPABASE_SERVICE_KEY  ← esta causa el bug del toggle\n') +
    '  Sin SUPABASE_SERVICE_KEY los UPDATEs fallan silenciosamente.\n' +
    '  Solución: Vercel → Settings → Environment Variables\n' +
    '══════════════════════════════════════════════════════\n'
  );
}

let _instance = null;

export const supabase = (() => {
  if (!_instance) {
    _instance = createClient(url || '', service || '', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _instance;
})();