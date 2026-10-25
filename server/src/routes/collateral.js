const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware, staffOrAdmin } = require('../middleware/auth');
const { queryAll, queryOne, runSql, generatePawnTicketNumber, logAudit, getManilaDate } = require('../utils/helpers');

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// List collateral items
router.get('/', authMiddleware, (req, res) => {
  try {
    const { search, status, loanId, page = 1, limit = 20 } = req.query;
    let sql = `SELECT c.*, b.full_name as borrower_name, l.loan_id as loan_ref
               FROM collateral_items c 
               JOIN borrowers b ON c.borrower_id = b.id 
               JOIN loans l ON c.loan_id = l.id
               WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ' AND (c.pawn_ticket_number LIKE ? OR c.description LIKE ? OR b.full_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }
    if (loanId) {
      sql += ' AND c.loan_id = ?';
      params.push(parseInt(loanId));
    }

    sql += ' ORDER BY c.created_at DESC';

    const countSql = sql.replace(/SELECT c\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = queryOne(countSql, params);
    const total = countResult ? countResult.total : 0;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const items = queryAll(sql, params);
    res.json({ data: items, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List collateral error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single collateral item
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const item = queryOne(
      `SELECT c.*, b.full_name as borrower_name, l.loan_id as loan_ref, l.status as loan_status,
              l.outstanding_balance, l.total_amount_due, l.amount_paid
       FROM collateral_items c 
       JOIN borrowers b ON c.borrower_id = b.id 
       JOIN loans l ON c.loan_id = l.id
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (!item) return res.status(404).json({ error: 'Collateral item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create collateral item
router.post('/', authMiddleware, staffOrAdmin, upload.array('photos', 5), (req, res) => {
  try {
    const {
      loanId, borrowerId, itemCategory = 'jewelry', jewelryType, metalType, karat,
      weightGrams, description, identifyingMarks, appraisedValue, loanAmountSecured,
      conditionAtIntake, storageLocation
    } = req.body;

    if (!loanId || !borrowerId || !description || !appraisedValue || !loanAmountSecured) {
      return res.status(400).json({ error: 'Loan ID, borrower ID, description, appraised value, and secured amount are required' });
    }

    const loan = queryOne('SELECT * FROM loans WHERE id = ?', [loanId]);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const pawnTicket = generatePawnTicketNumber();
    const photoPaths = req.files ? req.files.map(f => f.filename).join(',') : null;

    runSql(
      `INSERT INTO collateral_items (pawn_ticket_number, loan_id, borrower_id, item_category, jewelry_type,
        metal_type, karat, weight_grams, description, identifying_marks, appraised_value, loan_amount_secured,
        condition_at_intake, date_received, storage_location, photo_paths, accepted_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'held')`,
      [pawnTicket, loanId, borrowerId, itemCategory, jewelryType || null, metalType || null,
       karat || null, weightGrams || null, description, identifyingMarks || null,
       parseFloat(appraisedValue), parseFloat(loanAmountSecured), conditionAtIntake || null,
       getManilaDate(), storageLocation || null, photoPaths, req.user.id]
    );

    const item = queryOne('SELECT * FROM collateral_items WHERE pawn_ticket_number = ?', [pawnTicket]);
    logAudit(req.user.id, 'CREATE_COLLATERAL', 'collateral', pawnTicket, { description, appraisedValue }, req.ip);
    res.status(201).json(item);
  } catch (err) {
    console.error('Create collateral error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update collateral status
router.put('/:id', authMiddleware, staffOrAdmin, (req, res) => {
  try {
    const { status, storageLocation, conditionAtIntake } = req.body;
    const item = queryOne('SELECT * FROM collateral_items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Collateral item not found' });

    if (status) {
      runSql('UPDATE collateral_items SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, req.params.id]);
    }
    if (storageLocation) {
      runSql('UPDATE collateral_items SET storage_location = ?, updated_at = datetime("now") WHERE id = ?', [storageLocation, req.params.id]);
    }

    const updated = queryOne('SELECT * FROM collateral_items WHERE id = ?', [req.params.id]);
    logAudit(req.user.id, 'UPDATE_COLLATERAL', 'collateral', item.pawn_ticket_number, { status }, req.ip);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
