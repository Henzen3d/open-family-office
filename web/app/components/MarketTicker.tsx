'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, RefreshCw, DollarSign, Activity, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface MarketData {
  timestamp?: string;
  cached?: boolean;
  cache_age_seconds?: number;
  rates?: Record<string, { code: string; name: string; value: number; reference_date: string; source: string }>;
  currencies?: Record<string, { pair: string; name: string; bid: number; ask: number; pct_change: number }>;
  crypto?: Record<string, { symbol: string; price_brl: number; currency: string; source: string }>;
  indices?: Record<string, { code: string; symbol: string; name: string; value: number; pct_change: number; currency: string; fallback?: boolean }>;
  upcoming_holidays?: Array<{ date: string; name: string; type: string }>;
}

interface MarketTickerProps {
  onSelectAsset?: (symbol: string) => void;
}

export default function MarketTicker({ onSelectAsset }: MarketTickerProps) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchOverview = async (force: boolean = false) => {
    setLoading(true);
    try {
      const endpoint = force ? '/api/py/market/refresh' : '/api/py/market/overview';
      const method = force ? 'POST' : 'GET';
      const res = await fetch(endpoint, { method });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error('Failed to load market indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(false);
  }, []);

  const selicRate = data?.rates?.['SELIC']?.value ?? 13.75;
  const ptaxRate = data?.rates?.['DOLAR_PTAX']?.value ?? 5.72;
  const ipcaRate = data?.rates?.['IPCA_12M']?.value ?? 4.50;
  const usdBrl = data?.currencies?.['USD-BRL']?.bid ?? 5.72;
  const eurBrl = data?.currencies?.['EUR-BRL']?.bid ?? 6.18;
  const btcBrl = data?.crypto?.['BTC']?.price_brl ?? 540000;
  const ibov = data?.indices?.['IBOV'];
  const sp500 = data?.indices?.['SP500'];
  const nasdaq = data?.indices?.['NASDAQ'];

  return (
    <div className="w-full bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/10 rounded-2xl p-2.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs overflow-x-auto">
      {/* Indicator Chips */}
      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
        <button
          onClick={() => onSelectAsset?.('SELIC')}
          title="Ver gráfico e histórico da Taxa Selic"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Selic Meta:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">{selicRate.toFixed(2)}%</span>
        </button>

        <button
          onClick={() => onSelectAsset?.('IPCA')}
          title="Ver gráfico e histórico do IPCA"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">IPCA 12m:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">{ipcaRate.toFixed(2)}%</span>
        </button>

        <button
          onClick={() => onSelectAsset?.('DOLAR_PTAX')}
          title="Ver gráfico e histórico do Dólar PTAX"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">PTAX:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {ptaxRate.toFixed(2)}</span>
        </button>

        <button
          onClick={() => onSelectAsset?.('USD')}
          title="Ver gráfico e histórico do Dólar USD"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">USD:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {usdBrl.toFixed(2)}</span>
        </button>

        <button
          onClick={() => onSelectAsset?.('EUR')}
          title="Ver gráfico e histórico do Euro EUR"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">EUR:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {eurBrl.toFixed(2)}</span>
        </button>

        <button
          onClick={() => onSelectAsset?.('BTC')}
          title="Ver gráfico e histórico do Bitcoin"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">BTC:</span>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
            R$ {(btcBrl / 1000).toFixed(0)}k
          </span>
        </button>

        {/* Equity Indices (B3, S&P 500, Nasdaq) */}
        {ibov && (
          <button
            onClick={() => onSelectAsset?.('IBOV')}
            title="Ver gráfico e histórico do Ibovespa B3 (1d, 5d, 1m, 6m, 1a, 5a)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">B3:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {ibov.value >= 1000 ? `${(ibov.value / 1000).toFixed(1)}k` : ibov.value.toLocaleString('pt-BR')}
            </span>
            <span className={`text-[11px] font-mono ${ibov.pct_change >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}`}>
              {ibov.pct_change >= 0 ? `+${ibov.pct_change}%` : `${ibov.pct_change}%`}
            </span>
          </button>
        )}

        {sp500 && (
          <button
            onClick={() => onSelectAsset?.('SP500')}
            title="Ver gráfico e histórico do S&P 500 (1d, 5d, 1m, 6m, 1a, 5a)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">S&P 500:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {sp500.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className={`text-[11px] font-mono ${sp500.pct_change >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}`}>
              {sp500.pct_change >= 0 ? `+${sp500.pct_change}%` : `${sp500.pct_change}%`}
            </span>
          </button>
        )}

        {nasdaq && (
          <button
            onClick={() => onSelectAsset?.('NASDAQ')}
            title="Ver gráfico e histórico do Nasdaq (1d, 5d, 1m, 6m, 1a, 5a)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200/80 dark:hover:bg-[#28344c] border border-slate-200 dark:border-white/5 hover:border-indigo-500/40 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Nasdaq:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {nasdaq.value >= 1000 ? `${(nasdaq.value / 1000).toFixed(1)}k` : nasdaq.value.toLocaleString('en-US')}
            </span>
            <span className={`text-[11px] font-mono ${nasdaq.pct_change >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}`}>
              {nasdaq.pct_change >= 0 ? `+${nasdaq.pct_change}%` : `${nasdaq.pct_change}%`}
            </span>
          </button>
        )}
      </div>

      {/* Meta & Refresh Action */}
      <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hidden xl:inline">
          ✦ Clique no índice para abrir gráfico interativo
        </span>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          {data?.cached ? `Cache 15m (${data.cache_age_seconds ?? 0}s)` : 'Feed em tempo real'}
        </span>
        <button
          onClick={() => fetchOverview(true)}
          disabled={loading}
          title="Atualizar cotações do Banco Central e Mercado"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200 dark:hover:bg-[#253046] text-slate-600 dark:text-slate-300 rounded-xl transition disabled:opacity-50 text-[11px] font-medium"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>
    </div>
  );
}

