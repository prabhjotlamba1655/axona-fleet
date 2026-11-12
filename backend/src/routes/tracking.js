import express from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/tracking/dashboard-stats - Executive dashboard KPI cards
router.get('/dashboard-stats', (req, res) => {
  const { user } = req;
  const tenantFilter = user.role === 'super_admin' ? '' : 'WHERE v.tenant_id = ?';
  const tenantParams = user.role === 'super_admin' ? [] : [user.tenant_id];

  // Vehicles summary
  const vehStats = db.get(`
    SELECT 
      COUNT(v.id) as total_vehicles,
      SUM(CASE WHEN loc.movement_status = 'moving' THEN 1 ELSE 0 END) as moving_vehicles,
      SUM(CASE WHEN loc.movement_status = 'stopped' THEN 1 ELSE 0 END) as stopped_vehicles,
      SUM(CASE WHEN loc.movement_status = 'idle' THEN 1 ELSE 0 END) as idle_vehicles,
      SUM(CASE WHEN loc.movement_status = 'offline' OR loc.movement_status IS NULL THEN 1 ELSE 0 END) as offline_vehicles
    FROM vehicles v
    LEFT JOIN latest_vehicle_locations loc ON loc.vehicle_id = v.id
    ${tenantFilter}
  `, tenantParams);

  // GPS Devices summary
  const devFilter = user.role === 'super_admin' ? '' : 'WHERE d.tenant_id = ?';
  const devStats = db.get(`
    SELECT
      COUNT(d.id) as total_devices,
      SUM(CASE WHEN d.status = 'online' THEN 1 ELSE 0 END) as online_devices,
      SUM(CASE WHEN d.status = 'offline' THEN 1 ELSE 0 END) as offline_devices
    FROM gps_devices d
    ${devFilter}
  `, tenantParams);

  // Today's alerts count
  const panicFilter = user.role === 'super_admin' ? "WHERE event_time >= date('now')" : "WHERE tenant_id = ? AND event_time >= date('now')";
  const todayPanic = db.get(`
    SELECT COUNT(id) as count FROM panic_events ${panicFilter}
  `, tenantParams);

  const speedFilter = user.role === 'super_admin' ? "WHERE event_time >= date('now')" : "WHERE tenant_id = ? AND event_time >= date('now')";
  const todaySpeed = db.get(`
    SELECT COUNT(id) as count FROM speed_alerts ${speedFilter}
  `, tenantParams);

  // Recent 5 alerts for dashboard
  const recentAlerts = db.query(`
    SELECT 'panic' as type, p.id, p.event_time, v.registration_number, 'Emergency SOS Triggered' as title, p.status, p.address
    FROM panic_events p
    JOIN vehicles v ON p.vehicle_id = v.id
    ${user.role === 'super_admin' ? '' : 'WHERE p.tenant_id = ?'}
    ORDER BY p.event_time DESC LIMIT 5
  `, tenantParams);

  res.json({
    kpis: {
      totalVehicles: vehStats.total_vehicles || 0,
      movingVehicles: vehStats.moving_vehicles || 0,
      stoppedVehicles: vehStats.stopped_vehicles || 0,
      idleVehicles: vehStats.idle_vehicles || 0,
      onlineDevices: devStats.online_devices || 0,
      offlineDevices: devStats.offline_devices || 0,
      todayPanicAlerts: todayPanic ? todayPanic.count : 0,
      overspeedingAlerts: todaySpeed ? todaySpeed.count : 0
    },
    recentAlerts
  });
});

// GET /api/tracking/live - Current real-time positions for all authorized vehicles
router.get('/live', (req, res) => {
  const { user } = req;
  let sql = `
    SELECT v.id as vehicle_id, v.registration_number, v.make, v.model, v.speed_limit,
           v.immobilisation_status,
           c.name as category_name, c.code as category_code,
           d.id as device_id, d.imei, d.status as device_status, d.main_power_connected,
           d.backup_battery_pct, d.is_ais140_compliant,
           loc.latitude, loc.longitude, loc.altitude, loc.speed, loc.heading, loc.ignition,
           loc.movement_status, loc.main_power, loc.panic_status, loc.address, loc.gps_time
    FROM vehicles v
    LEFT JOIN vehicle_categories c ON v.category_id = c.id
    LEFT JOIN gps_devices d ON v.device_id = d.id
    LEFT JOIN latest_vehicle_locations loc ON loc.vehicle_id = v.id
    WHERE v.is_active = 1
  `;
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND v.tenant_id = ?';
    params.push(user.tenant_id);
  }

  if (user.role === 'sub_user' && user.assigned_vehicles) {
    if (user.assigned_vehicles.length === 0) return res.json([]);
    const placeholders = user.assigned_vehicles.map(() => '?').join(',');
    sql += ` AND v.id IN (${placeholders})`;
    params.push(...user.assigned_vehicles);
  }

  sql += ' ORDER BY v.registration_number ASC';

  const positions = db.query(sql, params);
  res.json(positions);
});

// GET /api/tracking/trail/:vehicleId - Historical breadcrumbs trail
router.get('/trail/:vehicleId', (req, res) => {
  const { vehicleId } = req.params;
  const trail = db.query(`
    SELECT latitude, longitude, speed, heading, ignition, gps_time
    FROM gps_location_history
    WHERE vehicle_id = ?
    ORDER BY gps_time DESC LIMIT 100
  `, [vehicleId]);

  res.json(trail.reverse()); // chronological order
});

export default router;
