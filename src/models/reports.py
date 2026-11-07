"""Metric and Report payload models."""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, List, Optional

from src.models.enums import ConfidenceLevel


@dataclass
class RunwayMetrics:
    """Runway calculation metrics for an entity."""
    entity_code: str
    available_liquid_cash: Decimal
    monthly_burn_rate: Decimal
    runway_months: Decimal
    runway_days: int
    is_essential_only: bool
    status: str  # "SAFE_GREEN", "WARNING_AMBER", "CRITICAL_RED"
    confidence: ConfidenceLevel = ConfidenceLevel.CONFIRMED


@dataclass
class CashFlowWeek:
    """Projected cash flow for a specific week."""
    week_number: int
    start_date: str
    end_date: str
    projected_inflows: Decimal
    projected_outflows: Decimal
    net_cash_flow: Decimal
    closing_balance: Decimal


@dataclass
class MEIComplianceStatus:
    """Compliance tracking for Brazilian MEI regulations."""
    entity_code: str
    tax_year: int
    annual_ceiling: Decimal
    gross_revenue_ytd: Decimal
    utilization_percentage: Decimal
    monthly_average_revenue: Decimal
    is_anti_partner_compliant: bool
    status: str  # "SAFE", "CAUTION_80", "CRITICAL_100", "EXCEEDED"
    notes: List[str] = field(default_factory=list)


@dataclass
class BriefingPayload:
    """Full deterministic payload exported for AI Advisory prompts."""
    generated_at: str
    period_start: str
    period_end: str
    runways: Dict[str, RunwayMetrics]
    mei_reports: Dict[str, MEIComplianceStatus]
    cash_flow_13_weeks: List[CashFlowWeek]
    total_household_net_worth: Decimal
    total_reconciled_transfers: int
    total_neutralized_transfer_value: Decimal
    unclassified_transactions_count: int
