import db from '../db/database.js';

/**
 * AXONA VEHICLE SECURITY & REMOTE IMMOBILISATION SERVICE
 * Developed by Axona Software LLP
 * Strict compliance with passenger and vehicle safety guidelines.
 */

export class ImmobilisationService {
  /**
   * Request remote immobilisation (Prevent Engine Start)
   */
  static async requestImmobilise(user, vehicleId, pin, reason = 'Authorized Security Lockdown') {
    // 1. Verify user security PIN
    if (!pin || pin !== user.security_pin) {
      return {
        success: false,
        code: 'INVALID_PIN',
        message: 'Security PIN verification failed. Command denied.'
      };
    }

    // 2. Fetch vehicle & latest telematics
    const vehicle = db.get(`
      SELECT v.*, d.imei, d.status as device_status, m.supports_immobilisation,
             loc.speed, loc.ignition, loc.movement_status, loc.gps_time
      FROM vehicles v
      LEFT JOIN gps_devices d ON v.device_id = d.id
      LEFT JOIN device_manufacturers m ON d.manufacturer_id = m.id
      LEFT JOIN latest_vehicle_locations loc ON loc.vehicle_id = v.id
      WHERE v.id = ?
    `, [vehicleId]);

    if (!vehicle) {
      return { success: false, code: 'NOT_FOUND', message: 'Vehicle not found.' };
    }

    // 3. Capability check: Does device hardware support remote relay control?
    if (!vehicle.supports_immobilisation) {
      return {
        success: false,
        code: 'DEVICE_UNSUPPORTED',
        message: 'The installed GPS hardware model does not support remote immobilisation relays.'
      };
    }

    if (vehicle.device_status !== 'online') {
      return {
        success: false,
        code: 'DEVICE_OFFLINE',
        message: 'Cannot execute command: GPS device is offline.'
      };
    }

    // 4. CRITICAL SAFETY CHECK: Speed must be 0.0 and vehicle safely stationary!
    const currentSpeed = vehicle.speed || 0.0;
    if (currentSpeed > 0.0 || vehicle.movement_status === 'moving') {
      // Log rejected attempt to audit logs for compliance
      db.run(`
        INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, 'IMMOBILISE_REJECTED_MOVING', 'vehicle', ?, ?)
      `, [
        `aud_${Date.now()}`,
        user.tenant_id,
        user.id,
        vehicleId,
        `SAFETY VIOLATION PREVENTED: Vehicle moving at ${currentSpeed} km/h. Immobilisation strictly prohibited.`
      ]);

      return {
        success: false,
        code: 'SAFETY_VIOLATION_VEHICLE_MOVING',
        message: `SAFETY VIOLATION PREVENTED: Vehicle is currently in motion (${currentSpeed} km/h). Remote immobilisation can ONLY be applied when the vehicle is verified stationary (0 km/h) to avoid road hazards.`
      };
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 5. Create remote command record
    db.run(`
      INSERT INTO remote_commands 
      (id, tenant_id, vehicle_id, device_id, user_id, command_type, status, safety_check_stationary, speed_at_request, reason, otp_verified, requested_at)
      VALUES (?, ?, ?, ?, ?, 'IMMOBILISE', 'PENDING', 1, ?, ?, 1, datetime('now'))
    `, [
      commandId,
      vehicle.tenant_id,
      vehicle.id,
      vehicle.device_id,
      user.id,
      currentSpeed,
      reason
    ]);

    // 6. Simulate device dispatch and acknowledgement
    // In production, this dispatches TCP command: "$COMMAND,IMEI,SET_DIGITAL_OUT_1,0*CS"
    const ackResponse = `ACK:${vehicle.imei}:RELAY1_OPEN_CRANK_LOCKED`;
    
    db.run(`
      UPDATE remote_commands
      SET status = 'EXECUTED',
          device_ack_response = ?,
          executed_at = datetime('now')
      WHERE id = ?
    `, [ackResponse, commandId]);

    // Update vehicle status
    db.run(`
      UPDATE vehicles
      SET immobilisation_status = 'immobilised',
          updated_at = datetime('now')
      WHERE id = ?
    `, [vehicleId]);

    // Audit log
    db.run(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, 'VEHICLE_IMMOBILISED', 'vehicle', ?, ?)
    `, [
      `aud_${Date.now()}`,
      user.tenant_id,
      user.id,
      vehicleId,
      `Vehicle immobilised by ${user.name} (${user.email}). Stationary check passed (0 km/h). Command ID: ${commandId}`
    ]);

    // Create system notification
    db.run(`
      INSERT INTO notifications (id, tenant_id, vehicle_id, title, message, notification_type)
      VALUES (?, ?, ?, 'Vehicle Immobilised', ?, 'security')
    `, [
      `notif_sec_${Date.now()}`,
      user.tenant_id,
      vehicleId,
      `Vehicle ${vehicle.registration_number} starter relay disabled remotely by ${user.name}.`
    ]);

    return {
      success: true,
      commandId,
      status: 'EXECUTED',
      message: `Immobilisation command executed successfully. Vehicle ${vehicle.registration_number} starter relay disabled. Engine start prevented.`,
      vehicleId,
      registrationNumber: vehicle.registration_number,
      executedAt: new Date().toISOString()
    };
  }

  /**
   * Request remote restoration (Allow Engine Start)
   */
  static async requestRestore(user, vehicleId, pin) {
    if (!pin || pin !== user.security_pin) {
      return {
        success: false,
        code: 'INVALID_PIN',
        message: 'Security PIN verification failed. Restore denied.'
      };
    }

    const vehicle = db.get(`
      SELECT v.*, d.imei
      FROM vehicles v
      LEFT JOIN gps_devices d ON v.device_id = d.id
      WHERE v.id = ?
    `, [vehicleId]);

    if (!vehicle) {
      return { success: false, code: 'NOT_FOUND', message: 'Vehicle not found.' };
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ackResponse = `ACK:${vehicle.imei}:RELAY1_CLOSED_NORMAL`;

    db.run(`
      INSERT INTO remote_commands 
      (id, tenant_id, vehicle_id, device_id, user_id, command_type, status, safety_check_stationary, speed_at_request, reason, otp_verified, device_ack_response, requested_at, executed_at)
      VALUES (?, ?, ?, ?, ?, 'RESTORE', 'EXECUTED', 1, 0.0, 'Authorized vehicle restore', 1, ?, datetime('now'), datetime('now'))
    `, [
      commandId,
      vehicle.tenant_id,
      vehicle.id,
      vehicle.device_id,
      user.id,
      ackResponse
    ]);

    db.run(`
      UPDATE vehicles
      SET immobilisation_status = 'active',
          updated_at = datetime('now')
      WHERE id = ?
    `, [vehicleId]);

    db.run(`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, 'VEHICLE_RESTORED', 'vehicle', ?, ?)
    `, [
      `aud_${Date.now()}`,
      user.tenant_id,
      user.id,
      vehicleId,
      `Vehicle ignition restored by ${user.name}. Normal operation re-enabled.`
    ]);

    return {
      success: true,
      commandId,
      status: 'EXECUTED',
      message: `Vehicle ${vehicle.registration_number} starter circuit restored. Vehicle can now be started normally.`,
      vehicleId,
      registrationNumber: vehicle.registration_number,
      executedAt: new Date().toISOString()
    };
  }
}

export default ImmobilisationService;
