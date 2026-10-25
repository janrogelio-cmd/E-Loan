import React, { useState, useEffect } from 'react';
import api, { formatPHP, formatDatePH } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Payment, Loan } from '../types';
import {
  CreditCard,
  Search,
  Plus,
  RotateCcw,
  Printer,
  X,
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export const Payments: React.FC = () => {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  // New Payment Form
  const [formData, setFormData] = useState({
    loanId: '',
    amount: '',
    paymentMethod: 'cash',
    remarks: 'Payment'
  });
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments', {
        params: { search, page, limit: 15 }
      });
      setPayments(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveLoans = async () => {
    try {
      const res = await api.get('/loans', { params: { limit: 100 } });
      setLoans(res.data.data.filter((l: Loan) => ['active', 'partially_paid', 'overdue'].includes(l.status)));
    } catch (err) {
      console.error('Failed to load active loans');
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, page]);

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const handleLoanChange = (loanIdStr: string) => {
    const l = loans.find((item) => String(item.id) === loanIdStr);
    setSelectedLoan(l || null);
    setFormData((prev) => ({
      ...prev,
      loanId: loanIdStr,
      amount: l ? String(l.outstanding_balance) : ''
    }));
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.loanId) {
      setFormError('Please select a loan.');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) {
      setFormError('Payment amount must be greater than zero.');
      return;
    }
    if (selectedLoan && amt > selectedLoan.outstanding_balance) {
      setFormError(`Payment exceeds outstanding balance of ${formatPHP(selectedLoan.outstanding_balance)}.`);
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/payments', {
        loanId: parseInt(formData.loanId),
        amount: amt,
        paymentMethod: formData.paymentMethod,
        remarks: formData.remarks
      });
      setShowAddModal(false);
      fetchPayments();
      fetchActiveLoans();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReverse = (payment: Payment) => {
    setSelectedPayment(payment);
    setReversalReason('Administrative correction of duplicate or misallocated payment entry');
    setShowReverseModal(true);
  };

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    try {
      setReversing(true);
      await api.post(`/payments/${selectedPayment.id}/reverse`, {
        reason: reversalReason
      });
      setShowReverseModal(false);
      fetchPayments();
      fetchActiveLoans();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Reversal failed');
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <CreditCard className="w-7 h-7 text-amber-500" />
            <span>Repayment Collections & Cashier Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated waterfall allocation: Fees → Realized Interest → Disbursed Principal.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedLoan(null);
            setFormData({ loanId: '', amount: '', paymentMethod: 'cash', remarks: 'Full / partial repayment' });
            setShowAddModal(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#0B192C] hover:bg-[#152B4B] text-amber-300 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-950/20"
        >
          <Plus className="w-4 h-4" />
          <span>Record Customer Payment</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Payment Ref (e.g. PAY-000001), Loan ID, or Borrower..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Borrower & Loan</th>
                <th className="py-3 px-4">Amount Collected</th>
                <th className="py-3 px-4">Allocation Breakdown</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Method & Cashier</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4 text-right">Audit / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No payment transactions found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className={`transition-colors ${p.is_reversed ? 'bg-rose-50/40 text-slate-400' : 'hover:bg-slate-50/70'}`}>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.payment_reference}
                      {p.is_reversed === 1 && (
                        <span className="block text-[9px] font-bold text-rose-600 uppercase">REVERSED</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{p.borrower_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.loan_ref}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700 text-sm">
                      {p.is_reversed ? <del className="text-slate-400">{formatPHP(p.amount)}</del> : formatPHP(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div>Fees: ₱{p.fees_applied}</div>
                      <div>Interest: ₱{p.interest_applied}</div>
                      <div className="font-semibold text-slate-800">Principal: ₱{p.principal_applied}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatPHP(p.remaining_balance)}</td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize font-semibold text-slate-800">{p.payment_method}</span>
                      <div className="text-[10px] text-slate-400">{p.cashier_name || 'Staff'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDatePH(p.payment_date)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {isAdmin && !p.is_reversed && (
                        <button
                          onClick={() => handleOpenReverse(p)}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                          title="Authorize Payment Reversal"
                        >
                          Reverse Entry
                        </button>
                      )}
                      {p.is_reversed === 1 && (
                        <span className="text-[10px] text-rose-600 font-medium italic block" title={p.reversal_reason}>
                          Reversed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {payments.length} of {total} transactions</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="font-bold text-slate-800">Page {page}</span>
            <button
              disabled={page * 15 >= total}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Customer Repayment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Applies strictly to fees, interest, and principal balance with receipt generation.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePayment} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Active Loan *</label>
                <select
                  required
                  value={formData.loanId}
                  onChange={(e) => handleLoanChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                >
                  <option value="">— Select an outstanding loan —</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loan_id} - {l.borrower_name} (Balance: {formatPHP(l.outstanding_balance)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLoan && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Due:</span>
                    <strong className="font-mono">{formatPHP(selectedLoan.total_amount_due)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-800 block">Outstanding Balance:</span>
                    <strong className="font-mono text-amber-950 text-sm">{formatPHP(selectedLoan.outstanding_balance)}</strong>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount Paid (PHP ₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                >
                  <option value="cash">Cash (Over the counter)</option>
                  <option value="gcash">GCash E-Wallet</option>
                  <option value="bank_transfer">Online Bank Transfer</option>
                  <option value="maya">Maya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-amber-300 font-bold hover:bg-[#152B4B] disabled:opacity-50"
                >
                  {submitting ? 'Processing Payment...' : 'Record Payment & Print Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Reversal Modal (Admin Only) */}
      {showReverseModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-rose-700 text-base">Authorize Payment Reversal</h3>
              <button onClick={() => setShowReverseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReversal} className="space-y-4 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <div>Payment Ref: <strong>{selectedPayment.payment_reference}</strong></div>
                <div>Amount to Reverse: <strong>{formatPHP(selectedPayment.amount)}</strong></div>
                <div>Borrower: <strong>{selectedPayment.borrower_name}</strong></div>
                <p className="text-[11px] text-rose-700 mt-2">
                  This transaction will NOT be deleted permanently. A reversal entry will restore the loan balance and be permanently logged in the audit ledger.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reversal Reason (Mandatory Audit Trail) *</label>
                <textarea
                  rows={3}
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 disabled:opacity-50"
                >
                  {reversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
