import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.get(`
    SELECT u.*, r.name as role, r.display_name as role_name, t.name as tenant_name, t.tenant_type
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN tenants t ON u.tenant_id = t.id
    WHERE LOWER(u.email) = LOWER(?) AND u.is_active = 1
  `, [email]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Update last login
  db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);

  res.json({
    token,
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

// GET /api/auth/demo-users (For instant role switching in header demo)
router.get('/demo-users', (req, res) => {
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

// POST /api/auth/switch-user (Instantly log in as any role for evaluator testing)
router.post('/switch-user', (req, res) => {
  const { userId } = req.body;
  const user = db.get(`
    SELECT u.*, r.name as role, r.display_name as role_name, t.name as tenant_name, t.tenant_type
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN tenants t ON u.tenant_id = t.id
    WHERE u.id = ?
  `, [userId]);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
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
