// Seed sample development data
const { initDatabase } = require('./database');
const { queryOne, runSql, generateBorrowerId, generateLoanId, generatePawnTicketNumber, 
        calculateInterest, roundMoney, getManilaDate, generatePaymentReference, generateReceiptNumber } = require('./utils/helpers');
const bcrypt = require('bcryptjs');

async function seed() {
  await initDatabase();
  console.log('Database initialized. Seeding sample data...');

  // Check if already seeded
  const existingBorrowers = queryOne('SELECT COUNT(*) as cnt FROM borrowers');
  if (existingBorrowers && existingBorrowers.cnt > 0) {
    console.log('Data already exists. Skipping seed.');
    process.exit(0);
  }

  // Create users
  const adminHash = await bcrypt.hash('admin123', 12);
  const staffHash = await bcrypt.hash('staff123', 12);
  
  runSql('INSERT OR IGNORE INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
    ['admin', adminHash, 'System Administrator', 'admin']);
  runSql('INSERT OR IGNORE INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
    ['cashier', staffHash, 'Maria Cashier', 'staff']);

  // Borrower 1: Maria Santos
  const brw1 = generateBorrowerId();
  runSql(
    `INSERT INTO borrowers (borrower_id, full_name, contact_number, address, email, id_type, id_number, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [brw1, 'Maria Santos', '+63 912 345 6789', '123 Rizal Street, Makati City, Metro Manila',
     'maria.santos@email.com', 'Philippine National ID', 'PHN-1234-5678-9012', 'Regular customer, good payment history']
  );
  const maria = queryOne('SELECT id FROM borrowers WHERE borrower_id = ?', [brw1]);

  // Borrower 2: Jose Reyes
  const brw2 = generateBorrowerId();
  runSql(
    `INSERT INTO borrowers (borrower_id, full_name, contact_number, address, email, id_type, id_number, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [brw2, 'Jose Reyes', '+63 917 876 5432', '456 Mabini Avenue, Quezon City, Metro Manila',
     'jose.reyes@email.com', 'Driver\'s License', 'N01-23-456789', 'First-time borrower']
  );
  const jose = queryOne('SELECT id FROM borrowers WHERE borrower_id = ?', [brw2]);

  // Borrower 3: Ana Cruz
  const brw3 = generateBorrowerId();
  runSql(
    `INSERT INTO borrowers (borrower_id, full_name, contact_number, address, email, id_type, id_number, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [brw3, 'Ana Cruz', '+63 918 234 5678', '789 Bonifacio Drive, Taguig City, Metro Manila',
     'ana.cruz@email.com', 'Passport', 'P1234567A', 'Repeat customer']
  );
  const ana = queryOne('SELECT id FROM borrowers WHERE borrower_id = ?', [brw3]);

  const today = getManilaDate();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  
  // Past due date for overdue
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  const pastDateStr = pastDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  
  // Future due date
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 25);
  const futureDateStr = futureDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  // Release date (30 days ago)
  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() - 30);
  const releaseDateStr = releaseDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  // Release date 2 (5 days ago)
  const releaseDate2 = new Date();
  releaseDate2.setDate(releaseDate2.getDate() - 5);
  const releaseDateStr2 = releaseDate2.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  // ========================
  // LOAN 1: Maria Santos - Due Tomorrow (active, with collateral)
  // ========================
  const loanId1 = generateLoanId();
  const interest1 = calculateInterest(5000, 10, 'flat', 30);
  const total1 = roundMoney(5000 + interest1);

  runSql(
    `INSERT INTO loans (loan_id, borrower_id, principal_amount, interest_rate, interest_method, interest_amount,
      total_amount_due, outstanding_balance, loan_term_days, release_date, due_date, current_due_date,
      status, assigned_staff, approved_by, approved_at, remarks)
     VALUES (?, ?, 5000, 10, 'flat', ?, ?, ?, 30, ?, ?, ?, 'active', 1, 1, datetime('now'), 'Emergency cash loan for medical expenses')`,
    [loanId1, maria.id, interest1, total1, total1, releaseDateStr, tomorrowStr, tomorrowStr]
  );
  const loan1 = queryOne('SELECT id FROM loans WHERE loan_id = ?', [loanId1]);

  // Collateral 1: 18K gold necklace
  const pt1 = generatePawnTicketNumber();
  runSql(
    `INSERT INTO collateral_items (pawn_ticket_number, loan_id, borrower_id, item_category, jewelry_type,
      metal_type, karat, weight_grams, description, appraised_value, loan_amount_secured,
      condition_at_intake, date_received, storage_location, accepted_by, status)
     VALUES (?, ?, ?, 'jewelry', 'Necklace', 'Gold', '18K', 15.5, '18K gold necklace with pendant, 15.5 grams',
      12000, 5000, 'Good condition, minor scratches on clasp', ?, 'Vault A-01', 1, 'held')`,
    [pt1, loan1.id, maria.id, releaseDateStr]
  );

  // ========================
  // LOAN 2: Jose Reyes - Overdue (5 days past due)
  // ========================
  const loanId2 = generateLoanId();
  const interest2 = calculateInterest(3000, 10, 'flat', 30);
  const total2 = roundMoney(3000 + interest2);
  const paid2 = 150;
  const balance2 = roundMoney(total2 - paid2);

  runSql(
    `INSERT INTO loans (loan_id, borrower_id, principal_amount, interest_rate, interest_method, interest_amount,
      total_amount_due, amount_paid, outstanding_balance, loan_term_days, release_date, due_date, current_due_date,
      status, assigned_staff, approved_by, approved_at, remarks)
     VALUES (?, ?, 3000, 10, 'flat', ?, ?, ?, ?, 30, ?, ?, ?, 'overdue', 1, 1, datetime('now'), 'Emergency loan - partially paid')`,
    [loanId2, jose.id, interest2, total2, paid2, balance2, releaseDateStr, pastDateStr, pastDateStr]
  );
  const loan2 = queryOne('SELECT id FROM loans WHERE loan_id = ?', [loanId2]);

  // Collateral 2: Gold ring
  const pt2 = generatePawnTicketNumber();
  runSql(
    `INSERT INTO collateral_items (pawn_ticket_number, loan_id, borrower_id, item_category, jewelry_type,
      metal_type, karat, weight_grams, description, appraised_value, loan_amount_secured,
      condition_at_intake, date_received, storage_location, accepted_by, status)
     VALUES (?, ?, ?, 'jewelry', 'Ring', 'Gold', '14K', 8.2, '14K gold ring with small diamond accent, 8.2 grams',
      8000, 3000, 'Good condition', ?, 'Vault A-02', 1, 'held')`,
    [pt2, loan2.id, jose.id, releaseDateStr]
  );

  // Payment for Jose (partial)
  const payRef2 = generatePaymentReference();
  runSql(
    `INSERT INTO payments (payment_reference, loan_id, borrower_id, payment_date, amount,
      principal_applied, interest_applied, fees_applied, payment_method, remaining_balance, cashier_id, remarks)
     VALUES (?, ?, ?, ?, 150, 0, 150, 0, 'cash', ?, 1, 'Partial payment')`,
    [payRef2, loan2.id, jose.id, releaseDateStr2, balance2]
  );

  // Receipt for Jose
  const rcpt2 = generateReceiptNumber();
  runSql(
    `INSERT INTO receipts (receipt_number, payment_id, loan_id, borrower_id, business_name, transaction_date,
      borrower_name, loan_ref, pawn_ticket_number, original_principal, interest_and_fees, amount_paid,
      total_paid_to_date, remaining_balance, payment_method, cashier_name)
     VALUES (?, (SELECT id FROM payments WHERE payment_reference = ?), ?, ?, 'E-Loan Pawnshop', ?,
      'Jose Reyes', ?, ?, 3000, ?, 150, 150, ?, 'cash', 'Maria Cashier')`,
    [rcpt2, payRef2, loan2.id, jose.id, releaseDateStr2, loanId2, pt2, interest2, balance2]
  );

  // ========================
  // LOAN 3: Ana Cruz - Fully Paid (awaiting redemption)
  // ========================
  const loanId3 = generateLoanId();
  const interest3 = calculateInterest(4000, 10, 'flat', 30);
  const total3 = roundMoney(4000 + interest3);

  runSql(
    `INSERT INTO loans (loan_id, borrower_id, principal_amount, interest_rate, interest_method, interest_amount,
      total_amount_due, amount_paid, outstanding_balance, loan_term_days, release_date, due_date, current_due_date,
      status, assigned_staff, approved_by, approved_at, remarks)
     VALUES (?, ?, 4000, 10, 'flat', ?, ?, ?, 0, 30, ?, ?, ?, 'paid', 1, 1, datetime('now'), 'Fully settled, jewelry awaiting pickup')`,
    [loanId3, ana.id, interest3, total3, total3, releaseDateStr, futureDateStr, futureDateStr]
  );
  const loan3 = queryOne('SELECT id FROM loans WHERE loan_id = ?', [loanId3]);

  // Collateral 3: Gold bracelet
  const pt3 = generatePawnTicketNumber();
  runSql(
    `INSERT INTO collateral_items (pawn_ticket_number, loan_id, borrower_id, item_category, jewelry_type,
      metal_type, karat, weight_grams, description, appraised_value, loan_amount_secured,
      condition_at_intake, date_received, storage_location, accepted_by, status)
     VALUES (?, ?, ?, 'jewelry', 'Bracelet', 'Gold', '21K', 20.0, '21K gold bracelet, solid links, 20 grams',
      25000, 4000, 'Excellent condition', ?, 'Vault B-01', 1, 'eligible_for_redemption')`,
    [pt3, loan3.id, ana.id, releaseDateStr]
  );

  // Full payment for Ana
  const payRef3 = generatePaymentReference();
  runSql(
    `INSERT INTO payments (payment_reference, loan_id, borrower_id, payment_date, amount,
      principal_applied, interest_applied, fees_applied, payment_method, remaining_balance, cashier_id, remarks)
     VALUES (?, ?, ?, ?, ?, 4000, ?, 0, 'cash', 0, 1, 'Full payment')`,
    [payRef3, loan3.id, ana.id, today, total3, interest3]
  );

  // Receipt for Ana
  const rcpt3 = generateReceiptNumber();
  runSql(
    `INSERT INTO receipts (receipt_number, payment_id, loan_id, borrower_id, business_name, transaction_date,
      borrower_name, loan_ref, pawn_ticket_number, original_principal, interest_and_fees, amount_paid,
      total_paid_to_date, remaining_balance, payment_method, cashier_name)
     VALUES (?, (SELECT id FROM payments WHERE payment_reference = ?), ?, ?, 'E-Loan Pawnshop', ?,
      'Ana Cruz', ?, ?, 4000, ?, ?, ?, 0, 'cash', 'Maria Cashier')`,
    [rcpt3, payRef3, loan3.id, ana.id, today, loanId3, pt3, interest3, total3, total3]
  );

  // ========================
  // LOAN 4: Maria Santos - Active loan (future due date, no collateral)
  // ========================
  const loanId4 = generateLoanId();
  const interest4 = calculateInterest(2000, 10, 'flat', 30);
  const total4 = roundMoney(2000 + interest4);

  runSql(
    `INSERT INTO loans (loan_id, borrower_id, principal_amount, interest_rate, interest_method, interest_amount,
      total_amount_due, outstanding_balance, loan_term_days, release_date, due_date, current_due_date,
      status, assigned_staff, approved_by, approved_at, remarks)
     VALUES (?, ?, 2000, 10, 'flat', ?, ?, ?, 30, ?, ?, ?, 'active', 1, 1, datetime('now'), 'Small emergency loan without collateral')`,
    [loanId4, maria.id, interest4, total4, total4, releaseDateStr2, futureDateStr, futureDateStr]
  );

  console.log('Sample data seeded successfully!');
  console.log('');
  console.log('Test scenarios created:');
  console.log(`  1. ${loanId1} - Maria Santos: Active loan DUE TOMORROW (₱${total1})`);
  console.log(`  2. ${loanId2} - Jose Reyes: OVERDUE loan, partially paid (₱${balance2} remaining)`);
  console.log(`  3. ${loanId3} - Ana Cruz: FULLY PAID, jewelry AWAITING REDEMPTION`);
  console.log(`  4. ${loanId4} - Maria Santos: Active loan, future due date (₱${total4})`);
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin: admin / admin123');
  console.log('  Staff: cashier / staff123');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
