'use client';

import React from 'react';
import { Plus, ChevronRight, CheckCircle2 } from 'lucide-react';

interface QuickPixCardProps {
  setIsAssistantOpen: (open: boolean) => void;
  selectedContact: string;
  setSelectedContact: (contact: string) => void;
  transferAmount: string;
  setTransferAmount: (amount: string) => void;
  handleQuickTransfer: () => void;
  transferFeedback: string | null;
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
  return (
    <div id="quick-transfer-card" className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Transferência Rápida</h2>
          <button onClick={() => setIsAssistantOpen(true)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Ver Todos
          </button>
        </div>

        {/* Contacts Avatar Row with Active Halo & Next Arrow (Orbix Style) */}
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

          {/* Next Arrow Circle (Orbix Style) */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            aria-label="Ver mais contatos"
            className="min-w-[44px] min-h-[44px] rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-[#121722] shrink-0 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transfer Input and Clean Send Pill Button */}
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
            onClick={handleQuickTransfer}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span>Enviar PIX</span>
          </button>
        </div>

        {transferFeedback && (
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{transferFeedback}</span>
          </div>
        )}
      </div>
    </div>
  );
}

