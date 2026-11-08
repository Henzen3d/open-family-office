"""Open Financial Exchange (OFX) and Banking CSV Statement Parser.

Supports Brazilian banking formats:
- Banco Inter (Bank Code 077) -> Default entity: FIX_SERVICOS (Osmar)
- Caixa Econômica Federal (Bank Code 104) -> Default entity: FACILITA_VISTORIAS (Vera)
- Nubank (Bank Code 260) -> Default entity: HOUSEHOLD_OSMAR (Casal PF)

Generates deterministic SHA-256 transaction hashes to enforce idempotency.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
import hashlib
import re
from typing import Dict, List, Optional, Tuple


@dataclass
class ParsedBankTransaction:
    """Standardized transaction extracted from OFX or CSV statement."""
    id: str
    entity_code: str
    account_name: str
    date: date
    amount: Decimal
    currency: str
    raw_description: str
    clean_description: str
    fitid: str
    check_number: Optional[str] = None
    trntype: str = "OTHER"
    memo: str = ""
    is_transfer: bool = False
    transfer_pair_id: Optional[str] = None
    hash_id: str = ""


@dataclass
class ParsedStatement:
    """Summary and transactions extracted from a bank statement file."""
    bank_id: str
    bank_name: str
    account_id: str
    account_type: str
    currency: str
    start_date: Optional[date]
    end_date: Optional[date]
    balance: Optional[Decimal]
    transactions: List[ParsedBankTransaction] = field(default_factory=list)
    total_credits: Decimal = Decimal("0.00")
    total_debits: Decimal = Decimal("0.00")


class BankStatementParser:
    """Parses OFX 1.x (SGML), OFX 2.x (XML), and Bank CSV files into standardized records."""

    BANK_DIRECTORY: Dict[str, Tuple[str, str, str]] = {
        # BankCode: (BankName, DefaultEntityCode, DefaultAccountName)
        "077": ("Banco Inter", "FIX_SERVICOS", "Inter PJ (Fix Serviços)"),
        "77": ("Banco Inter", "FIX_SERVICOS", "Inter PJ (Fix Serviços)"),
        "104": ("Caixa Econômica Federal", "FACILITA_VISTORIAS", "Caixa PJ (Facilita Vistorias)"),
        "260": ("Nubank", "HOUSEHOLD_OSMAR", "Nubank PF (Ultravioleta)"),
    }

    @staticmethod
    def parse_ofx_date(date_str: str) -> date:
        """Parses OFX date string format YYYYMMDDHHMMSS or YYYYMMDD."""
        clean = re.sub(r"\[.*\]", "", date_str.strip())
        digits = re.sub(r"\D", "", clean)
        if len(digits) >= 8:
            year = int(digits[0:4])
            month = int(digits[4:6])
            day = int(digits[6:8])
            return date(year, month, day)
        return date.today()

    @staticmethod
    def parse_amount(val_str: str) -> Decimal:
        """Parses decimal string safely, handling commas, points, and currency symbols."""
        if not val_str:
            return Decimal("0.00")
        cleaned = val_str.strip().replace("R$", "").replace("$", "").replace(" ", "")
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")
        try:
            return Decimal(cleaned)
        except Exception:
            return Decimal("0.00")

    @classmethod
    def generate_tx_hash(cls, bank_id: str, account_id: str, fitid: str, tx_date: date, amount: Decimal) -> str:
        """Generates an idempotent SHA-256 fingerprint for deduplication."""
        fingerprint = f"{bank_id}_{account_id}_{fitid}_{tx_date.isoformat()}_{amount}"
        return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:16]

    def parse_ofx(self, ofx_content: str, entity_override: Optional[str] = None) -> ParsedStatement:
        """Parses SGML or XML formatted OFX content."""
        # Extract Bank ID
        bank_id_match = re.search(r"<BANKID>([\s\S]*?)(?:<|\r|\n)", ofx_content, re.IGNORECASE)
        bank_id = bank_id_match.group(1).strip() if bank_id_match else "077"

        # Check Org Name if Bank ID not clear
        org_match = re.search(r"<ORG>([\s\S]*?)(?:<|\r|\n)", ofx_content, re.IGNORECASE)
        org_name = org_match.group(1).strip() if org_match else ""
        if "inter" in org_name.lower():
            bank_id = "077"
        elif "caixa" in org_name.lower() or "cef" in org_name.lower():
            bank_id = "104"
        elif "nu" in org_name.lower():
            bank_id = "260"

        # Account ID
        acct_id_match = re.search(r"<ACCTID>([\s\S]*?)(?:<|\r|\n)", ofx_content, re.IGNORECASE)
        account_id = acct_id_match.group(1).strip() if acct_id_match else "1001"

        # Account Type
        acct_type_match = re.search(r"<ACCTTYPE>([\s\S]*?)(?:<|\r|\n)", ofx_content, re.IGNORECASE)
        acct_type = acct_type_match.group(1).strip() if acct_type_match else "CHECKING"

        # Currency
        cur_match = re.search(r"<CURDEF>([\s\S]*?)(?:<|\r|\n)", ofx_content, re.IGNORECASE)
        currency = cur_match.group(1).strip() if cur_match else "BRL"

        # Determine Bank Meta
        bank_meta = self.BANK_DIRECTORY.get(bank_id, ("Banco Comercial", "HOUSEHOLD_OSMAR", "Conta Corrente"))
        bank_name = bank_meta[0]
        default_entity = entity_override or bank_meta[1]
        account_name = bank_meta[2]

        # Extract Transactions: <STMTTRN> ... </STMTTRN> or between <STMTTRN> tags
        trn_blocks = re.findall(r"<STMTTRN>([\s\S]*?)(?:</STMTTRN>|(?=<STMTTRN>)|(?=</BANKTRANLIST>)|$)", ofx_content, re.IGNORECASE)

        transactions: List[ParsedBankTransaction] = []
        total_credits = Decimal("0.00")
        total_debits = Decimal("0.00")
        dates: List[date] = []

        for block in trn_blocks:
            if not block.strip():
                continue

            def get_tag(tag: str) -> str:
                m = re.search(rf"<{tag}>([\s\S]*?)(?:</{tag}>|<|\r|\n)", block, re.IGNORECASE)
                return m.group(1).strip() if m else ""

            trntype = get_tag("TRNTYPE") or "OTHER"
            dtposted_str = get_tag("DTPOSTED")
            trnamt_str = get_tag("TRNAMT")
            fitid = get_tag("FITID") or hashlib.sha256(block.encode("utf-8")).hexdigest()[:12]
            name = get_tag("NAME")
            memo = get_tag("MEMO")
            checknum = get_tag("CHECKNUM") or None

            amount = self.parse_amount(trnamt_str)
            tx_date = self.parse_ofx_date(dtposted_str)
            dates.append(tx_date)

            if amount > 0:
                total_credits += amount
            else:
                total_debits += abs(amount)

            clean_desc = (memo or name or "Transação Bancária").strip()
            raw_desc = f"{name} {memo}".strip()
            tx_hash = self.generate_tx_hash(bank_id, account_id, fitid, tx_date, amount)

            tx = ParsedBankTransaction(
                id=f"tx-ofx-{tx_hash}",
                entity_code=default_entity,
                account_name=account_name,
                date=tx_date,
                amount=amount,
                currency=currency,
                raw_description=raw_desc,
                clean_description=clean_desc,
                fitid=fitid,
                check_number=checknum,
                trntype=trntype,
                memo=memo,
                hash_id=tx_hash,
            )
            transactions.append(tx)

        start_date = min(dates) if dates else None
        end_date = max(dates) if dates else None

        # Ledger Balance
        bal_match = re.search(r"<BALAMT>([\s\S]*?)(?:<|\r|\n)", ofx_content, re.IGNORECASE)
        balance = self.parse_amount(bal_match.group(1)) if bal_match else None

        return ParsedStatement(
            bank_id=bank_id,
            bank_name=bank_name,
            account_id=account_id,
            account_type=acct_type,
            currency=currency,
            start_date=start_date,
            end_date=end_date,
            balance=balance,
            transactions=transactions,
            total_credits=total_credits,
            total_debits=total_debits,
        )

    def parse_csv(self, csv_content: str, entity_override: Optional[str] = None) -> ParsedStatement:
        """Parses banking CSV files (Nubank, Inter, or Caixa)."""
        lines = [line.strip() for line in csv_content.splitlines() if line.strip()]
        if not lines:
            raise ValueError("Arquivo CSV vazio.")

        header_line = lines[0].lower()
        transactions: List[ParsedBankTransaction] = []
        total_credits = Decimal("0.00")
        total_debits = Decimal("0.00")
        dates: List[date] = []

        # Determine Bank based on CSV Headers
        if "identificador" in header_line or "título" in header_line or ("data" in header_line and "valor" in header_line and "descrição" in header_line):
            # Nubank CSV Format: Data,Valor,Identificador,Descrição
            bank_id = "260"
            bank_name = "Nubank"
            default_entity = entity_override or "HOUSEHOLD_OSMAR"
            account_name = "Nubank PF (Ultravioleta)"
        elif "lançamento" in header_line or "saldo" in header_line:
            # Inter or Caixa
            if "inter" in csv_content.lower():
                bank_id = "077"
                bank_name = "Banco Inter"
                default_entity = entity_override or "FIX_SERVICOS"
                account_name = "Inter PJ (Fix Serviços)"
            else:
                bank_id = "104"
                bank_name = "Caixa Econômica Federal"
                default_entity = entity_override or "FACILITA_VISTORIAS"
                account_name = "Caixa PJ (Facilita Vistorias)"
        else:
            bank_id = "077"
            bank_name = "Banco Comercial"
            default_entity = entity_override or "FIX_SERVICOS"
            account_name = "Extrato CSV"

        # Delimiter detection: comma or semicolon
        delimiter = ";" if ";" in lines[0] else ","

        for idx, line in enumerate(lines[1:], start=1):
            parts = [p.strip().strip('"') for p in line.split(delimiter)]
            if len(parts) < 3:
                continue

            # Try parsing date from first column
            date_part = parts[0]
            tx_date = date.today()
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                try:
                    tx_date = datetime.strptime(date_part, fmt).date()
                    break
                except ValueError:
                    pass

            # Try finding amount
            amount = Decimal("0.00")
            desc = ""
            fitid = f"csv-{idx}"

            if len(parts) >= 4 and any(c in parts[1] for c in "0123456789"):
                # Format: Date, Amount, ID, Description
                amount = self.parse_amount(parts[1])
                fitid = parts[2] or f"csv-{idx}"
                desc = parts[3]
            elif len(parts) >= 4:
                # Format: Date, Desc, Amount, Balance
                amount = self.parse_amount(parts[2]) if any(c in parts[2] for c in "0123456789") else self.parse_amount(parts[3])
                desc = parts[1]
            else:
                amount = self.parse_amount(parts[1])
                desc = parts[2]

            dates.append(tx_date)
            if amount > 0:
                total_credits += amount
            else:
                total_debits += abs(amount)

            tx_hash = self.generate_tx_hash(bank_id, "csv", fitid, tx_date, amount)

            tx = ParsedBankTransaction(
                id=f"tx-csv-{tx_hash}",
                entity_code=default_entity,
                account_name=account_name,
                date=tx_date,
                amount=amount,
                currency="BRL",
                raw_description=desc,
                clean_description=desc,
                fitid=fitid,
                trntype="CREDIT" if amount > 0 else "DEBIT",
                hash_id=tx_hash,
            )
            transactions.append(tx)

        return ParsedStatement(
            bank_id=bank_id,
            bank_name=bank_name,
            account_id="csv-import",
            account_type="CHECKING",
            currency="BRL",
            start_date=min(dates) if dates else None,
            end_date=max(dates) if dates else None,
            balance=None,
            transactions=transactions,
            total_credits=total_credits,
            total_debits=total_debits,
        )

    def parse_statement_file(self, content: str, filename: str = "", entity_override: Optional[str] = None) -> ParsedStatement:
        """Auto-detects format (OFX or CSV) and parses accordingly."""
        lower_name = filename.lower()
        if lower_name.endswith(".ofx") or lower_name.endswith(".qfx") or "<OFX>" in content or "OFXHEADER" in content:
            return self.parse_ofx(content, entity_override=entity_override)
        return self.parse_csv(content, entity_override=entity_override)

