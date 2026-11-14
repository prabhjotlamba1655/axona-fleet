import db from '../database.js';
import { newId } from '../../core/ids.js';

export const telemetryRepository = {
  insertRawLog({ imei, packetType, rawPayload, isValid, errorMessage, canonical }) {
    db.run(`
      INSERT INTO raw_packet_logs
        (imei, packet_type, raw_payload, is_valid, error_message, canonical_json, received_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      imei || 'UNKNOWN',
      packetType || 'RAW',
      rawPayload,
      isValid ? 1 : 0,
      errorMessage || null,
      canonical ? JSON.stringify(canonical) : null
    ]);
  },

  findDeviceByImei(imei) {
    return db.get(`
      SELECT d.*, v.id as vehicle_id, v.tenant_id, v.registration_number, v.speed_limit,
             v.owner_name, v.owner_phone, v.emergency_contact_phone,
             c.name as category_name
      FROM gps_devices d
      LEFT JOIN vehicles v ON v.device_id = d.id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      WHERE d.imei = ?
    `, [imei]);
  },

  markDeviceOnline(deviceId, { mainPower, tamper, satellites }) {
    db.run(`
      UPDATE gps_devices
      SET status = 'online',
          last_communication = datetime('now'),
          main_power_connected = ?,
          tamper_detected = ?,
          satellites = ?,
          gps_fixed = 1
      WHERE id = ?
    `, [mainPower, tamper, satellites, deviceId]);
  },

  insertHealthEvent({ deviceId, vehicleId, eventType, severity, details }) {
    db.run(`
      INSERT INTO device_health_events (id, device_id, vehicle_id, event_type, severity, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [newId('dhe'), deviceId, vehicleId, eventType, severity, details]);
  },

  upsertLatestLocation(row) {
    db.run(`
      INSERT INTO latest_vehicle_locations
        (vehicle_id, device_id, latitude, longitude, speed, heading, ignition, movement_status,
         main_power, panic_status, address, gps_time, server_time, raw_packet)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), datetime('now'), ?)
      ON CONFLICT(vehicle_id) DO UPDATE SET
        device_id = excluded.device_id,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        speed = excluded.speed,
        heading = excluded.heading,
        ignition = excluded.ignition,
        movement_status = excluded.movement_status,
        main_power = excluded.main_power,
        panic_status = excluded.panic_status,
        address = excluded.address,
        gps_time = excluded.gps_time,
        server_time = excluded.server_time,
        raw_packet = excluded.raw_packet
    `, [
      row.vehicleId,
      row.deviceId,
      row.latitude,
      row.longitude,
      row.speed,
      row.heading,
      row.ignition,
      row.movementStatus,
      row.mainPower,
      row.panic,
      row.address,
      row.gpsTime,
      row.rawPacket
    ]);
  },

  insertHistory(row) {
    db.run(`
      INSERT INTO gps_location_history
        (vehicle_id, device_id, latitude, longitude, speed, heading, ignition, main_power, panic_button, address, gps_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `, [
      row.vehicleId,
      row.deviceId,
      row.latitude,
      row.longitude,
      row.speed,
      row.heading,
      row.ignition,
      row.mainPower,
      row.panic,
      row.address,
      row.gpsTime
    ]);
  },

  insertPanic(row) {
    const id = newId('panic');
    db.run(`
      INSERT INTO panic_events
        (id, tenant_id, vehicle_id, device_id, latitude, longitude, speed, address, event_time, status, remarks, emergency_contact_notified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), 'New', ?, 1)
    `, [
      id,
      row.tenantId,
      row.vehicleId,
      row.deviceId,
      row.latitude,
      row.longitude,
      row.speed,
      row.address,
      row.gpsTime,
      'Emergency SOS signal received from hardware panic button.'
    ]);
    return id;
  },

  insertNotification(row) {
    db.run(`
      INSERT INTO notifications (id, tenant_id, vehicle_id, title, message, notification_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [newId('notif'), row.tenantId, row.vehicleId, row.title, row.message, row.type]);
  },

  findRecentSpeedAlert(vehicleId) {
    return db.get(`
      SELECT id FROM speed_alerts
      WHERE vehicle_id = ? AND event_time > datetime('now', '-10 minutes')
    `, [vehicleId]);
  },

  insertSpeedAlert(row) {
    db.run(`
      INSERT INTO speed_alerts
        (id, tenant_id, vehicle_id, speed, speed_limit, latitude, longitude, address, event_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `, [
      newId('spd'),
      row.tenantId,
      row.vehicleId,
      row.speed,
      row.speedLimit,
      row.latitude,
      row.longitude,
      row.address,
      row.gpsTime
    ]);
  },

  insertDriverEvent(row) {
    const id = newId('die');
    db.run(`
      INSERT INTO driver_intelligence_events
        (id, tenant_id, vehicle_id, device_id, event_type, packet_type, alert_id, severity,
         metric_value, threshold_value, speed, heading, latitude, longitude, address, driver_name, event_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `, [
      id,
      row.tenantId,
      row.vehicleId,
      row.deviceId,
      row.eventType,
      row.packetType,
      row.alertId,
      row.severity,
      row.metricValue,
      row.thresholdValue,
      row.speed,
      row.heading,
      row.latitude,
      row.longitude,
      row.address,
      row.driverName,
      row.gpsTime
    ]);
    return id;
  }
};
