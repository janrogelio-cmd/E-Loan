const express = require('express');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { queryAll, queryOne, runSql, getManilaDate, roundMoney } = require('../utils/helpers');

const router = express.Router();

// Dashboard statistics
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const today = getManilaDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    const activeLoans = queryOne("SELECT COUNT(*) as count FROM loans WHERE status IN ('active', 'partially_paid', 'overdue')");
    const totalPrincipal = queryOne("SELECT COALESCE(SUM(principal_amount), 0) as total FROM loans WHERE status NOT IN ('draft', 'cancelled')");
    const totalOutstanding = queryOne("SELECT COALESCE(SUM(outstanding_balance), 0) as total FROM loans WHERE status IN ('active', 'partially_paid', 'overdue')");
    const totalPayments = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE is_reversed = 0");
    const totalInterestEarned = queryOne("SELECT COALESCE(SUM(interest_applied), 0) as total FROM payments WHERE is_reversed = 0");
    
    const dueToday = queryOne(`SELECT COUNT(*) as count FROM loans WHERE (current_due_date = ? OR (current_due_date IS NULL AND due_date = ?)) AND status IN ('active', 'partially_paid')`, [today, today]);
    const dueTomorrow = queryOne(`SELECT COUNT(*) as count FROM loans WHERE (current_due_date = ? OR (current_due_date IS NULL AND due_date = ?)) AND status IN ('active', 'partially_paid')`, [tomorrowStr, tomorrowStr]);
    const overdueLoans = queryOne(`SELECT COUNT(*) as count FROM loans WHERE (current_due_date < ? OR (current_due_date IS NULL AND due_date < ?)) AND status IN ('active', 'partially_paid', 'overdue')`, [today, today]);
    const pawnedItems = queryOne("SELECT COUNT(*) as count FROM collateral_items WHERE status IN ('held', 'received')");
    const awaitingRedemption = queryOne("SELECT COUNT(*) as count FROM collateral_items WHERE status = 'eligible_for_redemption'");

    res.json({
      activeLoans: activeLoans?.count || 0,
      totalPrincipal: roundMoney(totalPrincipal?.total || 0),
      totalOutstanding: roundMoney(totalOutstanding?.total || 0),
      totalPayments: roundMoney(totalPayments?.total || 0),
      totalInterestEarned: roundMoney(totalInterestEarned?.total || 0),
      dueToday: dueToday?.count || 0,
      dueTomorrow: dueTomorrow?.count || 0,
      overdueLoans: overdueLoans?.count || 0,
      pawnedItems: pawnedItems?.count || 0,
      awaitingRedemption: awaitingRedemption?.count || 0
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent transactions
router.get('/recent-transactions', authMiddleware, (req, res) => {
  try {
    const transactions = queryAll(
      `SELECT p.*, b.full_name as borrower_name, l.loan_id as loan_ref, u.full_name as cashier_name
       FROM payments p
       JOIN borrowers b ON p.borrower_id = b.id
       JOIN loans l ON p.loan_id = l.id
       LEFT JOIN users u ON p.cashier_id = u.id
       WHERE p.is_reversed = 0
       ORDER BY p.created_at DESC
       LIMIT 10`
    );
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Priority alerts
router.get('/alerts', authMiddleware, (req, res) => {
  try {
    const today = getManilaDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    // Overdue loans
    const overdue = queryAll(
      `SELECT l.*, b.full_name as borrower_name, b.contact_number,
              CAST(julianday(?) - julianday(COALESCE(l.current_due_date, l.due_date)) AS INTEGER) as days_overdue
       FROM loans l JOIN borrowers b ON l.borrower_id = b.id
       WHERE (l.current_due_date < ? OR (l.current_due_date IS NULL AND l.due_date < ?))
       AND l.status IN ('active', 'partially_paid', 'overdue')
       ORDER BY l.due_date ASC LIMIT 10`,
      [today, today, today]
    );

    // Due today
    const dueTodayLoans = queryAll(
      `SELECT l.*, b.full_name as borrower_name, b.contact_number
       FROM loans l JOIN borrowers b ON l.borrower_id = b.id
       WHERE (l.current_due_date = ? OR (l.current_due_date IS NULL AND l.due_date = ?))
       AND l.status IN ('active', 'partially_paid')
       ORDER BY l.outstanding_balance DESC LIMIT 10`,
      [today, today]
    );

    // Due tomorrow
    const dueTomorrowLoans = queryAll(
      `SELECT l.*, b.full_name as borrower_name, b.contact_number
       FROM loans l JOIN borrowers b ON l.borrower_id = b.id
       WHERE (l.current_due_date = ? OR (l.current_due_date IS NULL AND l.due_date = ?))
       AND l.status IN ('active', 'partially_paid')
       ORDER BY l.outstanding_balance DESC LIMIT 10`,
      [tomorrowStr, tomorrowStr]
    );

    res.json({ overdue, dueToday: dueTodayLoans, dueTomorrow: dueTomorrowLoans });
  } catch (err) {
    console.error('Alerts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reports
router.get('/reports', authMiddleware, (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const today = getManilaDate();
    const start = startDate || '2020-01-01';
    const end = endDate || '2099-12-31';

    let data = [];

    switch (type) {
      case 'daily-releases':
        data = queryAll(
          `SELECT l.*, b.full_name as borrower_name FROM loans l
           JOIN borrowers b ON l.borrower_id = b.id
           WHERE l.release_date BETWEEN ? AND ? AND l.status != 'cancelled'
           ORDER BY l.release_date DESC`, [start, end]);
        break;
      case 'outstanding':
        data = queryAll(
          `SELECT l.*, b.full_name as borrower_name FROM loans l
           JOIN borrowers b ON l.borrower_id = b.id
           WHERE l.status IN ('active', 'partially_paid', 'overdue')
           ORDER BY l.outstanding_balance DESC`);
        break;
      case 'collections':
        data = queryAll(
          `SELECT p.*, b.full_name as borrower_name, l.loan_id as loan_ref FROM payments p
           JOIN borrowers b ON p.borrower_id = b.id JOIN loans l ON p.loan_id = l.id
           WHERE p.payment_date BETWEEN ? AND ? AND p.is_reversed = 0
           ORDER BY p.payment_date DESC`, [start, end]);
        break;
      case 'interest-income':
        data = queryAll(
          `SELECT l.loan_id, b.full_name as borrower_name, l.interest_amount, l.interest_rate, l.interest_method,
                  COALESCE(SUM(p.interest_applied), 0) as interest_collected
           FROM loans l JOIN borrowers b ON l.borrower_id = b.id
           LEFT JOIN payments p ON p.loan_id = l.id AND p.is_reversed = 0
           WHERE l.status != 'cancelled'
           GROUP BY l.id ORDER BY l.created_at DESC`);
        break;
      case 'overdue':
        data = queryAll(
          `SELECT l.*, b.full_name as borrower_name, b.contact_number,
                  CAST(julianday(?) - julianday(COALESCE(l.current_due_date, l.due_date)) AS INTEGER) as days_overdue
           FROM loans l JOIN borrowers b ON l.borrower_id = b.id
           WHERE (l.current_due_date < ? OR (l.current_due_date IS NULL AND l.due_date < ?))
           AND l.status IN ('active', 'partially_paid', 'overdue')
           ORDER BY l.due_date ASC`, [today, today, today]);
        break;
      case 'pawned-inventory':
        data = queryAll(
          `SELECT c.*, b.full_name as borrower_name, l.loan_id as loan_ref
           FROM collateral_items c JOIN borrowers b ON c.borrower_id = b.id
           JOIN loans l ON c.loan_id = l.id
           WHERE c.status IN ('held', 'received', 'eligible_for_redemption')
           ORDER BY c.date_received DESC`);
        break;
      case 'fully-paid':
        data = queryAll(
          `SELECT l.*, b.full_name as borrower_name FROM loans l
           JOIN borrowers b ON l.borrower_id = b.id
           WHERE l.status IN ('paid', 'redeemed')
           ORDER BY l.updated_at DESC`);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json(data);
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Business settings
router.get('/settings', authMiddleware, (req, res) => {
  try {
    const settings = queryAll('SELECT * FROM business_settings ORDER BY setting_key');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
    res.json(settingsMap);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update settings
router.put('/settings', authMiddleware, adminOnly, (req, res) => {
  try {
    const settings = req.body;
    Object.entries(settings).forEach(([key, value]) => {
      runSql(
        `INSERT INTO business_settings (setting_key, setting_value) VALUES (?, ?)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`,
        [key, value, value]
      );
    });
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Audit logs
router.get('/audit-logs', authMiddleware, adminOnly, (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const logs = queryAll(
      `SELECT a.*, u.full_name as user_name FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`
    );
    const total = queryOne('SELECT COUNT(*) as count FROM audit_logs');
    res.json({ data: logs, total: total?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
