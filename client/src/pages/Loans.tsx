import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api, { formatPHP, formatDatePH } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Loan, Borrower, LoanStatus, InterestMethod } from '../types';
import {
  Coins,
  Search,
  Plus,
  Filter,
  Eye,
  Calendar,
  CreditCard,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  AlertCircle,
  Gem,
  Printer
} from 'lucide-react';

export const Loans: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states for Create Loan
  const [formData, setFormData] = useState({
    borrowerId: '',
    principalAmount: '5000',
    interestRate: '10',
    interestMethod: 'flat' as InterestMethod,
    loanTermDays: '30',
    releaseDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
    dueDate: '',
    fees: '0',
    feeDescription: '',
    paymentSchedule: 'lump_sum',
    remarks: '',
  });
  const [createError, setCreateError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Extension Form state
  const [extData, setExtData] = useState({
    newDueDate: '',
    reason: 'Customer requested extension for financial hardship',
    charges: '100'
  });
  const [extSubmitting, setExtSubmitting] = useState(false);

  // Payment Form state
  const [payData, setPayData] = useState({
    amount: '',
    paymentMethod: 'cash',
    remarks: 'Cash payment'
  });
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccessReceipt, setPaySuccessReceipt] = useState<any | null>(null);

  // Auto calculate due date when release date or term changes
  useEffect(() => {
    if (formData.releaseDate && formData.loanTermDays) {
      const d = new Date(formData.releaseDate + 'T00:00:00+08:00');
      d.setDate(d.getDate() + parseInt(formData.loanTermDays || '30'));
      setFormData((prev) => ({
        ...prev,
        dueDate: d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
      }));
    }
  }, [formData.releaseDate, formData.loanTermDays]);

  // Read URL query params on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    const actionParam = params.get('action');
    if (statusParam) setStatusFilter(statusParam);
    if (actionParam === 'new') setShowCreateModal(true);
  }, [location.search]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/loans', {
        params: { search, status: statusFilter, page, limit: 15 }
      });
      setLoans(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBorrowersList = async () => {
    try {
      const res = await api.get('/borrowers', { params: { limit: 100 } });
      setBorrowers(res.data.data);
    } catch (err) {
      console.error('Failed to load borrowers');
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchBorrowersList();
  }, []);

  // Financial preview calculation
  const principal = parseFloat(formData.principalAmount) || 0;
  const rate = parseFloat(formData.interestRate) || 0;
  const term = parseInt(formData.loanTermDays) || 30;
  const fees = parseFloat(formData.fees) || 0;

  let calculatedInterest = 0;
  if (formData.interestMethod === 'flat') {
    calculatedInterest = principal * (rate / 100);
  } else if (formData.interestMethod === 'monthly') {
    calculatedInterest = principal * (rate / 100) * (term / 30);
  } else {
    calculatedInterest = principal * (rate / 100) * (term / 365);
  }
  calculatedInterest = Math.round((calculatedInterest + Number.EPSILON) * 100) / 100;
  const calculatedTotal = Math.round((principal + calculatedInterest + fees + Number.EPSILON) * 100) / 100;

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!formData.borrowerId) {
      setCreateError('Please select a registered borrower.');
      return;
    }
    if (principal <= 0) {
      setCreateError('Principal amount must be greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/loans', {
        borrowerId: parseInt(formData.borrowerId),
        principalAmount: principal,
        interestRate: rate,
        interestMethod: formData.interestMethod,
        loanTermDays: term,
        releaseDate: formData.releaseDate,
        dueDate: formData.dueDate,
        fees,
        feeDescription: formData.feeDescription,
        paymentSchedule: formData.paymentSchedule,
        remarks: formData.remarks,
        status: 'active'
      });
      setShowCreateModal(false);
      fetchLoans();
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Failed to disburse loan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLoanDetail = async (id: number) => {
    try {
      const res = await api.get(`/loans/${id}`);
      setSelectedLoan(res.data);
      // Pre-fill payment amount with remaining balance
      setPayData({
        amount: String(res.data.outstanding_balance),
        paymentMethod: 'cash',
        remarks: 'Full / partial repayment'
      });
    } catch (err) {
      console.error('Error fetching loan detail:', err);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    try {
      setPaySubmitting(true);
      const res = await api.post('/payments', {
        loanId: selectedLoan.id,
        amount: parseFloat(payData.amount),
        paymentMethod: payData.paymentMethod,
        remarks: payData.remarks
      });
      setPaySuccessReceipt(res.data.receipt);
      setShowPaymentModal(false);
      handleOpenLoanDetail(selectedLoan.id);
      fetchLoans();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleProcessExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !extData.newDueDate) return;

    try {
      setExtSubmitting(true);
      await api.post(`/loans/${selectedLoan.id}/extend`, {
        newDueDate: extData.newDueDate,
        reason: extData.reason,
        charges: parseFloat(extData.charges || '0')
      });
      setShowExtensionModal(false);
      handleOpenLoanDetail(selectedLoan.id);
      fetchLoans();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Extension failed');
    } finally {
      setExtSubmitting(false);
    }
  };

  const getStatusBadge = (status: LoanStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">ACTIVE</span>;
      case 'partially_paid':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">PARTIAL</span>;
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">PAID</span>;
      case 'overdue':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">OVERDUE</span>;
      case 'redeemed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">REDEEMED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Coins className="w-7 h-7 text-amber-500" />
            <span>Emergency Loan Operations</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Flat, monthly, and simple interest loans with precise decimal-safe accounting and due date alerts.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#0B192C] hover:bg-[#152B4B] text-amber-300 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-950/20"
        >
          <Plus className="w-4 h-4" />
          <span>Disburse New Loan</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Loan ID (e.g. LN-0001), borrower name, or borrower ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="overdue">Overdue Only</option>
            <option value="paid">Fully Paid</option>
            <option value="redeemed">Redeemed</option>
          </select>
        </div>
      </div>

      {/* Loan Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Loan ID</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Principal (₱)</th>
                <th className="py-3 px-4">Interest Terms</th>
                <th className="py-3 px-4">Total Due</th>
                <th className="py-3 px-4">Paid / Balance</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Loading emergency loans...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No loans found matching your criteria.
                  </td>
                </tr>
              ) : (
                loans.map((ln) => (
                  <tr key={ln.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{ln.loan_id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{ln.borrower_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ln.borrower_ref}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatPHP(ln.principal_amount)}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-semibold">{ln.interest_rate}% ({ln.interest_method})</div>
                      <div className="text-[10px] text-slate-400">{formatPHP(ln.interest_amount)} interest</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatPHP(ln.total_amount_due)}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-amber-900">{formatPHP(ln.outstanding_balance)}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">{formatPHP(ln.amount_paid)} paid</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-bold text-slate-800">{formatDatePH(ln.current_due_date || ln.due_date)}</div>
                      <div className="text-[10px] text-slate-400">{ln.loan_term_days} days term</div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(ln.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenLoanDetail(ln.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 font-bold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {loans.length} of {total} loans</span>
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

      {/* Disburse New Loan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">New Emergency Loan Agreement</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-disbursement financial disclosure with Philippine Peso (₱) interest validation.
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLoan} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Registered Borrower *</label>
                <select
                  required
                  value={formData.borrowerId}
                  onChange={(e) => setFormData({ ...formData, borrowerId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                >
                  <option value="">— Select a customer —</option>
                  {borrowers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.full_name} ({b.borrower_id}) - {b.contact_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Principal Amount (PHP ₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="100"
                    required
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Calculation Method</label>
                  <select
                    value={formData.interestMethod}
                    onChange={(e: any) => setFormData({ ...formData, interestMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                  >
                    <option value="flat">Flat Interest (Agreed term)</option>
                    <option value="monthly">Monthly Interest (per 30d)</option>
                    <option value="simple">Simple Interest (per annum)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loan Term (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.loanTermDays}
                    onChange={(e) => setFormData({ ...formData, loanTermDays: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Schedule</label>
                  <select
                    value={formData.paymentSchedule}
                    onChange={(e) => setFormData({ ...formData, paymentSchedule: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                  >
                    <option value="lump_sum">Lump Sum at Maturity</option>
                    <option value="weekly">Weekly Amortization</option>
                    <option value="bi_weekly">Bi-Weekly (15 days)</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Release Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.releaseDate}
                    onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Calculated Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-amber-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approved Legal Fees (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.fees}
                    onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fee Description (Disclosed)</label>
                  <input
                    type="text"
                    placeholder="e.g. Documentation & notary fee"
                    value={formData.feeDescription}
                    onChange={(e) => setFormData({ ...formData, feeDescription: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Financial Calculation Disclosure Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-300/80 text-xs space-y-2">
                <span className="text-[10px] uppercase font-extrabold text-amber-900 tracking-wider">
                  Contractual Terms & Breakdown
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Principal:</span>
                    <span className="font-bold text-slate-900">{formatPHP(principal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Interest ({formData.interestRate}%):</span>
                    <span className="font-bold text-amber-900">{formatPHP(calculatedInterest)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Disclosed Fees:</span>
                    <span className="font-bold text-slate-700">{formatPHP(fees)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Total Repayment:</span>
                    <span className="font-extrabold text-slate-950 text-sm">{formatPHP(calculatedTotal)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Loan Purpose</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Medical emergency assistance, tuition, temporary bridge funding..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-amber-300 font-bold hover:bg-[#152B4B] disabled:opacity-50"
                >
                  {submitting ? 'Generating Agreement...' : 'Confirm & Disburse Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Details & Management Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-extrabold text-slate-900 font-mono">{selectedLoan.loan_id}</h3>
                  {getStatusBadge(selectedLoan.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Borrower: <strong className="text-slate-800">{selectedLoan.borrower_name}</strong> ({selectedLoan.borrower_ref}) • Phone: {selectedLoan.contact_number}
                </p>
              </div>
              <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap gap-2 my-4">
              {['active', 'partially_paid', 'overdue'].includes(selectedLoan.status) && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Record Payment</span>
                </button>
              )}

              {isAdmin && ['active', 'partially_paid', 'overdue'].includes(selectedLoan.status) && (
                <button
                  onClick={() => {
                    const currentDue = selectedLoan.current_due_date || selectedLoan.due_date;
                    const nextMonth = new Date(currentDue + 'T00:00:00+08:00');
                    nextMonth.setDate(nextMonth.getDate() + 30);
                    setExtData({
                      newDueDate: nextMonth.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
                      reason: 'Customer agreed renewal / extension',
                      charges: '100'
                    });
                    setShowExtensionModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-sm"
                >
                  <Clock className="w-4 h-4" />
                  <span>Extend / Renew Due Date</span>
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>
            </div>

            {/* Financial Ledger Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Principal</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">{formatPHP(selectedLoan.principal_amount)}</p>
                <span className="text-[10px] text-slate-500">{selectedLoan.interest_rate}% {selectedLoan.interest_method}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Interest & Fees</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {formatPHP(selectedLoan.interest_amount + selectedLoan.fees)}
                </p>
                <span className="text-[10px] text-slate-500">Interest: ₱{selectedLoan.interest_amount}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Repaid</span>
                <p className="text-base font-extrabold text-emerald-700 mt-0.5">{formatPHP(selectedLoan.amount_paid)}</p>
                <span className="text-[10px] text-emerald-600 font-medium">Applied to balance</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-900">Current Balance</span>
                <p className="text-base font-black text-amber-950 mt-0.5">{formatPHP(selectedLoan.outstanding_balance)}</p>
                <span className="text-[10px] text-slate-500">Due: {formatDatePH(selectedLoan.current_due_date || selectedLoan.due_date)}</span>
              </div>
            </div>

            {/* Collateral Pawned (if any) */}
            {selectedLoan.collateral && selectedLoan.collateral.length > 0 && (
              <div className="mb-6 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Gem className="w-4 h-4 text-amber-600" />
                  <span>Held Collateral Details</span>
                </h4>
                {selectedLoan.collateral.map((c: any) => (
                  <div key={c.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-amber-900 mr-2">{c.pawn_ticket_number}</span>
                      <span className="font-bold text-slate-900">{c.description}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {c.karat} {c.metal_type} • {c.weight_grams}g • Appraised at {formatPHP(c.appraised_value)} • Vault: {c.storage_location || 'General Custody'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Repayment History */}
            <div className="space-y-2 mb-6">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Repayment Records ({selectedLoan.payments?.length || 0})</span>
              </h4>
              {(!selectedLoan.payments || selectedLoan.payments.length === 0) ? (
                <p className="text-xs text-slate-400 py-2 italic">No repayments logged yet.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {selectedLoan.payments.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-white flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-slate-900 mr-2">{p.payment_reference}</span>
                        <span className="text-slate-500">{formatDatePH(p.payment_date)}</span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Allocated: Principal ₱{p.principal_applied} • Interest ₱{p.interest_applied} • Fees ₱{p.fees_applied}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700 text-sm">{formatPHP(p.amount)}</span>
                        <p className="text-[10px] text-slate-400">Balance: {formatPHP(p.remaining_balance)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extension / Renewal History */}
            {selectedLoan.extensions && selectedLoan.extensions.length > 0 && (
              <div className="space-y-2 mb-6">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Extension History</span>
                </h4>
                <div className="space-y-1.5 text-xs">
                  {selectedLoan.extensions.map((ext: any) => (
                    <div key={ext.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/20 flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-amber-900 mr-2">{ext.extension_ref}</span>
                        <span>Extended from {formatDatePH(ext.original_due_date)} to <strong>{formatDatePH(ext.new_due_date)}</strong></span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Reason: {ext.reason || 'Customer request'}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800">Fee: {formatPHP(ext.charges)}</span>
                        <p className="text-[10px] text-slate-400">By {ext.approved_by_name || 'Admin'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLoan(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Record Loan Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <div className="flex justify-between">
                  <span>Loan Reference:</span>
                  <strong className="font-mono">{selectedLoan.loan_id}</strong>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Borrower:</span>
                  <strong>{selectedLoan.borrower_name}</strong>
                </div>
                <div className="flex justify-between mt-1 text-amber-900 font-bold">
                  <span>Outstanding Balance:</span>
                  <span>{formatPHP(selectedLoan.outstanding_balance)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Amount (PHP ₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedLoan.outstanding_balance}
                  required
                  value={payData.amount}
                  onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-base"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payData.paymentMethod}
                  onChange={(e) => setPayData({ ...payData, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="maya">Maya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  value={payData.remarks}
                  onChange={(e) => setPayData({ ...payData, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
                Payment will be automatically applied to: 1. Fees → 2. Interest → 3. Principal. A printable receipt will be generated.
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {paySubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Extension Modal */}
      {showExtensionModal && selectedLoan && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Extend / Renew Loan</h3>
              <button onClick={() => setShowExtensionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessExtension} className="space-y-4 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <div>Loan: <strong>{selectedLoan.loan_id}</strong> - {selectedLoan.borrower_name}</div>
                <div className="mt-1">
                  Current Due Date: <strong className="text-amber-900">{formatDatePH(selectedLoan.current_due_date || selectedLoan.due_date)}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Approved Revised Due Date *</label>
                <input
                  type="date"
                  required
                  value={extData.newDueDate}
                  onChange={(e) => setExtData({ ...extData, newDueDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Applicable Renewal Charge (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={extData.charges}
                  onChange={(e) => setExtData({ ...extData, charges: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason & Customer Agreement</label>
                <textarea
                  rows={2}
                  required
                  value={extData.reason}
                  onChange={(e) => setExtData({ ...extData, reason: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExtensionModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extSubmitting}
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50"
                >
                  {extSubmitting ? 'Extending...' : 'Approve Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
