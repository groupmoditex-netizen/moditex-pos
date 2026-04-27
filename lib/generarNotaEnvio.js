import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function generarNotaEnvio(comanda, items, empacadoMap = {}) {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text(`MODITEX GROUP - Nota de Envío`, 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Comanda ID: ${comanda.id}`, 14, 30);
  doc.text(`Cliente: ${comanda.cliente}`, 14, 36);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 42);

  const totalPedido = items.reduce((a, p) => a + parseInt(p.cant||p.cantidad||1), 0);
  let totalEmpacado = 0;

  // Tabla de items
  const tableData = items.map(it => {
    const sku = (it.sku || '').toUpperCase();
    const cant = parseInt(it.cant||it.cantidad||1);
    const empacado = Math.min(empacadoMap[sku] || 0, cant);
    totalEmpacado += empacado;

    let desc = `${it.sku || ''} - ${it.modelo || ''} - ${it.color || ''} - ${it.talla || ''}`;
    if (it.desde_produccion) {
      desc += ' [ PRODUCCIÓN ]';
    }

    return [
      cant,
      desc,
      empacado,
      cant - empacado
    ];
  });

  doc.text(`Items en pedido: ${totalPedido} | Empacados: ${totalEmpacado}`, 14, 48);

  doc.autoTable({
    startY: 55,
    head: [['Ped.', 'Descripción', 'Empacado', 'Falta']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [124, 58, 237] }
  });

  // Guardar/Descargar
  doc.save(`NotaEnvio_${comanda.id}.pdf`);
}
