'use client';

import React, { useState, useMemo } from 'react';
import {
  Car,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Shield,
  Fuel,
  Wrench,
  Sparkles,
} from 'lucide-react';

export default function CarSimulatorCard() {
  const [carValue, setCarValue] = useState(120000);
  const [downPayment, setDownPayment] = useState(40000);
  const [loanMonths, setLoanMonths] = useState(48);
  const [loanAnnualRate, setLoanAnnualRate] = useState(16.5);
  const [monthlyKm, setMonthlyKm] = useState(1200);
  const [fuelPrice, setFuelPrice] = useState(5.89);

  // Pure client memoized calculation (60 FPS)
  const calc = useMemo(() => {
    const principal = Math.max(0, carValue - downPayment);
    let monthlyFinancing = 0;

    if (principal > 0 && loanMonths > 0) {
      const r = Math.pow(1.0 + loanAnnualRate / 100.0, 1.0 / 12.0) - 1.0;
      if (r > 0) {
        const factor = Math.pow(1.0 + r, loanMonths);
        monthlyFinancing = (principal * (r * factor)) / (factor - 1.0);
      } else {
        monthlyFinancing = principal / loanMonths;
      }
    }

    const monthlyDepreciation = (carValue * 0.1) / 12.0;
    const monthlyIpva = (carValue * 0.04) / 12.0;
    const monthlyInsurance = 4200.0 / 12.0;
    const monthlyMaintenance = (carValue * 0.03) / 12.0;
    const monthlyFuel = (monthlyKm / 11.5) * fuelPrice;

    const hiddenCosts = monthlyDepreciation + monthlyIpva + monthlyInsurance + monthlyMaintenance;
    const totalTco = monthlyFinancing + monthlyFuel + hiddenCosts;
    const annualTco = totalTco * 12.0;

    // Alternative Investment in CDI (11.25% gross, ~9.56% net)
    const netMonthlyRate = Math.pow(1.0 + 0.1125 * 0.85, 1.0 / 12.0) - 1.0;
    let portfolio4y = downPayment;
    for (let m = 0; m < Math.min(48, loanMonths); m++) {
      portfolio4y = portfolio4y * (1.0 + netMonthlyRate) + totalTco;
    }
    const residualCar4y = carValue * Math.pow(1.0 - 0.1, 4);
    const wealthGap = portfolio4y - residualCar4y;

    return {
      monthlyFinancing: Math.round(monthlyFinancing),
      monthlyFuel: Math.round(monthlyFuel),
      monthlyDepreciation: Math.round(monthlyDepreciation),
      monthlyIpva: Math.round(monthlyIpva),
      monthlyInsurance: Math.round(monthlyInsurance),
      monthlyMaintenance: Math.round(monthlyMaintenance),
      hiddenCosts: Math.round(hiddenCosts),
      totalTco: Math.round(totalTco),
      annualTco: Math.round(annualTco),
      portfolio4y: Math.round(portfolio4y),
      residualCar4y: Math.round(residualCar4y),
      wealthGap: Math.round(wealthGap),
      financingRatio: Math.round((monthlyFinancing / totalTco) * 100),
    };
  }, [carValue, downPayment, loanMonths, loanAnnualRate, monthlyKm, fuelPrice]);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#161c28] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Simulador de Custo Total de Posse (TCO de Veículo)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Descubra os custos invisíveis (IPVA, seguro, depreciação) além da parcela do financiamento
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 self-start md:self-auto">
          Parcela = apenas {calc.financingRatio}% do custo real
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sliders Controls Column */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Valor do Veículo</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                R$ {carValue.toLocaleString('pt-BR')}
              </span>
            </div>
            <input
              type="range"
              min="30000"
              max="350000"
              step="5000"
              value={carValue}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCarValue(val);
                if (downPayment > val) setDownPayment(val);
              }}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <span>Entrada Inicial</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                R$ {downPayment.toLocaleString('pt-BR')} ({Math.round((downPayment / carValue) * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={carValue}
              step="5000"
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Prazo</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {loanMonths} meses
                </span>
              </div>
              <input
                type="range"
                min="12"
                max="72"
                step="6"
                value={loanMonths}
                onChange={(e) => setLoanMonths(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Taxa Financiamento</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {loanAnnualRate}% a.a.
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={loanAnnualRate}
                onChange={(e) => setLoanAnnualRate(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>KM Rodados / Mês</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {monthlyKm} km
                </span>
              </div>
              <input
                type="range"
                min="300"
                max="3000"
                step="100"
                value={monthlyKm}
                onChange={(e) => setMonthlyKm(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Gasolina (R$/L)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  R$ {fuelPrice.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="4.50"
                max="8.00"
                step="0.10"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Live TCO Breakdown Column */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-4">
          <div className="flex justify-between items-baseline border-b border-slate-200/60 dark:border-white/10 pb-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Custo Real Mensal (TCO)
              </span>
              <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                R$ {calc.totalTco.toLocaleString('pt-BR')}/mês
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 block">Custo Anual</span>
              <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                R$ {calc.annualTco.toLocaleString('pt-BR')}/ano
              </span>
            </div>
          </div>

          {/* Breakdown Items */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                Parcela Financiamento
              </span>
              <strong className="font-mono text-slate-900 dark:text-white">
                R$ {calc.monthlyFinancing.toLocaleString('pt-BR')}
              </strong>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-500" />
                Combustível
              </span>
              <strong className="font-mono text-slate-900 dark:text-white">
                R$ {calc.monthlyFuel.toLocaleString('pt-BR')}
              </strong>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                Depreciação FIPE estimada (10% a.a.)
              </span>
              <strong className="font-mono text-slate-900 dark:text-white">
                R$ {calc.monthlyDepreciation.toLocaleString('pt-BR')}
              </strong>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                IPVA + Seguro Mensalizado
              </span>
              <strong className="font-mono text-slate-900 dark:text-white">
                R$ {(calc.monthlyIpva + calc.monthlyInsurance).toLocaleString('pt-BR')}
              </strong>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                Manutenção Preventiva / Revisão
              </span>
              <strong className="font-mono text-slate-900 dark:text-white">
                R$ {calc.monthlyMaintenance.toLocaleString('pt-BR')}
              </strong>
            </div>
          </div>

          {/* Opportunity comparison */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10">
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Cenário Alternativo em 4 Anos:
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Manter o carro atual e investir a entrada + custo mensal no Tesouro Selic geraria um patrimônio de{' '}
              <strong className="text-emerald-500 font-mono">
                R$ {calc.portfolio4y.toLocaleString('pt-BR')}
              </strong>
              , contra um carro residual valendo{' '}
              <strong className="text-slate-400 font-mono">
                R$ {calc.residualCar4y.toLocaleString('pt-BR')}
              </strong>
              . Diferença a favor da família:{' '}
              <strong className="text-emerald-500 font-mono">
                +R$ {calc.wealthGap.toLocaleString('pt-BR')}
              </strong>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

