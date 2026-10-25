const express = require('express');
const { authMiddleware, staffOrAdmin } = require('../middleware/auth');
const { queryAll, queryOne, runSql } = require('../utils/helpers');

const router = express.Router();

// List receipts
router.get('/', authMiddleware, (req, res) => {
  try {
    const { search, loanId, borrowerId, page = 1, limit = 20, startDate, endDate } = req.query;
    let sql = `SELECT r.*, b.full_name as bname FROM receipts r
               JOIN borrowers b ON r.borrower_id = b.id WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ' AND (r.receipt_number LIKE ? OR r.borrower_name LIKE ? OR r.loan_ref LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (loanId) {
      sql += ' AND r.loan_id = ?';
      params.push(parseInt(loanId));
    }
    if (borrowerId) {
      sql += ' AND r.borrower_id = ?';
      params.push(parseInt(borrowerId));
    }
    if (startDate) {
      sql += ' AND r.transaction_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND r.transaction_date <= ?';
      params.push(endDate + ' 23:59:59');
    }

    sql += ' ORDER BY r.created_at DESC';

    const countSql = sql.replace(/SELECT r\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = queryOne(countSql, params);
    const total = countResult ? countResult.total : 0;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const receipts = queryAll(sql, params);
    res.json({ data: receipts, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List receipts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single receipt
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const receipt = queryOne('SELECT * FROM receipts WHERE id = ?', [req.params.id]);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipt by number
router.get('/by-number/:number', authMiddleware, (req, res) => {
  try {
    const receipt = queryOne('SELECT * FROM receipts WHERE receipt_number = ?', [req.params.number]);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
