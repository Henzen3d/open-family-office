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
  upcoming_holidays?: Array<{ date: string; name: string; type: string }>;
}

export default function MarketTicker() {
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

  return (
    <div className="w-full bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs overflow-x-auto">
      {/* Indicator Chips */}
      <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] border border-slate-200 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-200">
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Selic Meta:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">{selicRate.toFixed(2)}%</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] border border-slate-200 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-200">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">IPCA 12m:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">{ipcaRate.toFixed(2)}%</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] border border-slate-200 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-200">
          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">PTAX:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {ptaxRate.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] border border-slate-200 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">USD:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {usdBrl.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] border border-slate-200 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">EUR:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {eurBrl.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#1f2738] border border-slate-200 dark:border-white/5 font-semibold text-slate-700 dark:text-slate-200">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">BTC:</span>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
            R$ {(btcBrl / 1000).toFixed(0)}k
          </span>
        </div>
      </div>

      {/* Meta & Refresh Action */}
      <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
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
