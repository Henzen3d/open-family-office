'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, TrendingUp, DollarSign, Calendar, Info } from 'lucide-react';

interface CompoundInterestCardProps {
  initialPrincipal?: number;
  monthlyDeposit?: number;
  annualRatePercent?: number;
  years?: number;
  currencyPrefix?: string;
  onExport?: (data: any) => void;
}

export default function CompoundInterestCard({
  initialPrincipal = 5000,
  monthlyDeposit = 500,
  annualRatePercent = 11.25,
  years = 15,
  currencyPrefix = 'R$',
}: CompoundInterestCardProps) {
  const [principal, setPrincipal] = useState<number>(initialPrincipal);
  const [monthly, setMonthly] = useState<number>(monthlyDeposit);
  const [rate, setRate] = useState<number>(annualRatePercent);
  const [termYears, setTermYears] = useState<number>(years);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // 60 FPS memoized mathematical calculation
  const calculation = useMemo(() => {
    const p = Number(principal) || 0;
    const pmt = Number(monthly) || 0;
    const rAnnual = (Number(rate) || 0) / 100.0;
    const rMonthly = rAnnual > 0 ? Math.pow(1.0 + rAnnual, 1.0 / 12.0) - 1.0 : 0.0;

    const series = [];
    let currentBalance = p;

    for (let y = 1; y <= termYears; y++) {
      for (let m = 0; m < 12; m++) {
        currentBalance = currentBalance * (1.0 + rMonthly) + pmt;
      }
      const invested = p + pmt * y * 12;
      const interest = Math.max(0, currentBalance - invested);
      series.push({
        year: y,
        invested: Math.round(invested),
        interest: Math.round(interest),
        total: Math.round(currentBalance),
      });
    }

    const finalInvested = p + pmt * termYears * 12;
    const finalBalance = currentBalance;
    const finalInterest = Math.max(0, finalBalance - finalInvested);

    return {
      finalBalance,
      finalInvested,
      finalInterest,
      series,
    };
  }, [principal, monthly, rate, termYears]);

  const fmt = (n: number) =>
    `${currencyPrefix} ${Math.round(n).toLocaleString('pt-BR')}`;

  const maxTotal = calculation.series[calculation.series.length - 1]?.total || 1;

  return (
    <div className="my-3 p-5 sm:p-6 bg-white dark:bg-[#131926] border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-card text-slate-900 dark:text-white transition-all">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Simulador Dinâmico de Juros Compostos
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                Exemplo Vivo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ajuste os controles abaixo para simular o efeito bola de neve no patrimônio familiar.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sliders */}
        <div className="lg:col-span-5 space-y-4">
          {/* Slider 1: Aporte Inicial */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Aporte Inicial</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{fmt(principal)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100000"
              step="1000"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Slider 2: Aporte Mensal */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Aporte Mensal Recorrente</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{fmt(monthly)}/mês</span>
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Slider 3: Taxa Anual */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Taxa de Rendimento Anual</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{rate.toFixed(2)}% a.a.</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="0.25"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Slider 4: Prazo em Anos */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Prazo de Acumulação</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{termYears} anos ({termYears * 12} meses)</span>
            </div>
            <input
              type="range"
              min="1"
              max="35"
              step="1"
              value={termYears}
              onChange={(e) => setTermYears(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          {/* Informative Educational Box */}
          <div className="p-3 bg-slate-50 dark:bg-[#1a2232] rounded-2xl border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p>
              Os juros compostos multiplicam o capital porque os rendimentos passam a render juros sobre si mesmos, gerando crescimento exponencial a partir do 7º ano.
            </p>
          </div>
        </div>

        {/* Right Column: Key Results & Stacked SVG Chart */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                Valor Final Acumulado
              </span>
              <strong className="font-mono text-base font-extrabold text-indigo-950 dark:text-indigo-100 truncate block">
                {fmt(calculation.finalBalance)}
              </strong>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-[#1c2436] border border-slate-200 dark:border-white/10 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                Total Investido do Bolso
              </span>
              <strong className="font-mono text-base font-extrabold text-slate-800 dark:text-slate-200 truncate block">
                {fmt(calculation.finalInvested)}
              </strong>
            </div>

            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                Ganho em Juros Puros
              </span>
              <strong className="font-mono text-base font-extrabold text-amber-800 dark:text-amber-200 truncate block">
                {fmt(calculation.finalInterest)}
              </strong>
            </div>
          </div>

          {/* Year-by-Year Stacked SVG Bars */}
          <div className="relative w-full h-44 bg-slate-50 dark:bg-[#101522] rounded-2xl p-3 border border-slate-200/60 dark:border-white/5 flex items-end gap-1 overflow-hidden select-none">
            {calculation.series.map((item) => {
              const heightPct = Math.max(6, (item.total / maxTotal) * 100);
              const investedRatio = item.total > 0 ? (item.invested / item.total) * 100 : 100;
              const isHovered = hoveredYear === item.year;

              return (
                <div
                  key={item.year}
                  onMouseEnter={() => setHoveredYear(item.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                  className="flex-1 flex flex-col justify-end items-center h-full group cursor-pointer"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md overflow-hidden flex flex-col-reverse transition-all ${
                      isHovered ? 'ring-2 ring-indigo-400 scale-105' : ''
                    }`}
                  >
                    {/* Invested Part (Dark Indigo/Blue) */}
                    <div style={{ height: `${investedRatio}%` }} className="w-full bg-slate-400 dark:bg-slate-600" />
                    {/* Interest Part (Golden Amber) */}
                    <div style={{ height: `${100 - investedRatio}%` }} className="w-full bg-amber-500 dark:bg-amber-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Tooltip & Year Legend */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
            <span>Ano 1</span>
            {hoveredYear !== null ? (
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-in fade-in">
                Ano {hoveredYear}: {fmt(calculation.series[hoveredYear - 1]?.total || 0)} (Juros: {fmt(calculation.series[hoveredYear - 1]?.interest || 0)})
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 italic">Passe o cursor sobre as barras para detalhes</span>
            )}
            <span>Ano {termYears}</span>
          </div>

          {/* Color Indicators */}
          <div className="flex items-center justify-end gap-4 mt-2 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
              <span>Capital Aportado</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
              <span>Juros Compostos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
