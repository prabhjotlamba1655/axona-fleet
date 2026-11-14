import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { newId } from './ids.js';
import { withImmediateTransaction } from './transaction.js';

const ROLES = [
  ['role_super', 'super_admin', 'Super Administrator', 'Complete system-wide access'],
  ['role_company', 'company_admin', 'Company Administrator', 'Full management of one company fleet'],
  ['role_owner', 'individual_owner', 'Individual Vehicle Owner', 'Personal vehicle tracking'],
  ['role_subuser', 'sub_user', 'Sub User', 'Access limited to assigned vehicles']
];

const USER_SQL = `
  SELECT u.id, u.name, u.email, u.phone, u.password_hash, u.tenant_id,
         r.name AS role, r.display_name AS role_name,
         t.name AS tenant_name, t.tenant_type
  FROM users u
  JOIN roles r ON u.role_id = r.id
  JOIN tenants t ON u.tenant_id = t.id
  WHERE LOWER(u.email) = LOWER(?) AND u.is_active = 1
`;

export class AccountError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    roleName: row.role_name,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantType: row.tenant_type
  };
}

export function needsSetup() {
  const row = db.get('SELECT COUNT(*) AS c FROM users');
  return !row || Number(row.c) === 0;
}

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function loginWithPassword(email, password) {
  const user = db.get(USER_SQL, [String(email || '').trim()]);
  if (!user || !passwordMatches(password, user.password_hash)) return null;
  db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);
  return toPublicUser(user);
}

export function createFirstAdministrator({ name, email, password, organization }) {
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOrg = String(organization || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanName || !cleanEmail.includes('@')) {
    throw new AccountError('Name and a valid email are required', 400);
  }
  if (cleanPassword.length < 8) {
    throw new AccountError('Password must be at least 8 characters', 400);
  }
  if (!cleanOrg) {
    throw new AccountError('Organization name is required', 400);
  }

  return withImmediateTransaction(() => {
    const existing = db.get('SELECT COUNT(*) AS c FROM users');
    if (existing && Number(existing.c) > 0) {
      throw new AccountError('An administrator already exists', 409);
    }

    for (const role of ROLES) {
      db.run(
        'INSERT OR IGNORE INTO roles (id, name, display_name, description) VALUES (?, ?, ?, ?)',
        role
      );
    }

    const tenantId = newId('tenant');
    const userId = newId('usr');
    db.run(
      `INSERT INTO tenants (id, name, tenant_type, contact_person, email)
       VALUES (?, ?, 'super', ?, ?)`,
      [tenantId, cleanOrg, cleanName, cleanEmail]
    );
    db.run(
      `INSERT INTO users (id, tenant_id, role_id, name, email, password_hash, is_active)
       VALUES (?, ?, 'role_super', ?, ?, ?, 1)`,
      [userId, tenantId, cleanName, cleanEmail, hashPassword(cleanPassword)]
    );

    const created = db.get(USER_SQL, [cleanEmail]);
    return toPublicUser(created);
  });
}

function passwordMatches(password, passwordHash) {
  if (!password || !passwordHash) return false;
  try {
    return bcrypt.compareSync(String(password), passwordHash);
  } catch {
    return false;
  }
}
