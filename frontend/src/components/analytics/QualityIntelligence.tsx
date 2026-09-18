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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
              Executive Analytics
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Continuous Improvement Operations
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            Quality Intelligence & Defect Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Systemic quality health, Pareto failure analysis, and organizational error heatmaps.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded text-xs font-medium border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedTimeframe('30d')}
              className={`px-2.5 py-1 rounded transition ${
                selectedTimeframe === '30d' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setSelectedTimeframe('90d')}
              className={`px-2.5 py-1 rounded transition ${
                selectedTimeframe === '90d' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setSelectedTimeframe('12m')}
              className={`px-2.5 py-1 rounded transition ${
                selectedTimeframe === '12m' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              12 Months
            </button>
          </div>

          <button
            onClick={handleExportReport}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Briefing</span>
          </button>
        </div>
      </div>

      {/* Intelligence KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            First-Time-Right (FTR)
          </span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{ftrRate}%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Benchmark: &gt;85%</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Rebuttal Overturn Rate
          </span>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">{overturnRate}%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Target: 25%–35%</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            SLA Resolution Adherence
          </span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{slaCompliance}%</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">+1.4% vs prior cycle</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Repeat Defect Recurrence
          </span>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">11.8%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Down from 16.2% Q2</div>
        </div>
      </div>

      {/* Team vs Process Heatmap Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Operational Quality Defect Heatmap (Team vs Process Area)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Identifies concentrated risk pockets requiring targeted SOP reviews or system automation.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] font-mono">
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">0-2 Low</span>
            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800">3-6 Moderate</span>
            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">7+ High Focus</span>
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850">Team</th>
                {processes.map((p) => (
                  <th key={p} className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 text-center">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {TEAMS.map((team) => (
                <tr key={team} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap bg-slate-50/50 dark:bg-slate-850/40">
                    {team}
                  </td>
                  {processes.map((proc) => {
                    const count = heatmapData[team]?.[proc] || 0;
                    const bgStyle =
                      count >= 7
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800'
                        : count >= 3
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800'
                        : count > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700';

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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Repeat Defect Early Detection (Coaching Opportunities)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Frontline employees with &gt;3 recurring procedural flags in the last 30 days.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold rounded border border-indigo-200 dark:border-indigo-800">
              Non-Punitive
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {repeatEmployees.map((emp) => (
              <div
                key={emp.name}
                className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{emp.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {emp.team} • Frequent issue: <strong className="text-slate-700 dark:text-slate-300">{emp.primaryError}</strong>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800 text-xs">
                    {emp.count} Defects
                  </span>
                  <button className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition">
                    Assign Coaching
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SOP Defect Drivers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                SOP Procedural Clarity Gap Index
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Standards generating high dispute overturn rates, signaling ambiguous wording.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold rounded border border-amber-200 dark:border-amber-800">
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
                className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold font-mono text-indigo-700 dark:text-indigo-400">{sop.id}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">{sop.name}</div>
                </div>
                <div className="flex items-center space-x-2 text-right">
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">{sop.overturns}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Overturn rate</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
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
