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
    density,
    toggleDensity,
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

  const roles: UserRole[] = [
    'Frontline Employee',
    'QA Auditor',
    'QA Reviewer',
    'Team Lead',
    'QA Manager',
    'Quality Governance',
    'Executive / Leadership',
    'System Administrator',
  ];

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand Identity */}
      <div className="flex items-center space-x-3">
        <div
          onClick={() => setActiveSection('COMMAND CENTER')}
          className="flex items-center space-x-2.5 cursor-pointer group"
          title="QEMS Command Center"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold tracking-wider group-hover:bg-indigo-700 transition">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                QEMS
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded border border-slate-200 dark:border-slate-700">
                ENTERPRISE
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
              Quality Operations & Continuous Improvement
            </span>
          </div>
        </div>
      </div>

      {/* Center: Global Search & Shortcuts */}
      <div className="flex-1 max-w-xl mx-6">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search errors, employees, SOPs, root causes, evidence... (Ctrl + K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-20 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="absolute right-2 px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-mono text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center space-x-1"
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
          className="h-8 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium flex items-center space-x-1.5 transition"
          title="Create Quality Defect Record (Ctrl + N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Error</span>
          <span className="text-[10px] opacity-70 font-mono hidden md:inline">⌘N</span>
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={() => setIsAiDrawerOpen(true)}
          className="h-8 px-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-md text-xs font-medium flex items-center space-x-1.5 transition"
          title="Open QEMS AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>

        {/* Notification Center */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="h-8 w-8 relative flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-2 z-50 animate-in fade-in duration-100">
              <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {(!notifications || notifications.length === 0) ? (
                  <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
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
                      className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                        !notif.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.linkId && (
                        <div className="mt-1.5 flex items-center text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
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

        {/* Density Toggle (Compact / Comfortable) */}
        <button
          onClick={toggleDensity}
          className="h-8 px-2 flex items-center space-x-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition text-xs font-mono"
          title={`Data Density: ${density === 'compact' ? 'Compact' : 'Comfortable'} (Click to toggle)`}
        >
          {density === 'compact' ? (
            <Rows3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Rows4 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          )}
          <span className="hidden md:inline text-[10px] uppercase font-semibold">
            {density === 'compact' ? 'Compact' : 'Comfort'}
          </span>
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          className="h-8 px-2.5 flex items-center space-x-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-750 transition text-xs font-medium"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode (Shortcut: D)`}
          aria-label="Toggle light and dark theme"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px] font-semibold">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline text-[11px] font-semibold">Dark</span>
            </>
          )}
        </button>

        {/* Help & Shortcuts Guide */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          title="Workflow & Keyboard Guide"
        >
          <LifeBuoy className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Demo Persona Role Switcher */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center space-x-2 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-200 transition"
            title="Switch Demo Persona / Role"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
              {currentUser.avatar}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                {currentRole}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-2 z-50 animate-in fade-in duration-100">
              <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Switch Demo Role
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                      currentRole === r
                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{r}</span>
                    {currentRole === r && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 px-2">
                <button
                  onClick={() => {
                    resetDemoData();
                    setIsRoleMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded flex items-center space-x-1.5 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Demo Data (160 Events)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <LifeBuoy className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">QEMS Operating Framework</h3>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-3 text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed">
              <p>
                <strong>Continuous Quality Improvement:</strong> Every quality error follows a
                traceable 8-stage lifecycle from detection through root cause analysis (5 Whys /
                Fishbone) to corrective action and 30-day effectiveness verification.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-md border border-slate-200 dark:border-slate-700 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Ctrl + K</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">Global Command Palette</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Ctrl + N</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">Fast Error Entry (60s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Disputed Reference Case</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">QEMS-2026-001284</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Use the Demo Role Switcher in the top-right to test Frontline Employee rebuttals,
                QA Auditor arbitrations, Team Lead escalations, and Governance audits.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
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
