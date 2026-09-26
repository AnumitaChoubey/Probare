import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// Initialize the database in the userData folder
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'qems-local.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Define Schema
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_local_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );
    
    CREATE TABLE IF NOT EXISTS quality_error (
      _local_id TEXT PRIMARY KEY,
      _server_id TEXT NULL,
      _sync_status TEXT NOT NULL,
      _local_version INTEGER NOT NULL,
      _server_version INTEGER NULL,
      _last_synced_at TEXT NULL,
      _created_offline BOOLEAN NOT NULL DEFAULT 0,
      
      -- core fields (mirrors server)
      event_number TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      project_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      process_id TEXT NOT NULL,
      sub_process_id TEXT,
      error_type_id TEXT,
      sop_id TEXT,
      owner_id TEXT NULL,
      customer_impact TEXT,
      financial_impact TEXT,
      compliance_impact TEXT,
      sla_due_at TEXT NULL,
      sla_status TEXT NULL,
      closed_at TEXT NULL
    );
  `);
}

// Data Layer Operations
export function getQualityErrors(filters: any) {
  const stmt = db.prepare('SELECT * FROM quality_error');
  return stmt.all();
}

export function createQualityError(errorData: any, localId: string, idempotencyKey: string) {
  const insertError = db.prepare(`
    INSERT INTO quality_error (
      _local_id, _sync_status, _local_version, _created_offline,
      event_number, title, description, status, severity, project_id, employee_id,
      created_by_id, team_id, process_id, sub_process_id, error_type_id, sop_id,
      customer_impact
    ) VALUES (
      ?, 'pending', 1, 1,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?
    )
  `);
  
  const insertOutbox = db.prepare(`
    INSERT INTO sync_outbox (
      entity_type, entity_local_id, operation, payload_json, idempotency_key, created_at, status
    ) VALUES (
      'quality_error', ?, 'create', ?, ?, datetime('now'), 'pending'
    )
  `);

  const transaction = db.transaction(() => {
    insertError.run(
      localId,
      errorData.event_number || null,
      errorData.title,
      errorData.description,
      errorData.status || 'Draft',
      errorData.severity,
      errorData.project_id,
      errorData.employee_id,
      errorData.created_by_id,
      errorData.team_id,
      errorData.process_id,
      errorData.sub_process_id || null,
      errorData.error_type_id || null,
      errorData.sop_id || null,
      errorData.customer_impact || null
    );

    insertOutbox.run(
      localId,
      JSON.stringify(errorData),
      idempotencyKey
    );
  });

  transaction();
  return { success: true, localId };
}

export function updateQualityError(localId: string, errorData: any, idempotencyKey: string) {
  const current = db.prepare('SELECT _local_version, _sync_status FROM quality_error WHERE _local_id = ?').get(localId) as any;
  if (!current) throw new Error('Not found');

  const newVersion = current._local_version + 1;
  const newSyncStatus = current._sync_status === 'synced' ? 'pending' : current._sync_status;

  const updates = [];
  const values = [];
  for (const [k, v] of Object.entries(errorData)) {
    if (k.startsWith('_')) continue;
    updates.push(`${k} = ?`);
    values.push(v);
  }

  const updateError = db.prepare(`
    UPDATE quality_error 
    SET ${updates.join(', ')}, _local_version = ?, _sync_status = ?
    WHERE _local_id = ?
  `);

  const insertOutbox = db.prepare(`
    INSERT INTO sync_outbox (
      entity_type, entity_local_id, operation, payload_json, idempotency_key, created_at, status
    ) VALUES (
      'quality_error', ?, 'update', ?, ?, datetime('now'), 'pending'
    )
  `);

  const transaction = db.transaction(() => {
    updateError.run(...values, newVersion, newSyncStatus, localId);
    insertOutbox.run(localId, JSON.stringify(errorData), idempotencyKey);
  });

  transaction();
  return { success: true };
}
