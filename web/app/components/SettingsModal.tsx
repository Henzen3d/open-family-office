'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Zap,
  RefreshCw,
  Sun,
  Moon,
  ShieldCheck,
  Key,
  Cpu,
  Layers,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Server,
  ArrowUpDown,
  Wallet,
  Building2,
  Check,
  Pencil,
  DollarSign,
} from 'lucide-react';

export interface BankAccountItem {
  id: string;
  name: string;
  bank_name: string;
  entity_code: string;
  holder: string;
  purpose: string;
  balance: number;
  color: string;
  active: boolean;
  last_adjusted_at?: string;
  notes?: string;
}

export interface ProviderItem {
  id: string;
  name: string;
  protocol: string;
  base_url: string;
  api_key_masked: string;
  has_api_key: boolean;
  model: string;
  priority: number;
  enabled: boolean;
  limits: {
    rpm_limit: number;
    tpm_limit: number;
    rpd_limit: number;
    proactive_threshold_pct: number;
  };
  custom_headers?: Record<string, string>;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onThemeChange: (newTheme: 'dark' | 'light') => void;
  asdMode?: 'none' | 'asd_80' | 'asd_strict';
  onAsdModeChange?: (newMode: 'none' | 'asd_80' | 'asd_strict') => void;
  initialTab?: 'providers' | 'accounts' | 'appearance' | 'limits' | 'governance';
  onAccountsUpdated?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  asdMode,
  onAsdModeChange,
  initialTab,
  onAccountsUpdated,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'providers' | 'accounts' | 'appearance' | 'limits' | 'governance'>(
    initialTab || 'providers'
  );
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingNexus, setImportingNexus] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [localAsdMode, setLocalAsdMode] = useState<'none' | 'asd_80' | 'asd_strict'>(asdMode || 'asd_80');

  // Bank Accounts Management State
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [consolidatedTotal, setConsolidatedTotal] = useState<number>(0);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [adjustingAccountId, setAdjustingAccountId] = useState<string | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [balanceNoteInput, setBalanceNoteInput] = useState('');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountActionMsg, setAccountActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newAccountForm, setNewAccountForm] = useState({
    name: '',
    bank_name: 'Nubank',
    entity_code: 'HOUSEHOLD_OSMAR',
    holder: 'Casal (Osmar & Vera)',
    purpose: '',
    balance: '',
    color: 'indigo',
    notes: '',
  });

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/py/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setConsolidatedTotal(data.total_balance || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      fetchAccounts();
    }
  }, [isOpen, initialTab]);

  const handleStartAdjust = (acct: BankAccountItem) => {
    setAdjustingAccountId(acct.id);
    setNewBalanceInput(acct.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setBalanceNoteInput('Conferido no app do banco');
    setAccountActionMsg(null);
  };

  const handleSaveAdjustment = async (accountId: string) => {
    try {
      setIsSavingAdjustment(true);
      setAccountActionMsg(null);
      const cleanNum = parseFloat(newBalanceInput.replace(/\./g, '').replace(',', '.'));
      if (isNaN(cleanNum)) {
        setAccountActionMsg({ type: 'error', text: 'Informe um valor de saldo válido (ex: 357458,00)' });
        return;
      }

      const res = await fetch('/api/py/accounts/adjust-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          new_balance: cleanNum,
          note: balanceNoteInput.trim() || 'Ajuste manual de saldo real',
        }),
      });

      if (res.ok) {
        setAdjustingAccountId(null);
        setNewBalanceInput('');
        setBalanceNoteInput('');
        setAccountActionMsg({ type: 'success', text: 'Saldo atualizado com sucesso!' });
        await fetchAccounts();
        if (onAccountsUpdated) onAccountsUpdated();
        setTimeout(() => setAccountActionMsg(null), 3500);
      } else {
        const err = await res.json();
        setAccountActionMsg({ type: 'error', text: err.detail || 'Erro ao ajustar saldo.' });
      }
    } catch (err) {
      setAccountActionMsg({ type: 'error', text: 'Falha de conexão com o servidor.' });
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountForm.name.trim()) {
      setAccountActionMsg({ type: 'error', text: 'Preencha o nome da conta.' });
      return;
    }
    try {
      setSavingAccount(true);
      setAccountActionMsg(null);
      const cleanBalance = parseFloat(newAccountForm.balance.replace(/\./g, '').replace(',', '.')) || 0;
      const res = await fetch('/api/py/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccountForm.name.trim(),
          bank_name: newAccountForm.bank_name.trim(),
          entity_code: newAccountForm.entity_code,
          holder: newAccountForm.holder.trim(),
          purpose: newAccountForm.purpose.trim(),
          balance: cleanBalance,
          color: newAccountForm.color,
          notes: newAccountForm.notes.trim() || 'Cadastrada via configurações',
        }),
      });

      if (res.ok) {
        setIsAddingAccount(false);
        setNewAccountForm({
          name: '',
          bank_name: 'Nubank',
          entity_code: 'HOUSEHOLD_OSMAR',
          holder: 'Casal (Osmar & Vera)',
          purpose: '',
          balance: '',
          color: 'indigo',
          notes: '',
        });
        setAccountActionMsg({ type: 'success', text: 'Nova conta bancária adicionada!' });
        await fetchAccounts();
        if (onAccountsUpdated) onAccountsUpdated();
        setTimeout(() => setAccountActionMsg(null), 3500);
      } else {
        const err = await res.json();
        setAccountActionMsg({ type: 'error', text: err.detail || 'Falha ao salvar conta.' });
      }
    } catch (err) {
      setAccountActionMsg({ type: 'error', text: 'Falha de comunicação.' });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (acctId: string, acctName: string) => {
    if (!confirm(`Deseja realmente remover a conta "${acctName}"?`)) return;
    try {
      const res = await fetch(`/api/py/accounts/${acctId}`, { method: 'DELETE' });
      if (res.ok) {
        setAccountActionMsg({ type: 'success', text: `Conta "${acctName}" removida.` });
        await fetchAccounts();
        if (onAccountsUpdated) onAccountsUpdated();
        setTimeout(() => setAccountActionMsg(null), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (asdMode) setLocalAsdMode(asdMode);
  }, [asdMode]);

  useEffect(() => {
    if (isOpen && !asdMode) {
      fetch('/api/py/settings/general')
        .then((r) => r.json())
        .then((data) => {
          if (data.asd_mode) setLocalAsdMode(data.asd_mode);
        })
        .catch(() => {});
    }
  }, [isOpen, asdMode]);

  const handleSelectAsdMode = async (mode: 'none' | 'asd_80' | 'asd_strict') => {
    setLocalAsdMode(mode);
    if (onAsdModeChange) {
      onAsdModeChange(mode);
    } else {
      try {
        await fetch('/api/py/settings/general', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asd_mode: mode }),
        });
      } catch (e) {
        console.error('Falha ao salvar modo ASD:', e);
      }
    }
  };

  // Form State for creating/editing provider
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, { loading?: boolean; success?: boolean; msg?: string }>>({});

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    protocol: 'openai',
    base_url: '',
    api_key: '',
    model: '',
    priority: 1,
    enabled: true,
    rpm_limit: 30,
    tpm_limit: 30000,
  });

  // Fetch providers
  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/py/settings/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (e) {
      console.error('Falha ao buscar provedores:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler: Import Nexus .env
  const handleImportNexus = async () => {
    setImportingNexus(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/py/settings/import-nexus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setImportResult(`${data.imported_count} provedores sincronizados com sucesso.`);
        fetchProviders();
      } else {
        setImportResult('Nenhuma credencial nova detectada nos arquivos locais.');
      }
    } catch {
      setImportResult('Erro de conexão ao ler arquivos locais do Nexus.');
    } finally {
      setImportingNexus(false);
      setTimeout(() => setImportResult(null), 6000);
    }
  };

  // Handler: Toggle Provider
  const handleToggle = async (providerId: string) => {
    try {
      const res = await fetch(`/api/py/settings/providers/${providerId}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json();
        setProviders((prev) =>
          prev.map((p) => (p.id === providerId ? { ...p, enabled: data.enabled } : p))
        );
      }
    } catch (e) {
      console.error('Falha ao alternar status do provedor:', e);
    }
  };

  // Handler: Delete Provider
  const handleDelete = async (providerId: string) => {
    if (!confirm(`Remover provedor "${providerId}" das configurações?`)) return;
    try {
      const res = await fetch(`/api/py/settings/providers/${providerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProviders((prev) => prev.filter((p) => p.id !== providerId));
      }
    } catch (e) {
      console.error('Falha ao excluir provedor:', e);
    }
  };

  // Handler: Test Provider Latency
  const handleTest = async (prov: ProviderItem) => {
    setTestStatus((prev) => ({
      ...prev,
      [prov.id]: { loading: true },
    }));

    try {
      const res = await fetch('/api/py/settings/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prov.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus((prev) => ({
          ...prev,
          [prov.id]: { loading: false, success: true, msg: `${data.latency_ms}ms (OK)` },
        }));
      } else {
        setTestStatus((prev) => ({
          ...prev,
          [prov.id]: { loading: false, success: false, msg: data.message || 'Falha de conexão' },
        }));
      }
    } catch {
      setTestStatus((prev) => ({
        ...prev,
        [prov.id]: { loading: false, success: false, msg: 'Erro de rede' },
      }));
    }
  };

  // Handler: Edit or New Form
  const handleOpenForm = (prov?: ProviderItem) => {
    if (prov) {
      setFormData({
        id: prov.id,
        name: prov.name,
        protocol: prov.protocol,
        base_url: prov.base_url,
        api_key: '',
        model: prov.model,
        priority: prov.priority,
        enabled: prov.enabled,
        rpm_limit: prov.limits?.rpm_limit || 30,
        tpm_limit: prov.limits?.tpm_limit || 30000,
      });
    } else {
      setFormData({
        id: '',
        name: '',
        protocol: 'openai',
        base_url: 'https://api.groq.com/openai/v1',
        api_key: '',
        model: 'llama-3.3-70b-versatile',
        priority: providers.length + 1,
        enabled: true,
        rpm_limit: 30,
        tpm_limit: 30000,
      });
    }
    setIsEditing(true);
  };

  // Handler: Save Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        id: formData.id || undefined,
        name: formData.name,
        protocol: formData.protocol,
        base_url: formData.base_url,
        api_key: formData.api_key || undefined,
        model: formData.model,
        priority: Number(formData.priority) || 1,
        enabled: formData.enabled,
        limits: {
          rpm_limit: Number(formData.rpm_limit) || 30,
          tpm_limit: Number(formData.tpm_limit) || 30000,
          rpd_limit: 5000,
          proactive_threshold_pct: 0.80,
        },
      };

      const res = await fetch('/api/py/settings/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsEditing(false);
        fetchProviders();
      }
    } catch (err) {
      console.error('Falha ao salvar provedor:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[680px] max-h-[90vh] flex flex-col bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#1a202c]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Configurações do Sistema</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Governança executiva, IA multi-provedor e preferências operacionais.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar bg-white dark:bg-[#161c28]">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'accounts'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Bancos & Saldos ({accounts.length})
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'providers'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Server className="w-4 h-4" />
            Provedores de IA ({providers.length})
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'governance'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Governança & ASD
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'appearance'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            Aparência & Tema
          </button>

          <button
            onClick={() => setActiveTab('limits')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'limits'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            Limites & Fallback
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB: BANCOS & SALDOS REAIS */}
          {activeTab === 'accounts' && (
            <div className="space-y-5 animate-view-fade">
              {/* Header Card with Consolidated Total and Action Button */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-[#131b2c] dark:via-[#161c28] dark:to-[#121622] border border-indigo-200/60 dark:border-indigo-500/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      Saldo Consolidado do Casal
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
                    {consolidatedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                    Ajuste os valores reais diretamente pelo saldo em tela do app bancário. Não é necessário possuir comprovantes retroativos: o sistema utilizará esse saldo como novo marco zero para conciliação.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAccount(!isAddingAccount);
                      setAdjustingAccountId(null);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-pill transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isAddingAccount ? 'Cancelar' : 'Adicionar Banco / Conta'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchAccounts}
                    disabled={loadingAccounts}
                    title="Recarregar saldos"
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAccounts ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Status or Alert feedback message */}
              {accountActionMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-card-reveal ${
                    accountActionMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {accountActionMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{accountActionMsg.text}</span>
                </div>
              )}

              {/* Form to Add New Bank Account */}
              {isAddingAccount && (
                <form
                  onSubmit={handleCreateAccount}
                  className="p-5 rounded-2xl bg-white dark:bg-[#192234] border-2 border-indigo-500/40 shadow-lg space-y-4 animate-card-reveal"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cadastrar Nova Conta Bancária</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingAccount(false)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
                    >
                      ✕ Fechar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Instituição Financeira / Banco *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAccountForm.bank_name}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, bank_name: e.target.value })}
                        placeholder="Ex: Nubank, Banco Inter, Caixa, Itaú, Bradesco"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121724] text-xs font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Nome da Conta / Identificação *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAccountForm.name}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                        placeholder="Ex: Itaú Uniclass PF, Nubank PJ Facilita"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121724] text-xs font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Titular da Conta *
                      </label>
                      <select
                        value={newAccountForm.holder}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, holder: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121724] text-xs font-medium focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Osmar">Osmar</option>
                        <option value="Vera">Vera</option>
                        <option value="Casal (Osmar & Vera)">Casal (Osmar & Vera)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Vínculo Fiscal / Entidade *
                      </label>
                      <select
                        value={newAccountForm.entity_code}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, entity_code: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121724] text-xs font-medium focus:outline-none focus:border-indigo-500"
                      >
                        <option value="HOUSEHOLD_OSMAR">Núcleo Familiar PF (Comunhão de Bens)</option>
                        <option value="FIX_SERVICOS">Fix Serviços MEI (CNPJ Osmar)</option>
                        <option value="FACILITA_VISTORIAS">Facilita Vistorias MEI (CNPJ Vera)</option>
                        <option value="OTHER">Outra Entidade / Investimentos</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Saldo Inicial Real (R$) *
                      </label>
                      <input
                        type="text"
                        value={newAccountForm.balance}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, balance: e.target.value })}
                        placeholder="Ex: 15.000,00"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121724] text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Finalidade / Propósito
                      </label>
                      <input
                        type="text"
                        value={newAccountForm.purpose}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, purpose: e.target.value })}
                        placeholder="Ex: Reserva de emergência, Giro MEI"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121724] text-xs font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsAddingAccount(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingAccount}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-pill transition"
                    >
                      {savingAccount ? 'Salvando...' : 'Salvar Conta'}
                    </button>
                  </div>
                </form>
              )}

              {/* Accounts List */}
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-[#121722] rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 text-xs">
                    Nenhuma conta cadastrada no momento.
                  </div>
                ) : (
                  accounts.map((acct) => {
                    const isAdjusting = adjustingAccountId === acct.id;
                    return (
                      <div
                        key={acct.id}
                        className="p-4 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 shadow-xs transition hover:border-indigo-500/40"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                                acct.color === 'amber'
                                  ? 'bg-amber-500'
                                  : acct.color === 'rose'
                                  ? 'bg-rose-500'
                                  : acct.color === 'emerald'
                                  ? 'bg-emerald-500'
                                  : acct.color === 'purple'
                                  ? 'bg-purple-500'
                                  : 'bg-indigo-500'
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{acct.name}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                  {acct.bank_name}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                                  {acct.entity_code === 'HOUSEHOLD_OSMAR'
                                    ? 'Família PF'
                                    : acct.entity_code === 'FIX_SERVICOS'
                                    ? 'Fix MEI'
                                    : acct.entity_code === 'FACILITA_VISTORIAS'
                                    ? 'Facilita MEI'
                                    : 'Outra'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Titular: <strong className="text-slate-800 dark:text-slate-200">{acct.holder}</strong>
                                {acct.purpose && <span> • {acct.purpose}</span>}
                              </div>
                              {acct.last_adjusted_at && (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                  Último ajuste: {new Date(acct.last_adjusted_at).toLocaleDateString('pt-BR')} às{' '}
                                  {new Date(acct.last_adjusted_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  {acct.notes ? ` (${acct.notes})` : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                            <div className="text-right">
                              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block">
                                Saldo Atual
                              </span>
                              <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                                {acct.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => (isAdjusting ? setAdjustingAccountId(null) : handleStartAdjust(acct))}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition ${
                                  isAdjusting
                                    ? 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white border-transparent'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-500/30 hover:bg-indigo-100'
                                }`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>{isAdjusting ? 'Fechar' : 'Ajustar Saldo'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acct.id, acct.name)}
                                title="Remover conta"
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Inline Balance Adjustment Box */}
                        {isAdjusting && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#121724] p-3.5 rounded-xl space-y-3 animate-card-reveal">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                Corrigir Saldo de {acct.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Digite o valor real conforme o aplicativo do banco
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                              <div className="sm:col-span-5">
                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                  Novo Saldo Real (R$) *
                                </label>
                                <input
                                  type="text"
                                  value={newBalanceInput}
                                  onChange={(e) => setNewBalanceInput(e.target.value)}
                                  placeholder="0,00"
                                  autoFocus
                                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#182030] text-sm font-mono font-bold focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                />
                              </div>

                              <div className="sm:col-span-7">
                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                  Motivo / Observação
                                </label>
                                <input
                                  type="text"
                                  value={balanceNoteInput}
                                  onChange={(e) => setBalanceNoteInput(e.target.value)}
                                  placeholder="Ex: Conferido no app hoje"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#182030] text-xs font-medium focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setAdjustingAccountId(null)}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={isSavingAdjustment}
                                onClick={() => handleSaveAdjustment(acct.id)}
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isSavingAdjustment ? 'Salvando...' : 'Confirmar Novo Saldo'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 1: PROVEDORES DE IA */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {/* Actions Header Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Roteamento Inteligente de IA (Fallback & Quota Zero)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Orquestração multi-provedor (OpenAI, Anthropic, Gemini, Groq, NVIDIA NIM, DeepSeek) com prevenção proativa de Rate Limits.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleImportNexus}
                    disabled={importingNexus}
                    title="Importa chaves de arquivo .env"
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a202c] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/40 shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${importingNexus ? 'animate-spin' : ''}`} />
                    {importingNexus ? 'Importando...' : 'Importar de .env'}
                  </button>

                  <button
                    onClick={() => handleOpenForm()}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-pill flex items-center justify-center gap-2 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Provedor
                  </button>
                </div>
              </div>

              {importResult && (
                <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {importResult}
                </div>
              )}

              {/* Form Modal/Drawer for Adding or Editing */}
              {isEditing && (
                <form
                  onSubmit={handleSaveForm}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-indigo-200 dark:border-indigo-500/40 space-y-4 animate-fadeIn"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {formData.id ? `Editar Provedor: ${formData.name}` : 'Cadastrar Novo Provedor de IA'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!formData.id && (
                    <div className="space-y-1.5 pb-2 border-b border-slate-200 dark:border-white/10">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Preenchimento rápido por modelo / provedor:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            id: 'nvidia-nim',
                            name: 'NVIDIA NIM APIs (build.nvidia.com)',
                            protocol: 'openai',
                            base_url: 'https://integrate.api.nvidia.com/v1',
                            model: 'meta/llama-3.3-70b-instruct',
                            rpm_limit: 40,
                            tpm_limit: 60000,
                          })}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold hover:scale-105 transition"
                        >
                          ⚡ NVIDIA NIM
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            id: 'gemini-free',
                            name: 'Google Gemini 2.0 Flash',
                            protocol: 'gemini',
                            base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',
                            model: 'gemini-2.0-flash',
                            rpm_limit: 15,
                            tpm_limit: 1000000,
                          })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-[11px] font-medium hover:bg-slate-200 transition"
                        >
                          Gemini
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            id: 'groq-free',
                            name: 'Groq Ultra-Fast',
                            protocol: 'openai',
                            base_url: 'https://api.groq.com/openai/v1',
                            model: 'llama-3.3-70b-versatile',
                            rpm_limit: 30,
                            tpm_limit: 30000,
                          })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-[11px] font-medium hover:bg-slate-200 transition"
                        >
                          Groq
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            id: 'deepseek-api',
                            name: 'DeepSeek AI',
                            protocol: 'openai',
                            base_url: 'https://api.deepseek.com/v1',
                            model: 'deepseek-chat',
                            rpm_limit: 60,
                            tpm_limit: 100000,
                          })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-[11px] font-medium hover:bg-slate-200 transition"
                        >
                          DeepSeek
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Nome de Exibição
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Anthropic Claude 3.5 Sonnet"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Protocolo da API
                      </label>
                      <select
                        value={formData.protocol}
                        onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="openai">OpenAI / Gemini Compatível (/chat/completions)</option>
                        <option value="anthropic">Anthropic Compatível (/messages)</option>
                        <option value="gemini">Google Gemini Nativo</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Base URL
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="https://api.anthropic.com/v1 ou https://api.groq.com/openai/v1"
                        value={formData.base_url}
                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                        className="w-full px-3 py-2 font-mono rounded-xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Chave de API / Token
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder={formData.id ? 'Manter chave existente (sk-****)' : 'sk-ou gsk_...'}
                          value={formData.api_key}
                          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                          className="w-full pl-3 pr-10 py-2 font-mono rounded-xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Identificador do Modelo
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: claude-3-5-sonnet-20241022 ou llama-3.3-70b-versatile"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-3 py-2 font-mono rounded-xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Prioridade de Fallback (1 = Mais prioritário)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Limite RPM
                        </label>
                        <input
                          type="number"
                          value={formData.rpm_limit}
                          onChange={(e) => setFormData({ ...formData, rpm_limit: parseInt(e.target.value) || 30 })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Limite TPM
                        </label>
                        <input
                          type="number"
                          value={formData.tpm_limit}
                          onChange={(e) => setFormData({ ...formData, tpm_limit: parseInt(e.target.value) || 30000 })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/10 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-pill transition"
                    >
                      Salvar Provedor
                    </button>
                  </div>
                </form>
              )}

              {/* Provider List */}
              <div className="space-y-3">
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                    Carregando provedores configurados...
                  </div>
                ) : providers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
                    Nenhum provedor configurado. Clique em &quot;Importar de .env&quot; ou adicione manualmente.
                  </div>
                ) : (
                  providers.map((prov) => {
                    const status = testStatus[prov.id];
                    return (
                      <div
                        key={prov.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          prov.enabled
                            ? 'bg-white dark:bg-[#161c28] border-slate-200 dark:border-white/10 shadow-sm'
                            : 'bg-slate-50/70 dark:bg-[#121721] border-slate-200/50 dark:border-white/5 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                              #{prov.priority}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold">{prov.name}</span>
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                  {prov.protocol}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                                  {prov.model}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                <span>{prov.base_url}</span>
                                <span>•</span>
                                <span>Key: {prov.api_key_masked || 'Sem chave'}</span>
                                <span>•</span>
                                <span>{prov.limits?.rpm_limit} RPM</span>
                              </div>
                            </div>
                          </div>

                          {/* Control Buttons */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                            {/* Test Button */}
                            <button
                              onClick={() => handleTest(prov)}
                              disabled={status?.loading || !prov.enabled}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                                status?.success
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : status?.success === false
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  : 'bg-slate-100 dark:bg-[#1f2738] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-indigo-500'
                              } disabled:opacity-40`}
                            >
                              <Zap className={`w-3.5 h-3.5 ${status?.loading ? 'animate-spin text-amber-500' : ''}`} />
                              {status?.loading ? 'Testando...' : status?.msg || 'Testar'}
                            </button>

                            {/* Toggle Switch */}
                            <button
                              onClick={() => handleToggle(prov.id)}
                              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                                prov.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                              title={prov.enabled ? 'Desativar Provedor' : 'Ativar Provedor'}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                  prov.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenForm(prov)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(prov.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APARÊNCIA & TEMA */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold">Seleção de Tema Visual</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Alternância instantânea entre as diretrizes de design do Google Stitch para Wealth Dashboard.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dark Theme Card */}
                <div
                  onClick={() => onThemeChange('dark')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'border-indigo-600 bg-[#0c1017] text-white shadow-xl ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-white/10 bg-[#0c1017] text-white opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#161c28] border border-white/10 flex items-center justify-center text-indigo-400">
                        <Moon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm">Tema Escuro (Executive Navy)</span>
                    </div>
                    {theme === 'dark' && (
                      <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-[#161c28] border border-white/5 space-y-2 text-xs">
                    <div className="h-2 w-1/3 bg-indigo-500 rounded-full" />
                    <div className="h-2 w-2/3 bg-slate-700 rounded-full" />
                    <p className="text-[11px] text-slate-400 pt-1">
                      Superfície #0C1017 com cartões #161C28 e realce índigo. Ideal para baixa luminosidade e dashboards executivos.
                    </p>
                  </div>
                </div>

                {/* Light Theme Card */}
                <div
                  onClick={() => onThemeChange('light')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-[#F4F6FB] text-slate-900 shadow-xl ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-white/10 bg-[#F4F6FB] text-slate-900 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                        <Sun className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm">Tema Claro (Editorial Soft)</span>
                    </div>
                    {theme === 'light' && (
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                    <div className="h-2 w-1/3 bg-indigo-500 rounded-full" />
                    <div className="h-2 w-2/3 bg-slate-200 rounded-full" />
                    <p className="text-[11px] text-slate-600 pt-1">
                      Superfície #F4F6FB com cartões #FFFFFF e tipografia Slate 900. Máxima legibilidade em ambientes diurnos.
                    </p>
                  </div>
                </div>
              </div>

              {/* ASD-STE100 Chat Style Settings */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    Estilo de Linguagem do Assistente (ASD-STE100)
                  </h3>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                    {localAsdMode === 'asd_80' ? '80% ASD (Ativo)' : localAsdMode === 'asd_strict' ? 'ASD Rígido' : 'Sem ASD'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Regula o grau de síntese técnica aeroespacial (Simplified Technical English) aplicado às respostas do chat financeiro.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Sem ASD */}
                  <div
                    onClick={() => handleSelectAsdMode('none')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      localAsdMode === 'none'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-[#1a202c]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Sem ASD</span>
                        {localAsdMode === 'none' && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Estilo convencional livre, sem limite rígido de extensão de frases ou vocabulário fixo.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-white/5 text-[10px] text-slate-400 font-medium">
                      Tom conversacional livre
                    </div>
                  </div>

                  {/* 2. 80% ASD (Leve) */}
                  <div
                    onClick={() => handleSelectAsdMode('asd_80')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      localAsdMode === 'asd_80'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-[#1a202c]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">80% ASD (Leve)</span>
                          <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.2 rounded-full">
                            Padrão
                          </span>
                        </div>
                        {localAsdMode === 'asd_80' && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Frases de até 20 palavras, voz ativa, uma ideia por frase, consistência de termos, tom natural e 1 analogia.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-white/5 text-[10px] text-indigo-500 font-medium">
                      Padrão recomendado Karpathy
                    </div>
                  </div>

                  {/* 3. ASD Rígido */}
                  <div
                    onClick={() => handleSelectAsdMode('asd_strict')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      localAsdMode === 'asd_strict'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-[#1a202c]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">ASD Rígido (100%)</span>
                        {localAsdMode === 'asd_strict' && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Padrão integral: frases de 20 palavras, sem introdução/conclusão, sem analogias, com glossário de 3 termos no fim.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-white/5 text-[10px] text-slate-400 font-medium">
                      Manual de aviação estrito
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety & Style Standards Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Privacidade LGPD & Egress Guard
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Todos os dados bancários, números de conta, chaves PIX e documentos de Osmar e Vera são mascarados antes do envio a qualquer LLM externa. Tokens são reconstituídos localmente no seu servidor sem vazamento.
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>Modo ASD Ativo: {localAsdMode === 'asd_80' ? '80% (Leve)' : localAsdMode === 'asd_strict' ? '100% (Rígido)' : 'Desativado'}</span>
                  <span>•</span>
                  <span>Modo Determinístico: Ativo</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIMITES & FALLBACK */}
          {activeTab === 'limits' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold">Arquitetura de Limites e Fallback</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  O sistema monitora o consumo via Sliding Window e comuta provedores antes de atingir 80% da quota gratuita.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-white/10">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gemini 2.0 Flash</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">15 RPM / 1M TPM</div>
                  <div className="text-[11px] text-slate-400 mt-1">Threshold: 12 RPM (80%)</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-white/10">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Groq Llama 3.3</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">30 RPM / 30k TPM</div>
                  <div className="text-[11px] text-slate-400 mt-1">Threshold: 24 RPM (80%)</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-white/10">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">NVIDIA NIM API</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">40 RPM / 60k TPM</div>
                  <div className="text-[11px] text-slate-400 mt-1">build.nvidia.com (Llama 3.3 / Nemotron)</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Garantia de Operação Contínua:</span> Em caso de erro 429 ou esgotamento de quota na nuvem, as requisições interativas do chat comutam em zero milissegundos para o próximo provedor cadastrado, preservando a experiência de uso.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GOVERNANÇA MEI */}
          {activeTab === 'governance' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold">Governança Jurídica e Fiscal Individual</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Separação formal dos CNPJs em conformidade com a Lei Complementar 123/2006 (Art. 18-A).
                </p>
              </div>

              <div className="space-y-3">
                {/* Entidade 01 */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Entidade 01 • Serviços
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      MEI Individual
                    </span>
                  </div>
                  <div className="text-sm font-bold mt-1">Fix Serviços MEI</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 space-y-0.5">
                    <p>• Titular exclusivo: <strong className="text-slate-900 dark:text-white">Osmar</strong></p>
                    <p>• Conta de Operação: Banco Inter CNPJ</p>
                    <p>• Teto Anual 2026: R$ 81.000,00 (R$ 6.750,00/mês)</p>
                  </div>
                </div>

                {/* Entidade 02 */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Entidade 02 • Vistorias
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      MEI Individual
                    </span>
                  </div>
                  <div className="text-sm font-bold mt-1">Facilita Vistorias MEI</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 space-y-0.5">
                    <p>• Titular exclusiva: <strong className="text-slate-900 dark:text-white">Vera</strong></p>
                    <p>• Conta de Operação: Caixa Econômica Federal PJ</p>
                    <p>• Teto Anual 2026: R$ 81.000,00 (R$ 6.750,00/mês)</p>
                  </div>
                </div>

                {/* Entidade 03 */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Entidade 03 • Núcleo Familiar
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Patrimônio PF
                    </span>
                  </div>
                  <div className="text-sm font-bold mt-1">Família / Casal (Comunhão de Bens)</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 space-y-0.5">
                    <p>• Titulares: Osmar & Vera</p>
                    <p>• Conta Principal: Nubank Ultravioleta PF</p>
                    <p>• Governança: Pró-labore e distribuição de lucros isentos reconciliados sem bitributação.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#1a202c]/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            OpenFamilyOffice v1.0.0 • servidoria
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-pill transition"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
}

