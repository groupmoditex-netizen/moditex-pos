-- ============================================================
-- MODITEX — Migración v6 (Auditoría de Stock y Control de Deudas)
-- ============================================================
-- Ejecutar en: Supabase → SQL Editor → Run
-- ============================================================

-- 1. Agregar autorización de deuda a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS autoriza_deuda BOOLEAN DEFAULT FALSE;

-- 2. Crear tabla de auditoría de stock
CREATE TABLE IF NOT EXISTS auditoria_stock (
    id SERIAL PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    cantidad INT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    id_venta_asociada TEXT,
    concepto TEXT
);

-- Permisos
GRANT ALL ON auditoria_stock TO authenticated;
GRANT ALL ON auditoria_stock TO anon;

-- 3. Crear función de Trigger para interceptar Entradas Fantasma
CREATE OR REPLACE FUNCTION tf_auditar_fantasmas()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar si el concepto indica que forzaron entrada de fábrica
    IF NEW.concepto ILIKE '%Fábrica%' OR NEW.concepto ILIKE '%Producción Rápida%' THEN
        INSERT INTO auditoria_stock (usuario_id, producto_id, cantidad, fecha, id_venta_asociada, concepto)
        VALUES (
            COALESCE(NEW.usuario, 'desconocido'),
            NEW.sku,
            NEW.cantidad,
            COALESCE(NEW.created_at, NOW()),
            NEW.referencia,
            NEW.concepto
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear el Trigger en movimientos
DROP TRIGGER IF EXISTS trg_auditar_fantasmas ON movimientos;
CREATE TRIGGER trg_auditar_fantasmas
AFTER INSERT ON movimientos
FOR EACH ROW
EXECUTE FUNCTION tf_auditar_fantasmas();

-- FIN DE MIGRACIÓN
