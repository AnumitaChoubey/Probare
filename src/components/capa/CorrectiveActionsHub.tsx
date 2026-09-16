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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
              Remediation Management
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ISO 9001 / CAPA Register
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            Corrective & Preventative Actions (CAPA) Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Systemic action items designed to prevent repeat quality occurrences across all operational queues.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Open</span>
            <strong className="text-amber-600 dark:text-amber-400 text-sm">{openCount}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] block">In Progress</span>
            <strong className="text-blue-600 dark:text-blue-400 text-sm">{inProgressCount}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Completed</span>
            <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{completedCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Statuses ({allCapas.length})</option>
            <option value="Open">Open ({openCount})</option>
            <option value="In Progress">In Progress ({inProgressCount})</option>
            <option value="Completed">Completed ({completedCount})</option>
          </select>
        </div>

        <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
          Showing {filteredCapas.length} CAPAs
        </span>
      </div>

      {/* CAPA List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCapas.map((ca) => (
                <tr key={ca.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{ca.id}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{ca.title}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      Process: {ca.processArea}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                    {ca.type}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">{ca.owner}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
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
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : ca.status === 'In Progress'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate">
                    {ca.verificationMethod}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEvent(ca.errorId)}
                      className="inline-flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium font-mono text-[11px]"
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
