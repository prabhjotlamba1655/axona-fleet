import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getConfig } from '../config/index.js';
import db from '../db/database.js';
import { createConsistentSnapshot } from '../db/backup.js';

const router = express.Router();

router.use(authenticate, authorize(['super_admin']));

router.get('/status', (req, res) => {
  const config = getConfig();
  const journal = db.get('PRAGMA journal_mode');
  const synchronous = db.get('PRAGMA synchronous');
  res.json({
    engine: 'node:sqlite',
    nodeEnv: config.nodeEnv,
    journalMode: journal?.journal_mode || journal,
    synchronous: synchronous?.synchronous ?? synchronous,
    databasePath: config.databasePath,
    lockPath: config.lockPath,
    backupDir: config.backupDir
  });
});

router.post('/backup', (req, res) => {
  try {
    const snapshot = createConsistentSnapshot(req.body?.destination);
    res.status(201).json({
      message: 'Consistent SQLite snapshot written with VACUUM INTO',
      ...snapshot
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
