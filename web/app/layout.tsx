import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import PWARegister from './components/PWARegister';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0d131f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'OpenFamilyOffice • Gestão Patrimonial Familiar',
  description: 'Controle consolidado de caixa, faturamento MEI e governança familiar.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OpenFamilyOffice',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`dark ${plusJakarta.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="antialiased flex flex-col min-h-screen font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
