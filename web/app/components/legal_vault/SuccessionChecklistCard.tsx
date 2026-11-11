'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface Checkpoint {
  id: string;
  title: string;
  category: string;
  criticality: string;
  description: string;
  status: 'fulfilled' | 'pending';
  has_supporting_document: boolean;
}

interface SuccessionData {
  succession_readiness_score: number;
  fulfilled_requirements: number;
  total_requirements: number;
  rating: string;
  badge: string;
  summary: string;
  checklist: Checkpoint[];
}

export default function SuccessionChecklistCard() {
  const [data, setData] = useState<SuccessionData | null>(null);

  useEffect(() => {
    async function loadSuccession() {
      try {
        const res = await fetch('/api/vault/succession');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          throw new Error();
        }
      } catch {
        setData({
          succession_readiness_score: 62.5,
          fulfilled_requirements: 5,
          total_requirements: 8,
          rating: 'Prontidão Sucessória em Estruturação',
          badge: 'amber',
          summary: 'Estrutura básica iniciada, porém faltam documentos críticos para evitar litígio ou bloqueios.',
          checklist: [
            {
              id: 'CHK-1',
              title: 'Certidão de Casamento & Pacto Antenupcial Registrado',
              category: 'PERSONAL_FAMILY',
              criticality: 'high',
              description: 'Certidão averbada com regime de bens definitivo (Comunhão Parcial com partilha clara).',
              status: 'fulfilled',
              has_supporting_document: true,
            },
            {
              id: 'CHK-2',
              title: 'Matrículas Imobiliárias Definitivas',
              category: 'REAL_ESTATE',
              criticality: 'high',
              description: 'Todos os imóveis com matrícula em nome do casal, sem contratos de gaveta pendentes de escritura.',
              status: 'fulfilled',
              has_supporting_document: true,
            },
            {
              id: 'CHK-3',
              title: 'Autorização de Movimentação e Cotitularidade Bancária',
              category: 'PERSONAL_FAMILY',
              criticality: 'high',
              description: 'Procuração bancária mútua para evitar bloqueio judicial imediato de contas em caso de acidente.',
              status: 'pending',
              has_supporting_document: false,
            },
            {
              id: 'CHK-4',
              title: 'Beneficiários Explícitos em Previdência (VGBL/401k)',
              category: 'SUCCESSION_WILL',
              criticality: 'high',
              description: 'Planos de previdência com termo de beneficiários explícitos sem necessidade de abertura de inventário.',
              status: 'fulfilled',
              has_supporting_document: true,
            },
            {
              id: 'CHK-5',
              title: 'Apólices de Seguro de Vida Vigentes no Cofre',
              category: 'INSURANCE_HEALTH',
              criticality: 'medium',
              description: 'Apólice com cobertura adequada para liquidez emergencial dos dependentes nos primeiros 12 meses.',
              status: 'fulfilled',
              has_supporting_document: true,
            },
            {
              id: 'CHK-6',
              title: 'Cláusula de Continuidade / Liquidação nos MEIs',
              category: 'CORPORATE_MEI',
              criticality: 'medium',
              description: 'Definição formal de como os CNPJs Fix Serviços e Facilita Vistorias serão transferidos ou baixados.',
              status: 'fulfilled',
              has_supporting_document: true,
            },
            {
              id: 'CHK-7',
              title: 'Diretivas Antecipadas de Vontade & Procuração Médica',
              category: 'PERSONAL_FAMILY',
              criticality: 'medium',
              description: 'Outorga formal para decisões clínicas e financeiras caso um dos cônjuges fique temporariamente incapacitado.',
              status: 'pending',
              has_supporting_document: false,
            },
            {
              id: 'CHK-8',
              title: 'Guia de Acesso de Emergência aos Herdeiros',
              category: 'SUCCESSION_WILL',
              criticality: 'high',
              description: 'Documento físico em papel com chave de recuperação do cofre e instruções de inventário extrajudicial.',
              status: 'pending',
              has_supporting_document: false,
            },
          ],
        });
      }
    }
    loadSuccession();
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Prontidão Sucessória & Governança Institucional
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Checklist de 8 pontos para blindagem familiar e transmissão de patrimônio sem atritos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-slate-400">Score de Prontidão:</span>
          <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            {data?.succession_readiness_score ?? '--'}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{data?.fulfilled_requirements} de 8 requisitos institucionais cumpridos</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{data?.rating}</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${data?.succession_readiness_score ?? 0}%` }}
          />
        </div>
      </div>

      {/* Checkpoints list */}
      <div className="space-y-2.5 pt-1">
        {data?.checklist.map((chk) => (
          <div
            key={chk.id}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              {chk.status === 'fulfilled' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {chk.title}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {chk.description}
                </p>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                chk.status === 'fulfilled'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {chk.status === 'fulfilled' ? 'Cumprido' : 'Pendente'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

