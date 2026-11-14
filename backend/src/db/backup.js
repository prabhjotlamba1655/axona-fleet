import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from '../config/index.js';
import { isInTransaction } from '../core/transaction.js';
import { getDatabase } from './database.js';

let backupTimer = null;

/**
 * Consistent live snapshot. VACUUM INTO writes a new database file from the
 * committed state and cannot run inside an open transaction.
 */
export function createConsistentSnapshot(destination) {
  if (isInTransaction()) {
    throw new Error('VACUUM INTO cannot run inside an open write transaction.');
  }

  const config = getConfig();
  fs.mkdirSync(config.backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = destination
    ? path.resolve(destination)
    : path.join(config.backupDir, `axona-${stamp}.db`);

  if (fs.existsSync(dest)) {
    throw new Error(`Backup destination already exists: ${dest}`);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const database = getDatabase();
  const escaped = dest.replaceAll("'", "''");
  database.exec(`VACUUM INTO '${escaped}'`);
  const stat = fs.statSync(dest);

  return {
    path: dest,
    bytes: stat.size,
    createdAt: new Date().toISOString(),
    source: config.databasePath
  };
}

export function startBackupWorker(intervalMs = getConfig().backupIntervalMs) {
  if (!intervalMs || intervalMs < 60_000) return null;
  if (backupTimer) clearInterval(backupTimer);
  backupTimer = setInterval(() => {
    try {
      const snapshot = createConsistentSnapshot();
      console.log(`[Axona Backup] Snapshot ${snapshot.path} (${snapshot.bytes} bytes)`);
    } catch (err) {
      console.error('[Axona Backup] Snapshot failed:', err.message);
    }
  }, intervalMs);
  if (typeof backupTimer.unref === 'function') backupTimer.unref();
  return backupTimer;
}

export function stopBackupWorker() {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
}
