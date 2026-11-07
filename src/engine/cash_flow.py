"""13-Week Rolling Cash Flow Projection Engine."""
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List

from src.models.transactions import Transaction
from src.models.reports import CashFlowWeek


class CashFlowForecastEngine:
    """Computes deterministic rolling 13-week cash flow and identifies liquidity pinch points."""

    def compute_13_week_forecast(
        self,
        start_date: date,
        starting_cash: Decimal,
        avg_weekly_inflows: Decimal,
        avg_weekly_outflows: Decimal,
        planned_lump_sums: dict = None,
    ) -> List[CashFlowWeek]:
        """Projects cash balances for the next 13 weeks.
        planned_lump_sums: dict mapping week_number (1-13) to Decimal adjustment (e.g., tax payment, contract receipt).
        """
        planned_lump_sums = planned_lump_sums or {}
        weeks: List[CashFlowWeek] = []
        current_balance = starting_cash

        for w in range(1, 14):
            w_start = start_date + timedelta(days=(w - 1) * 7)
            w_end = w_start + timedelta(days=6)

            inflow = avg_weekly_inflows
            outflow = avg_weekly_outflows

            # Apply any specific planned lump sums for this week
            lump = planned_lump_sums.get(w, Decimal("0.00"))
            if lump > 0:
                inflow += lump
            elif lump < 0:
                outflow += abs(lump)

            net_flow = inflow - outflow
            current_balance = current_balance + net_flow

            week_report = CashFlowWeek(
                week_number=w,
                start_date=w_start.strftime("%Y-%m-%d"),
                end_date=w_end.strftime("%Y-%m-%d"),
                projected_inflows=inflow.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                projected_outflows=outflow.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                net_cash_flow=net_flow.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                closing_balance=current_balance.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            )
            weeks.append(week_report)

        return weeks
