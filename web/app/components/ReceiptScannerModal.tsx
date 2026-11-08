'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Receipt as ReceiptIcon,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ReceiptItemData {
  item_index: number;
  description: string;
  quantity: number;
  unit_measure: string;
  unit_price: number;
  total_price: number;
  category_code?: string;
}

interface ExtractedReceipt {
  id: string;
  entity_code: string;
  merchant_name: string;
  merchant_tax_id?: string;
  issue_date: string;
  total_amount: number;
  payment_method: string;
  fiscal_access_key?: string;
  confidence_score: number;
  matched_transaction_id?: string;
  exif_metadata_purged: boolean;
  items: ReceiptItemData[];
}

export default function ReceiptScannerModal({ isOpen, onClose, onSuccess }: ReceiptScannerModalProps) {
  const [selectedEntity, setSelectedEntity] = useState<string>('FIX_SERVICOS');
  const [file, setFile] = useState<File | null>(null);
  const [sefazKeyInput, setSefazKeyInput] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [extractedReceipt, setExtractedReceipt] = useState<ExtractedReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (!file && !sefazKeyInput.trim()) {
      setErrorMsg('Envie uma foto de recibo ou informe a chave de 44 dígitos da SEFAZ.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (sefazKeyInput.trim()) formData.append('sefaz_key', sefazKeyInput.trim());
    formData.append('entity_code', selectedEntity);

    try {
      const res = await fetch('/api/py/receipts/extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Falha ao processar o comprovante fiscal.');
      }

      const data = await res.json();
      setExtractedReceipt(data.receipt);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante extração OCR.');
      setExtractedReceipt(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndClose = () => {
    setSavedSuccess(true);
    if (onSuccess) onSuccess();
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const resetAll = () => {
    setFile(null);
    setSefazKeyInput('');
    setExtractedReceipt(null);
    setErrorMsg(null);
    setSavedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-backdrop-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Leitor de Cupom Fiscal & Recibos</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Purga de Metadados EXIF • OCR Multimodal • Conciliação Automática no Razão
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1f2738] text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Privacy Alert */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300">
              Garantia de Privacidade: Os metadados EXIF (localização GPS, número de série do aparelho) são eliminados localmente antes de qualquer processamento visual.
            </span>
          </div>

          {!extractedReceipt ? (
            <>
              {/* Entity Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Atribuir Despesa à Entidade
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEntity('FIX_SERVICOS')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition ${
                      selectedEntity === 'FIX_SERVICOS'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1f2738] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Fix Serviços (MEI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEntity('FACILITA_VISTORIAS')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition ${
                      selectedEntity === 'FACILITA_VISTORIAS'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1f2738] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Facilita Vistorias (MEI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEntity('HOUSEHOLD_OSMAR')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition ${
                      selectedEntity === 'HOUSEHOLD_OSMAR'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1f2738] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Família PF (Casal)
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Foto do Cupom Fiscal / Recibo
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-indigo-500 rounded-3xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-[#161c28]/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFile(e.target.files[0]);
                    }}
                  />
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {file ? file.name : 'Tirar foto ou selecionar imagem do cupom'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Formatos JPG, PNG ou WEBP
                  </p>
                </div>
              </div>

              {/* SEFAZ 44-digit Key (Alternative / Complement) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Ou Chave de Acesso NFC-e / NF-e (44 dígitos)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={44}
                    value={sefazKeyInput}
                    onChange={(e) => setSefazKeyInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="3526 1112 3456 7800 0195 6500 1000 0000 0112 3456 7890"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1f2738] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          ) : (
            /* Extracted Details View */
            <div className="space-y-4">
              {/* Receipt Head */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#1f2738] border border-slate-200 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {extractedReceipt.merchant_name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      CNPJ: {extractedReceipt.merchant_tax_id || 'Não informado'} • Data: {extractedReceipt.issue_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total</span>
                    <span className="text-lg font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                      R$ {extractedReceipt.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Match indicator */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {extractedReceipt.matched_transaction_id
                        ? `Vinculado ao extrato (${extractedReceipt.matched_transaction_id})`
                        : 'Lançamento indexado com sucesso no livro-razão'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Confiança: {Math.round(extractedReceipt.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Items List */}
              {extractedReceipt.items && extractedReceipt.items.length > 0 && (
                <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-[#1f2738] text-slate-500 font-bold">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-right">Qtd</th>
                        <th className="py-2 px-3 text-right">Preço</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {extractedReceipt.items.map((it) => (
                        <tr key={it.item_index} className="hover:bg-slate-50 dark:hover:bg-[#1f2738]/50">
                          <td className="py-2 px-3 font-medium">{it.description}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {it.quantity} {it.unit_measure}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            R$ {it.unit_price.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            R$ {it.total_price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {savedSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Comprovante salvo e conciliado com sucesso!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <button
            onClick={resetAll}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            Reiniciar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#1f2738] transition"
            >
              Fechar
            </button>

            {!extractedReceipt ? (
              <button
                onClick={handleProcess}
                disabled={loading || (!file && !sefazKeyInput.trim())}
                type="button"
                className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-pill disabled:opacity-50 transition"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processando OCR...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Analisar Comprovante</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSaveAndClose}
                type="button"
                className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-pill transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Concluir e Arquivar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

