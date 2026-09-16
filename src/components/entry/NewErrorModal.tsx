import React, { useState } from 'react';
import {
  X,
  Plus,
  Sparkles,
  Upload,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { useQEMS } from '../../context/QEMSContext';
import { Severity, QualityEvent } from '../../types';
import { TEAMS, EMPLOYEES, SOP_CATALOG, ERROR_TYPES, QA_AUDITORS } from '../../data/mockData';

export const NewErrorModal: React.FC = () => {
  const {
    isNewErrorModalOpen,
    setIsNewErrorModalOpen,
    currentUser,
    addQualityEvent,
    setSelectedEventId,
    setActiveSection,
    addToast,
  } = useQEMS();

  // Form states
  const [employee, setEmployee] = useState(EMPLOYEES[0].name);
  const [team, setTeam] = useState(EMPLOYEES[0].team);
  const [processArea, setProcessArea] = useState('Payment Operations');
  const [sopId, setSopId] = useState('SOP-PAY-014');
  const [errorType, setErrorType] = useState('Incorrect Payout Calculation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [actualOutcome, setActualOutcome] = useState('');

  // Severity Rubric calculator
  const [finImpact, setFinImpact] = useState<number>(0);
  const [custImpact, setCustImpact] = useState<'None' | 'Minor Inconvenience' | 'Financial Delay' | 'Account Blocked'>('Financial Delay');
  const [compImpact, setCompImpact] = useState<'None' | 'Internal Guideline' | 'At Risk' | 'Breach'>('Internal Guideline');
  const [isRepeat, setIsRepeat] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isNewErrorModalOpen) return null;

  // Calculate severity dynamically
  const calculateSeverity = (): Severity => {
    if (compImpact === 'Breach' || finImpact >= 5000) return 'CRITICAL';
    if (compImpact === 'At Risk' || finImpact >= 1000 || custImpact === 'Account Blocked')
      return 'HIGH';
    if (finImpact > 0 || custImpact === 'Financial Delay' || isRepeat) return 'MEDIUM';
    return 'LOW';
  };

  const currentSeverity = calculateSeverity();

  // Update team when employee changes
  const handleEmployeeChange = (empName: string) => {
    setEmployee(empName);
    const found = EMPLOYEES.find((e) => e.name === empName);
    if (found) {
      setTeam(found.team);
    }
  };

  // AI Assistance: Classify error based on description
  const handleAiClassify = async () => {
    if (!description.trim()) {
      addToast({
        type: 'warning',
        title: 'Description Needed',
        description: 'Type a brief error description before running AI classification.',
      });
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/classify-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          processArea,
          financialImpact: finImpact,
        }),
      });
      const data = await res.json();
      if (data.errorType) setErrorType(data.errorType);
      if (data.sopId) setSopId(data.sopId);
      if (data.suggestedTitle && !title) setTitle(data.suggestedTitle);
      if (data.expectedOutcome && !expectedOutcome) setExpectedOutcome(data.expectedOutcome);
      if (data.actualOutcome && !actualOutcome) setActualOutcome(data.actualOutcome);

      addToast({
        type: 'success',
        title: 'AI Classification Applied',
        description: `Matched to ${data.sopId || 'SOP'} with severity ${data.severity || currentSeverity}.`,
      });
    } catch (err) {
      console.warn('AI classify fallback:', err);
      // Fallback auto matcher
      setTitle(`Procedural deviation during ${processArea}`);
      setExpectedOutcome('Transaction processed in strict compliance with SOP guidelines.');
      setActualOutcome('Incorrect parameter applied causing downstream adjustment.');
      addToast({
        type: 'info',
        title: 'Auto-Classification Applied',
        description: 'Pre-filled outcomes based on process standard.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const names = Array.from(e.target.files).map((f: File) => f.name);
      setUploadedFiles((prev) => [...prev, ...names]);
      addToast({
        type: 'info',
        title: 'Evidence Attached',
        description: `${names.length} file(s) added to evidence packet.`,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 5) {
      newErrors.title = 'Title is required and must be at least 5 characters.';
    }
    if (!description.trim() || description.trim().length < 15) {
      newErrors.description = 'Description is required and must be at least 15 characters.';
    }
    if (!employee) {
      newErrors.employee = 'Please select an employee.';
    }
    if (!sopId) {
      newErrors.sopId = 'Please select an applicable SOP standard.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast({
        type: 'warning',
        title: 'Validation Errors Detected',
        description: 'Please correct the highlighted fields before submitting.',
      });
      return;
    }

    setErrors({});
    const empObj = EMPLOYEES.find((e) => e.name === employee);
    const sopObj = SOP_CATALOG.find((s) => s.id === sopId);

    const newEv = addQualityEvent({
      title,
      description,
      employee,
      employeeId: empObj?.id || 'EMP-101',
      team,
      processArea,
      subCategory: 'Procedural Compliance',
      errorType,
      severity: currentSeverity,
      status: 'Logged',
      owner: currentUser.name,
      createdBy: currentUser.name,
      slaStatus: 'On Track',
      slaDueDate: new Date(Date.now() + 48 * 3600 * 1000)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 16),
      slaHoursRemaining: 48,
      sopId,
      sopTitle: sopObj?.name || 'Operational SOP Standard',
      financialImpact: finImpact > 0 ? `$${finImpact.toLocaleString()}` : undefined,
      customerImpact: custImpact,
      evidence: uploadedFiles.map((name, i) => ({
        id: `EVD-${Date.now()}-${i}`,
        title: name,
        type: (name.endsWith('.wav') || name.endsWith('.mp3') ? 'audio' : 'screenshot') as any,
        fileName: name,
        fileSize: '1.4 MB',
        uploadedBy: currentUser.name,
        uploadedAt: new Date().toISOString().substring(0, 16),
        description: 'Evidence captured during operational quality audit sample.',
      })),
      correctiveActions: [],
    });

    setIsNewErrorModalOpen(false);
    setSelectedEventId(newEv.id);
    setActiveSection('QUALITY EVENTS');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Fast Entry Mode (&lt;60s)
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Auditor: <strong className="text-slate-700 dark:text-slate-300">{currentUser.name}</strong>
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              Log Quality Error Finding
            </h2>
          </div>

          <button
            onClick={() => setIsNewErrorModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Employee & Queue Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Employee Evaluated
              </label>
              <select
                value={employee}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
              >
                {EMPLOYEES.map((emp) => (
                  <option key={emp.name} value={emp.name}>
                    {emp.name} ({emp.team})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Process Area</label>
              <select
                value={processArea}
                onChange={(e) => setProcessArea(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
              >
                <option value="Payment Operations">Payment Operations</option>
                <option value="Claims Adjudication">Claims Adjudication</option>
                <option value="KYC & Identity">KYC & Identity</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Billing & Invoicing">Billing & Invoicing</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Standard (SOP)</label>
              <select
                value={sopId}
                onChange={(e) => setSopId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono text-[11px]"
              >
                {SOP_CATALOG.map((sop) => (
                  <option key={sop.id} value={sop.id}>
                    {sop.id} - {sop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description & AI Button */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Defect Description & Context
              </label>
              <button
                type="button"
                onClick={handleAiClassify}
                disabled={aiLoading}
                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-semibold flex items-center space-x-1 transition"
              >
                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>{aiLoading ? 'Analyzing...' : 'AI Auto-Classify'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              required
              placeholder="Describe the discrepancy observed during quality audit sampling (minimum 15 characters)..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
              }}
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none leading-relaxed transition ${
                errors.description ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
              }`}
            />
            {errors.description && (
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium block">
                {errors.description}
              </span>
            )}
          </div>

          {/* Title & Error Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Defect Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Failure to verify SWIFT code on payout"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                }}
                className={`w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 transition ${
                  errors.title ? 'border-rose-500 bg-rose-50/20 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                }`}
              />
              {errors.title && (
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium block mt-1">
                  {errors.title}
                </span>
              )}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Error Type</label>
              <select
                value={errorType}
                onChange={(e) => setErrorType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
              >
                {ERROR_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expected vs Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                Expected Outcome
              </label>
              <input
                type="text"
                placeholder="Standard procedural result"
                value={expectedOutcome}
                onChange={(e) => setExpectedOutcome(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-rose-800 dark:text-rose-300 mb-1">
                Actual Outcome
              </label>
              <input
                type="text"
                placeholder="What actually occurred"
                value={actualOutcome}
                onChange={(e) => setActualOutcome(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Guided Severity Calculator */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850/60 rounded border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Guided Severity Calculator
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 dark:text-slate-400">Calculated Severity:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold font-mono ${
                    currentSeverity === 'CRITICAL'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : currentSeverity === 'HIGH'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                  }`}
                >
                  {currentSeverity}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  Financial Exposure ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={finImpact}
                  onChange={(e) => setFinImpact(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Customer Impact</label>
                <select
                  value={custImpact}
                  onChange={(e) => setCustImpact(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                >
                  <option value="None">None</option>
                  <option value="Minor Inconvenience">Minor Inconvenience</option>
                  <option value="Financial Delay">Financial Delay</option>
                  <option value="Account Blocked">Account Blocked</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Regulatory / Legal</label>
                <select
                  value={compImpact}
                  onChange={(e) => setCompImpact(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                >
                  <option value="None">None</option>
                  <option value="Internal Guideline">Internal Guideline</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Breach">Direct Breach</option>
                </select>
              </div>
            </div>
          </div>

          {/* Evidence Upload */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Evidence Attachments (Audio, Transcript, Screenshot, PDF)
            </label>
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded p-3 text-center hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer relative transition">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-4 h-4 mx-auto text-slate-400 mb-1" />
              <div className="text-slate-700 dark:text-slate-300 font-medium">
                Click or drag files here to attach evidence
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                MP3, WAV, PNG, JPEG, PDF up to 25MB
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {uploadedFiles.map((fn, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700"
                  >
                    <Paperclip className="w-3 h-3 text-slate-400" />
                    <span>{fn}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              SLA will automatically set to <strong className="text-slate-600 dark:text-slate-400">48 hours</strong> upon submission.
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsNewErrorModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold flex items-center space-x-1.5 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save Quality Event</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
