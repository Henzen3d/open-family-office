'use client';

import React, { useState } from 'react';
import { Fingerprint, ShieldCheck, X, Check, Lock, ExternalLink } from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [veraConsentChecked, setVeraConsentChecked] = useState(false);

  const handleOpenModal = () => {
    if (conjugalApproved) return;
    setIsModalOpen(true);
  };

  const handleConfirmApproval = () => {
    if (!veraConsentChecked) return;
    setIsModalOpen(false);
    handleApproveConjugal();
  };

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
          Distribuições acima de R$ 3.000 exigem validação mútua para assegurar a separação entre contas PJ e finanças familiares (Art. 18-A LC 123/2006).
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
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Vera (Validado)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Aguardando Vera</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleOpenModal}
          disabled={conjugalApproved}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            conjugalApproved
              ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default'
              : 'bg-indigo-600 text-white shadow-pill hover:bg-indigo-500 cursor-pointer active:scale-95'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{conjugalApproved ? '✓ Acordo Conjugal Homologado' : 'Homologar Acordo Conjugal'}</span>
        </button>
        <button
          onClick={() => handleSendMessage('Detalhes e base legal da transferência Fix MEI para Conta Familiar')}
          className="py-2.5 px-3 bg-slate-100 dark:bg-[#1a2232] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#212a3d] transition"
        >
          Detalhes
        </button>
      </div>

      {/* Dual-Signature Operational Modal */}
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
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Homologação de Acordo Conjugal
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Dupla Assinatura • Segregação Patrimonial LC 123/2006
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 mb-4 leading-relaxed">
              <strong className="block font-semibold mb-1">Fundamento Jurídico & Blindagem:</strong>
              Conforme o Art. 18-A da LC 123/2006 e o Art. 50 do Código Civil, transferências de lucros entre a pessoa jurídica do MEI e a conta familiar conjunta exigem manifestação inequívoca de ambos os cônjuges para comprovar a inexistência de confusão patrimonial.
            </div>

            {/* Signatures Status */}
            <div className="space-y-3 mb-5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">1. Osmar (Titular Fix Serviços MEI)</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Assinatura digital de autorização de repasse</span>
                </div>
                <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold text-[11px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Assinado
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 dark:text-white">2. Vera (Cônjuge Beneficiária • PF)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 font-bold text-[11px]">
                    Pendente
                  </span>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={veraConsentChecked}
                    onChange={(e) => setVeraConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/30 border-slate-300"
                  />
                  <span className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                    Eu, Vera, atesto a regularidade da distribuição de lucros no valor de <strong>R$ 3.500,00</strong> da Fix Serviços MEI para a conta familiar, sem desvio de finalidade.
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={!veraConsentChecked}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold shadow-pill flex items-center justify-center gap-1.5 transition ${
                  veraConsentChecked
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 dark:bg-[#212a3d] text-slate-400 cursor-not-allowed'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Homologar Dupla Assinatura</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
