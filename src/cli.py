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
from src.llm.config_manager import ProviderConfigManager, CustomProviderConfig
from src.llm.importer import EnvImporter
from src.llm.rate_limiter import ProviderLimits
from src.integrations.hub import PublicApiHub
from src.controller.receipt_processor import ReceiptProcessor
from src.engine.briefing_runner import BriefingRunner


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


def handle_config_command(args):
    """Handles LLM provider configuration commands (list, add, remove, import)."""
    manager = ProviderConfigManager()

    if args.config_action == "list":
        providers = manager.list_providers()
        print(f"# Configured LLM Providers ({len(providers)} registered)\n")
        print("| Priority | ID | Name | Protocol | Model | Enabled | Base URL |")
        print("|---|---|---|---|---|---|---|")
        for p in providers:
            status_str = "Yes" if p.enabled else "No"
            masked_key = p.api_key[:6] + "..." if len(p.api_key) > 8 else (p.api_key or "None")
            print(f"| {p.priority} | {p.id} | {p.name} | `{p.protocol}` | `{p.model}` | {status_str} | {p.base_url} |")

    elif args.config_action == "add":
        limits = ProviderLimits(
            rpm_limit=args.rpm,
            tpm_limit=args.tpm,
            rpd_limit=args.rpd,
        )
        custom_headers = {}
        if args.protocol == "anthropic":
            custom_headers["anthropic-version"] = "2023-06-01"

        cfg = CustomProviderConfig(
            id=args.id,
            name=args.name,
            protocol=args.protocol,
            base_url=args.base_url,
            api_key=args.api_key,
            model=args.model,
            priority=args.priority,
            enabled=True,
            limits=limits,
            custom_headers=custom_headers,
        )
        manager.add_provider(cfg)
        print(f"Success: Provider '{cfg.name}' [{cfg.id}] added and saved to config/providers.json.")

    elif args.config_action == "remove":
        if manager.remove_provider(args.id):
            print(f"Success: Provider '{args.id}' removed.")
        else:
            print(f"Error: Provider '{args.id}' not found.")

    elif args.config_action == "import":
        source_path = args.source
        if not source_path:
            # Default auto-discover paths
            candidates = [
                r"J:\Arquivos Osmar\Multi+\.env",
                r"J:\Arquivos Osmar\Multi+\free.env",
                ".env",
            ]
            for c in candidates:
                if os.path.exists(c):
                    source_path = c
                    break

        if not source_path or not os.path.exists(source_path):
            print(f"Error: Source .env file not found at '{source_path}'. Specify with --source <path>")
            sys.exit(1)

        importer = EnvImporter()
        imported = importer.import_from_env_file(source_path, manager)
        print(f"Successfully imported {len(imported)} providers from '{source_path}':")
        for pid, pname in imported:
            print(f"- [{pid}] {pname}")


def handle_briefing_command(args):
    """Executes the executive briefing pipeline and displays output."""
    runner = BriefingRunner()
    print("⏳ Executing OpenFamilyOffice Executive Briefing Pipeline...")
    res = runner.generate_briefing(
        data_dir=args.data_dir,
        output_file=args.output,
        dry_run=args.dry_run,
        include_goldfish=not args.no_goldfish,
    )
    print(f"\n✅ Briefing generated successfully! [{res['status']}]")
    print(f"📄 Report File: {res['output_file']}")
    if res.get("provider_used"):
        print(f"🤖 AI Provider: {res['provider_used']} ({res['tokens_used']} tokens used)")
    print("\n" + "=" * 60 + "\n")
    print(res["report_content"])


def handle_receipt_command(args):
    """Ingests a receipt photo, PDF, or SEFAZ NFC-e QR code, extracting items and reconciling."""
    processor = ReceiptProcessor()
    raw_input = args.input.strip()

    # Check if input is a SEFAZ access key or QR code URL
    key_info = processor.parse_sefaz_access_key(raw_input)
    if key_info:
        print(f"📱 Detected Brazilian SEFAZ NFC-e QR Code / Chave de Acesso:")
        print(f"  * Chave: {key_info['chave_acesso']}")
        print(f"  * UF: {key_info['uf']} | Modelo: {key_info['modelo']} | Doc: {key_info['numero_doc']}")
        rcp = processor.create_receipt_from_sefaz_key(
            key_info=key_info,
            merchant_name="Estabelecimento Comercial (SEFAZ)",
            entity_code=args.entity or "HOUSEHOLD_OSMAR",
        )
    elif os.path.exists(raw_input):
        print(f"📷 Analyzing receipt image via Vision AI: {raw_input}")
        cfg_mgr = ProviderConfigManager()
        providers = cfg_mgr.list_providers(enabled_only=True)
        active_provider = next((p for p in providers if p.resolve_api_key()), None)
        if not active_provider:
            print("⚠️ No AI provider with API key found. Use 'python -m src.cli config add' or 'config import'.", file=sys.stderr)
            sys.exit(1)
        rcp = processor.process_image_with_vision(image_path=raw_input, provider_config=active_provider)
    else:
        print(f"Error: Input is neither a valid file path nor a recognized SEFAZ NFC-e QR code.", file=sys.stderr)
        sys.exit(1)

    # Ingest existing transactions to test bank matching
    txs_path = os.path.join(args.data_dir, "transactions_template.csv")
    if not os.path.exists(txs_path):
        txs_path = os.path.join(args.data_dir, "transactions.csv")

    existing_txs = load_transactions_csv(txs_path) if os.path.exists(txs_path) else []
    rcp, matched_tx, new_tx = processor.process_and_reconcile(rcp, existing_txs)

    print(f"\n# Receipt Ingestion Result")
    print(f"- **ID**: {rcp.id}")
    print(f"- **Estabelecimento**: {rcp.merchant_name} (CNPJ: {rcp.merchant_tax_id or 'N/A'})")
    print(f"- **Data / Valor**: {rcp.issue_date} | R$ {rcp.total_amount:,.2f}")
    print(f"- **Entidade Atribuída**: {rcp.entity_code}")
    print(f"- **Status de Conciliação**: {rcp.status}")
    if matched_tx:
        print(f"  🔗 [ANTI-DUPLICIDADE] Vinculado à transação bancária existente: {matched_tx.id} ({matched_tx.account_name})")
    elif new_tx:
        print(f"  ➕ Novo lançamento gerado: {new_tx.id} ({new_tx.clean_description})")

    if rcp.items:
        print(f"\n### Itens do Cupom ({len(rcp.items)} itens):")
        for it in rcp.items:
            print(f"  - {it.description}: {it.quantity} {it.unit_measure} x R$ {it.unit_price} = R$ {it.total_price}")


def main():
    parser = argparse.ArgumentParser(description="OpenFamilyOffice CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Audit command (or default)
    audit_parser = subparsers.add_parser("audit", help="Run deterministic financial audit")
    audit_parser.add_argument("--format", choices=["json", "markdown"], default="markdown", help="Output format")
    audit_parser.add_argument("--templates-dir", default="templates", help="Path to templates folder containing CSVs")
    audit_parser.add_argument("--include-macro", action="store_true", help="Fetch official BCB economic rates and headlines")

    # Config command
    config_parser = subparsers.add_parser("config", help="Manage LLM providers & API keys")
    config_sub = config_parser.add_subparsers(dest="config_action")

    # config list
    config_sub.add_parser("list", help="List registered LLM providers")

    # config add
    add_parser = config_sub.add_parser("add", help="Add custom LLM provider")
    add_parser.add_argument("--id", required=True, help="Unique slug ID (e.g. cerebras, deepseek, my-proxy)")
    add_parser.add_argument("--name", required=True, help="Human-readable provider name")
    add_parser.add_argument("--protocol", choices=["openai", "anthropic", "gemini"], default="openai", help="API protocol")
    add_parser.add_argument("--base-url", required=True, help="Base endpoint URL")
    add_parser.add_argument("--api-key", required=True, help="API key or ${ENV_VAR}")
    add_parser.add_argument("--model", required=True, help="Target model identifier")
    add_parser.add_argument("--priority", type=int, default=1, help="Fallback priority (1 = highest)")
    add_parser.add_argument("--rpm", type=int, default=30, help="Requests per minute limit")
    add_parser.add_argument("--tpm", type=int, default=30000, help="Tokens per minute limit")
    add_parser.add_argument("--rpd", type=int, default=5000, help="Requests per day limit")

    # config remove
    rem_parser = config_sub.add_parser("remove", help="Remove registered provider")
    rem_parser.add_argument("--id", required=True, help="Provider ID to remove")

    # config import
    imp_parser = config_sub.add_parser("import", help="Import providers from .env file (NexusLocal / Multi+)")
    imp_parser.add_argument("--source", help="Path to .env file to import from")

    # Market overview command (public-apis)
    market_parser = subparsers.add_parser("market", help="Show live FX and Crypto market rates (AwesomeAPI & Coinbase)")
    market_parser.add_argument("--format", choices=["json", "markdown"], default="markdown", help="Output format")

    # CNPJ verification command (BrasilAPI)
    cnpj_parser = subparsers.add_parser("cnpj", help="Inspect company legal standing by CNPJ (BrasilAPI)")
    cnpj_parser.add_argument("cnpj", help="14-digit CNPJ to inspect")

    # Holidays command (BrasilAPI / Nager.Date)
    holidays_parser = subparsers.add_parser("holidays", help="Show banking and public holidays")
    holidays_parser.add_argument("--year", type=int, default=date.today().year, help="Year to query")
    holidays_parser.add_argument("--country", default="BR", help="ISO country code (default: BR)")

    # Executive Briefing command (Family CFO + Goldfish)
    briefing_parser = subparsers.add_parser("briefing", help="Generate Executive Weekly Family Office Briefing")
    briefing_parser.add_argument("--data-dir", default="templates", help="Directory containing CSV files (default: templates)")
    briefing_parser.add_argument("--output", help="Custom markdown report output path")
    briefing_parser.add_argument("--dry-run", action="store_true", help="Run deterministic calculations without calling LLM APIs")
    briefing_parser.add_argument("--no-goldfish", action="store_true", help="Skip EGM Goldfish Red Team audit")

    # Receipt ingestion command (NFC-e QR / Vision AI)
    receipt_parser = subparsers.add_parser("receipt", help="Ingest receipt photo or NFC-e QR code and reconcile")
    receipt_parser.add_argument("input", help="Image path, PDF path, or SEFAZ NFC-e QR Code / 44-digit key")
    receipt_parser.add_argument("--data-dir", default="templates", help="Directory containing transactions for bank matching")
    receipt_parser.add_argument("--entity", help="Entity code (default: HOUSEHOLD_OSMAR)")
    receipt_parser.add_argument("--dry-run", action="store_true", help="Parse without recording")

    # If no subcommand passed, default to running audit
    valid_commands = ["audit", "config", "market", "cnpj", "holidays", "briefing", "receipt"]
    if len(sys.argv) == 1 or sys.argv[1] not in valid_commands:
        # Parse audit directly from root args for backward compatibility
        parser.add_argument("--format", choices=["json", "markdown"], default="markdown", help="Output format")
        parser.add_argument("--templates-dir", default="templates", help="Path to templates folder containing CSVs")
        parser.add_argument("--include-macro", action="store_true", help="Fetch official BCB economic rates and headlines")
        args = parser.parse_args()
        args.command = "audit"
    else:
        args = parser.parse_args()

    if args.command == "briefing":
        handle_briefing_command(args)
        return

    if args.command == "receipt":
        handle_receipt_command(args)
        return

    if args.command == "market":
        hub = PublicApiHub()
        overview = hub.get_market_overview()
        if args.format == "json":
            serializable = {
                "usd_brl": {"bid": float(overview.usd_brl.bid), "ask": float(overview.usd_brl.ask), "pct_change": float(overview.usd_brl.pct_change)} if overview.usd_brl else None,
                "eur_brl": {"bid": float(overview.eur_brl.bid), "ask": float(overview.eur_brl.ask), "pct_change": float(overview.eur_brl.pct_change)} if overview.eur_brl else None,
                "btc_brl": {"spot": float(overview.btc_brl.spot_price)} if overview.btc_brl else None,
                "btc_usd": {"spot": float(overview.btc_usd.spot_price)} if overview.btc_usd else None,
            }
            print(json.dumps(serializable, indent=2))
        else:
            print("# Live Market Rates (AwesomeAPI & Coinbase)")
            if overview.usd_brl:
                print(f"- **Dólar (USD/BRL)**: Compra R$ {overview.usd_brl.bid} | Venda R$ {overview.usd_brl.ask} (Var 24h: {overview.usd_brl.pct_change}%)")
            if overview.eur_brl:
                print(f"- **Euro (EUR/BRL)**: Compra R$ {overview.eur_brl.bid} | Venda R$ {overview.eur_brl.ask} (Var 24h: {overview.eur_brl.pct_change}%)")
            if overview.btc_brl:
                print(f"- **Bitcoin (BTC/BRL)**: R$ {overview.btc_brl.spot_price:,.2f}")
            if overview.btc_usd:
                print(f"- **Bitcoin (BTC/USD)**: $ {overview.btc_usd.spot_price:,.2f}")
        return

    if args.command == "cnpj":
        hub = PublicApiHub()
        company = hub.verify_company(args.cnpj)
        if not company:
            print(f"Error: Could not retrieve data for CNPJ {args.cnpj}")
            sys.exit(1)
        print(f"# Company Verification: {company.razao_social}")
        print(f"- **Nome Fantasia**: {company.nome_fantasia}")
        print(f"- **CNPJ**: {company.cnpj}")
        print(f"- **Situação Cadastral**: {company.situacao_cadastral} ({'Regular' if company.is_active else 'IRREGULAR'})")
        print(f"- **Atividade (CNAE)**: {company.cnae_descricao}")
        print(f"- **Capital Social**: R$ {company.capital_social:,.2f}")
        print(f"- **Localização**: {company.municipio}/{company.uf}")
        if company.qsa:
            print("- **Sócios e Administradores (QSA)**:")
            for p in company.qsa:
                print(f"  * {p.nome_socio} ({p.qualificacao_socio})")
        return

    if args.command == "holidays":
        hub = PublicApiHub()
        holidays = hub.get_upcoming_holidays(args.year, args.country)
        print(f"# Official Bank Holidays ({args.country} - {args.year})\n")
        print("| Date | Day of Week | Holiday Name |")
        print("|---|---|---|")
        for h in holidays:
            weekday_str = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][h.holiday_date.weekday()]
            print(f"| {h.holiday_date.strftime('%Y-%m-%d')} | {weekday_str} | {h.name} |")
        return

    if args.command == "config":
        if not args.config_action:
            config_parser.print_help()
            sys.exit(0)
        handle_config_command(args)
        return

    # Execute Audit
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

