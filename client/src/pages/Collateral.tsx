import React, { useState, useEffect } from 'react';
import api, { formatPHP, formatDatePH } from '../utils/api';
import { CollateralItem, Loan, CollateralStatus } from '../types';
import {
  Gem,
  Search,
  Plus,
  Eye,
  Printer,
  X,
  Upload,
  AlertCircle,
  Shield,
  FileCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const Collateral: React.FC = () => {
  const [items, setItems] = useState<CollateralItem[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    loanId: '',
    itemCategory: 'jewelry',
    jewelryType: 'Necklace',
    metalType: 'Gold',
    karat: '18K',
    weightGrams: '',
    description: '',
    identifyingMarks: '',
    appraisedValue: '',
    loanAmountSecured: '',
    conditionAtIntake: 'Good condition, no damage',
    storageLocation: 'Vault A-01',
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCollateral = async () => {
    try {
      setLoading(true);
      const res = await api.get('/collateral', {
        params: { search, status: statusFilter, page, limit: 15 }
      });
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching collateral:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveLoans = async () => {
    try {
      const res = await api.get('/loans', { params: { limit: 100 } });
      setLoans(res.data.data);
    } catch (err) {
      console.error('Failed to load loans');
    }
  };

  useEffect(() => {
    fetchCollateral();
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      loanId: '',
      itemCategory: 'jewelry',
      jewelryType: 'Necklace',
      metalType: 'Gold',
      karat: '18K',
      weightGrams: '',
      description: '',
      identifyingMarks: '',
      appraisedValue: '',
      loanAmountSecured: '',
      conditionAtIntake: 'Good condition, verified purity',
      storageLocation: 'Vault A-01',
    });
    setSelectedFiles(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleLoanSelect = (loanIdStr: string) => {
    const l = loans.find((item) => String(item.id) === loanIdStr);
    if (l) {
      setFormData((prev) => ({
        ...prev,
        loanId: loanIdStr,
        loanAmountSecured: String(l.principal_amount),
        appraisedValue: String(Math.round(l.principal_amount * 1.5))
      }));
    } else {
      setFormData((prev) => ({ ...prev, loanId: loanIdStr }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.loanId) {
      setFormError('Please select a loan to secure with this collateral.');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Item description is required.');
      return;
    }

    const selectedLoanObj = loans.find((l) => String(l.id) === formData.loanId);
    if (!selectedLoanObj) {
      setFormError('Invalid loan selected.');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('loanId', formData.loanId);
      data.append('borrowerId', String(selectedLoanObj.borrower_id));
      data.append('itemCategory', formData.itemCategory);
      data.append('jewelryType', formData.jewelryType);
      data.append('metalType', formData.metalType);
      data.append('karat', formData.karat);
      data.append('weightGrams', formData.weightGrams);
      data.append('description', formData.description);
      data.append('identifyingMarks', formData.identifyingMarks);
      data.append('appraisedValue', formData.appraisedValue);
      data.append('loanAmountSecured', formData.loanAmountSecured);
      data.append('conditionAtIntake', formData.conditionAtIntake);
      data.append('storageLocation', formData.storageLocation);

      if (selectedFiles) {
        for (let i = 0; i < selectedFiles.length; i++) {
          data.append('photos', selectedFiles[i]);
        }
      }

      await api.post('/collateral', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowAddModal(false);
      fetchCollateral();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to deposit collateral');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintPawnTicket = (item: any) => {
    setSelectedItem(item);
    setShowTicketModal(true);
  };

  const getStatusBadge = (status: CollateralStatus) => {
    switch (status) {
      case 'held':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">HELD IN VAULT</span>;
      case 'eligible_for_redemption':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse">AWAITING REDEMPTION</span>;
      case 'returned':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">RETURNED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Gem className="w-7 h-7 text-amber-500" />
            <span>Pawnshop & Jewelry Collateral Custody</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gold, precious metals, and jewelry inventory tracking with printable Official Pawn Tickets.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#0B192C] hover:bg-[#152B4B] text-amber-300 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-950/20"
        >
          <Plus className="w-4 h-4" />
          <span>Intake New Pawn Collateral</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Pawn Ticket # (e.g. PT-0001), item description, or borrower..."
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
            <option value="held">Held in Custody</option>
            <option value="eligible_for_redemption">Awaiting Redemption</option>
            <option value="returned">Returned to Owner</option>
          </select>
        </div>
      </div>

      {/* Collateral Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Pawn Ticket #</th>
                <th className="py-3 px-4">Item Description</th>
                <th className="py-3 px-4">Specs & Weight</th>
                <th className="py-3 px-4">Appraised Value</th>
                <th className="py-3 px-4">Secured Loan</th>
                <th className="py-3 px-4">Vault Location</th>
                <th className="py-3 px-4">Custody Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Loading collateral inventory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No collateral records found matching your query.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-900">{item.pawn_ticket_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.description}</div>
                      <div className="text-[11px] text-slate-500">
                        Owner: <strong className="text-slate-700">{item.borrower_name}</strong>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[10px] mr-1">
                        {item.karat} {item.metal_type}
                      </span>
                      <span className="font-mono font-semibold">{item.weight_grams} grams</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatPHP(item.appraised_value)}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-blue-700">{item.loan_ref}</div>
                      <div className="text-[11px] text-slate-500">{formatPHP(item.loan_amount_secured)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>{item.storage_location || 'General Vault'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handlePrintPawnTicket(item)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold text-xs transition-colors"
                        title="Print Pawn Ticket"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-700" />
                        <span>Ticket</span>
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
          <span>Showing {items.length} of {total} items in vault</span>
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

      {/* Intake Collateral Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Intake Pawn Collateral</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Appraise jewelry, assign vault location, and issue official pawn ticket.
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

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Loan to Secure *</label>
                <select
                  required
                  value={formData.loanId}
                  onChange={(e) => handleLoanSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                >
                  <option value="">— Select active loan —</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loan_id} - {l.borrower_name} ({formatPHP(l.principal_amount)} principal)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jewelry Type</label>
                  <select
                    value={formData.jewelryType}
                    onChange={(e) => setFormData({ ...formData, jewelryType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                  >
                    <option value="Necklace">Necklace</option>
                    <option value="Ring">Ring</option>
                    <option value="Bracelet">Bracelet</option>
                    <option value="Earrings">Earrings</option>
                    <option value="Pendant">Pendant</option>
                    <option value="Watch / Gold Coin">Watch / Coin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metal / Karat Purity</label>
                  <select
                    value={formData.karat}
                    onChange={(e) => setFormData({ ...formData, karat: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                  >
                    <option value="14K">14K Gold (58.5%)</option>
                    <option value="18K">18K Gold (75.0%)</option>
                    <option value="21K">21K Gold (87.5%)</option>
                    <option value="22K">22K Gold (91.6%)</option>
                    <option value="24K">24K Pure Gold (99.9%)</option>
                    <option value="Platinum">Platinum 950</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weight (Grams) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    placeholder="e.g. 15.5"
                    value={formData.weightGrams}
                    onChange={(e) => setFormData({ ...formData, weightGrams: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 18K solid yellow gold necklace with heart pendant, hallmark stamped..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Appraised Value (PHP ₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.appraisedValue}
                    onChange={(e) => setFormData({ ...formData, appraisedValue: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loan Amount Secured (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.loanAmountSecured}
                    onChange={(e) => setFormData({ ...formData, loanAmountSecured: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Storage Vault Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. Vault A-01 / Shelf 3"
                    value={formData.storageLocation}
                    onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Condition at Intake</label>
                  <input
                    type="text"
                    placeholder="Good condition, minor clasp scratches"
                    value={formData.conditionAtIntake}
                    onChange={(e) => setFormData({ ...formData, conditionAtIntake: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Photographs (Optional)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
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
                  {submitting ? 'Depositing Item...' : 'Issue Pawn Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Pawn Ticket Modal */}
      {showTicketModal && selectedItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Action Bar (hidden when printed) */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Pawn Ticket Preview</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0B192C] text-amber-300 text-xs font-bold shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
                <button onClick={() => setShowTicketModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Ticket Document Area */}
            <div className="printable-area border-2 border-slate-800 p-6 rounded-2xl bg-white text-slate-900 font-serif">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
                <h2 className="text-xl font-black uppercase tracking-wider">E-LOAN & PAWNSHOP INC.</h2>
                <p className="text-xs font-sans text-slate-600">Metro Manila, Republic of the Philippines</p>
                <p className="text-xs font-sans text-slate-600">Tel: +63 912 345 6789 • BSP Registered Pawnshop</p>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-900 text-white font-sans text-xs font-extrabold uppercase tracking-widest rounded">
                  OFFICIAL PAWN TICKET
                </div>
              </div>

              {/* Ticket Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs font-sans mb-4 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-500">Ticket Number:</span>
                  <strong className="block text-sm font-mono">{selectedItem.pawn_ticket_number}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Date Pawned:</span>
                  <strong className="block text-sm">{formatDatePH(selectedItem.date_received)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Loan Reference:</span>
                  <strong className="block font-mono">{selectedItem.loan_ref}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Vault Location:</span>
                  <strong className="block">{selectedItem.storage_location || 'General Custody'}</strong>
                </div>
              </div>

              {/* Borrower Info */}
              <div className="text-xs font-sans mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 uppercase text-[10px] font-bold block mb-1">Pawer / Borrower</span>
                <p className="font-bold text-sm text-slate-900">{selectedItem.borrower_name}</p>
                <p className="text-slate-600 text-xs mt-0.5">Contact: Verified on record</p>
              </div>

              {/* Jewelry Details */}
              <div className="text-xs font-sans mb-4 space-y-1 border-b border-slate-200 pb-3">
                <span className="text-slate-500 uppercase text-[10px] font-bold block">Pawned Collateral Description</span>
                <p className="font-bold text-sm text-slate-900">{selectedItem.description}</p>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-slate-700">
                  <div>Karat: <strong>{selectedItem.karat}</strong></div>
                  <div>Weight: <strong>{selectedItem.weight_grams}g</strong></div>
                  <div>Appraised: <strong>{formatPHP(selectedItem.appraised_value)}</strong></div>
                </div>
              </div>

              {/* Financial Terms */}
              <div className="text-xs font-sans mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Principal Loan Granted:</span>
                  <strong className="text-sm font-bold">{formatPHP(selectedItem.loan_amount_secured)}</strong>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Custody Status:</span>
                  <strong className="uppercase">{selectedItem.status}</strong>
                </div>
              </div>

              {/* Legal Terms & Instructions */}
              <div className="text-[10px] font-sans text-slate-500 space-y-1 border-t border-slate-200 pt-3">
                <p>
                  <strong>REDEMPTION NOTICE:</strong> This pawn ticket must be presented upon redemption. Collateral will only be released upon full payment of principal, accrued interest, and disclosed lawful charges.
                </p>
                <p>
                  Pursuant to Presidential Decree No. 114 (Pawnshop Regulation Act), pawned articles are safely held in vault custody and shall not be disposed of without legal maturity notice.
                </p>
              </div>

              {/* Signature Lines */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs font-sans">
                <div>
                  <div className="border-t border-slate-800 pt-1 font-bold">Authorized Appraiser / Cashier</div>
                  <span className="text-[10px] text-slate-400">E-Loan Pawnshop Staff</span>
                </div>
                <div>
                  <div className="border-t border-slate-800 pt-1 font-bold">Pawer / Borrower's Signature</div>
                  <span className="text-[10px] text-slate-400">Acceptance of Terms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
