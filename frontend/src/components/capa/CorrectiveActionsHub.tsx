import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { CorrectiveAction } from '../../types';

export const CorrectiveActionsHub: React.FC = () => {
  const { events, setSelectedEventId, setActiveSection, updateCorrectiveActionStatus } = useQEMS();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Gather all CAPAs from all events
  const allCapas: (CorrectiveAction & { eventTitle: string; processArea: string })[] = [];
  (events || []).forEach((ev) => {
    (ev.correctiveActions || []).forEach((ca) => {
      allCapas.push({
        ...ca,
        eventTitle: ev.title,
        processArea: ev.processArea,
      });
    });
  });

  const filteredCapas = allCapas.filter((ca) => {
    if (filterStatus === 'ALL') return true;
    return ca.status === filterStatus;
  });

  const openEvent = (errorId: string) => {
    setSelectedEventId(errorId);
    setActiveSection('QUALITY EVENTS');
  };

  const openCount = allCapas.filter((c) => c.status === 'Open').length;
  const inProgressCount = allCapas.filter((c) => c.status === 'In Progress').length;
  const completedCount = allCapas.filter((c) => c.status === 'Completed').length;

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 ">
              Remediation Management
            </span>
            <span className="text-xs text-qems-text-disabled ">•</span>
            <span className="text-xs font-medium text-qems-text-muted ">
              ISO 9001 / CAPA Register
            </span>
          </div>
          <h1 className="text-base font-bold text-qems-text-primary mt-1 tracking-tight">
            Corrective & Preventative Actions (CAPA) Registry
          </h1>
          <p className="text-xs text-qems-text-muted mt-0.5">
            Systemic action items designed to prevent repeat quality occurrences across all operational queues.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="bg-qems-bg-surface border border-qems-border px-3 py-1.5 rounded">
            <span className="text-qems-text-disabled text-[10px] block">Open</span>
            <strong className="text-qems-warning text-sm">{openCount}</strong>
          </div>
          <div className="bg-qems-bg-surface border border-qems-border px-3 py-1.5 rounded">
            <span className="text-qems-text-disabled text-[10px] block">In Progress</span>
            <strong className="text-blue-600 text-sm">{inProgressCount}</strong>
          </div>
          <div className="bg-qems-bg-surface border border-qems-border px-3 py-1.5 rounded">
            <span className="text-qems-text-disabled text-[10px] block">Completed</span>
            <strong className="text-qems-success text-sm">{completedCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-qems-text-disabled" />
          <span className="font-semibold text-qems-text-secondary ">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 bg-qems-bg-surface border border-qems-border rounded text-qems-text-primary "
          >
            <option value="ALL">All Statuses ({allCapas.length})</option>
            <option value="Open">Open ({openCount})</option>
            <option value="In Progress">In Progress ({inProgressCount})</option>
            <option value="Completed">Completed ({completedCount})</option>
          </select>
        </div>

        <span className="text-qems-text-disabled font-mono text-[11px]">
          Showing {filteredCapas.length} CAPAs
        </span>
      </div>

      {/* CAPA List Table */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-qems-bg-surface text-qems-text-muted border-b border-qems-border text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">CAPA ID</th>
                <th className="py-2.5 px-3">Remediation Action Title</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Owner</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Verification Method</th>
                <th className="py-2.5 px-3 text-right">Linked Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {filteredCapas.map((ca) => (
                <tr key={ca.id} className="hover:bg-qems-bg-surface/80 :bg-slate-800/50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-qems-brand-dark ">{ca.id}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-qems-text-primary ">{ca.title}</div>
                    <div className="text-[10px] text-qems-text-disabled ">
                      Process: {ca.processArea}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-qems-text-muted font-medium whitespace-nowrap">
                    {ca.type}
                  </td>
                  <td className="py-2.5 px-3 text-qems-text-primary whitespace-nowrap">{ca.owner}</td>
                  <td className="py-2.5 px-3 font-mono text-qems-text-muted whitespace-nowrap">
                    {ca.dueDate}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <select
                      value={ca.status}
                      onChange={(e) =>
                        updateCorrectiveActionStatus(
                          ca.errorId,
                          ca.id,
                          e.target.value as any
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        ca.status === 'Completed'
                          ? 'bg-qems-success-bg text-emerald-800 border-emerald-300 '
                          : ca.status === 'In Progress'
                          ? 'bg-blue-50 text-blue-800 border-blue-300 '
                          : 'bg-qems-bg-surface text-qems-text-secondary border-qems-border '
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-qems-text-muted text-[11px] max-w-xs truncate">
                    {ca.verificationMethod}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEvent(ca.errorId)}
                      className="inline-flex items-center space-x-1 text-qems-brand-dark hover:text-indigo-800 :text-indigo-300 font-medium font-mono text-[11px]"
                    >
                      <span>{ca.errorId}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
