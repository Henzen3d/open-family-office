'use client';

import React, { useState, useMemo } from 'react';
import { Send, ArrowRightLeft, DollarSign, Sparkles, CheckCircle2 } from 'lucide-react';

interface RemittanceProvider {
  name: string;
  spreadPercent: number;
  fixedFeeBrl: number;
}

export default function RemittanceCostCalculator() {
  const [amountBrl, setAmountBrl] = useState(15000);
  const [purpose, setPurpose] = useState<'same_ownership' | 'investment'>('same_ownership');
  const [ptaxRate, setPtaxRate] = useState(5.82);

  const providers: RemittanceProvider[] = [
    { name: 'Wise', spreadPercent: 1.15, fixedFeeBrl: 15.0 },
    { name: 'Nomad', spreadPercent: 1.70, fixedFeeBrl: 0.0 },
    { name: 'Avenue', spreadPercent: 1.85, fixedFeeBrl: 0.0 },
    { name: 'Banco Tradicional', spreadPercent: 3.60, fixedFeeBrl: 120.0 },
  ];

  const results = useMemo(() => {
    const iofRate = purpose === 'same_ownership' ? 0.011 : 0.0038;

    const list = providers.map((p) => {
      const commRate = ptaxRate * (1.0 + p.spreadPercent / 100.0);
      const netBrlAfterFee = Math.max(0, amountBrl - p.fixedFeeBrl);
      const iofAmount = netBrlAfterFee * iofRate;
      const netBrlForFx = Math.max(0, netBrlAfterFee - iofAmount);
      const netUsd = netBrlForFx / commRate;
      const vet = amountBrl / netUsd;

      return {
        name: p.name,
        spread: p.spreadPercent,
        fee: p.fixedFeeBrl,
        iof: iofAmount,
        rate: commRate,
        netUsd: Math.round(netUsd * 100) / 100,
        vet: Math.round(vet * 10000) / 10000,
      };
    });

    list.sort((a, b) => b.netUsd - a.netUsd);
    const best = list[0];
    const worst = list[list.length - 1];
    const diffUsd = best.netUsd - worst.netUsd;

    return { list, best, worst, diffUsd, iofPercent: iofRate * 100 };
  }, [amountBrl, purpose, ptaxRate]);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Simulador de Remessas Internacionais & VET
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare spread, IOF legal e o valor líquido que chega na sua conta no exterior
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 self-start md:self-auto flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Economia máxima: +${results.diffUsd.toFixed(2)} USD
        </span>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <span>Valor da Remessa (BRL)</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              R$ {amountBrl.toLocaleString('pt-BR')}
            </span>
          </div>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={amountBrl}
            onChange={(e) => setAmountBrl(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
            Finalidade da Operação (Alíquota IOF)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPurpose('same_ownership')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                purpose === 'same_ownership'
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mesma Titularidade (1,1% IOF)
            </button>
            <button
              onClick={() => setPurpose('investment')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                purpose === 'investment'
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Investimentos / Corretora (0,38% IOF)
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Cards / Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {results.list.map((item, idx) => (
          <div
            key={item.name}
            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              idx === 0
                ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-500/40'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/5'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {item.name}
                </span>
                {idx === 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Melhor VET
                  </span>
                )}
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                ${item.netUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                VET: R$ {item.vet.toFixed(4)}
              </span>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-white/10 text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Spread:</span>
                <span className="font-mono">{item.spread}%</span>
              </div>
              <div className="flex justify-between">
                <span>IOF ({results.iofPercent}%):</span>
                <span className="font-mono">R$ {item.iof.toFixed(2)}</span>
              </div>
              {item.fee > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>Tarifa Fixa:</span>
                  <span className="font-mono">R$ {item.fee.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

