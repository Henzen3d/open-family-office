"""Automated Backup Manager for SQLite Database with VACUUM INTO and SHA-256 Checksums."""
from __future__ import annotations

import hashlib
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any

from src.database.db import DatabaseManager, get_db


class BackupManager:
    """Manages zero-lock atomic SQLite snapshots with checksums and retention policies."""

    def __init__(self, data_dir: Optional[Path] = None, backup_dir: Optional[Path] = None):
        self.data_dir = data_dir or Path(os.getenv("DATA_DIR", "data"))
        self.backup_dir = backup_dir or (self.data_dir / "backups")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.data_dir / "openfamilyoffice.db"

    def create_backup(self, label: Optional[str] = None) -> Dict[str, Any]:
        """Creates an atomic point-in-time snapshot using SQLite VACUUM INTO."""
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database file not found: {self.db_path}")

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        prefix = f"ofo_backup_{label}_{timestamp_str}" if label else f"ofo_backup_{timestamp_str}"
        target_path = self.backup_dir / f"{prefix}.db"

        # Execute VACUUM INTO through connection
        db = get_db(self.db_path)
        conn = db.get_connection()
        try:
            escaped_path = str(target_path).replace("'", "''")
            conn.execute(f"VACUUM INTO '{escaped_path}';")
        finally:
            conn.close()

        # Compute SHA-256 checksum of the backup
        h = hashlib.sha256()
        with open(target_path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        checksum = h.hexdigest()

        # Save checksum file alongside backup
        checksum_file = self.backup_dir / f"{prefix}.sha256"
        with open(checksum_file, "w", encoding="utf-8") as f:
            f.write(f"{checksum}  {target_path.name}\n")

        size_bytes = target_path.stat().st_size

        # Apply retention cleanup
        self._prune_old_backups(max_backups=30)

        return {
            "status": "CREATED",
            "backup_file": str(target_path),
            "filename": target_path.name,
            "checksum": checksum,
            "size_bytes": size_bytes,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def verify_backup(self, backup_path: Path) -> bool:
        """Verifies integrity of a backup file against its .sha256 companion."""
        if not backup_path.exists():
            return False

        checksum_file = backup_path.with_suffix(".sha256")
        if not checksum_file.exists():
            return False

        with open(checksum_file, "r", encoding="utf-8") as f:
            expected_checksum = f.read().split()[0].strip()

        h = hashlib.sha256()
        with open(backup_path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)

        return h.hexdigest() == expected_checksum

    def list_backups(self) -> List[Dict[str, Any]]:
        """Lists all available backup files sorted by creation date."""
        backups = []
        for p in sorted(self.backup_dir.glob("ofo_backup_*.db"), reverse=True):
            stat = p.stat()
            backups.append({
                "filename": p.name,
                "path": str(p),
                "size_bytes": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                "verified": self.verify_backup(p),
            })
        return backups

    def _prune_old_backups(self, max_backups: int = 30) -> int:
        """Prunes oldest backup files exceeding the max retention count."""
        backups = sorted(self.backup_dir.glob("ofo_backup_*.db"), key=lambda p: p.stat().st_mtime)
        pruned_count = 0
        if len(backups) > max_backups:
            to_remove = backups[:-max_backups]
            for p in to_remove:
                checksum_file = p.with_suffix(".sha256")
                p.unlink(missing_ok=True)
                checksum_file.unlink(missing_ok=True)
                pruned_count += 1
        return pruned_count


if __name__ == "__main__":
    mgr = BackupManager()
    backup_info = mgr.create_backup("test")
    print("Created backup:", backup_info)
    print("All backups:", len(mgr.list_backups()))
