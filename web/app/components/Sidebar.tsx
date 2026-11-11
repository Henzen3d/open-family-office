'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Settings,
  Receipt,
  Compass,
} from 'lucide-react';

interface SidebarProps {
  activeTab?: 'all' | 'fix' | 'facilita' | 'pf';
  setActiveTab?: (tab: 'all' | 'fix' | 'facilita' | 'pf') => void;
  setLedgerFilter?: (filter: 'all' | 'inter' | 'caixa' | 'nubank') => void;
  liquidityView?: 'compare' | 'history' | 'cumulative';
  setLiquidityView?: (view: 'compare' | 'history' | 'cumulative') => void;
  setIsSettingsOpen?: (open: boolean) => void;
  apiOnline?: boolean | null;
}

export default function Sidebar({
  activeTab = 'all',
  setActiveTab,
  setLedgerFilter,
  liquidityView = 'compare',
  setLiquidityView,
  setIsSettingsOpen,
  apiOnline = true,
}: SidebarProps) {
  const pathname = usePathname();
  const isHome = pathname === '/' || pathname === '';

  const handleHomeClick = () => {
    if (setActiveTab) setActiveTab('all');
  };

  const handleLedgerClick = () => {
    if (isHome) {
      if (setActiveTab) setActiveTab('all');
      document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCardsClick = () => {
    if (isHome) {
      if (setActiveTab) setActiveTab('all');
      if (setLedgerFilter) setLedgerFilter('inter');
      document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAnalyticsClick = () => {
    if (isHome) {
      if (setLiquidityView) setLiquidityView('history');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGovernanceClick = () => {
    if (isHome) {
      document.getElementById('governance-card')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-white/95 dark:bg-[#0c1017]/95 backdrop-blur-md flex flex-col items-center py-6 px-3 z-40 shrink-0 select-none border-r border-slate-200/80 dark:border-white/5 h-screen justify-between">
      <div className="flex flex-col items-center w-full">
        {/* Brand Emblem */}
        <Link
          href="/"
          onClick={handleHomeClick}
          className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/10 shadow-lg flex items-center justify-center mb-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#1a2232] transition group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
            O
          </div>
        </Link>

        {/* Nav Items with real active states */}
        <nav className="flex flex-col items-center gap-4 w-full">
          <Link
            href="/"
            title="Visão Geral / Dashboard"
            onClick={handleHomeClick}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isHome && activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-pill scale-105'
                : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
            }`}
          >
            <Home className="w-5 h-5" />
          </Link>

          {isHome ? (
            <button
              title="Livro Razão & Conciliação"
              onClick={handleLedgerClick}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
            >
              <FileText className="w-5 h-5" />
            </button>
          ) : (
            <Link
              href="/ledger"
              title="Livro Razão & Conciliação"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
                pathname === '/ledger'
                  ? 'bg-indigo-600 text-white shadow-pill scale-105'
                  : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
              }`}
            >
              <FileText className="w-5 h-5" />
            </Link>
          )}

          <Link
            href="/receipts"
            title="Cupons & Notas Fiscais"
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
              pathname === '/receipts'
                ? 'bg-indigo-600 text-white shadow-pill scale-105'
                : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
            }`}
          >
            <Receipt className="w-5 h-5" />
          </Link>

          <Link
            href="/strategy"
            title="Central de Estratégias & Simuladores"
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition ${
              pathname === '/strategy'
                ? 'bg-indigo-600 text-white shadow-pill scale-105'
                : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
            }`}
          >
            <Compass className="w-5 h-5" />
          </Link>

          {isHome ? (
            <button
              title="Cartões & Contas Multientidade"
              onClick={handleCardsClick}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
            >
              <CreditCard className="w-5 h-5" />
            </button>
          ) : null}

          {isHome ? (
            <button
              title="Curva Patrimonial & Analytics"
              onClick={handleAnalyticsClick}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                liquidityView === 'history'
                  ? 'bg-indigo-600 text-white shadow-pill scale-105'
                  : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>
          ) : null}

          {isHome ? (
            <button
              title="Governança Conjugal (Dual-Signature)"
              onClick={handleGovernanceClick}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          ) : null}
        </nav>
      </div>

      {/* Bottom Settings & Status Pin - ALWAYS visible and fixed at bottom */}
      <div className="flex flex-col items-center gap-3 pb-2 w-full">
        {setIsSettingsOpen ? (
          <button
            title="Configurações & Provedores de IA"
            onClick={() => setIsSettingsOpen(true)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition hover:scale-105 ${
              pathname === '/settings'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        ) : (
          <Link
            href="/settings"
            title="Configurações & Provedores de IA"
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition hover:scale-105 ${
              pathname === '/settings'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
            }`}
          >
            <Settings className="w-5 h-5" />
          </Link>
        )}

        <div
          className={`w-2.5 h-2.5 rounded-full ring-4 ${
            apiOnline
              ? 'bg-emerald-400 ring-emerald-500/20'
              : 'bg-amber-400 ring-amber-500/20'
          }`}
          title={apiOnline ? 'Conexão Local Segura Ativa' : 'Verificando Conexão'}
        />
      </div>
    </aside>
  );
}

