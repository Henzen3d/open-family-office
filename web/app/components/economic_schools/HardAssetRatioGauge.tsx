'use client';

import React from 'react';
import { Shield, Sparkles, AlertCircle } from 'lucide-react';

interface HardAssetRatioGaugeProps {
  hardAssetRatio?: number;
  hardAssetsTotal?: number;
  fiatCashTotal?: number;
}

export default function HardAssetRatioGauge({
  hardAssetRatio = 83.6,
  hardAssetsTotal = 425000,
  fiatCashTotal = 83121.36,
}: HardAssetRatioGaugeProps) {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Hard Asset Ratio (Escola Austríaca)
            </h4>
            <span className="text-[10px] text-slate-400">
              Proporção de ativos escassos e reais contra diluição fiat
            </span>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10">
          {hardAssetRatio}% Reais
        </span>
      </div>

      {/* Visual Bicolor Ratio Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden flex">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${hardAssetRatio}%` }}
            title={`Ativos Reais: ${hardAssetRatio}%`}
          />
          <div
            className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500"
            style={{ width: `${100 - hardAssetRatio}%` }}
            title={`Papel Fiat: ${(100 - hardAssetRatio).toFixed(1)}%`}
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-slate-500">
          <span>Ativos Reais: R$ {hardAssetsTotal.toLocaleString('pt-BR')}</span>
          <span>Fiat/Contas: R$ {fiatCashTotal.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
        <strong className="text-amber-600 dark:text-amber-400 font-semibold block mb-0.5">
          Diagnóstico de Soberania:
        </strong>
        Manter mais de 60% em ativos reais (imóveis próprios e reservas não fiduciárias) protege o poder de compra da família contra a inflação histórica e expansão da base monetária.
      </div>
    </div>
  );
}

