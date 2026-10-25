import React, { useState, useEffect } from 'react';
import api, { formatPHP, formatDatePH } from '../utils/api';
import { Receipt } from '../types';
import {
  Receipt as ReceiptIcon,
  Search,
  Printer,
  Eye,
  X,
  FileCheck,
  Calendar,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

export const Receipts: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/receipts', {
        params: { search, page, limit: 15 }
      });
      setReceipts(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [search, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <ReceiptIcon className="w-7 h-7 text-amber-500" />
            <span>Payment Receipts & Acknowledgments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search, view, print, or reprint official cashier payment receipts and acknowledgments.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Receipt # (e.g. RCT-000001), Borrower name, or Loan ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-800"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Loan / Pawn Ref</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Cashier / Method</th>
                <th className="py-3 px-4">Issued Timestamp</th>
                <th className="py-3 px-4 text-right">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Loading receipts...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No receipts found matching your query.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.receipt_number}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{r.borrower_name}</td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-blue-700 font-bold">{r.loan_ref}</div>
                      {r.pawn_ticket_number && (
                        <div className="text-[10px] text-amber-800 font-semibold">{r.pawn_ticket_number}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700 text-sm">{formatPHP(r.amount_paid)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{formatPHP(r.remaining_balance)}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{r.cashier_name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{r.payment_method}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{r.transaction_date}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedReceipt(r)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 font-bold text-xs transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View / Print</span>
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
          <span>Showing {receipts.length} of {total} receipts</span>
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

      {/* Printable Receipt Dialog */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Action Bar (hidden on print) */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Receipt Preview</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0B192C] text-amber-300 text-xs font-bold shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper */}
            <div className="printable-area border border-slate-300 p-6 rounded-2xl bg-white text-slate-900 font-sans shadow-xs">
              {/* Receipt Header */}
              <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">{selectedReceipt.business_name}</h3>
                <p className="text-[11px] text-slate-500">Metro Manila, Philippines</p>
                <p className="text-[11px] text-slate-500">Tel: +63 912 345 6789</p>
                <div className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded">
                  OFFICIAL PAYMENT ACKNOWLEDGMENT
                </div>
              </div>

              {/* Receipt Meta */}
              <div className="text-xs space-y-1 mb-4 border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold">{selectedReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time:</span>
                  <span className="font-mono">{selectedReceipt.transaction_date} (PHT)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Borrower:</span>
                  <strong className="text-slate-900">{selectedReceipt.borrower_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Reference:</span>
                  <span className="font-mono">{selectedReceipt.loan_ref}</span>
                </div>
                {selectedReceipt.pawn_ticket_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pawn Ticket:</span>
                    <span className="font-mono font-bold text-amber-900">{selectedReceipt.pawn_ticket_number}</span>
                  </div>
                )}
              </div>

              {/* Ledger Calculation Breakdown */}
              <div className="text-xs space-y-1.5 mb-4 border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between text-slate-600">
                  <span>Original Principal:</span>
                  <span className="font-mono">{formatPHP(selectedReceipt.original_principal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Interest & Disclosed Charges:</span>
                  <span className="font-mono">{formatPHP(selectedReceipt.interest_and_fees)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-800 pt-1 border-t border-slate-100">
                  <span>Amount Paid in this Transaction:</span>
                  <span className="font-mono">{formatPHP(selectedReceipt.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Settled to Date:</span>
                  <span className="font-mono">{formatPHP(selectedReceipt.total_paid_to_date)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-amber-950 pt-1">
                  <span>Remaining Outstanding Balance:</span>
                  <span className="font-mono">{formatPHP(selectedReceipt.remaining_balance)}</span>
                </div>
              </div>

              {/* Method & Cashier */}
              <div className="text-[11px] text-slate-500 space-y-0.5 mb-6">
                <div>Payment Method: <strong className="capitalize text-slate-700">{selectedReceipt.payment_method}</strong></div>
                <div>Cashier: <strong className="text-slate-700">{selectedReceipt.cashier_name}</strong></div>
                {selectedReceipt.remarks && (
                  <div>Remarks: <span className="italic">{selectedReceipt.remarks}</span></div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 text-center text-xs pt-4 border-t border-slate-200">
                <div>
                  <div className="border-t border-slate-800 pt-1 font-bold text-[11px]">{selectedReceipt.cashier_name}</div>
                  <span className="text-[9px] text-slate-400">Authorized Cashier</span>
                </div>
                <div>
                  <div className="border-t border-slate-800 pt-1 font-bold text-[11px]">{selectedReceipt.borrower_name}</div>
                  <span className="text-[9px] text-slate-400">Customer Acknowledgment</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-400 mt-6 pt-2 border-t border-dashed border-slate-200">
                Thank you for your payment. Keep this receipt for your records and redemption.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
