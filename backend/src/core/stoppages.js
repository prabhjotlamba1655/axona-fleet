import { distanceKm } from './overspeedSession.js';

const STOP_SPEED_KMH = 3;
const STOP_RADIUS_M = 50;

function stampMs(value) {
  const text = String(value || '').trim().replace(' ', 'T').replace(/\.\d+$/, '');
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function hasFix(point) {
  return Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude));
}

function withinStopRadius(anchor, point) {
  if (!hasFix(anchor) || !hasFix(point)) return false;
  return distanceKm(anchor.latitude, anchor.longitude, point.latitude, point.longitude) * 1000 <= STOP_RADIUS_M;
}

/**
 * Ignition off and either under 3 km/h or still within 50 m of where the halt began.
 * A speed spike that does not move the car does not end the stop.
 */
function staysStopped(anchor, point) {
  if (Number(point.ignition) !== 0) return false;
  if (Number(point.speed) < STOP_SPEED_KMH) return true;
  return withinStopRadius(anchor, point);
}

/**
 * One stop is ignition off, with the car not leaving a 50 m patch, for at least 3 minutes.
 */
export function markStoppages(points, minMinutes = 3) {
  const marked = points.map((point) => ({
    ...point,
    is_stop: 0,
    in_stop: 0,
    stop_duration_min: 0
  }));
  let start = null;

  const close = (endIndex) => {
    if (start == null) return;
    const startMs = stampMs(points[start].gps_time || points[start].time);
    const endMs = stampMs(points[endIndex].gps_time || points[endIndex].time);
    const minutes = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? (endMs - startMs) / 60000
      : 0;
    if (minutes >= minMinutes) {
      for (let index = start; index <= endIndex; index += 1) marked[index].in_stop = 1;
      marked[start].is_stop = 1;
      marked[start].stop_duration_min = Math.round(minutes);
      marked[start].address = points[start].address || 'Stoppage';
    }
    start = null;
  };

  points.forEach((point, index) => {
    if (start != null && staysStopped(points[start], point)) return;
    if (start != null) close(index - 1);
    if (Number(point.ignition) === 0) start = index;
  });
  if (start != null) close(points.length - 1);
  return marked;
}
