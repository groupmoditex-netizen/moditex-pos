-- ============================================================
-- MODITEX — Migración v4 (Stock Comprometido)
-- ============================================================
-- Ejecutar en: Supabase → SQL Editor → Run
-- ============================================================

-- 1. Crear o reemplazar la vista de Inventario Real
CREATE OR REPLACE VIEW vw_inventario_real AS
SELECT 
    i.sku,
    i.stock_total AS stock_fisico,
    COALESCE(SUM(ci.cantidad), 0)::integer AS stock_comprometido,
    i.stock_total - COALESCE(SUM(ci.cantidad), 0)::integer AS stock_disponible
FROM inventario i
LEFT JOIN comandas_items ci ON ci.sku = i.sku
LEFT JOIN comandas c ON c.id = ci.comanda_id AND UPPER(c.status) = 'PENDIENTE'
GROUP BY i.sku, i.stock_total;

-- 2. Asegurarse de que los permisos de la vista sean correctos
GRANT SELECT ON vw_inventario_real TO authenticated;
GRANT SELECT ON vw_inventario_real TO anon;

-- FIN DE MIGRACIÓN
