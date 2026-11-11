'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sliders,
  Wallet,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  Key,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  Save,
  Database,
  Building2,
  Zap,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { BankAccountItem } from '../components/SettingsModal';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'accounts' | 'appearance' | 'limits' | 'backup'>('providers');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [asdMode, setAsdMode] = useState<'none' | 'asd_80' | 'asd_strict'>('asd_80');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Accounts State
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editBalanceInput, setEditBalanceInput] = useState('');

  // Providers State
  const [providers, setProviders] = useState<any[]>([]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [importingEnv, setImportingEnv] = useState(false);

  // Limits State
  const [meiLimit, setMeiLimit] = useState(81000);
  const [dualSignThreshold, setDualSignThreshold] = useState(3000);

  // Sync theme
  useEffect(() => {
    const savedTheme = (localStorage.getItem('ofo-theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleThemeToggle = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('ofo-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    showFeedback('Tema atualizado com sucesso.');
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  // Load General Settings & Providers
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/py/settings/general');
      if (res.ok) {
        const data = await res.json();
        if (data.chat_asd_mode) setAsdMode(data.chat_asd_mode);
        if (data.mei_annual_ceiling) setMeiLimit(data.mei_annual_ceiling);
        if (data.conjugal_dual_signature_threshold) setDualSignThreshold(data.conjugal_dual_signature_threshold);
      }
    } catch (e) {
      console.error('Failed to load general settings:', e);
    }

    try {
      const res = await fetch('/api/py/settings/providers');
      if (res.ok) {
        const data = await res.json();
        if (data.providers) setProviders(data.providers);
      }
    } catch (e) {
      console.error('Failed to load providers:', e);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await fetch('/api/py/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) setAccounts(data.accounts);
      }
    } catch (e) {
      console.error('Failed to load accounts:', e);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadAccounts();
  }, []);

  const handleSaveGeneral = async (newAsdMode: 'none' | 'asd_80' | 'asd_strict') => {
    setAsdMode(newAsdMode);
    try {
      await fetch('/api/py/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_asd_mode: newAsdMode, mei_annual_ceiling: meiLimit, conjugal_dual_signature_threshold: dualSignThreshold }),
      });
      showFeedback('Modo de comunicação ASD atualizado.');
    } catch (e) {
      console.error('Failed to update general settings:', e);
    }
  };

  const handleSaveLimits = async () => {
    try {
      await fetch('/api/py/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_asd_mode: asdMode, mei_annual_ceiling: meiLimit, conjugal_dual_signature_threshold: dualSignThreshold }),
      });
      showFeedback('Limites fiscais e de governança salvos com sucesso.');
    } catch (e) {
      console.error('Failed to save limits:', e);
    }
  };

  const handleAdjustBalance = async (accountId: string) => {
    const rawVal = parseFloat(editBalanceInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(rawVal)) return;

    try {
      const res = await fetch('/api/py/accounts/adjust-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          real_balance: rawVal,
          reason: 'Ajuste manual via página de configurações',
        }),
      });

      if (res.ok) {
        showFeedback('Saldo bancário ajustado com sucesso no Livro Razão.');
        setEditingAccountId(null);
        setEditBalanceInput('');
        await loadAccounts();
      }
    } catch (e) {
      console.error('Failed to adjust balance:', e);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    try {
      setTestingProvider(providerId);
      const res = await fetch('/api/py/settings/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId }),
      });
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [providerId]: {
          ok: res.ok && data.status === 'success',
          msg: data.message || (res.ok ? 'Conexão validada' : 'Falha na conexão'),
        },
      }));
    } catch (e) {
      setTestResult((prev) => ({
        ...prev,
        [providerId]: { ok: false, msg: 'Erro de rede ao testar provedor' },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleToggleProvider = async (providerId: string) => {
    try {
      const res = await fetch(`/api/py/settings/providers/${providerId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        showFeedback('Status do provedor alternado com sucesso.');
        await loadSettings();
      }
    } catch (e) {
      console.error('Failed to toggle provider:', e);
    }
  };

  const handleSaveProviderKey = async (provider: any) => {
    try {
      const res = await fetch('/api/py/settings/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: provider.id,
          name: provider.name,
          protocol: provider.protocol,
          base_url: provider.base_url,
          api_key: keyInput.trim(),
          model: provider.model,
          priority: provider.priority,
          enabled: provider.enabled,
          limits: provider.limits,
        }),
      });
      if (res.ok) {
        showFeedback(`Chave de API do provedor ${provider.name} atualizada com sucesso.`);
        setEditingKeyId(null);
        setKeyInput('');
        await loadSettings();
      }
    } catch (e) {
      console.error('Failed to save provider key:', e);
    }
  };

  const handleDeleteProvider = async (providerId: string, providerName: string) => {
    if (!confirm(`Deseja realmente remover o provedor "${providerName}"?`)) return;
    try {
      const res = await fetch(`/api/py/settings/providers/${providerId}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback(`Provedor "${providerName}" removido.`);
        await loadSettings();
      }
    } catch (e) {
      console.error('Failed to delete provider:', e);
    }
  };

  const handleAddPreset = async (preset: any) => {
    try {
      const res = await fetch('/api/py/settings/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });
      if (res.ok) {
        showFeedback(`Provedor "${preset.name}" cadastrado com sucesso!`);
        setIsAddingProvider(false);
        await loadSettings();
      }
    } catch (e) {
      console.error('Failed to add preset:', e);
    }
  };

  const handleImportEnv = async () => {
    try {
      setImportingEnv(true);
      const res = await fetch('/api/py/settings/import-env', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showFeedback(`${data.imported_count || 0} provedores importados do ambiente.`);
        await loadSettings();
      }
    } catch (e) {
      console.error('Failed to import from env:', e);
    } finally {
      setImportingEnv(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0c1017] text-slate-800 dark:text-slate-100 transition-colors font-sans antialiased overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-20 pr-4 sm:pr-8 pl-4 sm:pl-6 py-6 pb-20 max-w-full">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1f2738] shadow-sm transition active:scale-95"
              title="Voltar ao Painel Principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Configurações do Sistema
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold">
                  Ambiente Local Privado
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Provedores de IA, contas bancárias multientidade, limites fiscais MEI e políticas de governança
              </p>
            </div>
          </div>
        </div>

        {feedback && (
          <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-2 p-1 bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm mb-6 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('providers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
              activeTab === 'providers'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Provedores de IA</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Bancos & Contas ({accounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Aparência & ASD</span>
          </button>

          <button
            onClick={() => setActiveTab('limits')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap ${
              activeTab === 'limits'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Limites MEI & Governança</span>
          </button>
        </div>

        {/* Tab 1: AI Providers */}
        {activeTab === 'providers' && (
          <div className="bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Chaves de API & Provedores de Inteligência Artificial
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Orquestração com fallback automático (NVIDIA NIM, Google Gemini, Groq, OpenRouter, DeepSeek, etc.). As credenciais são criptografadas localmente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleImportEnv}
                  disabled={importingEnv}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
                  title="Importa chaves salvas em arquivo .env"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${importingEnv ? 'animate-spin' : ''}`} />
                  <span>{importingEnv ? 'Importando...' : 'Importar de .env'}</span>
                </button>

                <button
                  onClick={() => setIsAddingProvider(!isAddingProvider)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-pill flex items-center gap-2 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingProvider ? 'Fechar Presets' : 'Adicionar Provedor'}</span>
                </button>
              </div>
            </div>

            {/* Quick Presets Drawer */}
            {isAddingProvider && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    Selecione um preset para adicionar aos modelos disponíveis:
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* NVIDIA NIM Preset */}
                  <button
                    onClick={() =>
                      handleAddPreset({
                        id: 'nvidia-nim',
                        name: 'NVIDIA NIM APIs (build.nvidia.com)',
                        protocol: 'openai',
                        base_url: 'https://integrate.api.nvidia.com/v1',
                        api_key: '',
                        model: 'meta/llama-3.3-70b-instruct',
                        priority: 4,
                        enabled: true,
                        limits: { rpm_limit: 40, tpm_limit: 60000, rpd_limit: 5000, proactive_threshold_pct: 0.8 },
                      })
                    }
                    className="p-3 text-left bg-white dark:bg-[#1b2230] hover:border-emerald-500 border border-slate-200 dark:border-white/10 rounded-xl transition group shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>NVIDIA NIM API</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      build.nvidia.com • Llama 3.3 70B / Nemotron
                    </div>
                  </button>

                  {/* Gemini Preset */}
                  <button
                    onClick={() =>
                      handleAddPreset({
                        id: 'gemini-free',
                        name: 'Google Gemini 2.0 Flash',
                        protocol: 'gemini',
                        base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',
                        api_key: '',
                        model: 'gemini-2.0-flash',
                        priority: 1,
                        enabled: true,
                        limits: { rpm_limit: 15, tpm_limit: 1000000, rpd_limit: 1500, proactive_threshold_pct: 0.8 },
                      })
                    }
                    className="p-3 text-left bg-white dark:bg-[#1b2230] hover:border-indigo-500 border border-slate-200 dark:border-white/10 rounded-xl transition group shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs mb-1">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Google Gemini</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Gemini 2.0 Flash • Janela massiva
                    </div>
                  </button>

                  {/* Groq Preset */}
                  <button
                    onClick={() =>
                      handleAddPreset({
                        id: 'groq-free',
                        name: 'Groq Ultra-Fast',
                        protocol: 'openai',
                        base_url: 'https://api.groq.com/openai/v1',
                        api_key: '',
                        model: 'llama-3.3-70b-versatile',
                        priority: 2,
                        enabled: true,
                        limits: { rpm_limit: 30, tpm_limit: 30000, rpd_limit: 14400, proactive_threshold_pct: 0.8 },
                      })
                    }
                    className="p-3 text-left bg-white dark:bg-[#1b2230] hover:border-amber-500 border border-slate-200 dark:border-white/10 rounded-xl transition group shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs mb-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Groq Cloud</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Llama 3.3 70B • Latência sub-segundo
                    </div>
                  </button>

                  {/* DeepSeek Preset */}
                  <button
                    onClick={() =>
                      handleAddPreset({
                        id: 'deepseek-api',
                        name: 'DeepSeek AI',
                        protocol: 'openai',
                        base_url: 'https://api.deepseek.com/v1',
                        api_key: '',
                        model: 'deepseek-chat',
                        priority: 6,
                        enabled: true,
                        limits: { rpm_limit: 60, tpm_limit: 100000, rpd_limit: 5000, proactive_threshold_pct: 0.8 },
                      })
                    }
                    className="p-3 text-left bg-white dark:bg-[#1b2230] hover:border-blue-500 border border-slate-200 dark:border-white/10 rounded-xl transition group shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs mb-1">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>DeepSeek API</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      DeepSeek Chat / R1 Reasoning
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Providers Listing */}
            <div className="space-y-4">
              {providers.length > 0 ? (
                providers.map((p) => {
                  const isEditingKey = editingKeyId === p.id;
                  const isKeyRevealed = showKeys[p.id];

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border transition ${
                        p.enabled
                          ? 'bg-slate-50 dark:bg-[#121722] border-slate-200/60 dark:border-white/5'
                          : 'bg-slate-100/50 dark:bg-[#0e121a]/60 border-slate-200/30 dark:border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                              P{p.priority}
                            </span>
                            <button
                              onClick={() => handleToggleProvider(p.id)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                                p.enabled
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {p.enabled ? 'Ativo' : 'Desativado'}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                            <span>
                              Modelo: <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{p.model}</code>
                            </span>
                            <span className="truncate max-w-xs font-mono text-[11px] text-slate-400">
                              {p.base_url}
                            </span>
                          </div>

                          {/* API Key Inline Row */}
                          <div className="mt-3 flex items-center gap-2">
                            {isEditingKey ? (
                              <div className="flex items-center gap-2 w-full max-w-md">
                                <div className="relative flex-1">
                                  <input
                                    type={isKeyRevealed ? 'text' : 'password'}
                                    value={keyInput}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                    placeholder="Cole aqui a nova chave de API (ex: nvapi-...)"
                                    className="w-full pl-3 pr-9 py-1.5 bg-white dark:bg-[#161c28] border border-indigo-500 rounded-xl font-mono text-xs text-slate-900 dark:text-white outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowKeys((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                                  >
                                    {isKeyRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleSaveProviderKey(p)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Salvar</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingKeyId(null);
                                    setKeyInput('');
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300 transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {p.has_api_key ? (
                                  <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-[#161c28] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-white/10 font-mono">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span>{p.api_key_masked || '••••••••'}</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Sem chave cadastrada</span>
                                  </span>
                                )}

                                <button
                                  onClick={() => {
                                    setEditingKeyId(p.id);
                                    setKeyInput('');
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-white/5 transition"
                                  title="Editar Chave de API"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Test & Actions Column */}
                        <div className="flex flex-row md:flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTestProvider(p.id)}
                              disabled={testingProvider === p.id}
                              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1b2230] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#252f42] text-xs font-semibold shadow-xs transition"
                            >
                              {testingProvider === p.id ? 'Testando...' : 'Testar Conexão'}
                            </button>

                            <button
                              onClick={() => handleDeleteProvider(p.id, p.name)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              title="Remover Provedor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {testResult[p.id] && (
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border mt-1 ${
                                testResult[p.id].ok
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {testResult[p.id].msg}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Nenhum provedor configurado. Clique em &quot;Adicionar Provedor&quot; para cadastrar NVIDIA NIM ou outros modelos.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Bank Accounts */}
        {activeTab === 'accounts' && (
          <div className="bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Contas Bancárias & Saldos Reais
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gerenciamento das 3 contas fundamentais (Fix Serviços MEI, Facilita MEI e Família PF)
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {accounts.map((acct) => (
                <div key={acct.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full bg-${acct.color || 'indigo'}-500`} />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{acct.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                        {acct.entity_code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {acct.holder} • {acct.bank_name} • {acct.purpose}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {editingAccountId === acct.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editBalanceInput}
                          onChange={(e) => setEditBalanceInput(e.target.value)}
                          placeholder="Ex: 100.332,34"
                          className="w-36 px-3 py-1.5 bg-slate-50 dark:bg-[#121722] border border-indigo-500 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white outline-none"
                        />
                        <button
                          onClick={() => handleAdjustBalance(acct.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingAccountId(null)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Saldo Atual</span>
                          <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                            R$ {Number(acct.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingAccountId(acct.id);
                            setEditBalanceInput(Number(acct.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                          }}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition"
                          title="Ajustar saldo real"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Appearance & ASD */}
        {activeTab === 'appearance' && (
          <div className="bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Aparência Visual & Tema
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Alternância entre Dark Mode executivo profundo e Light Mode de alta legibilidade.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleThemeToggle('dark')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold text-xs transition ${
                    theme === 'dark'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-pill'
                      : 'bg-white dark:bg-[#121722] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Modo Escuro (Dark)</span>
                </button>
                <button
                  onClick={() => handleThemeToggle('light')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-bold text-xs transition ${
                    theme === 'light'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-pill'
                      : 'bg-white dark:bg-[#121722] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Modo Claro (Light)</span>
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-white/5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Comunicação ASD-STE100 no Copilot
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Controla o rigor do inglês técnico simplificado adaptado ao português nas respostas de IA:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => handleSaveGeneral('none')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    asdMode === 'none'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500'
                      : 'bg-slate-50 dark:bg-[#121722] border-slate-200 dark:border-white/10'
                  }`}
                >
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white mb-1">Sem ASD</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Estilo conversacional padrão de LLM, sem restrições gramaticais formais.
                  </p>
                </button>

                <button
                  onClick={() => handleSaveGeneral('asd_80')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    asdMode === 'asd_80'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500'
                      : 'bg-slate-50 dark:bg-[#121722] border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white">80% ASD (Recomendado)</h3>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Ativo</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Frases curtas, voz ativa direta, 1 analogia útil e clareza executiva máxima.
                  </p>
                </button>

                <button
                  onClick={() => handleSaveGeneral('asd_strict')}
                  className={`p-4 rounded-2xl border text-left transition ${
                    asdMode === 'asd_strict'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500'
                      : 'bg-slate-50 dark:bg-[#121722] border-slate-200 dark:border-white/10'
                  }`}
                >
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white mb-1">ASD Rígido</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Conformidade 100% com regras aeronáuticas STE100, sem intro/conclusão.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Limits & Governance */}
        {activeTab === 'limits' && (
          <div className="bg-white dark:bg-[#161c28] rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-card space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Teto MEI Anual • Lei Complementar 123/2006
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Limite de faturamento anual por CNPJ antes de risco de desenquadramento automático para ME.
              </p>
              <div className="flex items-center gap-3 max-w-sm">
                <input
                  type="number"
                  value={meiLimit}
                  onChange={(e) => setMeiLimit(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10 rounded-2xl font-mono text-sm font-bold text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleSaveLimits}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-pill transition"
                >
                  Salvar
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-white/5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Governança Conjugal • Limite de Dupla Assinatura
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Distribuições e transferências acima deste valor exigem aprovação mútua (Osmar & Vera).
              </p>
              <div className="flex items-center gap-3 max-w-sm">
                <input
                  type="number"
                  value={dualSignThreshold}
                  onChange={(e) => setDualSignThreshold(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10 rounded-2xl font-mono text-sm font-bold text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleSaveLimits}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-pill transition"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

