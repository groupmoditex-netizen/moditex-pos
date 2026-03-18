import './globals.css';
import { AppProvider } from '@/lib/AppContext';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata = { title: 'MODITEX POS', description: 'Sistema MODITEX GROUP' };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
