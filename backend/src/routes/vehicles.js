import express from 'express';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/vehicles - List authorized vehicles with device info & latest status
router.get('/', (req, res) => {
  const { user } = req;
  const { category, search, status } = req.query;

  let sql = `
    SELECT v.*, c.name as category_name, c.code as category_code,
           d.imei as device_imei, d.model as device_model, d.status as device_status,
           d.is_ais140_compliant, d.main_power_connected, d.backup_battery_pct,
           m.name as manufacturer_name,
           loc.latitude, loc.longitude, loc.speed, loc.heading, loc.ignition,
           loc.movement_status, loc.address, loc.gps_time, loc.panic_status
    FROM vehicles v
    LEFT JOIN vehicle_categories c ON v.category_id = c.id
    LEFT JOIN gps_devices d ON v.device_id = d.id
    LEFT JOIN device_manufacturers m ON d.manufacturer_id = m.id
    LEFT JOIN latest_vehicle_locations loc ON loc.vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];

  // Tenant scoping
  if (user.role !== 'super_admin') {
    sql += ' AND v.tenant_id = ?';
    params.push(user.tenant_id);
  }

  // Sub User vehicle restriction
  if (user.role === 'sub_user' && user.assigned_vehicles) {
    if (user.assigned_vehicles.length === 0) {
      return res.json([]);
    }
    const placeholders = user.assigned_vehicles.map(() => '?').join(',');
    sql += ` AND v.id IN (${placeholders})`;
    params.push(...user.assigned_vehicles);
  }

  if (category) {
    sql += ' AND c.code = ?';
    params.push(category);
  }

  if (status) {
    if (status === 'active' || status === 'inactive') {
      sql += ' AND v.is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    } else {
      sql += ' AND loc.movement_status = ?';
      params.push(status);
    }
  }

  if (search) {
    sql += ' AND (v.registration_number LIKE ? OR v.owner_name LIKE ? OR d.imei LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY v.created_at DESC';

  const vehicles = db.query(sql, params);
  res.json(vehicles);
});

// GET /api/vehicles/categories
router.get('/categories', (req, res) => {
  const categories = db.query('SELECT * FROM vehicle_categories ORDER BY name ASC');
  res.json(categories);
});

// GET /api/vehicles/manufacturers
router.get('/manufacturers', (req, res) => {
  const manufacturers = db.query('SELECT * FROM device_manufacturers ORDER BY name ASC');
  res.json(manufacturers);
});

// GET /api/vehicles/:id - View single vehicle details
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const { user } = req;

  let sql = `
    SELECT v.*, c.name as category_name,
           d.imei as device_imei, d.model as device_model, d.sim_number, d.firmware_version,
           d.status as device_status, d.is_ais140_compliant, d.main_power_connected,
           d.backup_battery_pct, d.tamper_detected,
           m.name as manufacturer_name, m.code as manufacturer_code,
           loc.latitude, loc.longitude, loc.speed, loc.heading, loc.ignition,
           loc.movement_status, loc.address, loc.gps_time, loc.panic_status
    FROM vehicles v
    LEFT JOIN vehicle_categories c ON v.category_id = c.id
    LEFT JOIN gps_devices d ON v.device_id = d.id
    LEFT JOIN device_manufacturers m ON d.manufacturer_id = m.id
    LEFT JOIN latest_vehicle_locations loc ON loc.vehicle_id = v.id
    WHERE v.id = ?
  `;
  const params = [id];

  if (user.role !== 'super_admin') {
    sql += ' AND v.tenant_id = ?';
    params.push(user.tenant_id);
  }

  const vehicle = db.get(sql, params);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  // Fetch recent trips
  vehicle.recent_trips = db.query(`
    SELECT * FROM trips WHERE vehicle_id = ? ORDER BY start_time DESC LIMIT 5
  `, [id]);

  res.json(vehicle);
});

// POST /api/vehicles - Register new vehicle + optional GPS device
router.post('/', authorize(['super_admin', 'company_admin', 'individual_owner']), (req, res) => {
  const { user } = req;
  const {
    registration_number,
    category_id,
    make,
    model,
    manufacturing_year,
    owner_name,
    owner_phone,
    emergency_contact_phone,
    speed_limit,
    device_imei,
    device_manufacturer_id,
    device_model,
    sim_number,
    installation_date
  } = req.body;

  if (!registration_number || !category_id || !make || !model) {
    return res.status(400).json({ error: 'Registration number, category, make, and model are required' });
  }

  const targetTenantId = (user.role === 'super_admin' && req.body.tenant_id) ? req.body.tenant_id : user.tenant_id;

  // Check duplicate registration number within tenant
  const existingReg = db.get(`
    SELECT id FROM vehicles WHERE tenant_id = ? AND LOWER(registration_number) = LOWER(?)
  `, [targetTenantId, registration_number.trim()]);

  if (existingReg) {
    return res.status(400).json({ error: `Vehicle registration number '${registration_number}' is already registered in this account.` });
  }

  let deviceId = null;

  // If device IMEI is provided, handle device registration / linking
  if (device_imei) {
    const cleanIMEI = device_imei.trim();
    const existingDevice = db.get('SELECT id, tenant_id FROM gps_devices WHERE imei = ?', [cleanIMEI]);
    if (existingDevice) {
      if (existingDevice.tenant_id !== targetTenantId && user.role !== 'super_admin') {
        return res.status(400).json({ error: `GPS Device IMEI ${cleanIMEI} is already allocated to another tenant account.` });
      }
      deviceId = existingDevice.id;
    } else {
      // Create new device
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const mfgId = device_manufacturer_id || 'mfg_ais140';
      db.run(`
        INSERT INTO gps_devices (id, tenant_id, imei, manufacturer_id, model, sim_number, is_ais140_compliant, status)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'online')
      `, [deviceId, targetTenantId, cleanIMEI, mfgId, device_model || 'AX-140-Pro', sim_number || null]);
    }
  }

  const vehicleId = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  db.run(`
    INSERT INTO vehicles (
      id, tenant_id, registration_number, category_id, make, model, manufacturing_year,
      owner_name, owner_phone, emergency_contact_phone, device_id, installation_date,
      speed_limit, is_active, immobilisation_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')
  `, [
    vehicleId,
    targetTenantId,
    registration_number.toUpperCase().trim(),
    category_id,
    make,
    model,
    manufacturing_year || new Date().getFullYear(),
    owner_name || user.name,
    owner_phone || user.phone || '9999999999',
    emergency_contact_phone || user.phone || '9999999999',
    deviceId,
    installation_date || new Date().toISOString().split('T')[0],
    speed_limit || 80.0
  ]);

  // Set initial location (Pune default coordinates)
  db.run(`
    INSERT INTO latest_vehicle_locations (
      vehicle_id, device_id, latitude, longitude, speed, heading, ignition, movement_status, main_power, address, gps_time
    ) VALUES (?, ?, 18.5204, 73.8567, 0, 0, 0, 'stopped', 1, 'Registered Depot Base', datetime('now'))
  `, [vehicleId, deviceId]);

  res.status(201).json({
    message: 'Vehicle registered successfully with AIS-140 device mapping',
    vehicleId
  });
});

// PUT /api/vehicles/:id - Edit vehicle
router.put('/:id', authorize(['super_admin', 'company_admin', 'individual_owner']), (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const {
    registration_number,
    category_id,
    make,
    model,
    manufacturing_year,
    owner_name,
    owner_phone,
    emergency_contact_phone,
    speed_limit,
    is_active
  } = req.body;

  const vehicle = db.get('SELECT * FROM vehicles WHERE id = ?', [id]);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  if (user.role !== 'super_admin' && vehicle.tenant_id !== user.tenant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.run(`
    UPDATE vehicles
    SET registration_number = COALESCE(?, registration_number),
        category_id = COALESCE(?, category_id),
        make = COALESCE(?, make),
        model = COALESCE(?, model),
        manufacturing_year = COALESCE(?, manufacturing_year),
        owner_name = COALESCE(?, owner_name),
        owner_phone = COALESCE(?, owner_phone),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        speed_limit = COALESCE(?, speed_limit),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
    WHERE id = ?
  `, [
    registration_number ? registration_number.toUpperCase().trim() : null,
    category_id,
    make,
    model,
    manufacturing_year,
    owner_name,
    owner_phone,
    emergency_contact_phone,
    speed_limit,
    is_active,
    id
  ]);

  res.json({ message: 'Vehicle details updated successfully' });
});

// DELETE /api/vehicles/:id - Delete vehicle
router.delete('/:id', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { id } = req.params;
  const { user } = req;

  const vehicle = db.get('SELECT * FROM vehicles WHERE id = ?', [id]);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  if (user.role !== 'super_admin' && vehicle.tenant_id !== user.tenant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.run('DELETE FROM vehicles WHERE id = ?', [id]);
  res.json({ message: 'Vehicle deleted successfully' });
});

// POST /api/vehicles/:id/toggle-active - Activate/Deactivate
router.post('/:id/toggle-active', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { id } = req.params;
  const vehicle = db.get('SELECT id, is_active FROM vehicles WHERE id = ?', [id]);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const nextState = vehicle.is_active === 1 ? 0 : 1;
  db.run('UPDATE vehicles SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?', [nextState, id]);
  res.json({ message: `Vehicle ${nextState ? 'activated' : 'deactivated'} successfully`, is_active: nextState });
});

// POST /api/vehicles/bulk-import - Bulk import vehicles from CSV/JSON
router.post('/bulk-import', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { vehicles } = req.body;
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return res.status(400).json({ error: 'Array of vehicle objects is required' });
  }

  let imported = 0;
  let errors = [];

  for (const item of vehicles) {
    try {
      if (!item.registration_number) continue;
      const reg = item.registration_number.toUpperCase().trim();

      const exists = db.get('SELECT id FROM vehicles WHERE tenant_id = ? AND registration_number = ?', [req.user.tenant_id, reg]);
      if (exists) {
        errors.push(`${reg}: already exists`);
        continue;
      }

      const vehicleId = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const catId = item.category_id || 'cat_car';

      let devId = null;
      if (item.device_imei) {
        devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.run(`
          INSERT INTO gps_devices (id, tenant_id, imei, manufacturer_id, model, is_ais140_compliant, status)
          VALUES (?, ?, ?, 'mfg_ais140', 'AX-140-Pro', 1, 'online')
        `, [devId, req.user.tenant_id, item.device_imei]);
      }

      db.run(`
        INSERT INTO vehicles (
          id, tenant_id, registration_number, category_id, make, model, manufacturing_year,
          owner_name, owner_phone, emergency_contact_phone, device_id, speed_limit, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        vehicleId,
        req.user.tenant_id,
        reg,
        catId,
        item.make || 'Tata',
        item.model || 'Commercial',
        item.manufacturing_year || 2023,
        item.owner_name || req.user.name,
        item.owner_phone || req.user.phone || '9999999999',
        item.emergency_contact_phone || '9999999999',
        devId,
        item.speed_limit || 80.0
      ]);

      db.run(`
        INSERT INTO latest_vehicle_locations (vehicle_id, device_id, latitude, longitude, speed, heading, ignition, movement_status, main_power, address, gps_time)
        VALUES (?, ?, 18.5204, 73.8567, 0, 0, 0, 'stopped', 1, 'Depot Yard', datetime('now'))
      `, [vehicleId, devId]);

      imported++;
    } catch (e) {
      errors.push(`${item.registration_number}: ${e.message}`);
    }
  }

  res.json({ message: `Bulk import completed: ${imported} imported`, imported, errors });
});

export default router;
