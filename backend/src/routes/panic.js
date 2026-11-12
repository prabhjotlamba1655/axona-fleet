import express from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/panic - List panic emergency incidents
router.get('/', (req, res) => {
  const { user } = req;
  const { status } = req.query;

  let sql = `
    SELECT p.*, v.registration_number, v.owner_name, v.owner_phone, v.emergency_contact_phone,
           c.name as category_name, d.imei as device_imei,
           u1.name as acknowledged_by_name,
           u2.name as resolved_by_name
    FROM panic_events p
    JOIN vehicles v ON p.vehicle_id = v.id
    LEFT JOIN vehicle_categories c ON v.category_id = c.id
    LEFT JOIN gps_devices d ON p.device_id = d.id
    LEFT JOIN users u1 ON p.acknowledged_by = u1.id
    LEFT JOIN users u2 ON p.resolved_by = u2.id
    WHERE 1=1
  `;
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND p.tenant_id = ?';
    params.push(user.tenant_id);
  }

  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY p.event_time DESC';

  const alerts = db.query(sql, params);
  res.json(alerts);
});

// POST /api/panic/:id/status - Update panic alert status (Acknowledge, In Progress, Resolved, Closed)
router.post('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  const { user } = req;

  if (!['Acknowledged', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const existing = db.get('SELECT * FROM panic_events WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Panic event not found' });
  }

  let ackBy = existing.acknowledged_by;
  let ackAt = existing.acknowledged_at;
  let resBy = existing.resolved_by;
  let resAt = existing.resolved_at;

  if (status === 'Acknowledged' && !existing.acknowledged_by) {
    ackBy = user.id;
    ackAt = new Date().toISOString();
  } else if (status === 'Resolved' || status === 'Closed') {
    resBy = user.id;
    resAt = new Date().toISOString();
  }

  db.run(`
    UPDATE panic_events
    SET status = ?,
        acknowledged_by = ?,
        acknowledged_at = ?,
        resolved_by = ?,
        resolved_at = ?,
        remarks = COALESCE(?, remarks)
    WHERE id = ?
  `, [status, ackBy, ackAt, resBy, resAt, remarks, id]);

  // Log in audit logs
  db.run(`
    INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, 'PANIC_ALERT_STATUS_CHANGE', 'panic_event', ?, ?)
  `, [
    `aud_${Date.now()}`,
    existing.tenant_id,
    user.id,
    id,
    `Panic alert status changed to '${status}' by ${user.name}. Remarks: ${remarks || 'None'}`
  ]);

  res.json({ message: `Panic event updated to ${status}` });
});

// POST /api/panic/simulate - Trigger a test emergency panic event for demonstration
router.post('/simulate', (req, res) => {
  const { vehicleId } = req.body;
  const targetId = vehicleId || 'veh_1';

  const veh = db.get(`
    SELECT v.*, d.id as dev_id, d.imei, loc.latitude, loc.longitude, loc.speed
    FROM vehicles v
    LEFT JOIN gps_devices d ON v.device_id = d.id
    LEFT JOIN latest_vehicle_locations loc ON loc.vehicle_id = v.id
    WHERE v.id = ?
  `, [targetId]);

  if (!veh) {
    return res.status(404).json({ error: 'Target vehicle not found' });
  }

  const panicId = `panic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const lat = veh.latitude || 18.5912;
  const lon = veh.longitude || 73.7389;

  db.run(`
    INSERT INTO panic_events (
      id, tenant_id, vehicle_id, device_id, latitude, longitude, speed, address,
      event_time, status, remarks, emergency_contact_notified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'New', 'TEST EMERGENCY: Live panic button SOS triggered for evaluation.', 1)
  `, [
    panicId,
    veh.tenant_id,
    veh.id,
    veh.dev_id || 'dev_101',
    lat,
    lon,
    veh.speed || 48.0,
    `Emergency Point near ${veh.registration_number}`
  ]);

  db.run(`
    UPDATE latest_vehicle_locations SET panic_status = 1 WHERE vehicle_id = ?
  `, [veh.id]);

  res.status(201).json({
    message: 'Emergency Panic Alert triggered successfully',
    panicId,
    vehicle: veh.registration_number
  });
});

export default router;
