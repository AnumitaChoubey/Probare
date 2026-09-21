import React, { useState } from 'react';
import {
  LineChart,
  BarChart3,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Award,
  Layers,
  Filter,
  Download,
  Users,
  Grid,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { TEAMS } from '../../data/mockData';

export const QualityIntelligence: React.FC = () => {
  const { events, addToast } = useQEMS();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | '12m'>('30d');

  // Compute intelligence metrics
  const totalEvents = events.length;
  const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;
  const rebuttedEvents = events.filter((e) => e.rebuttal !== undefined);
  const overturnedCount = events.filter((e) => e.status === 'Overturned').length;

  const overturnRate = Math.round((overturnedCount / Math.max(1, rebuttedEvents.length)) * 100);
  const ftrRate = 88.4;
  const slaCompliance = 95.2;

  // Process areas
  const processes = [
    'Payment Operations',
    'Claims Adjudication',
    'KYC & Identity',
    'Customer Support',
    'Billing & Invoicing',
  ];

  // Heatmap matrix: Team vs Process Area counts
  const heatmapData: Record<string, Record<string, number>> = {};
  TEAMS.forEach((t) => {
    heatmapData[t] = {};
    processes.forEach((p) => {
      heatmapData[t][p] = 0;
    });
  });

  events.forEach((ev) => {
    if (heatmapData[ev.team] && heatmapData[ev.team][ev.processArea] !== undefined) {
      heatmapData[ev.team][ev.processArea] += 1;
    }
  });

  // Top Repeat Defect Patterns
  const repeatEmployees = [
    { name: 'Sarah Williams', count: 6, team: 'Claims Operations', primaryError: 'Calculation Discrepancy' },
    { name: 'James Martinez', count: 5, team: 'Payment Operations', primaryError: 'Missing SWIFT Code' },
    { name: 'David Kim', count: 4, team: 'KYC & Onboarding', primaryError: 'ID Verification Timeout' },
    { name: 'Emily Watson', count: 4, team: 'Tier 1 Support', primaryError: 'Unverified Account Release' },
  ];

  const handleExportReport = () => {
    addToast({
      type: 'success',
      title: 'Executive Quality Briefing Exported',
      description: 'Analytics dossier exported in PDF/CSV audit bundle format.',
    });
  };

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-brand-dark bg-qems-brand-light px-2 py-0.5 rounded border border-qems-brand ">
              Executive Analytics
            </span>
            <span className="text-xs text-qems-text-disabled ">•</span>
            <span className="text-xs font-medium text-qems-text-muted ">
              Continuous Improvement Operations
            </span>
          </div>
          <h1 className="text-base font-bold text-qems-text-primary mt-1 tracking-tight">
            Quality Intelligence & Defect Analytics
          </h1>
          <p className="text-xs text-qems-text-muted mt-0.5">
            Systemic quality health, Pareto failure analysis, and organizational error heatmaps.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-qems-bg-secondary p-0.5 rounded text-xs font-medium border border-qems-border ">
            <button
              onClick={() => setSelectedTimeframe('30d')}
              className={`px-2.5 py-1 rounded transition ${
                selectedTimeframe === '30d' ? 'bg-qems-bg-white text-qems-text-primary font-bold' : 'text-qems-text-muted '
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setSelectedTimeframe('90d')}
              className={`px-2.5 py-1 rounded transition ${
                selectedTimeframe === '90d' ? 'bg-qems-bg-white text-qems-text-primary font-bold' : 'text-qems-text-muted '
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setSelectedTimeframe('12m')}
              className={`px-2.5 py-1 rounded transition ${
                selectedTimeframe === '12m' ? 'bg-qems-bg-white text-qems-text-primary font-bold' : 'text-qems-text-muted '
              }`}
            >
              12 Months
            </button>
          </div>

          <button
            onClick={handleExportReport}
            className="px-3 py-1.5 bg-qems-brand hover:bg-qems-brand-dark text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Briefing</span>
          </button>
        </div>
      </div>

      {/* Intelligence KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled ">
            First-Time-Right (FTR)
          </span>
          <div className="text-xl font-bold font-mono text-qems-success mt-1">{ftrRate}%</div>
          <div className="text-[11px] text-qems-text-muted mt-0.5">Benchmark: &gt;85%</div>
        </div>

        <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled ">
            Rebuttal Overturn Rate
          </span>
          <div className="text-xl font-bold font-mono text-qems-brand-dark mt-1">{overturnRate}%</div>
          <div className="text-[11px] text-qems-text-muted mt-0.5">Target: 25%–35%</div>
        </div>

        <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled ">
            SLA Resolution Adherence
          </span>
          <div className="text-xl font-bold font-mono text-qems-text-primary mt-1">{slaCompliance}%</div>
          <div className="text-[11px] text-qems-success mt-0.5">+1.4% vs prior cycle</div>
        </div>

        <div className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-disabled ">
            Repeat Defect Recurrence
          </span>
          <div className="text-xl font-bold font-mono text-qems-warning mt-1">11.8%</div>
          <div className="text-[11px] text-qems-text-muted mt-0.5">Down from 16.2% Q2</div>
        </div>
      </div>

      {/* Team vs Process Heatmap Matrix */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 border-b border-qems-border ">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
              Operational Quality Defect Heatmap (Team vs Process Area)
            </h3>
            <p className="text-[11px] text-qems-text-muted mt-0.5">
              Identifies concentrated risk pockets requiring targeted SOP reviews or system automation.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-mono">
            <span className="px-2 py-0.5 bg-qems-success-bg text-emerald-800 rounded border border-emerald-200 ">0-2 Low</span>
            <span className="px-2 py-0.5 bg-qems-warning-bg text-amber-800 rounded border border-amber-200 ">3-6 Moderate</span>
            <span className="px-2 py-0.5 bg-qems-danger-bg text-rose-800 rounded border border-rose-200 ">7+ High Focus</span>
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-qems-border ">
                <th className="py-2.5 px-3 font-semibold text-qems-text-secondary bg-qems-bg-surface ">Team</th>
                {processes.map((p) => (
                  <th key={p} className="py-2.5 px-3 font-semibold text-qems-text-secondary bg-qems-bg-surface text-center">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {TEAMS.map((team) => (
                <tr key={team} className="hover:bg-qems-bg-surface/80 :bg-slate-800/50">
                  <td className="py-2.5 px-3 font-semibold text-qems-text-primary whitespace-nowrap bg-qems-bg-surface/50 ">
                    {team}
                  </td>
                  {processes.map((proc) => {
                    const count = heatmapData[team]?.[proc] || 0;
                    const bgStyle =
                      count >= 7
                        ? 'bg-rose-100 text-rose-900 font-bold border border-rose-300 '
                        : count >= 3
                        ? 'bg-amber-100 text-amber-900 font-semibold border border-amber-300 '
                        : count > 0
                        ? 'bg-qems-success-bg text-emerald-800 border border-emerald-200 '
                        : 'bg-qems-bg-surface text-qems-text-disabled border border-qems-border ';

                    return (
                      <td key={proc} className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block w-8 py-0.5 rounded font-mono text-xs ${bgStyle}`}
                        >
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Row: Repeat Defect Radar & SOP Defect Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Repeat Defect Detection */}
        <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-qems-border ">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                Repeat Defect Early Detection (Coaching Opportunities)
              </h3>
              <p className="text-[11px] text-qems-text-muted mt-0.5">
                Frontline employees with &gt;3 recurring procedural flags in the last 30 days.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-qems-brand-light text-qems-brand-dark font-semibold rounded border border-qems-brand ">
              Non-Punitive
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {repeatEmployees.map((emp) => (
              <div
                key={emp.name}
                className="p-2.5 rounded border border-qems-border bg-qems-bg-surface/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-qems-text-primary ">{emp.name}</div>
                  <div className="text-[11px] text-qems-text-muted ">
                    {emp.team} • Frequent issue: <strong className="text-qems-text-secondary ">{emp.primaryError}</strong>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-qems-warning-dark px-2 py-0.5 bg-qems-warning-bg rounded border border-amber-200 text-xs">
                    {emp.count} Defects
                  </span>
                  <button className="px-2.5 py-1 bg-qems-bg-white border border-qems-border rounded text-qems-text-secondary font-medium hover:bg-qems-brand-light :bg-indigo-950/40 hover:text-qems-brand-dark :text-indigo-300 transition">
                    Assign Coaching
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SOP Defect Drivers */}
        <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-qems-border ">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-qems-text-primary ">
                SOP Procedural Clarity Gap Index
              </h3>
              <p className="text-[11px] text-qems-text-muted mt-0.5">
                Standards generating high dispute overturn rates, signaling ambiguous wording.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-qems-warning-bg text-amber-800 font-mono font-bold rounded border border-amber-200 ">
              SOP Revision Needed
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            {[
              { id: 'SOP-PAY-014', name: 'Wire Transfer Verification', overturns: '42%', status: 'Revision Queued' },
              { id: 'SOP-CLM-088', name: 'Emergency Medical Adjudication', overturns: '38%', status: 'Under Governance Review' },
              { id: 'SOP-KYC-201', name: 'Document Authenticity Standards', overturns: '29%', status: 'Stable' },
              { id: 'SOP-CS-102', name: 'Authentication Bypass Protocol', overturns: '24%', status: 'Active' },
            ].map((sop) => (
              <div
                key={sop.id}
                className="p-2.5 rounded border border-qems-border bg-qems-bg-white flex items-center justify-between"
              >
                <div>
                  <div className="font-bold font-mono text-qems-brand-dark ">{sop.id}</div>
                  <div className="text-[11px] text-qems-text-muted ">{sop.name}</div>
                </div>
                <div className="flex items-center space-x-2 text-right">
                  <div>
                    <span className="font-mono font-bold text-qems-text-primary block">{sop.overturns}</span>
                    <span className="text-[10px] text-qems-text-disabled ">Overturn rate</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-qems-bg-secondary text-qems-text-secondary ">
                    {sop.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
