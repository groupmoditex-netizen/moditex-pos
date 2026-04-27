export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

/* GET /api/tasa/bcv — proxy hacia DolarApi para obtener tasa EUR oficial del BCV */
export async function GET() {
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/euros/oficial', {
      headers: { 'Accept': 'application/json' },
      // cache: 'no-store' para Next.js 14
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `DolarApi respondió ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // DolarApi devuelve: { nombre, compra, venta, fuente, fechaActualizacion }
    return NextResponse.json({
      ok: true,
      tasa: data.venta ?? data.promedio ?? data.compra,
      compra: data.compra,
      venta: data.venta,
      fuente: data.fuente || 'BCV',
      fechaActualizacion: data.fechaActualizacion,
      raw: data,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Error de conexión con DolarApi: ${e.message}` },
      { status: 502 }
    );
  }
}
