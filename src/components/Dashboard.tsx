import React, { useEffect, useState } from 'react';
import { 
  FileText, Clock, CheckCircle2, XCircle, CreditCard, Banknote, 
  HelpCircle, Archive, AlertCircle, ArrowUpRight, ShieldAlert,
  BadgeAlert, ArrowRight, TrendingUp, Sparkles
} from 'lucide-react';
import { CashAdvanceRequest, CashAdvanceRetirement, RequestStatus, RetirementStatus, UserRole } from '../types';

interface DashboardProps {
  advances: CashAdvanceRequest[];
  retirements: CashAdvanceRetirement[];
  onSetTab: (tab: string) => void;
  onSetStatusFilter: (status: string | null) => void;
  currentRole: UserRole;
  onSelectRequest: (requestId: string) => void;
  currentUser?: { name: string; role: UserRole; department: string };
}

export default function Dashboard({
  advances,
  retirements,
  onSetTab,
  onSetStatusFilter,
  currentRole,
  onSelectRequest,
  currentUser = { name: 'Employee', role: currentRole, department: 'Operations' }
}: DashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const tick = () => setCurrentDate(new Date());
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const currentDateStr = currentDate.toISOString().replace('T', ' ').slice(0, 19);

  // Helper lists & status groups
  const totalCount = advances.length;
  
  const pendingApprovalsCount = advances.filter(a => 
    [
      RequestStatus.SUBMITTED,
      RequestStatus.PENDING_HEAD_OF_ADMIN,
      RequestStatus.PENDING_INTERNAL_CONTROL,
      RequestStatus.PENDING_EXECUTIVE_OFFICE,
      RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE,
    ].includes(a.currentStatus)
  ).length;

  const approvedCount = advances.filter(a => 
    [
      RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE,
      RequestStatus.AWAITING_FINANCE_PAYMENT,
      RequestStatus.PAID,
      RequestStatus.CLOSED
    ].includes(a.currentStatus)
  ).length;

  const rejectedCount = advances.filter(a => a.currentStatus === RequestStatus.REJECTED).length;
  const awaitingPaymentCount = advances.filter(a => a.currentStatus === RequestStatus.AWAITING_FINANCE_PAYMENT).length;
  const paidCount = advances.filter(a => a.currentStatus === RequestStatus.PAID).length;

  // Outstanding Cash Advances: Status = Paid AND no retirement exists that is Approved
  const outstandingCount = advances.filter(a => {
    if (a.currentStatus !== RequestStatus.PAID) return false;
    const retirement = retirements.find(r => r.cashAdvanceRef === a.referenceNumber);
    return !retirement || retirement.currentStatus !== RetirementStatus.APPROVED;
  }).length;

  // Retired Cash Advances: Status = Paid AND retirement exists in APPROVED status
  const retiredCount = advances.filter(a => {
    if (a.currentStatus !== RequestStatus.PAID) return false;
    const retirement = retirements.find(r => r.cashAdvanceRef === a.referenceNumber);
    return retirement && retirement.currentStatus === RetirementStatus.APPROVED;
  }).length;

  // Overdue Retirements: Outstanding AND expected retirement date < current date (2026-06-12)
  const overdueCount = advances.filter(a => {
    if (a.currentStatus !== RequestStatus.PAID) return false;
    const retirement = retirements.find(r => r.cashAdvanceRef === a.referenceNumber);
    const isRetired = retirement && retirement.currentStatus === RetirementStatus.APPROVED;
    if (isRetired) return false;

    // Check date
    const expDate = new Date(a.expectedRetirementDate);
    return expDate < currentDate;
  }).length;

  // Calculated dollar amounts
  const totalAmountRequested = advances.reduce((sum, a) => sum + a.amountRequested, 0);
  const totalAmountPaid = advances
    .filter(a => a.currentStatus === RequestStatus.PAID)
    .reduce((sum, a) => sum + (a.paymentDetails?.amountPaid || a.amountRequested), 0);
  
  const totalAmountRetired = retirements
    .filter(r => r.currentStatus === RetirementStatus.APPROVED)
    .reduce((sum, r) => sum + r.amountUtilized, 0);

  const totalOutstandingBalance = advances
    .filter(a => {
      if (a.currentStatus !== RequestStatus.PAID) return false;
      const rit = retirements.find(r => r.cashAdvanceRef === a.referenceNumber);
      return !rit || rit.currentStatus !== RetirementStatus.APPROVED;
    })
    .reduce((sum, a) => sum + a.amountRequested, 0);

  // Role Action suggestions
  const getRoleActions = () => {
    switch (currentRole) {
      case UserRole.ADMIN_OFFICER:
        return {
          title: "Initiator Next Actions",
          list: [
            "Submit draft requests or edit and resubmit requests marked as Rejected.",
            "Once cash advance is disbursed (Paid), carry out the procurement action.",
            "Gather receipts & expense details, then submit a Retirement Claim within expected dates."
          ]
        };
      case UserRole.HEAD_OF_ADMIN:
        return {
          title: "Line Manager Active Queue",
          list: [
            "Review submitted initial Cash Advances needing authorization.",
              "Perform Final action on Executive Director approved requests: click [Send To Finance] to queue payment.",
            "Verify submitted employee Cash Advance Retirement claims against invoice slips."
          ]
        };
      case UserRole.INTERNAL_CONTROL:
        return {
          title: "Internal Control Desk Actions",
          list: [
            "Check budget items, limits, and departments for pending cash advance requests.",
            "Audit expense receipts and returned balances for retiring fund folders."
          ]
        };
      case UserRole.EXECUTIVE_DIRECTOR:
        return {
          title: "Executive Manager Desk Actions",
          list: [
            "Provide high-level release approval on major cash disbursements.",
            "Track operational metrics, outstanding and overdue staff retirements."
          ]
        };
      case UserRole.FINANCE_OFFICER:
        return {
          title: "Finance & Accounts Payment Queue",
          list: [
            "Disburse approved cash allocations: record Payment references and [Mark as Paid].",
            "Settle returns and receipts during final Cash Retirement approvals."
          ]
        };
      default:
        return {
          title: "System Administrator Actions",
          list: [
            "Change roles and run end-to-end sandbox simulations of the approval cycle.",
            "View real-time audit log files to ensure transparency across all operational metrics."
          ]
        };
    }
  };

  const actionBox = getRoleActions();

  const recentWorkflowEntries = advances
    .flatMap((advance) => advance.approvalHistory.map((entry) => ({
      ...entry,
      referenceNumber: advance.referenceNumber,
    })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Urgent pending requests specifically matching currently selected role
  const getAwaitingRoleFilter = (a: CashAdvanceRequest) => {
    if (a.currentStatus === RequestStatus.PENDING_HEAD_OF_ADMIN && currentRole === UserRole.HEAD_OF_ADMIN) return true;
    if (a.currentStatus === RequestStatus.PENDING_INTERNAL_CONTROL && currentRole === UserRole.INTERNAL_CONTROL) return true;
    if (a.currentStatus === RequestStatus.PENDING_EXECUTIVE_OFFICE && currentRole === UserRole.EXECUTIVE_DIRECTOR) return true;
    if (a.currentStatus === RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE && currentRole === UserRole.HEAD_OF_ADMIN) return true;
    if (a.currentStatus === RequestStatus.AWAITING_FINANCE_PAYMENT && currentRole === UserRole.FINANCE_OFFICER) return true;
    return false;
  };

  const urgentRequests = advances.filter(getAwaitingRoleFilter);

  // Separate list for urgent retirement items too
  const getAwaitingRoleRetirement = (r: CashAdvanceRetirement) => {
    if (r.currentStatus === RetirementStatus.PENDING_HEAD_OF_ADMIN && currentRole === UserRole.HEAD_OF_ADMIN) return true;
    if (r.currentStatus === RetirementStatus.PENDING_INTERNAL_CONTROL && currentRole === UserRole.INTERNAL_CONTROL) return true;
    if (r.currentStatus === RetirementStatus.PENDING_EXECUTIVE_OFFICE && currentRole === UserRole.EXECUTIVE_DIRECTOR) return true;
    if (r.currentStatus === RetirementStatus.PENDING_HEAD_OF_ADMIN_RELEASE && currentRole === UserRole.HEAD_OF_ADMIN) return true;
    if (r.currentStatus === RetirementStatus.PENDING_FINANCE && currentRole === UserRole.FINANCE_OFFICER) return true;
    return false;
  };
  const urgentRetirements = retirements.filter(getAwaitingRoleRetirement);

  const handleMetricClick = (statusText: string | null, section: string = 'requests') => {
    onSetStatusFilter(statusText);
    onSetTab(section);
  };

  return (
    <div id="dashboard-container" className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div id="dashboard-banner" className="bg-[#A68D63] rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/80">Internal Memo Portal</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight mt-1">Internal Memo & Cash Advance Management</h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1.5 font-sans max-w-2xl">
            Welcome back! You are logged in as <span className="font-semibold text-white underline decoration-white/40 decoration-2">{currentRole}</span>. Track cash advance requests, verify retirement records, and approve vouchers.
          </p>
        </div>
        <div className="bg-[#A68D63]/12 backdrop-blur-md rounded-xl py-2 px-3 sm:px-4 border border-[#A68D63] shrink-0 self-start sm:self-auto">
            <p className="text-[9px] sm:text-xs font-mono text-white/70 uppercase">Current Business Date</p>
            <p className="text-base sm:text-lg font-bold font-mono text-white">{currentDateStr} UTC</p>
          </div>
      </div>

      {/* Dynamic Role-Specific Approval Dashboards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">
          DEDICATED ROLE APPROVAL HUB: {currentRole}
        </h3>
        
        {currentRole === UserRole.HEAD_OF_ADMIN && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Line Manager Executive Oversight</span>
                <h4 className="text-lg font-bold text-purple-950 mt-1">Line Manager Dashboard</h4>
                <p className="text-xs text-purple-850 mt-1 max-w-2xl leading-relaxed">
                  As Line Manager, you oversee standard budgetary validations and final release authorizations. You have authority to review initial requests and transition approved Executive Director funds to the finance room.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <div className="bg-white px-3 py-2 rounded-lg border border-purple-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">Initial Vouching</span>
                  <span className="text-xl font-extrabold text-purple-900 font-mono">
                    {advances.filter(a => a.currentStatus === RequestStatus.PENDING_HEAD_OF_ADMIN).length}
                  </span>
                </div>
                <div className="bg-white px-3 py-2 rounded-lg border border-purple-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">Admin Releases</span>
                  <span className="text-xl font-extrabold text-purple-900 font-mono">
                    {advances.filter(a => a.currentStatus === RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Initial Vouching Action Limits</span>
                <p className="text-slate-600 mt-1">Review operational requests under ₦500,000 quickly. Higher requests trigger compliance routing automatically.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Expense Retirement Mandates</span>
                <p className="text-slate-600 mt-1">Cross-audit all physical invoices with retirement claim forms before sending them to the finance desk.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Line Manager Portal Quick Jump</span>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handleMetricClick(RequestStatus.PENDING_HEAD_OF_ADMIN)} className="px-2 py-1 bg-purple-600 text-white font-bold rounded text-[10px] hover:bg-purple-700 transition cursor-pointer">Open Initial Queue</button>
                  <button onClick={() => handleMetricClick(RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE)} className="px-2 py-1 bg-indigo-600 text-white font-bold rounded text-[10px] hover:bg-indigo-700 transition cursor-pointer">Open Release Queue</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentRole === UserRole.INTERNAL_CONTROL && (
          <div className="space-y-4">
            <div className="p-4 bg-violet-50 rounded-xl border border-violet-100 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <span className="text-[10px] bg-violet-200 text-violet-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Internal Control Registry</span>
                <h4 className="text-lg font-bold text-violet-950 mt-1">Internal Control Dashboard</h4>
                <p className="text-xs text-violet-850 mt-1 max-w-2xl leading-relaxed">
                  Validate correct general ledger coding, regulatory alignment, and budget limits. All claims are audited by your desk to eliminate unauthorized expenses.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <div className="bg-white px-3 py-2 rounded-lg border border-violet-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">Pending Approvals</span>
                  <span className="text-xl font-extrabold text-violet-900 font-mono">
                    {advances.filter(a => a.currentStatus === RequestStatus.PENDING_INTERNAL_CONTROL).length}
                  </span>
                </div>
                <div className="bg-white px-3 py-2 rounded-lg border border-violet-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">High Value ({'>'}₦50k)</span>
                  <span className="text-xl font-extrabold text-red-700 font-mono">
                    {advances.filter(a => a.amountRequested >= 50000).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Internal Control Threshold Monitor</span>
                <p className="text-slate-600 mt-1">Enforce statutory ratios. High-value requests automatically suggest extra executive checkoffs.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Strict Invoice Matching</span>
                <p className="text-slate-600 mt-1">Retirements are held in review status until every invoice receipt has undergone matching verification.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Sox Auditing Controls</span>
                <div className="mt-2">
                  <button onClick={() => handleMetricClick(RequestStatus.PENDING_INTERNAL_CONTROL)} className="px-2.5 py-1 bg-violet-600 text-white font-bold rounded hover:bg-violet-700 transition cursor-pointer">Start Audits Queue</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentRole === UserRole.EXECUTIVE_DIRECTOR && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Executive Authority Hub</span>
                <h4 className="text-lg font-bold text-amber-950 mt-1">Executive General Office Dashboard</h4>
                <p className="text-xs text-amber-850 mt-1 max-w-2xl leading-relaxed">
                  Provide final executive authorizations on major expenditures. Only compliance-evaluated, vetted requests route to your dashboard to assure strategic utilization of assets.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <div className="bg-white px-3 py-2 rounded-lg border border-amber-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">Awaiting Sign-off</span>
                  <span className="text-xl font-extrabold text-amber-850 font-mono">
                    {advances.filter(a => a.currentStatus === RequestStatus.PENDING_EXECUTIVE_OFFICE).length}
                  </span>
                </div>
                <div className="bg-white px-3 py-2 rounded-lg border border-amber-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block font-sans">Pipeline Vol</span>
                  <span className="text-sm font-extrabold text-emerald-800 font-mono block mt-1">
                    ₦{advances.reduce((s, a) => s + a.amountRequested, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">High-Value Capital Projects</span>
                <p className="text-slate-600 mt-1">Keep track of outstanding operational commitments that affect corporate operating liquidity.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Strategic Delegation Level</span>
                <p className="text-slate-600 mt-1">Vouching checklists show that compliant audit records were completed prior to signature.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Executive Controls</span>
                <div className="mt-2">
                  <button onClick={() => handleMetricClick(RequestStatus.PENDING_EXECUTIVE_OFFICE)} className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded hover:bg-amber-700 transition cursor-pointer">Open Approval Board</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentRole === UserRole.FINANCE_OFFICER && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Treasury Clearance Unit</span>
                <h4 className="text-lg font-bold text-emerald-950 mt-1">Finance & Disbursements Dashboard</h4>
                <p className="text-xs text-emerald-850 mt-1 max-w-2xl leading-relaxed">
                  Disburse fully authorized cash advances, verify remaining returned balances on retirement claims, and reconcile overall accounts ledger records.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <div className="bg-white px-3 py-2 rounded-lg border border-emerald-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">Awaiting Pay</span>
                  <span className="text-xl font-extrabold text-emerald-900 font-mono">
                    {advances.filter(a => a.currentStatus === RequestStatus.AWAITING_FINANCE_PAYMENT).length}
                  </span>
                </div>
                <div className="bg-white px-3 py-2 rounded-lg border border-emerald-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">Total Spent</span>
                  <span className="text-sm font-extrabold text-indigo-700 font-mono block mt-1">
                    ₦{totalAmountPaid.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Bank Ledger Synchronization</span>
                <p className="text-slate-600 mt-1">Always enforce correct payment system references when documenting bank wire disbursements.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Outstanding Cash Returns</span>
                <p className="text-slate-600 mt-1">Finance auditing expects remaining balances in returned cash to match the recorded retirement entries.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Treasury Clearance Actions</span>
                <div className="mt-2">
                  <button onClick={() => handleMetricClick(RequestStatus.AWAITING_FINANCE_PAYMENT)} className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition cursor-pointer font-sans">Open Disbursement Queue</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentRole === UserRole.ADMIN_OFFICER && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Initiator</span>
                <h4 className="text-lg font-bold text-blue-950 mt-1">Initiator Portal Dashboard ({currentUser.name})</h4>
                <p className="text-xs text-blue-850 mt-1 max-w-2xl leading-relaxed">
                  Draft and file cash advance requests. Remember to key in expected retirement deadlines and keep track of outstanding balances.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">Drafts / Rejected</span>
                  <span className="text-xl font-extrabold text-blue-900 font-mono">
                    {advances.filter(a => a.staffName === currentUser.name && [RequestStatus.DRAFT, RequestStatus.REJECTED].includes(a.currentStatus)).length}
                  </span>
                </div>
                <div className="bg-white px-3 py-2 rounded-lg border border-blue-100 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-500 font-mono block">My Ongoing</span>
                  <span className="text-xl font-extrabold text-blue-900 font-mono">
                    {advances.filter(a => a.staffName === currentUser.name && a.currentStatus !== RequestStatus.CLOSED && a.currentStatus !== RequestStatus.REJECTED).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Initiate New Memo Voucher</span>
                <p className="text-slate-600 mt-1 font-sans">Request funds for travel expenses, procurement operations, repairs, or administrative items.</p>
                <button onClick={() => { onSetTab('requests'); }} className="mt-2.5 px-3 py-1 bg-blue-600 text-white font-bold rounded text-[10px] hover:bg-blue-700 transition cursor-pointer">Draft Advance Request</button>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs font-sans">
                <span className="font-bold text-slate-700 block">File Expense Retirement</span>
                <p className="text-slate-600 mt-1">If your cash advance balance status is PAID, submit your receipts details to trigger compliant reconciliations.</p>
                <button onClick={() => { onSetTab('retirement'); }} className="mt-2.5 px-3 py-1 bg-amber-600 text-white font-bold rounded text-[10px] hover:bg-amber-700 transition cursor-pointer">Retire Paid Advance</button>
              </div>
            </div>
          </div>
        )}
        
        {currentRole === UserRole.SYSTEM_ADMIN && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">Root Operations Desk</span>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Workflow Log History</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Recent approval activity from active cash advance requests.</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Latest</span>
                </div>
                {recentWorkflowEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No workflow history is available yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentWorkflowEntries.map((entry) => (
                      <div key={`${entry.userId}-${entry.date}-${entry.referenceNumber}`} className="p-3 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800">{entry.userName}</div>
                            <div className="text-[10px] text-slate-500">{entry.userRole} · {entry.action}</div>
                          </div>
                          <div className="text-right text-[10px] text-slate-400">{entry.date}</div>
                        </div>
                        <p className="mt-3 text-[11px] text-slate-600">{entry.comment || 'No comment recorded.'}</p>
                        <p className="mt-2 text-[10px] text-slate-500">Reference: {entry.referenceNumber}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldAlert className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Approval Center Panel</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Action summary for role: {currentRole}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Role guidance</div>
                    <div className="mt-3 text-sm font-semibold text-slate-800">{actionBox.title}</div>
                    <ul className="mt-3 list-disc pl-4 text-[11px] space-y-2 text-slate-600">
                      {actionBox.list.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Pending approvals</div>
                    <div className="mt-3 grid gap-2 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Request items awaiting action</span>
                        <span className="font-semibold text-slate-800">{urgentRequests.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Retirement items awaiting action</span>
                        <span className="font-semibold text-slate-800">{urgentRetirements.length}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMetricClick(null)}
                      className="mt-4 w-full rounded-full bg-blue-600 text-white py-2 text-xs font-bold hover:bg-blue-700 transition"
                    >
                      View approval queue
                    </button>
                  </div>
                </div>
              </div>
            </div>
                <h4 className="text-lg font-bold text-slate-100 mt-1">System Administration Control Tower</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed font-sans">
                  You possess ultimate system clearance. Monitor active audit trails, design mail templates, reset system state matrices or trigger sandbox notifications.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-400 font-mono block">Memos Tracked</span>
                  <span className="text-xl font-extrabold text-indigo-400 font-mono">
                    {advances.length}
                  </span>
                </div>
                <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-center min-w-[100px]">
                  <span className="text-[10px] text-slate-400 font-mono block font-sans">Total Staff</span>
                  <span className="text-xl font-extrabold text-blue-400 font-mono">6 Active</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Security & SOC-2 Audits</span>
                <p className="text-slate-600 mt-1">Track and inspect every digital workflow interaction inside the server logs tab.</p>
                <button onClick={() => { onSetTab('audit'); }} className="mt-2.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-[10px] transition-colors cursor-pointer">Open Audit Logs</button>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Email Template Portal</span>
                <p className="text-slate-600 mt-1">Configure and manage automated emails dispatched across dynamic approval thresholds.</p>
                <button onClick={() => { onSetTab('cms'); }} className="mt-2.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-[10px] transition-colors cursor-pointer">Open Mail Templates</button>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs font-sans">
                <span className="font-bold text-slate-700 block">Portal Sandbox Control</span>
                <p className="text-slate-600 mt-1">Integrate timing-delay triggers, reset initial databases, or simulate 2-day / 5-day notifications.</p>
                <button onClick={() => { onSetTab('config'); }} className="mt-2.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[10px] transition-colors cursor-pointer">Open Sandbox Config</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div id="dashboard-stats-grid">
        <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Key Performance Workflow Indicators
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          
          {/* Total */}
          <div 
            id="metric-total"
            onClick={() => handleMetricClick(null)}
            className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 text-slate-100/80 group-hover:text-blue-50/50 transition-colors">
              <FileText className="w-20 h-20" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Memos</span>
              <span className="p-1.5 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <FileText className="w-5 h-5" />
              </span>
            </div>
              <p className="text-4xl font-extrabold text-slate-800 tracking-tight mt-3">{totalCount}</p>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-medium group-hover:text-blue-600">
                View all records <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </p>
          </div>

          {/* Pending Approvals */}
          <div 
            id="metric-pending"
            onClick={() => handleMetricClick('pending')}
            className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 text-slate-100/80 group-hover:text-amber-50/50 transition-colors">
              <Clock className="w-20 h-20" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                <Clock className="w-5 h-5" />
              </span>
            </div>
            <p className="text-4xl font-extrabold text-amber-600 tracking-tight mt-3">{pendingApprovalsCount}</p>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-medium group-hover:text-amber-700">
              Awaiting review <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </p>
          </div>

          {/* Approved */}
          <div 
            id="metric-approved"
            onClick={() => handleMetricClick('approved')}
            className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 text-slate-100/80 group-hover:text-emerald-50/50 transition-colors">
              <CheckCircle2 className="w-20 h-20" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Requests</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
            <p className="text-4xl font-extrabold text-emerald-600 tracking-tight mt-3">{approvedCount}</p>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-medium group-hover:text-emerald-700">
              Approved routes <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </p>
          </div>

          {/* Rejected */}
          <div 
            id="metric-rejected"
            onClick={() => handleMetricClick(RequestStatus.REJECTED)}
            className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-rose-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 text-slate-100/80 group-hover:text-rose-50/50 transition-colors">
              <XCircle className="w-20 h-20" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rejected Requests</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                <XCircle className="w-5 h-5" />
              </span>
            </div>
            <p className="text-4xl font-extrabold text-rose-600 tracking-tight mt-3">{rejectedCount}</p>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-medium group-hover:text-rose-700">
              Return/Reject pool <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </p>
          </div>

          {/* Awaiting Payment */}
          <div 
            id="metric-awaiting-pay"
            onClick={() => handleMetricClick(RequestStatus.AWAITING_FINANCE_PAYMENT)}
            className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 text-slate-100/80 group-hover:text-blue-50/50 transition-colors">
              <CreditCard className="w-20 h-20" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Finance</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100 transition-colors">
                <CreditCard className="w-5 h-5" />
              </span>
            </div>
            <p className="text-4xl font-extrabold text-blue-700 tracking-tight mt-3">{awaitingPaymentCount}</p>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-medium group-hover:text-blue-800">
              In finance queue <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </p>
          </div>

        </div>
      </div>

      {/* Secondary Stats Grid specifically focusing on Cash Advance Life-cycle */}
      <div id="lifecycle-stats-grid">
        <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-600" />
          Cash Advance & Retirement Portfolio Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Disbursed (Paid) */}
          <div 
            id="metric-paid"
            onClick={() => handleMetricClick(RequestStatus.PAID)}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Paid Cash Advances</span>
                <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{paidCount}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Total Paid Volume:</span>
              <span className="font-mono font-bold text-slate-800">₦{totalAmountPaid.toLocaleString()}</span>
            </div>
          </div>

          {/* Outstanding */}
          <div 
            id="metric-outstanding"
            onClick={() => handleMetricClick('outstanding')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-500 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Outstanding Advances</span>
                <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{outstandingCount}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Outstanding Amount:</span>
              <span className="font-mono font-bold text-amber-600">₦{totalOutstandingBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Retired */}
          <div 
            id="metric-retired"
            onClick={() => handleMetricClick('retired')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 transition-all cursor-pointer font-sans"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Retired Cash Advances</span>
                <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{retiredCount}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Total Utilized & Audited:</span>
              <span className="font-mono font-bold text-emerald-600">₦{totalAmountRetired.toLocaleString()}</span>
            </div>
          </div>

          {/* Overdue */}
          <div 
            id="metric-overdue"
            onClick={() => handleMetricClick('overdue')}
            className="bg-rose-50/50 p-5 rounded-xl border border-rose-200 shadow-sm hover:border-rose-400 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600 animate-pulse">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-rose-800 font-bold uppercase tracking-wider block">Overdue Retirements</span>
                <p className="text-2xl font-extrabold text-rose-700 mt-0.5">{overdueCount}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-rose-100 flex justify-between items-center text-xs text-rose-900">
              <span className="font-medium">Grace Period Exceeded:</span>
              <span className="font-bold underline">Needs Attention</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main content grid: Role queues and interactive sandbox widgets */}
      <div id="dashboard-queues-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Urgent Attention / Filtered Action Queue */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-base">My Action Desk ({currentRole})</h4>
                <p className="text-xs text-slate-500 mt-0.5">Memos and Retirements requiring your explicit approval action</p>
              </div>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold font-mono border border-blue-100">
                Live Sink
              </span>
            </div>

            {/* Combined Urgent Actions list */}
            {urgentRequests.length === 0 && urgentRetirements.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto stroke-[1.5]" />
                <h5 className="font-semibold text-slate-700 text-sm mt-3">All Caught Up!</h5>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  There are no requests or retirement claims pending approval for the current role <strong>{currentRole}</strong> right now.
                </p>
                <button
                  id="switch-other-role-tip"
                  onClick={() => handleMetricClick(null)}
                  className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  View all system logs or switch roles to proceed workflow steps.
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {/* Pending Cash Advances for Role */}
                {urgentRequests.map(request => (
                  <div 
                    id={`urgent-item-${request.id}`}
                    key={request.id}
                    className="p-4 rounded-lg bg-red-50/90 border border-red-200 hover:border-red-400 dark:bg-red-950/25 dark:border-red-900/60 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-red-700 bg-red-150 dark:text-red-300 dark:bg-red-950/80 px-2 py-0.5 rounded">
                          {request.referenceNumber}
                        </span>
                        <span className="text-xs text-slate-400 font-medium font-mono">{request.requestDate}</span>
                      </div>
                      <h5 className="font-semibold text-slate-800 text-sm mt-1.5 block leading-snug">
                        {request.purpose.slice(0, 75)}{request.purpose.length > 75 ? '...' : ''}
                      </h5>
                      <p className="text-xs text-slate-600 mt-1">
                        Staff: <span className="font-medium text-slate-800">{request.staffName}</span> • Dept: <span className="font-medium">{request.department}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-2 w-full sm:w-auto border-t sm:border-0 pt-2 sm:pt-0 border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-400">Advance Amt:</span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">₦{request.amountRequested}</span>
                      </div>
                      <button
                        id={`process-advance-btn-${request.id}`}
                        onClick={() => {
                          onSetStatusFilter(null);
                          onSetTab('requests');
                          onSelectRequest(request.id);
                        }}
                        className="text-xs bg-red-600 text-white font-semibold py-1.5 px-3 rounded hover:bg-red-700 transition-colors flex items-center gap-1 shadow-xs shadow-red-200"
                      >
                        Action Portal <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pending Retirements for Role */}
                {urgentRetirements.map(ret => (
                  <div 
                    id={`urgent-ret-item-${ret.id}`}
                    key={ret.id}
                    className="p-4 rounded-lg bg-red-50/90 border border-red-200 hover:border-red-400 dark:bg-red-950/25 dark:border-red-900/60 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-red-750 bg-red-150 px-2 py-0.5 rounded">
                          {ret.id} (For {ret.cashAdvanceRef})
                        </span>
                        <span className="text-xs text-slate-400 font-medium font-mono">{ret.retirementDate}</span>
                      </div>
                      <h5 className="font-semibold text-slate-800 text-sm mt-1.5">
                        Retirement claim for cash advance fund of <span className="font-bold font-mono text-slate-909">₦{ret.amountAdvanced}</span>
                      </h5>
                      <p className="text-xs text-slate-600 mt-1">
                        Utilized: <strong className="font-mono text-slate-800">₦{ret.amountUtilized}</strong> • Returned Balance: <strong className="font-mono text-emerald-800">₦{ret.balanceReturned}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-2 w-full sm:w-auto border-t sm:border-0 pt-2 sm:pt-0 border-slate-200">
                      <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Retirement Verify
                      </span>
                      <button
                        id={`process-ret-btn-${ret.id}`}
                        onClick={() => {
                          onSetTab('retirement');
                          // set sub-focus or selection? Direct link is perfect! We will select it.
                        }}
                        className="text-xs bg-red-600 text-white font-semibold py-1.5 px-3 rounded hover:bg-red-700 transition-colors flex items-center gap-1 shadow-xs shadow-red-200"
                      >
                        Verify Settle <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center text-xs text-slate-500">
            <span>Only displays items directly pending action by <strong>{currentRole}</strong></span>
            <button 
              id="view-all-workflow-btn"
              onClick={() => handleMetricClick(null)}
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline"
            >
              Browse entire queue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sandbox Role Guide & System Guidelines */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 text-indigo-600" />
              {actionBox.title}
            </h4>
            <div className="space-y-3 mt-3">
              {actionBox.list.map((info, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-blue-600 font-bold shrink-0 text-xs">•</span>
                  <p className="text-xs text-slate-600 leading-normal">{info}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 bg-blue-50/60 rounded-lg border border-blue-100">
              <h5 className="font-semibold text-blue-900 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                Standard Workflow Stepper Logic
              </h5>
              <ol className="mt-2 text-[11px] text-blue-800 list-decimal pl-4 space-y-1 font-sans">
                <li><strong className="text-slate-800">Initiator</strong> drafts & submits memo</li>
                <li><strong className="text-slate-800">Line Manager</strong> reviews initial limits</li>
                <li><strong className="text-slate-800">Internal Control</strong> runs budget check</li>
                    <li><strong className="text-slate-800">Executive Director</strong> provides final release sign-off</li>
                <li><strong className="text-slate-800">Line Manager</strong> sends release to Finance</li>
                <li><strong className="text-slate-800">Finance Officer</strong> pays and disburse funds</li>
              </ol>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <span className="text-[11px] text-slate-400 block">System Name: Admin Memo & CA Management Portal</span>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Version 1.4.2 Sandbox Stable</p>
          </div>
        </div>

      </div>
    </div>
  );
}
