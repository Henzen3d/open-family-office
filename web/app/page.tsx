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
import MarketTicker from './components/MarketTicker';
import StatementModal from './components/StatementModal';
import ReceiptScannerModal from './components/ReceiptScannerModal';
import AssetDetailModal from './components/AssetDetailModal';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachmentName?: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
}

export default function StitchExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'fix' | 'facilita' | 'pf'>('all');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'inter' | 'caixa' | 'nubank'>('all');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [ledgerTransactions, setLedgerTransactions] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<any>(null);

  // Real consolidated history data (2020-2026) extracted from Gestão e Controle Financeiro 2024.xls
  const totalCumulativeProfit = historySummary?.net_profit ?? 508121.36;
  const rev2026 = historySummary?.by_year?.['2026']?.total_revenue ?? 103632.34;
  const rev2025 = historySummary?.by_year?.['2025']?.total_revenue ?? 156199.75;
  const fix2026 = historySummary?.by_year?.['2026']?.fix_servicos_revenue ?? 100332.34;

  // Real dual-MEI partition for 2026 (Fix Serviços R$ 58.200,00 [71,8%], Facilita Vistorias R$ 42.132,34 [52,0%])
  const meiOsmarIssued = 58200.0;
  const meiOsmarMargin = 81000.0 - meiOsmarIssued; // 22800.00
  const meiOsmarPct = ((meiOsmarIssued / 81000.0) * 100).toFixed(1); // 71.8

  const meiVeraIssued = 42132.34;
  const meiVeraMargin = 81000.0 - meiVeraIssued; // 38867.66
  const meiVeraPct = ((meiVeraIssued / 81000.0) * 100).toFixed(1); // 52.0

  // Monthly average 2026 (9 months Jan-Sep)
  const avgMonthlyInflow = rev2026 / 9; // 11514.70
  const avgMonthlyOutflow = (historySummary?.by_year?.['2026']?.total_expenses ?? 10363.22) / 9; // 1151.47

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [selectedAssetModal, setSelectedAssetModal] = useState<string | null>(null);

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

  const loadTransactions = async () => {
    try {
      const res = await fetch('/api/py/statements/transactions?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && Array.isArray(data.transactions)) {
          setLedgerTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.error('Failed to load ledger transactions:', e);
    }

    try {
      const resSummary = await fetch('/api/py/statements/summary');
      if (resSummary.ok) {
        const dataSummary = await resSummary.json();
        if (dataSummary && dataSummary.years) {
          setHistorySummary(dataSummary);
        }
      }
    } catch (e) {
      console.error('Failed to load history summary:', e);
    }
  };

  useEffect(() => {
    fetch('/api/py/health')
      .then((res) => {
        if (res.ok) setApiOnline(true);
        else setApiOnline(false);
      })
      .catch(() => setApiOnline(false));

    loadTransactions();
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
          model: data.model,
          provider: data.provider,
          latencyMs: data.latency_ms,
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

        {/* Real-time Macroeconomic & Financial API Feed Ticker (Sticky Top on Scroll) */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-8 px-4 sm:px-8 py-2.5 bg-[#F4F6FB]/90 dark:bg-[#0c1017]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5 mb-6 transition-all shadow-xs">
          <MarketTicker onSelectAsset={(sym) => setSelectedAssetModal(sym)} />
        </div>

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
              onClick={() => setIsStatementOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-2xl font-bold shadow-pill hover:bg-indigo-500 transition whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Extrato OFX / CSV</span>
            </button>
            <button
              onClick={() => setIsReceiptOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5 text-slate-400" />
              <span>Escanear Cupom</span>
            </button>
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5 text-slate-400" />
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
              onClick={() => handleSendMessage('Pagar DAS MEI ou Fatura')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Pagar DAS / Fatura</span>
            </button>
          </div>
        </div>

        {/* 3. MAIN BENTO GRID ROW 1: Multi-Entity Stacked Cards + Flow Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* LEFT CARD: Stacked Entity Wallets (Orbix Studio Pocket Wallet) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between relative overflow-hidden">
            <div>
              {/* Stacked Cards Envelope */}
              <div className="relative w-full pt-1 pb-2">
                {/* Card 1: Vibrant Indigo / Violet Nubank UV (Top card) */}
                <div className="relative z-10 w-full h-14 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#818cf8] to-[#93c5fd] text-white px-5 py-3 flex items-center justify-between shadow-md border border-white/20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-50">Nubank UV (PF)</span>
                  <span className="font-mono text-xs font-bold text-white">R$ 357.458,00</span>
                </div>
                {/* Card 2: Warm Amber Banco Inter MEI (Middle card) */}
                <div className="relative z-20 w-full h-14 -mt-6 rounded-2xl bg-gradient-to-r from-[#f59e0b] via-[#fb923c] to-[#ea580c] text-white px-5 py-3 flex items-center justify-between shadow-lg border border-white/20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-50">
                    Inter PJ • Fix Serviços (Osmar)
                  </span>
                  <span className="font-mono text-xs font-bold text-white">R$ 100.332,34</span>
                </div>
                {/* Card 3: Rose / Magenta Caixa PJ (Front card) */}
                <div className="relative z-30 w-full h-16 -mt-6 rounded-2xl bg-gradient-to-r from-[#c026d3] via-[#a855f7] to-[#ec4899] text-white px-5 py-3 flex items-start justify-between shadow-xl border border-white/25">
                  <span className="text-xs font-semibold uppercase tracking-wider text-pink-50">
                    Caixa PJ • Facilita Vist. (Vera)
                  </span>
                  <span className="font-mono text-xs font-bold text-white">R$ 50.331,02</span>
                </div>

                {/* Pocket Sleeve with Curved Scoop Flap (Orbix Studio Signature) */}
                <div className="relative z-40 -mt-6 rounded-2xl bg-white/95 dark:bg-[#131926]/95 backdrop-blur-md p-3.5 border border-slate-200/90 dark:border-white/10 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">3 contas</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-medium border border-slate-200/60 dark:border-white/5">
                      Segregação 100%
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAssistantOpen(true)}
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_2px_10px_rgba(99,102,241,0.5)] font-bold"
                    title="Adicionar Conta ou Cartão"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Balance Metric Display below cards */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <span>Lucro Líquido Acumulado (2020-2026)</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/25 px-2 py-0.5 rounded-full text-[11px]">
                  55,5% Margem
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                {formatBRL(totalCumulativeProfit)}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#121722] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Runway Familiar: <strong className="text-slate-900 dark:text-white font-semibold">18,4 meses</strong>
                </span>
                <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">Média R$ 11.515/mês</span>
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
                    <span>Ano Atual (2026) <strong className="font-mono text-slate-900 dark:text-white ml-0.5">R$ {(rev2026 / 1000).toFixed(1).replace('.', ',')}k</strong></span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C] shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                    <span>Ano Anterior (2025) <strong className="font-mono text-slate-700 dark:text-slate-300 ml-0.5">R$ {(rev2025 / 1000).toFixed(1).replace('.', ',')}k</strong></span>
                  </div>
                </div>

                <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-[#1a2232] border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-[#212a3d] text-slate-700 dark:text-slate-300 shadow-sm transition">
                  <span>Últimos 12 meses</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* SVG Double Wave Chart with Glowing Tooltip Box */}
            <div className="relative w-full h-56 pt-2">
              <div className="absolute top-2 left-[48%] -translate-x-1/2 bg-white/95 dark:bg-[#1a2232]/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-white/15 rounded-2xl p-2.5 z-20 flex gap-3 text-xs pointer-events-none text-slate-900 dark:text-white">
                <div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" /> 2026 YTD
                  </div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">R$ 103.632</div>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FB923C]" /> 2025 Total
                  </div>
                  <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">R$ 156.200</div>
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
              <span>Mai</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Ago</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold underline underline-offset-4">Set (Atual)</span>
              <span>Out</span>
              <span>Nov</span>
              <span>Dez</span>
            </div>
          </div>
        </div>

        {/* 4. MIDDLE ROW: MEI Ceiling Monitor + Dual Signature + Quick Contacts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* CARD 1: MEI Ceiling Monitor (Orbix Spending Limit Style) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monitor de Teto MEI • LC 123/2006</h3>
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-slate-400">
                  <CreditCard className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">R$ 81.000,00</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ CNPJ Anual</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Exercício Fiscal 2026 • 2 Titularidades Autônomas (Capacidade R$ 162.000,00)</p>

              {/* MEI 1: Fix Serviços */}
              <div className="mb-4">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">1. Fix Serviços MEI (Titular: Osmar)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{meiOsmarPct}%</span>
                </div>
                {/* 32 Individual Capsule Pill Tracks (Orbix Style) - 23 of 32 filled (71.8%) */}
                <div className="flex gap-1 h-3.5 w-full items-center my-1.5">
                  {[...Array(23)].map((_, i) => (
                    <span key={i} className="h-full flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                  ))}
                  {[...Array(9)].map((_, i) => (
                    <span key={i} className="h-full flex-1 bg-slate-200 dark:bg-[#212a3d] rounded-full" />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  <span>Emitido: {formatBRL(meiOsmarIssued)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Margem: {formatBRL(meiOsmarMargin)}</span>
                </div>
              </div>

              {/* MEI 2: Facilita Vistorias */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">2. Facilita Vistorias MEI (Titular: Vera)</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-pink-400">{meiVeraPct}%</span>
                </div>
                {/* 32 Individual Capsule Pill Tracks (Orbix Style) - 17 of 32 filled (52.0%) */}
                <div className="flex gap-1 h-3.5 w-full items-center my-1.5">
                  {[...Array(17)].map((_, i) => (
                    <span key={i} className="h-full flex-1 bg-gradient-to-t from-purple-600 to-pink-500 rounded-full shadow-[0_0_6px_rgba(219,39,119,0.5)]" />
                  ))}
                  {[...Array(15)].map((_, i) => (
                    <span key={i} className="h-full flex-1 bg-slate-200 dark:bg-[#212a3d] rounded-full" />
                  ))}
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  <span>Emitido: {formatBRL(meiVeraIssued)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Margem: {formatBRL(meiVeraMargin)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Status LC 123/2006:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                Segregação Conjugal Ativa • 100% Protegido
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

          {/* CARD 3: Quick Transfer & Frequent Contacts (Orbix Style) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transferência Rápida</h3>
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

                {/* Vera (Active Selected Contact with Halo Ring) */}
                <div className="flex flex-col items-center shrink-0 cursor-pointer" onClick={() => setTransferAmount('3.500,00')}>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-md">
                    <div className="w-full h-full rounded-full bg-white dark:bg-[#161c28] flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500">
                      Vera
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">Vera</span>
                </div>

                {/* Contador */}
                <div className="flex flex-col items-center shrink-0 cursor-pointer" onClick={() => setTransferAmount('450,00')}>
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                    Cont.
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Contador</span>
                </div>

                {/* Fornecedor */}
                <div className="flex flex-col items-center shrink-0 cursor-pointer" onClick={() => setTransferAmount('1.200,00')}>
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                    Forn.
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Fornecedor</span>
                </div>

                {/* Advogado */}
                <div className="flex flex-col items-center shrink-0 cursor-pointer" onClick={() => setTransferAmount('800,00')}>
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                    Adv.
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Advogado</span>
                </div>

                {/* Next Arrow Circle (Orbix Style) */}
                <button
                  onClick={() => setIsAssistantOpen(true)}
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-[#121722] shrink-0 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Transfer Input and Glowing Send Pill Button (Orbix Style) */}
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
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-xs shadow-[0_4px_16px_rgba(99,102,241,0.45)] hover:shadow-[0_4px_22px_rgba(99,102,241,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <span>Enviar PIX</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. LOWER ROW: Transaction Ledger & Fiscal Reconciliation + Money Movement Column Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* TRANSACTION TABLE: Clean & Refined Ledger */}
          <div className="lg:col-span-8 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Livro Razão & Conciliação Fiscal Recente</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Conciliação bancária automática com chaves XML e recibos fiscais</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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

                  <button
                    onClick={() => setIsStatementOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar OFX/CSV</span>
                  </button>

                  <button
                    onClick={() => setIsReceiptOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1f2738] hover:bg-slate-200 dark:hover:bg-[#28334a] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Escanear Cupom</span>
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
                    {ledgerTransactions.length > 0 ? (
                      ledgerTransactions
                        .filter((tx) => {
                          if (ledgerFilter === 'inter') return tx.entity_code === 'FIX_SERVICOS' || tx.account_name?.toLowerCase().includes('inter');
                          if (ledgerFilter === 'caixa') return tx.entity_code === 'FACILITA_VISTORIAS' || tx.account_name?.toLowerCase().includes('caixa');
                          if (ledgerFilter === 'nubank') return tx.entity_code === 'HOUSEHOLD_OSMAR' || tx.account_name?.toLowerCase().includes('nubank');
                          return true;
                        })
                        .map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                            <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">{tx.date}</td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
                                  tx.entity_code === 'FIX_SERVICOS'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                                    : tx.entity_code === 'FACILITA_VISTORIAS'
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                                }`}
                              >
                                {tx.entity_code === 'FIX_SERVICOS'
                                  ? 'Inter PJ'
                                  : tx.entity_code === 'FACILITA_VISTORIAS'
                                  ? 'Caixa PJ'
                                  : 'Nubank PF'}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="text-slate-900 dark:text-white font-semibold">{tx.clean_description}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
                                {tx.counterparty || tx.raw_description}
                              </div>
                            </td>
                            <td className="py-3 text-right font-mono font-bold">
                              <span className={tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}>
                                {tx.amount >= 0 ? '+' : ''}
                                R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {tx.is_transfer ? (
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                  PJ ↔ PF Neutralizada
                                </span>
                              ) : (
                                tx.notes ? tx.notes.split(' ')[0] : 'Conciliado'
                              )}
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                              </span>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[10px] border border-amber-200 dark:border-amber-500/30">
                              Inter PJ
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-900 dark:text-white font-semibold">Recebimento Fix Serviços MEI 09/2026</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">Faturamento Bruto Fix Serviços MEI (Osmar)</div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 9.987,00</td>
                          <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">NFS-e #09/2026</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                            </span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-08-15</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[10px] border border-amber-200 dark:border-amber-500/30">
                              Inter PJ
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-900 dark:text-white font-semibold">Recebimento Fix Serviços MEI 08/2026 (Pico)</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">Faturamento Bruto Fix Serviços MEI</div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 14.551,55</td>
                          <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">NFS-e #08/2026</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                            </span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] border border-blue-200 dark:border-blue-500/30">
                              Nubank PF
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-900 dark:text-white font-semibold">Distribuição de Lucros Isenta (Vera)</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">Inter PJ → Nubank PF (Neutralizada)</div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 499,35</td>
                          <td className="py-3 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">PJ ↔ PF Neutralizada</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                            </span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] border border-blue-200 dark:border-blue-500/30">
                              Nubank PF
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-900 dark:text-white font-semibold">Distribuição de Lucros Isenta (Osmar)</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">Inter PJ → Nubank PF (Neutralizada)</div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 499,35</td>
                          <td className="py-3 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">PJ ↔ PF Neutralizada</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                            </span>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/80 dark:border-white/10 mt-2">
              <span>
                {ledgerTransactions.length > 0
                  ? `${ledgerTransactions.length} lançamentos reais consolidados (Histórico 2020 - 2026)`
                  : '5 conciliações efetuadas nas últimas 48h'}
              </span>
              <button onClick={() => setIsAssistantOpen(true)} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                Ver extrato completo no Assistente
              </button>
            </div>
          </div>

          {/* MONEY MOVEMENT: Soft Column Bar Chart (Orbix Studio Style) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Movimentação Financeira</h3>
                <button className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-slate-100 dark:bg-[#1a2232] border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-[#212a3d] text-slate-700 dark:text-slate-300 transition">
                  <span>Últimos 30 dias</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
                </button>
              </div>

              {/* In vs Out Header */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#121722] p-3 rounded-2xl border border-slate-200/60 dark:border-white/5 mb-4">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Entradas (Média Mensal 2026)</span>
                  <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(avgMonthlyInflow)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Saídas (Média Retiradas)</span>
                  <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                    {formatBRL(avgMonthlyOutflow)}
                  </span>
                </div>
              </div>

              {/* Soft Column Bar Chart with Glow Highlight & Floating Pill (Orbix Style) */}
              <div className="relative w-full h-36 flex items-end justify-between gap-1.5 pt-7 px-1">
                <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200 dark:bg-white/10" />

                {/* Floating Date Pill over Highlight Pillar (September 2026) */}
                <div className="absolute top-0 left-[72%] -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-lg pointer-events-none flex items-center gap-1 border border-slate-700 dark:border-white/20">
                  <span>Set 2026: R$ 9.987</span>
                </div>

                {/* Jan 2026: 13.420 */}
                <div title="Jan 2026: R$ 13.420,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[92%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
                {/* Fev 2026: 10.827 */}
                <div title="Fev 2026: R$ 10.827,29" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[74%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
                {/* Mar 2026: 12.270 */}
                <div title="Mar 2026: R$ 12.270,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[84%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
                {/* Abr 2026: 8.270 */}
                <div title="Abr 2026: R$ 8.270,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[57%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
                {/* Mai 2026: 12.125 */}
                <div title="Mai 2026: R$ 12.125,50" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[83%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
                {/* Jun 2026: 11.082 */}
                <div title="Jun 2026: R$ 11.082,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[76%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
                {/* Jul 2026: 11.099 */}
                <div title="Jul 2026: R$ 11.099,00" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[76%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
                {/* Ago 2026: 14.551 (Peak) */}
                <div title="Ago 2026: R$ 14.551,55" className="w-full bg-slate-200 dark:bg-[#1e2638] rounded-t-xl h-[100%] hover:bg-slate-300 dark:hover:bg-[#263148] transition cursor-pointer" />
                {/* Set 2026: 9.987 (Active Highlighted) */}
                <div title="Set 2026: R$ 9.987,00 (Último mês)" className="w-full bg-gradient-to-t from-indigo-600 via-indigo-500 to-indigo-400 rounded-t-xl h-[68%] shadow-[0_0_20px_rgba(99,102,241,0.55)] relative cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-white mx-auto mt-1 opacity-90 shadow-sm" />
                </div>
                {/* Out, Nov, Dez (Previsto) */}
                <div title="Out 2026 (Em aberto)" className="w-full bg-slate-100 dark:bg-[#151c2a] border border-dashed border-slate-300 dark:border-white/10 rounded-t-xl h-[20%] transition" />
                <div title="Nov 2026 (Em aberto)" className="w-full bg-slate-100 dark:bg-[#151c2a] border border-slate-300 dark:border-white/10 rounded-t-xl h-[20%] transition" />
                <div title="Dez 2026 (Em aberto)" className="w-full bg-slate-100 dark:bg-[#151c2a] border border-slate-300 dark:border-white/10 rounded-t-xl h-[20%] transition" />
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
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsAssistantOpen(false)}
        >
          <div
            className="w-full sm:w-[560px] md:w-[620px] max-w-full h-full bg-white dark:bg-[#161c28] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
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
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                        : 'bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.attachmentName && (
                      <div className="mb-1.5 px-2 py-0.5 bg-black/10 dark:bg-black/30 rounded text-[10px] flex items-center gap-1 font-mono">
                        <Camera className="w-3 h-3" />
                        <span>{msg.attachmentName}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.sender === 'assistant' && (msg.model || msg.provider) && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{msg.model || msg.provider}</span>
                          {msg.provider && msg.model && <span className="text-[9px] opacity-75">({msg.provider})</span>}
                        </span>
                        {msg.latencyMs !== undefined && (
                          <span className="text-[9px] font-semibold opacity-80">{msg.latencyMs}ms</span>
                        )}
                      </div>
                    )}
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
                  className="flex-1 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
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
          onClick={() => setIsStatementOpen(true)}
          className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          title="Extratos & Conciliação (OFX/CSV)"
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

      {/* 6. BANK STATEMENTS IMPORT & DEDUPLICATION MODAL */}
      <StatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        onSuccess={() => loadTransactions()}
      />

      {/* 7. RECEIPT & CUPOM FISCAL OCR VISION MODAL */}
      <ReceiptScannerModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onSuccess={() => loadTransactions()}
      />

      {/* 8. ASSET DETAIL & HISTORICAL CHART MODAL (1d, 5d, 1m, 6m, 1a, 5a) */}
      <AssetDetailModal
        isOpen={!!selectedAssetModal}
        onClose={() => setSelectedAssetModal(null)}
        assetSymbol={selectedAssetModal || 'IBOV'}
      />
    </div>
  );
}
