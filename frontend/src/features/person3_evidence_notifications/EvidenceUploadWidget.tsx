import React, { useState, useRef } from 'react';
import './evidence.css';

export interface EvidenceFile {
  id: string;
  error_id?: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  malware_scan_status: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';
  stage: string;
}

export interface EvidenceUploadWidgetProps {
  stage: 'ORIGINAL_LOGGING' | 'REBUTTAL' | 'DECISION';
  errorId?: string;
  uploadedByUserId?: string;
  onUploadSuccess?: (uploadedFile: EvidenceFile) => void;
  apiBaseUrl?: string;
}

export const EvidenceUploadWidget: React.FC<EvidenceUploadWidgetProps> = ({
  stage,
  errorId,
  uploadedByUserId = 'user-default-1',
  onUploadSuccess,
  apiBaseUrl = 'http://localhost:8000',
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<EvidenceFile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('stage', stage);
    formData.append('uploaded_by_user_id', uploadedByUserId);

    const targetUrl = errorId
      ? `${apiBaseUrl}/errors/${errorId}/evidence`
      : `${apiBaseUrl}/evidence/upload-draft`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const newEvidence: EvidenceFile = await response.json();
      setUploadedFiles((prev) => [...prev, newEvidence]);
      if (onUploadSuccess) {
        onUploadSuccess(newEvidence);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveChip = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="evidence-upload-widget">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        id={`file-input-${stage}`}
      />
      <label htmlFor={`file-input-${stage}`} className="upload-dropzone">
        <div className="upload-icon">📁</div>
        <div className="upload-title">
          {uploading ? 'Uploading Evidence...' : `Upload ${stage.replace('_', ' ')} Evidence`}
        </div>
        <div className="upload-subtitle">
          Drag and drop file here, or click to browse (Max 25MB • PNG, PDF, CSV, DOCX)
        </div>
      </label>

      {errorMsg && <div style={{ color: 'var(--accent-red)', marginTop: '10px', fontSize: '13px' }}>{errorMsg}</div>}

      {uploadedFiles.length > 0 && (
        <div className="file-chips-list">
          {uploadedFiles.map((f) => (
            <div key={f.id} className="file-chip">
              <span>📄 {f.file_name}</span>
              <span className={`badge-scan badge-${f.malware_scan_status.toLowerCase()}`}>
                {f.malware_scan_status}
              </span>
              <span className="file-chip-remove" onClick={() => handleRemoveChip(f.id)}>
                ✕
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvidenceUploadWidget;
