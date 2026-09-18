import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  User,
  CheckCircle2,
  Eye,
  Calendar,
  AlertCircle,
  Sparkles,
  Send,
  Check,
  X,
  FastForward,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { StatusBadge, SeverityBadge, SLABadge } from '../common/StatusBadge';
import { QualityEvent } from '../../types';

type WorkTab = 'ALL' | 'NEEDS_ACTION' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';

interface QuickActionModalState {
  isOpen: boolean;
  actionType: 'approve' | 'acknowledge' | 'request_extension' | null;
  event: QualityEvent | null;
}

export const MyWork: React.FC = () => {
  const {
    currentRole,
    currentUser,
    events,
    setSelectedEventId,
    setActiveSection,
    addToast,
    resolveRebuttal,
    updateEventStatus,
  } = useQEMS();

  const [activeTab, setActiveTab] = useState<WorkTab>('NEEDS_ACTION');
  const [quickActionModal, setQuickActionModal] = useState<QuickActionModalState>({
    isOpen: false,
    actionType: null,
    event: null,
  });
  const [quickNote, setQuickNote] = useState('');

  // Transform events into personalized actionable task items
  const allTasks = events.map((e) => {
    // Determine assigned task type and due date
    let taskName = 'Routine Quality Review';
    let isNeedsAction = false;
    let isDueSoon = false;
    let isOverdue = false;
    let isCompleted = e.status === 'Closed';

    if (e.status === 'Rebuttal Pending' || (e.rebuttal && e.rebuttal.status === 'Pending QA')) {
      taskName = 'Arbitrate Frontline Dispute';
      isNeedsAction = true;
    } else if (e.status === 'Under Review' || e.status === 'QA Review') {
      taskName = 'Perform Peer Audit & Scoring Review';
      isNeedsAction = true;
    } else if (e.status === 'Manager Review') {
      taskName = 'Manager Calibration Sign-off';
      isNeedsAction = true;
    } else if (e.status === 'Escalated') {
      taskName = 'Executive Risk Assessment';
      isNeedsAction = true;
    } else if (e.status === 'Corrective Action') {
      taskName = 'CAPA Remediation Implementation';
      isNeedsAction = true;
    } else if (e.status === 'Effectiveness Review') {
      taskName = '30-Day Efficacy Verification';
      isNeedsAction = true;
    }

    if (e.slaStatus === 'Breached') {
      isOverdue = true;
    } else if (e.slaStatus === 'At Risk' || e.slaHoursRemaining <= 6) {
      isDueSoon = true;
    }

    // Realistic due date calculation
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + (e.slaHoursRemaining || 24));
    const formattedDueDate = dueDate.toISOString().replace('T', ' ').substring(0, 16);

    return {
      event: e,
      eventId: e.id,
      task: taskName,
      priority: e.severity,
      dueDate: formattedDueDate,
      sla: e.slaStatus,
      slaHours: e.slaHoursRemaining,
      owner: e.owner || currentUser.name,
      status: e.status,
      isNeedsAction,
      isDueSoon,
      isOverdue,
      isCompleted,
    };
  });

  // Filter tasks based on activeTab
  const filteredTasks = allTasks.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'NEEDS_ACTION') return item.isNeedsAction && !item.isCompleted;
    if (activeTab === 'DUE_SOON') return item.isDueSoon && !item.isCompleted;
    if (activeTab === 'OVERDUE') return item.isOverdue && !item.isCompleted;
    if (activeTab === 'COMPLETED') return item.isCompleted;
    return true;
  });

  const openEvent = (id: string) => {
    setSelectedEventId(id);
    setActiveSection('QUALITY EVENTS');
  };

  // Quick Action execution
  const executeQuickAction = () => {
    if (!quickActionModal.event || !quickActionModal.actionType) return;
    const { event, actionType } = quickActionModal;

    if (actionType === 'approve') {
      if (event.rebuttal) {
        resolveRebuttal(event.id, 'Accept Error', quickNote || 'Dispute grounds validated via quick review.');
      } else {
        updateEventStatus?.(event.id, 'Closed');
      }
      addToast({
        type: 'success',
        title: 'Action Completed',
        description: `${event.id} approved directly from My Work queue.`,
      });
    } else if (actionType === 'acknowledge') {
      addToast({
        type: 'info',
        title: 'Task Acknowledged',
        description: `Receipt confirmed for ${event.id}. Due date locked.`,
      });
    } else if (actionType === 'request_extension') {
      addToast({
        type: 'warning',
        title: 'Extension Requested',
        description: `SLA extension request submitted for ${event.id}: "${quickNote || 'Pending compliance audit'}".`,
      });
    }

    setQuickActionModal({ isOpen: false, actionType: null, event: null });
    setQuickNote('');
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
              Personal Work Queue
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Operating Role: <strong className="text-slate-800 dark:text-slate-200">{currentRole}</strong>
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            My Action Items & Assigned Quality Tasks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Execute pending reviews, dispute arbitrations, and corrective action tasks with instant quick-action controls.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 text-xs font-mono">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded text-center">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Needs Action</span>
            <strong className="text-indigo-600 dark:text-indigo-400 text-sm tabular-nums">
              {allTasks.filter((t) => t.isNeedsAction && !t.isCompleted).length}
            </strong>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded text-center">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Due Soon / Overdue</span>
            <strong className="text-rose-600 dark:text-rose-400 text-sm tabular-nums">
              {allTasks.filter((t) => (t.isDueSoon || t.isOverdue) && !t.isCompleted).length}
            </strong>
          </div>
        </div>
      </div>

      {/* Primary Work Tabs (All, Needs Action, Due Soon, Overdue, Completed) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between overflow-x-auto">
          <div className="flex space-x-1 py-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <span>All Tasks</span>
              <span className="px-1.5 py-0.2 bg-black/10 dark:bg-black/20 text-[10px] rounded font-mono tabular-nums">
                {allTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('NEEDS_ACTION')}
              className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'NEEDS_ACTION'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <span>Needs Action</span>
              <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 text-[10px] rounded font-mono font-bold tabular-nums">
                {allTasks.filter((t) => t.isNeedsAction && !t.isCompleted).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DUE_SOON')}
              className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'DUE_SOON'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <span>Due Soon</span>
              <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-[10px] rounded font-mono font-bold tabular-nums">
                {allTasks.filter((t) => t.isDueSoon && !t.isCompleted).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('OVERDUE')}
              className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'OVERDUE'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <span>Overdue</span>
              <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 text-[10px] rounded font-mono font-bold tabular-nums">
                {allTasks.filter((t) => t.isOverdue && !t.isCompleted).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <span>Completed</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[10px] rounded font-mono font-bold tabular-nums">
                {allTasks.filter((t) => t.isCompleted).length}
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
            Showing {filteredTasks.length} task records
          </span>
        </div>

        {/* Task Items Table with Quick Actions */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider select-none">
              <tr>
                <th className="py-2.5 px-4">Event ID</th>
                <th className="py-2.5 px-3">Task & Context</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">SLA Status</th>
                <th className="py-2.5 px-3">Owner</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No tasks in this view</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All action items under this category are up to date.</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.slice(0, 25).map((item) => (
                  <tr
                    key={item.eventId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition group"
                  >
                    <td className="py-2 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      <button
                        onClick={() => openEvent(item.eventId)}
                        className="hover:underline flex items-center space-x-1"
                      >
                        <span>{item.eventId}</span>
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.task}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {item.event.title} • {item.event.sopId}
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <SeverityBadge severity={item.priority} />
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{item.dueDate}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <SLABadge status={item.sla} hoursRemaining={item.slaHours} />
                    </td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {item.owner}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Quick action buttons without opening full record */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickActionModal({
                              isOpen: true,
                              actionType: 'approve',
                              event: item.event,
                            });
                          }}
                          title="Quick Approve / Sign-off"
                          className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded text-[11px] font-semibold transition flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickActionModal({
                              isOpen: true,
                              actionType: 'request_extension',
                              event: item.event,
                            });
                          }}
                          title="Request SLA Extension"
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-medium transition"
                        >
                          Extend
                        </button>

                        <button
                          onClick={() => openEvent(item.eventId)}
                          title="Open Full Record Workspace"
                          className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-[11px] font-medium transition flex items-center space-x-0.5"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Open</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action Confirmation Modal */}
      {quickActionModal.isOpen && quickActionModal.event && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                  <FastForward className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {quickActionModal.actionType === 'approve'
                    ? `Quick Sign-off: ${quickActionModal.event.id}`
                    : `Request SLA Extension: ${quickActionModal.event.id}`}
                </h3>
              </div>
              <button
                onClick={() => setQuickActionModal({ isOpen: false, actionType: null, event: null })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <p>
                <strong>Event:</strong> {quickActionModal.event.title}
              </p>
              <p>
                <strong>Standard:</strong> {quickActionModal.event.sopId} ({quickActionModal.event.processArea})
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {quickActionModal.actionType === 'approve'
                    ? 'Assessment / Arbitration Note'
                    : 'Extension Justification'}
                </label>
                <textarea
                  rows={2}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder={
                    quickActionModal.actionType === 'approve'
                      ? 'Confirm verified adherence to SOP or arbitration outcome...'
                      : 'State operational grounds for extending the 24h SLA...'
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuickActionModal({ isOpen: false, actionType: null, event: null })}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeQuickAction}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Execute</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
