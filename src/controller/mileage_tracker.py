"""Mileage & Field Operations Cost Tracker inspired by Clara Fleet / Veículos."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date, datetime
from decimal import Decimal
import json
import os
from pathlib import Path
from typing import Dict, List, Optional


DEFAULT_KM_REIMBURSEMENT_RATE = Decimal("1.45")  # R$ por KM rodado (combustível + depreciação + seguro)


@dataclass
class FieldTripRecord:
    id: str
    date: str
    entity_code: str  # "FACILITA_VISTORIAS" or "FIX_SERVICOS"
    service_description: str
    client_name: str
    destination: str
    distance_km: float
    rate_per_km: float
    total_calculated_cost: float
    fuel_receipt_id: Optional[str] = None
    toll_amount: float = 0.0
    notes: str = ""


class MileageTracker:
    """Manages operational displacement expenses and mileage logs for field activities."""

    def __init__(self, data_file: Optional[Path] = None):
        if data_file:
            self.data_path = data_file
        else:
            data_dir = Path(os.getenv("DATA_DIR", "data"))
            self.data_path = data_dir / "ledger" / "mileage_trips.json"

        self._ensure_file()

    def _ensure_file(self):
        if not self.data_path.exists():
            self.data_path.parent.mkdir(parents=True, exist_ok=True)
            initial_data = [
                {
                    "id": "TRIP-2026-001",
                    "date": "2026-11-04",
                    "entity_code": "FACILITA_VISTORIAS",
                    "service_description": "Vistoria de Entrada - Apto 302 Ed. Jardins",
                    "client_name": "Imobiliária Aliança",
                    "destination": "Centro / Trindade - Florianópolis",
                    "distance_km": 34.5,
                    "rate_per_km": 1.45,
                    "total_calculated_cost": 50.02,
                    "fuel_receipt_id": None,
                    "toll_amount": 0.0,
                    "notes": "Deslocamento urbano com trânsito moderado.",
                },
                {
                    "id": "TRIP-2026-002",
                    "date": "2026-11-08",
                    "entity_code": "FACILITA_VISTORIAS",
                    "service_description": "Vistoria de Saída - Casa Residencial Campeche",
                    "client_name": "Imobiliária Novo Lar",
                    "destination": "Campeche - Sul da Ilha",
                    "distance_km": 52.0,
                    "rate_per_km": 1.45,
                    "total_calculated_cost": 75.40,
                    "fuel_receipt_id": None,
                    "toll_amount": 0.0,
                    "notes": "Vistoria fotográfica minuciosa.",
                },
                {
                    "id": "TRIP-2026-003",
                    "date": "2026-11-10",
                    "entity_code": "FIX_SERVICOS",
                    "service_description": "Manutenção de Servidor e Cabeamento Estruturado",
                    "client_name": "Clínica Vida Ativa",
                    "destination": "Kobrasol - São José",
                    "distance_km": 28.0,
                    "rate_per_km": 1.45,
                    "total_calculated_cost": 40.60,
                    "fuel_receipt_id": None,
                    "toll_amount": 0.0,
                    "notes": "Atendimento técnico presencial.",
                },
            ]
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump(initial_data, f, indent=2, ensure_ascii=False)

    def load_trips(self, entity_code: Optional[str] = None) -> List[FieldTripRecord]:
        self._ensure_file()
        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                raw_list = json.load(f)
            records = [FieldTripRecord(**item) for item in raw_list]
            if entity_code:
                clean_code = entity_code.upper().strip()
                return [r for r in records if r.entity_code.upper() == clean_code]
            return sorted(records, key=lambda x: x.date, reverse=True)
        except Exception:
            return []

    def record_trip(
        self,
        date_str: str,
        entity_code: str,
        service_description: str,
        client_name: str,
        destination: str,
        distance_km: float,
        rate_per_km: Optional[float] = None,
        fuel_receipt_id: Optional[str] = None,
        toll_amount: float = 0.0,
        notes: str = "",
    ) -> FieldTripRecord:
        rate = rate_per_km if rate_per_km is not None else float(DEFAULT_KM_REIMBURSEMENT_RATE)
        calculated_cost = round((distance_km * rate) + toll_amount, 2)
        trip_id = f"TRIP-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        record = FieldTripRecord(
            id=trip_id,
            date=date_str,
            entity_code=entity_code.upper().strip(),
            service_description=service_description,
            client_name=client_name,
            destination=destination,
            distance_km=distance_km,
            rate_per_km=rate,
            total_calculated_cost=calculated_cost,
            fuel_receipt_id=fuel_receipt_id,
            toll_amount=toll_amount,
            notes=notes,
        )

        all_trips = self.load_trips()
        all_trips.insert(0, record)

        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump([asdict(t) for t in all_trips], f, indent=2, ensure_ascii=False)

        return record

    def get_monthly_summary(self, year: int, month: int, entity_code: Optional[str] = None) -> Dict[str, any]:
        trips = self.load_trips(entity_code)
        month_prefix = f"{year:04d}-{month:02d}"
        month_trips = [t for t in trips if t.date.startswith(month_prefix)]

        total_distance = sum(t.distance_km for t in month_trips)
        total_operational_cost = sum(t.total_calculated_cost for t in month_trips)

        by_entity = {}
        for t in month_trips:
            by_entity.setdefault(t.entity_code, {"trips_count": 0, "km": 0.0, "cost": 0.0})
            by_entity[t.entity_code]["trips_count"] += 1
            by_entity[t.entity_code]["km"] += t.distance_km
            by_entity[t.entity_code]["cost"] += t.total_calculated_cost

        return {
            "period": month_prefix,
            "total_trips": len(month_trips),
            "total_distance_km": round(total_distance, 1),
            "total_operational_cost": round(total_operational_cost, 2),
            "by_entity": by_entity,
            "trips": [asdict(t) for t in month_trips],
        }

