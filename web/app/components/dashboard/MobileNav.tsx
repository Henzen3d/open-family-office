'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Sparkles, Receipt, Settings } from 'lucide-react';

interface MobileNavProps {
  activeTab: 'all' | 'fix' | 'facilita' | 'pf';
  setActiveTab: (tab: 'all' | 'fix' | 'facilita' | 'pf') => void;
  setIsStatementOpen?: (open: boolean) => void;
  setIsAssistantOpen: (open: boolean) => void;
  theme?: 'dark' | 'light';
  handleThemeChange?: (theme: 'dark' | 'light') => void;
  setIsSettingsOpen: (open: boolean) => void;
}

export default function MobileNav({
  activeTab,
  setActiveTab,
  setIsAssistantOpen,
  setIsSettingsOpen,
}: MobileNavProps) {
  const pathname = usePathname();
  const isHome = pathname === '/' || pathname === '';
  const isLedger = pathname === '/ledger';
  const isReceipts = pathname === '/receipts';

  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 md:hidden z-40 bg-white/95 dark:bg-[#161c28]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 flex items-center justify-around px-2 shadow-lg select-none pb-[env(safe-area-inset-bottom)]">
      {/* 1. Início */}
      <Link
        href="/"
        onClick={() => {
          if (isHome) setActiveTab('all');
        }}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-xs font-semibold ${
          isHome ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
        }`}
        title="Visão Geral"
      >
        <Home className="w-5 h-5" />
        <span className="text-[11px] mt-0.5">Início</span>
      </Link>

      {/* 2. Livro Razão */}
      <Link
        href="/ledger"
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-xs font-semibold ${
          isLedger ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
        }`}
        title="Livro Razão & Conciliação"
      >
        <FileText className="w-5 h-5" />
        <span className="text-[11px] mt-0.5">Razão</span>
      </Link>

      {/* 3. Center Floating Assistente Button */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        className="w-13 h-13 -mt-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-pill flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-white dark:border-[#161c28] cursor-pointer"
        title="Abrir Assistente Financeiro OFO"
        aria-label="Abrir Assistente Financeiro"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {/* 4. Comprovantes */}
      <Link
        href="/receipts"
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-xs font-semibold ${
          isReceipts ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
        }`}
        title="Cupons & Notas Fiscais"
      >
        <Receipt className="w-5 h-5" />
        <span className="text-[11px] mt-0.5">Recibos</span>
      </Link>

      {/* 5. Ajustes */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
        title="Configurações & Provedores"
      >
        <Settings className="w-5 h-5" />
        <span className="text-[11px] mt-0.5">Ajustes</span>
      </button>
    </nav>
  );
}
