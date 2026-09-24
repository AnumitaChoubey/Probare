import React, { useState, useEffect, useCallback } from 'react';
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
import { aiApi } from '../../services/api';

export const NewErrorModal: React.FC = () => {
  const {
    isNewErrorModalOpen,
    setIsNewErrorModalOpen,
    currentUser,
    addQualityEvent,
    setSelectedEventId,
    setActiveSection,
    addToast,
    taxonomy,
    projectUsers
  } = useQEMS();

  // Derived lists from context
  const employeesList = projectUsers?.length > 0 ? projectUsers : [{ id: 'none', name: 'No users found', project_role: 'N/A' }];
  const auditorsList = projectUsers?.filter(u => u.project_role.includes('QA')) || [];
  const teamsList = taxonomy?.teams || [];
  const processKeys = Object.keys(taxonomy?.processes || {});
  const errorTypesList = Object.values(taxonomy?.processes || {})
    .flatMap((p: any) => p.errorTypes || [])
    .filter((value, index, self) => self.indexOf(value) === index);
  
  const availableSops = Object.values(taxonomy?.processes || {}).map((p: any) => p.defaultSop).filter(Boolean);
  const initialSop = availableSops.length > 0 ? (availableSops[0] as any).id : 'SOP-GEN-001';
  
  // Form states
  const [employee, setEmployee] = useState(employeesList[0]?.name || '');
  const [team, setTeam] = useState(teamsList[0] || '');
  const [processArea, setProcessArea] = useState(processKeys[0] || '');
  const [sopId, setSopId] = useState(initialSop);
  const [errorType, setErrorType] = useState(errorTypesList[0] || 'Unclassified');
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



  // Calculate severity dynamically
  const calculateSeverity = (): Severity => {
    if (compImpact === 'Breach' || finImpact >= 5000) return 'CRITICAL';
    if (compImpact === 'At Risk' || finImpact >= 1000 || custImpact === 'Account Blocked')
      return 'HIGH';
    if (finImpact > 0 || custImpact === 'Financial Delay' || isRepeat) return 'MEDIUM';
    return 'LOW';
  };

  const currentSeverity = calculateSeverity();

  // Update team when employee changes (simplified for now, ideally users have default teams)
  const handleEmployeeChange = (empName: string) => {
    setEmployee(empName);
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
      const data = await aiApi.classify({
        description,
        processArea,
        financialImpact: finImpact,
      });

      if (data.errorType) setErrorType(data.errorType);
      if (data.sopId) setSopId(data.sopId);
      if (data.suggestedTitle && !title) setTitle(data.suggestedTitle);
      if (data.expectedOutcome && !expectedOutcome) setExpectedOutcome(data.expectedOutcome);
      if (data.actualOutcome && !actualOutcome) setActualOutcome(data.actualOutcome);

      addToast({
        type: 'success',
        title: 'AI Classification Applied',
        description: `Matched to ${data.sopId || 'SOP'} with severity ${data.suggestedSeverity || currentSeverity}.`,
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

  const handleNativeFileUpload = async () => {
    if (window.qems?.files) {
      const filePaths = await window.qems.files.open({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Evidence', extensions: ['mp3', 'wav', 'png', 'jpg', 'jpeg', 'pdf'] }]
      });
      if (filePaths && filePaths.length > 0) {
        // Extract just the filenames from the paths
        const names = filePaths.map(p => p.split(/[/\\]/).pop() || p);
        setUploadedFiles((prev) => [...prev, ...names]);
        addToast({
          type: 'info',
          title: 'Evidence Attached',
          description: `${names.length} file(s) added via native picker.`,
        });
      }
    }
  };

  // Paste handler
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // If native electron clipboard is available and user presses Ctrl+V
    if (window.qems?.clipboard) {
      const imgDataUrl = await window.qems.clipboard.readImage();
      if (imgDataUrl) {
        setUploadedFiles((prev) => [...prev, `pasted-image-${Date.now()}.png`]);
        addToast({
          type: 'info',
          title: 'Clipboard Image Attached',
          description: 'Image pasted directly from clipboard.',
        });
        return; // Handled by Electron
      }
    }
    
    // Fallback to browser standard paste
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const names = Array.from(e.clipboardData.files).map(f => f.name);
      setUploadedFiles((prev) => [...prev, ...names]);
      addToast({
        type: 'info',
        title: 'Clipboard File Attached',
        description: `${names.length} file(s) pasted.`,
      });
    }
  }, [addToast]);

  useEffect(() => {
    if (isNewErrorModalOpen) {
      window.addEventListener('paste', handlePaste);
    }
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isNewErrorModalOpen, handlePaste]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    const empObj = employeesList.find((e: any) => e.name === employee);
    const availableSops = Object.values(taxonomy?.processes || {}).map((p: any) => p.defaultSop).filter(Boolean);
    const sopObj = availableSops.find((s: any) => s.id === sopId);

    try {
      const newEv = await addQualityEvent({
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
    } catch (err) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Submission Failed',
        description: 'Could not create the quality event.',
      });
    }
  };

  if (!isNewErrorModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60  flex items-center justify-center z-50 p-4">
      <div className="bg-qems-bg-white rounded-lg border border-qems-border shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-qems-border flex items-center justify-between bg-qems-bg-surface/70 ">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-qems-brand-dark bg-qems-brand-light px-2 py-0.5 rounded border border-qems-brand ">
                Fast Entry Mode (&lt;60s)
              </span>
              <span className="text-xs text-qems-text-disabled ">•</span>
              <span className="text-xs text-qems-text-muted ">
                Auditor: <strong className="text-qems-text-secondary ">{currentUser.name}</strong>
              </span>
            </div>
            <h2 className="text-sm font-bold text-qems-text-primary mt-1">
              Log Quality Error Finding
            </h2>
          </div>

          <button
            onClick={() => setIsNewErrorModalOpen(false)}
            className="text-qems-text-disabled hover:text-qems-text-secondary :text-slate-200 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Employee & Queue Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-qems-text-secondary mb-1">
                Employee Evaluated
              </label>
              <select
                value={employee}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-qems-text-primary "
              >
                {employeesList.map((emp) => (
                  <option key={emp.name} value={emp.name}>
                    {emp.name} ({emp.project_role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-qems-text-secondary mb-1">Process Area</label>
              <select
                value={processArea}
                onChange={(e) => setProcessArea(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-qems-text-primary "
              >
                {processKeys.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                {processKeys.length === 0 && <option value="General">General</option>}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-qems-text-secondary mb-1">Standard (SOP)</label>
              <select
                value={sopId}
                onChange={(e) => setSopId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-qems-text-primary font-mono text-[11px]"
              >
                {Object.values(taxonomy?.processes || {}).map((p: any) => p.defaultSop).filter(Boolean).map((sop: any) => (
                  <option key={sop.id} value={sop.id}>
                    {sop.id} - {sop.title}
                  </option>
                ))}
                <option value="SOP-GEN-001">SOP-GEN-001 - General Quality Standard</option>
              </select>
            </div>
          </div>

          {/* Description & AI Button */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-qems-text-secondary ">
                Defect Description & Context
              </label>
              <button
                type="button"
                onClick={handleAiClassify}
                disabled={aiLoading}
                className="px-2.5 py-1 bg-qems-brand-light hover:bg-qems-brand-light :bg-indigo-900/60 border border-qems-brand text-qems-brand-dark rounded text-[11px] font-semibold flex items-center space-x-1 transition"
              >
                <Sparkles className="w-3 h-3 text-qems-brand-dark " />
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
              className={`w-full px-3 py-2 bg-qems-bg-surface border rounded text-qems-text-primary placeholder-slate-400 focus:bg-qems-bg-white :bg-slate-800 focus:outline-none leading-relaxed transition ${
                errors.description ? 'border-rose-500 bg-qems-danger-bg/20 ring-1 ring-rose-500' : 'border-qems-border focus:border-qems-brand'
              }`}
            />
            {errors.description && (
              <span className="text-[11px] text-qems-danger font-medium block">
                {errors.description}
              </span>
            )}
          </div>

          {/* Title & Error Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-qems-text-secondary mb-1">Defect Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Failure to verify SWIFT code on payout"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                }}
                className={`w-full px-2.5 py-1.5 bg-qems-bg-surface border rounded text-qems-text-primary focus:bg-qems-bg-white :bg-slate-800 transition ${
                  errors.title ? 'border-rose-500 bg-qems-danger-bg/20 ring-1 ring-rose-500' : 'border-qems-border focus:border-qems-brand'
                }`}
              />
              {errors.title && (
                <span className="text-[11px] text-qems-danger font-medium block mt-1">
                  {errors.title}
                </span>
              )}
            </div>
            <div>
              <label className="block font-semibold text-qems-text-secondary mb-1">Error Type</label>
              <select
                value={errorType}
                onChange={(e) => setErrorType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-qems-bg-surface border border-qems-border rounded text-qems-text-primary "
              >
                {errorTypesList.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
                {errorTypesList.length === 0 && <option value="Unclassified">Unclassified</option>}
              </select>
            </div>
          </div>

          {/* Expected vs Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-emerald-800 mb-1">
                Expected Outcome
              </label>
              <input
                type="text"
                placeholder="Standard procedural result"
                value={expectedOutcome}
                onChange={(e) => setExpectedOutcome(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-qems-success-bg/50 border border-emerald-200 rounded text-qems-text-primary "
              />
            </div>
            <div>
              <label className="block font-semibold text-rose-800 mb-1">
                Actual Outcome
              </label>
              <input
                type="text"
                placeholder="What actually occurred"
                value={actualOutcome}
                onChange={(e) => setActualOutcome(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-qems-danger-bg/50 border border-rose-200 rounded text-qems-text-primary "
              />
            </div>
          </div>

          {/* Guided Severity Calculator */}
          <div className="p-3 bg-qems-bg-surface rounded border border-qems-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-qems-text-primary uppercase tracking-wider text-[11px]">
                Guided Severity Calculator
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-qems-text-muted ">Calculated Severity:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold font-mono ${
                    currentSeverity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 '
                      : currentSeverity === 'HIGH'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 '
                      : 'bg-blue-100 text-blue-800 border border-blue-300 '
                  }`}
                >
                  {currentSeverity}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-qems-text-muted mb-1 font-medium">
                  Financial Exposure ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={finImpact}
                  onChange={(e) => setFinImpact(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded font-mono text-qems-text-primary "
                />
              </div>

              <div>
                <label className="block text-qems-text-muted mb-1 font-medium">Customer Impact</label>
                <select
                  value={custImpact}
                  onChange={(e) => setCustImpact(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-qems-text-primary "
                >
                  <option value="None">None</option>
                  <option value="Minor Inconvenience">Minor Inconvenience</option>
                  <option value="Financial Delay">Financial Delay</option>
                  <option value="Account Blocked">Account Blocked</option>
                </select>
              </div>

              <div>
                <label className="block text-qems-text-muted mb-1 font-medium">Regulatory / Legal</label>
                <select
                  value={compImpact}
                  onChange={(e) => setCompImpact(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-qems-bg-white border border-qems-border rounded text-qems-text-primary "
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
            <label className="block font-semibold text-qems-text-secondary ">
              Evidence Attachments (Audio, Transcript, Screenshot, PDF)
            </label>
            <div 
              className="border border-dashed border-slate-300 rounded p-3 text-center hover:bg-qems-bg-surface :bg-slate-800 cursor-pointer relative transition"
              onClick={() => {
                if (window.qems) {
                  handleNativeFileUpload();
                }
              }}
            >
              {!window.qems && (
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              )}
              <Upload className="w-4 h-4 mx-auto text-qems-text-disabled mb-1" />
              <div className="text-qems-text-secondary font-medium">
                Click or drag files here to attach evidence (or Ctrl+V to paste)
              </div>
              <div className="text-[10px] text-qems-text-disabled ">
                MP3, WAV, PNG, JPEG, PDF up to 25MB
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {uploadedFiles.map((fn, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-qems-bg-secondary text-qems-text-secondary font-mono text-[11px] border border-qems-border "
                  >
                    <Paperclip className="w-3 h-3 text-qems-text-disabled" />
                    <span>{fn}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-qems-border flex items-center justify-between">
            <div className="text-[11px] text-qems-text-disabled ">
              SLA will automatically set to <strong className="text-qems-text-muted ">48 hours</strong> upon submission.
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsNewErrorModalOpen(false)}
                className="px-3 py-1.5 border border-qems-border rounded text-qems-text-muted hover:bg-qems-bg-surface :bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-qems-brand hover:bg-qems-brand-dark text-white rounded font-semibold flex items-center space-x-1.5 transition"
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
