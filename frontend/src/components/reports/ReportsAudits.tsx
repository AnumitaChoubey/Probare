import React, { useState } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Calendar,
  History,
  Activity
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsApi, auditApi } from '../../services/api';

export const ReportsAudits: React.FC = () => {
  const { addToast } = useQEMS();
  const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports');

  // Fetch Report Templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['reportTemplates'],
    queryFn: reportsApi.getTemplates
  });

  // Fetch Audit Trail
  const { data: auditTrail = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['auditTrail'],
    queryFn: () => auditApi.getTrail({ limit: 50 })
  });

  const triggerRunMutation = useMutation({
    mutationFn: (templateId: string) => reportsApi.triggerRun(templateId, 'csv'),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Report Generation Started', description: 'Your report is being processed in the background.' });
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: 'Report Failed', description: err?.response?.data?.detail || 'Failed to trigger report' });
    }
  });

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-secondary bg-qems-bg-secondary px-2 py-0.5 rounded border border-qems-border ">
              Phase I Operations
            </span>
            <span className="text-xs text-qems-text-disabled ">•</span>
            <span className="text-xs font-medium text-qems-text-muted ">
              Reporting & Audit Engines
            </span>
          </div>
          <h1 className="text-base font-bold text-qems-text-primary mt-1 tracking-tight">
            Governance & Compliance Center
          </h1>
          <p className="text-xs text-qems-text-muted mt-0.5">
            Cryptographically sealed audit packages, regulatory exports, and immutable event history.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg overflow-hidden shrink-0">
        <div className="flex border-b border-qems-border bg-qems-bg-surface/70 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2.5 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white'
                : 'border-transparent text-qems-text-muted hover:text-qems-text-primary'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Standard Reports</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white'
                : 'border-transparent text-qems-text-muted hover:text-qems-text-primary'
            }`}
          >
            <History className="w-4 h-4" />
            <span>System Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {isLoadingTemplates && <p className="text-xs text-slate-500">Loading templates...</p>}
            {templates.length === 0 && !isLoadingTemplates && (
              <div className="col-span-full p-8 text-center text-slate-500 bg-white border border-dashed rounded-lg">
                No report templates configured for this workspace yet. (Use API to seed templates)
              </div>
            )}
            {templates.map((tpl: any) => (
              <div
                key={tpl.id}
                className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5 hover:border-slate-300 transition space-y-3 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-qems-brand-dark bg-qems-brand-light px-2 py-0.5 rounded border border-qems-brand ">
                      {tpl.report_type}
                    </span>
                    <span className="text-[10px] text-qems-text-disabled font-mono">
                      {tpl.cron_schedule ? 'Scheduled' : 'On-Demand'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-qems-text-primary leading-snug">{tpl.name}</h3>
                  <p className="text-[11px] text-qems-text-muted mt-1.5 leading-relaxed">
                    {tpl.description || 'Custom generated compliance report.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-qems-border-light flex items-center justify-between">
                  <span className="text-[10px] font-mono text-qems-text-muted font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                    {tpl.columns?.length || 0} columns
                  </span>
                  <button
                    onClick={() => triggerRunMutation.mutate(tpl.id)}
                    disabled={triggerRunMutation.isPending}
                    className="px-2.5 py-1.5 bg-qems-brand hover:bg-qems-brand-dark text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{triggerRunMutation.isPending ? 'Queuing...' : 'Generate CSV'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white border border-qems-border rounded-lg overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-sm">Immutable Event Ledger</h3>
              <span className="text-xs text-slate-500 font-mono">Latest 50 events shown</span>
            </div>
            
            {isLoadingAudit ? (
              <div className="p-8 text-center text-slate-500">Loading secure audit trail...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Timestamp (UTC)</th>
                      <th className="px-4 py-2 font-semibold">Actor ID</th>
                      <th className="px-4 py-2 font-semibold">Action</th>
                      <th className="px-4 py-2 font-semibold">Entity Type</th>
                      <th className="px-4 py-2 font-semibold">Entity ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditTrail.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          No audit events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditTrail.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 py-2.5 font-mono text-[10px] whitespace-nowrap text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-indigo-700 font-mono">{log.actor_id.substring(0,8)}...</td>
                          <td className="px-4 py-2.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium">{log.entity_type}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{log.entity_id}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

