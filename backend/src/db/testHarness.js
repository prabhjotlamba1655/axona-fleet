import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from '../config/index.js';
import { closeDatabase, getDatabase } from './database.js';
import { resetIngestCaches } from '../core/ingestPipeline.js';

function assertTestDatabase() {
  const config = getConfig();
  const expected = `${path.sep}test.db`;
  if (config.nodeEnv !== 'test' || !config.databasePath.endsWith(expected)) {
    throw new Error(`Refusing to reset a non-test database at ${config.databasePath}`);
  }
  return config;
}

function removeDatabaseFiles(databasePath) {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(databasePath + suffix, { force: true });
  }
}

/**
 * Close any open writer, delete test.db, and reopen a schema-only database.
 * Demo seeds are skipped when NODE_ENV=test.
 */
export function setupTestDatabase() {
  const config = assertTestDatabase();
  resetIngestCaches();
  closeDatabase();
  removeDatabaseFiles(config.databasePath);
  fs.rmSync(config.lockPath, { force: true });
  getDatabase();
  return config;
}

export function teardownTestDatabase() {
  const config = assertTestDatabase();
  resetIngestCaches();
  closeDatabase();
  removeDatabaseFiles(config.databasePath);
  fs.rmSync(config.lockPath, { force: true });
  fs.rmSync(config.backupDir, { recursive: true, force: true });
}
