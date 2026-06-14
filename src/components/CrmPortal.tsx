import React, { useState, useEffect } from 'react';
import { 
  Mail, Calendar, Eye, RefreshCw, Save, Sparkles, Send, 
  Users, Trash2, Clock, CheckCircle2, UserPlus, FileCode, Check, 
  ChevronRight, Laptop, Smartphone, HelpCircle, ShieldAlert 
} from 'lucide-react';
import { EmailTemplate, SentEmail, UserRole, DEPARTMENTS } from '../types';

interface CrmPortalProps {
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
}

export default function CrmPortal({
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
  retirements
}: CrmPortalProps) {
  // Sub-tabs: templates, sentLog, directory, utilities
  const [subTab, setSubTab] = useState<'templates' | 'sentLog' | 'directory' | 'utilities'>('templates');
  
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
    let staff = "John Doe";
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
    onUpdateStaffMembers([...staffMembers, addedMember]);
    setNewStaffName('');
    alert(`Personnel "${addedMember.name}" successfully incorporated into staff directory registry!`);
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
      const nextList = staffMembers.filter((_, idx) => idx !== index);
      onUpdateStaffMembers(nextList);
      alert("Personnel permanently detached from active organizational directories.");
    }
  };

  // View modal helper for looking at html outbox logs
  const [viewingEmailBody, setViewingEmailBody] = useState<string | null>(null);
  const [viewingEmailSubject, setViewingEmailSubject] = useState<string | null>(null);

  return (
    <div id="crm-portal-workspace" className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans pb-12">
      
      {/* Visual Workspace Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md shadow-indigo-900/10">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-5.5 h-5.5 text-blue-400" /> CRM & Systems Control Portal
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
            id="subtab-utilities"
            onClick={() => setSubTab('utilities')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${subTab === 'utilities' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            System Scheduler
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

      {/* SUB-TAB 3: CORPORATE IDENTITY DIRECTORY (STAFF Directory CRM) */}
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
                  <option value={UserRole.EXECUTIVE_OFFICE}>{UserRole.EXECUTIVE_OFFICE}</option>
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
                          <option value={UserRole.EXECUTIVE_OFFICE}>{UserRole.EXECUTIVE_OFFICE}</option>
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

      {/* SUB-TAB 4: SYSTEM UTILITIES & SCHEDULER */}
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
              <li><strong>Overdue &gt;5 Days:</strong> Escalate alerts directly to Head of Administration and Executive Office.</li>
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
