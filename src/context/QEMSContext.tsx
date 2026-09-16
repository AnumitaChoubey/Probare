import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  QualityEvent,
  QualityStatus,
  UserRole,
  CalibrationSession,
  SLAPolicy,
  NotificationItem,
  AuditEvent,
  RebuttalRecord,
  RootCauseAnalysis,
  CorrectiveAction,
  EffectivenessReview,
  DisputeCategory,
  AppTheme,
  AppDensity,
  SavedViewType,
  RolePermissions,
} from '../types';
import {
  generateInitialEvents,
  INITIAL_CALIBRATION_SESSIONS,
  SLA_POLICIES,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData';
import { validateStateTransition, getAvailableNextStatuses } from '../services/workflowEngine';
import { authorizeAction, sanitizeText } from '../services/securityService';

export type NavSection =
  | 'COMMAND CENTER'
  | 'MY WORK'
  | 'QUALITY EVENTS'
  | 'NEW ERROR'
  | 'DISPUTE CENTER'
  | 'EVIDENCE'
  | 'ROOT CAUSE'
  | 'CORRECTIVE ACTIONS'
  | 'CAPA'
  | 'CALIBRATION'
  | 'QUALITY INTELLIGENCE'
  | 'REPORTS'
  | 'ADMINISTRATION';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  message?: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  'Frontline Employee': {
    canCreateEvent: false,
    canEditEvent: false,
    canSubmitRebuttal: true,
    canReviewRebuttal: false,
    canEscalate: false,
    canPerformRCA: false,
    canCreateCAPA: false,
    canReviewEffectiveness: false,
    canCalibrate: false,
    canViewAllTeams: false,
    canViewExecutiveAnalytics: false,
    canExportAuditPackage: false,
    canManageSettings: false,
  },
  'QA Auditor': {
    canCreateEvent: true,
    canEditEvent: true,
    canSubmitRebuttal: false,
    canReviewRebuttal: true,
    canEscalate: true,
    canPerformRCA: true,
    canCreateCAPA: true,
    canReviewEffectiveness: false,
    canCalibrate: true,
    canViewAllTeams: false,
    canViewExecutiveAnalytics: false,
    canExportAuditPackage: true,
    canManageSettings: false,
  },
  'QA Reviewer': {
    canCreateEvent: true,
    canEditEvent: true,
    canSubmitRebuttal: false,
    canReviewRebuttal: true,
    canEscalate: true,
    canPerformRCA: true,
    canCreateCAPA: true,
    canReviewEffectiveness: true,
    canCalibrate: true,
    canViewAllTeams: true,
    canViewExecutiveAnalytics: true,
    canExportAuditPackage: true,
    canManageSettings: false,
  },
  'Team Lead': {
    canCreateEvent: true,
    canEditEvent: false,
    canSubmitRebuttal: true,
    canReviewRebuttal: false,
    canEscalate: true,
    canPerformRCA: true,
    canCreateCAPA: true,
    canReviewEffectiveness: false,
    canCalibrate: false,
    canViewAllTeams: false,
    canViewExecutiveAnalytics: true,
    canExportAuditPackage: false,
    canManageSettings: false,
  },
  'QA Manager': {
    canCreateEvent: true,
    canEditEvent: true,
    canSubmitRebuttal: false,
    canReviewRebuttal: true,
    canEscalate: true,
    canPerformRCA: true,
    canCreateCAPA: true,
    canReviewEffectiveness: true,
    canCalibrate: true,
    canViewAllTeams: true,
    canViewExecutiveAnalytics: true,
    canExportAuditPackage: true,
    canManageSettings: true,
  },
  'Quality Governance': {
    canCreateEvent: true,
    canEditEvent: true,
    canSubmitRebuttal: false,
    canReviewRebuttal: true,
    canEscalate: true,
    canPerformRCA: true,
    canCreateCAPA: true,
    canReviewEffectiveness: true,
    canCalibrate: true,
    canViewAllTeams: true,
    canViewExecutiveAnalytics: true,
    canExportAuditPackage: true,
    canManageSettings: true,
  },
  'Executive / Leadership': {
    canCreateEvent: false,
    canEditEvent: false,
    canSubmitRebuttal: false,
    canReviewRebuttal: false,
    canEscalate: false,
    canPerformRCA: false,
    canCreateCAPA: false,
    canReviewEffectiveness: false,
    canCalibrate: false,
    canViewAllTeams: true,
    canViewExecutiveAnalytics: true,
    canExportAuditPackage: true,
    canManageSettings: false,
  },
  'System Administrator': {
    canCreateEvent: true,
    canEditEvent: true,
    canSubmitRebuttal: true,
    canReviewRebuttal: true,
    canEscalate: true,
    canPerformRCA: true,
    canCreateCAPA: true,
    canReviewEffectiveness: true,
    canCalibrate: true,
    canViewAllTeams: true,
    canViewExecutiveAnalytics: true,
    canExportAuditPackage: true,
    canManageSettings: true,
  },
  Administrator: {
    canCreateEvent: true,
    canEditEvent: true,
    canSubmitRebuttal: true,
    canReviewRebuttal: true,
    canEscalate: true,
    canPerformRCA: true,
    canCreateCAPA: true,
    canReviewEffectiveness: true,
    canCalibrate: true,
    canViewAllTeams: true,
    canViewExecutiveAnalytics: true,
    canExportAuditPackage: true,
    canManageSettings: true,
  },
};

interface QEMSContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: { name: string; email: string; team: string; avatar: string };
  hasPermission: (permission: keyof RolePermissions) => boolean;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  density: AppDensity;
  setDensity: (density: AppDensity) => void;
  toggleDensity: () => void;
  activeSavedView: SavedViewType;
  setActiveSavedView: (view: SavedViewType) => void;
  paretoDrillDownCategory: string | null;
  setParetoDrillDownCategory: (category: string | null) => void;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  events: QualityEvent[];
  calibrations: CalibrationSession[];
  slaPolicies: SLAPolicy[];
  notifications: NotificationItem[];
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (open: boolean) => void;
  isNewErrorModalOpen: boolean;
  setIsNewErrorModalOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  auditTrail: AuditEvent[];

  // Mutations
  addQualityEvent: (event: Omit<QualityEvent, 'id' | 'date' | 'history'>) => QualityEvent;
  updateQualityEvent: (id: string, updates: Partial<QualityEvent>, auditReason?: string) => void;
  submitRebuttal: (
    errorId: string,
    category: DisputeCategory,
    explanation: string,
    evidenceFiles: any[]
  ) => void;
  resolveRebuttal: (
    errorId: string,
    decision: 'Accept Error' | 'Overturn' | 'Partially Accept' | 'Escalate',
    rationale: string
  ) => void;
  saveRCA: (errorId: string, rca: RootCauseAnalysis) => void;
  addCorrectiveAction: (errorId: string, action: Omit<CorrectiveAction, 'id' | 'errorId'>) => void;
  updateCorrectiveActionStatus: (
    errorId: string,
    actionId: string,
    status: CorrectiveAction['status'],
    notes?: string
  ) => void;
  submitEffectivenessReview: (errorId: string, review: Omit<EffectivenessReview, 'id' | 'errorId'>) => void;
  addDiscussionMessage: (errorId: string, message: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  bulkAssign: (errorIds: string[], newOwner: string) => void;
  bulkUpdateStatus: (errorIds: string[], newStatus: QualityEvent['status']) => void;
  updateEventStatus?: (id: string, status: QualityStatus) => void;
  resetDemoData: () => void;
  canTransitionStatus: (event: QualityEvent, targetStatus: QualityStatus) => { valid: boolean; message: string };
  getNextStatuses: (event: QualityEvent) => QualityStatus[];
}

const QEMSContext = createContext<QEMSContextType | undefined>(undefined);

const ROLE_USER_PROFILES: Record<UserRole, { name: string; email: string; team: string; avatar: string }> = {
  'Frontline Employee': {
    name: 'Sarah Williams',
    email: 's.williams@qems-enterprise.internal',
    team: 'Claims Operations',
    avatar: 'SW',
  },
  'QA Auditor': {
    name: 'Michael Torres',
    email: 'm.torres@qems-enterprise.internal',
    team: 'Quality Assurance & Audit',
    avatar: 'MT',
  },
  'QA Reviewer': {
    name: 'Rachel Green',
    email: 'r.green@qems-enterprise.internal',
    team: 'Global Quality Management',
    avatar: 'RG',
  },
  'Team Lead': {
    name: 'Marcus Vance',
    email: 'm.vance@qems-enterprise.internal',
    team: 'Claims Operations Lead',
    avatar: 'MV',
  },
  'QA Manager': {
    name: 'Rachel Green',
    email: 'r.green@qems-enterprise.internal',
    team: 'Global Quality Management',
    avatar: 'RG',
  },
  'Quality Governance': {
    name: 'Dr. Evelyn Sterling',
    email: 'e.sterling@qems-enterprise.internal',
    team: 'Enterprise Risk & Governance',
    avatar: 'ES',
  },
  'Executive / Leadership': {
    name: 'Victoria Hastings',
    email: 'v.hastings@qems-enterprise.internal',
    team: 'Operations Leadership & Risk',
    avatar: 'VH',
  },
  'System Administrator': {
    name: 'Alex Rivera (System Admin)',
    email: 'admin@qems-enterprise.internal',
    team: 'IT & System Governance',
    avatar: 'AR',
  },
  Administrator: {
    name: 'Alex Rivera (System Admin)',
    email: 'admin@qems-enterprise.internal',
    team: 'IT & System Governance',
    avatar: 'AR',
  },
};

export const QEMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('QA Manager');
  const [activeSection, setActiveSection] = useState<NavSection>('COMMAND CENTER');
  const [selectedEventId, setSelectedEventId] = useState<string | null>('QEMS-2026-001284');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isNewErrorModalOpen, setIsNewErrorModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeSavedView, setActiveSavedView] = useState<SavedViewType>('ALL');
  const [paretoDrillDownCategory, setParetoDrillDownCategory] = useState<string | null>(null);

  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('qems_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return 'light';
  });

  const [density, setDensity] = useState<AppDensity>(() => {
    try {
      const saved = localStorage.getItem('qems_density');
      if (saved === 'compact' || saved === 'comfortable') return saved;
    } catch (e) {}
    return 'comfortable';
  });

  useEffect(() => {
    try {
      localStorage.setItem('qems_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('qems_density', density);
    } catch (e) {}
  }, [density]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const toggleDensity = () => setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'));

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    const perms = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS['QA Auditor'];
    return !!perms[permission];
  };

  // Persistent storage with state fallback and schema sanitization
  const [events, setEvents] = useState<QualityEvent[]>(() => {
    try {
      const saved = localStorage.getItem('qems_events_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((e: any) => ({
            ...e,
            evidence: Array.isArray(e?.evidence) ? e.evidence : [],
            correctiveActions: Array.isArray(e?.correctiveActions) ? e.correctiveActions : [],
            history: Array.isArray(e?.history) ? e.history : [],
            rebuttal: e?.rebuttal
              ? {
                  ...e.rebuttal,
                  evidence: Array.isArray(e.rebuttal?.evidence) ? e.rebuttal.evidence : [],
                  discussions: Array.isArray(e.rebuttal?.discussions) ? e.rebuttal.discussions : [],
                }
              : undefined,
          }));
        }
      }
    } catch (e) {
      console.warn('Could not read saved events:', e);
    }
    return generateInitialEvents();
  });

  const [calibrations, setCalibrations] = useState<CalibrationSession[]>(() => {
    try {
      const saved = localStorage.getItem('qems_calibrations_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((c: any) => {
            const rawParticipants = Array.isArray(c?.participants)
              ? c.participants
              : Array.isArray(c?.evaluators)
              ? c.evaluators.map((ev: any) => ({
                  name: ev.auditorName || ev.name || 'Auditor',
                  role: ev.role || 'QA Auditor',
                  score: ev.score,
                  submitted: true,
                  notes: ev.notes,
                }))
              : [];

            return {
              ...c,
              participants: rawParticipants,
              scheduledDate: c?.scheduledDate || c?.date || '2026-09-18',
              sampleCaseId: c?.sampleCaseId || c?.sampleInteractionId || 'QEMS-2026-001284',
              finalCalibratedScore: c?.finalCalibratedScore ?? c?.benchmarkScore ?? 88,
              scoreVariance: c?.scoreVariance ?? 3,
            };
          });
        }
      }
    } catch (e) {}
    return INITIAL_CALIBRATION_SESSIONS;
  });

  const [slaPolicies] = useState<SLAPolicy[]>(SLA_POLICIES);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('qems_notifications_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return INITIAL_NOTIFICATIONS;
  });

  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>(() => {
    return [
      {
        id: 'AUD-001',
        errorId: 'QEMS-2026-001284',
        who: 'Sarah Williams',
        role: 'Frontline Employee',
        what: 'Submitted Rebuttal Disputing Finding',
        when: '2026-09-15 11:13',
        previousValue: 'Under Review',
        newValue: 'Rebuttal Pending',
        reason: 'System UI bug obscured secondary verification prompt.',
      },
      {
        id: 'AUD-002',
        errorId: 'QEMS-2026-001284',
        who: 'Michael Torres',
        role: 'QA Auditor',
        what: 'Attached Call Audio Evidence EVD-901',
        when: '2026-09-15 10:04',
      },
      {
        id: 'AUD-003',
        errorId: 'QEMS-2026-001284',
        who: 'Michael Torres',
        role: 'QA Auditor',
        what: 'Logged Initial Quality Defect',
        when: '2026-09-15 09:42',
        previousValue: 'Draft',
        newValue: 'Logged',
        reason: 'Sampling of Claims payout transactions.',
      },
    ];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('qems_events_v2', JSON.stringify(events));
    } catch (e) {}
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem('qems_calibrations_v2', JSON.stringify(calibrations));
    } catch (e) {}
  }, [calibrations]);

  useEffect(() => {
    try {
      localStorage.setItem('qems_notifications_v2', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Ctrl+N or Cmd+N: New Error
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewErrorModalOpen(true);
      }
      // Escape closes modals
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsAiDrawerOpen(false);
        setIsNewErrorModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const normalized: ToastMessage = {
      id,
      type: toast.type || 'info',
      title: toast.title || 'Notification',
      description: toast.description || toast.message || '',
    };
    setToasts((prev) => [...prev.slice(-4), normalized]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateEventStatus = (id: string, status: QualityStatus) => {
    updateQualityEvent(id, { status }, `Direct status change to ${status}`);
  };

  const logAudit = (event: Omit<AuditEvent, 'id' | 'who' | 'role' | 'when'>) => {
    const newAudit: AuditEvent = {
      id: `AUD-${Date.now()}`,
      who: ROLE_USER_PROFILES[currentRole].name,
      role: currentRole,
      when: new Date().toISOString().replace('T', ' ').substring(0, 16),
      ...event,
    };
    setAuditTrail((prev) => [newAudit, ...prev]);
    return newAudit;
  };

  const addQualityEvent = (data: Omit<QualityEvent, 'id' | 'date' | 'history'>): QualityEvent => {
    const auth = authorizeAction(currentRole, 'CREATE_EVENT');
    if (!auth.authorized) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: auth.reason || 'You do not have permission to create quality events.',
      });
      throw new Error('Permission denied');
    }

    const nextNum = events.length + 1285;
    const newId = `QEMS-2026-${String(nextNum).padStart(6, '0')}`;
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const audit = logAudit({
      errorId: newId,
      what: 'Created Quality Event',
      newValue: data.status,
      reason: 'Manual entry via New Error workspace.',
    });

    const newEvent: QualityEvent = {
      ...data,
      title: sanitizeText(data.title),
      description: sanitizeText(data.description),
      customerImpact: sanitizeText(data.customerImpact),
      id: newId,
      date: dateStr,
      history: [audit],
    };

    setEvents((prev) => [newEvent, ...prev]);
    addToast({
      type: 'success',
      title: `Event ${newId} Created`,
      description: `Quality error logged and assigned to ${newEvent.owner}.`,
    });
    return newEvent;
  };

  const updateQualityEvent = (id: string, updates: Partial<QualityEvent>, auditReason?: string): boolean => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return false;

    // RBAC check
    const auth = authorizeAction(currentRole, 'EDIT_EVENT');
    if (!auth.authorized) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: auth.reason || 'You do not have permission to edit quality events.',
      });
      return false;
    }

    // Workflow state transition check
    if (updates.status && updates.status !== ev.status) {
      const transitionResult = validateStateTransition(ev, updates.status, currentRole);
      if (!transitionResult.valid) {
        addToast({
          type: 'error',
          title: 'Workflow Transition Blocked',
          description: transitionResult.message,
        });
        return false;
      }
    }

    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;

        const audit = logAudit({
          errorId: id,
          what: updates.status ? `Status changed to ${updates.status}` : 'Updated Event Details',
          previousValue: updates.status ? e.status : undefined,
          newValue: updates.status ? updates.status : undefined,
          reason: auditReason || 'Workflow progression',
        });

        return {
          ...e,
          ...updates,
          history: [audit, ...(e.history || [])],
        };
      })
    );
    return true;
  };

  const submitRebuttal = (
    errorId: string,
    category: DisputeCategory,
    explanation: string,
    evidenceFiles: any[]
  ) => {
    const auth = authorizeAction(currentRole, 'SUBMIT_REBUTTAL');
    if (!auth.authorized) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: auth.reason || 'You are not authorized to submit rebuttals.',
      });
      return;
    }

    const ev = events.find((e) => e.id === errorId);
    if (!ev) return;

    const transitionResult = validateStateTransition(ev, 'Rebuttal Pending', currentRole);
    if (!transitionResult.valid) {
      addToast({
        type: 'error',
        title: 'Rebuttal Blocked',
        description: transitionResult.message,
      });
      return;
    }

    const user = ROLE_USER_PROFILES[currentRole];
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newRebuttal: RebuttalRecord = {
      id: `REB-${Date.now().toString().slice(-4)}`,
      errorId,
      category,
      explanation: sanitizeText(explanation),
      evidence: evidenceFiles || [],
      submittedBy: user.name,
      submittedAt: dateStr,
      slaDeadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 16),
      status: 'Pending QA',
      discussions: [
        {
          id: `DISC-${Date.now()}`,
          author: user.name,
          authorRole: currentRole,
          message: sanitizeText(explanation),
          timestamp: dateStr,
        },
      ],
    };

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== errorId) return ev;
        const audit = logAudit({
          errorId,
          what: `Submitted Rebuttal: ${category}`,
          previousValue: ev.status,
          newValue: 'Rebuttal Pending',
          reason: explanation.substring(0, 80) + '...',
        });
        return {
          ...ev,
          status: 'Rebuttal Pending',
          rebuttal: newRebuttal,
          history: [audit, ...(ev.history || [])],
        };
      })
    );

    // Add actionable notification
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        title: `Dispute Filed for ${errorId}`,
        message: `${user.name} submitted a rebuttal (${category}). QA response due within 24h.`,
        timestamp: 'Just now',
        read: false,
        type: 'rebuttal',
        linkId: errorId,
      },
      ...prev,
    ]);

    addToast({
      type: 'info',
      title: 'Rebuttal Submitted',
      description: 'The quality finding is now locked for QA Review.',
    });
  };

  const resolveRebuttal = (
    errorId: string,
    decision: 'Accept Error' | 'Overturn' | 'Partially Accept' | 'Escalate',
    rationale: string
  ) => {
    const auth = authorizeAction(currentRole, 'RESOLVE_REBUTTAL');
    if (!auth.authorized) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: auth.reason || 'You are not authorized to adjudicate disputes.',
      });
      return;
    }

    const ev = events.find((e) => e.id === errorId);
    if (!ev) return;

    let nextStatus: QualityEvent['status'] = 'Upheld';
    if (decision === 'Overturn') nextStatus = 'Overturned';
    else if (decision === 'Escalate') nextStatus = 'Escalated';
    else if (decision === 'Partially Accept') nextStatus = 'Corrective Action';

    const transitionCheck = validateStateTransition(ev, nextStatus, currentRole);
    if (!transitionCheck.valid) {
      addToast({
        type: 'error',
        title: 'Decision Blocked',
        description: transitionCheck.message,
      });
      return;
    }

    const user = ROLE_USER_PROFILES[currentRole];
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== errorId) return ev;

        const updatedRebuttal: RebuttalRecord | undefined = ev.rebuttal
          ? {
              ...ev.rebuttal,
              status: decision === 'Overturn' ? 'Overturned' : decision === 'Escalate' ? 'Escalated' : 'Upheld',
              qaResponse: {
                assessedBy: user.name,
                assessedAt: dateStr,
                decision,
                assessmentRationale: rationale,
                applicableSOP: ev.sopId,
              },
              discussions: [
                ...(ev.rebuttal.discussions || []),
                {
                  id: `DISC-${Date.now()}`,
                  author: user.name,
                  authorRole: currentRole,
                  message: `[QA DECISION: ${decision.toUpperCase()}] ${rationale}`,
                  timestamp: dateStr,
                },
              ],
            }
          : undefined;

        const audit = logAudit({
          errorId,
          what: `QA Dispute Decision: ${decision}`,
          previousValue: ev.status,
          newValue: nextStatus,
          reason: rationale,
        });

        return {
          ...ev,
          status: nextStatus,
          rebuttal: updatedRebuttal,
          history: [audit, ...(ev.history || [])],
        };
      })
    );

    addToast({
      type: decision === 'Overturn' ? 'warning' : 'success',
      title: `Dispute Decision: ${decision}`,
      description: `Record ${errorId} transition completed to status ${nextStatus}.`,
    });
  };

  const saveRCA = (errorId: string, rcaData: RootCauseAnalysis) => {
    const auth = authorizeAction(currentRole, 'PERFORM_RCA');
    if (!auth.authorized) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: auth.reason || 'Role not authorized to perform Root Cause Analysis.',
      });
      return;
    }

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== errorId) return ev;
        const audit = logAudit({
          errorId,
          what: `RCA Completed (${rcaData.primaryCategory})`,
          reason: `5 Whys analyzed with root cause ${rcaData.primaryCategory}`,
        });
        return {
          ...ev,
          rootCause: rcaData.primaryCategory,
          rca: rcaData,
          status: ev.status === 'Logged' || ev.status === 'Under Review' ? 'Corrective Action' : ev.status,
          history: [audit, ...(ev.history || [])],
        };
      })
    );

    addToast({
      type: 'success',
      title: 'Root Cause Analysis Saved',
      description: `Primary cause categorized as "${rcaData.primaryCategory}".`,
    });
  };

  const addCorrectiveAction = (errorId: string, actionData: Omit<CorrectiveAction, 'id' | 'errorId'>) => {
    const auth = authorizeAction(currentRole, 'CREATE_CAPA');
    if (!auth.authorized) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: auth.reason || 'Role not authorized to create CAPA items.',
      });
      return;
    }

    const newActionId = `CAPA-${Math.floor(Math.random() * 900) + 100}`;
    const newAction: CorrectiveAction = {
      ...actionData,
      title: sanitizeText(actionData.title),
      description: sanitizeText(actionData.description),
      id: newActionId,
      errorId,
    };

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== errorId) return ev;
        const audit = logAudit({
          errorId,
          what: `Created Corrective Action ${newActionId}`,
          newValue: actionData.title,
          reason: `Assigned to ${actionData.owner}`,
        });
        return {
          ...ev,
          status: 'Corrective Action',
          correctiveActions: [...(ev.correctiveActions || []), newAction],
          history: [audit, ...(ev.history || [])],
        };
      })
    );

    addToast({
      type: 'success',
      title: 'Corrective Action Added',
      description: `CAPA assigned to ${actionData.owner} (Due: ${actionData.dueDate}).`,
    });
  };

  const updateCorrectiveActionStatus = (
    errorId: string,
    actionId: string,
    status: CorrectiveAction['status'],
    notes?: string
  ) => {
    const auth = authorizeAction(currentRole, 'UPDATE_CAPA_STATUS');
    if (!auth.authorized) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: auth.reason || 'Role not authorized to update CAPA status.',
      });
      return;
    }

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== errorId) return ev;
        const updatedActions = (ev.correctiveActions || []).map((a) => {
          if (a.id !== actionId) return a;
          return {
            ...a,
            status,
            completionNotes: notes ? sanitizeText(notes) : a.completionNotes,
            completedAt: status === 'Completed' ? new Date().toISOString().substring(0, 16) : undefined,
          };
        });

        // If all actions completed, prompt effectiveness review
        const allDone = updatedActions.every((a) => a.status === 'Completed');

        const audit = logAudit({
          errorId,
          what: `CAPA ${actionId} Status changed to ${status}`,
          reason: notes || 'Status update',
        });

        return {
          ...ev,
          status: allDone ? 'Effectiveness Review' : ev.status,
          correctiveActions: updatedActions,
          history: [audit, ...(ev.history || [])],
        };
      })
    );

    addToast({
      type: 'info',
      title: `Action Status: ${status}`,
      description: `Action ${actionId} updated successfully.`,
    });
  };

  const submitEffectivenessReview = (
    errorId: string,
    reviewData: Omit<EffectivenessReview, 'id' | 'errorId'>
  ) => {
    const auth = authorizeAction(currentRole, 'SUBMIT_EFFECTIVENESS_REVIEW');
    if (!auth.authorized) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: auth.reason || 'Only QA Managers and Quality Governance can submit effectiveness reviews.',
      });
      return;
    }

    const ev = events.find((e) => e.id === errorId);
    if (!ev) return;

    const revId = `EFF-${Math.floor(Math.random() * 900) + 100}`;
    const newReview: EffectivenessReview = {
      ...reviewData,
      rationale: sanitizeText(reviewData.rationale),
      id: revId,
      errorId,
    };

    const nextStatus = reviewData.decision === 'Effective' ? 'Closed' : 'Under Review';
    const transitionCheck = validateStateTransition(
      { ...ev, effectiveness: newReview },
      nextStatus,
      currentRole
    );

    if (!transitionCheck.valid) {
      addToast({
        type: 'error',
        title: 'Effectiveness Transition Blocked',
        description: transitionCheck.message,
      });
      return;
    }

    setEvents((prev) =>
      prev.map((item) => {
        if (item.id !== errorId) return item;
        const audit = logAudit({
          errorId,
          what: `Effectiveness Review: ${reviewData.decision}`,
          previousValue: item.status,
          newValue: nextStatus,
          reason: reviewData.rationale,
        });

        return {
          ...item,
          status: nextStatus,
          effectiveness: newReview,
          history: [audit, ...(item.history || [])],
        };
      })
    );

    addToast({
      type: reviewData.decision === 'Effective' ? 'success' : 'warning',
      title: `Review Complete: ${reviewData.decision}`,
      description:
        reviewData.decision === 'Effective'
          ? `Quality event ${errorId} successfully closed with verified defect reduction.`
          : `Quality event ${errorId} reopened for secondary investigation.`,
    });
  };

  const addDiscussionMessage = (errorId: string, message: string) => {
    const user = ROLE_USER_PROFILES[currentRole];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== errorId || !ev.rebuttal) return ev;
        return {
          ...ev,
          rebuttal: {
            ...ev.rebuttal,
            discussions: [
              ...(ev.rebuttal.discussions || []),
              {
                id: `DISC-${Date.now()}`,
                author: user.name,
                authorRole: currentRole,
                message,
                timestamp,
              },
            ],
          },
        };
      })
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const bulkAssign = (errorIds: string[], newOwner: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (!errorIds.includes(ev.id)) return ev;
        return {
          ...ev,
          owner: newOwner,
        };
      })
    );
    addToast({
      type: 'success',
      title: 'Bulk Assignment Complete',
      description: `Assigned ${errorIds.length} events to ${newOwner}.`,
    });
  };

  const bulkUpdateStatus = (errorIds: string[], newStatus: QualityEvent['status']) => {
    let updatedCount = 0;
    let blockedCount = 0;

    setEvents((prev) =>
      prev.map((ev) => {
        if (!errorIds.includes(ev.id)) return ev;

        const check = validateStateTransition(ev, newStatus, currentRole);
        if (!check.valid) {
          blockedCount++;
          return ev;
        }

        updatedCount++;
        const audit = logAudit({
          errorId: ev.id,
          what: `Bulk Status Transition to ${newStatus}`,
          previousValue: ev.status,
          newValue: newStatus,
          reason: 'Bulk operation',
        });

        return {
          ...ev,
          status: newStatus,
          history: [audit, ...(ev.history || [])],
        };
      })
    );

    if (updatedCount > 0) {
      addToast({
        type: 'success',
        title: 'Bulk Status Updated',
        description: `Successfully moved ${updatedCount} event(s) to "${newStatus}".`,
      });
    }

    if (blockedCount > 0) {
      addToast({
        type: 'warning',
        title: 'Some Transitions Blocked',
        description: `${blockedCount} event(s) could not transition to "${newStatus}" due to workflow prerequisite rules.`,
      });
    }
  };

  const canTransitionStatus = (event: QualityEvent, targetStatus: QualityStatus) => {
    const res = validateStateTransition(event, targetStatus, currentRole);
    return { valid: res.valid, message: res.message };
  };

  const getNextStatuses = (event: QualityEvent): QualityStatus[] => {
    return getAvailableNextStatuses(event, currentRole);
  };

  const resetDemoData = () => {
    const fresh = generateInitialEvents();
    setEvents(fresh);
    setCalibrations(INITIAL_CALIBRATION_SESSIONS);
    setNotifications(INITIAL_NOTIFICATIONS);
    localStorage.removeItem('qems_events_v2');
    localStorage.removeItem('qems_calibrations_v2');
    localStorage.removeItem('qems_notifications_v2');
    setSelectedEventId('QEMS-2026-001284');
    addToast({
      type: 'info',
      title: 'Demo Environment Reset',
      description: 'Restored 160 baseline quality records, calibrations, and active rebuttals.',
    });
  };

  return (
    <QEMSContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        currentUser: ROLE_USER_PROFILES[currentRole] || ROLE_USER_PROFILES['QA Manager'],
        hasPermission,
        theme,
        setTheme,
        toggleTheme,
        density,
        setDensity,
        toggleDensity,
        activeSavedView,
        setActiveSavedView,
        paretoDrillDownCategory,
        setParetoDrillDownCategory,
        activeSection,
        setActiveSection,
        selectedEventId,
        setSelectedEventId,
        events,
        calibrations,
        slaPolicies,
        notifications,
        toasts,
        addToast,
        removeToast,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isAiDrawerOpen,
        setIsAiDrawerOpen,
        isNewErrorModalOpen,
        setIsNewErrorModalOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        isLoginModalOpen,
        setIsLoginModalOpen,
        searchQuery,
        setSearchQuery,
        auditTrail,
        addQualityEvent,
        updateQualityEvent,
        submitRebuttal,
        resolveRebuttal,
        saveRCA,
        addCorrectiveAction,
        updateCorrectiveActionStatus,
        submitEffectivenessReview,
        addDiscussionMessage,
        markNotificationRead,
        markAllNotificationsRead,
        bulkAssign,
        bulkUpdateStatus,
        updateEventStatus,
        resetDemoData,
        canTransitionStatus,
        getNextStatuses,
      }}
    >
      {children}
    </QEMSContext.Provider>
  );
};

export const useQEMS = () => {
  const context = useContext(QEMSContext);
  if (!context) {
    throw new Error('useQEMS must be used within a QEMSProvider');
  }
  return context;
};
