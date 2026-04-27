/**
 * Motor de precio mayorista — Moditex
 * Calcula el precio aplicado por ítem según las reglas de cantidad del pedido.
 *
 * REGLA:
 *  Para que un modelo aplique precio MAYOR debe cumplir AMBAS condiciones:
 *    1. total_piezas_pedido >= item.min_mayorista     (default 6, microdurazno 12)
 *    2. cantidad_de_ese_modelo >= item.modelos_min_mayorista (default 3)
 *
 *  Override manual por ítem: tipo_precio = 'MAYOR_FORZADO' | 'DETAL_FORZADO'
 *  Descuento adicional en porcentaje: descuento_pct (0–100)
 */

/**
 * @typedef {Object} ItemCarrito
 * @property {string}  sku
 * @property {string}  modelo
 * @property {number}  qty                     — cantidad pedida
 * @property {number}  precio_detal
 * @property {number}  precio_mayor
 * @property {number}  [min_mayorista]         — default 6
 * @property {number}  [modelos_min_mayorista] — default 3
 * @property {string}  [tipo_precio]           — 'AUTO'|'MAYOR_FORZADO'|'DETAL_FORZADO'
 */

/**
 * Calcula precios del carrito completo aplicando reglas mayoristas.
 * @param {ItemCarrito[]} items
 * @param {number} [descuentoPct=0] — descuento % adicional sobre el precio calculado
 * @returns {Array} items enriquecidos con precio_aplicado, tipo_precio_resultado, ahorro_unitario, subtotal
 */
export function calcularPreciosCarrito(items, descuentoPct = 0) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // 1. Total de piezas en el pedido completo
  const totalPiezas = items.reduce((acc, i) => acc + (parseInt(i.qty) || 0), 0);

  // 2. Sumar piezas por modelo
  const porModelo = {};
  items.forEach(item => {
    const key = (item.modelo || '').toUpperCase();
    if (!porModelo[key]) porModelo[key] = 0;
    porModelo[key] += parseInt(item.qty) || 0;
  });

  // 3. Calcular precio por ítem
  return items.map(item => {
    const qty           = parseInt(item.qty) || 0;
    const minMay        = parseInt(item.min_mayorista)         || 6;
    const minMod        = parseInt(item.modelos_min_mayorista) || 3;
    const cantModelo    = porModelo[(item.modelo || '').toUpperCase()] || 0;
    const precioD       = parseFloat(item.precio_detal)  || 0;
    const precioM       = parseFloat(item.precio_mayor)  || 0;
    const tipoPrecioIn  = item.tipo_precio || 'AUTO';

    let esMayor = false;
    let tipoResultado = 'DETAL';

    if (tipoPrecioIn === 'MAYOR_FORZADO') {
      esMayor = true;
      tipoResultado = 'MAYOR_FORZADO';
    } else if (tipoPrecioIn === 'DETAL_FORZADO') {
      esMayor = false;
      tipoResultado = 'DETAL_FORZADO';
    } else {
      // AUTO: evaluar regla
      esMayor = (totalPiezas >= minMay) && (cantModelo >= minMod);
      tipoResultado = esMayor ? 'MAYOR' : 'DETAL';
    }

    const precioBase   = esMayor ? precioM : precioD;
    const factorDesc   = descuentoPct > 0 ? (1 - descuentoPct / 100) : 1;
    const precioFinal  = Math.round(precioBase * factorDesc * 100) / 100;
    const ahorroUnit   = Math.round((precioD - precioFinal) * 100) / 100;

    return {
      ...item,
      precio_aplicado:       precioFinal,
      tipo_precio_resultado: tipoResultado,
      ahorro_unitario:       ahorroUnit,
      subtotal:              Math.round(precioFinal * qty * 100) / 100,
      // Info de regla para mostrar en UI
      _debug: {
        totalPiezas,
        cantModelo,
        minMay,
        minMod,
        esMayor,
      },
    };
  });
}

/**
 * Resumen del carrito: totales, ahorro, tipo de venta predominante.
 * @param {ReturnType<typeof calcularPreciosCarrito>} itemsCalculados
 */
export function resumenCarrito(itemsCalculados) {
  if (!itemsCalculados?.length) return { subtotal: 0, totalPiezas: 0, ahorro: 0, tipoPredominante: 'DETAL' };

  const subtotal      = itemsCalculados.reduce((a, i) => a + (i.subtotal || 0), 0);
  const totalPiezas   = itemsCalculados.reduce((a, i) => a + (parseInt(i.qty) || 0), 0);
  const ahorro        = itemsCalculados.reduce((a, i) => a + ((i.ahorro_unitario || 0) * (parseInt(i.qty) || 0)), 0);
  const itemsMayor    = itemsCalculados.filter(i => i.tipo_precio_resultado?.includes('MAYOR')).length;
  const tipoPredominante = itemsMayor >= itemsCalculados.length / 2 ? 'MAYOR' : 'DETAL';

  return {
    subtotal:          Math.round(subtotal * 100) / 100,
    totalPiezas,
    ahorro:            Math.round(ahorro * 100) / 100,
    tipoPredominante,
    itemsMayor,
    itemsDetal:        itemsCalculados.length - itemsMayor,
  };
}
