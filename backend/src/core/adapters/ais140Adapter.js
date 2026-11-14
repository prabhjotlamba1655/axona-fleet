import AIS140Parser from '../../services/ais140Parser.js';
import { buildCanonical } from '../canonicalTelemetry.js';

/**
 * Existing AIS-140 ASCII frames ($PVT, $ALT, $SOS) used by the packet tester
 * and the GPS simulator. Parsing stays in AIS140Parser; this adapter only
 * maps a successful parse onto the canonical telemetry document.
 */
export const ais140Adapter = {
  id: 'ais140',

  canParse(ctx) {
    if (typeof ctx.raw !== 'string') return false;
    if (ctx.protocolHint && ctx.protocolHint !== this.id) return false;
    const trimmed = ctx.raw.trim().replace(/^AXONA:/, '');
    return /^\$?(PVT|ALT|SOS|HLM|LGN|ACK)\b/i.test(trimmed);
  },

  parse(ctx) {
    const result = AIS140Parser.parseAIS140Packet(ctx.raw);
    if (!result.success) {
      return { ok: false, error: result.error, imei: result.imei || null };
    }

    return buildCanonical({
      protocol: this.id,
      imei: result.imei,
      latitude: result.latitude,
      longitude: result.longitude,
      altitudeMeters: result.altitude,
      speedKmh: result.speed,
      headingDegrees: result.heading,
      satellites: result.satellites,
      fixQuality: result.satellites > 0 ? '1' : '0',
      ignition: result.ignition,
      mainPower: result.mainPower,
      panic: result.emergency,
      tamper: result.tamper,
      gpsTime: null,
      alert: result.driverAlert
        ? {
          eventType: result.driverAlert.eventType,
          packetType: result.driverAlert.packetType,
          alertId: result.driverAlert.alertId,
          severity: result.driverAlert.severity,
          metricValue: result.driverAlert.metricValue,
          thresholdValue: result.driverAlert.thresholdValue
        }
        : null
    });
  }
};
