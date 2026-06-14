import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Trash2, ShieldAlert, Sparkles } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditTrailProps {
  logs: AuditLogEntry[];
  onClearLogs?: () => void;
}

export default function AuditTrail({
  logs,
  onClearLogs
}: AuditTrailProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Cash Advance' | 'Retirement' | 'System'>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.requestReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.comment && log.comment.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || log.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div id="audit-trail-container" className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            System Compliance Audit Registry
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Immutable records tracing all approvals, comments, and transaction disbursements</p>
        </div>

        {onClearLogs && (
          <button
            id="clear-logs-btn"
            onClick={onClearLogs}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 py-1.5 px-3 rounded border border-rose-100 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" /> Reset Trail Logs
          </button>
        )}
      </div>

      {/* Constraints bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="audit-search-input"
            type="text"
            placeholder="Search by reference, staff, comment logs, or action..."
            className="w-full bg-white border border-slate-200 pl-9 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-700 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <select
            id="audit-type-filter"
            className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500 font-medium text-slate-700"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">-- All Ledger Categories --</option>
            <option value="Cash Advance">Cash Advance approvals</option>
            <option value="Retirement">Retirement claims</option>
            <option value="System">System maintenance</option>
          </select>
        </div>

      </div>

      {/* Table view */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Compliance Audit Trail (Immutable)
          </span>
          <span className="bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-600">Rows: {filteredLogs.length}</span>
        </div>

        <div className="overflow-x-auto min-w-full">
          {filteredLogs.length === 0 ? (
            <p className="p-12 text-center text-slate-400 text-sm">No audit logs matched search criteria.</p>
          ) : (
            <table className="min-w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 font-bold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3">Reference ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">User (Role)</th>
                  <th className="p-3">Action Completed</th>
                  <th className="p-3">Comment Remarks</th>
                  <th className="p-3 font-mono">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700">{log.requestReference}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.type === 'Cash Advance' ? 'bg-blue-50 text-blue-800' :
                        log.type === 'Retirement' ? 'bg-amber-50 text-amber-800' :
                        'bg-slate-150 text-slate-800'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3">
                      <strong className="text-slate-800 block font-semibold">{log.user}</strong>
                      <span className="text-[10px] text-slate-500 block">{log.role}</span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{log.action}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate" title={log.comment}>{log.comment || '-'}</td>
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{log.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
