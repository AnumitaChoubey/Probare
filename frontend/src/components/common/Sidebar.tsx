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
import { useQEMS } from '../../context/QEMSContext';
import { useRoleNavigation, NavItemDef } from '../../hooks/useRoleNavigation';

export const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection, currentRole, events, calibrations } = useQEMS();
  const [collapsed, setCollapsed] = useState(false);
  
  const roleNavItems = useRoleNavigation(currentRole);

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

  const getBadgeValue = (type?: NavItemDef['badgeType']): number | string | undefined => {
    switch (type) {
      case 'alerts': return activeSlaAlerts > 0 ? `${activeSlaAlerts} Risk` : undefined;
      case 'tasks': return currentRole === 'Frontline Employee' ? '3 Tasks' : '7 Actions';
      case 'total': return events.length;
      case 'rebuttals': return pendingRebuttals > 0 ? pendingRebuttals : undefined;
      case 'capas': return activeCapas > 0 ? activeCapas : undefined;
      case 'calibrations': return activeCalibrations > 0 ? activeCalibrations : undefined;
      default: return undefined;
    }
  };

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
          {roleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badgeValue = getBadgeValue(item.badgeType);

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

                {!collapsed && badgeValue !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                        : item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {badgeValue}
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
