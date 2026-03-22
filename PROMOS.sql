-- ══════════════════════════════════════════════════════════════════════
-- MODITEX POS — Tabla de Promos / Combos
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS promos (
  id          SERIAL        PRIMARY KEY,
  nombre      TEXT          NOT NULL,
  precio      NUMERIC       NOT NULL DEFAULT 0,
  num_piezas  INTEGER       NOT NULL DEFAULT 2,
  descripcion TEXT          DEFAULT '',
  activo      BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Índice para filtrar activas rápido
CREATE INDEX IF NOT EXISTS idx_promos_activo ON promos(activo);

-- Ejemplos de promos (descomenta para probar)
/*
INSERT INTO promos (nombre, precio, num_piezas, descripcion) VALUES
  ('Set Comfy 3 Piezas',    30.00, 3, 'Elige 3 prendas del catálogo al precio de combo'),
  ('Duo Bodies',            18.00, 2, '2 bodies a precio especial'),
  ('Pack Básico 4 Piezas',  45.00, 4, 'Cuatro prendas básicas — escoge colores libremente');
*/

-- Verificar tabla creada
SELECT id, nombre, precio, num_piezas, activo FROM promos ORDER BY nombre;
