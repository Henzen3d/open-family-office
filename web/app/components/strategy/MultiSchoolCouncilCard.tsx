'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Send,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
  FileCheck,
  Scale,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SchoolEvaluation {
  school: string;
  theorists: string;
  stance: string;
  score: number;
  verdict: string;
}

interface CouncilResponse {
  topic: string;
  amount: number;
  consolidated_score: number;
  general_recommendation: string;
  evaluations: SchoolEvaluation[];
}

export default function MultiSchoolCouncilCard() {
  const [topic, setTopic] = useState('Reforma completa da cozinha e área gourmet');
  const [amount, setAmount] = useState(45000);
  const [loading, setLoading] = useState(false);
  const [councilData, setCouncilData] = useState<CouncilResponse | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleConsult = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/strategy/advisory-council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, amount }),
      });
      if (res.ok) {
        const json = await res.json();
        setCouncilData(json);
      } else {
        throw new Error('Falha na API');
      }
    } catch {
      // Deterministic client fallback
      setCouncilData({
        topic,
        amount,
        consolidated_score: 6.4,
        general_recommendation:
          'Parecer do Conselho Consultivo: Viabilidade de 6.4/10. Recomenda-se aplicar a regra de resfriamento de 14 dias e verificar se a despesa compromete os tetos do MEI.',
        evaluations: [
          {
            school: 'Escola Austríaca',
            theorists: 'Mises, Hayek, Rothbard',
            stance: 'Cautela com endividamento fiat e preferência por reservas sólidas',
            score: 6.5,
            verdict: `Comprometer R$ ${amount.toLocaleString(
              'pt-BR'
            )} em bens de consumo reduz a liquidez real da família. Se exigir crédito alavancado, evite: taxas bancárias distorcem o cálculo financeiro familiar.`,
          },
          {
            school: 'Economia Comportamental',
            theorists: 'Kahneman, Thaler, Tversky',
            stance: 'Pausa reflexiva de 14 dias para mitigar viés de presente e ancoragem',
            score: 5.0,
            verdict:
              'Decisões deste porte sofrem forte viés de novidade. Ative o período de resfriamento (cooling-off) de 14 dias antes de contratar empreiteiros ou fornecedores.',
          },
          {
            school: 'Escola Monetarista',
            theorists: 'Milton Friedman, Irving Fisher',
            stance: 'Proteção contra expansão da base monetária e equação de Fisher',
            score: 7.0,
            verdict: `Desembolsar R$ ${amount.toLocaleString(
              'pt-BR'
            )} hoje significa abrir mão de um rendimento real que repõe a diluição inflacionária. Exija retorno real acima de 6% a.a. para qualquer capital remanescente.`,
          },
          {
            school: 'Economia Institucional',
            theorists: 'Thorstein Veblen, Ronald Coase',
            stance: 'Segurança jurídica de contratos, tetos fiscais MEI e consumo conspícuo',
            score: 8.0,
            verdict:
              'Exija contrato formal com cláusulas de entrega e garantia, emitindo notas fiscais de serviços para dedução ou comprovação e evitando riscos trabalhistas informais.',
          },
          {
            school: 'Escola Neoclássica',
            theorists: 'Harry Markowitz, William Sharpe',
            stance: 'Otimização da fronteira eficiente e custo de oportunidade marginal',
            score: 5.5,
            verdict: `Em 10 anos a 11,25% a.a., R$ ${amount.toLocaleString(
              'pt-BR'
            )} investidos acumulariam R$ ${(amount * Math.pow(1.1125, 10)).toLocaleString(
              'pt-BR',
              { maximumFractionDigits: 0 }
            )}. A obra só é racional se o bem-estar familiar superar esse montante.`,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const getSchoolIcon = (idx: number) => {
    switch (idx) {
      case 0:
        return <Shield className="w-4 h-4 text-amber-500" />;
      case 1:
        return <Clock className="w-4 h-4 text-indigo-500" />;
      case 2:
        return <TrendingUp className="w-4 h-4 text-rose-500" />;
      case 3:
        return <FileCheck className="w-4 h-4 text-emerald-500" />;
      default:
        return <Scale className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Comitê Consultivo Virtual (As 5 Escolas Econômicas)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Parecer estruturado sob a ótica de 5 grandes teorias econômicas antes de fechar um grande compromisso
          </p>
        </div>
      </div>

      {/* Input query section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Plano ou Decisão Familiar
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: Reforma da cozinha, compra de barco, intercâmbio dos filhos..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Montante Envolvido (R$)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white"
            />
            <button
              onClick={handleConsult}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Avaliando...' : 'Consultar'}
            </button>
          </div>
        </div>
      </div>

      {/* Output results */}
      {councilData && (
        <div className="space-y-4 pt-2">
          {/* Header Verdict Card */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Parecer Consolidado do Conselho
              </span>
              <p className="text-xs font-medium text-slate-900 dark:text-white mt-0.5">
                {councilData.general_recommendation}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <span className="text-xs text-slate-500">Nota de Viabilidade:</span>
              <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg bg-white dark:bg-[#161c28] border border-indigo-500/20">
                {councilData.consolidated_score} / 10
              </span>
            </div>
          </div>

          {/* 5 Schools Grid / Accordion */}
          <div className="space-y-2">
            {councilData.evaluations.map((ev, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <div
                  key={ev.school}
                  className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 overflow-hidden transition"
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      {getSchoolIcon(idx)}
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {ev.school}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ev.theorists} • {ev.stance}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {ev.score.toFixed(1)}/10
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-1 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200/40 dark:border-white/5 leading-relaxed bg-white/50 dark:bg-black/20">
                      {ev.verdict}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

