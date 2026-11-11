'use client';

import React from 'react';
import { Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface BehavioralCushionProgressProps {
  cushionMonths?: number;
  monthlyBurn?: number;
  safeLiquidity?: number;
}

export default function BehavioralCushionProgress({
  cushionMonths = 28.5,
  monthlyBurn = 7500,
  safeLiquidity = 213750,
}: BehavioralCushionProgressProps) {
  const cushionYears = (cushionMonths / 12).toFixed(1);
  const progressPercent = Math.min(100, (cushionMonths / 60) * 100);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Colchão de Tranquilidade Comportamental
            </h4>
            <span className="text-[10px] text-slate-400">
              Economia Comportamental (Kahneman): 2 a 5 anos de proteção psicológica
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 block">
            {cushionMonths} meses
          </span>
          <span className="text-[10px] text-slate-400 font-mono">({cushionYears} anos de burn)</span>
        </div>
      </div>

      {/* Progress Track with Milestones */}
      <div className="space-y-2">
        <div className="relative w-full h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Milestone labels */}
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          <span>0m</span>
          <span className="text-center">6m (Básico)</span>
          <span className="text-center font-bold text-indigo-600 dark:text-indigo-400">
            24m (Colchão)
          </span>
          <span>60m (Pleno)</span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-300">
        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <p leading-relaxed>
          Com <strong>{cushionMonths} meses</strong> de despesas essenciais garantidas em liquidez segura (R$ {safeLiquidity.toLocaleString('pt-BR')}),
          a família possui independência psicológica para atravessar mercados em baixa sem vender patrimônio em pânico.
        </p>
      </div>
    </div>
  );
}

