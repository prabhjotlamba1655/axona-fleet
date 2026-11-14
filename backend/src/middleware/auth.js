import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { getConfig } from '../config/index.js';

export const JWT_SECRET = getConfig().jwtSecret;

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch user details and role
    const user = db.get(`
      SELECT u.id, u.tenant_id, u.role_id, u.name, u.email, u.phone, u.security_pin,
             r.name as role, r.display_name as role_name,
             t.name as tenant_name, t.tenant_type
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = ? AND u.is_active = 1
    `, [decoded.userId]);

    if (!user) {
      return res.status(401).json({ error: 'User account not found or deactivated' });
    }

    // If sub_user, fetch assigned vehicles
    if (user.role === 'sub_user') {
      const assigned = db.query(`
        SELECT vehicle_id FROM user_vehicle_assignments WHERE user_id = ?
      `, [user.id]);
      user.assigned_vehicles = assigned.map(a => a.vehicle_id);
    } else {
      user.assigned_vehicles = null; // unrestricted within tenant
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of [${allowedRoles.join(', ')}] role` });
    }
    next();
  };
}
