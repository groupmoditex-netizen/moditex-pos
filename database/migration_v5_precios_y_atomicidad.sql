-- ============================================================
-- MODITEX — Migración v5 (Precios, Atomicidad y Persistencia)
-- ============================================================
-- Ejecutar en: Supabase → SQL Editor → Run
-- ============================================================

-- 1. Crear tabla de logs de errores
CREATE TABLE IF NOT EXISTS logs_errores (
    id SERIAL PRIMARY KEY,
    funcion TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    detalles JSONB,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT ALL ON logs_errores TO authenticated;

-- 2. Crear tabla de borradores de venta (para persistencia cruzada)
CREATE TABLE IF NOT EXISTS borradores_venta (
    id TEXT PRIMARY KEY,
    usuario_email TEXT NOT NULL,
    payload JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT ALL ON borradores_venta TO authenticated;

-- 3. Crear función de cálculo de precio centralizada
CREATE OR REPLACE FUNCTION calcular_precio_final(
    p_producto_id TEXT,
    p_cantidad_item INT,
    p_cantidad_total_carrito INT,
    p_cantidad_modelo INT,
    p_tipo_forzado TEXT DEFAULT 'AUTO' -- 'AUTO', 'MAYOR_FORZADO', 'DETAL_FORZADO'
) RETURNS NUMERIC AS $$
DECLARE
    v_precio_detal NUMERIC;
    v_precio_mayor NUMERIC;
    v_min_mayorista INT;
    v_modelos_min_mayorista INT;
    v_precio_final NUMERIC;
    v_es_mayor BOOLEAN := FALSE;
BEGIN
    SELECT precio_detal, precio_mayor, COALESCE(min_mayorista, 6), COALESCE(modelos_min_mayorista, 3)
    INTO v_precio_detal, v_precio_mayor, v_min_mayorista, v_modelos_min_mayorista
    FROM productos WHERE sku = p_producto_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    IF p_tipo_forzado = 'MAYOR_FORZADO' THEN
        v_es_mayor := TRUE;
    ELSIF p_tipo_forzado = 'DETAL_FORZADO' THEN
        v_es_mayor := FALSE;
    ELSE
        -- Lógica: >= piezas total Y >= piezas modelo
        IF p_cantidad_total_carrito >= v_min_mayorista AND p_cantidad_modelo >= v_modelos_min_mayorista THEN
            v_es_mayor := TRUE;
        END IF;
    END IF;

    IF v_es_mayor THEN
        v_precio_final := v_precio_mayor;
    ELSE
        v_precio_final := v_precio_detal;
    END IF;

    RETURN v_precio_final;
END;
$$ LANGUAGE plpgsql STABLE;
GRANT EXECUTE ON FUNCTION calcular_precio_final TO authenticated;

-- 4. Blindaje del RPC editar_comanda_maestra
CREATE OR REPLACE FUNCTION editar_comanda_maestra(
  p_id TEXT,
  p_payload JSONB,
  p_usuario TEXT
) RETURNS JSONB AS $$
DECLARE
  v_new_comanda JSONB;
  v_new_items JSONB;
  v_new_pagos JSONB;
  v_old_status TEXT;
  v_new_status TEXT;
  v_item JSONB;
  v_sku TEXT;
  v_qty INT;
  v_desde_prod BOOLEAN;
  v_old_item RECORD;
  v_diff INT;
  v_res_boolean BOOLEAN;
  v_msg TEXT;
  v_movs_error JSONB := '[]'::jsonb;
  v_processed_skus TEXT[] := '{}';
BEGIN
  -- Extraer datos
  v_new_comanda := p_payload->'comanda';
  v_new_items := p_payload->'items';
  v_new_pagos := p_payload->'pagos';
  v_new_status := UPPER(v_new_comanda->>'status');

  -- Bloqueo de registro (Atomicidad de lectura concurrente)
  SELECT status INTO v_old_status FROM comandas WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda no encontrada';
  END IF;

  -- Actualizar Datos Principales
  UPDATE comandas SET
    cliente = v_new_comanda->>'cliente',
    cliente_id = COALESCE(v_new_comanda->>'cliente_id', ''),
    productos = v_new_comanda->'productos',
    precio = (v_new_comanda->>'precio')::NUMERIC,
    monto_pagado = (v_new_comanda->>'monto_pagado')::NUMERIC,
    status = v_new_status,
    notas = COALESCE(v_new_comanda->>'notas', ''),
    agencia_envio = v_new_comanda->>'agencia_envio',
    guia_envio = v_new_comanda->>'guia_envio',
    fecha_entrega = (v_new_comanda->>'fecha_entrega')::DATE,
    updated_at = NOW()
  WHERE id = p_id;

  -- Procesar Items
  IF jsonb_typeof(v_new_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_new_items)
    LOOP
      v_sku := UPPER(TRIM(v_item->>'sku'));
      v_qty := (v_item->>'cantidad')::INT;
      v_desde_prod := (v_item->>'desde_produccion')::BOOLEAN;
      v_processed_skus := array_append(v_processed_skus, v_sku);

      SELECT * INTO v_old_item FROM comandas_items WHERE comanda_id = p_id AND sku = v_sku;

      IF FOUND THEN
        v_diff := v_qty - v_old_item.cantidad;

        IF v_diff != 0 THEN
          IF v_diff > 0 AND v_desde_prod THEN
            PERFORM registrar_movimiento_atomico(v_sku, 'ENTRADA', v_diff, 'Entrada Producción Rápida (Edición Cmd ' || p_id || ')', p_usuario, p_id);
          END IF;

          IF v_new_status IN ('EMPACADO', 'ENVIADO', 'DESPACHADO') THEN
            IF v_diff > 0 THEN
              SELECT ok, mensaje INTO v_res_boolean, v_msg FROM registrar_movimiento_atomico(v_sku, 'SALIDA', v_diff, 'Ajuste Salida (Edición Cmd ' || p_id || ')', p_usuario, p_id);
              IF NOT v_res_boolean THEN 
                v_movs_error := v_movs_error || jsonb_build_object('sku', v_sku, 'error', v_msg); 
              END IF;
            ELSIF v_diff < 0 THEN
              PERFORM registrar_movimiento_atomico(v_sku, 'ENTRADA', ABS(v_diff), 'Devolución Stock (Edición Cmd ' || p_id || ')', p_usuario, p_id);
            END IF;
          END IF;
        END IF;

        UPDATE comandas_items SET
          cantidad = v_qty,
          precio = (v_item->>'precio')::NUMERIC,
          talla = v_item->>'talla',
          color = v_item->>'color',
          modelo = v_item->>'modelo',
          tipo_precio = COALESCE(v_item->>'tipo_precio', 'detal'),
          despachado = CASE WHEN v_new_status IN ('EMPACADO', 'ENVIADO', 'DESPACHADO') THEN v_qty ELSE despachado END,
          desde_produccion = v_desde_prod
        WHERE id = v_old_item.id;

      ELSE
        IF v_desde_prod THEN
          PERFORM registrar_movimiento_atomico(v_sku, 'ENTRADA', v_qty, 'Entrada Producción Rápida (Nuevo Item Cmd ' || p_id || ')', p_usuario, p_id);
        END IF;

        IF v_new_status IN ('EMPACADO', 'ENVIADO', 'DESPACHADO') THEN
          SELECT ok, mensaje INTO v_res_boolean, v_msg FROM registrar_movimiento_atomico(v_sku, 'SALIDA', v_qty, 'Salida Nuevo Item (Edición Cmd ' || p_id || ')', p_usuario, p_id);
          IF NOT v_res_boolean THEN 
            v_movs_error := v_movs_error || jsonb_build_object('sku', v_sku, 'error', v_msg); 
          END IF;
        END IF;

        INSERT INTO comandas_items (comanda_id, sku, cantidad, precio, talla, color, modelo, despachado, tipo_precio, desde_produccion)
        VALUES (p_id, v_sku, v_qty, (v_item->>'precio')::NUMERIC, v_item->>'talla', v_item->>'color', v_item->>'modelo', CASE WHEN v_new_status IN ('EMPACADO', 'ENVIADO', 'DESPACHADO') THEN v_qty ELSE 0 END, COALESCE(v_item->>'tipo_precio', 'detal'), v_desde_prod);
      END IF;
    END LOOP;
  END IF;

  FOR v_old_item IN SELECT * FROM comandas_items WHERE comanda_id = p_id AND NOT (sku = ANY(v_processed_skus))
  LOOP
    IF v_old_item.despachado > 0 THEN
      PERFORM registrar_movimiento_atomico(v_old_item.sku, 'ENTRADA', v_old_item.despachado, 'Devolución stock (Item eliminado Cmd ' || p_id || ')', p_usuario, p_id);
    END IF;
    DELETE FROM comandas_items WHERE id = v_old_item.id;
  END LOOP;

  DELETE FROM pagos WHERE comanda_id = p_id;
  IF jsonb_typeof(v_new_pagos) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_new_pagos)
    LOOP
      INSERT INTO pagos (comanda_id, metodo, moneda, divisa, monto, monto_pagado, monto_bs, monto_divisa, tasa_bs, referencia, notas)
      VALUES (p_id, v_item->>'metodo', COALESCE(v_item->>'moneda', 'EUR'), COALESCE(v_item->>'divisa', 'EUR'), (v_item->>'monto')::NUMERIC, (v_item->>'monto_pagado')::NUMERIC, (v_item->>'monto_bs')::NUMERIC, (v_item->>'monto_divisa')::NUMERIC, (v_item->>'tasa_bs')::NUMERIC, COALESCE(v_item->>'referencia', ''), COALESCE(v_item->>'notas', ''));
    END LOOP;
  END IF;

  -- Si hubo error de inventario (Ej. falta de stock), se interrumpe y se levanta excepción
  IF jsonb_array_length(v_movs_error) > 0 THEN
    RAISE EXCEPTION 'INVENTARIO_FATAL:%', (v_movs_error->0->>'error');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', p_id);

EXCEPTION
  WHEN OTHERS THEN
    -- El bloque entra aquí si ocurre CUALQUIER error.
    -- Las modificaciones hechas en comandas_items, comandas, etc, SE REVIERTEN automáticamente por PostgreSQL.
    -- Pero sí podemos hacer nuevos inserts para guardar el Log del error:
    INSERT INTO logs_errores (funcion, mensaje, detalles)
    VALUES ('editar_comanda_maestra', SQLERRM, v_movs_error);

    IF SQLERRM LIKE 'INVENTARIO_FATAL:%' THEN
      RETURN jsonb_build_object('ok', false, 'error', REPLACE(SQLERRM, 'INVENTARIO_FATAL:', ''), 'detalles', v_movs_error);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'codigo', SQLSTATE);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- FIN DE MIGRACIÓN
