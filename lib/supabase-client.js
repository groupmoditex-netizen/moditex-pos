'use client';

import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton — evita "Multiple GoTrueClient instances"
let _instance = null;

export const supabasePublic = (() => {
  if (!_instance) {
    _instance = createClient(url || '', anon || '', {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return _instance;
})();
