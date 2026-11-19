'use client';

import React, { useState } from 'react';
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
  Paperclip,
  ArrowUp,
  Square,
  HelpCircle,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  Building,
} from 'lucide-react';
import { ChatMessage, ConfirmationCardData } from '@/lib/state/useChatStore';
import ArtifactRenderer from '../interactive/ArtifactRenderer';
import MarkdownRenderer from './MarkdownRenderer';

interface AssistantDrawerProps {
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  apiOnline?: boolean | null;
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
  handleStopGeneration?: () => void;
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
  apiOnline = true,
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
  handleStopGeneration,
  selectedEntityChat,
  setSelectedEntityChat,
  attachedFile,
  setAttachedFile,
  cameraInputRef,
  fileInputRef,
  chatInput,
  setChatInput,
}: AssistantDrawerProps) {
  // Local state for editable draft proposals
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, Partial<ConfirmationCardData>>>({});

  const getEditedCard = (msgId: string, baseCard: ConfirmationCardData): ConfirmationCardData => {
    const edits = draftEdits[msgId] || {};
    return {
      ...baseCard,
      ...edits,
    };
  };

  const updateDraftField = (msgId: string, field: keyof ConfirmationCardData, value: any) => {
    setDraftEdits((prev) => ({
      ...prev,
      [msgId]: {
        ...prev[msgId],
        [field]: value,
      },
    }));
  };

  // Entity label helper
  const getEntityDisplayName = (code: string) => {
    if (code.includes('fix') || code === 'FIX_SERVICOS' || code === 'inter_cnpj') return 'Fix Serviços MEI (Osmar)';
    if (code.includes('facilita') || code === 'FACILITA_VISTORIAS' || code === 'caixa_pj') return 'Facilita Vistorias MEI (Vera)';
    if (code.includes('pf') || code === 'HOUSEHOLD_OSMAR' || code === 'nubank_pf') return 'Família PF (Nubank UV)';
    return 'Consolidado Familiar';
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        isAssistantOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
      aria-hidden={!isAssistantOpen}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isAssistantOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setIsAssistantOpen(false)}
      />

      {/* Slide-over Assistant Drawer / Mobile Fullscreen Panel */}
      <div
        className={`fixed inset-0 sm:inset-y-0 sm:left-auto sm:right-0 w-full sm:w-[580px] md:w-[640px] max-w-full h-[100dvh] sm:h-full bg-white dark:bg-[#111724] border-l border-slate-200 dark:border-white/10 shadow-[-12px_0_40px_rgba(0,0,0,0.3)] flex flex-col text-slate-900 dark:text-white transition-transform duration-300 ease-out will-change-transform z-10 ${
          isAssistantOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER: Explicit "Assistente OFO" + Real Connectivity + Tone Selector */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-white/95 dark:bg-[#111724]/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Assistente OFO
                </h3>
                {/* Real connectivity indicator */}
                {apiOnline === true ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                ) : apiOnline === false ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-[11px] font-semibold text-rose-700 dark:text-rose-300" title="API local desconectada. Respostas locais disponíveis.">
                    <WifiOff className="w-3 h-3 text-rose-500" />
                    Offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <Clock className="w-3 h-3 animate-spin text-slate-400" />
                    Conectando...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                CFO Digital • Família & 2 MEIs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tone Selector: Natural default, with 80% ASD and ASD Rígido */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 rounded-full text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => handleAsdModeChange('none')}
                className={`px-2.5 py-0.5 rounded-full transition text-[11px] font-medium ${
                  chatAsdMode === 'none'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tom Natural: linguagem fluida, explicativa e profissional"
              >
                Natural
              </button>
              <button
                type="button"
                onClick={() => handleAsdModeChange('asd_80')}
                className={`px-2.5 py-0.5 rounded-full transition text-[11px] font-medium ${
                  chatAsdMode === 'asd_80'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="80% ASD: frases curtas, voz ativa, direto ao ponto"
              >
                80% ASD
              </button>
              <button
                type="button"
                onClick={() => handleAsdModeChange('asd_strict')}
                className={`px-2.5 py-0.5 rounded-full transition text-[11px] font-medium ${
                  chatAsdMode === 'asd_strict'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="ASD Rígido: manual técnico ultra-conciso (STE-100)"
              >
                Rígido
              </button>
            </div>

            <button
              onClick={() => setIsAssistantOpen(false)}
              aria-label="Fechar assistente"
              className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. CONTEXT BANNER: Shows currently targeted entity */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-[#141b2b] border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Building className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-medium text-slate-500 dark:text-slate-400">Contexto da consulta:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {getEntityDisplayName(selectedEntityChat)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedEntityChat('inter_cnpj')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition ${
                selectedEntityChat === 'inter_cnpj'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Fix
            </button>
            <button
              onClick={() => setSelectedEntityChat('caixa_pj')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition ${
                selectedEntityChat === 'caixa_pj'
                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Facilita
            </button>
            <button
              onClick={() => setSelectedEntityChat('nubank_pf')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition ${
                selectedEntityChat === 'nubank_pf'
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Família
            </button>
          </div>
        </div>

        {/* 3. MESSAGES VIEWPORT */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-6 overscroll-contain">
          {messages.map((msg) => {
            const cardData = msg.confirmationCard
              ? getEditedCard(msg.id, msg.confirmationCard)
              : null;
            const isCardEditing = editingCardId === msg.id;

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

                <div
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  } max-w-[92%] sm:max-w-[85%]`}
                >
                  <div
                    className={`rounded-3xl px-5 py-3.5 leading-relaxed text-[15px] ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md shadow-sm'
                        : 'bg-slate-100 dark:bg-[#192132] border border-slate-200/70 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-tl-md shadow-xs'
                    }`}
                  >
                    {/* Attachment preview if user uploaded file */}
                    {msg.attachmentName && (
                      <div className="mb-2.5 px-3 py-1.5 bg-black/15 rounded-xl text-xs flex items-center gap-2 font-mono text-white/90">
                        <Camera className="w-4 h-4" />
                        <span className="truncate">{msg.attachmentName}</span>
                      </div>
                    )}

                    {/* Progress Step Banner (e.g. "Consultando Livro Razão...", "Buscando fontes públicas...") */}
                    {msg.progressStep && msg.isStreaming && (
                      <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                        <span>{msg.progressStep}</span>
                      </div>
                    )}

                    {/* Safe Markdown Text Body */}
                    {msg.sender === 'assistant' ? (
                      <div>
                        <MarkdownRenderer content={msg.text} />
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-[1.6] text-[15px] text-white">
                        {msg.text}
                      </p>
                    )}

                    {/* Clarification Questions (interactive buttons) */}
                    {msg.clarification && (
                      <div className="mt-3.5 p-3.5 bg-white dark:bg-[#121724] border border-indigo-200 dark:border-indigo-500/30 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                          <HelpCircle className="w-4 h-4" />
                          <span>{msg.clarification.question}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.clarification.options.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(opt)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition active:scale-95 cursor-pointer"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Editable Draft Proposal / Confirmation Card */}
                    {cardData && (
                      <div className="mt-3.5 p-4 bg-white dark:bg-[#121724] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm text-slate-900 dark:text-white animate-card-reveal">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/10 mb-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                            <FileText
                              className={`w-4 h-4 ${
                                cardData.is_revenue || cardData.type === 'REVENUE_CONFIRMATION'
                                  ? 'text-emerald-500'
                                  : 'text-indigo-500'
                              }`}
                            />
                            <span>
                              {cardData.type === 'CORRECTION_CONFIRMATION'
                                ? 'Correção de Cupom'
                                : cardData.is_revenue || cardData.type === 'REVENUE_CONFIRMATION'
                                ? 'Proposta de Receita'
                                : 'Proposta de Lançamento'}
                            </span>
                          </div>

                          {cardData.status === 'CONFIRMED' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Registrado no Razão</span>
                            </span>
                          ) : cardData.status === 'DISCARDED' ? (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 text-xs font-semibold">
                              Descartado
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-500/30">
                                Rascunho Editável
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingCardId(isCardEditing ? null : msg.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
                                title="Editar campos da proposta"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Amount & Counterparty (Hero) */}
                        {isCardEditing && cardData.status === 'AWAITING_CONFIRMATION' ? (
                          <div className="space-y-3 mb-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                Valor (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={cardData.amount}
                                onChange={(e) =>
                                  updateDraftField(msg.id, 'amount', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-sm font-mono font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                Fornecedor / Contraparte
                              </label>
                              <input
                                type="text"
                                value={cardData.counterparty}
                                onChange={(e) =>
                                  updateDraftField(msg.id, 'counterparty', e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                  Categoria
                                </label>
                                <input
                                  type="text"
                                  value={cardData.category}
                                  onChange={(e) =>
                                    updateDraftField(msg.id, 'category', e.target.value)
                                  }
                                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                  Data
                                </label>
                                <input
                                  type="date"
                                  value={cardData.date}
                                  onChange={(e) => updateDraftField(msg.id, 'date', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                                Entidade Contábil
                              </label>
                              <select
                                value={cardData.entity_code}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  updateDraftField(msg.id, 'entity_code', code);
                                  updateDraftField(
                                    msg.id,
                                    'entity_name',
                                    getEntityDisplayName(code)
                                  );
                                }}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#182030] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white"
                              >
                                <option value="FIX_SERVICOS">Fix Serviços MEI (Osmar)</option>
                                <option value="FACILITA_VISTORIAS">Facilita Vistorias MEI (Vera)</option>
                                <option value="HOUSEHOLD_OSMAR">Família PF (Comum)</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-3">
                              <div
                                className={`text-2xl font-extrabold font-mono tracking-tight ${
                                  cardData.is_revenue || cardData.type === 'REVENUE_CONFIRMATION'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {(cardData.is_revenue ||
                                  cardData.type === 'REVENUE_CONFIRMATION') &&
                                  '+ '}
                                R${' '}
                                {Number(cardData.amount).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                {cardData.date} • {cardData.counterparty}
                              </div>
                            </div>

                            {/* 2x2 Details Grid */}
                            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-[#182030] rounded-xl border border-slate-100 dark:border-white/5 mb-3.5 text-xs">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400 block font-medium">
                                  Categoria
                                </span>
                                <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                                  {cardData.category}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400 block font-medium">
                                  Entidade
                                </span>
                                <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                  {cardData.entity_name || getEntityDisplayName(cardData.entity_code)}
                                </strong>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-500 dark:text-slate-400 block font-medium">
                                  Conta de Pagamento
                                </span>
                                <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                                  {cardData.account_name}
                                </strong>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Card Action Buttons */}
                        {cardData.status === 'AWAITING_CONFIRMATION' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmCard(cardData, msg.id)}
                              className={`flex-1 py-3 px-4 min-h-[48px] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                                cardData.is_revenue || cardData.type === 'REVENUE_CONFIRMATION'
                                  ? 'bg-emerald-600 hover:bg-emerald-500'
                                  : 'bg-indigo-600 hover:bg-indigo-500'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {cardData.is_revenue || cardData.type === 'REVENUE_CONFIRMATION'
                                  ? 'Confirmar Receita'
                                  : 'Confirmar Lançamento'}
                              </span>
                            </button>
                            <button
                              onClick={() => handleDiscardCard(msg.id)}
                              className="py-3 px-4 min-h-[48px] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition active:scale-95 cursor-pointer"
                            >
                              Descartar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generative UI Artifact Card (Calculators, Simulators) */}
                    {msg.artifact && (
                      <div className="mt-2 animate-card-reveal">
                        <ArtifactRenderer artifact={msg.artifact} />
                      </div>
                    )}
                  </div>

                  {/* Continuity Suggestion Chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[95%]">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(suggestion)}
                          className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Meta Footer */}
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
                        className="hover:text-slate-700 dark:hover:text-white transition p-0.5 rounded ml-1 cursor-pointer"
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

          {/* Real loading indicator */}
          {loadingChat && (
            <div className="flex items-start gap-3 animate-message-in">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="bg-slate-100 dark:bg-[#192132] border border-slate-200/70 dark:border-white/10 rounded-3xl rounded-tl-md px-4 py-3 flex items-center gap-3 text-slate-600 dark:text-slate-300 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="font-medium">Processando consulta financeira...</span>
                {handleStopGeneration && (
                  <button
                    onClick={handleStopGeneration}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-rose-500 hover:text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3 h-3" />
                    <span>Parar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* 4. STARTER SUGGESTION CHIPS (when messages <= 1) */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 border-t border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#131926] shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Atalhos sugeridos:
            </span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => handleSendMessage('Quanto temos disponível somando nossas contas?')}
                className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-white/10 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                <span>Saldo Disponível</span>
              </button>
              <button
                onClick={() => handleSendMessage('Quais são as pendências e comprovantes pendentes?')}
                className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200/80 dark:border-white/10 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Revisar Pendências</span>
              </button>
              <button
                onClick={() => handleSendMessage('Como está o teto do MEI da Fix e da Facilita?')}
                className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-white/10 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Teto MEI 2026</span>
              </button>
              <button
                onClick={() => handleSendMessage('Auditar fechamento do mês atual')}
                className="px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-white/10 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Auditar Fechamento</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. BOTTOM COMPOSER: Accessible Capsule Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#111724] shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ml-2 text-xs font-bold py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                Remover
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative bg-slate-100 dark:bg-[#192132] border border-slate-200 dark:border-white/10 rounded-[28px] p-1.5 flex items-center gap-1 shadow-sm focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-colors"
          >
            {/* Direct Camera Capture (Mobile) */}
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
              title="Tirar foto do cupom com a câmera"
              aria-label="Tirar foto com a câmera"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-white/10 transition active:scale-95 shrink-0 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar comprovante da galeria ou arquivo"
              aria-label="Anexar comprovante"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-white/10 transition active:scale-95 shrink-0 cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pergunte ao assistente ou envie um cupom..."
              aria-label="Mensagem para o assistente"
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 ring-0 px-2 py-2 text-[15px] text-slate-900 dark:text-white placeholder-slate-400 font-normal min-w-0"
            />

            <button
              type="submit"
              disabled={loadingChat || (!chatInput.trim() && !attachedFile)}
              title="Enviar mensagem"
              aria-label="Enviar mensagem"
              className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer ${
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
