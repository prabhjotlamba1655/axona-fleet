import express from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import AIS140Parser from '../services/ais140Parser.js';

const router = express.Router();
router.use(authenticate);

/**
 * 1. Summary Statistics for Driver Intelligence KPIs
 * Harsh Braking, Harsh Acceleration, Vehicle Tilt, Rash Driving, Overspeeding
 */
router.get('/summary', (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const isSuper = req.user.role === 'super_admin';

    let filterSql = isSuper ? 'WHERE 1=1' : 'WHERE v.tenant_id = ?';
    let params = isSuper ? [] : [tenantId];

    const stats = db.get(`
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN e.event_type = 'HARSH_BRAKING' THEN 1 ELSE 0 END) as harsh_braking,
        SUM(CASE WHEN e.event_type = 'HARSH_ACCEL' THEN 1 ELSE 0 END) as harsh_accel,
        SUM(CASE WHEN e.event_type = 'VEHICLE_TILT' THEN 1 ELSE 0 END) as vehicle_tilt,
        SUM(CASE WHEN e.event_type = 'RASH_DRIVING' THEN 1 ELSE 0 END) as rash_driving,
        SUM(CASE WHEN e.event_type = 'OVERSPEEDING' THEN 1 ELSE 0 END) as overspeeding,
        SUM(CASE WHEN e.severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN e.event_time >= datetime('now', '-24 hours') THEN 1 ELSE 0 END) as last_24h_count,
        SUM(CASE WHEN e.event_time >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as last_7d_count
      FROM driver_intelligence_events e
      JOIN vehicles v ON v.id = e.vehicle_id
      ${filterSql}
    `, params) || {};

    const hb = stats.harsh_braking || 0;
    const ha = stats.harsh_accel || 0;
    const tilt = stats.vehicle_tilt || 0;
    const rd = stats.rash_driving || 0;
    const os = stats.overspeeding || 0;
    const total = stats.total_events || 0;

    // Safety score penalty calculation
    const fleetSafetyScore = Math.max(25, Math.min(100, Math.round(100 - (hb * 1.5 + ha * 1.2 + rd * 2.0 + tilt * 5.0 + os * 1.5) / Math.max(1, (total / 10)))));

    res.json({
      success: true,
      kpis: {
        totalEvents: total,
        harshBraking: hb,
        harshAccel: ha,
        vehicleTilt: tilt,
        rashDriving: rd,
        overspeeding: os,
        criticalCount: stats.critical_count || 0,
        last24hCount: stats.last_24h_count || 0,
        last7dCount: stats.last_7d_count || 0,
        fleetSafetyScore: isNaN(fleetSafetyScore) ? 88 : fleetSafetyScore,
        protocol: 'tnavIC AIS-140 / ARAI Standard'
      }
    });
  } catch (err) {
    console.error('Error fetching driver intelligence summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary stats' });
  }
});

/**
 * 2. Filtered Driver Intelligence Events (Up to 90 Days)
 */
router.get('/events', (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const isSuper = req.user.role === 'super_admin';
    const { vehicleId, eventType, severity, startDate, endDate, limit = 100 } = req.query;

    let sql = `
      SELECT e.*, v.registration_number, v.make, v.model as vehicle_model,
             c.name as category_name, d.imei as device_imei
      FROM driver_intelligence_events e
      JOIN vehicles v ON v.id = e.vehicle_id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      LEFT JOIN gps_devices d ON d.id = e.device_id
      WHERE 1=1
    `;
    const params = [];

    if (!isSuper) {
      sql += ' AND v.tenant_id = ?';
      params.push(tenantId);
    }

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }

    if (eventType && eventType !== 'ALL') {
      sql += ' AND e.event_type = ?';
      params.push(eventType);
    }

    if (severity && severity !== 'ALL') {
      sql += ' AND e.severity = ?';
      params.push(severity);
    }

    if (startDate) {
      sql += ' AND e.event_time >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND e.event_time <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY e.event_time DESC LIMIT ?';
    params.push(Math.min(parseInt(limit) || 100, 10000));

    const events = db.query(sql, params).map(e => ({
      ...e,
      osmLink: `https://www.openstreetmap.org/?mlat=${e.latitude}&mlon=${e.longitude}#map=16/${e.latitude}/${e.longitude}`
    }));

    res.json(events);
  } catch (err) {
    console.error('Error fetching driver events:', err);
    res.status(500).json({ error: 'Failed to fetch driver events' });
  }
});

/**
 * 3. Driver & Vehicle Safety Score Leaderboard
 */
router.get('/leaderboard', (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const isSuper = req.user.role === 'super_admin';

    let filterSql = isSuper ? '' : 'WHERE v.tenant_id = ?';
    let params = isSuper ? [] : [tenantId];

    const rows = db.query(`
      SELECT 
        v.id as vehicle_id,
        v.registration_number,
        v.owner_name,
        v.make,
        v.model,
        c.name as category_name,
        COUNT(e.id) as total_violations,
        SUM(CASE WHEN e.event_type = 'HARSH_BRAKING' THEN 1 ELSE 0 END) as harsh_braking_count,
        SUM(CASE WHEN e.event_type = 'HARSH_ACCEL' THEN 1 ELSE 0 END) as harsh_accel_count,
        SUM(CASE WHEN e.event_type = 'VEHICLE_TILT' THEN 1 ELSE 0 END) as vehicle_tilt_count,
        SUM(CASE WHEN e.event_type = 'RASH_DRIVING' THEN 1 ELSE 0 END) as rash_driving_count,
        SUM(CASE WHEN e.event_type = 'OVERSPEEDING' THEN 1 ELSE 0 END) as overspeeding_count,
        MAX(e.event_time) as last_incident_time
      FROM vehicles v
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      LEFT JOIN driver_intelligence_events e ON e.vehicle_id = v.id
      ${filterSql}
      GROUP BY v.id
      ORDER BY total_violations ASC
    `, params);

    const leaderboard = rows.map((r, idx) => {
      const hb = r.harsh_braking_count || 0;
      const ha = r.harsh_accel_count || 0;
      const tilt = r.vehicle_tilt_count || 0;
      const rd = r.rash_driving_count || 0;
      const os = r.overspeeding_count || 0;

      // Penalties: tilt (-10), rash turn (-4), harsh brake (-3), harsh accel (-2), overspeed (-2)
      const penalty = (hb * 3) + (ha * 2) + (tilt * 10) + (rd * 4) + (os * 2);
      const score = Math.max(20, Math.min(100, 100 - penalty));

      let riskTier = 'Safe';
      if (score < 70 || tilt > 0) riskTier = 'High Risk';
      else if (score < 85) riskTier = 'Moderate Risk';

      return {
        rank: idx + 1,
        vehicleId: r.vehicle_id,
        registrationNumber: r.registration_number,
        vehicleName: `${r.make} ${r.model}`,
        category: r.category_name,
        driverName: r.owner_name || 'Assigned Driver',
        totalViolations: r.total_violations || 0,
        harshBraking: hb,
        harshAccel: ha,
        vehicleTilt: tilt,
        rashDriving: rd,
        overspeeding: os,
        safetyScore: score,
        riskTier,
        lastIncident: r.last_incident_time || 'None'
      };
    });

    res.json(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * 4. Device IMU Configuration (tnavIC AIS-140 Parameters)
 */
router.get('/device-config/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    let config = db.get('SELECT * FROM device_imu_configs WHERE device_id = ?', [deviceId]);
    if (!config) {
      config = {
        device_id: deviceId,
        harsh_brake_threshold: 0.55,
        harsh_accel_threshold: 0.43,
        tilt_angle_threshold: 45.0,
        rash_turning_speed: 30.0,
        harsh_turning_g: 0.47,
        motion_threshold: 0.05,
        speed_limit: 70.0
      };
    }

    const commandString = `SET HBT:${config.harsh_brake_threshold},HAT:${config.harsh_accel_threshold},TA:${config.tilt_angle_threshold},RTT:${config.rash_turning_speed},SL:${config.speed_limit}`;
    const imuCommand = `IMU=THR,${config.motion_threshold},TA,${config.tilt_angle_threshold},HTA,${config.harsh_turning_g}`;

    res.json({
      config,
      commandString,
      imuCommand,
      docsReference: {
        HBT: 'Harsh break Threshold in g (m/s²). Default 0.55g',
        HAT: 'Harsh Acceleration Threshold in g. Default 0.43g',
        TA: 'Tilt Angle limit in degrees. Default 45°',
        RTT: 'Rash Turning Threshold in km/h. Default 30 km/h',
        SL: 'Speed Limit in km/h. Default 70 km/h',
        IMU_THR: 'Motion detection threshold. Default 0.05g',
        IMU_HTA: 'Harsh turning threshold value. Default 0.47g'
      }
    });
  } catch (err) {
    console.error('Error fetching device IMU config:', err);
    res.status(500).json({ error: 'Failed to fetch device IMU config' });
  }
});

/**
 * 5. Update Device IMU Configuration & Generate AIS-140 Commands
 */
router.put('/device-config/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const {
      harshBrake = 0.55,
      harshAccel = 0.43,
      tiltAngle = 45.0,
      rashTurning = 30.0,
      speedLimit = 70.0
    } = req.body;

    db.run(`
      INSERT INTO device_imu_configs 
      (device_id, harsh_brake_threshold, harsh_accel_threshold, tilt_angle_threshold, rash_turning_speed, speed_limit, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(device_id) DO UPDATE SET
        harsh_brake_threshold = excluded.harsh_brake_threshold,
        harsh_accel_threshold = excluded.harsh_accel_threshold,
        tilt_angle_threshold = excluded.tilt_angle_threshold,
        rash_turning_speed = excluded.rash_turning_speed,
        speed_limit = excluded.speed_limit,
        updated_at = excluded.updated_at
    `, [deviceId, harshBrake, harshAccel, tiltAngle, rashTurning, speedLimit]);

    const otaCommand = `SET HBT:${harshBrake},HAT:${harshAccel},TA:${tiltAngle},RTT:${rashTurning},SL:${speedLimit}`;

    res.json({
      success: true,
      message: 'AIS-140 IMU thresholds successfully updated',
      otaCommand,
      otaAck: `$ALT,TNOWTN,1.2.0,OA,12,L,${deviceId},SET:SRV|${otaCommand}*4A`
    });
  } catch (err) {
    console.error('Error updating device IMU config:', err);
    res.status(500).json({ error: 'Failed to update device IMU config' });
  }
});

/**
 * 6. Simulate Driver Event on Demand (For Testing / Live Demo)
 */
router.post('/simulate', async (req, res) => {
  try {
    const { vehicleId = 'veh_1', eventType = 'HARSH_BRAKING' } = req.body;
    const vehicle = db.get(`
      SELECT v.*, d.imei FROM vehicles v
      LEFT JOIN gps_devices d ON d.id = v.device_id
      WHERE v.id = ?
    `, [vehicleId]);

    if (!vehicle || !vehicle.imei) {
      return res.status(404).json({ error: 'Vehicle or device not found' });
    }

    const typeConfig = {
      'HARSH_BRAKING': { sub: 'HB', aid: 13, sev: 'WARNING', metric: '-0.70g braking', th: '0.55g (HBT)' },
      'HARSH_ACCEL': { sub: 'HA', aid: 14, sev: 'WARNING', metric: '+0.58g acceleration surge', th: '0.43g (HAT)' },
      'VEHICLE_TILT': { sub: 'TI', aid: 22, sev: 'CRITICAL', metric: '49.4° Roll Angle', th: '45.0° (TA)' },
      'RASH_DRIVING': { sub: 'RT', aid: 15, sev: 'WARNING', metric: '45 km/h (0.54g lateral swerve)', th: '30 km/h / 0.47g (RTT/HTA)' },
      'OVERSPEEDING': { sub: 'OS', aid: 17, sev: 'CRITICAL', metric: '88.5 km/h in 65 zone', th: '65.0 km/h (SL)' }
    };

    const cfg = typeConfig[eventType] || typeConfig['HARSH_BRAKING'];
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const rawAlt = `$ALT,TNOWTN,1.2.0,${cfg.sub},${cfg.aid},L,${vehicle.imei},${vehicle.registration_number},1,${dateStr},${timeStr},18.591200,N,073.738900,E,55.0,85.0,14,560,0.8,0.9,Airtel,1,1,12.4,4.2,0,C,31,404,98,XXXX,1001,0000,00,0,0,000010,123.456,TEST*1A`;

    const result = await AIS140Parser.processIncomingPacket(rawAlt, 'MANUAL_SIMULATE');

    res.json({
      success: true,
      message: `Triggered ${eventType} packet for ${vehicle.registration_number}`,
      result
    });
  } catch (err) {
    console.error('Error simulating event:', err);
    res.status(500).json({ error: 'Failed to simulate driver event' });
  }
});

export default router;
