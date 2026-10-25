import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Lock, User, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (role: 'admin' | 'cashier') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('cashier');
      setPassword('staff123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070F1E] via-[#0B192C] to-[#152338] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 relative z-10">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0B192C] to-[#1E3A5F] items-center justify-center shadow-xl shadow-slate-950/20 mb-4 border border-amber-500/40">
            <span className="text-2xl font-black text-amber-400">₱</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            E-Loan & Pawnshop
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mt-1">
            Lending & Collateral Operations System
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Republic of the Philippines • Asia/Manila (GMT+8)
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#0B192C] to-[#162C4E] hover:from-[#10243E] hover:to-[#1E3B66] text-amber-300 font-bold text-sm rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Management System'}
          </button>
        </form>

        {/* Quick Demo Credentials Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-[11px] font-bold text-center uppercase tracking-wider text-slate-500 mb-3">
            Quick Demo Logins
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDemoRole('admin')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                username === 'admin'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-400'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin (Full Access)</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('cashier')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                username === 'cashier'
                  ? 'bg-blue-50 border-blue-300 text-blue-900 ring-1 ring-blue-400'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Staff / Cashier</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
