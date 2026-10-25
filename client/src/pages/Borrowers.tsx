import React, { useState, useEffect } from 'react';
import api, { formatPHP, formatDatePH } from '../utils/api';
import { Borrower } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Mail,
  FileText,
  Eye,
  Edit2,
  X,
  Coins,
  Gem,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

export const Borrowers: React.FC = () => {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const [selectedBorrower, setSelectedBorrower] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    address: '',
    email: '',
    idType: 'Philippine National ID',
    idNumber: '',
    notes: '',
    status: 'active' as const
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBorrowers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/borrowers', {
        params: { search, status: statusFilter, page, limit: 15 }
      });
      setBorrowers(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching borrowers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowers();
  }, [search, statusFilter, page]);

  const handleOpenAdd = () => {
    setEditingBorrower(null);
    setFormData({
      fullName: '',
      contactNumber: '+63 ',
      address: '',
      email: '',
      idType: 'Philippine National ID',
      idNumber: '',
      notes: '',
      status: 'active'
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (b: Borrower) => {
    setEditingBorrower(b);
    setFormData({
      fullName: b.full_name,
      contactNumber: b.contact_number,
      address: b.address,
      email: b.email || '',
      idType: b.id_type || 'Philippine National ID',
      idNumber: b.id_number || '',
      notes: b.notes || '',
      status: b.status
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleViewDetails = async (id: number) => {
    try {
      setDetailsLoading(true);
      const res = await api.get(`/borrowers/${id}`);
      setSelectedBorrower(res.data);
    } catch (err) {
      console.error('Failed to load borrower details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim() || !formData.contactNumber.trim() || !formData.address.trim()) {
      setFormError('Full name, contact number, and residential address are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingBorrower) {
        await api.put(`/borrowers/${editingBorrower.id}`, formData);
      } else {
        await api.post('/borrowers', formData);
      }
      setShowAddModal(false);
      fetchBorrowers();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Operation failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-7 h-7 text-amber-500" />
            <span>Borrower Directory & KYC Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Maintain verified customer profiles, government IDs, and linked loan portfolios.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#0B192C] hover:bg-[#152B4B] text-amber-300 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-950/20"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Borrower</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by legal name, Borrower ID (e.g. BRW-0001), or phone number..."
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
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Borrowers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Borrower ID</th>
                <th className="py-3 px-4">Full Legal Name</th>
                <th className="py-3 px-4">Contact & Address</th>
                <th className="py-3 px-4">ID Reference</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading borrower records...
                  </td>
                </tr>
              ) : borrowers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No borrowers found matching your criteria.
                  </td>
                </tr>
              ) : (
                borrowers.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{b.borrower_id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{b.full_name}</div>
                      {b.email && <div className="text-[11px] text-slate-400 font-normal">{b.email}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center space-x-1 font-semibold text-slate-800">
                        <Phone className="w-3 h-3 text-amber-600" />
                        <span>{b.contact_number}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{b.address}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {b.id_type || 'National ID'}
                      </span>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{b.id_number || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDatePH(b.created_at)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(b.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                        title="View Full Profile & Loan History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
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
          <span>Showing {borrowers.length} of {total} registered borrowers</span>
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

      {/* Add / Edit Borrower Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingBorrower ? 'Update Borrower KYC' : 'Register New Borrower'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compliant with Philippine personal information and KYC guidelines.
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
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+63 912 345 6789"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="maria@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Complete Residential Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Street, Barangay, City/Municipality, Province"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Government ID Type</label>
                  <select
                    value={formData.idType}
                    onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                  >
                    <option value="Philippine National ID">Philippine National ID</option>
                    <option value="Driver's License">Driver's License</option>
                    <option value="Passport">Passport</option>
                    <option value="UMID">UMID Card</option>
                    <option value="SSS / GSIS">SSS / GSIS ID</option>
                    <option value="Voter's ID">Voter's ID / Certification</option>
                    <option value="Postal ID">Postal ID</option>
                    <option value="Barangay ID">Barangay Clearance/ID</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ID Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. PHN-1234-5678"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Notes & History</label>
                <textarea
                  rows={2}
                  placeholder="Reliability, past payment discipline, references..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
                />
              </div>

              {editingBorrower && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}

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
                  {submitting ? 'Saving...' : editingBorrower ? 'Save Changes' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrower Detail View Modal */}
      {selectedBorrower && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-amber-400 font-extrabold flex items-center justify-center text-lg shadow-md">
                  {selectedBorrower.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <span>{selectedBorrower.full_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700">
                      {selectedBorrower.borrower_id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Registered {formatDatePH(selectedBorrower.created_at)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBorrower(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* KYC Profile Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Contact Number</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedBorrower.contact_number}</p>
                {selectedBorrower.email && (
                  <p className="text-slate-500 mt-1">{selectedBorrower.email}</p>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Government ID Verified</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedBorrower.id_type || 'National ID'}</p>
                <p className="font-mono text-slate-600 mt-0.5">{selectedBorrower.id_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Residential Address</span>
                <p className="text-slate-700 mt-0.5 leading-snug">{selectedBorrower.address}</p>
              </div>
            </div>

            {/* Linked Loans */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Associated Emergency Loans ({selectedBorrower.loans?.length || 0})</span>
              </h4>
              {(!selectedBorrower.loans || selectedBorrower.loans.length === 0) ? (
                <p className="text-xs text-slate-400 py-3 italic">No loans recorded for this customer.</p>
              ) : (
                <div className="space-y-2">
                  {selectedBorrower.loans.map((ln: any) => (
                    <div key={ln.id} className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900">{ln.loan_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ln.status === 'paid' || ln.status === 'redeemed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ln.status === 'overdue'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            {ln.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-1">
                          Released: {formatDatePH(ln.release_date)} • Due: {formatDatePH(ln.current_due_date || ln.due_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Balance / Principal</p>
                        <p className="font-bold text-slate-900">
                          {formatPHP(ln.outstanding_balance)} / {formatPHP(ln.principal_amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Pawn Collateral */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Gem className="w-4 h-4 text-amber-500" />
                <span>Pawned Jewelry Items ({selectedBorrower.collateral?.length || 0})</span>
              </h4>
              {(!selectedBorrower.collateral || selectedBorrower.collateral.length === 0) ? (
                <p className="text-xs text-slate-400 py-3 italic">No collateral items deposited.</p>
              ) : (
                <div className="space-y-2">
                  {selectedBorrower.collateral.map((c: any) => (
                    <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 bg-amber-50/20 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-amber-900">{c.pawn_ticket_number}</span>
                          <span className="font-semibold text-slate-800">{c.description}</span>
                        </div>
                        <p className="text-slate-500 mt-1">
                          {c.karat} {c.metal_type} • {c.weight_grams}g • Appraised: {formatPHP(c.appraised_value)}
                        </p>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBorrower(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
