const { getDb, saveDatabase } = require('../database');

// Get Manila date string YYYY-MM-DD
function getManilaDate(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

// Get Manila datetime string
function getManilaDateTime(date = new Date()) {
  return date.toLocaleString('en-CA', { 
    timeZone: 'Asia/Manila',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false 
  }).replace(',', '');
}

// Format date for display (Philippine format)
function formatDatePH(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00+08:00');
  return d.toLocaleDateString('en-PH', { 
    year: 'numeric', month: 'long', day: 'numeric', 
    timeZone: 'Asia/Manila' 
  });
}

// Round monetary values to 2 decimal places
function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// Calculate interest based on method
function calculateInterest(principal, rate, method, termDays = 30) {
  let interest = 0;
  switch (method) {
    case 'flat':
      interest = principal * (rate / 100);
      break;
    case 'monthly':
      const months = termDays / 30;
      interest = principal * (rate / 100) * months;
      break;
    case 'simple':
      const years = termDays / 365;
      interest = principal * (rate / 100) * years;
      break;
    default:
      interest = principal * (rate / 100);
  }
  return roundMoney(interest);
}

// Generate unique IDs
function generateLoanId() {
  const db = getDb();
  const result = db.exec("SELECT setting_value FROM business_settings WHERE setting_key = 'loan_id_prefix'");
  const prefix = result.length > 0 ? result[0].values[0][0] : 'LN';
  const countResult = db.exec("SELECT COUNT(*) + 1 FROM loans");
  const count = countResult[0].values[0][0];
  return `${prefix}-${String(count).padStart(4, '0')}`;
}

function generateBorrowerId() {
  const db = getDb();
  const countResult = db.exec("SELECT COUNT(*) + 1 FROM borrowers");
  const count = countResult[0].values[0][0];
  return `BRW-${String(count).padStart(4, '0')}`;
}

function generatePawnTicketNumber() {
  const db = getDb();
  const result = db.exec("SELECT setting_value FROM business_settings WHERE setting_key = 'pawn_ticket_prefix'");
  const prefix = result.length > 0 ? result[0].values[0][0] : 'PT';
  const countResult = db.exec("SELECT COUNT(*) + 1 FROM collateral_items");
  const count = countResult[0].values[0][0];
  return `${prefix}-${String(count).padStart(4, '0')}`;
}

function generatePaymentReference() {
  const db = getDb();
  const countResult = db.exec("SELECT COUNT(*) + 1 FROM payments");
  const count = countResult[0].values[0][0];
  return `PAY-${String(count).padStart(6, '0')}`;
}

function generateReceiptNumber() {
  const db = getDb();
  const result = db.exec("SELECT setting_value FROM business_settings WHERE setting_key = 'receipt_prefix'");
  const prefix = result.length > 0 ? result[0].values[0][0] : 'RCT';
  const countResult = db.exec("SELECT COUNT(*) + 1 FROM receipts");
  const count = countResult[0].values[0][0];
  return `${prefix}-${String(count).padStart(6, '0')}`;
}

function generateRedemptionRef() {
  const db = getDb();
  const countResult = db.exec("SELECT COUNT(*) + 1 FROM redemptions");
  const count = countResult[0].values[0][0];
  return `RDM-${String(count).padStart(4, '0')}`;
}

function generateExtensionRef() {
  const db = getDb();
  const countResult = db.exec("SELECT COUNT(*) + 1 FROM loan_extensions");
  const count = countResult[0].values[0][0];
  return `EXT-${String(count).padStart(4, '0')}`;
}

// Audit logging
function logAudit(userId, action, entityType, entityId, details, ipAddress) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run([userId, action, entityType, entityId, JSON.stringify(details), ipAddress]);
  stmt.free();
  saveDatabase();
}

// Helper to convert sql.js result to array of objects
function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  stmt.step();
  stmt.free();
  saveDatabase();
}

module.exports = {
  getManilaDate, getManilaDateTime, formatDatePH, roundMoney,
  calculateInterest, generateLoanId, generateBorrowerId,
  generatePawnTicketNumber, generatePaymentReference,
  generateReceiptNumber, generateRedemptionRef, generateExtensionRef,
  logAudit, queryAll, queryOne, runSql
};
