-- ══════════════════════════════════════════════════════════════════
-- MODITEX POS — Agregar campo username a usuarios
-- Ejecutar en: Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════

-- Agregar columna username única
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS username TEXT DEFAULT '';

-- Crear índice único para username
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_key ON usuarios(username)
  WHERE username IS NOT NULL AND username != '';

-- Actualizar usuarios existentes con username basado en su nombre
UPDATE usuarios SET username = LOWER(REPLACE(nombre, ' ', '_'))
WHERE username = '' OR username IS NULL;

-- Verificar
SELECT email, username, nombre, rol, activo FROM usuarios;
