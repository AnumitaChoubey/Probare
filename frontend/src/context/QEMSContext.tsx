import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QualityEvent, QualityStatus, UserRole, CalibrationSession, SLAPolicy,
  NotificationItem, AuditEvent, RebuttalRecord, RootCauseAnalysis,
  CorrectiveAction, EffectivenessReview, DisputeCategory, AppTheme,
  AppDensity, SavedViewType, RolePermissions
} from '../types';
import { authApi, eventsApi, evidenceApi, rebuttalsApi, rcaApi, capaApi, effectivenessApi, notificationsApi, calibrationsApi } from '../services/api';
import { setActiveProjectId } from '../services/api/client';

export type NavSection = 'COMMAND CENTER' | 'MY WORK' | 'QUALITY EVENTS' | 'NEW ERROR' | 'DISPUTE CENTER' | 'EVIDENCE' | 'ROOT CAUSE' | 'CORRECTIVE ACTIONS' | 'CAPA' | 'CALIBRATION' | 'QUALITY INTELLIGENCE' | 'REPORTS' | 'ADMINISTRATION';

export interface ToastMessage {
  id: string; type: 'success' | 'info' | 'warning' | 'error'; title: string; description?: string; message?: string;
}

// The backend is the source of truth for all role permissions.
// Role-based visibility is driven by sessionData.permissions.

interface QEMSContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: { name: string; email: string; team: string; avatar: string };
  sessionData: any;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  theme: AppTheme; setTheme: (theme: AppTheme) => void; toggleTheme: () => void;
  activeSavedView: SavedViewType; setActiveSavedView: (view: SavedViewType) => void;
  paretoDrillDownCategory: string | null; setParetoDrillDownCategory: (category: string | null) => void;
  activeSection: NavSection; setActiveSection: (section: NavSection) => void;
  selectedEventId: string | null; setSelectedEventId: (id: string | null) => void;
  events: QualityEvent[];
  calibrations: CalibrationSession[];
  slaPolicies: SLAPolicy[];
  notifications: NotificationItem[];
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  isCommandPaletteOpen: boolean; setIsCommandPaletteOpen: (open: boolean) => void;
  isAiDrawerOpen: boolean; setIsAiDrawerOpen: (open: boolean) => void;
  isNewErrorModalOpen: boolean; setIsNewErrorModalOpen: (open: boolean) => void;
  isProfileModalOpen: boolean; setIsProfileModalOpen: (open: boolean) => void;
  isLoginModalOpen: boolean; setIsLoginModalOpen: (open: boolean) => void;
  searchQuery: string; setSearchQuery: (query: string) => void;
  auditTrail: AuditEvent[];

  // Async Mutations
  addQualityEvent: (event: Omit<QualityEvent, 'id' | 'date' | 'history'>) => Promise<QualityEvent>;
  updateQualityEvent: (id: string, updates: Partial<QualityEvent>, auditReason?: string) => Promise<boolean>;
  submitRebuttal: (errorId: string, category: DisputeCategory, explanation: string, evidenceFiles: any[]) => Promise<void>;
  resolveRebuttal: (errorId: string, decision: 'Accept Error' | 'Overturn' | 'Partially Accept' | 'Escalate', rationale: string) => Promise<void>;
  saveRCA: (errorId: string, rca: RootCauseAnalysis) => Promise<void>;
  addCorrectiveAction: (errorId: string, action: Omit<CorrectiveAction, 'id' | 'errorId'>) => Promise<void>;
  updateCorrectiveActionStatus: (errorId: string, actionId: string, status: CorrectiveAction['status'], notes?: string) => Promise<void>;
  submitEffectivenessReview: (errorId: string, review: Omit<EffectivenessReview, 'id' | 'errorId'>) => Promise<void>;
  addDiscussionMessage: (errorId: string, message: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  bulkAssign: (errorIds: string[], newOwner: string) => Promise<void>;
  bulkUpdateStatus: (errorIds: string[], newStatus: QualityEvent['status']) => Promise<void>;
  updateEventStatus?: (id: string, status: QualityStatus) => Promise<void>;
  resetDemoData: () => void;
  canTransitionStatus: (event: QualityEvent, targetStatus: QualityStatus) => { valid: boolean; message: string };
  getNextStatuses: (event: QualityEvent) => QualityStatus[];
}

const QEMSContext = createContext<QEMSContextType | undefined>(undefined);

// Legacy workflow helper preserved ONLY for frontend UI rendering logic.
// Actual transitions MUST be validated and authorized by the backend API.
const getNextStatuses = (event: QualityEvent): QualityStatus[] => {
  return ['Logged', 'Under Review', 'Rebuttal Pending', 'QA Review', 'Escalated', 'Manager Review', 'Overturned', 'Upheld', 'Corrective Action', 'Effectiveness Review', 'Closed'];
};

const validateStateTransition = (event: QualityEvent, targetStatus: QualityStatus) => {
  return { valid: true, message: 'Valid' };
};

export const QEMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: sessionData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    retry: false
  });

  useEffect(() => {
    if (sessionData && sessionData.accessible_projects?.length > 0) {
      setActiveProjectId(sessionData.accessible_projects[0]);
    }
  }, [sessionData]);

  const [currentRole, setCurrentRole] = useState<UserRole>('QA Manager');

  const getRoleFilters = (_role: UserRole) => {
    // All filtering is handled client-side for performance.
    // Backend returns all events the user has access to via project membership.
    return {};
  };

  // Data fetching
  const { data: events = [] } = useQuery({ 
    queryKey: ['events', currentRole], 
    queryFn: () => eventsApi.getEvents(getRoleFilters(currentRole)), 
    refetchInterval: 60000 
  });
  const { data: calibrations = [] } = useQuery({ queryKey: ['calibrations'], queryFn: calibrationsApi.getCalibrations });
  const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.getNotifications, refetchInterval: 30000 });

  const [activeSection, setActiveSection] = useState<NavSection>('COMMAND CENTER');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Modals & UI state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isNewErrorModalOpen, setIsNewErrorModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeSavedView, setActiveSavedView] = useState<SavedViewType>('ALL');
  const [paretoDrillDownCategory, setParetoDrillDownCategory] = useState<string | null>(null);

  const [theme, setTheme] = useState<AppTheme>('light');

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => { /* Disabled */ };

  const hasPermission = (permission: keyof RolePermissions | string): boolean => {
    if (!sessionData?.permissions) return false;
    // Map frontend camelCase permission checks to backend SNAKE_CASE permissions if necessary,
    // or rely on explicit backend strings.
    return sessionData.permissions.includes(permission as string);
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}`;
    const normalized: ToastMessage = { id, type: toast.type || 'info', title: toast.title || 'Notification', description: toast.description || toast.message || '' };
    setToasts(prev => [...prev.slice(-4), normalized]);
    if (window.qems?.notifications) window.qems.notifications.show(normalized.title, normalized.description || '');
    setTimeout(() => removeToast(id), 4500);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: eventsApi.createEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<QualityEvent> }) => eventsApi.updateEvent(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, version }: { id: string, status: QualityStatus, version: number }) => eventsApi.updateStatus(id, status, version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const rebuttalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => rebuttalsApi.submitRebuttal(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const resolveRebuttalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => rebuttalsApi.resolveRebuttal(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const rcaMutation = useMutation({
    mutationFn: ({ id, rca }: { id: string, rca: RootCauseAnalysis }) => rcaApi.saveRCA(id, rca),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const capaCreateMutation = useMutation({
    mutationFn: ({ id, capa }: { id: string, capa: any }) => capaApi.addCorrectiveAction(id, capa),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const capaUpdateMutation = useMutation({
    mutationFn: ({ actionId, status, notes }: { actionId: string, status: string, notes?: string }) => capaApi.updateCorrectiveActionStatus(actionId, status, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const effReviewMutation = useMutation({
    mutationFn: ({ id, review }: { id: string, review: any }) => effectivenessApi.submitEffectivenessReview(id, review),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const addQualityEvent = async (data: any) => {
    const res = await createEventMutation.mutateAsync(data);
    addToast({ type: 'success', title: `Event Created`, description: `Quality error logged.` });
    return res;
  };

  const updateQualityEvent = async (id: string, updates: Partial<QualityEvent>) => {
    await updateEventMutation.mutateAsync({ id, data: updates });
    return true;
  };

  const updateEventStatus = async (id: string, status: QualityStatus) => {
    const event = events.find(e => e.id === id);
    await statusMutation.mutateAsync({ id, status, version: event?.version || 1 });
  };

  const submitRebuttal = async (errorId: string, category: DisputeCategory, explanation: string, evidenceFiles: any[]) => {
    await rebuttalMutation.mutateAsync({ id: errorId, data: { category, explanation, evidenceFiles } });
    addToast({ type: 'info', title: 'Rebuttal Submitted' });
  };

  const resolveRebuttal = async (errorId: string, decision: any, rationale: string) => {
    const event = events.find(e => e.id === errorId);
    await resolveRebuttalMutation.mutateAsync({ id: errorId, data: { decision, rationale, expected_version: event?.version || 1 } });
    addToast({ type: 'success', title: 'Rebuttal Resolved' });
  };

  const saveRCA = async (errorId: string, rca: RootCauseAnalysis) => {
    await rcaMutation.mutateAsync({ id: errorId, rca });
    addToast({ type: 'success', title: 'RCA Saved' });
  };

  const addCorrectiveAction = async (errorId: string, action: any) => {
    await capaCreateMutation.mutateAsync({ id: errorId, capa: action });
    addToast({ type: 'success', title: 'CAPA Added' });
  };

  const updateCorrectiveActionStatus = async (errorId: string, actionId: string, status: string, notes?: string) => {
    await capaUpdateMutation.mutateAsync({ actionId, status, notes });
  };

  const submitEffectivenessReview = async (errorId: string, review: any) => {
    await effReviewMutation.mutateAsync({ id: errorId, review });
    addToast({ type: 'success', title: 'Effectiveness Review Logged' });
  };

  const addDiscussionMessage = async (errorId: string, message: string) => {
    console.warn("Discussions API not yet implemented in backend");
  };

  const markNotificationRead = async (id: string) => {
    await notificationsApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllNotificationsRead = async () => {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const bulkAssign = async (errorIds: string[], newOwner: string) => {
    for (const id of errorIds) await updateEventMutation.mutateAsync({ id, data: { owner: newOwner } });
    addToast({ type: 'success', title: 'Bulk Assignment Complete' });
  };

  const bulkUpdateStatus = async (errorIds: string[], newStatus: QualityStatus) => {
    for (const id of errorIds) {
      const event = events.find(e => e.id === id);
      await statusMutation.mutateAsync({ id, status: newStatus, version: event?.version || 1 });
    }
    addToast({ type: 'success', title: 'Bulk Status Update Complete' });
  };

  const resetDemoData = () => { console.warn("Reset disabled in production context."); };

  const currentUser = {
    name: sessionData?.user_name || sessionData?.qems_user_id || 'System User',
    email: sessionData?.user_email || 'user@qems.internal',
    team: sessionData?.roles?.[0] || 'Operations',
    avatar: (sessionData?.user_name || 'SU').substring(0, 2).toUpperCase()
  };

  return (
    <QEMSContext.Provider value={{
      currentRole, setCurrentRole, currentUser, sessionData, hasPermission,
      theme, setTheme, toggleTheme,
      activeSavedView, setActiveSavedView, paretoDrillDownCategory, setParetoDrillDownCategory,
      activeSection, setActiveSection, selectedEventId, setSelectedEventId,
      events, calibrations, slaPolicies: [], notifications, toasts, addToast, removeToast,
      isCommandPaletteOpen, setIsCommandPaletteOpen, isAiDrawerOpen, setIsAiDrawerOpen,
      isNewErrorModalOpen, setIsNewErrorModalOpen, isProfileModalOpen, setIsProfileModalOpen,
      isLoginModalOpen, setIsLoginModalOpen, searchQuery, setSearchQuery, auditTrail: [],
      addQualityEvent, updateQualityEvent, updateEventStatus, submitRebuttal, resolveRebuttal,
      saveRCA, addCorrectiveAction, updateCorrectiveActionStatus, submitEffectivenessReview,
      addDiscussionMessage, markNotificationRead, markAllNotificationsRead, bulkAssign, bulkUpdateStatus,
      resetDemoData, canTransitionStatus: validateStateTransition, getNextStatuses
    }}>
      {children}
    </QEMSContext.Provider>
  );
};

export const useQEMS = () => {
  const context = useContext(QEMSContext);
  if (!context) throw new Error('useQEMS must be used within QEMSProvider');
  return context;
};
