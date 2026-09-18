import React from 'react';
import { QualityStatus, Severity, SLAStatus } from '../../types';

export const StatusBadge: React.FC<{ status: QualityStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const getStyle = (st: QualityStatus) => {
    switch (st) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case 'Logged':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
      case 'Under Review':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
      case 'Rebuttal Pending':
        return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700 font-medium';
      case 'QA Review':
        return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800';
      case 'Escalated':
        return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700 font-semibold';
      case 'Manager Review':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
      case 'Overturned':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700';
      case 'Upheld':
        return 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800';
      case 'Corrective Action':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800';
      case 'Effectiveness Review':
        return 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
      case 'Closed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border tracking-tight whitespace-nowrap ${getStyle(
        status
      )} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${
          status === 'Escalated'
            ? 'bg-rose-500'
            : status === 'Rebuttal Pending'
            ? 'bg-amber-500'
            : status === 'Closed' || status === 'Overturned'
            ? 'bg-emerald-500'
            : 'bg-indigo-500'
        }`}
      />
      {status}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: Severity; className?: string }> = ({
  severity,
  className = '',
}) => {
  const getStyle = (sev: Severity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 font-semibold';
      case 'HIGH':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700 font-medium';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
      case 'LOW':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border whitespace-nowrap ${getStyle(
        severity
      )} ${className}`}
    >
      {severity}
    </span>
  );
};

export const SLABadge: React.FC<{ status: SLAStatus; hoursRemaining?: number; className?: string }> = ({
  status,
  hoursRemaining,
  className = '',
}) => {
  const getStyle = (sla: SLAStatus) => {
    switch (sla) {
      case 'On Track':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      case 'Warning':
        return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700';
      case 'At Risk':
        return 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-700 font-medium';
      case 'Breached':
        return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700 font-bold';
      case 'Escalated':
        return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 font-semibold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border tracking-tight whitespace-nowrap ${getStyle(
        status
      )} ${className}`}
    >
      {status}
      {hoursRemaining !== undefined && (
        <span className="ml-1 text-[10px] opacity-80 font-mono">
          ({hoursRemaining > 0 ? `${hoursRemaining.toFixed(1)}h` : 'Breached'})
        </span>
      )}
    </span>
  );
};
