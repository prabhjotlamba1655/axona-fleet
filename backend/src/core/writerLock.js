import fs from 'node:fs';
import path from 'node:path';

let lockFd = null;
let lockPathHeld = null;

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function readLockPid(lockPath) {
  try {
    const text = fs.readFileSync(lockPath, 'utf8');
    const match = text.match(/pid=(\d+)/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Exclusive advisory lock via atomic create (O_EXCL | O_CREAT, Node flag 'wx').
 * One writer per process. A lock left by a dead pid is removed and retried once.
 */
export function acquireWriterLock(lockPath) {
  if (lockFd != null) {
    const error = new Error(`This process already holds writer.lock at ${lockPathHeld}`);
    error.code = 'WRITER_LOCK_HELD';
    throw error;
  }

  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  const openExclusive = () => fs.openSync(lockPath, 'wx');

  try {
    lockFd = openExclusive();
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;

    const holder = readLockPid(lockPath);
    if (pidAlive(holder)) {
      const error = new Error(`writer.lock is held by pid ${holder} at ${lockPath}. Refusing to open a second database writer.`);
      error.code = 'WRITER_LOCK_HELD';
      throw error;
    }

    fs.rmSync(lockPath, { force: true });
    try {
      lockFd = openExclusive();
    } catch (retryErr) {
      if (retryErr.code === 'EEXIST') {
        const error = new Error(`writer.lock was reacquired by another process at ${lockPath}.`);
        error.code = 'WRITER_LOCK_HELD';
        throw error;
      }
      throw retryErr;
    }
  }

  fs.writeFileSync(lockFd, `pid=${process.pid}\nacquiredAt=${new Date().toISOString()}\n`);
  lockPathHeld = lockPath;
  return lockPath;
}

export function releaseWriterLock() {
  const held = lockPathHeld;
  if (lockFd != null) {
    try {
      fs.closeSync(lockFd);
    } catch {
      // The fd may already be closed during shutdown.
    }
  }
  lockFd = null;
  lockPathHeld = null;
  if (held) {
    try {
      const holder = readLockPid(held);
      if (holder == null || holder === process.pid) {
        fs.rmSync(held, { force: true });
      }
    } catch {
      // Shutdown must not throw if the lock file is already gone.
    }
  }
}

export function getHeldLockPath() {
  return lockPathHeld;
}
