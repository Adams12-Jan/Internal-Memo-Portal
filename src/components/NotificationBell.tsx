import React, { useState } from 'react';
import { Bell, Check, Info, AlertTriangle, MessageSquare, X, Send } from 'lucide-react';
import { NotificationEntry, UserRole, CashAdvanceRequest } from '../types';

interface NotificationBellProps {
  notifications: NotificationEntry[];
  advances: CashAdvanceRequest[];
  currentRole: UserRole;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectRequest: (requestId: string) => void;
  onSendCustomAlert: (
    recipientRole: UserRole | 'All',
    text: string,
    requestId: string,
    type: 'reminder' | 'approval_required' | 'status_change' | 'escalation'
  ) => void;
}

export default function NotificationBell({
  notifications,
  advances,
  currentRole,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectRequest,
  onSendCustomAlert
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'inbox' | 'compose'>('inbox');
  
  // Custom alert compose states
  const [recipient, setRecipient] = useState<UserRole | 'All'>(UserRole.ADMIN_OFFICER);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [alertType, setAlertType] = useState<'reminder' | 'approval_required' | 'status_change' | 'escalation'>('reminder');
  const [alertText, setAlertText] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  // System admin sees all notifications. Others see notifications relevant to their role
  const roleNotifications = notifications.filter(n => 
    currentRole === UserRole.SYSTEM_ADMIN || n.recipientRole === currentRole || n.recipientRole === 'All'
  );

  const unreadCount = roleNotifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (n: NotificationEntry) => {
    onMarkAsRead(n.id);
    if (n.requestId) {
      onSelectRequest(n.requestId);
    }
    setIsOpen(false);
  };

  const messageTemplates = [
    { label: "Correction Needed", text: "Please review and fix incorrect retirement receipts or missing invoice vouchers." },
    { label: "Payment Processed", text: "Finance Desk has disbursed matching funds. Check your bank accounts or sign settlement receipt." },
    { label: "Compliance Issue", text: "Internal Control flagged expenditures discrepancy. Please upload additional evidence." },
    { label: "Budget Review", text: "The Executive Office requires more project justification before approving this fund request." },
    { label: "General Advisory", text: "Reminder: Cash retirement must occur within 14 days of funds dispersion." }
  ];

  return (
    <div className="relative" id="notification-bell-container">
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-650 hover:text-blue-600 focus:outline-none transition-colors duration-150 rounded-full hover:bg-slate-100 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-800 cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-5.5 h-5.5" />
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
          className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-150 z-50 overflow-hidden text-left"
        >
          {/* Header segment with dual navigation tabs */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600 animate-pulse" />
                <h4 className="font-bold text-slate-850 text-sm">Corporate Alerts System</h4>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* View selectors */}
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => { setActiveSubView('inbox'); setSuccessMsg(false); }}
                className={`flex-1 py-1 px-2.5 rounded-md text-center transition-all cursor-pointer ${activeSubView === 'inbox' ? 'bg-white shadow-xs text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Inbox ({unreadCount} unread)
              </button>
              <button
                type="button"
                onClick={() => { setActiveSubView('compose'); setSuccessMsg(false); }}
                className={`flex-1 py-1 px-2.5 rounded-md text-center transition-all cursor-pointer ${activeSubView === 'compose' ? 'bg-white shadow-xs text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                📢 Broadcast Alert
              </button>
            </div>
          </div>

          {activeSubView === 'inbox' ? (
            <>
              {unreadCount > 0 && (
                <div className="px-4 py-2 bg-slate-50/50 flex justify-end border-b border-slate-100">
                  <button
                    id="mark-all-read-btn"
                    onClick={onMarkAllAsRead}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    💡 Mark whole inbox as read
                  </button>
                </div>
              )}
              
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {roleNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">
                    No active feed alerts for role: <span className="font-bold text-slate-500">{currentRole}</span>
                  </div>
                ) : (
                  roleNotifications.map(notification => (
                    <div
                      id={`notification-item-${notification.id}`}
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                        !notification.isRead ? 'bg-blue-50/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mt-0.5 shrink-0 animate-bounce">
                        {notification.type === 'escalation' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : notification.type === 'reminder' ? (
                          <Info className="w-5 h-5 text-amber-500" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 leading-normal break-words font-medium">
                          {notification.text}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-slate-400 font-mono font-medium">{notification.date}</span>
                          {!notification.isRead && (
                            <button
                              id={`mark-read-btn-${notification.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead(notification.id);
                              }}
                              className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="p-4 space-y-3.5 max-h-[440px] overflow-y-auto font-sans">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block font-mono">
                  1. Target Recipient Audience
                </span>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value={UserRole.ADMIN_OFFICER}>Initiator (Admin Officer)</option>
                  <option value={UserRole.HEAD_OF_ADMIN}>Head of Administration</option>
                  <option value={UserRole.INTERNAL_CONTROL}>Internal Control Officer</option>
                  <option value={UserRole.FINANCE_OFFICER}>Finance Officer</option>
                  <option value={UserRole.EXECUTIVE_OFFICE}>Executive Office</option>
                  <option value={UserRole.SYSTEM_ADMIN}>System Administrator</option>
                  <option value="All">All Corporate Staff Roles</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block font-mono">
                  2. Related Cash Advance (Context)
                </span>
                <select
                  value={selectedReqId}
                  onChange={(e) => setSelectedReqId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">No request reference (General Alert)</option>
                  {advances.map(adv => (
                    <option key={adv.id} value={adv.id}>
                      {adv.referenceNumber} - {adv.staffName} ({adv.purpose.slice(0, 18)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block font-mono">
                  3. Alarm Severity Type
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAlertType('reminder')}
                    className={`p-1.5 border rounded-lg text-center transition-all cursor-pointer ${alertType === 'reminder' ? 'bg-amber-50 border-amber-300 text-amber-700 font-extrabold' : 'bg-white border-slate-205 text-slate-600 hover:bg-slate-50'}`}
                  >
                    🔔 Info / Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertType('status_change')}
                    className={`p-1.5 border rounded-lg text-center transition-all cursor-pointer ${alertType === 'status_change' ? 'bg-blue-50 border-blue-300 text-blue-700 font-extrabold' : 'bg-white border-slate-205 text-slate-600 hover:bg-slate-50'}`}
                  >
                    💬 Status Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertType('approval_required')}
                    className={`p-1.5 border rounded-lg text-center transition-all cursor-pointer ${alertType === 'approval_required' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold' : 'bg-white border-slate-205 text-slate-600 hover:bg-slate-50'}`}
                  >
                    ⚡ Action Needed
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertType('escalation')}
                    className={`p-1.5 border rounded-lg text-center transition-all cursor-pointer ${alertType === 'escalation' ? 'bg-rose-50 border-rose-300 text-rose-700 font-extrabold' : 'bg-white border-slate-205 text-slate-600 hover:bg-slate-50'}`}
                  >
                    ⚠️ Escalation Alert
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block font-mono">
                    4. Message Content
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">Template Assisted</span>
                </div>
                
                {/* Templates Quick click list */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 space-y-1.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">💡 CLICK QUICK TEMPLATES</p>
                  <div className="flex flex-wrap gap-1">
                    {messageTemplates.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAlertText(tmpl.text);
                        }}
                        className="text-[9px] bg-white border border-slate-200 text-slate-700 hover:border-blue-400 px-1.5 py-0.5 rounded transition-transform active:scale-95 text-left cursor-pointer font-bold hover:text-blue-600"
                        title={tmpl.text}
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={alertText}
                  onChange={(e) => setAlertText(e.target.value)}
                  placeholder="Type custom alert message here..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 transition-all text-slate-700 resize-none font-medium leading-relaxed"
                />
              </div>

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[10px] font-bold text-center animate-bounce flex items-center justify-center gap-1">
                  ✓ Alert notification dispatched successfully!
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!alertText.trim()) return;
                  onSendCustomAlert(recipient, alertText.trim(), selectedReqId, alertType);
                  setAlertText('');
                  setSuccessMsg(true);
                  setTimeout(() => {
                    setSuccessMsg(false);
                  }, 3000);
                }}
                disabled={!alertText.trim()}
                className={`w-full py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  alertText.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Alert Notification
              </button>
            </div>
          )}
          
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-bold font-mono">Filtered as role: {currentRole}</p>
          </div>
        </div>
      )}
    </div>
  );
}
