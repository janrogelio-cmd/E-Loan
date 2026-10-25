import React, { useState, useEffect } from 'react';
import api, { formatPHP, formatDatePH } from '../utils/api';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  Coins,
  TrendingUp,
  AlertTriangle,
  Gem,
  CheckCircle2,
  Filter
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('collections');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/reports', {
        params: { type: reportType, startDate, endDate }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const exportToCSV = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `eloan_report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reportOptions = [
    { id: 'collections', label: 'Payment Collections Ledger' },
    { id: 'daily-releases', label: 'Disbursed Emergency Loans' },
    { id: 'outstanding', label: 'Active Outstanding Balances' },
    { id: 'interest-income', label: 'Earned Interest & Fee Income' },
    { id: 'overdue', label: 'Overdue & Delinquent Accounts' },
    { id: 'pawned-inventory', label: 'Held Pawn Collateral Inventory' },
    { id: 'fully-paid', label: 'Settled Loans & Redemptions' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-7 h-7 text-amber-500" />
            <span>Financial Reporting & Audit Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Exportable Philippine lending portfolio, interest yield, collections, and custody ledgers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportToCSV}
            disabled={data.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#0B192C] hover:bg-[#152B4B] text-amber-300 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-950/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Selector & Date Range Filter */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            {reportOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Period From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Period To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Report Data Table */}
      <div className="printable-area bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
            {reportOptions.find((o) => o.id === reportType)?.label} ({data.length} records)
          </span>
          <span className="text-xs text-slate-400">
            Currency: Philippine Peso (PHP ₱)
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Generating report data...</div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No records found for the selected period.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="py-3 px-4 capitalize">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    {Object.entries(row).map(([k, v], cellIdx) => (
                      <td key={cellIdx} className="py-3 px-4 font-mono">
                        {typeof v === 'number' && (k.includes('amount') || k.includes('balance') || k.includes('income') || k.includes('collected') || k.includes('principal') || k.includes('value'))
                          ? formatPHP(v as number)
                          : String(v ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
