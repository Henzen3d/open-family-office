'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, AlertTriangle, Globe, Clock, CheckCircle } from 'lucide-react';

interface ComplianceData {
  status: string;
  w8ben: {
    signed_date: string;
    expiration_date: string;
    days_remaining: number;
    status: string;
    severity: string;
    action_required: string;
  };
  cbe_bacen: {
    total_foreign_assets_usd: number;
    cbe_threshold_usd: number;
    percentage_of_threshold: number;
    remaining_exempt_margin_usd: number;
    status: string;
    severity: string;
    recommended_action: string;
    declaration_window: string;
  };
  carne_leao: {
    status: string;
    last_darf_paid: string;
    note: string;
  };
}

export default function CrossBorderComplianceRadar() {
  const [data, setData] = useState<ComplianceData | null>(null);

  useEffect(() => {
    async function loadCompliance() {
      try {
        const res = await fetch('/api/cross-border/compliance');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          throw new Error();
        }
      } catch {
        setData({
          status: 'compliant',
          w8ben: {
            signed_date: '2024-04-10',
            expiration_date: '2027-12-31',
            days_remaining: 672,
            status: 'VÁLIDO E EM CONFORMIDADE',
            severity: 'safe',
            action_required: 'Válido até 31/12/2027. Alíquota de dividendos reduzida para 15% conforme acordo.',
          },
          cbe_bacen: {
            total_foreign_assets_usd: 34500,
            cbe_threshold_usd: 1000000,
            percentage_of_threshold: 3.5,
            remaining_exempt_margin_usd: 965500,
            status: 'Isento de Declaração CBE Bacen',
            severity: 'safe',
            recommended_action: 'Patrimônio no exterior bem abaixo do limite compulsório de US$ 1 milhão.',
            declaration_window: '15 de Fevereiro a 05 de Abril',
          },
          carne_leao: {
            status: 'Sem pendências no mês',
            last_darf_paid: 'R$ 0,00',
            note: 'Receitas do exterior convertidas pelo dólar PTAX compra na data do recebimento.',
          },
        });
      }
    }
    loadCompliance();
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Radar de Conformidade Fiscal Internacional (Cross-Border)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoramento de bitributação W-8BEN, obrigações do Banco Central (CBE) e Carnê-Leão
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* W-8BEN Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              Formulário W-8BEN (IRS)
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Válido
            </span>
          </div>

          <div className="pt-1">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {data?.w8ben.days_remaining} dias
            </span>
            <span className="text-[10px] text-slate-400 block">
              Expiração: {data?.w8ben.expiration_date}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {data?.w8ben.action_required}
          </p>
        </div>

        {/* CBE Bacen Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              CBE Bacen (Capitais no Exterior)
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Isento
            </span>
          </div>

          <div className="pt-1">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              ${data?.cbe_bacen.total_foreign_assets_usd.toLocaleString('en-US')}{' '}
              <span className="text-xs font-normal text-slate-400">/ $1.000.000</span>
            </span>
            <span className="text-[10px] text-slate-400 block">
              {data?.cbe_bacen.percentage_of_threshold}% do teto de obrigatoriedade
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {data?.cbe_bacen.recommended_action}
          </p>
        </div>

        {/* Carnê-Leão Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              Carnê-Leão Web (Receitas em BRL)
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400">
              Em dia
            </span>
          </div>

          <div className="pt-1">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {data?.carne_leao.status}
            </span>
            <span className="text-[10px] text-slate-400 block">
              DARF devido: {data?.carne_leao.last_darf_paid}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {data?.carne_leao.note}
          </p>
        </div>
      </div>
    </div>
  );
}

