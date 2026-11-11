'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';

interface MeiCeilingTrackerProps {
  meiOsmarPct: string;
  meiOsmarIssued: number;
  meiOsmarMargin: number;
  meiVeraPct: string;
  meiVeraIssued: number;
  meiVeraMargin: number;
  formatBRL: (val: number) => string;
}

export default function MeiCeilingTracker({
  meiOsmarPct,
  meiOsmarIssued,
  meiOsmarMargin,
  meiVeraPct,
  meiVeraIssued,
  meiVeraMargin,
  formatBRL,
}: MeiCeilingTrackerProps) {
  return (
    <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Monitor de Teto MEI • LC 123/2006</h2>
          <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-slate-400">
            <CreditCard className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">R$ 81.000,00</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ CNPJ Anual</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Exercício Fiscal 2026 • 2 Titularidades Autônomas (Capacidade R$ 162.000,00)</p>

        {/* MEI 1: Fix Serviços */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">1. Fix Serviços MEI (Titular: Osmar)</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{meiOsmarPct}%</span>
          </div>
          {/* Clean continuous progress bar */}
          <div className="w-full bg-slate-100 dark:bg-[#121722] rounded-full h-2.5 overflow-hidden border border-slate-200/80 dark:border-white/10 my-2">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, parseFloat(meiOsmarPct) || 0))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Emitido: {formatBRL(meiOsmarIssued)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Margem: {formatBRL(meiOsmarMargin)}</span>
          </div>
        </div>

        {/* MEI 2: Facilita Vistorias */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">2. Facilita Vistorias MEI (Titular: Vera)</span>
            <span className="font-mono font-bold text-purple-600 dark:text-pink-400">{meiVeraPct}%</span>
          </div>
          {/* Clean continuous progress bar */}
          <div className="w-full bg-slate-100 dark:bg-[#121722] rounded-full h-2.5 overflow-hidden border border-slate-200/80 dark:border-white/10 my-2">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, parseFloat(meiVeraPct) || 0))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Emitido: {formatBRL(meiVeraIssued)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Margem: {formatBRL(meiVeraMargin)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Status LC 123/2006:</span>
        <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
          Segregação Conjugal Ativa • LC 123/2006
        </span>
      </div>
    </div>
  );
}

