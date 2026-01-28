import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agente de Enriquecimento de CNPJ',
  description: 'Sistema inteligente para enriquecer dados de CNPJ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black">
          {children}
        </div>
      </body>
    </html>
  );
}
