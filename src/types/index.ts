export type UserRole =
  | 'Frontline Employee'
  | 'QA Auditor'
  | 'QA Reviewer'
  | 'Team Lead'
  | 'QA Manager'
  | 'Quality Governance'
  | 'Executive / Leadership'
  | 'System Administrator'
  | 'Administrator';

export type AppTheme = 'light' | 'dark';
export type AppDensity = 'comfortable' | 'compact';

export type SavedViewType =
  | 'ALL'
  | 'MY_OPEN'
  | 'SLA_RISK'
  | 'CRITICAL'
  | 'PENDING_REBUTTALS'
  | 'MY_TEAM'
  | 'UNASSIGNED';

export interface RolePermissions {
  canCreateEvent: boolean;
  canEditEvent: boolean;
  canSubmitRebuttal: boolean;
  canReviewRebuttal: boolean;
  canEscalate: boolean;
  canPerformRCA: boolean;
  canCreateCAPA: boolean;
  canReviewEffectiveness: boolean;
  canCalibrate: boolean;
  canViewAllTeams: boolean;
  canViewExecutiveAnalytics: boolean;
  canExportAuditPackage: boolean;
  canManageSettings: boolean;
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type QualityStatus =
  | 'Draft'
  | 'Logged'
  | 'Under Review'
  | 'Rebuttal Pending'
  | 'QA Review'
  | 'Escalated'
  | 'Manager Review'
  | 'Overturned'
  | 'Upheld'
  | 'Corrective Action'
  | 'Effectiveness Review'
  | 'Closed';

export type SLAStatus = 'On Track' | 'Warning' | 'At Risk' | 'Breached' | 'Escalated';

export interface EvidenceItem {
  id: string;
  title: string;
  type: 'screenshot' | 'image' | 'pdf' | 'audio' | 'video' | 'document' | 'link';
  fileName: string;
  fileSize: string;
  fileUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  description: string;
  duration?: string; // For audio/video, e.g. "04:12"
  highlightTimestamp?: string;
}

export type DisputeCategory =
  | 'Evidence Misinterpreted'
  | 'SOP Ambiguous'
  | 'System Issue'
  | 'Process Issue'
  | 'Customer Exception'
  | 'Training Gap'
  | 'Other';

export interface DiscussionThread {
  id: string;
  author: string;
  authorRole: string;
  authorAvatar?: string;
  message: string;
  timestamp: string;
  isInternalOnly?: boolean;
}

export interface RebuttalRecord {
  id: string;
  errorId: string;
  category: DisputeCategory;
  explanation: string;
  evidence: EvidenceItem[];
  submittedBy: string;
  submittedAt: string;
  slaDeadline: string;
  status: 'Pending QA' | 'Under Discussion' | 'Upheld' | 'Overturned' | 'Partially Accepted' | 'Escalated';
  qaResponse?: {
    assessedBy: string;
    assessedAt: string;
    decision: 'Accept Error' | 'Overturn' | 'Partially Accept' | 'Escalate';
    assessmentRationale: string;
    applicableSOP: string;
  };
  discussions: DiscussionThread[];
}

export type FishboneCategory =
  | 'People'
  | 'Process'
  | 'System'
  | 'Environment'
  | 'Management'
  | 'Material'
  | 'people'
  | 'process'
  | 'system'
  | 'training'
  | 'environment'
  | 'measurement';

export interface FiveWhysStep {
  step: number;
  question: string;
  answer: string;
}

export interface RootCauseAnalysis {
  errorId: string;
  problemStatement?: string;
  fiveWhys: FiveWhysStep[];
  fishbone?: {
    people: string[];
    process: string[];
    system: string[];
    training: string[];
    environment: string[];
    measurement: string[];
  };
  fishboneCategory?: string;
  recurrenceRisk?: string;
  preventativeMeasure?: string;
  primaryCategory: string;
  contributingFactors: string[];
  confidence?: 'High' | 'Medium' | 'Low';
  completedBy: string;
  completedAt: string;
  linkedActionIds?: string[];
}

export type ActionStatus = 'Not Started' | 'In Progress' | 'Blocked' | 'Completed' | 'Overdue' | 'Open';

export interface CorrectiveAction {
  id: string;
  errorId: string;
  title: string;
  description: string;
  owner: string;
  ownerRole: string;
  priority: Severity;
  dueDate: string;
  status: ActionStatus;
  type?: string;
  verificationMethod?: string;
  evidenceRequired: string[];
  completionNotes?: string;
  completedAt?: string;
}

export interface EffectivenessReview {
  id: string;
  errorId: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewer?: string; // alias for reviewedBy
  completedDate?: string; // alias for reviewedAt
  errorRateBefore: number; // e.g. 8.4
  errorRateAfter: number; // e.g. 2.1
  recurrenceRate: number; // e.g. 1.2
  comparisonPeriod: string; // e.g. "30-Day Post-CAPA Window"
  supportingEvidence: string;
  metricsObserved?: string;
  decision: 'Effective' | 'Partially Effective' | 'Not Effective';
  rationale: string;
}

export interface AuditEvent {
  id: string;
  errorId?: string;
  who: string;
  role: string;
  what: string;
  when: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
}

export interface QualityEvent {
  id: string; // e.g. "QEMS-2026-001284"
  title: string;
  date: string;
  employee: string;
  employeeId: string;
  employeeRole?: string;
  team: string;
  processArea: string;
  subCategory: string;
  errorType: string;
  sopId: string;
  sopTitle: string;
  sopExcerpt?: string;
  severity: Severity;
  status: QualityStatus;
  owner: string;
  createdBy: string;
  description: string;
  customerImpact: string;
  financialImpact?: string;
  complianceImpact?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  transactionId?: string;
  customerId?: string;
  tenor?: string;
  slaDueDate: string;
  slaDeadline?: string; // alias for slaDueDate
  slaStatus: SLAStatus;
  slaHoursRemaining: number;
  rootCause?: string;
  evidence: EvidenceItem[];
  rebuttal?: RebuttalRecord;
  rca?: RootCauseAnalysis;
  correctiveActions: CorrectiveAction[];
  effectiveness?: EffectivenessReview;
  history: AuditEvent[];
}

export interface CalibrationParticipant {
  name: string;
  role: string;
  score?: number;
  submitted: boolean;
  notes?: string;
}

export interface CalibrationSession {
  id: string;
  title: string;
  scheduledDate: string;
  processArea: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  participants: CalibrationParticipant[];
  sampleCaseId: string;
  scoreVariance: number;
  finalCalibratedScore?: number;
  decisionRationale?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'action' | 'sla' | 'rebuttal' | 'escalation' | 'calibration' | 'review';
  linkId?: string;
}

export interface SLAPolicy {
  id: string;
  name: string;
  processArea: string;
  severity?: Severity | 'All';
  resolutionTargetHours?: number;
  escalationRule?: string;
  rebuttalWindowHours: number;
  qaResponseHours: number;
  escalationWindowHours: number;
  warningThresholdPercent: number;
}
