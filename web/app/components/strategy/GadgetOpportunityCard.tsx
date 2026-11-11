'use client';

import React, { useState, useMemo } from 'react';
import { Smartphone, Clock, Briefcase, Sparkles, Check, ArrowRight } from 'lucide-react';

export default function GadgetOpportunityCard() {
  const [itemName, setItemName] = useState('iPhone 16 Pro Max');
  const [cashPrice, setCashPrice] = useState(10500);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [installmentsCount, setInstallmentsCount] = useState(12);
  const [familyIncome, setFamilyIncome] = useState(16000);
  const [coolingOffActivated, setCoolingOffActivated] = useState(false);

  const calc = useMemo(() => {
    const hourlyRate = familyIncome / 160.0;
    const workHours = hourlyRate > 0 ? cashPrice / hourlyRate : 0;
    const workDays = workHours / 8.0;

    const discountValue = cashPrice * (discountPercent / 100.0);
    const actualCashPrice = cashPrice - discountValue;
    const monthlyPmt = cashPrice / Math.max(1, installmentsCount);

    const netMonthlyRate = Math.pow(1.0 + 0.1125 * 0.85, 1.0 / 12.0) - 1.0;
    let npvInstallments = 0;
    for (let m = 1; m <= installmentsCount; m++) {
      npvInstallments += monthlyPmt / Math.pow(1.0 + netMonthlyRate, m);
    }

    const betterChoice = actualCashPrice < npvInstallments ? 'À Vista com Desconto' : 'Parcelado no Cartão';
    const savings = Math.abs(actualCashPrice - npvInstallments);

    const future10y = cashPrice * Math.pow(1.0 + 0.1125 * 0.85, 10);

    return {
      workHours: Math.round(workHours),
      workDays: workDays.toFixed(1),
      actualCashPrice: Math.round(actualCashPrice),
      monthlyPmt: Math.round(monthlyPmt),
      npvInstallments: Math.round(npvInstallments),
      betterChoice,
      savings: Math.round(savings),
      future10y: Math.round(future10y),
    };
  }, [cashPrice, discountPercent, installmentsCount, familyIncome]);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Simulador de Compras & Custo em Horas de Trabalho
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Avalie eletrônicos e compras de consumo sob a ótica de esforço real e custo de oportunidade
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 self-start md:self-auto">
          Melhor Opção: {calc.betterChoice}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
              Nome do Item
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Preço à Vista</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                R$ {cashPrice.toLocaleString('pt-BR')}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="25000"
              step="500"
              value={cashPrice}
              onChange={(e) => setCashPrice(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Desconto à Vista</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {discountPercent}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Parcelas s/ Juros</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {installmentsCount}x
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Renda Familiar Mensal (Base 160h)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                R$ {familyIncome.toLocaleString('pt-BR')}
              </span>
            </div>
            <input
              type="range"
              min="5000"
              max="40000"
              step="1000"
              value={familyIncome}
              onChange={(e) => setFamilyIncome(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>

        {/* Results */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Work hours impact */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                    Custo em Esforço Real
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Tempo de trabalho do casal
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {calc.workHours}h
                </span>
                <span className="text-[11px] text-slate-400 block">
                  (~{calc.workDays} dias de trabalho)
                </span>
              </div>
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block uppercase">À Vista c/ Desconto</span>
                <strong className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  R$ {calc.actualCashPrice.toLocaleString('pt-BR')}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] text-slate-400 block uppercase">
                  {installmentsCount}x no Cartão
                </span>
                <strong className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  R$ {calc.monthlyPmt.toLocaleString('pt-BR')}/mês
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  (VPL R$ {calc.npvInstallments.toLocaleString('pt-BR')})
                </span>
              </div>
            </div>

            {/* Opportunity 10y */}
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Custo de Oportunidade em 10 Anos:
              </span>
              Se o valor integral (R$ {cashPrice.toLocaleString('pt-BR')}) fosse alocado em Tesouro IPCA+ / CDI,
              acumularia <strong className="font-mono text-slate-900 dark:text-white">R$ {calc.future10y.toLocaleString('pt-BR')}</strong> no futuro.
            </div>
          </div>

          {/* Cooling-off lock action */}
          <button
            onClick={() => setCoolingOffActivated(true)}
            disabled={coolingOffActivated}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
              coolingOffActivated
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            }`}
          >
            {coolingOffActivated ? (
              <>
                <Check className="w-4 h-4" />
                Item adicionado ao Período de Reflexão (14 Dias)
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Ativar Trava de Reflexão de 14 Dias
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

