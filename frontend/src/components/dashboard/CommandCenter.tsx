import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Filter,
  ShieldCheck,
  Zap,
  Users,
  Eye,
  FileCheck2,
  ShieldAlert,
  SlidersHorizontal,
  Activity,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { StatusBadge, SeverityBadge, SLABadge } from '../common/StatusBadge';
import { QualityEvent } from '../../types';

type ActionCategory =
  | 'ALL'
  | 'REBUTTALS'
  | 'REVIEWS'
  | 'SLA_RISKS'
  | 'ESCALATIONS'
  | 'CAPAS_DUE'
  | 'APPROVALS'
  | 'EFFECTIVENESS';

export const CommandCenter: React.FC = () => {
  const {
    events,
    currentRole,
    currentUser,
    setSelectedEventId,
    setActiveSection,
    setParetoDrillDownCategory,
  } = useQEMS();

  const [activeActionFilter, setActiveActionFilter] = useState<ActionCategory>('ALL');
  const [trendMetric, setTrendMetric] = useState<'volume' | 'critical' | 'rebuttals'>('volume');

  // Compute realistic KPIs for QUALITY HEALTH
  const totalEvents = events.length;
  const openEvents = events.filter((e) => e.status !== 'Closed').length;
  const criticalErrors = events.filter((e) => e.severity === 'CRITICAL').length;
  const openRebuttals = events.filter(
    (e) => e.status === 'Rebuttal Pending' || (e.rebuttal && e.rebuttal.status === 'Pending QA')
  ).length;
  const slaCompliance = 94.8;
  const ftr = 87.2;
  const avgResolutionHours = 18.4;

  // "MY ACTIONS" category calculations
  const rebuttalsWaiting = events.filter(
    (e) => e.status === 'Rebuttal Pending' || (e.rebuttal && e.rebuttal.status === 'Pending QA')
  );
  const reviewsWaiting = events.filter(
    (e) => e.status === 'Under Review' || e.status === 'QA Review' || e.status === 'Manager Review'
  );
  const slaRisks = events.filter((e) => e.slaStatus === 'At Risk' || e.slaStatus === 'Breached');
  const escalations = events.filter((e) => e.status === 'Escalated');
  const correctiveActionsDue = events.filter(
    (e) =>
      e.status === 'Corrective Action' ||
      e.correctiveActions.some((c) => c.status === 'In Progress' || c.status === 'Not Started')
  );
  const approvalsWaiting = events.filter(
    (e) => e.status === 'Manager Review' || (e.rebuttal && (e.rebuttal.status === 'Escalated' || (e.rebuttal.status as string) === 'Escalated to Manager'))
  );
  const effectivenessReviews = events.filter((e) => e.status === 'Effectiveness Review');

  // Filtered action items
  const getFilteredActions = (): QualityEvent[] => {
    switch (activeActionFilter) {
      case 'REBUTTALS':
        return rebuttalsWaiting;
      case 'REVIEWS':
        return reviewsWaiting;
      case 'SLA_RISKS':
        return slaRisks;
      case 'ESCALATIONS':
        return escalations;
      case 'CAPAS_DUE':
        return correctiveActionsDue;
      case 'APPROVALS':
        return approvalsWaiting;
      case 'EFFECTIVENESS':
        return effectivenessReviews;
      case 'ALL':
      default:
        // Priority sorted attention list
        const combined = [
          ...rebuttalsWaiting,
          ...slaRisks,
          ...escalations,
          ...correctiveActionsDue,
          ...effectivenessReviews,
        ];
        // Deduplicate
        const seen = new Set<string>();
        return combined.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
    }
  };

  const actionList = getFilteredActions().slice(0, 7);

  // Root cause counts for Pareto
  const rootCauseCounts: Record<string, number> = {};
  events.forEach((e) => {
    if (e.rootCause) {
      rootCauseCounts[e.rootCause] = (rootCauseCounts[e.rootCause] || 0) + 1;
    }
  });

  const topRootCauses = Object.entries(rootCauseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Top Error Processes (Pareto 80/20)
  const processCounts: Record<string, number> = {};
  events.forEach((e) => {
    processCounts[e.processArea] = (processCounts[e.processArea] || 0) + 1;
  });
  const topProcesses = Object.entries(processCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const openEvent = (id: string) => {
    setSelectedEventId(id);
    setActiveSection('QUALITY EVENTS');
  };

  const handleDrillDownProcess = (proc: string) => {
    setParetoDrillDownCategory(proc);
    setActiveSection('QUALITY EVENTS');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. WHAT NEEDS MY ATTENTION? / MY ACTIONS (FIRST THING USERS SEE)           */}
      {/* ========================================================================= */}
      <section id="what-needs-attention" className="bg-qems-bg-white border border-qems-border rounded-lg overflow-hidden">
        {/* Header with Role Context */}
        <div className="p-4 sm:p-5 border-b border-qems-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-qems-bg-surface/70 ">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-qems-text-muted ">
                Action Required • Priority Queue
              </span>
              <span className="text-slate-300 ">•</span>
              <span className="text-[11px] font-medium text-qems-text-muted ">
                Operating Persona: <strong className="text-qems-text-primary font-semibold">{currentRole}</strong>
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-qems-text-primary mt-1 tracking-tight">
              WHAT NEEDS MY ATTENTION?
            </h1>
            <p className="text-xs text-qems-text-muted mt-0.5">
              Triage open rebuttals, impending SLA deadlines, pending review decisions, and corrective action commitments.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => openEvent('QEMS-2026-001284')}
              className="px-3 py-1.5 bg-qems-brand-light hover:bg-qems-brand-light :bg-indigo-900/50 text-qems-brand-dark border border-qems-brand rounded-md text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Zap className="w-3.5 h-3.5 text-qems-brand-dark " />
              <span>Sample Case: QEMS-2026-001284</span>
            </button>
            <button
              onClick={() => setActiveSection('QUALITY EVENTS')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 :bg-slate-200 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <span>All {events.length} Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MY ACTIONS Sub-category Navigation Pills */}
        <div className="px-4 sm:px-5 py-2 bg-qems-bg-surface/40 border-b border-qems-border flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-qems-text-disabled uppercase tracking-wider mr-1 shrink-0">
            Filter Queue:
          </span>

          <button
            onClick={() => setActiveActionFilter('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'ALL'
                ? 'bg-slate-900 text-white '
                : 'text-qems-text-muted hover:bg-slate-200/60 :bg-slate-800'
            }`}
          >
            <span>All Items</span>
            <span className="px-1.5 py-0.2 bg-black/15 text-[10px] rounded font-mono">
              {rebuttalsWaiting.length + slaRisks.length + escalations.length + correctiveActionsDue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('REBUTTALS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'REBUTTALS'
                ? 'bg-qems-warning text-white'
                : 'text-qems-text-muted hover:bg-slate-200/60 :bg-slate-800'
            }`}
          >
            <span>Rebuttals waiting for response</span>
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[10px] rounded font-mono font-bold">
              {rebuttalsWaiting.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('REVIEWS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'REVIEWS'
                ? 'bg-qems-brand text-white'
                : 'text-qems-text-muted hover:bg-slate-200/60 :bg-slate-800'
            }`}
          >
            <span>Reviews waiting for decision</span>
            <span className="px-1.5 py-0.2 bg-qems-brand-light text-indigo-900 text-[10px] rounded font-mono font-bold">
              {reviewsWaiting.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('SLA_RISKS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'SLA_RISKS'
                ? 'bg-qems-danger text-white'
                : 'text-qems-text-muted hover:bg-slate-200/60 :bg-slate-800'
            }`}
          >
            <span>SLA risks</span>
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-900 text-[10px] rounded font-mono font-bold">
              {slaRisks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('ESCALATIONS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'ESCALATIONS'
                ? 'bg-purple-600 text-white'
                : 'text-qems-text-muted hover:bg-slate-200/60 :bg-slate-800'
            }`}
          >
            <span>Escalations</span>
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-900 text-[10px] rounded font-mono font-bold">
              {escalations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('CAPAS_DUE')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'CAPAS_DUE'
                ? 'bg-blue-600 text-white'
                : 'text-qems-text-muted hover:bg-slate-200/60 :bg-slate-800'
            }`}
          >
            <span>Corrective actions due</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 text-[10px] rounded font-mono font-bold">
              {correctiveActionsDue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('APPROVALS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'APPROVALS'
                ? 'bg-qems-success text-white'
                : 'text-qems-text-muted hover:bg-slate-200/60 :bg-slate-800'
            }`}
          >
            <span>Approvals</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 text-[10px] rounded font-mono font-bold">
              {approvalsWaiting.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('EFFECTIVENESS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'EFFECTIVENESS'
                ? 'bg-teal-600 text-white'
                : 'text-qems-text-muted hover:bg-slate-200/60 :bg-slate-800'
            }`}
          >
            <span>Effectiveness reviews</span>
            <span className="px-1.5 py-0.2 bg-teal-100 text-teal-900 text-[10px] rounded font-mono font-bold">
              {effectivenessReviews.length}
            </span>
          </button>
        </div>

        {/* Action Items Interactive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-qems-bg-surface text-qems-text-muted border-b border-qems-border text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Event ID</th>
                <th className="py-2.5 px-3">Title & Process</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">SLA Status</th>
                <th className="py-2.5 px-3">Owner</th>
                <th className="py-2.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {actionList.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openEvent(item.id)}
                  className="hover:bg-qems-brand-light/40 :bg-indigo-950/30 cursor-pointer transition group"
                >
                  <td className="py-2.5 px-4 font-mono font-bold text-qems-brand-dark group-hover:underline">
                    {item.id}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-qems-text-primary ">{item.title}</div>
                    <div className="text-[10px] text-qems-text-disabled ">
                      {item.processArea} • {item.sopId}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-qems-text-primary font-medium">{item.employee}</div>
                    <div className="text-[10px] text-qems-text-disabled ">{item.team}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-2.5 px-3">
                    <SLABadge status={item.slaStatus} hoursRemaining={item.slaHoursRemaining} />
                  </td>
                  <td className="py-2.5 px-3 text-qems-text-muted ">{item.owner}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 bg-qems-bg-white border border-qems-border rounded text-[11px] font-semibold text-qems-brand-dark group-hover:border-indigo-400 transition">
                      <Eye className="w-3 h-3 mr-1" />
                      Take Action
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. QUALITY HEALTH (KPI METRICS)                                            */}
      {/* ========================================================================= */}
      <section id="quality-health" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-qems-brand-dark " />
            <h2 className="text-xs font-bold uppercase tracking-wider text-qems-text-secondary ">
              QUALITY HEALTH METRICS
            </h2>
          </div>
          <span className="text-[11px] text-qems-text-disabled font-mono">Real-time enterprise operational telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled block">
              Total Quality Events
            </span>
            <div className="text-2xl font-bold font-mono text-qems-text-primary mt-1 tabular-nums">{totalEvents}</div>
            <div className="flex items-center space-x-1 text-[11px] text-qems-success mt-1">
              <TrendingDown className="w-3 h-3" />
              <span>-6.4% vs 30d base</span>
            </div>
          </div>

          <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled block">
              Open Events
            </span>
            <div className="text-2xl font-bold font-mono text-qems-warning mt-1 tabular-nums">{openEvents}</div>
            <div className="flex items-center space-x-1 text-[11px] text-qems-text-muted mt-1">
              <span>{totalEvents > 0 ? Math.round((openEvents / totalEvents) * 100) : 0}% active pipeline</span>
            </div>
          </div>

          <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled block">
              Critical Events
            </span>
            <div className="text-2xl font-bold font-mono text-qems-danger mt-1 tabular-nums">{criticalErrors}</div>
            <div className="flex items-center space-x-1 text-[11px] text-qems-danger mt-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Zero AML breaches</span>
            </div>
          </div>

          <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled block">
              SLA Compliance
            </span>
            <div className="text-2xl font-bold font-mono text-qems-text-primary mt-1 tabular-nums">{slaCompliance}%</div>
            <div className="flex items-center space-x-1 text-[11px] text-qems-success mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+2.1% MoM</span>
            </div>
          </div>

          <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled block">
              First-Time-Right (FTR)
            </span>
            <div className="text-2xl font-bold font-mono text-qems-text-primary mt-1 tabular-nums">{ftr}%</div>
            <div className="flex items-center space-x-1 text-[11px] text-qems-success mt-1">
              <Award className="w-3 h-3" />
              <span>Target: &gt;85.0%</span>
            </div>
          </div>

          <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled block">
              Avg Resolution Time
            </span>
            <div className="text-2xl font-bold font-mono text-qems-text-primary mt-1 tabular-nums">{avgResolutionHours}h</div>
            <div className="flex items-center space-x-1 text-[11px] text-qems-text-muted mt-1">
              <span>SLA ceiling: 24.0h</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. QUALITY TRENDS & 4. TOP QUALITY DRIVERS (PARETO)                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 3. QUALITY TRENDS */}
        <section id="quality-trends" className="bg-qems-bg-white border border-qems-border rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-qems-border-light ">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-qems-brand-dark " />
                <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                  QUALITY TRENDS (14-DAY DEFECT VELOCITY)
                </h3>
              </div>
              <p className="text-[11px] text-qems-text-muted mt-0.5">
                Daily logged defect volume compared against operational threshold ceiling
              </p>
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-mono">
              <button
                onClick={() => setTrendMetric('volume')}
                className={`px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                  trendMetric === 'volume'
                    ? 'bg-qems-brand text-white border-qems-brand-dark'
                    : 'bg-qems-bg-surface text-qems-text-muted border-qems-border '
                }`}
              >
                Volume
              </button>
              <button
                onClick={() => setTrendMetric('critical')}
                className={`px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                  trendMetric === 'critical'
                    ? 'bg-qems-danger text-white border-rose-600'
                    : 'bg-qems-bg-surface text-qems-text-muted border-qems-border '
                }`}
              >
                Critical
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-qems-border-light flex flex-col space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-qems-text-primary">14-Day Velocity</span>
              <span className="font-mono text-qems-warning font-bold">18 Defect Average / Day</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-qems-text-muted">Target Threshold</span>
              <span className="font-mono text-qems-text-secondary">&lt; 15 Defects / Day</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-qems-text-disabled font-mono mt-2 pt-2 border-t border-qems-border-light ">
            <span>Sep 01</span>
            <span>Sep 05</span>
            <span>Sep 09</span>
            <span>Sep 13</span>
            <span>Today (Sep 15)</span>
          </div>
        </section>

        {/* 4. TOP QUALITY DRIVERS (PARETO 80/20) */}
        <section id="top-quality-drivers" className="bg-qems-bg-white border border-qems-border rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-qems-border-light ">
            <div>
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-qems-brand-dark " />
                <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                  TOP QUALITY DRIVERS (PARETO 80/20)
                </h3>
              </div>
              <p className="text-[11px] text-qems-text-muted mt-0.5">
                Click any process area to drill down directly into filtered quality records
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-qems-warning-bg text-amber-800 font-mono font-bold rounded border border-amber-200 ">
              80/20 Rule
            </span>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {topProcesses.map(([proc, count], idx) => {
              const percent = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
              return (
                <div
                  key={proc}
                  onClick={() => handleDrillDownProcess(proc)}
                  className="space-y-1 p-1.5 rounded hover:bg-qems-bg-surface :bg-slate-800/60 cursor-pointer transition"
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-qems-text-primary flex items-center">
                      <span className="w-4 text-qems-text-disabled font-mono text-[10px]">#{idx + 1}</span>
                      {proc}
                    </span>
                    <span className="text-qems-text-muted font-mono text-[11px] tabular-nums">
                      <strong className="text-qems-text-primary ">{count}</strong> defects ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-qems-bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        idx === 0
                          ? 'bg-qems-brand'
                          : idx === 1
                          ? 'bg-indigo-500'
                          : idx === 2
                          ? 'bg-indigo-400'
                          : 'bg-slate-400 '
                      }`}
                      style={{ width: `${percent * 2.5}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 5. ROOT CAUSE DISTRIBUTION & 6. CORRECTIVE ACTION EFFECTIVENESS           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 5. ROOT CAUSE DISTRIBUTION */}
        <section id="root-cause-distribution" className="bg-qems-bg-white border border-qems-border rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-qems-border-light ">
            <div>
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-qems-brand-dark " />
                <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                  ROOT CAUSE DISTRIBUTION
                </h3>
              </div>
              <p className="text-[11px] text-qems-text-muted mt-0.5">
                Categorized via 5 Whys and 6M Ishikawa fishbone dimensions
              </p>
            </div>
            <button
              onClick={() => setActiveSection('ROOT CAUSE')}
              className="text-xs text-qems-brand-dark hover:underline font-semibold flex items-center space-x-1"
            >
              <span>Investigation Lab</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topRootCauses.map(([cause, cnt]) => (
              <div
                key={cause}
                className="p-3 rounded-lg border border-qems-border bg-qems-bg-surface/50 flex items-start justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-qems-text-primary ">{cause}</div>
                  <div className="text-[11px] text-qems-text-muted mt-0.5 leading-relaxed">
                    {cause === 'SOP Ambiguity'
                      ? 'Conflicting procedural definitions between matrices'
                      : cause === 'Process Gap'
                      ? 'Missing validation checkpoints in operational handoff'
                      : cause === 'System Issue'
                      ? 'CRM latency or auto-collapsing UI panels'
                      : cause === 'Training Gap'
                      ? 'Knowledge retention gap post-onboarding'
                      : 'Cognitive load during peak volume bursts'}
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-qems-bg-white border border-qems-border rounded font-mono font-bold text-xs text-qems-brand-dark shrink-0 ml-2 tabular-nums">
                  {cnt}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. CORRECTIVE ACTION EFFECTIVENESS */}
        <section id="corrective-action-effectiveness" className="bg-qems-bg-white border border-qems-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-qems-border-light ">
              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-qems-success " />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                    CORRECTIVE ACTION EFFECTIVENESS
                  </h3>
                </div>
                <p className="text-[11px] text-qems-text-muted mt-0.5">
                  Post-remediation measurement: defect recurrence and 30-day efficacy verification
                </p>
              </div>
              <button
                onClick={() => setActiveSection('CAPA')}
                className="text-xs text-qems-brand-dark hover:underline font-semibold flex items-center space-x-1"
              >
                <span>All CAPAs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Efficacy KPIs */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-lg bg-qems-success-bg/60 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                  Remediation Success
                </span>
                <span className="text-xl font-bold font-mono text-emerald-900 mt-1 block tabular-nums">91.4%</span>
                <span className="text-[10px] text-qems-success-dark ">32 verified</span>
              </div>

              <div className="p-3 rounded-lg bg-qems-brand-light/60 border border-qems-brand text-center">
                <span className="text-[10px] font-bold text-indigo-800 uppercase block">
                  Recurrence Rate
                </span>
                <span className="text-xl font-bold font-mono text-indigo-900 mt-1 block tabular-nums">8.6%</span>
                <span className="text-[10px] text-qems-brand-dark ">Target &lt;10%</span>
              </div>

              <div className="p-3 rounded-lg bg-qems-bg-surface border border-qems-border text-center">
                <span className="text-[10px] font-bold text-qems-text-secondary uppercase block">
                  Avg Verification
                </span>
                <span className="text-xl font-bold font-mono text-qems-text-primary mt-1 block tabular-nums">14.2d</span>
                <span className="text-[10px] text-qems-text-muted ">Post-deploy window</span>
              </div>
            </div>

            {/* Active CAPA Spotlight */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-qems-border bg-qems-bg-surface/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-qems-text-primary ">CAPA-201: Hard Validation Block in CRM v4.2.1</div>
                  <div className="text-[10px] text-qems-text-muted ">Owner: David Miller • Due: 2026-09-18</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 ">
                  In Progress
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-qems-border bg-qems-bg-surface/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-qems-text-primary ">CAPA-198: Loan Servicing Escrow Recalculation Check</div>
                  <div className="text-[10px] text-qems-text-muted ">Effectiveness Review • 0 recurring defects observed</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-100 text-teal-800 ">
                  Verified Effective
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-qems-border-light flex items-center justify-between text-xs text-qems-text-muted ">
            <span>Root-cause remediation eliminates recurring errors at the source.</span>
            <span className="text-qems-success font-semibold flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Auditable ISO 9001 Trail
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
