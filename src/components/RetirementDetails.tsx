import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle, XCircle, Info, FileText, Calendar, 
  DollarSign, ShieldAlert, User, Check, AlertCircle, Clock, 
  RotateCcw, HelpCircle, Archive, Printer, Sparkles, Upload
} from 'lucide-react';
import { CashAdvanceRetirement, RetirementStatus, UserRole, STAFF_MEMBERS } from '../types';

interface RetirementDetailsProps {
  retirement: CashAdvanceRetirement;
  currentRole: UserRole;
  currentUserName: string;
  onBack: () => void;
  onVerifyAction: (
    action: 'Approve' | 'Reject' | 'Request Clarification' | 'Send to Finance' | 'Return to Admin' | 'Return for Review' | 'Resubmit',
    comment: string,
    signatureSvg?: string
  ) => void;
}

export default function RetirementDetails({
  retirement,
  currentRole,
  currentUserName,
  onBack,
  onVerifyAction
}: RetirementDetailsProps) {
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [printSuccess, setPrintSuccess] = useState(false);

  // E-Signature state manager
  const [signatureMode, setSignatureMode] = useState<'typed' | 'drawn' | 'imported'>('typed');
  const [typedSignature, setTypedSignature] = useState(currentUserName);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    setTypedSignature(currentUserName);
  }, [currentUserName]);

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

  // Checks for role verification capability
  const isAuthorizedToVerify = () => {
    switch (retirement.currentStatus) {
      case RetirementStatus.PENDING_HEAD_OF_ADMIN:
        return currentRole === UserRole.HEAD_OF_ADMIN || currentRole === UserRole.SYSTEM_ADMIN;
      case RetirementStatus.PENDING_INTERNAL_CONTROL:
        return currentRole === UserRole.INTERNAL_CONTROL || currentRole === UserRole.SYSTEM_ADMIN;
      case RetirementStatus.PENDING_EXECUTIVE_OFFICE:
        return currentRole === UserRole.EXECUTIVE_DIRECTOR || currentRole === UserRole.SYSTEM_ADMIN;
      case RetirementStatus.PENDING_HEAD_OF_ADMIN_RELEASE:
        return currentRole === UserRole.HEAD_OF_ADMIN || currentRole === UserRole.SYSTEM_ADMIN;
      case RetirementStatus.PENDING_FINANCE:
        return currentRole === UserRole.FINANCE_OFFICER || currentRole === UserRole.SYSTEM_ADMIN;
      default:
        return false;
    }
  };

  const getActiveRetStep = () => {
    switch (retirement.currentStatus) {
      case RetirementStatus.DRAFT:
      case RetirementStatus.SUBMITTED:
        return 0;
      case RetirementStatus.PENDING_HEAD_OF_ADMIN: 
        return 1;
      case RetirementStatus.PENDING_INTERNAL_CONTROL: 
        return 2;
      case RetirementStatus.PENDING_EXECUTIVE_OFFICE: 
        return 3;
      case RetirementStatus.PENDING_HEAD_OF_ADMIN_RELEASE: 
        return 4;
      case RetirementStatus.PENDING_FINANCE: 
        return 5;
      case RetirementStatus.APPROVED: 
        return 6;
      case RetirementStatus.REJECTED: 
        return -1;
      default: 
        return 0;
    }
  };

  const currentStep = getActiveRetStep();

  const handleAction = (action: 'Approve' | 'Reject' | 'Request Clarification' | 'Send to Finance' | 'Return to Admin' | 'Return for Review' | 'Resubmit') => {
    if ((action === 'Reject' || action === 'Request Clarification' || action === 'Return for Review' || action === 'Return to Admin') && !comment.trim()) {
      setErrorMsg(`A comment is required to perform: ${action}`);
      return;
    }
    setErrorMsg('');

    // Compute signature data for approvals
    const finalSignature = (action === 'Approve' || action === 'Send to Finance')
      ? (signatureMode === 'typed' ? `typed:${typedSignature}` : (drawnSignature ? `drawn:${drawnSignature}` : `typed:${currentUserName}`))
      : undefined;

    onVerifyAction(action, comment, finalSignature);
    setComment('');
    setDrawnSignature(null);
  };

  const renderESignaturePad = () => {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200/65 pb-2 mb-2">
          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            ✍️ Electronic Verification Signature
          </label>
          <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[10px] font-bold font-sans">
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
              Import Device
            </button>
          </div>
        </div>

        {signatureMode === 'typed' ? (
          <div className="space-y-1.5">
            <p className="text-[9px] text-slate-400 leading-normal">
              A dynamic cursive typeface will represent your official signature. You can customize the spelling:
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
                {typedSignature || currentUserName}
              </span>
            </div>
          </div>
        ) : signatureMode === 'drawn' ? (
          <div className="space-y-1.5">
            <p className="text-[9px] text-slate-400 leading-normal">
              Draw your signature inside the sandbox canvas. Use your mouse pointer or touch responsive screens:
            </p>
            <div className="relative border border-slate-200 rounded-lg bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                width={360}
                height={120}
                className="w-full h-[120px] bg-white cursor-pen block"
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
                Clear Pad
              </button>
            </div>
            {drawnSignature ? (
              <div className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-1 justify-end">
                <span>✓ Active draft captured successfully</span>
              </div>
            ) : (
              <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-1 justify-end">
                <span>⏳ Draw on canvas pad to populate binary stream</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[9px] text-slate-400 leading-normal">
              Import any handdrawn signature file or image from your device storage:
            </p>
            <div className="border border-dashed border-slate-300 hover:border-blue-400 rounded-lg bg-white p-4 transition-colors relative cursor-pointer group text-center">
              <input
                id="import-ret-sig-details"
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
                  <img src={drawnSignature} className="h-14 max-h-16 object-contain bg-slate-50 border p-1 rounded mx-auto" alt="Imported Signature" referrerPolicy="no-referrer" />
                  <span className="text-[9px] text-blue-600 font-bold">Replace device file</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <div className="p-2 bg-slate-100 rounded-full text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors inline-block">
                    <Upload className="w-5 h-5 mx-auto" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Choose file or drag here</p>
                    <p className="text-[9px] text-slate-400 font-medium">Supports PNG, JPG, GIF files up to 2MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const stepperSteps = [
    { name: 'Initiator submitted retirement', role: 'Initiator' },
    { name: 'Internal Control review', role: 'Internal Control' },
    { name: 'Executive Manager clearance', role: 'Executive Director' },
    { name: 'Release to Finance', role: 'Line Manager' },
    { name: 'Finance reconciliation', role: 'Finance Officer' }
  ];

  return (
    <div id={`retirement-detail-card-${retirement.id}`} className="space-y-6 animate-fade-in">
      
      {/* Navigation and print */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          id="back-list-from-ret"
          onClick={onBack}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 py-1.5 px-2.5 rounded transition-colors flex items-center gap-1 border border-slate-200"
        >
          <ArrowLeft className="w-4.5 h-4.5" /> Back to List
        </button>

        <button
          id="print-ret-btn"
          onClick={() => {
            setPrintSuccess(true);
            setTimeout(() => {
              setPrintSuccess(false);
              window.print();
            }, 1000);
          }}
          className="text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 py-1.5 px-2.5 rounded transition-all flex items-center gap-1 border border-slate-200 animate-pulse"
        >
          <Printer className="w-4 h-4" /> Print Retirement Audit Trail
        </button>
      </div>

      {printSuccess && (
        <div className="text-sm text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-100 text-center animate-pulse font-semibold">
          Compiling expense vouchers and receipts for browser print spooler...
        </div>
      )}

      {/* Main Content Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Retirement contents Column 1 & 2 */}
        <div className="lg:col-span-2 p-6 space-y-6">
          
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded font-mono">
                  RET-{retirement.id} (For {retirement.cashAdvanceRef})
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">{retirement.retirementDate}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-2">Cash Advance Retirement claiming</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-sans">Verification workflow requires linear approval validation</p>
            </div>

            <div className="text-right">
              <span className={`inline-block py-1 px-3 rounded-full text-xs font-bold border ${
                retirement.currentStatus === RetirementStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                retirement.currentStatus === RetirementStatus.REJECTED ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {retirement.currentStatus}
              </span>
            </div>
          </div>

          {/* Stepper progress card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5 font-mono">Retirement Workflow State</h4>
            
            {retirement.currentStatus === RetirementStatus.REJECTED ? (
              <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-800 border border-rose-200 text-xs rounded-lg">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <p className="font-semibold">Verification loop Rejected. Funds tracking closed or flagged as invalid claims.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stepperSteps.map((step, idx) => {
                  const isCompleted = currentStep > idx;
                  const isActive = currentStep === idx;
                  return (
                    <div key={idx} className="relative flex flex-col items-center text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 ${
                        isCompleted 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : isActive 
                            ? 'bg-amber-500 border-amber-500 text-white animate-pulse' 
                            : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <p className={`text-xs font-bold mt-2 ${isActive ? 'text-amber-700' : isCompleted ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                        {step.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settle summary */}
          <div className="grid grid-cols-3 gap-4 text-center bg-slate-50/50 p-4 border border-slate-100 rounded-lg">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cash Disbursed</span>
              <p className="text-lg font-bold font-mono text-blue-900 mt-1">₦{retirement.amountAdvanced.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Receipt Sum Value</span>
              <p className="text-lg font-bold font-mono text-slate-800 mt-1">₦{retirement.amountUtilized.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Excess Refund Balance</span>
              <p className={`text-lg font-extrabold font-mono mt-1 ${retirement.balanceReturned >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₦{retirement.balanceReturned.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Line items details list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Line-Item Audited slates
            </h4>
            
            <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {retirement.expenseDetails.map((expense, idx) => (
                <div key={idx} className="p-3.5 flex justify-between items-center bg-slate-50/10 hover:bg-slate-50/30 transition-colors">
                  <div>
                    <h5 className="font-semibold text-slate-800 text-sm">{expense.description}</h5>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded mt-1.5 inline-block">{expense.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-slate-800">₦{expense.amount.toLocaleString()}</span>
                    <span className="text-[10px] block text-slate-400 font-mono mt-1">Receipt ValidATED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment & Receipt */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Comments Logs</span>
              <p className="text-xs text-slate-600 italic mt-2 leading-relaxed">"{retirement.comment || 'No extra remarks provided'}"</p>
            </div>

            {retirement.receiptName && (
              <div className="p-3.5 bg-blue-50/30 rounded-lg border border-blue-100 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Attached Auditing Vouchers</span>
                  <p className="text-xs font-bold text-slate-800 truncate font-mono mt-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" /> {retirement.receiptName}
                  </p>
                </div>
                
                {retirement.receiptUrl ? (
                  <a
                    id="view-receipt-btn"
                    href={retirement.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 text-left underline"
                  >
                    Verify Barcode receipts
                  </a>
                ) : (
                  <button
                    id="view-receipt-btn"
                    onClick={() => alert(`Simulating receipt viewer opening for file: ${retirement.receiptName}`)}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 text-left underline"
                    type="button"
                  >
                    Verify Barcode receipts
                  </button>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Action Panel Column 3 */}
        <div className="p-6 bg-slate-50/60 space-y-6">
          
          {/* History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auden logs and Signatures</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {retirement.approvalHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No approval records available.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 rounded-lg">
                    <span className="col-span-4">Approver</span>
                    <span className="col-span-4">Signature</span>
                    <span className="col-span-4">Date / Time</span>
                  </div>
                  <div className="space-y-2">
                    {retirement.approvalHistory.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="col-span-4">
                          <div className="font-semibold text-slate-800">{item.userName}</div>
                          <div className="text-[10px] text-slate-400">{item.userRole}</div>
                          <div className="mt-1 text-[10px] text-slate-500">{item.action}</div>
                        </div>
                        <div className="col-span-4">
                          {item.signatureSvg ? (
                            item.signatureSvg.startsWith('drawn:') ? (
                              <img src={item.signatureSvg.substring(6)} className="h-10 max-h-12 max-w-full object-contain border-b border-dashed border-blue-300 bg-blue-50/20 px-1 py-0.5 rounded" alt="Signature" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="font-serif italic text-xs text-blue-600 border-b border-dashed border-blue-300 font-bold px-2 py-1 bg-blue-50/20 rounded tracking-wider block">
                                {item.signatureSvg.substring(6)}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No signature recorded</span>
                          )}
                        </div>
                        <div className="col-span-4">
                          <div className="font-semibold text-slate-800">{item.date}</div>
                          {item.comment && (
                            <p className="mt-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                              {item.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive buttons */}
          {isAuthorizedToVerify() && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <div>
                  <h5 className="font-bold text-xs uppercase tracking-wider">Retirement Verification Center</h5>
                  <p className="text-[10px] text-slate-400">Role Authority Desk: {currentRole}</p>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {errorMsg}
                </p>
              )}

              {retirement.currentStatus === RetirementStatus.PENDING_FINANCE && (
                <div className="p-2.5 bg-amber-50 text-[11px] text-amber-800 border border-amber-200 rounded leading-relaxed">
                  <strong>Finance Officer Verifications:</strong> Please cross-examine attached invoice vouchers and ensure leftover returned cash of <strong>₦{retirement.balanceReturned}</strong> has been transferred back to corporate cashier desk before final settlement signature.
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remarks & Auditing Comments</label>
                {/* Dynamic Organization Tagging via Email */}
                <div className="mt-1 mb-1.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500 font-sans">
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
                  <div key={staff.name} className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30 w-fit">
                    <span>📧</span> Will automatically notify <strong>{staff.name}</strong> via email copy.
                  </div>
                ))}
                <textarea
                  id="verify-comment-input"
                  rows={3}
                  placeholder="Review comments. Required if rejecting or querying details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              {renderESignaturePad()}

              <div className="grid grid-cols-1 gap-2">
                {/* primary action */}
                {retirement.currentStatus === RetirementStatus.PENDING_HEAD_OF_ADMIN_RELEASE ? (
                  <button
                    id="btn-release-verify"
                    onClick={() => handleAction('Send to Finance')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded text-xs transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" /> Release Claims to Finance
                  </button>
                ) : retirement.currentStatus === RetirementStatus.PENDING_FINANCE ? (
                  <button
                    id="btn-reconcile-verify"
                    onClick={() => handleAction('Approve')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded text-xs transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" /> Reconcile & Close Retirement
                  </button>
                ) : (
                  <button
                    id="btn-approve-verify"
                    onClick={() => handleAction('Approve')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded text-xs transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" /> Verify & Forward Claims
                  </button>
                )}

                {/* Reject action */}
                <button
                  id="btn-reject-verify"
                  onClick={() => handleAction('Reject')}
                  className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold py-2 rounded text-xs transition-colors border border-rose-100 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject Claims folder
                </button>

                {/* Return for review */}
                {retirement.currentStatus !== RetirementStatus.PENDING_FINANCE && (
                  <button
                    id="btn-return-initiator-verify"
                    onClick={() => handleAction('Return for Review')}
                    className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold py-2 rounded text-xs transition-colors border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Return to Initiator for Review
                  </button>
                )}

                {/* Return to Admin */}
                {retirement.currentStatus === RetirementStatus.PENDING_FINANCE && (
                  <button
                    id="btn-return-admin-verify"
                    onClick={() => handleAction('Return to Admin')}
                    className="w-full bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold py-2 rounded text-xs transition-colors border border-amber-100 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Return to Line Manager Release
                  </button>
                )}

                {/* Clarification */}
                <button
                  id="btn-clarify-verify"
                  onClick={() => handleAction('Request Clarification')}
                  className="w-full bg-slate-50 text-slate-600 hover:bg-slate-100 font-semibold py-2 rounded text-xs transition-colors border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" /> Query Clarifications
                </button>
              </div>

            </div>
          )}

          {!isAuthorizedToVerify() && (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-center space-y-1.5">
              <Clock className="w-4 h-4 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Verifying Queue Pending</p>
              <p className="text-[10px] text-slate-500">
                This claims packet is current reviewed by other authorized departments. Adjust role switchers to act.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
