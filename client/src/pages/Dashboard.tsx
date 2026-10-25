import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { formatPHP, formatDatePH } from '../utils/api';
import { DashboardStats } from '../types';
import {
  Coins,
  TrendingUp,
  AlertTriangle,
  Clock,
  Gem,
  RotateCcw,
  Receipt,
  ArrowUpRight,
  Calendar,
  Phone,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ overdue: any[]; dueToday: any[]; dueTomorrow: any[] }>({
    overdue: [],
    dueToday: [],
    dueTomorrow: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, transRes, alertsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-transactions'),
        api.get('/dashboard/alerts')
      ]);
      setStats(statsRes.data);
      setRecentTransactions(transRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading Philippine Operations Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Executive Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time Philippine Peso (PHP ₱) portfolio, pawn collateral custody, and due-date monitoring.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Live Data</span>
          </button>
          <button
            onClick={() => navigate('/loans?action=new')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#0B192C] hover:bg-[#152B4B] text-amber-300 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-950/20"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>New Emergency Loan</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Loans */}
        <div
          onClick={() => navigate('/loans?status=active')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Loans</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">{stats?.activeLoans ?? 0}</p>
          <div className="flex items-center space-x-1 mt-1 text-[11px] font-semibold text-blue-600">
            <span>View active portfolio</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Principal Disbursed */}
        <div
          onClick={() => navigate('/loans')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-400 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Disbursed Principal</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <span className="font-black text-xs">₱</span>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">{formatPHP(stats?.totalPrincipal)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Total capital released</p>
        </div>

        {/* Total Outstanding Balance */}
        <div
          onClick={() => navigate('/loans?status=active')}
          className="bg-white p-5 rounded-2xl border border-amber-300/60 bg-gradient-to-br from-white to-amber-50/30 shadow-xs hover:border-amber-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Outstanding Balance</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 text-amber-950">
            {formatPHP(stats?.totalOutstanding)}
          </p>
          <p className="text-[11px] font-medium text-amber-700 mt-1">Principal + interest balance</p>
        </div>

        {/* Total Collections */}
        <div
          onClick={() => navigate('/payments')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Collected</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-3">{formatPHP(stats?.totalPayments)}</p>
          <div className="flex items-center space-x-1 mt-1 text-[11px] font-semibold text-emerald-600">
            <span>View payment log</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Interest Earned (Realized) */}
        <div
          onClick={() => navigate('/reports')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Earned Interest</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-900 mt-3">{formatPHP(stats?.totalInterestEarned)}</p>
          <p className="text-[11px] font-medium text-indigo-600 mt-1">Realized income from payments</p>
        </div>
      </div>

      {/* Due Date & Pawn Collateral Monitoring Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Due Tomorrow (CRITICAL) */}
        <div
          onClick={() => navigate('/notifications?type=due_tomorrow')}
          className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-5 rounded-2xl border border-amber-400/80 shadow-xs hover:border-amber-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Due Tomorrow</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-slate-950">
              URGENT
            </span>
          </div>
          <p className="text-3xl font-black text-amber-950 mt-3">{stats?.dueTomorrow ?? 0}</p>
          <p className="text-[11px] text-amber-800 font-medium mt-1">Scheduled reminders sent</p>
        </div>

        {/* Due Today */}
        <div
          onClick={() => navigate('/notifications?type=due_today')}
          className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-5 rounded-2xl border border-orange-400/80 shadow-xs hover:border-orange-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-950">Due Today</span>
            <div className="p-2 rounded-xl bg-orange-100 text-orange-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-orange-950 mt-3">{stats?.dueToday ?? 0}</p>
          <p className="text-[11px] text-orange-800 font-medium mt-1">Maturing on Manila date</p>
        </div>

        {/* Overdue Loans */}
        <div
          onClick={() => navigate('/loans?status=overdue')}
          className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-5 rounded-2xl border border-rose-300 shadow-xs hover:border-rose-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-950">Overdue Accounts</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-700 mt-3">{stats?.overdueLoans ?? 0}</p>
          <p className="text-[11px] text-rose-700 font-medium mt-1">Requires collector follow-up</p>
        </div>

        {/* Pawned Jewelry Held */}
        <div
          onClick={() => navigate('/collateral')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-400 hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pawned Jewelry</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Gem className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3">{stats?.pawnedItems ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Items safely in vault custody</p>
        </div>

        {/* Awaiting Redemption */}
        <div
          onClick={() => navigate('/redemption')}
          className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 rounded-2xl border border-emerald-300 shadow-xs hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Ready For Pickup</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-800 mt-3">{stats?.awaitingRedemption ?? 0}</p>
          <p className="text-[11px] text-emerald-800 font-medium mt-1">Fully paid, awaiting jewelry release</p>
        </div>
      </div>

      {/* Priority Action Alerts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span>Priority Attention & Reminders</span>
          </h2>
          <span className="text-xs text-slate-500">Scheduled checks run daily at 7:00 AM (Asia/Manila)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Due Tomorrow Card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Loans Due Tomorrow</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-900">
                  {alerts.dueTomorrow.length}
                </span>
              </div>

              {alerts.dueTomorrow.length === 0 ? (
                <div className="py-6 text-center text-xs text-amber-800/80">
                  <CheckCircle className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                  No loans maturing tomorrow.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.dueTomorrow.slice(0, 3).map((l: any) => (
                    <div key={l.id} className="bg-white/90 p-3 rounded-xl border border-amber-200/80 text-xs">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{l.borrower_name}</span>
                        <span className="text-amber-800">{formatPHP(l.outstanding_balance)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 mt-1">
                        <span>{l.loan_id}</span>
                        <span className="flex items-center text-slate-600">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          {l.contact_number || 'No contact'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {alerts.dueTomorrow.length > 0 && (
              <button
                onClick={() => navigate('/notifications?type=due_tomorrow')}
                className="w-full mt-3 py-2 text-center text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-xl transition-colors"
              >
                Review All Due Tomorrow Notifications
              </button>
            )}
          </div>

          {/* Due Today Card */}
          <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-orange-950 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Loans Due Today</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-200 text-orange-950">
                  {alerts.dueToday.length}
                </span>
              </div>

              {alerts.dueToday.length === 0 ? (
                <div className="py-6 text-center text-xs text-orange-800/80">
                  <CheckCircle className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                  No loans due today.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.dueToday.slice(0, 3).map((l: any) => (
                    <div key={l.id} className="bg-white/90 p-3 rounded-xl border border-orange-200/80 text-xs">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{l.borrower_name}</span>
                        <span className="text-orange-900">{formatPHP(l.outstanding_balance)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 mt-1">
                        <span>{l.loan_id}</span>
                        <span className="flex items-center text-slate-600">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          {l.contact_number || 'No contact'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {alerts.dueToday.length > 0 && (
              <button
                onClick={() => navigate('/loans?status=active')}
                className="w-full mt-3 py-2 text-center text-xs font-bold text-orange-950 bg-orange-200/80 hover:bg-orange-300 rounded-xl transition-colors"
              >
                Collect Payments Today
              </button>
            )}
          </div>

          {/* Overdue Accounts Card */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-950 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Overdue Accounts</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-200 text-rose-900">
                  {alerts.overdue.length}
                </span>
              </div>

              {alerts.overdue.length === 0 ? (
                <div className="py-6 text-center text-xs text-rose-800/80">
                  <CheckCircle className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                  No overdue loan accounts!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.overdue.slice(0, 3).map((l: any) => (
                    <div key={l.id} className="bg-white/90 p-3 rounded-xl border border-rose-200/80 text-xs">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{l.borrower_name}</span>
                        <span className="text-rose-700">{formatPHP(l.outstanding_balance)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 mt-1">
                        <span className="text-rose-600 font-semibold">{l.days_overdue} days past due</span>
                        <span>{l.loan_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {alerts.overdue.length > 0 && (
              <button
                onClick={() => navigate('/loans?status=overdue')}
                className="w-full mt-3 py-2 text-center text-xs font-bold text-rose-950 bg-rose-200/80 hover:bg-rose-300 rounded-xl transition-colors"
              >
                Manage Overdue Loans
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Payment Transactions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live repayments recorded with automated receipt generation</p>
          </div>
          <button
            onClick={() => navigate('/payments')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
          >
            <span>View All Payments</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Borrower Name</th>
                <th className="py-3 px-4">Loan ID</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Allocation (Fees / Int / Prin)</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Date / Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{tx.payment_reference}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{tx.borrower_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{tx.loan_ref}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{formatPHP(tx.amount)}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      ₱{tx.fees_applied} / ₱{tx.interest_applied} / ₱{tx.principal_applied}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatPHP(tx.remaining_balance)}</td>
                    <td className="py-3 px-4 text-slate-500">
                      <div>{formatDatePH(tx.payment_date)}</div>
                      <div className="text-[10px] text-slate-400">{tx.cashier_name || 'Staff'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
