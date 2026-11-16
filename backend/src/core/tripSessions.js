import { distanceKm } from './overspeedSession.js';
import { markStoppages } from './stoppages.js';

const GAP_MS = 15 * 60 * 1000;

function stampMs(value) {
  const parsed = Date.parse(String(value || '').trim().replace(' ', 'T'));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function summarize(group) {
  const marked = markStoppages(group);
  const firstMove = marked.findIndex((point) => !point.in_stop);
  if (firstMove < 0) return null;
  let lastMove = marked.length - 1;
  while (lastMove > firstMove && marked[lastMove].in_stop) lastMove -= 1;
  const journey = marked.slice(firstMove);
  const departed = journey[0];
  const arrived = marked[lastMove];
  let driven = 0;
  let speedTotal = 0;
  let maxSpeed = 0;
  for (let index = 0; index < journey.length; index += 1) {
    const speed = Number(journey[index].speed) || 0;
    speedTotal += speed;
    if (speed > maxSpeed) maxSpeed = speed;
    if (index === 0) continue;
    driven += distanceKm(
      journey[index - 1].latitude,
      journey[index - 1].longitude,
      journey[index].latitude,
      journey[index].longitude
    );
  }
  if (driven < 0.2) return null;
  const started = stampMs(departed.gps_time);
  const ended = stampMs(arrived.gps_time);
  const duration = Number.isFinite(started) && Number.isFinite(ended)
    ? Math.max(0, Math.round((ended - started) / 60000))
    : 0;
  const stopPoints = marked.filter((point, index) => point.is_stop && index >= firstMove);
  const stoppageMinutes = stopPoints.reduce((sum, point) => sum + (Number(point.stop_duration_min) || 0), 0);
  return {
    id: `track~${departed.vehicle_id}~${started}`,
    vehicle_id: departed.vehicle_id,
    start_time: departed.gps_time,
    end_time: arrived.gps_time,
    start_latitude: departed.latitude,
    start_longitude: departed.longitude,
    end_latitude: arrived.latitude,
    end_longitude: arrived.longitude,
    start_address: departed.address || `${Number(departed.latitude).toFixed(5)}, ${Number(departed.longitude).toFixed(5)}`,
    end_address: arrived.address || `${Number(arrived.latitude).toFixed(5)}, ${Number(arrived.longitude).toFixed(5)}`,
    distance_km: Math.round(driven * 10) / 10,
    duration_minutes: duration,
    stoppage_minutes: stoppageMinutes,
    stops_count: stopPoints.length,
    max_speed: Math.round(maxSpeed * 10) / 10,
    avg_speed: Math.round((speedTotal / journey.length) * 10) / 10,
    is_inferred: 0,
    points: journey
  };
}

/** Split a vehicle's GPS history into drives. A gap longer than 15 minutes starts a new drive. */
export function sessionsFromHistory(points) {
  const ordered = points
    .filter((point) => Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)) && point.gps_time)
    .sort((a, b) => String(a.gps_time).localeCompare(String(b.gps_time)));
  if (ordered.length < 2) return [];

  const groups = [];
  let current = [ordered[0]];
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = stampMs(ordered[index - 1].gps_time);
    const next = stampMs(ordered[index].gps_time);
    if (Number.isFinite(previous) && Number.isFinite(next) && next - previous > GAP_MS) {
      groups.push(current);
      current = [];
    }
    current.push(ordered[index]);
  }
  groups.push(current);
  return groups.filter((group) => group.length >= 2).map(summarize).filter(Boolean);
}

export function sessionById(points, id) {
  return sessionsFromHistory(points).find((session) => session.id === id) || null;
}
