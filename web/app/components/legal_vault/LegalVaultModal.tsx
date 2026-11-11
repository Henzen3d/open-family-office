'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  Download,
  Trash2,
  FileText,
  Building,
  Briefcase,
  Users,
  Shield,
  FileCheck,
  X,
  RefreshCw,
} from 'lucide-react';
import VaultUnlockPrompt from './VaultUnlockPrompt';
import DocumentUploader from './DocumentUploader';

interface VaultDocument {
  id: string;
  filename_orig: string;
  category: string;
  category_label: string;
  description: string;
  issued_date?: string;
  expiration_date?: string;
  registry_office?: string;
  file_size_bytes: number;
  created_at: string;
}

interface LegalVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalVaultModal({ isOpen, onClose }: LegalVaultModalProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/vault/status');
      if (res.ok) {
        const data = await res.json();
        setIsUnlocked(data.unlocked);
        if (data.unlocked) {
          loadDocuments();
        }
      }
    } catch {
      // offline fallback
      setIsUnlocked(true);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vault/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const handleLock = async () => {
    try {
      await fetch('/api/vault/lock', { method: 'POST' });
    } catch {}
    setIsUnlocked(false);
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Deseja realmente excluir este documento do cofre?')) return;
    try {
      const res = await fetch(`/api/vault/document/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        loadDocuments();
      }
    } catch {}
  };

  const handleDownload = (docId: string) => {
    window.open(`/api/vault/document/${docId}/download`, '_blank');
  };

  if (!isOpen) return null;

  if (!isUnlocked) {
    return (
      <VaultUnlockPrompt
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={() => {
          setIsUnlocked(true);
          loadDocuments();
        }}
      />
    );
  }

  const filteredDocs =
    categoryFilter === 'ALL'
      ? documents
      : documents.filter((d) => d.category === categoryFilter);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'REAL_ESTATE':
        return <Building className="w-4 h-4 text-amber-500" />;
      case 'CORPORATE_MEI':
        return <Briefcase className="w-4 h-4 text-indigo-500" />;
      case 'PERSONAL_FAMILY':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'INSURANCE_HEALTH':
        return <Shield className="w-4 h-4 text-emerald-500" />;
      default:
        return <FileCheck className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Cofre Legal & Documental da Família
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  AES-256-GCM Desbloqueado
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Repositório criptografado local para escrituras, contratos e diretivas sucessórias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploading(!isUploading)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Documento
            </button>
            <button
              onClick={handleLock}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
              title="Trancar imediatamente e limpar chave da memória"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              Trancar
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Uploader View */}
        {isUploading && (
          <DocumentUploader
            onSuccess={() => {
              setIsUploading(false);
              loadDocuments();
            }}
            onCancel={() => setIsUploading(false)}
          />
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              categoryFilter === 'ALL'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todos os Documentos ({documents.length})
          </button>
          <button
            onClick={() => setCategoryFilter('REAL_ESTATE')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              categoryFilter === 'REAL_ESTATE'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Imóveis & Escrituras
          </button>
          <button
            onClick={() => setCategoryFilter('CORPORATE_MEI')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              categoryFilter === 'CORPORATE_MEI'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            MEI & Contratos
          </button>
          <button
            onClick={() => setCategoryFilter('PERSONAL_FAMILY')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              categoryFilter === 'PERSONAL_FAMILY'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Casamento & Família
          </button>
          <button
            onClick={() => setCategoryFilter('SUCCESSION_WILL')}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              categoryFilter === 'SUCCESSION_WILL'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Sucessão & Testamento
          </button>
        </div>

        {/* Document Cards Grid */}
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
            <Lock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs">Nenhum documento cadastrado nesta categoria.</p>
            <button
              onClick={() => setIsUploading(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline"
            >
              Adicionar o primeiro arquivo criptografado
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col justify-between hover:border-indigo-500/30 transition group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/10">
                        {getCategoryIcon(doc.category)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {doc.description || doc.filename_orig}
                        </h4>
                        <span className="text-[10px] text-slate-400 block">
                          {doc.category_label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {doc.registry_office && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      Cartório: <strong>{doc.registry_office}</strong>
                    </div>
                  )}

                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                    <span>{doc.filename_orig}</span>
                    <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5">
                  <button
                    onClick={() => handleDownload(doc.id)}
                    className="p-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg flex items-center gap-1 transition"
                    title="Descriptografar e baixar arquivo"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition"
                    title="Excluir documento do cofre"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

