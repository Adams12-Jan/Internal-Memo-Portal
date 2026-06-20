import React, { useState, useEffect } from 'react';
import { 
  Mail, Calendar, Eye, RefreshCw, Save, Sparkles, Send, 
  Users, Trash2, Clock, CheckCircle2, UserPlus, FileCode, Check, 
  ChevronRight, Laptop, Smartphone, HelpCircle, ShieldAlert 
} from 'lucide-react';
import { ImagePlus, UploadCloud } from 'lucide-react';
import { EmailTemplate, SentEmail, UserRole, DEPARTMENTS, SystemCustomSettings } from '../types';
import authClient, { AuthUser } from '../services/authClient';
import cmsClient from '../services/cmsClient';
import { Palette, Wrench, ShieldCheck } from 'lucide-react';

interface CmsPortalProps {
  templates: EmailTemplate[];
  onSaveTemplate: (template: EmailTemplate) => void;
  onResetTemplates: () => void;
  sentEmails: SentEmail[];
  onClearSentEmails: () => void;
  staffMembers: { name: string; role: UserRole; department: string }[];
  onUpdateStaffMembers: (nextStaff: { name: string; role: UserRole; department: string }[]) => void;
  onSimulateReminders: (overdueDays: number) => void;
  onResetFactoryDefault: () => void;
  advances: any[];
  retirements: any[];
  systemSettings: SystemCustomSettings;
  onSaveSystemSettings: (nextSettings: SystemCustomSettings) => void;
  onPurgeAdvances: () => void;
  onPurgeRetirements: () => void;
}

export default function CmsPortal({
  templates,
  onSaveTemplate,
  onResetTemplates,
  sentEmails,
  onClearSentEmails,
  staffMembers,
  onUpdateStaffMembers,
  onSimulateReminders,
  onResetFactoryDefault,
  advances,
  retirements,
  systemSettings,
  onSaveSystemSettings,
  onPurgeAdvances,
  onPurgeRetirements
}: CmsPortalProps) {
  // Sub-tabs: templates, sentLog, directory, users, utilities, settings
  const [subTab, setSubTab] = useState<'templates' | 'sentLog' | 'directory' | 'users' | 'deals' | 'campaigns' | 'utilities' | 'settings'>('templates');
  
  // 1. Template States
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const [tempSubject, setTempSubject] = useState('');
  const [tempBody, setTempBody] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewDataId, setPreviewDataId] = useState<string>('');

  // 2. Directory states
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>(UserRole.ADMIN_OFFICER);
  const [newStaffDept, setNewStaffDept] = useState('Administration');
  const [editingStaffIdx, setEditingStaffIdx] = useState<number | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<UserRole>(UserRole.ADMIN_OFFICER);
  const [editStaffDept, setEditStaffDept] = useState('Administration');
  // Directory UI helpers: loading, errors, pagination, search, sync
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactsPage, setContactsPage] = useState(0);
  const [contactsPageSize, setContactsPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState<number | null>(null);

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.ADMIN_OFFICER);
  const [newUserDept, setNewUserDept] = useState('IT & Systems');
  const [newUserIsActive, setNewUserIsActive] = useState(true);

  // 3. Deals state
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [newDealName, setNewDealName] = useState('');
  const [newDealValue, setNewDealValue] = useState('0');
  const [newDealStage, setNewDealStage] = useState('Prospect');
  const [editingDealIdx, setEditingDealIdx] = useState<number | null>(null);

  // 4. Campaigns state
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSubject, setNewCampaignSubject] = useState('');
  const [newCampaignStatus, setNewCampaignStatus] = useState('Draft');
  const [editingCampaignIdx, setEditingCampaignIdx] = useState<number | null>(null);

  // 5. System settings CMS states
  const [cmsLogoText, setCmsLogoText] = useState(systemSettings.customLogoText);
  const [cmsMaxAdvance, setCmsMaxAdvance] = useState(systemSettings.maxCashAdvance);
  const [cmsRetireDays, setCmsRetireDays] = useState(systemSettings.retirementWindowDays);
  const [cmsExecThreshold, setCmsExecThreshold] = useState(systemSettings.requiresExecutiveApprovalAbove);
  const [cmsAccent, setCmsAccent] = useState(systemSettings.themeAccent);
  const [cmsBorder, setCmsBorder] = useState(systemSettings.borderStyle);
  const [cmsSupportEmail, setCmsSupportEmail] = useState(systemSettings.supportEmail);
  const [cmsSupportPhone, setCmsSupportPhone] = useState(systemSettings.supportPhone);
  const [cmsDebugEnabled, setCmsDebugEnabled] = useState(systemSettings.debugBarEnabled);
  const [cmsLogoUrl, setCmsLogoUrl] = useState(systemSettings.customLogoUrl || '');
  const [cmsBackgroundUrl, setCmsBackgroundUrl] = useState(systemSettings.customBackgroundUrl || '');
  const [cmsFrameColor, setCmsFrameColor] = useState(systemSettings.customFrameColor || '#ffffff');
  const [cmsTableColor, setCmsTableColor] = useState(systemSettings.customTableColor || '#cbd5e1');
  const [cmsIconColor, setCmsIconColor] = useState(systemSettings.customIconColor || '#6366f1');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [logoUploadStatus, setLogoUploadStatus] = useState('');
  const [backgroundUploadStatus, setBackgroundUploadStatus] = useState('');
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);
  const [backgroundUploadLoading, setBackgroundUploadLoading] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  useEffect(() => {
    setCmsLogoText(systemSettings.customLogoText);
    setCmsMaxAdvance(systemSettings.maxCashAdvance);
    setCmsRetireDays(systemSettings.retirementWindowDays);
    setCmsExecThreshold(systemSettings.requiresExecutiveApprovalAbove);
    setCmsAccent(systemSettings.themeAccent);
    setCmsBorder(systemSettings.borderStyle);
    setCmsSupportEmail(systemSettings.supportEmail);
    setCmsSupportPhone(systemSettings.supportPhone);
    setCmsDebugEnabled(systemSettings.debugBarEnabled);
    setCmsLogoUrl(systemSettings.customLogoUrl || '');
    setCmsBackgroundUrl(systemSettings.customBackgroundUrl || '');
    setCmsFrameColor(systemSettings.customFrameColor || '#ffffff');
    setCmsTableColor(systemSettings.customTableColor || '#cbd5e1');
    setCmsIconColor(systemSettings.customIconColor || '#6366f1');
  }, [systemSettings]);

  // Trigger preview compile when template selection changes
  useEffect(() => {
    if (selectedTemplate) {
      setTempSubject(selectedTemplate.subject);
      setTempBody(selectedTemplate.body);
    }
  }, [selectedTemplateId, templates]);

  // Dynamic compiler function for visual email previews
  const compileTemplateHTML = (html: string, recordId: string) => {
    // Pick an active record or fallback mock
    let refNum = "CA-2026-003";
    let staff = "Ovat Daniel";
    let dept = "Administration";
    let purpose = "Procurement of office stationery and printing materials";
    let amtReq = "450";
    let expireDate = "2026-06-25";
    let method = "Bank Transfer";
    let paymentRef = "TXN-902183712";
    let amtPaid = "450";
    let remark = "Urgent plumbing repairs approved and closed.";
    let retId = "RET-2026-001";
    let advAmt = "800";
    let utilAmt = "780";
    let refBal = "20";
    let evUser = "Marcus Vance";
    let evRole = "Internal Control Officer";
    let evAction = "Approved and Cleared";
    let stateVal = "Awaiting Finance Payment";

    // Try to load actual state values
    if (advances && advances.length > 0) {
      const liveAdv = advances.find(a => a.id === recordId) || advances[0];
      if (liveAdv) {
        refNum = liveAdv.referenceNumber;
        staff = liveAdv.staffName;
        dept = liveAdv.department;
        purpose = liveAdv.purpose;
        amtReq = String(liveAdv.amountRequested);
        expireDate = liveAdv.expectedRetirementDate;
        stateVal = liveAdv.currentStatus;
        
        if (liveAdv.paymentDetails) {
          method = liveAdv.paymentDetails.paymentMethod;
          paymentRef = liveAdv.paymentDetails.paymentReference;
          amtPaid = String(liveAdv.paymentDetails.amountPaid);
        }
      }
    }

    if (retirements && retirements.length > 0) {
      const liveRet = retirements[0];
      if (liveRet) {
        retId = liveRet.id.replace('RET-', '');
        advAmt = String(liveRet.amountAdvanced);
        utilAmt = String(liveRet.amountUtilized);
        refBal = String(liveRet.balanceReturned);
        remark = liveRet.comment || "";
      }
    }

    let compiled = html;
    compiled = compiled.replace(/\{\{referenceNumber\}\}/g, refNum);
    compiled = compiled.replace(/\{\{staffName\}\}/g, staff);
    compiled = compiled.replace(/\{\{department\}\}/g, dept);
    compiled = compiled.replace(/\{\{purpose\}\}/g, purpose);
    compiled = compiled.replace(/\{\{amountRequested\}\}/g, amtReq);
    compiled = compiled.replace(/\{\{expectedRetirementDate\}\}/g, expireDate);
    compiled = compiled.replace(/\{\{paymentMethod\}\}/g, method);
    compiled = compiled.replace(/\{\{paymentReference\}\}/g, paymentRef);
    compiled = compiled.replace(/\{\{amountPaid\}\}/g, amtPaid);
    compiled = compiled.replace(/\{\{appUrl\}\}/g, window.location.origin);
    compiled = compiled.replace(/\{\{actionUser\}\}/g, evUser);
    compiled = compiled.replace(/\{\{actionRole\}\}/g, evRole);
    compiled = compiled.replace(/\{\{actionName\}\}/g, evAction);
    compiled = compiled.replace(/\{\{comment\}\}/g, remark);
    compiled = compiled.replace(/\{\{status\}\}/g, stateVal);
    compiled = compiled.replace(/\{\{retirementId\}\}/g, retId);
    compiled = compiled.replace(/\{\{amountAdvanced\}\}/g, advAmt);
    compiled = compiled.replace(/\{\{amountUtilized\}\}/g, utilAmt);
    compiled = compiled.replace(/\{\{balanceReturned\}\}/g, refBal);

    return compiled;
  };

  const handleSave = () => {
    if (!tempSubject.trim() || !tempBody.trim()) {
      alert("Error: Subject and Body template content cannot be empty.");
      return;
    }
    const updated: EmailTemplate = {
      ...selectedTemplate,
      subject: tempSubject,
      body: tempBody
    };
    onSaveTemplate(updated);
    alert(`Success: Customizable template "${selectedTemplate.name}" has been updated inside corporate cache ledger!`);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      alert("Please enter a valid staff name.");
      return;
    }
    // Check duplicates
    if (staffMembers.some(s => s.name.toLowerCase() === newStaffName.toLowerCase().trim())) {
      alert("Error: Employee name already exists in the corporate staff register.");
      return;
    }
    const addedMember = {
      name: newStaffName.trim(),
      role: newStaffRole,
      department: newStaffDept
    };
    // Try to persist to backend CMS, fall back to local update
    (async () => {
      try {
        const payload = { name: addedMember.name, department: addedMember.department, role: String(addedMember.role) };
        const created = await cmsClient.createContact(payload as any);
        // map created contact to staff member representation
        const next = [...staffMembers, { name: created.name || addedMember.name, role: addedMember.role, department: created.department || addedMember.department }];
        onUpdateStaffMembers(next);
        setNewStaffName('');
        // refresh current page after successful create
        setTimeout(() => fetchPageContacts(contactsPage, contactsPageSize, searchQuery), 200);
        alert(`Personnel "${addedMember.name}" successfully incorporated into staff directory registry (synced).`);
      } catch (err) {
        // fallback local
        onUpdateStaffMembers([...staffMembers, addedMember]);
        setNewStaffName('');
        alert(`Personnel "${addedMember.name}" added locally (backend unavailable).`);
      }
    })();
  };

  const fetchPageContacts = async (page: number, pageSize: number, q: string) => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const offset = page * pageSize;
      const contacts: any[] = await cmsClient.getContacts(pageSize, offset);
      // If backend returned an array, map and update staffMembers
      if (Array.isArray(contacts)) {
        const mapped = contacts.map((c: any) => ({ name: c.name || '', role: (c.role as UserRole) || UserRole.ADMIN_OFFICER, department: c.department || 'Administration' }));
        onUpdateStaffMembers(mapped);
      }
      setLastSync(Date.now());
    } catch (e: any) {
      setContactsError(String(e?.message || e));
    } finally {
      setContactsLoading(false);
    }
  };

  const fetchDeals = async (pageSize = 50, offset = 0) => {
    setDealsLoading(true);
    setDealsError(null);
    try {
      const dealsList: any[] = await cmsClient.getDeals(pageSize, offset);
      if (Array.isArray(dealsList)) {
        setDeals(dealsList);
      }
    } catch (e: any) {
      setDealsError(String(e?.message || e));
    } finally {
      setDealsLoading(false);
    }
  };

  const fetchCampaigns = async (pageSize = 50, offset = 0) => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const campaignsList: any[] = await cmsClient.getCampaigns(pageSize, offset);
      if (Array.isArray(campaignsList)) {
        setCampaigns(campaignsList);
      }
    } catch (e: any) {
      setCampaignsError(String(e?.message || e));
    } finally {
      setCampaignsLoading(false);
    }
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealName.trim()) {
      alert("Please enter a valid deal name.");
      return;
    }
    try {
      const payload = { name: newDealName.trim(), value: Number(newDealValue) || 0, stage: newDealStage };
      const created = await cmsClient.createDeal(payload);
      setDeals([...deals, created]);
      setNewDealName('');
      setNewDealValue('0');
      alert(`Deal "${newDealName}" created successfully.`);
      fetchDeals();
    } catch (err) {
      alert(`Error creating deal: ${err}`);
    }
  };

  const handleDeleteDeal = async (index: number) => {
    const deal = deals[index];
    if (confirm(`Delete deal "${deal.name}"?`)) {
      try {
        await cmsClient.deleteDeal(deal.id);
        setDeals(deals.filter((_, i) => i !== index));
        alert("Deal deleted successfully.");
        fetchDeals();
      } catch (err) {
        alert(`Error deleting deal: ${err}`);
      }
    }
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) {
      alert("Please enter a valid campaign name.");
      return;
    }
    try {
      const payload = { name: newCampaignName.trim(), subject: newCampaignSubject, status: newCampaignStatus };
      const created = await cmsClient.createCampaign(payload);
      setCampaigns([...campaigns, created]);
      setNewCampaignName('');
      setNewCampaignSubject('');
      alert(`Campaign "${newCampaignName}" created successfully.`);
      fetchCampaigns();
    } catch (err) {
      alert(`Error creating campaign: ${err}`);
    }
  };

  const handleDeleteCampaign = async (index: number) => {
    const campaign = campaigns[index];
    if (confirm(`Delete campaign "${campaign.name}"?`)) {
      try {
        await cmsClient.deleteCampaign(campaign.id);
        setCampaigns(campaigns.filter((_, i) => i !== index));
        alert("Campaign deleted successfully.");
        fetchCampaigns();
      } catch (err) {
        alert(`Error deleting campaign: ${err}`);
      }
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const userList = await authClient.getUsers();
      setUsers(userList);
    } catch (err: any) {
      setUsersError(String(err?.message || err));
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserEmail.trim() || !newUserFirstName.trim() || !newUserLastName.trim() || !newUserPassword || !newUserConfirmPassword) {
      alert('Please complete all required fields.');
      return;
    }

    if (newUserPassword !== newUserConfirmPassword) {
      alert('Passwords do not match. Please confirm the new password.');
      return;
    }

    try {
      await authClient.createUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        firstName: newUserFirstName.trim(),
        lastName: newUserLastName.trim(),
        department: newUserDept,
        role: newUserRole,
        isActive: newUserIsActive
      });

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserConfirmPassword('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserRole(UserRole.ADMIN_OFFICER);
      setNewUserDept('IT & Systems');
      setNewUserIsActive(true);

      alert('User account created successfully.');
      fetchUsers();
    } catch (err: any) {
      alert(`Error creating user account: ${err?.message || err}`);
    }
  };

  const handleToggleUserActive = async (user: AuthUser) => {
    const confirmAction = confirm(
      `Are you sure you want to ${user.is_active ? 'disable' : 'enable'} the account for ${user.email}?`
    );
    if (!confirmAction) {
      return;
    }

    try {
      await authClient.updateUser(user.id, { isActive: !user.is_active });
      fetchUsers();
      alert(`User account ${user.is_active ? 'disabled' : 'enabled'} successfully.`);
    } catch (err: any) {
      alert(`Error updating user status: ${err?.message || err}`);
    }
  };

  const handleResetUserPassword = async (user: AuthUser) => {
    const newPassword = prompt(`Enter a new password for ${user.email}:`, '');
    if (!newPassword) {
      return;
    }

    try {
      await authClient.updateUser(user.id, { resetPassword: newPassword });
      alert('Password reset successfully.');
    } catch (err: any) {
      alert(`Error resetting password: ${err?.message || err}`);
    }
  };

  const handleClearUserProfile = async (user: AuthUser) => {
    if (!confirm(`Clear profile data for ${user.email}? This will remove name, department, and profile photo links.`)) {
      return;
    }

    try {
      await authClient.clearUserProfile(user.id);
      fetchUsers();
      alert('User profile data cleared successfully.');
    } catch (err: any) {
      alert(`Error clearing profile data: ${err?.message || err}`);
    }
  };

  const handleDeleteUser = async (user: AuthUser) => {
    if (!confirm(`Permanently delete user account ${user.email}? This cannot be undone.`)) {
      return;
    }

    try {
      await authClient.deleteUser(user.id);
      setUsers((current) => current.filter((u) => u.id !== user.id));
      alert('User account deleted successfully.');
    } catch (err: any) {
      alert(`Error deleting user account: ${err?.message || err}`);
    }
  };

  const handleEditStaff = (index: number) => {
    const s = staffMembers[index];
    setEditingStaffIdx(index);
    setEditStaffName(s.name);
    setEditStaffRole(s.role);
    setEditStaffDept(s.department);
  };

  const handleSaveEditStaff = () => {
    if (!editStaffName.trim()) {
      alert("Employee name cannot be empty.");
      return;
    }
    const nextList = [...staffMembers];
    nextList[editingStaffIdx!] = {
      name: editStaffName.trim(),
      role: editStaffRole,
      department: editStaffDept
    };
    onUpdateStaffMembers(nextList);
    setEditingStaffIdx(null);
    alert("Employee record updated successfully in control data!");
  };

  const handleDeleteStaff = (index: number) => {
    if (staffMembers.length <= 1) {
      alert("Error: Directory requires at least 1 employee to function.");
      return;
    }
    const person = staffMembers[index];
    if (confirm(`Remove "${person.name}" from active staff registers? Dynamic login simulations will clear.`)) {
      (async () => {
        try {
          // attempt to find contact by name via CMS search and delete first match
          const contacts = await cmsClient.getContacts(50, 0);
          const match = contacts.find((c: any) => String(c.name).toLowerCase() === String(person.name).toLowerCase());
          if (match && match.id) {
            await cmsClient.deleteContact(match.id);
            // refresh current page after removal
            setTimeout(() => fetchPageContacts(contactsPage, contactsPageSize, searchQuery), 200);
          }
        } catch (e) {
          // ignore errors and continue with local removal
        }
        const nextList = staffMembers.filter((_, idx) => idx !== index);
        onUpdateStaffMembers(nextList);
        alert("Personnel permanently detached from active organizational directories.");
      })();
    }
  };

  const handleLogoFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoUploadStatus('Only image files are supported for brand logos.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadStatus('Logo file must be smaller than 5MB.');
      return;
    }
    setLogoFile(file);
    setLogoUploadStatus('Ready to upload logo.');
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      setLogoUploadStatus('Choose a logo file first.');
      return;
    }
    setLogoUploadLoading(true);
    setLogoUploadStatus('Uploading logo...');
    try {
      const uploaded = await cmsClient.uploadMedia(logoFile);
      setCmsLogoUrl(uploaded.fileUrl);
      setLogoFile(null);
      setLogoUploadStatus('Logo uploaded successfully. Save settings to apply permanently.');
    } catch (err: any) {
      setLogoUploadStatus(`Upload failed: ${err?.message || err}`);
    } finally {
      setLogoUploadLoading(false);
    }
  };

  const handleBackgroundFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBackgroundUploadStatus('Only image files are supported for portal background images.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBackgroundUploadStatus('Background image must be smaller than 10MB.');
      return;
    }
    setBackgroundFile(file);
    setBackgroundUploadStatus('Ready to upload portal background.');
  };

  const handleUploadBackground = async () => {
    if (!backgroundFile) {
      setBackgroundUploadStatus('Choose a background file first.');
      return;
    }
    setBackgroundUploadLoading(true);
    setBackgroundUploadStatus('Uploading background image...');
    try {
      const uploaded = await cmsClient.uploadMedia(backgroundFile);
      setCmsBackgroundUrl(uploaded.fileUrl);
      setBackgroundFile(null);
      setBackgroundUploadStatus('Background uploaded successfully. Save settings to apply permanently.');
    } catch (err: any) {
      setBackgroundUploadStatus(`Upload failed: ${err?.message || err}`);
    } finally {
      setBackgroundUploadLoading(false);
    }
  };

  // Load CMS contacts when directory tab is active
  useEffect(() => {
    if (subTab !== 'directory') return;
    // Load the current page with optional search
    fetchPageContacts(contactsPage, contactsPageSize, searchQuery);
  }, [subTab]);

  // refetch when page, pageSize or query changes while directory is active
  useEffect(() => {
    if (subTab !== 'directory') return;
    fetchPageContacts(contactsPage, contactsPageSize, searchQuery);
  }, [contactsPage, contactsPageSize, searchQuery]);

  // Load CMS deals when deals tab is active
  useEffect(() => {
    if (subTab !== 'deals') return;
    fetchDeals();
  }, [subTab]);

  // Load CMS campaigns when campaigns tab is active
  useEffect(() => {
    if (subTab !== 'campaigns') return;
    fetchCampaigns();
  }, [subTab]);

  // Load admin users when users tab is active
  useEffect(() => {
    if (subTab !== 'users') return;
    fetchUsers();
  }, [subTab]);

  // View modal helper for looking at html outbox logs
  const [viewingEmailBody, setViewingEmailBody] = useState<string | null>(null);
  const [viewingEmailSubject, setViewingEmailSubject] = useState<string | null>(null);

  return (
    <div id="cms-portal-workspace" className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans pb-12">
      
      {/* Visual Workspace Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md shadow-indigo-900/10">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-5.5 h-5.5 text-blue-400" /> CMS & Systems Control Portal
          </h2>
          <p className="text-xs text-slate-400">
            Configure dynamic notifications, modify corporate directory personnel, audit sent outbox mails, and execute scheduler utilities.
          </p>
        </div>

        <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs font-semibold shrink-0">
          <button 
            id="subtab-templates"
            onClick={() => setSubTab('templates')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'templates' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Email Templates
          </button>
          <button 
            id="subtab-sent-log"
            onClick={() => setSubTab('sentLog')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'sentLog' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Sent Outbox ({sentEmails.length})
          </button>
          <button 
            id="subtab-directory"
            onClick={() => setSubTab('directory')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'directory' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Corporate Staff ({staffMembers.length})
          </button>
          <button 
            id="subtab-users"
            onClick={() => setSubTab('users')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'users' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            User Accounts
          </button>
          <button 
            id="subtab-deals"
            onClick={() => setSubTab('deals')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'deals' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Sales Deals ({deals.length})
          </button>
          <button 
            id="subtab-campaigns"
            onClick={() => setSubTab('campaigns')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'campaigns' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Campaigns ({campaigns.length})
          </button>
          <button 
            id="subtab-utilities"
            onClick={() => setSubTab('utilities')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'utilities' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            System Scheduler
          </button>
          <button 
            id="subtab-settings"
            onClick={() => setSubTab('settings')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'settings' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            ⚙️ IT CMS Settings
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: EMAIL TEMPLATES BUILD SYSTEM */}
      {subTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A: Left side template selector links */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Customizable Mail Flow</span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {templates.map(t => {
                const isActive = t.id === selectedTemplateId;
                return (
                  <button
                    id={`select-template-btn-${t.id}`}
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer ${isActive ? 'bg-blue-50/50 border-r-4 border-blue-505 font-medium' : ''}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: t.bannerColor }}></div>
                    <div className="min-w-0">
                      <span className={`text-xs font-bold block ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>{t.name}</span>
                      <p className="text-[11px] text-slate-400 mt-1 lines-clamp-2 leading-normal">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50/80 border-t border-slate-200 text-center">
              <button
                id="reset-templates-factory-btn"
                onClick={() => {
                  if (confirm("Reset editing templates to pristine default system states? All customized markup changes will refresh.")) {
                    onResetTemplates();
                    alert("Custom layouts restored successfully.");
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center justify-center gap-1 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Revert all Templates
              </button>
            </div>
          </div>

          {/* Column B: Right side editable workspace and visual sandboxed representation */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* The Code Editor Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-150">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Editing Layout Code: {selectedTemplate.name}</h3>
                  <p className="text-[11px] text-slate-400">Update subject variables and HTML layout lines dynamically.</p>
                </div>

                <button
                  id="save-template-detail-btn"
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-100"
                >
                  <Save className="w-4 h-4" /> Save Template
                </button>
              </div>

              {/* Subject config */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dynamic Email Subject Line</label>
                <input
                  id="template-subject-input"
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-bold outline-none focus:border-blue-500 font-sans text-slate-800"
                  value={tempSubject}
                  onChange={(e) => setTempSubject(e.target.value)}
                />
              </div>

              {/* Available placeholders list */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 relative">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Supported Interpolation Variables</span>
                <div className="flex flex-wrap gap-1.5">
                  {['referenceNumber', 'staffName', 'department', 'purpose', 'amountRequested', 'expectedRetirementDate', 'actionUser', 'actionRole', 'actionName', 'comment', 'paymentMethod', 'paymentReference', 'amountPaid', 'status', 'retirementId', 'amountAdvanced', 'amountUtilized', 'balanceReturned', 'appUrl'].map(v => (
                    <button
                      key={v}
                      onClick={() => {
                        // Insert at current cursor position or wrap in copy notification
                        navigator.clipboard.writeText(`{{${v}}}`);
                        alert(`Copied interpolation variable to clipboard: {{${v}}}`);
                      }}
                      className="text-[10px] font-mono bg-white hover:bg-blue-50 text-slate-650 hover:text-blue-700 border border-slate-200 hover:border-blue-200 py-0.5 px-1.5 rounded transition-all cursor-pointer font-medium"
                      title="Click to copy placeholder"
                    >
                      {"{{" + v + "}}"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Markup Area */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <FileCode className="w-4 h-4 text-slate-400" /> Responsive Layout HTML Source
                </label>
                <textarea
                  id="template-body-textarea"
                  rows={13}
                  className="w-full bg-slate-900 border border-slate-950 p-4 rounded-xl text-[11px] font-mono text-emerald-400 outline-none leading-relaxed"
                  value={tempBody}
                  onChange={(e) => setTempBody(e.target.value)}
                />
              </div>
            </div>

            {/* Visual Live Sandbox representation (Previewer!) */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Dynamic IFrame Mail Sandbox representation</h4>
                  <p className="text-[11px] text-slate-400">See exact visual compiler render substituting real test variables.</p>
                </div>

                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-[10px] font-bold">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1 px-2 rounded-md ${previewDevice === 'desktop' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Laptop className="w-3.5 h-3.5 inline mr-1" /> Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1 px-2 rounded-md ${previewDevice === 'mobile' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5 inline mr-1" /> Mobile
                  </button>
                </div>
              </div>

              {/* Dynamic selector to pick an existing Cash Advance and preview with its real data */}
              <div className="p-3 bg-slate-50/50 border-b border-slate-200 flex items-center gap-3 text-xs">
                <span className="text-slate-400 font-medium">Render with values from request:</span>
                <select
                  id="preview-data-selector"
                  className="bg-white border border-slate-200 p-1.5 rounded outline-none font-bold text-slate-700 text-xs"
                  value={previewDataId}
                  onChange={(e) => setPreviewDataId(e.target.value)}
                >
                  <option value="">-- Choose Test Advance folder --</option>
                  {advances.map(a => (
                    <option key={a.id} value={a.id}>{a.referenceNumber} ({a.staffName.slice(0, 15)})</option>
                  ))}
                </select>
              </div>

              {/* The Preview container */}
              <div className="p-6 bg-slate-100 flex justify-center items-center">
                <div 
                  className={`bg-white border border-slate-200 shadow-lg rounded-xl overflow-y-auto transition-all duration-350 ${
                    previewDevice === 'desktop' ? 'w-full h-[450px]' : 'w-[400px] h-[550px]'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  <div className="bg-slate-50 border-b border-slate-150 px-4 py-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Subject: {compileTemplateHTML(tempSubject, previewDataId)}</span>
                    <span className="uppercase text-[8px] bg-slate-200 text-slate-500 rounded px-1.5 font-bold">Mailbox Sandbox</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: compileTemplateHTML(tempBody, previewDataId) }} />
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 2: SENT OUTBOX MAIL LOGS */}
      {subTab === 'sentLog' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Corporate Outbox Auditing Logs</h3>
              <p className="text-[11px] text-slate-400">Total email dispatches securely logged: <strong>{sentEmails.length}</strong>. Click any item to inspect actual sent copy.</p>
            </div>

            {sentEmails.length > 0 && (
              <button
                id="clear-sent-outbox-btn"
                onClick={() => {
                  if (confirm("Permanently clear sent notifications log history? This action is immutable.")) {
                    onClearSentEmails();
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-rose-50 transition-colors border border-rose-100 bg-white"
              >
                <Trash2 className="w-3.5 h-3.5" /> Wipe Outbox Logs
              </button>
            )}
          </div>

          {sentEmails.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              No emails have been dispatched during this active session. Play inside approvals or trigger reminders to populated.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs font-sans">
              <table className="min-w-full text-left divide-y divide-slate-100">
                <thead className="bg-slate-50 font-bold uppercase text-slate-450 tracking-wider">
                  <tr>
                    <th className="p-3">Reference No</th>
                    <th className="p-3">Dispatched Date</th>
                    <th className="p-3">Recipient Name (Role)</th>
                    <th className="p-3">Recipient Email</th>
                    <th className="p-3">Subject Line</th>
                    <th className="p-3 text-center">Receipt Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sentEmails.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-700">{item.referenceNumber || "SYSTEM"}</td>
                      <td className="p-3 font-mono text-slate-400">{item.date}</td>
                      <td className="p-3">
                        <strong className="text-slate-800">{item.recipientName}</strong>
                        <span className="block text-[9px] text-slate-400 font-mono italic leading-none mt-1">{item.recipientRole}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-550">{item.recipientEmail}</td>
                      <td className="p-3 font-medium text-slate-700 truncate max-w-xs">{item.subject}</td>
                      <td className="p-3 text-center">
                        <button
                          id={`review-sent-email-${item.id}`}
                          onClick={() => {
                            setViewingEmailBody(item.body);
                            setViewingEmailSubject(item.subject);
                          }}
                          className="bg-slate-50 border border-slate-205 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-650 transition-all rounded py-1 px-2.5 font-bold flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> Review Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* SUB-TAB 3: CORPORATE IDENTITY DIRECTORY (STAFF Directory CMS) */}
      {subTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel creators */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <UserPlus className="w-4 h-4 text-blue-600" /> Add Corporate Employee Record
            </h3>
            
            <form onSubmit={handleAddStaff} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Officer Name *</label>
                <input
                  id="new-staff-name-input"
                  type="text"
                  placeholder="e.g. Douglas Miller"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Corporate Role Authority *</label>
                <select
                  id="new-staff-role-select"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold outline-none focus:border-blue-500"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                >
                  <option value={UserRole.ADMIN_OFFICER}>{UserRole.ADMIN_OFFICER}</option>
                  <option value={UserRole.HEAD_OF_ADMIN}>{UserRole.HEAD_OF_ADMIN}</option>
                  <option value={UserRole.INTERNAL_CONTROL}>{UserRole.INTERNAL_CONTROL}</option>
                  <option value={UserRole.EXECUTIVE_DIRECTOR}>{UserRole.EXECUTIVE_DIRECTOR}</option>
                  <option value={UserRole.FINANCE_OFFICER}>{UserRole.FINANCE_OFFICER}</option>
                  <option value={UserRole.SYSTEM_ADMIN}>{UserRole.SYSTEM_ADMIN}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Department *</label>
                <select
                  id="new-staff-dept-select"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold outline-none focus:border-blue-500"
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <button
                id="add-directory-staff-btn"
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
              >
                Assemble New Officer Profile
              </button>
            </form>
          </div>

          {/* Right panel: Active directory listings */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" /> Authorized Personnel Directory
              </h3>
              <span className="text-[10px] bg-slate-100 font-semibold px-2.5 py-0.5 rounded font-mono text-slate-500">
                ACTIVE COUNT: {staffMembers.length}
              </span>
            </div>

            {/* Directory controls: search, page size, pagination, sync status */}
            <div className="flex items-center justify-between gap-3 pb-3">
              <div className="flex items-center gap-2 w-full">
                <input
                  id="directory-search-input"
                  placeholder="Search staff by name or department..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setContactsPage(0); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                />
                <select
                  id="directory-page-size"
                  value={contactsPageSize}
                  onChange={(e) => { setContactsPageSize(Number(e.target.value)); setContactsPage(0); }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500 mr-2">{contactsLoading ? 'Syncing…' : (lastSync ? `Synced ${new Date(lastSync).toLocaleTimeString()}` : 'Never synced')}</div>
                {contactsError && (
                  <div className="text-[11px] text-rose-600 font-semibold">Error: {contactsError}</div>
                )}
                <button
                  id="directory-prev-page"
                  onClick={() => setContactsPage(p => Math.max(0, p - 1))}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs"
                >Prev</button>
                <div className="text-xs font-mono px-2">Page {contactsPage + 1}</div>
                <button
                  id="directory-next-page"
                  onClick={() => setContactsPage(p => p + 1)}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs"
                >Next</button>
              </div>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {staffMembers.map((item, index) => {
                const cleanEmail = item.name.toLowerCase().replace(/\s+/g, '.') + "@corporate.com";
                const isEditing = editingStaffIdx === index;
                return (
                  <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    {isEditing ? (
                      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <input
                          id={`edit-staff-name-input-${index}`}
                          type="text"
                          className="bg-white border rounded p-1.5 font-bold"
                          value={editStaffName}
                          onChange={(e) => setEditStaffName(e.target.value)}
                        />
                        <select
                          id={`edit-staff-role-select-${index}`}
                          className="bg-white border rounded p-1 text-[11px]"
                          value={editStaffRole}
                          onChange={(e) => setEditStaffRole(e.target.value as UserRole)}
                        >
                          <option value={UserRole.ADMIN_OFFICER}>{UserRole.ADMIN_OFFICER}</option>
                          <option value={UserRole.HEAD_OF_ADMIN}>{UserRole.HEAD_OF_ADMIN}</option>
                          <option value={UserRole.INTERNAL_CONTROL}>{UserRole.INTERNAL_CONTROL}</option>
                          <option value={UserRole.EXECUTIVE_DIRECTOR}>{UserRole.EXECUTIVE_DIRECTOR}</option>
                          <option value={UserRole.FINANCE_OFFICER}>{UserRole.FINANCE_OFFICER}</option>
                          <option value={UserRole.SYSTEM_ADMIN}>{UserRole.SYSTEM_ADMIN}</option>
                        </select>
                        <select
                          id={`edit-staff-dept-select-${index}`}
                          className="bg-white border rounded p-1 text-[11px]"
                          value={editStaffDept}
                          onChange={(e) => setEditStaffDept(e.target.value)}
                        >
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <div className="col-span-1 sm:col-span-3 flex justify-end gap-1 pt-1">
                          <button
                            onClick={() => setEditingStaffIdx(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEditStaff}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            {item.name}
                            {item.role === UserRole.SYSTEM_ADMIN && (
                              <span className="text-[8px] bg-indigo-100 text-indigo-700 rounded-md font-mono py-0.5 px-1 font-extrabold uppercase">Sysop</span>
                            )}
                          </h4>
                          <span className="block mt-1 text-[10px] text-slate-500 font-mono tracking-tight font-semibold uppercase">{item.role}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{item.department} • {cleanEmail}</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                          <button
                            id={`edit-directory-staff-${index}`}
                            onClick={() => handleEditStaff(index)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-white border border-slate-200 rounded px-2.5 py-1 bg-white hover:border-blue-300 shadow-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-directory-staff-${index}`}
                            onClick={() => handleDeleteStaff(index)}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-slate-200 rounded px-1.5 py-1 bg-white transition-colors cursor-pointer"
                            title="Delete employee profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {subTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" /> Create New System User
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address *</label>
                <input
                  id="new-user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">First Name *</label>
                  <input
                    id="new-user-firstname"
                    type="text"
                    placeholder="First name"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Last Name *</label>
                  <input
                    id="new-user-lastname"
                    type="text"
                    placeholder="Last name"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password *</label>
                <input
                  id="new-user-password"
                  type="password"
                  placeholder="Strong password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirm Password *</label>
                <input
                  id="new-user-confirm-password"
                  type="password"
                  placeholder="Confirm password"
                  value={newUserConfirmPassword}
                  onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">User Role *</label>
                <select
                  id="new-user-role"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold outline-none focus:border-blue-500"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                >
                  <option value={UserRole.ADMIN_OFFICER}>{UserRole.ADMIN_OFFICER}</option>
                  <option value={UserRole.HEAD_OF_ADMIN}>{UserRole.HEAD_OF_ADMIN}</option>
                  <option value={UserRole.INTERNAL_CONTROL}>{UserRole.INTERNAL_CONTROL}</option>
                  <option value={UserRole.EXECUTIVE_DIRECTOR}>{UserRole.EXECUTIVE_DIRECTOR}</option>
                  <option value={UserRole.FINANCE_OFFICER}>{UserRole.FINANCE_OFFICER}</option>
                  <option value={UserRole.SYSTEM_ADMIN}>{UserRole.SYSTEM_ADMIN}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
                <select
                  id="new-user-department"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold outline-none focus:border-blue-500"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  id="new-user-active"
                  type="checkbox"
                  checked={newUserIsActive}
                  onChange={(e) => setNewUserIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="new-user-active" className="font-semibold text-slate-600">Activate account immediately</label>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs transition-colors shadow-sm"
              >
                Create User Account
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Admin User Accounts</h3>
                <p className="text-[11px] text-slate-500">Manage user accounts, reset passwords, clear profile data, and enable/disable access.</p>
              </div>
              <button
                id="refresh-user-accounts-btn"
                onClick={fetchUsers}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 rounded px-2 py-1 border border-blue-100 bg-blue-50"
              >
                Refresh
              </button>
            </div>

            {usersLoading ? (
              <div className="text-xs text-slate-500">Loading users…</div>
            ) : usersError ? (
              <div className="text-xs text-rose-600">Error: {usersError}</div>
            ) : users.length === 0 ? (
              <div className="text-xs text-slate-500">No user accounts found. Create one using the form.</div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {users.map((user) => (
                  <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">{user.email}</span>
                        {!user.is_active && <span className="text-[9px] uppercase tracking-wider text-rose-700 bg-rose-100 rounded-full px-2 py-0.5">Disabled</span>}
                        {user.is_verified && <span className="text-[9px] uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Verified</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{user.first_name} {user.last_name} • {user.role} • {user.department || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Created: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleToggleUserActive(user)}
                        className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded px-3 py-2 hover:bg-slate-200"
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleResetUserPassword(user)}
                        className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2 hover:bg-blue-100"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleClearUserProfile(user)}
                        className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 hover:bg-amber-100"
                      >
                        Clear Profile
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded px-3 py-2 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SALES DEALS MANAGEMENT */}
      {subTab === 'deals' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Deal Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" /> Create New Sales Deal
              </h3>
              <form onSubmit={handleAddDeal} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deal Name *</label>
                  <input
                    id="new-deal-name"
                    type="text"
                    placeholder="e.g. Enterprise Contract"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newDealName}
                    onChange={(e) => setNewDealName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deal Value ($)</label>
                  <input
                    id="new-deal-value"
                    type="number"
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stage</label>
                  <select
                    id="new-deal-stage"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                  >
                    <option>Prospect</option>
                    <option>Negotiation</option>
                    <option>Closed Won</option>
                    <option>Closed Lost</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs">
                  Add Deal
                </button>
              </form>
            </div>

            {/* Deals List */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Active Deals ({deals.length})
              </h3>
              {dealsError && <div className="text-xs text-rose-600 mb-3">Error: {dealsError}</div>}
              {dealsLoading && <div className="text-xs text-slate-500">Loading deals...</div>}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {deals.map((deal, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-150 flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{deal.name}</h4>
                      <p className="text-[10px] text-slate-500">${deal.value || 0} • {deal.stage}</p>
                    </div>
                    <button
                      id={`delete-deal-${idx}`}
                      onClick={() => handleDeleteDeal(idx)}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: EMAIL CAMPAIGNS MANAGEMENT */}
      {subTab === 'campaigns' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Campaign Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" /> Create New Campaign
              </h3>
              <form onSubmit={handleAddCampaign} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campaign Name *</label>
                  <input
                    id="new-campaign-name"
                    type="text"
                    placeholder="e.g. Spring Promotion"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Subject</label>
                  <input
                    id="new-campaign-subject"
                    type="text"
                    placeholder="e.g. Exclusive Offer Inside"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newCampaignSubject}
                    onChange={(e) => setNewCampaignSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                  <select
                    id="new-campaign-status"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newCampaignStatus}
                    onChange={(e) => setNewCampaignStatus(e.target.value)}
                  >
                    <option>Draft</option>
                    <option>Scheduled</option>
                    <option>Sent</option>
                    <option>Archived</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs">
                  Create Campaign
                </button>
              </form>
            </div>

            {/* Campaigns List */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" /> Active Campaigns ({campaigns.length})
              </h3>
              {campaignsError && <div className="text-xs text-rose-600 mb-3">Error: {campaignsError}</div>}
              {campaignsLoading && <div className="text-xs text-slate-500">Loading campaigns...</div>}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {campaigns.map((campaign, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-150 flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{campaign.name}</h4>
                      <p className="text-[10px] text-slate-500">{campaign.subject || 'No subject'} • {campaign.status}</p>
                    </div>
                    <button
                      id={`delete-campaign-${idx}`}
                      onClick={() => handleDeleteCampaign(idx)}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: SYSTEM UTILITIES & SCHEDULER */}
      {subTab === 'utilities' && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 text-center">
          <ShieldAlert className="w-12 h-12 text-blue-600 mx-auto animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Operational Scheduler Utilities</h3>
            <p className="text-xs text-slate-500 mt-1">Simulate timing reminders, dispatch overdue notifications, or clear data caches.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-left space-y-3 font-sans">
            <h4 className="text-xs font-bold text-slate-750 uppercase tracking-widest flex items-center gap-1 border-b border-slate-200 pb-2">
              <Clock className="w-4 h-4 text-amber-500" /> Payment Timing simulation triggers
            </h4>
            
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              The specifications dictate system notifications automatically trigger to prompt payout action on lingering files:
            </p>
            <ul className="text-[11px] list-disc pl-4 text-slate-500 space-y-1">
              <li><strong>Pending for &gt;2 Days:</strong> Push alert notify to Finance Officer: <em>"Payment request {`{Ref}`} has been awaiting processing..."</em></li>
              <li><strong>Overdue &gt;5 Days:</strong> Escalate alerts directly to Line Manager and Executive Director.</li>
            </ul>

            <div className="pt-2 grid grid-cols-2 gap-2 text-center">
              <button
                id="trigger-schedule-2-days"
                onClick={() => onSimulateReminders(2)}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all border border-blue-100 flex items-center justify-center gap-1 cursor-pointer"
              >
                🚀 Trigger &gt;2-Day Reminders
              </button>

              <button
                id="trigger-schedule-5-days"
                onClick={() => onSimulateReminders(5)}
                className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all border border-rose-100 flex items-center justify-center gap-1 cursor-pointer"
              >
                🚨 Trigger &gt;5-Day Escalations
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-150">
            <button
              id="system-factory-reset-btn"
              onClick={onResetFactoryDefault}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Wipe cache & Hard Reset Database
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: IT DEPT GLOBAL CMS & THEMES SETTINGS */}
      {subTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-left">
          
          <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-md shadow-indigo-900/15">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5.5 h-5.5 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono select-none">Secure IT Admin Access Active</span>
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-1 font-sans">IT & System Control Center</h3>
              <p className="text-xs text-slate-400">Configure real-time server policy definitions, dynamic theme sets, custom header title and database locks.</p>
            </div>
            
            <button
              type="button"
              id="cms-save-settings-btn-main"
              onClick={() => {
                onSaveSystemSettings({
                  maxCashAdvance: Number(cmsMaxAdvance) || 2000000,
                  retirementWindowDays: Number(cmsRetireDays) || 14,
                  requiresExecutiveApprovalAbove: Number(cmsExecThreshold) || 1000000,
                  customLogoText: cmsLogoText,
                  customLogoUrl: cmsLogoUrl,
                  customBackgroundUrl: cmsBackgroundUrl,
                    customFrameColor: cmsFrameColor,
                    customTableColor: cmsTableColor,
                  themeAccent: cmsAccent,
                  borderStyle: cmsBorder,
                  supportEmail: cmsSupportEmail,
                  supportPhone: cmsSupportPhone,
                  debugBarEnabled: cmsDebugEnabled
                });
                setSaveSettingsSuccess(true);
                setTimeout(() => setSaveSettingsSuccess(false), 3000);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white hover:text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" /> Save CMS System Settings
            </button>
          </div>

          {saveSettingsSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-xs font-bold animate-bounce shadow-xs">
              ✓ IT System changes saved successfully & applied dynamically across the memo portal interface!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
            
            {/* Box 1: Theme & Interface Styling (CMS custom themes) */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-xs">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-500" /> 1. Dynamic Portal Themes
              </h4>
              
              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Theme Color Brand Palette Accent</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCmsAccent('default')}
                    className={`p-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      cmsAccent === 'default' ? 'bg-slate-50 border-blue-600 text-blue-700 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#9F9055] inline-block shadow-inner" />
                    <span className="text-[10px] mt-1 font-bold">Vetiva Gold</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setCmsAccent('blue')}
                    className={`p-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      cmsAccent === 'blue' ? 'bg-slate-50 border-blue-600 text-blue-700 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#2563EB] inline-block shadow-inner" />
                    <span className="text-[10px] mt-1 font-bold">Ocean Blue</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setCmsAccent('purple')}
                    className={`p-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      cmsAccent === 'purple' ? 'bg-slate-50 border-blue-600 text-blue-700 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#8B5CF6] inline-block shadow-inner" />
                    <span className="text-[10px] mt-1 font-bold">Velvet Purple</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCmsAccent('emerald')}
                    className={`p-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      cmsAccent === 'emerald' ? 'bg-slate-50 border-blue-600 text-blue-700 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#10B981] inline-block shadow-inner" />
                    <span className="text-[10px] mt-1 font-bold">Emerald Green</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCmsAccent('crimson')}
                    className={`p-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      cmsAccent === 'crimson' ? 'bg-slate-50 border-blue-600 text-blue-700 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#EF4444] inline-block shadow-inner" />
                    <span className="text-[10px] mt-1 font-bold">Venetian Red</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCmsAccent('orange')}
                    className={`p-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      cmsAccent === 'orange' ? 'bg-slate-50 border-blue-600 text-blue-700 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#F97316] inline-block shadow-inner" />
                    <span className="text-[10px] mt-1 font-bold">Tech Orange</span>
                  </button>
                </div>
              </div>

              {/* Border radius selector */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Corner Border Roundness Style</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCmsBorder('default')}
                    className={`p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-center transition-all cursor-pointer ${
                      cmsBorder === 'default' ? 'border-blue-600 text-blue-700 font-extrabold ring-1 ring-blue-500/20 bg-slate-50/50' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Standard Round
                  </button>
                  <button
                    type="button"
                    onClick={() => setCmsBorder('rounded')}
                    className={`p-2 bg-white rounded-2xl border border-slate-200 text-xs font-bold text-center transition-all cursor-pointer ${
                      cmsBorder === 'rounded' ? 'border-blue-600 text-blue-700 font-extrabold ring-1 ring-blue-500/20 bg-slate-50/50' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Fluid Round (HD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCmsBorder('sharp')}
                    className={`p-2 bg-white rounded-none border border-slate-200 text-xs font-bold text-center transition-all cursor-pointer ${
                      cmsBorder === 'sharp' ? 'border-blue-600 text-blue-700 font-extrabold ring-1 ring-blue-500/20 bg-slate-50/50' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Brutalist Sharp
                  </button>
                </div>
              </div>

              {/* Custom Logo Title */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Company App Header Name</label>
                <input
                  type="text"
                  value={cmsLogoText}
                  onChange={(e) => setCmsLogoText(e.target.value)}
                  placeholder="e.g. Memo Portal"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                />
                <p className="text-[9px] text-slate-400 font-medium">Updates header title and system branding dynamically.</p>
              </div>

              <div className="space-y-1.5 pt-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Custom Portal Logo</label>
                <div className="grid gap-2">
                  <input
                    type="url"
                    value={cmsLogoUrl}
                    onChange={(e) => setCmsLogoUrl(e.target.value)}
                    placeholder="Paste logo image URL or upload below"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                  />
                  <div className="flex items-center gap-2">
                    <label className="w-full cursor-pointer text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-center hover:bg-slate-200 transition-all">
                      Browse logo file
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileSelection} />
                    </label>
                    <button
                      type="button"
                      onClick={handleUploadLogo}
                      disabled={logoUploadLoading}
                      className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {logoUploadLoading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                  {logoUploadStatus && <p className="text-[10px] text-slate-500">{logoUploadStatus}</p>}
                  {cmsLogoUrl && (
                    <img src={cmsLogoUrl} alt="Logo preview" className="max-h-16 rounded-lg border border-slate-200 object-contain" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pt-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Login Portal Background</label>
                <div className="grid gap-2">
                  <input
                    type="url"
                    value={cmsBackgroundUrl}
                    onChange={(e) => setCmsBackgroundUrl(e.target.value)}
                    placeholder="Paste background image URL or upload below"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                  />
                  <div className="flex items-center gap-2">
                    <label className="w-full cursor-pointer text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-center hover:bg-slate-200 transition-all">
                      Browse background file
                      <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundFileSelection} />
                    </label>
                    <button
                      type="button"
                      onClick={handleUploadBackground}
                      disabled={backgroundUploadLoading}
                      className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {backgroundUploadLoading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                  {backgroundUploadStatus && <p className="text-[10px] text-slate-500">{backgroundUploadStatus}</p>}
                  {cmsBackgroundUrl && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <img src={cmsBackgroundUrl} alt="Background preview" className="w-full h-24 object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pt-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Login Card Frame Color</label>
                <input
                  type="color"
                  value={cmsFrameColor}
                  onChange={(e) => setCmsFrameColor(e.target.value)}
                  className="w-full h-12 p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none transition-all"
                />
                <p className="text-[9px] text-slate-400 font-medium">Choose a border/frame accent for login and portal containers.</p>
              </div>

              <div className="space-y-1.5 pt-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Table Border Color</label>
                <input
                  type="color"
                  value={cmsTableColor}
                  onChange={(e) => setCmsTableColor(e.target.value)}
                  className="w-full h-12 p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none transition-all"
                />
                <p className="text-[9px] text-slate-400 font-medium">Choose table and data grid border styling for dashboard content.</p>
              </div>

              <div className="space-y-1.5 pt-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Icon & Button Color</label>
                <input
                  type="color"
                  value={cmsIconColor}
                  onChange={(e) => setCmsIconColor(e.target.value)}
                  className="w-full h-12 p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none transition-all"
                />
                <p className="text-[9px] text-slate-400 font-medium">Choose color for UI icons, buttons, and interactive elements throughout the portal.</p>
              </div>

            </div>

            {/* Box 2: Financial Policy Configurations (CMS Control) */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-xs">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-500" /> 2. Cash Advance Fiscal Rules
              </h4>

              {/* Limit value */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Maximum Single Request Limit (₦)</label>
                <input
                  type="number"
                  value={cmsMaxAdvance}
                  onChange={(e) => setCmsMaxAdvance(Number(e.target.value))}
                  placeholder="2000000"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                />
                <p className="text-[9px] text-slate-400 font-medium">Any request exceeding this constraint will fail validation checks instantly.</p>
              </div>

              {/* Retirement Window Days */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Mandatory Retirement Window (Days)</label>
                <input
                  type="number"
                  value={cmsRetireDays}
                  onChange={(e) => setCmsRetireDays(Number(e.target.value))}
                  placeholder="14"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                />
                <p className="text-[9px] text-slate-400 font-medium">Required timeline before a Cash Advance is flagged as delinquent.</p>
              </div>

              {/* Exec audit Threshold */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Executive Audit Threshold Trigger (₦)</label>
                <input
                  type="number"
                  value={cmsExecThreshold}
                  onChange={(e) => setCmsExecThreshold(Number(e.target.value))}
                  placeholder="1000000"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                />
                <p className="text-[9px] text-slate-400 font-medium">Amounts above this value automatically route to the Executive Director for final screening.</p>
              </div>

            </div>

            {/* Box 3: IT Support Details */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-xs">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-500" /> 3. IT Contact Support Center
              </h4>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Support Email Address</label>
                <input
                  type="email"
                  value={cmsSupportEmail}
                  onChange={(e) => setCmsSupportEmail(e.target.value)}
                  placeholder="it.support@vetiva.com"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Emergency Hotline / Ext.</label>
                <input
                  type="text"
                  value={cmsSupportPhone}
                  onChange={(e) => setCmsSupportPhone(e.target.value)}
                  placeholder="+234 1 448 9000"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-705 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-lg">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-700 block">Enable IT Sandbox Debug Mode</span>
                  <span className="text-[9px] text-slate-400 block font-medium">Bypasses strict verification states for rapid testing.</span>
                </div>
                <input
                  type="checkbox"
                  checked={cmsDebugEnabled}
                  onChange={(e) => setCmsDebugEnabled(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 scale-110 cursor-pointer"
                />
              </div>

            </div>

            {/* Box 4: IT Department Database Maintenance Danger Zone */}
            <div className="bg-rose-50/50 border border-rose-200 p-5 rounded-xl space-y-4 shadow-2xs">
              <h4 className="text-sm font-black text-rose-800 border-b border-rose-200/60 pb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-600" /> 4. Emergency Database Danger Zone
              </h4>

              <p className="text-[11px] text-rose-600 leading-relaxed font-sans font-medium">
                IT operations can execute database flush commands instantly. This action is immutable and overrides normal locks. Confirmations will prompt beforehand.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  id="flush-advances-btn"
                  onClick={() => {
                    if (confirm("🚨 EMERGENCY ACTION 🚨\nAre you sure you want to permanently delete ALL Cash Advance requests? This action is irreversible and clears all active lists.")) {
                      onPurgeAdvances();
                      alert("Database cleaned: All Cash Advance requests permanently purged.");
                    }
                  }}
                  className="w-full py-2 bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-lg text-xs font-black transition-all cursor-pointer hover:shadow-md"
                >
                  🧨 Clear Cash Advance Database ({advances.length} records)
                </button>

                <button
                  type="button"
                  id="flush-retirements-btn"
                  onClick={() => {
                    if (confirm("🚨 EMERGENCY ACTION 🚨\nAre you sure you want to permanently delete ALL expensed retirement files? This will reset matching advance reconciliations.")) {
                      onPurgeRetirements();
                      alert("Database cleaned: All retirements data permanently purged.");
                    }
                  }}
                  className="w-full py-2 bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-lg text-xs font-black transition-all cursor-pointer hover:shadow-md"
                >
                  🧨 Clear Retirements Database ({retirements.length} records)
                </button>
              </div>

              <div className="pt-2 border-t border-rose-200/50">
                <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider font-mono">Authorized IT Access Level • Root Permissions Active</p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Sent Email Log Viewer Code Backdrop Modal */}
      {viewingEmailBody && (
        <div id="email-log-preview-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-white border rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl">
            
            <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex justify-between items-center rounded-t-2xl">
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Sent email log preview</span>
                <h4 className="font-bold text-xs truncate mt-1 text-slate-100">Subject: {viewingEmailSubject}</h4>
              </div>
              <button
                id="close-email-log-modal"
                onClick={() => { setViewingEmailBody(null); setViewingEmailSubject(null); }}
                className="text-slate-400 hover:text-white font-mono text-base font-bold select-none p-1 shrink-0 px-2"
                title="Close receipt copy"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div className="bg-white rounded-xl border border-slate-205 shadow-sm overflow-hidden min-h-[400px]">
                <div dangerouslySetInnerHTML={{ __html: viewingEmailBody }} />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                id="close-email-log-footer-btn"
                onClick={() => { setViewingEmailBody(null); setViewingEmailSubject(null); }}
                className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-4 rounded-lg cursor-pointer"
              >
                Close Audit Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
