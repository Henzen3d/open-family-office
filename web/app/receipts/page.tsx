'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Camera,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  DollarSign,
  Maximize2,
  Receipt,
  FileText,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const ReceiptViewerModal = dynamic(() => import('../components/ReceiptViewerModal'), { ssr: false });

export interface ReceiptItem {
  receipt_id: string;
  filename?: string;
  merchant?: string;
  date?: string;
  total_amount?: number;
  entity_code?: string;
  category?: string;
  fiscal_access_key?: string;
  items_count?: number;
  image_url?: string;
  extracted_at?: string;
  status?: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'fix' | 'facilita' | 'pf'>('all');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/py/receipts/recent');
      if (res.ok) {
        const data = await res.json();
        if (data.receipts && Array.isArray(data.receipts)) {
          setReceipts(data.receipts);
        }
      }
    } catch (e) {
      console.error('Failed to load receipts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity', entityFilter === 'all' ? 'FIX_SERVICOS' : entityFilter.toUpperCase());

      const res = await fetch('/api/py/receipts/extract', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadFeedback(`Cupom "${file.name}" processado com sucesso!`);
        await fetchReceipts();
      } else {
        setUploadFeedback('Falha no processamento OCR do cupom.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadFeedback('Erro de conexão durante o upload.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadFeedback(null), 4000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const filteredReceipts = receipts.filter((r) => {
    if (entityFilter === 'fix' && r.entity_code !== 'FIX_SERVICOS') return false;
    if (entityFilter === 'facilita' && r.entity_code !== 'FACILITA_VISTORIAS') return false;
    if (entityFilter === 'pf' && r.entity_code !== 'HOUSEHOLD_OSMAR') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchMerchant = r.merchant?.toLowerCase().includes(q);
      const matchDate = r.date?.includes(q);
      const matchKey = r.fiscal_access_key?.includes(q);
      if (!matchMerchant && !matchDate && !matchKey) return false;
    }
    return true;
  });

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
                  Galeria Visual de Cupons & Recibos
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-bold">
                  OCR Vision Integrado
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Armazenamento de notas fiscais, expurgo de metadados EXIF e conciliação automática com o Livro Razão
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-pill transition active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{uploading ? 'Processando OCR...' : 'Escanear Novo Cupom'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 mb-6 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-300 dark:border-white/15 bg-white dark:bg-[#161c28] hover:border-indigo-400'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Arraste cupons fiscais ou fotos de recibos aqui
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Suporta fotos de smartphone (.jpg, .png) ou faturas (.pdf). Extração de valor, data, CNPJ e itens via OCR local.
              </p>
            </div>
          </div>
        </div>

        {uploadFeedback && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{uploadFeedback}</span>
          </div>
        )}

        {/* Search & Entity Filters */}
        <div className="bg-white dark:bg-[#161c28] p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="w-full md:w-96 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por estabelecimento, data ou chave fiscal..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#121722] border border-slate-200 dark:border-white/10 rounded-2xl text-xs placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setEntityFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                entityFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos os Cupons
            </button>
            <button
              onClick={() => setEntityFilter('fix')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                entityFilter === 'fix'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Fix Serviços
            </button>
            <button
              onClick={() => setEntityFilter('facilita')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                entityFilter === 'facilita'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Facilita Vistorias
            </button>
            <button
              onClick={() => setEntityFilter('pf')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                entityFilter === 'pf'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Família PF
            </button>
          </div>
        </div>

        {/* Receipts Visual Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full py-16 text-center text-slate-500">
              Carregando cupons da galeria...
            </div>
          ) : filteredReceipts.length > 0 ? (
            filteredReceipts.map((receipt) => (
              <div
                key={receipt.receipt_id}
                onClick={() => {
                  setSelectedReceiptId(receipt.receipt_id);
                  setIsViewerOpen(true);
                }}
                className="group bg-white dark:bg-[#161c28] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card hover:shadow-xl hover:border-indigo-500/40 transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                {/* Image Thumbnail Container */}
                <div className="relative w-full h-48 bg-slate-100 dark:bg-[#10141d] overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-white/5">
                  <img
                    src={receipt.image_url || `/api/py/receipts/${receipt.receipt_id}/image`}
                    alt={receipt.merchant || 'Cupom Fiscal'}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" />
                    <span>Zoom</span>
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                        {receipt.date || 'Data Recente'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                        {receipt.entity_code === 'FIX_SERVICOS' ? 'Inter PJ' : receipt.entity_code === 'FACILITA_VISTORIAS' ? 'Caixa PJ' : 'Nubank PF'}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {receipt.merchant || receipt.filename || 'Comprovante Fiscal'}
                    </h3>

                    {receipt.fiscal_access_key && (
                      <p className="font-mono text-[10px] text-slate-400 truncate mt-1" title={receipt.fiscal_access_key}>
                        Chave: {receipt.fiscal_access_key.slice(0, 16)}...
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Valor Total</span>
                      <strong className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                        R$ {Number(receipt.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                      Ver detalhes →
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-slate-500">
              Nenhum cupom fiscal encontrado. Arraste ou escaneie um comprovante acima.
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Viewer Modal */}
      <ReceiptViewerModal
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setSelectedReceiptId(null);
        }}
        receiptId={selectedReceiptId || ''}
      />
    </div>
  );
}

