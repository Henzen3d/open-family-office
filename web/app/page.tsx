'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Building2,
  Users,
  CreditCard,
  Calendar,
  Camera,
  Send,
  X,
  MessageSquarePlus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  FileText,
  Clock,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachmentName?: string;
}

export default function ExecutiveDashboard() {
  const [activeEntity, setActiveEntity] = useState<'all' | 'fix' | 'facilita' | 'pf'>('all');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Assistente OpenFamilyOffice ativo. Padrão ASD-STE100 (~80%). Frases curtas, números primeiro. Anexe um cupom fiscal ou faça sua consulta.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedEntityChat, setSelectedEntityChat] = useState('inter_cnpj');
  const [loadingChat, setLoadingChat] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check backend health
  useEffect(() => {
    fetch('/api/py/health')
      .then((res) => {
        if (res.ok) setApiOnline(true);
        else setApiOnline(false);
      })
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    if (isAssistantOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAssistantOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text && !attachedFile) return;

    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: text || `[Comprovante anexado: ${attachedFile?.name}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentName: attachedFile?.name,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoadingChat(true);

    if (attachedFile) {
      const formData = new FormData();
      formData.append('file', attachedFile);
      formData.append('entity', selectedEntityChat);
      if (text) formData.append('notes', text);

      try {
        const uploadRes = await fetch('/api/py/receipts/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        setAttachedFile(null);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: `Comprovante "${uploadData.file_name}" recebido. Conta: ${uploadData.target_entity}. Dados protegidos por cofre local. Lançamento adicionado à fila de conferência.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoadingChat(false);
        return;
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    try {
      const res = await fetch('/api/py/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context_entity: selectedEntityChat,
          stream: false,
        }),
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();
      const replyText = data.reply || (data.facts ? data.facts.join(' ') : 'Comando processado com sucesso.');

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Resposta offline: Teto MEI 2026 em R$ 81.000,00. Runway atual de 11,2 meses.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* 1. Top Global Navigation */}
      <header className="border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-950/40">
              O
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-white">OpenFamilyOffice</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.05]">
                  Private Office
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Gestão Patrimonial • Fix Serviços MEI • Facilita Vistorias MEI
              </p>
            </div>
          </div>
        </div>

        {/* Entity Selector Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] text-xs">
          <button
            onClick={() => setActiveEntity('all')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeEntity === 'all'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Consolidado
          </button>
          <button
            onClick={() => setActiveEntity('fix')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeEntity === 'fix'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Fix Serviços MEI
          </button>
          <button
            onClick={() => setActiveEntity('facilita')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeEntity === 'facilita'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Facilita Vistorias MEI
          </button>
          <button
            onClick={() => setActiveEntity('pf')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeEntity === 'pf'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Família PF
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {apiOnline === true ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Motor 24/7 Ativo
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-3 h-3" /> Conectando
              </span>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.05]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>LGPD Air-Gapped</span>
          </div>
        </div>
      </header>

      {/* 2. Main Executive Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Bento Grid: Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Hero Card: Liquid Net Worth & Runway (7 Cols) */}
          <div className="lg:col-span-7 rounded-3xl p-1 bg-white/[0.02] border border-white/[0.08] shadow-2xl">
            <div className="rounded-[1.35rem] p-6 bg-gradient-to-b from-slate-900/90 to-slate-950 border border-white/[0.04] flex flex-col justify-between h-full space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="uppercase tracking-wider font-mono text-[11px] text-slate-400">
                    Posição Consolidada & Runway
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-mono">
                    <TrendingUp className="w-3.5 h-3.5" /> +3,8% este mês
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                    R$ 148.420,00
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    11,2 meses
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Reserva calculada com queima média mensal familiar de R$ 13.250,00.
                </p>
              </div>

              {/* Sub-Metric Horizon Pills */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06] text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Nubank PF</span>
                  <span className="text-sm font-mono font-semibold text-white">R$ 42.150,00</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Disponível imediato</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Inter PJ (Fix)</span>
                  <span className="text-sm font-mono font-semibold text-white">R$ 56.400,00</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Capital de giro</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Caixa PJ (Vistorias)</span>
                  <span className="text-sm font-mono font-semibold text-white">R$ 49.870,00</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Operações correntes</span>
                </div>
              </div>

              {/* Visual Area Sparkline */}
              <div className="h-14 w-full flex items-end gap-1.5 pt-2">
                {[35, 42, 40, 52, 48, 65, 59, 72, 68, 85, 92, 100].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      style={{ height: `${val}%` }}
                      className="w-full rounded-sm bg-gradient-to-t from-emerald-600/20 to-emerald-400/80 hover:to-emerald-300 transition-all duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MEI Revenue Ceiling Monitor (5 Cols) */}
          <div className="lg:col-span-5 rounded-3xl p-1 bg-white/[0.02] border border-white/[0.08] shadow-2xl flex flex-col">
            <div className="rounded-[1.35rem] p-6 bg-gradient-to-b from-slate-900/90 to-slate-950 border border-white/[0.04] flex flex-col justify-between flex-1 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Teto MEI 2026 (LC 208/2026)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                    R$ 81.000,00/ano
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Painel de Conformidade Fiscal
                </h3>
                <p className="text-xs text-slate-400">
                  Monitoramento diário para evitar desenquadramento tributário involuntário.
                </p>
              </div>

              {/* Progress 1: Fix Serviços */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Fix Serviços MEI
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    R$ 34.200,00 (42,2%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: '42.2%' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Limite restante: R$ 46.800,00</span>
                  <span>Faixa Segura</span>
                </div>
              </div>

              {/* Progress 2: Facilita Vistorias */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" /> Facilita Vistorias MEI
                  </span>
                  <span className="font-mono text-teal-400 font-semibold">
                    R$ 25.110,00 (31,0%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: '31.0%' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Limite restante: R$ 55.890,00</span>
                  <span>Faixa Segura</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Grid: Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card: Spousal Governance & Dual Approvals */}
          <div className="rounded-3xl p-1 bg-white/[0.02] border border-white/[0.08]">
            <div className="rounded-[1.35rem] p-5 bg-slate-900/80 border border-white/[0.04] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Governança Conjugal (Osmar & Vera)
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  1 Transferência Pendente de Conferência
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Movimentações entre PJ e PF exigem confirmação mútua para manter a clareza contábil.
                </p>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-200">Fix Serviços → Nubank PF</span>
                    <span className="font-mono text-white">R$ 3.500,00</span>
                  </div>
                  <span className="text-[10px] text-amber-400 block">
                    Motivo: Distribuição de Lucros • Aguarda validação
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => handleSendMessage('Confirmar transferência de lucro Fix para PF')}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition"
                >
                  Confirmar Acordo
                </button>
              </div>
            </div>
          </div>

          {/* Card: 7-Day Obligations Horizon */}
          <div className="rounded-3xl p-1 bg-white/[0.02] border border-white/[0.08]">
            <div className="rounded-[1.35rem] p-5 bg-slate-900/80 border border-white/[0.04] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Horizonte de 7 a 15 Dias
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">
                  Próximos Vencimentos de Caixa
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <span className="text-slate-200 block font-medium">DAS-MEI Fix Serviços</span>
                        <span className="text-[10px] text-slate-400">Vence em 12 dias</span>
                      </div>
                    </div>
                    <span className="font-mono text-slate-300">R$ 75,90</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                      <div>
                        <span className="text-slate-200 block font-medium">Fatura Nubank PF</span>
                        <span className="text-[10px] text-slate-400">Fecha em 8 dias</span>
                      </div>
                    </div>
                    <span className="font-mono text-slate-300">R$ 2.410,00</span>
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-slate-400 mt-3 block">
                Nenhuma obrigação em atraso detectada no momento.
              </span>
            </div>
          </div>

          {/* Card: Instant Receipt Capture Dropzone */}
          <div className="rounded-3xl p-1 bg-white/[0.02] border border-white/[0.08]">
            <div className="rounded-[1.35rem] p-5 bg-slate-900/80 border border-white/[0.04] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Captura Rápida de Comprovante
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Fotografe ou Anexe Cupons
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  O sistema extrai CNPJ, itens e valor, anonimizando dados sensíveis antes do arquivamento.
                </p>

                <button
                  onClick={() => setIsAssistantOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Abrir Câmera / Assistente</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-400 block mt-2 text-center">
                Formatos aceitos: JPG, PNG, PDF ou texto direto via chat.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Recent Reconciled Transactions Feed */}
        <div className="rounded-3xl p-1 bg-white/[0.02] border border-white/[0.08]">
          <div className="rounded-[1.35rem] p-6 bg-slate-900/80 border border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Fluxo Recente & Reconciliação Bancária
                </h3>
                <p className="text-xs text-slate-400">
                  Transações alimentadas via extratos OFX e comprovantes processados localmente.
                </p>
              </div>
              <button
                onClick={() => handleSendMessage('Resumo de Caixa')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
              >
                <span>Auditar no Assistente</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-400 font-mono text-[11px]">
                    <th className="pb-2.5">Data</th>
                    <th className="pb-2.5">Descrição</th>
                    <th className="pb-2.5">Conta / Origem</th>
                    <th className="pb-2.5">Categoria</th>
                    <th className="pb-2.5 text-right">Valor</th>
                    <th className="pb-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <tr className="hover:bg-white/[0.01]">
                    <td className="py-3 font-mono text-slate-400">Hoje, 09:30</td>
                    <td className="py-3 font-medium text-white">Recebimento de Cliente PJ</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                        Inter CNPJ
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">Prestação de Serviços (Fix)</td>
                    <td className="py-3 font-mono font-semibold text-emerald-400 text-right">
                      + R$ 2.800,00
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Reconciliado
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.01]">
                    <td className="py-3 font-mono text-slate-400">Ontem, 16:45</td>
                    <td className="py-3 font-medium text-white">Materiais e Ferramentas Obra</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                        Inter CNPJ
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">Custos Operacionais</td>
                    <td className="py-3 font-mono font-semibold text-slate-200 text-right">
                      - R$ 342,50
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Comprovante OK
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-white/[0.01]">
                    <td className="py-3 font-mono text-slate-400">06/Nov</td>
                    <td className="py-3 font-medium text-white">Supermercado Familiar</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono text-[10px]">
                        Nubank PF
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">Despesas Domésticas</td>
                    <td className="py-3 font-mono font-semibold text-slate-200 text-right">
                      - R$ 489,20
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" /> Reconciliado
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Floating Action Trigger ("+" Button / Assistant Drawer) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-xs shadow-2xl shadow-emerald-950/80 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="font-semibold">+ Assistente & Cupom</span>
        </button>
      </div>

      {/* 5. Slide-Over Assistant Drawer / Bottom Sheet */}
      {isAssistantOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full sm:w-[480px] h-full bg-slate-900 border-l border-white/[0.08] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  IA
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Assistente OpenFamilyOffice</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Padrão ASD-STE100 (~80%)</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssistantOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Context Chips inside Drawer */}
            <div className="px-4 py-2 border-b border-white/[0.06] bg-slate-950/50 flex gap-1.5 overflow-x-auto text-[11px]">
              <button
                onClick={() => handleSendMessage('Teto MEI')}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06] transition shrink-0"
              >
                📊 Teto MEI
              </button>
              <button
                onClick={() => handleSendMessage('Resumo de Caixa')}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06] transition shrink-0"
              >
                💰 Caixa 7 Dias
              </button>
              <button
                onClick={() => handleSendMessage('Status das Contas')}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06] transition shrink-0"
              >
                ⚙️ Status
              </button>
            </div>

            {/* Drawer Messages Scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-slate-950 border border-white/[0.06] text-slate-200 rounded-bl-none shadow-md'
                    }`}
                  >
                    {msg.attachmentName && (
                      <div className="mb-1.5 px-2 py-0.5 bg-black/30 rounded text-[10px] flex items-center gap-1 font-mono">
                        <Camera className="w-3 h-3" />
                        <span>{msg.attachmentName}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">{msg.timestamp}</span>
                </div>
              ))}

              {loadingChat && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-white/[0.06] w-fit">
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>Processando consulta...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Drawer Input / Camera Area */}
            <div className="p-3 border-t border-white/[0.08] bg-slate-950">
              {attachedFile && (
                <div className="mb-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{attachedFile.name}</span>
                  </div>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="text-slate-400 hover:text-white ml-2 text-[11px]"
                  >
                    Remover
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] text-slate-400">Conta:</span>
                <select
                  value={selectedEntityChat}
                  onChange={(e) => setSelectedEntityChat(e.target.value)}
                  className="text-xs bg-slate-900 border border-white/[0.1] text-slate-200 rounded-lg px-2 py-1 outline-none"
                >
                  <option value="inter_cnpj">Inter CNPJ (Fix Serviços)</option>
                  <option value="caixa_pj">Caixa PJ (Facilita Vistorias)</option>
                  <option value="nubank_pf">Nubank PF (Família)</option>
                </select>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachedFile(e.target.files[0]);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Tirar foto ou anexar cupom"
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/[0.08] transition"
                >
                  <Camera className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Mensagem (ex: usei o inter cnpj, almoço R$ 45)..."
                  className="flex-1 bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={loadingChat || (!input.trim() && !attachedFile)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
