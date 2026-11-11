'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, Sparkles, Shield, DollarSign } from 'lucide-react';

interface AccountBucket {
  name: string;
  contributed: number;
  annual_limit: number;
  remaining_margin: number;
  percentage_filled: number;
  benefit_type: string;
}

interface UsTaxResponse {
  age: number;
  effective_tax_bracket_percent: number;
  accounts: {
    '401k': AccountBucket;
    roth_ira: AccountBucket;
    hsa: AccountBucket;
  };
  total_contributed: number;
  estimated_federal_tax_saved_this_year: number;
}

export default function UsTaxAdvantagedCard() {
  const [data, setData] = useState<UsTaxResponse | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/us-tax/overview');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          throw new Error();
        }
      } catch {
        setData({
          age: 42,
          effective_tax_bracket_percent: 24,
          accounts: {
            '401k': {
              name: '401(k) Pre-Tax Plan',
              contributed: 16500,
              annual_limit: 23500,
              remaining_margin: 7000,
              percentage_filled: 70.2,
              benefit_type: 'Pre-tax deduction + tax-deferred compounding',
            },
            roth_ira: {
              name: 'Roth IRA (Backdoor / Direct)',
              contributed: 7000,
              annual_limit: 7000,
              remaining_margin: 0,
              percentage_filled: 100.0,
              benefit_type: '100% tax-free growth and tax-free retirement withdrawals',
            },
            hsa: {
              name: 'Health Savings Account (HSA)',
              contributed: 5200,
              annual_limit: 8550,
              remaining_margin: 3350,
              percentage_filled: 60.8,
              benefit_type: 'Triple-tax advantage (deductible, tax-free growth & withdrawals)',
            },
          },
          total_contributed: 28700,
          estimated_federal_tax_saved_this_year: 5208,
        });
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Contas com Benefício Fiscal dos EUA (IRS 2026)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhamento de tetos anuais de 401(k), Roth IRA e HSA para cidadãos e residentes
            </p>
          </div>
        </div>

        {data && (
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Economia Fiscal Federal Estimada
            </span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              +${data.estimated_federal_tax_saved_this_year.toLocaleString('en-US')} USD
            </span>
          </div>
        )}
      </div>

      {/* Account Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data &&
          Object.entries(data.accounts).map(([key, acc]) => (
            <div
              key={key}
              className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-2.5"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {acc.name}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    acc.percentage_filled >= 100
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {acc.percentage_filled >= 100 ? 'Teto Atingido' : `${acc.percentage_filled}%`}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  ${acc.contributed.toLocaleString('en-US')}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  / ${acc.annual_limit.toLocaleString('en-US')}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    acc.percentage_filled >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, acc.percentage_filled)}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-snug">
                {acc.remaining_margin > 0 ? (
                  <span>
                    Margem restante de{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-mono">
                      ${acc.remaining_margin.toLocaleString('en-US')}
                    </strong>{' '}
                    até 31/12.
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Contribuição anual maximizada com sucesso.
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

