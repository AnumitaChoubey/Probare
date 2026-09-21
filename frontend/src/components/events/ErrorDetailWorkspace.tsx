import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  FileText,
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  Paperclip,
  Volume2,
  ExternalLink,
  MessageSquareWarning,
  GitFork,
  CheckCircle2,
  History,
  Send,
  Sparkles,
  Plus,
  ShieldCheck,
  Check,
  X,
  Play,
  FileCode,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { StatusBadge, SeverityBadge, SLABadge } from '../common/StatusBadge';
import { SLATimer } from '../common/SLATimer';
import {
  QualityEvent,
  QualityStatus,
  DisputeCategory,
  FishboneCategory,
  RootCauseAnalysis,
  CorrectiveAction,
} from '../../types';
import { aiApi } from '../../services/api';
import { EventCommunication } from './EventCommunication';

export const ErrorDetailWorkspace: React.FC = () => {
  const {
    selectedEventId,
    setSelectedEventId,
    events,
    currentRole,
    currentUser,
    hasPermission,
    submitRebuttal,
    resolveRebuttal,
    saveRCA,
    addCorrectiveAction,
    updateCorrectiveActionStatus,
    submitEffectivenessReview,
    addDiscussionMessage,
    addToast,
  } = useQEMS();

  // Find active event
  const event = events.find((e) => e.id === selectedEventId) || events[0];

  // Active right pane tab
  const [activeTab, setActiveTab] = useState<'rebuttal' | 'rca' | 'capa' | 'audit' | 'communication'>('rebuttal');

  // Rebuttal form state (Frontline)
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>('System Issue');
  const [disputeExplanation, setDisputeExplanation] = useState('');

  // QA Arbitration form state
  const [qaDecision, setQaDecision] = useState<'Accept Error' | 'Overturn' | 'Partially Accept' | 'Escalate'>('Overturn');
  const [qaRationale, setQaRationale] = useState('');

  // Discussion reply
  const [discussionMsg, setDiscussionMsg] = useState('');

  // 5 Whys state
  const initialWhys = event?.rca?.fiveWhys
    ? event.rca.fiveWhys.map((w: any) => (typeof w === 'string' ? w : w.answer || w.question || ''))
    : [
        'Agent missed secondary verification of international routing code.',
        'Core CRM modal did not prompt mandatory swift lookup.',
        'Recent CRM release v2026.3 collapsed validation field by default.',
        'Deployment sanity testing missed Edge browser styling regression.',
        'Cross-browser QA check was not mandatory in deployment checklist.',
      ];
  const [whys, setWhys] = useState<string[]>(initialWhys);
  const [selectedFishbone, setSelectedFishbone] = useState<FishboneCategory>(
    (event?.rca?.fishboneCategory as FishboneCategory) || 'System'
  );
  const [primaryCause, setPrimaryCause] = useState<string>(
    event?.rootCause || 'System Issue'
  );
  const [rcaRecurrence, setRcaRecurrence] = useState<number>(
    typeof event?.rca?.recurrenceRisk === 'number' ? event.rca.recurrenceRisk : 3
  );
  const [aiRcaLoading, setAiRcaLoading] = useState(false);

  // New CAPA Form state
  const [isAddingCapa, setIsAddingCapa] = useState(false);
  const [newCapaTitle, setNewCapaTitle] = useState('');
  const [newCapaOwner, setNewCapaOwner] = useState(currentUser.name);
  const [newCapaDueDate, setNewCapaDueDate] = useState('2026-09-30');
  const [newCapaType, setNewCapaType] = useState<CorrectiveAction['type']>('System Validation');
  const [newCapaMethod, setNewCapaMethod] = useState('');

  // Effectiveness review state
  const [effMetrics, setEffMetrics] = useState('');
  const [effDecision, setEffDecision] = useState<'Effective' | 'Partially Effective' | 'Not Effective'>('Effective');
  const [effRationale, setEffRationale] = useState('');

  if (!event) return null;

  // 8-stage lifecycle steps
  const steps: { label: QualityStatus; title: string }[] = [
    { label: 'Logged', title: 'Detect & Record' },
    { label: 'Under Review', title: 'Evidence Package' },
    { label: 'Rebuttal Pending', title: 'Dispute / Rebuttal' },
    { label: 'QA Review', title: 'QA Arbitration' },
    { label: 'Escalated', title: 'Governance Decision' },
    { label: 'Corrective Action', title: 'CAPA & RCA' },
    { label: 'Effectiveness Review', title: '30d Verification' },
    { label: 'Closed', title: 'Verified Closed' },
  ];

  const getStepStatus = (stepIndex: number) => {
    const statusOrder: QualityStatus[] = [
      'Draft',
      'Logged',
      'Under Review',
      'Rebuttal Pending',
      'QA Review',
      'Escalated',
      'Corrective Action',
      'Effectiveness Review',
      'Closed',
    ];
    const currentIndex = statusOrder.indexOf(event.status);
    if (event.status === 'Overturned') {
      return stepIndex <= 3 ? 'completed' : 'bypassed';
    }
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const handleRebuttalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeExplanation.trim()) {
      addToast({ type: 'warning', title: 'Explanation required', description: 'Please explain the grounds for dispute.' });
      return;
    }
    submitRebuttal(event.id, disputeCategory, disputeExplanation, []);
    setDisputeExplanation('');
  };

  const handleQaDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaRationale.trim()) {
      addToast({ type: 'warning', title: 'Rationale required', description: 'Please document the QA assessment rationale.' });
      return;
    }
    resolveRebuttal(event.id, qaDecision, qaRationale);
    setQaRationale('');
  };

  const handlePostDiscussion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionMsg.trim()) return;
    addDiscussionMessage(event.id, discussionMsg);
    setDiscussionMsg('');
  };

  const handleSaveRca = () => {
    const rcaData: RootCauseAnalysis = {
      errorId: event.id,
      fiveWhys: whys.map((whyText, idx) => ({
        step: idx + 1,
        question: `Why Step ${idx + 1}`,
        answer: whyText,
      })),
      fishboneCategory: selectedFishbone,
      primaryCategory: primaryCause,
      contributingFactors: [
        'High ticket volume during shift surge',
        'UI collapsed mandatory swift input element',
      ],
      recurrenceRisk: String(rcaRecurrence),
      preventativeMeasure:
        'Implement hard client-side form validation before submit is unlocked.',
      completedBy: currentUser.name,
      completedAt: new Date().toISOString().substring(0, 16),
    };
    saveRCA(event.id, rcaData);
  };

  const handleAiSuggestRca = async () => {
    setAiRcaLoading(true);
    try {
      const data = await aiApi.rca({
        errorDescription: event.description,
        sopId: event.sopId,
        errorType: event.errorType,
        employeeExplanation: event.rebuttal?.explanation,
      });
      if (data.fiveWhys && data.fiveWhys.length > 0) {
        setWhys(data.fiveWhys);
        if (data.primaryRootCause) setPrimaryCause(data.primaryRootCause);
        addToast({
          type: 'success',
          title: 'AI Root Cause Generated',
          description: '5 Whys and primary driver populated from Gemini QA model.',
        });
      }
    } catch (err) {
      console.warn('AI RCA fallback:', err);
      // Fallback local heuristic
      setWhys([
        `First Why: ${event.title} caused procedural deviation.`,
        `Second Why: Employee followed outdated visual pattern from SOP ${event.sopId}.`,
        `Third Why: Regional knowledge base matrix lacked the latest 2026 update.`,
        `Fourth Why: Documentation release sync was delayed behind software release.`,
        `Fifth Why: Change management workflow lacked mandatory QA sign-off gate.`,
      ]);
      setPrimaryCause('Process Gap');
      addToast({
        type: 'info',
        title: 'Heuristic RCA Loaded',
        description: 'Generated 5 Whys based on error profile.',
      });
    } finally {
      setAiRcaLoading(false);
    }
  };

  const handleCreateCapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCapaTitle.trim()) return;
    addCorrectiveAction(event.id, {
      title: newCapaTitle,
      description: newCapaMethod || 'Corrective action initiated from RCA findings.',
      owner: newCapaOwner,
      ownerRole: 'Quality Reviewer',
      priority: event.severity,
      dueDate: newCapaDueDate,
      status: 'Open',
      type: newCapaType,
      verificationMethod: newCapaMethod || 'Peer audit verification sample of 10 cases',
      evidenceRequired: ['Audit Log Sign-off', 'Process Verification Record'],
    });
    setNewCapaTitle('');
    setIsAddingCapa(false);
  };

  const handleSaveEffectiveness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effRationale.trim()) return;
    submitEffectivenessReview(event.id, {
      reviewedBy: currentUser.name,
      reviewedAt: new Date().toISOString().substring(0, 10),
      reviewer: currentUser.name,
      completedDate: new Date().toISOString().substring(0, 10),
      errorRateBefore: 4.5,
      errorRateAfter: effDecision === 'Effective' ? 0.2 : 3.8,
      recurrenceRate: effDecision === 'Effective' ? 0.0 : 1.2,
      comparisonPeriod: '30-Day Post-CAPA Window',
      supportingEvidence: 'DOC-VERIFY-SAMPLE-120',
      metricsObserved: effMetrics || '0 recurring errors observed in 30 days sampling (n=120).',
      decision: effDecision,
      rationale: effRationale,
    });
  };

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-4">
      {/* Top Bar: Back button, Record ID */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedEventId(null)}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-qems-text-muted hover:text-qems-text-primary :text-white bg-qems-bg-white border border-qems-border px-2.5 py-1.5 rounded hover:bg-qems-bg-surface :bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4 text-qems-text-disabled " />
          <span>Back to Quality Events Registry</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-qems-text-muted font-medium">Record ID:</span>
          <span className="font-mono text-sm font-bold text-qems-brand-dark bg-qems-brand-light px-2 py-0.5 rounded border border-qems-brand ">
            {event.id}
          </span>
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-qems-border-light ">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled ">
            Quality Error Traceable Lifecycle
          </span>
          <div className="flex items-center space-x-3 text-[11px] text-qems-text-muted font-mono">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-qems-brand" />
              <span>Active</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-200 " />
              <span>Upcoming</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {steps.map((step, idx) => {
            const st = getStepStatus(idx);
            const isDone = st === 'completed';
            const isCurrent = st === 'current';

            return (
              <div
                key={step.label}
                className={`p-2 rounded border text-xs transition ${
                  isCurrent
                    ? 'bg-qems-brand-light border-indigo-300 ring-1 ring-indigo-500/30'
                    : isDone
                    ? 'bg-qems-success-bg/50 border-emerald-200 text-emerald-900 '
                    : 'bg-qems-bg-surface border-qems-border opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-qems-text-disabled ">
                    0{idx + 1}
                  </span>
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-qems-success " />
                  ) : isCurrent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-qems-brand " />
                  ) : null}
                </div>
                <div className="font-bold text-[11px] truncate text-qems-text-primary ">
                  {step.title}
                </div>
                <div className="text-[10px] text-qems-text-muted truncate mt-0.5">
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ================= LEFT PANE: Error Context (5 Cols) ================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Header Card */}
          <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 space-y-3.5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <SeverityBadge severity={event.severity} />
                  <StatusBadge status={event.status} />
                </div>
                <h2 className="text-sm font-bold text-qems-text-primary leading-snug">
                  {event.title}
                </h2>
                <div className="text-xs text-qems-text-muted mt-1 flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-qems-text-disabled " />
                  <span>Logged: {event.date}</span>
                </div>
              </div>
            </div>

            {/* SLA Countdown Timer */}
            <SLATimer
              hoursRemaining={event.slaHoursRemaining}
              status={event.slaStatus}
              deadline={event.slaDeadline}
            />

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-qems-border-light text-xs">
              <div>
                <span className="text-[10px] text-qems-text-disabled uppercase font-semibold block">
                  Employee Evaluated
                </span>
                <div className="font-semibold text-qems-text-primary mt-0.5">{event.employee}</div>
                <div className="text-[11px] text-qems-text-muted ">{event.employeeRole}</div>
              </div>

              <div>
                <span className="text-[10px] text-qems-text-disabled uppercase font-semibold block">
                  Team / Business Unit
                </span>
                <div className="font-semibold text-qems-text-primary mt-0.5">{event.team}</div>
                <div className="text-[11px] text-qems-text-muted ">Tenor: {event.tenor}</div>
              </div>

              <div>
                <span className="text-[10px] text-qems-text-disabled uppercase font-semibold block">
                  Process Area
                </span>
                <div className="font-semibold text-qems-text-primary mt-0.5">{event.processArea}</div>
                <div className="text-[11px] font-mono text-qems-brand-dark ">{event.sopId}</div>
              </div>

              <div>
                <span className="text-[10px] text-qems-text-disabled uppercase font-semibold block">
                  Transaction & Customer
                </span>
                <div className="font-mono text-qems-text-primary font-medium text-[11px] mt-0.5">
                  Tx: {event.transactionId}
                </div>
                <div className="font-mono text-qems-text-muted text-[11px]">
                  Cust: {event.customerId}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-qems-border-light space-y-1.5 text-xs">
              <span className="text-[10px] text-qems-text-disabled uppercase font-semibold block">
                Detailed Error Description
              </span>
              <p className="text-qems-text-secondary bg-qems-bg-surface p-2.5 rounded border border-qems-border-light leading-relaxed text-xs">
                {event.description}
              </p>
            </div>

            {/* Expected vs Actual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded bg-qems-success-bg/60 border border-emerald-200 ">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                  Expected Outcome
                </span>
                <p className="text-emerald-900 leading-snug text-xs">{event.expectedOutcome}</p>
              </div>
              <div className="p-2.5 rounded bg-qems-danger-bg/60 border border-rose-200 ">
                <span className="text-[10px] font-bold text-rose-800 uppercase block mb-1">
                  Actual Outcome
                </span>
                <p className="text-rose-900 leading-snug text-xs">{event.actualOutcome}</p>
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="p-2.5 rounded bg-qems-bg-surface border border-qems-border grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-qems-text-disabled block font-semibold">
                  Financial Impact
                </span>
                <span className="font-mono font-bold text-qems-text-primary tabular-nums">
                  {event.financialImpact !== undefined
                    ? `$${event.financialImpact.toLocaleString()}`
                    : '$0'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-qems-text-disabled block font-semibold">
                  Customer Impact
                </span>
                <span className="font-medium text-qems-text-primary ">{event.customerImpact}</span>
              </div>
              <div>
                <span className="text-[10px] text-qems-text-disabled block font-semibold">
                  Compliance Risk
                </span>
                <span
                  className={`font-semibold ${
                    event.complianceImpact === 'Breach'
                      ? 'text-qems-danger '
                      : event.complianceImpact === 'At Risk'
                      ? 'text-qems-warning '
                      : 'text-qems-success '
                  }`}
                >
                  {event.complianceImpact}
                </span>
              </div>
            </div>

            {/* SOP Reference Card */}
            <div className="p-2.5 rounded border border-indigo-100 bg-qems-brand-light/40 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-semibold text-indigo-900 ">
                  <FileText className="w-4 h-4 text-qems-brand-dark " />
                  <span>Referenced SOP: {event.sopId}</span>
                </div>
                <span className="text-[10px] text-qems-brand-dark underline cursor-pointer">
                  Open Policy
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80 italic pl-5">
                "{event.sopExcerpt}"
              </p>
            </div>
          </div>

          {/* Evidence Preview Artifacts */}
          <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-qems-border-light ">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-qems-text-muted " />
                <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                  Attached Evidence Artifacts ({(event.evidence || []).length})
                </h3>
              </div>
              <span className="text-[10px] text-qems-text-disabled font-mono">Chain of Custody Verified</span>
            </div>

            <div className="space-y-2">
              {(event.evidence || []).map((evItem) => (
                <div
                  key={evItem.id}
                  className="p-2.5 rounded border border-qems-border bg-qems-bg-surface/50 hover:bg-qems-bg-surface :bg-slate-800 transition space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      {evItem.type === 'audio' ? (
                        <Volume2 className="w-4 h-4 text-qems-brand-dark " />
                      ) : evItem.type === 'screenshot' ? (
                        <FileCode className="w-4 h-4 text-qems-success " />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-qems-warning " />
                      )}
                      <span className="font-semibold text-qems-text-primary ">{evItem.fileName}</span>
                    </div>
                    <span className="text-[10px] text-qems-text-disabled font-mono">{evItem.fileSize}</span>
                  </div>

                  {/* Audio Waveform Mock snippet */}
                  {evItem.type === 'audio' && (
                    <div className="bg-slate-900 rounded-md p-2.5 text-white flex items-center space-x-3">
                      <button className="w-7 h-7 rounded-full bg-qems-brand flex items-center justify-center text-white shrink-0 hover:bg-qems-brand-dark">
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-qems-text-disabled">
                          <span>04:12</span>
                          <span className="text-amber-400 font-bold">Defect @ 04:28</span>
                          <span>11:45</span>
                        </div>
                        <div className="flex items-center space-x-0.5 h-4">
                          {[3, 8, 12, 6, 14, 20, 16, 10, 8, 15, 22, 18, 12, 9, 5, 14, 19, 21, 15, 9, 4].map(
                            (h, idx) => (
                              <div
                                key={idx}
                                className={`w-1 rounded-full ${
                                  idx >= 8 && idx <= 12 ? 'bg-amber-400' : 'bg-slate-600'
                                }`}
                                style={{ height: `${h}px` }}
                              />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Highlighting transcript text */}
                  {evItem.highlightTimestamp && (
                    <div className="text-[11px] bg-qems-bg-white p-2 rounded border border-qems-border font-mono text-qems-text-secondary ">
                      <span className="text-qems-danger font-bold">[{evItem.highlightTimestamp}]</span>{' '}
                      <em>"...proceeding with direct wire credit to clearing acct 8820..."</em>
                    </div>
                  )}

                  <div className="text-[10px] text-qems-text-disabled flex items-center justify-between">
                    <span>Uploaded by: {evItem.uploadedBy}</span>
                    <span>{evItem.uploadedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANE: Resolution Hub (7 Cols) ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Resolution Tabs */}
          <div className="bg-qems-bg-white border border-qems-border rounded-lg overflow-hidden">
            <div className="flex border-b border-qems-border bg-qems-bg-surface/70 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('rebuttal')}
                className={`flex-1 py-2.5 px-2 flex items-center justify-center space-x-1.5 border-b-2 transition ${
                  activeTab === 'rebuttal'
                    ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white '
                    : 'border-transparent text-qems-text-muted hover:text-qems-text-primary :text-slate-200'
                }`}
              >
                <MessageSquareWarning className="w-4 h-4 hidden sm:block" />
                <span>Dispute</span>
                {event.rebuttal && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('communication')}
                className={`flex-1 py-2.5 px-2 flex items-center justify-center space-x-1.5 border-b-2 transition ${
                  activeTab === 'communication'
                    ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white '
                    : 'border-transparent text-qems-text-muted hover:text-qems-text-primary :text-slate-200'
                }`}
              >
                <MessageSquareWarning className="w-4 h-4 hidden sm:block" />
                <span>Discussion</span>
              </button>

              <button
                onClick={() => setActiveTab('rca')}
                className={`flex-1 py-2.5 px-2 flex items-center justify-center space-x-1.5 border-b-2 transition ${
                  activeTab === 'rca'
                    ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white '
                    : 'border-transparent text-qems-text-muted hover:text-qems-text-primary :text-slate-200'
                }`}
              >
                <GitFork className="w-4 h-4" />
                <span>Root Cause (RCA)</span>
                {event.rca && <Check className="w-3.5 h-3.5 text-qems-success ml-0.5" />}
              </button>

              <button
                onClick={() => setActiveTab('capa')}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center space-x-1.5 border-b-2 transition ${
                  activeTab === 'capa'
                    ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white '
                    : 'border-transparent text-qems-text-muted hover:text-qems-text-primary :text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Corrective Actions ({event.correctiveActions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center space-x-1.5 border-b-2 transition ${
                  activeTab === 'audit'
                    ? 'border-qems-brand-dark text-qems-brand-dark bg-qems-bg-white '
                    : 'border-transparent text-qems-text-muted hover:text-qems-text-primary :text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit Trail ({event.history.length})</span>
              </button>
            </div>

            <div className="p-4 flex-1 flex flex-col overflow-hidden h-[600px]">
              {/* TAB 0: COMMUNICATION */}
              {activeTab === 'communication' && (
                <div className="h-full border border-qems-border rounded-lg overflow-hidden">
                  <EventCommunication eventId={event.id} />
                </div>
              )}

              {/* TAB 1: REBUTTAL & DISPUTE */}
              {activeTab === 'rebuttal' && (
                <div className="space-y-4">
                  {/* Current Rebuttal Status Banner */}
                  {event.rebuttal ? (
                    <div className="bg-qems-warning-bg/60 border border-amber-200 rounded-lg p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MessageSquareWarning className="w-5 h-5 text-qems-warning " />
                          <div>
                            <span className="text-xs font-bold text-amber-900 ">
                              Active Rebuttal Filed by {event.rebuttal.submittedBy}
                            </span>
                            <div className="text-[11px] text-qems-warning-dark ">
                              Dispute Grounds: <strong>{event.rebuttal.category}</strong> • Submitted{' '}
                              {event.rebuttal.submittedAt}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 ">
                          {event.rebuttal.status}
                        </span>
                      </div>

                      <p className="text-xs text-qems-text-primary bg-qems-bg-white p-3 rounded border border-amber-200/60 leading-relaxed">
                        {event.rebuttal.explanation}
                      </p>

                      {/* QA Arbitration Decision if assessed */}
                      {event.rebuttal.qaResponse && (
                        <div className="mt-3 p-3 bg-qems-bg-white rounded border border-qems-brand space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-900 ">
                              QA Arbitration Decision: {event.rebuttal.qaResponse.decision}
                            </span>
                            <span className="text-[10px] text-qems-text-disabled font-mono">
                              Assessed by {event.rebuttal.qaResponse.assessedBy} @{' '}
                              {event.rebuttal.qaResponse.assessedAt}
                            </span>
                          </div>
                          <p className="text-qems-text-secondary leading-snug">
                            {event.rebuttal.qaResponse.assessmentRationale}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* If no rebuttal filed yet, show Frontline submission prompt */
                    <div className="bg-qems-bg-surface border border-qems-border rounded-lg p-3.5 space-y-3">
                      <div className="flex items-center space-x-2">
                        <MessageSquareWarning className="w-5 h-5 text-qems-brand-dark " />
                        <div>
                          <h3 className="text-xs font-bold text-qems-text-primary ">
                            No Active Dispute on File
                          </h3>
                          <p className="text-[11px] text-qems-text-muted ">
                            Frontline employees and Team Leads have a 24-hour SLA window to submit a
                            formal rebuttal.
                          </p>
                        </div>
                      </div>

                      {/* Submit Rebuttal Form */}
                      <form onSubmit={handleRebuttalSubmit} className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-qems-text-secondary mb-1">
                            Dispute Grounds / Category
                          </label>
                          <select
                            value={disputeCategory}
                            onChange={(e) => setDisputeCategory(e.target.value as DisputeCategory)}
                            className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-xs text-qems-text-primary "
                          >
                            <option value="SOP Ambiguity">SOP Ambiguity</option>
                            <option value="System UI Error">System UI Error / Tool Glitch</option>
                            <option value="Training Gap">Training Gap / Misaligned Guidance</option>
                            <option value="Evidence Discrepancy">Evidence Discrepancy</option>
                            <option value="Customer-Induced Error">Customer-Induced Error</option>
                            <option value="Policy Change Latency">Policy Change Latency</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-qems-text-secondary mb-1">
                            Rebuttal Explanation & Evidence Grounds
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Detail why this quality defect should be overturned or adjusted based on SOP, system logs, or customer behavior..."
                            value={disputeExplanation}
                            onChange={(e) => setDisputeExplanation(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-xs text-qems-text-primary placeholder-slate-400 focus:outline-none focus:border-qems-brand"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 bg-qems-warning hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>File Formal Rebuttal</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* QA Arbitration Action Form (if pending QA Review or Rebuttal Pending) */}
                  {hasPermission('canReviewRebuttal') &&
                    event.rebuttal &&
                    event.rebuttal.status === 'Pending QA' && (
                      <div className="bg-qems-brand-light/60 border border-qems-brand rounded-lg p-3.5 space-y-3">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-5 h-5 text-qems-brand-dark " />
                          <div>
                            <h3 className="text-xs font-bold text-indigo-900 ">
                              QA Arbitration & Dispute Adjudication
                            </h3>
                            <p className="text-[11px] text-qems-brand-dark ">
                              Assess employee claims objectively against SOP {event.sopId} and system
                              logs.
                            </p>
                          </div>
                        </div>

                        <form onSubmit={handleQaDecisionSubmit} className="space-y-3 pt-2">
                          <div>
                            <label className="block text-xs font-semibold text-qems-text-secondary mb-1">
                              Arbitration Determination
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { id: 'Overturn', label: 'Overturn Error', color: 'emerald' },
                                { id: 'Accept Error', label: 'Upheld Finding', color: 'rose' },
                                { id: 'Partially Accept', label: 'Partial Accept', color: 'amber' },
                                { id: 'Escalate', label: 'Escalate to Mgr', color: 'purple' },
                              ].map((opt) => (
                                <button
                                  type="button"
                                  key={opt.id}
                                  onClick={() => setQaDecision(opt.id as any)}
                                  className={`py-1.5 px-2 rounded text-xs font-semibold border transition ${
                                    qaDecision === opt.id
                                      ? 'bg-qems-brand text-white border-qems-brand-dark'
                                      : 'bg-qems-bg-white text-qems-text-secondary border-qems-border hover:bg-qems-bg-surface :bg-slate-700'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-qems-text-secondary mb-1">
                              QA Assessment Rationale & Applicable SOP Provision
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Provide transparent procedural justification. E.g.: 'Overturned due to verified UI collapsing glitch per Jira TICKET-8812...'"
                              value={qaRationale}
                              onChange={(e) => setQaRationale(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-xs text-qems-text-primary placeholder-slate-400 focus:outline-none focus:border-qems-brand"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="px-3.5 py-1.5 bg-qems-brand hover:bg-qems-brand-dark text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Submit Official Arbitration Decision</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                  {/* Multi-party Discussion Thread */}
                  <div className="space-y-2.5 pt-3 border-t border-qems-border-light ">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                      Multi-Party Dispute & Coaching Thread (
                      {event.rebuttal?.discussions?.length || 0})
                    </h3>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {(event.rebuttal?.discussions || []).map((msg) => (
                        <div
                          key={msg.id}
                          className="p-2.5 rounded border border-qems-border bg-qems-bg-surface/50 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-qems-text-primary ">{msg.author}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-qems-brand-light text-qems-brand-dark font-semibold border border-qems-brand ">
                                {msg.authorRole}
                              </span>
                            </div>
                            <span className="text-[10px] text-qems-text-disabled font-mono">
                              {msg.timestamp}
                            </span>
                          </div>
                          <p className="text-qems-text-secondary leading-relaxed">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    {/* Add reply */}
                    <form onSubmit={handlePostDiscussion} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Add comment, coaching note, or evidence reference..."
                        value={discussionMsg}
                        onChange={(e) => setDiscussionMsg(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-xs text-qems-text-primary placeholder-slate-400 focus:bg-qems-bg-white :bg-slate-800 focus:outline-none focus:border-qems-brand"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 :bg-qems-bg-secondary text-white rounded text-xs font-semibold flex items-center space-x-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: ROOT CAUSE ANALYSIS (RCA) */}
              {activeTab === 'rca' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                        Root Cause Investigation (5 Whys & Ishikawa Fishbone)
                      </h3>
                      <p className="text-[11px] text-qems-text-muted mt-0.5">
                        Drill down to systemic failures rather than attributing fault to individuals.
                      </p>
                    </div>

                    {/* AI Assist Button */}
                    <button
                      type="button"
                      onClick={handleAiSuggestRca}
                      disabled={aiRcaLoading}
                      className="px-2.5 py-1.5 bg-qems-brand-light hover:bg-qems-brand-light :bg-indigo-900/60 border border-qems-brand text-qems-brand-dark rounded text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-qems-brand-dark " />
                      <span>{aiRcaLoading ? 'Analyzing...' : 'AI RCA Assistant'}</span>
                    </button>
                  </div>

                  {/* Fishbone Category Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-qems-text-secondary uppercase tracking-wider">
                      Ishikawa (6M) Dimension
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {(
                        [
                          'People',
                          'Process',
                          'System',
                          'Environment',
                          'Management',
                          'Material',
                        ] as FishboneCategory[]
                      ).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedFishbone(cat)}
                          className={`py-1.5 px-2 rounded text-xs font-semibold border text-center transition ${
                            selectedFishbone === cat
                              ? 'bg-qems-brand text-white border-qems-brand-dark'
                              : 'bg-qems-bg-white text-qems-text-secondary border-qems-border hover:bg-qems-bg-surface :bg-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5 Whys Interactive Builder */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-qems-text-secondary uppercase tracking-wider">
                      5 Whys Iterative Analysis
                    </label>

                    {whys.map((w, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className="w-5 h-5 rounded bg-qems-bg-secondary text-qems-text-secondary font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-1 border border-qems-border ">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={w}
                          onChange={(e) => {
                            const newWhys = [...whys];
                            newWhys[idx] = e.target.value;
                            setWhys(newWhys);
                          }}
                          placeholder={`Why did this happen? (Level ${idx + 1})`}
                          className="flex-1 px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-xs text-qems-text-primary placeholder-slate-400 focus:bg-qems-bg-white :bg-slate-800 focus:outline-none focus:border-qems-brand"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Primary Cause & Recurrence Risk */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-qems-border-light ">
                    <div>
                      <label className="block text-xs font-semibold text-qems-text-secondary mb-1">
                        Primary Root Cause Category
                      </label>
                      <select
                        value={primaryCause}
                        onChange={(e) => setPrimaryCause(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-xs text-qems-text-primary "
                      >
                        <option value="SOP Ambiguity">SOP Ambiguity</option>
                        <option value="Process Gap">Process Gap</option>
                        <option value="System Issue">System UI / Infrastructure Glitch</option>
                        <option value="Training Gap">Training Gap</option>
                        <option value="Cognitive Overload">Surge Volume / Cognitive Fatigue</option>
                        <option value="Tool Misconfiguration">Tool Misconfiguration</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-qems-text-secondary mb-1">
                        Recurrence Risk Score (1 to 5)
                      </label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRcaRecurrence(num)}
                            className={`flex-1 py-1.5 rounded font-mono text-xs font-bold border transition ${
                              rcaRecurrence === num
                                ? num >= 4
                                  ? 'bg-qems-danger text-white border-rose-600'
                                  : 'bg-qems-brand text-white border-qems-brand-dark'
                                : 'bg-qems-bg-white text-qems-text-secondary border-qems-border hover:bg-qems-bg-surface :bg-slate-700'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-qems-border-light ">
                    <button
                      type="button"
                      onClick={handleSaveRca}
                      className="px-3.5 py-1.5 bg-qems-brand hover:bg-qems-brand-dark text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save & Bind RCA to Event</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: CORRECTIVE ACTIONS (CAPA) */}
              {activeTab === 'capa' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                        Corrective & Preventative Actions (CAPA)
                      </h3>
                      <p className="text-[11px] text-qems-text-muted mt-0.5">
                        Track concrete procedural remediations with scheduled effectiveness reviews.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddingCapa(true)}
                      className="px-2.5 py-1.5 bg-qems-brand hover:bg-qems-brand-dark text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add CAPA</span>
                    </button>
                  </div>

                  {/* Add CAPA Modal/Inline Form */}
                  {isAddingCapa && (
                    <form
                      onSubmit={handleCreateCapa}
                      className="p-3.5 rounded-lg border border-qems-brand bg-qems-brand-light/40 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900 ">New Corrective Action Item</span>
                        <button
                          type="button"
                          onClick={() => setIsAddingCapa(false)}
                          className="text-qems-text-disabled hover:text-qems-text-muted :text-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block font-semibold text-qems-text-secondary mb-1">
                          Action Title / Remediation Plan
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Implement required SWIFT validation in checkout modal"
                          value={newCapaTitle}
                          onChange={(e) => setNewCapaTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-qems-text-primary "
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block font-semibold text-qems-text-secondary mb-1">Type</label>
                          <select
                            value={newCapaType}
                            onChange={(e) => setNewCapaType(e.target.value as any)}
                            className="w-full px-2 py-1.5 bg-qems-bg-white border border-qems-border rounded text-qems-text-primary "
                          >
                            <option value="System Validation">System Validation Rule</option>
                            <option value="SOP Revision">SOP Revision</option>
                            <option value="Training Module">Training Module</option>
                            <option value="Coaching Session">1-on-1 Coaching</option>
                            <option value="Process Checkpoint">Process Checkpoint</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-qems-text-secondary mb-1">Owner</label>
                          <input
                            type="text"
                            value={newCapaOwner}
                            onChange={(e) => setNewCapaOwner(e.target.value)}
                            className="w-full px-2 py-1.5 bg-qems-bg-white border border-qems-border rounded text-qems-text-primary "
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-qems-text-secondary mb-1">Due Date</label>
                          <input
                            type="date"
                            value={newCapaDueDate}
                            onChange={(e) => setNewCapaDueDate(e.target.value)}
                            className="w-full px-2 py-1.5 bg-qems-bg-white border border-qems-border rounded font-mono text-qems-text-primary "
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-qems-text-secondary mb-1">
                          Verification Method
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Audit sample of 25 consecutive international transfers"
                          value={newCapaMethod}
                          onChange={(e) => setNewCapaMethod(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-qems-text-primary "
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingCapa(false)}
                          className="px-2.5 py-1.5 border border-qems-border rounded text-qems-text-muted hover:bg-qems-bg-white :bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-qems-brand text-white rounded font-semibold hover:bg-qems-brand-dark"
                        >
                          Save Action Item
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Actions List */}
                  <div className="space-y-2">
                    {(!event.correctiveActions || event.correctiveActions.length === 0) ? (
                      <div className="p-6 text-center text-xs text-qems-text-disabled border border-dashed border-qems-border rounded">
                        No corrective actions registered yet. Click "+ Add CAPA" above.
                      </div>
                    ) : (
                      (event.correctiveActions || []).map((action) => (
                        <div
                          key={action.id}
                          className="p-3 rounded border border-qems-border bg-qems-bg-white space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-bold text-qems-brand-dark ">
                                  {action.id}
                                </span>
                                <span className="font-semibold text-qems-text-primary ">{action.title}</span>
                              </div>
                              <div className="text-[11px] text-qems-text-muted mt-0.5">
                                Type: <strong className="text-qems-text-secondary ">{action.type}</strong> • Owner: {action.owner} • Due:{' '}
                                <strong className="font-mono text-qems-text-secondary ">{action.dueDate}</strong>
                              </div>
                            </div>

                            {/* Status Selector */}
                            <select
                              value={action.status}
                              onChange={(e) =>
                                updateCorrectiveActionStatus(
                                  event.id,
                                  action.id,
                                  e.target.value as any
                                )
                              }
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                action.status === 'Completed'
                                  ? 'bg-qems-success-bg text-emerald-800 border-emerald-300 '
                                  : action.status === 'In Progress'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300 '
                                  : 'bg-qems-bg-surface text-qems-text-secondary border-qems-border '
                              }`}
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>

                          <div className="text-[11px] text-qems-text-muted bg-qems-bg-surface p-2 rounded border border-qems-border-light flex items-center justify-between">
                            <span>
                              <strong className="text-qems-text-secondary ">Verification:</strong> {action.verificationMethod}
                            </span>
                            {action.completedAt && (
                              <span className="text-[10px] text-qems-success-dark font-mono">
                                Closed {action.completedAt}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 30-Day Effectiveness Review Form */}
                  <div className="pt-3 border-t border-qems-border-light space-y-2.5">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-qems-success " />
                      <div>
                        <h4 className="text-xs font-bold text-qems-text-primary ">
                          30-Day Post-Remediation Effectiveness Verification
                        </h4>
                        <p className="text-[11px] text-qems-text-muted ">
                          Confirm defect recurrence rate post-CAPA before final closure.
                        </p>
                      </div>
                    </div>

                    {event.effectiveness ? (
                      <div className="p-3 rounded bg-qems-success-bg/60 border border-emerald-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900 ">
                            Verified Result: {event.effectiveness.decision}
                          </span>
                          <span className="text-[10px] text-qems-success-dark font-mono">
                            Reviewed by {event.effectiveness.reviewer} @{' '}
                            {event.effectiveness.completedDate}
                          </span>
                        </div>
                        <p className="text-emerald-800 text-[11px]">
                          {event.effectiveness.metricsObserved}
                        </p>
                        <p className="text-qems-text-secondary italic text-[11px]">
                          "{event.effectiveness.rationale}"
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveEffectiveness} className="space-y-2.5 text-xs">
                        <div>
                          <label className="block font-semibold text-qems-text-secondary mb-1">
                            Metrics Observed in Post-Audit Sampling
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 0 defects recorded in 100 sample audit transactions over 30 days."
                            value={effMetrics}
                            onChange={(e) => setEffMetrics(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-xs text-qems-text-primary placeholder-slate-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-qems-text-secondary mb-1">
                              Verification Finding
                            </label>
                            <select
                              value={effDecision}
                              onChange={(e) => setEffDecision(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-xs text-qems-text-primary "
                            >
                              <option value="Effective">Effective (Close Event)</option>
                              <option value="Ineffective">Ineffective (Reopen RCA)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-semibold text-qems-text-secondary mb-1">
                              Reviewer Notes
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Auditor rationale for closure..."
                              value={effRationale}
                              onChange={(e) => setEffRationale(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-xs text-qems-text-primary placeholder-slate-400"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 bg-qems-success hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                          >
                            Sign-off Effectiveness Review
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT TRAIL */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-qems-border-light ">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                        Immutable Compliance Audit Trail
                      </h3>
                      <p className="text-[11px] text-qems-text-muted mt-0.5">
                        21 CFR Part 11 / ISO 9001 cryptographic event log with state differentials.
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-qems-success-bg text-emerald-800 rounded font-mono font-bold border border-emerald-200 ">
                      Tamper Proof
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 :bg-slate-800">
                    {(event.history || []).map((item) => (
                      <div key={item.id} className="relative text-xs space-y-1">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-qems-brand ring-4 ring-white " />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-qems-text-primary ">{item.who}</span>
                            <span className="text-[10px] text-qems-text-muted ">({item.role})</span>
                          </div>
                          <span className="text-[10px] text-qems-text-disabled font-mono">{item.when}</span>
                        </div>
                        <div className="text-qems-text-primary font-medium">{item.what}</div>

                        {item.previousValue && item.newValue && (
                          <div className="text-[11px] font-mono text-qems-text-muted bg-qems-bg-surface p-1.5 rounded border border-qems-border inline-block">
                            <span className="text-qems-danger ">{item.previousValue}</span> →{' '}
                            <span className="text-qems-success ">{item.newValue}</span>
                          </div>
                        )}

                        {item.reason && (
                          <div className="text-[11px] text-qems-text-muted italic">"{item.reason}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
