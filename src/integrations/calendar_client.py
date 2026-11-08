"""Banking Calendar & Public Holidays Client using BrasilAPI and Nager.Date (100% Free, Zero Auth)."""
from dataclasses import dataclass
from datetime import date, datetime, timedelta
import json
from typing import Dict, List, Optional, Set
import urllib.request


@dataclass
class PublicHoliday:
    """Official public or banking holiday."""
    holiday_date: date
    name: str
    country_code: str
    holiday_type: str = "national"


class CalendarClient:
    """Determines banking days, statutory holidays, and financial due date rollovers."""

    BRASIL_API_FERIADOS_URL = "https://brasilapi.com.br/api/feriados/v1/{year}"
    NAGER_DATE_URL = "https://date.nager.at/api/v3/PublicHolidays/{year}/{country}"

    def __init__(self, timeout: int = 5):
        self.timeout = timeout
        self._holiday_cache: Dict[str, Set[date]] = {}

    def fetch_holidays(self, year: int, country_code: str = "BR") -> List[PublicHoliday]:
        """Fetches public holidays for the given year and country."""
        country_code = country_code.upper()
        cache_key = f"{country_code}_{year}"

        holidays: List[PublicHoliday] = []

        if country_code == "BR":
            url = self.BRASIL_API_FERIADOS_URL.format(year=year)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "OpenFamilyOffice/1.0"})
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    for item in data:
                        h_date = datetime.strptime(item["date"], "%Y-%m-%d").date()
                        holidays.append(
                            PublicHoliday(
                                holiday_date=h_date,
                                name=item.get("name", "Feriado Nacional"),
                                country_code="BR",
                                holiday_type=item.get("type", "national"),
                            )
                        )
            except Exception:
                # Basic standard Brazilian national holidays fallback
                for m, d, n in [(1, 1, "Confraternização"), (4, 21, "Tiradentes"), (5, 1, "Trabalho"), (9, 7, "Independência"), (10, 12, "Aparecida"), (11, 2, "Finados"), (11, 15, "República"), (12, 25, "Natal")]:
                    holidays.append(PublicHoliday(date(year, m, d), n, "BR"))
        else:
            url = self.NAGER_DATE_URL.format(year=year, country=country_code)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "OpenFamilyOffice/1.0"})
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    for item in data:
                        h_date = datetime.strptime(item["date"], "%Y-%m-%d").date()
                        holidays.append(
                            PublicHoliday(
                                holiday_date=h_date,
                                name=item.get("name", "Public Holiday"),
                                country_code=country_code,
                                holiday_type="national",
                            )
                        )
            except Exception:
                pass

        self._holiday_cache[cache_key] = {h.holiday_date for h in holidays}
        return holidays

    def is_holiday(self, target_date: date, country_code: str = "BR") -> bool:
        """Returns True if the specified date is an official bank holiday."""
        cache_key = f"{country_code.upper()}_{target_date.year}"
        if cache_key not in self._holiday_cache:
            self.fetch_holidays(target_date.year, country_code)
        return target_date in self._holiday_cache.get(cache_key, set())

    def is_business_day(self, target_date: date, country_code: str = "BR") -> bool:
        """Returns True if the date is a Monday-Friday weekday and not an official holiday."""
        if target_date.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
            return False
        return not self.is_holiday(target_date, country_code)

    def roll_due_date_to_next_business_day(self, due_date: date, country_code: str = "BR") -> date:
        """Rolls a payment or receivable due date to the next valid banking business day if it falls on a weekend or holiday."""
        current = due_date
        while not self.is_business_day(current, country_code):
            current += timedelta(days=1)
        return current

