-- ============================================================
-- MODITEX — Migración v2
-- Salida directa de producción + Motor de precio mayorista
-- ============================================================
-- Ejecutar en: Supabase → SQL Editor → Run
-- Todas las sentencias usan IF NOT EXISTS → son IDEMPOTENTES
-- (puedes volver a ejecutar sin riesgo si algo falló a medias)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLA: productos
--    Agregar reglas de precio mayorista configurables por SKU
-- ────────────────────────────────────────────────────────────
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS min_mayorista          INTEGER DEFAULT 6,   -- Total de piezas del pedido para activar precio mayor
  ADD COLUMN IF NOT EXISTS modelos_min_mayorista  INTEGER DEFAULT 3;   -- Mínimo de piezas de ESTE modelo para que aplique precio mayor

-- Comentarios en columnas
COMMENT ON COLUMN productos.min_mayorista         IS 'Piezas totales del pedido necesarias para activar precio mayorista (default 6, microdurazno usa 12)';
COMMENT ON COLUMN productos.modelos_min_mayorista IS 'Piezas mínimas de este modelo específico para que aplique precio mayorista (default 3)';

-- ────────────────────────────────────────────────────────────
-- 2. TABLA: catalogo_config
--    Marcar prendas disponibles aunque no estén en almacén
-- ────────────────────────────────────────────────────────────
ALTER TABLE catalogo_config
  ADD COLUMN IF NOT EXISTS disponible_produccion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nota_produccion       TEXT    DEFAULT '';

COMMENT ON COLUMN catalogo_config.disponible_produccion IS 'Si true, la prenda aparece en catálogo con badge "Bajo pedido" aunque stock = 0';
COMMENT ON COLUMN catalogo_config.nota_produccion       IS 'Texto informativo al cliente ej: "En producción, disponible en 3 días"';

-- ────────────────────────────────────────────────────────────
-- 3. TABLA: comandas_items  (nombre real en el sistema)
--    Soporte para ítems que vienen directo de producción
--    y precio calculado por motor mayorista
-- ────────────────────────────────────────────────────────────
ALTER TABLE comandas_items
  ADD COLUMN IF NOT EXISTS desde_produccion BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS precio_aplicado  NUMERIC(10,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_precio      TEXT           DEFAULT 'AUTO';
  -- tipo_precio: 'AUTO' | 'MAYOR' | 'DETAL' | 'MAYOR_FORZADO' | 'DETAL_FORZADO' | 'DESCUENTO'

COMMENT ON COLUMN comandas_items.desde_produccion IS 'True si el ítem fue comandado con stock=0 (viene directo de producción)';
COMMENT ON COLUMN comandas_items.precio_aplicado  IS 'Precio efectivo aplicado (calculado por motor mayorista o override)';
COMMENT ON COLUMN comandas_items.tipo_precio      IS 'Origen del precio: AUTO (calculado), MAYOR_FORZADO, DETAL_FORZADO, DESCUENTO';

-- ────────────────────────────────────────────────────────────
-- 4. TABLA: comandas
--    Soporte para descuento global y flag de producción
-- ────────────────────────────────────────────────────────────
ALTER TABLE comandas
  ADD COLUMN IF NOT EXISTS descuento_pct           NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiene_items_produccion  BOOLEAN      DEFAULT FALSE;

COMMENT ON COLUMN comandas.descuento_pct          IS 'Descuento adicional % aplicado sobre el total calculado (0-100)';
COMMENT ON COLUMN comandas.tiene_items_produccion IS 'True si algún ítem fue comandado con stock=0 desde producción directa';

-- ────────────────────────────────────────────────────────────
-- Verificación final — muestra columnas nuevas
-- ────────────────────────────────────────────────────────────
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   IN ('productos', 'catalogo_config', 'comandas_items', 'comandas')
  AND column_name  IN (
    'min_mayorista', 'modelos_min_mayorista',
    'disponible_produccion', 'nota_produccion',
    'desde_produccion', 'precio_aplicado', 'tipo_precio',
    'descuento_pct', 'tiene_items_produccion'
  )
ORDER BY table_name, column_name;
