-- VISTA: v_comandas_detalladas
-- Propósito: Generar dinámicamente el campo 'productos' a partir de comandas_items
-- para evitar redundancia y asegurar integridad de datos.

DROP VIEW IF EXISTS public.v_comandas_detalladas;

CREATE OR REPLACE VIEW public.v_comandas_detalladas AS
WITH items_agregados AS (
  SELECT 
    comanda_id,
    jsonb_agg(
      jsonb_build_object(
        'sku', sku,
        'cantidad', cantidad,
        'cant', cantidad, -- alias para compatibilidad
        'cant_empacada', COALESCE(cant_empacada, 0),
        'despachado', COALESCE(despachado, 0),
        'precio', precio,
        'modelo', modelo,
        'color', color,
        'talla', talla,
        'tipo_precio', tipo_precio
      )
    ) as productos_json
  FROM public.comandas_items
  GROUP BY comanda_id
)
SELECT 
  c.id,
  c.cliente,
  c.cliente_id,
  c.telefono,
  c.precio,
  c.monto_pagado,
  c.status,
  c.notas,
  c.fecha_entrega,
  c.fecha_empaque,
  c.fecha_envio,
  c.created_at,
  c.updated_at,
  c.creado_por,
  COALESCE(ia.productos_json, '[]'::jsonb) as productos
FROM public.comandas c
LEFT JOIN items_agregados ia ON c.id = ia.comanda_id;

COMMENT ON VIEW public.v_comandas_detalladas IS 'Vista que agrega los items de comandas_items en un campo productos virtual para compatibilidad con el frontend.';
