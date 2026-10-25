const cron = require('node-cron');
const { queryAll, queryOne, runSql, getManilaDate } = require('../utils/helpers');

function generateNotifications() {
  try {
    const today = getManilaDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    console.log(`[Scheduler] Generating notifications for today=${today}, tomorrow=${tomorrowStr}`);

    // Due Tomorrow notifications
    const dueTomorrowLoans = queryAll(
      `SELECT l.*, b.full_name as borrower_name, b.contact_number, b.borrower_id as borrower_ref
       FROM loans l JOIN borrowers b ON l.borrower_id = b.id
       WHERE (l.current_due_date = ? OR (l.current_due_date IS NULL AND l.due_date = ?))
       AND l.status IN ('active', 'partially_paid')`,
      [tomorrowStr, tomorrowStr]
    );

    dueTomorrowLoans.forEach(loan => {
      const idempKey = `due_tomorrow_${loan.id}_${today}`;
      const collateral = queryOne('SELECT * FROM collateral_items WHERE loan_id = ?', [loan.id]);
      
      let message = `PAYMENT DUE TOMORROW\n\nBorrower: ${loan.borrower_name}\nLoan ID: ${loan.loan_id}\n`;
      if (collateral) {
        message += `Pawn Ticket: ${collateral.pawn_ticket_number}\nCollateral: ${collateral.description}\n`;
      }
      message += `Contact: ${loan.contact_number || 'N/A'}\nRemaining balance: ₱${loan.outstanding_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\nDue date: ${tomorrowStr}\n\nAction: Review the loan account and contact the borrower if appropriate.`;

      runSql(
        `INSERT OR IGNORE INTO notifications (type, loan_id, borrower_id, title, message, scheduled_date, idempotency_key)
         VALUES ('due_tomorrow', ?, ?, 'Payment Due Tomorrow', ?, ?, ?)`,
        [loan.id, loan.borrower_id, message, today, idempKey]
      );
    });

    // Due Today notifications
    const dueTodayLoans = queryAll(
      `SELECT l.*, b.full_name as borrower_name, b.contact_number
       FROM loans l JOIN borrowers b ON l.borrower_id = b.id
       WHERE (l.current_due_date = ? OR (l.current_due_date IS NULL AND l.due_date = ?))
       AND l.status IN ('active', 'partially_paid')`,
      [today, today]
    );

    dueTodayLoans.forEach(loan => {
      const idempKey = `due_today_${loan.id}_${today}`;
      const collateral = queryOne('SELECT * FROM collateral_items WHERE loan_id = ?', [loan.id]);

      let message = `PAYMENT DUE TODAY\n\nBorrower: ${loan.borrower_name}\nLoan ID: ${loan.loan_id}\n`;
      if (collateral) {
        message += `Pawn Ticket: ${collateral.pawn_ticket_number}\nCollateral: ${collateral.description}\n`;
      }
      message += `Contact: ${loan.contact_number || 'N/A'}\nRemaining balance: ₱${loan.outstanding_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\nDue date: ${today}\n\nAction: Contact borrower and collect payment.`;

      runSql(
        `INSERT OR IGNORE INTO notifications (type, loan_id, borrower_id, title, message, scheduled_date, idempotency_key)
         VALUES ('due_today', ?, ?, 'Payment Due Today', ?, ?, ?)`,
        [loan.id, loan.borrower_id, message, today, idempKey]
      );
    });

    // Overdue notifications
    const overdueLoans = queryAll(
      `SELECT l.*, b.full_name as borrower_name, b.contact_number,
              CAST(julianday(?) - julianday(COALESCE(l.current_due_date, l.due_date)) AS INTEGER) as days_overdue
       FROM loans l JOIN borrowers b ON l.borrower_id = b.id
       WHERE (l.current_due_date < ? OR (l.current_due_date IS NULL AND l.due_date < ?))
       AND l.status IN ('active', 'partially_paid', 'overdue')`,
      [today, today, today]
    );

    overdueLoans.forEach(loan => {
      const idempKey = `overdue_${loan.id}_${today}`;
      const dueDate = loan.current_due_date || loan.due_date;

      let message = `OVERDUE LOAN ALERT\n\nBorrower: ${loan.borrower_name}\nLoan ID: ${loan.loan_id}\nContact: ${loan.contact_number || 'N/A'}\nOutstanding balance: ₱${loan.outstanding_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}\nDue date: ${dueDate}\nDays overdue: ${loan.days_overdue}\nStatus: Overdue\n\nAction: Review account and record follow-up.`;

      runSql(
        `INSERT OR IGNORE INTO notifications (type, loan_id, borrower_id, title, message, scheduled_date, idempotency_key)
         VALUES ('overdue', ?, ?, 'Overdue Loan Alert', ?, ?, ?)`,
        [loan.id, loan.borrower_id, message, today, idempKey]
      );

      // Update loan status to overdue
      if (loan.status !== 'overdue') {
        runSql('UPDATE loans SET status = ?, updated_at = datetime("now") WHERE id = ?', ['overdue', loan.id]);
      }
    });

    console.log(`[Scheduler] Generated: ${dueTomorrowLoans.length} due-tomorrow, ${dueTodayLoans.length} due-today, ${overdueLoans.length} overdue notifications`);
  } catch (err) {
    console.error('[Scheduler] Error generating notifications:', err);
  }
}

function startScheduler() {
  // Run daily at 7:00 AM Manila time
  cron.schedule('0 7 * * *', () => {
    console.log('[Scheduler] Running daily notification job...');
    generateNotifications();
  }, {
    timezone: 'Asia/Manila'
  });

  // Also run at 6:00 PM for end-of-day check
  cron.schedule('0 18 * * *', () => {
    console.log('[Scheduler] Running evening notification check...');
    generateNotifications();
  }, {
    timezone: 'Asia/Manila'
  });

  // Run once on startup
  setTimeout(() => {
    console.log('[Scheduler] Running startup notification check...');
    generateNotifications();
  }, 3000);

  console.log('[Scheduler] Notification scheduler started (7:00 AM & 6:00 PM Manila time)');
}

module.exports = { startScheduler, generateNotifications };
