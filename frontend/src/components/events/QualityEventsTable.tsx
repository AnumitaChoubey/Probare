import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  UserCheck,
  Columns3,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
  CheckSquare,
  Square,
  Eye,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { StatusBadge, SeverityBadge, SLABadge } from '../common/StatusBadge';
import { QualityEvent, Severity, QualityStatus, SLAStatus } from '../../types';

export const QualityEventsTable: React.FC = () => {
  const {
    events,
    searchQuery,
    setSearchQuery,
    setSelectedEventId,
    bulkAssign,
    bulkUpdateStatus,
    addToast,
    taxonomy,
    projectUsers
  } = useQEMS();
  
  const teamsList = taxonomy?.teams || [];
  const auditorsList = projectUsers?.filter(u => u.project_role.includes('QA')) || [];

  // Filters State
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedSLA, setSelectedSLA] = useState<string>('ALL');

  // Sorting State
  const [sortField, setSortField] = useState<keyof QualityEvent>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Multi-select State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkOwner, setBulkOwner] = useState(auditorsList[0]?.name || '');

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    id: true,
    date: true,
    employee: true,
    team: true,
    process: true,
    category: true,
    severity: true,
    status: true,
    owner: true,
    sla: true,
    rootCause: true,
    createdBy: false,
  });
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Global search filter
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        ev.id.toLowerCase().includes(q) ||
        ev.title.toLowerCase().includes(q) ||
        ev.employee.toLowerCase().includes(q) ||
        ev.processArea.toLowerCase().includes(q) ||
        ev.sopId.toLowerCase().includes(q) ||
        (ev.rootCause && ev.rootCause.toLowerCase().includes(q));

      // Severity filter
      const matchesSeverity =
        selectedSeverity === 'ALL' || ev.severity === selectedSeverity;

      // Status filter
      const matchesStatus =
        selectedStatus === 'ALL' || ev.status === selectedStatus;

      // Team filter
      const matchesTeam = selectedTeam === 'ALL' || ev.team === selectedTeam;

      // SLA filter
      const matchesSLA = selectedSLA === 'ALL' || ev.slaStatus === selectedSLA;

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesStatus &&
        matchesTeam &&
        matchesSLA
      );
    });
  }, [events, searchQuery, selectedSeverity, selectedStatus, selectedTeam, selectedSLA]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string') {
        const cmp = (aVal as string).localeCompare(bVal as string);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (typeof aVal === 'number') {
        return sortDirection === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
      return 0;
    });
  }, [filteredEvents, sortField, sortDirection]);

  // Paginated events
  const totalPages = Math.ceil(sortedEvents.length / pageSize);
  const paginatedEvents = sortedEvents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: keyof QualityEvent) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedEvents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedEvents.map((e) => e.id));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const headers = [
      'Error ID',
      'Date',
      'Employee',
      'Team',
      'Process Area',
      'Error Type',
      'SOP',
      'Severity',
      'Status',
      'Owner',
      'SLA Status',
      'Root Cause',
    ];
    const rows = sortedEvents.map((e) => [
      e.id,
      e.date,
      `"${e.employee}"`,
      `"${e.team}"`,
      `"${e.processArea}"`,
      `"${e.errorType}"`,
      e.sopId,
      e.severity,
      e.status,
      `"${e.owner}"`,
      e.slaStatus,
      `"${e.rootCause || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `qems-quality-events-export-${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'Export Complete',
      description: `Exported ${sortedEvents.length} records to CSV format.`,
    });
  };

  const handleBulkAssignConfirm = () => {
    if (selectedIds.length === 0) return;
    bulkAssign(selectedIds, bulkOwner);
    setIsBulkAssignOpen(false);
    setSelectedIds([]);
  };

  const resetFilters = () => {
    setSelectedSeverity('ALL');
    setSelectedStatus('ALL');
    setSelectedTeam('ALL');
    setSelectedSLA('ALL');
    setSearchQuery('');
  };

  const renderSortIndicator = (field: keyof QualityEvent) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-qems-brand-dark ml-1 inline" />
    ) : (
      <ChevronDown className="w-3 h-3 text-qems-brand-dark ml-1 inline" />
    );
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Table Header Controls */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-qems-text-primary tracking-tight flex items-center space-x-2">
              <span>Quality Events Registry</span>
              <span className="text-xs px-2 py-0.5 rounded bg-qems-bg-secondary text-qems-text-secondary font-mono font-medium border border-qems-border ">
                {sortedEvents.length} of {events.length} records
              </span>
            </h1>
            <p className="text-xs text-qems-text-muted mt-0.5">
              High-density auditable log of evaluated transactions and procedural deviations.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 shrink-0">
            {selectedIds.length > 0 && (
              <div className="flex items-center space-x-2 bg-qems-brand-light px-2.5 py-1 rounded border border-qems-brand ">
                <span className="text-xs font-semibold text-indigo-900 font-mono">
                  {selectedIds.length} Selected
                </span>
                <button
                  onClick={() => setIsBulkAssignOpen(true)}
                  className="px-2 py-1 bg-qems-brand text-white rounded text-[11px] font-medium hover:bg-qems-brand-dark flex items-center space-x-1"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Assign</span>
                </button>
                <button
                  onClick={() => bulkUpdateStatus(selectedIds, 'QA Review')}
                  className="px-2 py-1 bg-qems-bg-white border border-indigo-300 text-qems-brand-dark rounded text-[11px] font-medium hover:bg-qems-brand-light :bg-slate-700"
                >
                  Move to QA
                </button>
              </div>
            )}

            {/* Column Visibility */}
            <div className="relative">
              <button
                onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                className="px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-xs font-medium text-qems-text-secondary hover:bg-qems-bg-surface :bg-slate-700 flex items-center space-x-1"
                title="Toggle Columns"
              >
                <Columns3 className="w-3.5 h-3.5 text-qems-text-muted " />
                <span className="hidden sm:inline">Columns</span>
              </button>

              {isColMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-qems-bg-white border border-qems-border rounded-lg shadow-lg p-2 z-40 text-xs">
                  <div className="font-semibold text-qems-text-secondary pb-1 mb-1 border-b border-qems-border-light ">
                    Visible Columns
                  </div>
                  {Object.keys(visibleColumns).map((col) => (
                    <label
                      key={col}
                      className="flex items-center space-x-2 py-1 px-1 hover:bg-qems-bg-surface :bg-slate-800 rounded cursor-pointer capitalize text-qems-text-secondary "
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[col]}
                        onChange={(e) =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col]: e.target.checked,
                          }))
                        }
                        className="rounded text-qems-brand-dark focus:ring-0"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-xs font-medium text-qems-text-secondary hover:bg-qems-bg-surface :bg-slate-700 flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5 text-qems-text-muted " />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="pt-2 border-t border-qems-border-light flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1 text-qems-text-muted font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2 py-1 bg-qems-bg-surface border border-qems-border rounded text-qems-text-secondary focus:outline-none focus:bg-qems-bg-white :bg-slate-800 text-xs"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1 bg-qems-bg-surface border border-qems-border rounded text-qems-text-secondary focus:outline-none focus:bg-qems-bg-white :bg-slate-800 text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="Logged">Logged</option>
            <option value="Under Review">Under Review</option>
            <option value="Rebuttal Pending">Rebuttal Pending</option>
            <option value="QA Review">QA Review</option>
            <option value="Escalated">Escalated</option>
            <option value="Overturned">Overturned</option>
            <option value="Upheld">Upheld</option>
            <option value="Corrective Action">Corrective Action</option>
            <option value="Effectiveness Review">Effectiveness Review</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Team */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-2 py-1 bg-qems-bg-surface border border-qems-border rounded text-qems-text-secondary focus:outline-none focus:bg-qems-bg-white :bg-slate-800 text-xs"
          >
            <option value="ALL">All Teams</option>
            {teamsList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* SLA Filter */}
          <select
            value={selectedSLA}
            onChange={(e) => setSelectedSLA(e.target.value)}
            className="px-2 py-1 bg-qems-bg-surface border border-qems-border rounded text-qems-text-secondary focus:outline-none focus:bg-qems-bg-white :bg-slate-800 text-xs"
          >
            <option value="ALL">All SLA States</option>
            <option value="On Track">On Track</option>
            <option value="Warning">Warning (&lt;20h)</option>
            <option value="At Risk">At Risk (&lt;8h)</option>
            <option value="Breached">Breached</option>
            <option value="Escalated">Escalated</option>
          </select>

          {(selectedSeverity !== 'ALL' ||
            selectedStatus !== 'ALL' ||
            selectedTeam !== 'ALL' ||
            selectedSLA !== 'ALL' ||
            searchQuery) && (
            <button
              onClick={resetFilters}
              className="px-2 py-1 text-[11px] text-qems-danger hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main High-Density Enterprise Table */}
      <div className="bg-qems-bg-white border border-qems-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-qems-bg-surface text-qems-text-muted border-b border-qems-border font-bold text-[11px] uppercase tracking-wider select-none sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 w-8 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-qems-text-disabled hover:text-qems-text-muted :text-slate-200"
                  >
                    {selectedIds.length === paginatedEvents.length && paginatedEvents.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-qems-brand-dark " />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                {visibleColumns.id && (
                  <th
                    onClick={() => handleSort('id')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Error ID {renderSortIndicator('id')}
                  </th>
                )}

                {visibleColumns.date && (
                  <th
                    onClick={() => handleSort('date')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Date {renderSortIndicator('date')}
                  </th>
                )}

                {visibleColumns.employee && (
                  <th
                    onClick={() => handleSort('employee')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Employee {renderSortIndicator('employee')}
                  </th>
                )}

                {visibleColumns.team && (
                  <th
                    onClick={() => handleSort('team')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Team {renderSortIndicator('team')}
                  </th>
                )}

                {visibleColumns.process && (
                  <th
                    onClick={() => handleSort('processArea')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Process Area {renderSortIndicator('processArea')}
                  </th>
                )}

                {visibleColumns.category && (
                  <th
                    onClick={() => handleSort('errorType')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Error Type {renderSortIndicator('errorType')}
                  </th>
                )}

                {visibleColumns.severity && (
                  <th
                    onClick={() => handleSort('severity')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Severity {renderSortIndicator('severity')}
                  </th>
                )}

                {visibleColumns.status && (
                  <th
                    onClick={() => handleSort('status')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Status {renderSortIndicator('status')}
                  </th>
                )}

                {visibleColumns.sla && (
                  <th
                    onClick={() => handleSort('slaStatus')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    SLA Clock {renderSortIndicator('slaStatus')}
                  </th>
                )}

                {visibleColumns.owner && (
                  <th
                    onClick={() => handleSort('owner')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Owner {renderSortIndicator('owner')}
                  </th>
                )}

                {visibleColumns.rootCause && (
                  <th
                    onClick={() => handleSort('rootCause')}
                    className="py-2 px-3 cursor-pointer hover:bg-qems-bg-secondary :bg-slate-700/50 transition whitespace-nowrap"
                  >
                    Root Cause {renderSortIndicator('rootCause')}
                  </th>
                )}

                <th className="py-2 px-3 text-right">View</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-qems-text-disabled text-xs">
                    No quality records match current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((ev) => {
                  const isSelected = selectedIds.includes(ev.id);
                  const isHeroCase = ev.id === 'QEMS-2026-001284';

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`hover:bg-qems-bg-surface :bg-slate-800/60 cursor-pointer transition select-none group ${
                        isSelected
                          ? 'bg-qems-brand-light/60 '
                          : isHeroCase
                          ? 'bg-qems-warning-bg/30 '
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-1.5 px-3 text-center" onClick={(e) => toggleSelectRow(ev.id, e)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-qems-brand-dark inline" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 group-hover:text-qems-text-muted :text-qems-text-disabled inline" />
                        )}
                      </td>

                      {/* ID */}
                      {visibleColumns.id && (
                        <td className="py-1.5 px-3 font-mono font-bold text-qems-brand-dark whitespace-nowrap">
                          {ev.id}
                          {isHeroCase && (
                            <span className="ml-1.5 px-1 py-0.2 bg-qems-brand text-white text-[9px] font-sans font-bold rounded">
                              HERO
                            </span>
                          )}
                        </td>
                      )}

                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-1.5 px-3 text-qems-text-muted font-mono text-[11px] whitespace-nowrap tabular-nums">
                          {ev.date}
                        </td>
                      )}

                      {/* Employee */}
                      {visibleColumns.employee && (
                        <td className="py-1.5 px-3 font-medium text-qems-text-primary whitespace-nowrap">
                          {ev.employee}
                        </td>
                      )}

                      {/* Team */}
                      {visibleColumns.team && (
                        <td className="py-1.5 px-3 text-qems-text-muted whitespace-nowrap">
                          {ev.team}
                        </td>
                      )}

                      {/* Process */}
                      {visibleColumns.process && (
                        <td className="py-1.5 px-3 font-medium text-qems-text-primary whitespace-nowrap">
                          {ev.processArea}
                        </td>
                      )}

                      {/* Error Type */}
                      {visibleColumns.category && (
                        <td className="py-1.5 px-3 text-qems-text-secondary whitespace-nowrap max-w-xs truncate" title={ev.title}>
                          {ev.errorType}
                        </td>
                      )}

                      {/* Severity */}
                      {visibleColumns.severity && (
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <SeverityBadge severity={ev.severity} />
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <StatusBadge status={ev.status} />
                        </td>
                      )}

                      {/* SLA */}
                      {visibleColumns.sla && (
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <SLABadge status={ev.slaStatus} hoursRemaining={ev.slaHoursRemaining} />
                        </td>
                      )}

                      {/* Owner */}
                      {visibleColumns.owner && (
                        <td className="py-1.5 px-3 text-qems-text-muted whitespace-nowrap text-[11px]">
                          {ev.owner}
                        </td>
                      )}

                      {/* Root Cause */}
                      {visibleColumns.rootCause && (
                        <td className="py-1.5 px-3 text-qems-text-muted whitespace-nowrap text-[11px]">
                          {ev.rootCause || <span className="text-slate-300 italic">Pending RCA</span>}
                        </td>
                      )}

                      {/* Action */}
                      <td className="py-1.5 px-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 bg-qems-bg-white border border-qems-border rounded text-[11px] font-medium text-qems-text-secondary group-hover:border-indigo-400 group-hover:text-qems-brand-dark :text-indigo-400 transition">
                          <Eye className="w-3 h-3 mr-1" />
                          Open
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="p-3 border-t border-qems-border bg-qems-bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-qems-text-muted ">
          <div>
            Showing{' '}
            <strong className="text-qems-text-primary font-mono">
              {Math.min((currentPage - 1) * pageSize + 1, sortedEvents.length)}
            </strong>{' '}
            to{' '}
            <strong className="text-qems-text-primary font-mono">
              {Math.min(currentPage * pageSize, sortedEvents.length)}
            </strong>{' '}
            of <strong className="text-qems-text-primary font-mono">{sortedEvents.length}</strong> entries
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-qems-bg-white border border-qems-border rounded text-xs text-qems-text-secondary disabled:opacity-40 hover:bg-qems-bg-surface :bg-slate-700"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-xs text-qems-text-muted ">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 bg-qems-bg-white border border-qems-border rounded text-xs text-qems-text-secondary disabled:opacity-40 hover:bg-qems-bg-surface :bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Assignment Modal */}
      {isBulkAssignOpen && (
        <div className="fixed inset-0 bg-slate-900/60  flex items-center justify-center z-50 p-4">
          <div className="bg-qems-bg-white rounded-lg border border-qems-border shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-qems-border-light ">
              <h3 className="font-bold text-sm text-qems-text-primary ">Bulk Reassign Quality Events</h3>
              <button
                onClick={() => setIsBulkAssignOpen(false)}
                className="text-qems-text-disabled hover:text-qems-text-muted :text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-qems-text-muted ">
              Select an authorized QA Auditor to reassign <strong>{selectedIds.length}</strong> selected
              quality events.
            </p>
            <div>
              <label className="block text-xs font-semibold text-qems-text-secondary mb-1">
                Assignee
              </label>
              <select
                value={bulkOwner}
                onChange={(e) => setBulkOwner(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-xs text-qems-text-primary focus:outline-none"
              >
                {auditorsList.map((auditor) => (
                  <option key={auditor.id} value={auditor.name}>
                    {auditor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-qems-border-light ">
              <button
                onClick={() => setIsBulkAssignOpen(false)}
                className="px-3 py-1.5 border border-qems-border rounded text-xs font-medium text-qems-text-muted hover:bg-qems-bg-surface :bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignConfirm}
                className="px-3 py-1.5 bg-qems-brand text-white rounded text-xs font-medium hover:bg-qems-brand-dark"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
