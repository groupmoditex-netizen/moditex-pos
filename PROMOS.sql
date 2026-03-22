-- ══════════════════════════════════════════════════════════════════════
-- MODITEX POS — Tabla de Promos / Combos
-- Si ya la creaste antes, ejecuta solo el bloque ALTER TABLE.
-- ══════════════════════════════════════════════════════════════════════

-- Crear tabla (si no existe)
CREATE TABLE IF NOT EXISTS promos (
  id             SERIAL        PRIMARY KEY,
  nombre         TEXT          NOT NULL,
  precio_mayor   NUMERIC       NOT NULL DEFAULT 0,
  precio_detal   NUMERIC       NOT NULL DEFAULT 0,
  num_piezas     INTEGER       NOT NULL DEFAULT 2,
  descripcion    TEXT          DEFAULT '',
  activo         BOOLEAN       NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- Si ya la tenías con columna "precio" (versión anterior), migra así:
ALTER TABLE promos ADD COLUMN IF NOT EXISTS precio_mayor NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE promos ADD COLUMN IF NOT EXISTS precio_detal NUMERIC NOT NULL DEFAULT 0;
-- Opcional: copia precio viejo a ambos campos
UPDATE promos SET precio_mayor = COALESCE(precio, 0), precio_detal = COALESCE(precio, 0) WHERE precio_mayor = 0;

-- Índice
CREATE INDEX IF NOT EXISTS idx_promos_activo ON promos(activo);

-- Verificar
SELECT id, nombre, precio_mayor, precio_detal, num_piezas, activo FROM promos ORDER BY nombre;
