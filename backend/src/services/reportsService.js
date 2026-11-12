import db from '../db/database.js';

/**
 * AXONA ENTERPRISE REPORTS GENERATOR
 * Developed by Axona Software LLP
 * Generates all 8 compliance and operational fleet reports.
 * Supports date ranges up to 90 days.
 */

// Helper to validate maximum 90-day interval
export function validate90DaysRange(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate.split(' ')[0]);
  const end = new Date(endDate.split(' ')[0]);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) {
    return `Date range of ${diffDays} days exceeds maximum allowed limit of 90 days.`;
  }
  if (diffDays < 0) {
    return 'Start date must be before or equal to end date.';
  }
  return null;
}

export class ReportsService {
  /**
   * 1. Vehicle Movement Report (Up to 90 days)
   */
  static getVehicleMovementReport(tenantId, { vehicleId, startDate, endDate }) {
    let sql = `
      SELECT h.id, v.registration_number, c.name as category, h.latitude, h.longitude,
             h.speed, h.heading, h.ignition, h.main_power, h.address, h.gps_time
      FROM gps_location_history h
      JOIN vehicles v ON v.id = h.vehicle_id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      WHERE v.tenant_id = ?
    `;
    const params = [tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }
    if (startDate) {
      sql += ' AND h.gps_time >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND h.gps_time <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY h.gps_time DESC LIMIT 10000';
    return db.query(sql, params);
  }

  /**
   * 2. Trip History Report (Up to 90 days)
   */
  static getTripHistoryReport(tenantId, { vehicleId, startDate, endDate }) {
    let sql = `
      SELECT t.*, v.registration_number, c.name as category,
             t.distance_km, t.duration_minutes, t.stoppage_minutes, t.stops_count,
             t.max_speed, t.avg_speed, t.start_time, t.end_time, t.start_address, t.end_address
      FROM trips t
      JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      WHERE v.tenant_id = ?
    `;
    const params = [tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }
    if (startDate) {
      sql += ' AND t.start_time >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND t.start_time <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY t.start_time DESC LIMIT 5000';
    return db.query(sql, params);
  }

  /**
   * 3. Distance Travelled Report (Up to 90 days)
   */
  static getDistanceTravelledReport(tenantId, { vehicleId, startDate, endDate }) {
    let tripFilter = 'WHERE 1=1';
    const tripParams = [];

    if (startDate) {
      tripFilter += ' AND start_time >= ?';
      tripParams.push(startDate);
    }
    if (endDate) {
      tripFilter += ' AND start_time <= ?';
      tripParams.push(endDate);
    }

    let sql = `
      SELECT v.id as vehicle_id, v.registration_number, c.name as category,
             COUNT(t.id) as total_trips,
             ROUND(COALESCE(SUM(t.distance_km), 0), 2) as total_distance_km,
             COALESCE(SUM(t.duration_minutes), 0) as total_duration_minutes,
             ROUND(COALESCE(MAX(t.max_speed), 0), 1) as peak_speed,
             ROUND(COALESCE(AVG(t.avg_speed), 0), 1) as overall_avg_speed
      FROM vehicles v
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      LEFT JOIN (
        SELECT * FROM trips ${tripFilter}
      ) t ON t.vehicle_id = v.id
      WHERE v.tenant_id = ?
    `;
    const params = [...tripParams, tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }

    sql += ' GROUP BY v.id, v.registration_number, c.name ORDER BY total_distance_km DESC';
    return db.query(sql, params);
  }

  /**
   * 4. Overspeeding Report (Up to 90 days)
   */
  static getOverspeedingReport(tenantId, { vehicleId, startDate, endDate }) {
    let sql = `
      SELECT s.*, v.registration_number, c.name as category,
             ROUND((s.speed - s.speed_limit), 1) as excess_speed
      FROM speed_alerts s
      JOIN vehicles v ON v.id = s.vehicle_id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      WHERE s.tenant_id = ?
    `;
    const params = [tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }
    if (startDate) {
      sql += ' AND s.event_time >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND s.event_time <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY s.event_time DESC LIMIT 5000';
    return db.query(sql, params);
  }

  /**
   * 5. Panic Button Report (MoRTH AIS-140 Mandated - Up to 90 days)
   */
  static getPanicButtonReport(tenantId, { vehicleId, startDate, endDate }) {
    let sql = `
      SELECT p.*, v.registration_number, c.name as category,
             v.owner_name, v.owner_phone, v.emergency_contact_phone,
             d.imei as device_imei
      FROM panic_events p
      JOIN vehicles v ON v.id = p.vehicle_id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      LEFT JOIN gps_devices d ON p.device_id = d.id
      WHERE p.tenant_id = ?
    `;
    const params = [tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }
    if (startDate) {
      sql += ' AND p.event_time >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND p.event_time <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY p.event_time DESC LIMIT 5000';
    return db.query(sql, params);
  }

  /**
   * 6. GPS Device Health Report (Up to 90 days)
   */
  static getDeviceHealthReport(tenantId, { vehicleId, startDate, endDate }) {
    let sql = `
      SELECT e.*, d.imei, d.model, d.status as current_device_status,
             d.main_power_connected, d.backup_battery_pct, d.tamper_detected,
             v.registration_number
      FROM device_health_events e
      JOIN gps_devices d ON e.device_id = d.id
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      WHERE d.tenant_id = ?
    `;
    const params = [tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }
    if (startDate) {
      sql += ' AND e.created_at >= ?';
      params.push(startDate);
    }

    sql += ' ORDER BY e.created_at DESC LIMIT 5000';
    return db.query(sql, params);
  }

  /**
   * 7. Geofence Report (Up to 90 days)
   */
  static getGeofenceReport(tenantId, { vehicleId, startDate, endDate }) {
    let sql = `
      SELECT e.*, g.name as geofence_name, g.fence_type,
             v.registration_number, c.name as category
      FROM geofence_events e
      JOIN geofences g ON e.geofence_id = g.id
      JOIN vehicles v ON e.vehicle_id = v.id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      WHERE g.tenant_id = ?
    `;
    const params = [tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }
    if (startDate) {
      sql += ' AND e.event_time >= ?';
      params.push(startDate);
    }

    sql += ' ORDER BY e.event_time DESC LIMIT 5000';
    return db.query(sql, params);
  }

  /**
   * 8. Driver Intelligence & Behavior Report (Up to 90 days)
   * Captures Harsh Braking, Harsh Acceleration, Vehicle Tilt, Rash Driving, Overspeeding
   */
  static getDriverIntelligenceReport(tenantId, { vehicleId, startDate, endDate, eventType }) {
    let sql = `
      SELECT e.*, v.registration_number, v.make, v.model as vehicle_model,
             c.name as category, d.imei as device_imei
      FROM driver_intelligence_events e
      JOIN vehicles v ON e.vehicle_id = v.id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      LEFT JOIN gps_devices d ON e.device_id = d.id
      WHERE v.tenant_id = ?
    `;
    const params = [tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }
    if (eventType && eventType !== 'ALL') {
      sql += ' AND e.event_type = ?';
      params.push(eventType);
    }
    if (startDate) {
      sql += ' AND e.event_time >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND e.event_time <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY e.event_time DESC LIMIT 10000';
    return db.query(sql, params).map(e => ({
      ...e,
      osm_link: `https://www.openstreetmap.org/?mlat=${e.latitude}&mlon=${e.longitude}#map=16/${e.latitude}/${e.longitude}`
    }));
  }

  /**
   * 9. Remote Immobilisation History (Up to 90 days)
   */
  static getImmobilisationHistoryReport(tenantId, { vehicleId, startDate, endDate }) {
    let sql = `
      SELECT c.*, v.registration_number, v.make, v.model as vehicle_model,
             u.name as requested_by_user, u.email as user_email,
             d.imei as device_imei
      FROM remote_commands c
      JOIN vehicles v ON c.vehicle_id = v.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN gps_devices d ON c.device_id = d.id
      WHERE c.tenant_id = ?
    `;
    const params = [tenantId];

    if (vehicleId) {
      sql += ' AND v.id = ?';
      params.push(vehicleId);
    }
    if (startDate) {
      sql += ' AND c.requested_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND c.requested_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY c.requested_at DESC LIMIT 5000';
    return db.query(sql, params);
  }
}

export default ReportsService;
