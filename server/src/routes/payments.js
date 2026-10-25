const express = require('express');
const { authMiddleware, staffOrAdmin } = require('../middleware/auth');
const { 
  queryAll, queryOne, runSql, generatePaymentReference, generateReceiptNumber,
  roundMoney, logAudit, getManilaDate, getManilaDateTime
} = require('../utils/helpers');

const router = express.Router();

// List payments
router.get('/', authMiddleware, (req, res) => {
  try {
    const { search, loanId, borrowerId, page = 1, limit = 20, startDate, endDate } = req.query;
    let sql = `SELECT p.*, b.full_name as borrower_name, l.loan_id as loan_ref, u.full_name as cashier_name
               FROM payments p 
               JOIN borrowers b ON p.borrower_id = b.id 
               JOIN loans l ON p.loan_id = l.id
               LEFT JOIN users u ON p.cashier_id = u.id
               WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ' AND (p.payment_reference LIKE ? OR b.full_name LIKE ? OR l.loan_id LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (loanId) {
      sql += ' AND p.loan_id = ?';
      params.push(parseInt(loanId));
    }
    if (borrowerId) {
      sql += ' AND p.borrower_id = ?';
      params.push(parseInt(borrowerId));
    }
    if (startDate) {
      sql += ' AND p.payment_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND p.payment_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY p.created_at DESC';

    const countSql = sql.replace(/SELECT p\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = queryOne(countSql, params);
    const total = countResult ? countResult.total : 0;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const payments = queryAll(sql, params);
    res.json({ data: payments, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record payment
router.post('/', authMiddleware, staffOrAdmin, (req, res) => {
  try {
    const { loanId, amount, paymentMethod = 'cash', remarks } = req.body;

    if (!loanId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Loan ID and a positive payment amount are required' });
    }

    const loan = queryOne(
      `SELECT l.*, b.full_name as borrower_name, b.borrower_id as borrower_ref
       FROM loans l JOIN borrowers b ON l.borrower_id = b.id WHERE l.id = ?`,
      [loanId]
    );
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (['paid', 'redeemed', 'cancelled'].includes(loan.status)) {
      return res.status(400).json({ error: 'Cannot record payment on a completed or cancelled loan' });
    }

    const paymentAmount = roundMoney(Math.min(amount, loan.outstanding_balance));
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount exceeds outstanding balance' });
    }

    // Allocate payment: fees first, then interest, then principal
    let remaining = paymentAmount;
    const feesPaid = queryAll('SELECT COALESCE(SUM(fees_applied), 0) as total FROM payments WHERE loan_id = ? AND is_reversed = 0', [loanId]);
    const totalFeesPaid = feesPaid[0]?.total || 0;
    const feesRemaining = roundMoney(loan.fees - totalFeesPaid);
    const feesApplied = roundMoney(Math.min(remaining, feesRemaining));
    remaining = roundMoney(remaining - feesApplied);

    const interestPaid = queryAll('SELECT COALESCE(SUM(interest_applied), 0) as total FROM payments WHERE loan_id = ? AND is_reversed = 0', [loanId]);
    const totalInterestPaid = interestPaid[0]?.total || 0;
    const interestRemaining = roundMoney(loan.interest_amount - totalInterestPaid);
    const interestApplied = roundMoney(Math.min(remaining, interestRemaining));
    remaining = roundMoney(remaining - interestApplied);

    const principalApplied = remaining;

    const newBalance = roundMoney(loan.outstanding_balance - paymentAmount);
    const newAmountPaid = roundMoney(loan.amount_paid + paymentAmount);
    const paymentRef = generatePaymentReference();
    const paymentDate = getManilaDate();

    // Insert payment
    runSql(
      `INSERT INTO payments (payment_reference, loan_id, borrower_id, payment_date, amount, 
        principal_applied, interest_applied, fees_applied, payment_method, remaining_balance, 
        cashier_id, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentRef, loanId, loan.borrower_id, paymentDate, paymentAmount,
       principalApplied, interestApplied, feesApplied, paymentMethod, newBalance,
       req.user.id, remarks || null]
    );

    // Update loan
    let newStatus = loan.status;
    if (newBalance <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partially_paid';
    }

    runSql(
      `UPDATE loans SET amount_paid = ?, outstanding_balance = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      [newAmountPaid, newBalance, newStatus, loanId]
    );

    // If fully paid, check for collateral and mark eligible for redemption
    if (newStatus === 'paid') {
      runSql(
        `UPDATE collateral_items SET status = 'eligible_for_redemption', updated_at = datetime('now') 
         WHERE loan_id = ? AND status = 'held'`,
        [loanId]
      );

      // Create notification for fully paid
      const idempKey = `fully_paid_${loanId}_${paymentDate}`;
      runSql(
        `INSERT OR IGNORE INTO notifications (type, loan_id, borrower_id, title, message, scheduled_date, idempotency_key)
         VALUES ('fully_paid', ?, ?, 'Loan Fully Paid', ?, ?, ?)`,
        [loanId, loan.borrower_id,
         `Loan ${loan.loan_id} for ${loan.borrower_name} has been fully paid. Outstanding balance: ₱0.00`,
         paymentDate, idempKey]
      );

      // Create awaiting_redemption notification if collateral exists
      const collateral = queryOne('SELECT * FROM collateral_items WHERE loan_id = ?', [loanId]);
      if (collateral) {
        const rdmKey = `awaiting_redemption_${loanId}_${paymentDate}`;
        runSql(
          `INSERT OR IGNORE INTO notifications (type, loan_id, borrower_id, title, message, scheduled_date, idempotency_key)
           VALUES ('awaiting_redemption', ?, ?, 'Jewelry Awaiting Redemption', ?, ?, ?)`,
          [loanId, loan.borrower_id,
           `Loan ${loan.loan_id} is fully paid. Collateral: ${collateral.description} (${collateral.pawn_ticket_number}) is ready for redemption.`,
           paymentDate, rdmKey]
        );
      }
    }

    // Generate receipt
    const receiptNum = generateReceiptNumber();
    const collateral = queryOne('SELECT pawn_ticket_number FROM collateral_items WHERE loan_id = ?', [loanId]);
    const settings = queryOne("SELECT setting_value FROM business_settings WHERE setting_key = 'business_name'");
    const businessName = settings ? settings.setting_value : 'E-Loan Pawnshop';

    runSql(
      `INSERT INTO receipts (receipt_number, payment_id, loan_id, borrower_id, business_name, transaction_date,
        borrower_name, loan_ref, pawn_ticket_number, original_principal, interest_and_fees, amount_paid,
        total_paid_to_date, remaining_balance, payment_method, cashier_name, remarks)
       VALUES (?, (SELECT id FROM payments WHERE payment_reference = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiptNum, paymentRef, loanId, loan.borrower_id, businessName, getManilaDateTime(),
       loan.borrower_name, loan.loan_id, collateral ? collateral.pawn_ticket_number : null,
       loan.principal_amount, roundMoney(loan.interest_amount + loan.fees), paymentAmount,
       newAmountPaid, newBalance, paymentMethod, req.user.fullName, remarks || null]
    );

    logAudit(req.user.id, 'RECORD_PAYMENT', 'payment', paymentRef, 
      { loanId: loan.loan_id, amount: paymentAmount, newBalance }, req.ip);

    const payment = queryOne('SELECT * FROM payments WHERE payment_reference = ?', [paymentRef]);
    const receipt = queryOne('SELECT * FROM receipts WHERE receipt_number = ?', [receiptNum]);
    
    res.status(201).json({ payment, receipt, loanStatus: newStatus });
  } catch (err) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reverse payment (admin only)
router.post('/:id/reverse', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can reverse payments' });
    }

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason for reversal is required' });

    const payment = queryOne('SELECT * FROM payments WHERE id = ? AND is_reversed = 0', [req.params.id]);
    if (!payment) return res.status(404).json({ error: 'Payment not found or already reversed' });

    // Reverse the payment
    runSql(
      `UPDATE payments SET is_reversed = 1, reversed_by = ?, reversal_reason = ?, reversed_at = datetime('now') WHERE id = ?`,
      [req.user.id, reason, payment.id]
    );

    // Restore loan balance
    const loan = queryOne('SELECT * FROM loans WHERE id = ?', [payment.loan_id]);
    if (loan) {
      const newPaid = roundMoney(loan.amount_paid - payment.amount);
      const newBalance = roundMoney(loan.outstanding_balance + payment.amount);
      let newStatus = 'active';
      if (newPaid > 0) newStatus = 'partially_paid';

      runSql(
        `UPDATE loans SET amount_paid = ?, outstanding_balance = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
        [newPaid, newBalance, newStatus, loan.id]
      );

      // Revert collateral status if needed
      if (loan.status === 'paid') {
        runSql(
          `UPDATE collateral_items SET status = 'held', updated_at = datetime('now') 
           WHERE loan_id = ? AND status = 'eligible_for_redemption'`,
          [loan.id]
        );
      }
    }

    logAudit(req.user.id, 'REVERSE_PAYMENT', 'payment', payment.payment_reference, { reason, amount: payment.amount }, req.ip);
    res.json({ message: 'Payment reversed successfully' });
  } catch (err) {
    console.error('Reverse payment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
