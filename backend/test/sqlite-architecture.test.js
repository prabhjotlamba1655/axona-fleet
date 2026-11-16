/**
 * Run with: npm test
 * NODE_ENV=test is set by the npm script before this file loads so the
 * suite can never open the development or production database.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { after, afterEach, beforeEach, describe, test } from 'node:test';
import { createFirstAdministrator, loginWithPassword } from '../src/core/accounts.js';
import { crc16Ibm, takeAvlPacket } from '../src/core/adapters/teltonikaCodec8.js';
import { greenDrivingAlert } from '../src/core/adapters/teltonikaAdapter.js';
import { rankLeaderboard, riskTier, safetyScore } from '../src/core/driverScore.js';
import { validateImuConfig } from '../src/core/imuBounds.js';
import { nextOverspeedState } from '../src/core/overspeedSession.js';
import { markStoppages } from '../src/core/stoppages.js';
import { APPROVED_SMS_TEXT, interpretSmsResponse, normalizeSmsMobile, quickSmsFields, readSmsConfig } from '../src/core/smsGateway.js';
import { istMidnightUtcStamp } from '../src/core/istTime.js';
import { buildTablePdf } from '../src/core/simplePdf.js';
import { sessionsFromHistory } from '../src/core/tripSessions.js';
import GeofenceService, { calculateDistanceMeters, isPointInPolygon } from '../src/services/geofenceService.js';
import { getConfig } from '../src/config/index.js';
import { frameSentence } from '../src/core/canonicalTelemetry.js';
import { ingestTelemetry } from '../src/core/ingestPipeline.js';
import { startTeltonikaTcpServer, stopTeltonikaTcpServer } from '../src/services/teltonikaTcpServer.js';
import { acquireWriterLock } from '../src/core/writerLock.js';
import { withImmediateTransaction } from '../src/core/transaction.js';
import { createConsistentSnapshot } from '../src/db/backup.js';
import db from '../src/db/database.js';
import { setupTestDatabase, teardownTestDatabase } from '../src/db/testHarness.js';

function seedFixture() {
  db.run(`INSERT INTO tenants (id, name, tenant_type, email) VALUES ('tenant_test', 'Test Fleet', 'company', 'test@axona.local')`);
  db.run(`INSERT INTO vehicle_categories (id, code, name) VALUES ('cat_truck', 'truck', 'Truck')`);
  db.run(`INSERT INTO device_manufacturers (id, name, code, protocol) VALUES ('mfg_ais', 'Axona', 'ais140_generic', 'TCP'), ('mfg_tel', 'Teltonika', 'teltonika', 'TCP')`);
  db.run(`
    INSERT INTO gps_devices (id, tenant_id, imei, manufacturer_id, model)
    VALUES
      ('dev_101', 'tenant_test', '864201045892110', 'mfg_ais', 'AX-140'),
      ('dev_tel', 'tenant_test', '864201045892112', 'mfg_tel', 'FMC130')
  `);
  db.run(`
    INSERT INTO vehicles (
      id, tenant_id, registration_number, category_id, make, model,
      owner_name, owner_phone, emergency_contact_phone, device_id, speed_limit
    ) VALUES
      ('veh_1', 'tenant_test', 'MH-12-RN-2024', 'cat_truck', 'Tata', 'Prima', 'Apex', '999', '998', 'dev_101', 65),
      ('veh_tel', 'tenant_test', 'MH-14-GH-5566', 'cat_truck', 'Leyland', 'Viking', 'Apex', '999', '998', 'dev_tel', 70)
  `);
}

function navicSample() {
  const rmc = frameSentence('GNRMC,143000.00,A,1835.4720,N,07344.3340,E,29.70,85.0,131126,,,A');
  const gga = frameSentence('GNGGA,143000.00,1835.4720,N,07344.3340,E,1,14,0.8,560.0,M,0.0,M,,');
  return `${rmc}\n${gga}`;
}

describe('embedded sqlite architecture', { concurrency: false }, () => {
  beforeEach(() => {
    setupTestDatabase();
    seedFixture();
  });

  afterEach(() => {
    teardownTestDatabase();
  });

  after(() => {
    const config = getConfig();
    assert.equal(fs.existsSync(config.databasePath), false);
    assert.equal(fs.existsSync(config.lockPath), false);
  });

  test('test mode ignores STORAGE_PATH and uses test.db', () => {
    const previous = process.env.STORAGE_PATH;
    process.env.STORAGE_PATH = '/var/lib/axona/data/prod.db';
    try {
      const config = getConfig();
      assert.equal(config.nodeEnv, 'test');
      assert.equal(path.basename(config.databasePath), 'test.db');
      assert.equal(config.databasePath.includes(`${path.sep}data${path.sep}test${path.sep}`), true);
      assert.equal(config.seedDemoData, false);
    } finally {
      if (previous == null) delete process.env.STORAGE_PATH;
      else process.env.STORAGE_PATH = previous;
    }
  });

  test('production requires STORAGE_PATH and test mode does not open that file', () => {
    const previousEnv = process.env.NODE_ENV;
    const previousPath = process.env.STORAGE_PATH;
    delete process.env.STORAGE_PATH;
    process.env.NODE_ENV = 'production';
    try {
      assert.throws(() => getConfig(), /STORAGE_PATH is required/);
      process.env.STORAGE_PATH = '/var/lib/axona/data/prod.db';
      assert.equal(getConfig().seedDemoData, false);
    } finally {
      process.env.NODE_ENV = previousEnv;
      if (previousPath == null) delete process.env.STORAGE_PATH;
      else process.env.STORAGE_PATH = previousPath;
    }
  });

  test('connection uses WAL, NORMAL synchronous, and an exclusive writer lock', () => {
    const journal = db.get('PRAGMA journal_mode');
    const synchronous = db.get('PRAGMA synchronous');
    assert.equal(journal.journal_mode, 'wal');
    assert.equal(Number(synchronous.synchronous), 1);
    assert.equal(fs.existsSync(getConfig().lockPath), true);
    assert.throws(() => acquireWriterLock(getConfig().lockPath), /writer\.lock/);
  });

  test('rolls back a failed immediate transaction', () => {
    assert.throws(() => {
      withImmediateTransaction(() => {
        db.run(`
          INSERT INTO raw_packet_logs (imei, packet_type, raw_payload, is_valid)
          VALUES ('rollback-imei', 'TEST', 'partial', 1)
        `);
        throw new Error('boom');
      });
    }, /boom/);

    const row = db.get(`SELECT id FROM raw_packet_logs WHERE imei = ?`, ['rollback-imei']);
    assert.equal(row, undefined);
  });

  test('NavIC NMEA commits canonical telemetry before ACK', () => {
    const result = ingestTelemetry({
      protocol: 'navic-nmea',
      imei: '864201045892110',
      packet: navicSample()
    }, { transport: 'TEST' });

    assert.equal(result.status, 'PROCESSED');
    assert.equal(result.committed, true);
    assert.equal(result.persisted, true);
    assert.equal(result.protocol, 'navic-nmea');
    assert.match(result.ack, /^\$ACK,864201045892110,SUCCESS\*/);
    assert.equal(result.canonical.schema, 'axona.telemetry.v1');
    assert.equal(result.latitude, 18.5912);
    assert.equal(result.longitude, 73.7389);
    assert.equal(result.speed, 55);

    const stored = db.get(`
      SELECT latitude, longitude, speed, gps_time FROM latest_vehicle_locations WHERE vehicle_id = 'veh_1'
    `);
    assert.equal(stored.latitude, 18.5912);
    assert.equal(stored.longitude, 73.7389);
    assert.equal(stored.speed, 55);
    assert.match(stored.gps_time, /2026-11-13 14:30:00/);

    const log = db.get(`SELECT canonical_json, is_valid FROM raw_packet_logs WHERE imei = ? ORDER BY id DESC LIMIT 1`, ['864201045892110']);
    assert.equal(log.is_valid, 1);
    assert.equal(JSON.parse(log.canonical_json).protocol, 'navic-nmea');

    const duplicate = ingestTelemetry({
      protocol: 'navic-nmea',
      imei: '864201045892110',
      packet: navicSample()
    });
    assert.equal(duplicate.status, 'DUPLICATE_IGNORED');
    assert.equal(duplicate.committed, true);
    assert.equal(duplicate.persisted, false);
    const history = db.get(`SELECT COUNT(*) AS cnt FROM gps_location_history WHERE vehicle_id = 'veh_1'`);
    assert.equal(history.cnt, 1);
  });

  test('JSON and Teltonika payloads normalize into the same tables', () => {
    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.6,
      longitude: 73.75,
      speedKmh: 90,
      heading: 80,
      ignition: 1,
      satellites: 11,
      gpsTime: '2026-11-15T10:00:00Z'
    });
    const jsonResult = ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.61,
      longitude: 73.75,
      speedKmh: 90,
      heading: 80,
      ignition: 1,
      satellites: 11,
      gpsTime: '2026-11-15T10:00:06Z'
    });
    assert.equal(jsonResult.status, 'PROCESSED');
    assert.equal(jsonResult.canonical.protocol, 'json');
    assert.equal(jsonResult.movementStatus, 'moving');

    const speeding = db.get(`SELECT speed, speed_limit FROM speed_alerts WHERE vehicle_id = 'veh_1'`);
    assert.equal(speeding.speed, 90);
    assert.equal(speeding.speed_limit, 65);
    const speedNote = db.get(`SELECT notification_type FROM notifications WHERE vehicle_id = 'veh_1' AND notification_type = 'overspeed'`);
    assert.equal(speedNote.notification_type, 'overspeed');
    const speedEvent = db.get(`SELECT event_type, packet_type, alert_id FROM driver_intelligence_events WHERE vehicle_id = 'veh_1' AND event_type = 'OVERSPEEDING'`);
    assert.equal(speedEvent.event_type, 'OVERSPEEDING');
    assert.equal(speedEvent.packet_type, 'OS');
    assert.equal(speedEvent.alert_id, 17);

    const teltonika = ingestTelemetry({
      protocol: 'teltonika',
      imei: '864201045892112',
      lat: 18.52,
      lng: 73.85,
      speed: 32,
      angle: 220,
      sat: 9,
      io: { ignition: 1 }
    });
    assert.equal(teltonika.status, 'PROCESSED');
    assert.equal(teltonika.protocol, 'teltonika');
    assert.equal(teltonika.vehicle_id, 'veh_tel');
    assert.equal(teltonika.ignition, 1);

    const codec = ingestTelemetry('CODEC8:00000000');
    assert.equal(codec.status, 'REJECTED');
    assert.equal(codec.code, 'ADAPTER_NOT_IMPLEMENTED');
    assert.equal(codec.committed, true);
    assert.match(codec.ack, /^\$NAK,/);
  });

  test('driver intelligence scores, Teltonika green driving, and overspeed stay consistent', () => {
    assert.equal(safetyScore({ harshBraking: 1, harshAccel: 1, rashDriving: 1, overspeeding: 1 }), 89);
    assert.equal(safetyScore({ overspeeding: 1, overspeedPenalty: 5 }), 95);
    assert.equal(validateImuConfig({ harshBrake: 0.1, harshAccel: 0.43, tiltAngle: 45, rashTurning: 30, harshTurning: 0.47, speedLimit: 70 }).ok, false);
    assert.equal(nextOverspeedState({ speed: 90, limit: 65, gpsTime: '2026-11-15T10:00:00Z', latitude: 18, longitude: 73, open: null, arming: null }).action, 'arm');
    assert.equal(safetyScore({ vehicleTilt: 1 }), 90);
    assert.equal(riskTier(90, 1), 'High Risk');
    assert.equal(riskTier(100, 0), 'Safe');
    assert.equal(greenDrivingAlert({ 253: 2, 254: 70 }).eventType, 'HARSH_BRAKING');
    assert.equal(greenDrivingAlert({ 253: 2, 254: 70 }).metricValue, '-0.70g deceleration');
    assert.equal(greenDrivingAlert({ 253: 0 }), null);

    const ranked = rankLeaderboard([
      { vehicle_id: 'a', registration_number: 'A', make: 'Tata', model: 'Nexon', owner_name: 'A', total_violations: 1, vehicle_tilt_count: 1 },
      { vehicle_id: 'b', registration_number: 'B', make: 'Tata', model: 'Nexon', owner_name: 'B', total_violations: 4, overspeeding_count: 4 }
    ]);
    assert.equal(ranked[0].registrationNumber, 'B');
    assert.equal(ranked[0].safetyScore, 92);
    assert.equal(ranked[1].registrationNumber, 'A');
    assert.equal(ranked[1].riskTier, 'High Risk');
    assert.equal(ranked[1].rank, 2);

    const brake = ingestTelemetry('$ALT,TNOWTN,1.2.0,HB,13,L,864201045892110,MH-12-RN-2024,1,15112026,120000,18.600000,N,073.750000,E,40.0,90.0,14,560,0.8,0.9,Airtel,1');
    assert.equal(brake.driverIntelligenceEventCreated.eventType, 'HARSH_BRAKING');
    assert.equal(brake.driverIntelligenceEventCreated.alertId, 13);

    const corner = ingestTelemetry({
      protocol: 'teltonika',
      imei: '864201045892112',
      latitude: 18.53,
      longitude: 73.86,
      speed: 32,
      angle: 10,
      io: { 239: 1, 253: 3, 254: 55 }
    });
    assert.equal(corner.driverIntelligenceEventCreated.eventType, 'RASH_DRIVING');
    assert.equal(corner.ignition, 1);

    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.61,
      longitude: 73.76,
      speedKmh: 90,
      ignition: 1,
      gpsTime: '2026-11-15T11:00:00Z'
    });
    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.62,
      longitude: 73.77,
      speedKmh: 95,
      ignition: 1,
      gpsTime: '2026-11-15T11:00:06Z'
    });
    const overspeed = db.get(`SELECT COUNT(*) as count FROM driver_intelligence_events WHERE vehicle_id = 'veh_1' AND event_type = 'OVERSPEEDING'`);
    assert.equal(overspeed.count, 1);

    const shared = ingestTelemetry({
      protocol: 'json',
      imei: '864201045892112',
      latitude: 18.7,
      longitude: 73.8,
      speedKmh: 42,
      ignition: 1,
      brakeG: 0.7
    });
    assert.equal(shared.driverIntelligenceEventCreated.eventType, 'HARSH_BRAKING');
    const below = ingestTelemetry({
      protocol: 'json',
      imei: '864201045892112',
      latitude: 18.71,
      longitude: 73.81,
      speedKmh: 42,
      ignition: 1,
      brakeG: 0.4
    });
    assert.equal(below.driverIntelligenceEventCreated, null);

    db.run(`INSERT INTO device_imu_configs (device_id, harsh_brake_threshold) VALUES ('dev_101', 0.9)`);
    const raised = ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.72,
      longitude: 73.82,
      speedKmh: 40,
      ignition: 1,
      longitudinalG: -0.7
    });
    assert.equal(raised.driverIntelligenceEventCreated, null);

    const named = ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.73,
      longitude: 73.83,
      speedKmh: 30,
      ignition: 1,
      event: 'harsh acceleration'
    });
    assert.equal(named.driverIntelligenceEventCreated.eventType, 'HARSH_ACCEL');

    const axes = ingestTelemetry({
      protocol: 'teltonika',
      imei: '864201045892112',
      latitude: 18.74,
      longitude: 73.84,
      speed: 36,
      io: { 17: -100, 18: 520, 19: 980 }
    });
    assert.equal(axes.driverIntelligenceEventCreated.eventType, 'RASH_DRIVING');

    const osFirst = ingestTelemetry('$ALT,TNOWTN,1.2.0,OS,17,L,864201045892112,MH-14-GH-5566,1,15112026,120200,18.540000,N,073.870000,E,88.0,20.0,12,560,0.8,0.9,Airtel,1');
    assert.equal(osFirst.driverIntelligenceEvents.length, 0);
    const osPacket = ingestTelemetry('$ALT,TNOWTN,1.2.0,OS,17,L,864201045892112,MH-14-GH-5566,1,15112026,120208,18.541000,N,073.871000,E,88.0,20.0,12,560,0.8,0.9,Airtel,1');
    assert.equal(osPacket.driverIntelligenceEvents.length, 1);
    assert.equal(osPacket.driverIntelligenceEvents[0].eventType, 'OVERSPEEDING');
  });

  test('a position without behavior sensors still commits and leaves the score untouched', () => {
    const jsonOnly = ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.81,
      longitude: 73.91,
      acceleration: 'n/a',
      tilt: 'unknown',
      brakeG: 'fast'
    });
    assert.equal(jsonOnly.status, 'PROCESSED');
    assert.equal(jsonOnly.driverIntelligenceEventCreated, null);
    assert.equal(jsonOnly.speed, 0);

    const teltonikaOnly = ingestTelemetry({
      protocol: 'teltonika',
      imei: '864201045892112',
      latitude: 18.82,
      longitude: 73.92,
      io: null
    });
    assert.equal(teltonikaOnly.status, 'PROCESSED');
    assert.equal(teltonikaOnly.driverIntelligenceEventCreated, null);

    const named = rankLeaderboard([
      { vehicle_id: 'bare', registration_number: 'BARE', make: null, model: null, owner_name: null }
    ]);
    assert.equal(named[0].vehicleName, 'Vehicle');
    assert.equal(named[0].driverName, 'Assigned Driver');
    assert.equal(named[0].safetyScore, 100);

    const stored = db.get(`SELECT latitude, speed FROM latest_vehicle_locations WHERE vehicle_id = 'veh_1'`);
    assert.equal(stored.latitude, 18.81);
    assert.equal(stored.speed, 0);
    const events = db.get(`SELECT COUNT(*) AS count FROM driver_intelligence_events`);
    assert.equal(events.count, 0);
  });

  test('towing, one overspeed episode, and stoppages use the written rules', () => {
    const towed = ingestTelemetry({
      protocol: 'json',
      imei: '864201045892112',
      latitude: 18.9,
      longitude: 73.9,
      speedKmh: 8,
      ignition: 0
    });
    assert.equal(towed.movementStatus, 'towing');
    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892112',
      latitude: 18.91,
      longitude: 73.91,
      speedKmh: 9,
      ignition: 0
    });
    const towing = db.get(`SELECT COUNT(*) as count, MAX(is_open) as open FROM towing_alerts WHERE vehicle_id = 'veh_tel'`);
    assert.equal(towing.count, 1);
    assert.equal(towing.open, 1);

    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.2,
      longitude: 73.2,
      speedKmh: 90,
      ignition: 1,
      gpsTime: '2026-11-15T10:00:00Z'
    });
    const armedOnly = db.get(`SELECT COUNT(*) as count FROM speed_alerts WHERE vehicle_id = 'veh_1'`);
    assert.equal(armedOnly.count, 0);
    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.21,
      longitude: 73.21,
      speedKmh: 100,
      ignition: 1,
      gpsTime: '2026-11-15T10:00:06Z'
    });
    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.22,
      longitude: 73.22,
      speedKmh: 20,
      ignition: 1,
      gpsTime: '2026-11-15T10:08:00Z'
    });
    const stillOpen = db.get(`SELECT is_open FROM speed_alerts WHERE vehicle_id = 'veh_1'`);
    assert.equal(stillOpen.is_open, 1);
    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.23,
      longitude: 73.23,
      speedKmh: 18,
      ignition: 1,
      gpsTime: '2026-11-15T10:08:11Z'
    });
    const episode = db.get(`SELECT COUNT(*) as count, MAX(max_speed) as peak, MAX(is_open) as open, MAX(distance_km) as distance, MAX(severity) as severity FROM speed_alerts WHERE vehicle_id = 'veh_1'`);
    assert.equal(episode.count, 1);
    assert.equal(episode.peak, 100);
    assert.equal(episode.open, 0);
    assert.equal(episode.severity, 'CRITICAL');
    assert.ok(episode.distance > 0);
    const sms = db.get(`SELECT status FROM alert_dispatches WHERE vehicle_id = 'veh_1' AND channel = 'sms'`);
    assert.equal(sms.status, 'pending_config');

    const stops = markStoppages([
      { speed: 0, ignition: 0, gps_time: '2026-11-15 10:00:00' },
      { speed: 0, ignition: 0, gps_time: '2026-11-15 10:04:00' },
      { speed: 10, ignition: 1, gps_time: '2026-11-15 10:05:00' },
      { speed: 0, ignition: 0, gps_time: '2026-11-15 10:06:00' }
    ]);
    const parked = markStoppages([
      { speed: 2, ignition: 0, gps_time: '2026-11-15 10:10:00' },
      { speed: 1, ignition: 0, gps_time: '2026-11-15 10:13:00' },
      { speed: 20, ignition: 1, gps_time: '2026-11-15 10:14:00' }
    ]);
    const engineOn = markStoppages([
      { speed: 1, ignition: 1, gps_time: '2026-11-15 11:00:00' },
      { speed: 0, ignition: 1, gps_time: '2026-11-15 11:04:00' }
    ]);
    const sessions = sessionsFromHistory([
      { vehicle_id: 'veh_1', latitude: 28.59, longitude: 77.38, speed: 10, gps_time: '2026-11-15 10:00:00' },
      { vehicle_id: 'veh_1', latitude: 28.60, longitude: 77.39, speed: 20, gps_time: '2026-11-15 10:10:00' },
      { vehicle_id: 'veh_1', latitude: 28.70, longitude: 77.50, speed: 30, gps_time: '2026-11-15 12:00:00' },
      { vehicle_id: 'veh_1', latitude: 28.71, longitude: 77.51, speed: 15, gps_time: '2026-11-15 12:05:00' }
    ]);
    assert.equal(sessions.length, 2);
    assert.equal(stops[0].is_stop, 1);
    assert.equal(stops[0].stop_duration_min, 4);
    assert.equal(stops[3].is_stop, 0);
    assert.equal(parked[0].is_stop, 1);
    assert.equal(parked[0].stop_duration_min, 3);
    assert.equal(engineOn[0].is_stop, 0);
    const noisyPark = markStoppages([
      { speed: 16, ignition: 0, latitude: 28.6, longitude: 77.38, gps_time: '2026-11-15 18:17:00' },
      { speed: 12, ignition: 0, latitude: 28.6001, longitude: 77.3801, gps_time: '2026-11-15 19:50:00' },
      { speed: 40, ignition: 1, latitude: 28.61, longitude: 77.4, gps_time: '2026-11-15 19:52:00' }
    ]);
    assert.equal(noisyPark[0].is_stop, 1);
    assert.equal(noisyPark[0].stop_duration_min, 93);
    const departed = sessionsFromHistory([
      { vehicle_id: 'veh_1', latitude: 28.6, longitude: 77.38, speed: 16, ignition: 0, gps_time: '2026-11-15 18:17:00' },
      { vehicle_id: 'veh_1', latitude: 28.6001, longitude: 77.3801, speed: 12, ignition: 0, gps_time: '2026-11-15 18:22:00' },
      { vehicle_id: 'veh_1', latitude: 28.6001, longitude: 77.3801, speed: 8, ignition: 0, gps_time: '2026-11-15 18:27:00' },
      { vehicle_id: 'veh_1', latitude: 28.61, longitude: 77.4, speed: 40, ignition: 1, gps_time: '2026-11-15 18:30:00' },
      { vehicle_id: 'veh_1', latitude: 28.7, longitude: 77.5, speed: 50, ignition: 1, gps_time: '2026-11-15 18:40:00' }
    ]);
    assert.equal(departed.length, 1);
    assert.equal(departed[0].start_time, '2026-11-15 18:30:00');
    assert.equal(departed[0].duration_minutes, 10);
    assert.equal(departed[0].stoppage_minutes, 0);
    const sitting = sessionsFromHistory([
      { vehicle_id: 'veh_1', latitude: 28.6, longitude: 77.38, speed: 0, ignition: 1, gps_time: '2026-11-15 07:44:00' },
      { vehicle_id: 'veh_1', latitude: 28.6, longitude: 77.38, speed: 0, ignition: 1, gps_time: '2026-11-15 10:36:00' }
    ]);
    assert.equal(sitting.length, 0);
  });

  test('NavIC speed uses the same overspeed score as every other tracker', () => {
    ingestTelemetry({
      imei: '864201045892110',
      packet: frameSentence('GNRMC,143100.00,A,1836.0000,N,07345.0000,E,50.00,90.0,131126,,,A')
    });
    const navic = ingestTelemetry({
      imei: '864201045892110',
      packet: frameSentence('GNRMC,143106.00,A,1836.1000,N,07345.1000,E,50.00,90.0,131126,,,A')
    });
    assert.equal(navic.protocol, 'navic-nmea');
    assert.equal(navic.driverIntelligenceEventCreated.eventType, 'OVERSPEEDING');
    assert.equal(navic.driverIntelligenceEventCreated.alertId, 17);
  });

  test('AIS-140 panic frame is stored before the success ACK', () => {
    const result = ingestTelemetry('$PVT,864201045892110,13112026,143000,18.600000,N,073.750000,E,10.0,90.0,14,560,1,1,1,0*00');
    assert.equal(result.status, 'PROCESSED');
    assert.equal(result.protocol, 'ais140');
    assert.ok(result.panicEventCreated?.id);
    assert.match(result.ack, /^\$ACK,864201045892110,SUCCESS\*/);

    const panic = db.get(`SELECT status, vehicle_id FROM panic_events WHERE id = ?`, [result.panicEventCreated.id]);
    assert.equal(panic.status, 'New');
    assert.equal(panic.vehicle_id, 'veh_1');
    const erss = db.get(`SELECT status FROM alert_dispatches WHERE vehicle_id = 'veh_1' AND channel = 'erss112'`);
    assert.equal(erss.status, 'pending_config');
  });

  test('invalid NMEA checksum is committed as a rejection and does not move the vehicle', () => {
    const result = ingestTelemetry({
      protocol: 'navic-nmea',
      imei: '864201045892110',
      packet: '$GNRMC,143000.00,A,1835.4720,N,07344.3340,E,29.70,85.0,131126,,,A*00'
    });
    assert.equal(result.status, 'REJECTED');
    assert.equal(result.committed, true);
    assert.equal(result.persisted, false);
    assert.match(result.ack, /^\$NAK,/);

    const location = db.get(`SELECT vehicle_id FROM latest_vehicle_locations WHERE vehicle_id = 'veh_1'`);
    assert.equal(location, undefined);
    const log = db.get(`SELECT is_valid FROM raw_packet_logs WHERE imei = '864201045892110'`);
    assert.equal(log.is_valid, 0);
  });

  test('first administrator can sign in and a wrong password is rejected', () => {
    assert.throws(
      () => createFirstAdministrator({ name: 'A', email: 'not-an-email', password: 'short', organization: '' }),
      /valid email/
    );

    const created = createFirstAdministrator({
      name: 'Prabhjot',
      email: 'prabhjot@axona.local',
      password: 'fleet-pass',
      organization: 'Axona Operations'
    });
    assert.equal(created.role, 'super_admin');
    assert.equal(created.email, 'prabhjot@axona.local');
    assert.equal(loginWithPassword('prabhjot@axona.local', 'wrong-pass'), null);
    const session = loginWithPassword('Prabhjot@Axona.Local', 'fleet-pass');
    assert.equal(session.tenantName, 'Axona Operations');
    assert.throws(() => createFirstAdministrator({
      name: 'Second',
      email: 'second@axona.local',
      password: 'another-pass',
      organization: 'Other'
    }), /already exists/);
  });

  test('Codec 8 TCP handshake stores an FMB920 record for a registered IMEI', async () => {
    const sample = Buffer.from(
      '000000000000003608010000016B40D8EA30010000000000000000000000000000000105021503010101425E0F01F10000601A014E0000000000000000010000C7CF',
      'hex'
    );
    const decoded = takeAvlPacket(sample);
    assert.equal(decoded.records.length, 1);
    assert.equal(decoded.records[0].latitude, 0);
    assert.equal(decoded.records[0].speed, 0);

    const packet = codec8Packet({
      latitude: 26.8467,
      longitude: 80.9462,
      speed: 18,
      angle: 90,
      satellites: 12,
      altitude: 120,
      ignition: 1,
      timeMs: Date.UTC(2026, 10, 14, 12, 30, 0)
    });

    const tcp = startTeltonikaTcpServer(0);
    try {
      await new Promise((resolve) => tcp.once('listening', resolve));
      const port = tcp.address().port;
      const reply = await sendTeltonika(port, '864201045892112', packet);
      assert.equal(reply.readUInt32BE(0), 1);
      const location = db.get(`SELECT latitude, speed, ignition FROM latest_vehicle_locations WHERE vehicle_id = 'veh_tel'`);
      assert.equal(location.latitude, 26.8467);
      assert.equal(location.speed, 18);
      assert.equal(location.ignition, 1);
    } finally {
      stopTeltonikaTcpServer();
    }
  });

  test('geofence entry, exit, and zone speed follow the live fix', () => {
    const punePolygon = [[18.535, 73.840], [18.540, 73.870], [18.510, 73.875], [18.505, 73.845]];
    assert.equal(isPointInPolygon([18.5204, 73.8567], punePolygon), true);
    assert.equal(isPointInPolygon([28.592802, 77.380893], punePolygon), false);

    const yard = { lat: 28.6077, lng: 77.373004, radius: 200 };
    const parked = { lat: 28.592802, lng: 77.380893 };
    assert.equal(calculateDistanceMeters(parked.lat, parked.lng, yard.lat, yard.lng) > yard.radius, true);

    db.run(`
      INSERT INTO geofences (
        id, tenant_id, name, fence_type, center_lat, center_lng, radius_meters,
        alert_on_entry, alert_on_exit, speed_limit, is_active
      ) VALUES ('geo_yard', 'tenant_test', 'Noida yard', 'circle', ?, ?, ?, 1, 1, 30, 1)
    `, [yard.lat, yard.lng, yard.radius]);
    db.run(`INSERT INTO geofence_vehicles (geofence_id, vehicle_id) VALUES ('geo_yard', 'veh_1')`);

    assert.deepEqual(GeofenceService.evaluateVehicleGeofences('veh_1', parked.lat, parked.lng, 0).map(event => event.type), []);

    const entry = GeofenceService.evaluateVehicleGeofences('veh_1', yard.lat, yard.lng, 40).map(event => event.type);
    assert.deepEqual(entry.sort(), ['entry', 'overspeed']);
    assert.deepEqual(GeofenceService.evaluateVehicleGeofences('veh_1', yard.lat, yard.lng, 40).map(event => event.type), []);

    assert.deepEqual(GeofenceService.evaluateVehicleGeofences('veh_1', parked.lat, parked.lng, 0).map(event => event.type), ['exit']);
    const again = GeofenceService.evaluateVehicleGeofences('veh_1', yard.lat, yard.lng, 10).map(event => event.type);
    assert.deepEqual(again, ['entry']);
  });

  test('VACUUM INTO writes a consistent snapshot of the live database', () => {
    ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.5,
      longitude: 73.8,
      speedKmh: 20,
      ignition: 1
    });
    const snapshot = createConsistentSnapshot();
    assert.equal(fs.existsSync(snapshot.path), true);
    assert.ok(snapshot.bytes > 0);
    assert.equal(path.basename(path.dirname(snapshot.path)), 'backups');
  });

  test('today starts at 00:00 India time and a report pdf is a real pdf', () => {
    assert.equal(istMidnightUtcStamp(new Date('2026-11-16T16:46:00Z')), '2026-11-15 18:30:00');
    assert.equal(istMidnightUtcStamp(new Date('2026-11-16T18:40:00Z')), '2026-11-16 18:30:00');
    const pdf = buildTablePdf({
      title: 'Overspeeding Report',
      subtitle: 'User data since today 00:00 hrs',
      rows: [{ vehicle: 'UP16DZ0148', speed: 47 }]
    });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.includes(Buffer.from('Overspeeding Report')));
  });

  test('quick sms matches the sms.axona.in collection', () => {
    assert.equal(normalizeSmsMobile('+91 98765-43210'), '919876543210');
    assert.equal(normalizeSmsMobile('09876543210'), '919876543210');
    const fields = quickSmsFields({
      mobile: '919876543210',
      message: APPROVED_SMS_TEXT,
      templateId: '1177179214957905146',
      config: {
        userId: 'axonasoftware',
        password: 'secret',
        senderId: 'AXONAT',
        entityId: '1101662370000099232'
      }
    });
    assert.equal(fields.userid, 'axonasoftware');
    assert.equal(fields.senderid, 'AXONAT');
    assert.equal(fields.dltEntityId, '1101662370000099232');
    assert.equal(fields.sendMethod, 'quick');
    assert.equal(fields.msgType, 'text');
    assert.equal(fields.output, 'json');
    assert.equal(fields.duplicatecheck, 'true');
    assert.equal(fields.mobile, '919876543210');
    assert.equal(fields.dltTemplateId, '1177179214957905146');
    assert.match(fields.msg, /Call 9773936790 -Axona Software LLP$/);
    assert.equal(interpretSmsResponse(true, '{"status":"success","statusCode":"200","reason":"success"}').ok, true);
    assert.equal(interpretSmsResponse(true, '{"status":"error","statusCode":"102","reason":"Authentication failure"}').ok, false);
    const blocked = readSmsConfig({ SMS_PASSWORD: '' });
    assert.equal(blocked.ready, false);
    assert.equal(blocked.templateId, '1177179214957905146');
    const ready = readSmsConfig({ SMS_PASSWORD: 'secret' });
    assert.equal(ready.ready, true);
    assert.equal(ready.url, 'https://sms.axona.in/SMSApi/send');
  });
});

function codec8Packet({ latitude, longitude, speed, angle, satellites, altitude, ignition, timeMs }) {
  const record = Buffer.alloc(8 + 1 + 15);
  record.writeBigUInt64BE(BigInt(timeMs), 0);
  record.writeUInt8(0, 8);
  record.writeInt32BE(Math.round(longitude * 10_000_000), 9);
  record.writeInt32BE(Math.round(latitude * 10_000_000), 13);
  record.writeUInt16BE(altitude, 17);
  record.writeUInt16BE(angle, 19);
  record.writeUInt8(satellites, 21);
  record.writeUInt16BE(speed, 22);
  const io = Buffer.from([0, 1, 1, 239, ignition ? 1 : 0, 0, 0, 0]);
  const body = Buffer.concat([Buffer.from([0x08, 1]), record, io, Buffer.from([1])]);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(body.length, 4);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc16Ibm(body), 0);
  return Buffer.concat([header, body, crc]);
}

function sendTeltonika(port, imei, packet) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    const chunks = [];
    let sentRecords = false;
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Timed out waiting for Codec 8 ack, got ${Buffer.concat(chunks).toString('hex')}`));
    }, 3000);

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    socket.on('data', (chunk) => {
      chunks.push(chunk);
      const received = Buffer.concat(chunks);
      if (!sentRecords && received.length >= 1 && received[0] === 0x01) {
        sentRecords = true;
        socket.write(packet);
        return;
      }
      if (sentRecords && received.length >= 5) {
        clearTimeout(timer);
        socket.end();
        resolve(received.subarray(1, 5));
      }
    });
    socket.on('connect', () => {
      const greeting = Buffer.alloc(2 + imei.length);
      greeting.writeUInt16BE(imei.length, 0);
      greeting.write(imei, 2, 'ascii');
      socket.write(greeting);
    });
  });
}
