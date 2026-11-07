"""Unit tests for the Runway and Burn Rate Calculator."""
from datetime import date
from decimal import Decimal
import unittest

from src.models.entities import Entity
from src.models.categories import Category
from src.models.transactions import Transaction
from src.engine.runway import RunwayCalculator
from src.models.enums import EntityType, CategoryScope


class TestRunwayCalculator(unittest.TestCase):

    def setUp(self):
        self.entities = {
            "HOUSEHOLD_OSMAR": Entity(
                entity_code="HOUSEHOLD_OSMAR",
                legal_name="Osmar & Vera",
                trade_name="Household",
                entity_type=EntityType.PERSONAL_INDIVIDUAL,
                tax_id_masked="***",
            ),
            "FIX_SERVICOS": Entity(
                entity_code="FIX_SERVICOS",
                legal_name="Fix Servicos",
                trade_name="Fix Servicos",
                entity_type=EntityType.BUSINESS_MEI,
                tax_id_masked="***",
            ),
        }
        self.categories = {
            "PER.ESSENTIAL": Category("PER.ESSENTIAL", "Essential", CategoryScope.PERSONAL, is_essential=True),
            "PER.LEISURE": Category("PER.LEISURE", "Leisure", CategoryScope.PERSONAL, is_essential=False),
            "EXP.OVERHEAD": Category("EXP.OVERHEAD", "Overhead", CategoryScope.BUSINESS, is_essential=False),
        }
        self.calculator = RunwayCalculator(self.entities, self.categories)

    def test_household_essential_burn_rate_and_runway(self):
        # Monthly essential expense: R$ 2000; Non-essential: R$ 500
        txs = [
            Transaction(id="t1", entity_code="HOUSEHOLD_OSMAR", account_name="Nubank", date=date(2026, 11, 1), amount=Decimal("-2000.00"), category_code="PER.ESSENTIAL"),
            Transaction(id="t2", entity_code="HOUSEHOLD_OSMAR", account_name="Nubank", date=date(2026, 11, 2), amount=Decimal("-500.00"), category_code="PER.LEISURE"),
        ]

        # Available cash: R$ 12,000 -> Essential runway should be 12000 / 2000 = 6.0 months -> SAFE_GREEN
        metrics = self.calculator.calculate_entity_runway(
            entity_code="HOUSEHOLD_OSMAR",
            available_liquid_cash=Decimal("12000.00"),
            transactions=txs,
            months_sampled=1,
        )

        self.assertEqual(metrics.monthly_burn_rate, Decimal("2000.00"))
        self.assertEqual(metrics.runway_months, Decimal("6.0"))
        self.assertEqual(metrics.status, "SAFE_GREEN")
        self.assertTrue(metrics.is_essential_only)

    def test_household_critical_runway(self):
        # Available cash: R$ 3,000, monthly essential: R$ 2,000 -> 1.5 months -> CRITICAL_RED
        txs = [
            Transaction(id="t1", entity_code="HOUSEHOLD_OSMAR", account_name="Nubank", date=date(2026, 11, 1), amount=Decimal("-2000.00"), category_code="PER.ESSENTIAL"),
        ]
        metrics = self.calculator.calculate_entity_runway(
            entity_code="HOUSEHOLD_OSMAR",
            available_liquid_cash=Decimal("3000.00"),
            transactions=txs,
            months_sampled=1,
        )
        self.assertEqual(metrics.runway_months, Decimal("1.5"))
        self.assertEqual(metrics.status, "CRITICAL_RED")


if __name__ == "__main__":
    unittest.main()

