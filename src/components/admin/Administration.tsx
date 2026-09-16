import React, { useState } from 'react';
import {
  Settings,
  BookOpen,
  Clock,
  Shield,
  Sliders,
  Plus,
  Edit2,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { SOP_CATALOG, SLA_POLICIES } from '../../data/mockData';

export const Administration: React.FC = () => {
  const { slaPolicies, addToast, resetDemoData } = useQEMS();
  const [activeTab, setActiveTab] = useState<'sops' | 'sla' | 'rubric'>('sops');

  const handleUpdate = (item: string) => {
    addToast({
      type: 'success',
      title: 'Configuration Saved',
      description: `${item} parameters updated and synced across QEMS clusters.`,
    });
  };

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              System Operations
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Enterprise Quality Governance
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            QEMS Administration & Policy Configuration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage Standard Operating Procedures (SOPs), SLA countdown thresholds, and guided evaluation rubrics.
          </p>
        </div>

        <button
          onClick={resetDemoData}
          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded text-xs font-semibold flex items-center space-x-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Environment (160 Records)</span>
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('sops')}
            className={`py-2.5 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'sops'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>SOP & Standards Registry ({SOP_CATALOG.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sla')}
            className={`py-2.5 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'sla'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>SLA Policies & Countdown Rules</span>
          </button>
          <button
            onClick={() => setActiveTab('rubric')}
            className={`py-2.5 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
              activeTab === 'rubric'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Severity Rubrics & Guided Calculator</span>
          </button>
        </div>

        <div className="p-4">
          {/* TAB 1: SOP REGISTRY */}
          {activeTab === 'sops' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Active Standard Operating Procedures (SOPs)
                </span>
                <button
                  onClick={() => handleUpdate('New SOP')}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium flex items-center space-x-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Register SOP</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {SOP_CATALOG.map((sop) => (
                  <div
                    key={sop.id}
                    className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 flex items-start justify-between text-xs space-y-1"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{sop.id}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{sop.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                          v{sop.version}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Process: <strong className="text-slate-700 dark:text-slate-300">{sop.processArea}</strong> • Owner: {sop.owner}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mt-1 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                        "{sop.excerpt}"
                      </p>
                    </div>

                    <button
                      onClick={() => handleUpdate(sop.id)}
                      className="px-2 py-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium shrink-0 ml-3"
                    >
                      Edit Standard
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SLA POLICIES */}
          {activeTab === 'sla' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Configured Operational SLA Windows
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">24/7 Clock Engine</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Process Area</th>
                      <th className="py-2.5 px-3">Severity Level</th>
                      <th className="py-2.5 px-3">Rebuttal Window</th>
                      <th className="py-2.5 px-3">QA Resolution Target</th>
                      <th className="py-2.5 px-3">Escalation Trigger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {slaPolicies.map((pol) => (
                      <tr key={pol.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {pol.processArea}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">{pol.severity}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {pol.rebuttalWindowHours} hours
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {pol.resolutionTargetHours} hours
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{pol.escalationRule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RUBRIC */}
          {activeTab === 'rubric' && (
            <div className="space-y-3 text-xs">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Severity Classification Rubrics
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Automated scoring logic used by the Fast Entry severity calculator.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-900 dark:text-red-300 text-xs">CRITICAL Severity Criteria</span>
                    <span className="font-mono text-[10px] text-red-700 dark:text-red-400 font-bold">Priority 1</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-red-800 dark:text-red-300/90 text-[11px]">
                    <li>Direct regulatory / legal compliance breach (GLBA, PCI-DSS, AML).</li>
                    <li>Financial customer loss or company exposure &ge; $5,000.</li>
                    <li>Unverified disclosure of Customer PII / unauthorized account takeover.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 dark:text-amber-300 text-xs">HIGH Severity Criteria</span>
                    <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400 font-bold">Priority 2</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-amber-800 dark:text-amber-300/90 text-[11px]">
                    <li>Potential compliance exposure requiring rapid remediation.</li>
                    <li>Customer account blocked or delayed payout &ge; $1,000.</li>
                    <li>Repeat procedural deviation on same transaction type within 14 days.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
