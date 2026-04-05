const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file lives next to this module
const db = new Database(path.join(__dirname, 'database.db'));

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ─────────────────────────────────────────────────────────────────

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
    filename    TEXT    UNIQUE NOT NULL,
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

// ─── Seed default users ──────────────────────────────────────────────────────

const seedUser = (username, password, role) => {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!exists) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
    console.log(`Seeded ${role} user: ${username}`);
  }
};

seedUser('admin', 'admin123', 'admin');
seedUser('user',  'user123',  'user');

module.exports = db;
