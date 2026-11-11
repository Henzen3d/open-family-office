'use client';

import React from 'react';
import {
  Sparkles,
  X,
  Camera,
  FileText,
  CheckCircle2,
  Pencil,
  Copy,
  Check,
  Wallet,
  ShieldCheck,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  Paperclip,
  ArrowUp,
} from 'lucide-react';
import { ChatMessage, ConfirmationCardData } from '@/lib/state/useChatStore';
import ArtifactRenderer from '../interactive/ArtifactRenderer';

interface AssistantDrawerProps {
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  chatAsdMode: 'none' | 'asd_80' | 'asd_strict';
  handleAsdModeChange: (mode: 'none' | 'asd_80' | 'asd_strict') => Promise<void>;
  messages: ChatMessage[];
  loadingChat: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  copiedId: string | null;
  handleCopyText: (id: string, text: string) => void;
  correctionDraft: { msgId: string; ref: string; value: string } | null;
  setCorrectionDraft: React.Dispatch<React.SetStateAction<{ msgId: string; ref: string; value: string } | null>>;
  handleCorrectReceipt: (ref: string, value: string, msgId: string) => Promise<void>;
  handleConfirmCard: (card: ConfirmationCardData, msgId: string) => Promise<void>;
  handleDiscardCard: (msgId: string) => void;
  handleSendMessage: (customText?: string) => Promise<void>;
  selectedEntityChat: string;
  setSelectedEntityChat: (entity: string) => void;
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  chatInput: string;
  setChatInput: (input: string) => void;
}

export default function AssistantDrawer({
  isAssistantOpen,
  setIsAssistantOpen,
  chatAsdMode,
  handleAsdModeChange,
  messages,
  loadingChat,
  chatEndRef,
  copiedId,
  handleCopyText,
  correctionDraft,
  setCorrectionDraft,
  handleCorrectReceipt,
  handleConfirmCard,
  handleDiscardCard,
  handleSendMessage,
  selectedEntityChat,
  setSelectedEntityChat,
  attachedFile,
  setAttachedFile,
  cameraInputRef,
  fileInputRef,
  chatInput,
  setChatInput,
}: AssistantDrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        isAssistantOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
      aria-hidden={!isAssistantOpen}
    >
      {/* Backdrop (Transitions opacity only; zero blur-lag) */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isAssistantOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setIsAssistantOpen(false)}
      />

      {/* Chat Panel: Fullscreen on mobile, slide-over drawer on desktop */}
      <div
        className={`fixed inset-0 sm:inset-y-0 sm:left-auto sm:right-0 w-full sm:w-[560px] md:w-[620px] max-w-full h-[100dvh] sm:h-full bg-white dark:bg-[#111724] border-l border-slate-200 dark:border-white/10 shadow-[-12px_0_40px_rgba(0,0,0,0.25)] flex flex-col text-slate-900 dark:text-white transition-transform duration-320 will-change-transform z-10 ${
          isAssistantOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (ChatGPT / Meta AI clean top app bar) */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-white/95 dark:bg-[#111724]/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* AI Avatar Orb */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Assistente OFO
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                CFO Pessoal • Família e 2 MEIs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick ASD Mode Pills */}
            <div className="hidden xs:flex sm:flex items-center gap-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 rounded-full text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => handleAsdModeChange('none')}
                className={`px-2.5 py-0.5 rounded-full transition text-[11px] font-medium ${
                  chatAsdMode === 'none'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Sem ASD: estilo livre convencional"
              >
                Sem ASD
              </button>
              <button
                type="button"
                onClick={() => handleAsdModeChange('asd_80')}
                className={`px-2.5 py-0.5 rounded-full transition text-[11px] font-medium ${
                  chatAsdMode === 'asd_80'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="80% ASD (Leve): frases curtas, voz ativa, tom natural e 1 analogia útil"
              >
                80% ASD
              </button>
              <button
                type="button"
                onClick={() => handleAsdModeChange('asd_strict')}
                className={`px-2.5 py-0.5 rounded-full transition text-[11px] font-medium ${
                  chatAsdMode === 'asd_strict'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="ASD Rígido: 100% ASD-STE100 integral, sem introdução/conclusão, glossário final"
              >
                ASD Rígido
              </button>
            </div>

            <button
              onClick={() => setIsAssistantOpen(false)}
              aria-label="Fechar assistente"
              className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Scroll View */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-6 overscroll-contain">
          {/* Conversation Messages */}
          {messages.map((msg) => {
            return (
              <div
                key={msg.id}
                className={`flex gap-3 animate-message-in ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Avatar */}
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[90%] sm:max-w-[85%]`}>
                  <div
                    className={`rounded-3xl px-5 py-3.5 leading-relaxed text-[16px] ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md shadow-sm'
                        : 'bg-slate-100 dark:bg-[#192132] border border-slate-200/70 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-tl-md shadow-xs'
                    }`}
                  >
                    {msg.attachmentName && (
                      <div className="mb-2.5 px-3 py-1.5 bg-black/15 rounded-xl text-xs flex items-center gap-2 font-mono text-white/90">
                        <Camera className="w-4 h-4" />
                        <span className="truncate">{msg.attachmentName}</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap leading-[1.6] text-[16px]">
                      {msg.text}
                    </p>

                    {/* Phase 8: Interactive Expense Confirmation Card */}
                    {msg.confirmationCard && (
                      <div className="mt-3.5 p-4 bg-white dark:bg-[#121724] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm text-slate-900 dark:text-white animate-card-reveal">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/10 mb-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            <span>{msg.confirmationCard.type === 'CORRECTION_CONFIRMATION' ? 'Correção do Cupom' : 'Cupom Identificado'}</span>
                          </div>
                          {msg.confirmationCard.status === 'CONFIRMED' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirmado</span>
                            </span>
                          ) : msg.confirmationCard.status === 'DISCARDED' ? (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 text-xs font-semibold">
                              Descartado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-500/30">
                              Aguardando confirmação
                            </span>
                          )}
                        </div>

                        {/* Hero Amount */}
                        <div className="mb-3">
                          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                            {msg.confirmationCard.type === 'CORRECTION_CONFIRMATION' && msg.confirmationCard.formatted_old_amount ? (
                              <span className="text-lg font-bold text-slate-400 dark:text-slate-500 line-through mr-2">
                                {msg.confirmationCard.formatted_old_amount}
                              </span>
                            ) : null}
                            {msg.confirmationCard.formatted_amount}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {msg.confirmationCard.date} • {msg.confirmationCard.counterparty}
                          </div>
                        </div>

                        {/* 2x2 Metadata Grid */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-[#182030] rounded-xl border border-slate-100 dark:border-white/5 mb-3.5">
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Categoria</span>
                            <strong className="text-xs text-slate-900 dark:text-slate-100 font-semibold">{msg.confirmationCard.category}</strong>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Entidade</span>
                            <strong className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{msg.confirmationCard.entity_name}</strong>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Forma de Pagamento</span>
                            <strong className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{msg.confirmationCard.account_name}</strong>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {msg.confirmationCard.status === 'AWAITING_CONFIRMATION' && (
                          <>
                            {(msg.confirmationCard.source_receipt || msg.confirmationCard.receipt_ref) && (
                              correctionDraft?.msgId === msg.id ? (
                                <div className="flex items-center gap-2 w-full mb-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    autoFocus
                                    value={correctionDraft.value}
                                    onChange={(e) =>
                                      setCorrectionDraft((d) => (d ? { ...d, value: e.target.value } : d))
                                    }
                                    className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                                    placeholder="Novo valor (R$)"
                                  />
                                  <button
                                    onClick={() => handleCorrectReceipt(correctionDraft.ref, correctionDraft.value, msg.id)}
                                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition active:scale-95"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    setCorrectionDraft({
                                      msgId: msg.id,
                                      ref: msg.confirmationCard!.source_receipt || msg.confirmationCard!.receipt_ref!,
                                      value: msg.confirmationCard!.amount > 0 ? String(msg.confirmationCard!.amount) : '',
                                    })
                                  }
                                  className="w-full py-2.5 min-h-[44px] bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold text-sm rounded-xl border border-amber-200 dark:border-amber-500/30 transition active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Corrigir valor</span>
                                </button>
                              )
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleConfirmCard(msg.confirmationCard!, msg.id)}
                                className="flex-1 py-3 px-4 min-h-[48px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirmar Lançamento</span>
                              </button>
                              <button
                                onClick={() => handleDiscardCard(msg.id)}
                                className="py-3 px-4 min-h-[48px] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition active:scale-95"
                              >
                                Descartar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Phase 1: Generative UI Interactive Artifact Card */}
                    {msg.artifact && (
                      <div className="mt-2 animate-card-reveal">
                        <ArtifactRenderer artifact={msg.artifact} />
                      </div>
                    )}
                  </div>

                  {/* Metadata & Copy Action Footer */}
                  <div className="flex items-center gap-2.5 mt-1.5 px-2 text-xs text-slate-400 dark:text-slate-500">
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'assistant' && (msg.model || msg.provider) && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {msg.model || msg.provider}
                        </span>
                        {msg.latencyMs !== undefined && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">{msg.latencyMs}ms</span>
                          </>
                        )}
                      </>
                    )}
                    {msg.sender === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        title="Copiar resposta"
                        className="hover:text-slate-700 dark:hover:text-white transition p-0.5 rounded ml-1"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking / Loading Animation (ChatGPT / Meta AI style) */}
          {loadingChat && (
            <div className="flex items-start gap-3 animate-message-in">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-100 dark:bg-[#192132] border border-slate-200/70 dark:border-white/10 rounded-3xl rounded-tl-md px-4 py-3 flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-1 text-xs font-medium">Consultando Livro Razão...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Context Chips (when conversation has ongoing messages) */}
        {messages.length > 1 && (
          <div className="px-4 py-2 border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#131926] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => handleSendMessage('Quanto temos disponível somando nossas três contas?')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-xs font-medium shrink-0 flex items-center gap-1.5 transition active:scale-95"
            >
              <Wallet className="w-3.5 h-3.5 text-indigo-500" />
              <span>Saldos</span>
            </button>
            <button
              onClick={() => handleSendMessage('Teto MEI')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-xs font-medium shrink-0 flex items-center gap-1.5 transition active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Teto MEI</span>
            </button>
            <button
              onClick={() => handleSendMessage('Quais contas vencem nos próximos sete dias?')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-xs font-medium shrink-0 flex items-center gap-1.5 transition active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Contas 7 Dias</span>
            </button>
            <button
              onClick={() => handleSendMessage('Runway Familiar')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-xs font-medium shrink-0 flex items-center gap-1.5 transition active:scale-95"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Runway</span>
            </button>
            <button
              onClick={() => handleSendMessage('Quanto já retiramos das empresas para a família este ano?')}
              className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-xs font-medium shrink-0 flex items-center gap-1.5 transition active:scale-95"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              <span>Retiradas</span>
            </button>
          </div>
        )}

        {/* Bottom Composer Capsule Area (ChatGPT / Meta AI style) */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111724] shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Destination Entity Quick Chips */}
          <div className="flex items-center gap-1.5 px-1 mb-2.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">
              Lançar em:
            </span>
            <button
              type="button"
              onClick={() => setSelectedEntityChat('inter_cnpj')}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition active:scale-95 flex items-center gap-1.5 ${
                selectedEntityChat === 'inter_cnpj'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedEntityChat === 'inter_cnpj' ? 'bg-white' : 'bg-amber-400'}`} />
              <span>Inter PJ (Osmar)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEntityChat('caixa_pj')}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition active:scale-95 flex items-center gap-1.5 ${
                selectedEntityChat === 'caixa_pj'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedEntityChat === 'caixa_pj' ? 'bg-white' : 'bg-purple-400'}`} />
              <span>Caixa PJ (Vera)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEntityChat('nubank_pf')}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition active:scale-95 flex items-center gap-1.5 ${
                selectedEntityChat === 'nubank_pf'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedEntityChat === 'nubank_pf' ? 'bg-white' : 'bg-blue-400'}`} />
              <span>Nubank PF (Família)</span>
            </button>
          </div>

          {/* Attached file chip */}
          {attachedFile && (
            <div className="mb-2 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between animate-card-reveal">
              <div className="flex items-center gap-2 truncate">
                <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate font-semibold">{attachedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ml-2 text-xs font-bold py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                Remover
              </button>
            </div>
          )}

          {/* Meta AI / ChatGPT Pill Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative bg-slate-100 dark:bg-[#192132] border border-slate-200 dark:border-white/10 rounded-[28px] p-1.5 flex items-center gap-1 shadow-sm focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-colors"
          >
            {/* Direct Camera Capture (opens camera lens on mobile) */}
            <input
              type="file"
              ref={cameraInputRef as any}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setAttachedFile(e.target.files[0]);
                }
              }}
            />

            {/* Gallery / File Picker */}
            <input
              type="file"
              ref={fileInputRef as any}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setAttachedFile(e.target.files[0]);
                }
              }}
            />

            {/* Instant Camera Snap Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              title="Tirar foto com a câmera"
              aria-label="Tirar foto com a câmera"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-white/10 transition active:scale-95 shrink-0"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Gallery / Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar da galeria ou arquivo"
              aria-label="Anexar da galeria ou arquivo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-white/10 transition active:scale-95 shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pergunte ou envie um cupom..."
              aria-label="Mensagem para o assistente"
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 px-2 py-2 text-[16px] text-slate-900 dark:text-white placeholder-slate-400 font-normal min-w-0"
            />

            <button
              type="submit"
              disabled={loadingChat || (!chatInput.trim() && !attachedFile)}
              title="Enviar mensagem"
              aria-label="Enviar mensagem"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition active:scale-95 shrink-0 ${
                chatInput.trim() || attachedFile
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                  : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

