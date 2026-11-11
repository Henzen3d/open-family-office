"""OpenFamilyOffice — Multi-Currency and Forex Data Models."""
from __future__ import annotations

from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class CurrencyCode(str, Enum):
    BRL = "BRL"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"


class MultiCurrencyAmount(BaseModel):
    """Represents a financial quantity with native currency and converted equivalents."""
    amount: Decimal = Field(..., description="Valor monetário na moeda de origem")
    currency: CurrencyCode = Field(default=CurrencyCode.BRL, description="Código ISO da moeda de origem")
    ptax_rate: Optional[Decimal] = Field(default=None, description="Taxa de câmbio PTAX utilizada na conversão")
    converted_brl: Optional[Decimal] = Field(default=None, description="Valor equivalente convertido para Reais (BRL)")
    converted_usd: Optional[Decimal] = Field(default=None, description="Valor equivalente convertido para Dólares (USD)")

    def model_post_init(self, __context):
        rate = self.ptax_rate or Decimal("5.80")
        if self.currency == CurrencyCode.BRL:
            self.converted_brl = self.amount
            self.converted_usd = round(self.amount / rate, 2)
        elif self.currency == CurrencyCode.USD:
            self.converted_usd = self.amount
            self.converted_brl = round(self.amount * rate, 2)
        elif self.currency == CurrencyCode.EUR:
            eur_rate = Decimal("6.15")
            self.converted_brl = round(self.amount * eur_rate, 2)
            self.converted_usd = round((self.amount * eur_rate) / rate, 2)
        else:
            self.converted_brl = self.amount
            self.converted_usd = round(self.amount / rate, 2)

