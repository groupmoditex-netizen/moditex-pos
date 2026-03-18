-- ══════════════════════════════════════════════════════════════════════
-- MODITEX POS — Migración de base de datos
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Agregar columnas faltantes en tabla COMANDAS ───────────────────
ALTER TABLE comandas
  ADD COLUMN IF NOT EXISTS fecha_entrega   DATE,
  ADD COLUMN IF NOT EXISTS notas           TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_id      TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_creacion  DATE    DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ DEFAULT NOW();

-- ── 2. Crear tabla PAGOS si no existe ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id            TEXT        PRIMARY KEY,
  comanda_id    TEXT        NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
  metodo        TEXT        NOT NULL,
  divisa        TEXT        NOT NULL DEFAULT 'EUR',
  monto_divisa  NUMERIC     NOT NULL DEFAULT 0,
  tasa_bs       NUMERIC     DEFAULT 0,
  monto_bs      NUMERIC     DEFAULT 0,
  referencia    TEXT        DEFAULT '',
  notas         TEXT        DEFAULT '',
  fecha         DATE        DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Índices para búsquedas rápidas ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pagos_comanda_id  ON pagos(comanda_id);
CREATE INDEX IF NOT EXISTS idx_comandas_status   ON comandas(status);
CREATE INDEX IF NOT EXISTS idx_comandas_created  ON comandas(created_at DESC);

-- ── 4. Verificar columnas actuales de comandas ────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'comandas'
ORDER BY ordinal_position;

-- ── 5. Verificar que la tabla pagos fue creada ────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pagos'
ORDER BY ordinal_position;
