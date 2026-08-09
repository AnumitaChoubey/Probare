const API_BASE = 'http://localhost:8000';

export async function uploadEvidence(errorId: string, file: File, stage: string = 'ORIGINAL_LOGGING') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('stage', stage);

  const res = await fetch(`${API_BASE}/errors/${errorId}/evidence`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload evidence');
  return res.json();
}

export async function getErrorEvidence(errorId: string) {
  const res = await fetch(`${API_BASE}/errors/${errorId}/evidence`);
  if (!res.ok) throw new Error('Failed to fetch evidence');
  return res.json();
}

export async function supersedeEvidence(evidenceId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/supersede`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to supersede evidence');
  return res.json();
}
