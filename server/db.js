const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

// ─── Use DATABASE_PATH env var for Railway volume persistence ──────────────────
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Existing tables (unchanged) ─────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK(role IN ('admin', 'user'))
  );

  CREATE TABLE IF NOT EXISTS inventory (
    item_id            INTEGER PRIMARY KEY,
    item_name          TEXT    NOT NULL,
    quantity           INTEGER NOT NULL DEFAULT 0,
    warehouse_location TEXT    NOT NULL,
    available_date     TEXT    NOT NULL,
    expiry_date        TEXT    NOT NULL,
    last_updated       TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS upload_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT    NOT NULL,
    uploaded_by TEXT    NOT NULL,
    uploaded_at TEXT    NOT NULL,
    status      TEXT    NOT NULL,
    reason      TEXT,
    rows_before INTEGER,
    rows_after  INTEGER
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id            INTEGER NOT NULL,
    item_name          TEXT    NOT NULL,
    quantity_purchased INTEGER NOT NULL,
    buyer_name         TEXT    NOT NULL,
    purchase_date      TEXT    NOT NULL,
    remaining_quantity INTEGER NOT NULL,
    FOREIGN KEY (item_id) REFERENCES inventory(item_id)
  );
`);

// ─── New: Companies table ────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                    TEXT    UNIQUE NOT NULL,
    display_name            TEXT    NOT NULL,
    store_tagline           TEXT,
    store_banner_url        TEXT,
    store_description       TEXT,
    currency                TEXT    DEFAULT 'CAD',
    tax_rate                REAL    DEFAULT 0.13,
    shipping_fee            REAL    DEFAULT 0,
    free_shipping_threshold REAL    DEFAULT 0,
    store_email             TEXT,
    store_phone             TEXT,
    store_address           TEXT,
    accept_orders           INTEGER DEFAULT 1,
    maintenance_mode        INTEGER DEFAULT 0,
    is_active               INTEGER DEFAULT 1,
    created_at              TEXT    DEFAULT (datetime('now'))
  );
`);

// ─── Safe ALTER TABLE additions (wrapped in try/catch) ────────────────────────

const safeAlter = (sql) => { try { db.exec(sql); } catch (_) {} };

// companies — missing columns
safeAlter(`ALTER TABLE companies ADD COLUMN primary_color TEXT DEFAULT '#0F766E'`);
safeAlter(`ALTER TABLE companies ADD COLUMN logo_url TEXT`);
safeAlter(`ALTER TABLE companies ADD COLUMN low_stock_threshold INTEGER DEFAULT 10`);
safeAlter(`ALTER TABLE companies ADD COLUMN require_purchase_approval INTEGER DEFAULT 0`);

// users — add company_id if missing
safeAlter(`ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id)`);

// inventory — add company_id for multi-tenant scoping
safeAlter(`ALTER TABLE inventory ADD COLUMN company_id INTEGER REFERENCES companies(id)`);

// upload_logs — remove old UNIQUE constraint on filename, add company_id
safeAlter(`ALTER TABLE upload_logs ADD COLUMN company_id INTEGER REFERENCES companies(id)`);

// orders — add discount_amount and discount_code_used if missing
safeAlter(`ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0`);
safeAlter(`ALTER TABLE orders ADD COLUMN discount_code_used TEXT`);

// ─── New: E-commerce tables ───────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id               INTEGER NOT NULL REFERENCES companies(id),
    full_name                TEXT    NOT NULL,
    email                    TEXT    NOT NULL,
    password_hash            TEXT    NOT NULL,
    phone                    TEXT,
    default_shipping_address TEXT,
    created_at               TEXT    DEFAULT (datetime('now')),
    is_active                INTEGER DEFAULT 1,
    UNIQUE(company_id, email)
  );

  CREATE TABLE IF NOT EXISTS products (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id        INTEGER NOT NULL REFERENCES companies(id),
    inventory_item_id INTEGER REFERENCES inventory(item_id),
    product_name      TEXT    NOT NULL,
    description       TEXT,
    price             REAL    NOT NULL DEFAULT 0,
    compare_at_price  REAL,
    category          TEXT,
    tags              TEXT,
    images            TEXT,
    is_published      INTEGER DEFAULT 1,
    is_featured       INTEGER DEFAULT 0,
    sku               TEXT,
    weight_kg         REAL,
    created_at        TEXT    DEFAULT (datetime('now')),
    updated_at        TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  INTEGER NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL DEFAULT 1,
    added_at    TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id      INTEGER NOT NULL,
    customer_id     INTEGER NOT NULL REFERENCES customers(id),
    order_number    TEXT    NOT NULL UNIQUE,
    status          TEXT    DEFAULT 'pending'
      CHECK(status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
    subtotal        REAL,
    tax_amount      REAL    DEFAULT 0,
    shipping_amount REAL    DEFAULT 0,
    total_amount    REAL,
    shipping_address TEXT,
    billing_address  TEXT,
    payment_method   TEXT    DEFAULT 'card',
    payment_status   TEXT    DEFAULT 'unpaid'
      CHECK(payment_status IN ('unpaid','paid','refunded','failed')),
    notes           TEXT,
    placed_at       TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES orders(id),
    product_id   INTEGER NOT NULL,
    product_name TEXT    NOT NULL,
    quantity     INTEGER NOT NULL,
    unit_price   REAL    NOT NULL,
    subtotal     REAL    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  INTEGER NOT NULL,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    rating      INTEGER CHECK(rating BETWEEN 1 AND 5),
    review_text TEXT,
    is_approved INTEGER DEFAULT 1,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wishlist_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    added_at    TEXT    DEFAULT (datetime('now')),
    UNIQUE(customer_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS discount_codes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id       INTEGER NOT NULL,
    code             TEXT    NOT NULL,
    discount_type    TEXT    CHECK(discount_type IN ('percentage','fixed')),
    discount_value   REAL    NOT NULL,
    min_order_amount REAL    DEFAULT 0,
    max_uses         INTEGER,
    uses_count       INTEGER DEFAULT 0,
    expires_at       TEXT,
    is_active        INTEGER DEFAULT 1,
    created_at       TEXT    DEFAULT (datetime('now')),
    UNIQUE(company_id, code)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id   INTEGER,
    action       TEXT    NOT NULL,
    item_id      INTEGER,
    item_name    TEXT,
    change_amount INTEGER,
    old_quantity INTEGER,
    new_quantity INTEGER,
    performed_by TEXT,
    timestamp    TEXT    DEFAULT (datetime('now')),
    notes        TEXT
  );

  CREATE TABLE IF NOT EXISTS inventory_snapshots (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id     INTEGER,
    snapshot_date  TEXT,
    total_items    INTEGER,
    total_quantity INTEGER,
    created_at     TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Seed demo company ────────────────────────────────────────────────────────

let demoCompany = db.prepare("SELECT * FROM companies WHERE slug = 'edepot-demo'").get();
if (!demoCompany) {
  const res = db.prepare(`
    INSERT INTO companies (slug, display_name, store_tagline, store_description,
      currency, tax_rate, store_email, store_phone, store_address, primary_color)
    VALUES ('edepot-demo', 'E-Depot Demo Store',
      'Your trusted warehouse partner',
      'Welcome to E-Depot — industrial supplies, warehousing goods, and more. Fast shipping, competitive prices.',
      'CAD', 0.13, 'demo@edepot.com', '1-800-EDEPOT', '100 Warehouse Blvd, Toronto, ON M5V 1A1',
      '#0F766E')
  `).run();
  demoCompany = db.prepare('SELECT * FROM companies WHERE id = ?').get(res.lastInsertRowid);
  console.log('Seeded demo company: E-Depot Demo Store');
}

// ─── Seed default store admin users ──────────────────────────────────────────

const seedUser = (username, password, role) => {
  const exists = db.prepare('SELECT id, company_id FROM users WHERE username = ?').get(username);
  if (!exists) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, role, company_id) VALUES (?, ?, ?, ?)')
      .run(username, hash, role, demoCompany.id);
    console.log(`Seeded ${role} user: ${username}`);
  } else if (!exists.company_id) {
    db.prepare('UPDATE users SET company_id = ? WHERE username = ?').run(demoCompany.id, username);
  }
};

seedUser('admin', 'admin123', 'admin');
seedUser('user',  'user123',  'user');

// Ensure all existing users without company_id get one
db.prepare('UPDATE users SET company_id = ? WHERE company_id IS NULL').run(demoCompany.id);

// ─── Seed demo customer ───────────────────────────────────────────────────────

const demoCustomerExists = db.prepare(
  "SELECT id FROM customers WHERE email = 'jane@example.com' AND company_id = ?"
).get(demoCompany.id);
if (!demoCustomerExists) {
  const hash = bcrypt.hashSync('customer123', 10);
  db.prepare(`
    INSERT INTO customers (company_id, full_name, email, password_hash, phone)
    VALUES (?, 'Jane Smith', 'jane@example.com', ?, '416-555-0100')
  `).run(demoCompany.id, hash);
  console.log('Seeded demo customer: Jane Smith (jane@example.com / customer123)');
}

// ─── Assign company_id to existing inventory items without one ─────────────────

db.prepare('UPDATE inventory SET company_id = ? WHERE company_id IS NULL').run(demoCompany.id);

// ─── Auto-create products from existing inventory items ───────────────────────

const SAMPLE_PRICES = [9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99, 79.99, 99.99];
const SAMPLE_CATEGORIES = ['General', 'Hardware', 'Supplies', 'Equipment', 'Consumables'];
const inventoryItems = db.prepare('SELECT * FROM inventory').all();
inventoryItems.forEach((item, idx) => {
  const exists = db.prepare(
    'SELECT id FROM products WHERE company_id = ? AND inventory_item_id = ?'
  ).get(demoCompany.id, item.item_id);
  if (!exists) {
    db.prepare(`
      INSERT INTO products (company_id, inventory_item_id, product_name, price, is_published, category, is_featured)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(
      demoCompany.id,
      item.item_id,
      item.item_name,
      SAMPLE_PRICES[idx % SAMPLE_PRICES.length],
      SAMPLE_CATEGORIES[idx % SAMPLE_CATEGORIES.length],
      idx < 4 ? 1 : 0
    );
  }
});

// ─── Seed discount codes ──────────────────────────────────────────────────────

const d1 = db.prepare("SELECT id FROM discount_codes WHERE company_id = ? AND code = 'WELCOME10'").get(demoCompany.id);
if (!d1) {
  db.prepare(`
    INSERT INTO discount_codes (company_id, code, discount_type, discount_value, min_order_amount, is_active)
    VALUES (?, 'WELCOME10', 'percentage', 10, 0, 1)
  `).run(demoCompany.id);
}

const d2 = db.prepare("SELECT id FROM discount_codes WHERE company_id = ? AND code = 'SAVE20'").get(demoCompany.id);
if (!d2) {
  db.prepare(`
    INSERT INTO discount_codes (company_id, code, discount_type, discount_value, min_order_amount, is_active)
    VALUES (?, 'SAVE20', 'fixed', 20, 100, 1)
  `).run(demoCompany.id);
}

module.exports = db;
