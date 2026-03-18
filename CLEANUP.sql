-- ══════════════════════════════════════════════════════════════════════
-- MODITEX POS — Eliminar tablas no usadas
-- ✅ SEGURO: Solo elimina tablas genéricas de plantilla, NO tus datos
-- Ejecutar en: Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════════

-- PASO 1: Ver qué tablas existen antes de borrar (verificación previa)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ══════════════════════════════════════════════════════════════════════
-- PASO 2: Eliminar tablas de plantilla genérica (inglés / no usadas)
-- CASCADE elimina también sus foreign keys e índices
-- ══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS order_items      CASCADE;
DROP TABLE IF EXISTS orders           CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products         CASCADE;
DROP TABLE IF EXISTS movements        CASCADE;
DROP TABLE IF EXISTS clients          CASCADE;
DROP TABLE IF EXISTS companies        CASCADE;

-- ══════════════════════════════════════════════════════════════════════
-- PASO 3: Agregar columnas faltantes en tus tablas activas
--         (por si no corriste MIGRATION.sql antes)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE comandas
  ADD COLUMN IF NOT EXISTS fecha_entrega   DATE,
  ADD COLUMN IF NOT EXISTS notas           TEXT         DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_id      TEXT         DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_creacion  DATE         DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ  DEFAULT NOW();

-- ── Tabla pagos con esquema venezolano ────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id            TEXT        PRIMARY KEY,
  comanda_id    TEXT        NOT NULL,
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagos_comanda  ON pagos(comanda_id);
CREATE INDEX IF NOT EXISTS idx_movs_sku       ON movimientos(sku);
CREATE INDEX IF NOT EXISTS idx_movs_tipo      ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movs_fecha     ON movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movs_created   ON movimientos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_sku        ON inventario(sku);

-- ══════════════════════════════════════════════════════════════════════
-- PASO 4: Verificar resultado — deberías ver SOLO las tablas de MODITEX
-- ══════════════════════════════════════════════════════════════════════
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Resultado esperado:
-- clientes, comandas, comandas_items, inventario,
-- logs, movimientos, pagos, productos, recetas, usuarios
