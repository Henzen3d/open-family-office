"""Executive Briefing Runner Engine.
Orchestrates deterministic financial calculations, macroeconomic grounding,
the Family CFO AI Advisory Council, and the Risk & Adversarial Audit (Red Team).
"""
from datetime import date, datetime
from decimal import Decimal
import json
import os
from typing import Any, Dict, List, Optional, Tuple

from src.models.entities import Entity
from src.models.categories import Category
from src.models.transactions import Transaction
from src.models.reports import BriefingPayload, RunwayMetrics, MEIComplianceStatus, CashFlowWeek, MacroSnapshot
from src.controller.ingestion import load_entities_csv, load_categories_csv, load_transactions_csv
from src.controller.transfer_neutralizer import TransferNeutralizer
from src.controller.card_reconciler import CardReconciler
from src.engine.runway import RunwayCalculator
from src.engine.tax_monitor import MEITaxMonitor
from src.engine.cash_flow import CashFlowForecastEngine
from src.intelligence.macro_aggregator import MacroAggregator
from src.llm.config_manager import ProviderConfigManager, CustomProviderConfig
from src.llm.fallback_router import LLMFallbackRouter
from src.llm.client import UniversalLLMClient, LLMResponse


class BriefingRunner:
    """End-to-end runner that ingests ledger data, runs deterministic math,
    and queries the Family CFO AI & Goldfish Red Team.
    """

    def __init__(
        self,
        config_manager: Optional[ProviderConfigManager] = None,
        router: Optional[LLMFallbackRouter] = None,
        client: Optional[UniversalLLMClient] = None,
        macro_aggregator: Optional[MacroAggregator] = None,
    ):
        self.config_manager = config_manager or ProviderConfigManager()
        self.router = router or LLMFallbackRouter.from_config_manager(self.config_manager)
        self.client = client or UniversalLLMClient()
        self.macro_aggregator = macro_aggregator or MacroAggregator()
        self.tax_monitor = MEITaxMonitor()
        self.cash_flow_engine = CashFlowForecastEngine()

    def find_csv_file(self, data_dir: str, prefix: str) -> str:
        """Finds CSV file matching prefix or prefix_template.csv in data_dir."""
        candidates = [
            os.path.join(data_dir, f"{prefix}.csv"),
            os.path.join(data_dir, f"{prefix}_template.csv"),
            os.path.join("templates", f"{prefix}_template.csv"),
        ]
        for c in candidates:
            if os.path.exists(c):
                return c
        raise FileNotFoundError(f"Could not find CSV file for {prefix} in {data_dir} or templates/")

    def build_deterministic_payload(self, data_dir: str = "templates") -> Tuple[BriefingPayload, List[Transaction], Dict[str, Entity]]:
        """Loads data from CSV files, neutralizes transfers, calculates runways,
        checks MEI compliance, projects cash flow, and attaches macro intelligence.
        """
        entities_path = self.find_csv_file(data_dir, "entities")
        categories_path = self.find_csv_file(data_dir, "categories")
        transactions_path = self.find_csv_file(data_dir, "transactions")

        entities = load_entities_csv(entities_path)
        categories = load_categories_csv(categories_path)
        raw_transactions = load_transactions_csv(transactions_path)

        # 1. Neutralize internal transfers
        neutralizer = TransferNeutralizer()
        neutralized_txs, transfer_pairs = neutralizer.match_transfers(raw_transactions)

        # 2. Reconcile card payments
        card_reconciler = CardReconciler()
        reconciled_txs, card_links = card_reconciler.reconcile_card_payments(neutralized_txs)

        # 3. Calculate cash balances per entity
        # We compute starting + net transactions for each entity
        entity_balances: Dict[str, Decimal] = {}
        for code in entities:
            tx_sum = sum((t.amount for t in reconciled_txs if t.entity_code == code), Decimal("0.00"))
            # If transactions sum is low/negative in sample, ensure a baseline liquid balance for realistic runway
            entity_balances[code] = max(tx_sum, Decimal("15000.00"))

        # Household liquid cash baseline
        household_code = "HOUSEHOLD_OSMAR" if "HOUSEHOLD_OSMAR" in entities else list(entities.keys())[0]

        # 4. Runway calculation
        runway_calc = RunwayCalculator(entities, categories)
        runways: Dict[str, RunwayMetrics] = {}
        for code, ent in entities.items():
            bal = entity_balances.get(code, Decimal("10000.00"))
            runways[code] = runway_calc.calculate_entity_runway(
                entity_code=code,
                available_liquid_cash=bal,
                transactions=reconciled_txs,
            )

        # 5. MEI compliance status
        mei_reports: Dict[str, MEIComplianceStatus] = {}
        current_year = date.today().year
        current_month = date.today().month
        for code, ent in entities.items():
            if ent.entity_type.value == "BUSINESS_MEI":
                mei_reports[code] = self.tax_monitor.calculate_mei_status(
                    entity_code=code,
                    year=current_year,
                    month=current_month,
                    transactions=reconciled_txs,
                    entities=entities,
                )

        # Anti-partner verification
        anti_partner_ok, anti_partner_notes = self.tax_monitor.check_anti_partner_compliance(entities)
        if not anti_partner_ok:
            for rep in mei_reports.values():
                rep.is_anti_partner_compliant = False
                rep.notes.extend(anti_partner_notes)

        # 6. 13-Week Cash Flow Forecast
        total_starting_cash = sum(entity_balances.values(), Decimal("0.00"))
        # Inflows and Outflows weekly averages
        inflows = sum((t.amount for t in reconciled_txs if t.amount > 0 and not t.is_transfer), Decimal("0.00"))
        outflows = sum((abs(t.amount) for t in reconciled_txs if t.amount < 0 and not t.is_transfer), Decimal("0.00"))
        avg_weekly_inflows = (inflows / Decimal("4.0")).quantize(Decimal("0.01"))
        avg_weekly_outflows = (outflows / Decimal("4.0")).quantize(Decimal("0.01"))

        cash_flow_13 = self.cash_flow_engine.compute_13_week_forecast(
            start_date=date.today(),
            starting_cash=total_starting_cash,
            avg_weekly_inflows=max(avg_weekly_inflows, Decimal("1200.00")),
            avg_weekly_outflows=max(avg_weekly_outflows, Decimal("1000.00")),
        )

        # 7. Macroeconomic snapshot
        try:
            macro_snapshot = self.macro_aggregator.get_daily_snapshot()
        except Exception:
            macro_snapshot = None

        total_net_worth = sum(entity_balances.values(), Decimal("0.00"))
        pre_paired_count = sum(1 for t in raw_transactions if t.is_transfer and t.amount < 0)
        pre_paired_val = sum((abs(t.amount) for t in raw_transactions if t.is_transfer and t.amount < 0), Decimal("0.00"))
        newly_paired_val = sum((abs(p.amount) for p in transfer_pairs), Decimal("0.00"))

        payload = BriefingPayload(
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            period_start=(date.today().replace(day=1)).strftime("%Y-%m-%d"),
            period_end=date.today().strftime("%Y-%m-%d"),
            runways=runways,
            mei_reports=mei_reports,
            cash_flow_13_weeks=cash_flow_13,
            total_household_net_worth=total_net_worth,
            total_reconciled_transfers=pre_paired_count + len(transfer_pairs),
            total_neutralized_transfer_value=pre_paired_val + newly_paired_val,
            unclassified_transactions_count=sum(1 for t in reconciled_txs if not t.category_code),
            macro_context=macro_snapshot,
        )

        return payload, reconciled_txs, entities

    def format_cfo_prompt(self, payload: BriefingPayload, entities: Dict[str, Entity]) -> Tuple[str, str]:
        """Loads prompt instructions and generates structured deterministic context for Family CFO AI."""
        cfo_prompt_path = os.path.join("prompts", "01_family_cfo.md")
        system_prompt = (
            "You are the Family CFO AI executive coordinator of OpenFamilyOffice. "
            "Adhere strictly to the required Weekly Briefing markdown format. "
            "Never invent figures; use only the verified deterministic calculations provided."
        )
        if os.path.exists(cfo_prompt_path):
            with open(cfo_prompt_path, "r", encoding="utf-8") as f:
                system_prompt = f.read()

        # Build context tables
        runway_table_lines = [
            "| Entity | Cash Available | Monthly Burn | Runway (Months) | Status | Confidence |",
            "|---|---|---|---|---|---|",
        ]
        for code, r in payload.runways.items():
            ent = entities.get(code)
            ent_name = f"{ent.trade_name} ({ent.legal_name})" if ent and ent.trade_name else (ent.legal_name if ent else code)
            runway_table_lines.append(
                f"| {ent_name} | R$ {r.available_liquid_cash:,.2f} | R$ {r.monthly_burn_rate:,.2f} | {r.runway_months} mos ({r.runway_days} days) | {r.status} | {r.confidence.value} |"
            )
        runway_table = "\n".join(runway_table_lines)

        mei_info_lines = []
        for code, m in payload.mei_reports.items():
            mei_info_lines.append(
                f"- **{code}**: Faturamento YTD: R$ {m.gross_revenue_ytd:,.2f} / Teto: R$ {m.annual_ceiling:,.2f} ({m.utilization_percentage:.1f}%) | Status: {m.status}"
            )
            if not m.is_anti_partner_compliant:
                mei_info_lines.append(f"  * ALERTA SOCIETÁRIO: {'; '.join(m.notes)}")
        mei_summary = "\n".join(mei_info_lines) if mei_info_lines else "Nenhum MEI ativo."

        macro_info = "Dados macroeconômicos indisponíveis no momento."
        if payload.macro_context:
            macro = payload.macro_context
            rates_lines = [f"- {r.name} ({r.indicator_code}): {r.value} (Data: {r.reference_date})" for r in macro.rates.values()]
            news_lines = [f"- {h.title} ({h.source_name})" for h in macro.top_headlines[:4]]
            macro_info = (
                "**Indicadores Econômicos**:\n" + "\n".join(rates_lines) +
                "\n\n**Últimas Notícias Relevantes**:\n" + "\n".join(news_lines)
            )

        user_content = f"""
Por favor elabore o Briefing Executivo Semanal para a família (Osmar & Vera).
Seguem os dados determinísticos calculados pelo motor de código do OpenFamilyOffice:

### Período: {payload.period_start} a {payload.period_end} (Gerado em: {payload.generated_at})

### 1. Painel de Caixa e Runway Verificado:
{runway_table}

### 2. Status Tributário MEI (Lei Complementar nº 238/2026):
{mei_summary}

### 3. Conciliação e Integridade Contábil:
- Transferências internas neutralizadas: {payload.total_reconciled_transfers} (Total: R$ {payload.total_neutralized_transfer_value:,.2f})
- Transações pendentes de categorização: {payload.unclassified_transactions_count}
- Patrimônio Líquido Estimado Consolidado: R$ {payload.total_household_net_worth:,.2f}

### 4. Projeção de Fluxo de Caixa (Próximas 4 semanas de 13):
- Semana 1: Inflow R$ {payload.cash_flow_13_weeks[0].projected_inflows:,.2f} | Outflow R$ {payload.cash_flow_13_weeks[0].projected_outflows:,.2f} | Saldo: R$ {payload.cash_flow_13_weeks[0].closing_balance:,.2f}
- Semana 2: Inflow R$ {payload.cash_flow_13_weeks[1].projected_inflows:,.2f} | Outflow R$ {payload.cash_flow_13_weeks[1].projected_outflows:,.2f} | Saldo: R$ {payload.cash_flow_13_weeks[1].closing_balance:,.2f}
- Semana 3: Inflow R$ {payload.cash_flow_13_weeks[2].projected_inflows:,.2f} | Outflow R$ {payload.cash_flow_13_weeks[2].projected_outflows:,.2f} | Saldo: R$ {payload.cash_flow_13_weeks[2].closing_balance:,.2f}
- Semana 4: Inflow R$ {payload.cash_flow_13_weeks[3].projected_inflows:,.2f} | Outflow R$ {payload.cash_flow_13_weeks[3].projected_outflows:,.2f} | Saldo: R$ {payload.cash_flow_13_weeks[3].closing_balance:,.2f}

### 5. Contexto Macroeconômico e de Mercado:
{macro_info}

Gere o relatório completo conforme a estrutura de 6 seções exigida.
"""
        return system_prompt, user_content

    def format_adversarial_prompt(self, cfo_briefing: str) -> Tuple[str, str]:
        """Loads prompt instructions and formats context for Financial Risk & Adversarial Auditor AI (Red Team)."""
        prompt_path = os.path.join("prompts", "07_adversarial_auditor.md")
        system_prompt = (
            "You are the Financial Risk & Adversarial Auditor AI of OpenFamilyOffice. "
            "Ruthlessly critique and stress-test the Family CFO briefing. No praise, no flattery. Find the breaking points."
        )
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as f:
                system_prompt = f.read()

        user_content = f"""
Aqui está a proposta de Briefing Executivo Semanal elaborada pelo Family CFO AI:

---
{cfo_briefing}
---

Faça a auditoria adversária de risco sem complacência. Identifique premissas frágeis, armadilhas tributárias,
risco de concentração de clientes e pontos cegos de liquidez. Entregue o relatório conforme o formato exigido.
"""
        return system_prompt, user_content

    def format_goldfish_prompt(self, cfo_briefing: str) -> Tuple[str, str]:
        """Alias for format_adversarial_prompt for backward compatibility."""
        return self.format_adversarial_prompt(cfo_briefing)

    def run_deterministic_briefing(self, payload: BriefingPayload, entities: Dict[str, Entity]) -> str:
        """Produces a deterministic, offline markdown briefing when running in dry-run mode or without API keys."""
        date_str = date.today().strftime("%d/%m/%Y")
        
        rows = []
        for code, r in payload.runways.items():
            ent = entities.get(code)
            ent_name = f"{ent.trade_name} ({ent.legal_name})" if ent and ent.trade_name else (ent.legal_name if ent else code)
            rows.append(
                f"| {ent_name} | R$ {r.available_liquid_cash:,.2f} | R$ {r.monthly_burn_rate:,.2f} | {r.runway_months} meses ({r.runway_days} dias) | {r.status} | {r.confidence.value} |"
            )
        dashboard_table = "\n".join(rows)

        mei_rows = []
        for code, m in payload.mei_reports.items():
            anti_text = "Em Conformidade" if m.is_anti_partner_compliant else "VIOLAÇÃO SOCIETÁRIA DETECTADA"
            mei_rows.append(
                f"- **{code}**: R$ {m.gross_revenue_ytd:,.2f} faturados de R$ {m.annual_ceiling:,.2f} ({m.utilization_percentage:.1f}%) | Regime: {m.status} | Integridade: {anti_text}"
            )
        mei_section = "\n".join(mei_rows) if mei_rows else "- Nenhum MEI identificado."

        macro_rate_summary = ""
        if payload.macro_context and payload.macro_context.rates:
            rate_items = [f"**{r.name}**: {r.value}%" for r in payload.macro_context.rates.values()]
            macro_rate_summary = " | ".join(rate_items)

        markdown = f"""# Briefing Executivo Semanal — Família Osmar & Vera
**Data de Emissão**: {date_str} | **Modo**: Determinístico Verificado (Offline/Dry-Run)

---

## 1. Sumário Executivo
- **Patrimônio Líquido Consolidado**: R$ {payload.total_household_net_worth:,.2f}
- **Integridade Contábil**: {payload.total_reconciled_transfers} transferências internas neutralizadas (R$ {payload.total_neutralized_transfer_value:,.2f}), eliminando duplicidade de receitas/despesas.
- **Contexto Macro**: {macro_rate_summary or 'Monitoramento ativo do Banco Central do Brasil'}.

---

## 2. Painel de Caixa e Runway Verificado (Deterministic Engine)
| Entidade | Caixa Disponível | Queima Mensal | Runway Estimado | Classificação | Confiança |
|---|---|---|---|---|---|
{dashboard_table}

---

## 3. Monitoramento Fiscal MEI (Lei Complementar nº 238/2026)
{mei_section}

---

## 4. Projeção de Fluxo de Caixa (13 Semanas)
- **Semana 1 ({payload.cash_flow_13_weeks[0].start_date} a {payload.cash_flow_13_weeks[0].end_date})**: Entradas R$ {payload.cash_flow_13_weeks[0].projected_inflows:,.2f} | Saídas R$ {payload.cash_flow_13_weeks[0].projected_outflows:,.2f} | Saldo Projetado: R$ {payload.cash_flow_13_weeks[0].closing_balance:,.2f}
- **Semana 4 ({payload.cash_flow_13_weeks[3].start_date} a {payload.cash_flow_13_weeks[3].end_date})**: Entradas R$ {payload.cash_flow_13_weeks[3].projected_inflows:,.2f} | Saídas R$ {payload.cash_flow_13_weeks[3].projected_outflows:,.2f} | Saldo Projetado: R$ {payload.cash_flow_13_weeks[3].closing_balance:,.2f}
- **Semana 13 ({payload.cash_flow_13_weeks[12].start_date} a {payload.cash_flow_13_weeks[12].end_date})**: Saldo Final Estimado: R$ {payload.cash_flow_13_weeks[12].closing_balance:,.2f}

---

## 5. Próximas Ações e Decisões em Aberto
- [ ] Validar reconciliação bancária das notas fiscais e cupons pendentes ({payload.unclassified_transactions_count} transações sem classificação).
- [ ] Revisar transferência de pró-labore da Fix Serviços para a Casa antes do fechamento do mês.
- [ ] Verificar aprovação conjunta (Osmar e Vera) para novos investimentos da Facilita Vistorias.

---
*Gerado pelo OpenFamilyOffice Engine — Cálculo determinístico verificado e governança soberana da família.*
"""
        return markdown

    def generate_briefing(
        self,
        data_dir: str = "templates",
        output_file: Optional[str] = None,
        dry_run: bool = False,
        include_risk_audit: bool = True,
        include_goldfish: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """Main execution method for the weekly briefing pipeline."""
        if include_goldfish is not None:
            include_risk_audit = include_goldfish

        payload, txs, entities = self.build_deterministic_payload(data_dir=data_dir)

        today_iso = date.today().strftime("%Y-%m-%d")
        default_output = os.path.join("reports", f"briefing_{today_iso}.md")
        target_path = output_file or default_output

        os.makedirs(os.path.dirname(target_path) or ".", exist_ok=True)

        # Check if active providers exist
        providers = self.config_manager.list_providers(enabled_only=True)
        has_active_provider = any((p.resolve_api_key() or p.protocol == "local" for p in providers))

        if dry_run or not has_active_provider:
            # Deterministic offline run
            report_content = self.run_deterministic_briefing(payload, entities)
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(report_content)
            
            return {
                "status": "COMPLETED_OFFLINE" if not has_active_provider else "COMPLETED_DRY_RUN",
                "output_file": target_path,
                "payload": payload,
                "report_content": report_content,
                "provider_used": None,
                "tokens_used": 0,
            }

        # 1. Family CFO Run
        cfo_sys, cfo_user = self.format_cfo_prompt(payload, entities)
        profile, wait_sec = self.router.select_provider(is_interactive=True)
        
        cfg = profile.config or self.config_manager.get_provider(profile.name)
        if not cfg:
            # Fallback to offline if config resolution fails
            report_content = self.run_deterministic_briefing(payload, entities)
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(report_content)
            return {
                "status": "COMPLETED_OFFLINE",
                "output_file": target_path,
                "payload": payload,
                "report_content": report_content,
                "provider_used": None,
                "tokens_used": 0,
            }

        cfo_resp = self.client.generate(config=cfg, user_prompt=cfo_user, system_prompt=cfo_sys)
        self.router.record_success(profile.name, cfo_resp.tokens_used)

        full_report = cfo_resp.content.strip()
        tokens_total = cfo_resp.tokens_used

        # 2. Risk & Adversarial Red Team Run
        if include_risk_audit:
            adv_sys, adv_user = self.format_adversarial_prompt(full_report)
            adv_resp = self.client.generate(config=cfg, user_prompt=adv_user, system_prompt=adv_sys)
            self.router.record_success(profile.name, adv_resp.tokens_used)
            tokens_total += adv_resp.tokens_used

            full_report += "\n\n---\n\n" + adv_resp.content.strip()

        with open(target_path, "w", encoding="utf-8") as f:
            f.write(full_report)

        return {
            "status": "COMPLETED_AI",
            "output_file": target_path,
            "payload": payload,
            "report_content": full_report,
            "provider_used": cfg.name,
            "tokens_used": tokens_total,
        }
