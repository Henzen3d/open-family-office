"""Categories data model."""
from dataclasses import dataclass
from typing import Optional

from src.models.enums import CategoryScope


@dataclass
class Category:
    """Represents a category in the chart of accounts."""
    category_code: str
    name: str
    scope: CategoryScope
    parent_category: Optional[str] = None
    is_essential: bool = False
    description: str = ""

