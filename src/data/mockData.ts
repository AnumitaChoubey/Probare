import {
  QualityEvent,
  UserRole,
  Severity,
  QualityStatus,
  SLAStatus,
  EvidenceItem,
  CalibrationSession,
  CorrectiveAction,
  SLAPolicy,
  AuditEvent,
  NotificationItem,
} from '../types';

export const TEAMS = [
  'Claims Operations',
  'Card Services',
  'Fraud & Risk',
  'Customer Care',
  'Loan Servicing',
  'Disputes & Chargebacks',
  'Wealth Management Operations',
  'Commercial Lending QA',
];

export const EMPLOYEES = [
  { id: 'EMP-101', name: 'Sarah Williams', team: 'Claims Operations', role: 'Frontline Employee' },
  { id: 'EMP-102', name: 'Marcus Chen', team: 'Claims Operations', role: 'Frontline Employee' },
  { id: 'EMP-103', name: 'Elena Rostova', team: 'Card Services', role: 'Frontline Employee' },
  { id: 'EMP-104', name: 'Jordan Vance', team: 'Fraud & Risk', role: 'Frontline Employee' },
  { id: 'EMP-105', name: 'Priya Patel', team: 'Customer Care', role: 'Frontline Employee' },
  { id: 'EMP-106', name: 'David Kim', team: 'Loan Servicing', role: 'Frontline Employee' },
  { id: 'EMP-107', name: 'Amara Okafor', team: 'Disputes & Chargebacks', role: 'Frontline Employee' },
  { id: 'EMP-108', name: 'Lucas Meyer', team: 'Claims Operations', role: 'Frontline Employee' },
  { id: 'EMP-109', name: 'Fatima Al-Sayed', team: 'Card Services', role: 'Frontline Employee' },
  { id: 'EMP-110', name: 'Tyler Brooks', team: 'Fraud & Risk', role: 'Frontline Employee' },
  { id: 'EMP-111', name: 'Grace Hopper-Lee', team: 'Customer Care', role: 'Frontline Employee' },
  { id: 'EMP-112', name: 'Carlos Morales', team: 'Loan Servicing', role: 'Frontline Employee' },
  { id: 'EMP-113', name: 'Zoe Deschanel', team: 'Disputes & Chargebacks', role: 'Frontline Employee' },
  { id: 'EMP-114', name: 'Liam Gallagher', team: 'Claims Operations', role: 'Frontline Employee' },
  { id: 'EMP-115', name: 'Mei-Ling Zhou', team: 'Card Services', role: 'Frontline Employee' },
  { id: 'EMP-116', name: 'Devon Scott', team: 'Fraud & Risk', role: 'Frontline Employee' },
  { id: 'EMP-117', name: 'Chloe Bennett', team: 'Customer Care', role: 'Frontline Employee' },
  { id: 'EMP-118', name: 'Naveen Kumar', team: 'Loan Servicing', role: 'Frontline Employee' },
  { id: 'EMP-119', name: 'Hannah Abbott', team: 'Disputes & Chargebacks', role: 'Frontline Employee' },
  { id: 'EMP-120', name: 'Oliver Twist-Smith', team: 'Claims Operations', role: 'Frontline Employee' },
  { id: 'EMP-121', name: 'Siddharth Rao', team: 'Card Services', role: 'Frontline Employee' },
  { id: 'EMP-122', name: 'Jessica Taylor', team: 'Fraud & Risk', role: 'Frontline Employee' },
  { id: 'EMP-123', name: 'Aaron Paulson', team: 'Customer Care', role: 'Frontline Employee' },
  { id: 'EMP-124', name: 'Brianna Hayes', team: 'Loan Servicing', role: 'Frontline Employee' },
  { id: 'EMP-125', name: 'Mateo Rossi', team: 'Disputes & Chargebacks', role: 'Frontline Employee' },
  { id: 'EMP-126', name: 'Alina Becker', team: 'Wealth Management Operations', role: 'Frontline Employee' },
  { id: 'EMP-127', name: 'Jonathan Reed', team: 'Commercial Lending QA', role: 'Frontline Employee' },
  { id: 'EMP-128', name: 'Kavita Subramaniam', team: 'Wealth Management Operations', role: 'Frontline Employee' },
  { id: 'EMP-129', name: 'Dante Moretti', team: 'Commercial Lending QA', role: 'Frontline Employee' },
  { id: 'EMP-130', name: 'Sasha Petrova', team: 'Customer Care', role: 'Frontline Employee' },
];

export const QA_AUDITORS = [
  'Michael Torres (Lead QA)',
  'Rachel Green (Senior Auditor)',
  'David Miller (QA Specialist)',
  'Sophia Lorenzen (QA Auditor)',
  'Anthony Davis (Risk Auditor)',
  'Emma Watson (Compliance QA)',
  'Kareem Abdul (Operations QA)',
  'Isabella Martinez (Senior QA)',
  'Benjamin Franklin (Audit Lead)',
  'Claire Danes (Quality Specialist)',
  'Samuel Vance (Senior Reviewer)',
  'Patricia Wong (Quality Governance Lead)',
  'Gregory House (Senior Risk Reviewer)',
  'Natasha Romanova (Compliance Lead)',
  'Julian Sterling (Audit Director)',
];

export const PROCESS_TAXONOMY: Record<
  string,
  {
    subCategories: string[];
    errorTypes: string[];
    defaultSop: { id: string; title: string };
  }
> = {
  'Payment Verification': {
    subCategories: ['Account Validation', 'Threshold Exceedance', 'Refund Processing', 'Two-Factor Match'],
    errorTypes: ['Missing Secondary Auth', 'Skipped Payout Limit Check', 'Incorrect Routing Number', 'Failure to Read Disclaimer'],
    defaultSop: { id: 'SOP-PAY-014', title: 'Payment Verification & Wire Thresholds v3.4' },
  },
  'Identity Authentication': {
    subCategories: ['Voice Biometrics', 'ID Document Check', 'Out-of-Band Auth', 'Security Questions'],
    errorTypes: ['Unverified Caller Override', 'Expired ID Acceptance', 'Security Answer Hinting', 'Incomplete KYC Log'],
    defaultSop: { id: 'SOP-SEC-102', title: 'Identity & Authentication Assurance Protocol v4.1' },
  },
  'KYC & AML Compliance': {
    subCategories: ['PEP Screening', 'Sanctions Matching', 'Source of Wealth', 'Enhanced Due Diligence'],
    errorTypes: ['Sanctions False-Negative Override', 'Missing Source of Funds Form', 'Delayed AML Reporting', 'Incomplete Ownership Document'],
    defaultSop: { id: 'SOP-AML-009', title: 'AML Transaction Monitoring & Suspicious Reporting v5.0' },
  },
  'Fee Reversal': {
    subCategories: ['Overdraft Waiver', 'Foreign Transaction Adjustment', 'Late Fee Dispute', 'Annual Fee Credit'],
    errorTypes: ['Discretionary Limit Exceeded', 'Missing Supervisor Approval', 'Duplicate Credit Issued', 'Incorrect GL Account'],
    defaultSop: { id: 'SOP-FEE-022', title: 'Fee Waiver Authorization Matrix v2.8' },
  },
  'Account Security Escalation': {
    subCategories: ['Account Takeover Risk', 'Device Anomaly', 'Phishing Alert', 'Credential Stuffing'],
    errorTypes: ['Delayed Tier-2 Escalation', 'Premature Unlock of Frozen Account', 'Failure to Notify Client of Compromise', 'Missing Incident ID'],
    defaultSop: { id: 'SOP-SEC-205', title: 'Cyber Threat & Account Breach Escalation Protocol v3.1' },
  },
  'Beneficiary Update': {
    subCategories: ['Primary Beneficiary Change', 'Contingent Split', 'Power of Attorney', 'Trust Entity Update'],
    errorTypes: ['Uncertified POA Acceptance', 'Missing Notarized Signature', 'Failure to Alert Existing Beneficiary', 'Data Entry Typo in SSN'],
    defaultSop: { id: 'SOP-OPS-044', title: 'Beneficiary & Legal Designee Processing Standard v1.9' },
  },
  'Transaction Dispute': {
    subCategories: ['Merchant Non-Delivery', 'Unauthorized Charge', 'Subscription Billing', 'ATM Cash Shortage'],
    errorTypes: ['Premature Dispute Dismissal', 'Chargeback Reason Code Mismatch', 'Exceeded Network Filing Timeframe', 'Failure to Request Proof of Return'],
    defaultSop: { id: 'SOP-DSP-301', title: 'Card Network Dispute & Chargeback Regulations v6.2' },
  },
  'Document Ingestion': {
    subCategories: ['W-9 Ingestion', 'Court Order Notice', 'Death Certificate', 'Proof of Address'],
    errorTypes: ['Illegible Scan Acceptance', 'Classification Tagging Error', 'Missing Redaction of Sensitive PII', 'Delayed Indexing in Vault'],
    defaultSop: { id: 'SOP-DOC-118', title: 'Enterprise Document Archival & Redaction Standard v2.0' },
  },
  'Wire Transfer': {
    subCategories: ['International SWIFT', 'Domestic Fedwire', 'High-Value Escrow', 'Currency Exchange'],
    errorTypes: ['Callback Verification Omitted', 'SWIFT Code Letter Transposition', 'Exceeded Daily Authorization Cap', 'Missing Compliance Intermediary Check'],
    defaultSop: { id: 'SOP-WIR-402', title: 'Wire Transfer Execution & Dual-Authorization Control v5.5' },
  },
  'Billing Adjustments': {
    subCategories: ['Interest Rate Correction', 'Escrow Shortage Recalculation', 'Statement Rebilling', 'Promo APR Override'],
    errorTypes: ['Incorrect Effective Date', 'Uncalculated Amortization Schedule', 'Missing Client Notification Letter', 'Unapproved Manual Ledger Entry'],
    defaultSop: { id: 'SOP-BIL-077', title: 'Billing Adjustment & Ledger Integrity Policy v3.0' },
  },
  'Credit Assessment': {
    subCategories: ['Credit Limit Increase', 'Adverse Action Notice', 'Debt-to-Income Calculation', 'Collateral Valuation'],
    errorTypes: ['Outdated Bureau Report Used', 'Miscalculated Gross Monthly Income', 'Missing Adverse Action Reason Code', 'Unsigned Credit Request'],
    defaultSop: { id: 'SOP-CRD-210', title: 'Fair Lending & Credit Assessment Framework v4.0' },
  },
  'Account Suspension': {
    subCategories: ['Dormancy Freeze', 'Court Garnishment', 'Bankruptcy Stay', 'Fraud Hold'],
    errorTypes: ['Frozen Account Outgoing Wire', 'Failure to Notify Legal Operations', 'Delayed Hold Release Post-Court Order', 'Incorrect Ledger Freeze Code'],
    defaultSop: { id: 'SOP-LGL-501', title: 'Legal Orders, Garnishments & Restraining Notices v4.2' },
  },
  'Foreign Exchange Settlements': {
    subCategories: ['Cross-Currency Spot', 'Forward Contract Delivery', 'FX Margin Requirement', 'Rate Lock Execution'],
    errorTypes: ['Off-Market Exchange Rate Applied', 'Unverified Hedging Mandate', 'Value Date Settlement Mismatch', 'Missing SWIFT MT300 Confirmation'],
    defaultSop: { id: 'SOP-FX-601', title: 'Global Foreign Exchange Confirmation & Settlement Standards v3.5' },
  },
  'Merchant Onboarding KYC': {
    subCategories: ['Ultimate Beneficial Owner', 'Merchant Category Code', 'Card Brand Registration', 'Risk Tier Scoring'],
    errorTypes: ['Unverified Beneficial Owner Identification', 'Misclassified MCC Code', 'Missing Proof of Operating License', 'Incomplete Chargeback Reserve Audit'],
    defaultSop: { id: 'SOP-MRC-702', title: 'Merchant Underwriting & Beneficial Ownership Verification v2.4' },
  },
  'Escrow Release Protocol': {
    subCategories: ['Earnest Money Release', 'Commercial Loan Close', 'Condition Precedent Signoff', 'Multi-Party Disbursement'],
    errorTypes: ['Disbursement Without Title Clearance', 'Missing Escrow Officer Dual Signoff', 'Wiring Funds to Unregistered Escrow Account', 'Delayed Release Beyond Contractual Close'],
    defaultSop: { id: 'SOP-ESC-803', title: 'Real Estate & Commercial Escrow Trust Account Management v5.1' },
  },
};

export const ROOT_CAUSES = [
  'Training Gap',
  'Process Gap',
  'SOP Ambiguity',
  'System Issue',
  'Human Oversight',
  'Documentation Gap',
  'Policy Issue',
  'Workload',
  'Communication Gap',
  'Tool Latency',
  'Change Management Omission',
  'Cognitive Overload',
  'Unclear Handoff',
  'Misaligned Incentive',
  'Vendor Software Defect',
  'Data Integration Mismatch',
  'Regulatory Ambiguity',
  'Time Pressure',
  'Inadequate Supervision',
  'Other',
];

export const SLA_POLICIES: SLAPolicy[] = [
  {
    id: 'SLA-POL-01',
    name: 'Standard Operational Quality SLA',
    processArea: 'All Standard Operations',
    rebuttalWindowHours: 48,
    qaResponseHours: 24,
    escalationWindowHours: 24,
    warningThresholdPercent: 75,
  },
  {
    id: 'SLA-POL-02',
    name: 'High Risk / AML Compliance SLA',
    processArea: 'KYC & AML Compliance',
    rebuttalWindowHours: 24,
    qaResponseHours: 12,
    escalationWindowHours: 12,
    warningThresholdPercent: 80,
  },
  {
    id: 'SLA-POL-03',
    name: 'Payment & Wire Transfers Critical SLA',
    processArea: 'Payment Verification',
    rebuttalWindowHours: 36,
    qaResponseHours: 18,
    escalationWindowHours: 16,
    warningThresholdPercent: 70,
  },
];

// Sample realistic evidence library items
export const SAMPLE_EVIDENCE: EvidenceItem[] = [
  {
    id: 'EVD-901',
    title: 'Customer Call Recording #48291',
    type: 'audio',
    fileName: 'call-rec-48291-pay-auth.mp3',
    fileSize: '4.8 MB',
    uploadedBy: 'Michael Torres',
    uploadedAt: '2026-09-14 09:42 UTC',
    description: 'Audio capture of customer interaction at timestamp 02:14 skipping voice token challenge.',
    duration: '04:32',
  },
  {
    id: 'EVD-902',
    title: 'Core CRM Screen Capture during Wire Transfer',
    type: 'screenshot',
    fileName: 'crm-wire-auth-dialog.png',
    fileSize: '1.2 MB',
    fileUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    uploadedBy: 'Sarah Williams',
    uploadedAt: '2026-09-14 11:13 UTC',
    description: 'Screenshot showing the secondary verification checkbox was disabled by CRM system bug.',
  },
  {
    id: 'EVD-903',
    title: 'SOP-PAY-014 Excerpt PDF',
    type: 'pdf',
    fileName: 'sop-pay-014-excerpt-revision-b.pdf',
    fileSize: '840 KB',
    uploadedBy: 'Rachel Green',
    uploadedAt: '2026-09-14 11:45 UTC',
    description: 'Section 4.2 detailing the exemption criteria for authenticated commercial clients.',
  },
  {
    id: 'EVD-904',
    title: 'Core Banking Ledger Audit Export',
    type: 'document',
    fileName: 'gl-reconciliation-log-sep14.xlsx',
    fileSize: '2.1 MB',
    uploadedBy: 'Anthony Davis',
    uploadedAt: '2026-09-14 14:10 UTC',
    description: 'Audit log confirming funds were placed on provisional hold without ledger discrepancy.',
  },
];

// Generate deterministic 160 realistic Quality Events
export function generateInitialEvents(): QualityEvent[] {
  const events: QualityEvent[] = [];
  const processKeys = Object.keys(PROCESS_TAXONOMY);

  // 1. HERO CASE: QEMS-2026-001284 (as requested in prompt)
  events.push({
    id: 'QEMS-2026-001284',
    title: 'Payment Verification Failure & Secondary Auth Bypass',
    date: '2026-09-15 09:42',
    employee: 'Sarah Williams',
    employeeId: 'EMP-101',
    team: 'Claims Operations',
    processArea: 'Payment Verification',
    subCategory: 'Threshold Exceedance',
    errorType: 'Missing Secondary Auth',
    sopId: 'SOP-PAY-014',
    sopTitle: 'Payment Verification & Wire Thresholds v3.4',
    severity: 'HIGH',
    status: 'Under Review',
    owner: 'David Miller',
    createdBy: 'Michael Torres',
    description:
      'Agent processed a high-priority claims payout wire of $8,450 without executing mandatory two-step secondary identity verification per revised SOP-PAY-014. Audio log indicates client was verified using legacy single-question protocol.',
    customerImpact:
      'Customer wire was delayed by 2 hours for compliance hold. No fraudulent loss occurred, but potential breach risk was elevated.',
    financialImpact: '$8,450.00 (Provisional Hold)',
    slaDueDate: '2026-09-16 18:00',
    slaStatus: 'Warning',
    slaHoursRemaining: 18.7,
    rootCause: 'Process Gap & UI Ergonomics',
    evidence: [...SAMPLE_EVIDENCE],
    rebuttal: {
      id: 'REB-1284',
      errorId: 'QEMS-2026-001284',
      category: 'System Issue',
      explanation:
        'The Core CRM v4.2 interface collapsed the secondary security question checklist panel during the call. In addition, SOP-PAY-014 was updated on Monday without notifying Tier-1 frontline agents through morning huddle notes. I followed the standard established flow.',
      evidence: [SAMPLE_EVIDENCE[1], SAMPLE_EVIDENCE[2]],
      submittedBy: 'Sarah Williams',
      submittedAt: '2026-09-15 11:13',
      slaDeadline: '2026-09-16 11:13',
      status: 'Pending QA',
      discussions: [
        {
          id: 'DISC-01',
          author: 'Sarah Williams',
          authorRole: 'Frontline Employee',
          message:
            'Attached screenshot EVD-902 clearly shows the modal checkbox was grayed out until the call disconnect trigger occurred.',
          timestamp: '2026-09-15 11:15',
        },
        {
          id: 'DISC-02',
          author: 'Michael Torres',
          authorRole: 'QA Auditor',
          message:
            'Reviewing CRM system latency logs during the 09:40-09:45 window. If IT confirms the UI bug, this error will be classified as System/Process Gap.',
          timestamp: '2026-09-15 12:02',
        },
      ],
    },
    rca: {
      errorId: 'QEMS-2026-001284',
      problemStatement: 'Agent skipped secondary verification on an $8,450 claim disbursement.',
      fiveWhys: [
        { step: 1, question: 'Why was secondary verification skipped?', answer: 'Agent assumed single verification was sufficient for verified caller.' },
        { step: 2, question: 'Why did agent assume single verification was enough?', answer: 'The CRM secondary prompt did not flash a required validation block.' },
        { step: 3, question: 'Why was there no required validation block?', answer: 'The v4.2 CRM update relaxed client-side form gating for payout workflows.' },
        { step: 4, question: 'Why was the change pushed without form gating?', answer: 'Product release notes focused on call latency reduction without QA signoff.' },
        { step: 5, question: 'Why was QA signoff omitted in the deployment pipeline?', answer: 'Change-control checklist lacked a mandatory compliance gating step.' },
      ],
      fishbone: {
        people: ['Agent cognitive rush during Monday morning call queue surge', 'Auditor unfamiliar with new release UI state'],
        process: ['SOP-PAY-014 change communicated via email rather than LMS sign-off', 'No dual-agent authorization prompt for >$5,000'],
        system: ['CRM v4.2 collapsible accordion hiding mandatory fields', 'No server-side block on disbursement submit button'],
        training: ['Team huddle neglected to review high-value verification thresholds', 'Refresher course overdue by 3 weeks'],
        environment: ['High ambient noise in contact center during shift change'],
        measurement: ['Audit sampling rate for claims was 3% instead of 10% during rollout'],
      },
      primaryCategory: 'System Issue',
      contributingFactors: ['SOP Ambiguity', 'Tool Latency', 'Change Management Omission'],
      confidence: 'High',
      completedBy: 'David Miller',
      completedAt: '2026-09-15 13:45',
      linkedActionIds: ['CAPA-201', 'CAPA-202'],
    },
    correctiveActions: [
      {
        id: 'CAPA-201',
        errorId: 'QEMS-2026-001284',
        title: 'Re-enable Hard Validation Block in CRM v4.2.1',
        description: 'Ensure the payout submit button remains locked until secondary two-factor code is confirmed.',
        owner: 'David Miller',
        ownerRole: 'QA Specialist',
        priority: 'CRITICAL',
        dueDate: '2026-09-18',
        status: 'In Progress',
        evidenceRequired: ['Jira Ticket IT-8941', 'Staging Validation Signoff', 'Release Notes'],
      },
      {
        id: 'CAPA-202',
        errorId: 'QEMS-2026-001284',
        title: 'Mandatory Micro-Training on SOP-PAY-014',
        description: 'Conduct 15-minute live simulation with all Claims frontline employees.',
        owner: 'Rachel Green',
        ownerRole: 'Senior Auditor',
        priority: 'HIGH',
        dueDate: '2026-09-20',
        status: 'Not Started',
        evidenceRequired: ['LMS Attendance Roster', 'Knowledge Check Quiz (100% pass)'],
      },
    ],
    history: [
      {
        id: 'AUD-01',
        errorId: 'QEMS-2026-001284',
        who: 'Michael Torres',
        role: 'QA Auditor',
        what: 'Logged Quality Defect',
        when: '2026-09-15 09:42',
        previousValue: 'None',
        newValue: 'Logged',
        reason: 'Routine quality audit sampling of high-value disbursements.',
      },
      {
        id: 'AUD-02',
        errorId: 'QEMS-2026-001284',
        who: 'Michael Torres',
        role: 'QA Auditor',
        what: 'Attached Call Audio Evidence EVD-901',
        when: '2026-09-15 10:04',
      },
      {
        id: 'AUD-03',
        errorId: 'QEMS-2026-001284',
        who: 'Sarah Williams',
        role: 'Frontline Employee',
        what: 'Submitted Rebuttal Disputing Finding',
        when: '2026-09-15 11:13',
        previousValue: 'Logged',
        newValue: 'Rebuttal Pending',
        reason: 'System UI bug obscured the secondary verification prompt.',
      },
      {
        id: 'AUD-04',
        errorId: 'QEMS-2026-001284',
        who: 'David Miller',
        role: 'QA Specialist',
        what: 'Assigned as Independent QA Arbitrator',
        when: '2026-09-15 11:17',
        previousValue: 'Michael Torres',
        newValue: 'David Miller',
      },
    ],
  });

  // Seed 159 additional realistic quality events with diverse states and realistic attributes
  const statuses: QualityStatus[] = [
    'Logged',
    'Under Review',
    'Rebuttal Pending',
    'QA Review',
    'Escalated',
    'Manager Review',
    'Overturned',
    'Upheld',
    'Corrective Action',
    'Effectiveness Review',
    'Closed',
  ];

  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const dates = [
    '2026-09-15',
    '2026-09-14',
    '2026-09-13',
    '2026-09-12',
    '2026-09-11',
    '2026-09-10',
    '2026-09-09',
    '2026-09-08',
    '2026-09-07',
    '2026-09-06',
    '2026-09-05',
    '2026-09-04',
    '2026-09-03',
    '2026-09-02',
    '2026-09-01',
    '2026-08-31',
    '2026-08-28',
    '2026-08-25',
  ];

  for (let i = 1; i <= 209; i++) {
    const idNumber = 1283 - i + 1;
    const paddedId = String(Math.max(1000, idNumber)).padStart(6, '0');
    const id = `QEMS-2026-${paddedId}`;

    const emp = EMPLOYEES[i % EMPLOYEES.length];
    const process = processKeys[i % processKeys.length];
    const procTax = PROCESS_TAXONOMY[process];
    const subCat = procTax.subCategories[i % procTax.subCategories.length];
    const errType = procTax.errorTypes[i % procTax.errorTypes.length];
    const auditor = QA_AUDITORS[i % QA_AUDITORS.length];
    const status = statuses[i % statuses.length];
    const severity = severities[i % severities.length];
    const rootCause = ROOT_CAUSES[i % ROOT_CAUSES.length];
    const dateStr = `${dates[i % dates.length]} 1${i % 10}:${(i * 7) % 60 < 10 ? '0' : ''}${(i * 7) % 60}`;

    // SLA calculations
    const hoursRemaining = Math.max(-12, Math.round((48 - (i % 55) * 1.2) * 10) / 10);
    let slaStatus: SLAStatus = 'On Track';
    if (hoursRemaining < 0) slaStatus = 'Breached';
    else if (hoursRemaining < 8) slaStatus = 'At Risk';
    else if (hoursRemaining < 20) slaStatus = 'Warning';
    if (status === 'Escalated') slaStatus = 'Escalated';

    const hasRebuttal = status === 'Rebuttal Pending' || status === 'QA Review' || status === 'Overturned' || status === 'Upheld' || (i % 5 === 0);
    const hasCAPA = status === 'Corrective Action' || status === 'Effectiveness Review' || status === 'Closed' || (i % 6 === 0);
    const hasEffectiveness = status === 'Effectiveness Review' || status === 'Closed';

    const evd: EvidenceItem = {
      id: `EVD-${800 + i}`,
      title: `${process} Interaction Artifact #${4000 + i}`,
      type: i % 3 === 0 ? 'audio' : i % 3 === 1 ? 'screenshot' : 'pdf',
      fileName: `audit-artifact-${id.toLowerCase()}.${i % 3 === 0 ? 'mp3' : i % 3 === 1 ? 'png' : 'pdf'}`,
      fileSize: `${(1.1 + (i % 8) * 0.5).toFixed(1)} MB`,
      uploadedBy: auditor,
      uploadedAt: dateStr,
      description: `Primary evidence file recorded during evaluation of ${errType} in ${emp.team}.`,
      duration: i % 3 === 0 ? '03:15' : undefined,
    };

    const qEvent: QualityEvent = {
      id,
      title: `${errType} in ${process}`,
      date: dateStr,
      employee: emp.name,
      employeeId: emp.id,
      team: emp.team,
      processArea: process,
      subCategory: subCat,
      errorType: errType,
      sopId: procTax.defaultSop.id,
      sopTitle: procTax.defaultSop.title,
      severity,
      status,
      owner: auditor,
      createdBy: auditor,
      description: `Observed ${errType} while executing ${subCat} under ${procTax.defaultSop.id}. Frontline execution deviated from established compliance standards.`,
      customerImpact:
        severity === 'CRITICAL'
          ? 'Direct regulatory reporting threshold triggered or client funds held.'
          : severity === 'HIGH'
          ? 'Client contact required to rectify information; SLA delayed by >24h.'
          : 'Internal rework required; customer was not directly impaired.',
      financialImpact: severity === 'CRITICAL' ? `$${(1200 + i * 45).toLocaleString()}.00` : undefined,
      slaDueDate: '2026-09-17 17:00',
      slaStatus,
      slaHoursRemaining: hoursRemaining,
      rootCause: status === 'Draft' || status === 'Logged' ? undefined : rootCause,
      evidence: [evd],
      correctiveActions: hasCAPA
        ? [
            {
              id: `CAPA-${300 + i}`,
              errorId: id,
              title: `Remediate ${errType} Protocol & System Workflow`,
              description: `Audit team and operations lead will review ${procTax.defaultSop.id} and implement error-proofing controls.`,
              owner: auditor,
              ownerRole: 'QA Auditor',
              priority: severity,
              dueDate: '2026-09-25',
              status: status === 'Closed' ? 'Completed' : i % 2 === 0 ? 'In Progress' : 'Not Started',
              evidenceRequired: ['Process Signoff Document', 'Auditor Verification Form'],
              completedAt: status === 'Closed' ? '2026-09-14 16:30' : undefined,
              completionNotes: status === 'Closed' ? 'All team members successfully completed assessment.' : undefined,
            },
          ]
        : [],
      effectiveness: hasEffectiveness
        ? {
            id: `EFF-${400 + i}`,
            errorId: id,
            reviewedBy: 'Rachel Green (Senior Auditor)',
            reviewedAt: '2026-09-14 15:00',
            errorRateBefore: 8.6,
            errorRateAfter: status === 'Closed' ? 1.4 : 4.8,
            recurrenceRate: status === 'Closed' ? 0.8 : 5.2,
            comparisonPeriod: '30-Day Post-CAPA Measurement Window',
            supportingEvidence: 'Automated 100% Quality Sampling Ledger',
            decision: status === 'Closed' ? 'Effective' : 'Partially Effective',
            rationale:
              status === 'Closed'
                ? 'Error rate reduced by 83.7% with zero repeat occurrences by the primary cohort.'
                : 'Defect rate improved by 44%, but sporadic misses remain on night shift.',
          }
        : undefined,
      history: [
        {
          id: `AUD-${5000 + i}`,
          errorId: id,
          who: auditor,
          role: 'QA Auditor',
          what: 'Created Quality Event',
          when: dateStr,
          previousValue: 'None',
          newValue: 'Logged',
        },
      ],
    };

    if (hasRebuttal) {
      qEvent.rebuttal = {
        id: `REB-${idNumber}`,
        errorId: id,
        category: (i % 2 === 0 ? 'SOP Ambiguous' : i % 3 === 0 ? 'System Issue' : 'Evidence Misinterpreted') as any,
        explanation: `Employee requested review based on ambiguous language in ${procTax.defaultSop.id} regarding mandatory exception criteria.`,
        evidence: [evd],
        submittedBy: emp.name,
        submittedAt: dateStr,
        slaDeadline: '2026-09-17 12:00',
        status: status === 'Overturned' ? 'Overturned' : status === 'Upheld' ? 'Upheld' : 'Pending QA',
        discussions: [
          {
            id: `DISC-${i}`,
            author: emp.name,
            authorRole: 'Frontline Employee',
            message: `Please verify that section 3.2 allows an override when the account manager is in direct communication.`,
            timestamp: dateStr,
          },
        ],
      };
    }

    events.push(qEvent);
  }

  return events;
}

export const INITIAL_CALIBRATION_SESSIONS: CalibrationSession[] = [
  {
    id: 'CAL-2026-01',
    title: 'Q3 Payment Verification & Wire Threshold Calibration',
    scheduledDate: '2026-09-18 10:00 UTC',
    processArea: 'Payment Verification',
    status: 'In Progress',
    participants: [
      { name: 'Michael Torres', role: 'Lead QA', score: 82, submitted: true, notes: 'Scored high on authentication, noted skipped secondary step.' },
      { name: 'Rachel Green', role: 'Senior Auditor', score: 91, submitted: true, notes: 'Considered customer relationship override permissible under Section 4.' },
      { name: 'David Miller', role: 'QA Specialist', score: 85, submitted: true, notes: 'Recommended 5-point deduction for incomplete CRM note.' },
      { name: 'Sophia Lorenzen', role: 'QA Auditor', score: 84, submitted: true },
      { name: 'Anthony Davis', role: 'Risk Auditor', score: undefined, submitted: false },
    ],
    sampleCaseId: 'QEMS-2026-001284',
    scoreVariance: 9.0,
    finalCalibratedScore: 86,
    decisionRationale:
      'Consensus reached: Secondary verification is non-negotiable for transactions above $2,500 unless written approval from Risk VP is attached. Standardizing on an 86/100 score.',
  },
  {
    id: 'CAL-2026-02',
    title: 'AML Sanctions False-Positive Review Session',
    scheduledDate: '2026-09-22 14:00 UTC',
    processArea: 'KYC & AML Compliance',
    status: 'Scheduled',
    participants: [
      { name: 'Emma Watson', role: 'Compliance QA', submitted: false },
      { name: 'Anthony Davis', role: 'Risk Auditor', submitted: false },
      { name: 'Michael Torres', role: 'Lead QA', submitted: false },
    ],
    sampleCaseId: 'QEMS-2026-001270',
    scoreVariance: 0,
  },
  {
    id: 'CAL-2026-03',
    title: 'Card Services Dispute Reason Code Alignment',
    scheduledDate: '2026-09-10 11:00 UTC',
    processArea: 'Transaction Dispute',
    status: 'Completed',
    participants: [
      { name: 'Rachel Green', role: 'Senior Auditor', score: 88, submitted: true },
      { name: 'Kareem Abdul', role: 'Operations QA', score: 90, submitted: true },
      { name: 'David Miller', role: 'QA Specialist', score: 89, submitted: true },
    ],
    sampleCaseId: 'QEMS-2026-001245',
    scoreVariance: 2.0,
    finalCalibratedScore: 89,
    decisionRationale: 'Aligned on Chargeback Reason Code 4853 requirements. High consistency across auditors.',
  },
  {
    id: 'CAL-2026-04',
    title: 'Beneficiary POA Verification Calibration',
    scheduledDate: '2026-09-04 15:30 UTC',
    processArea: 'Beneficiary Update',
    status: 'Completed',
    participants: [
      { name: 'Isabella Martinez', role: 'Senior QA', score: 94, submitted: true },
      { name: 'Benjamin Franklin', role: 'Audit Lead', score: 86, submitted: true },
      { name: 'Claire Danes', role: 'Quality Specialist', score: 90, submitted: true },
    ],
    sampleCaseId: 'QEMS-2026-001210',
    scoreVariance: 8.0,
    finalCalibratedScore: 90,
    decisionRationale: 'Established clear checklist for notary seal legibility.',
  },
  {
    id: 'CAL-2026-05',
    title: 'Customer Care Call Soft Skills & De-escalation',
    scheduledDate: '2026-09-24 09:00 UTC',
    processArea: 'Customer Care',
    status: 'Scheduled',
    participants: [
      { name: 'Sophia Lorenzen', role: 'QA Auditor', submitted: false },
      { name: 'Rachel Green', role: 'Senior Auditor', submitted: false },
    ],
    sampleCaseId: 'QEMS-2026-001190',
    scoreVariance: 0,
  },
  {
    id: 'CAL-2026-06',
    title: 'Fee Reversal Discretionary Limit Calibration',
    scheduledDate: '2026-08-28 13:00 UTC',
    processArea: 'Fee Reversal',
    status: 'Completed',
    participants: [
      { name: 'Michael Torres', role: 'Lead QA', score: 95, submitted: true },
      { name: 'Kareem Abdul', role: 'Operations QA', score: 93, submitted: true },
    ],
    sampleCaseId: 'QEMS-2026-001165',
    scoreVariance: 2.0,
    finalCalibratedScore: 94,
    decisionRationale: 'Annual fee waiver criteria verified against customer tier status.',
  },
  {
    id: 'CAL-2026-07',
    title: 'High-Value Fedwire Dual Authorization Calibration',
    scheduledDate: '2026-08-20 10:00 UTC',
    processArea: 'Wire Transfer',
    status: 'Completed',
    participants: [
      { name: 'Anthony Davis', role: 'Risk Auditor', score: 78, submitted: true },
      { name: 'Rachel Green', role: 'Senior Auditor', score: 85, submitted: true },
      { name: 'David Miller', role: 'QA Specialist', score: 82, submitted: true },
    ],
    sampleCaseId: 'QEMS-2026-001130',
    scoreVariance: 7.0,
    finalCalibratedScore: 82,
    decisionRationale: 'Zero tolerance established for missing verbal callback verification.',
  },
  {
    id: 'CAL-2026-08',
    title: 'Adverse Action Notice Accuracy Session',
    scheduledDate: '2026-08-15 14:00 UTC',
    processArea: 'Credit Assessment',
    status: 'Completed',
    participants: [
      { name: 'Emma Watson', role: 'Compliance QA', score: 92, submitted: true },
      { name: 'Benjamin Franklin', role: 'Audit Lead', score: 90, submitted: true },
    ],
    sampleCaseId: 'QEMS-2026-001095',
    scoreVariance: 2.0,
    finalCalibratedScore: 91,
    decisionRationale: 'All denial reasons match Fair Credit Reporting Act disclosures.',
  },
  {
    id: 'CAL-2026-09',
    title: 'Legal Garnishment & Restraining Notice Handling',
    scheduledDate: '2026-09-28 11:30 UTC',
    processArea: 'Account Suspension',
    status: 'Scheduled',
    participants: [
      { name: 'Isabella Martinez', role: 'Senior QA', submitted: false },
      { name: 'Anthony Davis', role: 'Risk Auditor', submitted: false },
    ],
    sampleCaseId: 'QEMS-2026-001060',
    scoreVariance: 0,
  },
  {
    id: 'CAL-2026-10',
    title: 'Document Vault Sensitive PII Redaction Audit',
    scheduledDate: '2026-08-05 09:30 UTC',
    processArea: 'Document Ingestion',
    status: 'Completed',
    participants: [
      { name: 'David Miller', role: 'QA Specialist', score: 88, submitted: true },
      { name: 'Rachel Green', role: 'Senior Auditor', score: 94, submitted: true },
    ],
    sampleCaseId: 'QEMS-2026-001025',
    scoreVariance: 6.0,
    finalCalibratedScore: 91,
    decisionRationale: 'Tax ID redaction required on all court orders prior to cloud indexing.',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NOTIF-01',
    title: 'Rebuttal Submitted by Sarah Williams',
    message: 'Sarah submitted a dispute for QEMS-2026-001284 stating System UI issue in CRM v4.2.',
    timestamp: '12m ago',
    read: false,
    type: 'rebuttal',
    linkId: 'QEMS-2026-001284',
  },
  {
    id: 'NOTIF-02',
    title: 'SLA Warning: 18h Remaining',
    message: 'QA Response due on QEMS-2026-001284 within standard operational SLA window.',
    timestamp: '45m ago',
    read: false,
    type: 'sla',
    linkId: 'QEMS-2026-001284',
  },
  {
    id: 'NOTIF-03',
    title: 'Corrective Action CAPA-201 Due in 72h',
    message: 'Hard Validation Block in CRM v4.2.1 staging test scheduled for tomorrow.',
    timestamp: '2h ago',
    read: false,
    type: 'action',
    linkId: 'QEMS-2026-001284',
  },
  {
    id: 'NOTIF-04',
    title: 'Calibration Session Tomorrow: 10:00 UTC',
    message: 'Q3 Payment Verification & Wire Threshold Calibration with 5 participants.',
    timestamp: '4h ago',
    read: true,
    type: 'calibration',
    linkId: 'CAL-2026-01',
  },
  {
    id: 'NOTIF-05',
    title: 'Effectiveness Review Due: CAPA-198',
    message: '30-day post-implementation measurement window completed for Loan Servicing.',
    timestamp: '1d ago',
    read: true,
    type: 'review',
    linkId: 'QEMS-2026-001275',
  },
];

export const SOP_CATALOG = [
  {
    id: 'SOP-PAY-014',
    name: 'Wire Transfer Verification & Thresholds',
    version: '3.4',
    processArea: 'Payment Operations',
    owner: 'Rachel Green',
    excerpt: 'Dual token authorization is mandatory for all transactions exceeding $10,000.',
  },
  {
    id: 'SOP-SEC-102',
    name: 'Identity & Authentication Protocol',
    version: '4.1',
    processArea: 'Identity & Authentication',
    owner: 'Michael Torres',
    excerpt: 'Never bypass two-factor verification without written supervisor consent.',
  },
  {
    id: 'SOP-AML-009',
    name: 'AML Suspicious Activity Reporting',
    version: '5.0',
    processArea: 'KYC & AML Compliance',
    owner: 'Anthony Davis',
    excerpt: 'Immediate file hold required on sanctioned jurisdiction hit.',
  },
  {
    id: 'SOP-FEE-022',
    name: 'Fee Waiver Authorization Matrix',
    version: '2.8',
    processArea: 'Fee Reversal',
    owner: 'Sophia Lorenzen',
    excerpt: 'Discretionary waivers capped at $250 per customer annual cycle.',
  },
  {
    id: 'SOP-DSP-301',
    name: 'Card Network Dispute Regulations',
    version: '6.2',
    processArea: 'Transaction Dispute',
    owner: 'David Miller',
    excerpt: 'Documented merchant delivery receipt required within 10 days of chargeback.',
  },
  {
    id: 'SOP-CLM-088',
    name: 'Emergency Medical Claims Adjudication',
    version: '2.1',
    processArea: 'Claims Operations',
    owner: 'Emma Watson',
    excerpt: 'Urgent medical authorization SLA cannot exceed 12 hours from initial receipt.',
  },
];

export const ERROR_TYPES = [
  'Missing Secondary Auth',
  'Skipped Payout Limit Check',
  'Incorrect Routing Number',
  'Calculation Discrepancy',
  'Unverified Caller Override',
  'Expired ID Acceptance',
  'Delayed AML Reporting',
  'Discretionary Limit Exceeded',
  'Premature Dispute Dismissal',
  'Callback Verification Omitted',
  'Missing Supervisor Approval',
  'Other Procedural Deviation',
];

