-- ══════════════════════════════════════════════════════════════════
-- MODITEX POS — Sistema de Login y Roles
-- ══════════════════════════════════════════════════════════════════
--
-- ⚠️  ADVERTENCIA: SOLO PARA CONFIGURACIÓN INICIAL / DESARROLLO LOCAL
--
-- Este script fue diseñado para la primera instalación.
-- NO ejecutar en producción si ya tienes usuarios activos —
-- el bloque INSERT usa ON CONFLICT DO UPDATE, lo que sobreescribiría
-- los PINs y datos de todos los usuarios existentes.
--
-- Para gestionar usuarios en producción, usa la pantalla:
--   → /usuarios en el panel de administración de MODITEX POS
--
-- Los PINs en este archivo son EJEMPLOS. Si ejecutas este script,
-- cambia los PINs inmediatamente desde el panel de /usuarios.
-- ══════════════════════════════════════════════════════════════════

-- Actualizar tabla usuarios para tener PIN de acceso
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS nombre TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE DE INSERCIÓN DE EJEMPLO
-- Solo descomenta esto en una instalación NUEVA y vacía.
-- En producción: usa /usuarios del panel de admin.
-- ══════════════════════════════════════════════════════════════════

/*
-- ROL: 'admin' = acceso total | 'vendedor' = comandas, historial, dashboard | 'viewer' = solo ver
-- NOTA: Los PINs aquí son texto plano. Al usar la app, se hashean automáticamente con bcrypt.
--       Si insertas usuarios directo por SQL, ejecuta luego MIGRATION_BCRYPT.sql para hashearlos.

INSERT INTO usuarios (email, nombre, rol, pin, activo) VALUES
  ('admin',   'Administrador', 'admin',    'CAMBIA_ESTE_PIN', true),
  ('vendedor1','Vendedora 1',  'vendedor', 'CAMBIA_ESTE_PIN', true)
ON CONFLICT (email) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol    = EXCLUDED.rol,
  pin    = EXCLUDED.pin,
  activo = EXCLUDED.activo;
*/

-- Verificar usuarios existentes
SELECT email, nombre, rol, activo,
       CASE WHEN pin LIKE '$2%' THEN '✓ hasheado' ELSE '⚠ texto plano' END as estado_pin
FROM usuarios
ORDER BY rol, nombre;

-- ══════════════════════════════════════════════════════════════════
-- PERMISOS POR ROL:
-- admin    → todo el sistema
-- vendedor → dashboard, inventario, historial, comandas, venta-directa, reportes
-- viewer   → dashboard, inventario, historial (solo lectura)
-- ══════════════════════════════════════════════════════════════════
