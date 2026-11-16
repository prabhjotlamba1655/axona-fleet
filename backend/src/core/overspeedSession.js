/** Speed must stay above the limit by this margin before an incident opens. */
export const START_MARGIN_KMH = 2;
/** Speed must fall this far under the limit before an incident can close. */
export const CLOSE_MARGIN_KMH = 3;
export const START_HOLD_SECONDS = 5;
export const CLOSE_HOLD_SECONDS = 10;

const SEVERITY = ['ADVISORY', 'WARNING', 'HIGH', 'CRITICAL'];

export function secondsBetween(start, end) {
  const a = parseStamp(start);
  const b = parseStamp(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return (b - a) / 1000;
}

function parseStamp(value) {
  if (!value) return NaN;
  const text = String(value).trim();
  if (text.includes('T')) return Date.parse(text);
  return Date.parse(`${text.replace(' ', 'T')}Z`);
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  const points = [lat1, lon1, lat2, lon2].map(Number);
  if (points.some((value) => !Number.isFinite(value))) return 0;
  const [aLat, aLon, bLat, bLon] = points;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const chord = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

export function severityRank(name) {
  const index = SEVERITY.indexOf(name);
  return index === -1 ? 0 : index;
}

/**
 * Either a wide margin or a long duration raises the tier.
 * Advisory and warning keep the base score of -2. High is -3. Critical is -5.
 */
export function overspeedSeverity(speed, limit, durationSec) {
  const delta = Number(speed) - Number(limit);
  let deltaRank = 0;
  if (delta > 25 || Number(speed) > 90) deltaRank = 3;
  else if (delta >= 16) deltaRank = 2;
  else if (delta >= 6) deltaRank = 1;

  let durationRank = 0;
  if (durationSec > 300) durationRank = 3;
  else if (durationSec >= 120) durationRank = 2;
  else if (durationSec >= 30) durationRank = 1;

  return SEVERITY[Math.max(deltaRank, durationRank)];
}

/**
 * Decide what one speed sample does to an incident.
 * Open only after speed stays above limit+2 for more than 5 seconds.
 * Close only after speed stays under limit-3 for more than 10 seconds.
 */
export function nextOverspeedState({ speed, limit, gpsTime, latitude, longitude, open, arming }) {
  const now = gpsTime || new Date().toISOString();
  const numericSpeed = Number(speed);
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericSpeed) || !Number.isFinite(numericLimit) || numericLimit <= 0) {
    return { action: 'none' };
  }

  if (!open) {
    if (!(numericSpeed > numericLimit + START_MARGIN_KMH)) return { action: 'clear-arm' };
    if (!arming?.started_at) {
      return { action: 'arm', startedAt: now, latitude, longitude };
    }
    const held = secondsBetween(arming.started_at, now);
    if (!(held > START_HOLD_SECONDS)) return { action: 'hold-arm' };
    return {
      action: 'open',
      startedAt: arming.started_at,
      severity: overspeedSeverity(numericSpeed, numericLimit, held),
      distanceKm: distanceKm(arming.latitude, arming.longitude, latitude, longitude),
      notify: true
    };
  }

  const peak = Math.max(Number(open.max_speed) || 0, numericSpeed);
  const duration = Math.max(0, secondsBetween(open.event_time, now));
  const severity = overspeedSeverity(peak, numericLimit, duration);
  const previousLat = Number.isFinite(Number(open.last_latitude)) ? Number(open.last_latitude) : Number(open.latitude);
  const previousLon = Number.isFinite(Number(open.last_longitude)) ? Number(open.last_longitude) : Number(open.longitude);
  const added = distanceKm(previousLat, previousLon, latitude, longitude);
  const raised = severityRank(severity) > severityRank(open.severity || 'ADVISORY');
  const progress = {
    severity,
    distanceKm: added,
    notify: raised
  };

  if (!(numericSpeed < numericLimit - CLOSE_MARGIN_KMH)) {
    return { action: 'extend', ...progress, closingSince: null, isOpen: 1 };
  }
  if (!open.closing_since) {
    return { action: 'extend', ...progress, closingSince: now, isOpen: 1 };
  }
  const closingHeld = secondsBetween(open.closing_since, now);
  if (!(closingHeld > CLOSE_HOLD_SECONDS)) {
    return { action: 'extend', ...progress, closingSince: open.closing_since, isOpen: 1 };
  }
  return { action: 'close', ...progress, closingSince: open.closing_since, isOpen: 0 };
}
