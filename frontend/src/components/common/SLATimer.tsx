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
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        ) : isAtRisk ? (
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        )}
        <span
          className={`font-medium ${
            isBreached
              ? 'text-rose-700 dark:text-rose-400 font-bold'
              : isAtRisk
              ? 'text-orange-700 dark:text-orange-400 font-semibold'
              : isWarning
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-300'
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-1.5">
          {isBreached ? (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          ) : isAtRisk ? (
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          ) : (
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            SLA Resolution Window
          </span>
        </div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
            isBreached
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
              : isAtRisk
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200'
              : isWarning
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
          {formatHoursToCountdown(hoursRemaining)}
        </span>
        {deadline && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Due: <strong className="text-slate-700 dark:text-slate-300 font-mono">{deadline}</strong>
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
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

      <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
        <span>Logged: 0h</span>
        <span>Warning: 24h</span>
        <span>Target SLA: 48h</span>
      </div>
    </div>
  );
};
