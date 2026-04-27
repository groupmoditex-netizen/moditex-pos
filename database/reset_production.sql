-- ============================================================
-- MODITEX — Script de Reinicio a Producción
-- ============================================================
-- ATENCIÓN: Este script BORRA todos los datos de prueba.
-- No lo ejecutes hasta que estés listo para empezar de verdad.
-- ============================================================

-- 1. Borrar historial de comandas
TRUNCATE TABLE comanda_comentarios CASCADE;
TRUNCATE TABLE comandas_items CASCADE;
TRUNCATE TABLE comandas CASCADE;

-- 2. Borrar historial de movimientos de inventario y logs
TRUNCATE TABLE stock_movimientos CASCADE;
TRUNCATE TABLE stock_sync_history CASCADE;

-- 3. Reiniciar el stock de todos los productos a 0
UPDATE productos SET stock = 0;

-- 4. Opcional: Borrar clientes (Descomenta si son clientes de prueba)
-- TRUNCATE TABLE clientes CASCADE;

-- 5. Opcional: Borrar notificaciones
-- TRUNCATE TABLE notificaciones CASCADE;

-- Reiniciar secuencias (para que los IDs empiecen de 1 de nuevo si aplica)
-- ALTER SEQUENCE IF EXISTS comandas_id_seq RESTART WITH 1;

-- Mensaje de confirmación
DO $$ BEGIN
  RAISE NOTICE 'Sistema reiniciado exitosamente. Los datos operativos han sido borrados.';
END $$;
