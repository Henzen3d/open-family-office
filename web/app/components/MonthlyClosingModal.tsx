'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Download,
  Printer,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface MeiSummary {
  entity_code: string;
  entity_name: string;
  month: number;
  year: number;
  gross_revenue_month: number;
  gross_revenue_ytd: number;
  annual_ceiling: number;
  ceiling_used_percent: number;
  remaining_ceiling: number;
  monthly_runway_status: string;
  documented_expenses_month: number;
  net_operating_profit_month: number;
  exempt_profit_distribution: number;
  das_estimated: number;
  report_ready: boolean;
}

interface ClosingAuditData {
  month: number;
  year: number;
  period_label: string;
  closing_status: string;
  active_accounts: string[];
  total_transactions_count: number;
  total_inflows: number;
  total_outflows: number;
  documentation_rate: number;
  missing_receipts_count: number;
  missing_receipts_amount: number;
  segregation_alerts_count: number;
  segregation_alerts: Array<{
    transaction_id: string;
    notes: string;
    suggested_action?: string;
  }>;
  potential_duplicates_count: number;
  potential_duplicates: any[];
  mei_summaries: Record<string, MeiSummary>;
  checklist: {
    statements_imported: boolean;
    transfers_neutralized: boolean;
    receipts_fully_documented: boolean;
    segregation_clean: boolean;
    mei_ceilings_safe: boolean;
  };
}

interface MonthlyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: number;
  initialYear?: number;
}

export default function MonthlyClosingModal({
  isOpen,
  onClose,
  initialMonth,
  initialYear,
}: MonthlyClosingModalProps) {
  const [data, setData] = useState<ClosingAuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<'FIX_SERVICOS' | 'FACILITA_VISTORIAS'>('FIX_SERVICOS');
  const [showPrintableReport, setShowPrintableReport] = useState(false);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (initialMonth) params.append('month', initialMonth.toString());
      if (initialYear) params.append('year', initialYear.toString());
      
      const res = await fetch(`/api/py/closing/audit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load monthly closing audit:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditData();
    }
  }, [isOpen, initialMonth, initialYear]);

  if (!isOpen) return null;

  const activeMei = data?.mei_summaries?.[selectedEntity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-[#161c28]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Fechamento Contábil Mensal & Apuração MEI
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  Clara Zero-Retrabalho
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data?.period_label || 'Carregando período...'} • Auditoria de receitas, despesas e distribuição isenta de lucros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Executando auditoria contábil completa...
            </div>
          ) : data ? (
            <>
              {/* Top Status & Checklist Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Card */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161c28] flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status do Fechamento</span>
                    <div className="flex items-center gap-2 mt-2">
                      {data.closing_status === 'READY_TO_CLOSE' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Pronto para Fechar</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">Pendências a Regularizar</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                    {data.total_transactions_count} lançamentos no mês • {data.active_accounts.length} contas bancárias ativas
                  </div>
                </div>

                {/* Documentation Rate Card */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161c28] flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cobertura de Comprovantes</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {data.documentation_rate}%
                      </span>
                      <span className="text-xs text-slate-500">das despesas</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                    {data.missing_receipts_count > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {data.missing_receipts_count} despesas sem cupom (R$ {data.missing_receipts_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">100% comprovado com nota</span>
                    )}
                  </div>
                </div>

                {/* Segregation Risk Card */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161c28] flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Segregação Patrimonial</span>
                    <div className="flex items-center gap-2 mt-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-500" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Blindagem LC 123/2006</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                    {data.segregation_alerts_count > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {data.segregation_alerts_count} despesas pessoais na conta PJ detectadas
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Zero mistura de contas</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Clara-Style Verification Checklist */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161c28]/60 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Checklist de Fechamento sem Retrabalho
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {data.checklist.statements_imported ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">Extratos bancários importados e atualizados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.checklist.transfers_neutralized ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">Faturas e transferências neutralizadas (sem duplicidade)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.checklist.receipts_fully_documented ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">Cupons e notas fiscais de despesas validados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.checklist.segregation_clean ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">Contas PJ protegidas contra compras de uso familiar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.checklist.mei_ceilings_safe ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">Teto anual do MEI em faixa regular e controlada</span>
                  </div>
                </div>
              </div>

              {/* Entity Selector Tabs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-[#161c28] rounded-xl border border-slate-200 dark:border-white/5">
                    <button
                      onClick={() => setSelectedEntity('FIX_SERVICOS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        selectedEntity === 'FIX_SERVICOS'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      FIX Serviços (Osmar)
                    </button>
                    <button
                      onClick={() => setSelectedEntity('FACILITA_VISTORIAS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        selectedEntity === 'FACILITA_VISTORIAS'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Facilita Vistorias (Vera)
                    </button>
                  </div>

                  <button
                    onClick={() => setShowPrintableReport(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Relatório Mensal MEI (CGSN 140)</span>
                  </button>
                </div>

                {/* MEI Accounting & Profit Distribution Card */}
                {activeMei && (
                  <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#161c28]/40 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/5 pb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activeMei.entity_name}</h4>
                        <p className="text-xs text-slate-500">
                          Apuração fiscal para geração do DAS e Distribuição de Lucros Isenta de IRPF
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500">DAS Estimado</span>
                        <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                          R$ {activeMei.das_estimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 rounded-xl bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/5">
                        <span className="text-[11px] text-slate-500">Faturamento Mês</span>
                        <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                          R$ {activeMei.gross_revenue_month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/5">
                        <span className="text-[11px] text-slate-500">Despesas Comprovadas</span>
                        <div className="text-base font-bold font-mono text-slate-700 dark:text-slate-300 mt-1">
                          R$ {activeMei.documented_expenses_month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/5">
                        <span className="text-[11px] text-slate-500">Lucro Operacional</span>
                        <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-1">
                          R$ {activeMei.net_operating_profit_month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30">
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Lucro Isento (PF)
                        </span>
                        <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                          R$ {activeMei.exempt_profit_distribution.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Progress to Ceiling */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span className="text-slate-600 dark:text-slate-400">
                          Faturamento Acumulado no Ano (Teto R$ 81.000,00)
                        </span>
                        <span className="text-slate-900 dark:text-white font-mono font-bold">
                          R$ {activeMei.gross_revenue_ytd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({activeMei.ceiling_used_percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            activeMei.ceiling_used_percent > 80
                              ? 'bg-rose-500'
                              : activeMei.ceiling_used_percent > 65
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(activeMei.ceiling_used_percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                        <span>Margem livre até o teto: R$ {activeMei.remaining_ceiling.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Segregação 100% blindada</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Segregation Alerts Section if any */}
              {data.segregation_alerts && data.segregation_alerts.length > 0 && (
                <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 uppercase">
                    <AlertTriangle className="w-4 h-4" />
                    Alertas de Despesas Fora de Política (Segregação)
                  </h4>
                  <div className="space-y-1 text-xs text-rose-600 dark:text-rose-300">
                    {data.segregation_alerts.map((alert, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white/60 dark:bg-black/20">
                        {alert.notes}
                        {alert.suggested_action && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            👉 Sugestão: {alert.suggested_action}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-[#161c28]/50">
          <div className="text-xs text-slate-500">
            Base legal: LC 123/2006, art. 14 • Resolução CGSN nº 140/2018
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-sm"
          >
            Concluir Revisão
          </button>
        </div>

      </div>

      {/* Printable Report Submodal */}
      {showPrintableReport && activeMei && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold">Relatório Mensal das Receitas Brutas</h3>
                <p className="text-xs text-slate-600">
                  Modelo oficial exigido pelo Art. 106 da Resolução CGSN nº 140/2018
                </p>
              </div>
              <button
                onClick={() => setShowPrintableReport(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="font-semibold text-slate-500">Empreendedor Individual:</span>
                  <div className="font-bold text-sm">{activeMei.entity_name}</div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Período de Apuração:</span>
                  <div className="font-bold text-sm">{data?.period_label}</div>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left">Discriminação das Receitas Brutas</th>
                    <th className="border border-slate-300 p-2 text-right">Valor Apurado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2">
                      I - Receita bruta com prestação de serviços com emissão de documento fiscal
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                      R$ {activeMei.gross_revenue_month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">
                      II - Receita bruta com prestação de serviços sem emissão de documento fiscal
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      R$ 0,00
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-300 p-2">TOTAL DA RECEITA BRUTA NO MÊS</td>
                    <td className="border border-slate-300 p-2 text-right font-mono text-emerald-700">
                      R$ {activeMei.gross_revenue_month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-bold text-emerald-800">
                  Demonstrativo de Lucro Isento Transferível para Pessoa Física:
                </span>
                <div className="flex justify-between text-emerald-900 font-mono">
                  <span>Receita Bruta (-) Despesas Comprovadas:</span>
                  <span className="font-bold">R$ {activeMei.exempt_profit_distribution.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                <div>Local e Data: Florianópolis, {new Date().toLocaleDateString('pt-BR')}</div>
                <div className="border-t border-slate-400 pt-1 px-8">Assinatura do Titular</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800"
              >
                <Printer className="w-4 h-4" />
                Imprimir Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

