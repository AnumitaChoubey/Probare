import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Command,
  Bell,
  Sparkles,
  Plus,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  User,
  ExternalLink,
  LifeBuoy,
  X,
  Sun,
  Moon,
  Rows3,
  Rows4,
  Sliders,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { UserRole } from '../../types';
import { UserButton } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../services/api/projects';

export const Header: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    currentUser,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    searchQuery,
    setSearchQuery,
    setIsCommandPaletteOpen,
    setIsAiDrawerOpen,
    setIsNewErrorModalOpen,
    setSelectedEventId,
    setActiveSection,
    resetDemoData,
    theme,
    toggleTheme,
    sessionData,
  } = useQEMS();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const backendRoles: UserRole[] = (sessionData?.roles || ['Frontline Employee']) as UserRole[];
  const allRoles: UserRole[] = [
    'Frontline Employee', 'QA Auditor', 'Team Lead', 'QA Manager', 
    'QA Reviewer', 'Quality Governance', 'Executive / Leadership', 'System Administrator'
  ];
  const roles = backendRoles.includes('System Administrator') ? allRoles : backendRoles;
  
  const { data: projects = [] } = useQuery({
    queryKey: ['myProjects'],
    queryFn: projectsApi.list
  });

  return (
    <header className="h-14 bg-qems-bg-white border-b border-qems-border px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand Identity */}
      <div className="flex items-center space-x-3">
        <div
          onClick={() => setActiveSection('COMMAND CENTER')}
          className="flex items-center space-x-2 cursor-pointer group"
          title="QEMS Command Center"
        >
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-qems-text-primary leading-none group-hover:text-qems-brand-dark transition-colors">
                QEMS
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-qems-bg-secondary text-qems-text-secondary font-bold rounded border border-qems-border uppercase">
                ENTERPRISE
              </span>
            </div>
            <span className="text-[10px] text-qems-text-muted font-medium leading-tight tracking-wide uppercase mt-0.5">
              Quality Operations & Continuous Improvement
            </span>
          </div>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="hidden md:flex items-center ml-4 pl-4 border-l border-qems-border">
            <span className="text-[10px] font-bold text-qems-text-disabled uppercase mr-2 tracking-wider">Project</span>
            <select
              className="text-xs py-1 px-2 bg-qems-bg-surface border border-qems-border rounded focus:outline-none focus:border-qems-brand text-qems-text-primary font-mono"
              onChange={(e) => {
                // To actually change the project we would update the API client active project ID and refetch.
                // For now, let's just reload the page with a query param or assume the backend context knows it.
                // In a real app we'd call setActiveProjectId() and invalidate queries.
                window.location.reload();
              }}
              defaultValue={sessionData?.accessible_projects?.[0]}
            >
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center: Global Search & Shortcuts */}
      <div className="flex-1 max-w-xl mx-6">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-qems-text-disabled pointer-events-none" />
          <input
            type="text"
            placeholder="Search errors, employees, SOPs, root causes, evidence... (Ctrl + K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-20 py-1.5 bg-qems-bg-white border border-qems-border rounded-md text-xs text-qems-text-primary placeholder-qems-text-disabled focus:outline-none focus:bg-white focus:border-qems-brand focus:ring-1 focus:ring-qems-brand transition"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="absolute right-2 px-1.5 py-0.5 bg-qems-bg-surface border border-qems-border rounded text-[10px] font-mono text-qems-text-muted hover:text-qems-text-primary flex items-center space-x-1"
            title="Open Command Palette"
          >
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Actions, AI, Notifs, Persona Switcher */}
      <div className="flex items-center space-x-2.5">
        {/* Quick New Error button */}
        <button
          onClick={() => setIsNewErrorModalOpen(true)}
          className="h-8 px-2.5 bg-qems-brand hover:bg-qems-brand-dark text-qems-bg-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition"
          title="Create Quality Defect Record (Ctrl + N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Error</span>
          <span className="text-[10px] opacity-70 font-mono hidden md:inline">⌘N</span>
        </button>

        {/* Notification Center */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="h-8 w-8 relative flex items-center justify-center rounded-md border border-qems-border text-qems-text-muted hover:text-qems-text-primary :text-white hover:bg-qems-bg-surface :bg-slate-800 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-qems-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white ">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-qems-bg-white border border-qems-border rounded-lg shadow-lg py-2 z-50 animate-in fade-in duration-100">
              <div className="px-3 pb-2 border-b border-qems-border-light flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-xs text-qems-text-primary ">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-qems-danger-bg text-qems-danger-dark text-[10px] font-bold rounded">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-qems-brand-dark hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 ">
                {(!notifications || notifications.length === 0) ? (
                  <div className="p-4 text-center text-xs text-qems-text-disabled ">
                    No active notifications
                  </div>
                ) : (
                  (notifications || []).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.linkId) {
                          setSelectedEventId(notif.linkId);
                          setActiveSection('QUALITY EVENTS');
                        }
                        setIsNotifOpen(false);
                      }}
                      className={`p-3 cursor-pointer hover:bg-qems-bg-surface :bg-slate-800 transition ${
                        !notif.read ? 'bg-qems-brand-light/40 ' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-qems-text-primary leading-snug">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-qems-text-disabled font-mono">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-qems-text-muted mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.linkId && (
                        <div className="mt-1.5 flex items-center text-[10px] text-qems-brand-dark font-medium">
                          <span>View record {notif.linkId}</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-1" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>



        {/* Help & Shortcuts Guide */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-qems-border text-qems-text-muted hover:text-qems-text-primary :text-white hover:bg-qems-bg-surface :bg-slate-800 transition"
          title="Workflow & Keyboard Guide"
        >
          <LifeBuoy className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* User Account & Logout (Clerk) */}
        <div className="flex items-center justify-center h-8 w-8">
          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Demo Persona Role Switcher */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center space-x-2 px-2.5 py-1 bg-qems-bg-surface hover:bg-qems-bg-secondary :bg-slate-700 border border-qems-border rounded-md text-xs font-medium text-qems-text-primary transition"
            title="Switch Demo Persona / Role"
          >
            <div className="w-5 h-5 rounded-full bg-qems-brand text-white flex items-center justify-center text-[10px] font-bold">
              {currentUser.avatar}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-[11px] font-semibold text-qems-text-primary leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[9px] text-qems-brand-dark font-bold uppercase tracking-wider">
                {currentRole}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-qems-text-disabled ml-1" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-qems-bg-white border border-qems-border rounded-lg shadow-lg py-2 z-50 animate-in fade-in duration-100">
              <div className="px-3 pb-2 border-b border-qems-border-light ">
                <span className="text-[10px] font-bold tracking-wider text-qems-text-disabled uppercase">
                  Switch Role
                </span>
                <p className="text-[11px] text-qems-text-muted mt-0.5">
                  Changes visible actions, dashboards, and dispute permissions.
                </p>
              </div>

              <div className="py-1">
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setCurrentRole(r);
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-qems-bg-surface :bg-slate-800 transition ${
                      currentRole === r
                        ? 'text-qems-brand-dark font-semibold bg-qems-brand-light/50 '
                        : 'text-qems-text-secondary '
                    }`}
                  >
                    <span>{r}</span>
                    {currentRole === r && <CheckCircle className="w-3.5 h-3.5 text-qems-brand-dark " />}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-qems-border-light px-2">
                <button
                  onClick={() => {
                    setIsRoleMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-qems-text-muted rounded flex items-center space-x-1.5 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Roles are managed in Administration</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-slate-900/40  flex items-center justify-center z-50 p-4">
          <div className="bg-qems-bg-white rounded-lg border border-qems-border shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-qems-border-light ">
              <div className="flex items-center space-x-2">
                <LifeBuoy className="w-5 h-5 text-qems-brand-dark" />
                <h3 className="font-bold text-sm text-qems-text-primary ">QEMS Operating Framework</h3>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-qems-text-disabled hover:text-qems-text-secondary :text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-3 text-xs text-qems-text-muted space-y-2.5 leading-relaxed">
              <p>
                <strong>Continuous Quality Improvement:</strong> Every quality error follows a
                traceable 8-stage lifecycle from detection through root cause analysis (5 Whys /
                Fishbone) to corrective action and 30-day effectiveness verification.
              </p>
              <div className="bg-qems-bg-surface p-3 rounded-md border border-qems-border space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-qems-text-muted ">Ctrl + K</span>
                  <span className="text-qems-text-primary font-semibold">Global Command Palette</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qems-text-muted ">Ctrl + N</span>
                  <span className="text-qems-text-primary font-semibold">Fast Error Entry (60s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-qems-text-muted ">Disputed Reference Case</span>
                  <span className="text-qems-brand-dark font-semibold">QEMS-2026-001284</span>
                </div>
              </div>
              <p className="text-[11px] text-qems-text-muted ">
                Use the Demo Role Switcher in the top-right to test Frontline Employee rebuttals,
                QA Auditor arbitrations, Team Lead escalations, and Governance audits.
              </p>
            </div>
            <div className="pt-3 border-t border-qems-border-light flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 :bg-slate-200"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
