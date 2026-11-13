'use client';

import React, { useMemo } from 'react';
import { BankAccountItem } from '../SettingsModal';

export const MONTHLY_LIQUIDITY_DATA = [
  { month: 'Jan', fullName: 'Janeiro', in2026: 14762.00, in2025: 12959.10, out2026: 1342.00, out2025: 1178.10, fixMei: 13562.00, rent: 1200.00, projected: false },
  { month: 'Fev', fullName: 'Fevereiro', in2026: 11910.01, in2025: 13885.30, out2026: 1082.72, out2025: 1262.30, fixMei: 10710.01, rent: 1200.00, projected: false },
  { month: 'Mar', fullName: 'Março', in2026: 13497.00, in2025: 11800.80, out2026: 1227.00, out2025: 1072.80, fixMei: 12297.00, rent: 1200.00, projected: false },
  { month: 'Abr', fullName: 'Abril', in2026: 9097.00, in2025: 16558.30, out2026: 827.00, out2025: 1505.30, fixMei: 7897.00, rent: 1200.00, projected: false },
  { month: 'Mai', fullName: 'Maio', in2026: 13338.04, in2025: 19594.30, out2026: 1212.54, out2025: 1781.30, fixMei: 12138.04, rent: 1200.00, projected: false },
  { month: 'Jun', fullName: 'Junho', in2026: 12190.20, in2025: 15417.60, out2026: 1108.20, out2025: 1401.60, fixMei: 10990.20, rent: 1200.00, projected: false },
  { month: 'Jul', fullName: 'Julho', in2026: 12208.90, in2025: 15512.20, out2026: 1109.90, out2025: 1410.20, fixMei: 11008.90, rent: 1200.00, projected: false },
  { month: 'Ago', fullName: 'Agosto (Pico 2026)', in2026: 16006.71, in2025: 12956.63, out2026: 1455.16, out2025: 1177.88, fixMei: 14806.71, rent: 1200.00, projected: false },
  { month: 'Set', fullName: 'Setembro (Mês Atual)', in2026: 10985.70, in2025: 11741.40, out2026: 998.70, out2025: 1067.40, fixMei: 9785.70, rent: 1200.00, projected: false },
  { month: 'Out', fullName: 'Outubro (Projeção)', in2026: 12500.00, in2025: 15152.50, out2026: 1136.00, out2025: 1377.50, fixMei: 11300.00, rent: 1200.00, projected: true },
  { month: 'Nov', fullName: 'Novembro (Projeção)', in2026: 13200.00, in2025: 13027.30, out2026: 1200.00, out2025: 1184.30, fixMei: 12000.00, rent: 1200.00, projected: true },
  { month: 'Dez', fullName: 'Dezembro (Projeção)', in2026: 14100.00, in2025: 13214.30, out2026: 1280.00, out2025: 1201.30, fixMei: 12900.00, rent: 1200.00, projected: true },
];

export const HISTORICAL_7_YEARS = [
  { year: '2020', gross: 90280.31, fixMei: 78880.31, rent: 11400.00, label: 'R$ 90,3k', pct: '57%' },
  { year: '2021', gross: 126706.00, fixMei: 99116.00, rent: 10500.00, label: 'R$ 126,7k', pct: '81%' },
  { year: '2022', gross: 150177.00, fixMei: 128717.00, rent: 7560.00, label: 'R$ 150,2k', pct: '96%' },
  { year: '2023', gross: 138005.00, fixMei: 126205.00, rent: 6000.00, label: 'R$ 138,0k', pct: '88%' },
  { year: '2024', gross: 150510.10, fixMei: 144455.10, rent: 5550.00, label: 'R$ 150,5k', pct: '96%' },
  { year: '2025', gross: 156199.75, fixMei: 150199.75, rent: 6000.00, label: 'R$ 156,2k', pct: '100%', peak: true },
  { year: '2026', gross: 103632.34, fixMei: 100332.34, rent: 3300.00, label: 'R$ 103,6k', pct: '66%', current: true },
];

export function buildSmoothSpline(pts: [number, number][]): string {
  if (!pts || pts.length === 0) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = Number((p1[0] + (p2[0] - p0[0]) / 6).toFixed(1));
    const cp1y = Number((p1[1] + (p2[1] - p0[1]) / 6).toFixed(1));
    const cp2x = Number((p2[0] - (p3[0] - p1[0]) / 6).toFixed(1));
    const cp2y = Number((p2[1] - (p3[1] - p1[1]) / 6).toFixed(1));
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

interface BentoLiquidityChartProps {
  liquidityView: 'compare' | 'history' | 'cumulative';
  setLiquidityView: (view: 'compare' | 'history' | 'cumulative') => void;
  selectedMonthIdx: number;
  setSelectedMonthIdx: (idx: number) => void;
  selectedYearIdx: number;
  setSelectedYearIdx: (idx: number) => void;
  historySummary?: any;
  accounts?: BankAccountItem[];
  totalAccountsBalance?: number;
  activeTab?: 'all' | 'fix' | 'facilita' | 'pf';
}

export default function BentoLiquidityChart({
  liquidityView,
  setLiquidityView,
  selectedMonthIdx,
  setSelectedMonthIdx,
  selectedYearIdx,
  setSelectedYearIdx,
  historySummary,
  accounts,
  totalAccountsBalance,
  activeTab = 'all',
}: BentoLiquidityChartProps) {
  // Dynamically compute monthly data from historySummary (real data)
  const monthlyData = useMemo(() => {
    const raw2026 = historySummary?.by_year?.['2026'];
    const raw2025 = historySummary?.by_year?.['2025'];
    if (!raw2026 && !raw2025) return MONTHLY_LIQUIDITY_DATA;

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const fullNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto (Pico 2026)',
      'Setembro (Mês Atual)',
      'Outubro (Projeção)',
      'Novembro (Projeção)',
      'Dezembro (Projeção)',
    ];

    return monthNames.map((m, i) => {
      const in2026 = raw2026?.monthly_revenue?.[i] ?? MONTHLY_LIQUIDITY_DATA[i]?.in2026 ?? 0;
      const in2025 = raw2025?.monthly_revenue?.[i] ?? MONTHLY_LIQUIDITY_DATA[i]?.in2025 ?? 0;
      const out2026 = raw2026?.monthly_expenses?.[i] ?? MONTHLY_LIQUIDITY_DATA[i]?.out2026 ?? 0;
      const out2025 = raw2025?.monthly_expenses?.[i] ?? MONTHLY_LIQUIDITY_DATA[i]?.out2025 ?? 0;
      const fixMei = raw2026?.monthly_fix_mei?.[i] ?? MONTHLY_LIQUIDITY_DATA[i]?.fixMei ?? 0;
      const rent = in2026 > fixMei ? in2026 - fixMei : 1200;

      return {
        month: m,
        fullName: fullNames[i],
        in2026,
        in2025,
        out2026,
        out2025,
        fixMei,
        rent,
        projected: i >= 9,
      };
    });
  }, [historySummary]);

  // Dynamically compute historical 7 years bars from historySummary
  const historical7Years = useMemo(() => {
    if (!historySummary?.by_year) return HISTORICAL_7_YEARS;
    const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
    const values = years.map((y) => {
      const row = historySummary.by_year[y];
      const gross = row?.total_revenue ?? 0;
      return { y, gross, row };
    });
    const maxGross = Math.max(...values.map((v) => v.gross), 156199.75);

    return values.map(({ y, gross, row }) => {
      const fixMei = row?.fix_servicos_revenue ?? 0;
      const rent = row?.aluguel_revenue ?? 0;
      const pct = `${Math.min(100, Math.round((gross / maxGross) * 100))}%`;
      const label = `R$ ${(gross / 1000).toFixed(1).replace('.', ',')}k`;
      const peak = gross === maxGross;
      const current = y === '2026';

      return {
        year: y,
        gross,
        fixMei,
        rent,
        label,
        pct,
        peak,
        current,
      };
    });
  }, [historySummary]);

  const total7YearsRevenue = useMemo(() => {
    return historical7Years.reduce((acc, curr) => acc + curr.gross, 0);
  }, [historical7Years]);

  // Real Net Worth & Runway
  const currentNetWorth = totalAccountsBalance ?? historySummary?.net_profit ?? 508121.36;
  const avgMonthlyOutflow = (historySummary?.by_year?.['2026']?.total_expenses ?? 10363.22) / 9;
  const runwayMonths = avgMonthlyOutflow > 0 ? (currentNetWorth / avgMonthlyOutflow).toFixed(1) : '44,1';

  return (
    <div className="lg:col-span-8 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Visão Geral de Liquidez & Reservas</h2>
            {activeTab !== 'all' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                {activeTab === 'fix' ? 'Fix MEI' : activeTab === 'facilita' ? 'Facilita MEI' : 'Família PF'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {liquidityView === 'compare' &&
              (activeTab === 'fix'
                ? 'Evolução de Entradas Fix Serviços MEI: 2026 vs. Histórico de 2025'
                : 'Evolução do Fluxo de Caixa Consolidado: 2026 vs. Histórico de 2025')}
            {liquidityView === 'history' &&
              `Série Histórica Consolidada (2020 - 2026): R$ ${total7YearsRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Faturamento Real`}
            {liquidityView === 'cumulative' && 'Evolução do Patrimônio Líquido Total e Reservas de Autonomia Familiar'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121722] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs">
            <button
              onClick={() => setLiquidityView('compare')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                liquidityView === 'compare'
                  ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              2026 vs 2025
            </button>
            <button
              onClick={() => setLiquidityView('history')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                liquidityView === 'history'
                  ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Anos (2020-2026)
            </button>
            <button
              onClick={() => setLiquidityView('cumulative')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                liquidityView === 'cumulative'
                  ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Patrimônio
            </button>
          </div>
        </div>
      </div>

      {/* View 1: 2026 vs 2025 Month-by-Month Real Consolidated Cashflow */}
      {liquidityView === 'compare' && (() => {
        const pts2026: [number, number][] = monthlyData.map((d, i) => [
          Number((35 + i * (630 / 11)).toFixed(1)),
          Number((150 - (d.in2026 / 22000) * 125).toFixed(1)),
        ]);
        const pts2025: [number, number][] = monthlyData.map((d, i) => [
          Number((35 + i * (630 / 11)).toFixed(1)),
          Number((150 - (d.in2025 / 22000) * 125).toFixed(1)),
        ]);

        const spline2026 = buildSmoothSpline(pts2026);
        const spline2025 = buildSmoothSpline(pts2025);
        const fill2026 = `${spline2026} L 665,155 L 35,155 Z`;
        const fill2025 = `${spline2025} L 665,155 L 35,155 Z`;

        const currentMonth = monthlyData[selectedMonthIdx] ?? monthlyData[8];
        const curX = pts2026[selectedMonthIdx]?.[0] ?? 493.2;
        const curY26 = pts2026[selectedMonthIdx]?.[1] ?? 87.6;
        const curY25 = pts2025[selectedMonthIdx]?.[1] ?? 88.3;
        const diff = currentMonth.in2026 - currentMonth.in2025;
        const diffPct = currentMonth.in2025 > 0 ? (diff / currentMonth.in2025) * 100 : 0;

        return (
          <div key="view-compare" className="animate-view-fade">
            <div className="relative w-full h-56 pt-2 select-none">
              {/* Dynamic Inspection Badge */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1a2232]/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-white/15 rounded-2xl px-4 py-2 z-20 flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                      {currentMonth.fullName}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      R$ {currentMonth.in2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`text-xs font-bold px-1.5 py-1 rounded ${
                        diff >= 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                      }`}
                    >
                      {diff >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`} vs 2025
                    </span>
                  </div>
                </div>

                <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                  <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">2025 Mesmo Mês</span>
                  <span className="font-mono font-semibold text-xs text-amber-700 dark:text-amber-400">
                    R$ {currentMonth.in2025.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border-l border-slate-200 dark:border-white/10 pl-3 hidden sm:block">
                  <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Origem 2026</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                    MEI: <strong>R$ {currentMonth.fixMei.toLocaleString('pt-BR')}</strong> • Aluguel: <strong>R$ {currentMonth.rent.toLocaleString('pt-BR')}</strong>
                  </span>
                </div>
              </div>

              <svg className="w-full h-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 700 170">
                <defs>
                  <linearGradient id="blueGlowDark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="orangeGlowDark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#FB923C" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Values */}
                <line stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" opacity={0.3} x1="30" x2="670" y1="35" y2="35" />
                <line stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" opacity={0.3} x1="30" x2="670" y1="75" y2="75" />
                <line stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" opacity={0.3} x1="30" x2="670" y1="115" y2="115" />
                <line stroke="#334155" strokeWidth="1" opacity={0.4} x1="30" x2="670" y1="155" y2="155" />

                {/* Area Fills */}
                <path d={fill2025} fill="url(#orangeGlowDark)" />
                <path d={fill2026} fill="url(#blueGlowDark)" />

                {/* 2025 Historical Curve */}
                <path
                  d={spline2025}
                  stroke="#FB923C"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                />

                {/* 2026 Active Curve */}
                <path
                  d={spline2026}
                  stroke="#6366f1"
                  strokeLinecap="round"
                  strokeWidth="3.2"
                />

                {/* Vertical Hairline Guide on Active Month */}
                <line
                  x1={curX}
                  x2={curX}
                  y1="25"
                  y2="155"
                  stroke="#6366f1"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                  opacity={0.8}
                />

                {/* Active Month Data Dots */}
                <circle cx={curX} cy={curY25} fill="#FB923C" r="5" stroke="#161c28" strokeWidth="2" />
                <circle cx={curX} cy={curY26} fill="#6366f1" r="6.5" stroke="#ffffff" strokeWidth="2.5" />

                {/* Column Hit Areas for Mouse Hover */}
                {monthlyData.map((_, i) => {
                  const x = 35 + i * (630 / 11);
                  return (
                    <rect
                      key={`hit-${i}`}
                      x={x - 25}
                      y="15"
                      width="50"
                      height="145"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setSelectedMonthIdx(i)}
                      onClick={() => setSelectedMonthIdx(i)}
                    />
                  );
                })}
              </svg>
            </div>

            {/* 12 Months Interactive Label Bar */}
            <div className="flex justify-between items-center text-xs mt-2 px-1">
              {monthlyData.map((item, idx) => (
                <button
                  key={item.month}
                  onMouseEnter={() => setSelectedMonthIdx(idx)}
                  onClick={() => setSelectedMonthIdx(idx)}
                  className={`px-2 py-1 rounded-xl transition-all font-semibold ${
                    selectedMonthIdx === idx
                      ? 'bg-indigo-600 text-white shadow-sm scale-105'
                      : item.month === 'Set'
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-4'
                      : item.projected
                      ? 'text-slate-400 italic'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={`${item.fullName}: R$ ${item.in2026.toLocaleString('pt-BR')}`}
                >
                  {item.month}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* View 2: 7 Anos Historical Evolution (2020-2026) */}
      {liquidityView === 'history' && (() => {
        const activeYear = historical7Years[selectedYearIdx] ?? historical7Years[6];
        return (
          <div key="view-history" className="animate-view-fade">
            <div className="relative w-full h-56 pt-2 flex items-end justify-between gap-3 px-2">
              <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1a2232]/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-white/15 rounded-2xl px-4 py-2 z-20 flex flex-wrap items-center gap-4 text-xs pointer-events-auto">
                <div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 block font-semibold uppercase tracking-wider">
                    Exercício {activeYear.year} {activeYear.peak ? '(Pico Histórico)' : activeYear.current ? '(YTD Setembro)' : ''}
                  </span>
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400 text-sm sm:text-base">
                    R$ {activeYear.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                  <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Média Mensal</span>
                  <strong className="font-mono text-indigo-700 dark:text-indigo-400 text-xs">
                    R$ {(activeYear.gross / (activeYear.current ? 9 : 12)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </strong>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10 pl-3 hidden sm:block">
                  <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Divisão de Faturamento</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                    Fix MEI: <strong>R$ {activeYear.fixMei.toLocaleString('pt-BR')}</strong> • Aluguel: <strong>R$ {activeYear.rent.toLocaleString('pt-BR')}</strong>
                  </span>
                </div>
              </div>

              {historical7Years.map((bar, idx) => (
                <div
                  key={bar.year}
                  onMouseEnter={() => setSelectedYearIdx(idx)}
                  onClick={() => setSelectedYearIdx(idx)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  <span className={`text-xs font-mono mb-1 font-semibold transition ${selectedYearIdx === idx ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {bar.label}
                  </span>
                  <div
                    style={{ height: bar.pct }}
                    className={`w-full rounded-t-2xl transition-all ${
                      selectedYearIdx === idx
                        ? 'bg-indigo-600 dark:bg-indigo-500 scale-105'
                        : bar.peak
                        ? 'bg-amber-600 dark:bg-amber-500'
                        : 'bg-slate-200 dark:bg-[#1e2638] group-hover:bg-slate-300 dark:group-hover:bg-[#28334a]'
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 px-2">
              {historical7Years.map((bar, idx) => (
                <button
                  key={bar.year}
                  onClick={() => setSelectedYearIdx(idx)}
                  onMouseEnter={() => setSelectedYearIdx(idx)}
                  className={`transition-all ${
                    selectedYearIdx === idx
                      ? 'text-indigo-600 dark:text-indigo-400 font-extrabold underline underline-offset-4 scale-105'
                      : bar.peak
                      ? 'text-amber-600 dark:text-amber-400 font-bold'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {bar.year}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* View 3: Patrimônio Acumulado & Reservas */}
      {liquidityView === 'cumulative' && (
        <div key="view-cumulative" className="animate-view-fade">
          <div className="relative w-full h-56 pt-2">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1a2232]/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-white/15 rounded-2xl p-2.5 z-20 flex gap-4 text-xs pointer-events-none text-slate-900 dark:text-white">
              <div>
                <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Patrimônio Líquido Acumulado</span>
                <strong className="font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                  R$ {currentNetWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Autonomia Familiar</span>
                <strong className="font-mono text-indigo-700 dark:text-indigo-400 text-sm">{runwayMonths} Meses</strong>
              </div>
            </div>

            <svg className="w-full h-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 700 170">
              <defs>
                <linearGradient id="patrimonioGlow" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="30" y2="30" />
              <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="70" y2="70" />
              <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="110" y2="110" />
              <line stroke="#212a3d" strokeWidth="1" x1="0" x2="700" y1="150" y2="150" />

              <path
                d="M 0,140 C 100,130 200,105 300,90 C 400,75 500,45 600,30 L 700,20 L 700,160 L 0,160 Z"
                fill="url(#patrimonioGlow)"
              />
              <path
                d="M 0,140 C 100,130 200,105 300,90 C 400,75 500,45 600,30 L 700,20"
                stroke="#10b981"
                strokeLinecap="round"
                strokeWidth="3.5"
              />
              <circle cx="700" cy="20" fill="#10b981" r="6" stroke="#161c28" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 px-2">
            <span>2020: R$ 42,1k</span>
            <span>2022: R$ 168,5k</span>
            <span>2024: R$ 342,0k</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold underline underline-offset-4">
              Hoje: R$ {currentNetWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Protegido e Conciliado)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
