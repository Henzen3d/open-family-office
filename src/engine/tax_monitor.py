"""Brazilian MEI Tax & Compliance Monitoring Engine."""
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Tuple

from src.models.entities import Entity
from src.models.transactions import Transaction
from src.models.reports import MEIComplianceStatus
from src.models.enums import EntityType


class MEITaxMonitor:
    """Monitors Brazilian Microempreendedor Individual (MEI) ceilings under Lei Complementar nº 238/2026 and verifies anti-partner corporate integrity."""

    # Annual ceilings under Lei Complementar nº 238, de 21 de outubro de 2026
    CEILINGS = {
        2026: Decimal("81000.00"),
        2027: Decimal("110000.00"),  # Allows up to 2 employees
        2028: Decimal("140000.00"),
    }

    def get_annual_ceiling(self, year: int) -> Decimal:
        """Returns the legal ceiling for the given tax year."""
        return self.CEILINGS.get(year, Decimal("81000.00"))

    def check_anti_partner_compliance(self, entities: Dict[str, Entity]) -> Tuple[bool, List[str]]:
        """Audits whether any individual owns more than one MEI entity, which is prohibited under Brazilian Law (LC 123/2006)."""
        mei_owners: Dict[str, List[str]] = {}
        notes: List[str] = []
        is_compliant = True

        for code, entity in entities.items():
            if entity.entity_type == EntityType.BUSINESS_MEI:
                owner = entity.owner_principal.strip()
                if owner:
                    if owner not in mei_owners:
                        mei_owners[owner] = []
                    mei_owners[owner].append(code)

        for owner, me_list in mei_owners.items():
            if len(me_list) > 1:
                is_compliant = False
                notes.append(
                    f"LEGAL CONFLICT: Individual '{owner}' is registered as owner in multiple MEIs ({', '.join(me_list)}). Brazilian law prohibits holding multiple MEI entities."
                )

        return is_compliant, notes

    def calculate_mei_status(
        self,
        entity_code: str,
        year: int,
        month: int,
        transactions: List[Transaction],
        entities: Dict[str, Entity],
    ) -> MEIComplianceStatus:
        """Computes YTD revenue against legal ceiling and verifies status."""
        ceiling = self.get_annual_ceiling(year)
        
        # Calculate YTD gross revenue (positive client inflows, excluding internal transfers)
        revenue_txs = [
            t.amount for t in transactions
            if t.entity_code == entity_code
            and t.amount > 0
            and not t.is_transfer
            and t.date.year == year
        ]
        gross_revenue_ytd = sum(revenue_txs) if revenue_txs else Decimal("0.00")
        
        utilization_pct = ((gross_revenue_ytd / ceiling) * Decimal("100")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        monthly_avg = (gross_revenue_ytd / Decimal(str(max(1, month)))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        is_anti_partner_compliant, anti_partner_notes = self.check_anti_partner_compliance(entities)

        notes = list(anti_partner_notes)

        if gross_revenue_ytd > ceiling:
            status = "EXCEEDED"
            notes.append(f"CRITICAL: YTD revenue exceeds annual ceiling of R$ {ceiling:,.2f}. Mandatory Simples Nacional transition required.")
        elif utilization_pct >= Decimal("100.0"):
            status = "CRITICAL_100"
            notes.append("WARNING: 100% of annual MEI revenue limit reached. Prepare accounting transition.")
        elif utilization_pct >= Decimal("80.0"):
            status = "CAUTION_80"
            notes.append("CAUTION: 80% of MEI revenue limit reached. Review pricing and Simples Nacional transition timeline.")
        else:
            status = "SAFE"

        return MEIComplianceStatus(
            entity_code=entity_code,
            tax_year=year,
            annual_ceiling=ceiling,
            gross_revenue_ytd=gross_revenue_ytd,
            utilization_percentage=utilization_pct,
            monthly_average_revenue=monthly_avg,
            is_anti_partner_compliant=is_anti_partner_compliant,
            status=status,
            notes=notes,
        )
