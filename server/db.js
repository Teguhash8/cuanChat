const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'cuanchat.db');

let db = null;

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      color TEXT DEFAULT '#10b981',
      type TEXT DEFAULT 'expense' CHECK(type IN ('expense', 'income')),
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '💳',
      color TEXT DEFAULT '#3b82f6',
      balance REAL DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT DEFAULT 'expense' CHECK(type IN ('expense', 'income')),
      category_id INTEGER,
      wallet_id INTEGER,
      user_id INTEGER,
      date TEXT DEFAULT (date('now', 'localtime')),
      notes TEXT,
      source TEXT DEFAULT 'web',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (wallet_id) REFERENCES wallets(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category_id, month),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Add user_id columns if they don't exist (migration for existing DBs)
  try { db.run('ALTER TABLE categories ADD COLUMN user_id INTEGER'); } catch (e) { }
  try { db.run('ALTER TABLE wallets ADD COLUMN user_id INTEGER'); } catch (e) { }
  try { db.run('ALTER TABLE transactions ADD COLUMN user_id INTEGER'); } catch (e) { }
  try { db.run('ALTER TABLE budgets ADD COLUMN user_id INTEGER'); } catch (e) { }

  saveDb();
  console.log('✅ Database initialized');
  return db;
}

// Seed default data for a new user
function seedDefaultData(userId) {
  const defaultCategories = [
    ['Makanan & Minuman', '🍔', '#ef4444', 'expense'],
    ['Transportasi', '🚕', '#f59e0b', 'expense'],
    ['Belanja', '🛒', '#8b5cf6', 'expense'],
    ['Hiburan', '🎮', '#ec4899', 'expense'],
    ['Tagihan', '📄', '#06b6d4', 'expense'],
    ['Kesehatan', '💊', '#14b8a6', 'expense'],
    ['Pendidikan', '📚', '#6366f1', 'expense'],
    ['Lainnya', '📦', '#64748b', 'expense'],
    ['Gaji', '💰', '#10b981', 'income'],
    ['Freelance', '💻', '#22c55e', 'income'],
    ['Investasi', '📈', '#84cc16', 'income'],
  ];
  for (const cat of defaultCategories) {
    db.run('INSERT INTO categories (name, icon, color, type, user_id) VALUES (?, ?, ?, ?, ?)', [...cat, userId]);
  }

  const defaultWallets = [
    ['Tunai', '💵', '#22c55e', 500000, 1],
    ['BCA', '🏦', '#0066AE', 2500000, 0],
    ['OVO', '🟣', '#4C2A86', 350000, 0],
    ['GoPay', '🟢', '#00AED6', 200000, 0],
    ['ShopeePay', '🟠', '#EE4D2D', 150000, 0],
  ];
  for (const w of defaultWallets) {
    db.run('INSERT INTO wallets (name, icon, color, balance, is_default, user_id) VALUES (?, ?, ?, ?, ?, ?)', [...w, userId]);
  }

  saveDb();
}

// Helper: query all rows
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: query single row
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

// Helper: run statement (INSERT/UPDATE/DELETE)
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] };
}

function runNoSave(sql, params = []) {
  db.run(sql, params);
}

function save() {
  saveDb();
}

function getDb() {
  return db;
}

module.exports = { initDb, seedDefaultData, queryAll, queryOne, run, runNoSave, save, getDb };
