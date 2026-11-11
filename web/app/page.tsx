'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Camera } from 'lucide-react';
import { BankAccountItem } from './components/SettingsModal';
import MarketTicker from './components/MarketTicker';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/dashboard/DashboardHeader';
import EntityWalletsCard from './components/dashboard/EntityWalletsCard';
import BentoLiquidityChart from './components/dashboard/BentoLiquidityChart';
import MeiCeilingTracker from './components/dashboard/MeiCeilingTracker';
import ConjugalGovernanceCard from './components/dashboard/ConjugalGovernanceCard';
import QuickPixCard from './components/dashboard/QuickPixCard';
import RecentTransactionsTable from './components/dashboard/RecentTransactionsTable';
import AssistantDrawer from './components/dashboard/AssistantDrawer';
import MobileNav from './components/dashboard/MobileNav';
import { CobrancaModal, DasModal, RunwayModal } from './components/ExecutiveModals';
import { ChatMessage, ConfirmationCardData } from '@/lib/state/useChatStore';

// Dynamic imports with SSR disabled for optimal bundle splitting & performance (Task 6.7)
const SettingsModal = dynamic(() => import('./components/SettingsModal'), { ssr: false });
const StatementModal = dynamic(() => import('./components/StatementModal'), { ssr: false });
const ReceiptScannerModal = dynamic(() => import('./components/ReceiptScannerModal'), { ssr: false });
const AssetDetailModal = dynamic(() => import('./components/AssetDetailModal'), { ssr: false });
const FullStatementModal = dynamic(() => import('./components/FullStatementModal'), { ssr: false });
const ReceiptViewerModal = dynamic(() => import('./components/ReceiptViewerModal'), { ssr: false });

const DEFAULT_ACCOUNTS: BankAccountItem[] = [
  {
    id: 'nubank_pf',
    name: 'Nubank UV (PF)',
    bank_name: 'Nubank',
    entity_code: 'HOUSEHOLD_OSMAR',
    holder: 'Família • Casal',
    purpose: 'Reserva Familiar & Gastos Pessoais',
    balance: 357458.0,
    color: 'indigo',
    active: true,
  },
  {
    id: 'inter_cnpj',
    name: 'Inter PJ (Fix Serviços)',
    bank_name: 'Banco Inter',
    entity_code: 'FIX_SERVICOS',
    holder: 'Titular: Osmar',
    purpose: 'Operação Fix Serviços MEI',
    balance: 100332.34,
    color: 'amber',
    active: true,
  },
  {
    id: 'caixa_pj',
    name: 'Caixa PJ (Facilita Vist.)',
    bank_name: 'Caixa Econômica',
    entity_code: 'FACILITA_VISTORIAS',
    holder: 'Titular: Vera',
    purpose: 'Operação Facilita Vistorias MEI',
    balance: 50331.02,
    color: 'rose',
    active: true,
  },
];

export default function StitchExecutiveDashboard() {
  // Navigation & Entity Filter State
  const [activeTab, setActiveTab] = useState<'all' | 'fix' | 'facilita' | 'pf'>('all');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'inter' | 'caixa' | 'nubank'>('all');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Modals Visibility State
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'providers' | 'accounts' | 'appearance' | 'integrations'>('providers');
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isFullStatementOpen, setIsFullStatementOpen] = useState(false);
  const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);
  const [selectedAssetModal, setSelectedAssetModal] = useState<string | null>(null);
  const [isCobrançaOpen, setIsCobrançaOpen] = useState(false);
  const [isDasModalOpen, setIsDasModalOpen] = useState(false);
  const [isRunwayModalOpen, setIsRunwayModalOpen] = useState(false);

  // Receipt Inspection State
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null);
  const [viewingTxId, setViewingTxId] = useState<string | null>(null);
  const [viewingInitialData, setViewingInitialData] = useState<any>(null);

  // Ledger Data State
  const [accounts, setAccounts] = useState<BankAccountItem[]>(DEFAULT_ACCOUNTS);
  const [totalAccountsBalance, setTotalAccountsBalance] = useState<number>(508121.36);
  const [ledgerTransactions, setLedgerTransactions] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<any>(null);
  const [dashboardRowLimit, setDashboardRowLimit] = useState<number>(6);

  // Chart Views State
  const [liquidityView, setLiquidityView] = useState<'compare' | 'history' | 'cumulative'>('compare');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(8); // Setembro (Mês Atual)
  const [selectedYearIdx, setSelectedYearIdx] = useState<number>(6); // 2026

  // Governance & Quick Actions State
  const [conjugalApproved, setConjugalApproved] = useState(false);
  const [selectedContact, setSelectedContact] = useState('Vera');
  const [transferAmount, setTransferAmount] = useState('3.500,00');
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);

  // Assistant & Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Olá, Osmar & Vera! Sou o assistente de inteligência financeira do Family Office. Como posso ajudar com os limites MEI, conciliações ou reservas familiares hoje?',
      timestamp: '09:41',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedEntityChat, setSelectedEntityChat] = useState('inter_cnpj');
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatAsdMode, setChatAsdMode] = useState<'none' | 'asd_80' | 'asd_strict'>('asd_80');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState<{ msgId: string; ref: string; value: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Helpers
  const formatBRL = (val: number) =>
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleOpenReceipt = (receiptId: string, txId?: string, initialData?: any) => {
    setViewingReceiptId(receiptId);
    setViewingTxId(txId || null);
    setViewingInitialData(initialData || null);
    setIsReceiptViewerOpen(true);
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/py/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
          setTotalAccountsBalance(data.total_cash);
        }
      }
    } catch (e) {
      console.error('Failed to load dynamic accounts:', e);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch('/api/py/statements/transactions?limit=150');
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

  // Theme synchronization
  useEffect(() => {
    const savedTheme = (localStorage.getItem('ofo-theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    fetchAccounts();
    loadTransactions();

    fetch('/api/py/health')
      .then((res) => setApiOnline(res.ok))
      .catch(() => setApiOnline(false));
  }, []);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('ofo-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // ASD mode synchronization
  const handleAsdModeChange = async (mode: 'none' | 'asd_80' | 'asd_strict') => {
    setChatAsdMode(mode);
    try {
      await fetch('/api/py/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_asd_mode: mode }),
      });
    } catch (err) {
      console.error('Failed to persist ASD mode:', err);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Keyboard shortcut listener for ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAssistantOpen) {
        setIsAssistantOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAssistantOpen]);

  useEffect(() => {
    if (isAssistantOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAssistantOpen]);

  // Quick PIX Handler
  const handleQuickTransfer = () => {
    const rawVal = parseFloat(transferAmount.replace(/\./g, '').replace(',', '.')) || 0;
    if (rawVal <= 0) return;

    const newTx = {
      id: `TX-PIX-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      entity_code: selectedContact === 'Vera' ? 'HOUSEHOLD_OSMAR' : 'FIX_SERVICOS',
      account_name: selectedContact === 'Vera' ? 'Nubank PF' : 'Banco Inter PJ',
      clean_description: selectedContact === 'Vera'
        ? 'Distribuição de Lucros Isenta MEI (Vera)'
        : `Pagamento PIX: ${selectedContact}`,
      counterparty: selectedContact,
      amount: selectedContact === 'Vera' ? rawVal : -rawVal,
      is_transfer: selectedContact === 'Vera',
      notes: `Transferência rápida autorizada via OpenFamilyOffice (${selectedContact})`,
      status: 'CONFIRMED',
    };

    setLedgerTransactions((prev) => [newTx, ...prev]);
    setTransferFeedback(`PIX de R$ ${transferAmount} para ${selectedContact} registrado no Livro Razão!`);
    setTimeout(() => setTransferFeedback(null), 5000);
  };

  // Conjugal Approval Handler
  const handleApproveConjugal = () => {
    setConjugalApproved(true);
    const newTx = {
      id: `TX-CONJUGAL-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      entity_code: 'HOUSEHOLD_OSMAR',
      account_name: 'Nubank PF',
      clean_description: 'Distribuição de Lucros Isenta MEI (Dupla Assinatura Concluída)',
      counterparty: 'Fix Serviços MEI → Nubank PF',
      amount: 3500.0,
      is_transfer: true,
      notes: 'Acordo Conjugal assinado por Osmar e Vera (Blindagem LC 123/2006)',
      status: 'CONFIRMED',
    };
    setLedgerTransactions((prev) => [newTx, ...prev]);
  };

  // Confirm Expense Card Handler
  const handleConfirmCard = async (card: ConfirmationCardData, msgId: string) => {
    try {
      const res = await fetch('/api/py/ledger/confirm-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: card.card_id,
          amount: card.amount,
          date: card.date,
          counterparty: card.counterparty,
          category: card.category,
          entity_code: card.entity_code,
          account_name: card.account_name,
          card_type: card.type,
          corrects_receipt: card.source_receipt || card.receipt_ref || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transaction) {
          setLedgerTransactions((prev) => [data.transaction, ...prev]);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.confirmationCard
              ? { ...m, confirmationCard: { ...m.confirmationCard, status: 'CONFIRMED' } }
              : m
          )
        );
      }
    } catch (e) {
      console.error('Failed to confirm expense card:', e);
    }
  };

  const handleDiscardCard = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.confirmationCard
          ? { ...m, confirmationCard: { ...m.confirmationCard, status: 'DISCARDED' } }
          : m
      )
    );
  };

  const handleCorrectReceipt = async (ref: string, value: string, msgId: string) => {
    const amount = parseFloat(value.replace(/\./g, '').replace(',', '.'));
    if (!ref || isNaN(amount) || amount <= 0) return;
    try {
      const res = await fetch(`/api/receipts/${encodeURIComponent(ref)}/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: amount,
          source: 'manual_ui',
          note: 'correção via botão do chat card',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transaction) {
          setLedgerTransactions((prev) => [data.transaction, ...prev]);
        }
        const fmt = (n: number) =>
          `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.confirmationCard
              ? {
                  ...m,
                  confirmationCard: {
                    ...m.confirmationCard,
                    status: 'CONFIRMED',
                    old_amount: m.confirmationCard.amount,
                    formatted_old_amount: m.confirmationCard.formatted_amount,
                    amount,
                    formatted_amount: fmt(amount),
                  },
                }
              : m
          )
        );
      }
    } catch (e) {
      console.error('Failed to correct receipt:', e);
    }
    setCorrectionDraft(null);
  };

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || chatInput).trim();
    if (!text && !attachedFile) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
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
            text: `Identifiquei o cupom "${uploadData.file_name}". Dados extraídos com sucesso. Confirme abaixo para registrar no Livro Razão:`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            confirmationCard: uploadData.confirmation_card,
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
          asd_mode: chatAsdMode,
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
          confirmationCard: data.confirmation_card,
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

  // Dynamic MEI calculation values
  const rev2026 = historySummary?.by_year?.['2026']?.total_revenue ?? 103632.34;
  const meiOsmarIssued = 58200.0;
  const meiOsmarMargin = 81000.0 - meiOsmarIssued;
  const meiOsmarPct = ((meiOsmarIssued / 81000.0) * 100).toFixed(1);
  const meiVeraIssued = 42132.34;
  const meiVeraMargin = 81000.0 - meiVeraIssued;
  const meiVeraPct = ((meiVeraIssued / 81000.0) * 100).toFixed(1);
  const avgMonthlyInflow = rev2026 / 9;
  const avgMonthlyOutflow = (historySummary?.by_year?.['2026']?.total_expenses ?? 10363.22) / 9;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0c1017] text-slate-800 dark:text-slate-100 transition-colors font-sans antialiased overflow-x-hidden selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-300">
      {/* 1. LEFT COMPACT FLOATING ICON SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setLedgerFilter={setLedgerFilter}
        liquidityView={liquidityView}
        setLiquidityView={setLiquidityView}
        setIsSettingsOpen={setIsSettingsOpen}
        apiOnline={apiOnline}
      />

      {/* 2. MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-20 pr-4 sm:pr-8 pl-4 sm:pl-6 py-5 pb-32 md:pb-8 max-w-full overflow-x-hidden">
        {/* Market Ticker Strip */}
        <div className="mb-4">
          <MarketTicker onSelectAsset={(id) => setSelectedAssetModal(id)} />
        </div>

        {/* Top Header Bar & Greeting */}
        <DashboardHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          theme={theme}
          handleThemeChange={handleThemeChange}
          setIsSettingsOpen={setIsSettingsOpen}
          setSettingsTab={setSettingsTab}
          setIsStatementOpen={setIsStatementOpen}
          setIsReceiptOpen={setIsReceiptOpen}
          setIsCobrançaOpen={setIsCobrançaOpen}
          setIsDasModalOpen={setIsDasModalOpen}
        />

        {/* 3. ROW 1: Multi-Entity Wallets + Liquidity Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <EntityWalletsCard
            accounts={accounts}
            totalAccountsBalance={totalAccountsBalance}
            formatBRL={formatBRL}
            setSettingsTab={setSettingsTab}
            setIsSettingsOpen={setIsSettingsOpen}
            setLedgerFilter={setLedgerFilter}
            setIsRunwayModalOpen={setIsRunwayModalOpen}
          />
          <BentoLiquidityChart
            liquidityView={liquidityView}
            setLiquidityView={setLiquidityView}
            selectedMonthIdx={selectedMonthIdx}
            setSelectedMonthIdx={setSelectedMonthIdx}
            selectedYearIdx={selectedYearIdx}
            setSelectedYearIdx={setSelectedYearIdx}
          />
        </div>

        {/* 4. ROW 2: MEI Monitor + Dual Governance + Quick PIX */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <MeiCeilingTracker
            meiOsmarPct={meiOsmarPct}
            meiOsmarIssued={meiOsmarIssued}
            meiOsmarMargin={meiOsmarMargin}
            meiVeraPct={meiVeraPct}
            meiVeraIssued={meiVeraIssued}
            meiVeraMargin={meiVeraMargin}
            formatBRL={formatBRL}
          />
          <ConjugalGovernanceCard
            conjugalApproved={conjugalApproved}
            handleApproveConjugal={handleApproveConjugal}
            handleSendMessage={handleSendMessage}
          />
          <QuickPixCard
            setIsAssistantOpen={setIsAssistantOpen}
            selectedContact={selectedContact}
            setSelectedContact={setSelectedContact}
            transferAmount={transferAmount}
            setTransferAmount={setTransferAmount}
            handleQuickTransfer={handleQuickTransfer}
            transferFeedback={transferFeedback}
          />
        </div>

        {/* 5. ROW 3: Transaction Ledger Table & Money Movement */}
        <RecentTransactionsTable
          ledgerTransactions={ledgerTransactions}
          ledgerFilter={ledgerFilter}
          setLedgerFilter={setLedgerFilter}
          dashboardRowLimit={dashboardRowLimit}
          setDashboardRowLimit={setDashboardRowLimit}
          setIsFullStatementOpen={setIsFullStatementOpen}
          setIsStatementOpen={setIsStatementOpen}
          setIsReceiptOpen={setIsReceiptOpen}
          handleOpenReceipt={handleOpenReceipt}
          formatBRL={formatBRL}
          avgMonthlyInflow={avgMonthlyInflow}
          avgMonthlyOutflow={avgMonthlyOutflow}
        />
      </div>

      {/* Floating Quick Action Button (Desktop Only) */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:block">
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="bg-indigo-600 text-white px-5 py-3 rounded-full shadow-pill flex items-center gap-2 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 border border-white/20"
        >
          <Camera className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wide uppercase">Anexar Cupom Fiscal</span>
          <span className="ml-1 text-xs bg-white text-indigo-600 font-extrabold px-1.5 py-1 rounded-full">
            1
          </span>
        </button>
      </div>

      {/* Conversational Assistant Drawer */}
      <AssistantDrawer
        isAssistantOpen={isAssistantOpen}
        setIsAssistantOpen={setIsAssistantOpen}
        chatAsdMode={chatAsdMode}
        handleAsdModeChange={handleAsdModeChange}
        messages={messages}
        loadingChat={loadingChat}
        chatEndRef={chatEndRef}
        copiedId={copiedId}
        handleCopyText={handleCopyText}
        correctionDraft={correctionDraft}
        setCorrectionDraft={setCorrectionDraft}
        handleCorrectReceipt={handleCorrectReceipt}
        handleConfirmCard={handleConfirmCard}
        handleDiscardCard={handleDiscardCard}
        handleSendMessage={handleSendMessage}
        selectedEntityChat={selectedEntityChat}
        setSelectedEntityChat={setSelectedEntityChat}
        attachedFile={attachedFile}
        setAttachedFile={setAttachedFile}
        cameraInputRef={cameraInputRef}
        fileInputRef={fileInputRef}
        chatInput={chatInput}
        setChatInput={setChatInput}
      />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setIsStatementOpen={setIsStatementOpen}
        setIsAssistantOpen={setIsAssistantOpen}
        theme={theme}
        handleThemeChange={handleThemeChange}
        setIsSettingsOpen={setIsSettingsOpen}
      />

      {/* Dynamic Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
        asdMode={chatAsdMode}
        onAsdModeChange={handleAsdModeChange}
        initialTab={settingsTab as any}
        onAccountsUpdated={fetchAccounts}
      />
      <StatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        onSuccess={() => loadTransactions()}
      />
      <ReceiptScannerModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onSuccess={() => {
          loadTransactions();
          setIsAssistantOpen(true);
        }}
      />
      <AssetDetailModal
        isOpen={!!selectedAssetModal}
        assetSymbol={selectedAssetModal || ''}
        onClose={() => setSelectedAssetModal(null)}
      />
      <CobrancaModal
        isOpen={isCobrançaOpen}
        onClose={() => setIsCobrançaOpen(false)}
      />
      <DasModal
        isOpen={isDasModalOpen}
        onClose={() => setIsDasModalOpen(false)}
      />
      <RunwayModal
        isOpen={isRunwayModalOpen}
        onClose={() => setIsRunwayModalOpen(false)}
        totalReserve={totalAccountsBalance}
      />
      <FullStatementModal
        isOpen={isFullStatementOpen}
        onClose={() => setIsFullStatementOpen(false)}
        transactions={ledgerTransactions}
        accounts={accounts}
        onOpenReceipt={handleOpenReceipt}
        onRefresh={() => loadTransactions()}
      />
      <ReceiptViewerModal
        isOpen={isReceiptViewerOpen}
        onClose={() => {
          setIsReceiptViewerOpen(false);
          setViewingReceiptId(null);
          setViewingTxId(null);
          setViewingInitialData(null);
        }}
        receiptId={viewingReceiptId || ''}
        transactionId={viewingTxId || undefined}
        initialData={viewingInitialData}
      />
    </div>
  );
}
