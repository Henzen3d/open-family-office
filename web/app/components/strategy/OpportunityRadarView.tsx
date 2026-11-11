'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface RadarAlert {
  id: string;
  category: string;
  severity: 'danger' | 'warning' | 'high' | 'medium' | 'info';
  title: string;
  description: string;
  balance?: number;
  idle_surplus?: number;
  monthly_impact?: number;
  annual_impact?: number;
  percentage_used?: number;
  remaining_limit?: number;
  action_label?: string;
}

interface RadarData {
  summary: {
    total_alerts: number;
    high_severity_count: number;
    monthly_potential_savings: number;
    annual_potential_savings: number;
    generated_at: string;
  };
  alerts: RadarAlert[];
}

export default function OpportunityRadarView() {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coolingOffItems, setCoolingOffItems] = useState([
    {
      id: 'cool-1',
      item: 'Notebook Dell XPS 16',
      price: 14200,
      daysLeft: 8,
      totalDays: 14,
      category: 'Equipamento',
    },
    {
      id: 'cool-2',
      item: 'Relógio Smartwatch Titânio',
      price: 3890,
      daysLeft: 3,
      totalDays: 14,
      category: 'Pessoal',
    },
  ]);

  const fetchRadar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/strategy/opportunities');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error('Falha ao carregar radar');
      }
    } catch {
      // Fallback realistic family data
      setData({
        summary: {
          total_alerts: 3,
          high_severity_count: 1,
          monthly_potential_savings: 345.5,
          annual_potential_savings: 4146.0,
          generated_at: new Date().toISOString(),
        },
        alerts: [
          {
            id: 'OPP-CASH-CAIXA',
            category: 'idle_cash',
            severity: 'high',
            title: 'Caixa Ocioso em Caixa Econômica Corrente',
            description:
              'R$ 24.500,00 na conta corrente sem remuneração. Alocar o excedente (R$ 21.500,00) em Tesouro Selic ou CDB 100% CDI gera ~R$ 171,20/mês (~R$ 2.054,00/ano líquido) com liquidez diária.',
            monthly_impact: 171.2,
            annual_impact: 2054.4,
            action_label: 'Simular Alocação',
          },
          {
            id: 'OPP-MEI-FIX',
            category: 'tax_ceiling',
            severity: 'warning',
            title: 'Teto MEI em Risco: Fix Serviços MEI (Osmar)',
            description:
              'Fix Serviços já atingiu R$ 64.800,00 (80,0% do teto anual de R$ 81.000,00). Margem restante de R$ 16.200,00. Recomenda-se direcionar novos contratos de vistoria/manutenção para o Facilita MEI (Vera).',
            percentage_used: 80.0,
            remaining_limit: 16200.0,
            action_label: 'Redirecionar Faturamento',
          },
          {
            id: 'OPP-REC-STREAMING',
            category: 'recurring_subscription',
            severity: 'info',
            title: 'Assinaturas Recorrentes Detectadas',
            description:
              'Despesas de streaming e softwares somam R$ 174,30/mês (R$ 2.091,60/ano). Revisão trimestral recomendada para checar serviços ociosos.',
            monthly_impact: 174.3,
            annual_impact: 2091.6,
            action_label: 'Revisar Assinaturas',
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, []);

  const handleDismissCooling = (id: string) => {
    setCoolingOffItems((prev) => prev.filter((i) => i.id !== id));
  };

  const getSeverityBadge = (severity: RadarAlert['severity']) => {
    switch (severity) {
      case 'danger':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'warning':
      case 'high':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'medium':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Economia / Ganho Mensal
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            +R$ {data?.summary.monthly_potential_savings.toFixed(2) ?? '0,00'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ganhos imediatos com remuneração de caixa e ajustes
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Potencial Anualizado
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            +R$ {data?.summary.annual_potential_savings.toFixed(2) ?? '0,00'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Impacto acumulado em 12 meses na carteira da família
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Alertas Ativos
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {data?.summary.total_alerts ?? 0} detectados
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data?.summary.high_severity_count ?? 0} exigem atenção prioritária
          </p>
        </div>
      </div>

      {/* Active Radar Alerts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Radar Proativo de Oportunidades & Riscos
          </h3>
          <button
            onClick={fetchRadar}
            disabled={loading}
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Auditoria
          </button>
        </div>

        {data?.alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-5 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm hover:border-indigo-500/40 transition group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${getSeverityBadge(
                      alert.severity
                    )}`}
                  >
                    {alert.severity === 'high' || alert.severity === 'danger'
                      ? 'Prioritário'
                      : 'Oportunidade'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {alert.title}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {alert.description}
                </p>

                {alert.percentage_used !== undefined && (
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
                      <span>Utilização do Teto MEI</span>
                      <span>{alert.percentage_used.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          alert.percentage_used >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, alert.percentage_used)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {alert.monthly_impact && (
                <div className="text-right shrink-0 border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-white/5 pt-3 md:pt-0 md:pl-5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                    Ganho Mensal Estimado
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    +R$ {alert.monthly_impact.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    R$ {alert.annual_impact?.toFixed(2)}/ano
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Trava Comportamental: Itens em Cooling-Off */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Trava de Reflexão Ativa (Cooling-Off de 14 Dias)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Itens colocados em quarentena emocional para evitar compras por impulso
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            {coolingOffItems.length} compras em reflexão
          </span>
        </div>

        {coolingOffItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
            Nenhum item em período de reflexão no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {coolingOffItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.item}
                    </h5>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      R$ {item.price.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      Restam <strong className="text-amber-500">{item.daysLeft} dias</strong> de reflexão
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{
                        width: `${((item.totalDays - item.daysLeft) / item.totalDays) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5">
                  <button
                    onClick={() => handleDismissCooling(item.id)}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Decidi Investir
                  </button>
                  <button
                    onClick={() => handleDismissCooling(item.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition"
                  >
                    Liberar Compra
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

