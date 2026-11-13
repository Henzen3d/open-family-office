'use client';

import React, { useState } from 'react';
import { Plus, ChevronRight, CheckCircle2, ShieldAlert, ArrowRight, X, Lock, Check } from 'lucide-react';

interface QuickPixCardProps {
  setIsAssistantOpen: (open: boolean) => void;
  selectedContact: string;
  setSelectedContact: (contact: string) => void;
  transferAmount: string;
  setTransferAmount: (amount: string) => void;
  handleQuickTransfer: () => void;
  transferFeedback: string | null;
  activeTab?: 'all' | 'fix' | 'facilita' | 'pf';
}

export default function QuickPixCard({
  setIsAssistantOpen,
  selectedContact,
  setSelectedContact,
  transferAmount,
  setTransferAmount,
  handleQuickTransfer,
  transferFeedback,
}: QuickPixCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenConfirm = () => {
    const rawVal = parseFloat(transferAmount.replace(/\./g, '').replace(',', '.')) || 0;
    if (rawVal <= 0) return;
    setIsModalOpen(true);
  };

  const handleExecuteConfirmed = () => {
    setIsModalOpen(false);
    handleQuickTransfer();
  };

  const isVera = selectedContact === 'Vera';
  const originAccount = isVera ? 'Banco Inter PJ (Fix Serviços)' : 'Banco Inter PJ (Fix) ou Nubank PF';
  const destAccount = isVera ? 'Nubank PF (Conta Familiar - Vera)' : `${selectedContact} (Chave PIX Cadastrada)`;
  const operationType = isVera
    ? 'Distribuição de Lucros Isenta MEI (LC 123/2006)'
    : 'Pagamento Operacional / Honorários';

  return (
    <div id="quick-transfer-card" className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Transferência Rápida (PIX)</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
              Provisão
            </span>
          </div>
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Ver Todos
          </button>
        </div>

        {/* Contacts Avatar Row */}
        <div className="flex items-center gap-2.5 overflow-x-auto py-2">
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="w-11 h-11 rounded-full border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/50 bg-slate-50 dark:bg-[#121722] shrink-0 transition"
            title="Novo Contato"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Vera */}
          <div
            className="flex flex-col items-center shrink-0 cursor-pointer"
            onClick={() => {
              setSelectedContact('Vera');
              setTransferAmount('3.500,00');
            }}
          >
            <div className={`w-11 h-11 rounded-full p-0.5 ${selectedContact === 'Vera' ? 'border-2 border-indigo-600 dark:border-indigo-400' : 'border border-slate-200 dark:border-white/10'}`}>
              <div className={`w-full h-full rounded-full bg-slate-100 dark:bg-[#161c28] flex items-center justify-center font-bold text-xs ${selectedContact === 'Vera' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Vera
              </div>
            </div>
            <span className={`text-xs mt-1 ${selectedContact === 'Vera' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Vera</span>
          </div>

          {/* Contador */}
          <div
            className="flex flex-col items-center shrink-0 cursor-pointer"
            onClick={() => {
              setSelectedContact('Contador');
              setTransferAmount('450,00');
            }}
          >
            <div className={`w-11 h-11 rounded-full p-0.5 ${selectedContact === 'Contador' ? 'border-2 border-indigo-600 dark:border-indigo-400' : 'border border-slate-200 dark:border-white/10'}`}>
              <div className={`w-full h-full rounded-full bg-slate-100 dark:bg-[#161c28] flex items-center justify-center font-semibold text-xs ${selectedContact === 'Contador' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Cont.
              </div>
            </div>
            <span className={`text-xs mt-1 ${selectedContact === 'Contador' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Contador</span>
          </div>

          {/* Fornecedor */}
          <div
            className="flex flex-col items-center shrink-0 cursor-pointer"
            onClick={() => {
              setSelectedContact('Fornecedor');
              setTransferAmount('1.200,00');
            }}
          >
            <div className={`w-11 h-11 rounded-full p-0.5 ${selectedContact === 'Fornecedor' ? 'border-2 border-indigo-600 dark:border-indigo-400' : 'border border-slate-200 dark:border-white/10'}`}>
              <div className={`w-full h-full rounded-full bg-slate-100 dark:bg-[#161c28] flex items-center justify-center font-semibold text-xs ${selectedContact === 'Fornecedor' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Forn.
              </div>
            </div>
            <span className={`text-xs mt-1 ${selectedContact === 'Fornecedor' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Fornecedor</span>
          </div>

          {/* Advogado */}
          <div
            className="flex flex-col items-center shrink-0 cursor-pointer"
            onClick={() => {
              setSelectedContact('Advogado');
              setTransferAmount('800,00');
            }}
          >
            <div className={`w-11 h-11 rounded-full p-0.5 ${selectedContact === 'Advogado' ? 'border-2 border-indigo-600 dark:border-indigo-400' : 'border border-slate-200 dark:border-white/10'}`}>
              <div className={`w-full h-full rounded-full bg-slate-100 dark:bg-[#161c28] flex items-center justify-center font-semibold text-xs ${selectedContact === 'Advogado' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Adv.
              </div>
            </div>
            <span className={`text-xs mt-1 ${selectedContact === 'Advogado' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Advogado</span>
          </div>

          <button
            onClick={() => setIsAssistantOpen(true)}
            aria-label="Ver mais contatos"
            className="min-w-[44px] min-h-[44px] rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-[#121722] shrink-0 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transfer Input and Action */}
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-200/80 dark:border-white/10 mt-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-400">
              R$
            </span>
            <input
              type="text"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              aria-label="Valor da transferência em reais"
              className="w-full min-h-[44px] pl-8 pr-3 py-2 bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <button
            onClick={handleOpenConfirm}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Pré-autorizar PIX</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transferFeedback && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{transferFeedback}</span>
            </div>
            <button
              onClick={() => document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[11px] underline font-bold text-emerald-800 dark:text-emerald-200 hover:opacity-80"
            >
              Ver no Razão →
            </button>
          </div>
        )}
      </div>

      {/* Honest Operational Pre-Authorization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/15 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pré-autorização & Provisão PIX
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ambiente Protegido • Sem Débito Direto Bancário
                </span>
              </div>
            </div>

            {/* Honest Security Notice */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-xs text-amber-900 dark:text-amber-300 mb-4 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="leading-relaxed">
                <strong className="block font-semibold">Segurança Patrimonial:</strong>
                O OpenFamilyOffice opera localmente e não possui acesso às suas senhas bancárias. A transferência definitiva deve ser executada no aplicativo do seu banco (Banco Inter / Nubank). Esta confirmação registra um <strong>lançamento provisionado</strong> no Livro Razão para manter seu fluxo de caixa e conciliação atualizados.
              </div>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 rounded-2xl p-3.5 space-y-2 mb-5 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Origem:</span>
                <span className="text-slate-900 dark:text-white font-semibold">{originAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Destinatário:</span>
                <span className="text-slate-900 dark:text-white font-semibold">{destAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Finalidade Contábil:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{operationType}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/60 dark:border-white/5">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Valor a Provisionar:</span>
                <span className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                  R$ {transferAmount}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteConfirmed}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-pill flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Registrar Provisão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
