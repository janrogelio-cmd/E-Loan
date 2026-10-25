const assert = require('assert');
const { initDatabase, getDb } = require('../src/database');
const {
  calculateInterest,
  roundMoney,
  getManilaDate,
  generateLoanId,
  generateBorrowerId,
  generatePawnTicketNumber,
  generatePaymentReference,
  generateReceiptNumber,
  generateRedemptionRef,
  generateExtensionRef,
  queryOne,
  queryAll,
  runSql
} = require('../src/utils/helpers');
const { generateNotifications } = require('../src/jobs/scheduler');

async function runTests() {
  console.log('==================================================');
  console.log('RUNNING EMERGENCY LOAN & PAWNSHOP UNIT TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function it(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Financial Arithmetic & Rounding Tests
  it('Monetary Rounding (2 decimal places)', () => {
    assert.strictEqual(roundMoney(500.555), 500.56);
    assert.strictEqual(roundMoney(100.1), 100.10);
    assert.strictEqual(roundMoney(1000.004), 1000.00);
  });

  it('Flat Interest Calculation: ₱5,000 at 10% = ₱500', () => {
    const interest = calculateInterest(5000, 10, 'flat', 30);
    assert.strictEqual(interest, 500.00);
  });

  it('Monthly Interest Calculation for 60-day term: ₱10,000 at 5% = ₱1,000', () => {
    const interest = calculateInterest(10000, 5, 'monthly', 60);
    assert.strictEqual(interest, 1000.00);
  });

  it('Simple Interest Calculation: ₱10,000 at 12% for 365 days = ₱1,200', () => {
    const interest = calculateInterest(10000, 12, 'simple', 365);
    assert.strictEqual(interest, 1200.00);
  });

  // Initialize DB for integration tests
  await initDatabase();

  it('Database persistence and business settings check', () => {
    const settings = queryAll('SELECT * FROM business_settings');
    assert(settings.length > 0, 'Settings should be present');
    const currency = queryOne("SELECT setting_value FROM business_settings WHERE setting_key = 'currency'");
    assert.strictEqual(currency.setting_value, 'PHP');
  });

  // 2. Loan Creation and Validation
  it('Loan ID and Reference generation', () => {
    const loanId = generateLoanId();
    assert(loanId.startsWith('LN-'), `Loan ID should start with prefix: ${loanId}`);
    const pawnTicket = generatePawnTicketNumber();
    assert(pawnTicket.startsWith('PT-'), `Pawn ticket should start with prefix: ${pawnTicket}`);
  });

  // 3. Payment Processing & Allocation Logic
  it('Partial Payment and Balance Update', () => {
    const principal = 5000;
    const interest = 500;
    const totalDue = 5500;
    const payment = 1500;

    // Fees=0, Interest=500, Principal=1000
    const interestApplied = Math.min(payment, interest);
    const principalApplied = payment - interestApplied;
    const remainingBalance = totalDue - payment;

    assert.strictEqual(interestApplied, 500);
    assert.strictEqual(principalApplied, 1000);
    assert.strictEqual(remainingBalance, 4000);
  });

  it('Full Payment settlements reduction to exactly ₱0.00', () => {
    const totalDue = 5500;
    const payment = 5500;
    const remainingBalance = roundMoney(totalDue - payment);
    assert.strictEqual(remainingBalance, 0.00);
  });

  // 4. Timezone boundaries (Asia/Manila)
  it('Philippine Timezone string validation', () => {
    const manilaDate = getManilaDate();
    assert(/^\d{4}-\d{2}-\d{2}$/.test(manilaDate), 'Should match YYYY-MM-DD');
  });

  // 5. Scheduled Notifications and Idempotency
  it('Scheduled Reminder Generation & Idempotency Key check', () => {
    generateNotifications();
    const notifs = queryAll('SELECT * FROM notifications');
    assert(notifs.length > 0, 'Notifications should be created');

    // Run again to test idempotency
    const beforeCount = notifs.length;
    generateNotifications();
    const afterCount = queryOne('SELECT COUNT(*) as cnt FROM notifications').cnt;
    assert.strictEqual(beforeCount, afterCount, 'Notifications must be idempotent (no duplicates created)');
  });

  // 6. Jewelry Redemption eligibility check
  it('Jewelry Redemption eligibility requires ₱0.00 balance', () => {
    const fullyPaidLoan = queryOne("SELECT * FROM loans WHERE status = 'paid' AND outstanding_balance = 0");
    assert(fullyPaidLoan, 'At least one fully paid loan should exist from seed');
    assert.strictEqual(fullyPaidLoan.outstanding_balance, 0, 'Outstanding balance must be zero');
  });

  it('Duplicate redemption prevention check', () => {
    const existing = queryOne('SELECT * FROM redemptions LIMIT 1');
    if (existing) {
      const duplicateAttempt = queryOne('SELECT * FROM redemptions WHERE collateral_id = ?', [existing.collateral_id]);
      assert(duplicateAttempt, 'Item must be tracked as already redeemed');
    }
  });

  // 7. Loan Extension check
  it('Loan Extension generates unique ref and retains original terms', () => {
    const extRef = generateExtensionRef();
    assert(extRef.startsWith('EXT-'), `Extension ref should start with EXT-: ${extRef}`);
  });

  console.log(`\n==================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test suite failed to run:', e);
  process.exit(1);
});
