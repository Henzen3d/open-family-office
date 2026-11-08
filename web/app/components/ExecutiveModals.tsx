'use client';

import React, { useState } from 'react';
import { X, Check, Copy, AlertCircle, FileText, Calendar, DollarSign, ShieldCheck, Clock, ExternalLink } from 'lucide-react';

interface CobrancaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CobrancaModal({ isOpen, onClose }: CobrancaModalProps) {
  const [copied, setCopied] = useState(false);
  const [clientName, setClientName] = useState('Condomínio Residencial Jardins');
  const [serviceDescription, setServiceDescription] = useState('Serviços de Manutenção Preventiva e Reparos Técnicos - Mês 11/2026');
  const [serviceAmount, setServiceAmount] = useState('1.850,00');
  const [pixKey] = useState('fixservicos@inter.com.br');

  if (!isOpen) return null;

  const invoiceMessage = `Olá, prezado(a) síndico(a) do ${clientName}.
Segue cobrança referente ao serviço executado:
📋 ${serviceDescription}
💰 Valor Total: R$ ${serviceAmount}
🔑 Chave PIX (Inter PJ • Fix Serviços): ${pixKey}
Favorecido: Fix Serviços e Reparos MEI (Osmar Henzen)
Por favor, enviar o comprovante após a transferência para emissão da NFS-e. Obrigado!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(invoiceMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-backdrop-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-slate-100 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Gerador de Cobrança Rápida</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fix Serviços MEI • Banco Inter PJ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-4 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Cliente / Condomínio</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Valor (R$)</label>
              <input
                type="text"
                value={serviceAmount}
                onChange={(e) => setServiceAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Chave PIX Inter PJ</label>
              <input
                type="text"
                disabled
                value={pixKey}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#18202f] border border-slate-200 dark:border-white/10 text-slate-500 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Mensagem Pronta (WhatsApp / E-mail)</label>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#10141d] border border-slate-200/80 dark:border-white/10 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {invoiceMessage}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-pill hover:bg-indigo-500 transition flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado para o Clipboard!' : 'Copiar Mensagem com Chave PIX'}</span>
          </button>
          <button onClick={onClose} className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#1a2232] text-slate-700 dark:text-slate-300 font-semibold text-xs">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

interface DasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DasModal({ isOpen, onClose }: DasModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-backdrop-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-slate-100 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Monitor de Guias DAS MEI & Obrigações</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Vencimento mensal unificado todo dia 20</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 py-4 text-xs">
          {/* DAS Fix Serviços */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white">1. Fix Serviços MEI (Osmar)</span>
                <span className="px-2 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] border border-emerald-200 dark:border-emerald-500/30">
                  Em Dia
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Guia DAS Competência 10/2026 • Vencimento: 20/11/2026</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-base text-slate-900 dark:text-white">R$ 75,90</span>
            </div>
          </div>

          {/* DAS Facilita Vistorias */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white">2. Facilita Vistorias MEI (Vera)</span>
                <span className="px-2 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] border border-emerald-200 dark:border-emerald-500/30">
                  Em Dia
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Guia DAS Competência 10/2026 • Vencimento: 20/11/2026</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-base text-slate-900 dark:text-white">R$ 75,90</span>
            </div>
          </div>

          {/* Fatura Nubank Ultravioleta */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white">3. Fatura Nubank UV (Household PF)</span>
                <span className="px-2 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] border border-blue-200 dark:border-blue-500/30">
                  Débito Automático
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Fechamento: dia 05 • Vencimento: 12/11/2026</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-base text-slate-900 dark:text-white">R$ 4.280,00</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-pill hover:bg-indigo-500 transition">
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}

interface RunwayModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalReserve?: number;
  monthlyBurn?: number;
}

export function RunwayModal({ isOpen, onClose, totalReserve = 508121.36, monthlyBurn = 11515 }: RunwayModalProps) {
  if (!isOpen) return null;

  const runwayMonths = (totalReserve / Math.max(monthlyBurn, 1)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-backdrop-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-slate-100 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">Simulador de Runway & Reserva Familiar</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Autonomia financeira calculada sobre o saldo consolidado</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-4 text-xs">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-500/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold block uppercase tracking-wider">
                Reserva Consolidada
              </span>
              <span className="text-2xl font-extrabold font-mono text-indigo-900 dark:text-white">
                R$ {totalReserve.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Autonomia Estimada</span>
              <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {runwayMonths} meses
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Cenário Padrão</span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">R$ 11.515/mês</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">44,1 meses de segurança</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Cenário Conservador</span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">R$ 15.000/mês</span>
              <span className="text-[10px] text-indigo-600 font-semibold block mt-1">33,8 meses de segurança</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            ✦ Esta reserva inclui recursos do Nubank UV (aluguéis e lucros retidos) somados às disponibilidades operacionais dos CNPJs Inter e Caixa, protegidos contra volatilidade bancária.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-pill hover:bg-indigo-500 transition">
            Fechar Simulador
          </button>
        </div>
      </div>
    </div>
  );
}
