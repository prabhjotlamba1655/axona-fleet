import db from '../db/database.js';

/**
 * AXONA AIS-140 PROTOCOL & TELEMATICS INGESTION ENGINE
 * Developed by Axona Software LLP
 * Compliant with MoRTH / AIS-140 specifications for Intelligent Transportation Systems.
 */

// In-memory cache for duplicate packet filtering & debounce
const recentPacketCache = new Map();

export class AIS140Parser {
  /**
   * Parse standard AIS-140 ASCII / NMEA-style data packet:
   * Format: $PVT,IMEI,DATE,TIME,LAT,LAT_DIR,LON,LON_DIR,SPEED,HEADING,SATS,ALT,IGN,MAIN_PWR,EMERGENCY,TAMPER*CHECKSUM
   * Example: $PVT,864201045892110,12112026,143000,18.591200,N,073.738900,E,48.5,85.0,14,560,1,1,0,0*7F
   */
  static parseAIS140Packet(rawString) {
    const trimmed = rawString.trim();
    if (!trimmed.startsWith('$') && !trimmed.startsWith('AXONA:') && !trimmed.startsWith('PVT,') && !trimmed.startsWith('SOS,') && !trimmed.startsWith('ALT,')) {
      return { success: false, error: 'Invalid packet header (must start with $, AXONA:, PVT, SOS, or ALT)' };
    }

    // Split checksum if present
    const starIndex = trimmed.lastIndexOf('*');
    let payload = trimmed;
    let checksum = null;
    if (starIndex !== -1) {
      payload = trimmed.substring(0, starIndex);
      checksum = trimmed.substring(starIndex + 1);
    }

    // Extract fields
    const parts = payload.replace(/^\$/, '').split(',');
    const packetType = parts[0]; // PVT, SOS, ALT, HLM, LGN, ACK

    if (parts.length < 8) {
      return { success: false, error: `Incomplete AIS-140 packet: expected >=8 fields, got ${parts.length}` };
    }

    let imei = '';
    let lat = 0.0;
    let lng = 0.0;
    let speed = 0.0;
    let heading = 0.0;
    let ignition = 0;
    let mainPower = 1;
    let emergency = 0;
    let tamper = 0;
    let satellites = 12;
    let altitude = 0;
    let driverAlert = null;

    // A. Standard tnavIC AIS-140 Alert Information Packet ($ALT)
    // Table 4: $ALT,VendorID,SoftwareVer,PacketType,AlertID,Status,IMEI,RegNo,GPSFix,Date,Time,Lat,LatDir,Lon,LonDir,Speed,Heading,Sats,Alt...
    if (packetType === 'ALT') {
      let subType = '';
      let alertId = 0;

      if (parts.length >= 16 && /^\d{10,17}$/.test(parts[6])) {
        // Full AIS-140 tnavIC format
        subType = parts[3];
        alertId = parseInt(parts[4]) || 0;
        imei = parts[6];

        const rawLat = parseFloat(parts[11]) || 0;
        const latDir = parts[12] || 'N';
        lat = latDir.toUpperCase() === 'S' ? -rawLat : rawLat;

        const rawLng = parseFloat(parts[13]) || 0;
        const lngDir = parts[14] || 'E';
        lng = lngDir.toUpperCase() === 'W' ? -rawLng : rawLng;

        speed = parseFloat(parts[15]) || 0.0;
        heading = parts.length > 16 ? (parseFloat(parts[16]) || 0.0) : 0.0;
        satellites = parts.length > 17 ? (parseInt(parts[17]) || 12) : 12;
        ignition = parts.length > 21 ? (parseInt(parts[21]) || 1) : 1;
      } else {
        // Compact alert format: $ALT,IMEI,SubType,AlertId,Lat,N,Lon,E,Speed,Heading
        imei = parts[1];
        subType = parts[2] || '';
        alertId = parseInt(parts[3]) || 0;

        const rawLat = parseFloat(parts[4]) || 0;
        const latDir = parts[5] || 'N';
        lat = latDir.toUpperCase() === 'S' ? -rawLat : rawLat;

        const rawLng = parseFloat(parts[6]) || 0;
        const lngDir = parts[7] || 'E';
        lng = lngDir.toUpperCase() === 'W' ? -rawLng : rawLng;

        speed = parts.length > 8 ? (parseFloat(parts[8]) || 0.0) : 0.0;
        heading = parts.length > 9 ? (parseFloat(parts[9]) || 0.0) : 0.0;
        ignition = 1;
      }

      // Map AIS-140 Table 7 & Table 8 driver alerts
      if (subType === 'HB' || alertId === 13) {
        driverAlert = {
          eventType: 'HARSH_BRAKING',
          packetType: 'HB',
          alertId: 13,
          severity: 'WARNING',
          metricValue: '-0.65g rapid deceleration',
          thresholdValue: '0.55g (HBT)'
        };
      } else if (subType === 'HA' || alertId === 14) {
        driverAlert = {
          eventType: 'HARSH_ACCEL',
          packetType: 'HA',
          alertId: 14,
          severity: 'WARNING',
          metricValue: '+0.52g rapid acceleration',
          thresholdValue: '0.43g (HAT)'
        };
      } else if (subType === 'TI' || alertId === 22) {
        driverAlert = {
          eventType: 'VEHICLE_TILT',
          packetType: 'TI',
          alertId: 22,
          severity: 'CRITICAL',
          metricValue: '48.5° Vehicle Tilt Angle',
          thresholdValue: '45.0° (TA)'
        };
      } else if (subType === 'RT' || alertId === 15) {
        driverAlert = {
          eventType: 'RASH_DRIVING',
          packetType: 'RT',
          alertId: 15,
          severity: 'WARNING',
          metricValue: `${speed} km/h (0.50g lateral swerve)`,
          thresholdValue: '30 km/h / 0.47g (RTT/HTA)'
        };
      } else if (subType === 'OS' || alertId === 17) {
        driverAlert = {
          eventType: 'OVERSPEEDING',
          packetType: 'OS',
          alertId: 17,
          severity: 'CRITICAL',
          metricValue: `${speed} km/h`,
          thresholdValue: '70.0 km/h (SL)'
        };
      }
    } else {
      // B. Normal Location ($PVT) or Emergency ($SOS)
      imei = parts[1];
      const rawLat = parseFloat(parts[4]) || 0;
      const latDir = parts[5] || 'N';
      lat = latDir.toUpperCase() === 'S' ? -rawLat : rawLat;

      const rawLng = parseFloat(parts[6]) || 0;
      const lngDir = parts[7] || 'E';
      lng = lngDir.toUpperCase() === 'W' ? -rawLng : rawLng;

      speed = parseFloat(parts[8]) || 0.0;
      heading = parseFloat(parts[9]) || 0.0;
      satellites = parseInt(parts[10]) || 12;
      altitude = parseFloat(parts[11]) || 0.0;

      ignition = parseInt(parts[12]) || 0;
      mainPower = parts.length > 13 ? parseInt(parts[13]) : 1;
      emergency = (packetType === 'SOS' || (parts.length > 14 && parseInt(parts[14]) === 1)) ? 1 : 0;
      tamper = parts.length > 15 ? parseInt(parts[15]) : 0;
    }

    if (!imei || imei.length < 8) {
      return { success: false, error: `Invalid device IMEI: ${imei}` };
    }

    // Coordinate validation
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { success: false, error: `Coordinates out of geographic range: ${lat}, ${lng}` };
    }

    return {
      success: true,
      packetType,
      imei,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      speed: Number(speed.toFixed(1)),
      heading: Number(heading.toFixed(1)),
      satellites,
      altitude,
      ignition,
      mainPower,
      emergency,
      tamper,
      driverAlert,
      rawString
    };
  }

  /**
   * Universal ingestion processor that accepts incoming packets from TCP, UDP, or HTTP endpoints
   */
  static async processIncomingPacket(rawPayload, protocol = 'HTTP', ipAddress = '127.0.0.1') {
    const parseResult = this.parseAIS140Packet(rawPayload);
    const receivedTime = new Date().toISOString();

    // 1. Log raw packet for MoRTH AIS-140 compliance audit
    const imei = parseResult.success ? parseResult.imei : 'UNKNOWN';
    try {
      db.run(`
        INSERT INTO raw_packet_logs (imei, packet_type, raw_payload, is_valid, error_message, received_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [imei, parseResult.packetType || 'RAW', rawPayload, parseResult.success ? 1 : 0, parseResult.error || null]);
    } catch (e) {
      console.error('Failed to log raw packet:', e);
    }

    if (!parseResult.success) {
      return {
        status: 'REJECTED',
        error: parseResult.error,
        ack: `$NAK,${imei},INVALID_FORMAT*FF`
      };
    }

    const {
      packetType,
      latitude,
      longitude,
      speed,
      heading,
      ignition,
      mainPower,
      emergency,
      tamper,
      satellites,
      driverAlert
    } = parseResult;

    // 2. Duplicate packet filtering (within 2 seconds with exact same lat/lon)
    const cacheKey = `${imei}_${latitude}_${longitude}_${speed}`;
    const lastSeen = recentPacketCache.get(cacheKey);
    const nowMs = Date.now();
    if (lastSeen && (nowMs - lastSeen < 2000)) {
      return {
        status: 'DUPLICATE_IGNORED',
        imei,
        ack: `$ACK,${imei},DUP*00`
      };
    }
    recentPacketCache.set(cacheKey, nowMs);
    // Cleanup cache periodically
    if (recentPacketCache.size > 2000) {
      recentPacketCache.clear();
    }

    // 3. Find registered device & vehicle
    const device = db.get(`
      SELECT d.*, v.id as vehicle_id, v.tenant_id, v.registration_number, v.speed_limit,
             v.owner_name, v.owner_phone, v.emergency_contact_phone,
             c.name as category_name
      FROM gps_devices d
      LEFT JOIN vehicles v ON v.device_id = d.id
      LEFT JOIN vehicle_categories c ON v.category_id = c.id
      WHERE d.imei = ?
    `, [imei]);

    if (!device) {
      return {
        status: 'UNREGISTERED_DEVICE',
        error: `Device with IMEI ${imei} is not registered in Axona`,
        ack: `$NAK,${imei},UNREGISTERED*01`
      };
    }

    // 4. Update Device Health & Telemetry status
    const movementStatus = (speed > 3.0) ? 'moving' : (ignition === 1 ? 'idle' : 'stopped');
    db.run(`
      UPDATE gps_devices
      SET status = 'online',
          last_communication = datetime('now'),
          main_power_connected = ?,
          tamper_detected = ?,
          satellites = ?,
          gps_fixed = 1
      WHERE id = ?
    `, [mainPower, tamper, satellites, device.id]);

    // Handle Tamper or Power disconnect health events
    if (mainPower === 0) {
      db.run(`
        INSERT INTO device_health_events (id, device_id, vehicle_id, event_type, severity, details)
        VALUES (?, ?, ?, 'power_disconnect', 'critical', 'AIS-140 device reported external vehicle power cut.')
      `, [`dhe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, device.id, device.vehicle_id]);
    }
    if (tamper === 1) {
      db.run(`
        INSERT INTO device_health_events (id, device_id, vehicle_id, event_type, severity, details)
        VALUES (?, ?, ?, 'tamper', 'critical', 'Physical tamper detection switch triggered on device enclosure.')
      `, [`dhe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, device.id, device.vehicle_id]);
    }

    let panicEventCreated = null;
    let driverIntelligenceEventCreated = null;

    if (device.vehicle_id) {
      // 5. Update latest vehicle location table
      db.run(`
        INSERT INTO latest_vehicle_locations 
        (vehicle_id, device_id, latitude, longitude, speed, heading, ignition, movement_status, main_power, panic_status, address, gps_time, server_time, raw_packet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
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
          gps_time = excluded.gps_time,
          server_time = excluded.server_time,
          raw_packet = excluded.raw_packet
      `, [
        device.vehicle_id,
        device.id,
        latitude,
        longitude,
        speed,
        heading,
        ignition,
        movementStatus,
        mainPower,
        emergency,
        `Near Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`,
        rawPayload
      ]);

      // 6. Append to GPS historical breadcrumbs
      db.run(`
        INSERT INTO gps_location_history
        (vehicle_id, device_id, latitude, longitude, speed, heading, ignition, main_power, panic_button, address, gps_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        device.vehicle_id,
        device.id,
        latitude,
        longitude,
        speed,
        heading,
        ignition,
        mainPower,
        emergency,
        `Live GPS Waypoint (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
      ]);

      // 7. EMERGENCY / PANIC BUTTON PROCESSING (AIS-140 MoRTH Mandatory)
      if (emergency === 1) {
        const panicId = `panic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        db.run(`
          INSERT INTO panic_events 
          (id, tenant_id, vehicle_id, device_id, latitude, longitude, speed, address, event_time, status, remarks, emergency_contact_notified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'New', 'Emergency SOS signal received from hardware panic button.', 1)
        `, [
          panicId,
          device.tenant_id,
          device.vehicle_id,
          device.id,
          latitude,
          longitude,
          speed,
          `Emergency Location: Lat ${latitude.toFixed(5)}, Lon ${longitude.toFixed(5)}`
        ]);

        // Create alert notification
        db.run(`
          INSERT INTO notifications (id, tenant_id, vehicle_id, title, message, notification_type)
          VALUES (?, ?, ?, ?, ?, 'panic')
        `, [
          `notif_p_${Date.now()}`,
          device.tenant_id,
          device.vehicle_id,
          `EMERGENCY SOS: ${device.registration_number}`,
          `Panic button activated in vehicle ${device.registration_number} at ${speed} km/h.`
        ]);

        panicEventCreated = {
          id: panicId,
          vehicle_id: device.vehicle_id,
          registration_number: device.registration_number,
          owner_name: device.owner_name,
          owner_phone: device.owner_phone,
          emergency_contact_phone: device.emergency_contact_phone,
          latitude,
          longitude,
          speed,
          time: new Date().toISOString()
        };
      }

      // 8. Overspeeding Alert Check
      if (device.speed_limit && speed > device.speed_limit) {
        // Debounce speed alert (only one per 10 minutes per vehicle)
        const recentSpd = db.get(`
          SELECT id FROM speed_alerts 
          WHERE vehicle_id = ? AND event_time > datetime('now', '-10 minutes')
        `, [device.vehicle_id]);

        if (!recentSpd) {
          db.run(`
            INSERT INTO speed_alerts (id, tenant_id, vehicle_id, speed, speed_limit, latitude, longitude, address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            `spd_${Date.now()}`,
            device.tenant_id,
            device.vehicle_id,
            speed,
            device.speed_limit,
            latitude,
            longitude,
            `Speed violation on route (${speed} km/h in ${device.speed_limit} zone)`
          ]);
        }
      }

      // 9. DRIVER INTELLIGENCE & BEHAVIOR EVENT INGESTION (AIS-140 / tnavIC Protocol)
      if (driverAlert) {
        const eventId = `die_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.run(`
          INSERT INTO driver_intelligence_events
          (id, tenant_id, vehicle_id, device_id, event_type, packet_type, alert_id, severity, metric_value, threshold_value, speed, heading, latitude, longitude, address, driver_name, event_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          eventId,
          device.tenant_id,
          device.vehicle_id,
          device.id,
          driverAlert.eventType,
          driverAlert.packetType,
          driverAlert.alertId,
          driverAlert.severity,
          driverAlert.metricValue,
          driverAlert.thresholdValue,
          speed,
          heading,
          latitude,
          longitude,
          `Near Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`,
          device.owner_name || 'Fleet Operator'
        ]);

        driverIntelligenceEventCreated = {
          id: eventId,
          vehicleId: device.vehicle_id,
          registrationNumber: device.registration_number,
          driverName: device.owner_name || 'Fleet Operator',
          eventType: driverAlert.eventType,
          packetType: driverAlert.packetType,
          alertId: driverAlert.alertId,
          severity: driverAlert.severity,
          metricValue: driverAlert.metricValue,
          thresholdValue: driverAlert.thresholdValue,
          speed,
          heading,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      status: 'PROCESSED',
      imei,
      vehicle_id: device.vehicle_id,
      registration_number: device.registration_number,
      latitude,
      longitude,
      speed,
      heading,
      ignition,
      movementStatus,
      panicEventCreated,
      driverIntelligenceEventCreated,
      ack: `$ACK,${imei},SUCCESS*79`
    };
  }
}

export default AIS140Parser;
