import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Load backend/.env before any config read. Existing process env wins, so
// NODE_ENV=test from the test runner is never overwritten by a developer .env.
dotenv.config({ path: path.join(backendRoot, '.env') });

const SUPPORTED_ENVS = ['test', 'development', 'production'];

/**
 * Resolve the active runtime configuration.
 * Called on each open so tests can set NODE_ENV before the database starts.
 * Test mode always uses data/test/test.db and ignores STORAGE_PATH.
 */
export function getConfig() {
  const nodeEnv = (process.env.NODE_ENV || 'development').trim();
  if (!SUPPORTED_ENVS.includes(nodeEnv)) {
    throw new Error(`Unsupported NODE_ENV "${nodeEnv}". Expected test, development, or production.`);
  }

  const defaultDataDir = path.join(backendRoot, 'data');
  let databasePath;
  let dataDir;

  if (nodeEnv === 'production') {
    if (!process.env.STORAGE_PATH) {
      throw new Error('STORAGE_PATH is required when NODE_ENV=production (example: /var/lib/axona/data/prod.db).');
    }
    databasePath = path.resolve(process.env.STORAGE_PATH);
    dataDir = path.dirname(databasePath);
  } else if (nodeEnv === 'test') {
    dataDir = path.join(defaultDataDir, 'test');
    databasePath = path.join(dataDir, 'test.db');
  } else if (process.env.STORAGE_PATH) {
    databasePath = path.resolve(process.env.STORAGE_PATH);
    dataDir = path.dirname(databasePath);
  } else {
    dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : defaultDataDir;
    databasePath = path.join(dataDir, 'dev.db');
  }

  return {
    nodeEnv,
    backendRoot,
    databasePath,
    dataDir,
    lockPath: path.join(dataDir, 'writer.lock'),
    backupDir: path.join(dataDir, 'backups'),
    port: Number(process.env.PORT || 5055),
    jwtSecret: process.env.JWT_SECRET || 'axona_fleet_jwt_secret_enterprise_2026',
    seedDemoData: nodeEnv === 'development',
    backupIntervalMs: Number(process.env.BACKUP_INTERVAL_MS || 0),
    teltonikaTcpPort: Number(process.env.TELTONIKA_TCP_PORT || 0)
  };
}

export function assertDataDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
