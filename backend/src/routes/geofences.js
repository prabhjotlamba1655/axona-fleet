import express from 'express';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/geofences - List geofences with assigned vehicles & event counts
router.get('/', (req, res) => {
  const { user } = req;
  let sql = 'SELECT * FROM geofences WHERE 1=1';
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND tenant_id = ?';
    params.push(user.tenant_id);
  }

  sql += ' ORDER BY created_at DESC';
  const fences = db.query(sql, params);

  // Attach assigned vehicles to each fence
  for (const fence of fences) {
    const vehicles = db.query(`
      SELECT v.id, v.registration_number, v.make, v.model
      FROM geofence_vehicles gv
      JOIN vehicles v ON gv.vehicle_id = v.id
      WHERE gv.geofence_id = ?
    `, [fence.id]);
    fence.assigned_vehicles = vehicles;

    const eventCount = db.get(`
      SELECT COUNT(id) as count FROM geofence_events WHERE geofence_id = ?
    `, [fence.id]);
    fence.event_count = eventCount ? eventCount.count : 0;
  }

  res.json(fences);
});

// POST /api/geofences - Create geofence (circular or polygon)
router.post('/', authorize(['super_admin', 'company_admin']), (req, res) => {
  const {
    name,
    description,
    fence_type,
    center_lat,
    center_lng,
    radius_meters,
    coordinates_json,
    alert_on_entry,
    alert_on_exit,
    speed_limit,
    vehicle_ids
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Geofence name is required' });
  }

  const fenceId = `geo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  db.run(`
    INSERT INTO geofences (
      id, tenant_id, name, description, fence_type, center_lat, center_lng,
      radius_meters, coordinates_json, alert_on_entry, alert_on_exit, speed_limit, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [
    fenceId,
    req.user.tenant_id,
    name,
    description || null,
    fence_type || 'circle',
    center_lat || 18.5204,
    center_lng || 73.8567,
    radius_meters || 1000,
    coordinates_json ? (typeof coordinates_json === 'string' ? coordinates_json : JSON.stringify(coordinates_json)) : null,
    alert_on_entry !== undefined ? (alert_on_entry ? 1 : 0) : 1,
    alert_on_exit !== undefined ? (alert_on_exit ? 1 : 0) : 1,
    speed_limit || null
  ]);

  // Assign vehicles
  if (Array.isArray(vehicle_ids)) {
    for (const vId of vehicle_ids) {
      db.run('INSERT OR IGNORE INTO geofence_vehicles (geofence_id, vehicle_id) VALUES (?, ?)', [fenceId, vId]);
    }
  }

  res.status(201).json({ message: 'Geofence created successfully', geofenceId: fenceId });
});

// DELETE /api/geofences/:id
router.delete('/:id', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { id } = req.params;
  const fence = db.get('SELECT * FROM geofences WHERE id = ?', [id]);
  if (!fence) return res.status(404).json({ error: 'Geofence not found' });

  if (req.user.role !== 'super_admin' && fence.tenant_id !== req.user.tenant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.run('DELETE FROM geofences WHERE id = ?', [id]);
  res.json({ message: 'Geofence deleted successfully' });
});

// GET /api/geofences/events - Geofence breach history
router.get('/events', (req, res) => {
  const { user } = req;
  let sql = `
    SELECT e.*, g.name as geofence_name, g.fence_type,
           v.registration_number, c.name as category_name
    FROM geofence_events e
    JOIN geofences g ON e.geofence_id = g.id
    JOIN vehicles v ON e.vehicle_id = v.id
    LEFT JOIN vehicle_categories c ON v.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND g.tenant_id = ?';
    params.push(user.tenant_id);
  }

  sql += ' ORDER BY e.event_time DESC LIMIT 100';

  const events = db.query(sql, params);
  res.json(events);
});

export default router;
