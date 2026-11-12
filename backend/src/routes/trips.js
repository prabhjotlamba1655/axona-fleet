import express from 'express';
import db from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Realistic high-fidelity waypoints for route replay demo
const DETAILED_TRIP_WAYPOINTS = {
  // Trip 1: Nigdi MIDC to Hinjawadi Phase 1 (Pune Highway Corridor - 38.4 km)
  'trip_1': [
    { latitude: 18.6298, longitude: 73.7997, speed: 0.0, heading: 0, ignition: 0, address: 'Apex Logistics Heavy Depot, Nigdi MIDC Bay 2', is_stop: 1, stop_duration_min: 15 },
    { latitude: 18.6270, longitude: 73.7975, speed: 25.4, heading: 140, ignition: 1, address: 'MIDC Spine Road Junction, Nigdi', is_stop: 0 },
    { latitude: 18.6220, longitude: 73.7920, speed: 42.0, heading: 155, ignition: 1, address: 'Near Akurdi Railway Station Overbridge', is_stop: 0 },
    { latitude: 18.6180, longitude: 73.7880, speed: 52.5, heading: 160, ignition: 1, address: 'Old Mumbai-Pune Highway, Chinchwad Station', is_stop: 0 },
    { latitude: 18.6150, longitude: 73.7840, speed: 0.0, heading: 160, ignition: 1, address: 'Chinchwad Commercial Checkpoint (Scheduled Stop)', is_stop: 1, stop_duration_min: 7 },
    { latitude: 18.6100, longitude: 73.7750, speed: 58.0, heading: 175, ignition: 1, address: 'Thergaon Link Road', is_stop: 0 },
    { latitude: 18.6040, longitude: 73.7620, speed: 64.5, heading: 180, ignition: 1, address: 'Dange Chowk Flyover Approach, Thergaon', is_stop: 0 },
    { latitude: 18.6010, longitude: 73.7550, speed: 62.0, heading: 195, ignition: 1, address: 'Kalewadi Phata Junction', is_stop: 0 },
    { latitude: 18.5980, longitude: 73.7510, speed: 55.0, heading: 210, ignition: 1, address: 'Wakad Highway Bridge underpass', is_stop: 0 },
    { latitude: 18.5960, longitude: 73.7480, speed: 48.0, heading: 220, ignition: 1, address: 'Bhumkar Chowk, Wakad', is_stop: 0 },
    { latitude: 18.5945, longitude: 73.7440, speed: 38.0, heading: 240, ignition: 1, address: 'Hinjawadi Flyover Entry Ramp', is_stop: 0 },
    { latitude: 18.5930, longitude: 73.7410, speed: 45.0, heading: 255, ignition: 1, address: 'Hinjawadi IT Park Gateway Road', is_stop: 0 },
    { latitude: 18.5912, longitude: 73.7389, speed: 0.0, heading: 260, ignition: 0, address: 'Apex Hinjawadi Central Logistics Hub, Hinjawadi Phase 1', is_stop: 1, stop_duration_min: 25 }
  ],

  // Trip 2: Baner Depot to Shivaji Nagar Transit (Pune Central Corridor - 24.8 km)
  'trip_2': [
    { latitude: 18.5590, longitude: 73.7780, speed: 0.0, heading: 120, ignition: 0, address: 'Baner Bus Depot Platform 3', is_stop: 1, stop_duration_min: 10 },
    { latitude: 18.5530, longitude: 73.7890, speed: 35.0, heading: 125, ignition: 1, address: 'Baner High Street Cross', is_stop: 0 },
    { latitude: 18.5470, longitude: 73.8010, speed: 48.0, heading: 135, ignition: 1, address: 'Pashan-Sus Road Connector', is_stop: 0 },
    { latitude: 18.5400, longitude: 73.8150, speed: 52.0, heading: 140, ignition: 1, address: 'Pune University Circle Flyover', is_stop: 0 },
    { latitude: 18.5360, longitude: 73.8240, speed: 0.0, heading: 150, ignition: 1, address: 'University Gate Passenger Transit Halt', is_stop: 1, stop_duration_min: 5 },
    { latitude: 18.5320, longitude: 73.8350, speed: 44.0, heading: 165, ignition: 1, address: 'E-Square Multiplex, Ganeshkhind Road', is_stop: 0 },
    { latitude: 18.5280, longitude: 73.8450, speed: 38.0, heading: 175, ignition: 1, address: 'Agricultural College Campus Road', is_stop: 0 },
    { latitude: 18.5240, longitude: 73.8520, speed: 28.0, heading: 190, ignition: 1, address: 'COEP Engineering College Bridge', is_stop: 0 },
    { latitude: 18.5204, longitude: 73.8567, speed: 0.0, heading: 200, ignition: 0, address: 'Shivaji Nagar Bus Transit Station Bay 4', is_stop: 1, stop_duration_min: 20 }
  ],

  // Trip 3: Magarpatta City to Baner High Street (29.1 km)
  'trip_3': [
    { latitude: 18.5089, longitude: 73.9260, speed: 0.0, heading: 90, ignition: 0, address: 'Magarpatta Cybercity Tower 4 Bay', is_stop: 1, stop_duration_min: 8 },
    { latitude: 18.5150, longitude: 73.9180, speed: 40.0, heading: 300, ignition: 1, address: 'Hadapsar Flyover Approach', is_stop: 0 },
    { latitude: 18.5220, longitude: 73.9050, speed: 58.0, heading: 310, ignition: 1, address: 'Fatima Nagar Junction', is_stop: 0 },
    { latitude: 18.5310, longitude: 73.8850, speed: 65.0, heading: 315, ignition: 1, address: 'Pune Cantonment Outer Link', is_stop: 0 },
    { latitude: 18.5420, longitude: 73.8650, speed: 72.0, heading: 320, ignition: 1, address: 'Sangamwadi BRTS Corridor', is_stop: 0 },
    { latitude: 18.5520, longitude: 73.8200, speed: 68.0, heading: 310, ignition: 1, address: 'Aundh Ravet Expressway Entry', is_stop: 0 },
    { latitude: 18.5590, longitude: 73.7780, speed: 0.0, heading: 310, ignition: 0, address: 'Baner High Street Commercial Hub', is_stop: 1, stop_duration_min: 15 }
  ],

  // Trip 4: Koramangala to MG Road, Bengaluru (11.2 km)
  'trip_4': [
    { latitude: 12.9352, longitude: 77.6245, speed: 0.0, heading: 45, ignition: 0, address: 'Koramangala 4th Block Club Road', is_stop: 1, stop_duration_min: 10 },
    { latitude: 12.9420, longitude: 77.6180, speed: 32.0, heading: 50, ignition: 1, address: 'Dairy Circle Flyover', is_stop: 0 },
    { latitude: 12.9510, longitude: 77.6100, speed: 45.0, heading: 55, ignition: 1, address: 'Hosur Main Road, Wilson Garden', is_stop: 0 },
    { latitude: 12.9600, longitude: 77.6020, speed: 0.0, heading: 60, ignition: 1, address: 'Richmond Circle Traffic Halt', is_stop: 1, stop_duration_min: 4 },
    { latitude: 12.9680, longitude: 77.5980, speed: 38.0, heading: 70, ignition: 1, address: 'Residency Road Junction', is_stop: 0 },
    { latitude: 12.9716, longitude: 77.5946, speed: 0.0, heading: 90, ignition: 0, address: 'MG Road Metro Station North Gate', is_stop: 1, stop_duration_min: 12 }
  ],

  // Trip 5: Mumbai Port to Navi Mumbai APMC (42.6 km, 2 Stoppages - 18 min stoppage)
  'trip_5': [
    { latitude: 18.9220, longitude: 72.8347, speed: 0.0, heading: 30, ignition: 0, address: 'Mumbai Port Container Terminal Bay 1 (Origin Departure)', is_stop: 1, stop_duration_min: 20 },
    { latitude: 18.9320, longitude: 72.8410, speed: 28.0, heading: 35, ignition: 1, address: 'Ballard Estate Orange Gate Entry', is_stop: 0 },
    { latitude: 18.9480, longitude: 72.8470, speed: 52.0, heading: 40, ignition: 1, address: 'Eastern Freeway High Speed Section Entry', is_stop: 0 },
    { latitude: 18.9720, longitude: 72.8550, speed: 64.0, heading: 35, ignition: 1, address: 'Eastern Freeway Elevated Corridor, Sewri', is_stop: 0 },
    { latitude: 18.9980, longitude: 72.8650, speed: 68.0, heading: 30, ignition: 1, address: 'Wadala Freeway Overpass', is_stop: 0 },
    { latitude: 19.0250, longitude: 72.8780, speed: 60.0, heading: 40, ignition: 1, address: 'Chembur South Elevated Ramp', is_stop: 0 },
    // STOPPAGE 1: Chembur Toll Plaza / Commercial Inspection Bay (10 min)
    { latitude: 19.0480, longitude: 72.8920, speed: 0.0, heading: 45, ignition: 0, address: 'Chembur Highway Toll Plaza & Commercial Inspection Bay (Stoppage #1)', is_stop: 1, stop_duration_min: 10 },
    { latitude: 19.0540, longitude: 72.9050, speed: 42.0, heading: 75, ignition: 1, address: 'Mankhurd Link Road Junction', is_stop: 0 },
    { latitude: 19.0590, longitude: 72.9280, speed: 58.0, heading: 85, ignition: 1, address: 'Sion-Panvel Expressway Corridor', is_stop: 0 },
    { latitude: 19.0630, longitude: 72.9550, speed: 62.0, heading: 85, ignition: 1, address: 'Vashi Creek Bridge Western Approach', is_stop: 0 },
    // STOPPAGE 2: Vashi Creek Weighbridge & Checkpost (8 min)
    { latitude: 19.0660, longitude: 72.9750, speed: 0.0, heading: 90, ignition: 0, address: 'Vashi Creek Commercial Weighbridge & Checkpost (Stoppage #2)', is_stop: 1, stop_duration_min: 8 },
    { latitude: 19.0710, longitude: 72.9880, speed: 45.0, heading: 70, ignition: 1, address: 'Vashi Sector 17 Interchange', is_stop: 0 },
    { latitude: 19.0740, longitude: 72.9980, speed: 38.0, heading: 60, ignition: 1, address: 'Turbhe MIDC Market Connector', is_stop: 0 },
    { latitude: 19.0760, longitude: 72.8777, speed: 0.0, heading: 55, ignition: 0, address: 'Navi Mumbai APMC Terminal Bay (Destination Arrival)', is_stop: 1, stop_duration_min: 30 }
  ],

  // Trip 6: Apex Hub Nigdi to Pune Central (31.5 km, 2 Stoppages - 12 min stoppage)
  'trip_6': [
    { latitude: 18.6298, longitude: 73.7997, speed: 0.0, heading: 140, ignition: 0, address: 'Apex Logistics Heavy Depot, Nigdi MIDC (Origin)', is_stop: 1, stop_duration_min: 15 },
    { latitude: 18.6210, longitude: 73.7930, speed: 42.0, heading: 150, ignition: 1, address: 'Akurdi Railway Overbridge', is_stop: 0 },
    { latitude: 18.6140, longitude: 73.7840, speed: 52.0, heading: 160, ignition: 1, address: 'Chinchwad Station Road', is_stop: 0 },
    // Stoppage 1: Pimpri Commercial Hub (6 min)
    { latitude: 18.6050, longitude: 73.7710, speed: 0.0, heading: 165, ignition: 0, address: 'Pimpri Commercial Logistics Bay (Stoppage #1)', is_stop: 1, stop_duration_min: 6 },
    { latitude: 18.5980, longitude: 73.7580, speed: 58.0, heading: 170, ignition: 1, address: 'Kasarwadi Highway Link', is_stop: 0 },
    { latitude: 18.5720, longitude: 73.8050, speed: 65.0, heading: 165, ignition: 1, address: 'Dapodi Bridge', is_stop: 0 },
    // Stoppage 2: Khadki Cantonment Checkpoint (6 min)
    { latitude: 18.5580, longitude: 73.8320, speed: 0.0, heading: 160, ignition: 0, address: 'Khadki Toll Checkpoint (Stoppage #2)', is_stop: 1, stop_duration_min: 6 },
    { latitude: 18.5410, longitude: 73.8450, speed: 40.0, heading: 170, ignition: 1, address: 'Ganeshkhind Road Approach', is_stop: 0 },
    { latitude: 18.5204, longitude: 73.8567, speed: 0.0, heading: 180, ignition: 0, address: 'Pune Central Distribution Yard (Destination)', is_stop: 1, stop_duration_min: 25 }
  ]
};

// GET /api/trips - Filterable trips
router.get('/', (req, res) => {
  const { user } = req;
  const { vehicleId, startDate, endDate } = req.query;

  let sql = `
    SELECT t.*, v.registration_number, v.make, v.model,
           c.name as category_name
    FROM trips t
    JOIN vehicles v ON v.id = t.vehicle_id
    LEFT JOIN vehicle_categories c ON v.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND v.tenant_id = ?';
    params.push(user.tenant_id);
  }

  if (user.role === 'sub_user' && user.assigned_vehicles) {
    if (user.assigned_vehicles.length === 0) return res.json([]);
    const placeholders = user.assigned_vehicles.map(() => '?').join(',');
    sql += ` AND v.id IN (${placeholders})`;
    params.push(...user.assigned_vehicles);
  }

  if (vehicleId) {
    sql += ' AND t.vehicle_id = ?';
    params.push(vehicleId);
  }

  if (startDate) {
    sql += ' AND t.start_time >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND t.start_time <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY t.start_time DESC';

  const trips = db.query(sql, params);
  res.json(trips);
});

// GET /api/trips/:id/playback - GPS points along the trip for animated route playback
router.get('/:id/playback', (req, res) => {
  const { id } = req.params;
  const trip = db.get('SELECT * FROM trips WHERE id = ?', [id]);
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  // Check pre-configured high-precision waypoints
  let waypoints = DETAILED_TRIP_WAYPOINTS[id];

  if (!waypoints || waypoints.length === 0) {
    // Check if recorded in gps_location_history
    const history = db.query(`
      SELECT latitude, longitude, speed, heading, ignition, address, gps_time
      FROM gps_location_history
      WHERE vehicle_id = ?
      ORDER BY gps_time ASC
    `, [trip.vehicle_id]);

    if (history.length >= 8) {
      waypoints = history.map((h, i) => ({
        latitude: h.latitude,
        longitude: h.longitude,
        speed: h.speed,
        heading: h.heading,
        ignition: h.ignition,
        address: h.address || `Waypoint #${i + 1}`,
        is_stop: h.speed === 0 ? 1 : 0
      }));
    } else {
      // Interpolate smooth path between start and end with exact stoppage points
      const nPoints = 18;
      const stopsCount = trip.stops_count || 2;
      const avgStopDuration = Math.round((trip.stoppage_minutes || 15) / Math.max(1, stopsCount));
      
      // Determine index positions for intermediate stops
      const stopIndices = new Map();
      for (let s = 1; s <= stopsCount; s++) {
        const idx = Math.round((s / (stopsCount + 1)) * nPoints);
        stopIndices.set(idx, {
          stopNum: s,
          duration: avgStopDuration
        });
      }

      waypoints = [];
      for (let i = 0; i <= nPoints; i++) {
        const ratio = i / nPoints;
        const lat = trip.start_latitude + (trip.end_latitude - trip.start_latitude) * ratio;
        const lon = trip.start_longitude + (trip.end_longitude - trip.start_longitude) * ratio;
        const stopInfo = stopIndices.get(i);
        const isIntermediateStop = Boolean(stopInfo);
        const isTerminalStop = (i === 0 || i === nPoints);
        const isStopPoint = isTerminalStop || isIntermediateStop;
        const spd = isStopPoint ? 0 : Math.round(40 + Math.sin(ratio * Math.PI) * 28);

        let addr = `Corridor Waypoint #${i}`;
        if (i === 0) addr = `${trip.start_address} (Origin Departure)`;
        else if (i === nPoints) addr = `${trip.end_address} (Destination Arrival)`;
        else if (isIntermediateStop) addr = `Intermediate Stoppage #${stopInfo.stopNum} (${stopInfo.duration}m Halt)`;

        waypoints.push({
          latitude: Number(lat.toFixed(5)),
          longitude: Number(lon.toFixed(5)),
          speed: spd,
          heading: Math.round(75 + ratio * 40),
          ignition: isStopPoint ? 0 : 1,
          address: addr,
          is_stop: isStopPoint ? 1 : 0,
          stop_duration_min: isTerminalStop ? (i === 0 ? 15 : 20) : (isIntermediateStop ? stopInfo.duration : 0)
        });
      }
    }
  }

  res.json({
    trip,
    waypointCount: waypoints.length,
    waypoints
  });
});

export default router;
