'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Upload,
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Calendar,
  FileText,
  DollarSign,
  Receipt,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { BankAccountItem } from '../components/SettingsModal';

const ReceiptViewerModal = dynamic(() => import('../components/ReceiptViewerModal'), { ssr: false });
const StatementModal = dynamic(() => import('../components/StatementModal'), { ssr: false });

export interface LedgerTransaction {
  id: string;
  date: string;
  entity_code: string;
  account?: string;
  account_name?: string;
  description: string;
  counterparty?: string;
  category?: string;
  amount: number;
  formatted_amount?: string;
  is_transfer?: boolean;
  notes?: string;
  has_receipt?: boolean;
  receipt_id?: string;
  receipt_amount?: number;
  receipt_merchant?: string;
  receipt_date?: string;
  receipt_image_url?: string;
}

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | 'inter' | 'caixa' | 'nubank'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inflows' | 'outflows' | 'transfers' | 'receipts'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '2026' | '2025' | 'recent_90'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modals
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null);
  const [viewingTxId, setViewingTxId] = useState<string | null>(null);
  const [viewingInitialData, setViewingInitialData] = useState<any>(null);
  const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/py/statements/transactions?limit=2000');
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.error('Failed to load full ledger transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleOpenReceipt = (receiptId: string, txId?: string, initialData?: any) => {
    setViewingReceiptId(receiptId);
    setViewingTxId(txId || null);
    setViewingInitialData(initialData || null);
    setIsReceiptViewerOpen(true);
  };

  // Filter pipeline
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Account filter
      if (accountFilter === 'inter' && tx.entity_code !== 'FIX_SERVICOS' && !tx.account?.toLowerCase().includes('inter')) return false;
      if (accountFilter === 'caixa' && tx.entity_code !== 'FACILITA_VISTORIAS' && !tx.account?.toLowerCase().includes('caixa')) return false;
      if (accountFilter === 'nubank' && tx.entity_code !== 'HOUSEHOLD_OSMAR' && !tx.account?.toLowerCase().includes('nubank')) return false;

      // Type filter
      if (typeFilter === 'inflows' && tx.amount <= 0) return false;
      if (typeFilter === 'outflows' && tx.amount >= 0) return false;
      if (typeFilter === 'transfers' && !tx.is_transfer) return false;
      if (typeFilter === 'receipts' && !tx.has_receipt) return false;

      // Date Range filter
      if (dateRangeFilter === '2026' && !tx.date.startsWith('2026')) return false;
      if (dateRangeFilter === '2025' && !tx.date.startsWith('2025')) return false;

      // Text search
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchCp = tx.counterparty?.toLowerCase().includes(q);
        const matchCat = tx.category?.toLowerCase().includes(q);
        const matchDate = tx.date?.includes(q);
        const matchNotes = tx.notes?.toLowerCase().includes(q);
        const matchMerchant = tx.receipt_merchant?.toLowerCase().includes(q);
        if (!matchDesc && !matchCp && !matchCat && !matchDate && !matchNotes && !matchMerchant) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, accountFilter, typeFilter, dateRangeFilter, debouncedSearch]);

  // Aggregate Metrics for filtered set
  const metrics = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let receiptsCount = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.amount > 0) inflow += tx.amount;
      else outflow += Math.abs(tx.amount);
      if (tx.has_receipt) receiptsCount++;
    });

    return {
      count: filteredTransactions.length,
      totalInflow: inflow,
      totalOutflow: outflow,
      net: inflow - outflow,
      receiptsCoverage: filteredTransactions.length > 0 ? (receiptsCount / filteredTransactions.length) * 100 : 0,
    };
  }, [filteredTransactions]);

  // Paginated slice
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['id', 'date', 'entity_code', 'account', 'description', 'counterparty', 'category', 'amount', 'is_transfer', 'has_receipt', 'notes'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.date,
      tx.entity_code,
      tx.account || tx.account_name || '',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${(tx.counterparty || '').replace(/"/g, '""')}"`,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      tx.amount,
      tx.is_transfer ? '1' : '0',
      tx.has_receipt ? '1' : '0',
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `openfamilyoffice_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0c1017] text-slate-800 dark:text-slate-100 transition-colors font-sans antialiased overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-20 pr-4 sm:pr-8 pl-4 sm:pl-6 py-6 pb-20 max-w-full">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1f2738] shadow-sm transition active:scale-95"
              title="Voltar ao Painel Principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Livro Razão & Conciliação
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-bold">
                  {transactions.length} Lançamentos Totais
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Investigação forense de partidas dobradas, conciliação de cupons e fluxo consolidado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsStatementOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-pill transition active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Extrato (OFX/CSV)</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-[#1f2738] transition active:scale-95"
              title="Exportar lançamentos filtrados como CSV"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#161c28] p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Entradas Filtradas
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              R$ {metrics.totalInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white dark:bg-[#161c28] p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Saídas Filtradas
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
              R$ {metrics.totalOutflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white dark:bg-[#161c28] p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Saldo Líquido no Período
            </span>
            <div className={`text-xl sm:text-2xl font-extrabold font-mono ${metrics.net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
              R$ {metrics.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white dark:bg-[#161c28] p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Lançamentos Ativos
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
              {metrics.count} <span className="text-xs text-slate-400 font-sans font-normal">de {transactions.length}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Panel */}
        <div className="bg-white dark:bg-[#161c28] p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="w-full lg:w-96 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por descrição, contraparte, categoria ou valor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10 rounded-2xl text-xs placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Account Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => { setAccountFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                accountFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas as Contas
            </button>
            <button
              onClick={() => { setAccountFilter('inter'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                accountFilter === 'inter'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Inter PJ (Fix)
            </button>
            <button
              onClick={() => { setAccountFilter('caixa'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                accountFilter === 'caixa'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Caixa PJ (Vistorias)
            </button>
            <button
              onClick={() => { setAccountFilter('nubank'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                accountFilter === 'nubank'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Nubank PF
            </button>
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                typeFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos Tipos
            </button>
            <button
              onClick={() => { setTypeFilter('inflows'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                typeFilter === 'inflows'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => { setTypeFilter('outflows'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                typeFilter === 'outflows'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Saídas
            </button>
            <button
              onClick={() => { setTypeFilter('receipts'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-1 ${
                typeFilter === 'receipts'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Com Cupom</span>
            </button>
          </div>
        </div>

        {/* Transactions Table Card */}
        <div className="bg-white dark:bg-[#161c28] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#121722]/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                  <th className="py-3.5 pl-6">Data</th>
                  <th className="py-3.5">Entidade / Conta</th>
                  <th className="py-3.5">Descrição & Contraparte</th>
                  <th className="py-3.5">Categoria</th>
                  <th className="py-3.5 text-right">Valor</th>
                  <th className="py-3.5 text-center pr-6">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Carregando lançamentos do Livro Razão...
                    </td>
                  </tr>
                ) : paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3.5 pl-6 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3.5">
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
                      <td className="py-3.5">
                        <div className="text-slate-900 dark:text-white font-semibold">
                          {tx.description}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {tx.counterparty || 'Sem contraparte identificada'}
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-600 dark:text-slate-300">
                        {tx.category || (tx.is_transfer ? 'Transferência Interna' : 'Geral')}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span className={tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}>
                          {tx.amount >= 0 ? '+' : ''}
                          R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 text-center pr-6 whitespace-nowrap">
                        {tx.has_receipt ? (
                          <button
                            onClick={() => handleOpenReceipt(tx.receipt_id || tx.id, tx.id, tx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition shadow-xs active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Ver Cupom</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Nenhum lançamento encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Exibindo página <strong className="text-slate-900 dark:text-white">{currentPage}</strong> de{' '}
              <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({filteredTransactions.length} lançamentos filtrados)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-[#121722] hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-slate-100 dark:bg-[#121722] hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Modals */}
      <ReceiptViewerModal
        isOpen={isReceiptViewerOpen}
        onClose={() => {
          setIsReceiptViewerOpen(false);
          setViewingReceiptId(null);
          setViewingTxId(null);
          setViewingInitialData(null);
        }}
        receiptId={viewingReceiptId || ''}
        transactionId={viewingTxId || undefined}
        initialData={viewingInitialData}
      />
      <StatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        onSuccess={() => loadTransactions()}
      />
    </div>
  );
}

