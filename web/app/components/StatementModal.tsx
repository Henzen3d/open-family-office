'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface StatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PreviewTransaction {
  id: string;
  entity_code: string;
  account_name: string;
  date: string;
  amount: number;
  currency: string;
  clean_description: string;
  fitid: string;
  is_transfer: boolean;
  transfer_pair_id?: string;
  is_duplicate: boolean;
}

interface StatementPreview {
  bank_id: string;
  bank_name: string;
  account_id: string;
  currency: string;
  start_date: string;
  end_date: string;
  total_credits: number;
  total_debits: number;
  balance: number | null;
  total_count: number;
  duplicates_detected: number;
  new_count: number;
  transactions: PreviewTransaction[];
}

export default function StatementModal({ isOpen, onClose, onSuccess }: StatementModalProps) {
  const [selectedEntity, setSelectedEntity] = useState<string>('FIX_SERVICOS');
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [commitResult, setCommitResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMsg(null);
    setCommitResult(null);

    // Auto-parse preview
    const formData = new FormData();
    formData.append('file', selected);
    formData.append('entity_override', selectedEntity);

    setLoadingPreview(true);
    try {
      const res = await fetch('/api/py/statements/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error('Falha ao processar arquivo de extrato.');
      }
      const data: StatementPreview = await res.json();
      setPreview(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao ler arquivo.');
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setLoadingCommit(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_override', selectedEntity);

    try {
      const res = await fetch('/api/py/statements/upload-and-commit', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error('Falha ao gravar transações no livro-razão.');
      }
      const result = await res.json();
      setCommitResult(
        `Sucesso: ${result.new_added_count} lançamentos inseridos. ${result.duplicates_skipped} duplicatas bloqueadas (SHA-256). ${result.transfers_neutralized} transferências neutralizadas.`
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro na gravação.');
    } finally {
      setLoadingCommit(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setCommitResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Importação de Extratos Bancários</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formatos OFX (SGML/XML) e CSV • Desduplicação SHA-256 • Neutralização PJ ↔ PF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1f2738] text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Entity Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Conta de Destino / Entidade Titular
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedEntity('FIX_SERVICOS')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  selectedEntity === 'FIX_SERVICOS'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1f2738]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Fix Serviços MEI</span>
                  <Building2 className="w-4 h-4 text-indigo-500" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Osmar • Banco Inter (077)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEntity('FACILITA_VISTORIAS')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  selectedEntity === 'FACILITA_VISTORIAS'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1f2738]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Facilita Vistorias MEI</span>
                  <Building2 className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Vera • Caixa Econômica (104)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEntity('HOUSEHOLD_OSMAR')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  selectedEntity === 'HOUSEHOLD_OSMAR'
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1f2738]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Família PF</span>
                  <CreditCard className="w-4 h-4 text-purple-500" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Casal • Nubank UV (260)</span>
              </button>
            </div>
          </div>

          {/* 2. File Upload Box */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Arquivo de Extrato (.OFX ou .CSV)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-indigo-500 rounded-3xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-[#161c28]/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {file ? file.name : 'Clique para selecionar o extrato do seu banco'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Compatível com Banco Inter, Caixa Econômica e Nubank
              </p>
            </div>
          </div>

          {/* Error & Commit Result Feedback */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {commitResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{commitResult}</span>
            </div>
          )}

          {/* 3. Statement Preview Panel */}
          {loadingPreview && (
            <div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Analisando extrato e calculando hashes SHA-256...</span>
            </div>
          )}

          {preview && !commitResult && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-100 dark:bg-[#1f2738] rounded-2xl border border-slate-200 dark:border-white/5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Banco Identificado</span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block mt-0.5 truncate">
                    {preview.bank_name}
                  </span>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-[#1f2738] rounded-2xl border border-slate-200 dark:border-white/5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Lançamentos</span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block mt-0.5">
                    {preview.new_count} novos{' '}
                    {preview.duplicates_detected > 0 && (
                      <span className="text-amber-500 text-[10px]">({preview.duplicates_detected} dups)</span>
                    )}
                  </span>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-[#1f2738] rounded-2xl border border-slate-200 dark:border-white/5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Entradas (Créditos)</span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    +R$ {preview.total_credits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-[#1f2738] rounded-2xl border border-slate-200 dark:border-white/5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Saídas (Débitos)</span>
                  <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 block mt-0.5">
                    -R$ {preview.total_debits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions Preview Table */}
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-[#1f2738] text-slate-500 dark:text-slate-400 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {preview.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-[#1f2738]/50">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{tx.date}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold block truncate max-w-xs">{tx.clean_description}</span>
                          <span className="text-[10px] text-slate-400 font-mono">FITID: {tx.fitid}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span className={tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>
                            {tx.amount >= 0 ? '+' : ''}
                            R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {tx.is_duplicate ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20">
                              Já no Razão
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                              Novo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <button
            onClick={resetAll}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            Limpar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#1f2738] transition"
            >
              Cancelar
            </button>

            {preview && !commitResult && (
              <button
                onClick={handleCommit}
                disabled={loadingCommit || preview.new_count === 0}
                type="button"
                className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-pill disabled:opacity-50 transition"
              >
                {loadingCommit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gravando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar {preview.new_count} Lançamentos</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

