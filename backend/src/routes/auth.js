import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { AccountError, createFirstAdministrator, loginWithPassword, needsSetup } from '../core/accounts.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sendAccountError(res, err) {
  const status = err instanceof AccountError ? err.status : 500;
  if (status >= 500) {
    console.error('[Axona Auth]', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
  return res.status(status).json({ error: err.message });
}

router.get('/setup-status', (req, res) => {
  res.json({ needsSetup: needsSetup() });
});

router.post('/setup', (req, res) => {
  try {
    const user = createFirstAdministrator(req.body || {});
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    sendAccountError(res, err);
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = loginWithPassword(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({ token: signToken(user), user });
});

router.get('/me', authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
    roleName: req.user.role_name,
    tenantId: req.user.tenant_id,
    tenantName: req.user.tenant_name,
    tenantType: req.user.tenant_type,
    assigned_vehicles: req.user.assigned_vehicles
  });
});

router.get('/demo-users', authenticate, (req, res) => {
  const users = db.query(`
    SELECT u.id, u.name, u.email, u.phone, r.name as role, r.display_name as role_name,
           t.id as tenant_id, t.name as tenant_name, t.tenant_type
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.is_active = 1
    ORDER BY u.role_id ASC
  `);

  res.json(users);
});

router.post('/switch-user', authenticate, (req, res) => {
  const { userId } = req.body || {};
  const user = db.get(`
    SELECT u.*, r.name as role, r.display_name as role_name, t.name as tenant_name, t.tenant_type
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = ? AND u.is_active = 1
  `, [userId]);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const session = {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id
  };

  res.json({
    token: signToken(session),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roleName: user.role_name,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      tenantType: user.tenant_type
    }
  });
});

export default router;
