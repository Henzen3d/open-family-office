import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenFamilyOffice — Assistente Financeiro',
  description: 'Controle de caixa, faturamento MEI e investimentos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-950 text-slate-100 flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
