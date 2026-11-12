import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'axona.db');

let dbInstance = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  const isNew = !fs.existsSync(DB_PATH);
  dbInstance = new DatabaseSync(DB_PATH);

  // Enable foreign keys and WAL mode for high performance
  try {
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  } catch (err) {
    console.warn('Pragma warning:', err.message);
  }

  // Initialize schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    dbInstance.exec(schemaSql);
  }

  // Seed sample data if empty or new
  const seedsPath = path.join(__dirname, 'seeds.sql');
  if (fs.existsSync(seedsPath)) {
    const seedsSql = fs.readFileSync(seedsPath, 'utf8');
    try {
      dbInstance.exec(seedsSql);
      seedHistoricalGPSPoints(dbInstance);
      seedDriverIntelligence(dbInstance);
    } catch (err) {
      console.warn('Seeding notice:', err.message);
    }
  }

  // Ensure Driver Intelligence tables exist on active database
  seedDriverIntelligence(dbInstance);

  console.log(`[Axona DB] Enterprise Database initialized at ${DB_PATH}`);
  return dbInstance;
}

// Seed realistic GPS history trail and 90-day trips for route replay & reports
function seedHistoricalGPSPoints(db) {
  try {
    // 1. Seed 90-day trips for Apex Logistics and Rahul Sharma fleet
    const tripCount = db.prepare('SELECT COUNT(*) as cnt FROM trips').get();
    if (tripCount && tripCount.cnt < 8) {
      const trips90d = [
        { id: 'trip_5', veh: 'veh_2', start: "-7 days", end: "-7 days, +4 hours", sLat: 18.9220, sLon: 72.8347, sAddr: 'Mumbai Port Container Terminal Bay 1', eLat: 19.0760, eLon: 72.8777, eAddr: 'Navi Mumbai APMC Terminal', dist: 42.6, dur: 75, stopMin: 18, stops: 2, maxSpd: 68.0, avgSpd: 36.5 },
        { id: 'trip_6', veh: 'veh_1', start: "-18 days", end: "-18 days, +6 hours", sLat: 18.6298, sLon: 73.7997, sAddr: 'Apex Hub Nigdi', eLat: 18.5204, eLon: 73.8567, eAddr: 'Pune Central Distribution Yard', dist: 31.5, dur: 58, stopMin: 12, stops: 2, maxSpd: 65.0, avgSpd: 41.2 },
        { id: 'trip_7', veh: 'veh_4', start: "-32 days", end: "-32 days, +5 hours", sLat: 18.5800, sLon: 73.9780, sAddr: 'Pune International Airport T2', eLat: 18.5089, eLon: 73.9260, eAddr: 'Magarpatta Cybercity', dist: 22.4, dur: 40, stopMin: 10, stops: 1, maxSpd: 78.0, avgSpd: 45.0 },
        { id: 'trip_8', veh: 'veh_3', start: "-45 days", end: "-45 days, +4 hours", sLat: 18.5590, sLon: 73.7780, sAddr: 'Baner Staff Depot', eLat: 18.5912, eLon: 73.7389, eAddr: 'Hinjawadi Phase 2 Campus', dist: 19.8, dur: 38, stopMin: 15, stops: 3, maxSpd: 62.0, avgSpd: 32.0 },
        { id: 'trip_9', veh: 'veh_1', start: "-62 days", end: "-62 days, +7 hours", sLat: 18.6298, sLon: 73.7997, sAddr: 'Nigdi Heavy Depot', eLat: 18.7020, eLon: 73.6840, eAddr: 'Talegaon Industrial Bay', dist: 48.0, dur: 85, stopMin: 22, stops: 3, maxSpd: 64.0, avgSpd: 39.0 },
        { id: 'trip_10', veh: 'veh_7', start: "-78 days", end: "-78 days, +3 hours", sLat: 12.9352, sLon: 77.6245, sAddr: 'Koramangala 4th Block', eLat: 12.9800, eLon: 77.7500, eAddr: 'ITPL Main Gate, Whitefield', dist: 26.5, dur: 62, stopMin: 14, stops: 2, maxSpd: 55.0, avgSpd: 28.0 },
        { id: 'trip_11', veh: 'veh_2', start: "-88 days", end: "-88 days, +8 hours", sLat: 18.6298, sLon: 73.7997, sAddr: 'Nigdi Logistics Bay', eLat: 18.9220, eLon: 72.8347, eAddr: 'Mumbai Port Logistics Terminal', dist: 135.0, dur: 190, stopMin: 35, stops: 4, maxSpd: 70.0, avgSpd: 48.5 }
      ];

      const tripStmt = db.prepare(`
        INSERT OR IGNORE INTO trips (id, vehicle_id, start_time, end_time, start_latitude, start_longitude, start_address, end_latitude, end_longitude, end_address, distance_km, duration_minutes, stoppage_minutes, stops_count, max_speed, avg_speed, is_inferred)
        VALUES (?, ?, datetime('now', ?), datetime('now', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      for (const t of trips90d) {
        tripStmt.run(t.id, t.veh, t.start, t.end, t.sLat, t.sLon, t.sAddr, t.eLat, t.eLon, t.eAddr, t.dist, t.dur, t.stopMin, t.stops, t.maxSpd, t.avgSpd);
      }
      console.log('[Axona DB] Seeded 90-day trip history records.');
    }

    const existing = db.prepare('SELECT COUNT(*) as cnt FROM gps_location_history').get();
    if (existing && existing.cnt > 30) return;

    // Generate trail for veh_1 (Tata Prima from Nigdi to Hinjawadi, Pune)
    const points = [
      { lat: 18.6298, lng: 73.7997, speed: 0, heading: 0, ign: 0 },
      { lat: 18.6270, lng: 73.7975, speed: 25.4, heading: 140, ign: 1 },
      { lat: 18.6220, lng: 73.7920, speed: 42.0, heading: 155, ign: 1 },
      { lat: 18.6180, lng: 73.7880, speed: 52.0, heading: 160, ign: 1 },
      { lat: 18.6150, lng: 73.7840, speed: 0, heading: 160, ign: 1 }, // stop
      { lat: 18.6100, lng: 73.7750, speed: 58.4, heading: 175, ign: 1 },
      { lat: 18.6040, lng: 73.7620, speed: 64.0, heading: 180, ign: 1 },
      { lat: 18.6010, lng: 73.7550, speed: 62.0, heading: 195, ign: 1 },
      { lat: 18.5980, lng: 73.7510, speed: 55.0, heading: 210, ign: 1 },
      { lat: 18.5940, lng: 73.7440, speed: 48.0, heading: 240, ign: 1 },
      { lat: 18.5912, lng: 73.7389, speed: 48.5, heading: 85, ign: 1 }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO gps_location_history 
      (vehicle_id, device_id, latitude, longitude, speed, heading, ignition, main_power, panic_button, address, gps_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, datetime('now', ?))
    `);

    points.forEach((pt, idx) => {
      const minutesAgo = `-${(points.length - idx) * 15} minutes`;
      insertStmt.run(
        'veh_1',
        'dev_101',
        pt.lat,
        pt.lng,
        pt.speed,
        pt.heading,
        pt.ign,
        `Route Waypoint #${idx + 1}, Pune Highway Corridor`,
        minutesAgo
      );
    });

    console.log('[Axona DB] Seeded historical GPS playback waypoints successfully.');
  } catch (e) {
    console.warn('GPS history seed error:', e.message);
  }
}

// Seed Driver Intelligence (Harsh Braking, Harsh Acceleration, Vehicle Tilt, Rash Driving, Overspeeding)
function seedDriverIntelligence(db) {
  try {
    // 1. Create tables if not existing
    db.exec(`
      CREATE TABLE IF NOT EXISTS driver_intelligence_events (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          vehicle_id TEXT NOT NULL,
          device_id TEXT,
          event_type TEXT NOT NULL,
          packet_type TEXT NOT NULL,
          alert_id INTEGER NOT NULL,
          severity TEXT NOT NULL DEFAULT 'WARNING',
          metric_value TEXT NOT NULL,
          threshold_value TEXT NOT NULL,
          speed REAL DEFAULT 0,
          heading REAL DEFAULT 0,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          address TEXT,
          driver_name TEXT,
          event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants(id),
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS device_imu_configs (
          device_id TEXT PRIMARY KEY,
          harsh_brake_threshold REAL DEFAULT 0.55,
          harsh_accel_threshold REAL DEFAULT 0.43,
          tilt_angle_threshold REAL DEFAULT 45.0,
          rash_turning_speed REAL DEFAULT 30.0,
          harsh_turning_g REAL DEFAULT 0.47,
          motion_threshold REAL DEFAULT 0.05,
          speed_limit REAL DEFAULT 70.0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Seed default IMU configurations for registered GPS devices (tnavIC AIS-140 standard defaults)
    const devices = ['dev_101', 'dev_102', 'dev_103', 'dev_104', 'dev_105', 'dev_106', 'dev_107'];
    const imuStmt = db.prepare(`
      INSERT OR IGNORE INTO device_imu_configs 
      (device_id, harsh_brake_threshold, harsh_accel_threshold, tilt_angle_threshold, rash_turning_speed, harsh_turning_g, motion_threshold, speed_limit)
      VALUES (?, 0.55, 0.43, 45.0, 30.0, 0.47, 0.05, 70.0)
    `);
    for (const d of devices) {
      imuStmt.run(d);
    }

    // 3. Seed realistic events if empty
    const countCheck = db.prepare('SELECT COUNT(*) as cnt FROM driver_intelligence_events').get();
    if (countCheck && countCheck.cnt > 0) return;

    const sampleEvents = [
      // 1. Harsh Braking (HB / Alert ID 13 / HBT 0.55g)
      { id: 'die_1', tId: 'tenant_apex', vId: 'veh_1', dId: 'dev_101', type: 'HARSH_BRAKING', pkt: 'HB', aId: 13, sev: 'WARNING', val: '-0.68g deceleration', th: '0.55g (HBT)', spd: 48.0, hdg: 85, lat: 18.5980, lon: 73.7440, addr: 'Near Wakad Flyover, NH-48 Bypass, Pune', drv: 'Vikram Singh', time: '-25 minutes' },
      { id: 'die_2', tId: 'tenant_apex', vId: 'veh_2', dId: 'dev_102', type: 'HARSH_BRAKING', pkt: 'HB', aId: 13, sev: 'CRITICAL', val: '-0.74g sudden lockup', th: '0.55g (HBT)', spd: 62.5, hdg: 140, lat: 18.9320, lon: 72.8410, addr: 'Dock Approach Road, Mumbai Port Terminal', drv: 'Suresh Patil', time: '-3 hours' },
      { id: 'die_3', tId: 'tenant_apex', vId: 'veh_4', dId: 'dev_104', type: 'HARSH_BRAKING', pkt: 'HB', aId: 13, sev: 'WARNING', val: '-0.59g rapid brake', th: '0.55g (HBT)', spd: 54.0, hdg: 170, lat: 18.5280, lon: 73.8380, addr: 'Shivajinagar Junction, Pune', drv: 'Santosh Pawar', time: '-1 days' },
      { id: 'die_4', tId: 'tenant_apex', vId: 'veh_1', dId: 'dev_101', type: 'HARSH_BRAKING', pkt: 'HB', aId: 13, sev: 'WARNING', val: '-0.64g deceleration', th: '0.55g (HBT)', spd: 58.2, hdg: 120, lat: 18.6298, lon: 73.7997, addr: 'Old Mumbai-Pune Highway, Nigdi', drv: 'Vikram Singh', time: '-12 days' },
      { id: 'die_5', tId: 'tenant_apex', vId: 'veh_3', dId: 'dev_103', type: 'HARSH_BRAKING', pkt: 'HB', aId: 13, sev: 'WARNING', val: '-0.61g stop', th: '0.55g (HBT)', spd: 45.0, hdg: 90, lat: 18.5590, lon: 73.7780, addr: 'Baner Main Road, Pune', drv: 'Amit Deshmukh', time: '-48 days' },

      // 2. Harsh Acceleration (HA / Alert ID 14 / HAT 0.43g)
      { id: 'die_6', tId: 'tenant_apex', vId: 'veh_1', dId: 'dev_101', type: 'HARSH_ACCEL', pkt: 'HA', aId: 14, sev: 'WARNING', val: '+0.54g acceleration', th: '0.43g (HAT)', spd: 38.5, hdg: 80, lat: 18.5912, lon: 73.7389, addr: 'Hinjawadi Phase 2 Traffic Light Exit, Pune', drv: 'Vikram Singh', time: '-45 minutes' },
      { id: 'die_7', tId: 'tenant_apex', vId: 'veh_4', dId: 'dev_104', type: 'HARSH_ACCEL', pkt: 'HA', aId: 14, sev: 'CRITICAL', val: '+0.61g rapid surge', th: '0.43g (HAT)', spd: 52.0, hdg: 155, lat: 18.5440, lon: 73.8050, addr: 'Aundh Ravet BRTS Corridor, Pune', drv: 'Santosh Pawar', time: '-4 hours' },
      { id: 'die_8', tId: 'tenant_apex', vId: 'veh_2', dId: 'dev_102', type: 'HARSH_ACCEL', pkt: 'HA', aId: 14, sev: 'WARNING', val: '+0.48g throttle pull', th: '0.43g (HAT)', spd: 42.0, hdg: 110, lat: 19.0760, lon: 72.8777, addr: 'Sion-Panvel Expressway, Navi Mumbai', drv: 'Suresh Patil', time: '-2 days' },
      { id: 'die_9', tId: 'tenant_rahul', vId: 'veh_7', dId: 'dev_107', type: 'HARSH_ACCEL', pkt: 'HA', aId: 14, sev: 'WARNING', val: '+0.49g pickup', th: '0.43g (HAT)', spd: 46.0, hdg: 65, lat: 12.9760, lon: 77.6010, addr: 'MG Road Junction, Bengaluru', drv: 'Rahul Sharma', time: '-6 days' },
      { id: 'die_10', tId: 'tenant_apex', vId: 'veh_1', dId: 'dev_101', type: 'HARSH_ACCEL', pkt: 'HA', aId: 14, sev: 'WARNING', val: '+0.47g acceleration', th: '0.43g (HAT)', spd: 40.0, hdg: 45, lat: 18.6080, lon: 73.7740, addr: 'Bhumkar Chowk, Pune', drv: 'Vikram Singh', time: '-28 days' },

      // 3. Vehicle Tilt (TI / Alert ID 22 / TA 45.0°)
      { id: 'die_11', tId: 'tenant_apex', vId: 'veh_2', dId: 'dev_102', type: 'VEHICLE_TILT', pkt: 'TI', aId: 22, sev: 'CRITICAL', val: '49.8° Roll Angle', th: '45.0° (TA)', spd: 22.0, hdg: 215, lat: 18.9410, lon: 72.8390, addr: 'Port Container Ramp Sloped Incline, Mumbai', drv: 'Suresh Patil', time: '-5 hours' },
      { id: 'die_12', tId: 'tenant_apex', vId: 'veh_1', dId: 'dev_101', type: 'VEHICLE_TILT', pkt: 'TI', aId: 22, sev: 'CRITICAL', val: '47.2° Lateral Tilt', th: '45.0° (TA)', spd: 18.5, hdg: 310, lat: 18.6320, lon: 73.8010, addr: 'Nigdi Heavy Depot Unloading Bay Bank', drv: 'Vikram Singh', time: '-4 days' },
      { id: 'die_13', tId: 'tenant_apex', vId: 'veh_6', dId: 'dev_106', type: 'VEHICLE_TILT', pkt: 'TI', aId: 22, sev: 'CRITICAL', val: '51.4° Dangerous Camber', th: '45.0° (TA)', spd: 14.0, hdg: 175, lat: 18.5089, lon: 73.9260, addr: 'Hadapsar Flyover Construction Slope, Pune', drv: 'Pradeep Mane', time: '-65 days' },

      // 4. Rash Driving (RT / Alert ID 15 / RTT 30 km/h & HTA 0.47g)
      { id: 'die_14', tId: 'tenant_apex', vId: 'veh_1', dId: 'dev_101', type: 'RASH_DRIVING', pkt: 'RT', aId: 15, sev: 'WARNING', val: '44 km/h (0.52g lateral swerve)', th: '30 km/h / 0.47g (RTT/HTA)', spd: 44.0, hdg: 60, lat: 18.6015, lon: 73.7620, addr: 'Chinchwad Rotary Interchange, Pune', drv: 'Vikram Singh', time: '-1 hours' },
      { id: 'die_15', tId: 'tenant_apex', vId: 'veh_4', dId: 'dev_104', type: 'RASH_DRIVING', pkt: 'RT', aId: 15, sev: 'CRITICAL', val: '48 km/h (0.58g sharp drift)', th: '30 km/h / 0.47g (RTT/HTA)', spd: 48.0, hdg: 135, lat: 18.5520, lon: 73.7900, addr: 'Pashan Circle Roundabout, Pune', drv: 'Santosh Pawar', time: '-18 hours' },
      { id: 'die_16', tId: 'tenant_apex', vId: 'veh_2', dId: 'dev_102', type: 'RASH_DRIVING', pkt: 'RT', aId: 15, sev: 'WARNING', val: '39 km/h (0.49g sharp swerve)', th: '30 km/h / 0.47g (RTT/HTA)', spd: 39.0, hdg: 220, lat: 18.9220, lon: 72.8347, addr: 'Ballard Pier Sharp Corner, Mumbai', drv: 'Suresh Patil', time: '-3 days' },
      { id: 'die_17', tId: 'tenant_rahul', vId: 'veh_7', dId: 'dev_107', type: 'RASH_DRIVING', pkt: 'RT', aId: 15, sev: 'WARNING', val: '38 km/h (0.48g rapid cut)', th: '30 km/h / 0.47g (RTT/HTA)', spd: 38.0, hdg: 90, lat: 12.9880, lon: 77.6220, addr: 'Indiranagar 100ft Road U-Turn, Bengaluru', drv: 'Rahul Sharma', time: '-8 days' },
      { id: 'die_18', tId: 'tenant_apex', vId: 'veh_3', dId: 'dev_103', type: 'RASH_DRIVING', pkt: 'RT', aId: 15, sev: 'WARNING', val: '41 km/h (0.50g lateral turn)', th: '30 km/h / 0.47g (RTT/HTA)', spd: 41.0, hdg: 220, lat: 18.5912, lon: 73.7389, addr: 'Hinjawadi Phase 1 Circle, Pune', drv: 'Amit Deshmukh', time: '-42 days' },

      // 5. Overspeeding (OS / Alert ID 17 / SL 70 km/h)
      { id: 'die_19', tId: 'tenant_apex', vId: 'veh_1', dId: 'dev_101', type: 'OVERSPEEDING', pkt: 'OS', aId: 17, sev: 'WARNING', val: '78.5 km/h', th: '65.0 km/h (SL)', spd: 78.5, hdg: 70, lat: 18.5960, lon: 73.7510, addr: 'NH-48 Katraj-Dehu Road Bypass, Pune', drv: 'Vikram Singh', time: '-15 minutes' },
      { id: 'die_20', tId: 'tenant_apex', vId: 'veh_4', dId: 'dev_104', type: 'OVERSPEEDING', pkt: 'OS', aId: 17, sev: 'CRITICAL', val: '86.4 km/h', th: '65.0 km/h (SL)', spd: 86.4, hdg: 120, lat: 18.5590, lon: 73.7780, addr: 'Pune-Bangalore Highway Corridor', drv: 'Santosh Pawar', time: '-2 hours' },
      { id: 'die_21', tId: 'tenant_apex', vId: 'veh_2', dId: 'dev_102', type: 'OVERSPEEDING', pkt: 'OS', aId: 17, sev: 'WARNING', val: '76.0 km/h', th: '65.0 km/h (SL)', spd: 76.0, hdg: 170, lat: 18.9100, lon: 72.8250, addr: 'Eastern Freeway High Speed Section, Mumbai', drv: 'Suresh Patil', time: '-2 days' },
      { id: 'die_22', tId: 'tenant_rahul', vId: 'veh_7', dId: 'dev_107', type: 'OVERSPEEDING', pkt: 'OS', aId: 17, sev: 'CRITICAL', val: '92.0 km/h', th: '80.0 km/h (SL)', spd: 92.0, hdg: 75, lat: 12.9820, lon: 77.6100, addr: 'Outer Ring Road Elevated Expressway, Bengaluru', drv: 'Rahul Sharma', time: '-5 days' },
      { id: 'die_23', tId: 'tenant_apex', vId: 'veh_1', dId: 'dev_101', type: 'OVERSPEEDING', pkt: 'OS', aId: 17, sev: 'WARNING', val: '81.2 km/h', th: '65.0 km/h (SL)', spd: 81.2, hdg: 60, lat: 18.6015, lon: 73.7620, addr: 'Akurdi Expressway Connector, Pune', drv: 'Vikram Singh', time: '-21 days' },
      { id: 'die_24', tId: 'tenant_apex', vId: 'veh_3', dId: 'dev_103', type: 'OVERSPEEDING', pkt: 'OS', aId: 17, sev: 'WARNING', val: '79.0 km/h', th: '70.0 km/h (SL)', spd: 79.0, hdg: 180, lat: 18.5204, lon: 73.8567, addr: 'Swargate Flyover Bypass, Pune', drv: 'Amit Deshmukh', time: '-72 days' },
      { id: 'die_25', tId: 'tenant_apex', vId: 'veh_2', dId: 'dev_102', type: 'OVERSPEEDING', pkt: 'OS', aId: 17, sev: 'WARNING', val: '74.5 km/h', th: '65.0 km/h (SL)', spd: 74.5, hdg: 140, lat: 18.9320, lon: 72.8410, addr: 'Mumbai Port Express Link', drv: 'Suresh Patil', time: '-85 days' }
    ];

    const insStmt = db.prepare(`
      INSERT INTO driver_intelligence_events
      (id, tenant_id, vehicle_id, device_id, event_type, packet_type, alert_id, severity, metric_value, threshold_value, speed, heading, latitude, longitude, address, driver_name, event_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
    `);

    for (const ev of sampleEvents) {
      insStmt.run(ev.id, ev.tId, ev.vId, ev.dId, ev.type, ev.pkt, ev.aId, ev.sev, ev.val, ev.th, ev.spd, ev.hdg, ev.lat, ev.lon, ev.addr, ev.drv, ev.time, ev.time);
    }
    console.log(`[Axona DB] Seeded ${sampleEvents.length} Driver Intelligence behavior events (Harsh Braking, Accel, Tilt, Rash Driving, Overspeeding).`);
  } catch (err) {
    console.warn('[Axona DB] Driver intelligence seed error:', err.message);
  }
}


export const db = {
  query(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    return stmt.all(...params);
  },

  get(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    return stmt.get(...params);
  },

  run(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    return stmt.run(...params);
  },

  exec(sql) {
    const database = getDatabase();
    return database.exec(sql);
  }
};

export default db;
