"""Unit tests for OFX & CSV Bank Statement Parser and Ledger Manager."""
from datetime import date
from decimal import Decimal
import os
import unittest

from src.controller.ofx_parser import BankStatementParser
from src.controller.ledger_manager import LedgerManager


SAMPLE_INTER_OFX = """OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20261108120000[-03:EST]
<LANGUAGE>POR
<FI>
<ORG>Banco Inter</ORG>
<FID>077</FID>
</FI>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>077
<ACCTID>9876543-2
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20261101000000[-03:EST]
<DTEND>20261108000000[-03:EST]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261102120000[-03:EST]
<TRNAMT>4500.00
<FITID>20261102001
<MEMO>PIX RECEBIDO CLIENTE MANUTENCAO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261103140000[-03:EST]
<TRNAMT>-350.00
<FITID>20261103002
<MEMO>COMPRA MATERIAIS ELETRICOS
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261105090000[-03:EST]
<TRNAMT>-2000.00
<FITID>20261105003
<MEMO>TRANSFERENCIA PIX PARA NUBANK OSMAR
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>15600.00
<DTASOF>20261108120000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
"""

SAMPLE_NUBANK_CSV = """Data,Valor,Identificador,Descrição
2026-11-05,2000.00,nu-101,Transferência recebida de Fix Serviços
2026-11-06,-350.50,nu-102,Supermercado Pão de Açúcar
2026-11-07,-89.90,nu-103,Farmácia São João
"""


class TestBankStatementParser(unittest.TestCase):

    def setUp(self):
        self.parser = BankStatementParser()
        self.test_ledger_path = "tests/test_temp_ledger.csv"
        if os.path.exists(self.test_ledger_path):
            os.remove(self.test_ledger_path)

    def tearDown(self):
        if os.path.exists(self.test_ledger_path):
            os.remove(self.test_ledger_path)

    def test_parse_inter_ofx(self):
        statement = self.parser.parse_ofx(SAMPLE_INTER_OFX)
        self.assertEqual(statement.bank_id, "077")
        self.assertEqual(statement.bank_name, "Banco Inter")
        self.assertEqual(statement.account_id, "9876543-2")
        self.assertEqual(len(statement.transactions), 3)

        tx1 = statement.transactions[0]
        self.assertEqual(tx1.amount, Decimal("4500.00"))
        self.assertEqual(tx1.entity_code, "FIX_SERVICOS")
        self.assertEqual(tx1.date, date(2026, 11, 2))
        self.assertTrue(tx1.id.startswith("tx-ofx-"))
        self.assertTrue(len(tx1.hash_id) > 8)

        tx2 = statement.transactions[1]
        self.assertEqual(tx2.amount, Decimal("-350.00"))
        self.assertEqual(tx2.fitid, "20261103002")

        self.assertEqual(statement.total_credits, Decimal("4500.00"))
        self.assertEqual(statement.total_debits, Decimal("2350.00"))

    def test_parse_nubank_csv(self):
        statement = self.parser.parse_csv(SAMPLE_NUBANK_CSV)
        self.assertEqual(statement.bank_id, "260")
        self.assertEqual(statement.bank_name, "Nubank")
        self.assertEqual(len(statement.transactions), 3)

        first = statement.transactions[0]
        self.assertEqual(first.amount, Decimal("2000.00"))
        self.assertEqual(first.entity_code, "HOUSEHOLD_OSMAR")
        self.assertEqual(first.date, date(2026, 11, 5))

    def test_ledger_manager_merge_and_deduplicate(self):
        mgr = LedgerManager(ledger_file=self.test_ledger_path)
        stmt_inter = self.parser.parse_ofx(SAMPLE_INTER_OFX)
        stmt_nubank = self.parser.parse_csv(SAMPLE_NUBANK_CSV)

        # First ingestion
        txs, added, skipped, trf_paired = mgr.merge_statement(stmt_inter)
        self.assertEqual(added, 3)
        self.assertEqual(skipped, 0)

        # Re-importing exact same statement must yield zero additions (Idempotent deduplication)
        txs2, added2, skipped2, _ = mgr.merge_statement(stmt_inter)
        self.assertEqual(added2, 0)
        self.assertEqual(skipped2, 3)

        # Ingest complementary Nubank statement with matching transfer (R$ 2000 on 2026-11-05)
        txs3, added3, skipped3, trf_paired2 = mgr.merge_statement(stmt_nubank)
        self.assertEqual(added3, 3)
        self.assertGreaterEqual(trf_paired2, 1)

        # Check transfer neutralization
        inter_debit = next(t for t in txs3 if t.amount == Decimal("-2000.00") and "FIX" in t.entity_code)
        nu_credit = next(t for t in txs3 if t.amount == Decimal("2000.00") and "HOUSEHOLD" in t.entity_code)
        self.assertTrue(inter_debit.is_transfer)
        self.assertTrue(nu_credit.is_transfer)
        self.assertEqual(inter_debit.transfer_pair_id, nu_credit.transfer_pair_id)

