'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';

export interface PendenciaItem {
  id: string;
  type: 'receipt' | 'transaction' | 'governance' | 'mei' | 'das';
  title: string;
  description: string;
  count?: number;
  entityName?: string;
  severity: 'high' | 'medium' | 'info';
  actionLabel: string;
  actionHref?: string;
  onActionClick?: () => void;
}

interface PendenciasSectionProps {
  pendingReceiptsCount: number;
  pendingTransactionsCount: number;
  isConjugalPending: boolean;
  onOpenReceiptScanner: () => void;
  onOpenStatementModal: () => void;
  onOpenConjugalModal: () => void;
  activeTab: 'all' | 'fix' | 'facilita' | 'pf';
}

export default function PendenciasSection({
  pendingReceiptsCount,
  pendingTransactionsCount,
  isConjugalPending,
  onOpenReceiptScanner,
  onOpenStatementModal,
  onOpenConjugalModal,
  activeTab,
}: PendenciasSectionProps) {
  const items: PendenciaItem[] = [];

  if (pendingReceiptsCount > 0) {
    items.push({
      id: 'receipts-pending',
      type: 'receipt',
      title: `${pendingReceiptsCount} ${pendingReceiptsCount === 1 ? 'comprovante aguarda' : 'comprovantes aguardam'} conciliação`,
      description: 'Notas fiscais e cupons escaneados prontos para vincular ao Livro Razão',
      count: pendingReceiptsCount,
      severity: 'high',
      actionLabel: 'Revisar Comprovantes',
      actionHref: '/receipts',
    });
  }

  if (pendingTransactionsCount > 0) {
    items.push({
      id: 'tx-no-receipt',
      type: 'transaction',
      title: `${pendingTransactionsCount} ${pendingTransactionsCount === 1 ? 'despesa sem' : 'despesas sem'} comprovante anexado`,
      description: 'Lançamentos bancários recentes que exigem cupom para conformidade fiscal MEI',
      count: pendingTransactionsCount,
      severity: 'medium',
      actionLabel: 'Conciliar no Razão',
      actionHref: '/ledger?type=pending_receipts',
    });
  }

  if (isConjugalPending) {
    items.push({
      id: 'conjugal-approval',
      type: 'governance',
      title: 'Distribuição de Lucros aguarda validação de Vera',
      description: 'Transferência de R$ 3.500,00 da Fix MEI para Conta Familiar (Art. 18-A LC 123/2006)',
      severity: 'medium',
      actionLabel: 'Homologar Acordo',
      onActionClick: onOpenConjugalModal,
    });
  }

  const totalPendencias = items.length;

  return (
    <div className="w-full bg-white dark:bg-[#161c28] rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-card mb-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pendências & Ações Prioritárias
              </h2>
              {totalPendencias > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                  {totalPendencias} {totalPendencias === 1 ? 'item' : 'itens'}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Em dia</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Itens que exigem atenção de Osmar e Vera para blindagem fiscal e conciliação
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenReceiptScanner}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Adicionar Comprovante</span>
          </button>
          <button
            onClick={onOpenStatementModal}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importar Extrato</span>
          </button>
        </div>
      </div>

      {/* List of Pending Items */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/70 dark:border-white/5 flex flex-col justify-between hover:border-indigo-500/30 transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      item.severity === 'high'
                        ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {item.severity === 'high' ? 'Urgente' : 'Pendente'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {item.count ? `${item.count} pendente(s)` : ''}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                {item.actionHref ? (
                  <Link
                    href={item.actionHref}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group-hover:underline"
                  >
                    <span>{item.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <button
                    onClick={item.onActionClick}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer group-hover:underline"
                  >
                    <span>{item.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 px-4 rounded-2xl bg-slate-50/60 dark:bg-[#121722]/60 border border-slate-200/60 dark:border-white/5 text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhuma pendência fiscal ou contábil no momento!
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            Todos os comprovantes foram vinculados, os saldos estão conciliados e as titularidades dos MEIs estão regulares.
          </p>
        </div>
      )}
    </div>
  );
}
