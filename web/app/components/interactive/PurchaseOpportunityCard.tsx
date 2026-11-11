'use client';

import React, { useState, useMemo } from 'react';
import { ShoppingBag, Clock, ShieldAlert, CheckCircle2, DollarSign, TrendingDown, ArrowRight } from 'lucide-react';

interface PurchaseOpportunityCardProps {
  itemName?: string;
  cashPrice?: number;
  installmentsCount?: number;
  installmentValue?: number;
  benchmarkAnnualRate?: number;
  familyMonthlyIncome?: number;
  coolingOffDaysSuggested?: number;
}

export default function PurchaseOpportunityCard({
  itemName = 'Novo Equipamento / Item',
  cashPrice = 5000,
  installmentsCount = 12,
  installmentValue = 0,
  benchmarkAnnualRate = 11.25,
  familyMonthlyIncome = 15000,
  coolingOffDaysSuggested = 14,
}: PurchaseOpportunityCardProps) {
  const [price, setPrice] = useState<number>(cashPrice);
  const [installments, setInstallments] = useState<number>(installmentsCount);
  const [instVal, setInstVal] = useState<number>(installmentValue || Math.round((cashPrice / installmentsCount) * 100) / 100);
  const [benchmarkRate, setBenchmarkRate] = useState<number>(benchmarkAnnualRate);
  const [coolingOffActive, setCoolingOffActive] = useState<boolean>(false);

  // Time-to-earn calculation (160h work month)
  const hourlyRate = (familyMonthlyIncome / 160.0) || 1.0;
  const hoursNeeded = (price / hourlyRate).toFixed(1);
  const daysNeeded = (price / (hourlyRate * 8.0)).toFixed(1);

  // Cash vs Installments with CDI yield
  const comparison = useMemo(() => {
    const totalInstallments = installments * instVal;
    const cashDiscount = totalInstallments > price ? totalInstallments - price : 0;
    const cashDiscountPct = totalInstallments > 0 ? ((cashDiscount / totalInstallments) * 100).toFixed(1) : '0';

    // Opportunity projections (2, 5, 10, 20 years)
    const rate = benchmarkRate / 100.0;
    const projections = [
      { years: 2, invested: Math.round(price * Math.pow(1.0 + rate, 2)), depreciated: Math.round(price * 0.55) },
      { years: 5, invested: Math.round(price * Math.pow(1.0 + rate, 5)), depreciated: Math.round(price * 0.25) },
      { years: 10, invested: Math.round(price * Math.pow(1.0 + rate, 10)), depreciated: Math.round(price * 0.08) },
    ];

    return {
      totalInstallments,
      cashDiscount,
      cashDiscountPct,
      projections,
    };
  }, [price, installments, instVal, benchmarkRate]);

  return (
    <div className="my-3 p-5 sm:p-6 bg-white dark:bg-[#131926] border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-card text-slate-900 dark:text-white transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Decisor de Compra & Custo de Oportunidade
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                {itemName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Análise comportamental: valor em horas de vida da família e custo futuro do capital.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Metric 1: Hours of work needed */}
        <div className="p-3.5 bg-slate-50 dark:bg-[#182030] rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Esforço de Trabalho Familiar
            </span>
            <strong className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
              {hoursNeeded} horas ({daysNeeded} dias de trabalho)
            </strong>
          </div>
        </div>

        {/* Metric 2: Price Input */}
        <div className="p-3.5 bg-slate-50 dark:bg-[#182030] rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Valor da Compra (R$)
            </span>
            <input
              type="number"
              value={price}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPrice(val);
                setInstVal(Math.round((val / installments) * 100) / 100);
              }}
              className="w-36 bg-transparent font-mono text-base font-extrabold text-slate-900 dark:text-white outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">à vista</span>
        </div>
      </div>

      {/* Opportunity Cost Projection Bars */}
      <div className="p-4 bg-slate-50/60 dark:bg-[#161c2a] rounded-2xl border border-slate-200/60 dark:border-white/5 mb-4">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-3">
          Se este valor fosse investido no CDI/Tesouro ({benchmarkRate}% a.a.) vs. Valor do Bem:
        </span>

        <div className="space-y-3 text-xs">
          {comparison.projections.map((p) => (
            <div key={p.years} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <span>Após {p.years} anos</span>
                <span>
                  Investido: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">R$ {p.invested.toLocaleString('pt-BR')}</strong> •
                  Bem depreciado: <strong className="text-slate-500 font-mono">R$ {p.depreciated.toLocaleString('pt-BR')}</strong>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                <div style={{ width: '65%' }} className="h-full bg-emerald-500" />
                <div style={{ width: '35%' }} className="h-full bg-rose-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral Cooling-off Lock Button */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setCoolingOffActive(!coolingOffActive)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition active:scale-95 ${
            coolingOffActive
              ? 'bg-emerald-600 text-white shadow-pill'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100'
          }`}
        >
          {coolingOffActive ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Trava Ativa: Decisão adiada por {coolingOffDaysSuggested} dias</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4" />
              <span>Ativar Trava de Reflexão ({coolingOffDaysSuggested} dias)</span>
            </>
          )}
        </button>

        <span className="text-[11px] text-slate-400">
          Evita compras por impulso emocional
        </span>
      </div>
    </div>
  );
}

