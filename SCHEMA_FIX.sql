-- ══════════════════════════════════════════════════════════════════
-- MODITEX POS — Fix de schema para hacer coincidir con el código
-- Ejecutar en: Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════

-- ── 1. PAGOS: agregar columnas faltantes ──────────────────────────
-- La tabla ya existe pero con columnas distintas. Agregamos las que faltan.
ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS divisa      TEXT    DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS monto_divisa NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasa_bs     NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referencia  TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS notas       TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();

-- ── 2. INVENTARIO: agregar updated_at ─────────────────────────────
ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── 3. MOVIMIENTOS: ya tiene todas las columnas correctas ✅ ───────
-- Solo verificar que tiene created_at para ordenar por fecha
ALTER TABLE movimientos
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ── 4. Verificar resultado ─────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('pagos','inventario','movimientos')
ORDER BY table_name, ordinal_position;
