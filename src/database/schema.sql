-- OpenFamilyOffice SQLite Relational Schema
-- Enables full ACID compliance, indexed queries and referential integrity.

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bank_name TEXT,
    entity_code TEXT NOT NULL,
    holder TEXT,
    purpose TEXT,
    currency TEXT NOT NULL DEFAULT 'BRL',
    bank_code TEXT,
    balance_cents INTEGER NOT NULL DEFAULT 0,
    account_type TEXT NOT NULL DEFAULT 'CHECKING',
    color TEXT NOT NULL DEFAULT 'indigo',
    active INTEGER NOT NULL DEFAULT 1,
    last_adjusted_at TEXT,
    notes TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    entity_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    date TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    raw_description TEXT,
    clean_description TEXT,
    category_code TEXT,
    counterparty TEXT,
    is_transfer INTEGER NOT NULL DEFAULT 0,
    transfer_pair_id TEXT,
    reconciliation_status TEXT NOT NULL DEFAULT 'UNRECONCILED',
    notes TEXT,
    receipt_id TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    entity_code TEXT NOT NULL,
    image_storage_path TEXT,
    merchant_name TEXT,
    merchant_tax_id TEXT,
    issue_date TEXT,
    total_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT,
    card_last_digits TEXT,
    fiscal_access_key TEXT,
    matched_transaction_id TEXT,
    confidence_score REAL NOT NULL DEFAULT 1.0,
    source_channel TEXT,
    parser_engine TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id TEXT NOT NULL,
    item_index INTEGER,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,
    unit_measure TEXT,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    total_price_cents INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS migrations_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL,
    records_migrated INTEGER NOT NULL DEFAULT 0,
    checksum TEXT NOT NULL
);

-- Optimized query indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_name);
CREATE INDEX IF NOT EXISTS idx_transactions_entity ON transactions(entity_code);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_code);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(issue_date);
CREATE INDEX IF NOT EXISTS idx_receipts_merchant ON receipts(merchant_name);
CREATE INDEX IF NOT EXISTS idx_receipts_matched_tx ON receipts(matched_transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);

