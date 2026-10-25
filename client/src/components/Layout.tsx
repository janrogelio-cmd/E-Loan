import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  LayoutDashboard,
  Users,
  Coins,
  Gem,
  CreditCard,
  Receipt as ReceiptIcon,
  RotateCcw,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [awaitingCount, setAwaitingCount] = useState(0);

  const fetchBadges = async () => {
    try {
      const [notifRes, awaitRes] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/redemptions/awaiting')
      ]);
      setUnreadNotifications(notifRes.data.count || 0);
      setAwaitingCount(awaitRes.data.length || 0);
    } catch (err) {
      console.error('Failed to fetch badge counters');
    }
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Borrowers', path: '/borrowers', icon: Users },
    { label: 'Emergency Loans', path: '/loans', icon: Coins },
    { label: 'Pawned Collateral', path: '/collateral', icon: Gem },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Receipts', path: '/receipts', icon: ReceiptIcon },
    { 
      label: 'Jewelry Redemption', 
      path: '/redemption', 
      icon: RotateCcw, 
      badge: awaitingCount > 0 ? awaitingCount : null,
      badgeColor: 'bg-amber-500 text-slate-900'
    },
    { 
      label: 'Notifications', 
      path: '/notifications', 
      icon: Bell, 
      badge: unreadNotifications > 0 ? unreadNotifications : null,
      badgeColor: 'bg-rose-500 text-white'
    },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    ...(isAdmin ? [{ label: 'Settings & Logs', path: '/settings', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-gradient-to-b from-[#0B192C] via-[#0F223D] to-[#0A1628] text-white border-r border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-wider">
              ₱
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                E-LOAN & PAWN
              </h1>
              <p className="text-[11px] font-medium tracking-wider uppercase text-amber-400">
                Lending Management
              </p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
              {user?.fullName.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-100">{user?.fullName}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {user?.role === 'admin' ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="w-2.5 h-2.5 mr-1" /> Administrator
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <UserCheck className="w-2.5 h-2.5 mr-1" /> Staff / Cashier
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shadow-inner'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${item.badgeColor || 'bg-amber-500 text-slate-900'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-2">
            <span>PH Time (GMT+8)</span>
            <span className="font-mono text-[11px] text-amber-400/90 font-medium">Asia/Manila</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-72 bg-[#0B192C] text-white z-10 border-r border-slate-800">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                  ₱
                </div>
                <span className="font-bold text-base text-white">E-Loan & Pawn</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm ${
                      active ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-900">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-bold tracking-widest uppercase text-slate-500">
                Philippine Lending & Pawn Operations
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Quick Notification Bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="System Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white animate-pulse">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            {/* User Pill */}
            <div className="hidden md:flex items-center space-x-3 pl-3 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{user?.fullName}</p>
                <p className="text-[11px] text-amber-600 font-semibold capitalize">{user?.role} Access</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0B192C] text-amber-400 font-bold flex items-center justify-center text-xs shadow-xs">
                {user?.fullName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/80">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
