import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FileSpreadsheet,
  PlusCircle,
  MessageSquareWarning,
  Paperclip,
  GitFork,
  CheckCircle2,
  Scale,
  LineChart,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useQEMS, NavSection } from '../../context/QEMSContext';

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, currentRole, events, calibrations } = useQEMS();
  const [collapsed, setCollapsed] = useState(false);

  // Compute live badges
  const pendingRebuttals = events.filter(
    (e) => e.status === 'Rebuttal Pending' || e.status === 'QA Review'
  ).length;
  const activeSlaAlerts = events.filter(
    (e) => e.slaStatus === 'At Risk' || e.slaStatus === 'Breached'
  ).length;
  const activeCapas = events.reduce(
    (acc, e) => acc + e.correctiveActions.filter((c) => c.status !== 'Completed').length,
    0
  );
  const activeCalibrations = calibrations.filter((c) => c.status !== 'Completed').length;

  // Nav items configuration
  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
    allowedRoles?: string[];
  }[] = [
    {
      id: 'COMMAND CENTER',
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: activeSlaAlerts > 0 ? `${activeSlaAlerts} Risk` : undefined,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'MY WORK',
      label: 'My Work',
      icon: CheckSquare,
      badge: currentRole === 'Frontline Employee' ? '3 Tasks' : '7 Actions',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'QUALITY EVENTS',
      label: 'Quality Events',
      icon: FileSpreadsheet,
      badge: events.length,
      badgeColor: 'bg-slate-100 text-slate-700 font-mono',
    },
    {
      id: 'NEW ERROR',
      label: 'New Error Entry',
      icon: PlusCircle,
    },
    {
      id: 'DISPUTE CENTER',
      label: 'Dispute Center',
      icon: MessageSquareWarning,
      badge: pendingRebuttals,
      badgeColor: 'bg-amber-100 text-amber-800 font-semibold',
    },
    {
      id: 'EVIDENCE',
      label: 'Evidence Gallery',
      icon: Paperclip,
    },
    {
      id: 'ROOT CAUSE',
      label: 'Root Cause (RCA)',
      icon: GitFork,
    },
    {
      id: 'CORRECTIVE ACTIONS',
      label: 'Corrective Actions',
      icon: CheckCircle2,
      badge: activeCapas,
      badgeColor: 'bg-cyan-100 text-cyan-800',
    },
    {
      id: 'CALIBRATION',
      label: 'Calibration Center',
      icon: Scale,
      badge: activeCalibrations,
      badgeColor: 'bg-violet-100 text-violet-800',
    },
    {
      id: 'QUALITY INTELLIGENCE',
      label: 'Quality Intelligence',
      icon: LineChart,
    },
    {
      id: 'REPORTS',
      label: 'Reports & Audits',
      icon: FileText,
    },
    {
      id: 'ADMINISTRATION',
      label: 'Administration',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex flex-col flex-1 py-3 overflow-y-auto">
        <div className="px-3 pb-2 flex items-center justify-between">
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Operations Navigation
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ml-auto"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-md px-2.5 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border-l-2 border-indigo-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                } ${collapsed ? 'justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info in sidebar */}
      {!collapsed ? (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate font-medium">ISO 9001 / CAPA Ready</span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
            Build 2026.4 • SLA Engine Active
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex justify-center text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
        </div>
      )}
    </aside>
  );
};
