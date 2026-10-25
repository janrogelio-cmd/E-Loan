const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDatabase } = require('./database');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const borrowerRoutes = require('./routes/borrowers');
const loanRoutes = require('./routes/loans');
const collateralRoutes = require('./routes/collateral');
const paymentRoutes = require('./routes/payments');
const receiptRoutes = require('./routes/receipts');
const redemptionRoutes = require('./routes/redemptions');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/borrowers', borrowerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/collateral', collateralRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/redemptions', redemptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize and start
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');

    // Seed default admin if no users exist
    const { queryOne, runSql } = require('./utils/helpers');
    const bcrypt = require('bcryptjs');
    const userCount = queryOne('SELECT COUNT(*) as cnt FROM users');
    if (userCount && userCount.cnt === 0) {
      const hash = await bcrypt.hash('admin123', 12);
      runSql('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        ['admin', hash, 'System Administrator', 'admin']);
      const staffHash = await bcrypt.hash('staff123', 12);
      runSql('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        ['cashier', staffHash, 'Maria Cashier', 'staff']);
      console.log('Default users created: admin/admin123, cashier/staff123');
    }

    // Start notification scheduler
    startScheduler();

    app.listen(PORT, () => {
      console.log(`E-Loan Pawnshop Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
