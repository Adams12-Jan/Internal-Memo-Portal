import React, { useState, useEffect } from 'react';
import { 
  FileText, Clock, CheckCircle2, XCircle, CreditCard, Banknote, 
  HelpCircle, Archive, AlertCircle, ShieldCheck, TrendingUp, Sparkles,
  Users, LogOut, ShieldAlert, KeyRound, Menu, X, Landmark, UserMinus, 
  Sun, Moon, 
  BellRing, ListCollapse, Eye, Filter, RefreshCw, Search
} from 'lucide-react';

import { 
  UserRole, 
  RequestStatus, 
  RetirementStatus, 
  PaymentMethod,
  PaymentDetails,
  ExpenseItem,
  ApprovalHistoryEntry,
  CashAdvanceRequest,
  CashAdvanceRetirement,
  AuditLogEntry,
  NotificationEntry,
  DEPARTMENTS,
  STAFF_MEMBERS
} from './types';

import { 
  getStoredData, 
  saveStoredData, 
  generateRefId, 
  generateRetId,
  getStoredTemplates,
  saveStoredTemplates,
  getStoredSentEmails,
  saveStoredSentEmails,
  getStoredStaffMembers,
  saveStoredStaffMembers
} from './mockData';

import { EmailTemplate, SentEmail } from './types';

// Component Imports
import Dashboard from './components/Dashboard';
import CashAdvanceRequestForm from './components/CashAdvanceRequestForm';
import RequestDetails from './components/RequestDetails';
import RetirementForm from './components/RetirementForm';
import RetirementDetails from './components/RetirementDetails';
import Reports from './components/Reports';
import AuditTrail from './components/AuditTrail';
import NotificationBell from './components/NotificationBell';
import LoginPortal from './components/LoginPortal';
import CrmPortal from './components/CrmPortal';

export default function App() {
  // Global State
  const [advances, setAdvances] = useState<CashAdvanceRequest[]>([]);
  const [retirements, setRetirements] = useState<CashAdvanceRetirement[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('ca_dark_mode') === 'true');

  // Email dynamic templates design states
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [staffMembers, setStaffMembers] = useState<{ name: string; role: UserRole; department: string }[]>([]);

  // Simulation controls
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeUserIdx, setActiveUserIdx] = useState(() => parseInt(localStorage.getItem('ca_session_user_idx') || '0'));
  
  const currentUser = staffMembers[activeUserIdx] || staffMembers[0] || { name: 'John Doe', role: UserRole.ADMIN_OFFICER, department: 'Administration' };

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, requests, retirement, reports, audit, crm
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Focus View states
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRetirementId, setSelectedRetirementId] = useState<string | null>(null);
  const [isInitiatingAdvance, setIsInitiatingAdvance] = useState(false);
  const [isInitiatingRetirement, setIsInitiatingRetirement] = useState(false);

  // Filters within specific lists
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [refSearch, setRefSearch] = useState('');

  // Auto load from LocalStorage on mount
  useEffect(() => {
    const data = getStoredData();
    setAdvances(data.advances);
    setRetirements(data.retirements);
    setLogs(data.logs);
    setNotifications(data.notifications);
    setTemplates(getStoredTemplates());
    setSentEmails(getStoredSentEmails());
    setStaffMembers(getStoredStaffMembers());
  }, []);

  // Sync Dark Mode class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Save changes to localStorage helper
  const handleSaveData = (
    nextAdvances: CashAdvanceRequest[],
    nextRetirements: CashAdvanceRetirement[],
    nextLogs: AuditLogEntry[],
    nextNotifications: NotificationEntry[]
  ) => {
    setAdvances(nextAdvances);
    setRetirements(nextRetirements);
    setLogs(nextLogs);
    setNotifications(nextNotifications);
    saveStoredData({
      advances: nextAdvances,
      retirements: nextRetirements,
      logs: nextLogs,
      notifications: nextNotifications
    });
  };

  // Switch Profiles helper
  const handleSwitchUser = (index: number) => {
    const list = staffMembers.length > 0 ? staffMembers : getStoredStaffMembers();
    if (!list[index]) return;
    setActiveUserIdx(index);
    localStorage.setItem('ca_session_user_idx', String(index));
    // Add an audit log of login
    const userRole = list[index].role;
    const userName = list[index].name;
    const timestamp = getTimestampString();

    const newLog: AuditLogEntry = {
      id: `sys-${Date.now()}`,
      requestReference: 'SYSTEM',
      type: 'System',
      user: userName,
      role: userRole,
      action: 'Switched Active Identity Panel',
      date: timestamp,
      comment: `Identity switched in sandbox panel to act as department role: ${userRole}`
    };

    const nextLogs = [newLog, ...logs];
    handleSaveData(advances, retirements, nextLogs, notifications);
  };

  const handleLoginSuccess = (index: number) => {
    const list = staffMembers.length > 0 ? staffMembers : getStoredStaffMembers();
    if (!list[index]) return;
    
    setActiveUserIdx(index);
    setIsLoggedIn(true);
    localStorage.setItem('ca_session_logged_in', 'true');
    localStorage.setItem('ca_session_user_idx', String(index));

    const userRole = list[index].role;
    const userName = list[index].name;
    const timestamp = getTimestampString();

    const newLog: AuditLogEntry = {
      id: `sys-${Date.now()}`,
      requestReference: 'SYSTEM',
      type: 'System',
      user: userName,
      role: userRole,
      action: 'User Logged In',
      date: timestamp,
      comment: `Session initialized securely on browser desk by ${userName} (${userRole})`
    };
    
    const data = getStoredData();
    const nextLogs = [newLog, ...(data.logs.length > 0 ? data.logs : logs)];
    setLogs(nextLogs);
    saveStoredData({ logs: nextLogs });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('ca_session_logged_in', 'false');
  };

  const sendEmailNotification = (
    templateId: string, 
    refNum: string, 
    actionUser: string, 
    actionRole: string, 
    actionName: string, 
    commentText: string,
    extraFields?: any
  ) => {
    // 1. Find the target template
    const currentTemplates = templates.length > 0 ? templates : getStoredTemplates();
    const tmpl = currentTemplates.find(t => t.id === templateId);
    if (!tmpl) return;

    // 2. Resolve request/retirement record details
    const targetAdv = advances.find(a => a.referenceNumber === refNum || a.id === refNum);
    const staffName = targetAdv ? targetAdv.staffName : (extraFields?.staffName || "John Doe");
    const department = targetAdv ? targetAdv.department : (extraFields?.department || "Administration");
    const purpose = targetAdv ? targetAdv.purpose : (extraFields?.purpose || "Operations funding support");
    const amountRequested = targetAdv ? String(targetAdv.amountRequested) : (extraFields?.amountRequested || "0");
    const expectedRetirementDate = targetAdv ? targetAdv.expectedRetirementDate : "2026-06-25";

    // Resolve payment details if paid
    const paymentMethod = targetAdv?.paymentDetails?.paymentMethod || extraFields?.paymentMethod || "Bank Transfer";
    const paymentReference = targetAdv?.paymentDetails?.paymentReference || extraFields?.paymentReference || "TXN-902381283";
    const amountPaid = targetAdv?.paymentDetails?.amountPaid ? String(targetAdv.paymentDetails.amountPaid) : (extraFields?.amountPaid || amountRequested);
    const proofOfPaymentName = targetAdv?.paymentDetails?.proofOfPaymentName || extraFields?.proofOfPaymentName || "No file uploaded";

    // Resolve retirement details if any
    const retirementId = extraFields?.retirementId || "RET-2026-001";
    const amountAdvanced = extraFields?.amountAdvanced || amountRequested;
    const amountUtilized = extraFields?.amountUtilized || amountRequested;
    const balanceReturned = extraFields?.balanceReturned || "0";
    const statusVal = extraFields?.status || (targetAdv ? targetAdv.currentStatus : "Submitted / Forwarded");

    // 3. Compile helper
    const compile = (text: string) => {
      let res = text;
      res = res.replace(/\{\{referenceNumber\}\}/g, refNum);
      res = res.replace(/\{\{staffName\}\}/g, staffName);
      res = res.replace(/\{\{department\}\}/g, department);
      res = res.replace(/\{\{purpose\}\}/g, purpose);
      res = res.replace(/\{\{amountRequested\}\}/g, amountRequested);
      res = res.replace(/\{\{expectedRetirementDate\}\}/g, expectedRetirementDate);
      res = res.replace(/\{\{paymentMethod\}\}/g, paymentMethod);
      res = res.replace(/\{\{paymentReference\}\}/g, paymentReference);
      res = res.replace(/\{\{amountPaid\}\}/g, amountPaid);
      res = res.replace(/\{\{proofOfPaymentName\}\}/g, proofOfPaymentName);
      res = res.replace(/\{\{appUrl\}\}/g, window.location.origin);
      res = res.replace(/\{\{actionUser\}\}/g, actionUser);
      res = res.replace(/\{\{actionRole\}\}/g, actionRole);
      res = res.replace(/\{\{actionName\}\}/g, actionName);
      res = res.replace(/\{\{comment\}\}/g, commentText || "Reviewed and processed.");
      res = res.replace(/\{\{status\}\}/g, statusVal);
      res = res.replace(/\{\{retirementId\}\}/g, retirementId);
      res = res.replace(/\{\{amountAdvanced\}\}/g, amountAdvanced);
      res = res.replace(/\{\{amountUtilized\}\}/g, amountUtilized);
      res = res.replace(/\{\{balanceReturned\}\}/g, balanceReturned);
      return res;
    };

    const compiledSubject = compile(tmpl.subject);
    const compiledBody = compile(tmpl.body);

    // 4. Resolve recipient
    let rName = staffName;
    let rRole = "Filer / Initiator";
    
    if (templateId === 'cash_advance_submitted') {
      const hoAdmin = (staffMembers.length > 0 ? staffMembers : getStoredStaffMembers()).find(s => s.role === UserRole.HEAD_OF_ADMIN);
      rName = hoAdmin ? hoAdmin.name : "Sarah Jenkins";
      rRole = UserRole.HEAD_OF_ADMIN;
    } else if (templateId === 'cash_advance_reminder') {
      const fin = (staffMembers.length > 0 ? staffMembers : getStoredStaffMembers()).find(s => s.role === UserRole.FINANCE_OFFICER);
      rName = fin ? fin.name : "Robert Finch";
      rRole = UserRole.FINANCE_OFFICER;
    } else if (templateId === 'retirement_submitted') {
      const hoAdmin = (staffMembers.length > 0 ? staffMembers : getStoredStaffMembers()).find(s => s.role === UserRole.HEAD_OF_ADMIN);
      rName = hoAdmin ? hoAdmin.name : "Sarah Jenkins";
      rRole = UserRole.HEAD_OF_ADMIN;
    }

    const rEmail = rName.toLowerCase().replace(/\s+/g, '.') + "@corporate.com";
    const timestamp = new Date().toLocaleString();

    const newMail: SentEmail = {
      id: `em-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      templateId: templateId,
      templateName: tmpl.name,
      recipientEmail: rEmail,
      recipientRole: rRole,
      recipientName: rName,
      subject: compiledSubject,
      body: compiledBody,
      date: timestamp,
      referenceNumber: refNum
    };

    const updatedMails = [newMail, ...sentEmails];
    setSentEmails(updatedMails);
    saveStoredSentEmails(updatedMails);
  };

  // Helper date/time generator
  const getTimestampString = () => {
    const d = new Date();
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toTimeString().split(' ')[0].slice(0, 5);
    return `${dateStr} ${timeStr}`;
  };

  // Automated member tagging via email copied dispatch
  const checkForAndSendTaggedEmails = (commentText: string, refNum: string) => {
    if (!commentText) return;
    const roster = staffMembers.length > 0 ? staffMembers : getStoredStaffMembers();
    roster.forEach(staff => {
      if (commentText.includes(`@${staff.name}`)) {
        const timestamp = new Date().toLocaleString();
        const rEmail = staff.name.toLowerCase().replace(/\s+/g, '.') + "@corporate.com";
        
        const newMail: SentEmail = {
          id: `em-tag-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          templateId: 'user_tagged_notification',
          templateName: 'User Tagged notification',
          recipientEmail: rEmail,
          recipientRole: staff.role,
          recipientName: staff.name,
          subject: `[Tagged Alert] You have been tagged in a memo update (${refNum})`,
          body: `Dear ${staff.name},\n\nYou have been tagged in an internal memo update for request reference: ${refNum} by ${currentUser.name} (${currentUser.role}).\n\n-----------------\nRemarks / Comment text:\n"${commentText}"\n-----------------\n\nKindly audit the memo desk queue or visit the internal portal for necessary action.\n\nRegards,\nAdmin Automated Tagging Desk`,
          date: timestamp,
          referenceNumber: refNum
        };

        setSentEmails(prev => {
          const next = [newMail, ...prev];
          saveStoredSentEmails(next);
          return next;
        });
      }
    });
  };

  // Notifications logic
  const triggerNotification = (
    role: UserRole | 'All',
    text: string,
    requestId: string,
    type: 'reminder' | 'approval_required' | 'status_change' | 'escalation'
  ) => {
    const timestamp = getTimestampString();
    const newNotif: NotificationEntry = {
      id: `nt-${Date.now()}`,
      recipientRole: role,
      text: text,
      date: timestamp,
      isRead: false,
      requestId: requestId,
      type: type
    };
    return newNotif;
  };

  // Clearing notifications helper
  const handleMarkAsRead = (id: string) => {
    const nextNotifs = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    handleSaveData(advances, retirements, logs, nextNotifs);
  };

  const handleMarkAllAsRead = () => {
    const nextNotifs = notifications.map(n => 
      (currentUser.role === UserRole.SYSTEM_ADMIN || n.recipientRole === currentUser.role || n.recipientRole === 'All')
        ? { ...n, isRead: true } 
        : n
    );
    handleSaveData(advances, retirements, logs, nextNotifs);
  };

  const handleSelectRequestDirectly = (requestId: string) => {
    setSelectedRequestId(requestId);
    setSelectedRetirementId(null);
    setIsInitiatingAdvance(false);
    setIsInitiatingRetirement(false);
    setActiveTab('requests');
  };

  // 1. Core CASH ADVANCE REQUEST creation
  const handleAddRequest = (reqMeta: Partial<CashAdvanceRequest>) => {
    const nextId = generateRefId(advances.map(a => a.referenceNumber));
    const timestamp = getTimestampString();

    const newRequest: CashAdvanceRequest = {
      id: nextId,
      referenceNumber: nextId,
      requestDate: reqMeta.requestDate || '2026-06-12',
      staffName: reqMeta.staffName || currentUser.name,
      department: reqMeta.department || currentUser.department,
      purpose: reqMeta.purpose || '',
      amountRequested: reqMeta.amountRequested || 0,
      expectedRetirementDate: reqMeta.expectedRetirementDate || '',
      attachmentName: reqMeta.attachmentName,
      comment: reqMeta.comment,
      currentStatus: reqMeta.currentStatus || RequestStatus.SUBMITTED,
      initiator: currentUser.name,
      approvalHistory: [
        {
          userId: 'usr-initiator',
          userRole: currentUser.role,
          userName: currentUser.name,
          action: reqMeta.currentStatus === RequestStatus.DRAFT ? 'Saved Draft' : 'Submit',
          date: timestamp,
          comment: reqMeta.comment || 'Request set up'
        }
      ]
    };

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      requestReference: nextId,
      type: 'Cash Advance',
      user: currentUser.name,
      role: currentUser.role,
      action: reqMeta.currentStatus === RequestStatus.DRAFT ? 'Created Draft' : 'Submitted Funding Memo',
      date: timestamp,
      comment: reqMeta.purpose
    };

    const nextAdvances = [newRequest, ...advances];
    const nextLogs = [newLog, ...logs];
    
    // Notifications trigger
    let nextNotifs = [...notifications];
    if (newRequest.currentStatus === RequestStatus.SUBMITTED) {
      const alertCap = triggerNotification(
        UserRole.HEAD_OF_ADMIN,
        `New Cash Advance request ${nextId} from ${newRequest.staffName} is awaiting approval. Purpose: ${newRequest.purpose.slice(0, 40)}...`,
        nextId,
        'approval_required'
      );
      nextNotifs = [alertCap, ...nextNotifs];

      // Dispatch real email template
      sendEmailNotification(
        'cash_advance_submitted',
        nextId,
        currentUser.name,
        currentUser.role,
        'Submit Request',
        reqMeta.comment || 'Funding memo initiated',
        {
          staffName: newRequest.staffName,
          department: newRequest.department,
          purpose: newRequest.purpose,
          amountRequested: String(newRequest.amountRequested),
          expectedRetirementDate: newRequest.expectedRetirementDate
        }
      );
    }

    handleSaveData(nextAdvances, retirements, nextLogs, nextNotifs);
    setIsInitiatingAdvance(false);
    alert(newRequest.currentStatus === RequestStatus.DRAFT ? 'Draft saved!' : 'Funding request submitted to Head of Administration approval!');
  };

  // 2. CASH ADVANCE REQUEST Approval Action flow routing
  const handleApprovalAction = (
    action: 'Approve' | 'Reject' | 'Request Clarification' | 'Send to Finance' | 'Pay' | 'Return to Admin' | 'Return for Review' | 'Resubmit',
    commentText: string,
    paymentMeta?: PaymentDetails,
    updatedFields?: Partial<CashAdvanceRequest>,
    signatureSvg?: string
  ) => {
    if (!selectedRequestId) return;
    const timestamp = getTimestampString();

    const nextAdvances = advances.map(req => {
      if (req.id !== selectedRequestId) return req;

      let nextStatus = req.currentStatus;
      let nextHistory = [...req.approvalHistory];

      // Handle Resubmit
      if (action === 'Resubmit' && updatedFields) {
        nextStatus = RequestStatus.PENDING_HEAD_OF_ADMIN;
        nextHistory.push({
          userId: 'usr-action',
          userRole: currentUser.role,
          userName: currentUser.name,
          action: 'Resubmitted Request',
          date: timestamp,
          comment: commentText || 'Resubmitted after corrections'
        });
        return {
          ...req,
          ...updatedFields,
          currentStatus: nextStatus,
          approvalHistory: nextHistory
        };
      }

      // Action updates status according to workflow ladder
      if (action === 'Approve') {
        if (req.currentStatus === RequestStatus.SUBMITTED || req.currentStatus === RequestStatus.PENDING_HEAD_OF_ADMIN) {
          nextStatus = RequestStatus.PENDING_INTERNAL_CONTROL;
        } else if (req.currentStatus === RequestStatus.PENDING_INTERNAL_CONTROL) {
          nextStatus = RequestStatus.PENDING_EXECUTIVE_OFFICE;
        } else if (req.currentStatus === RequestStatus.PENDING_EXECUTIVE_OFFICE) {
          nextStatus = RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE;
        }
      } else if (action === 'Reject') {
        nextStatus = RequestStatus.REJECTED;
      } else if (action === 'Request Clarification') {
        // Keeps status, adds clarification message trace in history
      } else if (action === 'Send to Finance') {
        nextStatus = RequestStatus.AWAITING_FINANCE_PAYMENT;
      } else if (action === 'Return for Review') {
        nextStatus = RequestStatus.REJECTED; // Goes to reject so initiator can handle corrections
      } else if (action === 'Return to Admin') {
        nextStatus = RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE;
      } else if (action === 'Pay' && paymentMeta) {
        nextStatus = RequestStatus.PAID;
      }

      nextHistory.push({
        userId: 'usr-action',
        userRole: currentUser.role,
        userName: currentUser.name,
        action: action as any,
        date: timestamp,
        comment: commentText || `${action} verified`,
        signatureSvg: signatureSvg
      });

      const updatedRequest: CashAdvanceRequest = {
        ...req,
        currentStatus: nextStatus,
        approvalHistory: nextHistory,
        paymentDetails: paymentMeta ? paymentMeta : req.paymentDetails
      };

      // Set date tracker if sending to finance for automated reminders simulation trigger
      if (action === 'Send to Finance') {
        updatedRequest.daysAwaitingPaymentSince = '2026-06-12';
      }

      return updatedRequest;
    });

    // Generate audit logs
    const activeReq = advances.find(r => r.id === selectedRequestId)!;
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      requestReference: selectedRequestId,
      type: 'Cash Advance',
      user: currentUser.name,
      role: currentUser.role,
      action: `${action} completed`,
      date: timestamp,
      comment: commentText
    };

    // Calculate down stream Notifications
    let nextNotifs = [...notifications];
    const targetReq = nextAdvances.find(r => r.id === selectedRequestId)!;
    
    if (action === 'Reject') {
      const informInt = triggerNotification(
        UserRole.ADMIN_OFFICER,
        `REJECTED: Funding memo ${selectedRequestId} has been rejected by ${currentUser.name}. Reason: ${commentText}`,
        selectedRequestId,
        'status_change'
      );
      nextNotifs = [informInt, ...nextNotifs];
    } else if (action === 'Request Clarification') {
      const informInt = triggerNotification(
        UserRole.ADMIN_OFFICER,
        `Clarification required on ${selectedRequestId} by ${currentUser.name}: ${commentText}`,
        selectedRequestId,
        'status_change'
      );
      nextNotifs = [informInt, ...nextNotifs];
    } else if (action === 'Approve') {
      let notifyWho: UserRole = UserRole.HEAD_OF_ADMIN;
      if (targetReq.currentStatus === RequestStatus.PENDING_INTERNAL_CONTROL) notifyWho = UserRole.INTERNAL_CONTROL;
      if (targetReq.currentStatus === RequestStatus.PENDING_EXECUTIVE_OFFICE) notifyWho = UserRole.EXECUTIVE_OFFICE;
      if (targetReq.currentStatus === RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE) notifyWho = UserRole.HEAD_OF_ADMIN;

      const appNotf = triggerNotification(
        notifyWho,
        `Cash Advance ${selectedRequestId} approved by ${currentUser.name}. Pending your level verification.`,
        selectedRequestId,
        'approval_required'
      );
      nextNotifs = [appNotf, ...nextNotifs];
    } else if (action === 'Send to Finance') {
      const finNotif = triggerNotification(
        UserRole.FINANCE_OFFICER,
        `AWAITING PAYMENT: Cash Advance ${selectedRequestId} has been approved and released to accounts desk. Disburse ₦${targetReq.amountRequested}.`,
        selectedRequestId,
        'approval_required'
      );
      nextNotifs = [finNotif, ...nextNotifs];
    } else if (action === 'Pay') {
      // Mark as paid alerts Initiator, Head of Admin, and Internal Control
      const proofLabel = paymentMeta?.proofOfPaymentName ? ` [Proof attached: ${paymentMeta.proofOfPaymentName}]` : '';
      const adminProofLabel = paymentMeta?.proofOfPaymentName 
        ? `, and dynamic proof of payment metadata (${paymentMeta.proofOfPaymentName}) has been filed to Admin desktop.` 
        : '.';
      const infInitiator = triggerNotification(UserRole.ADMIN_OFFICER, `DISBURSED: Your request ${selectedRequestId} for ₦${targetReq.amountRequested} has been Paid by Finance${proofLabel}. Reference: ${paymentMeta?.paymentReference}`, selectedRequestId, 'status_change');
      const infHOA = triggerNotification(UserRole.HEAD_OF_ADMIN, `DISBURSED & REVIEW PROOF: Request ${selectedRequestId} settled${adminProofLabel} Reference: ${paymentMeta?.paymentReference}`, selectedRequestId, 'status_change');
      const infIC = triggerNotification(UserRole.INTERNAL_CONTROL, `DISBURSED: Request ${selectedRequestId} settled${proofLabel}. Reference: ${paymentMeta?.paymentReference}`, selectedRequestId, 'status_change');
      nextNotifs = [infInitiator, infHOA, infIC, ...nextNotifs];
    }

    if (action === 'Pay') {
      sendEmailNotification(
        'cash_advance_paid',
        selectedRequestId,
        currentUser.name,
        currentUser.role,
        'Disburse Payment',
        commentText || 'Payment successfully disbursed.',
        {
          paymentMethod: paymentMeta?.paymentMethod,
          paymentReference: paymentMeta?.paymentReference,
          amountPaid: String(paymentMeta?.amountPaid || targetReq.amountRequested),
          proofOfPaymentName: paymentMeta?.proofOfPaymentName
        }
      );
    } else {
      sendEmailNotification(
        'cash_advance_status_change',
        selectedRequestId,
        currentUser.name,
        currentUser.role,
        action,
        commentText || `${action} verified.`,
        { status: targetReq.currentStatus }
      );
    }

    // Log and send custom tagged member notifications if found in comment
    checkForAndSendTaggedEmails(commentText, selectedRequestId);

    handleSaveData(nextAdvances, retirements, [newLog, ...logs], nextNotifs);
    alert(`Action [${action}] recorded successfully inside the workflow ledger!`);
  };

  // 3. RETIREMENT module creation
  const handleAddRetirement = (retMeta: Partial<CashAdvanceRetirement>) => {
    const nextId = generateRetId(retirements.map(r => r.id));
    const timestamp = getTimestampString();

    const newRetirement: CashAdvanceRetirement = {
      id: nextId,
      cashAdvanceRef: retMeta.cashAdvanceRef || '',
      amountAdvanced: retMeta.amountAdvanced || 0,
      amountUtilized: retMeta.amountUtilized || 0,
      balanceReturned: retMeta.balanceReturned || 0,
      retirementDate: retMeta.retirementDate || '2026-06-12',
      expenseDetails: retMeta.expenseDetails || [],
      receiptName: retMeta.receiptName,
      comment: retMeta.comment,
      currentStatus: RetirementStatus.PENDING_HEAD_OF_ADMIN, // submits to head of admin verifications
      approvalHistory: retMeta.approvalHistory || []
    };

    // Add visual logs
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      requestReference: nextId,
      type: 'Retirement',
      user: currentUser.name,
      role: currentUser.role,
      action: 'Submitted Retirement Folder',
      date: timestamp,
      comment: `Utilized: ₦${newRetirement.amountUtilized}, Refund returned balance: ₦${newRetirement.balanceReturned}`
    };

    // Notification to Head of admin
    const hoaAlert = triggerNotification(
      UserRole.HEAD_OF_ADMIN,
      `RETIREMENT CLAIM: Staff filed retirement claim ${nextId} against outstanding advance ${newRetirement.cashAdvanceRef}. Auditing required.`,
      newRetirement.cashAdvanceRef,
      'approval_required'
    );

    const nextRetirements = [newRetirement, ...retirements];
    const nextLogs = [newLog, ...logs];
    const nextNotifs = [hoaAlert, ...notifications];

    // Dispatch real email template
    sendEmailNotification(
      'retirement_submitted',
      nextId,
      currentUser.name,
      currentUser.role,
      'Submit Retirement Claim',
      newRetirement.comment || 'Retirement claim started',
      {
        retirementId: nextId,
        amountAdvanced: String(newRetirement.amountAdvanced),
        amountUtilized: String(newRetirement.amountUtilized),
        balanceReturned: String(newRetirement.balanceReturned)
      }
    );

    handleSaveData(advances, nextRetirements, nextLogs, nextNotifs);
    setIsInitiatingRetirement(false);
    alert(`Retirement folder [${nextId}] successfully dispatched to administrative verification desks!`);
  };

  // 4. RETIREMENT Verification Actions flow
  const handleVerificationAction = (
    action: 'Approve' | 'Reject' | 'Request Clarification' | 'Send to Finance' | 'Return to Admin' | 'Return for Review' | 'Resubmit',
    commentText: string,
    signatureSvg?: string
  ) => {
    if (!selectedRetirementId) return;
    const timestamp = getTimestampString();

    const nextRetirements = retirements.map(ret => {
      if (ret.id !== selectedRetirementId) return ret;

      let nextStatus = ret.currentStatus;
      let nextHistory = [...ret.approvalHistory];

      if (action === 'Approve') {
        if (ret.currentStatus === RetirementStatus.PENDING_HEAD_OF_ADMIN) {
          nextStatus = RetirementStatus.PENDING_INTERNAL_CONTROL;
        } else if (ret.currentStatus === RetirementStatus.PENDING_INTERNAL_CONTROL) {
          nextStatus = RetirementStatus.PENDING_EXECUTIVE_OFFICE;
        } else if (ret.currentStatus === RetirementStatus.PENDING_EXECUTIVE_OFFICE) {
          nextStatus = RetirementStatus.PENDING_HEAD_OF_ADMIN_RELEASE;
        } else if (ret.currentStatus === RetirementStatus.PENDING_FINANCE) {
          nextStatus = RetirementStatus.APPROVED;
        }
      } else if (action === 'Reject' || action === 'Return for Review') {
        nextStatus = RetirementStatus.REJECTED;
      } else if (action === 'Send to Finance') {
        nextStatus = RetirementStatus.PENDING_FINANCE;
      } else if (action === 'Return to Admin') {
        nextStatus = RetirementStatus.PENDING_HEAD_OF_ADMIN_RELEASE;
      } else if (action === 'Resubmit') {
        nextStatus = RetirementStatus.PENDING_HEAD_OF_ADMIN;
      }

      nextHistory.push({
        userId: 'usr-eval',
        userRole: currentUser.role,
        userName: currentUser.name,
        action: `${action} (Verify)` as any,
        date: timestamp,
        comment: commentText,
        signatureSvg: signatureSvg
      });

      return {
        ...ret,
        currentStatus: nextStatus,
        approvalHistory: nextHistory
      };
    });

    const activeRet = retirements.find(r => r.id === selectedRetirementId)!;
    const nextRetObj = nextRetirements.find(r => r.id === selectedRetirementId)!;

    // Log
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      requestReference: selectedRetirementId,
      type: 'Retirement',
      user: currentUser.name,
      role: currentUser.role,
      action: `Retirement claim verification: ${action}`,
      date: timestamp,
      comment: commentText
    };

    // Notifications
    let nextNotifs = [...notifications];
    if (action === 'Reject' || action === 'Return for Review') {
      const alertInit = triggerNotification(
        UserRole.ADMIN_OFFICER,
        `REJECTED RETIREMENT: Claim folder ${selectedRetirementId} rejected by ${currentUser.name}: ${commentText}`,
        activeRet.cashAdvanceRef,
        'status_change'
      );
      nextNotifs = [alertInit, ...nextNotifs];
    } else if (action === 'Approve') {
      if (nextRetObj.currentStatus === RetirementStatus.PENDING_INTERNAL_CONTROL) {
        const hAlert = triggerNotification(
          UserRole.INTERNAL_CONTROL,
          `RETIREMENT REVIEWS: Claim folder ${selectedRetirementId} passed Head of Admin audit. Verify receipts.`,
          activeRet.cashAdvanceRef,
          'approval_required'
        );
        nextNotifs = [hAlert, ...nextNotifs];
      } else if (nextRetObj.currentStatus === RetirementStatus.PENDING_EXECUTIVE_OFFICE) {
        const iAlert = triggerNotification(
          UserRole.EXECUTIVE_OFFICE,
          `RETIREMENT REVIEWS: Claim folder ${selectedRetirementId} passed Compliance. Sign off.`,
          activeRet.cashAdvanceRef,
          'approval_required'
        );
        nextNotifs = [iAlert, ...nextNotifs];
      } else if (nextRetObj.currentStatus === RetirementStatus.PENDING_HEAD_OF_ADMIN_RELEASE) {
        const rAlert = triggerNotification(
          UserRole.HEAD_OF_ADMIN,
          `RETIREMENT REVIEWS: Claim folder ${selectedRetirementId} signed off. Release to Finance.`,
          activeRet.cashAdvanceRef,
          'approval_required'
        );
        nextNotifs = [rAlert, ...nextNotifs];
      } else if (nextRetObj.currentStatus === RetirementStatus.APPROVED) {
        // Fully approved retirement alerts initiator and admin
        const sAlert = triggerNotification(
          UserRole.ADMIN_OFFICER,
          `RETIREMENT CLOSED: Claim folder ${selectedRetirementId} has been fully APPROVED and verified by operations desks. Returned balances audited.`,
          activeRet.cashAdvanceRef,
          'status_change'
        );
        nextNotifs = [sAlert, ...nextNotifs];
      }
    } else if (action === 'Send to Finance') {
      const fAlert = triggerNotification(
        UserRole.FINANCE_OFFICER,
        `RETIREMENT REVIEWS: Claim folder ${selectedRetirementId} has been released. Reconcile remaining returned cash ₦${activeRet.balanceReturned}.`,
        activeRet.cashAdvanceRef,
        'approval_required'
      );
      nextNotifs = [fAlert, ...nextNotifs];
    }

    // Trigger dynamic template notification
    sendEmailNotification(
      'cash_advance_status_change',
      activeRet.cashAdvanceRef,
      currentUser.name,
      currentUser.role,
      action,
      commentText || `${action} verified.`,
      { 
        status: `Retirement Status: ${nextRetObj.currentStatus}`,
        retirementId: selectedRetirementId,
        amountAdvanced: String(activeRet.amountAdvanced),
        amountUtilized: String(activeRet.amountUtilized),
        balanceReturned: String(activeRet.balanceReturned)
      }
    );

    // Log and send custom tagged member notifications if found in comment
    checkForAndSendTaggedEmails(commentText, selectedRetirementId);

    handleSaveData(advances, nextRetirements, [newLog, ...logs], nextNotifs);
    alert(`Verification action [${action}] committed to retirement claim history!`);
  };

  // Automated Payment reminders triggers simulation
  const simulatePaymentReminder = (overdueDays: number) => {
    const timestamp = getTimestampString();
    
    if (overdueDays === 2) {
      // Find advances awaiting payment
      const itemsAwaiting = advances.filter(a => a.currentStatus === RequestStatus.AWAITING_FINANCE_PAYMENT);
      if (itemsAwaiting.length === 0) {
        alert('Simulation notice: No active Cash Advances are currently in "Awaiting Finance Payment" state.');
        return;
      }
      
      let nextNotifs = [...notifications];
      itemsAwaiting.forEach(a => {
        const fAlert = triggerNotification(
          UserRole.FINANCE_OFFICER,
          `Payment request ${a.referenceNumber} has been awaiting processing for more than 2 days. Kindly update payment status.`,
          a.referenceNumber,
          'reminder'
        );
        nextNotifs = [fAlert, ...nextNotifs];
      });

      const newLog: AuditLogEntry = {
        id: `sys-${Date.now()}`,
        requestReference: 'SYSTEM',
        type: 'System',
        user: 'System Scheduler',
        role: UserRole.SYSTEM_ADMIN,
        action: 'Triggered 2-Day Finance Payment Reminders',
        date: timestamp,
        comment: 'Automated job scanned Awaiting Finance requests and issued priority notices.'
      };

      handleSaveData(advances, retirements, [newLog, ...logs], nextNotifs);
      alert('Simulation completed! Priority payment alerts sent to the Finance department feed.');
    } else if (overdueDays === 5) {
      // Escalate after 5 days
      const itemsAwaiting = advances.filter(a => a.currentStatus === RequestStatus.AWAITING_FINANCE_PAYMENT);
      if (itemsAwaiting.length === 0) {
        alert('Simulation notice: No active Cash Advances are currently "Awaiting Finance Payment".');
        return;
      }

      let nextNotifs = [...notifications];
      itemsAwaiting.forEach(a => {
        // Escalate to Head of Administration and Executive Office
        const hoaAlert = triggerNotification(
          UserRole.HEAD_OF_ADMIN,
          `ESCALATION: Awaiting payment request ${a.referenceNumber} has remained unresolved for over 5 days. Urgent intervention recommended.`,
          a.referenceNumber,
          'escalation'
        );
        const eoAlert = triggerNotification(
          UserRole.EXECUTIVE_OFFICE,
          `ESCALATION: Awaiting payment request ${a.referenceNumber} has remained unresolved for over 5 days. Urgent intervention recommended.`,
          a.referenceNumber,
          'escalation'
        );
        nextNotifs = [hoaAlert, eoAlert, ...nextNotifs];
      });

      const newLog: AuditLogEntry = {
        id: `sys-${Date.now()}`,
        requestReference: 'SYSTEM',
        type: 'System',
        user: 'System Scheduler',
        role: UserRole.SYSTEM_ADMIN,
        action: 'Escalated Overdue Payment Reminders (>5 Days)',
        date: timestamp,
        comment: 'High priority alerts issued directly to HoA and Executive Directors desks.'
      };

      handleSaveData(advances, retirements, [newLog, ...logs], nextNotifs);
      alert('Simulation completed! Escallated alerts dispatched for Head of Admin and Executive Office feed.');
    }
  };

  const handleClearLogs = () => {
    const timestamp = getTimestampString();
    const cleanLog: AuditLogEntry = {
      id: `sys-reset-${Date.now()}`,
      requestReference: 'SYSTEM',
      type: 'System',
      user: currentUser.name,
      role: currentUser.role,
      action: 'Compliance audit trails cleared manually',
      date: timestamp,
      comment: 'Immutable records database refreshed.'
    };
    handleSaveData(advances, retirements, [cleanLog], notifications);
  };

  // Simple quick stats filtering link
  const handleSetStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    setSelectedRequestId(null);
    setSelectedRetirementId(null);
    setIsInitiatingAdvance(false);
    setIsInitiatingRetirement(false);
  };

  // Filter advances based on fast-filters
  const getFilteredAdvancesList = () => {
    return advances.filter(a => {
      // quick search
      if (refSearch && !a.referenceNumber.toLowerCase().includes(refSearch.toLowerCase()) && 
          !a.staffName.toLowerCase().includes(refSearch.toLowerCase()) &&
          !a.department.toLowerCase().includes(refSearch.toLowerCase())) {
        return false;
      }

      if (!statusFilter) return true;

      // special grouping filters
      if (statusFilter === 'pending') {
        return [
          RequestStatus.SUBMITTED,
          RequestStatus.PENDING_HEAD_OF_ADMIN,
          RequestStatus.PENDING_INTERNAL_CONTROL,
          RequestStatus.PENDING_EXECUTIVE_OFFICE,
          RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE
        ].includes(a.currentStatus);
      }

      if (statusFilter === 'approved') {
        return [
          RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE,
          RequestStatus.AWAITING_FINANCE_PAYMENT,
          RequestStatus.PAID,
          RequestStatus.CLOSED
        ].includes(a.currentStatus);
      }

      if (statusFilter === 'outstanding') {
        if (a.currentStatus !== RequestStatus.PAID) return false;
        const retObj = retirements.find(r => r.cashAdvanceRef === a.referenceNumber);
        return !retObj || retObj.currentStatus !== RetirementStatus.APPROVED;
      }

      if (statusFilter === 'retired') {
        if (a.currentStatus !== RequestStatus.PAID) return false;
        const retObj = retirements.find(r => r.cashAdvanceRef === a.referenceNumber);
        return retObj && retObj.currentStatus === RetirementStatus.APPROVED;
      }

      if (statusFilter === 'overdue') {
        if (a.currentStatus !== RequestStatus.PAID) return false;
        const retObj = retirements.find(r => r.cashAdvanceRef === a.referenceNumber);
        if (retObj && retObj.currentStatus === RetirementStatus.APPROVED) return false;
        
        // compare dates
        return new Date(a.expectedRetirementDate) < new Date('2026-06-12');
      }

      return a.currentStatus === statusFilter;
    });
  };

  const visibleAdvances = getFilteredAdvancesList();

  // Reset to seed data helper
  const handleResetAppToFactoryDefault = () => {
    if (confirm('Revert entire database schema to pristine default seed? This will delete custom inputs.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isLoggedIn) {
    return (
      <LoginPortal
        onLoginSuccess={handleLoginSuccess}
        staffList={staffMembers.length > 0 ? staffMembers : getStoredStaffMembers()}
      />
    );
  }

  return (
    <div id="full-app-root" className="min-h-screen bg-slate-100 flex flex-col font-sans select-none antialiased">
      


      {/* Framework container containing sidebar and content workdesk */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0">
        
        {/* Sleek Design Theme Sidebar Tab Panel (Desktop only) */}
        <aside className="w-64 bg-slate-900 text-slate-300 hidden lg:flex flex-col border-r border-slate-800 shrink-0 print:hidden select-none">
          {/* Logo Portion */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-8 flex items-center justify-center shrink-0">
                <img src="https://imgur.com/Om0LsC2.png" alt="Company Logo" className="h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-slate-100 text-sm tracking-tight leading-none uppercase truncate">Memo Portal</h1>
                <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-mono">Internal Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
            <div className="px-6 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Main Workspaces</div>
            
            <button
              id="sidebar-tab-btn-dashboard"
              onClick={() => { setActiveTab('dashboard'); handleSetStatusFilter(null); }}
              className={`w-full flex items-center px-6 py-2.5 space-x-3 text-left transition-all duration-155 border-l-4 cursor-pointer font-sans text-xs font-semibold ${
                activeTab === 'dashboard'
                  ? 'bg-white/10 border-blue-500 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span>Overview Dashboard</span>
            </button>

            <button
              id="sidebar-tab-btn-requests"
              onClick={() => { setActiveTab('requests'); setSelectedRequestId(null); setIsInitiatingAdvance(false); }}
              className={`w-full flex items-center px-6 py-2.5 space-x-3 text-left transition-all duration-155 border-l-4 cursor-pointer font-sans text-xs font-semibold ${
                activeTab === 'requests'
                  ? 'bg-white/10 border-blue-500 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span>Cash Advance Memos</span>
            </button>

            <button
              id="sidebar-tab-btn-retirement"
              onClick={() => { setActiveTab('retirement'); setSelectedRetirementId(null); setIsInitiatingRetirement(false); }}
              className={`w-full flex items-center px-6 py-2.5 space-x-3 text-left transition-all duration-155 border-l-4 cursor-pointer font-sans text-xs font-semibold ${
                activeTab === 'retirement'
                  ? 'bg-white/10 border-blue-500 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Archive className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span>Fund Retirements</span>
            </button>

            <button
              id="sidebar-tab-btn-reports"
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center px-6 py-2.5 space-x-3 text-left transition-all duration-155 border-l-4 cursor-pointer font-sans text-xs font-semibold ${
                activeTab === 'reports'
                  ? 'bg-white/10 border-blue-500 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CreditCard className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span>Accounts Ledger</span>
            </button>

            <button
              id="sidebar-tab-btn-audit"
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center px-6 py-2.5 space-x-3 text-left transition-all duration-155 border-l-4 cursor-pointer font-sans text-xs font-semibold ${
                activeTab === 'audit'
                  ? 'bg-white/10 border-blue-500 text-white font-bold'
                  : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4.5 h-4.5 text-blue-400 shrink-0" />
              <span>Audit Trail Logs</span>
            </button>

            <div className="pt-4 space-y-1">
              <div className="px-6 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Administration</div>
              
              <button
                id="sidebar-tab-btn-crm"
                onClick={() => setActiveTab('crm')}
                className={`w-full flex items-center px-6 py-2 px-3 text-left transition-all duration-155 border-l-4 cursor-pointer font-sans text-xs font-semibold ${
                  activeTab === 'crm'
                    ? 'bg-white/10 border-blue-500 text-white font-bold'
                    : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Users className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                <span>CRM Email & Directory</span>
              </button>

              <button
                id="sidebar-tab-btn-config"
                onClick={() => setActiveTab('config')}
                className={`w-full flex items-center px-6 py-2 px-3 text-left transition-all duration-155 border-l-4 cursor-pointer font-sans text-xs font-semibold ${
                  activeTab === 'config'
                    ? 'bg-white/10 border-blue-500 text-white font-bold'
                    : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <ShieldAlert className="w-4.5 h-4.5 text-blue-400 shrink-0 animate-pulse" />
                <span>Internal Memo Configuration</span>
              </button>
            </div>
          </nav>

          {/* Profile Section */}
          <div className="p-4 bg-slate-950 border-t border-slate-850 mt-auto">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs uppercase shadow-sm shrink-0">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="text-xs min-w-0">
                <p className="font-bold text-slate-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-450 truncate tracking-wide font-mono leading-none">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content Workspace container */}
        <div className="flex-1 flex flex-col min-h-screen bg-slate-100 min-w-0">
          
          {/* Main Top Header bar */}
          <header id="app-primary-header" className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-40 print:hidden shadow-xs">
            
            {/* Left Header Title / Toggle menu */}
            <div className="flex items-center gap-3">
              <button
                id="mobile-menu-trigger-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 px-2.5 text-slate-600 hover:text-blue-700 hover:bg-slate-50 border border-slate-200 rounded lg:hidden transition-all duration-150"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div className="lg:hidden flex items-center gap-2">
                <div className="h-7 flex items-center justify-center shrink-0">
                  <img src="https://imgur.com/Om0LsC2.png" alt="Logo" className="h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <h1 className="font-bold text-slate-800 text-xs tracking-tight uppercase leading-none truncate">Memo Portal</h1>
              </div>

              <div className="hidden lg:flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Departmental Workspace:</span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  {activeTab === 'dashboard' ? 'Overview Operations' :
                   activeTab === 'requests' ? 'Cash Advance Allocation Memo Desk' :
                   activeTab === 'retirement' ? 'Audit Expense & Retirements' :
                   activeTab === 'reports' ? 'Corporate General Accounts Ledger' :
                   activeTab === 'audit' ? 'Expenditure Compliance Audit Logs' :
                   'Internal Memo Simulator Desk'}
                </h2>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-4">
              
              {/* Live Notifications bell */}
              <NotificationBell
                notifications={notifications}
                currentRole={currentUser.role}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onSelectRequest={handleSelectRequestDirectly}
              />

              {/* Light/Dark Mode Switcher */}
              <button
                id="portal-theme-mode-toggle"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-700"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

              {/* Profile display widget summary */}
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="text-right">
                  <span className="text-xs font-bold block text-slate-800 dark:text-slate-100 leading-none">{currentUser.name}</span>
                  <span className="text-[9px] font-mono font-semibold text-slate-400 block mt-1 uppercase leading-none">{currentUser.role}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs uppercase shadow-xs">
                  {currentUser.name.slice(0, 2)}
                </div>
                <button
                  id="app-header-logout-trigger"
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent transition-all cursor-pointer ml-1"
                  title="Secure logout session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </header>

      {/* Mobile responsive slide dropdown Menu */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-dropdown" className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-2 flex flex-col z-30 sticky top-16 print:hidden">
          <button
            id="mob-tab-dashboard"
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); handleSetStatusFilter(null); }}
            className={`p-2 rounded-lg font-bold text-xs text-left ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Overview Dashboard
          </button>
          <button
            id="mob-tab-requests"
            onClick={() => { setActiveTab('requests'); setSelectedRequestId(null); setIsInitiatingAdvance(false); setMobileMenuOpen(false); }}
            className={`p-2 rounded-lg font-bold text-xs text-left ${activeTab === 'requests' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Cash Advance Memos
          </button>
          <button
            id="mob-tab-retirement"
            onClick={() => { setActiveTab('retirement'); setSelectedRetirementId(null); setIsInitiatingRetirement(false); setMobileMenuOpen(false); }}
            className={`p-2 rounded-lg font-bold text-xs text-left ${activeTab === 'retirement' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Fund Retirements
          </button>
          <button
            id="mob-tab-reports"
            onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
            className={`p-2 rounded-lg font-bold text-xs text-left ${activeTab === 'reports' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Accounts Ledger
          </button>
          <button
            id="mob-tab-audit"
            onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
            className={`p-2 rounded-lg font-bold text-xs text-left ${activeTab === 'audit' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Audit Trail
          </button>
          
          <button
            id="mob-tab-crm"
            onClick={() => { setActiveTab('crm'); setMobileMenuOpen(false); }}
            className={`p-2 rounded-lg font-bold text-xs text-left ${activeTab === 'crm' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            CRM Email & Directory
          </button>
          
          <button
            id="mob-tab-config"
            onClick={() => { setActiveTab('config'); setMobileMenuOpen(false); }}
            className={`p-2 rounded-lg font-bold text-xs text-left ${activeTab === 'config' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Internal Memo Simulation
          </button>
          
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Logged as: {currentUser.name}</span>
            <span className="font-mono text-[10px]">{currentUser.role}</span>
          </div>
        </div>
      )}

          {/* Main Space Container workspace */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        
        {/* Core switchable Active tabs body container */}
        <div id="active-tab-body">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <Dashboard
              advances={advances}
              retirements={retirements}
              onSetTab={setActiveTab}
              onSetStatusFilter={handleSetStatusFilter}
              currentRole={currentUser.role}
              currentUser={currentUser}
              onSelectRequest={handleSelectRequestDirectly}
            />
          )}

          {/* TAB 2: CASH ADVANCE REQUEST MODULE */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              
              {/* Detailed Inner Page Switcher */}
              {isInitiatingAdvance ? (
                <CashAdvanceRequestForm
                  onAddRequest={handleAddRequest}
                  onCancel={() => setIsInitiatingAdvance(false)}
                  nextReferenceNumber={generateRefId(advances.map(a => a.referenceNumber))}
                  currentUser={currentUser}
                />
              ) : selectedRequestId ? (
                <RequestDetails
                  request={advances.find(r => r.id === selectedRequestId)!}
                  currentRole={currentUser.role}
                  currentUserName={currentUser.name}
                  onBack={() => setSelectedRequestId(null)}
                  onApprovalAction={handleApprovalAction}
                />
              ) : (
                <div className="space-y-6">
                  
                  {/* Upper Command deck for Requests list */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Cash Advance Allocations Catalog</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Explore funding requests, track states, or view payment settlement reports</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        id="reset-status-filter-btn"
                        onClick={() => handleSetStatusFilter(null)}
                        className={`text-xs font-bold py-2 px-3 rounded border transition-colors ${
                          statusFilter === null 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        All Portfolios
                      </button>
                      <button
                        id="filter-pending-nav-btn"
                        onClick={() => handleSetStatusFilter('pending')}
                        className={`text-xs font-bold py-2 px-3 rounded border transition-colors ${
                          statusFilter === 'pending' 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        Active Approvals Awaiting
                      </button>

                      {/* Create advance request button */}
                      <button
                        id="start-advance-creation-btn"
                        onClick={() => setIsInitiatingAdvance(true)}
                        className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all shadow-md shadow-blue-200 flex items-center gap-1 shrink-0"
                      >
                        + Create Funding Memo
                      </button>
                    </div>
                  </div>

                  {/* List Controls with Search input */}
                  <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                      <input
                        id="requests-ref-search"
                        type="text"
                        placeholder="Search by Ref#, staff name, or department..."
                        className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium text-slate-700"
                        value={refSearch}
                        onChange={(e) => setRefSearch(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 items-center flex-wrap w-full md:w-auto md:justify-end text-xs">
                      {statusFilter && (
                        <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded py-1 px-2.5 font-bold flex items-center gap-1">
                          Filter active: <span className="underline">{statusFilter}</span>
                          <button onClick={() => setStatusFilter(null)} className="hover:text-red-600 font-mono shrink-0 ml-1">×</button>
                        </div>
                      )}
                      <span className="text-slate-400 font-medium">Items matched: <strong>{visibleAdvances.length}</strong></span>
                    </div>
                  </div>

                  {/* Main table list */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      {visibleAdvances.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs">
                          No Cash Advance Requests currently match your filter settings.
                        </div>
                      ) : (
                        <table className="min-w-full text-left text-xs divide-y divide-slate-100">
                          <thead className="bg-slate-50 font-bold uppercase text-slate-400 tracking-wider">
                            <tr>
                              <th className="p-3">Reference No</th>
                              <th className="p-3">Request Date</th>
                              <th className="p-3">Beneficiary Staff</th>
                              <th className="p-3">Department</th>
                              <th className="p-3 max-w-xs">Purpose</th>
                              <th className="p-3 text-right">Requested</th>
                              <th className="p-3">Current Status</th>
                              <th className="p-3 text-center">Action Panel</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 text-slate-700">
                            {visibleAdvances.map(item => {
                              const retirement = retirements.find(r => r.cashAdvanceRef === item.referenceNumber);
                              const isRetired = retirement && retirement.currentStatus === RetirementStatus.APPROVED;
                              return (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3 font-mono font-bold text-blue-700">{item.referenceNumber}</td>
                                  <td className="p-3 font-mono text-slate-400">{item.requestDate}</td>
                                  <td className="p-3 font-bold text-slate-800">{item.staffName}</td>
                                  <td className="p-3">{item.department}</td>
                                  <td className="p-3 max-w-sm truncate" title={item.purpose}>{item.purpose}</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">₦{item.amountRequested.toLocaleString()}</td>
                                  <td className="p-3">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                      item.currentStatus === RequestStatus.PAID ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                                      item.currentStatus === RequestStatus.REJECTED ? 'bg-rose-50 text-rose-800 border-rose-100' :
                                      'bg-red-50 text-red-800 border-red-100 animate-pulse'
                                    }`}>
                                      {item.currentStatus} {isRetired && '(Retired Claims Closed)'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      id={`view-detail-btn-row-${item.id}`}
                                      onClick={() => setSelectedRequestId(item.id)}
                                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 mx-auto"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> View Folder
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: CASH ADVANCE RETIREMENT MODULE */}
          {activeTab === 'retirement' && (
            <div className="space-y-6">
              
              {isInitiatingRetirement ? (
                <RetirementForm
                  paidAdvances={advances.filter(a => {
                    // must be in "PAID" state
                    if (a.currentStatus !== RequestStatus.PAID) return false;
                    // AND there's no outstanding approved retirement folder already
                    const retObj = retirements.find(r => r.cashAdvanceRef === a.referenceNumber);
                    return !retObj || retObj.currentStatus !== RetirementStatus.APPROVED;
                  })}
                  onAddRetirement={handleAddRetirement}
                  onCancel={() => setIsInitiatingRetirement(false)}
                />
              ) : selectedRetirementId ? (
                <RetirementDetails
                  retirement={retirements.find(r => r.id === selectedRetirementId)!}
                  currentRole={currentUser.role}
                  currentUserName={currentUser.name}
                  onBack={() => setSelectedRetirementId(null)}
                  onVerifyAction={handleVerificationAction}
                />
              ) : (
                <div className="space-y-6">
                  
                  {/* Command header for list */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Cash Advance Retirement Claims Folder</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Audit expenses, matching invoices, and returned cash ledger receipts</p>
                    </div>

                    <button
                      id="start-retirement-creation-btn"
                      onClick={() => setIsInitiatingRetirement(true)}
                      className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-lg transition-all shadow-md shadow-amber-100 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      + File Retirement claim
                    </button>
                  </div>

                  {/* Retirement items table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Claims Registry Queue</span>
                    </div>

                    <div className="overflow-x-auto">
                      {retirements.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs">
                          No Retirement claims filed yet.
                        </div>
                      ) : (
                        <table className="min-w-full text-left text-xs divide-y divide-slate-150">
                          <thead className="bg-slate-50 font-bold uppercase text-slate-400 tracking-wider">
                            <tr>
                              <th className="p-3">Retirement ID</th>
                              <th className="p-3">Reference CA</th>
                              <th className="p-3">Filing Date</th>
                              <th className="p-3 text-right">Advanced Amt</th>
                              <th className="p-3 text-right">Utilized Amt</th>
                              <th className="p-3 text-right">Returned Refund</th>
                              <th className="p-3">Current Status</th>
                              <th className="p-3 text-center">Auditing</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {retirements.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-mono font-bold text-amber-700">RET-{item.id}</td>
                                <td className="p-3 font-mono font-bold text-blue-700">{item.cashAdvanceRef}</td>
                                <td className="p-3 font-mono text-slate-400">{item.retirementDate}</td>
                                <td className="p-3 text-right font-mono font-medium">₦{item.amountAdvanced.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono font-medium text-slate-800">₦{item.amountUtilized.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-800">₦{item.balanceReturned.toLocaleString()}</td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-0.5 rounded-[10px] font-bold ${
                                    item.currentStatus === RetirementStatus.APPROVED ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                    item.currentStatus === RetirementStatus.REJECTED ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                                    'bg-red-50 text-red-800 border border-red-100 animate-pulse'
                                  }`}>
                                    {item.currentStatus}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    id={`view-retirement-btn-row-${item.id}`}
                                    onClick={() => setSelectedRetirementId(item.id)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-0.5 mx-auto"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Audit Claims
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 4: REPORTS TAB */}
          {activeTab === 'reports' && (
            <Reports
              advances={advances}
              retirements={retirements}
              onSelectRequest={handleSelectRequestDirectly}
              onSetTab={setActiveTab}
            />
          )}

          {/* TAB CRM: EMAIL AND STAFF CRM PORTAL */}
          {activeTab === 'crm' && (
            <CrmPortal
              templates={templates}
              onSaveTemplate={(updatedTpl) => {
                const nextTemplates = templates.map(t => t.id === updatedTpl.id ? updatedTpl : t);
                setTemplates(nextTemplates);
                saveStoredTemplates(nextTemplates);
              }}
              onResetTemplates={() => {
                localStorage.removeItem('stored_email_templates');
                window.location.reload();
              }}
              sentEmails={sentEmails}
              onClearSentEmails={() => {
                setSentEmails([]);
                saveStoredSentEmails([]);
              }}
              staffMembers={staffMembers}
              onUpdateStaffMembers={(updatedStaff) => {
                setStaffMembers(updatedStaff);
                saveStoredStaffMembers(updatedStaff);
              }}
              onSimulateReminders={(overdueDays) => {
                simulatePaymentReminder(overdueDays);
              }}
              onResetFactoryDefault={handleResetAppToFactoryDefault}
              advances={advances}
              retirements={retirements}
            />
          )}

          {/* TAB 5: AUDIT TRAIL LOG TAB */}
          {activeTab === 'audit' && (
            <AuditTrail
              logs={logs}
              onClearLogs={handleClearLogs}
            />
          )}

          {/* TAB 6: SYSTEM SANDBOX CONTROLS TAB */}
          {activeTab === 'config' && (
            <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in text-center">
              <ShieldAlert className="w-12 h-12 text-indigo-600 mx-auto animate-pulse" />
              <div>
                <h3 className="text-xl font-bold text-slate-800 font-serif">System Internal Memo Config</h3>
                <p className="text-xs text-slate-500 mt-1">Simulate timing reminders, reset seed data files, or clean directories</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-150 rounded-lg text-left space-y-3 font-sans">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <BellRing className="w-4 h-4 text-amber-500" /> Simulate Finance Payment Reminders
                </h4>
                
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  The specifications request automated email / feed notifications if an advance resides in the <strong>"Awaiting Finance Payment"</strong> state for too long:
                </p>
                <ul className="text-[11px] list-disc pl-4 text-slate-500 space-y-1">
                  <li><strong>After 2 Days:</strong> Push alert notify to Finance Officer: <em>"Payment request {`{Ref}`} has been awaiting processing..."</em></li>
                  <li><strong>After 5 Days:</strong> Escalate alerts directly to Head of Administration and Executive Director levels.</li>
                </ul>

                <div className="pt-2 grid grid-cols-2 gap-2 text-center">
                  <button
                    id="trigger-reminder-2-days-btn"
                    onClick={() => simulatePaymentReminder(2)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold transition-all border border-blue-100 flex items-center justify-center gap-1"
                  >
                    🚀 Trigger {'>'}2-Day Reminders
                  </button>

                  <button
                    id="trigger-reminder-5-days-btn"
                    onClick={() => simulatePaymentReminder(5)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold transition-all border border-rose-100 flex items-center justify-center gap-1"
                  >
                    🚨 Trigger {'>'}5-Day Escalations
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2 justify-center">
                <button
                  id="reset-mock-factory-btn"
                  onClick={handleResetAppToFactoryDefault}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  Force Hard Reset Database
                </button>
              </div>
            </div>
          )}

        </div>

          </main>

          {/* Footer Area with navigation link to config */}
          <footer id="app-primary-footer" className="bg-white border-t border-slate-200 py-6 mt-12 print:hidden text-slate-500 text-xs font-medium">
            <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
              <div>
                <span>© 2026 Vetiva Internal Memo Portal. All rights reserved.</span>
                <p className="text-[10px] text-slate-400 mt-1">Conforms with Vetiva internal memo and expenditure auditing guidelines</p>
              </div>
              <button
                id="footer-sandbox-link-btn"
                onClick={() => setActiveTab('config')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 underline bg-indigo-50/50 hover:bg-indigo-100/50 px-3 py-1.5 rounded-lg border border-indigo-100/30 transition-all cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 animate-pulse text-indigo-500" /> Internal Memo Tool Control
              </button>
            </div>
          </footer>

        </div>

      </div>

    </div>
  );
}
