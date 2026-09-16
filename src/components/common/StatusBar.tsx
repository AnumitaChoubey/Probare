import React from 'react';
import { Wifi, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';

export const StatusBar: React.FC = () => {
  const { events, currentRole, setActiveSection } = useQEMS();

  const slaBreachedCount = events.filter((e) => e.slaStatus === 'Breached').length;
  const slaAtRiskCount = events.filter((e) => e.slaStatus === 'At Risk').length;
  const openDisputes = events.filter((e) => e.status === 'Rebuttal Pending').length;

  return (
    <footer className="h-7 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none z-20 font-mono">
      {/* Left System Health */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium">System Online</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1 text-slate-400 dark:text-slate-500">
          <RefreshCw className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span>Sync State: Operational (0ms)</span>
        </div>

        <div className="hidden md:flex items-center space-x-1 text-slate-400 dark:text-slate-500">
          <span>Active Role:</span>
          <strong className="text-slate-700 dark:text-slate-300 font-sans">{currentRole}</strong>
        </div>
      </div>

      {/* Right Operational Telemetry & SLA Alerts */}
      <div className="flex items-center space-x-3">
        {openDisputes > 0 && (
          <button
            onClick={() => setActiveSection('DISPUTE CENTER')}
            className="flex items-center space-x-1 text-amber-700 dark:text-amber-400 hover:underline transition"
          >
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold">{openDisputes} Rebuttals Pending</span>
          </button>
        )}

        {slaAtRiskCount > 0 && (
          <button
            onClick={() => setActiveSection('QUALITY EVENTS')}
            className="flex items-center space-x-1 text-orange-700 dark:text-orange-400 hover:underline transition"
          >
            <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
            <span className="font-semibold">{slaAtRiskCount} SLA At Risk (&lt;8h)</span>
          </button>
        )}

        {slaBreachedCount > 0 && (
          <button
            onClick={() => setActiveSection('QUALITY EVENTS')}
            className="flex items-center space-x-1.5 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span className="font-bold">{slaBreachedCount} SLA Breached</span>
          </button>
        )}

        <div className="h-3 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        <div className="hidden lg:block text-slate-400 dark:text-slate-500">
          Total Events: <strong className="text-slate-700 dark:text-slate-300">{events.length}</strong>
        </div>
      </div>
    </footer>
  );
};

