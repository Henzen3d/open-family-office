"""Unit tests for the Executive Briefing Runner."""
import os
import tempfile
import unittest

from src.engine.briefing_runner import BriefingRunner


class TestBriefingRunner(unittest.TestCase):

    def setUp(self):
        self.runner = BriefingRunner()

    def test_build_deterministic_payload(self):
        payload, txs, entities = self.runner.build_deterministic_payload(data_dir="templates")

        self.assertIsNotNone(payload)
        self.assertIn("FIX_SERVICOS", payload.runways)
        self.assertIn("HOUSEHOLD_OSMAR", payload.runways)
        self.assertIn("FACILITA_VISTORIAS", payload.runways)

        # Check transfer neutralization
        self.assertGreaterEqual(payload.total_reconciled_transfers, 1)
        self.assertGreaterEqual(payload.total_neutralized_transfer_value, 2000)

        # Check 13-week forecast
        self.assertEqual(len(payload.cash_flow_13_weeks), 13)
        self.assertGreater(payload.cash_flow_13_weeks[0].closing_balance, 0)

        # Check MEI monitor
        self.assertIn("FIX_SERVICOS", payload.mei_reports)
        mei_fix = payload.mei_reports["FIX_SERVICOS"]
        self.assertEqual(mei_fix.annual_ceiling, 81000)

    def test_format_cfo_prompt(self):
        payload, txs, entities = self.runner.build_deterministic_payload(data_dir="templates")
        sys_prompt, user_content = self.runner.format_cfo_prompt(payload, entities)

        self.assertIn("Family CFO AI", sys_prompt)
        self.assertIn("Painel de Caixa e Runway Verificado", user_content)
        self.assertIn("Fix Servicos", user_content)
        self.assertIn("Household Osmar & Vera", user_content)

    def test_generate_briefing_offline(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = os.path.join(tmp_dir, "test_briefing.md")
            res = self.runner.generate_briefing(
                data_dir="templates",
                output_file=out_path,
                dry_run=True,
            )

            self.assertTrue(os.path.exists(out_path))
            self.assertEqual(res["status"], "COMPLETED_DRY_RUN")
            self.assertIn("Briefing Executivo Semanal", res["report_content"])
            self.assertIn("Painel de Caixa e Runway Verificado", res["report_content"])
            self.assertIn("Fix Servicos", res["report_content"])

    def test_format_adversarial_prompt(self):
        sys_prompt, user_content = self.runner.format_adversarial_prompt("Draft CFO briefing text")
        self.assertIn("Risk & Adversarial Auditor AI", sys_prompt)
        self.assertIn("Draft CFO briefing text", user_content)


if __name__ == "__main__":
    unittest.main()
