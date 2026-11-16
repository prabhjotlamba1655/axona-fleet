import express from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import AIS140Parser from '../services/ais140Parser.js';
import { fleetSafetyScore, rankLeaderboard, safetyScore } from '../core/driverScore.js';
import { validateImuConfig } from '../core/imuBounds.js';

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

    const vehicleScores = db.query(`
      SELECT
        SUM(CASE WHEN e.event_type = 'HARSH_BRAKING' THEN 1 ELSE 0 END) as harsh_braking,
        SUM(CASE WHEN e.event_type = 'HARSH_ACCEL' THEN 1 ELSE 0 END) as harsh_accel,
        SUM(CASE WHEN e.event_type = 'VEHICLE_TILT' THEN 1 ELSE 0 END) as vehicle_tilt,
        SUM(CASE WHEN e.event_type = 'RASH_DRIVING' THEN 1 ELSE 0 END) as rash_driving,
        SUM(CASE WHEN e.event_type = 'OVERSPEEDING' THEN 1 ELSE 0 END) as overspeeding,
        SUM(CASE
          WHEN e.event_type = 'OVERSPEEDING' AND e.severity = 'CRITICAL' THEN 5
          WHEN e.event_type = 'OVERSPEEDING' AND e.severity = 'HIGH' THEN 3
          WHEN e.event_type = 'OVERSPEEDING' THEN 2
          ELSE 0
        END) as overspeed_penalty
      FROM vehicles v
      LEFT JOIN driver_intelligence_events e ON e.vehicle_id = v.id
      ${filterSql}
      GROUP BY v.id
    `, params);
    const fleetScore = fleetSafetyScore(vehicleScores.map(row => safetyScore({
      harshBraking: row.harsh_braking || 0,
      harshAccel: row.harsh_accel || 0,
      vehicleTilt: row.vehicle_tilt || 0,
      rashDriving: row.rash_driving || 0,
      overspeeding: row.overspeeding || 0,
      overspeedPenalty: row.overspeed_penalty || 0
    })));

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
        fleetSafetyScore: fleetScore,
        protocol: 'Same score for every connected tracker'
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

    let sDate = startDate;
    let eDate = endDate;
    if (sDate && /^\d{4}-\d{2}-\d{2}$/.test(sDate.trim())) {
      sDate = sDate.trim() + ' 00:00:00';
    }
    if (eDate && /^\d{4}-\d{2}-\d{2}$/.test(eDate.trim())) {
      eDate = eDate.trim() + ' 23:59:59';
    }

    if (sDate) {
      sql += ' AND e.event_time >= ?';
      params.push(sDate);
    }

    if (eDate) {
      sql += ' AND e.event_time <= ?';
      params.push(eDate);
    }

    sql += ' ORDER BY e.event_time DESC LIMIT ?';
    params.push(Math.min(parseInt(limit) || 100, 10000));

    const events = db.query(sql, params).map(e => {
      const latitude = Number(e.latitude);
      const longitude = Number(e.longitude);
      const hasFix = Number.isFinite(latitude) && Number.isFinite(longitude);
      return {
        ...e,
        event_type: e.event_type || 'UNKNOWN',
        packet_type: e.packet_type || '',
        alert_id: e.alert_id ?? 0,
        severity: e.severity || 'WARNING',
        metric_value: e.metric_value || '—',
        threshold_value: e.threshold_value || '—',
        speed: e.speed ?? 0,
        heading: e.heading ?? 0,
        driver_name: e.driver_name || 'Assigned Driver',
        address: e.address || (hasFix ? `Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}` : 'Location unavailable'),
        osmLink: hasFix
          ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
          : null
      };
    });

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
        SUM(CASE
          WHEN e.event_type = 'OVERSPEEDING' AND e.severity = 'CRITICAL' THEN 5
          WHEN e.event_type = 'OVERSPEEDING' AND e.severity = 'HIGH' THEN 3
          WHEN e.event_type = 'OVERSPEEDING' THEN 2
          ELSE 0
        END) as overspeed_penalty,
        MAX(e.event_time) as last_incident_time
      FROM vehicles v
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      LEFT JOIN driver_intelligence_events e ON e.vehicle_id = v.id
      ${filterSql}
      GROUP BY v.id
      ORDER BY total_violations ASC
    `, params);

    res.json(rankLeaderboard(rows));
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
    const stored = db.get('SELECT * FROM device_imu_configs WHERE device_id = ?', [deviceId]) || {};
    const config = {
      device_id: deviceId,
      harsh_brake_threshold: stored.harsh_brake_threshold ?? 0.55,
      harsh_accel_threshold: stored.harsh_accel_threshold ?? 0.43,
      tilt_angle_threshold: stored.tilt_angle_threshold ?? 45.0,
      rash_turning_speed: stored.rash_turning_speed ?? 30.0,
      harsh_turning_g: stored.harsh_turning_g ?? 0.47,
      motion_threshold: stored.motion_threshold ?? 0.05,
      speed_limit: stored.speed_limit ?? 70.0
    };

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
    if (!['super_admin', 'company_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only a company administrator can change sensor limits' });
    }
    const { deviceId } = req.params;
    const device = db.get('SELECT id, tenant_id FROM gps_devices WHERE id = ?', [deviceId]);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (req.user.role !== 'super_admin' && device.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: 'Device is outside this company' });
    }
    const checked = validateImuConfig(req.body);
    if (!checked.ok) return res.status(400).json({ error: checked.errors.join(' ') });
    const { harshBrake, harshAccel, tiltAngle, rashTurning, harshTurning, speedLimit } = checked.value;

    db.run(`
      INSERT INTO device_imu_configs 
      (device_id, harsh_brake_threshold, harsh_accel_threshold, tilt_angle_threshold, rash_turning_speed, harsh_turning_g, speed_limit, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(device_id) DO UPDATE SET
        harsh_brake_threshold = excluded.harsh_brake_threshold,
        harsh_accel_threshold = excluded.harsh_accel_threshold,
        tilt_angle_threshold = excluded.tilt_angle_threshold,
        rash_turning_speed = excluded.rash_turning_speed,
        harsh_turning_g = excluded.harsh_turning_g,
        speed_limit = excluded.speed_limit,
        updated_at = excluded.updated_at
    `, [deviceId, harshBrake, harshAccel, tiltAngle, rashTurning, harshTurning, speedLimit]);
    db.run('UPDATE vehicles SET speed_limit = ? WHERE device_id = ?', [speedLimit, deviceId]);

    const otaCommand = `SET HBT:${harshBrake},HAT:${harshAccel},TA:${tiltAngle},RTT:${rashTurning},HTA:${harshTurning},SL:${speedLimit}`;

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
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
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
