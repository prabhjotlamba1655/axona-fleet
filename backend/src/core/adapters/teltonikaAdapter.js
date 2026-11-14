import { buildCanonical } from '../canonicalTelemetry.js';
import { takeAvlPacket } from './teltonikaCodec8.js';

function asObject(ctx) {
  if (ctx.raw && typeof ctx.raw === 'object' && !Array.isArray(ctx.raw)) return ctx.raw;
  if (typeof ctx.raw !== 'string') return null;
  const trimmed = ctx.raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Extension point for Teltonika trackers.
 * Decoded JSON (HTTP gateway or a future Codec 8 decoder) is normalized here.
 * Raw Codec 8 binary is recognized and rejected with a stable error so a
 * Codec 8 parser can be added in parseCodec8 without changing the pipeline.
 */
export const teltonikaAdapter = {
  id: 'teltonika',

  canParse(ctx) {
    if (typeof ctx.raw === 'string' && ctx.raw.trim().startsWith('CODEC8:')) return true;
    const payload = asObject(ctx);
    if (!payload) return ctx.protocolHint === this.id;
    return payload.protocol === this.id || ctx.protocolHint === this.id;
  },

  parse(ctx) {
    if (typeof ctx.raw === 'string' && ctx.raw.trim().startsWith('CODEC8:')) {
      return {
        ok: false,
        error: 'Teltonika Codec 8 binary is not decoded. Extend TeltonikaAdapter.parseCodec8, or post decoded JSON with protocol "teltonika".',
        code: 'ADAPTER_NOT_IMPLEMENTED'
      };
    }

    const payload = asObject(ctx);
    if (!payload) {
      return { ok: false, error: 'Teltonika payload must be decoded JSON or a CODEC8: frame' };
    }

    const io = payload.io || {};
    return buildCanonical({
      protocol: this.id,
      imei: payload.imei || ctx.imei,
      latitude: payload.latitude ?? payload.lat,
      longitude: payload.longitude ?? payload.lng ?? payload.lon,
      altitudeMeters: payload.altitude ?? payload.alt ?? 0,
      speedKmh: payload.speed ?? payload.speedKmh ?? 0,
      headingDegrees: payload.angle ?? payload.heading ?? 0,
      satellites: payload.satellites ?? payload.sat ?? 0,
      fixQuality: payload.fixQuality ?? null,
      ignition: (io.ignition ?? payload.ignition) ? 1 : 0,
      mainPower: payload.mainPower === 0 ? 0 : 1,
      panic: payload.panic ? 1 : 0,
      tamper: payload.tamper ? 1 : 0,
      gpsTime: payload.timestamp || payload.gpsTime || null,
      alert: null
    });
  },

  parseCodec8(payload) {
    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const packet = takeAvlPacket(buffer);
    if (!packet) {
      const error = new Error('Incomplete Codec 8 frame');
      error.code = 'ADAPTER_NOT_IMPLEMENTED';
      throw error;
    }
    if (packet.error) {
      const error = new Error(packet.error);
      error.code = 'ADAPTER_NOT_IMPLEMENTED';
      throw error;
    }
    return packet.records;
  }
};
