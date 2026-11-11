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
  Pencil,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Wallet,
  Sliders,
  Building2,
  ArrowUp,
  Check,
  Copy,
  Bot,
  Paperclip,
  Maximize2,
  Eye,
  Receipt,
} from 'lucide-react';
import SettingsModal, { BankAccountItem } from './components/SettingsModal';
import MarketTicker from './components/MarketTicker';
import StatementModal from './components/StatementModal';
import ReceiptScannerModal from './components/ReceiptScannerModal';
import AssetDetailModal from './components/AssetDetailModal';
import FullStatementModal from './components/FullStatementModal';
import ReceiptViewerModal from './components/ReceiptViewerModal';
import { CobrancaModal, DasModal, RunwayModal } from './components/ExecutiveModals';

interface ConfirmationCardData {
  card_id: string;
  type: string;
  amount: number;
  formatted_amount: string;
  date: string;
  counterparty: string;
  category: string;
  entity_code: string;
  entity_name: string;
  account_name: string;
  status: 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'DISCARDED';
  clean_description: string;
  raw_text?: string;
  old_amount?: number;
  formatted_old_amount?: string;
  receipt_ref?: string;
  source_receipt?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachmentName?: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  confirmationCard?: ConfirmationCardData;
}

const MONTHLY_LIQUIDITY_DATA = [
  { month: 'Jan', fullName: 'Janeiro', in2026: 14762.00, in2025: 12959.10, out2026: 1342.00, out2025: 1178.10, fixMei: 13562.00, rent: 1200.00, projected: false },
  { month: 'Fev', fullName: 'Fevereiro', in2026: 11910.01, in2025: 13885.30, out2026: 1082.72, out2025: 1262.30, fixMei: 10710.01, rent: 1200.00, projected: false },
  { month: 'Mar', fullName: 'Março', in2026: 13497.00, in2025: 11800.80, out2026: 1227.00, out2025: 1072.80, fixMei: 12297.00, rent: 1200.00, projected: false },
  { month: 'Abr', fullName: 'Abril', in2026: 9097.00, in2025: 16558.30, out2026: 827.00, out2025: 1505.30, fixMei: 7897.00, rent: 1200.00, projected: false },
  { month: 'Mai', fullName: 'Maio', in2026: 13338.04, in2025: 19594.30, out2026: 1212.54, out2025: 1781.30, fixMei: 12138.04, rent: 1200.00, projected: false },
  { month: 'Jun', fullName: 'Junho', in2026: 12190.20, in2025: 15417.60, out2026: 1108.20, out2025: 1401.60, fixMei: 10990.20, rent: 1200.00, projected: false },
  { month: 'Jul', fullName: 'Julho', in2026: 12208.90, in2025: 15512.20, out2026: 1109.90, out2025: 1410.20, fixMei: 11008.90, rent: 1200.00, projected: false },
  { month: 'Ago', fullName: 'Agosto (Pico 2026)', in2026: 16006.71, in2025: 12956.63, out2026: 1455.16, out2025: 1177.88, fixMei: 14806.71, rent: 1200.00, projected: false },
  { month: 'Set', fullName: 'Setembro (Mês Atual)', in2026: 10985.70, in2025: 11741.40, out2026: 998.70, out2025: 1067.40, fixMei: 9785.70, rent: 1200.00, projected: false },
  { month: 'Out', fullName: 'Outubro (Projeção)', in2026: 12500.00, in2025: 15152.50, out2026: 1136.00, out2025: 1377.50, fixMei: 11300.00, rent: 1200.00, projected: true },
  { month: 'Nov', fullName: 'Novembro (Projeção)', in2026: 13200.00, in2025: 13027.30, out2026: 1200.00, out2025: 1184.30, fixMei: 12000.00, rent: 1200.00, projected: true },
  { month: 'Dez', fullName: 'Dezembro (Projeção)', in2026: 14100.00, in2025: 13214.30, out2026: 1280.00, out2025: 1201.30, fixMei: 12900.00, rent: 1200.00, projected: true },
];

const HISTORICAL_7_YEARS = [
  { year: '2020', gross: 90280.31, fixMei: 78880.31, rent: 11400.00, label: 'R$ 90,3k', pct: '57%' },
  { year: '2021', gross: 126706.00, fixMei: 99116.00, rent: 10500.00, label: 'R$ 126,7k', pct: '81%' },
  { year: '2022', gross: 150177.00, fixMei: 128717.00, rent: 7560.00, label: 'R$ 150,2k', pct: '96%' },
  { year: '2023', gross: 138005.00, fixMei: 126205.00, rent: 6000.00, label: 'R$ 138,0k', pct: '88%' },
  { year: '2024', gross: 150510.10, fixMei: 144455.10, rent: 5550.00, label: 'R$ 150,5k', pct: '96%' },
  { year: '2025', gross: 156199.75, fixMei: 150199.75, rent: 6000.00, label: 'R$ 156,2k', pct: '100%', peak: true },
  { year: '2026', gross: 103632.34, fixMei: 100332.34, rent: 3300.00, label: 'R$ 103,6k', pct: '66%', current: true },
];

function buildSmoothSpline(pts: [number, number][]): string {
  if (!pts || pts.length === 0) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = Number((p1[0] + (p2[0] - p0[0]) / 6).toFixed(1));
    const cp1y = Number((p1[1] + (p2[1] - p0[1]) / 6).toFixed(1));
    const cp2x = Number((p2[0] - (p3[0] - p1[0]) / 6).toFixed(1));
    const cp2y = Number((p2[1] - (p3[1] - p1[1]) / 6).toFixed(1));
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

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
  const [activeTab, setActiveTab] = useState<'all' | 'fix' | 'facilita' | 'pf'>('all');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'inter' | 'caixa' | 'nubank'>('all');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'providers' | 'accounts' | 'appearance' | 'limits' | 'governance'>('accounts');
  const [accounts, setAccounts] = useState<BankAccountItem[]>(DEFAULT_ACCOUNTS);
  const [totalAccountsBalance, setTotalAccountsBalance] = useState<number>(508121.36);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [ledgerTransactions, setLedgerTransactions] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<any>(null);
  const [isFullStatementOpen, setIsFullStatementOpen] = useState(false);
  const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false);
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null);
  const [viewingTxId, setViewingTxId] = useState<string | null>(null);
  const [viewingInitialData, setViewingInitialData] = useState<any>(null);
  const [dashboardRowLimit, setDashboardRowLimit] = useState<number>(6);

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
          if (typeof data.total_balance === 'number') {
            setTotalAccountsBalance(data.total_balance);
          }
        }
      }
    } catch (err) {
      console.error('Falha ao sincronizar contas bancárias:', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

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

  // Interactive Card & Navigation State
  const [liquidityView, setLiquidityView] = useState<'compare' | 'history' | 'cumulative'>('compare');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(8); // default to Setembro (index 8)
  const [selectedYearIdx, setSelectedYearIdx] = useState<number>(6); // default to 2026 (index 6)
  const [conjugalApproved, setConjugalApproved] = useState(false);
  const [selectedContact, setSelectedContact] = useState('Vera');
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);
  const [isCobrançaOpen, setIsCobrançaOpen] = useState(false);
  const [isDasModalOpen, setIsDasModalOpen] = useState(false);
  const [isRunwayModalOpen, setIsRunwayModalOpen] = useState(false);
  const [meiDetailEntity, setMeiDetailEntity] = useState<'fix' | 'facilita' | null>(null);
  const [activeMonthFilter, setActiveMonthFilter] = useState<string | null>(null);

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
      text: 'Assistente financeiro ativo. Consulte saldos consolidados, tetos fiscais MEI, fluxo de caixa ou anexe um comprovante para conciliação imediata.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedEntityChat, setSelectedEntityChat] = useState('inter_cnpj');
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatAsdMode, setChatAsdMode] = useState<'none' | 'asd_80' | 'asd_strict'>('asd_80');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/py/settings/general')
      .then((r) => r.json())
      .then((d) => {
        if (d.asd_mode) setChatAsdMode(d.asd_mode);
      })
      .catch(() => {});
  }, []);

  const handleAsdModeChange = async (mode: 'none' | 'asd_80' | 'asd_strict') => {
    setChatAsdMode(mode);
    try {
      await fetch('/api/py/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asd_mode: mode }),
      });
    } catch (e) {
      console.error('Falha ao salvar modo ASD:', e);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Quick transfer state
  const [transferAmount, setTransferAmount] = useState('3.500,00');

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

        // Mark card as CONFIRMED in chat
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.confirmationCard) {
              return {
                ...m,
                confirmationCard: { ...m.confirmationCard, status: 'CONFIRMED' },
              };
            }
            return m;
          })
        );
      }
    } catch (e) {
      console.error('Failed to confirm expense card:', e);
    }
  };

  const handleDiscardCard = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.confirmationCard) {
          return {
            ...m,
            confirmationCard: { ...m.confirmationCard, status: 'DISCARDED' },
          };
        }
        return m;
      })
    );
  };

  // Phase 8b: inline value correction for cards linked to a stored receipt
  const [correctionDraft, setCorrectionDraft] = useState<{ msgId: string; ref: string; value: string } | null>(null);

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
      } else {
        console.error('Receipt correction failed:', res.status);
      }
    } catch (e) {
      console.error('Failed to correct receipt:', e);
    }
    setCorrectionDraft(null);
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

  // Impeccable Motion: Close assistant drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAssistantOpen) {
        setIsAssistantOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAssistantOpen]);

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

  const filteredLedgerTxs = ledgerTransactions.filter((tx) => {
    if (ledgerFilter === 'inter') return tx.entity_code === 'FIX_SERVICOS' || tx.account_name?.toLowerCase().includes('inter');
    if (ledgerFilter === 'caixa') return tx.entity_code === 'FACILITA_VISTORIAS' || tx.account_name?.toLowerCase().includes('caixa');
    if (ledgerFilter === 'nubank') return tx.entity_code === 'HOUSEHOLD_OSMAR' || tx.account_name?.toLowerCase().includes('nubank');
    return true;
  });
  const displayedLedgerTxs = filteredLedgerTxs.slice(0, dashboardRowLimit);

  return (
    <div className="min-h-screen flex bg-[#F4F6FB] dark:bg-[#0c1017] text-slate-900 dark:text-[#f8fafc] font-sans antialiased transition-colors duration-200">
      {/* 1. LEFT COMPACT FLOATING ICON SIDEBAR (Fixed and always visible on desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-white/95 dark:bg-[#0c1017]/95 backdrop-blur-md flex flex-col items-center py-6 px-3 z-40 shrink-0 select-none border-r border-slate-200/80 dark:border-white/5 h-screen justify-between">
        <div className="flex flex-col items-center w-full">
          {/* Brand Emblem */}
          <div
            onClick={() => setActiveTab('all')}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/10 shadow-lg flex items-center justify-center mb-8 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#1a2232] transition group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
              O
            </div>
          </div>

          {/* Nav Items with real active states */}
          <nav className="flex flex-col items-center gap-4 w-full">
            <button
              title="Visão Geral / Dashboard"
              onClick={() => setActiveTab('all')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-pill scale-105'
                  : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
              }`}
            >
              <Home className="w-5 h-5" />
            </button>

            <button
              title="Livro Razão & Conciliação"
              onClick={() => {
                setActiveTab('all');
                document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
            >
              <FileText className="w-5 h-5" />
            </button>

            <button
              title="Cartões & Contas Multientidade"
              onClick={() => {
                setActiveTab('all');
                setLedgerFilter('inter');
                document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
            >
              <CreditCard className="w-5 h-5" />
            </button>

            <button
              title="Curva Patrimonial & Analytics"
              onClick={() => {
                setLiquidityView('history');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                liquidityView === 'history'
                  ? 'bg-indigo-600 text-white shadow-pill scale-105'
                  : 'bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>

            <button
              title="Governança Conjugal (Dual-Signature)"
              onClick={() => {
                document.getElementById('governance-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* Bottom Settings & Status Pin - ALWAYS visible and fixed at bottom */}
        <div className="flex flex-col items-center gap-3 pb-2 w-full">
          <button
            title="Configurações & Provedores de IA"
            onClick={() => setIsSettingsOpen(true)}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161c28] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1f2738] border border-slate-200/80 dark:border-white/5 shadow-sm flex items-center justify-center transition hover:scale-105"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div
            className={`w-2.5 h-2.5 rounded-full ring-4 ${
              apiOnline
                ? 'bg-emerald-400 ring-emerald-500/20'
                : 'bg-amber-400 ring-amber-500/20'
            }`}
            title={apiOnline ? 'Conexão Local Segura Ativa' : 'Verificando Conexão'}
          />
        </div>
      </aside>

      {/* 2. MAIN VIEWPORT (Offset by md:ml-20 so it never overlaps fixed sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-20 pr-4 sm:pr-8 pl-4 sm:pl-6 py-5 pb-32 md:pb-8 max-w-full overflow-x-hidden">
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
              <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-slate-100 dark:bg-[#212a3d] text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-white/10">
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
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>Ambiente Privado</span>
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
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                v1.0 • Privado
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium text-pretty">
              Gestão Patrimonial Consolidada • 2 CNPJs MEI (Titularidades Separadas) + Finanças Familiares (PF) • Processamento Local e Privado
            </p>
          </div>

          {/* Quick Action Pill Group */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs no-scrollbar">
            <button
              onClick={() => {
                setSettingsTab('accounts');
                setIsSettingsOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
            >
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span>Bancos & Saldos</span>
            </button>
            <button
              onClick={() => setIsStatementOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white rounded-2xl font-bold shadow-pill hover:bg-indigo-500 transition whitespace-nowrap active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Extrato OFX / CSV</span>
            </button>
            <button
              onClick={() => setIsReceiptOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
            >
              <Camera className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>Escanear Cupom</span>
            </button>
            <button
              onClick={() => {
                document.getElementById('quick-transfer-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
            >
              <Send className="w-4 h-4 text-slate-400" />
              <span>Enviar PIX</span>
            </button>
            <button
              onClick={() => setIsCobrançaOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
            >
              <ArrowDownLeft className="w-4 h-4 text-slate-400" />
              <span>Cobrança</span>
            </button>
            <button
              onClick={() => setIsDasModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-white dark:bg-[#161c28] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-semibold shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#1f2738] transition whitespace-nowrap active:scale-95"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Pagar DAS / Fatura</span>
            </button>
          </div>
        </div>

        {/* 3. MAIN BENTO GRID ROW 1: Multi-Entity Stacked Cards + Flow Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* LEFT CARD: Stacked Entity Wallets (Orbix Studio Pocket Wallet) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between relative overflow-hidden">
            <div>
              {/* Header with Title and "Ajustar Saldos / Bancos" button */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Bancos & Contas Ativas</h2>
                </div>
                <button
                  onClick={() => {
                    setSettingsTab('accounts');
                    setIsSettingsOpen(true);
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  title="Configurar bancos e ajustar saldos reais"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Ajustar / Bancos</span>
                </button>
              </div>

              {/* Entity Accounts List - Dynamically rendered from accounts state */}
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {accounts.map((acct) => (
                  <div
                    key={acct.id}
                    onClick={() => {
                      if (acct.id.includes('inter')) setLedgerFilter('inter');
                      else if (acct.id.includes('caixa')) setLedgerFilter('caixa');
                      else if (acct.id.includes('nubank')) setLedgerFilter('nubank');
                      else setLedgerFilter('all');
                      document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    title={`Filtrar lançamentos de ${acct.name}`}
                    className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          acct.color === 'indigo'
                            ? 'bg-indigo-500'
                            : acct.color === 'amber'
                            ? 'bg-amber-500'
                            : acct.color === 'purple'
                            ? 'bg-purple-500'
                            : acct.color === 'rose'
                            ? 'bg-rose-500'
                            : acct.color === 'emerald'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{acct.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {acct.holder} • {acct.bank_name}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBRL(acct.balance)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sub-header status bar */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5 mt-2">
                <span className="font-medium text-slate-600 dark:text-slate-300">{accounts.length} contas configuradas</span>
                <button
                  onClick={() => {
                    setSettingsTab('accounts');
                    setIsSettingsOpen(true);
                  }}
                  className="px-2 py-1 rounded-full bg-slate-100 dark:bg-white/5 font-semibold border border-slate-200 dark:border-white/10 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-white/10 transition"
                >
                  + Adicionar / Corrigir
                </button>
              </div>
            </div>

            {/* Balance Metric Display below cards */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <span>Saldo Consolidado das Contas</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/25 px-2 py-0.5 rounded-full text-[11px]">
                  {accounts.length} contas
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                {formatBRL(totalAccountsBalance)}
              </div>
              <div
                onClick={() => setIsRunwayModalOpen(true)}
                title="Clique para abrir o Simulador de Autonomia & Runway Familiar"
                className="flex items-center justify-between mt-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#121722] hover:bg-indigo-50/50 dark:hover:bg-[#1a2232] cursor-pointer p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 transition"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Runway Familiar: <strong className="text-slate-900 dark:text-white font-semibold">44,1 meses</strong>
                </span>
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  Simular →
                </span>
              </div>
            </div>
          </div>

          {/* CENTER / RIGHT HERO: Overview Multi-Curved Liquidity Chart */}
          <div className="lg:col-span-8 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Visão Geral de Liquidez & Reservas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {liquidityView === 'compare' && 'Evolução do Fluxo de Caixa Consolidado: 2026 vs. Histórico de 2025'}
                  {liquidityView === 'history' && 'Série Histórica Consolidada (2020 - 2026): R$ 907.352,00 Faturamento Real'}
                  {liquidityView === 'cumulative' && 'Evolução do Patrimônio Líquido Total e Reservas de Autonomia Familiar'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121722] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs">
                  <button
                    onClick={() => setLiquidityView('compare')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      liquidityView === 'compare'
                        ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    2026 vs 2025
                  </button>
                  <button
                    onClick={() => setLiquidityView('history')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      liquidityView === 'history'
                        ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    7 Anos (2020-2026)
                  </button>
                  <button
                    onClick={() => setLiquidityView('cumulative')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      liquidityView === 'cumulative'
                        ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Patrimônio
                  </button>
                </div>
              </div>
            </div>

            {/* View 1: 2026 vs 2025 Month-by-Month Real Consolidated Cashflow */}
            {liquidityView === 'compare' && (() => {
              const pts2026: [number, number][] = MONTHLY_LIQUIDITY_DATA.map((d, i) => [
                Number((35 + i * (630 / 11)).toFixed(1)),
                Number((150 - (d.in2026 / 22000) * 125).toFixed(1)),
              ]);
              const pts2025: [number, number][] = MONTHLY_LIQUIDITY_DATA.map((d, i) => [
                Number((35 + i * (630 / 11)).toFixed(1)),
                Number((150 - (d.in2025 / 22000) * 125).toFixed(1)),
              ]);

              const spline2026 = buildSmoothSpline(pts2026);
              const spline2025 = buildSmoothSpline(pts2025);
              const fill2026 = `${spline2026} L 665,155 L 35,155 Z`;
              const fill2025 = `${spline2025} L 665,155 L 35,155 Z`;

              const currentMonth = MONTHLY_LIQUIDITY_DATA[selectedMonthIdx] ?? MONTHLY_LIQUIDITY_DATA[8];
              const curX = pts2026[selectedMonthIdx]?.[0] ?? 493.2;
              const curY26 = pts2026[selectedMonthIdx]?.[1] ?? 87.6;
              const curY25 = pts2025[selectedMonthIdx]?.[1] ?? 88.3;
              const diff = currentMonth.in2026 - currentMonth.in2025;
              const diffPct = (diff / currentMonth.in2025) * 100;

              return (
                <div key="view-compare" className="animate-view-fade">
                  <div className="relative w-full h-56 pt-2 select-none">
                    {/* Dynamic Inspection Badge */}
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1a2232]/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-white/15 rounded-2xl px-4 py-2 z-20 flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                            {currentMonth.fullName}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                            R$ {currentMonth.in2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span
                            className={`text-xs font-bold px-1.5 py-1 rounded ${
                              diff >= 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                            }`}
                          >
                            {diff >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`} vs 2025
                          </span>
                        </div>
                      </div>

                      <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                        <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">2025 Mesmo Mês</span>
                        <span className="font-mono font-semibold text-xs text-amber-700 dark:text-amber-400">
                          R$ {currentMonth.in2025.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="border-l border-slate-200 dark:border-white/10 pl-3 hidden sm:block">
                        <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Origem 2026</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                          MEI: <strong>R$ {currentMonth.fixMei.toLocaleString('pt-BR')}</strong> • Aluguel: <strong>R$ {currentMonth.rent.toLocaleString('pt-BR')}</strong>
                        </span>
                      </div>
                    </div>

                    <svg className="w-full h-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 700 170">
                      <defs>
                        <linearGradient id="blueGlowDark" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="orangeGlowDark" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#FB923C" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#FB923C" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines & Values */}
                      <line stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" opacity={0.3} x1="30" x2="670" y1="35" y2="35" />
                      <line stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" opacity={0.3} x1="30" x2="670" y1="75" y2="75" />
                      <line stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" opacity={0.3} x1="30" x2="670" y1="115" y2="115" />
                      <line stroke="#334155" strokeWidth="1" opacity={0.4} x1="30" x2="670" y1="155" y2="155" />

                      {/* Area Fills */}
                      <path d={fill2025} fill="url(#orangeGlowDark)" />
                      <path d={fill2026} fill="url(#blueGlowDark)" />

                      {/* 2025 Historical Curve */}
                      <path
                        d={spline2025}
                        stroke="#FB923C"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                        strokeWidth="2.5"
                      />

                      {/* 2026 Active Curve */}
                      <path
                        d={spline2026}
                        stroke="#6366f1"
                        strokeLinecap="round"
                        strokeWidth="3.2"
                      />

                      {/* Vertical Hairline Guide on Active Month */}
                      <line
                        x1={curX}
                        x2={curX}
                        y1="25"
                        y2="155"
                        stroke="#6366f1"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                        opacity={0.8}
                      />

                      {/* Active Month Data Dots */}
                      <circle cx={curX} cy={curY25} fill="#FB923C" r="5" stroke="#161c28" strokeWidth="2" />
                      <circle cx={curX} cy={curY26} fill="#6366f1" r="6.5" stroke="#ffffff" strokeWidth="2.5" />

                      {/* Column Hit Areas for Mouse Hover */}
                      {MONTHLY_LIQUIDITY_DATA.map((_, i) => {
                        const x = 35 + i * (630 / 11);
                        return (
                          <rect
                            key={`hit-${i}`}
                            x={x - 25}
                            y="15"
                            width="50"
                            height="145"
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setSelectedMonthIdx(i)}
                            onClick={() => setSelectedMonthIdx(i)}
                          />
                        );
                      })}
                    </svg>
                  </div>

                  {/* 12 Months Interactive Label Bar */}
                  <div className="flex justify-between items-center text-xs mt-2 px-1">
                    {MONTHLY_LIQUIDITY_DATA.map((item, idx) => (
                      <button
                        key={item.month}
                        onMouseEnter={() => setSelectedMonthIdx(idx)}
                        onClick={() => setSelectedMonthIdx(idx)}
                        className={`px-2 py-1 rounded-xl transition-all font-semibold ${
                          selectedMonthIdx === idx
                            ? 'bg-indigo-600 text-white shadow-sm scale-105'
                            : item.month === 'Set'
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold underline underline-offset-4'
                            : item.projected
                            ? 'text-slate-400 italic'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title={`${item.fullName}: R$ ${item.in2026.toLocaleString('pt-BR')}`}
                      >
                        {item.month}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* View 2: 7 Anos Historical Evolution (2020-2026) */}
            {liquidityView === 'history' && (() => {
              const activeYear = HISTORICAL_7_YEARS[selectedYearIdx] ?? HISTORICAL_7_YEARS[6];
              return (
                <div key="view-history" className="animate-view-fade">
                  <div className="relative w-full h-56 pt-2 flex items-end justify-between gap-3 px-2">
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1a2232]/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-white/15 rounded-2xl px-4 py-2 z-20 flex flex-wrap items-center gap-4 text-xs pointer-events-auto">
                      <div>
                        <span className="text-xs text-slate-600 dark:text-slate-300 block font-semibold uppercase tracking-wider">
                          Exercício {activeYear.year} {activeYear.peak ? '(Pico Histórico)' : activeYear.current ? '(YTD Setembro)' : ''}
                        </span>
                        <strong className="font-mono text-emerald-700 dark:text-emerald-400 text-sm sm:text-base">
                          R$ {activeYear.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                        <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Média Mensal</span>
                        <strong className="font-mono text-indigo-700 dark:text-indigo-400 text-xs">
                          R$ {(activeYear.gross / (activeYear.current ? 9 : 12)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                        </strong>
                      </div>
                      <div className="border-l border-slate-200 dark:border-white/10 pl-3 hidden sm:block">
                        <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Divisão de Faturamento</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                          Fix MEI: <strong>R$ {activeYear.fixMei.toLocaleString('pt-BR')}</strong> • Aluguel: <strong>R$ {activeYear.rent.toLocaleString('pt-BR')}</strong>
                        </span>
                      </div>
                    </div>

                    {HISTORICAL_7_YEARS.map((bar, idx) => (
                      <div
                        key={bar.year}
                        onMouseEnter={() => setSelectedYearIdx(idx)}
                        onClick={() => setSelectedYearIdx(idx)}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                      >
                        <span className={`text-xs font-mono mb-1 font-semibold transition ${selectedYearIdx === idx ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                          {bar.label}
                        </span>
                        <div
                          style={{ height: bar.pct }}
                          className={`w-full rounded-t-2xl transition-all ${
                            selectedYearIdx === idx
                              ? 'bg-indigo-600 dark:bg-indigo-500 scale-105'
                              : bar.peak
                              ? 'bg-amber-600 dark:bg-amber-500'
                              : 'bg-slate-200 dark:bg-[#1e2638] group-hover:bg-slate-300 dark:group-hover:bg-[#28334a]'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 px-2">
                    {HISTORICAL_7_YEARS.map((bar, idx) => (
                      <button
                        key={bar.year}
                        onClick={() => setSelectedYearIdx(idx)}
                        onMouseEnter={() => setSelectedYearIdx(idx)}
                        className={`transition-all ${
                          selectedYearIdx === idx
                            ? 'text-indigo-600 dark:text-indigo-400 font-extrabold underline underline-offset-4 scale-105'
                            : bar.peak
                            ? 'text-amber-600 dark:text-amber-400 font-bold'
                            : 'hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {bar.year}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* View 3: Patrimônio Acumulado & Reservas */}
            {liquidityView === 'cumulative' && (
              <div key="view-cumulative" className="animate-view-fade">
                <div className="relative w-full h-56 pt-2">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1a2232]/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-white/15 rounded-2xl p-2.5 z-20 flex gap-4 text-xs pointer-events-none text-slate-900 dark:text-white">
                    <div>
                      <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Patrimônio Líquido Acumulado</span>
                      <strong className="font-mono text-emerald-700 dark:text-emerald-400 text-sm">R$ 508.121,36</strong>
                    </div>
                    <div className="border-l border-slate-200 dark:border-white/10 pl-3">
                      <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">Autonomia Familiar</span>
                      <strong className="font-mono text-indigo-700 dark:text-indigo-400 text-sm">44,1 Meses</strong>
                    </div>
                  </div>

                  <svg className="w-full h-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 700 170">
                    <defs>
                      <linearGradient id="patrimonioGlow" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="30" y2="30" />
                    <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="70" y2="70" />
                    <line stroke="#212a3d" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="110" y2="110" />
                    <line stroke="#212a3d" strokeWidth="1" x1="0" x2="700" y1="150" y2="150" />

                    <path
                      d="M 0,140 C 100,130 200,105 300,90 C 400,75 500,45 600,30 L 700,20 L 700,160 L 0,160 Z"
                      fill="url(#patrimonioGlow)"
                    />
                    <path
                      d="M 0,140 C 100,130 200,105 300,90 C 400,75 500,45 600,30 L 700,20"
                      stroke="#10b981"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                    <circle cx="700" cy="20" fill="#10b981" r="6" stroke="#161c28" strokeWidth="2.5" />
                  </svg>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 px-2">
                  <span>2020: R$ 42,1k</span>
                  <span>2022: R$ 168,5k</span>
                  <span>2024: R$ 342,0k</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold underline underline-offset-4">
                    Hoje: R$ 508.121,36 (Protegido)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. MIDDLE ROW: MEI Ceiling Monitor + Dual Signature + Quick Contacts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* CARD 1: MEI Ceiling Monitor (Orbix Spending Limit Style) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Monitor de Teto MEI • LC 123/2006</h2>
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
                {/* Clean continuous progress bar */}
                <div className="w-full bg-slate-100 dark:bg-[#121722] rounded-full h-2.5 overflow-hidden border border-slate-200/80 dark:border-white/10 my-2">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, parseFloat(meiOsmarPct) || 0))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
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
                {/* Clean continuous progress bar */}
                <div className="w-full bg-slate-100 dark:bg-[#121722] rounded-full h-2.5 overflow-hidden border border-slate-200/80 dark:border-white/10 my-2">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, parseFloat(meiVeraPct) || 0))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  <span>Emitido: {formatBRL(meiVeraIssued)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Margem: {formatBRL(meiVeraMargin)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Status LC 123/2006:</span>
              <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                Segregação Conjugal Ativa • LC 123/2006
              </span>
            </div>
          </div>

          {/* CARD 2: Dual-Signature Desk (Governança Conjugal Osmar & Vera) */}
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

          {/* CARD 3: Quick Transfer & Frequent Contacts (Orbix Style) */}
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
        </div>

        {/* 5. LOWER ROW: Transaction Ledger & Fiscal Reconciliation + Money Movement Column Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* TRANSACTION TABLE: Clean & Refined Ledger */}
          <div id="ledger-section" className="lg:col-span-8 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Livro Razão & Conciliação Fiscal Recente</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">Conciliação bancária com comprovantes e recibos fiscais</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Account Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#121722] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs overflow-x-auto no-scrollbar max-w-full">
                    <button
                      onClick={() => setLedgerFilter('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        ledgerFilter === 'all'
                          ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setLedgerFilter('inter')}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        ledgerFilter === 'inter'
                          ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Inter PJ (Fix)
                    </button>
                    <button
                      onClick={() => setLedgerFilter('caixa')}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        ledgerFilter === 'caixa'
                          ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Caixa PJ (Vistorias)
                    </button>
                    <button
                      onClick={() => setLedgerFilter('nubank')}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        ledgerFilter === 'nubank'
                          ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Nubank PF
                    </button>
                  </div>

                  {/* Visible Row Count Controls */}
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#121722] p-1 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Ver:</span>
                    <button
                      onClick={() => setDashboardRowLimit(6)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition text-xs ${
                        dashboardRowLimit === 6
                          ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Exibir 6 lançamentos"
                    >
                      6
                    </button>
                    <button
                      onClick={() => setDashboardRowLimit(15)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition text-xs ${
                        dashboardRowLimit === 15
                          ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Exibir 15 lançamentos"
                    >
                      15
                    </button>
                    <button
                      onClick={() => setDashboardRowLimit(9999)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition text-xs ${
                        dashboardRowLimit > 50
                          ? 'bg-white dark:bg-[#212a3d] text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Exibir todos os lançamentos no card"
                    >
                      Todas
                    </button>
                  </div>

                  {/* Dedicated Full Statement Window Trigger */}
                  <button
                    onClick={() => setIsFullStatementOpen(true)}
                    title="Abrir extrato completo com pesquisa textual, filtros avançados e conferência visual de comprovantes"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Extrato Completo</span>
                    <span className="sm:hidden">Extrato</span>
                  </button>

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

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs">
                      <th className="pb-3 pl-1">Data / Hora</th>
                      <th className="pb-3">Entidade</th>
                      <th className="pb-3">Descrição & Contraparte</th>
                      <th className="pb-3 text-right">Valor</th>
                      <th className="pb-3">Documento Fiscal</th>
                      <th className="pb-3 text-center">Comprovante / Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                    {displayedLedgerTxs.length > 0 ? (
                      displayedLedgerTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-1 rounded-md font-semibold text-xs border ${
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
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                              {tx.counterparty || tx.raw_description}
                            </div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}>
                              {tx.amount >= 0 ? '+' : ''}
                              R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {tx.is_transfer ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                PJ ↔ PF Neutralizada
                              </span>
                            ) : (
                              tx.notes ? tx.notes.split(' ')[0] : 'Conciliado'
                            )}
                          </td>
                          <td className="py-3 text-center whitespace-nowrap">
                            {tx.has_receipt ? (
                              <div className="relative inline-block text-left group/receipt">
                                <button
                                  onClick={() => handleOpenReceipt(tx.receipt_id || tx.id, tx.id, tx)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition shadow-2xs active:scale-95"
                                  title="Ver cupom fiscal associado a este lançamento"
                                >
                                  <Camera className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                  <span>Ver Cupom</span>
                                </button>

                                {/* Hover preview tooltip card */}
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/receipt:flex flex-col z-50 w-64 p-3 bg-white dark:bg-[#1b2230] rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 pointer-events-none transition-all">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/5 mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cupom Fiscal</span>
                                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                      R$ {Number(tx.receipt_amount || Math.abs(tx.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  
                                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#121722] border border-slate-200/60 dark:border-white/5 flex items-center justify-center">
                                    <img
                                      src={tx.receipt_image_url || `/api/py/receipts/${tx.receipt_id || tx.id}/image`}
                                      alt="Cupom Fiscal"
                                      className="w-full h-full object-contain p-1"
                                    />
                                  </div>

                                  <div className="mt-2 text-left">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {tx.receipt_merchant || tx.counterparty || 'Comprovante Fiscal'}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-0.5">
                                      <span>{tx.receipt_date || tx.date}</span>
                                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Clique para ampliar →</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-500/30">
                              Inter PJ
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-900 dark:text-white font-semibold">Recebimento Fix Serviços MEI 09/2026</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Faturamento Bruto Fix Serviços MEI (Osmar)</div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 9.987,00</td>
                          <td className="py-3 font-mono text-xs text-slate-500 dark:text-slate-400">NFS-e #09/2026</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                            </span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-08-15</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-500/30">
                              Inter PJ
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-900 dark:text-white font-semibold">Recebimento Fix Serviços MEI 08/2026 (Pico)</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Faturamento Bruto Fix Serviços MEI</div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 14.551,55</td>
                          <td className="py-3 font-mono text-xs text-slate-500 dark:text-slate-400">NFS-e #08/2026</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                            </span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-500/30">
                              Nubank PF
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-900 dark:text-white font-semibold">Distribuição de Lucros Isenta (Vera)</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Inter PJ → Nubank PF (Neutralizada)</div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 499,35</td>
                          <td className="py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">PJ ↔ PF Neutralizada</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> OK
                            </span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                          <td className="py-3 pl-1 font-mono text-slate-500 dark:text-slate-400">2026-09-18</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-500/30">
                              Nubank PF
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="text-slate-900 dark:text-white font-semibold">Distribuição de Lucros Isenta (Osmar)</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Inter PJ → Nubank PF (Neutralizada)</div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">+R$ 499,35</td>
                          <td className="py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">PJ ↔ PF Neutralizada</td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
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

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/80 dark:border-white/10 mt-2">
              <span>
                {filteredLedgerTxs.length > 0
                  ? `Exibindo ${displayedLedgerTxs.length} de ${filteredLedgerTxs.length} lançamentos (${ledgerTransactions.length} no total)`
                  : 'Nenhum lançamento nesta conta'}
              </span>
              <button
                onClick={() => setIsFullStatementOpen(true)}
                className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Abrir Extrato Completo com Pesquisa & Filtros →</span>
              </button>
            </div>
          </div>

          {/* MONEY MOVEMENT: Soft Column Bar Chart (Orbix Studio Style) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card dark:shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Movimentação Financeira</h2>
                <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-[#1a2232] border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-[#212a3d] text-slate-700 dark:text-slate-300 transition">
                  <span>Últimos 30 dias</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
                </button>
              </div>

              {/* In vs Out Header */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#121722] p-3 rounded-2xl border border-slate-200/60 dark:border-white/5 mb-4">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Entradas (Média Mensal 2026)</span>
                  <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(avgMonthlyInflow)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Saídas (Média Retiradas)</span>
                  <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                    {formatBRL(avgMonthlyOutflow)}
                  </span>
                </div>
              </div>

              {/* Soft Column Bar Chart with Glow Highlight & Floating Pill (Orbix Style) */}
              <div className="relative w-full h-36 flex items-end justify-between gap-1.5 pt-7 px-1">
                <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200 dark:bg-white/10" />

                {/* Floating Date Pill over Highlight Pillar (September 2026) */}
                <div className="absolute top-0 left-[72%] -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-mono font-bold px-2.5 py-1 rounded-full shadow-lg pointer-events-none flex items-center gap-1 border border-slate-700 dark:border-white/20">
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
                <div title="Set 2026: R$ 9.987,00 (Último mês)" className="w-full bg-indigo-600 dark:bg-indigo-500 rounded-t-xl h-[68%] relative cursor-pointer">
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
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 px-2 py-1 rounded-full">
                  Teto MEI Regular
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
          <span className="ml-1 text-xs bg-white text-indigo-600 font-extrabold px-1.5 py-1 rounded-full">
            1
          </span>
        </button>
      </div>

      {/* 7. CHATGPT & META AI-INSPIRED CONVERSATIONAL ASSISTANT */}
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
                              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Origem</span>
                              <strong className="text-xs text-slate-900 dark:text-slate-100 font-semibold">{msg.confirmationCard.entity_name}</strong>
                            </div>
                            <div className="col-span-2 pt-1.5 border-t border-slate-200/60 dark:border-white/5">
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
                ref={cameraInputRef}
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
                ref={fileInputRef}
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
          <span className="text-xs mt-0.5">Início</span>
        </button>

        <button
          onClick={() => setIsStatementOpen(true)}
          className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          title="Extratos & Conciliação (OFX/CSV)"
        >
          <FileText className="w-5 h-5" />
          <span className="text-xs mt-0.5">Extrato</span>
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
          <span className="text-xs mt-0.5">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          title="Configurações & Provedores"
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs mt-0.5">Ajustes</span>
        </button>
      </nav>

      {/* 5. SETTINGS & AI PROVIDERS MODAL */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
        asdMode={chatAsdMode}
        onAsdModeChange={handleAsdModeChange}
        initialTab={settingsTab}
        onAccountsUpdated={fetchAccounts}
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

      {/* 9. EXECUTIVE OPERATIONS & RUNWAY MODALS */}
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
        totalReserve={508121.36}
        monthlyBurn={11515}
      />

      {/* 10. FULL STATEMENT & INVESTIGATIVE LEDGER MODAL */}
      <FullStatementModal
        isOpen={isFullStatementOpen}
        onClose={() => setIsFullStatementOpen(false)}
        transactions={ledgerTransactions}
        accounts={accounts}
        onOpenReceipt={handleOpenReceipt}
        onRefresh={loadTransactions}
      />

      {/* 11. RECEIPT VIEWER & HIGH-RES OCR INSPECTOR MODAL */}
      <ReceiptViewerModal
        isOpen={isReceiptViewerOpen}
        onClose={() => {
          setIsReceiptViewerOpen(false);
          setViewingReceiptId(null);
          setViewingTxId(null);
          setViewingInitialData(null);
        }}
        receiptId={viewingReceiptId}
        transactionId={viewingTxId}
        initialData={viewingInitialData}
      />
    </div>
  );
}
