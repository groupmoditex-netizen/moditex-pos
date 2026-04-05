/**
 * fetchApi — wrapper de fetch para llamadas a la API de MODITEX POS
 *
 * Con el Bloque 2, la sesión viaja en una cookie HttpOnly que el navegador
 * incluye automáticamente en cada request al mismo dominio.
 * No necesitamos leer ni enviar nada manualmente.
 *
 * Uso:
 *   import { fetchApi } from '@/utils/fetchApi';
 *   const data = await fetchApi('/api/dashboard').then(r => r.json());
 */
export function fetchApi(url, options = {}) {
  return fetch(url, {
    ...options,
    // credentials: 'same-origin' asegura que la cookie se envíe
    // en requests al mismo dominio (es el valor por defecto, pero lo ponemos explícito)
    credentials: 'same-origin',
    headers: {
      ...(options.headers || {}),
    },
  });
}
