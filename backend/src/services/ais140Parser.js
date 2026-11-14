/**
 * AXONA AIS-140 PROTOCOL & TELEMATICS INGESTION ENGINE
 * Developed by Axona Software LLP
 * Compliant with MoRTH / AIS-140 specifications for Intelligent Transportation Systems.
 */

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
   * Persist a hardware payload through the canonical ingest pipeline.
   * The returned ACK is produced only after the SQLite transaction commits.
   */
  static async processIncomingPacket(rawPayload, transport = 'HTTP', ipAddress = '127.0.0.1') {
    const { ingestTelemetry } = await import('../core/ingestPipeline.js');
    return ingestTelemetry(rawPayload, { transport, ipAddress });
  }
}

export default AIS140Parser;
