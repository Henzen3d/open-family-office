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
} from 'lucide-react';

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
}

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'providers' | 'appearance' | 'limits' | 'governance'>('providers');
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingNexus, setImportingNexus] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-slate-100">
        
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

          <button
            onClick={() => setActiveTab('governance')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'governance'
                ? 'bg-indigo-600 text-white shadow-pill'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Governança MEI & Fiscal
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: PROVEDORES DE IA */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {/* Actions Header Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div>
                  <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                    Roteamento Inteligente de IA (Fallback & Quota Zero)
                  </h3>
                  <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
                    Orquestração multi-provedor (OpenAI, Anthropic, Gemini, Groq, Ollama) com prevenção proativa de Rate Limits.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleImportNexus}
                    disabled={importingNexus}
                    title="Importa chaves do arquivo local do Nexus ou Hermes (.env)"
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white dark:bg-[#1a202c] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/40 shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${importingNexus ? 'animate-spin' : ''}`} />
                    {importingNexus ? 'Importando...' : 'Importar do Nexus Local'}
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
                    Nenhum provedor configurado. Clique em &quot;Importar do Nexus Local&quot; ou adicione manualmente.
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
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                  {prov.protocol}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
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
                              <Zap className={`w-3.5 h-3.5 ${status?.loading ? 'animate-bounce text-amber-500' : ''}`} />
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
                  <span>ASD-STE100 ~80%: Ativo</span>
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
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Local Nexus / Ollama</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">Ilimitado (Offline)</div>
                  <div className="text-[11px] text-slate-400 mt-1">Fallback final sem custo</div>
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
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
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
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
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
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
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

