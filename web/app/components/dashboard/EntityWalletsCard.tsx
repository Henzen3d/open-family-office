'use client';

import React from 'react';
import { Wallet, Pencil, Clock } from 'lucide-react';
import { BankAccountItem } from '../SettingsModal';

interface EntityWalletsCardProps {
  accounts: BankAccountItem[];
  totalAccountsBalance: number;
  formatBRL: (val: number) => string;
  setSettingsTab: (tab: 'providers' | 'accounts' | 'appearance' | 'integrations') => void;
  setIsSettingsOpen: (open: boolean) => void;
  setLedgerFilter: (filter: 'all' | 'inter' | 'caixa' | 'nubank') => void;
  setIsRunwayModalOpen: (open: boolean) => void;
}

export default function EntityWalletsCard({
  accounts,
  totalAccountsBalance,
  formatBRL,
  setSettingsTab,
  setIsSettingsOpen,
  setLedgerFilter,
  setIsRunwayModalOpen,
}: EntityWalletsCardProps) {
  return (
    <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Header with Title and "Ajustar Saldos / Bancos" button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Bancos & Contas Ativas</h2>
          </div>
          <button
            onClick={() => {
              setSettingsTab('accounts');
              setIsSettingsOpen(true);
            }}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            title="Configurar bancos e ajustar saldos reais"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Ajustar / Bancos</span>
          </button>
        </div>

        {/* Entity Accounts List - Dynamically rendered from accounts state */}
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {accounts.map((acct) => (
            <div
              key={acct.id}
              onClick={() => {
                if (acct.id.includes('inter')) setLedgerFilter('inter');
                else if (acct.id.includes('caixa')) setLedgerFilter('caixa');
                else if (acct.id.includes('nubank')) setLedgerFilter('nubank');
                else setLedgerFilter('all');
                document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              title={`Filtrar lançamentos de ${acct.name}`}
              className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    acct.color === 'indigo'
                      ? 'bg-indigo-500'
                      : acct.color === 'amber'
                      ? 'bg-amber-500'
                      : acct.color === 'purple'
                      ? 'bg-purple-500'
                      : acct.color === 'rose'
                      ? 'bg-rose-500'
                      : acct.color === 'emerald'
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                  }`}
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{acct.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {acct.holder} • {acct.bank_name}
                  </span>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                {formatBRL(acct.balance)}
              </span>
            </div>
          ))}
        </div>

        {/* Sub-header status bar */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5 mt-2">
          <span className="font-medium text-slate-600 dark:text-slate-300">{accounts.length} contas configuradas</span>
          <button
            onClick={() => {
              setSettingsTab('accounts');
              setIsSettingsOpen(true);
            }}
            className="px-2 py-1 rounded-full bg-slate-100 dark:bg-white/5 font-semibold border border-slate-200 dark:border-white/10 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-white/10 transition"
          >
            + Adicionar / Corrigir
          </button>
        </div>
      </div>

      {/* Balance Metric Display below cards */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          <span>Saldo Consolidado das Contas</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/25 px-2 py-0.5 rounded-full text-[11px]">
            {accounts.length} contas
          </span>
        </div>
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
          {formatBRL(totalAccountsBalance)}
        </div>
        <div
          onClick={() => setIsRunwayModalOpen(true)}
          title="Clique para abrir o Simulador de Autonomia & Runway Familiar"
          className="flex items-center justify-between mt-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#121722] hover:bg-indigo-50/50 dark:hover:bg-[#1a2232] cursor-pointer p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 transition"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Runway Familiar: <strong className="text-slate-900 dark:text-white font-semibold">44,1 meses</strong>
          </span>
          <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Simular →
          </span>
        </div>
      </div>
    </div>
  );
}

