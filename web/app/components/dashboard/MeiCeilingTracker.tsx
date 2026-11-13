'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

export interface MeiEntityStatus {
  entityCode: string;
  name: string;
  owner: string;
  annualCeiling: number;
  toleranceCeiling: number;
  revenueYtd: number;
  utilizationPct: number;
  marginRemaining: number;
  monthlyAverage: number;
  status: 'SAFE' | 'CAUTION' | 'TOLERANCE' | 'EXCEEDED';
  statusNote: string;
}

interface MeiCeilingTrackerProps {
  activeTab?: 'all' | 'fix' | 'facilita' | 'pf';
  formatBRL: (val: number) => string;
  // Optional initial props for backward compatibility
  meiOsmarPct?: string;
  meiOsmarIssued?: number;
  meiOsmarMargin?: number;
  meiVeraPct?: string;
  meiVeraIssued?: number;
  meiVeraMargin?: number;
}

const CEILING_ANNUAL = 81000.0;
const CEILING_TOLERANCE_20 = 97200.0; // Art. 14 § 1º LC 123/2006

export default function MeiCeilingTracker({
  activeTab = 'all',
  formatBRL,
}: MeiCeilingTrackerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fixStatus, setFixStatus] = useState<MeiEntityStatus>({
    entityCode: 'FIX_SERVICOS',
    name: 'Fix Serviços MEI',
    owner: 'Osmar',
    annualCeiling: CEILING_ANNUAL,
    toleranceCeiling: CEILING_TOLERANCE_20,
    revenueYtd: 0,
    utilizationPct: 0,
    marginRemaining: CEILING_ANNUAL,
    monthlyAverage: 0,
    status: 'SAFE',
    statusNote: 'Regular • LC 123/2006',
  });

  const [facilitaStatus, setFacilitaStatus] = useState<MeiEntityStatus>({
    entityCode: 'FACILITA_VISTORIAS',
    name: 'Facilita Vistorias MEI',
    owner: 'Vera',
    annualCeiling: CEILING_ANNUAL,
    toleranceCeiling: CEILING_TOLERANCE_20,
    revenueYtd: 0,
    utilizationPct: 0,
    marginRemaining: CEILING_ANNUAL,
    monthlyAverage: 0,
    status: 'SAFE',
    statusNote: 'Regular • LC 123/2006',
  });

  const computeStatus = (ytd: number): { status: MeiEntityStatus['status']; note: string } => {
    const pct = (ytd / CEILING_ANNUAL) * 100;
    if (ytd > CEILING_TOLERANCE_20) {
      return { status: 'EXCEEDED', note: 'Excedeu margem 20% (Desenquadramento Retroativo)' };
    }
    if (ytd > CEILING_ANNUAL) {
      return { status: 'TOLERANCE', note: 'Margem 20% Tolerância (Transição sem multa retroativa)' };
    }
    if (pct >= 80) {
      return { status: 'CAUTION', note: 'Atenção: >80% do teto anual atingido' };
    }
    return { status: 'SAFE', note: 'Regular • LC 123/2006' };
  };

  const fetchMeiData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try dedicated endpoint /api/statements/mei-ceiling or /api/reports/mei-status
      let res = await fetch('/api/statements/mei-ceiling');
      if (!res.ok) {
        res = await fetch('/api/reports/mei-status');
      }

      if (res.ok) {
        const data = await res.json();
        // Handle both object structures: { fix_servicos: {...}, facilita_vistorias: {...} } or array
        const fixRaw = data.fix_servicos || (Array.isArray(data) ? data.find((d: any) => d.entity_code === 'FIX_SERVICOS') : null);
        const facilitaRaw = data.facilita_vistorias || (Array.isArray(data) ? data.find((d: any) => d.entity_code === 'FACILITA_VISTORIAS') : null);

        if (fixRaw) {
          const rev = Number(fixRaw.revenue_ytd ?? fixRaw.gross_revenue_ytd ?? fixRaw.revenue ?? 0);
          const { status, note } = computeStatus(rev);
          setFixStatus({
            entityCode: 'FIX_SERVICOS',
            name: 'Fix Serviços MEI',
            owner: 'Osmar',
            annualCeiling: fixRaw.annual_ceiling || CEILING_ANNUAL,
            toleranceCeiling: fixRaw.tolerance_ceiling_20pct || CEILING_TOLERANCE_20,
            revenueYtd: rev,
            utilizationPct: Number((fixRaw.percentage_used ?? (rev / CEILING_ANNUAL) * 100).toFixed(1)),
            marginRemaining: Number(fixRaw.margin_remaining ?? Math.max(0, CEILING_ANNUAL - rev)),
            monthlyAverage: fixRaw.monthly_average ?? Number((rev / 9).toFixed(2)),
            status,
            statusNote: fixRaw.recommendation || fixRaw.tolerance_warning || fixRaw.notes?.[0] || note,
          });
        }

        if (facilitaRaw) {
          const rev = Number(facilitaRaw.revenue_ytd ?? facilitaRaw.gross_revenue_ytd ?? facilitaRaw.revenue ?? 0);
          const { status, note } = computeStatus(rev);
          setFacilitaStatus({
            entityCode: 'FACILITA_VISTORIAS',
            name: 'Facilita Vistorias MEI',
            owner: 'Vera',
            annualCeiling: facilitaRaw.annual_ceiling || CEILING_ANNUAL,
            toleranceCeiling: facilitaRaw.tolerance_ceiling_20pct || CEILING_TOLERANCE_20,
            revenueYtd: rev,
            utilizationPct: Number((facilitaRaw.percentage_used ?? (rev / CEILING_ANNUAL) * 100).toFixed(1)),
            marginRemaining: Number(facilitaRaw.margin_remaining ?? Math.max(0, CEILING_ANNUAL - rev)),
            monthlyAverage: facilitaRaw.monthly_average ?? Number((rev / 9).toFixed(2)),
            status,
            statusNote: facilitaRaw.recommendation || facilitaRaw.tolerance_warning || facilitaRaw.notes?.[0] || note,
          });
        }
        setLoading(false);
        return;
      }
    } catch {
      // Fallback: continue to compute directly from real transactions
    }

    // 2. Direct Fallback: Calculate real 2026 revenue from real transactions
    try {
      const txRes = await fetch('/api/py/statements/transactions?limit=250');
      if (txRes.ok) {
        const txData = await txRes.json();
        const txs: any[] = txData.transactions || [];

        let revFix = 0;
        let revFacilita = 0;

        for (const t of txs) {
          const is2026 = (t.date || '').startsWith('2026');
          const amt = Number(t.amount) || 0;
          const isTransfer = !!t.is_transfer;

          if (is2026 && amt > 0 && !isTransfer) {
            const code = (t.entity_code || '').toUpperCase();
            if (code === 'FIX_SERVICOS' || (t.account_name || '').toLowerCase().includes('inter')) {
              revFix += amt;
            } else if (code === 'FACILITA_VISTORIAS' || (t.account_name || '').toLowerCase().includes('caixa')) {
              revFacilita += amt;
            }
          }
        }

        const fixComp = computeStatus(revFix);
        setFixStatus({
          entityCode: 'FIX_SERVICOS',
          name: 'Fix Serviços MEI',
          owner: 'Osmar',
          annualCeiling: CEILING_ANNUAL,
          toleranceCeiling: CEILING_TOLERANCE_20,
          revenueYtd: revFix,
          utilizationPct: Number(((revFix / CEILING_ANNUAL) * 100).toFixed(1)),
          marginRemaining: Math.max(0, CEILING_ANNUAL - revFix),
          monthlyAverage: Number((revFix / 9).toFixed(2)),
          status: fixComp.status,
          statusNote: fixComp.note,
        });

        const facilitaComp = computeStatus(revFacilita);
        setFacilitaStatus({
          entityCode: 'FACILITA_VISTORIAS',
          name: 'Facilita Vistorias MEI',
          owner: 'Vera',
          annualCeiling: CEILING_ANNUAL,
          toleranceCeiling: CEILING_TOLERANCE_20,
          revenueYtd: revFacilita,
          utilizationPct: Number(((revFacilita / CEILING_ANNUAL) * 100).toFixed(1)),
          marginRemaining: Math.max(0, CEILING_ANNUAL - revFacilita),
          monthlyAverage: Number((revFacilita / 9).toFixed(2)),
          status: facilitaComp.status,
          statusNote: facilitaComp.note,
        });
      }
    } catch (err: any) {
      console.error('Failed to calculate MEI status:', err);
      setError('Não foi possível carregar o faturamento MEI em tempo real.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeiData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFixHighlighted = activeTab === 'fix';
  const isFacilitaHighlighted = activeTab === 'facilita';

  return (
    <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Monitor de Teto MEI • LC 123/2006</h2>
            {loading && <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
          </div>
          <button
            onClick={fetchMeiData}
            title="Atualizar faturamento dos CNPJs em tempo real"
            className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#121722] hover:bg-slate-100 dark:hover:bg-[#1a2232] border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition"
          >
            <CreditCard className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </button>
        </div>

        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              R$ 81.000,00
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ CNPJ Anual</span>
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-400" title="Limite com tolerância de 20%">
            Tolerância: R$ 97,2k
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Exercício 2026 • 2 Titularidades Autônomas (Capacidade Consolidada R$ 162.000,00)
        </p>

        {error && (
          <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MEI 1: Fix Serviços (Osmar) */}
        <div
          className={`mb-4 p-3 rounded-2xl transition-all ${
            isFixHighlighted
              ? 'bg-amber-500/10 border-2 border-amber-500/40 ring-2 ring-amber-500/20'
              : 'border border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex justify-between items-center text-xs mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                1. Fix Serviços MEI (Titular: Osmar)
              </span>
              {isFixHighlighted && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-amber-600 text-white">
                  Ativo
                </span>
              )}
            </div>
            <span
              className={`font-mono font-bold ${
                fixStatus.utilizationPct >= 100
                  ? 'text-rose-600 dark:text-rose-400'
                  : fixStatus.utilizationPct >= 80
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {fixStatus.utilizationPct}%
            </span>
          </div>

          {/* Clean progress bar */}
          <div className="w-full bg-slate-100 dark:bg-[#121722] rounded-full h-2.5 overflow-hidden border border-slate-200/80 dark:border-white/10 my-2">
            <div
              className={`h-full rounded-full transition-all ${
                fixStatus.utilizationPct >= 100
                  ? 'bg-rose-500'
                  : fixStatus.utilizationPct >= 80
                  ? 'bg-amber-500'
                  : 'bg-indigo-600 dark:bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, fixStatus.utilizationPct))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Emitido: <strong className="text-slate-900 dark:text-white font-semibold">{formatBRL(fixStatus.revenueYtd)}</strong></span>
            <span className={fixStatus.marginRemaining > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-bold'}>
              Margem: {formatBRL(fixStatus.marginRemaining)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center justify-between">
            <span>Média: {formatBRL(fixStatus.monthlyAverage)}/mês</span>
            <span className="text-[10px] italic">{fixStatus.statusNote}</span>
          </div>
        </div>

        {/* MEI 2: Facilita Vistorias (Vera) */}
        <div
          className={`p-3 rounded-2xl transition-all ${
            isFacilitaHighlighted
              ? 'bg-purple-500/10 border-2 border-purple-500/40 ring-2 ring-purple-500/20'
              : 'border border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex justify-between items-center text-xs mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                2. Facilita Vistorias MEI (Titular: Vera)
              </span>
              {isFacilitaHighlighted && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-purple-600 text-white">
                  Ativo
                </span>
              )}
            </div>
            <span
              className={`font-mono font-bold ${
                facilitaStatus.utilizationPct >= 100
                  ? 'text-rose-600 dark:text-rose-400'
                  : facilitaStatus.utilizationPct >= 80
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-purple-600 dark:text-pink-400'
              }`}
            >
              {facilitaStatus.utilizationPct}%
            </span>
          </div>

          {/* Clean progress bar */}
          <div className="w-full bg-slate-100 dark:bg-[#121722] rounded-full h-2.5 overflow-hidden border border-slate-200/80 dark:border-white/10 my-2">
            <div
              className={`h-full rounded-full transition-all ${
                facilitaStatus.utilizationPct >= 100
                  ? 'bg-rose-500'
                  : facilitaStatus.utilizationPct >= 80
                  ? 'bg-amber-500'
                  : 'bg-purple-600 dark:bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, facilitaStatus.utilizationPct))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>Emitido: <strong className="text-slate-900 dark:text-white font-semibold">{formatBRL(facilitaStatus.revenueYtd)}</strong></span>
            <span className={facilitaStatus.marginRemaining > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-bold'}>
              Margem: {formatBRL(facilitaStatus.marginRemaining)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center justify-between">
            <span>Média: {formatBRL(facilitaStatus.monthlyAverage)}/mês</span>
            <span className="text-[10px] italic">{facilitaStatus.statusNote}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Blindagem LC 123/2006:</span>
        <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>2 Titularidades Separadas (Art. 18-A)</span>
        </span>
      </div>
    </div>
  );
}
