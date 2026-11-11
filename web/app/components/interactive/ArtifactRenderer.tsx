'use client';

import React from 'react';
import CompoundInterestCard from './CompoundInterestCard';
import PurchaseOpportunityCard from './PurchaseOpportunityCard';
import RealVsNominalCard from './RealVsNominalCard';

export interface InteractiveArtifactData {
  id: string;
  artifact_type: 'compound_interest' | 'purchase_opportunity' | 'real_vs_nominal' | 'mortgage_vs_rent' | string;
  title: string;
  description?: string;
  created_at: string;
  payload: Record<string, any>;
}

interface ArtifactRendererProps {
  artifact?: InteractiveArtifactData | null;
}

export default function ArtifactRenderer({ artifact }: ArtifactRendererProps) {
  if (!artifact) return null;

  try {
    switch (artifact.artifact_type) {
      case 'compound_interest':
        return (
          <CompoundInterestCard
            initialPrincipal={artifact.payload.initial_principal}
            monthlyDeposit={artifact.payload.monthly_deposit}
            annualRatePercent={artifact.payload.annual_rate_percent}
            years={artifact.payload.years}
            currencyPrefix={artifact.payload.currency_prefix}
          />
        );

      case 'purchase_opportunity':
        return (
          <PurchaseOpportunityCard
            itemName={artifact.payload.item_name}
            cashPrice={artifact.payload.cash_price || artifact.payload.cost}
            installmentsCount={artifact.payload.installments_count}
            installmentValue={artifact.payload.installment_value}
            benchmarkAnnualRate={artifact.payload.benchmark_annual_rate}
            familyMonthlyIncome={artifact.payload.family_monthly_income}
            coolingOffDaysSuggested={artifact.payload.cooling_off_days_suggested}
          />
        );

      case 'real_vs_nominal':
        return (
          <RealVsNominalCard
            nominalRatePercent={artifact.payload.nominal_rate_percent}
            inflationAnnualPercent={artifact.payload.inflation_annual_percent}
            incomeTaxPercent={artifact.payload.income_tax_percent}
          />
        );

      default:
        return (
          <div className="my-3 p-4 bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-2xl text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">{artifact.title}</h4>
            <pre className="font-mono text-[11px] overflow-x-auto text-slate-600 dark:text-slate-400">
              {JSON.stringify(artifact.payload, null, 2)}
            </pre>
          </div>
        );
    }
  } catch (err) {
    console.error('Failed to render interactive artifact:', err);
    return null;
  }
}

