import express from 'express';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ImmobilisationService from '../services/immobilisationService.js';

const router = express.Router();
router.use(authenticate);

// GET /api/security/vehicles - List vehicles with immobilisation status and safety metrics
router.get('/vehicles', (req, res) => {
  const { user } = req;
  let sql = `
    SELECT v.id, v.registration_number, v.make, v.model, v.owner_name, v.immobilisation_status,
           d.imei, d.status as device_status, m.supports_immobilisation, m.name as manufacturer_name,
           loc.speed, loc.ignition, loc.movement_status, loc.address, loc.gps_time
    FROM vehicles v
    LEFT JOIN gps_devices d ON v.device_id = d.id
    LEFT JOIN device_manufacturers m ON d.manufacturer_id = m.id
    LEFT JOIN latest_vehicle_locations loc ON loc.vehicle_id = v.id
    WHERE v.is_active = 1
  `;
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND v.tenant_id = ?';
    params.push(user.tenant_id);
  }

  sql += ' ORDER BY v.registration_number ASC';

  const vehicles = db.query(sql, params);
  res.json(vehicles);
});

// GET /api/security/commands - Command audit history
router.get('/commands', (req, res) => {
  const { user } = req;
  let sql = `
    SELECT c.*, v.registration_number, v.make, v.model as vehicle_model,
           u.name as requested_by_user, u.email as user_email,
           d.imei as device_imei
    FROM remote_commands c
    JOIN vehicles v ON c.vehicle_id = v.id
    JOIN users u ON c.user_id = u.id
    LEFT JOIN gps_devices d ON c.device_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND c.tenant_id = ?';
    params.push(user.tenant_id);
  }

  sql += ' ORDER BY c.requested_at DESC LIMIT 100';

  const commands = db.query(sql, params);
  res.json(commands);
});

// POST /api/security/immobilise - Execute Remote Immobilisation (Prevent Engine Start)
router.post('/immobilise', authorize(['super_admin', 'company_admin', 'individual_owner']), async (req, res) => {
  const { vehicleId, pin, reason } = req.body;
  if (!vehicleId || !pin) {
    return res.status(400).json({ error: 'Vehicle ID and Security PIN are required' });
  }

  const result = await ImmobilisationService.requestImmobilise(req.user, vehicleId, pin, reason);
  if (!result.success) {
    return res.status(400).json({ error: result.message, code: result.code });
  }

  res.json(result);
});

// POST /api/security/restore - Execute Remote Restoration (Allow Engine Start)
router.post('/restore', authorize(['super_admin', 'company_admin', 'individual_owner']), async (req, res) => {
  const { vehicleId, pin } = req.body;
  if (!vehicleId || !pin) {
    return res.status(400).json({ error: 'Vehicle ID and Security PIN are required' });
  }

  const result = await ImmobilisationService.requestRestore(req.user, vehicleId, pin);
  if (!result.success) {
    return res.status(400).json({ error: result.message, code: result.code });
  }

  res.json(result);
});

export default router;
