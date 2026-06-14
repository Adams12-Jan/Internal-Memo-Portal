import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, DollarSign, FileDown, Paperclip, AlertOctagon, 
  CheckCircle, ArrowLeft, UploadCloud, Trash2, ClipboardList 
} from 'lucide-react';
import { CashAdvanceRequest, RequestStatus, DEPARTMENTS, STAFF_MEMBERS } from '../types';

interface CashAdvanceRequestFormProps {
  onAddRequest: (request: Partial<CashAdvanceRequest>) => void;
  onCancel: () => void;
  nextReferenceNumber: string;
  currentUser: { name: string; department: string };
}

export default function CashAdvanceRequestForm({
  onAddRequest,
  onCancel,
  nextReferenceNumber,
  currentUser
}: CashAdvanceRequestFormProps) {
  const [staffName, setStaffName] = useState(currentUser.name);
  const [department, setDepartment] = useState(currentUser.department);
  const [purpose, setPurpose] = useState('');
  const [amountRequested, setAmountRequested] = useState('');
  const [expectedRetirementDate, setExpectedRetirementDate] = useState('');
  const [comment, setComment] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sync staff name if current switchable user changes
  useEffect(() => {
    setStaffName(currentUser.name);
    setDepartment(currentUser.department);
  }, [currentUser]);

  // Set default expected retirement date to 14 days in future
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 14);
    const dateString = defaultDate.toISOString().split('T')[0];
    setExpectedRetirementDate(dateString);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachment(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setAttachment(files[0]);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!staffName.trim()) tempErrors.staffName = 'Staff Name is required';
    if (!department) tempErrors.department = 'Department is required';
    if (!purpose.trim() || purpose.trim().length < 10) {
      tempErrors.purpose = 'Purpose must be at least 10 characters long';
    }
    const amt = parseFloat(amountRequested);
    if (isNaN(amt) || amt <= 0) {
      tempErrors.amountRequested = 'Please specify a positive valid amount';
    }
    if (!expectedRetirementDate) {
      tempErrors.expectedRetirementDate = 'Expected retirement date must be defined';
    } else {
      const selected = new Date(expectedRetirementDate);
      const today = new Date('2026-06-12'); // system aligned 
      if (selected < today) {
        tempErrors.expectedRetirementDate = 'Retirement date cannot be in the past';
      }
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault();
    if (!isDraft && !validate()) return;

    // Build the request object
    const newRequest: Partial<CashAdvanceRequest> = {
      referenceNumber: nextReferenceNumber,
      requestDate: '2026-06-12', // current contextual date
      staffName: staffName || currentUser.name,
      department: department || currentUser.department,
      purpose: purpose || 'Procurement allocation memo',
      amountRequested: parseFloat(amountRequested) || 0,
      expectedRetirementDate: expectedRetirementDate,
      attachmentName: attachment ? attachment.name : undefined,
      comment: comment,
      currentStatus: isDraft ? RequestStatus.DRAFT : RequestStatus.SUBMITTED,
      initiator: currentUser.name
    };

    onAddRequest(newRequest);
  };

  return (
    <div id="new-request-container" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in relative max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 justify-between">
        <div className="flex items-center gap-3">
          <button
            id="back-btn-req-form"
            onClick={onCancel}
            className="p-1 px-2 hover:bg-slate-100 rounded text-slate-500 transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to list
          </button>
          <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Initiate Cash Advance Allocation Memo</h3>
            <p className="text-xs text-slate-500">Draft a funding request to trigger approval routing</p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-100 text-xs font-mono font-bold">
          Ref: {nextReferenceNumber}
        </div>
      </div>

      <form id="cash-advance-request-form" className="space-y-6">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Reference Number (System Auto-Generated)
            </label>
            <input
              id="req-form-ref"
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-xs font-semibold text-slate-600 outline-none"
              value={nextReferenceNumber}
              disabled
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Request Date
            </label>
            <input
              id="req-form-date"
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-xs font-semibold text-slate-600 outline-none"
              value="2026-06-12"
              disabled
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Staff Name / Beneficiary *
            </label>
            <input
              id="req-form-staff"
              type="text"
              placeholder="e.g. John Doe, Sarah Jenkins"
              className={`w-full bg-white border rounded-lg p-2.5 text-sm outline-none transition-all ${
                errors.staffName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
              }`}
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
            {errors.staffName && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" /> {errors.staffName}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Department *
            </label>
            <select
              id="req-form-dept"
              className={`w-full bg-white border rounded-lg p-2.5 text-sm outline-none transition-all ${
                errors.department ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
              }`}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">-- Choose Department --</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {errors.department && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" /> {errors.department}
              </p>
            )}
          </div>
        </div>

        {/* Row 3 */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Amount Requested (₦) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none select-none">
                <span className="font-extrabold text-sm text-slate-600 font-mono">₦</span>
              </span>
              <input
                id="req-form-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={`w-full bg-white border rounded-lg pl-9 p-2.5 text-sm font-semibold outline-none transition-all ${
                  errors.amountRequested ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                }`}
                value={amountRequested}
                onChange={(e) => setAmountRequested(e.target.value)}
              />
            </div>
            {errors.amountRequested && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" /> {errors.amountRequested}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Expected Retirement Date *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                id="req-form-retirement-date"
                type="date"
                className={`w-full bg-white border rounded-lg pl-9 p-2.5 text-sm outline-none transition-all ${
                  errors.expectedRetirementDate ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                }`}
                value={expectedRetirementDate}
                onChange={(e) => setExpectedRetirementDate(e.target.value)}
              />
            </div>
            {errors.expectedRetirementDate && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" /> {errors.expectedRetirementDate}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Staff is expected to return utilization vouchers by this target date.</p>
          </div>
        </div>

        {/* Row 4 Purpose */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Purpose of Cash Advance Request *
          </label>
          <textarea
            id="req-form-purpose"
            rows={4}
            placeholder="Provide explicit operational reasons for the cash advance, listing items to purchase or repair..."
            className={`w-full bg-white border rounded-lg p-2.5 text-sm outline-none transition-all ${
              errors.purpose ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
            }`}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          {errors.purpose && (
            <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" /> {errors.purpose}
            </p>
          )}
        </div>

        {/* File Upload drag and drop */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Quotations & Attachment Upload (Recommended)
          </label>
          
          <div
            id="file-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50/50' 
                : attachment 
                  ? 'border-emerald-300 bg-emerald-50/20' 
                  : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/30'
            }`}
          >
            <input
              id="file-upload-input"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            
            <label htmlFor="file-upload-input" className="cursor-pointer block">
              {!attachment ? (
                <div className="space-y-2">
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Drag & drop your invoice here, or <span className="text-blue-600 underline">browse files</span></p>
                  <p className="text-xs text-slate-400">Supports PDF, DOC, Excel, and images up to 10MB</p>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-white border border-emerald-100 p-3 rounded-lg max-w-md mx-auto">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-emerald-50 rounded text-emerald-600">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{attachment.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{(attachment.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    id="remove-file-btn"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeAttachment();
                    }}
                    className="p-1 px-2 hover:bg-rose-50 text-rose-500 rounded text-xs font-bold hover:text-rose-700 transition-colors flex items-center gap-1"
                    title="Remove File Attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Comment field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Initiator Additional Comment
          </label>
          <textarea
            id="req-form-comment"
            rows={2}
            placeholder="Any extra details, priority notes, or urgent requirements..."
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition-all"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            id="req-form-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
          >
            Cancel & Back
          </button>
          
          <button
            id="req-form-draft-btn"
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            className="px-4 py-2 text-sm font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
          >
            Save as Draft
          </button>

          <button
            id="req-form-submit-btn"
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Submit to Workflow
          </button>
        </div>

      </form>
    </div>
  );
}
