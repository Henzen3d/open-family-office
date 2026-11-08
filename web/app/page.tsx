'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  FileText,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Settings,
  Search,
  Calendar,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Camera,
  Plus,
  X,
  Fingerprint,
  RefreshCw,
  Bell,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  QrCode,
  Upload,
  Clock,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import SettingsModal from './components/SettingsModal';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachmentName?: string;
}

export default function StitchExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'fix' | 'facilita' | 'pf'>('all');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'inter' | 'caixa' | 'nubank'>('all');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('ofo_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.classList.toggle('dark', initial === 'dark');
    }
  }, []);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('ofo_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    fetch('/api/py/settings/general', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  };

  // Chat & Upload state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Assistente OpenFamilyOffice ativo. Padrão ASD-STE100 (~80%). Frases diretas e números operacionais primeiro. Fotografe o cupom fiscal ou digite sua consulta.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedEntityChat, setSelectedEntityChat] = useState('inter_cnpj');
  const [loadingChat, setLoadingChat] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quick transfer state
  const [transferAmount, setTransferAmount] = useState('200,00');

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

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || chatInput).trim();
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
    setChatInput('');
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
            text: `Cupom "${uploadData.file_name}" arquivado com sucesso. Conta: ${uploadData.target_entity}. Dados protegidos por cofre local. Aguardando conciliação automática.`,
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

      if (!res.ok) throw new Error('API call failed');

      const data = await res.json();
      const reply = data.reply || (data.facts ? data.facts.join(' ') : 'Comando executado com sucesso.');

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Resposta local: Limite MEI 2026 em R$ 81.000,00 anuais (R$ 6.750,00/mês). Posição de caixa protegida contra desenquadramento.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F4F6FB] dark:bg-[#0c1017] text-slate-900 dark:text-[#f8fafc] font-sans antialiased transition-colors duration-200">
      {/* 1. LEFT COMPACT FLOATING ICON SIDEBAR (Desktop only, hidden on mobile) */}
      <aside className="hidden md:flex w-18 md:w-20 bg-transparent flex flex-col items-center py-6 px-3 z-30 shrink-0 select-none border-r border-slate-200/80 dark:border-white/5">
        {/* Brand Emblem */}
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/10 shadow-lg flex items-center justify-center mb-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#1a2232] transition group cursor-pointer">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-900/50">
            O
          </div>
        </div>

        {/* Nav Items with pill active state */}
        <nav className="flex flex-col items-center gap-4 w-full">
          <button
            title="Visão Geral"
            onClick={() => setActiveTab('all')}
            className="w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-pill flex items-center justify-center transition-transform hover:scale-105"
          >
            <Home className="w-5 h-5" />
          </button>

          <button
            title="Monitor de Liquidez & Faturas"
            onClick={() => setLedgerFilter('all')}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
          >
            <FileText className="w-5 h-5" />
          </button>

          <button
            title="Cartões & Contas Multientidade"
            onClick={() => setLedgerFilter('inter')}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
          >
            <CreditCard className="w-5 h-5" />
          </button>

          <button
            title="Curva Patrimonial & Analytics"
            onClick={() => setActiveTab('all')}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
          >
            <TrendingUp className="w-5 h-5" />
          </button>

          <button
            title="Governança Conjugal (Dual-Signature)"
            onClick={() => setIsSettingsOpen(true)}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        </nav>

        {/* Bottom Settings & Status Pin */}
        <div className="mt-auto flex flex-col items-center gap-3">
          <button
            title="Configurações & Provedores de IA"
            onClick={() => setIsSettingsOpen(true)}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div
            className={`w-2.5 h-2.5 rounded-full ring-4 ${
              apiOnline
                ? 'bg-emerald-400 ring-emerald-500/20'
                : 'bg-amber-400 ring-amber-500/20'
            }`}
            title="Local Air-Gapped Engine"
          />
        </div>
      </aside>

      {/* 2. MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 pr-4 sm:pr-8 pl-4 sm:pl-6 py-5 pb-24 md:pb-8 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* Search Input with ⌘K */}
          <div className="w-full md:w-96 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar lançamentos, guias DAS, CNPJ..."
              className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-2xl text-xs placeholder-slate-400 text-slate-900 dark:text-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60 transition"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 dark:bg-[#212a3d] text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-white/10">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Quick Entity Filter Pill Switches */}
          <div className="hidden xl:flex items-center bg-white dark:bg-[#161c28] p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Consolidado
            </button>
            <button
              onClick={() => setActiveTab('fix')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                activeTab === 'fix'
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Fix Serviços MEI (Osmar)
            </button>
            <button
              onClick={() => setActiveTab('facilita')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                activeTab === 'facilita'
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Facilita Vistorias MEI (Vera)
            </button>
            <button
              onClick={() => setActiveTab('pf')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition ${
                activeTab === 'pf'
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Família PF (Casal)
            </button>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>Motor 24/7 Ativo</span>
            </div>

            <button className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Semana 45 • 2026</span>
            </button>

            {/* Quick Theme Switcher */}
            <button
              onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              className="w-10 h-10 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Quick Settings Icon */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Configurações & Provedores de IA"
              className="w-10 h-10 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsAssistantOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#1f2738] rounded-2xl text-xs font-bold text-slate-900 dark:text-white shadow-sm transition"
            >
              <span>Mover Dinheiro</span>
            </button>

            <button
              onClick={() => setIsAssistantOpen(true)}
              className="relative w-10 h-10 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500" />
            </button>
          </div>
        </header>

        {/* Welcome Greeting & Action Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Olá, Osmar & Vera!
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                v1.0 • Privado
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Gestão Patrimonial Consolidada • 2 CNPJs MEI (Titularidades Separadas) + 1 Household PF • Air-Gapped Local
            </p>
          </div>

          {/* Quick Action Pill Group */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs">
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-2xl font-bold shadow-pill hover:bg-indigo-500 transition whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar PIX</span>
            </button>
            <button
              onClick={() => handleSendMessage('Cobrança de clientes')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Cobrança</span>
            </button>
            <button
              onClick={() => handleSendMessage('Transferir recursos')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Transferir</span>
            </button>
            <button
              onClick={() => handleSendMessage('Pagar DAS MEI ou Fatura')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Pagar DAS / Fatura</span>
            </button>
            <button
              onClick={() => handleSendMessage('Emitir NFS-e')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Emitir NFS-e</span>
            </button>
          </div>
        </div>

        {/* 3. MAIN BENTO GRID ROW 1: Multi-Entity Stacked Cards + Flow Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* LEFT CARD: Stacked Entity Wallets */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between relative overflow-hidden">
            <div className="relative w-full pt-1 pb-4">
              {/* Card 1: Vibrant Indigo / Violet Nubank UV */}
              <div className="relative z-10 w-full h-14 rounded-2xl bg-gradient-to-r from-[#4f46e5] to-[#3b82f6] text-white px-5 py-3 flex items-center justify-between shadow-lg border border-white/15">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Nubank UV (PF)</span>
                <span className="font-mono text-xs font-bold text-white">R$ 68.200,00</span>
              </div>
              {/* Card 2: Warm Amber Banco Inter MEI */}
              <div className="relative z-20 w-full h-14 -mt-6 rounded-2xl bg-gradient-to-r from-[#f59e0b] to-[#ea580c] text-white px-5 py-3 flex items-center justify-between shadow-lg border border-white/15">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
                  Inter PJ • Fix Serviços (Osmar)
                </span>
                <span className="font-mono text-xs font-bold text-white">R$ 44.520,00</span>
              </div>
              {/* Card 3: Rose / Violet Caixa PJ */}
              <div className="relative z-30 w-full rounded-2xl bg-gradient-to-r from-[#db2777] to-[#9333ea] text-white p-4 -mt-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-pink-100">
                    Caixa PJ • Facilita Vist. (Vera)
                  </span>
                  <span className="font-mono text-xs font-bold text-white">R$ 35.700,00</span>
                </div>
                <div className="bg-black/30 backdrop-blur-md rounded-xl p-2 flex items-center justify-between border border-white/15 text-xs">
                  <span className="text-[11px] font-medium tracking-wide text-white">3 Entidades Segregadas</span>
                  <button
                    onClick={() => setIsAssistantOpen(true)}
                    className="w-6 h-6 rounded-full bg-white text-purple-700 flex items-center justify-center hover:scale-105 transition shadow-sm font-bold"
                    title="Adicionar Conta"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Balance Metric Display below cards */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <span>Patrimônio Líquido Disponível</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/25 px-2 py-0.5 rounded-md text-[11px]">
                  +3,8% mês
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                R$ 148.420,00
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#121722] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Runway Familiar: <strong className="text-slate-900 dark:text-white font-semibold">11,2 meses</strong>
                </span>
                <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">Burn R$ 13.250/mês</span>
              </div>
            </div>
          </div>

          {/* CENTER / RIGHT HERO: Overview Multi-Curved Liquidity Chart */}
          <div className="lg:col-span-8 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Visão Geral de Liquidez & Reservas</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Evolução do Fluxo de Caixa Consolidado vs. Histórico de 2025</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#121722] px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    <span>Ano Atual (2026) <strong className="font-mono text-slate-900 dark:text-white ml-0.5">R$ 148,4k</strong></span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C] shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                    <span>Ano Anterior <strong className="font-mono text-slate-700 dark:text-slate-300 ml-0.5">R$ 112,0k</strong></span>
                  </div>
                </div>

                <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#1a2232] border border-white/10 rounded-xl hover:bg-[#212a3d] text-slate-300 shadow-sm transition">
                  <span>Últimos 12 meses</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* SVG Double Wave Chart with Glowing Tooltip Box */}
            <div className="relative w-full h-56 pt-2">
              <div className="absolute top-2 left-[48%] -translate-x-1/2 bg-[#1a2232]/95 backdrop-blur-md shadow-2xl border border-white/15 rounded-2xl p-2.5 z-20 flex gap-3 text-xs pointer-events-none">
                <div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> 2026
                  </div>
                  <div className="font-mono font-bold text-white">R$ 148.420</div>
                </div>
                <div className="border-l border-white/10 pl-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FB923C]" /> 2025
                  </div>
                  <div className="font-mono font-semibold text-slate-300">R$ 112.500</div>
                </div>
              </div>

              <svg className="w-full h-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 700 170">
                <defs>
                  <linearGradient id="blueGlowDark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="orangeGlowDark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#FB923C" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="30" y2="30" />
                <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="70" y2="70" />
                <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="110" y2="110" />
                <line stroke="#212a3d" strokeWidth="1" x1="0" x2="700" y1="150" y2="150" />

                <path
                  d="M 0,95 C 60,65 120,115 180,95 C 240,75 300,45 350,55 C 410,70 470,120 530,90 C 590,60 650,110 700,95 L 700,160 L 0,160 Z"
                  fill="url(#orangeGlowDark)"
                />
                <path
                  d="M 0,95 C 60,65 120,115 180,95 C 240,75 300,45 350,55 C 410,70 470,120 530,90 C 590,60 650,110 700,95"
                  stroke="#FB923C"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                />

                <path
                  d="M 0,115 C 60,110 120,60 180,75 C 240,90 300,105 350,85 C 400,30 450,25 500,65 C 550,105 620,35 700,60 L 700,160 L 0,160 Z"
                  fill="url(#blueGlowDark)"
                />
                <path
                  d="M 0,115 C 60,110 120,60 180,75 C 240,90 300,105 350,85 C 400,30 450,25 500,65 C 550,105 620,35 700,60"
                  stroke="#7c8cf8"
                  strokeLinecap="round"
                  strokeWidth="3"
                />

                <circle cx="350" cy="55" fill="#FB923C" r="5" stroke="#161c28" strokeWidth="2" />
                <circle cx="350" cy="85" fill="#7c8cf8" r="6" stroke="#161c28" strokeWidth="2.5" />
                <line stroke="#475569" strokeDasharray="3 3" strokeWidth="1.5" x1="350" x2="350" y1="20" y2="150" />
              </svg>
            </div>

            <div className="flex justify-between items-center text-[11px] font-medium text-slate-400 mt-2 px-1">
              <span>Jan</span>
              <span>Fev</span>
              <span>Mar</span>
              <span>Abr</span>
              <span className="text-indigo-400 font-bold">Mai</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Ago</span>
              <span>Set</span>
              <span>Out</span>
              <span>Nov</span>
              <span>Dez</span>
            </div>
          </div>
        </div>

        {/* 4. MIDDLE ROW: MEI Ceiling Monitor + Dual Signature + Quick Contacts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* CARD 1: MEI Ceiling Monitor (LC 208) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monitor de Teto MEI • LC 208</h3>
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">R$ 81.000,00</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ CNPJ Anual</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Exercício Fiscal 2026 • Titularidades 100% autônomas</p>

              {/* MEI 1: Fix Serviços */}
              <div className="mb-4">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">1. Fix Serviços MEI (Titular: Osmar)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">42,2%</span>
                </div>
                <div className="flex gap-1 h-3.5 w-full items-center">
                  {[...Array(9)].map((_, i) => (
                    <span key={i} className="h-full flex-1 bg-indigo-500 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                  ))}
                  {[...Array(12)].map((_, i) => (
                    <span key={i} className="h-full flex-1 bg-slate-200 dark:bg-[#212a3d] rounded-full" />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                  <span>Emitido: R$ 34.200,00</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Margem: R$ 46.800,00</span>
                </div>
              </div>

              {/* MEI 2: Facilita Vistorias */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">2. Facilita Vistorias MEI (Titular: Vera)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">31,0%</span>
                </div>
                <div className="flex gap-1 h-3.5 w-full items-center">
                  {[...Array(6)].map((_, i) => (
                    <span key={i} className="h-full flex-1 bg-indigo-500 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                  ))}
                  {[...Array(15)].map((_, i) => (
                    <span key={i} className="h-full flex-1 bg-slate-200 dark:bg-[#212a3d] rounded-full" />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                  <span>Emitido: R$ 25.110,00</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Margem: R$ 55.890,00</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Status LC 123/2006:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                Segregação Correta • Sem Risco
              </span>
            </div>
          </div>

          {/* CARD 2: Dual-Signature Desk (Governança Conjugal Osmar & Vera) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Governança Familiar</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-500/30">
                  1 Pendência
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Distribuições acima de R$ 3.000 exigem validação mútua para blindar os CNPJs contra confusão patrimonial.
              </p>

              {/* Pending Item Box */}
              <div className="bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 mb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      Distribuição de Lucros Isenta
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Fix Serviços MEI → Conta Familiar PF</span>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Banco Inter PJ → Nubank PF</div>
                  </div>
                  <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">R$ 3.500,00</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    <span>Osmar (Validado)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Aguardando Vera</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleSendMessage('Confirmar acordo de retirada')}
                className="flex-1 py-2.5 px-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-pill hover:bg-indigo-500 transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmar Acordo Conjugal</span>
              </button>
              <button
                onClick={() => handleSendMessage('Detalhes da transferência Fix para PF')}
                className="py-2.5 px-3 bg-slate-100 dark:bg-[#1a2232] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#212a3d] transition"
              >
                Detalhes
              </button>
            </div>
          </div>

          {/* CARD 3: Quick Transfer & Frequent Contacts */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transferência Rápida</h3>
                <button onClick={() => setIsAssistantOpen(true)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Ver Todos
                </button>
              </div>

              {/* Contacts Avatar Row */}
              <div className="flex items-center gap-2.5 overflow-x-auto py-2">
                <button
                  onClick={() => setIsAssistantOpen(true)}
                  className="w-11 h-11 rounded-full border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/50 bg-slate-50 dark:bg-[#121722] shrink-0 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center shrink-0 cursor-pointer">
                  <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300">
                    Vera
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">Vera</span>
                </div>

                <div className="flex flex-col items-center shrink-0 cursor-pointer">
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                    Cont.
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Contador</span>
                </div>

                <div className="flex flex-col items-center shrink-0 cursor-pointer">
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                    Forn.
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Fornecedor</span>
                </div>
              </div>
            </div>

            {/* Transfer Input and Send Pill Button */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10 mt-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-semibold text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <button
                onClick={() => handleSendMessage(`Enviar PIX de R$ ${transferAmount}`)}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-pill hover:bg-indigo-500 transition"
              >
                Enviar PIX
              </button>
            </div>
          </div>
        </div>

        {/* 5. LOWER ROW: Transaction Ledger & Fiscal Reconciliation + Money Movement Column Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* TRANSACTION TABLE: Clean & Refined Dark Ledger */}
          <div className="lg:col-span-8 bg-[#161c28] rounded-3xl p-6 border border-white/10 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Livro Razão & Conciliação Fiscal Recente</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Conciliação bancária automática com chaves XML e recibos fiscais</p>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#121722] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs">
                  <button
                    onClick={() => setLedgerFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      ledgerFilter === 'all'
                        ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setLedgerFilter('inter')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      ledgerFilter === 'inter'
                        ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Inter PJ (Fix)
                  </button>
                  <button
                    onClick={() => setLedgerFilter('caixa')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      ledgerFilter === 'caixa'
                        ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Caixa PJ (Vistorias)
                  </button>
                  <button
                    onClick={() => setLedgerFilter('nubank')}
                    className={`px-3 py-1 rounded-lg font-medium transition ${
                      ledgerFilter === 'nubank'
                        ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Nubank PF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-1">Data / Hora</th>
                      <th className="pb-3">Entidade</th>
                      <th className="pb-3">Descrição & Contraparte</th>
                      <th className="pb-3 text-right">Valor</th>
                      <th className="pb-3">Documento Fiscal</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                    <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">Hoje, 14:22</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[10px] border border-amber-200 dark:border-amber-500/30">
                          Inter PJ
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">PIX Cliente Condomínio Jardins</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Receita Bruta MEI • Prestação de Reparos</div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 1.850,00</td>
                      <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">NFS-e #0084.xml</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">Hoje, 10:15</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold text-[10px] border border-purple-200 dark:border-purple-500/30">
                          Caixa PJ
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">Locação Medidor Laser 3D</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Despesa Operacional • Georreferenciamento</div>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">-R$ 420,00</td>
                      <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">Recibo_Loc_09.pdf</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">Ontem, 19:40</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] border border-blue-200 dark:border-blue-500/30">
                          Nubank PF
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">Supermercado Pão de Açúcar</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Despesa Familiar • Cesta Alimentação</div>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">-R$ 684,30</td>
                      <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">NFC-e 3526..8901</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                        </span>
                      </td>
                    </tr>

                    {/* Pending Row */}
                    <tr className="hover:bg-amber-100/50 dark:hover:bg-amber-950/30 bg-amber-50/50 dark:bg-amber-950/15 transition">
                      <td className="py-3 pl-1 font-mono text-amber-700 dark:text-amber-300 font-semibold">04/Nov 11:05</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold text-[10px] border border-amber-300 dark:border-amber-500/40">
                          Inter PJ
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-900 dark:text-white font-semibold">Manutenção Veicular Utilitário</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Custo Operacional • Troca Pastilhas de Freio</div>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-amber-700 dark:text-amber-300">-R$ 1.250,00</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" /> NF-e Pendente
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => {
                            setIsAssistantOpen(true);
                            setSelectedEntityChat('inter_cnpj');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[10px] shadow-sm hover:bg-indigo-500 transition"
                        >
                          <Camera className="w-3 h-3" /> Anexar
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/80 dark:border-white/10 mt-2">
              <span>5 conciliações efetuadas nas últimas 48h</span>
              <button onClick={() => setIsAssistantOpen(true)} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Ver extrato completo no Assistente
              </button>
            </div>
          </div>

          {/* MONEY MOVEMENT: Soft Column Bar Chart */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Movimentação Financeira</h3>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Últimos 30 dias</span>
              </div>

              {/* In vs Out Header */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#121722] p-3 rounded-2xl border border-slate-200/60 dark:border-white/5 mb-4">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Entradas (Receita)</span>
                  <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">R$ 28.450,00</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Saídas (Despesas)</span>
                  <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">R$ 13.250,00</span>
                </div>
              </div>

              {/* Soft Column Bar Chart with Glow Highlight */}
              <div className="relative w-full h-36 flex items-end justify-between gap-1.5 pt-6 px-1">
                <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200 dark:bg-white/10" />
                <div className="absolute top-0 left-[62%] -translate-x-1/2 bg-slate-800 dark:bg-[#212a3d] border border-slate-700 dark:border-white/15 text-white text-[10px] font-mono px-2 py-0.5 rounded-md shadow-md pointer-events-none">
                  05 Nov: R$ 3.8k
                </div>

                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[45%]" />
                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[65%]" />
                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[30%]" />
                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[55%]" />
                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[80%]" />
                {/* Active Highlighted Column */}
                <div className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl h-[95%] shadow-[0_0_16px_rgba(99,102,241,0.5)] relative">
                  <div className="w-2 h-2 rounded-full bg-white mx-auto mt-1 opacity-90 shadow-sm" />
                </div>
                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[70%]" />
                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[40%]" />
                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[60%]" />
                <div className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[50%]" />
              </div>
            </div>

            {/* Copilot Micro Drawer Trigger */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-bold text-slate-900 dark:text-white">OF-Copilot Fiscal</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Teto MEI 100% OK
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. FLOATING QUICK CONCILIATION ACTION BUTTON (Desktop Only) */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:block">
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="bg-indigo-600 text-white px-5 py-3 rounded-full shadow-pill flex items-center gap-2 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 border border-white/20"
        >
          <Camera className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wide uppercase">Anexar Cupom Fiscal</span>
          <span className="ml-1 text-[11px] bg-white text-indigo-600 font-extrabold px-1.5 py-0.2 rounded-full">
            1
          </span>
        </button>
      </div>

      {/* 7. SLIDE-OVER ASSISTANT & OCR CAPTURE DRAWER */}
      {isAssistantOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full sm:w-[460px] h-full bg-white dark:bg-[#161c28] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-slate-900 dark:text-white">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#121722]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                  IA
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assistente & Conciliação</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Padrão ASD-STE100 (~80%)</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssistantOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Context Chips inside Drawer */}
            <div className="px-4 py-2 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#161c28] flex gap-1.5 overflow-x-auto text-[11px]">
              <button
                onClick={() => handleSendMessage('Teto MEI')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition shrink-0"
              >
                📊 Teto MEI
              </button>
              <button
                onClick={() => handleSendMessage('Resumo de Caixa')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition shrink-0"
              >
                💰 Caixa 7 Dias
              </button>
              <button
                onClick={() => handleSendMessage('Status das Contas')}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition shrink-0"
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
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-100 dark:bg-[#121722] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.attachmentName && (
                      <div className="mb-1.5 px-2 py-0.5 bg-black/10 dark:bg-black/30 rounded text-[10px] flex items-center gap-1 font-mono">
                        <Camera className="w-3 h-3" />
                        <span>{msg.attachmentName}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 px-1 font-mono">{msg.timestamp}</span>
                </div>
              ))}

              {loadingChat && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#121722] p-2.5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-500 dark:text-indigo-400" />
                  <span>Processando resposta com brevidade ASD-STE100...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Drawer Input / OCR Dropzone Area */}
            <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121722]">
              {attachedFile && (
                <div className="mb-2 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{attachedFile.name}</span>
                  </div>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white ml-2 text-[11px]"
                  >
                    Remover
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Destino:</span>
                <select
                  value={selectedEntityChat}
                  onChange={(e) => setSelectedEntityChat(e.target.value)}
                  className="text-xs bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 rounded-lg px-2 py-1 outline-none"
                >
                  <option value="inter_cnpj">Inter CNPJ (Fix Serviços • Osmar)</option>
                  <option value="caixa_pj">Caixa PJ (Facilita Vistorias • Vera)</option>
                  <option value="nubank_pf">Nubank PF (Família • Casal)</option>
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
                  className="p-2.5 rounded-xl bg-white dark:bg-[#161c28] hover:bg-slate-100 dark:hover:bg-[#1f2738] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition"
                >
                  <Camera className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Mensagem (ex: usei o inter cnpj, almoço R$ 45)..."
                  className="flex-1 bg-[#161c28] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={loadingChat || (!chatInput.trim() && !attachedFile)}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. MOBILE BOTTOM NAVIGATION BAR (Fixed at bottom on mobile screens < md) */}
      <nav className="fixed bottom-0 inset-x-0 h-16 md:hidden z-40 bg-white/95 dark:bg-[#161c28]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 flex items-center justify-around px-2 shadow-lg select-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-xs font-semibold ${
            activeTab === 'all' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          title="Visão Geral"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Início</span>
        </button>

        <button
          onClick={() => setLedgerFilter('all')}
          className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          title="Extratos & Livro-Razão"
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Extrato</span>
        </button>

        {/* Center Floating Plus / Assistant Button */}
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="w-12 h-12 -mt-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-pill flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          title="Assistente de Lançamentos & OCR"
        >
          <Sparkles className="w-6 h-6" />
        </button>

        <button
          onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
          className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          title="Alternar Tema"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          <span className="text-[10px] mt-0.5">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          title="Configurações & Provedores"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Ajustes</span>
        </button>
      </nav>

      {/* 5. SETTINGS & AI PROVIDERS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
    </div>
  );
}
