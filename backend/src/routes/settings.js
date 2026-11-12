import express from 'express';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/settings - Fetch current company profile & settings
router.get('/', (req, res) => {
  const { user } = req;
  const tenant = db.get('SELECT * FROM tenants WHERE id = ?', [user.tenant_id]);

  // Notifications
  const notifications = db.query(`
    SELECT * FROM notifications WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20
  `, [user.tenant_id]);

  res.json({
    tenant,
    notifications,
    notificationPreferences: {
      enablePanicSMS: true,
      enableOverspeedPush: true,
      enablePowerDisconnectEmail: true,
      enableGeofenceInApp: true,
      emergencyPoliceContact: '112',
      emergencyAmbulanceContact: '108',
      morthAis140Endpoint: 'https://ais140.vahan.gov.in/telematics/v2/ingest'
    }
  });
});

// PUT /api/settings/company - Update company details
router.put('/company', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { name, contact_person, email, phone, address, city, state } = req.body;
  const tenantId = req.user.tenant_id;

  db.run(`
    UPDATE tenants
    SET name = COALESCE(?, name),
        contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        updated_at = datetime('now')
    WHERE id = ?
  `, [name, contact_person, phone, address, city, state, tenantId]);

  res.json({ message: 'Company profile updated successfully' });
});

// POST /api/settings/notifications/read-all - Mark notifications read
router.post('/notifications/read-all', (req, res) => {
  db.run('UPDATE notifications SET is_read = 1 WHERE tenant_id = ?', [req.user.tenant_id]);
  res.json({ message: 'All notifications marked as read' });
});

export default router;
