import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SLAStatus } from '../../types';

interface SLATimerProps {
  hoursRemaining: number;
  status: SLAStatus;
  deadline?: string;
  compact?: boolean;
}

export const SLATimer: React.FC<SLATimerProps> = ({
  hoursRemaining,
  status,
  deadline,
  compact = false,
}) => {
  const isBreached = hoursRemaining <= 0;
  const isAtRisk = hoursRemaining > 0 && hoursRemaining <= 8;
  const isWarning = hoursRemaining > 8 && hoursRemaining <= 20;

  const formatHoursToCountdown = (hrs: number) => {
    if (hrs <= 0) return '0h 00m (Breached)';
    const wholeHours = Math.floor(hrs);
    const minutes = Math.floor((hrs - wholeHours) * 60);
    return `${wholeHours}h ${minutes < 10 ? '0' : ''}${minutes}m remaining`;
  };

  if (compact) {
    return (
      <div className="inline-flex items-center space-x-1 font-mono text-xs">
        {isBreached ? (
          <AlertCircle className="w-3.5 h-3.5 text-qems-danger " />
        ) : isAtRisk ? (
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 " />
        ) : (
          <Clock className="w-3.5 h-3.5 text-qems-text-muted " />
        )}
        <span
          className={`font-medium ${
            isBreached
              ? 'text-qems-danger-dark font-bold'
              : isAtRisk
              ? 'text-orange-700 font-semibold'
              : isWarning
              ? 'text-qems-warning-dark '
              : 'text-qems-text-muted '
          }`}
        >
          {formatHoursToCountdown(hoursRemaining)}
        </span>
      </div>
    );
  }

  // Calculate percentage of 48h SLA window
  const totalWindow = 48;
  const elapsed = Math.max(0, Math.min(totalWindow, totalWindow - hoursRemaining));
  const percentElapsed = Math.min(100, Math.round((elapsed / totalWindow) * 100));

  return (
    <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-1.5">
          {isBreached ? (
            <AlertCircle className="w-4 h-4 text-qems-danger " />
          ) : isAtRisk ? (
            <AlertTriangle className="w-4 h-4 text-orange-600 " />
          ) : (
            <Clock className="w-4 h-4 text-qems-brand-dark " />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-qems-text-secondary ">
            SLA Resolution Window
          </span>
        </div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
            isBreached
              ? 'bg-rose-100 text-rose-800 '
              : isAtRisk
              ? 'bg-orange-100 text-orange-800 '
              : isWarning
              ? 'bg-amber-100 text-amber-800 '
              : 'bg-emerald-100 text-emerald-800 '
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-lg font-bold font-mono text-qems-text-primary tabular-nums">
          {formatHoursToCountdown(hoursRemaining)}
        </span>
        {deadline && (
          <span className="text-[11px] text-qems-text-muted ">
            Due: <strong className="text-qems-text-secondary font-mono">{deadline}</strong>
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-qems-bg-secondary h-1.5 rounded-full overflow-hidden border border-qems-border ">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isBreached
              ? 'bg-rose-500'
              : isAtRisk
              ? 'bg-orange-500'
              : isWarning
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${percentElapsed}%` }}
        />
      </div>

      <div className="flex justify-between items-center mt-1.5 text-[10px] text-qems-text-disabled font-mono">
        <span>Logged: 0h</span>
        <span>Warning: 24h</span>
        <span>Target SLA: 48h</span>
      </div>
    </div>
  );
};
