import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ExternalLink,
  ShieldAlert,
  Send,
  Scale,
  ArrowRight,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { StatusBadge, SeverityBadge, SLABadge } from '../common/StatusBadge';
import { SLATimer } from '../common/SLATimer';

export const DisputeCenter: React.FC = () => {
  const {
    events,
    setSelectedEventId,
    setActiveSection,
    currentRole,
    resolveRebuttal,
    addDiscussionMessage,
    addToast,
  } = useQEMS();

  // Filter events with rebuttals
  const disputeEvents = events.filter(
    (e) =>
      e.status === 'Rebuttal Pending' ||
      e.status === 'QA Review' ||
      e.status === 'Escalated' ||
      e.status === 'Overturned' ||
      (e.rebuttal !== undefined)
  );

  const [selectedDisputeId, setSelectedDisputeId] = useState<string>(
    disputeEvents[0]?.id || 'QEMS-2026-001284'
  );
  const [qaDecision, setQaDecision] = useState<'Accept Error' | 'Overturn' | 'Partially Accept' | 'Escalate'>('Overturn');
  const [qaRationale, setQaRationale] = useState('');
  const [discussionMsg, setDiscussionMsg] = useState('');

  const selectedEvent = events.find((e) => e.id === selectedDisputeId) || disputeEvents[0];

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (!qaRationale.trim()) {
      addToast({
        type: 'warning',
        title: 'Rationale Required',
        description: 'Please provide procedural justification for this dispute decision.',
      });
      return;
    }
    resolveRebuttal(selectedEvent.id, qaDecision, qaRationale);
    setQaRationale('');
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !discussionMsg.trim()) return;
    addDiscussionMessage(selectedEvent.id, discussionMsg);
    setDiscussionMsg('');
  };

  // Metrics
  const pendingCount = events.filter((e) => e.status === 'Rebuttal Pending').length;
  const overturnedCount = events.filter((e) => e.status === 'Overturned').length;
  const upheldCount = events.filter((e) => e.status === 'Upheld').length;
  const overturnRate = Math.round((overturnedCount / Math.max(1, overturnedCount + upheldCount)) * 100);

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-qems-warning-bg px-2 py-0.5 rounded border border-amber-200 ">
              Fairness & Due Process
            </span>
            <span className="text-xs text-qems-text-disabled ">•</span>
            <span className="text-xs font-medium text-qems-text-muted ">
              QA Adjudication Engine
            </span>
          </div>
          <h1 className="text-base font-bold text-qems-text-primary mt-1 tracking-tight">
            Dispute & Rebuttal Resolution Center
          </h1>
          <p className="text-xs text-qems-text-muted mt-0.5">
            Transparent arbitration of frontline appeals against documented procedural defects.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="bg-qems-bg-surface border border-qems-border px-3 py-1.5 rounded">
            <span className="text-qems-text-disabled text-[10px] block">Pending QA</span>
            <strong className="text-qems-warning text-sm">{pendingCount}</strong>
          </div>
          <div className="bg-qems-bg-surface border border-qems-border px-3 py-1.5 rounded">
            <span className="text-qems-text-disabled text-[10px] block">Overturn Rate</span>
            <strong className="text-qems-brand-dark text-sm">{overturnRate}%</strong>
          </div>
        </div>
      </div>

      {/* Main Dispute Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Queue List (5 Cols) */}
        <div className="lg:col-span-5 bg-qems-bg-white border border-qems-border rounded-lg overflow-hidden flex flex-col h-[640px]">
          <div className="p-3 border-b border-qems-border bg-qems-bg-surface/70 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-qems-text-secondary ">
              Active Appeals & Rebuttals ({disputeEvents.length})
            </span>
            <span className="text-[10px] text-qems-text-disabled font-mono">Sorted by SLA</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 ">
            {disputeEvents.map((ev) => {
              const isSelected = ev.id === selectedDisputeId;
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedDisputeId(ev.id)}
                  className={`p-3 cursor-pointer transition ${
                    isSelected
                      ? 'bg-qems-brand-light/80 border-l-4 border-qems-brand-dark'
                      : 'hover:bg-qems-bg-surface :bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-qems-brand-dark ">
                      {ev.id}
                    </span>
                    <SLABadge status={ev.slaStatus} hoursRemaining={ev.slaHoursRemaining} />
                  </div>

                  <h4 className="text-xs font-semibold text-qems-text-primary line-clamp-1">
                    {ev.title}
                  </h4>

                  <div className="text-[11px] text-qems-text-muted mt-1 flex items-center justify-between">
                    <span>
                      Emp: <strong className="text-qems-text-secondary ">{ev.employee}</strong>
                    </span>
                    <span className="font-mono text-[10px] text-qems-text-disabled ">{ev.sopId}</span>
                  </div>

                  {ev.rebuttal && (
                    <div className="mt-1.5 text-[11px] bg-qems-bg-white p-2 rounded border border-amber-200 text-amber-900 line-clamp-2">
                      <strong className="text-amber-800 ">Grounds: [{ev.rebuttal.category}]</strong>{' '}
                      {ev.rebuttal.explanation}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <StatusBadge status={ev.status} />
                    <span className="text-qems-text-disabled ">{ev.team}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Adjudication Detail (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedEvent ? (
            <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 space-y-3.5">
              <div className="flex items-start justify-between pb-3 border-b border-qems-border ">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-mono text-xs font-bold text-qems-brand-dark ">
                      {selectedEvent.id}
                    </span>
                    <StatusBadge status={selectedEvent.status} />
                    <SeverityBadge severity={selectedEvent.severity} />
                  </div>
                  <h2 className="text-sm font-bold text-qems-text-primary ">{selectedEvent.title}</h2>
                  <div className="text-xs text-qems-text-muted mt-0.5">
                    Evaluated: <strong className="text-qems-text-secondary ">{selectedEvent.employee}</strong> ({selectedEvent.team}) •
                    Auditor: {selectedEvent.owner}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedEventId(selectedEvent.id);
                    setActiveSection('QUALITY EVENTS');
                  }}
                  className="px-2.5 py-1 bg-qems-bg-secondary hover:bg-slate-200 :bg-slate-700 text-qems-text-secondary rounded text-xs font-semibold flex items-center space-x-1 border border-qems-border transition"
                >
                  <span>Full Workspace</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* SLA Clock */}
              <SLATimer
                hoursRemaining={selectedEvent.slaHoursRemaining}
                status={selectedEvent.slaStatus}
                deadline={selectedEvent.slaDeadline}
              />

              {/* Frontline Claim Card */}
              {selectedEvent.rebuttal ? (
                <div className="bg-qems-warning-bg/60 border border-amber-200 rounded p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Employee Rebuttal Claim ({selectedEvent.rebuttal.category})
                    </span>
                    <span className="text-[10px] text-qems-warning-dark font-mono">
                      Filed: {selectedEvent.rebuttal.submittedAt}
                    </span>
                  </div>
                  <p className="text-xs text-qems-text-primary bg-qems-bg-white p-2.5 rounded border border-amber-200/60 leading-relaxed">
                    {selectedEvent.rebuttal.explanation}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-qems-bg-surface rounded border border-qems-border text-xs text-qems-text-muted text-center">
                  No rebuttal currently on file for this record.
                </div>
              )}

              {/* QA Arbitration Action Box */}
              {(currentRole === 'QA Auditor' ||
                currentRole === 'QA Manager' ||
                currentRole === 'Quality Governance') && (
                <form
                  onSubmit={handleResolve}
                  className="p-3.5 rounded border border-qems-brand bg-qems-brand-light/40 space-y-3 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-qems-brand-dark " />
                    <span className="font-bold text-indigo-900 ">
                      QA Formal Arbitration Decision
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-qems-text-secondary mb-1">
                      Adjudication Decision
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'Overturn', label: 'Overturn Error', desc: 'Employee claim valid' },
                        { id: 'Accept Error', label: 'Upheld Finding', desc: 'Error confirmed' },
                        { id: 'Partially Accept', label: 'Partial Accept', desc: 'Reduce severity' },
                        { id: 'Escalate', label: 'Escalate', desc: 'Governance panel' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setQaDecision(opt.id as any)}
                          className={`p-2 rounded border text-left transition ${
                            qaDecision === opt.id
                              ? 'bg-qems-brand text-white border-qems-brand-dark'
                              : 'bg-qems-bg-white text-qems-text-secondary border-qems-border hover:bg-qems-bg-surface :bg-slate-700'
                          }`}
                        >
                          <div className="font-bold">{opt.label}</div>
                          <div
                            className={`text-[10px] ${
                              qaDecision === opt.id ? 'text-indigo-100' : 'text-qems-text-disabled '
                            }`}
                          >
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-qems-text-secondary mb-1">
                      Auditor Rationale & SOP Citation
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Detail transparent findings. E.g. 'Evidence review confirmed regional UI tool latency issue per SOP 014 exemption.'"
                      value={qaRationale}
                      onChange={(e) => setQaRationale(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-qems-text-primary placeholder-slate-400"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-qems-brand hover:bg-qems-brand-dark text-white rounded font-semibold flex items-center space-x-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Submit Arbitration Ruling</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Discussion thread */}
              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-qems-text-secondary block">
                  Appeal Discussion History ({selectedEvent.rebuttal?.discussions?.length || 0})
                </span>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(selectedEvent.rebuttal?.discussions || []).map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 rounded border border-qems-border bg-qems-bg-surface/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <strong className="text-qems-text-primary ">{d.author}</strong>
                          <span className="text-[10px] px-1 rounded bg-qems-brand-light text-qems-brand-dark border border-qems-brand ">
                            {d.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-qems-text-disabled font-mono">{d.timestamp}</span>
                      </div>
                      <p className="text-qems-text-secondary ">{d.message}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handlePostComment} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add comment to arbitration thread..."
                    value={discussionMsg}
                    onChange={(e) => setDiscussionMsg(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-xs text-qems-text-primary "
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 :bg-qems-bg-white transition"
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-qems-bg-white border border-qems-border rounded-lg p-12 text-center text-xs text-qems-text-disabled ">
              Select a dispute record from the queue to review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
