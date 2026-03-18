import { createClient } from '@supabase/supabase-js';

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'https://placeholder.supabase.co';
const service = process.env.SUPABASE_SERVICE_KEY          || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const anon    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// ✅ Singleton — evita "Multiple GoTrueClient instances"
// Una sola instancia por key durante toda la vida del proceso
let _supabase       = null;
let _supabasePublic = null;

export const supabase = (() => {
  if (!_supabase) _supabase = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
})();

export const supabasePublic = (() => {
  if (!_supabasePublic) _supabasePublic = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _supabasePublic;
})();
