-- MODITEX POS — Parche de esquema
-- Ejecutar en: Supabase → SQL Editor
-- Descripción: Agrega la columna 'resultado' que usan todos los inserts de audit log

ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS resultado text;

-- Verificar que todo quedó bien:
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'logs' ORDER BY ordinal_position;
