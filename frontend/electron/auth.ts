import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const AUTH_FILE_PATH = path.join(app.getPath('userData'), 'qems-auth.enc');
const OFFLINE_MAX_AGE_DAYS = 3;

export interface OfflineSession {
  token: string;
  user_id: string;
  tenant_id: string;
  projects: string[];
  roles: string[];
  permissions: string[];
  created_at: string;
  expires_at: string;
}

export function saveOfflineSession(sessionData: Omit<OfflineSession, 'created_at' | 'expires_at'>) {
  const now = new Date();
  const expires = new Date();
  expires.setDate(now.getDate() + OFFLINE_MAX_AGE_DAYS);

  const session: OfflineSession = {
    ...sessionData,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };

  const jsonStr = JSON.stringify(session);
  let encrypted: Buffer;
  
  if (safeStorage.isEncryptionAvailable()) {
    encrypted = safeStorage.encryptString(jsonStr);
  } else {
    // Fallback if OS credential manager is unavailable
    encrypted = Buffer.from(jsonStr, 'utf-8');
  }

  fs.writeFileSync(AUTH_FILE_PATH, encrypted);
}

export function getOfflineSession(): OfflineSession | null {
  if (!fs.existsSync(AUTH_FILE_PATH)) return null;

  try {
    const encrypted = fs.readFileSync(AUTH_FILE_PATH);
    let jsonStr: string;
    
    if (safeStorage.isEncryptionAvailable()) {
      jsonStr = safeStorage.decryptString(encrypted);
    } else {
      jsonStr = encrypted.toString('utf-8');
    }

    const session: OfflineSession = JSON.parse(jsonStr);
    
    // Check expiration
    if (new Date() > new Date(session.expires_at)) {
      clearOfflineSession();
      return null;
    }

    return session;
  } catch (err) {
    console.error("Failed to read offline session:", err);
    return null;
  }
}

export function clearOfflineSession() {
  if (fs.existsSync(AUTH_FILE_PATH)) {
    fs.unlinkSync(AUTH_FILE_PATH);
  }
}
