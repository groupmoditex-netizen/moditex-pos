-- ══════════════════════════════════════════════════════════════════
-- MODITEX POS — Schema Fix V2
-- Ejecutar en: Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════

-- ── 1. USUARIOS: agregar columnas faltantes ────────────────────────
-- nombre: nombre visible del usuario en el sistema
-- pin: contraseña hasheada con bcrypt
-- ultimo_acceso: timestamp del último login
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nombre        TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS pin           TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;

-- ── 2. PRODUCTOS: ya tiene tela ✅ ─────────────────────────────────
-- Verificar que tela existe (si no, crearla)
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS tela TEXT DEFAULT '';

-- ── 3. COMANDAS: verificar columnas del wizard ─────────────────────
ALTER TABLE comandas
  ADD COLUMN IF NOT EXISTS notas         TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_entrega DATE,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();

-- ── 4. Resultado ───────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('usuarios','productos','comandas')
ORDER BY table_name, ordinal_position;
