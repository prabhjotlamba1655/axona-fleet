import express from 'express';
import db from '../db/database.js';
import { istMidnightUtcStamp } from '../core/istTime.js';
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
      SUM(CASE WHEN datetime(replace(replace(loc.gps_time, 'T', ' '), 'Z', '')) >= datetime('now', '-10 minutes') AND loc.movement_status = 'moving' THEN 1 ELSE 0 END) as moving_vehicles,
      SUM(CASE WHEN datetime(replace(replace(loc.gps_time, 'T', ' '), 'Z', '')) >= datetime('now', '-10 minutes') AND loc.movement_status = 'stopped' THEN 1 ELSE 0 END) as stopped_vehicles,
      SUM(CASE WHEN datetime(replace(replace(loc.gps_time, 'T', ' '), 'Z', '')) >= datetime('now', '-10 minutes') AND loc.movement_status = 'idle' THEN 1 ELSE 0 END) as idle_vehicles,
      SUM(CASE WHEN loc.gps_time IS NULL OR datetime(replace(replace(loc.gps_time, 'T', ' '), 'Z', '')) < datetime('now', '-10 minutes') THEN 1 ELSE 0 END) as offline_vehicles
    FROM vehicles v
    LEFT JOIN latest_vehicle_locations loc ON loc.vehicle_id = v.id
    ${tenantFilter}
  `, tenantParams);

  // GPS Devices summary
  const devFilter = user.role === 'super_admin' ? '' : 'WHERE d.tenant_id = ?';
  const devStats = db.get(`
    SELECT
      COUNT(d.id) as total_devices,
      SUM(CASE WHEN d.last_communication IS NOT NULL AND datetime(replace(replace(d.last_communication, 'T', ' '), 'Z', '')) >= datetime('now', '-10 minutes') THEN 1 ELSE 0 END) as online_devices,
      SUM(CASE WHEN d.last_communication IS NULL OR datetime(replace(replace(d.last_communication, 'T', ' '), 'Z', '')) < datetime('now', '-10 minutes') THEN 1 ELSE 0 END) as offline_devices
    FROM gps_devices d
    ${devFilter}
  `, tenantParams);

  // Today's alerts count, from 00:00 India time
  const since = istMidnightUtcStamp();
  const happenedSince = (column) => `datetime(replace(replace(${column}, 'T', ' '), 'Z', '')) >= datetime(?)`;
  const panicFilter = user.role === 'super_admin'
    ? `WHERE ${happenedSince('event_time')}`
    : `WHERE tenant_id = ? AND ${happenedSince('event_time')}`;
  const todayParams = user.role === 'super_admin' ? [since] : [user.tenant_id, since];
  const todayPanic = db.get(`
    SELECT COUNT(id) as count FROM panic_events ${panicFilter}
  `, todayParams);

  const speedFilter = user.role === 'super_admin'
    ? `WHERE ${happenedSince('event_time')}`
    : `WHERE tenant_id = ? AND ${happenedSince('event_time')}`;
  const todaySpeed = db.get(`
    SELECT COUNT(id) as count FROM speed_alerts ${speedFilter}
  `, todayParams);

  // Recent alerts since 00:00 India time: panic, overspeed, towing, geofence entry and exit
  const recentParams = [];
  const tenantAndSince = (timeColumn, tenantColumn) => {
    recentParams.push(since);
    if (user.role === 'super_admin') return happenedSince(timeColumn);
    recentParams.push(user.tenant_id);
    return `${happenedSince(timeColumn)} AND ${tenantColumn} = ?`;
  };
  const recentAlerts = db.query(`
    SELECT * FROM (
      SELECT 'panic' as type, p.id, p.event_time, v.registration_number,
             'Emergency SOS Triggered' as title, p.status as status, p.address,
             p.speed as speed, 0 as duration_min, 0 as is_open, 0 as distance_km, '' as severity
      FROM panic_events p
      JOIN vehicles v ON p.vehicle_id = v.id
      WHERE ${tenantAndSince('p.event_time', 'p.tenant_id')}
      UNION ALL
      SELECT 'overspeed' as type, s.id, s.event_time, v.registration_number,
             ('Overspeed ' || COALESCE(s.max_speed, s.speed) || ' km/h') as title,
             ('Limit ' || s.speed_limit) as status, s.address,
             COALESCE(s.max_speed, s.speed) as speed,
             CAST(ROUND((julianday(COALESCE(s.ended_at, s.event_time)) - julianday(s.event_time)) * 1440) AS INTEGER) as duration_min,
             COALESCE(s.is_open, 0) as is_open,
             COALESCE(s.distance_km, 0) as distance_km,
             COALESCE(s.severity, '') as severity
      FROM speed_alerts s
      JOIN vehicles v ON s.vehicle_id = v.id
      WHERE ${tenantAndSince('s.event_time', 's.tenant_id')}
      UNION ALL
      SELECT 'towing' as type, t.id, t.event_time, v.registration_number,
             ('Towing ' || COALESCE(t.max_speed, t.speed) || ' km/h, ignition off') as title,
             'Towing' as status, t.address,
             COALESCE(t.max_speed, t.speed) as speed,
             CAST(ROUND((julianday(COALESCE(t.ended_at, t.event_time)) - julianday(t.event_time)) * 1440) AS INTEGER) as duration_min,
             COALESCE(t.is_open, 0) as is_open, 0 as distance_km, '' as severity
      FROM towing_alerts t
      JOIN vehicles v ON t.vehicle_id = v.id
      WHERE ${tenantAndSince('t.event_time', 't.tenant_id')}
      UNION ALL
      SELECT 'geofence' as type, e.id, e.event_time, v.registration_number,
             ('Geofence ' || e.event_type || ': ' || g.name) as title,
             e.event_type as status,
             (ROUND(e.latitude, 5) || ', ' || ROUND(e.longitude, 5)) as address,
             e.speed as speed, 0 as duration_min, 0 as is_open, 0 as distance_km, '' as severity
      FROM geofence_events e
      JOIN geofences g ON g.id = e.geofence_id
      JOIN vehicles v ON v.id = e.vehicle_id
      WHERE e.event_type IN ('entry', 'exit') AND ${tenantAndSince('e.event_time', 'g.tenant_id')}
    )
    ORDER BY event_time DESC
    LIMIT 8
  `, recentParams);

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
    recentAlerts,
    dataSince: 'today 00:00 hrs'
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
           CASE
             WHEN loc.gps_time IS NULL
               OR datetime(replace(replace(loc.gps_time, 'T', ' '), 'Z', '')) < datetime('now', '-10 minutes')
             THEN 'offline'
             ELSE loc.movement_status
           END as movement_status,
           loc.main_power, loc.panic_status, loc.address, loc.gps_time
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
  const since = istMidnightUtcStamp();
  const trail = db.query(`
    SELECT latitude, longitude, speed, heading, ignition, gps_time
    FROM gps_location_history
    WHERE vehicle_id = ?
      AND datetime(replace(replace(gps_time, 'T', ' '), 'Z', '')) >= datetime(?)
    ORDER BY gps_time DESC LIMIT 2000
  `, [vehicleId, since]);

  res.json(trail.reverse()); // chronological order
});

export default router;
