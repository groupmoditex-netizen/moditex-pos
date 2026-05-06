'use client';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import VentaDirectaUI from '@/components/venta-directa/VentaDirectaUI';

export default function VentaDirectaPage() {
  const { data, recargar } = useAppData() || {};
  const productos = data?.productos || [];
  const clientes = data?.clientes || [];

  return (
    <Shell title="⚡ Venta Directa">
      <VentaDirectaUI 
        productos={productos} 
        clientes={clientes} 
        onSave={() => {
          if (typeof recargar === 'function') recargar();
          // Podríamos redirigir o simplemente limpiar
        }} 
      />
    </Shell>
  );
}
