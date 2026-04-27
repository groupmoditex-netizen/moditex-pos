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
  // keepalive: true permite que el request termine aunque se cierre la pestaña (útil para POST/PUT)
  // limitado a payloads pequeños (<64KB), lo cual cumple nuestro caso.
  const isMutation = options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE';
  
  return fetch(url, {
    ...options,
    credentials: 'same-origin',
    keepalive: isMutation,
    headers: {
      ...(options.headers || {}),
    },
  });
}
