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
             v.owner_name, v.owner_phone, v.alternate_phone, v.emergency_contact_phone,
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

  findOpenSpeedAlert(vehicleId) {
    return db.get(`
      SELECT id, event_time, max_speed, speed, speed_limit, latitude, longitude,
             last_latitude, last_longitude, distance_km, severity, closing_since, driver_event_id
      FROM speed_alerts
      WHERE vehicle_id = ? AND is_open = 1
      ORDER BY event_time DESC LIMIT 1
    `, [vehicleId]);
  },

  findSpeedArming(vehicleId) {
    return db.get(`
      SELECT vehicle_id, started_at, latitude, longitude
      FROM speed_arming WHERE vehicle_id = ?
    `, [vehicleId]);
  },

  saveSpeedArming(row) {
    db.run(`
      INSERT INTO speed_arming (vehicle_id, started_at, latitude, longitude)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(vehicle_id) DO UPDATE SET
        started_at = excluded.started_at,
        latitude = excluded.latitude,
        longitude = excluded.longitude
    `, [row.vehicleId, row.startedAt, row.latitude, row.longitude]);
  },

  clearSpeedArming(vehicleId) {
    db.run('DELETE FROM speed_arming WHERE vehicle_id = ?', [vehicleId]);
  },

  insertSpeedAlert(row) {
    const id = newId('spd');
    db.run(`
      INSERT INTO speed_alerts
        (id, tenant_id, vehicle_id, speed, speed_limit, latitude, longitude, address,
         event_time, ended_at, max_speed, is_open, distance_km, severity,
         last_latitude, last_longitude, driver_event_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')), ?, 1, ?, ?, ?, ?, ?)
    `, [
      id,
      row.tenantId,
      row.vehicleId,
      row.speed,
      row.speedLimit,
      row.latitude,
      row.longitude,
      row.address,
      row.gpsTime,
      row.endedAt || row.gpsTime,
      row.speed,
      row.distanceKm || 0,
      row.severity || 'ADVISORY',
      row.latitude,
      row.longitude,
      row.driverEventId || null
    ]);
    return id;
  },

  progressSpeedAlert(id, row) {
    db.run(`
      UPDATE speed_alerts
      SET speed = ?,
          max_speed = MAX(COALESCE(max_speed, speed), ?),
          ended_at = COALESCE(?, ended_at),
          distance_km = COALESCE(distance_km, 0) + ?,
          severity = ?,
          last_latitude = ?,
          last_longitude = ?,
          closing_since = ?,
          is_open = ?
      WHERE id = ?
    `, [
      row.speed,
      row.speed,
      row.gpsTime,
      row.distanceKm || 0,
      row.severity,
      row.latitude,
      row.longitude,
      row.closingSince,
      row.isOpen,
      id
    ]);
  },

  updateDriverEventSeverity(id, severity) {
    db.run('UPDATE driver_intelligence_events SET severity = ? WHERE id = ?', [severity, id]);
  },

  insertDispatch(row) {
    const id = newId('dsp');
    db.run(`
      INSERT INTO alert_dispatches (id, tenant_id, vehicle_id, channel, recipient, body, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, row.tenantId, row.vehicleId, row.channel, row.recipient || '', row.body, row.status]);
    return id;
  },

  updateDispatchStatus(id, status) {
    db.run('UPDATE alert_dispatches SET status = ? WHERE id = ?', [status, id]);
  },

  extendSpeedAlert(id, row) {
    db.run(`
      UPDATE speed_alerts
      SET speed = ?,
          max_speed = MAX(COALESCE(max_speed, speed), ?),
          ended_at = COALESCE(?, datetime('now'))
      WHERE id = ? AND is_open = 1
    `, [row.speed, row.speed, row.gpsTime, id]);
  },

  closeSpeedAlert(id, gpsTime) {
    db.run(`
      UPDATE speed_alerts
      SET is_open = 0, ended_at = COALESCE(?, datetime('now'))
      WHERE id = ? AND is_open = 1
    `, [gpsTime, id]);
  },

  findOpenTowingAlert(vehicleId) {
    return db.get(`
      SELECT id FROM towing_alerts
      WHERE vehicle_id = ? AND is_open = 1
      ORDER BY event_time DESC LIMIT 1
    `, [vehicleId]);
  },

  insertTowingAlert(row) {
    const id = newId('tow');
    db.run(`
      INSERT INTO towing_alerts
        (id, tenant_id, vehicle_id, speed, latitude, longitude, address, event_time, ended_at, max_speed, is_open)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')), ?, 1)
    `, [id, row.tenantId, row.vehicleId, row.speed, row.latitude, row.longitude, row.address, row.gpsTime, row.gpsTime, row.speed]);
    return id;
  },

  extendTowingAlert(id, row) {
    db.run(`
      UPDATE towing_alerts
      SET speed = ?,
          max_speed = MAX(COALESCE(max_speed, speed), ?),
          ended_at = COALESCE(?, datetime('now'))
      WHERE id = ? AND is_open = 1
    `, [row.speed, row.speed, row.gpsTime, id]);
  },

  closeTowingAlert(id, gpsTime) {
    db.run(`
      UPDATE towing_alerts
      SET is_open = 0, ended_at = COALESCE(?, datetime('now'))
      WHERE id = ? AND is_open = 1
    `, [gpsTime, id]);
  },

  updateFixAddress({ vehicleId, speedAlertId, towingAlertId, panicId, address }) {
    if (vehicleId) {
      db.run('UPDATE latest_vehicle_locations SET address = ? WHERE vehicle_id = ?', [address, vehicleId]);
    }
    if (speedAlertId) db.run('UPDATE speed_alerts SET address = ? WHERE id = ?', [address, speedAlertId]);
    if (towingAlertId) db.run('UPDATE towing_alerts SET address = ? WHERE id = ?', [address, towingAlertId]);
    if (panicId) db.run('UPDATE panic_events SET address = ? WHERE id = ?', [address, panicId]);
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
