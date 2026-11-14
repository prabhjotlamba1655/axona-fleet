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
    const jsonResult = ingestTelemetry({
      protocol: 'json',
      imei: '864201045892110',
      latitude: 18.6,
      longitude: 73.75,
      speedKmh: 90,
      heading: 80,
      ignition: 1,
      satellites: 11
    });
    assert.equal(jsonResult.status, 'PROCESSED');
    assert.equal(jsonResult.canonical.protocol, 'json');
    assert.equal(jsonResult.movementStatus, 'moving');

    const speeding = db.get(`SELECT speed, speed_limit FROM speed_alerts WHERE vehicle_id = 'veh_1'`);
    assert.equal(speeding.speed, 90);
    assert.equal(speeding.speed_limit, 65);

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

  test('AIS-140 panic frame is stored before the success ACK', () => {
    const result = ingestTelemetry('$PVT,864201045892110,13112026,143000,18.600000,N,073.750000,E,10.0,90.0,14,560,1,1,1,0*00');
    assert.equal(result.status, 'PROCESSED');
    assert.equal(result.protocol, 'ais140');
    assert.ok(result.panicEventCreated?.id);
    assert.match(result.ack, /^\$ACK,864201045892110,SUCCESS\*/);

    const panic = db.get(`SELECT status, vehicle_id FROM panic_events WHERE id = ?`, [result.panicEventCreated.id]);
    assert.equal(panic.status, 'New');
    assert.equal(panic.vehicle_id, 'veh_1');
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
