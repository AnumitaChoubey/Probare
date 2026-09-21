import React from 'react';
import { Wifi, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';

export const StatusBar: React.FC = () => {
  const { events, currentRole, setActiveSection } = useQEMS();

  const slaBreachedCount = events.filter((e) => e.slaStatus === 'Breached').length;
  const slaAtRiskCount = events.filter((e) => e.slaStatus === 'At Risk').length;
  const openDisputes = events.filter((e) => e.status === 'Rebuttal Pending').length;

  return (
    <footer className="h-7 bg-qems-bg-white border-t border-qems-border px-3 flex items-center justify-between text-[11px] text-qems-text-muted select-none z-20 font-mono">
      {/* Left System Health */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-qems-success-dark font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium">System Online</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1 text-qems-text-disabled ">
          <RefreshCw className="w-3 h-3 text-qems-text-disabled " />
          <span>Sync State: Operational (0ms)</span>
        </div>

        <div className="hidden md:flex items-center space-x-1 text-qems-text-disabled ">
          <span>Active Role:</span>
          <strong className="text-qems-text-secondary font-sans">{currentRole}</strong>
        </div>
      </div>

      {/* Right Operational Telemetry & SLA Alerts */}
      <div className="flex items-center space-x-3">
        {openDisputes > 0 && (
          <button
            onClick={() => setActiveSection('DISPUTE CENTER')}
            className="flex items-center space-x-1 text-qems-warning-dark hover:underline transition"
          >
            <Clock className="w-3 h-3 text-qems-warning " />
            <span className="font-semibold">{openDisputes} Rebuttals Pending</span>
          </button>
        )}

        {slaAtRiskCount > 0 && (
          <button
            onClick={() => setActiveSection('QUALITY EVENTS')}
            className="flex items-center space-x-1 text-orange-700 hover:underline transition"
          >
            <AlertTriangle className="w-3 h-3 text-orange-600 " />
            <span className="font-semibold">{slaAtRiskCount} SLA At Risk (&lt;8h)</span>
          </button>
        )}

        {slaBreachedCount > 0 && (
          <button
            onClick={() => setActiveSection('QUALITY EVENTS')}
            className="flex items-center space-x-1.5 text-qems-danger-dark bg-qems-danger-bg px-1.5 py-0.5 rounded border border-rose-200 "
          >
            <span className="w-1.5 h-1.5 rounded-full bg-qems-danger" />
            <span className="font-bold">{slaBreachedCount} SLA Breached</span>
          </button>
        )}

        <div className="h-3 w-px bg-slate-200 hidden sm:block" />

        <div className="hidden lg:block text-qems-text-disabled ">
          Total Events: <strong className="text-qems-text-secondary ">{events.length}</strong>
        </div>
      </div>
    </footer>
  );
};

