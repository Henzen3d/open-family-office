import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenFamilyOffice • Gestão Patrimonial Familiar',
  description: 'Controle consolidado de caixa, faturamento MEI e governança familiar.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0c1017] text-[#f8fafc] flex flex-col min-h-screen font-sans selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
