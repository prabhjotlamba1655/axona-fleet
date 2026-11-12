import db from '../db/database.js';

/**
 * AXONA GEOFENCING & SPATIAL EVENT ENGINE
 * Developed by Axona Software LLP
 */

// Haversine formula for distance in meters
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ray casting algorithm for Point-in-Polygon test
export function isPointInPolygon(point, polygon) {
  // point: [lat, lon], polygon: [[lat, lon], ...]
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export class GeofenceService {
  /**
   * Evaluate whether a vehicle entered or exited any assigned active geofence
   */
  static evaluateVehicleGeofences(vehicleId, currentLat, currentLng, speed) {
    const geofences = db.query(`
      SELECT g.*, v.registration_number
      FROM geofences g
      JOIN geofence_vehicles gv ON gv.geofence_id = g.id
      JOIN vehicles v ON v.id = gv.vehicle_id
      WHERE gv.vehicle_id = ? AND g.is_active = 1
    `, [vehicleId]);

    const eventsGenerated = [];

    for (const fence of geofences) {
      let isInside = false;

      if (fence.fence_type === 'circle') {
        const dist = calculateDistanceMeters(currentLat, currentLng, fence.center_lat, fence.center_lng);
        isInside = dist <= fence.radius_meters;
      } else if (fence.fence_type === 'polygon' && fence.coordinates_json) {
        try {
          const polyCoords = JSON.parse(fence.coordinates_json);
          isInside = isPointInPolygon([currentLat, currentLng], polyCoords);
        } catch (e) {
          console.warn('Geofence polygon parse error:', e.message);
        }
      }

      // Check last event for this fence & vehicle
      const lastEvent = db.get(`
        SELECT event_type, event_time FROM geofence_events
        WHERE geofence_id = ? AND vehicle_id = ?
        ORDER BY event_time DESC LIMIT 1
      `, [fence.id, vehicleId]);

      const wasInside = lastEvent ? lastEvent.event_type === 'entry' : false;

      if (isInside && !wasInside && fence.alert_on_entry) {
        // Entry Event
        const eventId = `geo_evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.run(`
          INSERT INTO geofence_events (id, geofence_id, vehicle_id, event_type, latitude, longitude, speed)
          VALUES (?, ?, ?, 'entry', ?, ?, ?)
        `, [eventId, fence.id, vehicleId, currentLat, currentLng, speed]);

        db.run(`
          INSERT INTO notifications (id, tenant_id, vehicle_id, title, message, notification_type)
          VALUES (?, ?, ?, ?, ?, 'geofence')
        `, [
          `notif_ge_${Date.now()}`,
          fence.tenant_id,
          vehicleId,
          `Geofence Entry: ${fence.name}`,
          `Vehicle ${fence.registration_number} entered ${fence.name} at ${speed} km/h.`
        ]);

        eventsGenerated.push({ type: 'entry', geofenceName: fence.name, vehicle: fence.registration_number });
      } else if (!isInside && wasInside && fence.alert_on_exit) {
        // Exit Event
        const eventId = `geo_evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.run(`
          INSERT INTO geofence_events (id, geofence_id, vehicle_id, event_type, latitude, longitude, speed)
          VALUES (?, ?, ?, 'exit', ?, ?, ?)
        `, [eventId, fence.id, vehicleId, currentLat, currentLng, speed]);

        db.run(`
          INSERT INTO notifications (id, tenant_id, vehicle_id, title, message, notification_type)
          VALUES (?, ?, ?, ?, ?, 'geofence')
        `, [
          `notif_gx_${Date.now()}`,
          fence.tenant_id,
          vehicleId,
          `Geofence Exit: ${fence.name}`,
          `Vehicle ${fence.registration_number} departed from ${fence.name}.`
        ]);

        eventsGenerated.push({ type: 'exit', geofenceName: fence.name, vehicle: fence.registration_number });
      }
    }

    return eventsGenerated;
  }
}

export default GeofenceService;
