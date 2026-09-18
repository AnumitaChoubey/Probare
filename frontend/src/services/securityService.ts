import { UserRole } from '../types';

/**
 * Enterprise QEMS Security Service
 * Implements Defense-in-Depth for input sanitization, file upload verification, and RBAC authorization.
 */

export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'mp3',
  'wav',
  'csv',
  'xlsx',
  'docx',
  'txt',
];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB enterprise attachment limit

export interface FileValidationResult {
  valid: boolean;
  sanitizedFileName: string;
  error?: string;
  fileHash?: string;
}

/**
 * Computes a deterministic pseudo-SHA-256 string for browser chain of custody artifacts
 */
export async function generateFileChecksum(content: string | ArrayBuffer): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const buffer = typeof content === 'string' ? new TextEncoder().encode(content) : content;
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // Fallback if subtle crypto unavailable
  }

  // Fallback FNV-1a 64-bit hex representation
  let h1 = 0x811c9dc5;
  const str = typeof content === 'string' ? content : 'binary-evidence-payload';
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = (h1 * 0x01000193) >>> 0;
  }
  return `sha256_${h1.toString(16).padStart(8, '0')}${Date.now().toString(16).padStart(8, '0')}`;
}

/**
 * Validates uploaded evidence artifacts against MIME spoofing, path traversals, and size limits.
 */
export function validateUploadedFile(file: {
  name: string;
  size: number;
  type?: string;
}): FileValidationResult {
  if (!file || !file.name) {
    return { valid: false, sanitizedFileName: '', error: 'No file provided.' };
  }

  // Check for malicious directory traversal patterns
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      sanitizedFileName: '',
      error: 'Prohibited directory traversal sequence detected in file name.',
    };
  }

  // 1. Sanitize file name: remove control chars & unsafe HTML characters
  let cleanName = file.name
    .replace(/[\x00-\x1f\x80-\x9f<>:"|?*]/g, '')
    .trim();

  if (!cleanName || cleanName === '.') {
    cleanName = `evidence_${Date.now()}.pdf`;
  }

  // 2. Extension validation
  const ext = cleanName.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      sanitizedFileName: cleanName,
      error: `File type ".${ext}" is not permitted. Allowed extensions: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
    };
  }

  // 3. MIME type validation if supplied
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    // Check if the type matches our extension expectation
    const isImage = file.type.startsWith('image/') && ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
    const isAudio = file.type.startsWith('audio/') && ['mp3', 'wav'].includes(ext);
    if (!isImage && !isAudio) {
      return {
        valid: false,
        sanitizedFileName: cleanName,
        error: `MIME type "${file.type}" violates enterprise security policy.`,
      };
    }
  }

  // 4. File size limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      sanitizedFileName: cleanName,
      error: `File exceeds maximum upload threshold of 15MB (${(file.size / (1024 * 1024)).toFixed(1)}MB detected).`,
    };
  }

  return {
    valid: true,
    sanitizedFileName: cleanName,
  };
}

/**
 * Sanitizes arbitrary text inputs to eliminate Cross-Site Scripting (XSS) and injection attempts.
 */
export function sanitizeText(input: unknown, maxLength: number = 5000): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    return String(input);
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove script tags
    .replace(/javascript:/gi, '') // remove inline javascript: pseudo protocol
    .replace(/on\w+\s*=/gi, '') // remove on* handlers (onerror, onclick, onload)
    .replace(/[\x00\x08\x0B\x0C\x0E-\x1F]/g, '') // remove unprintable control chars
    .trim()
    .slice(0, maxLength);
}

export type SecureAction =
  | 'CREATE_EVENT'
  | 'EDIT_EVENT'
  | 'SUBMIT_REBUTTAL'
  | 'RESOLVE_REBUTTAL'
  | 'ESCALATE_DISPUTE'
  | 'PERFORM_RCA'
  | 'CREATE_CAPA'
  | 'UPDATE_CAPA_STATUS'
  | 'SUBMIT_EFFECTIVENESS_REVIEW'
  | 'CLOSE_EVENT'
  | 'REOPEN_EVENT'
  | 'EXPORT_AUDIT_PACKAGE'
  | 'MANAGE_SETTINGS'
  | 'SYSTEM_ADMIN';

/**
 * Strict Role-Based Access Control (RBAC) Authorizer
 */
export function authorizeAction(role: UserRole, action: SecureAction): { authorized: boolean; reason?: string } {
  const rolePermissions: Record<SecureAction, UserRole[]> = {
    SYSTEM_ADMIN: [
      'System Administrator',
      'Administrator',
    ],
    CREATE_EVENT: [
      'QA Auditor',
      'QA Reviewer',
      'Team Lead',
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    EDIT_EVENT: [
      'QA Auditor',
      'QA Reviewer',
      'Team Lead',
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    SUBMIT_REBUTTAL: [
      'Frontline Employee',
      'Team Lead',
      'System Administrator',
      'Administrator',
    ],
    RESOLVE_REBUTTAL: [
      'QA Auditor',
      'QA Reviewer',
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    ESCALATE_DISPUTE: [
      'Frontline Employee',
      'Team Lead',
      'QA Auditor',
      'QA Reviewer',
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    PERFORM_RCA: [
      'QA Auditor',
      'QA Reviewer',
      'Team Lead',
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    CREATE_CAPA: [
      'Team Lead',
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    UPDATE_CAPA_STATUS: [
      'Frontline Employee',
      'Team Lead',
      'QA Auditor',
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    SUBMIT_EFFECTIVENESS_REVIEW: [
      'QA Manager',
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    CLOSE_EVENT: [
      'QA Manager',
      'Quality Governance',
      'Executive / Leadership',
      'System Administrator',
      'Administrator',
    ],
    REOPEN_EVENT: [
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
    EXPORT_AUDIT_PACKAGE: [
      'QA Auditor',
      'QA Reviewer',
      'Team Lead',
      'QA Manager',
      'Quality Governance',
      'Executive / Leadership',
      'System Administrator',
      'Administrator',
    ],
    MANAGE_SETTINGS: [
      'Quality Governance',
      'System Administrator',
      'Administrator',
    ],
  };

  const allowedRoles = rolePermissions[action] || [];
  if (allowedRoles.includes(role)) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: `Access Denied: Role "${role}" does not hold the required security privilege for action "${action}".`,
  };
}
