import React from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Calendar,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';

export const ReportsAudits: React.FC = () => {
  const { events, calibrations, addToast } = useQEMS();

  const handleExport = (reportName: string) => {
    addToast({
      type: 'success',
      title: 'Audit Package Generated',
      description: `Generated ${reportName} in ISO 9001 compliance format.`,
    });
  };

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-qems-text-secondary bg-qems-bg-secondary px-2 py-0.5 rounded border border-qems-border ">
              Audit Compliance
            </span>
            <span className="text-xs text-qems-text-disabled ">•</span>
            <span className="text-xs font-medium text-qems-text-muted ">
              Regulatory Audit Dossiers
            </span>
          </div>
          <h1 className="text-base font-bold text-qems-text-primary mt-1 tracking-tight">
            Governance Reports & Quality Audit Bundles
          </h1>
          <p className="text-xs text-qems-text-muted mt-0.5">
            Cryptographically sealed audit packages, ISO 9001 compliance certificates, and executive operational summaries.
          </p>
        </div>

        <button
          onClick={() => handleExport('Comprehensive Quality Audit Dossier')}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 :bg-slate-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition border border-transparent "
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Generate Full Audit Pack</span>
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {[
          {
            title: 'ISO 9001:2015 Continuous Improvement Summary',
            type: 'Regulatory Compliance',
            description:
              'Complete trace of all logged errors, 5 Whys analyses, CAPA remediations, and 30-day effectiveness verification scores.',
            date: 'Monthly Snapshot (Sep 2026)',
            records: `${events.length} Evaluated Cases`,
          },
          {
            title: 'Dispute & Rebuttal Fair Play Governance Report',
            type: 'Operational Integrity',
            description:
              'Audit log of frontline dispute overturn rates, QA arbitration turnaround times, and multi-party discussion logs.',
            date: 'Bi-Weekly Briefing',
            records: '18 Rebuttals Arbitrated',
          },
          {
            title: 'Auditor Calibration & Alignment Certification',
            type: 'Quality Assurance',
            description:
              'Multi-evaluator blind score variance sheets, consensus benchmarks, and inter-rater reliability metrics.',
            date: 'Cycle 2026-Q3',
            records: `${calibrations.length} Sessions Conducted`,
          },
          {
            title: 'Repeat Defect & Systemic Risk Register',
            type: 'Risk Management',
            description:
              'Pareto failure drivers, recurring process bottlenecks, and pending engineering validation rules.',
            date: 'Weekly Risk Rollup',
            records: '5 Process Areas Analyzed',
          },
          {
            title: 'SLA Resolution & Breach Telemetry Report',
            type: 'Operations Performance',
            description:
              'Granular countdown adherence across 48h resolution windows with escalation audit trails.',
            date: 'Real-time Metrics',
            records: '94.8% SLA Adherence',
          },
          {
            title: 'Frontline Coaching & Growth Portfolio',
            type: 'People & Capability',
            description:
              'Non-punitive coaching logs, positive reinforcement metrics, and verified defect reduction trajectories.',
            date: 'Tenor & Team Analysis',
            records: '6 Teams Evaluated',
          },
        ].map((rep, idx) => (
          <div
            key={idx}
            className="bg-qems-bg-white border border-qems-border rounded-lg p-3.5 hover:border-slate-300 :border-slate-700 transition space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-qems-brand-dark bg-qems-brand-light px-2 py-0.5 rounded border border-qems-brand ">
                  {rep.type}
                </span>
                <span className="text-[10px] text-qems-text-disabled font-mono">{rep.date}</span>
              </div>
              <h3 className="font-bold text-xs text-qems-text-primary leading-snug">{rep.title}</h3>
              <p className="text-[11px] text-qems-text-muted mt-1.5 leading-relaxed">
                {rep.description}
              </p>
            </div>

            <div className="pt-2.5 border-t border-qems-border-light flex items-center justify-between">
              <span className="text-[11px] font-mono text-qems-text-muted font-medium">
                {rep.records}
              </span>
              <button
                onClick={() => handleExport(rep.title)}
                className="px-2.5 py-1 bg-qems-bg-surface hover:bg-qems-bg-secondary :bg-slate-750 border border-qems-border rounded text-xs font-semibold text-qems-text-secondary flex items-center space-x-1 transition"
              >
                <Download className="w-3 h-3 text-qems-text-muted " />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
