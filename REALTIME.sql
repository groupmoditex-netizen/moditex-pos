-- ══════════════════════════════════════════════════════════════════
-- MODITEX POS — Activar Supabase Realtime
-- Ejecutar en: Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════

-- Activar Realtime en las tablas principales
ALTER PUBLICATION supabase_realtime ADD TABLE movimientos;
ALTER PUBLICATION supabase_realtime ADD TABLE inventario;
ALTER PUBLICATION supabase_realtime ADD TABLE comandas;
ALTER PUBLICATION supabase_realtime ADD TABLE pagos;
ALTER PUBLICATION supabase_realtime ADD TABLE productos;

-- Verificar que quedaron activas
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
