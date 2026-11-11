'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface DocumentUploaderProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DocumentUploader({ onSuccess, onCancel }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('PERSONAL_FAMILY');
  const [description, setDescription] = useState('');
  const [registryOffice, setRegistryOffice] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor selecione um arquivo.');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('description', description || file.name);
    if (registryOffice) formData.append('registry_office', registryOffice);
    if (issuedDate) formData.append('issued_date', issuedDate);
    if (expirationDate) formData.append('expiration_date', expirationDate);
    if (tags) formData.append('tags', tags);

    try {
      const res = await fetch('/api/vault/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Erro ao criptografar e salvar arquivo.');
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-indigo-500" />
          Adicionar Documento Criptografado ao Cofre
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* File Drop Area */}
      <div>
        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl cursor-pointer hover:border-indigo-500 transition bg-white dark:bg-[#161c28]">
          <UploadCloud className="w-6 h-6 text-indigo-500 mb-1" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {file ? file.name : 'Clique para selecionar PDF ou Imagem'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Cifragem AES-256-GCM instantânea'}
          </span>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.pfx"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Categoria Institucional
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-slate-900 dark:text-white"
          >
            <option value="REAL_ESTATE">Imóveis & Matrículas de Cartório</option>
            <option value="CORPORATE_MEI">Empresarial & Contratos Sociais MEI</option>
            <option value="PERSONAL_FAMILY">Pessoal, Casamento & Pacto</option>
            <option value="INSURANCE_HEALTH">Seguros de Vida & Quitações</option>
            <option value="SUCCESSION_WILL">Sucessão, Testamento & Beneficiários</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Cartório / Órgão Emissor
          </label>
          <input
            type="text"
            value={registryOffice}
            onChange={(e) => setRegistryOffice(e.target.value)}
            placeholder="Ex: 1º Cartório de Registro de Imóveis"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
          Descrição do Documento
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Escritura definitiva do apartamento quitado"
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Data de Emissão
          </label>
          <input
            type="date"
            value={issuedDate}
            onChange={(e) => setIssuedDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Data de Vencimento (se houver)
          </label>
          <input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28] text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !file}
          className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow-sm"
        >
          {loading ? 'Criptografando...' : 'Criptografar e Salvar'}
        </button>
      </div>
    </form>
  );
}

