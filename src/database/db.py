"""SQLite Database Manager with WAL mode, foreign keys, and ACID transactions."""
from __future__ import annotations

import contextlib
import os
from pathlib import Path
import sqlite3
from typing import Any, Dict, Generator, List, Optional, Tuple, Union


DEFAULT_DB_PATH = Path(os.getenv("DATABASE_PATH", os.getenv("DATA_DIR", "data"))) / "openfamilyoffice.db"


class DatabaseManager:
    """Thread-safe SQLite connection and transaction manager."""

    def __init__(self, db_path: Optional[Union[str, Path]] = None):
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()

    def get_connection(self) -> sqlite3.Connection:
        """Returns a configured SQLite connection with WAL mode and row factory."""
        conn = sqlite3.connect(
            str(self.db_path),
            timeout=30.0,
            check_same_thread=False,
            isolation_level=None,  # Autocommit mode by default; manual transactions with BEGIN/COMMIT
        )
        conn.row_factory = sqlite3.Row
        # Enable PRAGMAs for concurrency and data integrity
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA busy_timeout = 30000;")
        return conn

    def _init_database(self) -> None:
        """Initializes tables and indexes from schema.sql if not existing."""
        schema_path = Path(__file__).parent / "schema.sql"
        if not schema_path.exists():
            return

        conn = self.get_connection()
        try:
            with open(schema_path, "r", encoding="utf-8") as f:
                schema_sql = f.read()
            conn.executescript(schema_sql)
        finally:
            conn.close()

    @contextlib.contextmanager
    def transaction(self) -> Generator[sqlite3.Connection, None, None]:
        """Context manager providing atomic ACID transactions.
        
        Commits upon clean exit, rolls back on any exception.
        """
        conn = self.get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            yield conn
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
        finally:
            conn.close()

    def execute(self, sql: str, params: Union[Tuple[Any, ...], Dict[str, Any]] = ()) -> int:
        """Executes a single SQL statement in an immediate transaction, returning rows affected."""
        with self.transaction() as conn:
            cursor = conn.execute(sql, params)
            return cursor.rowcount

    def executemany(self, sql: str, seq_of_params: List[Union[Tuple[Any, ...], Dict[str, Any]]]) -> int:
        """Executes a parameterized statement against multiple parameter tuples in a single transaction."""
        with self.transaction() as conn:
            cursor = conn.executemany(sql, seq_of_params)
            return cursor.rowcount

    def fetchone(self, sql: str, params: Union[Tuple[Any, ...], Dict[str, Any]] = ()) -> Optional[Dict[str, Any]]:
        """Executes a query and returns the first row as a dictionary, or None."""
        conn = self.get_connection()
        try:
            cursor = conn.execute(sql, params)
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def fetchall(self, sql: str, params: Union[Tuple[Any, ...], Dict[str, Any]] = ()) -> List[Dict[str, Any]]:
        """Executes a query and returns all rows as a list of dictionaries."""
        conn = self.get_connection()
        try:
            cursor = conn.execute(sql, params)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()


_global_db: Optional[DatabaseManager] = None


def get_db(db_path: Optional[Union[str, Path]] = None) -> DatabaseManager:
    """Singleton getter for the DatabaseManager instance."""
    global _global_db
    if _global_db is None or db_path is not None:
        _global_db = DatabaseManager(db_path)
    return _global_db
