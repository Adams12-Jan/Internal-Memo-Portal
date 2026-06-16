import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Calendar, DollarSign, FileText, 
  Paperclip, UploadCloud, AlertCircle, CheckCircle, Info, Sparkles, Upload, PenTool 
} from 'lucide-react';
import { CashAdvanceRequest, CashAdvanceRetirement, ExpenseItem, RetirementStatus, DEPARTMENTS } from '../types';

interface RetirementFormProps {
  paidAdvances: CashAdvanceRequest[];
  onAddRetirement: (retirement: Partial<CashAdvanceRetirement>) => void;
  onCancel: () => void;
}

export default function RetirementForm({
  paidAdvances,
  onAddRetirement,
  onCancel
}: RetirementFormProps) {
  const [selectedCARef, setSelectedCARef] = useState('');
  const [selectedCA, setSelectedCA] = useState<CashAdvanceRequest | null>(null);

  const [retirementDate, setRetirementDate] = useState('2026-06-12'); // Contextual current date
  const [expenseComment, setExpenseComment] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  
  // Dynamic line item state
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: 'exp-init-1', description: '', category: 'Stationery', amount: 0 }
  ]);

  const [errors, setErrors] = useState<string>('');

  // Signature States for Retirement comments
  const [signatureMode, setSignatureMode] = useState<'typed' | 'drawn' | 'imported'>('typed');
  const [typedSignature, setTypedSignature] = useState('John Doe');
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Sync signature name if loaded CA changes
  useEffect(() => {
    if (selectedCA) {
      setTypedSignature(selectedCA.staffName);
    } else {
      setTypedSignature('John Doe');
    }
  }, [selectedCA]);

  // When CA dropdown selection changes, auto fill advanced balance
  useEffect(() => {
    const found = paidAdvances.find(a => a.referenceNumber === selectedCARef);
    if (found) {
      setSelectedCA(found);
    } else {
      setSelectedCA(null);
    }
  }, [selectedCARef, paidAdvances]);

  const addExpenseLine = () => {
    const newLineId = `exp-temp-${Date.now()}`;
    setExpenses([...expenses, { id: newLineId, description: '', category: 'Catering', amount: 0 }]);
  };

  const removeExpenseLine = (id: string) => {
    if (expenses.length === 1) return; // keep at least one
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const updateExpenseLine = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenses(expenses.map(exp => {
      if (exp.id === id) {
        return { ...exp, [field]: value };
      }
      return exp;
    }));
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

  // Derived amounts
  const amountAdvanced = selectedCA ? selectedCA.amountRequested : 0;
  const amountUtilized = expenses.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);
  const balanceReturned = amountAdvanced - amountUtilized;

  const handleRetirementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCARef) {
      setErrors('Please select an outstanding paid Cash Advance number');
      return;
    }
    
    // Validate line items
    const hasInvalidLine = expenses.some(exp => !exp.description.trim() || exp.amount <= 0);
    if (hasInvalidLine) {
      setErrors('Please fill all descriptions and provide valid positive amounts for custom lines');
      return;
    }

    setErrors('');

    const finalSignature = signatureMode === 'typed' 
      ? `typed:${typedSignature || selectedCA?.staffName || 'John Doe'}` 
      : (drawnSignature ? `drawn:${drawnSignature}` : `typed:${selectedCA?.staffName || 'John Doe'}`);

    const newRetirement: Partial<CashAdvanceRetirement> = {
      cashAdvanceRef: selectedCARef,
      amountAdvanced: amountAdvanced,
      amountUtilized: amountUtilized,
      balanceReturned: balanceReturned,
      retirementDate: retirementDate,
      expenseDetails: expenses,
      receiptName: receipt ? receipt.name : 'scanned_receipt_slips.pdf', // fallback mock
      comment: expenseComment,
      currentStatus: RetirementStatus.PENDING_HEAD_OF_ADMIN, // submits to head of admin
      approvalHistory: [
        {
          userId: '1',
          userRole: selectedCA?.initiator === 'John Doe' ? (selectedCA?.department === 'Administration' ? 'Admin Officer' : 'Internal Control' as any) : 'Admin Officer' as any,
          userName: selectedCA?.staffName || 'John Doe',
          action: 'Submit Retirement',
          date: '2026-06-12 09:30',
          comment: expenseComment || 'Submitting receipts for validation',
          signatureSvg: finalSignature
        }
      ]
    };

    onAddRetirement(newRetirement);
  };

  return (
    <div id="new-retirement-form-container" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <button
          id="back-btn-ret-form"
          onClick={onCancel}
          className="p-1 px-2 hover:bg-slate-100 rounded text-slate-500 transition-colors flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel & Back
        </button>
        <div className="h-4 w-px bg-slate-200"></div>
        <div>
          <h3 className="font-bold text-slate-800 text-lg">File Cash Advance Fund Retirement</h3>
          <p className="text-xs text-slate-500">Attach receipt vouchers and calculate returned balances</p>
        </div>
      </div>

      {errors && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" /> {errors}
        </div>
      )}

      {paidAdvances.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">No Outstanding Paid Cash Advances</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-normal">
            To submit a retirement folder, you must first have an approved Cash Advance Request that is marked as <strong>Paid</strong> by Finance.
          </p>
          <button
            id="go-requests-btn-ret-form"
            onClick={onCancel}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline mt-2"
          >
            Check Cash Advance state logs
          </button>
        </div>
      ) : (
        <form id="retirement-claim-form" onSubmit={handleRetirementSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Cash Advance selector */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Outstanding Paid Cash Advance *
              </label>
              <select
                id="ret-form-select-ca"
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition-all font-bold text-slate-800"
                value={selectedCARef}
                onChange={(e) => setSelectedCARef(e.target.value)}
                required
              >
                <option value="">-- Choose Disbursed Advance Reference --</option>
                {paidAdvances.map(adv => (
                  <option key={adv.id} value={adv.referenceNumber}>
                    {adv.referenceNumber} - {adv.purpose.slice(0, 50)}... (₦{adv.amountRequested})
                  </option>
                ))}
              </select>
            </div>

            {/* Retirement Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Retirement Claim Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="ret-form-date"
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 p-2.5 text-xs font-mono font-semibold text-slate-600 outline-none"
                  value={retirementDate}
                  onChange={(e) => setRetirementDate(e.target.value)}
                  disabled
                />
              </div>
            </div>

          </div>

          {/* Active stats display once selected */}
           {selectedCA && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-3 gap-4 text-center font-sans">
              <div className="border-r border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Originally Advanced</span>
                <p className="text-xl font-extrabold text-blue-900 font-mono mt-1">₦{amountAdvanced.toLocaleString()}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">Date Paid: {selectedCA.paymentDetails?.paymentDate || selectedCA.requestDate}</span>
              </div>
              <div className="border-r border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Total Utilized (Receipts)</span>
                <p className="text-xl font-extrabold text-slate-800 font-mono mt-1">₦{amountUtilized.toLocaleString()}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">Sum of line items</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Balance Returned</span>
                <p className={`text-xl font-extrabold font-mono mt-1 ${balanceReturned >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ₦{balanceReturned.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block font-semibold font-sans">
                  {balanceReturned >= 0 ? 'Refund to treasury' : 'Deficit / Needs review'}
                </span>
              </div>
            </div>
          )}

          {/* Line items Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" /> Detailed Receipt Breakdowns
              </h4>
              <button
                id="add-expense-line-btn"
                type="button"
                onClick={addExpenseLine}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-100 hover:border-blue-300 rounded px-2.5 py-1 bg-blue-50/50"
              >
                <Plus className="w-3.5 h-3.5" /> Add Voucher Line
              </button>
            </div>

            <div className="space-y-3">
              {expenses.map((expense, idx) => (
                <div 
                  id={`expense-row-${expense.id}`}
                  key={expense.id} 
                  className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-150 relative group"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 mt-2 font-bold shrink-0 font-mono">
                    {idx + 1}
                  </span>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Item Description / Voucher Name</label>
                    <input
                      id={`exp-desc-input-${expense.id}`}
                      type="text"
                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs text-slate-800 font-medium font-sans outline-none focus:border-blue-500"
                      placeholder="e.g. Printer Toner Cartridge, Plumber labor charge, Taxi fees..."
                      value={expense.description}
                      onChange={(e) => updateExpenseLine(expense.id, 'description', e.target.value)}
                      required
                    />
                  </div>

                  {/* Category */}
                  <div className="w-32 md:w-44 shrink-0">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Cost Category</label>
                    <select
                      id={`exp-cat-select-${expense.id}`}
                      className="w-full bg-white border border-slate-200 p-2 rounded text-xs outline-none"
                      value={expense.category}
                      onChange={(e) => updateExpenseLine(expense.id, 'category', e.target.value)}
                    >
                      <option value="Stationery">Stationery</option>
                      <option value="Catering & Refreshments">Catering & Refreshments</option>
                      <option value="Travel & Transport">Travel & Transport</option>
                      <option value="Accommodation">Accommodation</option>
                      <option value="Repairs & Overhauls">Repairs & Overhauls</option>
                      <option value="IT Subscriptions">IT Subscriptions</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="w-24 md:w-32 shrink-0">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Amount (₦)</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-xs font-mono font-extrabold text-slate-500 select-none">₦</span>
                      <input
                        id={`exp-amount-input-${expense.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full bg-white border border-slate-200 pl-6 p-1.5 rounded text-xs font-mono font-bold outline-none focus:border-blue-500 text-slate-800"
                        value={expense.amount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateExpenseLine(expense.id, 'amount', isNaN(val) ? 0 : val);
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Detete button */}
                  {expenses.length > 1 && (
                    <button
                      id={`delete-line-btn-${expense.id}`}
                      type="button"
                      onClick={() => removeExpenseLine(expense.id)}
                      className="p-1 px-2.5 mt-4 hover:bg-rose-50 text-rose-500 rounded text-xs font-bold hover:text-rose-700 transition-colors shrink-0"
                      title="Delete Line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Receipt Selection Target */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Consolidated receipts PDF upload *
            </label>
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <FileText className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h5 className="font-semibold text-slate-800 text-xs">Upload scan slips containing auditing barcodes</h5>
                  <p className="text-[10px] text-slate-400 leading-normal">Requires all physical vouchers to match utilizing records.</p>
                </div>
              </div>

              <div>
                <input
                  id="receipt-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) setReceipt(files[0]);
                  }}
                  accept=".pdf,image/*"
                />
                <label 
                  htmlFor="receipt-file-input"
                  className="cursor-pointer bg-white border border-slate-200 font-bold hover:border-blue-500 text-slate-700 px-3.5 py-1.5 rounded shadow-sm text-xs inline-block text-center hover:bg-slate-50 transition-colors"
                >
                  {receipt ? receipt.name : 'Select PDF Receipt'}
                </label>
              </div>
            </div>
          </div>

          {/* Retirement Comment and E-Signature block */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                General Retirement Comment logs
              </label>
              <textarea
                id="ret-form-comment"
                rows={2}
                placeholder="Provide information regarding cash leftover returns, cashier slips, or budget audits..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 transition-all text-slate-700"
                value={expenseComment}
                onChange={(e) => setExpenseComment(e.target.value)}
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/65 pb-2 mb-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  ✍️ Retirement Verification E-Signature
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
                    Import Device
                  </button>
                </div>
              </div>

              {signatureMode === 'typed' ? (
                <div className="space-y-1.5">
                  <p className="text-[9px] text-slate-400 leading-normal">
                    This dynamic cursive text represents your verified digital signature:
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
                      {typedSignature}
                    </span>
                  </div>
                </div>
              ) : signatureMode === 'drawn' ? (
                <div className="space-y-1.5">
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Use your trackpad, cursor or fingers to sketch your approval credentials:
                  </p>
                  <div className="relative border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={360}
                      height={100}
                      className="w-full h-[100px] bg-white cursor-crosshair block"
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
                      <span>✓ Custom signature sketch saved</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-1 justify-end">
                      <span>⏳ Complete gesture on canvas pad</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Import any handwriting image file from your device files context:
                  </p>
                  <div className="border border-dashed border-slate-300 hover:border-blue-400 rounded-lg bg-white p-4 transition-colors relative cursor-pointer group text-center">
                    <input
                      id="import-ret-sig-details-file"
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
                        <span className="text-[9px] text-blue-600 font-bold font-sans">Replace device file</span>
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
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              id="ret-form-cancel-btn"
              type="button"
              onClick={onCancel}
              className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              Cancel & Back
            </button>
            
            <button
              id="ret-form-submit-btn"
              type="submit"
              className="px-5 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-xs flex items-center gap-1 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" /> Finalize & Submit Retirement Claim
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
