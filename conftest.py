"""Global test configuration and fixtures for OpenFamilyOffice."""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path
import pytest

ROOT_DIR = Path(__file__).resolve().parent
REAL_DATA_DIR = ROOT_DIR / "data"


@pytest.fixture(autouse=True)
def isolate_data_dir(tmp_path, monkeypatch):
    """Autouse fixture ensuring pytest runs in an isolated tmp_path sandbox and never touches real data/."""
    test_data_dir = tmp_path / "data"
    if REAL_DATA_DIR.exists():
        shutil.copytree(REAL_DATA_DIR, test_data_dir)
    else:
        test_data_dir.mkdir(parents=True, exist_ok=True)

    # Reset receipts database in sandbox so tests start with clean state
    receipts_db = test_data_dir / "receipts" / "receipts_db.json"
    if receipts_db.exists():
        receipts_db.write_text("[]", encoding="utf-8")

    # Point environment variable to temporary sandbox
    monkeypatch.setenv("DATA_DIR", str(test_data_dir))
    monkeypatch.setenv("DATABASE_PATH", str(test_data_dir / "openfamilyoffice.db"))

    # Also patch modules that bound DATA_DIR at import time
    for mod_name in [
        "src.web.deps",
        "src.web.api",
        "src.intelligence.assistant_tools",
    ]:
        if mod_name in sys.modules:
            mod = sys.modules[mod_name]
            monkeypatch.setattr(mod, "DATA_DIR", test_data_dir, raising=False)

    if "src.database.db" in sys.modules:
        monkeypatch.setattr(
            sys.modules["src.database.db"],
            "DEFAULT_DB_PATH",
            test_data_dir / "openfamilyoffice.db",
            raising=False,
        )

    yield test_data_dir
