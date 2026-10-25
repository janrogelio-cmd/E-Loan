const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'eloan.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let db = null;
let saveInterval = null;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Run migrations
  runMigrations();
  
  // Auto-save every 5 seconds
  saveInterval = setInterval(() => {
    saveDatabase();
  }, 5000);
  
  // Save on process exit
  process.on('exit', () => saveDatabase());
  process.on('SIGINT', () => { saveDatabase(); process.exit(0); });
  process.on('SIGTERM', () => { saveDatabase(); process.exit(0); });
  
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function runMigrations() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS borrowers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrower_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      address TEXT NOT NULL,
      email TEXT,
      id_type TEXT,
      id_number TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'archived')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id TEXT UNIQUE NOT NULL,
      borrower_id INTEGER NOT NULL,
      principal_amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      interest_method TEXT NOT NULL DEFAULT 'flat' CHECK(interest_method IN ('flat', 'monthly', 'simple')),
      interest_amount REAL NOT NULL DEFAULT 0,
      fees REAL NOT NULL DEFAULT 0,
      fee_description TEXT,
      total_amount_due REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      outstanding_balance REAL NOT NULL,
      loan_term_days INTEGER NOT NULL DEFAULT 30,
      release_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      current_due_date TEXT,
      payment_schedule TEXT DEFAULT 'lump_sum',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'partially_paid', 'paid', 'overdue', 'redeemed', 'cancelled')),
      assigned_staff INTEGER,
      remarks TEXT,
      approved_by INTEGER,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (borrower_id) REFERENCES borrowers(id),
      FOREIGN KEY (assigned_staff) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS collateral_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pawn_ticket_number TEXT UNIQUE NOT NULL,
      loan_id INTEGER NOT NULL,
      borrower_id INTEGER NOT NULL,
      item_category TEXT NOT NULL DEFAULT 'jewelry',
      jewelry_type TEXT,
      metal_type TEXT,
      karat TEXT,
      weight_grams REAL,
      description TEXT NOT NULL,
      identifying_marks TEXT,
      appraised_value REAL NOT NULL,
      loan_amount_secured REAL NOT NULL,
      condition_at_intake TEXT,
      date_received TEXT NOT NULL,
      storage_location TEXT,
      photo_paths TEXT,
      accepted_by INTEGER,
      status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received', 'held', 'eligible_for_redemption', 'returned', 'under_review', 'disputed')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (borrower_id) REFERENCES borrowers(id),
      FOREIGN KEY (accepted_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_reference TEXT UNIQUE NOT NULL,
      loan_id INTEGER NOT NULL,
      borrower_id INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      principal_applied REAL NOT NULL DEFAULT 0,
      interest_applied REAL NOT NULL DEFAULT 0,
      fees_applied REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      remaining_balance REAL NOT NULL,
      cashier_id INTEGER,
      remarks TEXT,
      is_reversed INTEGER DEFAULT 0,
      reversed_by INTEGER,
      reversal_reason TEXT,
      reversed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (borrower_id) REFERENCES borrowers(id),
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      payment_id INTEGER NOT NULL,
      loan_id INTEGER NOT NULL,
      borrower_id INTEGER NOT NULL,
      business_name TEXT,
      transaction_date TEXT NOT NULL,
      borrower_name TEXT NOT NULL,
      loan_ref TEXT NOT NULL,
      pawn_ticket_number TEXT,
      original_principal REAL NOT NULL,
      interest_and_fees REAL NOT NULL,
      amount_paid REAL NOT NULL,
      total_paid_to_date REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      payment_method TEXT,
      cashier_name TEXT,
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (payment_id) REFERENCES payments(id),
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (borrower_id) REFERENCES borrowers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      redemption_ref TEXT UNIQUE NOT NULL,
      loan_id INTEGER NOT NULL,
      borrower_id INTEGER NOT NULL,
      collateral_id INTEGER NOT NULL,
      pawn_ticket_number TEXT NOT NULL,
      redemption_date TEXT NOT NULL,
      verified_by INTEGER NOT NULL,
      released_by INTEGER NOT NULL,
      borrower_acknowledged INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (borrower_id) REFERENCES borrowers(id),
      FOREIGN KEY (collateral_id) REFERENCES collateral_items(id),
      FOREIGN KEY (verified_by) REFERENCES users(id),
      FOREIGN KEY (released_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('due_tomorrow', 'due_today', 'overdue', 'payment_received', 'fully_paid', 'awaiting_redemption', 'general')),
      loan_id INTEGER,
      borrower_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      scheduled_date TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (borrower_id) REFERENCES borrowers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loan_extensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      extension_ref TEXT UNIQUE NOT NULL,
      loan_id INTEGER NOT NULL,
      original_due_date TEXT NOT NULL,
      new_due_date TEXT NOT NULL,
      reason TEXT,
      charges REAL DEFAULT 0,
      approved_by INTEGER NOT NULL,
      customer_agreed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES loans(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_loans_current_due ON loans(current_due_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_collateral_loan ON collateral_items(loan_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)');
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id)');

  // Insert default business settings
  const existingSettings = db.exec("SELECT COUNT(*) as cnt FROM business_settings");
  if (existingSettings[0] && existingSettings[0].values[0][0] === 0) {
    const settings = [
      ['business_name', 'E-Loan Pawnshop'],
      ['business_address', 'Metro Manila, Philippines'],
      ['business_contact', '+63 912 345 6789'],
      ['business_email', 'info@eloanpawnshop.ph'],
      ['currency', 'PHP'],
      ['timezone', 'Asia/Manila'],
      ['default_interest_rate', '10'],
      ['default_interest_method', 'flat'],
      ['default_loan_term_days', '30'],
      ['reminder_lead_days', '1'],
      ['receipt_prefix', 'RCT'],
      ['pawn_ticket_prefix', 'PT'],
      ['loan_id_prefix', 'LN']
    ];
    const insertSetting = db.prepare('INSERT OR IGNORE INTO business_settings (setting_key, setting_value) VALUES (?, ?)');
    settings.forEach(([key, val]) => insertSetting.run([key, val]));
    insertSetting.free();
  }

  saveDatabase();
}

module.exports = { initDatabase, getDb, saveDatabase };
