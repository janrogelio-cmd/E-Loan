import React, { useState, useEffect } from 'react';
import api, { formatPHP, formatDatePH } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CollateralItem, RedemptionItem } from '../types';
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Gem,
  Printer,
  X,
  ShieldCheck,
  UserCheck,
  Calendar,
  Lock,
  Search
} from 'lucide-react';

export const Redemption: React.FC = () => {
  const { user } = useAuth();
  const [awaitingItems, setAwaitingItems] = useState<any[]>([]);
  const [completedRedemptions, setCompletedRedemptions] = useState<RedemptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'awaiting' | 'history'>('awaiting');

  // Modal states
  const [selectedForRedemption, setSelectedForRedemption] = useState<any | null>(null);
  const [printedRedemption, setPrintedRedemption] = useState<any | null>(null);
  const [borrowerConfirmed, setBorrowerConfirmed] = useState(false);
  const [staffConfirmed, setStaffConfirmed] = useState(false);
  const [redemptionNotes, setRedemptionNotes] = useState('Customer presented valid Philippine ID and original pawn ticket. Jewelry inspected and verified before release.');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRedemptionData = async () => {
    try {
      setLoading(true);
      const [awaitRes, histRes] = await Promise.all([
        api.get('/redemptions/awaiting'),
        api.get('/redemptions')
      ]);
      setAwaitingItems(awaitRes.data);
      setCompletedRedemptions(histRes.data);
    } catch (err) {
      console.error('Failed to load redemption records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptionData();
  }, []);

  const handleOpenRedeemModal = (item: any) => {
    setSelectedForRedemption(item);
    setBorrowerConfirmed(true);
    setStaffConfirmed(true);
    setRedemptionNotes('Customer presented valid ID and original pawn ticket. Jewelry inspected in excellent condition.');
    setErrorMsg('');
  };

  const handleProcessRedemption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForRedemption) return;
    if (!borrowerConfirmed || !staffConfirmed) {
      setErrorMsg('Both identity verification and staff release confirmation are required.');
      return;
    }

    try {
      setProcessing(true);
      const res = await api.post('/redemptions', {
        loanId: selectedForRedemption.loan_id || selectedForRedemption.lid,
        collateralId: selectedForRedemption.id,
        borrowerAcknowledged: borrowerConfirmed,
        notes: redemptionNotes
      });

      // Prepare print certificate
      setPrintedRedemption({
        ...res.data,
        item_description: selectedForRedemption.description,
        borrower_name: selectedForRedemption.borrower_name,
        loan_ref: selectedForRedemption.loan_ref,
        released_by_name: user?.fullName || 'Authorized Staff'
      });

      setSelectedForRedemption(null);
      fetchRedemptionData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Redemption failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <RotateCcw className="w-7 h-7 text-amber-500" />
            <span>Jewelry Redemption & Custody Release</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Secure multi-step release verification for fully settled pawn collateral.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('awaiting')}
          className={`pb-3 flex items-center space-x-2 transition-all border-b-2 ${
            activeTab === 'awaiting'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Awaiting Physical Redemption</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            awaitingItems.length > 0 ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-slate-100 text-slate-600'
          }`}>
            {awaitingItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 flex items-center space-x-2 transition-all border-b-2 ${
            activeTab === 'history'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Completed Releases History</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {completedRedemptions.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Awaiting Redemption */}
      {activeTab === 'awaiting' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-xs text-amber-950 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-extrabold">Notice: Accounts with Zero Balance</strong>
              These loans are 100% fully settled (₱0.00 outstanding balance). The collateral jewelry items are legally eligible and ready for physical release to the verified borrower.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Pawn Ticket #</th>
                    <th className="py-3 px-4">Borrower Name</th>
                    <th className="py-3 px-4">Jewelry Description</th>
                    <th className="py-3 px-4">Appraised Value</th>
                    <th className="py-3 px-4">Loan Settlement</th>
                    <th className="py-3 px-4">Current Vault Location</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Checking awaiting redemptions...
                      </td>
                    </tr>
                  ) : awaitingItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        No fully paid loans awaiting collateral release. All settled items have been returned!
                      </td>
                    </tr>
                  ) : (
                    awaitingItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-900">{item.pawn_ticket_number}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.borrower_name}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{item.description}</div>
                          <div className="text-[10px] text-slate-500">{item.karat} {item.metal_type} • {item.weight_grams}g</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{formatPHP(item.appraised_value)}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ₱0.00 Balance (Settled)
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.loan_ref}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold">{item.storage_location || 'General Vault'}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenRedeemModal(item)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify & Release Item</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Completed Redemptions History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Redemption Ref</th>
                  <th className="py-3 px-4">Pawn Ticket #</th>
                  <th className="py-3 px-4">Borrower Name</th>
                  <th className="py-3 px-4">Jewelry Released</th>
                  <th className="py-3 px-4">Released By Staff</th>
                  <th className="py-3 px-4">Release Date</th>
                  <th className="py-3 px-4 text-right">Acknowledgment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {completedRedemptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No completed redemption logs found.
                    </td>
                  </tr>
                ) : (
                  completedRedemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.redemption_ref}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-900">{r.pawn_ticket_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.borrower_name}</td>
                      <td className="py-3.5 px-4 text-slate-700">{r.item_description}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{r.released_by_name || 'Staff'}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">{formatDatePH(r.redemption_date)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setPrintedRedemption(r)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reprint Certificate</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Redemption Verification & Release Modal */}
      {selectedForRedemption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Authorize Jewelry Custody Release</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm physical jewelry return and generate legal acknowledgment certificate.
                </p>
              </div>
              <button onClick={() => setSelectedForRedemption(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProcessRedemption} className="space-y-4 mt-4 text-xs">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pawn Ticket Number:</span>
                  <strong className="font-mono text-amber-900">{selectedForRedemption.pawn_ticket_number}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Borrower:</span>
                  <strong className="text-slate-900">{selectedForRedemption.borrower_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Item Description:</span>
                  <strong className="text-slate-900">{selectedForRedemption.description}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vault Location:</span>
                  <strong className="font-mono text-slate-800">{selectedForRedemption.storage_location || 'General Custody'}</strong>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-amber-200/60">
                  <span>Settled Loan Balance:</span>
                  <span>₱0.00 (Fully Paid)</span>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                  <input
                    type="checkbox"
                    checked={borrowerConfirmed}
                    onChange={(e) => setBorrowerConfirmed(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Verified Borrower Identity & Physical Pawn Ticket</span>
                    <span className="text-[11px] text-slate-500">Customer presented government ID matching the borrower record.</span>
                  </div>
                </label>

                <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                  <input
                    type="checkbox"
                    checked={staffConfirmed}
                    onChange={(e) => setStaffConfirmed(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Collateral Inspected & Safely Retrieved from Vault</span>
                    <span className="text-[11px] text-slate-500">Item confirmed intact, matches intake weight and description.</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Release Remarks / Audit Notes</label>
                <textarea
                  rows={2}
                  required
                  value={redemptionNotes}
                  onChange={(e) => setRedemptionNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedForRedemption(null)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !borrowerConfirmed || !staffConfirmed}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {processing ? 'Processing Release...' : 'Confirm Release to Borrower'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Redemption Certificate */}
      {printedRedemption && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Redemption Certificate</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0B192C] text-amber-300 text-xs font-bold shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
                <button onClick={() => setPrintedRedemption(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document */}
            <div className="printable-area border-2 border-slate-800 p-6 rounded-2xl bg-white text-slate-900 font-serif">
              <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
                <h3 className="text-lg font-black uppercase tracking-wider">E-LOAN & PAWNSHOP INC.</h3>
                <p className="text-[11px] font-sans text-slate-600">Metro Manila, Philippines</p>
                <div className="inline-block mt-2 px-3 py-1 bg-emerald-800 text-white font-sans text-xs font-extrabold uppercase tracking-widest rounded">
                  CERTIFICATE OF COLLATERAL REDEMPTION
                </div>
              </div>

              <div className="text-xs font-sans space-y-1 mb-4 border-b border-slate-200 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Redemption Ref:</span>
                  <strong className="font-mono">{printedRedemption.redemption_ref}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pawn Ticket:</span>
                  <strong className="font-mono text-amber-900">{printedRedemption.pawn_ticket_number}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date of Return:</span>
                  <strong>{formatDatePH(printedRedemption.redemption_date)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Name:</span>
                  <strong className="text-slate-900">{printedRedemption.borrower_name}</strong>
                </div>
              </div>

              <div className="text-xs font-sans mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 uppercase text-[10px] font-bold block mb-1">Returned Article Description</span>
                <p className="font-bold text-slate-900">{printedRedemption.item_description}</p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">Status: RETURNED TO BORROWER</p>
              </div>

              <div className="text-[10px] font-sans text-slate-600 space-y-1 mb-6">
                <p>
                  This certifies that the loan obligations associated with Pawn Ticket No. <strong>{printedRedemption.pawn_ticket_number}</strong> have been settled in full.
                </p>
                <p>
                  The pawned article has been physically returned to the borrower in acceptable condition with no remaining claims against the pawnshop.
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 text-center text-xs font-sans pt-6 border-t border-slate-800">
                <div>
                  <div className="border-t border-slate-800 pt-1 font-bold">{printedRedemption.released_by_name || 'Authorized Staff'}</div>
                  <span className="text-[9px] text-slate-400">Vault Custodian / Releasing Officer</span>
                </div>
                <div>
                  <div className="border-t border-slate-800 pt-1 font-bold">{printedRedemption.borrower_name}</div>
                  <span className="text-[9px] text-slate-400">Borrower's Signature (Received Item)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
