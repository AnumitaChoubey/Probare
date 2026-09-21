import React from 'react';
import { QualityStatus, Severity, SLAStatus } from '../../types';

export const StatusBadge: React.FC<{ status: QualityStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const getStyle = (st: QualityStatus) => {
    switch (st) {
      case 'Draft':
        return 'bg-qems-bg-secondary text-qems-text-secondary border-qems-border ';
      case 'Logged':
        return 'bg-blue-50 text-blue-700 border-blue-200 ';
      case 'Under Review':
        return 'bg-qems-brand-light text-qems-brand-dark border-qems-brand ';
      case 'Rebuttal Pending':
        return 'bg-qems-warning-bg text-amber-800 border-amber-300 font-medium';
      case 'QA Review':
        return 'bg-violet-50 text-violet-700 border-violet-200 ';
      case 'Escalated':
        return 'bg-qems-danger-bg text-qems-danger-dark border-rose-300 font-semibold';
      case 'Manager Review':
        return 'bg-purple-50 text-purple-700 border-purple-200 ';
      case 'Overturned':
        return 'bg-qems-success-bg text-qems-success-dark border-emerald-300 ';
      case 'Upheld':
        return 'bg-orange-50 text-orange-800 border-orange-200 ';
      case 'Corrective Action':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300 ';
      case 'Effectiveness Review':
        return 'bg-teal-50 text-teal-800 border-teal-300 ';
      case 'Closed':
        return 'bg-qems-success-bg text-emerald-800 border-emerald-300 ';
      default:
        return 'bg-qems-bg-secondary text-qems-text-secondary border-qems-border ';
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
        return 'bg-red-50 text-red-700 border-red-200 font-semibold';
      case 'HIGH':
        return 'bg-qems-warning-bg text-amber-800 border-amber-200 font-medium';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200 ';
      case 'LOW':
        return 'bg-qems-bg-secondary text-qems-text-muted border-qems-border ';
      default:
        return 'bg-qems-bg-secondary text-qems-text-secondary border-qems-border ';
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
        return 'bg-qems-success-bg text-qems-success-dark border-emerald-200 ';
      case 'Warning':
        return 'bg-qems-warning-bg text-amber-800 border-amber-300 ';
      case 'At Risk':
        return 'bg-orange-50 text-orange-800 border-orange-300 font-medium';
      case 'Breached':
        return 'bg-qems-danger-bg text-qems-danger-dark border-rose-300 font-bold';
      case 'Escalated':
        return 'bg-purple-50 text-purple-700 border-purple-300 font-semibold';
      default:
        return 'bg-qems-bg-secondary text-qems-text-secondary border-qems-border ';
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
