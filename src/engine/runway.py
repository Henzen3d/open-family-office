"""Deterministic Runway and Burn Rate Calculation Engine."""
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List

from src.models.entities import Entity
from src.models.categories import Category
from src.models.transactions import Transaction
from src.models.reports import RunwayMetrics
from src.models.enums import ConfidenceLevel, EntityType


class RunwayCalculator:
    """Calculates exact liquid cash runway in months and days without LLM mental math."""

    def __init__(self, entities: Dict[str, Entity], categories: Dict[str, Category]):
        self.entities = entities
        self.categories = categories

    def calculate_entity_runway(
        self,
        entity_code: str,
        available_liquid_cash: Decimal,
        transactions: List[Transaction],
        months_sampled: int = 1,
    ) -> RunwayMetrics:
        """Computes burn rate and remaining runway for a specific entity."""
        entity = self.entities.get(entity_code)
        is_household = entity.entity_type == EntityType.PERSONAL_INDIVIDUAL if entity else False

        # Filter expenses for this entity excluding internal transfers
        expenses = [
            abs(t.amount) for t in transactions
            if t.entity_code == entity_code
            and t.amount < 0
            and not t.is_transfer
        ]

        if is_household:
            # For household, calculate essential burn rate (rent, food, health)
            essential_expenses = [
                abs(t.amount) for t in transactions
                if t.entity_code == entity_code
                and t.amount < 0
                and not t.is_transfer
                and (t.category_code in self.categories and self.categories[t.category_code].is_essential)
            ]
            total_burn = sum(essential_expenses) if essential_expenses else sum(expenses)
            is_essential_only = True
        else:
            total_burn = sum(expenses)
            is_essential_only = False

        sample_divisor = Decimal(str(max(1, months_sampled)))
        monthly_burn = (Decimal(str(total_burn)) / sample_divisor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        if monthly_burn > 0:
            runway_months = (available_liquid_cash / monthly_burn).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            runway_days = int((runway_months * Decimal("30")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        else:
            runway_months = Decimal("999.0")
            runway_days = 9999

        # Thresholds from docs/CRISIS_PLAYBOOK.md
        if is_household:
            if runway_months >= Decimal("6.0"):
                status = "SAFE_GREEN"
            elif runway_months >= Decimal("3.0"):
                status = "WARNING_AMBER"
            else:
                status = "CRITICAL_RED"
        else:
            if runway_months >= Decimal("3.0"):
                status = "SAFE_GREEN"
            elif runway_months >= Decimal("1.5"):
                status = "WARNING_AMBER"
            else:
                status = "CRITICAL_RED"

        return RunwayMetrics(
            entity_code=entity_code,
            available_liquid_cash=available_liquid_cash,
            monthly_burn_rate=monthly_burn,
            runway_months=runway_months,
            runway_days=runway_days,
            is_essential_only=is_essential_only,
            status=status,
            confidence=ConfidenceLevel.CONFIRMED,
        )
