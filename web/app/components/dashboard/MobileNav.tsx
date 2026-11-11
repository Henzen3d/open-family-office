'use client';

import React from 'react';
import { Home, FileText, Sparkles, Sun, Moon, Settings } from 'lucide-react';

interface MobileNavProps {
  activeTab: 'all' | 'fix' | 'facilita' | 'pf';
  setActiveTab: (tab: 'all' | 'fix' | 'facilita' | 'pf') => void;
  setIsStatementOpen: (open: boolean) => void;
  setIsAssistantOpen: (open: boolean) => void;
  theme: 'dark' | 'light';
  handleThemeChange: (theme: 'dark' | 'light') => void;
  setIsSettingsOpen: (open: boolean) => void;
}

export default function MobileNav({
  activeTab,
  setActiveTab,
  setIsStatementOpen,
  setIsAssistantOpen,
  theme,
  handleThemeChange,
  setIsSettingsOpen,
}: MobileNavProps) {
  return (
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
  );
}

