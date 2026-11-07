"""Unit tests for the Brazilian MEI Tax Monitor (LC 238/2026)."""
from datetime import date
from decimal import Decimal
import unittest

from src.models.entities import Entity
from src.models.transactions import Transaction
from src.engine.tax_monitor import MEITaxMonitor
from src.models.enums import EntityType


class TestMEITaxMonitor(unittest.TestCase):

    def setUp(self):
        self.monitor = MEITaxMonitor()

    def test_annual_ceilings_under_lc_238(self):
        self.assertEqual(self.monitor.get_annual_ceiling(2026), Decimal("81000.00"))
        self.assertEqual(self.monitor.get_annual_ceiling(2027), Decimal("110000.00"))
        self.assertEqual(self.monitor.get_annual_ceiling(2028), Decimal("140000.00"))

    def test_caution_status_at_80_percent_of_cap(self):
        # 80% of R$ 81,000 is R$ 64,800
        txs = [
            Transaction(
                id="t1",
                entity_code="FIX_SERVICOS",
                account_name="Nubank PJ",
                date=date(2026, 6, 1),
                amount=Decimal("65000.00"),
            )
        ]
        entities = {
            "FIX_SERVICOS": Entity(
                entity_code="FIX_SERVICOS",
                legal_name="Fix Servicos",
                trade_name="Fix",
                entity_type=EntityType.BUSINESS_MEI,
                tax_id_masked="***",
                owner_principal="Osmar Henzen",
            )
        }

        status = self.monitor.calculate_mei_status("FIX_SERVICOS", 2026, 6, txs, entities)

        self.assertEqual(status.status, "CAUTION_80")
        self.assertGreaterEqual(status.utilization_percentage, Decimal("80.0"))

    def test_anti_partner_conflict_detected_when_one_person_has_two_meis(self):
        # Both MEIs owned by Osmar -> Conflict!
        entities = {
            "FIX_SERVICOS": Entity(
                entity_code="FIX_SERVICOS",
                legal_name="Fix",
                trade_name="Fix",
                entity_type=EntityType.BUSINESS_MEI,
                tax_id_masked="***",
                owner_principal="Osmar Henzen",
            ),
            "FACILITA_VISTORIAS": Entity(
                entity_code="FACILITA_VISTORIAS",
                legal_name="Facilita",
                trade_name="Facilita",
                entity_type=EntityType.BUSINESS_MEI,
                tax_id_masked="***",
                owner_principal="Osmar Henzen",
            ),
        }

        is_compliant, notes = self.monitor.check_anti_partner_compliance(entities)
        self.assertFalse(is_compliant)
        self.assertTrue(any("LEGAL CONFLICT" in n for n in notes))

    def test_anti_partner_compliant_when_separated_between_spouses(self):
        # Fix owned by Osmar, Facilita owned by Vera -> Fully compliant!
        entities = {
            "FIX_SERVICOS": Entity(
                entity_code="FIX_SERVICOS",
                legal_name="Fix",
                trade_name="Fix",
                entity_type=EntityType.BUSINESS_MEI,
                tax_id_masked="***",
                owner_principal="Osmar Henzen",
            ),
            "FACILITA_VISTORIAS": Entity(
                entity_code="FACILITA_VISTORIAS",
                legal_name="Facilita",
                trade_name="Facilita",
                entity_type=EntityType.BUSINESS_MEI,
                tax_id_masked="***",
                owner_principal="Vera Henzen",
            ),
        }

        is_compliant, notes = self.monitor.check_anti_partner_compliance(entities)
        self.assertTrue(is_compliant)
        self.assertEqual(len(notes), 0)


if __name__ == "__main__":
    unittest.main()

