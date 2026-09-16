/**
 * QEMS Enterprise Production Readiness Test Suite
 * Covers:
 * 1. Security & Sanitization (XSS vectors, File Upload security, Path Traversal)
 * 2. Role-Based Access Control (RBAC Permissions Matrix)
 * 3. Workflow State Machine (State Transitions & Invariants)
 * 4. Data Validation (Event, Dispute, RCA 5 Whys, CAPA, Effectiveness)
 * 5. SLA Calculation & Boundary Conditions
 */

import {
  sanitizeText,
  validateUploadedFile,
  authorizeAction,
} from '../src/services/securityService';
import {
  validateStateTransition,
  getAvailableNextStatuses,
  ALLOWED_STATUS_TRANSITIONS,
} from '../src/services/workflowEngine';
import {
  validateQualityEventInput,
  validateRebuttalInput,
  validateRcaInput,
  validateCapaInput,
  validateEffectivenessInput,
} from '../src/services/validationService';
import { calculateSLA } from '../src/services/slaService';
import { QualityEvent, UserRole, QualityStatus } from '../src/types';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failedTests++;
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} (Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
    failedTests++;
  }
}

console.log('====================================================');
console.log('QEMS ENTERPRISE PRODUCTION READINESS VERIFICATION');
console.log('====================================================\n');

// ==========================================
// TEST SUITE 1: SECURITY & SANITIZATION
// ==========================================
console.log('--- SUITE 1: Security & Sanitization ---');

// 1.1 XSS Attack prevention
const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="steal()"/>Safe Content';
const cleaned = sanitizeText(maliciousInput);
assert(!cleaned.includes('<script>') && !cleaned.includes('onerror'), 'Strip executable script tags and handlers');
assert(cleaned.includes('Safe Content'), 'Preserve legitimate text content');

// 1.2 File Upload Validation
const validPdf = { name: 'audit_log.pdf', size: 1024 * 1024, type: 'application/pdf' };
assert(validateUploadedFile(validPdf).valid, 'Accept legitimate PDF attachment under size limit');

const dangerousExe = { name: 'malware.exe', size: 500, type: 'application/x-msdownload' };
assert(!validateUploadedFile(dangerousExe).valid, 'Reject executable file extension');

const pathTraversalFile = { name: '../../../etc/passwd.png', size: 500, type: 'image/png' };
assert(!validateUploadedFile(pathTraversalFile).valid, 'Block directory path traversal in file name');

const oversizeFile = { name: 'huge_evidence.pdf', size: 25 * 1024 * 1024, type: 'application/pdf' };
assert(!validateUploadedFile(oversizeFile).valid, 'Enforce 15MB file upload ceiling');

// ==========================================
// TEST SUITE 2: ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================
console.log('\n--- SUITE 2: RBAC Matrix Authorization ---');

// 2.1 Frontline Employee should NOT have permission to close events or adjudicate disputes
const employeeRebuttalAuth = authorizeAction('Frontline Employee', 'SUBMIT_REBUTTAL');
assert(employeeRebuttalAuth.authorized, 'Frontline Employee is permitted to submit rebuttals');

const employeeResolveAuth = authorizeAction('Frontline Employee', 'RESOLVE_REBUTTAL');
assert(!employeeResolveAuth.authorized, 'Frontline Employee is strictly denied dispute adjudication');

const employeeCloseAuth = authorizeAction('Frontline Employee', 'CLOSE_EVENT');
assert(!employeeCloseAuth.authorized, 'Frontline Employee cannot unilaterally close quality events');

// 2.2 QA Manager permissions
const qaManagerResolve = authorizeAction('QA Manager', 'RESOLVE_REBUTTAL');
assert(qaManagerResolve.authorized, 'QA Manager is authorized to adjudicate disputes');

const qaManagerEffectiveness = authorizeAction('QA Manager', 'SUBMIT_EFFECTIVENESS_REVIEW');
assert(qaManagerEffectiveness.authorized, 'QA Manager is authorized for effectiveness reviews');

// 2.3 System Administrator governance
const adminConfig = authorizeAction('System Administrator', 'SYSTEM_ADMIN');
assert(adminConfig.authorized, 'System Administrator has system administration access');

// ==========================================
// TEST SUITE 3: WORKFLOW STATE MACHINE
// ==========================================
console.log('\n--- SUITE 3: Workflow State Machine Transitions ---');

const baseEvent: QualityEvent = {
  id: 'QEMS-2026-TEST-001',
  date: '2026-03-10',
  employee: 'Test Employee',
  employeeId: 'EMP-9999',
  team: 'Claims Operations',
  title: 'Test Quality Event Finding',
  processArea: 'Payment Operations',
  subCategory: 'Dual Authorization',
  errorType: 'Authorization Bypass',
  sopTitle: 'Payment Verification Protocol',
  severity: 'HIGH',
  status: 'Draft',
  description: 'Operational deviation observed in manual checklist step.',
  customerImpact: 'Low customer exposure.',
  financialImpact: '$0',
  sopId: 'SOP-PAY-001',
  slaDueDate: '2026-03-20',
  slaStatus: 'On Track',
  slaHoursRemaining: 24,
  owner: 'QA Manager',
  createdBy: 'QA Auditor',
  evidence: [],
  correctiveActions: [],
  history: [],
};

// 3.1 Draft -> Logged (Valid)
const draftToLogged = validateStateTransition(baseEvent, 'Logged', 'QA Auditor');
assert(draftToLogged.valid, 'Transition Draft -> Logged is valid');

// 3.2 Draft -> Closed (INVALID: must follow workflow progression)
const draftToClosed = validateStateTransition(baseEvent, 'Closed', 'QA Manager');
assert(!draftToClosed.valid, 'Transition Draft -> Closed is strictly blocked');

// 3.3 Logged -> Rebuttal Pending (Valid)
const loggedEvent: QualityEvent = { ...baseEvent, status: 'Logged' };
const loggedToRebuttal = validateStateTransition(loggedEvent, 'Rebuttal Pending', 'Frontline Employee');
assert(loggedToRebuttal.valid, 'Transition Logged -> Rebuttal Pending is permitted');

// 3.4 Rebuttal Pending -> Closed (INVALID: Must be adjudicated first)
const rebuttalEvent: QualityEvent = { ...baseEvent, status: 'Rebuttal Pending' };
const rebuttalToClosed = validateStateTransition(rebuttalEvent, 'Closed', 'QA Manager');
assert(!rebuttalToClosed.valid, 'Transition Rebuttal Pending -> Closed without decision is blocked');

// 3.5 Rebuttal Pending -> Upheld / Overturned / Escalated
assert(validateStateTransition(rebuttalEvent, 'Upheld', 'QA Manager').valid, 'Rebuttal Pending -> Upheld is valid');
assert(validateStateTransition(rebuttalEvent, 'Overturned', 'QA Manager').valid, 'Rebuttal Pending -> Overturned is valid');
assert(validateStateTransition(rebuttalEvent, 'Escalated', 'QA Manager').valid, 'Rebuttal Pending -> Escalated is valid');

// 3.6 Effectiveness Review -> Closed (Requires valid effective decision)
const reviewEventWithoutData: QualityEvent = {
  ...baseEvent,
  status: 'Effectiveness Review',
};
assert(
  !validateStateTransition(reviewEventWithoutData, 'Closed', 'QA Manager').valid,
  'Effectiveness Review -> Closed blocked when review data is missing'
);

const reviewEventEffective: QualityEvent = {
  ...baseEvent,
  status: 'Effectiveness Review',
  effectiveness: {
    id: 'EFF-001',
    errorId: baseEvent.id,
    decision: 'Effective',
    reviewedAt: '2026-03-15',
    reviewedBy: 'Rachel Green',
    errorRateBefore: 4.2,
    errorRateAfter: 0.1,
    recurrenceRate: 0.0,
    comparisonPeriod: '30-Day Post-CAPA Window',
    supportingEvidence: 'DOC-VERIFY-001',
    rationale: 'Substantial defect reduction verified over 30 days sample.',
  },
};
assert(
  validateStateTransition(reviewEventEffective, 'Closed', 'QA Manager').valid,
  'Effectiveness Review -> Closed permitted when verified Effective'
);

// ==========================================
// TEST SUITE 4: DATA VALIDATION SERVICE
// ==========================================
console.log('\n--- SUITE 4: Data Validation Rules ---');

// 4.1 Quality Event validation
const invalidEvent = validateQualityEventInput({ title: 'Bad' });
assert(!invalidEvent.isValid, 'Reject incomplete quality event');
assert(Boolean(invalidEvent.errors.title), 'Flag title length error');
assert(Boolean(invalidEvent.errors.employee), 'Flag missing employee error');

const validEvent = validateQualityEventInput({
  title: 'Valid Error Classification Record',
  employee: 'Jane Doe',
  employeeId: 'EMP-1029',
  processArea: 'Claims Operations',
  sopId: 'SOP-CLM-012',
  severity: 'HIGH',
  description: 'Detailed description of quality observation during secondary validation audit.',
  customerImpact: 'Moderate delay in claim payout.',
});
assert(validEvent.isValid, 'Accept valid quality event input');

// 4.2 Rebuttal validation
const invalidRebuttal = validateRebuttalInput({ explanation: 'I disagree' });
assert(!invalidRebuttal.isValid, 'Reject frivolous rebuttal under 20 chars');

const validRebuttal = validateRebuttalInput({
  category: 'Process Ambiguity',
  explanation: 'The current SOP version 2.4 does not mandate secondary sign-off during weekend shifts.',
});
assert(validRebuttal.isValid, 'Accept substantive rebuttal explanation');

// 4.3 RCA 5 Whys validation
const incompleteRca = validateRcaInput({
  primaryCategory: 'System Error',
  fiveWhys: [{ step: 1, question: 'Why 1', answer: 'Done' }],
});
assert(!incompleteRca.isValid, 'Require at least 3 recursive Whys for root cause compliance');

// ==========================================
// TEST SUITE 5: SLA TIMERS & BOUNDARY TESTING
// ==========================================
console.log('\n--- SUITE 5: SLA Timers & Boundary Calculation ---');

const now = new Date('2026-03-16T12:00:00Z');

// 5.1 On Track (>12h)
const futureDueDate = new Date('2026-03-17T12:00:00Z').toISOString();
const slaOnTrack = calculateSLA(futureDueDate, now);
assertEqual(slaOnTrack.status, 'On Track', 'Calculate On Track SLA (>12h)');

// 5.2 Warning (4h - 12h)
const warningDueDate = new Date('2026-03-16T18:00:00Z').toISOString();
const slaWarning = calculateSLA(warningDueDate, now);
assertEqual(slaWarning.status, 'Warning', 'Calculate Warning SLA (6h)');

// 5.3 At Risk (0h - 4h)
const atRiskDueDate = new Date('2026-03-16T14:00:00Z').toISOString();
const slaAtRisk = calculateSLA(atRiskDueDate, now);
assertEqual(slaAtRisk.status, 'At Risk', 'Calculate At Risk SLA (2h)');

// 5.4 Breached (< 0h)
const breachedDueDate = new Date('2026-03-16T10:00:00Z').toISOString();
const slaBreached = calculateSLA(breachedDueDate, now);
assertEqual(slaBreached.status, 'Breached', 'Calculate Breached SLA (overdue)');
assert(slaBreached.isBreached, 'Flag isBreached correctly');

// ==========================================
// SUMMARY
// ==========================================
console.log('\n====================================================');
console.log(`TEST EXECUTION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
