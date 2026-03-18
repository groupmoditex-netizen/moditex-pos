-- ══════════════════════════════════════════════════════════════════
-- MODITEX POS — Sistema de Login y Roles
-- Ejecutar en: Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════

-- Actualizar tabla usuarios para tener PIN de acceso
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nombre    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pin       TEXT DEFAULT '',  -- PIN de 4-6 dígitos (guardado como hash simple)
  ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;

-- Insertar usuarios de ejemplo
-- ROL: 'admin' = acceso total | 'vendedor' = comandas, historial, dashboard | 'viewer' = solo ver
INSERT INTO usuarios (email, nombre, rol, pin, activo) VALUES
  ('admin@moditex.com',    'Administrador',  'admin',    '1234', true),
  ('vendedor@moditex.com', 'Vendedora 1',    'vendedor', '5678', true),
  ('vista@moditex.com',    'Solo Vista',     'viewer',   '9999', true)
ON CONFLICT (email) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol    = EXCLUDED.rol,
  pin    = EXCLUDED.pin,
  activo = EXCLUDED.activo;

-- Verificar
SELECT email, nombre, rol, activo FROM usuarios;

-- ══════════════════════════════════════════════════════════════════
-- PERMISOS POR ROL:
-- admin   → todo el sistema
-- vendedor → dashboard, inventario, historial, comandas, venta-directa
-- viewer  → dashboard, inventario, historial (solo lectura)
-- ══════════════════════════════════════════════════════════════════
