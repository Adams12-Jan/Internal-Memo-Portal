import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Clock, CheckCircle2, XCircle, CreditCard, Banknote, 
  HelpCircle, Archive, AlertCircle, ShieldCheck, TrendingUp, Sparkles,
  Users, LogOut, ShieldAlert, KeyRound, Menu, X, Landmark, UserMinus, 
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
  STAFF_MEMBERS,
  SystemCustomSettings
} from './types';

import firebaseAuthService, { AuthUser } from './services/firebaseAuthService';
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
  saveStoredStaffMembers,
  clearUserData
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
import ModernAuth from './components/ModernAuth';
import CmsPortal from './components/CmsPortal';

export default function App() {
  // Global State
  const [advances, setAdvances] = useState<CashAdvanceRequest[]>([]);
  const [retirements, setRetirements] = useState<CashAdvanceRetirement[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  // Email dynamic templates design states
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [staffMembers, setStaffMembers] = useState<{ name: string; role: UserRole; department: string }[]>([]);

  // Simulation and authentication controls
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => firebaseAuthService.getUser());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => firebaseAuthService.isAuthenticated());
  const [activeUserIdx, setActiveUserIdx] = useState(() => parseInt(localStorage.getItem('ca_session_user_idx') || '0'));

  const authUserRole = authUser
    ? (authUser.portal_identity
      ? mapPortalIdentityToRole(authUser.portal_identity)
      : (Object.values(UserRole).includes(authUser.role as UserRole)
        ? (authUser.role as UserRole)
        : UserRole.ADMIN_OFFICER))
    : UserRole.ADMIN_OFFICER;

  // CMS System Settings Controller (Full IT admin access)
  const DEFAULT_SYSTEM_SETTINGS: SystemCustomSettings = {
    maxCashAdvance: 2000000,
    retirementWindowDays: 14,
    requiresExecutiveApprovalAbove: 1000000,
    customLogoText: 'Memo Portal',
    customLogoUrl: '',
    customBackgroundUrl: '',
    customFrameColor: '#ffffff',
    customTableColor: '#cbd5e1',
    customIconColor: '#6366f1',
    themeAccent: 'vetiva',
    borderStyle: 'default',
    supportEmail: 'it.support@vetiva.com',
    supportPhone: '+234 1 448 9000',
    debugBarEnabled: true
  };

  const [systemSettings, setSystemSettings] = useState<SystemCustomSettings>(() => {
    const raw = localStorage.getItem('ca_system_settings');
    if (raw) {
      try {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(raw) };
      } catch (e) {
        // use default
      }
    }
    return DEFAULT_SYSTEM_SETTINGS;
  });

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState(authUser?.first_name || '');
  const [profileLastName, setProfileLastName] = useState(authUser?.last_name || '');
  const [profileDepartment, setProfileDepartment] = useState(authUser?.department || 'Administration');
  const [profilePictureUrl, setProfilePictureUrl] = useState(authUser?.profile_picture_url || '');
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [profileSaveStatus, setProfileSaveStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setProfilePictureUrl(authUser?.profile_picture_url || '');
    setProfilePicturePreview('');
  }, [authUser]);

  const currentUser = authUser
    ? { name: `${authUser.first_name} ${authUser.last_name}`, role: authUserRole, department: authUser.department || 'Administration', avatar: profilePictureUrl || authUser.profile_picture_url }
    : { name: staffMembers[activeUserIdx]?.name || 'Ovat Daniel', role: staffMembers[activeUserIdx]?.role || UserRole.ADMIN_OFFICER, department: staffMembers[activeUserIdx]?.department || 'Administration', avatar: undefined };

  const displayProfileAvatar = profilePicturePreview || currentUser.avatar || undefined;

  const handleSaveSystemSettings = (nextSettings: SystemCustomSettings) => {
    const trimmedSettings: SystemCustomSettings = {
      ...nextSettings,
      customLogoUrl: nextSettings.customLogoUrl?.trim() || '',
      customBackgroundUrl: nextSettings.customBackgroundUrl?.trim() || ''
      , customFrameColor: nextSettings.customFrameColor?.trim() || '#ffffff',
      customTableColor: nextSettings.customTableColor?.trim() || '#cbd5e1',
      customIconColor: nextSettings.customIconColor?.trim() || '#6366f1'
    };

    setSystemSettings(trimmedSettings);
    localStorage.setItem('ca_system_settings', JSON.stringify(trimmedSettings));
    
    // Log system configuration change in audit log
    const newAudit: AuditLogEntry = {
      id: `sys-${Date.now()}`,
      requestReference: 'SYSTEM_CONFIG',
      type: 'System',
      user: currentUser.name,
      role: currentUser.role,
      action: 'CMS Theme & System Rules Configuration Updated',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      comment: `Primary accent: ${trimmedSettings.themeAccent}, Limit: ₦${trimmedSettings.maxCashAdvance.toLocaleString()}`
    };
    const nextLogs = [newAudit, ...logs];
    setLogs(nextLogs);
    if (shouldUseGlobalQueue(authUserRole)) {
      const globalData = getStoredData();
      const mergedLogs = mergeLogs(globalData.logs, nextLogs);
      saveStoredData({ logs: mergedLogs });
      if (authUser?.id) {
        saveStoredData({ logs: nextLogs }, authUser.id);
      }
    } else if (authUser?.id) {
      saveStoredData({ logs: nextLogs }, authUser.id);
    }
  };

  // Dynamic CSS injector for CMS custom branding themes & styles
  useEffect(() => {
    const pAccent = systemSettings?.themeAccent || 'default';
    const borderStyle = systemSettings?.borderStyle || 'default';
    let p500 = '#9F9055', p600 = '#9F9055', p700 = '#8A7C4A', p100 = '#E6E1C8', p50 = '#F9F8F3';
    
    if (pAccent === 'blue') {
      p500 = '#2563EB'; p600 = '#1d4ed8'; p700 = '#1e40af'; p100 = '#dbeafe'; p50 = '#f0f9ff';
    } else if (pAccent === 'purple') {
      p500 = '#8B5CF6'; p600 = '#7C3AED'; p700 = '#6D28D9'; p100 = '#f3e8ff'; p50 = '#faf5ff';
    } else if (pAccent === 'emerald') {
      p500 = '#10B981'; p600 = '#059669'; p700 = '#047857'; p100 = '#d1fae5'; p50 = '#ecfdf5';
    } else if (pAccent === 'crimson') {
      p500 = '#EF4444'; p600 = '#DC2626'; p700 = '#B91C1C'; p100 = '#fee2e2'; p50 = '#fef2f2';
    } else if (pAccent === 'orange') {
      p500 = '#F97316'; p600 = '#EA580C'; p700 = '#C2410C'; p100 = '#ffedd5'; p50 = '#fff7ed';
    } else if (pAccent === 'vetiva') {
      // Vetiva brand palette
      p500 = '#977A4A'; // gold/bronze
      p600 = '#977A4A';
      p700 = '#A68D63'; // light gold
      p100 = '#EFEFF1'; // off white
      p50 = '#D3C8B1'; // warm beige
    }

    let rXl = '0.75rem', rLg = '0.5rem', rMd = '0.375rem';
    if (borderStyle === 'sharp') {
      rXl = '0px'; rLg = '0px'; rMd = '0px';
    } else if (borderStyle === 'rounded') {
      rXl = '1.75rem'; rLg = '1.25rem'; rMd = '0.85rem';
    }

    const cssContent = `
      :root {
        --color-blue-500: ${p500} !important;
        --color-blue-600: ${p600} !important;
        --color-blue-700: ${p700} !important;
        --color-blue-100: ${p100} !important;
        --color-blue-50: ${p50} !important;
        
        --color-amber-600: ${p600} !important;
        --color-amber-700: ${p700} !important;
        --color-amber-100: ${p100} !important;

        --radius-xl: ${rXl} !important;
        --radius-lg: ${rLg} !important;
        --radius-md: ${rMd} !important;
      }
    `;

    let styleEl = document.getElementById('dynamic-cms-theme-block');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-cms-theme-block';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = cssContent + `
      :root {
        --cms-frame-bg: ${systemSettings.customFrameColor || '#ffffff'};
        --cms-frame-border: ${systemSettings.customFrameColor || '#cbd5e1'};
        --cms-table-border: ${systemSettings.customTableColor || '#cbd5e1'};
        --cms-icon-color: ${systemSettings.customIconColor || '#6366f1'};
      }
      .portal-dashboard .border-slate-200,
      .portal-dashboard .border-slate-150,
      .portal-dashboard .border-slate-100,
      .portal-dashboard .border-slate-300 {
        border-color: var(--cms-frame-border) !important;
      }
      .portal-dashboard table,
      .portal-dashboard th,
      .portal-dashboard td,
      .portal-dashboard .divide-slate-100 > *,
      .portal-dashboard .divide-slate-150 > * {
        border-color: var(--cms-table-border) !important;
      }
      #app-header-logout-trigger {
        color: var(--cms-icon-color) !important;
      }
    `;
  }, [systemSettings, currentUser]);

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, requests, retirement, reports, audit, cms
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Focus View states
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRetirementId, setSelectedRetirementId] = useState<string | null>(null);
  const [isInitiatingAdvance, setIsInitiatingAdvance] = useState(false);
  const [isInitiatingRetirement, setIsInitiatingRetirement] = useState(false);

  // Filters within specific lists
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [refSearch, setRefSearch] = useState('');

  // Auto load from LocalStorage on mount (per-user data)
  useEffect(() => {
    const userId = authUser?.id;
    if (!userId) {
      setAdvances([]);
      setRetirements([]);
      setLogs([]);
      setNotifications([]);
      setTemplates(getStoredTemplates());
      setSentEmails(getStoredSentEmails());
      setStaffMembers(getStoredStaffMembers());
      return;
    }

    const data = shouldUseGlobalQueue(authUserRole)
      ? getStoredData()
      : getStoredData(userId);

    setAdvances(data.advances);
    setRetirements(data.retirements);
    setLogs(data.logs);
    setNotifications(data.notifications);
    setTemplates(getStoredTemplates());
    setSentEmails(getStoredSentEmails());
    setStaffMembers(getStoredStaffMembers());
  }, [authUser?.id, authUserRole]);

  const shouldUseGlobalQueue = (role: UserRole) => {
    return [
      UserRole.SYSTEM_ADMIN,
      UserRole.HEAD_OF_ADMIN,
      UserRole.INTERNAL_CONTROL,
      UserRole.EXECUTIVE_DIRECTOR,
      UserRole.FINANCE_OFFICER
    ].includes(role);
  };

  const mergeById = <T extends { id: string }>(base: T[], updates: T[]) => {
    const map = new Map<string, T>(base.map(item => [item.id, item]));
    updates.forEach(item => map.set(item.id, item));
    return Array.from(map.values());
  };

  const mergeLogs = (base: AuditLogEntry[], updates: AuditLogEntry[]) => {
    const map = new Map<string, AuditLogEntry>(base.map(item => [item.id, item]));
    updates.forEach(item => map.set(item.id, item));
    return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const mergeNotifications = (base: NotificationEntry[], updates: NotificationEntry[]) => {
    const map = new Map<string, NotificationEntry>(base.map(item => [item.id, item]));
    updates.forEach(item => map.set(item.id, item));
    return Array.from(map.values());
  };

  // Save changes to localStorage helper (per-user data + shared queue sync)
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

    const payload = {
      advances: nextAdvances,
      retirements: nextRetirements,
      logs: nextLogs,
      notifications: nextNotifications
    };
    const userId = authUser?.id;
    if (shouldUseGlobalQueue(authUserRole)) {
      saveStoredData(payload);
      if (userId) {
        saveStoredData(payload, userId);
      }
      return;
    }

    // For personal initiator flows, keep personal data private while syncing changes to the shared global queue.
    const globalData = getStoredData();
    const mergedGlobal = {
      advances: mergeById(globalData.advances, nextAdvances),
      retirements: mergeById(globalData.retirements, nextRetirements),
      logs: mergeLogs(globalData.logs, nextLogs),
      notifications: mergeNotifications(globalData.notifications, nextNotifications)
    };

    saveStoredData(mergedGlobal);
    if (userId) {
      saveStoredData(payload, userId);
    }
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
      comment: `Identity switched in sandbox panel (acting identity).`
    };

    const nextLogs = [newLog, ...logs];
    handleSaveData(advances, retirements, nextLogs, notifications);
  };

  function mapPortalIdentityToRole(portalIdentity?: string): UserRole {
    const portalRoleMap: Record<string, UserRole> = {
      'Initiator': UserRole.ADMIN_OFFICER,
      'IT Support': UserRole.SYSTEM_ADMIN,
      'Line Manager': UserRole.HEAD_OF_ADMIN,
      'Internal Control': UserRole.INTERNAL_CONTROL,
      'Executive Manager': UserRole.EXECUTIVE_DIRECTOR,
      'Executive Director': UserRole.EXECUTIVE_DIRECTOR,
      'Finance': UserRole.FINANCE_OFFICER
    };

    return portalIdentity && portalRoleMap[portalIdentity]
      ? portalRoleMap[portalIdentity]
      : UserRole.ADMIN_OFFICER;
  }

  function parseRoleString(role?: string): UserRole | undefined {
    if (!role) return undefined;
    const normalized = role.trim().toLowerCase();
    if (Object.values(UserRole).map(v => v.toLowerCase()).includes(normalized)) {
      return Object.values(UserRole).find(v => v.toLowerCase() === normalized) as UserRole;
    }
    if (normalized.includes('head') && (normalized.includes('admin') || normalized.includes('administration'))) return UserRole.HEAD_OF_ADMIN;
    if (normalized.includes('internal')) return UserRole.INTERNAL_CONTROL;
    if (normalized.includes('executive')) return UserRole.EXECUTIVE_DIRECTOR;
    if (normalized.includes('finance')) return UserRole.FINANCE_OFFICER;
    if (normalized.includes('system') || normalized.includes('it')) return UserRole.SYSTEM_ADMIN;
    if (normalized.includes('initiator') || normalized.includes('admin officer')) return UserRole.ADMIN_OFFICER;
    return undefined;
  }

  const getDefaultTabForRole = (role: UserRole) => {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        return 'cms';
      case UserRole.FINANCE_OFFICER:
        return 'reports';
      case UserRole.INTERNAL_CONTROL:
        return 'audit';
      default:
        return 'dashboard';
    }
  };

  const handleLoginSuccess = (user: AuthUser) => {
    const parsed = parseRoleString(user.role as string | undefined);
    const userRole = parsed || (user.portal_identity ? mapPortalIdentityToRole(user.portal_identity) : UserRole.ADMIN_OFFICER);
    const normalizedUser = { ...user, role: userRole };
    const userId = normalizedUser.id;

    setAuthUser(normalizedUser);
    setIsLoggedIn(true);
    localStorage.setItem('ca_session_logged_in', 'true');
    firebaseAuthService.setUser(normalizedUser);
    setProfileFirstName(normalizedUser.first_name);
    setProfileLastName(normalizedUser.last_name);
    setProfileDepartment(normalizedUser.department || 'Administration');
    setProfilePictureUrl(normalizedUser.profile_picture_url || '');

    setActiveTab(getDefaultTabForRole(userRole));

    const userName = `${user.first_name} ${user.last_name}`;
    const timestamp = getTimestampString();

    const newLog: AuditLogEntry = {
      id: `sys-${Date.now()}`,
      requestReference: 'SYSTEM',
      type: 'System',
      user: userName,
      role: userRole,
      action: 'User Logged In',
      date: timestamp,
      comment: `Session initialized securely by ${userName} (${userRole})`
    };

    const data = shouldUseGlobalQueue(userRole)
      ? getStoredData()
      : getStoredData(userId);

    setAdvances(data.advances);
    setRetirements(data.retirements);
    setLogs(data.logs);
    setNotifications(data.notifications);

    const nextLogs = [newLog, ...data.logs];
    setLogs(nextLogs);
    if (shouldUseGlobalQueue(userRole)) {
      const existingGlobal = getStoredData();
      const mergedGlobalLogs = mergeLogs(existingGlobal.logs, nextLogs);
      saveStoredData({ logs: mergedGlobalLogs });
      if (userId) {
        saveStoredData({ logs: nextLogs }, userId);
      }
    } else if (userId) {
      saveStoredData({ logs: nextLogs }, userId);
    }
  };

  const handleLogout = async () => {
    await firebaseAuthService.logout();
    setIsLoggedIn(false);
    setAuthUser(null);
    localStorage.setItem('ca_session_logged_in', 'false');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('ca_session_user_idx');
  };

  const handleProfilePictureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authUser) {
      console.warn('[Profile Picture] Missing file or authUser. File:', !!file, 'AuthUser:', !!authUser);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfilePicturePreview(previewUrl);
    setProfileSaveStatus('Uploading profile picture...');

    try {
      const uploadedUrl = await firebaseAuthService.uploadProfilePicture(authUser.id, file);
      const updatedUser = await firebaseAuthService.updateProfile({ profilePictureUrl: uploadedUrl });
      setAuthUser(updatedUser);
      setProfilePictureUrl(uploadedUrl);
      setProfilePicturePreview('');
      setProfileSaveStatus('Profile picture updated successfully');
      setTimeout(() => setProfileSaveStatus(null), 3000);
    } catch (error: any) {
      console.error('[Profile Picture] Upload failed:', error);
      setProfileSaveStatus(error?.message || 'Upload failed');
      setTimeout(() => setProfileSaveStatus(null), 4000);
    }
  };


  // Auto-redirect from unauthorized tabs
  React.useEffect(() => {
    if (activeTab === 'cms' && authUserRole !== UserRole.SYSTEM_ADMIN) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'config' && authUserRole !== UserRole.SYSTEM_ADMIN) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'audit' && authUserRole !== UserRole.INTERNAL_CONTROL && authUserRole !== UserRole.SYSTEM_ADMIN) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'reports' && authUserRole !== UserRole.FINANCE_OFFICER && authUserRole !== UserRole.SYSTEM_ADMIN) {
      setActiveTab('dashboard');
    }
  }, [activeTab, authUserRole]);

  React.useEffect(() => {
    async function fetchCurrentUser() {
      if (firebaseAuthService.isAuthenticated() && !authUser) {
        try {
          const user = await firebaseAuthService.getCurrentUser();
          setAuthUser(user);
          setIsLoggedIn(true);
        } catch (error) {
          await firebaseAuthService.logout();
          setIsLoggedIn(false);
          setAuthUser(null);
        }
      }
    }

    fetchCurrentUser();
  }, [authUser]);

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
    const staffName = targetAdv ? targetAdv.staffName : (extraFields?.staffName || "Ovat Daniel");
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
      const hoAdmin = (staffMembers.length > 0 ? staffMembers : getStoredStaffMembers()).find((s: { name: string; role: UserRole; department: string }) => s.role === UserRole.HEAD_OF_ADMIN);
      rName = hoAdmin ? hoAdmin.name : "Tina Ofeno";
      rRole = UserRole.HEAD_OF_ADMIN;
    } else if (templateId === 'cash_advance_reminder') {
      const fin = (staffMembers.length > 0 ? staffMembers : getStoredStaffMembers()).find((s: { name: string; role: UserRole; department: string }) => s.role === UserRole.FINANCE_OFFICER);
      rName = fin ? fin.name : "Finance & Account";
      rRole = UserRole.FINANCE_OFFICER;
    } else if (templateId === 'retirement_submitted') {
      const hoAdmin = (staffMembers.length > 0 ? staffMembers : getStoredStaffMembers()).find((s: { name: string; role: UserRole; department: string }) => s.role === UserRole.HEAD_OF_ADMIN);
      rName = hoAdmin ? hoAdmin.name : "Tina Ofeno";
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
    const roster: { name: string; role: UserRole; department: string }[] = staffMembers.length > 0 ? staffMembers : getStoredStaffMembers();
    roster.forEach((staff) => {
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

  const handleSendCustomAlert = (
    recipientRole: UserRole | 'All',
    text: string,
    requestId: string,
    type: 'reminder' | 'approval_required' | 'status_change' | 'escalation'
  ) => {
    const timestamp = getTimestampString();
    const newNotif: NotificationEntry = {
      id: `nt-${Date.now()}`,
      recipientRole: recipientRole,
      text: text,
      date: timestamp,
      isRead: false,
      requestId: requestId,
      type: type
    };
    const nextNotifications = [newNotif, ...notifications];
    
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      requestReference: requestId,
      type: 'System',
      user: currentUser.name,
      role: currentUser.role,
      action: 'Broadcast Alert Command',
      date: timestamp,
      comment: `Dispatched [${type}] to ${recipientRole}: ${text}`
    };
    
    handleSaveData(advances, retirements, [newLog, ...logs], nextNotifications);
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
      attachmentUrl: reqMeta.attachmentUrl,
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
          comment: reqMeta.comment || 'Request set up',
          signatureSvg: reqMeta.signatureSvg
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
    alert(newRequest.currentStatus === RequestStatus.DRAFT ? 'Draft saved!' : 'Funding request submitted to Line Manager approval!');
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
      } else if (action === 'Pay') {
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

      if (action === 'Pay') {
        delete updatedRequest.daysAwaitingPaymentSince;
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
      if (targetReq.currentStatus === RequestStatus.PENDING_EXECUTIVE_OFFICE) notifyWho = UserRole.EXECUTIVE_DIRECTOR;
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
      // Mark as paid alerts Initiator, Line Manager and Auditor (Internal Control).
      // Do not send the status-change notification back to the user who performed the action (e.g. Finance).
      const proofLabel = paymentMeta?.proofOfPaymentName ? ` [Proof attached: ${paymentMeta.proofOfPaymentName}]` : '';
      const recipients: { role: UserRole; message: string }[] = [
        { role: UserRole.ADMIN_OFFICER, message: `DISBURSED: Your request ${selectedRequestId} for ₦${targetReq.amountRequested} has been Paid by Finance${proofLabel}. Reference: ${paymentMeta?.paymentReference}` },
        { role: UserRole.HEAD_OF_ADMIN, message: `PAYMENT NOTIFICATION: Cash Advance ${selectedRequestId} for ₦${targetReq.amountRequested} has been disbursed by Finance. Reference: ${paymentMeta?.paymentReference}` },
        { role: UserRole.INTERNAL_CONTROL, message: `DISBURSED: Request ${selectedRequestId} settled${proofLabel}. Reference: ${paymentMeta?.paymentReference}` }
      ];

      const createdNotifs = recipients
        .filter(r => r.role !== currentUser.role)
        .map(r => triggerNotification(r.role, r.message, selectedRequestId, 'status_change'));

      nextNotifs = [...createdNotifs, ...nextNotifs];
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
      currentStatus: RetirementStatus.PENDING_HEAD_OF_ADMIN, // submits to Line Manager verifications
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

    // Notification to Line Manager
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
          `RETIREMENT REVIEWS: Claim folder ${selectedRetirementId} passed Line Manager audit. Verify receipts.`,
          activeRet.cashAdvanceRef,
          'approval_required'
        );
        nextNotifs = [hAlert, ...nextNotifs];
      } else if (nextRetObj.currentStatus === RetirementStatus.PENDING_EXECUTIVE_OFFICE) {
        const iAlert = triggerNotification(
          UserRole.EXECUTIVE_DIRECTOR,
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
        // Escalate to Line Manager and Executive Director
        const hoaAlert = triggerNotification(
          UserRole.HEAD_OF_ADMIN,
          `ESCALATION: Awaiting payment request ${a.referenceNumber} has remained unresolved for over 5 days. Urgent Line Manager intervention recommended.`,
          a.referenceNumber,
          'escalation'
        );
        const eoAlert = triggerNotification(
          UserRole.EXECUTIVE_DIRECTOR,
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
        comment: 'High priority alerts issued directly to Line Manager and Executive Directors desks.'
      };

      handleSaveData(advances, retirements, [newLog, ...logs], nextNotifs);
      alert('Simulation completed! Escalated alerts dispatched for Line Manager and Executive Director feed.');
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

  const handlePurgeAdvances = () => {
    setAdvances([]);
    saveStoredData({ advances: [] }, authUser?.id);
    
    const nextLogs: AuditLogEntry[] = [{
      id: `sys-${Date.now()}`,
      requestReference: 'SYSTEM_CONFIG',
      type: 'System',
      user: currentUser.name,
      role: currentUser.role,
      action: 'Emergency Cash Advances Database Purged via IT CMS Controls',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    }, ...logs];
    setLogs(nextLogs);
    saveStoredData({ logs: nextLogs }, authUser?.id);
  };

  const handlePurgeRetirements = () => {
    setRetirements([]);
    saveStoredData({ retirements: [] }, authUser?.id);

    const nextLogs: AuditLogEntry[] = [{
      id: `sys-${Date.now()}`,
      requestReference: 'SYSTEM_CONFIG',
      type: 'System',
      user: currentUser.name,
      role: currentUser.role,
      action: 'Emergency Retirements Database Purged via IT CMS Controls',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    }, ...logs];
    setLogs(nextLogs);
    saveStoredData({ logs: nextLogs }, authUser?.id);
  };

  if (!isLoggedIn) {
    return (
      <ModernAuth
        onLoginSuccess={handleLoginSuccess}
        customBackgroundUrl={systemSettings.customBackgroundUrl}
        customLogoUrl={systemSettings.customLogoUrl}
        customFrameColor={systemSettings.customFrameColor}
      />
    );
  }

  // Compute desktop header signout button visibility
  const showDesktopSignOut = authUser && isLoggedIn;

  return (
    <div
      id="full-app-root"
      className="min-h-screen flex flex-col font-sans select-none antialiased portal-dashboard"
      style={{
        background: 'var(--color-off-white)',
        '--cms-frame-bg': systemSettings.customFrameColor || '#ffffff',
        '--cms-frame-border': systemSettings.customFrameColor || '#cbd5e1',
        '--cms-table-border': systemSettings.customTableColor || '#cbd5e1'
      } as React.CSSProperties}
    >
      


      {/* Framework container containing sidebar and content workdesk */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0">
        
        {/* Sleek Design Theme Sidebar Tab Panel (Desktop only) */}
          <aside className="w-64 text-slate-300 hidden lg:flex flex-col border-r border-slate-700/50 shrink-0 print:hidden select-none shadow-2xl" style={{background: 'linear-gradient(180deg, var(--color-deep-forest) 0%, var(--color-dark-green) 100%)'}}>
          {/* Logo Portion */}
          <div className="p-6 border-b border-slate-700/30" style={{background: 'var(--color-off-white, #EFEFF1)'}}>
            <div className="flex items-center gap-3">
              <div className="h-8 flex items-center justify-center shrink-0">
                <img
                  src={systemSettings.customLogoUrl?.trim() || 'https://i.imgur.com/Om0LsC2.png'}
                  alt="Company Logo"
                  className="h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    const target = event.currentTarget as HTMLImageElement;
                    target.src = 'https://i.imgur.com/Om0LsC2.png';
                  }}
                />
              </div>
                <div className="min-w-0">
                  <h1 className="font-extrabold text-sm tracking-tight leading-none uppercase truncate" style={{color: 'var(--color-deep-forest)'}}>{systemSettings.customLogoText || 'INTERNAL MEMO'}</h1>
                  <p className="text-[9px] mt-1 uppercase tracking-widest font-mono" style={{color: 'var(--color-gold-bronze)'}}>APPROVAL PORTAL</p>
                </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            <div className="px-3 pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Main Workspaces</div>
            
            <button
              id="sidebar-tab-btn-dashboard"
              onClick={() => { setActiveTab('dashboard'); handleSetStatusFilter(null); }}
              className={`w-full flex items-center px-4 py-3 space-x-3 text-left transition-all duration-200 border-l-4 cursor-pointer font-sans text-xs font-semibold rounded-lg mx-0.5 ${
                activeTab === 'dashboard'
                  ? 'bg-[#EFEFF1] border-[#3A4645] text-[#A68D63] shadow-lg shadow-[#3A4645]/20'
                  : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <TrendingUp className="w-4.5 h-4.5 text-[#A68D63] shrink-0" />
              <span>Overview Dashboard</span>
            </button>

            <button
              id="sidebar-tab-btn-requests"
              onClick={() => { setActiveTab('requests'); setSelectedRequestId(null); setIsInitiatingAdvance(false); }}
              className={`w-full flex items-center px-4 py-3 space-x-3 text-left transition-all duration-200 border-l-4 cursor-pointer font-sans text-xs font-semibold rounded-lg mx-0.5 ${
                activeTab === 'requests'
                  ? 'bg-[#EFEFF1] border-[#3A4645] text-[#A68D63] shadow-lg shadow-[#3A4645]/20'
                  : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <FileText className="w-4.5 h-4.5 text-[#A68D63] shrink-0" />
              <span>Cash Advance Memos</span>
            </button>

            <button
              id="sidebar-tab-btn-retirement"
              onClick={() => { setActiveTab('retirement'); setSelectedRetirementId(null); setIsInitiatingRetirement(false); }}
              className={`w-full flex items-center px-4 py-3 space-x-3 text-left transition-all duration-200 border-l-4 cursor-pointer font-sans text-xs font-semibold rounded-lg mx-0.5 ${
                activeTab === 'retirement'
                  ? 'bg-[#EFEFF1] border-[#3A4645] text-[#A68D63] shadow-lg shadow-[#3A4645]/20'
                  : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Archive className="w-4.5 h-4.5 text-[#A68D63] shrink-0" />
              <span>Fund Retirements</span>
            </button>

            {(authUserRole === UserRole.FINANCE_OFFICER || authUserRole === UserRole.SYSTEM_ADMIN) && (
              <button
                id="sidebar-tab-btn-reports"
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center px-4 py-3 space-x-3 text-left transition-all duration-200 border-l-4 cursor-pointer font-sans text-xs font-semibold rounded-lg mx-0.5 ${
                  activeTab === 'reports'
                    ? 'bg-[#EFEFF1] border-[#3A4645] text-[#A68D63] shadow-lg shadow-[#3A4645]/20'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <CreditCard className="w-4.5 h-4.5 text-[#A68D63] shrink-0" />
                <span>Accounts Ledger</span>
              </button>
            )}
            {(authUserRole === UserRole.INTERNAL_CONTROL || authUserRole === UserRole.SYSTEM_ADMIN) && (
              <button
                id="sidebar-tab-btn-audit"
                onClick={() => setActiveTab('audit')}
                className={`w-full flex items-center px-4 py-3 space-x-3 text-left transition-all duration-200 border-l-4 cursor-pointer font-sans text-xs font-semibold rounded-lg mx-0.5 ${
                  activeTab === 'audit'
                    ? 'bg-[#EFEFF1] border-[#3A4645] text-[#A68D63] shadow-lg shadow-[#3A4645]/20'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <ShieldCheck className="w-4.5 h-4.5 text-[#A68D63] shrink-0" />
                <span>Audit Trail Logs</span>
              </button>
            )}

            {authUserRole === UserRole.SYSTEM_ADMIN && (
            <div className="pt-6 mt-6 space-y-1 border-t border-slate-700/30">
              <div className="px-3 pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">IT Support Administration</div>
              
              <button
                id="sidebar-tab-btn-cms"
                onClick={() => setActiveTab('cms')}
                className={`w-full flex items-center px-4 py-3 space-x-3 text-left transition-all duration-200 border-l-4 cursor-pointer font-sans text-xs font-semibold rounded-lg mx-0.5 ${
                  activeTab === 'cms'
                    ? 'bg-[#EFEFF1] border-[#3A4645] text-[#A68D63] shadow-lg shadow-[#3A4645]/20'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Users className="w-4.5 h-4.5 text-[#A68D63] shrink-0" />
                <span>CMS Portal</span>
              </button>

              <button
                id="sidebar-tab-btn-config"
                onClick={() => setActiveTab('config')}
                className={`w-full flex items-center px-4 py-3 space-x-3 text-left transition-all duration-200 border-l-4 cursor-pointer font-sans text-xs font-semibold rounded-lg mx-0.5 ${
                  activeTab === 'config'
                    ? 'bg-[#EFEFF1] border-[#3A4645] text-[#A68D63] shadow-lg shadow-[#3A4645]/20'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <ShieldAlert className="w-4.5 h-4.5 text-[#A68D63] shrink-0 animate-pulse" />
                <span>Internal Memo Configuration</span>
              </button>
            </div>
            )}
          </nav>

          {/* Profile Section */}
          <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-900 border-t border-slate-700/30 mt-auto">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleProfilePictureClick}
                className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-blue-400/50 shadow-lg shadow-blue-500/20 bg-gradient-to-br from-blue-600 to-purple-600 transition-all hover:shadow-blue-500/40"
                title="Change profile picture"
              >
                {displayProfileAvatar ? (
                  <img src={displayProfileAvatar} alt={currentUser.name} className="w-full h-full object-cover" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white uppercase">
                    {currentUser.name.slice(0, 2)}
                  </div>
                )}
              </button>
              <div className="text-xs min-w-0">
                <p className="font-semibold text-slate-50 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate tracking-wide font-mono leading-none">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content Workspace container */}
        <div className="flex-1 flex flex-col min-h-screen bg-slate-100 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfilePictureChange}
          />
          {/* Main Top Header bar */}
          <header id="app-primary-header" className="border min-h-[56px] md:h-16 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 sticky top-0 z-40 print:hidden shadow-black/30 shadow-xs" style={{background: 'var(--color-dark-green)'}}>
            
            {/* Left Header Title / Toggle menu */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                id="mobile-menu-trigger-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white hover:text-white hover:bg-blue-700 border border-blue-700 rounded lg:hidden transition-all duration-150 active:scale-95"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="min-w-0 text-center">
                <p className="truncate text-sm md:text-base font-semibold" style={{color: 'var(--color-off-white)'}}>
                  {activeTab === 'cms' ? 'CMS Portal' : 'Memo Approval Portal'}
                </p>
                <p className="truncate text-[11px] leading-none" style={{color: 'var(--color-light-gold)'}}>
                  {activeTab === 'dashboard' ? 'Overview Operations' :
                   activeTab === 'requests' ? 'Cash Advance Allocation' :
                   activeTab === 'retirement' ? 'Audit Expense & Retirements' :
                   activeTab === 'reports' ? 'Corporate General Accounts' :
                   activeTab === 'audit' ? 'Expenditure Compliance Audit Logs' :
                   activeTab === 'cms' ? 'CMS and IT Support Workspace' :
                   'Internal Memo Simulator Desk'}
                </p>
              </div>
            </div>

            

            {/* Right Header Controls */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              
              <NotificationBell
                notifications={notifications}
                advances={advances}
                currentRole={currentUser.role}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onSelectRequest={handleSelectRequestDirectly}
                onSendCustomAlert={handleSendCustomAlert}
              />

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="hidden md:flex items-center gap-2.5">
                <div className="text-right">
                  <span className="text-xs font-bold block leading-none truncate" style={{color: 'var(--color-deep-forest)'}}>{currentUser.name}</span>
                  <span className="text-[9px] font-mono font-semibold block mt-1 uppercase leading-none truncate" style={{color: 'var(--color-light-gold)'}}>{currentUser.role}</span>
                </div>
                <button
                  type="button"
                  onClick={handleProfilePictureClick}
                  className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border shadow-xs transition-all"
                  style={{background: 'var(--color-gold-bronze)', borderColor: 'var(--color-light-gold)'}}
                  title="Change profile picture"
                >
                  {displayProfileAvatar ? (
                    <img
                      src={displayProfileAvatar}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-extrabold text-white uppercase">
                      {currentUser.name.slice(0, 2)}
                    </div>
                  )}
                  <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-blue-600 text-[10px] font-bold border border-blue-200">+</span>
                </button>
                <button
                  id="app-header-logout-trigger"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent transition-all cursor-pointer ml-1 active:scale-95"
                  title="Secure logout session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </header>

      {/* Mobile responsive slide dropdown Menu */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-dropdown" className="lg:hidden bg-white border-b border-slate-200 p-3 space-y-1 flex flex-col z-30 sticky top-14 md:top-16 print:hidden">
          <button
            id="mob-tab-dashboard"
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); handleSetStatusFilter(null); }}
            className={`p-3 rounded-lg font-bold text-sm text-left transition-colors active:scale-95 ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
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
            className={`p-3 rounded-lg font-bold text-sm text-left transition-colors active:scale-95 ${activeTab === 'retirement' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Fund Retirements
          </button>
          {(authUserRole === UserRole.FINANCE_OFFICER || authUserRole === UserRole.SYSTEM_ADMIN) && (
          <button
            id="mob-tab-reports"
            onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
            className={`p-3 rounded-lg font-bold text-sm text-left transition-colors active:scale-95 ${activeTab === 'reports' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Accounts Ledger
          </button>
          )}
          {(authUserRole === UserRole.INTERNAL_CONTROL || authUserRole === UserRole.SYSTEM_ADMIN) && (
          <button
            id="mob-tab-audit"
            onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
            className={`p-3 rounded-lg font-bold text-sm text-left transition-colors active:scale-95 ${activeTab === 'audit' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Audit Trail
          </button>
          )}
          
          {authUserRole === UserRole.SYSTEM_ADMIN && (
          <>
          <button
            id="mob-tab-cms"
            onClick={() => { setActiveTab('cms'); setMobileMenuOpen(false); }}
            className={`p-3 rounded-lg font-bold text-sm text-left transition-colors active:scale-95 ${activeTab === 'cms' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            CMS Portal
          </button>
          
          <button
            id="mob-tab-config"
            onClick={() => { setActiveTab('config'); setMobileMenuOpen(false); }}
            className={`p-3 rounded-lg font-bold text-sm text-left transition-colors active:scale-95 ${activeTab === 'config' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
          >
            Configuration
          </button>
          </>
          )}
          
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-2 py-3 mt-2">
            <div>
              <span className="block font-bold text-slate-700">{currentUser.name}</span>
              <span className="font-mono text-[10px] text-slate-400">{currentUser.role}</span>
            </div>
            <button
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="text-red-600 hover:text-red-700 font-bold text-xs px-3 py-2 rounded hover:bg-red-50 transition-colors active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

          {/* Main Space Container workspace */}
          <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-y-auto">
        
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
                  maxAmount={systemSettings.maxCashAdvance}
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
          {activeTab === 'reports' && (authUserRole === UserRole.FINANCE_OFFICER || authUserRole === UserRole.SYSTEM_ADMIN) && (
            <Reports
              advances={advances}
              retirements={retirements}
              onSelectRequest={handleSelectRequestDirectly}
              onSetTab={setActiveTab}
            />
          )}

          {/* TAB CMS: EMAIL AND STAFF CMS PORTAL */}
          {activeTab === 'cms' && authUserRole === UserRole.SYSTEM_ADMIN && (
            <CmsPortal
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
              systemSettings={systemSettings}
              onSaveSystemSettings={handleSaveSystemSettings}
              onPurgeAdvances={handlePurgeAdvances}
              onPurgeRetirements={handlePurgeRetirements}
            />
          )}

          {/* TAB 5: AUDIT TRAIL LOG TAB */}
          {activeTab === 'audit' && (authUserRole === UserRole.INTERNAL_CONTROL || authUserRole === UserRole.SYSTEM_ADMIN) && (
            <AuditTrail
              logs={logs}
              onClearLogs={handleClearLogs}
            />
          )}

          {/* TAB 6: SYSTEM SANDBOX CONTROLS TAB */}
          {activeTab === 'config' && authUserRole === UserRole.SYSTEM_ADMIN && (
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
                  <li><strong>After 5 Days:</strong> Escalate alerts directly to Line Manager and Executive Director levels.</li>
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
