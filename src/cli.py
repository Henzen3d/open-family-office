"""OpenFamilyOffice CLI — Deterministic Financial Intelligence & Briefing Runner."""
import argparse
from datetime import date
from decimal import Decimal
import json
import os
import sys

from src.controller.ingestion import (
    load_entities_csv,
    load_categories_csv,
    load_transactions_csv,
)
from src.controller.transfer_neutralizer import TransferNeutralizer
from src.controller.card_reconciler import CardReconciler
from src.engine.runway import RunwayCalculator
from src.engine.tax_monitor import MEITaxMonitor
from src.engine.cash_flow import CashFlowForecastEngine
from src.intelligence.macro_aggregator import MacroAggregator


def run_full_audit(
    entities_path: str,
    categories_path: str,
    transactions_path: str,
    current_cash: dict = None,
    include_macro: bool = False,
) -> dict:
    """Executes the complete deterministic audit pipeline and returns the verified structured data."""
    current_cash = current_cash or {
        "HOUSEHOLD_OSMAR": Decimal("15000.00"),
        "FIX_SERVICOS": Decimal("8500.00"),
        "FACILITA_VISTORIAS": Decimal("2000.00"),
    }

    # 1. Ingest Data
    entities = load_entities_csv(entities_path)
    categories = load_categories_csv(categories_path)
    raw_transactions = load_transactions_csv(transactions_path)

    # 2. Reconcile Transfers & Card Settlements
    card_reconciler = CardReconciler()
    transactions, card_settlements = card_reconciler.reconcile_card_payments(raw_transactions)

    transfer_neutralizer = TransferNeutralizer(max_day_window=2)
    transactions, transfer_pairs = transfer_neutralizer.match_transfers(transactions)

    # 3. Calculate Runways
    runway_calc = RunwayCalculator(entities, categories)
    runways = {}
    for code, entity in entities.items():
        if code in current_cash:
            cash_val = current_cash[code]
            metrics = runway_calc.calculate_entity_runway(code, cash_val, transactions, months_sampled=1)
            runways[code] = {
                "available_cash": float(metrics.available_liquid_cash),
                "monthly_burn": float(metrics.monthly_burn_rate),
                "runway_months": float(metrics.runway_months),
                "runway_days": metrics.runway_days,
                "status": metrics.status,
                "confidence": metrics.confidence.value,
            }

    # 4. Check Tax & MEI Compliance
    tax_monitor = MEITaxMonitor()
    current_year = date.today().year
    mei_reports = {}
    for code, entity in entities.items():
        if entity.entity_type.value == "BUSINESS_MEI":
            status = tax_monitor.calculate_mei_status(
                entity_code=code,
                year=current_year,
                month=date.today().month,
                transactions=transactions,
                entities=entities,
            )
            mei_reports[code] = {
                "annual_ceiling": float(status.annual_ceiling),
                "gross_revenue_ytd": float(status.gross_revenue_ytd),
                "utilization_percentage": float(status.utilization_percentage),
                "status": status.status,
                "anti_partner_compliant": status.is_anti_partner_compliant,
                "notes": status.notes,
            }

    # 5. Compute 13-Week Rolling Cash Flow for Core Business
    cf_engine = CashFlowForecastEngine()
    fix_cash = current_cash.get("FIX_SERVICOS", Decimal("8000.00"))
    weeks_cf = cf_engine.compute_13_week_forecast(
        start_date=date.today(),
        starting_cash=fix_cash,
        avg_weekly_inflows=Decimal("900.00"),
        avg_weekly_outflows=Decimal("450.00"),
    )
    cash_flow_13w = [
        {
            "week": w.week_number,
            "start": w.start_date,
            "end": w.end_date,
            "net": float(w.net_cash_flow),
            "closing": float(w.closing_balance),
        }
        for w in weeks_cf
    ]

    total_net_worth = sum(current_cash.values())

    macro_data = None
    if include_macro:
        aggregator = MacroAggregator()
        snapshot = aggregator.get_daily_snapshot()
        macro_data = {
            "snapshot_date": snapshot.snapshot_date,
            "cached": snapshot.cached,
            "rates": {
                k: {"name": r.name, "value": float(r.value), "ref_date": r.reference_date}
                for k, r in snapshot.rates.items()
            },
            "top_headlines": [
                {"title": h.title, "source": h.source_name, "published": h.published_at}
                for h in snapshot.top_headlines
            ],
        }

    return {
        "audit_timestamp": date.today().isoformat(),
        "total_transactions": len(transactions),
        "transfers_neutralized": len(transfer_pairs),
        "card_settlements_reconciled": card_settlements,
        "total_liquid_net_worth": float(total_net_worth),
        "runways": runways,
        "mei_compliance": mei_reports,
        "cash_flow_13_weeks": cash_flow_13w,
        "macro_context": macro_data,
    }


def main():
    parser = argparse.ArgumentParser(description="OpenFamilyOffice Deterministic Engine CLI")
    parser.add_argument("--format", choices=["json", "markdown"], default="markdown", help="Output format")
    parser.add_argument("--templates-dir", default="templates", help="Path to templates folder containing CSVs")
    parser.add_argument("--include-macro", action="store_true", help="Fetch official BCB economic rates and headlines")

    args = parser.parse_args()

    entities_f = os.path.join(args.templates_dir, "entities_template.csv")
    categories_f = os.path.join(args.templates_dir, "categories_template.csv")
    transactions_f = os.path.join(args.templates_dir, "transactions_template.csv")

    for f in [entities_f, categories_f, transactions_f]:
        if not os.path.exists(f):
            print(f"Error: Missing required file: {f}", file=sys.stderr)
            sys.exit(1)

    result = run_full_audit(entities_f, categories_f, transactions_f, include_macro=args.include_macro)

    if args.format == "json":
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("# OpenFamilyOffice — Deterministic Audit Summary")
        print(f"**Audit Date**: {result['audit_timestamp']}")
        print(f"**Total Transactions**: {result['total_transactions']}")
        print(f"**Transfers Neutralized**: {result['transfers_neutralized']}")
        print(f"**Total Consolidated Liquid Net Worth**: R$ {result['total_liquid_net_worth']:,.2f}")
        print("\n## Liquid Runway Status")
        for ent, d in result["runways"].items():
            print(f"- **{ent}**: Cash R$ {d['available_cash']:,.2f} | Burn R$ {d['monthly_burn']:,.2f}/mo | Runway: **{d['runway_months']} months** [{d['status']}]")
        print("\n## MEI Regulatory Compliance (LC 238/2026)")
        for ent, d in result["mei_compliance"].items():
            print(f"- **{ent}**: YTD R$ {d['gross_revenue_ytd']:,.2f} / Ceiling R$ {d['annual_ceiling']:,.2f} ({d['utilization_percentage']}% used) [{d['status']}]")
            for note in d["notes"]:
                print(f"  * {note}")

        if result.get("macro_context"):
            mc = result["macro_context"]
            print("\n## Live Macroeconomic Context (BCB & News)")
            for k, r in mc["rates"].items():
                print(f"- **{r['name']}**: {r['value']} ({r['ref_date']})")
            print("\n**Top Market Headlines**:")
            for idx, h in enumerate(mc["top_headlines"], 1):
                print(f"{idx}. {h['title']} *({h['source']})*")


if __name__ == "__main__":
    main()

