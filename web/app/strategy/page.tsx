'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Compass,
  Sparkles,
  Car,
  Building,
  Smartphone,
  GraduationCap,
  Globe,
  Lock,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import OpportunityRadarView from '../components/strategy/OpportunityRadarView';
import CarSimulatorCard from '../components/strategy/CarSimulatorCard';
import HomeVsRentCard from '../components/strategy/HomeVsRentCard';
import GadgetOpportunityCard from '../components/strategy/GadgetOpportunityCard';
import MultiSchoolCouncilCard from '../components/strategy/MultiSchoolCouncilCard';
import RemittanceCostCalculator from '../components/cross_border/RemittanceCostCalculator';
import UsTaxAdvantagedCard from '../components/cross_border/UsTaxAdvantagedCard';
import CrossBorderComplianceRadar from '../components/cross_border/CrossBorderComplianceRadar';
import LegalVaultModal from '../components/legal_vault/LegalVaultModal';
import SuccessionChecklistCard from '../components/legal_vault/SuccessionChecklistCard';

type StrategyTab = 'radar' | 'car' | 'home' | 'gadget' | 'council' | 'crossborder' | 'vault';

export default function StrategyPage() {
  const [activeTab, setActiveTab] = useState<StrategyTab>('radar');
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c1017] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased transition-colors duration-200">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-20 flex flex-col min-h-screen max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 text-slate-500 hover:text-indigo-600 transition"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Central de Estratégias & Decisões
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                A IA atuando como consultora patrimonial ativa da família: radar de oportunidades e simuladores reais
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-[#161c28] border border-slate-300/40 dark:border-white/5 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('radar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'radar'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Radar Proativo
            </button>

            <button
              onClick={() => setActiveTab('car')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'car'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Carro (TCO)
            </button>

            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'home'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Imóvel vs Aluguel
            </button>

            <button
              onClick={() => setActiveTab('gadget')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'gadget'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Compras & Gadgets
            </button>

            <button
              onClick={() => setActiveTab('council')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'council'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Conselho Multi-Escolas
            </button>

            <button
              onClick={() => setActiveTab('crossborder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'crossborder'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Cross-Border & Câmbio
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                activeTab === 'vault'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Cofre Legal & Sucessão
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="w-full">
          {activeTab === 'radar' && <OpportunityRadarView />}
          {activeTab === 'car' && <CarSimulatorCard />}
          {activeTab === 'home' && <HomeVsRentCard />}
          {activeTab === 'gadget' && <GadgetOpportunityCard />}
          {activeTab === 'council' && <MultiSchoolCouncilCard />}
          {activeTab === 'crossborder' && (
            <div className="space-y-6">
              <CrossBorderComplianceRadar />
              <RemittanceCostCalculator />
              <UsTaxAdvantagedCard />
            </div>
          )}
          {activeTab === 'vault' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Cofre Legal & Documental (AES-256-GCM)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Guarde escrituras, contratos sociais e apólices criptografadas localmente com senha-mestre
                  </p>
                </div>
                <button
                  onClick={() => setIsVaultOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm shrink-0"
                >
                  <Lock className="w-4 h-4" />
                  Acessar Cofre Criptografado
                </button>
              </div>

              <SuccessionChecklistCard />
            </div>
          )}
        </div>
      </main>

      {/* Legal Vault Modal */}
      <LegalVaultModal isOpen={isVaultOpen} onClose={() => setIsVaultOpen(false)} />
    </div>
  );
}
