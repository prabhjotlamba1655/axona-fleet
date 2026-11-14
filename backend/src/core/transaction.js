import { getRawDatabase } from '../db/connection.js';

let depth = 0;

export function isInTransaction() {
  return depth > 0;
}

/**
 * Run work inside BEGIN IMMEDIATE ... COMMIT.
 * The returned value is produced only after COMMIT, which is the
 * store-before-ack boundary for telemetry ingestion.
 * Nested calls join the outer transaction instead of issuing a second BEGIN.
 */
export function withImmediateTransaction(work) {
  const database = getRawDatabase();
  if (depth > 0) return work();

  depth += 1;
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      database.exec('ROLLBACK');
    } catch (rollbackErr) {
      err.rollbackError = rollbackErr.message;
    }
    throw err;
  } finally {
    depth -= 1;
  }
}
