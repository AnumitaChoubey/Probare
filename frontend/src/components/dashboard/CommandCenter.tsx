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
      <section id="what-needs-attention" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {/* Header with Role Context */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Action Required • Priority Queue
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Operating Persona: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{currentRole}</strong>
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              WHAT NEEDS MY ATTENTION?
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Triage open rebuttals, impending SLA deadlines, pending review decisions, and corrective action commitments.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => openEvent('QEMS-2026-001284')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Sample Case: QEMS-2026-001284</span>
            </button>
            <button
              onClick={() => setActiveSection('QUALITY EVENTS')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <span>All {events.length} Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MY ACTIONS Sub-category Navigation Pills */}
        <div className="px-4 sm:px-5 py-2 bg-slate-50/40 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Filter Queue:
          </span>

          <button
            onClick={() => setActiveActionFilter('ALL')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Items</span>
            <span className="px-1.5 py-0.2 bg-black/15 dark:bg-black/10 text-[10px] rounded font-mono">
              {rebuttalsWaiting.length + slaRisks.length + escalations.length + correctiveActionsDue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('REBUTTALS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'REBUTTALS'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Rebuttals waiting for response</span>
            <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-[10px] rounded font-mono font-bold">
              {rebuttalsWaiting.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('REVIEWS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'REVIEWS'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Reviews waiting for decision</span>
            <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 text-[10px] rounded font-mono font-bold">
              {reviewsWaiting.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('SLA_RISKS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'SLA_RISKS'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>SLA risks</span>
            <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-300 text-[10px] rounded font-mono font-bold">
              {slaRisks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('ESCALATIONS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'ESCALATIONS'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Escalations</span>
            <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-300 text-[10px] rounded font-mono font-bold">
              {escalations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('CAPAS_DUE')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'CAPAS_DUE'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Corrective actions due</span>
            <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 text-[10px] rounded font-mono font-bold">
              {correctiveActionsDue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('APPROVALS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'APPROVALS'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Approvals</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 text-[10px] rounded font-mono font-bold">
              {approvalsWaiting.length}
            </span>
          </button>

          <button
            onClick={() => setActiveActionFilter('EFFECTIVENESS')}
            className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 flex items-center space-x-1.5 ${
              activeActionFilter === 'EFFECTIVENESS'
                ? 'bg-teal-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Effectiveness reviews</span>
            <span className="px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-300 text-[10px] rounded font-mono font-bold">
              {effectivenessReviews.length}
            </span>
          </button>
        </div>

        {/* Action Items Interactive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {actionList.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openEvent(item.id)}
                  className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 cursor-pointer transition group"
                >
                  <td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                    {item.id}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {item.processArea} • {item.sopId}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-slate-800 dark:text-slate-200 font-medium">{item.employee}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{item.team}</div>
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
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{item.owner}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 group-hover:border-indigo-400 transition">
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
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              QUALITY HEALTH METRICS
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Real-time enterprise operational telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Total Quality Events
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">{totalEvents}</div>
            <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              <TrendingDown className="w-3 h-3" />
              <span>-6.4% vs 30d base</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Open Events
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{openEvents}</div>
            <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>{Math.round((openEvents / totalEvents) * 100)}% active pipeline</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Critical Events
            </span>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 tabular-nums">{criticalErrors}</div>
            <div className="flex items-center space-x-1 text-[11px] text-rose-600 dark:text-rose-400 mt-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Zero AML breaches</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              SLA Compliance
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">{slaCompliance}%</div>
            <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+2.1% MoM</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              First-Time-Right (FTR)
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">{ftr}%</div>
            <div className="flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              <Award className="w-3 h-3" />
              <span>Target: &gt;85.0%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Avg Resolution Time
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">{avgResolutionHours}h</div>
            <div className="flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
        <section id="quality-trends" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  QUALITY TRENDS (14-DAY DEFECT VELOCITY)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Daily logged defect volume compared against operational threshold ceiling
              </p>
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-mono">
              <button
                onClick={() => setTrendMetric('volume')}
                className={`px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                  trendMetric === 'volume'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                Volume
              </button>
              <button
                onClick={() => setTrendMetric('critical')}
                className={`px-2 py-0.5 rounded border text-[10px] font-medium transition ${
                  trendMetric === 'critical'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                Critical
              </button>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="mt-4 h-44 w-full flex items-end">
            <svg viewBox="0 0 500 140" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="trendGradCmd" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Target Line */}
              <line
                x1="0"
                y1="55"
                x2="500"
                y2="55"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#94A3B8" strokeOpacity="0.2" strokeWidth="1" />
              <line x1="0" y1="25" x2="500" y2="25" stroke="#94A3B8" strokeOpacity="0.2" strokeWidth="1" />

              {/* Area */}
              <polygon
                fill="url(#trendGradCmd)"
                points="0,140 0,85 40,78 80,90 120,65 160,80 200,55 240,72 280,48 320,62 360,40 400,52 440,35 480,38 500,36 500,140"
              />
              {/* Line */}
              <polyline
                fill="none"
                stroke="#4F46E5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,85 40,78 80,90 120,65 160,80 200,55 240,72 280,48 320,62 360,40 400,52 440,35 480,38 500,36"
              />
              {/* Data points */}
              {[
                { x: 280, y: 48, val: '14' },
                { x: 360, y: 40, val: '16' },
                { x: 440, y: 35, val: '19' },
                { x: 500, y: 36, val: '18' },
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="3.5" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text
                    x={pt.x}
                    y={pt.y - 7}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#6366F1"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {pt.val}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Sep 01</span>
            <span>Sep 05</span>
            <span>Sep 09</span>
            <span>Sep 13</span>
            <span>Today (Sep 15)</span>
          </div>
        </section>

        {/* 4. TOP QUALITY DRIVERS (PARETO 80/20) */}
        <section id="top-quality-drivers" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  TOP QUALITY DRIVERS (PARETO 80/20)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Click any process area to drill down directly into filtered quality records
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold rounded border border-amber-200 dark:border-amber-800">
              80/20 Rule
            </span>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {topProcesses.map(([proc, count], idx) => {
              const percent = Math.round((count / totalEvents) * 100);
              return (
                <div
                  key={proc}
                  onClick={() => handleDrillDownProcess(proc)}
                  className="space-y-1 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                      <span className="w-4 text-slate-400 dark:text-slate-500 font-mono text-[10px]">#{idx + 1}</span>
                      {proc}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] tabular-nums">
                      <strong className="text-slate-900 dark:text-slate-100">{count}</strong> defects ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        idx === 0
                          ? 'bg-indigo-600'
                          : idx === 1
                          ? 'bg-indigo-500'
                          : idx === 2
                          ? 'bg-indigo-400'
                          : 'bg-slate-400 dark:bg-slate-600'
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
        <section id="root-cause-distribution" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  ROOT CAUSE DISTRIBUTION
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Categorized via 5 Whys and 6M Ishikawa fishbone dimensions
              </p>
            </div>
            <button
              onClick={() => setActiveSection('ROOT CAUSE')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center space-x-1"
            >
              <span>Investigation Lab</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topRootCauses.map(([cause, cnt]) => (
              <div
                key={cause}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{cause}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
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
                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 shrink-0 ml-2 tabular-nums">
                  {cnt}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. CORRECTIVE ACTION EFFECTIVENESS */}
        <section id="corrective-action-effectiveness" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    CORRECTIVE ACTION EFFECTIVENESS
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Post-remediation measurement: defect recurrence and 30-day efficacy verification
                </p>
              </div>
              <button
                onClick={() => setActiveSection('CAPA')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center space-x-1"
              >
                <span>All CAPAs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Efficacy KPIs */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                  Remediation Success
                </span>
                <span className="text-xl font-bold font-mono text-emerald-900 dark:text-emerald-200 mt-1 block tabular-nums">91.4%</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">32 verified</span>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-center">
                <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase block">
                  Recurrence Rate
                </span>
                <span className="text-xl font-bold font-mono text-indigo-900 dark:text-indigo-200 mt-1 block tabular-nums">8.6%</span>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400">Target &lt;10%</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block">
                  Avg Verification
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">14.2d</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Post-deploy window</span>
              </div>
            </div>

            {/* Active CAPA Spotlight */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">CAPA-201: Hard Validation Block in CRM v4.2.1</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Owner: David Miller • Due: 2026-09-18</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  In Progress
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">CAPA-198: Loan Servicing Escrow Recalculation Check</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Effectiveness Review • 0 recurring defects observed</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  Verified Effective
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Root-cause remediation eliminates recurring errors at the source.</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Auditable ISO 9001 Trail
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};
