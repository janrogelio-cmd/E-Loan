const express = require('express');
const { authMiddleware, staffOrAdmin, adminOnly } = require('../middleware/auth');
const { 
  queryAll, queryOne, runSql, generateLoanId, generatePawnTicketNumber,
  calculateInterest, roundMoney, logAudit, getManilaDate, generateExtensionRef
} = require('../utils/helpers');

const router = express.Router();

// List loans
router.get('/', authMiddleware, (req, res) => {
  try {
    const { search, status, borrowerId, page = 1, limit = 20 } = req.query;
    let sql = `SELECT l.*, b.full_name as borrower_name, b.borrower_id as borrower_ref, b.contact_number
               FROM loans l JOIN borrowers b ON l.borrower_id = b.id WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ' AND (l.loan_id LIKE ? OR b.full_name LIKE ? OR b.borrower_id LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }
    if (borrowerId) {
      sql += ' AND l.borrower_id = ?';
      params.push(parseInt(borrowerId));
    }

    sql += ' ORDER BY l.created_at DESC';
    
    const countSql = sql.replace(/SELECT l\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = queryOne(countSql, params);
    const total = countResult ? countResult.total : 0;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const loans = queryAll(sql, params);
    res.json({ data: loans, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List loans error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single loan with details
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const loan = queryOne(
      `SELECT l.*, b.full_name as borrower_name, b.borrower_id as borrower_ref, b.contact_number
       FROM loans l JOIN borrowers b ON l.borrower_id = b.id WHERE l.id = ?`,
      [req.params.id]
    );
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const collateral = queryAll('SELECT * FROM collateral_items WHERE loan_id = ?', [loan.id]);
    const payments = queryAll('SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date DESC', [loan.id]);
    const extensions = queryAll('SELECT le.*, u.full_name as approved_by_name FROM loan_extensions le LEFT JOIN users u ON le.approved_by = u.id WHERE le.loan_id = ? ORDER BY le.created_at DESC', [loan.id]);
    const redemptions = queryAll('SELECT * FROM redemptions WHERE loan_id = ?', [loan.id]);

    res.json({ ...loan, collateral, payments, extensions, redemptions });
  } catch (err) {
    console.error('Get loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create loan
router.post('/', authMiddleware, staffOrAdmin, (req, res) => {
  try {
    const {
      borrowerId, principalAmount, interestRate, interestMethod = 'flat',
      loanTermDays = 30, releaseDate, dueDate, fees = 0, feeDescription,
      paymentSchedule = 'lump_sum', remarks, status = 'active'
    } = req.body;

    if (!borrowerId || !principalAmount || interestRate === undefined || !releaseDate || !dueDate) {
      return res.status(400).json({ error: 'Borrower, principal, interest rate, release date, and due date are required' });
    }

    if (principalAmount <= 0) return res.status(400).json({ error: 'Principal must be positive' });
    if (interestRate < 0) return res.status(400).json({ error: 'Interest rate cannot be negative' });

    const borrower = queryOne('SELECT * FROM borrowers WHERE id = ?', [borrowerId]);
    if (!borrower) return res.status(404).json({ error: 'Borrower not found' });

    const interest = calculateInterest(principalAmount, interestRate, interestMethod, loanTermDays);
    const totalDue = roundMoney(principalAmount + interest + fees);
    const loanId = generateLoanId();

    runSql(
      `INSERT INTO loans (loan_id, borrower_id, principal_amount, interest_rate, interest_method, interest_amount, 
        fees, fee_description, total_amount_due, outstanding_balance, loan_term_days, release_date, due_date, 
        current_due_date, payment_schedule, status, assigned_staff, remarks, approved_by, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [loanId, borrowerId, principalAmount, interestRate, interestMethod, interest,
       fees, feeDescription || null, totalDue, totalDue, loanTermDays, releaseDate, dueDate,
       dueDate, paymentSchedule, status, req.user.id, remarks || null, req.user.id]
    );

    const loan = queryOne('SELECT * FROM loans WHERE loan_id = ?', [loanId]);
    logAudit(req.user.id, 'CREATE_LOAN', 'loan', loanId, { borrowerId, principalAmount, totalDue }, req.ip);
    res.status(201).json(loan);
  } catch (err) {
    console.error('Create loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update loan
router.put('/:id', authMiddleware, staffOrAdmin, (req, res) => {
  try {
    const { status, remarks } = req.body;
    const loan = queryOne('SELECT * FROM loans WHERE id = ?', [req.params.id]);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    if (status) {
      runSql('UPDATE loans SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, req.params.id]);
    }
    if (remarks !== undefined) {
      runSql('UPDATE loans SET remarks = ?, updated_at = datetime("now") WHERE id = ?', [remarks, req.params.id]);
    }

    const updated = queryOne('SELECT * FROM loans WHERE id = ?', [req.params.id]);
    logAudit(req.user.id, 'UPDATE_LOAN', 'loan', loan.loan_id, { status, remarks }, req.ip);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Extend loan
router.post('/:id/extend', authMiddleware, adminOnly, (req, res) => {
  try {
    const { newDueDate, reason, charges = 0 } = req.body;
    if (!newDueDate) return res.status(400).json({ error: 'New due date is required' });

    const loan = queryOne('SELECT * FROM loans WHERE id = ?', [req.params.id]);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (['paid', 'redeemed', 'cancelled'].includes(loan.status)) {
      return res.status(400).json({ error: 'Cannot extend a completed or cancelled loan' });
    }

    const originalDueDate = loan.current_due_date || loan.due_date;
    const extRef = generateExtensionRef();

    runSql(
      `INSERT INTO loan_extensions (extension_ref, loan_id, original_due_date, new_due_date, reason, charges, approved_by, customer_agreed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [extRef, loan.id, originalDueDate, newDueDate, reason || null, charges, req.user.id]
    );

    // Update loan with new due date and add charges
    const newBalance = roundMoney(loan.outstanding_balance + charges);
    const newTotal = roundMoney(loan.total_amount_due + charges);
    runSql(
      `UPDATE loans SET current_due_date = ?, outstanding_balance = ?, total_amount_due = ?, 
       status = CASE WHEN status = 'overdue' THEN 'active' ELSE status END,
       updated_at = datetime('now') WHERE id = ?`,
      [newDueDate, newBalance, newTotal, loan.id]
    );

    logAudit(req.user.id, 'EXTEND_LOAN', 'loan', loan.loan_id, { originalDueDate, newDueDate, charges }, req.ip);
    const updated = queryOne('SELECT * FROM loans WHERE id = ?', [loan.id]);
    res.json(updated);
  } catch (err) {
    console.error('Extend loan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
