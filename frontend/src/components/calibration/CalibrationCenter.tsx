import React, { useState } from 'react';
import {
  Scale,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  Award,
  Eye,
  Plus,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { CalibrationSession } from '../../types';

export const CalibrationCenter: React.FC = () => {
  const { calibrations, addToast } = useQEMS();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(calibrations[0]?.id || 'CAL-2026-088');

  const selectedSession =
    calibrations.find((c) => c.id === selectedSessionId) || calibrations[0];

  const handleCreateSession = () => {
    addToast({
      type: 'info',
      title: 'Calibration Session Scheduled',
      message: 'Invites dispatched to 4 QA auditors for blind scoring.',
    });
  };

  const getParticipants = (session: any) => {
    if (Array.isArray(session?.participants)) return session.participants;
    if (Array.isArray(session?.evaluators)) {
      return session.evaluators.map((e: any) => ({
        name: e.auditorName || e.name || 'Auditor',
        role: e.role || 'QA Auditor',
        score: e.score,
        submitted: true,
        notes: e.notes || '',
      }));
    }
    return [];
  };

  const getBenchmarkScore = (session: any) => {
    return session?.finalCalibratedScore ?? session?.benchmarkScore ?? 88;
  };

  const getSampleCaseId = (session: any) => {
    return session?.sampleCaseId || session?.sampleInteractionId || 'QEMS-2026-001284';
  };

  const getScheduledDate = (session: any) => {
    return session?.scheduledDate || session?.date || '2026-09-18';
  };

  const getAlignmentPercent = (session: any) => {
    if (typeof session?.overallAlignment === 'number') return session.overallAlignment;
    const variance = session?.scoreVariance ?? 3;
    return Math.max(70, Math.round(100 - variance * 1.6));
  };

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-800">
              Audit Consistency
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Auditor Consensus & Alignment
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            Calibration & Quality Alignment Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Blind multi-evaluator reviews to minimize scoring subjectivity and eliminate auditor variance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded text-xs font-mono">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] block">Avg Team Alignment</span>
            <strong className="text-indigo-600 dark:text-indigo-400 text-sm">91.4%</strong>
          </div>
          <button
            onClick={handleCreateSession}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sessions List (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Sessions History ({calibrations.length})
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Monthly Rhythm</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(calibrations || []).map((session) => {
              const isSelected = session.id === selectedSessionId;
              const sampleId = getSampleCaseId(session);
              const schedDate = getScheduledDate(session);
              const alignment = getAlignmentPercent(session);

              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`p-3 cursor-pointer transition ${
                    isSelected ? 'bg-violet-50/80 dark:bg-violet-950/40 border-l-4 border-violet-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-violet-700 dark:text-violet-400">
                      {session.id}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        session.status === 'Completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {session.title}
                  </h4>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                    <span>{session.processArea}</span>
                    <span className="font-mono text-[10px]">{schedDate}</span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 dark:text-slate-500">
                      Sample: <strong className="text-slate-700 dark:text-slate-300 font-mono">{sampleId}</strong>
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {alignment}% Agreement
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session Detail & Side-by-Side Variance Analysis (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedSession && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-mono text-xs font-bold text-violet-700 dark:text-violet-400">
                      {selectedSession.id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700">
                      {getScheduledDate(selectedSession)}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">{selectedSession.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluated Transaction:{' '}
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {getSampleCaseId(selectedSession)}
                    </strong>{' '}
                    • Process: {selectedSession.processArea}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                    Benchmark Consensus
                  </span>
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {getBenchmarkScore(selectedSession)}%
                  </span>
                </div>
              </div>

              {/* Side-by-Side Multi-Auditor Comparison */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Multi-Auditor Blind Evaluation Results
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Target Variance Tolerance: <strong className="text-slate-700 dark:text-slate-300">±3.0%</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Auditor</th>
                        <th className="py-2.5 px-3 font-mono text-right">Score</th>
                        <th className="py-2.5 px-3 font-mono text-right">Variance vs Benchmark</th>
                        <th className="py-2.5 px-3">Audit Notes & Findings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {getParticipants(selectedSession).map((ev: any, idx: number) => {
                        const scoreVal = ev.score ?? getBenchmarkScore(selectedSession);
                        const benchmark = getBenchmarkScore(selectedSession);
                        const variance = scoreVal - benchmark;
                        const isHighVariance = Math.abs(variance) > 3;
                        const auditorName = ev.name || ev.auditorName || `Auditor ${idx + 1}`;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {auditorName} <span className="text-[10px] text-slate-400 font-normal">({ev.role || 'Evaluator'})</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 dark:text-white">
                              {ev.score !== undefined ? `${ev.score}%` : 'Pending'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right">
                              {ev.score !== undefined ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold text-[11px] border ${
                                    variance === 0
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                      : isHighVariance
                                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  }`}
                                >
                                  {variance > 0 ? `+${variance}%` : `${variance}%`}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">In Progress</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                              {ev.notes || (ev.submitted ? 'Scoring submitted according to calibration rubrics.' : 'Blind scoring in progress.')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Consensus Points & Action Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="p-3 rounded bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] uppercase tracking-wider">
                    Disagreement & Root Cause of Variance
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    Auditor Michael Torres marked Section 3 (Account Verification) as non-compliant,
                    while other auditors interpreted customer verbal affirmation as sufficient under
                    provisional SOP waiver 2026-B.
                  </p>
                </div>

                <div className="p-3 rounded bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-1">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 block text-[11px] uppercase tracking-wider">
                    Alignment Consensus Decision
                  </span>
                  <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed text-[11px]">
                    Team agreed to adopt 89% benchmark. Issued operational clarification note to SOP-PAY-014
                    specifying mandatory secondary token check for all third-party wires.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
