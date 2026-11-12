import express from 'express';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/users - List users
router.get('/', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { user } = req;
  let sql = `
    SELECT u.id, u.tenant_id, u.name, u.email, u.phone, u.is_active, u.created_at, u.last_login,
           r.name as role, r.display_name as role_name,
           t.name as tenant_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN tenants t ON u.tenant_id = t.id
    WHERE 1=1
  `;
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND u.tenant_id = ?';
    params.push(user.tenant_id);
  }

  sql += ' ORDER BY u.created_at DESC';

  const users = db.query(sql, params);

  // Attach vehicle assignments for sub-users
  for (const u of users) {
    if (u.role === 'sub_user') {
      const assigned = db.query(`
        SELECT v.id, v.registration_number, v.make, v.model
        FROM user_vehicle_assignments uva
        JOIN vehicles v ON uva.vehicle_id = v.id
        WHERE uva.user_id = ?
      `, [u.id]);
      u.assigned_vehicles = assigned;
    }
  }

  res.json(users);
});

// GET /api/users/roles
router.get('/roles', (req, res) => {
  const roles = db.query('SELECT * FROM roles ORDER BY id ASC');
  res.json(roles);
});

// POST /api/users - Create new user
router.post('/', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { name, email, phone, role_id, vehicle_ids, security_pin } = req.body;
  if (!name || !email || !role_id) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  const existing = db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (existing) {
    return res.status(400).json({ error: 'A user with this email already exists' });
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const tenantId = req.user.tenant_id;

  db.run(`
    INSERT INTO users (id, tenant_id, role_id, name, email, password_hash, phone, security_pin, is_active)
    VALUES (?, ?, ?, ?, ?, '$2a$10$rQf6z5w87yQh7Eom8wB6xeV55m1qX0X6J01y3mE4qO8kL8w.9i4E8', ?, ?, 1)
  `, [userId, tenantId, role_id, name, email.trim().toLowerCase(), phone || '9999999999', security_pin || '1234']);

  // Assign vehicles if sub_user
  if (Array.isArray(vehicle_ids)) {
    for (const vId of vehicle_ids) {
      db.run(`
        INSERT OR IGNORE INTO user_vehicle_assignments (id, user_id, vehicle_id)
        VALUES (?, ?, ?)
      `, [`uva_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, userId, vId]);
    }
  }

  res.status(201).json({ message: 'User created successfully', userId });
});

// POST /api/users/:id/toggle-active
router.post('/:id/toggle-active', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { id } = req.params;
  const target = db.get('SELECT id, is_active FROM users WHERE id = ?', [id]);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const nextState = target.is_active === 1 ? 0 : 1;
  db.run('UPDATE users SET is_active = ? WHERE id = ?', [nextState, id]);
  res.json({ message: `User account ${nextState ? 'activated' : 'deactivated'}`, is_active: nextState });
});

export default router;
