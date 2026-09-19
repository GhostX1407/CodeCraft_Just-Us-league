import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../services/api';
import { AppNotification } from '../../types/domain';
import { Bell, X, CheckCheck, AlertCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

interface NotificationDrawerProps {
  currentRole?: string;
  recipientId?: string;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ currentRole = 'admin', recipientId }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const list = await api.getNotifications(currentRole, recipientId);
      setNotifications(list);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [currentRole, recipientId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentRole, recipientId }),
      });
    } catch {
      // Fallback
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />;
      case 'urgent':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl border border-[#E8E2D9] bg-white hover:bg-[#FAF8F5] text-[#2D231C] transition-colors shadow-xs"
        aria-label="Toggle notifications"
      >
        <Bell className="w-4 h-4 text-[#EA580C]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E8E2D9] transform transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#EA580C]" />
                <h3 className="font-display font-black text-[#2D231C] text-base">Network Alerts</h3>
                <span className="text-[10px] font-mono font-bold bg-[#FFF7ED] text-[#C2410C] px-2 py-0.5 rounded-full border border-[#EA580C]/20 uppercase">
                  {currentRole}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-mono text-[#7D7067] hover:text-[#EA580C] flex items-center gap-1 font-bold"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[#E8E2D9]/40 text-[#7D7067]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-[#7D7067] text-center p-6 space-y-2">
                  <Bell className="w-8 h-8 text-[#E8E2D9]" />
                  <p className="font-bold text-sm">All clear. No notifications.</p>
                  <p className="text-xs text-[#A89F91]">Role-specific emergency dispatch and admission alerts will stream here.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={clsx(
                      'p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5',
                      n.read
                        ? 'border-[#E8E2D9] bg-white opacity-70 hover:opacity-100'
                        : 'border-[#EA580C]/30 bg-[#FFF7ED]/50 shadow-xs'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(n.severity)}
                        <h4 className="font-bold text-xs text-[#2D231C] leading-snug">{n.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-[#A89F91] shrink-0">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#524438] leading-relaxed pl-6">{n.message}</p>
                    {n.caseId && (
                      <div className="pl-6 pt-1 flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-[#E8E2D9] text-[#7D7067]">
                          Case {n.caseId}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
