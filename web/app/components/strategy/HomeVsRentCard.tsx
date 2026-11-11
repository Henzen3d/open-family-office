'use client';

import React, { useState, useMemo } from 'react';
import { Home, TrendingUp, DollarSign, Building, Sparkles, Scale } from 'lucide-react';

export default function HomeVsRentCard() {
  const [propertyValue, setPropertyValue] = useState(600000);
  const [downPayment, setDownPayment] = useState(120000);
  const [loanYears, setLoanYears] = useState(30);
  const [loanAnnualRate, setLoanAnnualRate] = useState(10.5);
  const [monthlyRent, setMonthlyRent] = useState(2500);

  const calc = useMemo(() => {
    const principal = Math.max(0, propertyValue - downPayment);
    const totalMonths = loanYears * 12;
    const monthlyLoanRate = Math.pow(1.0 + loanAnnualRate / 100.0, 1.0 / 12.0) - 1.0;
    const netPortfolioMonthly = Math.pow(1.0 + 0.105 * 0.85, 1.0 / 12.0) - 1.0;
    const monthlyAppreciation = Math.pow(1.0 + 0.05, 1.0 / 12.0) - 1.0;
    const monthlyRentInflation = Math.pow(1.0 + 0.045, 1.0 / 12.0) - 1.0;

    let initialPmt = 0;
    if (principal > 0 && monthlyLoanRate > 0) {
      const factor = Math.pow(1.0 + monthlyLoanRate, totalMonths);
      initialPmt = (principal * (monthlyLoanRate * factor)) / (factor - 1.0);
    } else {
      initialPmt = principal / totalMonths;
    }

    let curPropVal = propertyValue;
    let debt = principal;
    let rentPortfolio = downPayment;
    let curRent = monthlyRent;

    const series = [];
    let breakEvenYear: number | null = null;

    for (let y = 1; y <= loanYears; y++) {
      for (let m = 0; m < 12; m++) {
        curPropVal *= 1.0 + monthlyAppreciation;
        const interest = debt * monthlyLoanRate;
        const amort = Math.max(0, initialPmt - interest);
        debt = Math.max(0, debt - amort);

        const maint = (curPropVal * 0.008) / 12.0;
        const buyCashout = initialPmt + maint;
        const diff = buyCashout - curRent;

        rentPortfolio = rentPortfolio * (1.0 + netPortfolioMonthly) + diff;
        curRent *= 1.0 + monthlyRentInflation;
      }

      const buyEquity = curPropVal - debt;
      const rentEquity = rentPortfolio;

      if (breakEvenYear === null && y > 1) {
        const prev = series[series.length - 1];
        if (
          (prev.buyEquity < prev.rentEquity && buyEquity >= rentEquity) ||
          (prev.rentEquity < prev.buyEquity && rentEquity >= buyEquity)
        ) {
          breakEvenYear = y;
        }
      }

      series.push({
        year: y,
        buyEquity: Math.round(buyEquity),
        rentEquity: Math.round(rentEquity),
      });
    }

    const finalBuy = series[series.length - 1]?.buyEquity || 0;
    const finalRent = series[series.length - 1]?.rentEquity || 0;
    const winner = finalBuy > finalRent ? 'Comprar Imóvel' : 'Alugar e Investir a Diferença';

    return {
      initialPmt: Math.round(initialPmt),
      finalBuy,
      finalRent,
      breakEvenYear,
      winner,
      series,
    };
  }, [propertyValue, downPayment, loanYears, loanAnnualRate, monthlyRent]);

  // SVG Chart bounds
  const maxEquity = Math.max(
    ...calc.series.map((s) => Math.max(s.buyEquity, s.rentEquity)),
    100000
  );
  const chartHeight = 160;
  const chartWidth = 500;

  const buyPoints = calc.series
    .map(
      (s, idx) =>
        `${(idx / (calc.series.length - 1)) * chartWidth},${
          chartHeight - (s.buyEquity / maxEquity) * (chartHeight - 20) - 10
        }`
    )
    .join(' ');

  const rentPoints = calc.series
    .map(
      (s, idx) =>
        `${(idx / (calc.series.length - 1)) * chartWidth},${
          chartHeight - (s.rentEquity / maxEquity) * (chartHeight - 20) - 10
        }`
    )
    .join(' ');

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Casa Própria Financiada vs Alugar & Investir
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Curvas patrimoniais acumuladas em {loanYears} anos considerando juros, manutenção e valorização
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 self-start md:self-auto flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5" />
          Vencedor: {calc.winner}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Valor do Imóvel</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                R$ {propertyValue.toLocaleString('pt-BR')}
              </span>
            </div>
            <input
              type="range"
              min="200000"
              max="2000000"
              step="20000"
              value={propertyValue}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPropertyValue(val);
                if (downPayment > val) setDownPayment(val * 0.2);
              }}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Entrada</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                R$ {downPayment.toLocaleString('pt-BR')} ({Math.round((downPayment / propertyValue) * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min="40000"
              max={propertyValue * 0.8}
              step="10000"
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Taxa Financiamento</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {loanAnnualRate}% a.a.
                </span>
              </div>
              <input
                type="range"
                min="7.0"
                max="14.0"
                step="0.25"
                value={loanAnnualRate}
                onChange={(e) => setLoanAnnualRate(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Aluguel Similar</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  R$ {monthlyRent.toLocaleString('pt-BR')}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="10000"
                step="200"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Parcela Inicial do Financiamento:</span>
              <strong className="font-mono text-slate-900 dark:text-white">
                R$ {calc.initialPmt.toLocaleString('pt-BR')}/mês
              </strong>
            </div>
            {calc.breakEvenYear && (
              <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-medium">
                <span>Ponto de Equilíbrio (Break-Even):</span>
                <strong>Ano {calc.breakEvenYear}</strong>
              </div>
            )}
          </div>
        </div>

        {/* 30-Year Chart & Final Net Worth */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col justify-between space-y-4">
          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Comprar (Imóvel Quitado)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Alugar + Investir Carteira
              </span>
            </div>
          </div>

          {/* Native SVG Curve Chart */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-40 overflow-visible"
            >
              {/* Horizontal Grid lines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
              <line x1="0" y1={chartHeight - 10} x2={chartWidth} y2={chartHeight - 10} stroke="currentColor" strokeOpacity="0.1" />

              {/* Buy Equity Polyline */}
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buyPoints}
              />

              {/* Rent Equity Polyline */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={rentPoints}
              />
            </svg>
          </div>

          {/* Final Wealth Comparison */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-white/10 text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Patrimônio Comprando (Ano {loanYears})</span>
              <strong className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                R$ {calc.finalBuy.toLocaleString('pt-BR')}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Patrimônio Alugando (Ano {loanYears})</span>
              <strong className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                R$ {calc.finalRent.toLocaleString('pt-BR')}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

