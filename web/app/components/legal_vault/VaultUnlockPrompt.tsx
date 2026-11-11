'use client';

import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, ShieldCheck, X } from 'lucide-react';

interface VaultUnlockPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VaultUnlockPrompt({
  isOpen,
  onClose,
  onSuccess,
}: VaultUnlockPromptProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/vault/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ master_password: password }),
      });

      if (res.ok) {
        setPassword('');
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Senha-mestre incorreta.');
      }
    } catch {
      setError('Erro de conexão ao validar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cofre Legal & Documental
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Criptografia militar local AES-256-GCM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Senha-Mestre da Família
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha-mestre para descriptografar..."
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Sessão segura mantida apenas na memória RAM por 15 minutos de inatividade.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? (
                'Descriptografando...'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Abrir Cofre
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

