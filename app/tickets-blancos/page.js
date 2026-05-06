'use client';

import React from 'react';

export default function TicketsBlancosPage() {
  // Generamos una lista de 119 tickets (7 columnas x 17 filas) - Aprovechamiento TOTAL
  const tickets = Array.from({ length: 119 });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)', padding: '20px', fontFamily: 'Poppins, sans-serif' }} className="no-print-bg">
      <div className="no-print" style={{ maxWidth: '1000px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--ink)', margin: 0, fontFamily: 'Poppins, sans-serif' }}>Plantilla Ultra-Eficiente</h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Aprovechamiento TOTAL del papel (119 etiquetas por hoja)</p>
        </div>
        <button
          onClick={handlePrint}
          style={{ background: 'var(--ink)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          🖨 Imprimir 119 Etiquetas
        </button>
      </div>

      {/* Contenedor de la hoja (A4/Carta) */}
      <div className="print-area" style={{ maxWidth: '1000px', margin: '0 auto', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '10px' }} className="print-grid">
          {tickets.map((_, index) => (
            <div
              key={index}
              style={{
                border: '0.5px dashed #aaa', 
                borderRadius: '2px',
                display: 'flex',
                flexDirection: 'column',
                height: '65px',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
            >
              {/* Encabezado del ticket (Estilo Logo Moditex) */}
              <div style={{ 
                background: '#fff', 
                color: '#111', 
                textAlign: 'center', 
                padding: '1px 0'
              }} className="print-exact">
                <span style={{ 
                  fontWeight: '900', 
                  letterSpacing: '0.1em', 
                  fontSize: '8px', 
                  textTransform: 'uppercase', 
                  fontFamily: 'Playfair Display, serif'
                }}>
                  Moditex
                </span>
              </div>

              {/* Campos para rellenar a mano */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center', padding: '0 6px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '8px', fontWeight: '900', color: '#111', width: '22px', fontFamily: 'DM Mono, monospace' }}>REF</span>
                  <div style={{ flex: 1, borderBottom: '0.5px solid #666' }}></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '8px', fontWeight: '900', color: '#111', width: '22px', fontFamily: 'DM Mono, monospace' }}>COL</span>
                  <div style={{ flex: 1, borderBottom: '0.5px solid #666' }}></div>
                </div>
              </div>

              {/* Pie del ticket */}
              <div style={{ paddingBottom: '1px', textAlign: 'center' }}>
                <span style={{ fontSize: '5px', color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'DM Mono, monospace' }}>
                  C. Calidad
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .no-print-bg { background: white !important; padding: 0 !important; }
          .print-area { box-shadow: none !important; max-width: none !important; margin: 0 !important; }
          .print-grid { padding: 22px 4mm 4mm 4mm !important; gap: 2px !important; }
          .print-exact { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 portrait; margin: 5mm; }
        }
        .print-exact { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      `}</style>
    </div>
  );
}
