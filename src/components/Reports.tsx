import React, { useState } from 'react';
import { 
  Search, Filter, Calendar, FileSpreadsheet, Download, RefreshCw, 
  ArrowUpRight, Printer, Check, Info, FileDown, Briefcase, User 
} from 'lucide-react';
import { CashAdvanceRequest, CashAdvanceRetirement, RequestStatus, RetirementStatus, DEPARTMENTS } from '../types';

interface ReportsProps {
  advances: CashAdvanceRequest[];
  retirements: CashAdvanceRetirement[];
  onSelectRequest: (id: string) => void;
  onSetTab: (tab: string) => void;
}

export default function Reports({
  advances,
  retirements,
  onSelectRequest,
  onSetTab
}: ReportsProps) {
  // Filter variables
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [portfolioAdvanceFilter, setPortfolioAdvanceFilter] = useState<'all' | 'outstanding' | 'retired' | 'pending_payment'>('all');

  const [simulatedExport, setSimulatedExport] = useState<string | null>(null);

  // Apply filters
  const filteredRequests = advances.filter(request => {
    // 1. Date filter
    if (startDate) {
      if (new Date(request.requestDate) < new Date(startDate)) return false;
    }
    if (endDate) {
      if (new Date(request.requestDate) > new Date(endDate)) return false;
    }

    // 2. Department
    if (selectedDept && request.department !== selectedDept) return false;

    // 3. Staff search
    if (staffSearch && !request.staffName.toLowerCase().includes(staffSearch.toLowerCase())) return false;

    // 4. Status
    if (selectedStatus && request.currentStatus !== selectedStatus) return false;

    // 5. Portfolio advances status logic
    const retirement = retirements.find(r => r.cashAdvanceRef === request.referenceNumber);
    const hasApprovedRet = retirement && retirement.currentStatus === RetirementStatus.APPROVED;

    if (portfolioAdvanceFilter === 'outstanding') {
      if (request.currentStatus !== RequestStatus.PAID || hasApprovedRet) return false;
    }
    if (portfolioAdvanceFilter === 'retired') {
      if (request.currentStatus !== RequestStatus.PAID || !hasApprovedRet) return false;
    }
    if (portfolioAdvanceFilter === 'pending_payment') {
      if (request.currentStatus !== RequestStatus.AWAITING_FINANCE_PAYMENT) return false;
    }

    return true;
  });

  // Calculate Aggregations for the filtered subset
  const totalAllocatedSum = filteredRequests.reduce((sum, r) => sum + r.amountRequested, 0);
  
  const totalPaidSum = filteredRequests
    .filter(r => r.currentStatus === RequestStatus.PAID)
    .reduce((sum, r) => sum + (r.paymentDetails?.amountPaid || r.amountRequested), 0);

  const totalReturnedSum = filteredRequests
    .filter(r => r.currentStatus === RequestStatus.PAID)
    .reduce((sum, r) => {
      const rit = retirements.find(ret => ret.cashAdvanceRef === r.referenceNumber);
      if (rit && rit.currentStatus === RetirementStatus.APPROVED) {
        return sum + rit.balanceReturned;
      }
      return sum;
    }, 0);

  const totalOutstandingSum = filteredRequests
    .filter(r => {
      if (r.currentStatus !== RequestStatus.PAID) return false;
      const rit = retirements.find(ret => ret.cashAdvanceRef === r.referenceNumber);
      return !rit || rit.currentStatus !== RetirementStatus.APPROVED;
    })
    .reduce((sum, r) => sum + r.amountRequested, 0);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDept('');
    setStaffSearch('');
    setSelectedStatus('');
    setPortfolioAdvanceFilter('all');
  };

  const runSimulatedExport = (format: 'CSV' | 'PDF' | 'Excel') => {
    setSimulatedExport(`Compiling report registry. Generated metadata document: CA_Audit_Report_${FormatDate(new Date())}.${format.toLowerCase()}`);
    setTimeout(() => {
      setSimulatedExport(null);
      alert(`Success! Simulated download of: CA_Finance_Report_2026.${format.toLowerCase()} file. Included ${filteredRequests.length} rows.`);
    }, 1500);
  };

  function FormatDate(d: Date) {
    return d.toISOString().split('T')[0];
  }

  return (
    <div id="reports-module-root" className="space-y-6 animate-fade-in print:bg-white print:p-0">
      
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Financial Reports & Accounts General Ledger</h3>
          <p className="text-xs text-slate-500 mt-0.5">Audit compliance registries and filter outstanding cash files</p>
        </div>

        {/* Quick export buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            id="export-csv-btn"
            onClick={() => runSimulatedExport('CSV')}
            className="text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 py-2 px-3 rounded flex items-center gap-1 shadow-xs font-mono transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          
          <button
            id="export-pdf-btn"
            onClick={() => runSimulatedExport('PDF')}
            className="text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-200 py-2 px-3 rounded flex items-center gap-1 shadow-xs font-mono transition-colors"
          >
            <FileDown className="w-4 h-4 text-red-500" /> Export PDF
          </button>
        </div>
      </div>

      {simulatedExport && (
        <div className="p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs animate-pulse font-semibold flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> {simulatedExport}
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-slate-800 font-bold text-xs uppercase tracking-widest">
          <Filter className="w-4.5 h-4.5 text-blue-600" /> Advanced Query Constraints
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Start date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date Range</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="filter-start-date"
                type="date"
                className="w-full bg-white border border-slate-200 pl-8.5 p-2 rounded text-xs outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* End date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date Range</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="filter-end-date"
                type="date"
                className="w-full bg-white border border-slate-200 pl-8.5 p-2 rounded text-xs outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
            <select
              id="filter-dept"
              className="w-full bg-white border border-slate-200 p-2 rounded text-xs outline-none text-slate-700 font-medium focus:border-blue-500"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">-- All Departments --</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Staff Search */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Staff / Initiator</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="filter-staff"
                type="text"
                placeholder="Search staff name..."
                className="w-full bg-white border border-slate-200 pl-8.5 p-2 rounded text-xs outline-none focus:border-blue-500 text-slate-700"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Approval state filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Approval Workflow Status</label>
            <select
              id="filter-status"
              className="w-full bg-white border border-slate-200 p-2 rounded text-xs text-slate-700 outline-none focus:border-blue-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">-- All Statuses --</option>
              {Object.values(RequestStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Portfolio metrics group */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Portfolio Specifics</label>
            <select
              id="filter-portfolio"
              className="w-full bg-white border border-slate-200 p-2 rounded text-xs text-slate-700 outline-none focus:border-blue-500"
              value={portfolioAdvanceFilter}
              onChange={(e) => setPortfolioAdvanceFilter(e.target.value as any)}
            >
              <option value="all">Show All Portfolios</option>
              <option value="outstanding">Outstanding Advances (Unretired)</option>
              <option value="retired">Fully Retired Advances</option>
              <option value="pending_payment">Awaiting Disbursal (Pending Pay)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-3 justify-end h-full">
            <button
              id="reset-filter-btn"
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded border border-slate-200 transition-colors"
            >
              Reset Constraints
            </button>
            <div className="bg-blue-600 text-white font-bold text-xs py-2 px-4 rounded shadow-sm">
              Matched Rows: {filteredRequests.length}
            </div>
          </div>

        </div>

      </div>

      {/* Grid displays aggregations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div id="agg-requested" className="bg-blue-50/40 p-4 rounded-xl border border-blue-100/80 text-center font-sans">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Total Requested (Filter Scope)</span>
          <p className="text-xl font-black text-blue-900 mt-1 font-mono">₦{totalAllocatedSum.toLocaleString()}</p>
        </div>

        <div id="agg-disbursed" className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/80 text-center font-sans">
          <span className="text-[10px] text-emerald-800 font-extrabold uppercase block tracking-wider">Total Disbursed Cash</span>
          <p className="text-xl font-black text-emerald-800 mt-1 font-mono">₦{totalPaidSum.toLocaleString()}</p>
        </div>

        <div id="agg-returned" className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-150 text-center font-sans">
          <span className="text-[10px] text-indigo-800/80 font-extrabold uppercase block tracking-wider">Leftover Cash Returned</span>
          <p className="text-xl font-black text-indigo-800 mt-1 font-mono">₦{totalReturnedSum.toLocaleString()}</p>
        </div>

        <div id="agg-outstanding" className="bg-rose-50/40 p-4 rounded-xl border border-rose-150 text-center font-sans">
          <span className="text-[10px] text-rose-800 font-extrabold uppercase block tracking-wider">Outstanding In Circulation</span>
          <p className="text-xl font-black text-rose-700 mt-1 font-mono">₦{totalOutstandingSum.toLocaleString()}</p>
        </div>

      </div>

      {/* Filtered records grid table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">General Audit Ledger Report Output</span>
          <p className="text-[11px] text-slate-400 font-mono">Date Compiled: 2026-06-12 UT</p>
        </div>

        <div className="overflow-x-auto min-w-full">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No cash advances or memos matched your filtered constraints.
            </div>
          ) : (
            <table className="min-w-full text-left text-xs divide-y divide-slate-100 font-sans">
              <thead className="bg-slate-50 font-bold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3">CA Ref</th>
                  <th className="p-3">Request Date</th>
                  <th className="p-3">Staff / Dept</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3 text-right">Requested</th>
                  <th className="p-3 text-right">Disbursed</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center print:hidden">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRequests.map(item => {
                  const retirement = retirements.find(r => r.cashAdvanceRef === item.referenceNumber);
                  const isRetired = retirement && retirement.currentStatus === RetirementStatus.APPROVED;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-700">{item.referenceNumber}</td>
                      <td className="p-3 font-mono text-slate-400">{item.requestDate}</td>
                      <td className="p-3">
                        <strong className="text-slate-800 block font-semibold">{item.staffName}</strong>
                        <span className="text-[10px] text-slate-500 block">{item.department}</span>
                      </td>
                      <td className="p-3 max-w-sm truncate" title={item.purpose}>{item.purpose}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">₦{item.amountRequested}</td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {item.paymentDetails ? `₦${item.paymentDetails.amountPaid}` : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.currentStatus === RequestStatus.PAID 
                            ? (isRetired ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800')
                            : item.currentStatus === RequestStatus.REJECTED 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.currentStatus} {isRetired && '(Retired Archive)'}
                        </span>
                      </td>
                      <td className="p-3 text-center print:hidden">
                        <button
                          id={`rep-row-view-${item.id}`}
                          onClick={() => {
                            onSelectRequest(item.id);
                            onSetTab('requests');
                          }}
                          className="text-blue-600 hover:text-blue-900 hover:underline font-bold text-[11px] flex items-center justify-center gap-0.5 mx-auto"
                        >
                          Trace <ArrowUpRight className="w-3 h-3" />
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
  );
}
