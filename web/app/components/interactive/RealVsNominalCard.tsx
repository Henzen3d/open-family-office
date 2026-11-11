'use client';

import React, { useState, useMemo } from 'react';
import { Percent, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface RealVsNominalCardProps {
  nominalRatePercent?: number;
  inflationAnnualPercent?: number;
  incomeTaxPercent?: number;
}

export default function RealVsNominalCard({
  nominalRatePercent = 12.0,
  inflationAnnualPercent = 4.5,
  incomeTaxPercent = 15.0,
}: RealVsNominalCardProps) {
  const [nominal, setNominal] = useState<number>(nominalRatePercent);
  const [inflation, setInflation] = useState<number>(inflationAnnualPercent);
  const [tax, setTax] = useState<number>(incomeTaxPercent);

  // Fisher Equation: (1 + r_real) = (1 + r_net) / (1 + i)
  const calc = useMemo(() => {
    const nom = nominal / 100.0;
    const inf = inflation / 100.0;
    const t = tax / 100.0;

    const netNominal = nom * (1.0 - t);
    const realReturn = (1.0 + netNominal) / (1.0 + inf) - 1.0;
    const realReturnPct = realReturn * 100.0;
    const taxBitePct = (nom * t) * 100.0;
    const inflationBitePct = (nom - netNominal > 0 ? inf : inf) * 100.0;

    return {
      netNominalPct: netNominal * 100.0,
      realReturnPct: realReturnPct.toFixed(2),
      taxBitePct: taxBitePct.toFixed(2),
      isPositive: realReturnPct > 0,
    };
  }, [nominal, inflation, tax]);

  return (
    <div className="my-3 p-5 sm:p-6 bg-white dark:bg-[#131926] border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-card text-slate-900 dark:text-white transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Decomposição de Rentabilidade Real • Equação de Fisher
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                Poder de Compra
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ilusão monetária: descontando inflação oficial (IPCA) e imposto de renda sobre o rendimento.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Slider 1: Taxa Nominal */}
        <div>
          <div className="flex justify-between text-xs mb-1 font-semibold">
            <span className="text-slate-600 dark:text-slate-300">Rendimento Bruto</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{nominal.toFixed(2)}% a.a.</span>
          </div>
          <input
            type="range"
            min="2"
            max="22"
            step="0.25"
            value={nominal}
            onChange={(e) => setNominal(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Slider 2: Inflação */}
        <div>
          <div className="flex justify-between text-xs mb-1 font-semibold">
            <span className="text-slate-600 dark:text-slate-300">Inflação (IPCA)</span>
            <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{inflation.toFixed(2)}% a.a.</span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            step="0.25"
            value={inflation}
            onChange={(e) => setInflation(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-600"
          />
        </div>

        {/* Slider 3: Imposto de Renda */}
        <div>
          <div className="flex justify-between text-xs mb-1 font-semibold">
            <span className="text-slate-600 dark:text-slate-300">Imposto de Renda (IR)</span>
            <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">{tax.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="22.5"
            step="2.5"
            value={tax}
            onChange={(e) => setTax(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-500"
          />
        </div>
      </div>

      {/* Visual Decomposition Bar */}
      <div className="p-4 bg-slate-50 dark:bg-[#182030] rounded-2xl border border-slate-200/60 dark:border-white/5 mb-4">
        <div className="flex items-center justify-between mb-2 text-xs font-bold">
          <span>Decomposição do Rendimento Bruto ({nominal.toFixed(1)}%):</span>
          <span className={calc.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
            Ganho Real: {calc.realReturnPct}% a.a.
          </span>
        </div>

        <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-700">
          {/* Real Return (Green) */}
          <div
            style={{ width: `${Math.max(5, Math.min(80, (Number(calc.realReturnPct) / nominal) * 100))}%` }}
            className="h-full bg-emerald-500"
            title={`Ganho Real: ${calc.realReturnPct}%`}
          />
          {/* Tax Bite (Slate) */}
          <div
            style={{ width: `${Math.max(5, (Number(calc.taxBitePct) / nominal) * 100)}%` }}
            className="h-full bg-slate-400 dark:bg-slate-500"
            title={`Imposto: ${calc.taxBitePct}%`}
          />
          {/* Inflation Bite (Red) */}
          <div
            style={{ width: `${Math.max(5, (inflation / nominal) * 100)}%` }}
            className="h-full bg-rose-500"
            title={`Inflação: ${inflation}%`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ganho Real (+{calc.realReturnPct}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
            <span>IR ({calc.taxBitePct}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Inflação IPCA ({inflation}%)</span>
          </div>
        </div>
      </div>

      {/* Final Verdict Badge */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {calc.isPositive ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          )}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {calc.isPositive
              ? `O patrimônio cresce realmente ${calc.realReturnPct}% ao ano acima da perda inflacionária.`
              : `Alerta: o investimento perde ${calc.realReturnPct}% de poder aquisitivo real.`}
          </span>
        </div>
      </div>
    </div>
  );
}

