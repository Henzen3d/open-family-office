'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  CreditCard,
  Camera,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  CheckCircle2,
  Eye,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { BankAccountItem } from './SettingsModal';

export interface LedgerTransaction {
  id: string;
  entity_code: string;
  account_name: string;
  date: string;
  amount: number;
  currency?: string;
  raw_description?: string;
  clean_description: string;
  category_code?: string;
  counterparty?: string;
  is_transfer?: boolean;
  transfer_pair_id?: string;
  reconciliation_status?: string;
  notes?: string;
  has_receipt?: boolean;
  receipt_id?: string;
  receipt_merchant?: string;
  receipt_amount?: number;
  receipt_date?: string;
  receipt_items_count?: number;
  receipt_image_url?: string;
}

interface FullStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: LedgerTransaction[];
  accounts?: BankAccountItem[];
  onOpenReceipt: (receiptId: string, txId?: string, initialData?: any) => void;
  onRefresh?: () => void;
}

export default function FullStatementModal({
  isOpen,
  onClose,
  transactions,
  accounts = [],
  onOpenReceipt,
  onRefresh,
}: FullStatementModalProps) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [flowType, setFlowType] = useState<'all' | 'inflow' | 'outflow' | 'transfer'>('all');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'with_receipt' | 'without_receipt'>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'alpha'>('date_desc');

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Hover Popover State for Receipt Thumbnail
  const [hoveredTxId, setHoveredTxId] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBank, selectedEntity, flowType, receiptFilter, datePreset, customStartDate, customEndDate, sortBy]);

  // Filtered and Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Text Search across description, counterparty, notes, ID, amount
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((tx) => {
        const desc = (tx.clean_description || '').toLowerCase();
        const raw = (tx.raw_description || '').toLowerCase();
        const cpty = (tx.counterparty || '').toLowerCase();
        const notes = (tx.notes || '').toLowerCase();
        const cat = (tx.category_code || '').toLowerCase();
        const id = (tx.id || '').toLowerCase();
        const amt = tx.amount.toString();
        return (
          desc.includes(q) ||
          raw.includes(q) ||
          cpty.includes(q) ||
          notes.includes(q) ||
          cat.includes(q) ||
          id.includes(q) ||
          amt.includes(q)
        );
      });
    }

    // 2. Filter by Bank / Account
    if (selectedBank !== 'all') {
      result = result.filter((tx) => {
        const acct = (tx.account_name || '').toLowerCase();
        if (selectedBank === 'inter') return acct.includes('inter') || tx.entity_code === 'FIX_SERVICOS';
        if (selectedBank === 'caixa') return acct.includes('caixa') || tx.entity_code === 'FACILITA_VISTORIAS';
        if (selectedBank === 'nubank') return acct.includes('nubank') || tx.entity_code === 'HOUSEHOLD_OSMAR';
        return acct.includes(selectedBank.toLowerCase());
      });
    }

    // 3. Filter by Entity
    if (selectedEntity !== 'all') {
      result = result.filter((tx) => tx.entity_code === selectedEntity);
    }

    // 4. Filter by Flow Type
    if (flowType === 'inflow') {
      result = result.filter((tx) => tx.amount > 0 && !tx.is_transfer);
    } else if (flowType === 'outflow') {
      result = result.filter((tx) => tx.amount < 0 && !tx.is_transfer);
    } else if (flowType === 'transfer') {
      result = result.filter((tx) => tx.is_transfer);
    }

    // 5. Filter by Receipt
    if (receiptFilter === 'with_receipt') {
      result = result.filter((tx) => tx.has_receipt || tx.id.startsWith('TX-CARD-') || tx.id.startsWith('TX-RCP-'));
    } else if (receiptFilter === 'without_receipt') {
      result = result.filter((tx) => !tx.has_receipt && !tx.id.startsWith('TX-CARD-') && !tx.id.startsWith('TX-RCP-'));
    }

    // 6. Filter by Date Presets or Custom Range
    if (datePreset === '2026') {
      result = result.filter((tx) => tx.date.startsWith('2026'));
    } else if (datePreset === '2025') {
      result = result.filter((tx) => tx.date.startsWith('2025'));
    } else if (datePreset === 'current_month') {
      result = result.filter((tx) => tx.date.startsWith('2026-09') || tx.date.startsWith('2026-11'));
    } else if (datePreset === 'custom') {
      if (customStartDate) {
        result = result.filter((tx) => tx.date >= customStartDate);
      }
      if (customEndDate) {
        result = result.filter((tx) => tx.date <= customEndDate);
      }
    }

    // 7. Sorting
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || '');
      }
      if (sortBy === 'date_asc') {
        return (a.date || '').localeCompare(b.date || '') || (a.id || '').localeCompare(b.id || '');
      }
      if (sortBy === 'amount_desc') {
        return Math.abs(b.amount) - Math.abs(a.amount);
      }
      if (sortBy === 'amount_asc') {
        return Math.abs(a.amount) - Math.abs(b.amount);
      }
      if (sortBy === 'alpha') {
        return (a.clean_description || '').localeCompare(b.clean_description || '');
      }
      return 0;
    });

    return result;
  }, [
    transactions,
    searchTerm,
    selectedBank,
    selectedEntity,
    flowType,
    receiptFilter,
    datePreset,
    customStartDate,
    customEndDate,
    sortBy,
  ]);

  // Aggregate Metrics over filtered transactions
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let receiptsCount = 0;

    for (const tx of filteredTransactions) {
      if (tx.is_transfer) continue;
      if (tx.amount > 0) {
        totalIn += tx.amount;
      } else {
        totalOut += Math.abs(tx.amount);
      }
      if (tx.has_receipt || tx.id.startsWith('TX-CARD-') || tx.id.startsWith('TX-RCP-')) {
        receiptsCount++;
      }
    }

    return {
      totalIn,
      totalOut,
      netBalance: totalIn - totalOut,
      count: filteredTransactions.length,
      receiptsCount,
    };
  }, [filteredTransactions]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const pagedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Data',
      'Conta Bancária',
      'Entidade',
      'Descrição',
      'Contraparte',
      'Categoria',
      'Valor (R$)',
      'Transferência Neutralizada',
      'Possui Cupom',
      'Status',
      'Notas',
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${tx.date}"`,
      `"${tx.account_name}"`,
      `"${tx.entity_code}"`,
      `"${(tx.clean_description || '').replace(/"/g, '""')}"`,
      `"${(tx.counterparty || '').replace(/"/g, '""')}"`,
      `"${(tx.category_code || '').replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.is_transfer ? 'SIM' : 'NAO',
      tx.has_receipt ? 'SIM' : 'NAO',
      `"${tx.reconciliation_status || 'CONFIRMED'}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `extrato-openfamilyoffice-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/75 backdrop-blur-md animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-7xl h-[94vh] max-h-[920px] flex flex-col bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#1a202c]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Extrato Consolidado & Livro-Razão</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  {filteredTransactions.length} {filteredTransactions.length === 1 ? 'lançamento' : 'lançamentos'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Pesquisa avançada, conciliação fiscal e auditoria de cupons digitalizados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Recarregar lançamentos"
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-semibold transition"
              title="Exportar planilha CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28]">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
              Entradas Filtradas
            </span>
            <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              +{formatBRL(metrics.totalIn)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
              Saídas Filtradas
            </span>
            <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
              -{formatBRL(metrics.totalOut)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
              Resultado Líquido
            </span>
            <span
              className={`font-mono text-base font-extrabold ${
                metrics.netBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {metrics.netBalance >= 0 ? '+' : ''}
              {formatBRL(metrics.netBalance)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">
                Cupons Anexados
              </span>
              <span className="font-mono text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                {metrics.receiptsCount}
              </span>
            </div>
            <Camera className="w-5 h-5 text-indigo-500 opacity-70" />
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#131926]/50 space-y-3">
          {/* Main Search Bar & Presets */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar descrição, contraparte, categoria, notas ou valor..."
                className="w-full pl-10 pr-9 py-2 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Bank Tabs */}
            <div className="flex items-center gap-1 bg-white dark:bg-[#161c28] p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setSelectedBank('all')}
                className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                  selectedBank === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas as Contas
              </button>
              <button
                type="button"
                onClick={() => setSelectedBank('inter')}
                className={`px-3 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                  selectedBank === 'inter'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Inter PJ
              </button>
              <button
                type="button"
                onClick={() => setSelectedBank('caixa')}
                className={`px-3 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                  selectedBank === 'caixa'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Caixa PJ
              </button>
              <button
                type="button"
                onClick={() => setSelectedBank('nubank')}
                className={`px-3 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                  selectedBank === 'nubank'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Nubank PF
              </button>
            </div>
          </div>

          {/* Secondary Filter Chips Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Flow Type Selector */}
            <select
              value={flowType}
              onChange={(e) => setFlowType(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todos os Fluxos</option>
              <option value="inflow">Apenas Receitas (+)</option>
              <option value="outflow">Apenas Despesas (-)</option>
              <option value="transfer">Transferências PJ ↔ PF</option>
            </select>

            {/* Receipt Filter Selector */}
            <select
              value={receiptFilter}
              onChange={(e) => setReceiptFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Comprovantes: Todos</option>
              <option value="with_receipt">📷 Apenas com Cupom Fiscal</option>
              <option value="without_receipt">Sem Comprovante</option>
            </select>

            {/* Date Preset Selector */}
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Período: Histórico Completo</option>
              <option value="current_month">Mês Atual (Setembro / 2026)</option>
              <option value="2026">Exercício 2026</option>
              <option value="2025">Exercício 2025</option>
              <option value="custom">Data Personalizada...</option>
            </select>

            {/* Custom Date Pickers when 'custom' selected */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-xs font-mono"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-xs font-mono"
                />
              </div>
            )}

            {/* Sort Selector */}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] hidden sm:inline">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="date_desc">Data (Mais recentes)</option>
                <option value="date_asc">Data (Mais antigos)</option>
                <option value="amount_desc">Valor (Maior)</option>
                <option value="amount_asc">Valor (Menor)</option>
                <option value="alpha">Descrição (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transaction Table Body */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-[#141b27] border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] z-10">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-2">Conta / Entidade</th>
                <th className="py-3 px-3">Descrição & Contraparte</th>
                <th className="py-3 px-3 text-right">Valor</th>
                <th className="py-3 px-3 text-center">Comprovante Fiscal</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
              {pagedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                pagedTransactions.map((tx) => {
                  const hasReceipt =
                    tx.has_receipt || tx.id.startsWith('TX-CARD-') || tx.id.startsWith('TX-RCP-');
                  const rcpId = tx.receipt_id || (hasReceipt ? `rcp-${tx.id}` : null);
                  const isHovered = hoveredTxId === tx.id;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition group relative"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Account / Entity Badge */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-md font-semibold text-[11px] border ${
                            tx.entity_code === 'FIX_SERVICOS' || tx.account_name?.toLowerCase().includes('inter')
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                              : tx.entity_code === 'FACILITA_VISTORIAS' ||
                                tx.account_name?.toLowerCase().includes('caixa')
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                          }`}
                        >
                          {tx.entity_code === 'FIX_SERVICOS' || tx.account_name?.toLowerCase().includes('inter')
                            ? 'Inter PJ'
                            : tx.entity_code === 'FACILITA_VISTORIAS' ||
                              tx.account_name?.toLowerCase().includes('caixa')
                            ? 'Caixa PJ'
                            : 'Nubank PF'}
                        </span>
                      </td>

                      {/* Description & Counterparty */}
                      <td className="py-3 px-3">
                        <div className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5">
                          <span>{tx.clean_description}</span>
                          {tx.category_code && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              • {tx.category_code}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                          {tx.counterparty || tx.raw_description}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            tx.amount >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-slate-200'
                          }
                        >
                          {tx.amount >= 0 ? '+' : ''}
                          {formatBRL(tx.amount)}
                        </span>
                      </td>

                      {/* Fiscal Document / Receipt Column with Hover Preview */}
                      <td className="py-3 px-3 text-center whitespace-nowrap relative">
                        {hasReceipt ? (
                          <div
                            className="inline-block relative"
                            onMouseEnter={() => setHoveredTxId(tx.id)}
                            onMouseLeave={() => setHoveredTxId(null)}
                          >
                            <button
                              type="button"
                              onClick={() => onOpenReceipt(rcpId!, tx.id, tx)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-500/30 transition text-xs font-bold shadow-xs active:scale-95"
                              title="Clique para abrir e ampliar cupom fiscal"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Ver Cupom</span>
                            </button>

                            {/* Floating Hover Tooltip / Mini Preview */}
                            {isHovered && (
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-2.5 bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl z-30 pointer-events-none text-left animate-card-reveal">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                                  <Camera className="w-3 h-3" />
                                  <span>Comprovante Anexado</span>
                                </div>
                                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {tx.receipt_merchant || tx.counterparty || 'Supermercado Giassi'}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                  {formatBRL(Math.abs(tx.amount))} • {tx.date}
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 italic">
                                  Clique para abrir e ampliar o cupom
                                </div>
                              </div>
                            )}
                          </div>
                        ) : tx.is_transfer ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                            PJ ↔ PF Neutralizada
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                            {tx.notes ? tx.notes.split(' ')[0] : 'Extrato'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> OK
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar with Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#1a202c]/60 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>
              Exibindo {(currentPage - 1) * pageSize + 1} a{' '}
              {Math.min(currentPage * pageSize, filteredTransactions.length)} de {filteredTransactions.length}{' '}
              lançamentos
            </span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span>Linhas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] font-bold"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-200/60 dark:hover:bg-white/10 disabled:opacity-30 transition"
              title="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-200/60 dark:hover:bg-white/10 disabled:opacity-30 transition"
              title="Próxima Página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

