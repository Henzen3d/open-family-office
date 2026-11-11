"""OpenFamilyOffice — Strategy Engine.
Deterministic calculators and heuristic scanners for family financial decision-making:
- OpportunityScanner (idle cash, MEI ceilings, recurring subscriptions)
- CarTCOCalculator (true total cost of ownership vs investing)
- MortgageVsRentCalculator (30-year net worth curves and break-even)
- GadgetPurchaseCalculator (cash discount vs installments + opportunity cost)
- MultiSchoolAdvisoryEvaluator (5 economic schools strategic council)
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class OpportunityScanner:
    """Scans family financial state for idle cash, tax ceiling thresholds, and recurring leaks."""

    @staticmethod
    def scan_idle_cash(
        accounts: List[Dict[str, Any]],
        selic_annual_rate: float = 11.25,
        min_idle_threshold: float = 5000.0,
        operational_reserve: float = 3000.0,
    ) -> List[Dict[str, Any]]:
        """Identifies checking or non-yielding accounts with cash above operational needs."""
        alerts: List[Dict[str, Any]] = []
        # Net annual yield after 15% long-term IR: r_net = selic * 0.85
        net_annual_rate = (selic_annual_rate / 100.0) * 0.85
        monthly_net_rate = ((1.0 + net_annual_rate) ** (1.0 / 12.0)) - 1.0

        for acc in accounts:
            balance = float(acc.get("balance", 0.0))
            acc_type = str(acc.get("type", "checking")).lower()
            acc_name = acc.get("name", "Conta Corrente")
            earning_rate = float(acc.get("earning_rate", 0.0))

            # Non-yielding checking accounts or zero-earning accounts
            if ("checking" in acc_type or "corrente" in acc_type or earning_rate == 0.0) and balance > min_idle_threshold:
                idle_surplus = max(0.0, balance - operational_reserve)
                monthly_forgone = idle_surplus * monthly_net_rate
                annual_forgone = idle_surplus * net_annual_rate

                severity = "high" if idle_surplus >= 15000.0 else "medium"
                alerts.append({
                    "id": f"OPP-CASH-{acc.get('id', 'acc')}",
                    "category": "idle_cash",
                    "severity": severity,
                    "title": f"Caixa Ocioso em {acc_name}",
                    "description": (
                        f"R$ {balance:,.2f} na conta {acc_name} com rendimento nulo. "
                        f"Alocar o excedente (R$ {idle_surplus:,.2f}) em Tesouro Selic ou CDB 100% CDI "
                        f"pode gerar ~R$ {monthly_forgone:,.2f}/mês (~R$ {annual_forgone:,.2f}/ano líquido) sem risco de crédito."
                    ),
                    "balance": round(balance, 2),
                    "idle_surplus": round(idle_surplus, 2),
                    "monthly_impact": round(monthly_forgone, 2),
                    "annual_impact": round(annual_forgone, 2),
                    "action_label": "Alocar em Tesouro Selic",
                })

        return alerts

    @staticmethod
    def scan_mei_tax_ceiling(
        revenue_fix: float,
        revenue_facilita: float,
        ceiling: float = 81000.0,
    ) -> List[Dict[str, Any]]:
        """Monitors MEI annual revenue against statutory limits (LC 123/2006 & LC 238/2026)."""
        alerts: List[Dict[str, Any]] = []

        entities = [
            ("Fix Serviços MEI (Osmar)", revenue_fix, "Facilita Vistorias MEI (Vera)"),
            ("Facilita Vistorias MEI (Vera)", revenue_facilita, "Fix Serviços MEI (Osmar)"),
        ]

        for name, rev, alternate in entities:
            pct_used = (rev / ceiling) * 100.0 if ceiling > 0 else 0.0
            remaining = max(0.0, ceiling - rev)

            if pct_used >= 80.0:
                severity = "danger" if pct_used >= 95.0 else "warning"
                alerts.append({
                    "id": f"OPP-MEI-{name[:3].upper()}",
                    "category": "tax_ceiling",
                    "severity": severity,
                    "title": f"Teto MEI em Risco: {name}",
                    "description": (
                        f"{name} já acumulou R$ {rev:,.2f} ({pct_used:.1f}% do teto de R$ {ceiling:,.2f}). "
                        f"Margem restante de apenas R$ {remaining:,.2f}. Recomenda-se redirecionar novos serviços "
                        f"para {alternate} para evitar desenquadramento fiscal compulsório."
                    ),
                    "revenue_current": round(rev, 2),
                    "ceiling": round(ceiling, 2),
                    "percentage_used": round(pct_used, 1),
                    "remaining_limit": round(remaining, 2),
                    "action_label": "Redirecionar Faturamento",
                })

        return alerts

    @staticmethod
    def scan_recurring_subscriptions(
        transactions: List[Dict[str, Any]],
        lookback_months: int = 3,
    ) -> List[Dict[str, Any]]:
        """Identifies recurring subscription charges and calculates annualized drag."""
        known_keywords = [
            "netflix", "spotify", "amazon prime", "prime video", "apple.com", "google",
            "youtube", "chatgpt", "openai", "gym", "smartfit", "coursera", "udemy",
            "hbo", "disney", "max", "claude", "microsoft", "adobe"
        ]
        recurring_map: Dict[str, List[float]] = {}

        for tx in transactions:
            desc = str(tx.get("description", "")).lower()
            amount = abs(float(tx.get("amount", 0.0)))
            for kw in known_keywords:
                if kw in desc and amount > 5.0:
                    recurring_map.setdefault(kw.title(), []).append(amount)
                    break

        alerts: List[Dict[str, Any]] = []
        for service, amounts in recurring_map.items():
            if len(amounts) >= 2:  # Seen more than once
                avg_monthly = sum(amounts) / len(amounts)
                annual_cost = avg_monthly * 12.0
                alerts.append({
                    "id": f"OPP-REC-{service.replace(' ', '-').upper()}",
                    "category": "recurring_subscription",
                    "severity": "info",
                    "title": f"Assinatura Recorrente: {service}",
                    "description": (
                        f"Despesa média de R$ {avg_monthly:,.2f}/mês detectada (R$ {annual_cost:,.2f}/ano). "
                        "Avaliar se o uso familiar atual justifica a manutenção do plano."
                    ),
                    "monthly_impact": round(avg_monthly, 2),
                    "annual_impact": round(annual_cost, 2),
                    "action_label": "Revisar Assinatura",
                })

        return alerts

    @classmethod
    def get_consolidated_radar(
        cls,
        accounts: List[Dict[str, Any]],
        transactions: List[Dict[str, Any]],
        revenue_fix: float = 62450.0,
        revenue_facilita: float = 28100.0,
        selic_rate: float = 11.25,
    ) -> Dict[str, Any]:
        """Consolidates all strategic radar alerts into a single response."""
        idle_alerts = cls.scan_idle_cash(accounts, selic_annual_rate=selic_rate)
        mei_alerts = cls.scan_mei_tax_ceiling(revenue_fix, revenue_facilita)
        rec_alerts = cls.scan_recurring_subscriptions(transactions)

        all_alerts = idle_alerts + mei_alerts + rec_alerts
        total_monthly_potential = sum(a.get("monthly_impact", 0.0) for a in idle_alerts)
        total_annual_potential = sum(a.get("annual_impact", 0.0) for a in idle_alerts)

        return {
            "summary": {
                "total_alerts": len(all_alerts),
                "high_severity_count": sum(1 for a in all_alerts if a.get("severity") in ["high", "danger"]),
                "monthly_potential_savings": round(total_monthly_potential, 2),
                "annual_potential_savings": round(total_annual_potential, 2),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
            "alerts": all_alerts,
        }


class CarTCOCalculator:
    """Calculates True Total Cost of Ownership (TCO) for vehicle acquisition vs investing."""

    @staticmethod
    def calculate(
        car_value: float,
        down_payment: float = 0.0,
        loan_months: int = 48,
        loan_annual_rate: float = 16.5,
        monthly_km: float = 1200.0,
        km_per_liter: float = 11.5,
        fuel_price_liter: float = 5.89,
        annual_insurance: float = 4200.0,
        annual_ipva_rate: float = 0.04,
        annual_maintenance_rate: float = 0.03,
        annual_depreciation_rate: float = 0.10,
        benchmark_annual_rate: float = 11.25,
    ) -> Dict[str, Any]:
        """Returns comprehensive breakdown of visible + hidden monthly car costs."""
        principal = max(0.0, car_value - down_payment)

        # Financing installment (Price formula)
        if principal > 0 and loan_months > 0:
            monthly_rate = ((1.0 + loan_annual_rate / 100.0) ** (1.0 / 12.0)) - 1.0
            if monthly_rate > 0:
                factor = (1.0 + monthly_rate) ** loan_months
                monthly_financing = principal * (monthly_rate * factor) / (factor - 1.0)
            else:
                monthly_financing = principal / loan_months
        else:
            monthly_financing = 0.0

        # Hidden operating costs
        monthly_depreciation = (car_value * annual_depreciation_rate) / 12.0
        monthly_ipva = (car_value * annual_ipva_rate) / 12.0
        monthly_insurance = annual_insurance / 12.0
        monthly_maintenance = (car_value * annual_maintenance_rate) / 12.0
        monthly_fuel = (monthly_km / max(1.0, km_per_liter)) * fuel_price_liter

        hidden_monthly_costs = monthly_depreciation + monthly_ipva + monthly_insurance + monthly_maintenance
        total_monthly_tco = monthly_financing + monthly_fuel + hidden_monthly_costs
        annual_tco = total_monthly_tco * 12.0

        # Alternative investment comparison: Down payment + monthly TCO invested at benchmark rate
        monthly_bench_rate = ((1.0 + (benchmark_annual_rate / 100.0) * 0.85) ** (1.0 / 12.0)) - 1.0
        balance_2y = down_payment
        balance_4y = down_payment
        for _ in range(24):
            balance_2y = balance_2y * (1.0 + monthly_bench_rate) + total_monthly_tco
        for _ in range(min(48, max(24, loan_months))):
            balance_4y = balance_4y * (1.0 + monthly_bench_rate) + total_monthly_tco

        # Depreciated residual value of the car
        residual_val_2y = car_value * ((1.0 - annual_depreciation_rate) ** 2)
        residual_val_4y = car_value * ((1.0 - annual_depreciation_rate) ** 4)

        return {
            "inputs": {
                "car_value": round(car_value, 2),
                "down_payment": round(down_payment, 2),
                "loan_months": loan_months,
                "loan_annual_rate": loan_annual_rate,
                "monthly_km": monthly_km,
            },
            "monthly_breakdown": {
                "financing_installment": round(monthly_financing, 2),
                "fuel": round(monthly_fuel, 2),
                "depreciation": round(monthly_depreciation, 2),
                "ipva": round(monthly_ipva, 2),
                "insurance": round(monthly_insurance, 2),
                "maintenance": round(monthly_maintenance, 2),
                "hidden_costs_subtotal": round(hidden_monthly_costs, 2),
                "total_monthly_tco": round(total_monthly_tco, 2),
            },
            "annual_tco": round(annual_tco, 2),
            "opportunity_comparison": {
                "in_2_years": {
                    "car_equity_residual": round(residual_val_2y, 2),
                    "portfolio_if_invested": round(balance_2y, 2),
                    "wealth_difference": round(balance_2y - residual_val_2y, 2),
                },
                "in_4_years": {
                    "car_equity_residual": round(residual_val_4y, 2),
                    "portfolio_if_invested": round(balance_4y, 2),
                    "wealth_difference": round(balance_4y - residual_val_4y, 2),
                },
            },
            "verdict": (
                f"O custo real deste veículo é de R$ {total_monthly_tco:,.2f}/mês (R$ {annual_tco:,.2f}/ano). "
                f"A parcela visível (R$ {monthly_financing:,.2f}) representa apenas "
                f"{(monthly_financing / total_monthly_tco * 100):.1f}% do custo total. "
                f"Em 4 anos, a diferença de patrimônio investido vs carro é de R$ {(balance_4y - residual_val_4y):,.2f}."
            ),
        }


class MortgageVsRentCalculator:
    """Calculates 30-year wealth trajectories for Buying with Mortgage vs Renting and Investing the difference."""

    @staticmethod
    def calculate(
        property_value: float,
        down_payment: float,
        loan_years: int = 30,
        loan_annual_rate: float = 10.5,
        monthly_rent: float = 2800.0,
        annual_property_appreciation: float = 5.0,
        annual_portfolio_yield: float = 10.5,
        annual_inflation: float = 4.5,
    ) -> Dict[str, Any]:
        """Computes annual series comparing net worth in both paths."""
        principal = max(0.0, property_value - down_payment)
        total_months = loan_years * 12

        # Monthly rates
        monthly_loan_rate = ((1.0 + loan_annual_rate / 100.0) ** (1.0 / 12.0)) - 1.0
        # Net portfolio monthly return (after 15% IR)
        net_port_annual = (annual_portfolio_yield / 100.0) * 0.85
        monthly_portfolio_rate = ((1.0 + net_port_annual) ** (1.0 / 12.0)) - 1.0
        monthly_appreciation_rate = ((1.0 + annual_property_appreciation / 100.0) ** (1.0 / 12.0)) - 1.0
        monthly_rent_inflation_rate = ((1.0 + annual_inflation / 100.0) ** (1.0 / 12.0)) - 1.0

        # Amortization installment (Price)
        if principal > 0 and total_months > 0 and monthly_loan_rate > 0:
            factor = (1.0 + monthly_loan_rate) ** total_months
            initial_pmt = principal * (monthly_loan_rate * factor) / (factor - 1.0)
        else:
            initial_pmt = principal / max(1, total_months)

        # Simulation
        current_property_val = property_value
        debt_balance = principal
        rent_portfolio = down_payment
        current_rent = monthly_rent

        series: List[Dict[str, Any]] = []
        break_even_year: Optional[int] = None

        for y in range(1, loan_years + 1):
            for _ in range(12):
                # Buying track
                current_property_val *= (1.0 + monthly_appreciation_rate)
                interest_payment = debt_balance * monthly_loan_rate
                amortization = max(0.0, initial_pmt - interest_payment)
                debt_balance = max(0.0, debt_balance - amortization)

                # Renting track: Invest the difference between buying cash out (PMT + maintenance 0.8% a.a.) and rent
                monthly_property_maint = (current_property_val * 0.008) / 12.0
                total_buy_cashout = initial_pmt + monthly_property_maint
                cash_difference = total_buy_cashout - current_rent

                rent_portfolio = rent_portfolio * (1.0 + monthly_portfolio_rate) + cash_difference
                current_rent *= (1.0 + monthly_rent_inflation_rate)

            buy_net_worth = current_property_val - debt_balance
            rent_net_worth = rent_portfolio

            if break_even_year is None and y > 1:
                prev_buy = series[-1]["buy_net_worth"]
                prev_rent = series[-1]["rent_net_worth"]
                if (prev_buy < prev_rent and buy_net_worth >= rent_net_worth) or (prev_rent < prev_buy and rent_net_worth >= buy_net_worth):
                    break_even_year = y

            series.append({
                "year": y,
                "property_market_value": round(current_property_val, 2),
                "remaining_debt": round(debt_balance, 2),
                "buy_net_worth": round(buy_net_worth, 2),
                "rent_net_worth": round(rent_net_worth, 2),
                "monthly_rent_current": round(current_rent, 2),
            })

        final_buy = series[-1]["buy_net_worth"]
        final_rent = series[-1]["rent_net_worth"]
        winner = "Comprar Imóvel" if final_buy > final_rent else "Alugar e Investir"

        return {
            "inputs": {
                "property_value": round(property_value, 2),
                "down_payment": round(down_payment, 2),
                "loan_years": loan_years,
                "loan_annual_rate": loan_annual_rate,
                "monthly_rent": round(monthly_rent, 2),
            },
            "initial_installment": round(initial_pmt, 2),
            "break_even_year": break_even_year,
            "final_30y_buy_net_worth": round(final_buy, 2),
            "final_30y_rent_net_worth": round(final_rent, 2),
            "wealth_gap": round(abs(final_buy - final_rent), 2),
            "recommended_path": winner,
            "series": series,
        }


class GadgetPurchaseCalculator:
    """Calculates Cash with Discount vs Credit Card Installments + Opportunity Cost."""

    @staticmethod
    def calculate(
        item_name: str,
        cash_price: float,
        cash_discount_percent: float = 10.0,
        installments_count: int = 12,
        benchmark_annual_rate: float = 11.25,
        family_monthly_income: float = 15000.0,
    ) -> Dict[str, Any]:
        """Evaluates cash vs installment NPV and hours worked."""
        # 160 hours standard monthly working basis for family
        hourly_rate = family_monthly_income / 160.0 if family_monthly_income > 0 else 50.0
        work_hours = cash_price / hourly_rate

        discount_value = cash_price * (cash_discount_percent / 100.0)
        actual_cash_price = cash_price - discount_value
        monthly_installment = cash_price / max(1, installments_count)

        # Net monthly CDI rate
        net_annual = (benchmark_annual_rate / 100.0) * 0.85
        monthly_rate = ((1.0 + net_annual) ** (1.0 / 12.0)) - 1.0

        # NPV of installments
        npv_installments = sum(
            monthly_installment / ((1.0 + monthly_rate) ** m)
            for m in range(1, installments_count + 1)
        )

        advantage = "À Vista com Desconto" if actual_cash_price < npv_installments else "Parcelado no Cartão"
        diff = abs(actual_cash_price - npv_installments)

        # Opportunity cost over 2, 5, 10 years if cash_price invested
        future_2y = cash_price * ((1.0 + net_annual) ** 2)
        future_5y = cash_price * ((1.0 + net_annual) ** 5)
        future_10y = cash_price * ((1.0 + net_annual) ** 10)

        return {
            "item_name": item_name,
            "cash_price_nominal": round(cash_price, 2),
            "discount_percent": cash_discount_percent,
            "actual_cash_price": round(actual_cash_price, 2),
            "installments_count": installments_count,
            "monthly_installment": round(monthly_installment, 2),
            "npv_installments": round(npv_installments, 2),
            "better_choice": advantage,
            "savings_difference": round(diff, 2),
            "family_work_hours_cost": round(work_hours, 1),
            "opportunity_cost": {
                "in_2_years": round(future_2y, 2),
                "in_5_years": round(future_5y, 2),
                "in_10_years": round(future_10y, 2),
            },
            "cooling_off_days_suggested": 14,
        }


class MultiSchoolAdvisoryEvaluator:
    """Provides structured strategic advice from the perspective of 5 major economic schools."""

    @staticmethod
    def evaluate(
        topic: str,
        amount: float,
        context: Optional[str] = None,
        family_net_worth: float = 500000.0,
    ) -> Dict[str, Any]:
        """Synthesizes deterministic assessments from Austrian, Behavioral, Monetarist, Institutional, and Neoclassical lenses."""
        impact_pct = (amount / family_net_worth * 100.0) if family_net_worth > 0 else 10.0

        # 1. Austrian School (Hard assets, sound money, leverage risk)
        austrian = {
            "school": "Escola Austríaca",
            "theorists": "Mises, Hayek, Rothbard",
            "stance": "Cautela com endividamento fiat e preferência por reservas sólidas",
            "score": 6.5 if amount < 50000 else 4.0,
            "verdict": (
                f"Comprometer R$ {amount:,.2f} ({impact_pct:.1f}% do patrimônio líquido) em bens de consumo "
                "ou dívida bancária reduz a capacidade de acumulação de ativos reais (ouro, bitcoin, terras produtivas). "
                "Se exigir crédito alavancado, evite: a manipulação de taxas pelos bancos centrais distorce o cálculo econômico familiar."
            ),
        }

        # 2. Behavioral Economics (Kahneman, Thaler, Ariely)
        behavioral = {
            "school": "Economia Comportamental",
            "theorists": "Kahneman, Thaler, Tversky",
            "stance": "Pausa reflexiva de 14 dias para mitigar viés de presente e ancoragem",
            "score": 5.0,
            "verdict": (
                "Decisões deste porte sofrem forte viés de novidade e dor do pagamento parcelado amortecida. "
                "Ative o período de resfriamento (cooling-off) de 14 dias antes de firmar compromisso. "
                "Converse com seu cônjuge após o período para checar se a utilidade percebida se mantém."
            ),
        }

        # 3. Monetarist School (Friedman, Fisher)
        monetarist = {
            "school": "Escola Monetarista",
            "theorists": "Milton Friedman, Irving Fisher",
            "stance": "Proteção contra expansão da base monetária e equação de Fisher",
            "score": 7.0,
            "verdict": (
                "A inflação oficial (IPCA) subestima a perda do poder de compra dos serviços privados. "
                f"Desembolsar R$ {amount:,.2f} hoje significa abrir mão de um rendimento real que repõe a diluição cambial. "
                "Exija taxa de retorno real acima de 6% a.a. para qualquer capital preservado."
            ),
        }

        # 4. Institutional School (Veblen, Coase, North)
        institutional = {
            "school": "Economia Institucional",
            "theorists": "Thorstein Veblen, Ronald Coase",
            "stance": "Segurança jurídica de contratos, tetos fiscais MEI e consumo conspícuo",
            "score": 8.0,
            "verdict": (
                "Verifique a fricção tributária: notas fiscais corretas para evitar bitributação, respeito aos limites "
                "de faturamento dos MEIs (R$ 81k) e contratos com cláusulas claras de garantia e rescisão. "
                "Cuidado com o consumo posicional (ostentação involuntária) que gera custos fixos de manutenção."
            ),
        }

        # 5. Neoclassical / Modern Portfolio Theory (Markowitz, Sharpe)
        neoclassical = {
            "school": "Escola Neoclássica",
            "theorists": "Harry Markowitz, William Sharpe",
            "stance": "Otimização da fronteira eficiente e custo de oportunidade marginal",
            "score": 6.0,
            "verdict": (
                f"Em 10 anos a 11,25% a.a., R$ {amount:,.2f} investidos equivaleriam a R$ {(amount * (1.1125 ** 10)):,.2f}. "
                "A aquisição só é racional se a utilidade marginal proporcionada à família for superior "
                "a esse ganho composto acumulado na fronteira de eficiência da carteira."
            ),
        }

        schools = [austrian, behavioral, monetarist, institutional, neoclassical]
        avg_score = sum(s["score"] for s in schools) / len(schools)

        return {
            "topic": topic,
            "amount": round(amount, 2),
            "consolidated_score": round(avg_score, 1),
            "general_recommendation": (
                f"Parecer do Conselho Consultivo: Viabilidade de {avg_score:.1f}/10. "
                "Recomenda-se aplicar a regra de resfriamento de 14 dias e verificar se a despesa compromete os tetos do MEI."
            ),
            "evaluations": schools,
        }

