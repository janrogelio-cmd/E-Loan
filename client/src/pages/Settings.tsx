import React, { useState, useEffect } from 'react';
import api, { formatDatePH } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Shield,
  Users,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Lock,
  History
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'business' | 'users' | 'audit'>('business');
  const [settings, setSettings] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New User Form
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'staff'
  });
  const [userMsg, setUserMsg] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [setRes, usersRes, auditRes] = await Promise.all([
        api.get('/dashboard/settings'),
        api.get('/auth/users'),
        api.get('/dashboard/audit-logs')
      ]);
      setSettings(setRes.data);
      setUsers(usersRes.data);
      setAuditLogs(auditRes.data.data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/dashboard/settings', settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', newUser);
      setUserMsg('User account created successfully!');
      setNewUser({ username: '', password: '', fullName: '', role: 'staff' });
      fetchSettings();
      setTimeout(() => setUserMsg(''), 3000);
    } catch (err: any) {
      setUserMsg(err.response?.data?.error || 'Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <SettingsIcon className="w-7 h-7 text-amber-500" />
            <span>Business Settings & System Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            System parameterization, cashier authorization, and immutable audit logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('business')}
          className={`pb-3 transition-all border-b-2 ${
            activeTab === 'business'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Company & Financial Defaults
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition-all border-b-2 ${
            activeTab === 'users'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff & Role Accounts
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 transition-all border-b-2 ${
            activeTab === 'audit'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          System Audit Logs
        </button>
      </div>

      {/* Tab 1: Business Settings */}
      {activeTab === 'business' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-2xl">
          {savedSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Business parameters saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Registered Name</label>
              <input
                type="text"
                value={settings.business_name || ''}
                onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Contact Phone</label>
                <input
                  type="text"
                  value={settings.business_contact || ''}
                  onChange={(e) => setSettings({ ...settings, business_contact: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={settings.business_email || ''}
                  onChange={(e) => setSettings({ ...settings, business_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Office Address</label>
              <input
                type="text"
                value={settings.business_address || ''}
                onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency Code</label>
                <input
                  type="text"
                  disabled
                  value={settings.currency || 'PHP'}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Operating Time Zone</label>
                <input
                  type="text"
                  disabled
                  value={settings.timezone || 'Asia/Manila'}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.default_interest_rate || '10'}
                  onChange={(e) => setSettings({ ...settings, default_interest_rate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Loan ID Prefix</label>
                <input
                  type="text"
                  value={settings.loan_id_prefix || 'LN'}
                  onChange={(e) => setSettings({ ...settings, loan_id_prefix: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pawn Ticket Prefix</label>
                <input
                  type="text"
                  value={settings.pawn_ticket_prefix || 'PT'}
                  onChange={(e) => setSettings({ ...settings, pawn_ticket_prefix: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Receipt Prefix</label>
                <input
                  type="text"
                  value={settings.receipt_prefix || 'RCT'}
                  onChange={(e) => setSettings({ ...settings, receipt_prefix: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-amber-300 font-bold hover:bg-[#152B4B] shadow-sm flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Business Parameters</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Users Management */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs h-fit">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add New Staff / Cashier</h3>
            <p className="text-xs text-slate-500 mb-4">Grant role-based credentials for lending operations.</p>

            {userMsg && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                {userMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan De La Cruz"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. juancashier"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="staff">Staff / Cashier</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-[#0B192C] text-amber-300 font-bold rounded-xl hover:bg-[#152B4B] shadow-sm"
              >
                Create Account
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-700">
              Authorized System Operators ({users.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="py-3 px-4 font-mono">{u.username}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 font-semibold">Active</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDatePH(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: System Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Immutable Action Log ({auditLogs.length} events recorded)
            </span>
            <span className="text-xs text-slate-400">Strictly append-only audit trail</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{log.created_at}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-600">{log.entity_type}</td>
                    <td className="py-2.5 px-4 font-bold text-amber-900">{log.entity_id}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-sans font-semibold">{log.user_name || 'System'}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
