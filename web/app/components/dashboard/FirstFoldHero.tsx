'use client';

import React from 'react';
import {
  Wallet,
  Camera,
  Upload,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  WifiOff,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';

interface FirstFoldHeroProps {
  activeTab: 'all' | 'fix' | 'facilita' | 'pf';
  setActiveTab: (tab: 'all' | 'fix' | 'facilita' | 'pf') => void;
  activeContextBalance: number | null;
  balanceStatus: 'loading' | 'available' | 'last_known' | 'empty' | 'unavailable';
  formatBRL: (val: number) => string;
  apiOnline: boolean | null;
  inflowMonth?: number | null;
  outflowMonth?: number | null;
  positionDate: string;
  onOpenReceiptScanner: () => void;
  onOpenStatementModal: () => void;
  onOpenAssistant: () => void;
}

export default function FirstFoldHero({
  activeTab,
  setActiveTab,
  activeContextBalance,
  balanceStatus,
  formatBRL,
  apiOnline,
  inflowMonth,
  outflowMonth,
  positionDate,
  onOpenReceiptScanner,
  onOpenStatementModal,
  onOpenAssistant,
}: FirstFoldHeroProps) {
  // Entity descriptions and tags
  const entityMeta = {
    all: {
      name: 'Consolidado Familiar',
      holder: 'Família, Fix MEI & Facilita MEI',
      accountDesc: '3 Contas Operacionais Integradas',
      color: 'indigo',
    },
    fix: {
      name: 'Fix Serviços MEI',
      holder: 'Titular: Osmar',
      accountDesc: 'Banco Inter PJ • Conta Operacional',
      color: 'amber',
    },
    facilita: {
      name: 'Facilita Vistorias MEI',
      holder: 'Titular: Vera',
      accountDesc: 'Caixa Econômica PJ • Conta Operacional',
      color: 'purple',
    },
    pf: {
      name: 'Família PF',
      holder: 'Comunhão Conjugal • Osmar & Vera',
      accountDesc: 'Nubank Ultravioleta • Reserva Familiar',
      color: 'blue',
    },
  }[activeTab];

  return (
    <div className="w-full bg-white dark:bg-[#161c28] rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-card mb-6 transition-all">
      {/* 1. Entity Compact Segmented Selector (Mobile & Desktop First) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-white/5 mb-5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Entidade:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121722] p-1 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Consolidado
            </button>
            <button
              onClick={() => setActiveTab('fix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'fix'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Fix (Osmar)
            </button>
            <button
              onClick={() => setActiveTab('facilita')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'facilita'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Facilita (Vera)
            </button>
            <button
              onClick={() => setActiveTab('pf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'pf'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Família (PF)
            </button>
          </div>
        </div>

        {/* Position Date & Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">{positionDate}</span>
          <span className="text-slate-300 dark:text-white/20">•</span>
          {balanceStatus === 'available' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Saldos Atuais
            </span>
          ) : balanceStatus === 'last_known' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Último dado em cache
            </span>
          ) : balanceStatus === 'loading' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Clock className="w-3 h-3 animate-spin" />
              Carregando...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400">
              <WifiOff className="w-3 h-3" />
              API Offline
            </span>
          )}
        </div>
      </div>

      {/* 2. Main Balance Hero + Actions Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saldo Disponível
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                activeTab === 'fix'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                  : activeTab === 'facilita'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40'
                  : activeTab === 'pf'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/40'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40'
              }`}
            >
              {entityMeta.name}
            </span>
          </div>

          {/* Large Hero Number */}
          <div className="flex items-baseline gap-3">
            {balanceStatus === 'loading' ? (
              <div className="h-12 w-64 bg-slate-200 dark:bg-white/10 rounded-2xl animate-pulse my-1" />
            ) : balanceStatus === 'unavailable' && activeContextBalance === null ? (
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-400 dark:text-slate-500 font-mono">
                Dados Indisponíveis (Offline)
              </div>
            ) : balanceStatus === 'empty' ? (
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-400 font-mono">
                R$ 0,00 <span className="text-xs font-sans font-medium text-slate-400">(Sem contas ativas)</span>
              </div>
            ) : (
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight tabular-nums">
                {formatBRL(activeContextBalance ?? 0)}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {entityMeta.accountDesc} • {entityMeta.holder}
          </p>

          {/* Short summary of inflows / outflows if available */}
          {(inflowMonth !== undefined && inflowMonth !== null || outflowMonth !== undefined && outflowMonth !== null) && (
            <div className="flex items-center gap-4 mt-3 text-xs">
              {inflowMonth !== undefined && inflowMonth !== null && (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Entradas mês:</span>
                  <strong className="font-mono">{formatBRL(inflowMonth)}</strong>
                </div>
              )}
              {outflowMonth !== undefined && outflowMonth !== null && (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Saídas mês:</span>
                  <strong className="font-mono">{formatBRL(outflowMonth)}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Primary Quick Action Buttons (44px min touch targets) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenReceiptScanner}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-pill transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
            title="Escanear ou fazer upload de comprovante fiscal"
          >
            <Camera className="w-4 h-4" />
            <span>Adicionar Comprovante</span>
          </button>

          <button
            onClick={onOpenStatementModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-white/10 transition active:scale-95 cursor-pointer"
            title="Importar extrato bancário oficial (OFX ou CSV)"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importar Extrato</span>
          </button>

          <button
            onClick={onOpenAssistant}
            className="flex items-center justify-center gap-1.5 px-4 py-3 min-h-[48px] rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-500/30 transition active:scale-95 cursor-pointer"
            title="Abrir Assistente Financeiro"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Assistente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
