import { QualityEvent, QualityStatus, UserRole } from '../types';

/**
 * Enterprise QEMS Workflow Finite State Machine
 *
 * Strict Lifecycle:
 * Draft → Logged → Under Review / QA Review → Rebuttal Pending → Decision (Upheld / Overturned / Partially Accept)
 * → Root Cause Analysis (RCA) → Corrective Action (CAPA) → Effectiveness Review → Closed
 */

export const ALLOWED_STATUS_TRANSITIONS: Record<QualityStatus, QualityStatus[]> = {
  Draft: ['Logged'],
  Logged: ['Under Review', 'QA Review', 'Rebuttal Pending'],
  'Under Review': ['QA Review', 'Upheld', 'Rebuttal Pending', 'Overturned'],
  'QA Review': ['Upheld', 'Rebuttal Pending', 'Escalated', 'Overturned', 'Corrective Action'],
  'Rebuttal Pending': ['Under Review', 'QA Review', 'Upheld', 'Overturned', 'Escalated', 'Corrective Action'],
  Escalated: ['Manager Review', 'Upheld', 'Overturned', 'Corrective Action'],
  'Manager Review': ['Upheld', 'Overturned', 'Corrective Action'],
  Overturned: ['Closed'],
  Upheld: ['Corrective Action'], // RCA must be satisfied before CAPA
  'Corrective Action': ['Effectiveness Review', 'Under Review'],
  'Effectiveness Review': ['Closed', 'Under Review', 'Corrective Action'],
  Closed: ['Under Review'], // Reopening permitted only under Quality Governance audit
};

export interface TransitionValidationResult {
  valid: boolean;
  code: 'OK' | 'INVALID_TRANSITION' | 'PREREQUISITE_FAILED' | 'UNAUTHORIZED' | 'DATA_INCOMPLETE';
  message: string;
}

/**
 * Validates whether a Quality Event can legally transition from its current status
 * to target status according to ISO 9001 / Six Sigma Quality Compliance rules.
 */
export function validateStateTransition(
  event: QualityEvent,
  targetStatus: QualityStatus,
  actorRole: UserRole,
  actorName?: string
): TransitionValidationResult {
  const currentStatus = event.status;

  // 1. Same status is a no-op / valid update
  if (currentStatus === targetStatus) {
    return { valid: true, code: 'OK', message: 'No status change required.' };
  }

  // 2. Check transition graph
  const allowedTargets = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    return {
      valid: false,
      code: 'INVALID_TRANSITION',
      message: `Invalid workflow transition: Cannot transition from "${currentStatus}" to "${targetStatus}". Permitted next states: [${allowedTargets.join(', ')}]`,
    };
  }

  // 3. Role authorization checks for sensitive transitions
  if (targetStatus === 'Closed') {
    const canClose = [
      'QA Manager',
      'Quality Governance',
      'Executive / Leadership',
      'System Administrator',
      'Administrator',
    ].includes(actorRole);

    if (!canClose) {
      return {
        valid: false,
        code: 'UNAUTHORIZED',
        message: `Role "${actorRole}" is not authorized to finalize and close quality records. Requires QA Manager or Quality Governance.`,
      };
    }
  }

  if (targetStatus === 'Overturned') {
    const canOverturn = [
      'QA Auditor',
      'QA Reviewer',
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ].includes(actorRole);

    if (!canOverturn) {
      return {
        valid: false,
        code: 'UNAUTHORIZED',
        message: `Role "${actorRole}" cannot overturn a quality finding. Requires QA or Governance review.`,
      };
    }
  }

  if (currentStatus === 'Closed' && targetStatus === 'Under Review') {
    const canReopen = [
      'Quality Governance',
      'QA Manager',
      'System Administrator',
      'Administrator',
    ].includes(actorRole);

    if (!canReopen) {
      return {
        valid: false,
        code: 'UNAUTHORIZED',
        message: 'Only Quality Governance, QA Managers, or Administrators can reopen a closed quality record.',
      };
    }
  }

  // 4. Business logic prerequisite gates
  // Rule A: Transitioning to Closed from Effectiveness Review requires 'Effective' verdict
  if (targetStatus === 'Closed' && currentStatus === 'Effectiveness Review') {
    if (!event.effectiveness) {
      return {
        valid: false,
        code: 'PREREQUISITE_FAILED',
        message: 'Cannot close event: Effectiveness Review has not been conducted.',
      };
    }
    if (event.effectiveness.decision !== 'Effective') {
      return {
        valid: false,
        code: 'PREREQUISITE_FAILED',
        message: `Cannot close event: Effectiveness decision was "${event.effectiveness.decision}". Only verified "Effective" events can be closed. Reopen for secondary investigation instead.`,
      };
    }
  }

  // Rule B: Transitioning from Corrective Action to Effectiveness Review requires all CAPAs to be Completed
  if (targetStatus === 'Effectiveness Review') {
    const actions = event.correctiveActions || [];
    if (actions.length === 0) {
      return {
        valid: false,
        code: 'PREREQUISITE_FAILED',
        message: 'Cannot initiate Effectiveness Review without at least one assigned Corrective Action (CAPA).',
      };
    }
    const pendingActions = actions.filter((a) => a.status !== 'Completed');
    if (pendingActions.length > 0) {
      return {
        valid: false,
        code: 'PREREQUISITE_FAILED',
        message: `Cannot proceed to Effectiveness Review: ${pendingActions.length} corrective action(s) remain incomplete. All CAPAs must be marked "Completed".`,
      };
    }
  }

  // Rule C: Transitioning to Corrective Action from Upheld/Partially Accepted requires RCA
  if (targetStatus === 'Corrective Action' && (currentStatus === 'Upheld' || currentStatus === 'Under Review')) {
    if (!event.rca && !event.rootCause) {
      return {
        valid: false,
        code: 'PREREQUISITE_FAILED',
        message: 'Root Cause Analysis (RCA) must be documented before initiating Corrective and Preventative Actions (CAPA).',
      };
    }
  }

  return {
    valid: true,
    code: 'OK',
    message: `Transition from "${currentStatus}" to "${targetStatus}" approved.`,
  };
}

/**
 * Returns allowed next statuses for an event given its current state and user role
 */
export function getAvailableNextStatuses(event: QualityEvent, role: UserRole): QualityStatus[] {
  const possible = ALLOWED_STATUS_TRANSITIONS[event.status] || [];
  return possible.filter((target) => validateStateTransition(event, target, role).valid);
}
