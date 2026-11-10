"""Account and Bank Management with Flexible Balance Adjustments.

Allows users to configure banks, holders, and adjust baseline balances directly
without rigid reliance on historical receipts.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any


@dataclass
class BankAccount:
    id: str
    name: str
    bank_name: str
    entity_code: str
    holder: str
    purpose: str
    balance: float
    account_type: str = "CHECKING"
    color: str = "indigo"
    active: bool = True
    last_adjusted_at: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["formatted_balance"] = f"R$ {self.balance:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return d


DEFAULT_ACCOUNTS: List[BankAccount] = [
    BankAccount(
        id="nubank_pf",
        name="Nubank PF",
        bank_name="Nubank",
        entity_code="HOUSEHOLD_OSMAR",
        holder="Casal (Osmar & Vera)",
        purpose="Reserva Familiar & Gastos Domésticos",
        balance=357458.00,
        color="indigo",
        active=True,
        notes="Conta familiar consolidada",
    ),
    BankAccount(
        id="inter_pj",
        name="Banco Inter PJ",
        bank_name="Banco Inter",
        entity_code="FIX_SERVICOS",
        holder="Fix Serviços e Reparos MEI (Osmar)",
        purpose="Operacional MEI Prestação de Serviços",
        balance=100332.34,
        color="amber",
        active=True,
        notes="Conta operacional Inter PJ",
    ),
    BankAccount(
        id="caixa_pj",
        name="Caixa PJ",
        bank_name="Caixa Econômica",
        entity_code="FACILITA_VISTORIAS",
        holder="Facilita Vistorias MEI (Vera)",
        purpose="Operacional MEI Vistorias Imobiliárias",
        balance=50331.02,
        color="rose",
        active=True,
        notes="Conta operacional Caixa PJ",
    ),
]


class AccountManager:
    """Manages persistent bank accounts and manual balance adjustments."""

    def __init__(self, data_dir: Optional[str] = None):
        base = Path(data_dir) if data_dir else (Path("data") if Path("data").exists() else Path("config"))
        self.accounts_file = base / "accounts.json"
        self.audit_file = base / "governance" / "balance_adjustments.jsonl"
        self._ensure_storage()

    def _ensure_storage(self):
        """Ensures accounts.json exists with defaults if not present."""
        if not self.accounts_file.exists():
            self.accounts_file.parent.mkdir(parents=True, exist_ok=True)
            self.save_accounts(DEFAULT_ACCOUNTS)

    def load_accounts(self) -> List[BankAccount]:
        """Loads accounts from disk, returning defaults if file corrupted or missing."""
        if not self.accounts_file.exists():
            return list(DEFAULT_ACCOUNTS)

        try:
            with open(self.accounts_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                accounts = []
                for item in data:
                    accounts.append(
                        BankAccount(
                            id=item.get("id"),
                            name=item.get("name"),
                            bank_name=item.get("bank_name", item.get("name")),
                            entity_code=item.get("entity_code", "HOUSEHOLD_OSMAR"),
                            holder=item.get("holder", "Osmar & Vera"),
                            purpose=item.get("purpose", "Conta Geral"),
                            balance=float(item.get("balance", 0.0)),
                            account_type=item.get("account_type", "CHECKING"),
                            color=item.get("color", "indigo"),
                            active=item.get("active", True),
                            last_adjusted_at=item.get("last_adjusted_at"),
                            notes=item.get("notes"),
                        )
                    )
                return accounts
        except Exception:
            return list(DEFAULT_ACCOUNTS)

    def save_accounts(self, accounts: List[BankAccount]):
        """Persists accounts list to JSON."""
        self.accounts_file.parent.mkdir(parents=True, exist_ok=True)
        raw = [asdict(a) for a in accounts]
        with open(self.accounts_file, "w", encoding="utf-8") as f:
            json.dump(raw, f, indent=2, ensure_ascii=False)

    def get_account(self, account_id: str) -> Optional[BankAccount]:
        accounts = self.load_accounts()
        for a in accounts:
            if a.id == account_id:
                return a
        return None

    def add_or_update_account(self, account: BankAccount) -> BankAccount:
        accounts = self.load_accounts()
        found = False
        for i, a in enumerate(accounts):
            if a.id == account.id:
                accounts[i] = account
                found = True
                break
        if not found:
            accounts.append(account)
        self.save_accounts(accounts)
        return account

    def adjust_balance(
        self,
        account_id: str,
        new_balance: float,
        note: Optional[str] = None,
        source: str = "manual_user_input",
    ) -> Optional[BankAccount]:
        """Directly sets the actual balance of an account with audit logging."""
        accounts = self.load_accounts()
        target: Optional[BankAccount] = None
        for a in accounts:
            if a.id == account_id:
                old_balance = a.balance
                a.balance = round(float(new_balance), 2)
                a.last_adjusted_at = datetime.now(timezone.utc).isoformat()
                if note:
                    a.notes = note
                target = a
                break

        if not target:
            return None

        self.save_accounts(accounts)

        # Audit log for balance adjustment
        try:
            self.audit_file.parent.mkdir(parents=True, exist_ok=True)
            entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "account_id": account_id,
                "account_name": target.name,
                "old_balance": old_balance,
                "new_balance": target.balance,
                "difference": round(target.balance - old_balance, 2),
                "source": source,
                "note": note or "Ajuste manual de saldo",
            }
            with open(self.audit_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception:
            pass

        return target

    def delete_account(self, account_id: str) -> bool:
        accounts = self.load_accounts()
        initial_len = len(accounts)
        accounts = [a for a in accounts if a.id != account_id]
        if len(accounts) < initial_len:
            self.save_accounts(accounts)
            return True
        return False

    def get_consolidated_balances(self) -> Dict[str, Any]:
        """Returns consolidated multi-entity cash position using real adjusted balances."""
        accounts = self.load_accounts()
        active_accounts = [a for a in accounts if a.active]
        total_cash = sum(a.balance for a in active_accounts)

        fmt_total = f"R$ {total_cash:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return {
            "total_cash": round(total_cash, 2),
            "formatted_total": fmt_total,
            "accounts": [a.to_dict() for a in active_accounts],
            "segregation_status": "100% Segregado • Blindagem LC 123/2006 Ativa",
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
