export const CANONICAL_SCHEMA = 'axona.telemetry.v1';

export function xorChecksum(body) {
  let checksum = 0;
  for (let i = 0; i < body.length; i += 1) {
    checksum ^= body.charCodeAt(i);
  }
  return checksum.toString(16).toUpperCase().padStart(2, '0');
}

export function frameSentence(body) {
  return `$${body}*${xorChecksum(body)}`;
}

/**
 * Build the single persistence shape every protocol adapter must produce.
 * Returns { ok:false } when identity or coordinates cannot be stored safely.
 */
export function buildCanonical(fields) {
  const imei = fields.imei == null ? '' : String(fields.imei).trim();
  const latitude = Number(fields.latitude);
  const longitude = Number(fields.longitude);

  if (imei.length < 8) {
    return { ok: false, error: `Invalid device IMEI: ${imei || 'missing'}` };
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, error: `Coordinates out of geographic range: ${fields.latitude}, ${fields.longitude}` };
  }

  const speedKmh = Number.isFinite(Number(fields.speedKmh)) ? Number(fields.speedKmh) : 0;
  const headingDegrees = Number.isFinite(Number(fields.headingDegrees)) ? Number(fields.headingDegrees) : 0;

  return {
    ok: true,
    canonical: {
      schema: CANONICAL_SCHEMA,
      protocol: fields.protocol,
      device: { imei },
      position: {
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
        altitudeMeters: Number.isFinite(Number(fields.altitudeMeters)) ? Number(fields.altitudeMeters) : 0,
        speedKmh: Number(speedKmh.toFixed(1)),
        headingDegrees: Number(headingDegrees.toFixed(1)),
        satellites: Number.isFinite(Number(fields.satellites)) ? Number(fields.satellites) : 0,
        fixQuality: fields.fixQuality ?? null
      },
      state: {
        ignition: fields.ignition ? 1 : 0,
        mainPower: fields.mainPower === 0 ? 0 : 1,
        panic: fields.panic ? 1 : 0,
        tamper: fields.tamper ? 1 : 0,
        movementStatus: speedKmh > 3 ? 'moving' : (fields.ignition ? 'idle' : 'stopped')
      },
      alert: fields.alert ?? null,
      timing: {
        gpsTime: fields.gpsTime ?? null,
        receivedAt: new Date().toISOString()
      }
    }
  };
}

export function publicCanonical(canonical) {
  if (!canonical) return null;
  return {
    schema: canonical.schema,
    protocol: canonical.protocol,
    device: canonical.device,
    position: canonical.position,
    state: canonical.state,
    alert: canonical.alert,
    timing: canonical.timing
  };
}
