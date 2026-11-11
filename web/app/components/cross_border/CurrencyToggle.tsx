'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Globe } from 'lucide-react';

export type CurrencyMode = 'BRL' | 'USD' | 'DUAL';

interface CurrencyToggleProps {
  onCurrencyChange?: (mode: CurrencyMode) => void;
  ptaxRate?: number;
}

export default function CurrencyToggle({
  onCurrencyChange,
  ptaxRate = 5.82,
}: CurrencyToggleProps) {
  const [mode, setMode] = useState<CurrencyMode>('BRL');

  useEffect(() => {
    const saved = localStorage.getItem('ofo-currency-mode') as CurrencyMode;
    if (saved && (saved === 'BRL' || saved === 'USD' || saved === 'DUAL')) {
      setMode(saved);
      if (onCurrencyChange) onCurrencyChange(saved);
    }
  }, [onCurrencyChange]);

  const handleSelect = (newMode: CurrencyMode) => {
    setMode(newMode);
    localStorage.setItem('ofo-currency-mode', newMode);
    if (onCurrencyChange) onCurrencyChange(newMode);
  };

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-xs">
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => handleSelect('BRL')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition ${
            mode === 'BRL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Consolidar em Reais Brasileiros (BRL)"
        >
          R$ BRL
        </button>

        <button
          onClick={() => handleSelect('USD')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition ${
            mode === 'USD'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Consolidar em Dólares Americanos (USD)"
        >
          $ USD
        </button>

        <button
          onClick={() => handleSelect('DUAL')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition ${
            mode === 'DUAL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Exibir Dupla Moeda (BRL + USD)"
        >
          Dupla
        </button>
      </div>

      <div className="hidden sm:flex items-center gap-1 pl-1.5 pr-2 border-l border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-400">
        <Globe className="w-3 h-3 text-emerald-500" />
        <span>PTAX: R$ {ptaxRate.toFixed(2)}</span>
      </div>
    </div>
  );
}

