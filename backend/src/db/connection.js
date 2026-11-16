import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { getConfig } from '../config/index.js';
import { acquireWriterLock, releaseWriterLock } from '../core/writerLock.js';

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

let handle = null;

function applyPragmas(database) {
  database.exec('PRAGMA foreign_keys = ON;');
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA synchronous = NORMAL;');
  database.exec('PRAGMA busy_timeout = 5000;');
}

function ensureColumn(database, table, column, definition) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((col) => col.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * Open the environment-selected SQLite file, take the writer lock, and apply schema.
 * Repeated calls return the same connection.
 */
export function openDatabase() {
  if (handle) return handle;

  const config = getConfig();
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.backupDir, { recursive: true });
  acquireWriterLock(config.lockPath);

  try {
    handle = new DatabaseSync(config.databasePath);
    applyPragmas(handle);
    handle.exec(fs.readFileSync(schemaPath, 'utf8'));
    ensureColumn(handle, 'raw_packet_logs', 'canonical_json', 'TEXT');
    ensureColumn(handle, 'vehicles', 'alternate_phone', 'TEXT');
    ensureColumn(handle, 'speed_alerts', 'ended_at', 'TEXT');
    ensureColumn(handle, 'speed_alerts', 'max_speed', 'REAL');
    ensureColumn(handle, 'speed_alerts', 'is_open', 'INTEGER DEFAULT 0');
    ensureColumn(handle, 'speed_alerts', 'distance_km', 'REAL DEFAULT 0');
    ensureColumn(handle, 'speed_alerts', 'severity', 'TEXT');
    ensureColumn(handle, 'speed_alerts', 'closing_since', 'TEXT');
    ensureColumn(handle, 'speed_alerts', 'last_latitude', 'REAL');
    ensureColumn(handle, 'speed_alerts', 'last_longitude', 'REAL');
    ensureColumn(handle, 'speed_alerts', 'driver_event_id', 'TEXT');
  } catch (err) {
    if (handle) {
      try { handle.close(); } catch { /* ignore */ }
      handle = null;
    }
    releaseWriterLock();
    throw err;
  }

  console.log(`[Axona DB] ${config.nodeEnv} sqlite ${config.databasePath} (WAL, synchronous=NORMAL)`);
  return handle;
}

export function getRawDatabase() {
  if (!handle) {
    throw new Error('SQLite database is not open');
  }
  return handle;
}

export function closeConnection() {
  if (handle) {
    try {
      handle.close();
    } catch (err) {
      console.warn('[Axona DB] close warning:', err.message);
    }
    handle = null;
  }
  releaseWriterLock();
}
