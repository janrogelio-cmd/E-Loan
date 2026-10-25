import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { formatPHP, formatDatePH } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../types';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RotateCcw,
  CreditCard,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const Notifications: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam) setTypeFilter(typeParam);
  }, [location.search]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications', {
        params: { type: typeFilter || undefined, limit: 100 }
      });
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [typeFilter]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Error marking as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read');
    }
  };

  const handleTriggerScheduler = async () => {
    try {
      setGenerating(true);
      await api.post('/notifications/generate');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to trigger notification job');
    } finally {
      setGenerating(false);
    }
  };

  const filterTabs = [
    { label: 'All Alerts', value: '' },
    { label: 'Due Tomorrow', value: 'due_tomorrow', color: 'text-amber-600' },
    { label: 'Due Today', value: 'due_today', color: 'text-orange-600' },
    { label: 'Overdue Accounts', value: 'overdue', color: 'text-rose-600' },
    { label: 'Settled & Paid', value: 'fully_paid', color: 'text-emerald-600' },
    { label: 'Awaiting Redemption', value: 'awaiting_redemption', color: 'text-purple-600' },
  ];

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'due_tomorrow':
        return <Calendar className="w-5 h-5 text-amber-500" />;
      case 'due_today':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'fully_paid':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'awaiting_redemption':
        return <RotateCcw className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Bell className="w-7 h-7 text-amber-500" />
            <span>Automated Due-Date & Overdue Notifications</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Server-side scheduled reminders (Asia/Manila GMT+8) with idempotency duplicate prevention.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Mark All Read</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleTriggerScheduler}
              disabled={generating}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#0B192C] hover:bg-[#152B4B] text-amber-300 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-950/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Running Cron Job...' : 'Run Scheduled Reminders Now'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTypeFilter(tab.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              typeFilter === tab.value
                ? 'bg-[#0B192C] text-amber-300 shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Checking notification scheduler records...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No notifications found under this filter category.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 rounded-2xl border transition-all ${
                n.is_read === 0
                  ? 'bg-white border-amber-300/80 shadow-sm ring-1 ring-amber-400/20'
                  : 'bg-white/80 border-slate-200/80 text-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 mt-0.5 shrink-0">
                    {getNotifIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-extrabold text-slate-900">{n.title}</h4>
                      {n.is_read === 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 uppercase">
                        {n.type.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-2 whitespace-pre-line leading-relaxed font-sans">
                      {n.message}
                    </p>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-3">
                      <span>Scheduled for: <strong className="text-slate-600">{formatDatePH(n.scheduled_date)}</strong></span>
                      <span>•</span>
                      <span>Recorded: {formatDatePH(n.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2 shrink-0">
                  {n.loan_id && (
                    <button
                      onClick={() => navigate('/loans')}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#0B192C] text-amber-300 text-xs font-bold hover:bg-[#152B4B] transition-colors"
                    >
                      <span>Review Account</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {n.is_read === 0 && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
