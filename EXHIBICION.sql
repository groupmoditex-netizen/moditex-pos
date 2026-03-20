-- ══════════════════════════════════════════════════════════════════════
-- MODITEX POS — Tabla EXHIBICION (Área de Mostrador)
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS exhibicion (
  id            TEXT        PRIMARY KEY,          -- EXH-YYYYMMDD-XXXXXX
  sku           TEXT        NOT NULL,
  modelo        TEXT        DEFAULT '',
  color         TEXT        DEFAULT '',
  talla         TEXT        DEFAULT '',
  cantidad      INT         NOT NULL DEFAULT 1,
  estado        TEXT        NOT NULL DEFAULT 'activo',  -- activo | vendido | devuelto
  fecha_entrada DATE        DEFAULT CURRENT_DATE,
  fecha_salida  DATE,                             -- cuando se vende o devuelve
  precio_venta  NUMERIC     DEFAULT 0,            -- precio al que se vendió (si aplica)
  notas         TEXT        DEFAULT '',
  registrado_por TEXT       DEFAULT 'sistema',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_exhibicion_sku    ON exhibicion(sku);
CREATE INDEX IF NOT EXISTS idx_exhibicion_estado ON exhibicion(estado);
CREATE INDEX IF NOT EXISTS idx_exhibicion_fecha  ON exhibicion(fecha_entrada DESC);

-- Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'exhibicion'
ORDER BY ordinal_position;
