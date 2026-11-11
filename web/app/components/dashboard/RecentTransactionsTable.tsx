'use client';

import React from 'react';
import {
  Maximize2,
  Upload,
  Camera,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface RecentTransactionsTableProps {
  ledgerTransactions: any[];
  ledgerFilter: 'all' | 'inter' | 'caixa' | 'nubank';
  setLedgerFilter: (filter: 'all' | 'inter' | 'caixa' | 'nubank') => void;
  dashboardRowLimit: number;
  setDashboardRowLimit: (limit: number) => void;
  setIsFullStatementOpen: (open: boolean) => void;
  setIsStatementOpen: (open: boolean) => void;
  setIsReceiptOpen: (open: boolean) => void;
  handleOpenReceipt: (receiptId: string, txId?: string, initialData?: any) => void;
  formatBRL: (val: number) => string;
  avgMonthlyInflow: number;
  avgMonthlyOutflow: number;
}

export default function RecentTransactionsTable({
  ledgerTransactions,
  ledgerFilter,
  setLedgerFilter,
  dashboardRowLimit,
  setDashboardRowLimit,
  setIsFullStatementOpen,
  setIsStatementOpen,
  setIsReceiptOpen,
  handleOpenReceipt,
  formatBRL,
  avgMonthlyInflow,
  avgMonthlyOutflow,
}: RecentTransactionsTableProps) {
  const filteredLedgerTxs = ledgerTransactions.filter((tx) => {
    if (ledgerFilter === 'all') return true;
    if (ledgerFilter === 'inter') return tx.entity_code === 'FIX_SERVICOS' || (tx.account && tx.account.toLowerCase().includes('inter'));
    if (ledgerFilter === 'caixa') return tx.entity_code === 'FACILITA_VISTORIAS' || (tx.account && tx.account.toLowerCase().includes('caixa'));
    if (ledgerFilter === 'nubank') return tx.entity_code === 'HOUSEHOLD_OSMAR' || (tx.account && tx.account.toLowerCase().includes('nubank'));
    return true;
  });

  const displayedLedgerTxs = filteredLedgerTxs.slice(0, dashboardRowLimit);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      {/* TRANSACTION TABLE: Clean & Refined Ledger */}
      <div id="ledger-section" className="lg:col-span-8 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Livro Razão & Conciliação Fiscal Recente</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">Conciliação bancária com comprovantes e recibos fiscais</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Account Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#121722] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs overflow-x-auto no-scrollbar max-w-full">
                <button
                  onClick={() => setLedgerFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    ledgerFilter === 'all'
                      ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setLedgerFilter('inter')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    ledgerFilter === 'inter'
                      ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Inter PJ (Fix)
                </button>
                <button
                  onClick={() => setLedgerFilter('caixa')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    ledgerFilter === 'caixa'
                      ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Caixa PJ (Vistorias)
                </button>
                <button
                  onClick={() => setLedgerFilter('nubank')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    ledgerFilter === 'nubank'
                      ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Nubank PF
                </button>
              </div>

              {/* Visible Row Count Controls */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#121722] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Ver:</span>
                <button
                  onClick={() => setDashboardRowLimit(6)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition text-xs ${
                    dashboardRowLimit === 6
                      ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Exibir 6 lançamentos"
                >
                  6
                </button>
                <button
                  onClick={() => setDashboardRowLimit(15)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition text-xs ${
                    dashboardRowLimit === 15
                      ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Exibir 15 lançamentos"
                >
                  15
                </button>
                <button
                  onClick={() => setDashboardRowLimit(9999)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition text-xs ${
                    dashboardRowLimit > 50
                      ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Exibir todos os lançamentos no card"
                >
                  Todas
                </button>
              </div>

              {/* Dedicated Full Statement Window Trigger */}
              <button
                onClick={() => setIsFullStatementOpen(true)}
                title="Abrir extrato completo com pesquisa textual, filtros avançados e conferência visual de comprovantes"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Extrato Completo</span>
                <span className="sm:hidden">Extrato</span>
              </button>

              <button
                onClick={() => setIsStatementOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar OFX/CSV</span>
              </button>

              <button
                onClick={() => setIsReceiptOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200 dark:hover:bg-[#28334a] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                <span>Escanear Cupom</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                  <th className="pb-3 pl-1">Data / Hora</th>
                  <th className="pb-3">Entidade</th>
                  <th className="pb-3">Descrição & Contraparte</th>
                  <th className="pb-3 text-right">Valor</th>
                  <th className="pb-3">Documento Fiscal</th>
                  <th className="pb-3 text-center">Comprovante / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {displayedLedgerTxs.length > 0 ? (
                  displayedLedgerTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-md font-semibold text-xs border ${
                            tx.entity_code === 'FIX_SERVICOS'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                              : tx.entity_code === 'FACILITA_VISTORIAS'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                          }`}
                        >
                          {tx.entity_code === 'FIX_SERVICOS'
                            ? 'Inter PJ'
                            : tx.entity_code === 'FACILITA_VISTORIAS'
                            ? 'Caixa PJ'
                            : 'Nubank PF'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">{tx.description}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {tx.counterparty || tx.category || 'Operação Registrada'}
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold">
                        <span className={tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}>
                          {tx.amount >= 0 ? '+' : ''}
                          R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {tx.is_transfer ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                            PJ ↔ PF Neutralizada
                          </span>
                        ) : (
                          tx.notes ? tx.notes.split(' ')[0] : 'Conciliado'
                        )}
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        {tx.has_receipt ? (
                          <div className="relative inline-block text-left group/receipt">
                            <button
                              onClick={() => handleOpenReceipt(tx.receipt_id || tx.id, tx.id, tx)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition shadow-2xs active:scale-95"
                              title="Ver cupom fiscal associado a este lançamento"
                            >
                              <Camera className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>Ver Cupom</span>
                            </button>

                            {/* Hover preview tooltip card */}
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover/receipt:flex flex-col z-50 w-64 p-3 bg-white dark:bg-[#1b2230] rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 pointer-events-none transition-all">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/5 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cupom Fiscal</span>
                                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  R$ {Number(tx.receipt_amount || Math.abs(tx.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              
                              <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 flex items-center justify-center">
                                <img
                                  src={tx.receipt_image_url || `/api/py/receipts/${tx.receipt_id || tx.id}/image`}
                                  alt="Cupom Fiscal"
                                  className="w-full h-full object-contain p-1"
                                />
                              </div>

                              <div className="mt-2 text-left">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {tx.receipt_merchant || tx.counterparty || 'Comprovante Fiscal'}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-0.5">
                                  <span>{tx.receipt_date || tx.date}</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Clique para ampliar →</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-500/30">
                          Inter PJ
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">Recebimento Fix Serviços MEI 09/2026</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Faturamento Bruto Fix Serviços MEI (Osmar)</div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 9.987,00</td>
                      <td className="py-3 font-mono text-xs text-slate-500 dark:text-slate-400">NFS-e #09/2026</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-08-15</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-500/30">
                          Inter PJ
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">Recebimento Fix Serviços MEI 08/2026 (Pico)</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Faturamento Bruto Fix Serviços MEI</div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 14.551,55</td>
                      <td className="py-3 font-mono text-xs text-slate-500 dark:text-slate-400">NFS-e #08/2026</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-500/30">
                          Nubank PF
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">Distribuição de Lucros Isenta (Vera)</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Inter PJ → Nubank PF (Neutralizada)</div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 499,35</td>
                      <td className="py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">PJ ↔ PF Neutralizada</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-500/30">
                          Nubank PF
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">Distribuição de Lucros Isenta (Osmar)</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Inter PJ → Nubank PF (Neutralizada)</div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 499,35</td>
                      <td className="py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">PJ ↔ PF Neutralizada</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                        </span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/80 dark:border-white/10 mt-2">
          <span>
            {filteredLedgerTxs.length > 0
              ? `Exibindo ${displayedLedgerTxs.length} de ${filteredLedgerTxs.length} lançamentos (${ledgerTransactions.length} no total)`
              : 'Nenhum lançamento nesta conta'}
          </span>
          <button
            onClick={() => setIsFullStatementOpen(true)}
            className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Abrir Extrato Completo com Pesquisa & Filtros →</span>
          </button>
        </div>
      </div>

      {/* MONEY MOVEMENT: Soft Column Bar Chart (Orbix Studio Style) */}
      <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Movimentação Financeira</h2>
            <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-[#1a2232] border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-[#212a3d] text-slate-700 dark:text-slate-300 transition">
              <span>Últimos 30 dias</span>
              <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
            </button>
          </div>

          {/* In vs Out Header */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-[#121722] p-3 rounded-2xl border border-slate-200/60 dark:border-white/5 mb-4">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Entradas (Média Mensal 2026)</span>
              <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatBRL(avgMonthlyInflow)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Saídas (Média Retiradas)</span>
              <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                {formatBRL(avgMonthlyOutflow)}
              </span>
            </div>
          </div>

          {/* Soft Column Bar Chart with Glow Highlight & Floating Pill (Orbix Style) */}
          <div className="relative w-full h-36 flex items-end justify-between gap-1.5 pt-7 px-1">
            <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200 dark:bg-white/10" />

            {/* Floating Date Pill over Highlight Pillar (September 2026) */}
            <div className="absolute top-0 left-[72%] -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-mono font-bold px-2.5 py-1 rounded-full shadow-lg pointer-events-none flex items-center gap-1 border border-slate-700 dark:border-white/20">
              <span>Set 2026: R$ 9.987</span>
            </div>

            {/* Jan 2026: 13.420 */}
            <div title="Jan 2026: R$ 13.420,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[92%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
            {/* Fev 2026: 10.827 */}
            <div title="Fev 2026: R$ 10.827,29" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[74%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
            {/* Mar 2026: 12.270 */}
            <div title="Mar 2026: R$ 12.270,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[84%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
            {/* Abr 2026: 8.270 */}
            <div title="Abr 2026: R$ 8.270,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[57%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
            {/* Mai 2026: 12.125 */}
            <div title="Mai 2026: R$ 12.125,50" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[83%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
            {/* Jun 2026: 11.082 */}
            <div title="Jun 2026: R$ 11.082,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[76%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
            {/* Jul 2026: 11.099 */}
            <div title="Jul 2026: R$ 11.099,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[76%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
            {/* Ago 2026: 14.551 (Peak) */}
            <div title="Ago 2026: R$ 14.551,55" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[100%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
            {/* Set 2026: 9.987 (Active Highlighted) */}
            <div title="Set 2026: R$ 9.987,00 (Último mês)" className="w-full bg-indigo-600 dark:bg-indigo-500 rounded-t-xl h-[68%] relative cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-white mx-auto mt-1 opacity-90 shadow-sm" />
            </div>
            {/* Out, Nov, Dez (Previsto) */}
            <div title="Out 2026 (Em aberto)" className="w-full bg-slate-100 dark:bg-[#151c2a] border border-dashed border-slate-300 dark:border-white/10 rounded-t-xl h-[20%] transition" />
            <div title="Nov 2026 (Em aberto)" className="w-full bg-slate-100 dark:bg-[#151c2a] border border-slate-300 dark:border-white/10 rounded-t-xl h-[20%] transition" />
            <div title="Dez 2026 (Em aberto)" className="w-full bg-slate-100 dark:bg-[#151c2a] border border-slate-300 dark:border-white/10 rounded-t-xl h-[20%] transition" />
          </div>
        </div>

        {/* Copilot Micro Drawer Trigger */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="font-bold text-slate-900 dark:text-white">OF-Copilot Fiscal</span>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 px-2 py-1 rounded-full">
              Teto MEI Regular
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

