import React, { useState } from 'react';
import { Bell, Check, Info, AlertTriangle, MessageSquare, X } from 'lucide-react';
import { NotificationEntry, UserRole } from '../types';

interface NotificationBellProps {
  notifications: NotificationEntry[];
  currentRole: UserRole;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectRequest: (requestId: string) => void;
}

export default function NotificationBell({
  notifications,
  currentRole,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectRequest
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  // System admin sees all notifications. Others see notifications relevant to their role
  const roleNotifications = notifications.filter(n => 
    currentRole === UserRole.SYSTEM_ADMIN || n.recipientRole === currentRole || n.recipientRole === 'All'
  );

  const unreadCount = roleNotifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (n: NotificationEntry) => {
    onMarkAsRead(n.id);
    onSelectRequest(n.requestId);
    setIsOpen(false);
  };

  return (
    <div className="relative" id="notification-bell-container">
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-blue-600 focus:outline-none transition-colors duration-150 rounded-full hover:bg-slate-100"
        title="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span 
            id="notification-badge"
            className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-rose-600 rounded-full scale-90"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          id="notification-dropdown"
          className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
        >
          <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-slate-800 text-sm">Notifications ({unreadCount} unread)</h4>
            </div>
            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={onMarkAllAsRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {roleNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No notifications for your current role.
              </div>
            ) : (
              roleNotifications.map(notification => (
                <div
                  id={`notification-item-${notification.id}`}
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                    !notification.isRead ? 'bg-blue-50/30 font-medium' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-0.5 shrink-0">
                    {notification.type === 'escalation' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : notification.type === 'reminder' ? (
                      <Info className="w-5 h-5 text-amber-500" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-normal break-words">
                      {notification.text}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400 font-mono">{notification.date}</span>
                      {!notification.isRead && (
                        <button
                          id={`mark-read-btn-${notification.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                        >
                          <Check className="w-3 h-3" /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">Filtered as role: {currentRole}</p>
          </div>
        </div>
      )}
    </div>
  );
}
