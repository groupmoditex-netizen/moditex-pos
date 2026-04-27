-- ============================================================
-- MODITEX — Migración v3
-- Tracking y Agencias de Envío en Comandas
-- ============================================================
-- Ejecutar en: Supabase → SQL Editor → Run
-- Todas las sentencias usan IF NOT EXISTS → son IDEMPOTENTES
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLA: comandas
--    Agregar agencia y guía
-- ────────────────────────────────────────────────────────────
ALTER TABLE comandas
  ADD COLUMN IF NOT EXISTS agencia_envio VARCHAR(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS guia_envio    VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN comandas.agencia_envio IS 'Agencia utilizada para despachar (ej. MRW, Zoom, Retiro)';
COMMENT ON COLUMN comandas.guia_envio    IS 'Número de tracking o guía asociado al despacho';
