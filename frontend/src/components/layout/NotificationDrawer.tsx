import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../services/api';
import { subscribeToPushNotifications } from '../../services/notificationBus';
import { AppNotification } from '../../types/domain';
import { NotificationComposerModal } from './NotificationComposerModal';
import { Bell, X, CheckCheck, Trash2, AlertTriangle, Info, ShieldAlert, Send } from 'lucide-react';
import clsx from 'clsx';

interface NotificationDrawerProps {
  currentRole?: string;
  recipientId?: string;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ currentRole = 'admin', recipientId }) => {
  const [open, setOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsub = subscribeToPushNotifications(currentRole, recipientId, (list) => {
      setNotifications(list);
    });
    return unsub;
  }, [currentRole, recipientId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead(currentRole, recipientId);
    } catch {
      // Fallback
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    await api.clearAllNotifications();
    setNotifications([]);
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
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="px-2.5 py-1.5 rounded-xl border border-[#EA580C]/30 bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-2xs"
          title="Dispatch Real Notification Locally"
        >
          <Send className="w-3.5 h-3.5 text-[#EA580C]" />
          <span className="hidden sm:inline">Send Alert</span>
        </button>

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
      </div>

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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="text-xs font-mono text-[#EA580C] hover:bg-[#FFF7ED] flex items-center gap-1 font-bold px-2 py-1 rounded-lg border border-[#EA580C]/30 transition-colors"
                  title="Dispatch a real notification locally"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-mono text-[#7D7067] hover:text-red-600 flex items-center gap-1 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-mono text-[#7D7067] hover:text-[#EA580C] flex items-center gap-1 font-bold px-2 py-1 rounded-lg hover:bg-white"
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
                <div className="h-64 flex flex-col items-center justify-center text-[#7D7067] text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9] flex items-center justify-center text-[#A89F91]">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#2D231C]">No Active Notifications</p>
                    <p className="text-xs text-[#7D7067] max-w-xs mt-1">
                      No fake or automated notifications. Only real alerts that you dispatch locally will appear here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComposerOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#EA580C] text-white text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-[#C2410C] transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Real Alert Now</span>
                  </button>
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
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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

      {/* Real Local Notification Composer Modal */}
      <NotificationComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        defaultRole={currentRole}
        onSuccess={() => {
          setOpen(true);
        }}
      />
    </>
  );
};

