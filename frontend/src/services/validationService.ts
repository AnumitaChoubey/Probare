import {
  QualityEvent,
  RootCauseAnalysis,
  CorrectiveAction,
  EffectivenessReview,
  Severity,
} from '../types';
import { sanitizeText } from './securityService';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateQualityEventInput(data: Partial<QualityEvent>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title || sanitizeText(data.title).length < 6) {
    errors.title = 'Title is required and must be at least 6 characters.';
  }

  if (!data.employee || sanitizeText(data.employee).length < 2) {
    errors.employee = 'Employee name is required.';
  }

  if (!data.employeeId || sanitizeText(data.employeeId).length < 3) {
    errors.employeeId = 'Employee ID is required (e.g. EMP-1049).';
  }

  if (!data.processArea) {
    errors.processArea = 'Process Area is mandatory.';
  }

  if (!data.sopId || sanitizeText(data.sopId).length < 3) {
    errors.sopId = 'Applicable SOP ID is mandatory (e.g. SOP-PAY-014).';
  }

  const validSeverities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  if (!data.severity || !validSeverities.includes(data.severity)) {
    errors.severity = 'Valid severity level is required (CRITICAL, HIGH, MEDIUM, LOW).';
  }

  if (!data.description || sanitizeText(data.description).length < 15) {
    errors.description = 'Operational error description must be at least 15 characters.';
  }

  if (!data.customerImpact || sanitizeText(data.customerImpact).length < 5) {
    errors.customerImpact = 'Customer/Business impact assessment is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRebuttalInput(data: {
  category?: string;
  explanation?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.category) {
    errors.category = 'Dispute category is mandatory.';
  }

  const cleanExplanation = sanitizeText(data.explanation || '');
  if (!cleanExplanation || cleanExplanation.length < 20) {
    errors.explanation = 'Dispute explanation must be at least 20 characters documenting specific facts.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRcaInput(data: Partial<RootCauseAnalysis>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.primaryCategory) {
    errors.primaryCategory = 'Primary Root Cause category is required.';
  }

  if (!data.fiveWhys || !Array.isArray(data.fiveWhys) || data.fiveWhys.length < 3) {
    errors.fiveWhys = 'At least 3 recursive "Why" questions and answers are required for 5 Whys compliance.';
  } else {
    data.fiveWhys.forEach((why, idx) => {
      if (!why.answer || sanitizeText(why.answer).trim().length < 5) {
        errors[`fiveWhys_${idx}`] = `Answer for Why #${idx + 1} must be provided.`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCapaInput(data: Partial<CorrectiveAction>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title || sanitizeText(data.title).length < 5) {
    errors.title = 'CAPA title must be at least 5 characters.';
  }

  if (!data.description || sanitizeText(data.description).length < 15) {
    errors.description = 'Action item specification must be at least 15 characters.';
  }

  if (!data.owner || sanitizeText(data.owner).length < 2) {
    errors.owner = 'Assigned action owner is mandatory.';
  }

  if (!data.dueDate) {
    errors.dueDate = 'Target completion due date is mandatory.';
  } else {
    const parsed = new Date(data.dueDate);
    if (isNaN(parsed.getTime())) {
      errors.dueDate = 'Due date must be a valid date.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateEffectivenessInput(data: Partial<EffectivenessReview>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.decision) {
    errors.decision = 'Audit effectiveness decision is mandatory (Effective, Partially Effective, Not Effective).';
  }

  if (typeof data.errorRateBefore !== 'number' || data.errorRateBefore < 0) {
    errors.errorRateBefore = 'Pre-CAPA error rate must be a valid non-negative number.';
  }

  if (typeof data.errorRateAfter !== 'number' || data.errorRateAfter < 0) {
    errors.errorRateAfter = 'Post-CAPA error rate must be a valid non-negative number.';
  }

  if (!data.rationale || sanitizeText(data.rationale).length < 15) {
    errors.rationale = 'Audit rationale and statistical methodology must be at least 15 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
