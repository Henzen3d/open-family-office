'use client';

import React from 'react';
import { Fingerprint, ShieldCheck } from 'lucide-react';

interface ConjugalGovernanceCardProps {
  conjugalApproved: boolean;
  handleApproveConjugal: () => void;
  handleSendMessage: (msg: string) => void;
}

export default function ConjugalGovernanceCard({
  conjugalApproved,
  handleApproveConjugal,
  handleSendMessage,
}: ConjugalGovernanceCardProps) {
  return (
    <div id="governance-card" className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Governança Familiar</h2>
          </div>
          {conjugalApproved ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-500/30">
              ✓ 0 Pendências
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-500/30">
              1 Pendência
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-pretty">
          Distribuições acima de R$ 3.000 exigem validação mútua para assegurar a separação entre contas PJ e finanças familiares.
        </p>

        {/* Pending Item Box */}
        <div className="bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 mb-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                {conjugalApproved ? 'Distribuição Homologada' : 'Distribuição de Lucros Isenta'}
              </span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Fix Serviços MEI → Conta Familiar PF</span>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Banco Inter PJ → Nubank PF</div>
            </div>
            <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">R$ 3.500,00</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>Osmar (Validado)</span>
            </div>
            {conjugalApproved ? (
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Vera (Validado)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Aguardando Vera</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleApproveConjugal}
          disabled={conjugalApproved}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            conjugalApproved
              ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default'
              : 'bg-indigo-600 text-white shadow-pill hover:bg-indigo-500 cursor-pointer'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{conjugalApproved ? '✓ Acordo Conjugal Homologado' : 'Confirmar Acordo Conjugal'}</span>
        </button>
        <button
          onClick={() => handleSendMessage('Detalhes da transferência Fix para PF')}
          className="py-2.5 px-3 bg-slate-100 dark:bg-[#1a2232] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#212a3d] transition"
        >
          Detalhes
        </button>
      </div>
    </div>
  );
}

