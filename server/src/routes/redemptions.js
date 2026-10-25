const express = require('express');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { queryAll, queryOne, runSql, generateRedemptionRef, logAudit, getManilaDate, getManilaDateTime } = require('../utils/helpers');

const router = express.Router();

// List redemptions
router.get('/', authMiddleware, (req, res) => {
  try {
    const redemptions = queryAll(
      `SELECT r.*, b.full_name as borrower_name, l.loan_id as loan_ref, c.description as item_description,
              c.pawn_ticket_number, u.full_name as released_by_name
       FROM redemptions r
       JOIN borrowers b ON r.borrower_id = b.id
       JOIN loans l ON r.loan_id = l.id
       JOIN collateral_items c ON r.collateral_id = c.id
       LEFT JOIN users u ON r.released_by = u.id
       ORDER BY r.created_at DESC`
    );
    res.json(redemptions);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get loans awaiting redemption
router.get('/awaiting', authMiddleware, (req, res) => {
  try {
    const items = queryAll(
      `SELECT c.*, b.full_name as borrower_name, l.loan_id as loan_ref, l.id as lid,
              l.principal_amount, l.total_amount_due, l.amount_paid, l.outstanding_balance, l.status as loan_status
       FROM collateral_items c
       JOIN loans l ON c.loan_id = l.id
       JOIN borrowers b ON c.borrower_id = b.id
       WHERE l.status = 'paid' AND c.status = 'eligible_for_redemption'
       ORDER BY l.updated_at DESC`
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process redemption
router.post('/', authMiddleware, (req, res) => {
  try {
    const { loanId, collateralId, borrowerAcknowledged = true, notes } = req.body;

    if (!loanId || !collateralId) {
      return res.status(400).json({ error: 'Loan ID and collateral ID are required' });
    }

    const loan = queryOne('SELECT * FROM loans WHERE id = ? AND status = ?', [loanId, 'paid']);
    if (!loan) return res.status(404).json({ error: 'Loan not found or not fully paid' });

    if (loan.outstanding_balance > 0) {
      return res.status(400).json({ error: 'Outstanding balance must be zero for redemption' });
    }

    const collateral = queryOne(
      'SELECT * FROM collateral_items WHERE id = ? AND loan_id = ? AND status = ?',
      [collateralId, loanId, 'eligible_for_redemption']
    );
    if (!collateral) {
      return res.status(404).json({ error: 'Collateral not found or not eligible for redemption' });
    }

    // Check for duplicate redemption
    const existingRedemption = queryOne(
      'SELECT * FROM redemptions WHERE collateral_id = ?', [collateralId]
    );
    if (existingRedemption) {
      return res.status(409).json({ error: 'This item has already been redeemed' });
    }

    const redemptionRef = generateRedemptionRef();
    const today = getManilaDate();

    // Create redemption record
    runSql(
      `INSERT INTO redemptions (redemption_ref, loan_id, borrower_id, collateral_id, pawn_ticket_number,
        redemption_date, verified_by, released_by, borrower_acknowledged, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [redemptionRef, loanId, loan.borrower_id, collateralId, collateral.pawn_ticket_number,
       today, req.user.id, req.user.id, borrowerAcknowledged ? 1 : 0, notes || null]
    );

    // Update collateral status
    runSql(
      'UPDATE collateral_items SET status = ?, updated_at = datetime("now") WHERE id = ?',
      ['returned', collateralId]
    );

    // Update loan status
    runSql(
      'UPDATE loans SET status = ?, updated_at = datetime("now") WHERE id = ?',
      ['redeemed', loanId]
    );

    logAudit(req.user.id, 'REDEEM_COLLATERAL', 'redemption', redemptionRef,
      { loanId: loan.loan_id, pawnTicket: collateral.pawn_ticket_number, item: collateral.description }, req.ip);

    const redemption = queryOne('SELECT * FROM redemptions WHERE redemption_ref = ?', [redemptionRef]);
    res.status(201).json(redemption);
  } catch (err) {
    console.error('Redemption error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
