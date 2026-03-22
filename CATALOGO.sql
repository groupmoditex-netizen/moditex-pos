-- ══════════════════════════════════════════════════════════════════════
-- MODITEX POS — Tabla de configuración del Catálogo Web
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS catalogo_config (
  id           SERIAL       PRIMARY KEY,
  modelo_key   TEXT         NOT NULL UNIQUE,  -- "CATEGORIA__MODELO"
  en_catalogo  BOOLEAN      NOT NULL DEFAULT false,
  foto_url     TEXT         DEFAULT '',       -- URL principal de la prenda
  fotos_extra  TEXT         DEFAULT '',       -- URLs separadas por coma
  descripcion  TEXT         DEFAULT '',       -- Descripción para el cliente
  orden        INTEGER      DEFAULT 999,      -- Orden de aparición
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalogo_en_catalogo ON catalogo_config(en_catalogo);
CREATE INDEX IF NOT EXISTS idx_catalogo_orden ON catalogo_config(orden);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_catalogo_updated ON catalogo_config;
CREATE TRIGGER trg_catalogo_updated
  BEFORE UPDATE ON catalogo_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: lectura pública, escritura solo service role
ALTER TABLE catalogo_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "catalogo_public_read" ON catalogo_config;
CREATE POLICY "catalogo_public_read" ON catalogo_config
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "catalogo_service_write" ON catalogo_config;
CREATE POLICY "catalogo_service_write" ON catalogo_config
  FOR ALL USING (true);

SELECT 'Tabla catalogo_config creada correctamente' as resultado;
