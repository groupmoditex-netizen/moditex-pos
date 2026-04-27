-- 1. TABLA: idempotency_keys
-- Propósito: Prevenir que las peticiones se procesen más de una vez (Idempotencia).
-- Útil para reintentos automáticos tras fallos de red o energía.

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id text PRIMARY KEY,
    created_at timestamptz DEFAULT now()
);

-- Limpieza automática de llaves viejas (> 3 días) para ahorrar espacio
-- Opcional: Podrías crear un CRON o simplemente dejarlo así ya que el texto ocupa poco.
