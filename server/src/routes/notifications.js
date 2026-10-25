const express = require('express');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { queryAll, queryOne, runSql, logAudit, getManilaDate } = require('../utils/helpers');

const router = express.Router();

// Get notifications
router.get('/', authMiddleware, (req, res) => {
  try {
    const { type, isRead, page = 1, limit = 50 } = req.query;
    let sql = `SELECT n.*, b.full_name as borrower_name, l.loan_id as loan_ref
               FROM notifications n
               LEFT JOIN borrowers b ON n.borrower_id = b.id
               LEFT JOIN loans l ON n.loan_id = l.id
               WHERE 1=1`;
    const params = [];

    if (type) {
      sql += ' AND n.type = ?';
      params.push(type);
    }
    if (isRead !== undefined) {
      sql += ' AND n.is_read = ?';
      params.push(isRead === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY n.created_at DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const notifications = queryAll(sql, params);
    
    // Get unread count
    const unreadResult = queryOne('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
    const unreadCount = unreadResult ? unreadResult.count : 0;

    res.json({ data: notifications, unreadCount });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, (req, res) => {
  try {
    const result = queryOne('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
    res.json({ count: result ? result.count : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, (req, res) => {
  try {
    runSql('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
router.put('/mark-all-read', authMiddleware, (req, res) => {
  try {
    runSql('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manually trigger reminder generation (admin)
router.post('/generate', authMiddleware, adminOnly, (req, res) => {
  try {
    const { generateNotifications } = require('../jobs/scheduler');
    generateNotifications();
    res.json({ message: 'Notifications generated successfully' });
  } catch (err) {
    console.error('Generate notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
