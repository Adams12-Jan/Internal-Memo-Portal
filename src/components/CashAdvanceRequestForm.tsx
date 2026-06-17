import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Calendar, DollarSign, FileDown, Paperclip, AlertOctagon, 
  CheckCircle, ArrowLeft, UploadCloud, Trash2, ClipboardList, Upload, PenTool 
} from 'lucide-react';
import { CashAdvanceRequest, RequestStatus, DEPARTMENTS, STAFF_MEMBERS } from '../types';
import { uploadFileToBackend } from '../services/microsoftApi';

interface CashAdvanceRequestFormProps {
  onAddRequest: (request: Partial<CashAdvanceRequest>) => void;
  onCancel: () => void;
  nextReferenceNumber: string;
  currentUser: { name: string; department: string };
  maxAmount?: number;
}

export default function CashAdvanceRequestForm({
  onAddRequest,
  onCancel,
  nextReferenceNumber,
  currentUser,
  maxAmount = 2000000
}: CashAdvanceRequestFormProps) {
  const [staffName, setStaffName] = useState(currentUser.name);
  const [department, setDepartment] = useState(currentUser.department);
  const [refNumber, setRefNumber] = useState(nextReferenceNumber);
  const [requestDate, setRequestDate] = useState('2026-06-12');
  const [purpose, setPurpose] = useState('');
  const [amountRequested, setAmountRequested] = useState('');
  const [expectedRetirementDate, setExpectedRetirementDate] = useState('');
  const [comment, setComment] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Signature States for Initiator Additional Comment
  const [signatureMode, setSignatureMode] = useState<'typed' | 'drawn' | 'imported'>('typed');
  const [typedSignature, setTypedSignature] = useState(currentUser.name);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Sync staff name if current switchable user changes
  useEffect(() => {
    setStaffName(currentUser.name);
    setDepartment(currentUser.department);
    setTypedSignature(currentUser.name);
  }, [currentUser]);

  useEffect(() => {
    setRefNumber(nextReferenceNumber);
  }, [nextReferenceNumber]);

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#2563eb'; // blue-600 color
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawnSignature(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnSignature(null);
  };

  const handleImportSignature = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setDrawnSignature(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!staffName.trim()) tempErrors.staffName = 'Staff Name is required';
    if (!department) tempErrors.department = 'Department is required';
    if (!refNumber.trim()) tempErrors.refNumber = 'Reference index is required';
    if (!requestDate) tempErrors.requestDate = 'Request Date is required';
    if (!purpose.trim() || purpose.trim().length < 10) {
      tempErrors.purpose = 'Purpose must be at least 10 characters long';
    }
    const amt = parseFloat(amountRequested);
    if (isNaN(amt) || amt <= 0) {
      tempErrors.amountRequested = 'Please specify a positive valid amount';
    } else if (amt > maxAmount) {
      tempErrors.amountRequested = `Requested amount exceeds the maximum allowance of ₦${maxAmount.toLocaleString()} configured in CMS settings.`;
    }
    if (!expectedRetirementDate) {
      tempErrors.expectedRetirementDate = 'Expected retirement date must be defined';
    } else {
      const selected = new Date(expectedRetirementDate);
      const today = new Date(requestDate || '2026-06-12'); // system aligned 
      if (selected < today) {
        tempErrors.expectedRetirementDate = 'Retirement date cannot be in the past relative to request date';
      }
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault();
    if (!isDraft && !validate()) return;

    const finalSignature = signatureMode === 'typed' 
      ? `typed:${typedSignature || currentUser.name}` 
      : (drawnSignature ? `drawn:${drawnSignature}` : `typed:${currentUser.name}`);

    // Upload attachment if present
    let attachmentUrl: string | undefined = undefined;
    if (attachment && !isDraft) {
      try {
        const uploadResult = await uploadFileToBackend(attachment);
        attachmentUrl = uploadResult.fileUrl;
      } catch (error) {
        console.error('Attachment upload failed:', error);
        // Still proceed with request creation, just without the attachment URL
      }
    }

    // Build the request object
    const newRequest: Partial<CashAdvanceRequest> = {
      referenceNumber: refNumber || nextReferenceNumber,
      requestDate: requestDate || '2026-06-12', // current contextual date
      staffName: staffName || currentUser.name,
      department: department || currentUser.department,
      purpose: purpose || 'Procurement allocation memo',
      amountRequested: parseFloat(amountRequested) || 0,
      expectedRetirementDate: expectedRetirementDate,
      attachmentName: attachment ? attachment.name : undefined,
      attachmentUrl: attachmentUrl,
      comment: comment,
      signatureSvg: finalSignature,
      currentStatus: isDraft ? RequestStatus.DRAFT : RequestStatus.SUBMITTED,
      initiator: currentUser.name
    };

    onAddRequest(newRequest);
  };

  return (
    <div id="new-request-container" className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 shadow-sm animate-fade-in relative max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6 pb-4 border-b border-slate-100 md:justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <button
            id="back-btn-req-form"
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded text-slate-500 transition-colors flex items-center gap-1 text-xs font-semibold active:scale-95 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
          </button>
          <div className="hidden md:block h-4 w-px bg-slate-200"></div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-800 text-base md:text-lg leading-tight">Initiate Cash Advance Allocation</h3>
            <p className="text-xs text-slate-500 hidden sm:block">Draft a funding request to trigger approval routing</p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg border border-blue-100 text-xs font-mono font-bold flex-shrink-0">
          Ref: {nextReferenceNumber}
        </div>
      </div>

      <form id="cash-advance-request-form" className="space-y-4 md:space-y-6">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Reference Number (System Auto-Generated)
            </label>
            <input
              id="req-form-ref"
              type="text"
              className={`w-full bg-white border rounded-lg p-3 md:p-2.5 font-mono text-sm md:text-xs font-semibold outline-none transition-all active:scale-95 ${
                errors.refNumber ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
              }`}
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
            />
            {errors.refNumber && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" /> {errors.refNumber}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Request Date
            </label>
            <input
              id="req-form-date"
              type="date"
              className={`w-full bg-white border rounded-lg p-2.5 font-mono text-xs font-semibold outline-none transition-all ${
                errors.requestDate ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
              }`}
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
            />
            {errors.requestDate && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" /> {errors.requestDate}
              </p>
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Staff Name / Beneficiary *
            </label>
              <input
              id="req-form-staff"
              type="text"
              placeholder="e.g. Ovat Daniel, Tina Ofeno"
              className={`w-full bg-white border rounded-lg p-3 md:p-2.5 text-base md:text-sm outline-none transition-all active:scale-95 ${
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
              className={`w-full bg-white border rounded-lg p-3 md:p-2.5 text-base md:text-sm outline-none transition-all active:scale-95 ${
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
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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

        {/* Comment field and Dynamic E-Signature block */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Initiator Additional Comment
            </label>
            <textarea
              id="req-form-comment"
              rows={2}
              placeholder="Any extra details, priority notes, or urgent requirements..."
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition-all text-slate-700 font-sans"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/65 pb-2 mb-2">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                ✍️ Initiator Verification E-Signature
              </label>
              <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[10px] font-extrabold w-fit">
                <button
                  type="button"
                  onClick={() => setSignatureMode('typed')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${signatureMode === 'typed' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Type Name
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('drawn')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${signatureMode === 'drawn' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Draw Freehand
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('imported')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${signatureMode === 'imported' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Import from Device
                </button>
              </div>
            </div>

            {signatureMode === 'typed' ? (
              <div className="space-y-1.5">
                <p className="text-[9px] text-slate-400 leading-normal">
                  Our system cursive styling represents your official signature dynamically:
                </p>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 font-sans tracking-wide font-medium"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type signature name..."
                />
                <div className="bg-amber-50/20 border border-amber-200/30 rounded-lg p-3 flex items-center justify-center min-h-[60px] select-none">
                  <span className="font-serif italic text-2xl text-blue-700 tracking-widest font-bold">
                    {typedSignature || currentUser.name}
                  </span>
                </div>
              </div>
            ) : signatureMode === 'drawn' ? (
              <div className="space-y-1.5">
                <p className="text-[9px] text-slate-400 leading-normal">
                  Draw your signature using your mouse, trackpad, or touch screen:
                </p>
                <div className="relative border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={360}
                    height={100}
                    className="w-full h-[100px] bg-white cursor-pen block"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="absolute right-2 bottom-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                {drawnSignature ? (
                  <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-1 justify-end">
                    <span>✓ Custom vector trace captured</span>
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-1 justify-end">
                    <span>⏳ Draw on pad template to capture stream</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[9px] text-slate-400 leading-normal">
                  Import any handwritten signature or graphic from your device (PNG, JPG, BMP):
                </p>
                <div className="border border-dashed border-slate-300 hover:border-blue-400 rounded-lg bg-white p-4 transition-colors relative cursor-pointer group text-center">
                  <input
                    id="import-sig-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImportSignature(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {drawnSignature && signatureMode === 'imported' ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[9px] font-semibold text-slate-400">Current Imported Signature Preview:</span>
                      <img src={drawnSignature} className="h-14 max-h-16 object-contain bg-slate-50 border p-1 rounded" alt="Imported Signature" referrerPolicy="no-referrer" />
                      <span className="text-[9px] text-blue-600 font-bold">Replace file from device</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <div className="p-2 bg-slate-100 rounded-full text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors inline-block">
                        <Upload className="w-5 h-5 mx-auto" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Choose file or drag here</p>
                        <p className="text-[9px] text-slate-400 font-medium">Supports PNG, JPG, GIF up to 2MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            id="req-form-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-3 sm:py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 active:scale-95"
          >
            Cancel & Back
          </button>
          
          <button
            id="req-form-draft-btn"
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            className="px-4 py-3 sm:py-2 text-sm font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 active:scale-95"
          >
            Save as Draft
          </button>

          <button
            id="req-form-submit-btn"
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            className="px-5 py-3 sm:py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1 active:scale-95"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Submit</span><span className="sm:hidden">Submit to Workflow</span>
          </button>
        </div>

      </form>
    </div>
  );
}
