'use client';

import React from 'react';
import {
  Search,
  Calendar,
  Sun,
  Moon,
  Sliders,
  Wallet,
  Upload,
  Camera,
  Send,
  ArrowDownLeft,
  FileText,
} from 'lucide-react';
import CurrencyToggle from '../cross_border/CurrencyToggle';

interface DashboardHeaderProps {
  activeTab: 'all' | 'fix' | 'facilita' | 'pf';
  setActiveTab: (tab: 'all' | 'fix' | 'facilita' | 'pf') => void;
  theme: 'dark' | 'light';
  handleThemeChange: (theme: 'dark' | 'light') => void;
  setIsSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: 'providers' | 'accounts' | 'appearance' | 'integrations') => void;
  setIsStatementOpen: (open: boolean) => void;
  setIsReceiptOpen: (open: boolean) => void;
  setIsCobrançaOpen: (open: boolean) => void;
  setIsDasModalOpen: (open: boolean) => void;
}

export default function DashboardHeader({
  activeTab,
  setActiveTab,
  theme,
  handleThemeChange,
  setIsSettingsOpen,
  setSettingsTab,
  setIsStatementOpen,
  setIsReceiptOpen,
  setIsCobrançaOpen,
  setIsDasModalOpen,
}: DashboardHeaderProps) {
  return (
    <>
      {/* Top Header Bar */}
      <header className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        {/* Search Input with ⌘K */}
        <div className="w-full md:w-96 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar lançamentos, guias DAS, CNPJ..."
            className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-2xl text-xs placeholder-slate-400 text-slate-900 dark:text-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60 transition"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-slate-100 dark:bg-[#212a3d] text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-white/10">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Quick Entity Filter Pill Switches */}
        <div className="hidden xl:flex items-center bg-white dark:bg-[#161c28] p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
              activeTab === 'all'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Consolidado
          </button>
          <button
            onClick={() => setActiveTab('fix')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
              activeTab === 'fix'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Fix Serviços MEI (Osmar)
          </button>
          <button
            onClick={() => setActiveTab('facilita')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
              activeTab === 'facilita'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Facilita Vistorias MEI (Vera)
          </button>
          <button
            onClick={() => setActiveTab('pf')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
              activeTab === 'pf'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Família PF (Casal)
          </button>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            <span>Ambiente Privado</span>
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Semana 45 • 2026</span>
          </button>

          {/* Global Multi-Currency Toggle */}
          <CurrencyToggle />

          {/* Quick Theme Switcher */}
          <button
            onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            className="p-2.5 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition active:scale-95"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 animate-in spin-in-180 duration-300" />
            )}
          </button>

          {/* Quick Settings Icon */}
          <button
            onClick={() => {
              setSettingsTab('providers');
              setIsSettingsOpen(true);
            }}
            title="Configurações & Provedores de IA"
            className="p-2.5 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition active:scale-95"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Welcome Greeting & Action Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Olá, Osmar & Vera!
            </h1>
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              v1.0 • Privado
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium text-pretty">
            Gestão Patrimonial Consolidada • 2 CNPJs MEI (Titularidades Separadas) + Finanças Familiares (PF) • Processamento Local e Privado
          </p>
        </div>

        {/* Quick Action Pill Group */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs no-scrollbar">
          <button
            onClick={() => {
              setSettingsTab('accounts');
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
          >
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span>Bancos & Saldos</span>
          </button>
          <button
            onClick={() => setIsStatementOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white rounded-2xl font-bold shadow-pill hover:bg-indigo-500 transition whitespace-nowrap active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Extrato OFX / CSV</span>
          </button>
          <button
            onClick={() => setIsReceiptOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
          >
            <Camera className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>Escanear Cupom</span>
          </button>
          <button
            onClick={() => {
              document.getElementById('quick-transfer-card')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
          >
            <Send className="w-4 h-4 text-slate-400" />
            <span>Enviar PIX</span>
          </button>
          <button
            onClick={() => setIsCobrançaOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4 text-slate-400" />
            <span>Cobrança</span>
          </button>
          <button
            onClick={() => setIsDasModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Pagar DAS / Fatura</span>
          </button>
        </div>
      </div>
    </>
  );
}

