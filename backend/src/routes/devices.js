import express from 'express';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import AIS140Parser from '../services/ais140Parser.js';

const router = express.Router();

// Public / Protected Ingestion endpoint for GPS Devices
// POST /api/devices/ingest - Ingest raw AIS-140 GPS packet (TCP/HTTP gateway)
router.post('/ingest', async (req, res) => {
  const body = req.body;
  const hasPayload = typeof body === 'string'
    || (body && (body.packet || body.nmea || body.rawString || body.imei || body.latitude != null || body.lat != null || body.protocol));

  if (!hasPayload) {
    return res.status(400).json({
      status: 'REJECTED',
      committed: false,
      error: 'Telemetry payload is required',
      ack: null
    });
  }

  try {
    // ingestTelemetry commits BEGIN IMMEDIATE before this response is sent.
    const result = await AIS140Parser.processIncomingPacket(body, 'HTTP', req.ip);
    if (result?.status === 'ERROR') {
      return res.status(500).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('[Axona Ingest] transaction rolled back:', err.message);
    return res.status(500).json({
      status: 'ERROR',
      committed: false,
      error: err.message,
      ack: null
    });
  }
});

// All following endpoints require authenticated session
router.use(authenticate);

// GET /api/devices - List devices with health metrics
router.get('/', (req, res) => {
  const { user } = req;
  let sql = `
    SELECT d.*, m.name as manufacturer_name, m.code as manufacturer_code,
           m.protocol as manufacturer_protocol, m.supports_immobilisation,
           v.id as vehicle_id, v.registration_number, v.make, v.model as vehicle_model,
           c.name as category_name
    FROM gps_devices d
    LEFT JOIN device_manufacturers m ON d.manufacturer_id = m.id
    LEFT JOIN vehicles v ON v.device_id = d.id
    LEFT JOIN vehicle_categories c ON v.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (user.role !== 'super_admin') {
    sql += ' AND d.tenant_id = ?';
    params.push(user.tenant_id);
  }

  sql += ' ORDER BY d.created_at DESC';

  const devices = db.query(sql, params);

  // Health summary metrics
  const total = devices.length;
  const online = devices.filter(d => d.status === 'online').length;
  const offline = devices.filter(d => d.status === 'offline').length;
  const tampered = devices.filter(d => d.tamper_detected === 1).length;
  const powerDisconnected = devices.filter(d => d.main_power_connected === 0).length;

  res.json({
    devices,
    stats: {
      total,
      online,
      offline,
      tampered,
      powerDisconnected
    }
  });
});

// GET /api/devices/raw-logs - Raw AIS-140 packet logs for debugging & MoRTH compliance audits
router.get('/raw-logs', authorize(['super_admin', 'company_admin']), (req, res) => {
  const logs = db.query(`
    SELECT * FROM raw_packet_logs
    ORDER BY received_at DESC LIMIT 50
  `);
  res.json(logs);
});

// POST /api/devices - Register new GPS device
router.post('/', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { imei, manufacturer_id, model, sim_number, firmware_version } = req.body;
  if (!imei || !manufacturer_id) {
    return res.status(400).json({ error: 'IMEI and Manufacturer ID are required' });
  }

  const existing = db.get('SELECT id FROM gps_devices WHERE imei = ?', [imei.trim()]);
  if (existing) {
    return res.status(400).json({ error: `Device with IMEI ${imei} already registered.` });
  }

  const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.run(`
    INSERT INTO gps_devices (id, tenant_id, imei, manufacturer_id, model, sim_number, firmware_version, is_ais140_compliant, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'online')
  `, [
    deviceId,
    req.user.tenant_id,
    imei.trim(),
    manufacturer_id,
    model || 'AX-140-Pro',
    sim_number || null,
    firmware_version || 'v2.1.0-AIS'
  ]);

  res.status(201).json({ message: 'GPS Device registered successfully', deviceId });
});

export default router;
