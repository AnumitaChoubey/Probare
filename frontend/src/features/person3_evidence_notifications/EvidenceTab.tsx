import React, { useEffect, useState } from 'react';
import './evidence.css';

export interface EvidenceFileItem {
  id: string;
  error_id?: string;
  uploaded_by_user_id: string;
  stage: 'ORIGINAL_LOGGING' | 'REBUTTAL' | 'DECISION';
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  malware_scan_status: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';
  is_current_version: boolean;
  supersedes_evidence_id?: string;
  uploaded_at: string;
}

export interface EvidenceTabProps {
  errorId: string;
  apiBaseUrl?: string;
}

export const EvidenceTab: React.FC<EvidenceTabProps> = ({
  errorId,
  apiBaseUrl = 'http://localhost:8000',
}) => {
  const [auditorEvidence, setAuditorEvidence] = useState<EvidenceFileItem[]>([]);
  const [rebuttalEvidence, setRebuttalEvidence] = useState<EvidenceFileItem[]>([]);
  const [decisionEvidence, setDecisionEvidence] = useState<EvidenceFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const fetchEvidence = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/errors/${errorId}/evidence`);
      if (res.ok) {
        const data = await res.json();
        setAuditorEvidence(data.auditor_evidence || []);
        setRebuttalEvidence(data.rebuttal_evidence || []);
        setDecisionEvidence(data.decision_evidence || []);
      }
    } catch (e) {
      console.error('Failed to fetch evidence', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [errorId]);

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownload = (id: string) => {
    window.open(`${apiBaseUrl}/evidence/${id}/download`, '_blank');
  };

  const renderEvidenceGrid = (files: EvidenceFileItem[]) => {
    if (files.length === 0) {
      return <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No evidence uploaded for this stage.</div>;
    }

    const currentFiles = files.filter((f) => f.is_current_version);
    const archivedFiles = files.filter((f) => !f.is_current_version);

    return (
      <div className="evidence-grid">
        {currentFiles.map((file) => {
          const supersededChain = archivedFiles.filter((a) => a.supersedes_evidence_id === file.id || a.id === file.supersedes_evidence_id);
          const isClean = file.malware_scan_status === 'CLEAN';

          return (
            <div key={file.id} className="evidence-card">
              <div>
                <div className="evidence-card-header">
                  <span className="file-name">📄 {file.file_name}</span>
                  <span className={`badge-scan badge-${file.malware_scan_status.toLowerCase()}`}>
                    {file.malware_scan_status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Uploaded by: {file.uploaded_by_user_id} • {(file.file_size_bytes / 1024).toFixed(1)} KB
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {new Date(file.uploaded_at).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="btn-download"
                  onClick={() => handleDownload(file.id)}
                  disabled={!isClean}
                >
                  {isClean ? '⬇ Download' : '⏳ Scanning...'}
                </button>

                {supersededChain.length > 0 && (
                  <div>
                    <button className="version-history-toggle" onClick={() => toggleHistory(file.id)}>
                      {expandedHistory[file.id] ? 'Hide Version History' : `Version History (${supersededChain.length})`}
                    </button>
                    {expandedHistory[file.id] && (
                      <div style={{ marginTop: '8px', paddingLeft: '10px', borderLeft: '2px solid var(--accent-purple)' }}>
                        {supersededChain.map((oldFile) => (
                          <div key={oldFile.id} style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Prior Version: {oldFile.file_name} ({new Date(oldFile.uploaded_at).toLocaleDateString()})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-primary)' }}>Loading Evidence...</div>;
  }

  return (
    <div className="evidence-tab-container">
      <div className="evidence-section">
        <div className="section-title">🔍 Auditor Evidence (Original Logging)</div>
        {renderEvidenceGrid(auditorEvidence)}
      </div>

      <div className="evidence-section">
        <div className="section-title">💬 Rebuttal Evidence</div>
        {renderEvidenceGrid(rebuttalEvidence)}
      </div>

      <div className="evidence-section">
        <div className="section-title">⚖ Decision Evidence</div>
        {renderEvidenceGrid(decisionEvidence)}
      </div>
    </div>
  );
};

export default EvidenceTab;
