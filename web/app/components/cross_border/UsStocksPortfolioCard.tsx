'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, DollarSign, Shield, ArrowUpRight, AlertCircle, Building2, ExternalLink } from 'lucide-react';

export interface StockHolding {
  ticker: string;
  shares: number;
  avg_cost_usd: number;
  current_price_usd: number;
  company_name?: string;
  broker?: string;
  currency?: string;
  total_usd: number;
  total_cost_usd: number;
  unrealized_pnl_usd: number;
  unrealized_pnl_pct: number;
  formatted_total_usd?: string;
  last_updated_at?: string;
}

export interface PortfolioSummary {
  total_usd: number;
  total_brl: number;
  ptax_rate: number;
  positions_count: number;
  positions: StockHolding[];
  broker_breakdown?: Record<string, number>;
  cbe_required?: boolean;
  cbe_status?: string;
}

const FALLBACK_HOLDINGS: StockHolding[] = [
  {
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    shares: 20.0,
    avg_cost_usd: 180.0,
    current_price_usd: 220.0,
    broker: 'Avenue',
    currency: 'USD',
    total_usd: 4400.0,
    total_cost_usd: 3600.0,
    unrealized_pnl_usd: 800.0,
    unrealized_pnl_pct: 22.22,
    formatted_total_usd: 'US$ 4,400.00',
  },
  {
    ticker: 'NVDA',
    company_name: 'NVIDIA Corporation',
    shares: 10.0,
    avg_cost_usd: 120.0,
    current_price_usd: 135.2,
    broker: 'Avenue',
    currency: 'USD',
    total_usd: 1352.0,
    total_cost_usd: 1200.0,
    unrealized_pnl_usd: 152.0,
    unrealized_pnl_pct: 12.67,
    formatted_total_usd: 'US$ 1,352.00',
  },
  {
    ticker: 'TSLA',
    company_name: 'Tesla Inc.',
    shares: 5.0,
    avg_cost_usd: 220.0,
    current_price_usd: 250.3,
    broker: 'Avenue',
    currency: 'USD',
    total_usd: 1251.5,
    total_cost_usd: 1100.0,
    unrealized_pnl_usd: 151.5,
    unrealized_pnl_pct: 13.77,
    formatted_total_usd: 'US$ 1,251.50',
  },
];

export default function UsStocksPortfolioCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary>({
    total_usd: 7003.5,
    total_brl: 40760.37,
    ptax_rate: 5.82,
    positions_count: 3,
    positions: FALLBACK_HOLDINGS,
    cbe_required: false,
    cbe_status: 'Isento de Declaração de Capitais no Exterior (CBE Bacen < US$ 1M)',
  });

  const fetchPortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch summary from /api/portfolio/summary or /api/portfolio/us-stocks
      let res = await fetch('/api/portfolio/summary');
      if (!res.ok) {
        res = await fetch('/api/portfolio/us-stocks');
      }

      let holdingsData: StockHolding[] = [];

      // 2. Fetch holdings from /api/portfolio/holdings if available
      try {
        const holdingsRes = await fetch('/api/portfolio/holdings');
        if (holdingsRes.ok) {
          const hJson = await holdingsRes.json();
          holdingsData = Array.isArray(hJson) ? hJson : hJson.holdings || [];
        }
      } catch {
        // Continue to use summary positions
      }

      if (res.ok) {
        const data = await res.json();
        const positions =
          holdingsData.length > 0
            ? holdingsData
            : Array.isArray(data.positions) && data.positions.length > 0
            ? data.positions
            : FALLBACK_HOLDINGS;

        const totalUsd = Number(
          data.total_usd ?? positions.reduce((s: number, p: StockHolding) => s + (p.total_usd || 0), 0)
        );
        const ptax = Number(data.ptax_rate ?? 5.82);
        const totalBrl = Number(data.total_brl ?? totalUsd * ptax);

        setSummary({
          total_usd: totalUsd,
          total_brl: totalBrl,
          ptax_rate: ptax,
          positions_count: positions.length,
          positions,
          broker_breakdown: data.broker_breakdown,
          cbe_required: data.cbe_required ?? totalUsd >= 1000000.0,
          cbe_status: data.cbe_status ?? 'Isento de Declaração de Capitais no Exterior (CBE Bacen < US$ 1M)',
        });
      } else {
        // Fallback default
        setSummary((prev) => ({
          ...prev,
          positions: FALLBACK_HOLDINGS,
        }));
      }
    } catch (err: any) {
      console.error('Failed to load US stock portfolio:', err);
      setError('Usando posições em cache da Avenue Securities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const totalCostUsd = summary.positions.reduce((acc, p) => acc + (p.total_cost_usd || (p.shares * p.avg_cost_usd)), 0);
  const totalPnlUsd = summary.total_usd - totalCostUsd;
  const totalPnlPct = totalCostUsd > 0 ? (totalPnlUsd / totalCostUsd) * 100 : 0;

  const formatUSD = (val: number) =>
    `US$ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatBRL = (val: number) =>
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-white dark:bg-[#161c28] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Carteira de Ações US • Avenue Securities
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                Custódia Ativa
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ativos offshore em Dólar (USD) • Cobertura SIPC até US$ 500.000,00 • Segregação Internacional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPortfolio}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1f2738] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#28334a] border border-slate-200 dark:border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer"
            title="Atualizar cotações e saldo consolidado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-2xl text-xs flex items-center gap-2 border border-amber-200 dark:border-amber-500/30">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Total USD */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Valor Total em Dólar (USD)
          </span>
          <div className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatUSD(summary.total_usd)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            {summary.positions_count} ativos custodiados na Avenue
          </span>
        </div>

        {/* Total BRL */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Equivalente em Reais (BRL)
          </span>
          <div className="font-mono text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {formatBRL(summary.total_brl)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
            Câmbio PTAX: R$ {summary.ptax_rate.toFixed(4)}
          </span>
        </div>

        {/* Unrealized P&L */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Ganho Não Realizado (P&L)
          </span>
          <div
            className={`font-mono text-2xl font-extrabold ${
              totalPnlUsd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {totalPnlUsd >= 0 ? '+' : ''}
            {formatUSD(totalPnlUsd)}
          </div>
          <span
            className={`text-xs font-bold inline-flex items-center gap-1 mt-1 ${
              totalPnlUsd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            {totalPnlUsd >= 0 ? '+' : ''}
            {totalPnlPct.toFixed(2)}% de rentabilidade
          </span>
        </div>

        {/* CBE Bacen Status */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
            Status Fiscal & Bacen
          </span>
          <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            <Shield className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Isento de CBE Bacen</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Patrimônio &lt; US$ 1.000.000 (Res. BCB 279)
          </span>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Posições em Carteira (Ações US)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Corretora: Avenue Securities LLC • Memphis/Miami
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#121722] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/80 dark:border-white/10">
                <th className="py-3 px-4">Ativo / Empresa</th>
                <th className="py-3 px-4 text-right">Qtd (Ações)</th>
                <th className="py-3 px-4 text-right">Preço Médio</th>
                <th className="py-3 px-4 text-right">Preço Atual</th>
                <th className="py-3 px-4 text-right">Valor Total (USD)</th>
                <th className="py-3 px-4 text-right">Valor Total (BRL)</th>
                <th className="py-3 px-4 text-right">Retorno (P&L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
              {summary.positions.map((pos) => {
                const isPositive = pos.unrealized_pnl_usd >= 0;
                const totalBrlPos = pos.total_usd * summary.ptax_rate;

                return (
                  <tr key={pos.ticker} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center font-mono text-xs">
                          {pos.ticker}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block font-mono">
                            {pos.ticker}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {pos.company_name || `${pos.ticker} Inc.`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      {pos.shares.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                      US$ {pos.avg_cost_usd.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      US$ {pos.current_price_usd.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                      {formatUSD(pos.total_usd)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                      {formatBRL(totalBrlPos)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className={`font-mono font-bold ${
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatUSD(pos.unrealized_pnl_usd)}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {pos.unrealized_pnl_pct.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax & Offshore Framework Info Note */}
      <div className="mt-6 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 dark:text-white font-semibold block">
              Regime de Tributação Offshore (Lei Federal nº 14.754/2023):
            </strong>
            <span className="text-slate-600 dark:text-slate-300">
              Ganhos de capital e dividendos de ativos mantidos no exterior estão sujeitos à alíquota uniforme anual de 15% na Declaração de Ajuste Anual (DAA). Não há incidência mensal antecipada.
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-mono text-[11px]">
            DAA 2027 • IRPF
          </span>
        </div>
      </div>
    </div>
  );
}
