"""Cryptocurrency Pricing Client integrating Coinbase Spot and AwesomeAPI (100% Free, Zero Auth)."""
from dataclasses import dataclass
from decimal import Decimal
import json
from typing import Dict, Optional
import urllib.request


@dataclass
class CryptoPrice:
    """Cryptocurrency market price quote."""
    symbol: str         # "BTC", "ETH", "SOL"
    currency: str       # "USD", "BRL"
    spot_price: Decimal
    source: str
    timestamp: str


class CryptoClient:
    """Fetches real-time crypto prices without requiring API keys or exchange accounts."""

    COINBASE_SPOT_URL = "https://api.coinbase.com/v2/prices/spot?currency={currency}"
    AWESOME_CRYPTO_URL = "https://economia.awesomeapi.com.br/last/BTC-BRL,ETH-BRL"

    def __init__(self, timeout: int = 5):
        self.timeout = timeout

    def fetch_btc_usd(self) -> CryptoPrice:
        """Fetches current Bitcoin spot price in USD from Coinbase."""
        url = self.COINBASE_SPOT_URL.format(currency="USD")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "OpenFamilyOffice/1.0"})
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                amount = Decimal(str(data.get("data", {}).get("amount", "0.00")))
                return CryptoPrice(
                    symbol="BTC",
                    currency="USD",
                    spot_price=amount,
                    source="Coinbase Public Spot",
                    timestamp="Live",
                )
        except Exception:
            return CryptoPrice("BTC", "USD", Decimal("75000.00"), "Fallback", "Offline")

    def fetch_crypto_brl(self) -> Dict[str, CryptoPrice]:
        """Fetches Bitcoin and Ethereum prices in BRL from AwesomeAPI."""
        prices: Dict[str, CryptoPrice] = {}
        try:
            req = urllib.request.Request(self.AWESOME_CRYPTO_URL, headers={"User-Agent": "OpenFamilyOffice/1.0"})
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for key, item in data.items():
                    symbol = item.get("code", "")
                    ask = Decimal(str(item.get("ask", "0.00")))
                    prices[symbol] = CryptoPrice(
                        symbol=symbol,
                        currency="BRL",
                        spot_price=ask,
                        source="AwesomeAPI Crypto",
                        timestamp=str(item.get("create_date", "")),
                    )
        except Exception:
            prices["BTC"] = CryptoPrice("BTC", "BRL", Decimal("410000.00"), "Fallback", "Offline")
            prices["ETH"] = CryptoPrice("ETH", "BRL", Decimal("16000.00"), "Fallback", "Offline")

        return prices

