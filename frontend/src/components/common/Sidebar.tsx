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
  const myWorkCount = events.filter(
    (e) => e.status !== 'Closed' && e.status !== 'Overturned'
  ).length;
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
      case 'tasks': return myWorkCount > 0 ? `${myWorkCount} Actions` : undefined;
      case 'total': return events.length > 0 ? events.length : undefined;
      case 'rebuttals': return pendingRebuttals > 0 ? pendingRebuttals : undefined;
      case 'capas': return activeCapas > 0 ? activeCapas : undefined;
      case 'calibrations': return activeCalibrations > 0 ? activeCalibrations : undefined;
      default: return undefined;
    }
  };

  return (
    <aside
      className={`bg-qems-bg-white border-r border-qems-border flex flex-col justify-between transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex flex-col flex-1 py-3 overflow-y-auto">
        <div className="px-3 pb-2 flex items-center justify-between">
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled ">
              Operations Navigation
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-qems-text-disabled hover:text-qems-text-secondary :text-slate-200 hover:bg-qems-bg-secondary :bg-slate-800 ml-auto"
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
                    ? 'bg-qems-brand-light text-qems-brand-dark font-semibold border-l-2 border-qems-brand-dark'
                    : 'text-qems-text-muted hover:text-qems-text-primary hover:bg-qems-bg-surface'
                } ${collapsed ? 'justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-qems-brand-dark ' : 'text-qems-text-disabled '
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && badgeValue !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-qems-brand text-white'
                        : item.badgeColor || 'bg-qems-bg-secondary text-qems-text-secondary '
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
        <div className="p-3 border-t border-qems-border-light bg-qems-bg-surface/50 ">
          <div className="flex items-center space-x-2 text-[11px] text-qems-text-muted ">
            <ShieldCheck className="w-3.5 h-3.5 text-qems-success shrink-0" />
            <span className="truncate font-medium">ISO 9001 / CAPA Ready</span>
          </div>
          <div className="text-[10px] text-qems-text-disabled mt-1 font-mono">
            Build 2026.4 • SLA Engine Active
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-qems-border-light flex justify-center text-qems-success ">
          <ShieldCheck className="w-4 h-4" />
        </div>
      )}
    </aside>
  );
};
