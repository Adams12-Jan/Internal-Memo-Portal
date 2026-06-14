import React, { useState } from 'react';
import { 
  ArrowLeft, CheckCircle, XCircle, HelpCircle, FileText, Send, 
  MessageSquare, Calendar, DollarSign, ShieldAlert, BadgeAlert,
  User, Check, AlertCircle, Clock, RotateCcw, AlertTriangle, Printer
} from 'lucide-react';
import { CashAdvanceRequest, RequestStatus, UserRole, PaymentMethod, STAFF_MEMBERS } from '../types';

interface RequestDetailsProps {
  request: CashAdvanceRequest;
  currentRole: UserRole;
  currentUserName: string;
  onBack: () => void;
  onApprovalAction: (
    action: 'Approve' | 'Reject' | 'Request Clarification' | 'Send to Finance' | 'Pay' | 'Return to Admin' | 'Return for Review' | 'Resubmit',
    comment: string,
    paymentMeta?: {
      paymentDate: string;
      paymentMethod: PaymentMethod;
      paymentReference: string;
      amountPaid: number;
      beneficiaryName: string;
    },
    updatedFields?: Partial<CashAdvanceRequest>
  ) => void;
}

export default function RequestDetails({
  request,
  currentRole,
  currentUserName,
  onBack,
  onApprovalAction
}: RequestDetailsProps) {
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [printSuccess, setPrintSuccess] = useState(false);

  // Edit states for resubmission (if draft or rejected)
  const [isEditing, setIsEditing] = useState(false);
  const [editPurpose, setEditPurpose] = useState(request.purpose);
  const [editAmount, setEditAmount] = useState(request.amountRequested.toString());
  const [editExpectedDate, setEditExpectedDate] = useState(request.expectedRetirementDate);
  const [editStaff, setEditStaff] = useState(request.staffName);
  const [editDept, setEditDept] = useState(request.department);

  // Finance input states
  const [paymentDate, setPaymentDate] = useState('2026-06-12'); // current system date context
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaid, setAmountPaid] = useState(request.amountRequested.toString());
  const [beneficiaryName, setBeneficiaryName] = useState(request.staffName);

  // Determine current active workflow step for visual stepper
  const getActiveStepIndex = () => {
    switch (request.currentStatus) {
      case RequestStatus.DRAFT: return 0;
      case RequestStatus.SUBMITTED:
      case RequestStatus.PENDING_HEAD_OF_ADMIN: return 1;
      case RequestStatus.PENDING_INTERNAL_CONTROL: return 2;
      case RequestStatus.PENDING_EXECUTIVE_OFFICE: return 3;
      case RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE: return 4;
      case RequestStatus.AWAITING_FINANCE_PAYMENT: return 5;
      case RequestStatus.PAID: return 6;
      case RequestStatus.CLOSED: return 6;
      case RequestStatus.REJECTED: return -1; // special handling
      default: return 0;
    }
  };

  const activeStep = getActiveStepIndex();

  const handleAction = (action: 'Approve' | 'Reject' | 'Request Clarification' | 'Send to Finance' | 'Return to Admin' | 'Return for Review') => {
    if ((action === 'Reject' || action === 'Request Clarification' || action === 'Return for Review') && !comment.trim()) {
      setErrorMsg(`A comment is required when performing: ${action}`);
      return;
    }
    setErrorMsg('');
    onApprovalAction(action, comment);
    setComment('');
  };

  const handlePayAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentReference.trim()) {
      setErrorMsg('Payment reference is required to disburse funds');
      return;
    }
    const amt = parseFloat(amountPaid);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please specify a positive valid amount disbursed');
      return;
    }
    if (!beneficiaryName.trim()) {
      setErrorMsg('Beneficiary Name must be defined');
      return;
    }

    setErrorMsg('');
    onApprovalAction('Pay', comment || 'Disbursed', {
      paymentDate,
      paymentMethod,
      paymentReference,
      amountPaid: amt,
      beneficiaryName
    });
    setComment('');
  };

  const handleResubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please define a positive requested amount');
      return;
    }
    setErrorMsg('');
    onApprovalAction('Resubmit', comment || 'Resubmitted Request with updated fields', undefined, {
      purpose: editPurpose,
      amountRequested: amt,
      expectedRetirementDate: editExpectedDate,
      staffName: editStaff,
      department: editDept,
      currentStatus: RequestStatus.SUBMITTED // auto submits
    });
    setIsEditing(false);
    setComment('');
  };

  // Determine if currently selected role is authorized to approve this request at this status
  const isAuthorizedToApprove = () => {
    switch (request.currentStatus) {
      case RequestStatus.SUBMITTED:
      case RequestStatus.PENDING_HEAD_OF_ADMIN:
        return currentRole === UserRole.HEAD_OF_ADMIN || currentRole === UserRole.SYSTEM_ADMIN;
      case RequestStatus.PENDING_INTERNAL_CONTROL:
        return currentRole === UserRole.INTERNAL_CONTROL || currentRole === UserRole.SYSTEM_ADMIN;
      case RequestStatus.PENDING_EXECUTIVE_OFFICE:
        return currentRole === UserRole.EXECUTIVE_OFFICE || currentRole === UserRole.SYSTEM_ADMIN;
      case RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE:
        return currentRole === UserRole.HEAD_OF_ADMIN || currentRole === UserRole.SYSTEM_ADMIN;
      case RequestStatus.AWAITING_FINANCE_PAYMENT:
        return currentRole === UserRole.FINANCE_OFFICER || currentRole === UserRole.SYSTEM_ADMIN;
      default:
        return false;
    }
  };

  const hasActionPanel = isAuthorizedToApprove() || (
    (request.currentStatus === RequestStatus.DRAFT || request.currentStatus === RequestStatus.REJECTED) && 
    (currentRole === UserRole.ADMIN_OFFICER || currentRole === UserRole.SYSTEM_ADMIN)
  );

  const simulatePrint = () => {
    setPrintSuccess(true);
    setTimeout(() => {
      setPrintSuccess(false);
      window.print();
    }, 1200);
  };

  const stepperSteps = [
    { name: '1. Initiated', role: 'Admin Officer' },
    { name: '2. Audited', role: 'Head of Admin' },
    { name: '3. Compliance', role: 'Internal Control' },
    { name: '4. Signed', role: 'Executive Office' },
    { name: '5. Released', role: 'Head of Admin' },
    { name: '6. Paid', role: 'Finance Officer' }
  ];

  return (
    <div id={`request-details-card-${request.id}`} className="space-y-6 animate-fade-in print:bg-white print:p-0">
      
      {/* Detail bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 print:hidden">
        <button
          id="back-list-from-detail"
          onClick={onBack}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 py-1 px-2.5 rounded transition-colors flex items-center gap-1 border border-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back to List
        </button>

        <div className="flex items-center gap-2">
          <button
            id="print-request-btn"
            onClick={simulatePrint}
            className="text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 py-1 px-2.5 rounded transition-all flex items-center gap-1 border border-slate-200"
            title="Download PDF Voucher"
          >
            <Printer className="w-4 h-4" /> Print Approval Slip
          </button>
          
          {printSuccess && (
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded animate-pulse border border-emerald-200">
              Generating PDF Print Output...
            </span>
          )}
        </div>
      </div>

      {/* Main Request Form Visual Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Core content Column 1 & 2 */}
        <div className="lg:col-span-2 p-6 space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded font-mono">
                  {request.referenceNumber}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">{request.requestDate}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-2">Cash Advance Request Form Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">Assigned workflows run automatically in sequence</p>
            </div>
            
            <div className="text-right">
              <span className={`inline-block py-1 px-3 rounded-full text-xs font-bold font-sans border ${
                request.currentStatus === RequestStatus.PAID ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                request.currentStatus === RequestStatus.REJECTED ? 'bg-rose-50 text-rose-700 border-rose-200' :
                request.currentStatus === RequestStatus.AWAITING_FINANCE_PAYMENT ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {request.currentStatus}
              </span>

              {/* OVERDUE status alert */}
              {request.currentStatus === RequestStatus.PAID && new Date(request.expectedRetirementDate) < new Date('2026-06-12') && (
                <div className="mt-1 text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold border border-rose-100 animate-pulse inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> RETIREMENT OVERDUE
                </div>
              )}
            </div>
          </div>

          {/* Stepper Component (Visual Workflow Progress Tracker) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">Workflow Progress Stepper</h4>
            {request.currentStatus === RequestStatus.REJECTED ? (
              <div className="flex items-center gap-3 p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-200 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <h5 className="font-bold">Workflow Terminated (Rejected)</h5>
                  <p className="opacity-90">Please look at comments below, correct the issue in the Initiator roles, and Click Resubmit.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 relative">
                {stepperSteps.map((step, idx) => {
                  const isCompleted = activeStep > idx;
                  const isActive = activeStep === idx;
                  return (
                    <div key={idx} className="relative flex flex-col items-center text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 ${
                        isCompleted 
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200' 
                          : isActive 
                            ? 'bg-blue-600 border-blue-600 text-white animate-pulse' 
                            : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <p className={`text-xs font-bold mt-2 ${isActive ? 'text-blue-700' : isCompleted ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        {step.name}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide">{step.role}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form edit fields vs static list fields */}
          {isEditing ? (
            <form id="details-edit-form" onSubmit={handleResubmit} className="space-y-4 bg-blue-50/20 p-4 rounded-xl border border-blue-100">
              <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest">Resubmit Form Fields</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Staff Name</label>
                  <input
                    id="edit-staff-name"
                    type="text"
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-semibold outline-none focus:border-blue-500"
                    value={editStaff}
                    onChange={(e) => setEditStaff(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Department</label>
                  <input
                    id="edit-dept-name"
                    type="text"
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-semibold outline-none focus:border-blue-500"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Amount Requested (₦)</label>
                  <input
                    id="edit-amount"
                    type="number"
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs font-bold outline-none focus:border-blue-500"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Expected Retirement Date</label>
                  <input
                    id="edit-date"
                    type="date"
                    className="w-full bg-white border border-slate-200 p-2 rounded text-xs outline-none focus:border-blue-500"
                    value={editExpectedDate}
                    onChange={(e) => setEditExpectedDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Purpose of Advance</label>
                <textarea
                  id="edit-purpose"
                  rows={3}
                  className="w-full bg-white border border-slate-200 p-2 rounded text-xs outline-none focus:border-blue-500"
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  id="cancel-edit-btn"
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 rounded text-xs"
                >
                  Cancel Edit
                </button>
                <button
                  id="submit-edit-btn"
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs flex items-center gap-1"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
              <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff / Beneficiary</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block flex items-center gap-1">
                  <User className="w-4 h-4 text-slate-400" /> {request.staffName}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">Dept: {request.department}</span>
              </div>

              <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Funding Required</span>
                <span className="text-xl font-extrabold text-blue-800 mt-1 block font-mono">
                  ₦{request.amountRequested.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Retirement Date Limit: <strong className="font-mono text-amber-700">{request.expectedRetirementDate}</strong></span>
              </div>

              <div className="md:col-span-2 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purpose Statement</span>
                <p className="text-sm text-slate-700 leading-relaxed font-sans">{request.purpose}</p>
              </div>

              {request.comment && (
                <div className="md:col-span-2 bg-slate-50/50 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Initiator Comment</span>
                  <p className="text-xs text-slate-600 italic mt-1 font-sans">"{request.comment}"</p>
                </div>
              )}

              {request.attachmentName && (
                <div className="md:col-span-2 bg-blue-50/20 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-slate-700 truncate font-semibold font-mono">{request.attachmentName}</span>
                  </div>
                  <button
                    id="view-attachment-detail-btn"
                    onClick={() => alert(`Simulating file download/view: ${request.attachmentName}`)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                    type="button"
                  >
                    View File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Payment metadata summary (If Paid) */}
          {request.paymentDetails && (
            <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Financial Settlement Voucher
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
                <div>
                  <span className="text-slate-400 block font-medium">Disbursed Date:</span>
                  <span className="font-bold text-slate-800 font-mono">{request.paymentDetails.paymentDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Payment Route:</span>
                  <span className="font-bold text-slate-800">{request.paymentDetails.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Txn Reference:</span>
                  <span className="font-bold text-slate-800 font-mono">{request.paymentDetails.paymentReference}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Amount Disbursed:</span>
                  <span className="font-extrabold text-emerald-700 font-mono">₦{request.paymentDetails.amountPaid}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Workflow Action Panel & Comment logs Column 3 */}
        <div className="p-6 space-y-6 bg-slate-50/60 print:bg-white">
          
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Workflow Log History</h4>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {request.approvalHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No workflow actions registered.</p>
              ) : (
                request.approvalHistory.map((item, index) => (
                  <div key={index} className="relative pl-5 border-l border-slate-200 last:border-0 pb-1">
                    <div className="absolute left-0 top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-300"></div>
                    <div className="text-xs">
                      <div className="flex justify-between font-semibold text-slate-800 flex-wrap gap-x-2">
                        <span>{item.action} by {item.userName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{item.date} • {item.userRole}</span>
                      {item.comment && (
                        <p className="mt-1 p-1.5 bg-white text-slate-600 rounded border border-slate-100 text-[11px] leading-relaxed break-words">
                          {item.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Core Interactive Action Panel for matching roles */}
          {hasActionPanel && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm print:hidden">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <div>
                  <h5 className="font-bold text-xs uppercase tracking-wider">Approval Center Panel</h5>
                  <p className="text-[10px] text-slate-400">Acting as authorized role: {currentRole}</p>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded flex items-center gap-1.5 border border-rose-100">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </p>
              )}

              {/* State A: Admin Officer edit / resubmit for draft or rejected */}
              {(request.currentStatus === RequestStatus.DRAFT || request.currentStatus === RequestStatus.REJECTED) && 
               (currentRole === UserRole.ADMIN_OFFICER || currentRole === UserRole.SYSTEM_ADMIN) && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-600 leading-normal">
                    This request is currently in <strong>{request.currentStatus}</strong>. Correct the parameters using fields below or resubmit directly to reset approval step counters.
                  </p>
                  {!isEditing ? (
                    <button
                      id="enable-edit-btn"
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-2 rounded text-xs transition-colors border border-blue-100 flex items-center justify-center gap-1"
                    >
                      Modify Request Parameters
                    </button>
                  ) : null}
                  
                  {/* Dynamic Organization Tagging via Email */}
                  <div className="mt-1.5 mb-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500 font-sans">
                    <span className="font-bold flex items-center gap-0.5 text-blue-600 select-none">
                      Tag member via email:
                    </span>
                    {STAFF_MEMBERS.map(staff => (
                      <button
                        key={staff.name}
                        type="button"
                        onClick={() => {
                          const prefix = comment ? (comment.endsWith(' ') ? '' : ' ') : '';
                          setComment(prev => `${prev}${prefix}@${staff.name} `);
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold cursor-pointer transition-colors"
                        title={`Tag @${staff.name}`}
                      >
                        {staff.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  {STAFF_MEMBERS.map(staff => comment.includes(`@${staff.name}`) && (
                    <div key={staff.name} className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 w-fit">
                      <span>📧</span> Will automatically notify <strong>{staff.name}</strong> via email copy.
                    </div>
                  ))}
                  <textarea
                    id="panel-comment-input-resubmit"
                    rows={2}
                    placeholder="Enter resubmission comment logs..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    {request.currentStatus === RequestStatus.DRAFT && (
                      <button
                        id="submit-direct-btn"
                        onClick={() => onApprovalAction('Resubmit', comment || 'Submitting Draft request')}
                        className="col-span-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit to Approvers
                      </button>
                    )}

                    {request.currentStatus === RequestStatus.REJECTED && (
                      <button
                        id="resubmit-rejected-btn"
                        onClick={() => onApprovalAction('Resubmit', comment || 'Resubmitting rejected memo with corrections')}
                        className="col-span-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Resubmit corrections
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* State B: Normal Approver Role (Head of Admin, Internal Control, Executive Office) */}
              {[
                RequestStatus.SUBMITTED, 
                RequestStatus.PENDING_HEAD_OF_ADMIN, 
                RequestStatus.PENDING_INTERNAL_CONTROL, 
                RequestStatus.PENDING_EXECUTIVE_OFFICE
               ].includes(request.currentStatus) && isAuthorizedToApprove() && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Approver Comment logs *
                    </label>
                    {/* Dynamic Organization Tagging via Email */}
                    <div className="mt-1.5 mb-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500 font-sans">
                      <span className="font-bold flex items-center gap-0.5 text-blue-600 select-none">
                        Tag member via email:
                      </span>
                      {STAFF_MEMBERS.map(staff => (
                        <button
                          key={staff.name}
                          type="button"
                          onClick={() => {
                            const prefix = comment ? (comment.endsWith(' ') ? '' : ' ') : '';
                            setComment(prev => `${prev}${prefix}@${staff.name} `);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold cursor-pointer transition-colors"
                          title={`Tag @${staff.name}`}
                        >
                          {staff.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                    {STAFF_MEMBERS.map(staff => comment.includes(`@${staff.name}`) && (
                      <div key={staff.name} className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 w-fit">
                        <span>📧</span> Will automatically notify <strong>{staff.name}</strong> via email copy.
                      </div>
                    ))}
                    <textarea
                      id="panel-comment-input-approver"
                      rows={3}
                      placeholder="Enter comment. Required if rejecting or requesting clarification..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      id="approve-action-btn"
                      onClick={() => handleAction('Approve')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve & Forward
                    </button>
                    
                    <button
                      id="reject-action-btn"
                      onClick={() => handleAction('Reject')}
                      className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold py-2 rounded text-xs transition-all border border-rose-100 flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" /> Reject (Mandatory Comment)
                    </button>

                    <button
                      id="clarification-action-btn"
                      onClick={() => handleAction('Request Clarification')}
                      className="w-full bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold py-2 rounded text-xs transition-all border border-amber-100 flex items-center justify-center gap-1"
                    >
                      <HelpCircle className="w-4 h-4" /> Request Clarification
                    </button>
                  </div>
                </div>
              )}

              {/* State C: Head of Admin Final release action */}
              {request.currentStatus === RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE && isAuthorizedToApprove() && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-normal">
                    This request has gone through full executive levels. Click <strong>Send To Finance</strong> to dispatch is for final disbursement, or return to review loops.
                  </p>

                  {/* Dynamic Organization Tagging via Email */}
                  <div className="mt-1.5 mb-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500 font-sans">
                    <span className="font-bold flex items-center gap-0.5 text-blue-600 select-none">
                      Tag member via email:
                    </span>
                    {STAFF_MEMBERS.map(staff => (
                      <button
                        key={staff.name}
                        type="button"
                        onClick={() => {
                          const prefix = comment ? (comment.endsWith(' ') ? '' : ' ') : '';
                          setComment(prev => `${prev}${prefix}@${staff.name} `);
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold cursor-pointer transition-colors"
                        title={`Tag @${staff.name}`}
                      >
                        {staff.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  {STAFF_MEMBERS.map(staff => comment.includes(`@${staff.name}`) && (
                    <div key={staff.name} className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 w-fit">
                      <span>📧</span> Will automatically notify <strong>{staff.name}</strong> via email copy.
                    </div>
                  ))}
                  <textarea
                    id="panel-comment-input-hoar"
                    rows={2}
                    placeholder="Head of Admin Comments..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      id="send-to-finance-btn"
                      onClick={() => handleAction('Send to Finance')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" /> [Send To Finance]
                    </button>

                    <button
                      id="return-for-review-btn"
                      onClick={() => handleAction('Return for Review')}
                      className="w-full bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold py-2 rounded text-xs transition-all border border-amber-100 flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> [Return For Review]
                    </button>
                  </div>
                </div>
              )}

              {/* State D: Finance Disbursal Payment Setup */}
              {request.currentStatus === RequestStatus.AWAITING_FINANCE_PAYMENT && isAuthorizedToApprove() && (
                <form id="finance-payment-form" onSubmit={handlePayAction} className="space-y-3">
                  <p className="text-xs text-slate-600 leading-normal font-sans">
                    Confirm values and record bank transaction traces to mark cash advance as Paid.
                  </p>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500">Beneficiary Name</label>
                      <input
                        id="fin-beneficiary"
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none font-semibold text-slate-700 text-xs"
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500">Method</label>
                        <select
                          id="fin-method"
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash Voucher</option>
                          <option value="Cheque">Cheque Draft</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500">Amount Paid</label>
                        <input
                          id="fin-amount"
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded outline-none font-bold text-slate-700 text-xs"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400">Payment Reference *</label>
                      <input
                        id="fin-reference"
                        type="text"
                        placeholder="e.g. TXN-109283719"
                        className="w-full bg-white border border-slate-200 p-2 rounded font-mono text-xs font-bold focus:border-blue-500 outline-none"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400">Finance Auditor Comment</label>
                      {/* Dynamic Organization Tagging via Email */}
                      <div className="mt-1.5 mb-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500 font-sans">
                        <span className="font-bold flex items-center gap-0.5 text-blue-600 select-none">
                          Tag member via email:
                        </span>
                        {STAFF_MEMBERS.map(staff => (
                          <button
                            key={staff.name}
                            type="button"
                            onClick={() => {
                              const prefix = comment ? (comment.endsWith(' ') ? '' : ' ') : '';
                              setComment(prev => `${prev}${prefix}@${staff.name} `);
                            }}
                            className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold cursor-pointer transition-colors"
                            title={`Tag @${staff.name}`}
                          >
                            {staff.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                      {STAFF_MEMBERS.map(staff => comment.includes(`@${staff.name}`) && (
                        <div key={staff.name} className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 w-fit">
                          <span>📧</span> Will automatically notify <strong>{staff.name}</strong> via email copy.
                        </div>
                      ))}
                      <textarea
                        id="fin-comment"
                        rows={2}
                        placeholder="Payment description remarks..."
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs outline-none focus:border-blue-500"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <button
                      id="mark-paid-action-btn"
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" /> [Mark As Paid]
                    </button>

                    <button
                      id="return-to-admin-action-btn"
                      type="button"
                      onClick={() => {
                        if (!comment.trim()) {
                          setErrorMsg('Comment is required to return to Head of Admin');
                          return;
                        }
                        setErrorMsg('');
                        onApprovalAction('Return to Admin', comment);
                        setComment('');
                      }}
                      className="w-full bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold py-2 rounded text-xs transition-colors border border-amber-100 flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> [Return To Admin]
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* If not authorized indicator */}
          {!isAuthorizedToApprove() && [
            RequestStatus.SUBMITTED, 
            RequestStatus.PENDING_HEAD_OF_ADMIN, 
            RequestStatus.PENDING_INTERNAL_CONTROL, 
            RequestStatus.PENDING_EXECUTIVE_OFFICE,
            RequestStatus.PENDING_HEAD_OF_ADMIN_RELEASE,
            RequestStatus.AWAITING_FINANCE_PAYMENT
          ].includes(request.currentStatus) && (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-center space-y-1.5 print:hidden">
              <Clock className="w-5 h-5 text-slate-400 mx-auto animate-pulse" />
              <p className="text-xs font-bold text-slate-700">Awaiting External Level Verification</p>
              <p className="text-[10px] text-slate-500 leading-normal">
                Currently, this memo is awaiting actions by authorization roles. Click the <strong>Identities dropdown</strong> at the header to simulate other authority roles.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
