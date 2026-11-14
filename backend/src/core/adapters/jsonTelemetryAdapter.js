import { buildCanonical } from '../canonicalTelemetry.js';

function asObject(ctx) {
  if (ctx.raw && typeof ctx.raw === 'object') return ctx.raw;
  if (typeof ctx.raw !== 'string') return null;
  const trimmed = ctx.raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Structured JSON telemetry from HTTP gateways and future decoded device feeds.
 * Field aliases cover latitude/lat, longitude/lng/lon, and speed/speedKmh.
 */
export const jsonTelemetryAdapter = {
  id: 'json',

  canParse(ctx) {
    if (ctx.protocolHint === 'teltonika') return false;
    const payload = asObject(ctx);
    if (!payload || payload.protocol === 'teltonika') return false;
    if (ctx.protocolHint && ctx.protocolHint !== this.id) return false;
    const latitude = payload.latitude ?? payload.lat;
    const longitude = payload.longitude ?? payload.lng ?? payload.lon;
    const imei = payload.imei || ctx.imei;
    return latitude != null && longitude != null && Boolean(imei);
  },

  parse(ctx) {
    const payload = asObject(ctx);
    if (!payload) return { ok: false, error: 'JSON telemetry payload is not an object' };

    const alert = payload.alert && payload.alert.eventType
      ? payload.alert
      : null;

    return buildCanonical({
      protocol: this.id,
      imei: payload.imei || ctx.imei,
      latitude: payload.latitude ?? payload.lat,
      longitude: payload.longitude ?? payload.lng ?? payload.lon,
      altitudeMeters: numberOr(payload.altitude ?? payload.alt, 0),
      speedKmh: numberOr(payload.speedKmh ?? payload.speed, 0),
      headingDegrees: numberOr(payload.heading ?? payload.course ?? payload.angle, 0),
      satellites: numberOr(payload.satellites ?? payload.sats, 0),
      fixQuality: payload.fixQuality ?? null,
      ignition: payload.ignition ? 1 : 0,
      mainPower: payload.mainPower === 0 ? 0 : 1,
      panic: payload.panic || payload.emergency ? 1 : 0,
      tamper: payload.tamper ? 1 : 0,
      gpsTime: payload.gpsTime || payload.timestamp || null,
      alert
    });
  }
};
