/**
 * SQLite persistence layer.
 *
 * Uses Node's built-in `node:sqlite` (Node >= 22.5) so the project has zero
 * native build steps. Money is ALWAYS stored as an INTEGER number of cents.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import config from './config.mjs';

let db = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'tea',   -- tea | teaware | gift | collection
  tagline      TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  hero_image   TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 100,
  is_active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT NOT NULL UNIQUE,
  sku               TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  subtitle          TEXT NOT NULL DEFAULT '',
  category_id       INTEGER NOT NULL REFERENCES categories(id),
  tea_family        TEXT NOT NULL DEFAULT '',   -- Green / White / Oolong / Black / Pu-erh ...
  origin            TEXT NOT NULL DEFAULT '',   -- e.g. "Fuding, Fujian"
  altitude          TEXT NOT NULL DEFAULT '',
  cultivar          TEXT NOT NULL DEFAULT '',
  harvest           TEXT NOT NULL DEFAULT '',
  oxidation         TEXT NOT NULL DEFAULT '',
  roast             TEXT NOT NULL DEFAULT '',
  caffeine          TEXT NOT NULL DEFAULT '',
  liquor            TEXT NOT NULL DEFAULT '',   -- colour of the brewed liquor
  seal              TEXT NOT NULL DEFAULT '',   -- short English chop label, e.g. "Dragon"
  short_description TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  tasting_notes     TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  brewing           TEXT NOT NULL DEFAULT '{}', -- JSON object
  images            TEXT NOT NULL DEFAULT '[]', -- JSON array of image paths
  hero_image        TEXT NOT NULL DEFAULT '',
  badges            TEXT NOT NULL DEFAULT '[]',
  rating            REAL NOT NULL DEFAULT 0,
  review_count      INTEGER NOT NULL DEFAULT 0,
  is_featured       INTEGER NOT NULL DEFAULT 0,
  is_new            INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 100,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS variants (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,               -- "50 g tin"
  weight_grams   INTEGER NOT NULL DEFAULT 0,
  price_cents    INTEGER NOT NULL,            -- default price
  compare_cents  INTEGER,                     -- optional strike-through price
  stock          INTEGER NOT NULL DEFAULT 0,
  sku_suffix     TEXT NOT NULL DEFAULT '',
  is_default     INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS orders (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number             TEXT NOT NULL UNIQUE,       -- CY-20260214-0001
  status                   TEXT NOT NULL DEFAULT 'pending',
      -- pending | awaiting_payment | paid | processing | shipped | delivered | cancelled | refunded
  payment_status           TEXT NOT NULL DEFAULT 'unpaid',
      -- unpaid | init | authorized | challenge | success | failed | cancelled | refunded | partial_refunded
  payment_method           TEXT NOT NULL DEFAULT 'ottpay_local_card',
  currency                 TEXT NOT NULL DEFAULT 'CAD',
  subtotal_cents           INTEGER NOT NULL DEFAULT 0,
  shipping_cents           INTEGER NOT NULL DEFAULT 0,
  tax_cents                INTEGER NOT NULL DEFAULT 0,
  discount_cents           INTEGER NOT NULL DEFAULT 0,
  total_cents              INTEGER NOT NULL DEFAULT 0,
  refunded_cents           INTEGER NOT NULL DEFAULT 0,
  customer_email           TEXT NOT NULL DEFAULT '',
  customer_name            TEXT NOT NULL DEFAULT '',
  customer_phone           TEXT NOT NULL DEFAULT '',
  shipping_name            TEXT NOT NULL DEFAULT '',
  shipping_line1           TEXT NOT NULL DEFAULT '',
  shipping_line2           TEXT NOT NULL DEFAULT '',
  shipping_city            TEXT NOT NULL DEFAULT '',
  shipping_province        TEXT NOT NULL DEFAULT '',
  shipping_postal_code     TEXT NOT NULL DEFAULT '',
  shipping_country         TEXT NOT NULL DEFAULT 'CA',
  shipping_method          TEXT NOT NULL DEFAULT 'standard',
  customer_note            TEXT NOT NULL DEFAULT '',
  admin_note               TEXT NOT NULL DEFAULT '',
  ott_reference            TEXT NOT NULL DEFAULT '',   -- our reference sent to OTT Pay
  ott_payment_id           TEXT NOT NULL DEFAULT '',   -- OTT Pay payment id
  ott_bizpay_order_id      TEXT NOT NULL DEFAULT '',   -- channel order number
  ott_cc_type              TEXT NOT NULL DEFAULT '',   -- VISA / MASTERCARD / ...
  ott_card_last4           TEXT NOT NULL DEFAULT '',   -- never the full PAN
  ott_payment_status       TEXT NOT NULL DEFAULT '',   -- raw paymentStatus from OTT Pay
  paid_at                  TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     INTEGER,
  variant_id     INTEGER,
  product_name   TEXT NOT NULL,
  variant_label  TEXT NOT NULL DEFAULT '',
  sku            TEXT NOT NULL DEFAULT '',
  unit_price_cents INTEGER NOT NULL,
  quantity       INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  image          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id             INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reference            TEXT NOT NULL,          -- unique reference sent to OTT Pay
  amount_cents         INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'created',
  ott_payment_id       TEXT NOT NULL DEFAULT '',
  ott_payment_status   TEXT NOT NULL DEFAULT '',
  cc_type              TEXT NOT NULL DEFAULT '',
  card_last4           TEXT NOT NULL DEFAULT '',
  kount_session_id     TEXT NOT NULL DEFAULT '',
  request_payload      TEXT NOT NULL DEFAULT '',  -- sanitised: card fields removed
  response_payload     TEXT NOT NULL DEFAULT '',
  error_code           TEXT NOT NULL DEFAULT '',
  error_message        TEXT NOT NULL DEFAULT '',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_order ON payment_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_attempts_reference ON payment_attempts(reference);

CREATE TABLE IF NOT EXISTS webhook_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  provider       TEXT NOT NULL DEFAULT 'ottpay',
  event_key      TEXT NOT NULL,                -- md5+order_id, dedupe key
  order_id       TEXT NOT NULL DEFAULT '',
  rsp_code       TEXT NOT NULL DEFAULT '',
  rsp_msg        TEXT NOT NULL DEFAULT '',
  raw_body       TEXT NOT NULL DEFAULT '',
  decrypted      TEXT NOT NULL DEFAULT '',
  processed      INTEGER NOT NULL DEFAULT 0,
  error          TEXT NOT NULL DEFAULT '',
  received_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_event_key ON webhook_events(event_key);

CREATE TABLE IF NOT EXISTS refunds (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  refund_id         TEXT NOT NULL DEFAULT '',   -- OTT Pay refundId
  ori_payment_id    TEXT NOT NULL DEFAULT '',
  amount_cents      INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'init',  -- init | processing | success | failure
  reason            TEXT NOT NULL DEFAULT '',
  response_payload  TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
`;

/**
 * Columns added after the first release. `CREATE TABLE IF NOT EXISTS` cannot add
 * a column to an existing table, so each is checked and added on open — without
 * this, an upgraded checkout would fail on a database created by the previous
 * version with "no such column".
 */
const ADDED_COLUMNS = [
  { table: 'products', column: 'seal', definition: "TEXT NOT NULL DEFAULT ''" },
];

function migrate(database) {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const exists = database
      .prepare(`SELECT COUNT(*) AS n FROM pragma_table_info(?) WHERE name = ?`)
      .get(table, column);
    if (exists?.n) continue;
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  migration: added ${table}.${column}`);
  }
}

/** Open (and lazily create/migrate) the database. */
export function getDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });
  db = new DatabaseSync(config.databaseFile);
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

export function closeDb() {
  if (db) {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    db = null;
  }
}

/* ------------------------------------------------------------------ helpers */

export const all = (sql, ...params) => getDb().prepare(sql).all(...params);
export const get = (sql, ...params) => getDb().prepare(sql).get(...params) ?? null;
export const run = (sql, ...params) => getDb().prepare(sql).run(...params);

/** Run a function inside an IMMEDIATE transaction. */
export function transaction(fn) {
  const database = getDb();
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(database);
    database.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      database.exec('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  }
}

export function getSetting(key, fallback = null) {
  const row = get('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    String(value),
  );
}

/** True when the catalogue has already been seeded. */
export function hasCatalogue() {
  const row = get('SELECT COUNT(*) AS n FROM products');
  return (row?.n ?? 0) > 0;
}
