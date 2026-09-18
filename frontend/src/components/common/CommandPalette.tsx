import React, { useState, useEffect } from 'react';
import {
  Search,
  FileSpreadsheet,
  PlusCircle,
  Sparkles,
  LayoutDashboard,
  MessageSquareWarning,
  Scale,
  GitFork,
  CheckCircle2,
  LineChart,
  User,
  ArrowRight,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { useQEMS, NavSection } from '../../context/QEMSContext';
import { UserRole } from '../../types';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    events,
    setSelectedEventId,
    setActiveSection,
    setIsNewErrorModalOpen,
    setIsAiDrawerOpen,
    setCurrentRole,
    addToast,
    theme,
    toggleTheme,
  } = useQEMS();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Filter events and navigation options
  const matchedEvents = events
    .filter(
      (e) =>
        e.id.toLowerCase().includes(query.toLowerCase()) ||
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.employee.toLowerCase().includes(query.toLowerCase()) ||
        e.sopId.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5);

  const quickNav = [
    { label: 'Command Center (Action Hub)', section: 'COMMAND CENTER' as NavSection, icon: LayoutDashboard },
    { label: 'Quality Events (Enterprise Table)', section: 'QUALITY EVENTS' as NavSection, icon: FileSpreadsheet },
    { label: 'Dispute Center (Rebuttals Queue)', section: 'DISPUTE CENTER' as NavSection, icon: MessageSquareWarning },
    { label: 'Root Cause Analysis (5 Whys / Fishbone)', section: 'ROOT CAUSE' as NavSection, icon: GitFork },
    { label: 'Corrective Actions (CAPA Tracker)', section: 'CORRECTIVE ACTIONS' as NavSection, icon: CheckCircle2 },
    { label: 'Calibration Center (Auditor Alignment)', section: 'CALIBRATION' as NavSection, icon: Scale },
    { label: 'Quality Intelligence (Executive Analytics)', section: 'QUALITY INTELLIGENCE' as NavSection, icon: LineChart },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  const quickRoles = [
    { role: 'Frontline Employee' as UserRole, label: 'Switch to Frontline Employee (Sarah Williams)' },
    { role: 'QA Auditor' as UserRole, label: 'Switch to QA Auditor (Michael Torres)' },
    { role: 'Team Lead' as UserRole, label: 'Switch to Team Lead (Operations)' },
    { role: 'QA Manager' as UserRole, label: 'Switch to QA Manager (Rachel Green)' },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  const quickThemes = [
    {
      id: 'theme-toggle',
      label: `Toggle Theme (Currently ${theme === 'dark' ? 'Dark' : 'Light'})`,
      icon: theme === 'dark' ? Sun : Moon,
      action: () => toggleTheme(),
    },
    {
      id: 'theme-dark',
      label: 'Switch to Dark Mode (Black & White palette)',
      icon: Moon,
      action: () => {
        if (theme !== 'dark') toggleTheme();
      },
    },
    {
      id: 'theme-light',
      label: 'Switch to Light Mode (White & Black palette)',
      icon: Sun,
      action: () => {
        if (theme !== 'light') toggleTheme();
      },
    },
  ].filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      'theme'.includes(query.toLowerCase()) ||
      'dark'.includes(query.toLowerCase()) ||
      'light'.includes(query.toLowerCase())
  );

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    setActiveSection('QUALITY EVENTS');
    setIsCommandPaletteOpen(false);
  };

  const handleSelectNav = (sec: NavSection) => {
    setActiveSection(sec);
    setIsCommandPaletteOpen(false);
  };

  const handleSelectRole = (r: UserRole) => {
    setCurrentRole(r);
    setIsCommandPaletteOpen(false);
    addToast({
      type: 'info',
      title: `Switched Persona to ${r}`,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Search header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-3 bg-slate-50/70 dark:bg-slate-800/40">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search records (e.g. QEMS-2026-001284, Sarah, SOP-PAY-014, RCA)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick action buttons row */}
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2 overflow-x-auto text-[11px]">
          <button
            onClick={() => {
              setIsCommandPaletteOpen(false);
              setIsNewErrorModalOpen(true);
            }}
            className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center space-x-1 shrink-0 border border-indigo-200 dark:border-indigo-800"
          >
            <PlusCircle className="w-3 h-3" />
            <span>New Error (Ctrl+N)</span>
          </button>
          <button
            onClick={() => {
              setIsCommandPaletteOpen(false);
              setIsAiDrawerOpen(true);
            }}
            className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center space-x-1 shrink-0 border border-indigo-200 dark:border-indigo-800"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Quality Assistant</span>
          </button>
          <button
            onClick={() => {
              toggleTheme();
              setIsCommandPaletteOpen(false);
            }}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1 shrink-0 border border-slate-200 dark:border-slate-700"
          >
            {theme === 'dark' ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-slate-700" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'} (D)</span>
          </button>
          <button
            onClick={() => handleSelectEvent('QEMS-2026-001284')}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1 shrink-0 font-mono border border-slate-200 dark:border-slate-700"
          >
            <span>Hero Case QEMS-001284</span>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Quality Events Match */}
          {matchedEvents.length > 0 && (
            <div className="py-2">
              <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Quality Events ({matchedEvents.length})
              </div>
              {matchedEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev.id)}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {ev.id}
                        </span>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {ev.title}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {ev.employee} • {ev.team} • {ev.sopId}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {ev.status}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Quick Links */}
          {quickNav.length > 0 && (
            <div className="py-2">
              <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Navigation Modules
              </div>
              {quickNav.map((nav) => {
                const Icon = nav.icon;
                return (
                  <div
                    key={nav.section}
                    onClick={() => handleSelectNav(nav.section)}
                    className="px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition group"
                  >
                    <div className="flex items-center space-x-2.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                      <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0" />
                      <span>{nav.label}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Persona Switchers */}
          {quickRoles.length > 0 && (
            <div className="py-2">
              <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Switch Persona
              </div>
              {quickRoles.map((r) => (
                <div
                  key={r.role}
                  onClick={() => handleSelectRole(r.role)}
                  className="px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{r.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-mono">Role</span>
                </div>
              ))}
            </div>
          )}

          {/* Theme & Display Options */}
          {quickThemes.length > 0 && (
            <div className="py-2">
              <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Theme & Appearance
              </div>
              {quickThemes.map((th) => {
                const Icon = th.icon;
                return (
                  <div
                    key={th.id}
                    onClick={() => {
                      th.action();
                      setIsCommandPaletteOpen(false);
                      addToast({
                        type: 'info',
                        title: 'Appearance Updated',
                        message: th.label,
                      });
                    }}
                    className="px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition group"
                  >
                    <div className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <Icon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span className="group-hover:text-slate-900 dark:group-hover:text-white font-medium">
                        {th.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Theme</span>
                  </div>
                );
              })}
            </div>
          )}

          {matchedEvents.length === 0 && quickNav.length === 0 && quickRoles.length === 0 && quickThemes.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching records or commands found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
          <span>Navigate with ↑ ↓ and Enter</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
