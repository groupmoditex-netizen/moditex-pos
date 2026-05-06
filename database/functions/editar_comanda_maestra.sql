-- ============================================================
-- FUNCIÓN: editar_comanda_maestra
-- Propósito: Actualiza una comanda, sus items y pagos de forma atómica.
--           Maneja la reconciliación de inventario y "Producción Rápida".
-- ============================================================

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
  -- 1. Extraer datos del payload
  v_new_comanda := p_payload->'comanda';
  v_new_items := p_payload->'items';
  v_new_pagos := p_payload->'pagos';
  v_new_status := UPPER(v_new_comanda->>'status');

  -- 2. Bloqueo de Comanda
  SELECT status INTO v_old_status FROM comandas WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Comanda no encontrada');
  END IF;

  -- 3. Actualizar Datos Principales de la Comanda
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

  -- 4. Procesar Items (Reconciliación de Stock)
  IF jsonb_typeof(v_new_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_new_items)
    LOOP
      v_sku := UPPER(TRIM(v_item->>'sku'));
      v_qty := (v_item->>'cantidad')::INT;
      v_desde_prod := (v_item->>'desde_produccion')::BOOLEAN;
      v_processed_skus := array_append(v_processed_skus, v_sku);

      -- Buscar si ya existía en la comanda
      SELECT * INTO v_old_item FROM comandas_items WHERE comanda_id = p_id AND sku = v_sku;

      IF FOUND THEN
        -- RECONCILIACIÓN DE ITEM EXISTENTE
        v_diff := v_qty - v_old_item.cantidad;

        IF v_diff != 0 THEN
          -- Lógica de Producción Rápida
          IF v_diff > 0 AND v_desde_prod THEN
            -- Inyectar stock si es desde producción
            PERFORM registrar_movimiento_atomico(
              p_sku := v_sku, p_tipo_movimiento := 'ENTRADA', p_cantidad := v_diff,
              p_concepto := 'Entrada Producción Rápida (Edición Cmd ' || p_id || ')',
              p_usuario_registro := p_usuario, p_referencia_id := p_id
            );
          END IF;

          -- Si la comanda ya está EMPACADA o ENVIADA, ajustar stock físico
          IF v_new_status IN ('EMPACADO', 'ENVIADO', 'DESPACHADO') THEN
            IF v_diff > 0 THEN
              -- Salida adicional
              SELECT ok, mensaje INTO v_res_boolean, v_msg FROM registrar_movimiento_atomico(
                p_sku := v_sku, p_tipo_movimiento := 'SALIDA', p_cantidad := v_diff,
                p_concepto := 'Ajuste Salida (Edición Cmd ' || p_id || ')',
                p_usuario_registro := p_usuario, p_referencia_id := p_id
              );
              IF NOT v_res_boolean THEN v_movs_error := v_movs_error || jsonb_build_object('sku', v_sku, 'error', v_msg); END IF;
            ELSIF v_diff < 0 THEN
              -- Devolución de stock
              PERFORM registrar_movimiento_atomico(
                p_sku := v_sku, p_tipo_movimiento := 'ENTRADA', p_cantidad := ABS(v_diff),
                p_concepto := 'Devolución Stock (Edición Cmd ' || p_id || ')',
                p_usuario_registro := p_usuario, p_referencia_id := p_id
              );
            END IF;
          END IF;
        END IF;

        -- Actualizar registro del item
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
        -- ITEM NUEVO EN LA COMANDA
        -- Lógica de Producción Rápida para item nuevo
        IF v_desde_prod THEN
          PERFORM registrar_movimiento_atomico(
            p_sku := v_sku, p_tipo_movimiento := 'ENTRADA', p_cantidad := v_qty,
            p_concepto := 'Entrada Producción Rápida (Nuevo Item Cmd ' || p_id || ')',
            p_usuario_registro := p_usuario, p_referencia_id := p_id
          );
        END IF;

        -- Descontar stock si la comanda ya está en estado de despacho
        IF v_new_status IN ('EMPACADO', 'ENVIADO', 'DESPACHADO') THEN
          SELECT ok, mensaje INTO v_res_boolean, v_msg FROM registrar_movimiento_atomico(
            p_sku := v_sku, p_tipo_movimiento := 'SALIDA', p_cantidad := v_qty,
            p_concepto := 'Salida Nuevo Item (Edición Cmd ' || p_id || ')',
            p_usuario_registro := p_usuario, p_referencia_id := p_id
          );
          IF NOT v_res_boolean THEN v_movs_error := v_movs_error || jsonb_build_object('sku', v_sku, 'error', v_msg); END IF;
        END IF;

        INSERT INTO comandas_items (
          comanda_id, sku, cantidad, precio, talla, color, modelo, despachado, tipo_precio, desde_produccion
        ) VALUES (
          p_id, v_sku, v_qty, (v_item->>'precio')::NUMERIC, v_item->>'talla', v_item->>'color', v_item->>'modelo',
          CASE WHEN v_new_status IN ('EMPACADO', 'ENVIADO', 'DESPACHADO') THEN v_qty ELSE 0 END,
          COALESCE(v_item->>'tipo_precio', 'detal'), v_desde_prod
        );
      END IF;
    END LOOP;
  END IF;

  -- 5. Procesar Items Eliminados (que estaban en la BD pero no en el nuevo payload)
  FOR v_old_item IN SELECT * FROM comandas_items WHERE comanda_id = p_id AND NOT (sku = ANY(v_processed_skus))
  LOOP
    -- Si ya se había descontado stock (estaba despachado), devolverlo
    IF v_old_item.despachado > 0 THEN
      PERFORM registrar_movimiento_atomico(
        p_sku := v_old_item.sku, p_tipo_movimiento := 'ENTRADA', p_cantidad := v_old_item.despachado,
        p_concepto := 'Devolución stock (Item eliminado Cmd ' || p_id || ')',
        p_usuario_registro := p_usuario, p_referencia_id := p_id
      );
    END IF;
    DELETE FROM comandas_items WHERE id = v_old_item.id;
  END LOOP;

  -- 6. Actualizar Pagos (Borrar y Reinsertar para simplicidad, o podrías reconciliar)
  DELETE FROM pagos WHERE comanda_id = p_id;
  IF jsonb_typeof(v_new_pagos) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_new_pagos)
    LOOP
      INSERT INTO pagos (
        comanda_id, metodo, moneda, divisa, monto, monto_pagado, 
        monto_bs, monto_divisa, tasa_bs, referencia, notas
      ) VALUES (
        p_id, v_item->>'metodo', COALESCE(v_item->>'moneda', 'EUR'), COALESCE(v_item->>'divisa', 'EUR'),
        (v_item->>'monto')::NUMERIC, (v_item->>'monto_pagado')::NUMERIC,
        (v_item->>'monto_bs')::NUMERIC, (v_item->>'monto_divisa')::NUMERIC,
        (v_item->>'tasa_bs')::NUMERIC, COALESCE(v_item->>'referencia', ''), COALESCE(v_item->>'notas', '')
      );
    END LOOP;
  END IF;

  -- 7. Verificar Errores Fatales de Inventario
  IF jsonb_array_length(v_movs_error) > 0 THEN
    RAISE EXCEPTION 'INVENTARIO_FATAL:%', (v_movs_error->0->>'error');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', p_id);

EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'INVENTARIO_FATAL:%' THEN
      RETURN jsonb_build_object('ok', false, 'error', REPLACE(SQLERRM, 'INVENTARIO_FATAL:', ''), 'detalles', v_movs_error);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'codigo', SQLSTATE);
    END IF;
END;
$$ LANGUAGE plpgsql;
