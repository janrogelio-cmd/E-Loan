const express = require('express');
const { authMiddleware, staffOrAdmin } = require('../middleware/auth');
const { queryAll, queryOne, runSql, generateBorrowerId, logAudit, getManilaDateTime } = require('../utils/helpers');

const router = express.Router();

// List borrowers
router.get('/', authMiddleware, (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM borrowers WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (full_name LIKE ? OR borrower_id LIKE ? OR contact_number LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';
    
    // Get total count
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = queryOne(countSql, params);
    const total = countResult ? countResult.total : 0;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const borrowers = queryAll(sql, params);
    res.json({ data: borrowers, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List borrowers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single borrower
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const borrower = queryOne('SELECT * FROM borrowers WHERE id = ?', [req.params.id]);
    if (!borrower) return res.status(404).json({ error: 'Borrower not found' });

    // Get loans for this borrower
    const loans = queryAll('SELECT * FROM loans WHERE borrower_id = ? ORDER BY created_at DESC', [borrower.id]);
    // Get collateral for this borrower
    const collateral = queryAll('SELECT * FROM collateral_items WHERE borrower_id = ? ORDER BY created_at DESC', [borrower.id]);
    // Get payments
    const payments = queryAll(
      'SELECT p.* FROM payments p WHERE p.borrower_id = ? ORDER BY p.created_at DESC',
      [borrower.id]
    );

    res.json({ ...borrower, loans, collateral, payments });
  } catch (err) {
    console.error('Get borrower error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create borrower
router.post('/', authMiddleware, staffOrAdmin, (req, res) => {
  try {
    const { fullName, contactNumber, address, email, idType, idNumber, notes } = req.body;
    
    if (!fullName || !contactNumber || !address) {
      return res.status(400).json({ error: 'Full name, contact number, and address are required' });
    }

    // Check duplicate
    const existing = queryOne(
      'SELECT id FROM borrowers WHERE full_name = ? AND contact_number = ?',
      [fullName, contactNumber]
    );
    if (existing) {
      return res.status(409).json({ error: 'A borrower with this name and contact number already exists' });
    }

    const borrowerId = generateBorrowerId();
    runSql(
      `INSERT INTO borrowers (borrower_id, full_name, contact_number, address, email, id_type, id_number, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [borrowerId, fullName, contactNumber, address, email || null, idType || null, idNumber || null, notes || null]
    );

    const newBorrower = queryOne('SELECT * FROM borrowers WHERE borrower_id = ?', [borrowerId]);
    logAudit(req.user.id, 'CREATE_BORROWER', 'borrower', borrowerId, { fullName }, req.ip);
    res.status(201).json(newBorrower);
  } catch (err) {
    console.error('Create borrower error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update borrower
router.put('/:id', authMiddleware, staffOrAdmin, (req, res) => {
  try {
    const { fullName, contactNumber, address, email, idType, idNumber, status, notes } = req.body;
    const id = req.params.id;

    const borrower = queryOne('SELECT * FROM borrowers WHERE id = ?', [id]);
    if (!borrower) return res.status(404).json({ error: 'Borrower not found' });

    runSql(
      `UPDATE borrowers SET 
        full_name = COALESCE(?, full_name),
        contact_number = COALESCE(?, contact_number),
        address = COALESCE(?, address),
        email = COALESCE(?, email),
        id_type = COALESCE(?, id_type),
        id_number = COALESCE(?, id_number),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?`,
      [fullName, contactNumber, address, email, idType, idNumber, status, notes, id]
    );

    const updated = queryOne('SELECT * FROM borrowers WHERE id = ?', [id]);
    logAudit(req.user.id, 'UPDATE_BORROWER', 'borrower', borrower.borrower_id, { fullName, status }, req.ip);
    res.json(updated);
  } catch (err) {
    console.error('Update borrower error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
