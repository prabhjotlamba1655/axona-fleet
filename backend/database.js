const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'axona_fleet.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  db.serialize(() => {
    // 1. Vehicles
    db.run(`CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      reg_no TEXT UNIQUE,
      model TEXT,
      driver_name TEXT,
      driver_phone TEXT,
      driver_score INTEGER,
      oem_cph REAL,
      cph_buffer_percent REAL,
      current_cph REAL,
      num_wheels INTEGER,
      num_axles INTEGER,
      num_tanks INTEGER,
      tank_capacity_liters REAL,
      current_fuel_liters REAL,
      fuel_level_mm REAL,
      fuel_temp_c REAL,
      fuel_water_ppm INTEGER,
      idle_alert_mins INTEGER,
      initial_engine_hours REAL,
      current_engine_hours REAL,
      engine_hours_today REAL,
      service_due_gap_km REAL,
      last_service_odometer_km REAL,
      current_odometer_km REAL,
      route_deviation_allowed_km REAL,
      geofence_mode TEXT,
      geofence_perimeter_km REAL,
      status TEXT,
      speed_kmh REAL,
      current_lat REAL,
      current_lng REAL,
      bearing REAL,
      route_name TEXT,
      planned_origin TEXT,
      planned_destination TEXT,
      deviation_km REAL,
      work_start_time TEXT,
      late_start INTEGER,
      reefer_temp_c REAL,
      reefer_setpoint_c REAL,
      axle_payload_kg REAL,
      max_payload_kg REAL,
      avg_monthly_speed_kmh REAL,
      fuel_flow_rate_lph REAL,
      fuel_siphoning_loss_liters REAL,
      idling_loss_liters REAL,
      cph_loss_liters REAL,
      deviation_loss_liters REAL,
      mismatch_loss_liters REAL
    )`);

    // 2. Refueling Records & Reconciliations
    db.run(`CREATE TABLE IF NOT EXISTS refueling_records (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT,
      reg_no TEXT,
      refuel_time TEXT,
      station_name TEXT,
      fuel_slip_no TEXT,
      fleet_card_statement_no TEXT,
      slip_liters REAL,
      sensor_rise_liters REAL,
      mismatch_liters REAL,
      fuel_rate_per_liter REAL,
      total_amount_inr REAL,
      status TEXT,
      notes TEXT
    )`);

    // 3. Siphoning Events
    db.run(`CREATE TABLE IF NOT EXISTS siphoning_events (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT,
      reg_no TEXT,
      detected_time TEXT,
      moved_15m_time TEXT,
      siphoned_liters REAL,
      estimated_loss_inr REAL,
      location_name TEXT,
      lat REAL,
      lng REAL,
      verified_after_15min_move INTEGER
    )`);

    // 4. Alerts
    db.run(`CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT,
      reg_no TEXT,
      type TEXT,
      severity TEXT,
      title TEXT,
      message TEXT,
      metric_value TEXT,
      location TEXT,
      timestamp TEXT,
      is_acknowledged INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at TEXT
    )`);

    // 5. Tank Calibration Table
    db.run(`CREATE TABLE IF NOT EXISTS tank_calibration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id TEXT,
      dip_mm REAL,
      volume_liters REAL,
      tank_index INTEGER
    )`);

    // 6. Planned Routes
    db.run(`CREATE TABLE IF NOT EXISTS planned_routes (
      id TEXT PRIMARY KEY,
      route_name TEXT,
      origin TEXT,
      destination TEXT,
      distance_km REAL,
      allowed_deviation_km REAL,
      waypoints_json TEXT
    )`);

    // 7. RTO Compliance
    db.run(`CREATE TABLE IF NOT EXISTS rto_compliance (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT,
      reg_no TEXT,
      fitness_expiry TEXT,
      national_permit_expiry TEXT,
      insurance_expiry TEXT,
      puc_expiry TEXT,
      road_tax_expiry TEXT,
      green_tax_expiry TEXT,
      status TEXT
    )`);

    // 8. Users RBAC
    db.run(`CREATE TABLE IF NOT EXISTS users_rbac (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT,
      department TEXT,
      can_edit_settings INTEGER,
      can_acknowledge_alerts INTEGER,
      can_audit_fuel INTEGER
    )`);

    // 9. Permanent 12-Month Historical Audits Table (Past Data - Never Recalculated)
    db.run(`CREATE TABLE IF NOT EXISTS historical_monthly_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      box_key TEXT,
      month TEXT,
      month_index INTEGER,
      vehicle_id TEXT,
      reg_no TEXT,
      model TEXT,
      monthly_km REAL,
      oem_cph REAL,
      actual_avg_cph REAL,
      siphoned_liters REAL,
      siphoning_loss_inr REAL,
      mismatch_liters REAL,
      mismatch_loss_inr REAL,
      idling_liters REAL,
      idling_loss_inr REAL,
      cph_loss_liters REAL,
      cph_loss_inr REAL,
      deviation_loss_liters REAL,
      deviation_loss_inr REAL,
      total_lost_liters REAL,
      total_financial_loss_inr REAL,
      audit_resolution TEXT,
      route_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // 10. Permanent 7-Day Historical Telemetry & Event Logs
    db.run(`CREATE TABLE IF NOT EXISTS historical_seven_day_events (
      id TEXT PRIMARY KEY,
      box_key TEXT,
      vehicle_id TEXT,
      reg_no TEXT,
      model TEXT,
      event_time TEXT,
      metric_primary REAL,
      metric_secondary REAL,
      financial_loss_inr REAL,
      location_name TEXT,
      status TEXT,
      details_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    seedDataIfEmpty();
    seedHistoricalDataIfEmpty();
    seedNewAlertsIfMissing();
  });
}

function seedNewAlertsIfMissing() {
  const dynamicAlerts = [
    {
      id: 'ALT-1014',
      vehicle_id: 'VH-101',
      reg_no: 'MH-12-RN-8842',
      type: 'HARSH_BRAKING',
      severity: 'HIGH',
      title: 'Harsh Braking Alert (-14.2 km/h/s)',
      message: 'Harsh braking detected! Your vehicle number MH-12-RN-8842 has experienced sudden deceleration. Please check driver safety & ensure safe driving practices.',
      metric_value: '-14.2 km/h/s (3.9s)',
      location: 'Samruddhi Mahamarg km 194, Jalna',
      timestamp: '11:58 AM',
      is_acknowledged: 0
    },
    {
      id: 'ALT-1015',
      vehicle_id: 'VH-104',
      reg_no: 'GJ-06-ZZ-7711',
      type: 'SHARP_CORNERING',
      severity: 'HIGH',
      title: 'Sharp Cornering & High G-Force Spike',
      message: 'Aggressive steering at 62 km/h around sharp curve triggered 0.48G lateral acceleration, exceeding safe rollover margin (0.35G).',
      metric_value: '0.48G Lateral (62 km/h)',
      location: 'NH48 Vadodara-Surat Highway Curve km 74',
      timestamp: '11:35 AM',
      is_acknowledged: 0
    },
    {
      id: 'ALT-1016',
      vehicle_id: 'VH-102',
      reg_no: 'DL-01-AX-9021',
      type: 'EWAY_EXPIRING',
      severity: 'CRITICAL',
      title: 'E-Way Bill Expiring (< 4 Hours)',
      message: 'E-Way Bill #2819-2847-1920 (Consignment ₹28.5L) expires in 3h 15m at 03:00 PM. Truck has 142 km remaining to terminal.',
      metric_value: 'Expires in 3h 15m (142 km left)',
      location: 'NH48 Kotputli Corridor, RJ',
      timestamp: '11:10 AM',
      is_acknowledged: 0
    },
    {
      id: 'ALT-1017',
      vehicle_id: 'VH-102',
      reg_no: 'DL-01-AX-9021',
      type: 'EXCESSIVE_IDLE',
      severity: 'CRITICAL',
      title: 'Excessive Idle Alert (> 30 min)',
      message: 'Idling Alert! Vehicle number DL-01-AX-9021 remained idle for 45 minutes at Kotputli Loading Bay 2, resulting in 4.8 litres of diesel wasted in idling (approx. ₹451).',
      metric_value: '45 mins (4.8L Wasted)',
      location: 'Kotputli Loading Bay 2, NH48',
      timestamp: '10:50 AM',
      is_acknowledged: 0
    },
    {
      id: 'ALT-1018',
      vehicle_id: 'VH-101',
      reg_no: 'MH-12-RN-8842',
      type: 'EXCESSIVE_STOPPAGE',
      severity: 'HIGH',
      title: 'Stoppage Alert (> 2 hrs)',
      message: 'Vehicle ignition is OFF and vehicle is stationary for 2h 45m (> 2h threshold) at Samruddhi Expressway Rest Plaza.',
      metric_value: '2h 45m (Ignition OFF)',
      location: 'Samruddhi Expressway Rest Plaza km 194',
      timestamp: '09:30 AM',
      is_acknowledged: 0
    },
    {
      id: 'ALT-1019',
      vehicle_id: 'VH-107',
      reg_no: 'UP-32-HN-1244',
      type: 'AXLE_IMBALANCE',
      severity: 'HIGH',
      title: 'Axle Weight Imbalance Alert (> 18%)',
      message: 'Uneven payload distribution detected: Left axle weight 8,900 kg vs Right axle 6,850 kg (22.4% lateral imbalance / 2,050 kg Δ). Severe rollover & uneven tire wear risk.',
      metric_value: '22.4% Imbalance (2,050 kg Δ)',
      location: 'Lucknow-Varanasi Freight Corridor km 112',
      timestamp: '09:40 AM',
      is_acknowledged: 0
    },
    {
      id: 'ALT-1020',
      vehicle_id: 'VH-108',
      reg_no: 'WB-19-DF-4402',
      type: 'CARGO_TEMP_INCREASING',
      severity: 'CRITICAL',
      title: 'Cargo Temp Increasing Rapidly Alert',
      message: 'Cold storage chamber temp rose rapidly (+1.8°C in 15 mins). Current sensor reads -9.4°C against frozen pharma target of -18.0°C. Check reefer unit and door seal.',
      metric_value: '-9.4°C (Rising +1.8°C/15m)',
      location: 'Kolkata-Haldia Port Highway km 46',
      timestamp: '09:12 AM',
      is_acknowledged: 0
    },
    {
      id: 'ALT-1021',
      vehicle_id: 'VH-105',
      reg_no: 'HR-55-AK-3004',
      type: 'CHALLAN_PENDING',
      severity: 'HIGH',
      title: 'Parivahan e-Challan Overdue Pending',
      message: 'Unpaid traffic e-Challan #HR2026101402 of ₹4,000 for highway lane violation overdue by 14 days. Immediate online settlement required.',
      metric_value: '₹4,000 Due (14 Days Overdue)',
      location: 'Gurgaon-Neemrana Toll Point',
      timestamp: '10:45 AM',
      is_acknowledged: 0
    }
  ];

  const stmt = db.prepare(`INSERT OR IGNORE INTO alerts (
    id, vehicle_id, reg_no, type, severity, title, message, metric_value, location, timestamp, is_acknowledged
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  dynamicAlerts.forEach(a => {
    stmt.run(a.id, a.vehicle_id, a.reg_no, a.type, a.severity, a.title, a.message, a.metric_value, a.location, a.timestamp, a.is_acknowledged);
  });
  stmt.finalize();
}

function seedDataIfEmpty() {
  db.get("SELECT COUNT(*) as count FROM vehicles", (err, row) => {
    if (err || row.count > 0) return;

    console.log("Seeding Axona Fleet Analytics Database with production fleet telemetry...");

    // Seed 10 heavy commercial vehicles covering Indian freight corridors
    const initialVehicles = [
      {
        id: 'VH-101',
        reg_no: 'MH-12-RN-8842',
        model: 'Tata Prima 5530.S (18-Wheeler Tractor)',
        driver_name: 'Rajesh Gurjar',
        driver_phone: '+91 98231 44019',
        driver_score: 88,
        oem_cph: 18.0,
        cph_buffer_percent: 25.0,
        current_cph: 24.8, // > 25% alert!
        num_wheels: 18,
        num_tanks: 2,
        tank_capacity_liters: 600.0,
        current_fuel_liters: 382.4,
        fuel_level_mm: 445.0,
        fuel_temp_c: 29.2,
        fuel_water_ppm: 8,
        idle_alert_mins: 15,
        initial_engine_hours: 1240.0,
        current_engine_hours: 1248.5,
        engine_hours_today: 7.5,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 0.0,
        current_odometer_km: 9680.0, // Approaching 10,000 (< 500 km remaining) -> Alert H!
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 15.0,
        status: 'RUNNING',
        speed_kmh: 88.0, // Over 2x of 41 km/h monthly avg -> Alert L!
        current_lat: 19.8762,
        current_lng: 75.3433,
        bearing: 142.0,
        route_name: 'Mumbai - Nagpur Express Freight',
        planned_origin: 'JNPT Port Mumbai',
        planned_destination: 'MIHAN SEZ Nagpur',
        deviation_km: 12.0,
        work_start_time: '08:42 AM', // Late start -> Alert G!
        late_start: 1,
        reefer_temp_c: -18.4,
        reefer_setpoint_c: -18.0,
        axle_payload_kg: 26800.0,
        max_payload_kg: 28000.0,
        avg_monthly_speed_kmh: 42.0,
        fuel_flow_rate_lph: 23.5,
        fuel_siphoning_loss_liters: 0.0,
        idling_loss_liters: 4.2,
        cph_loss_liters: 14.8,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 0.0
      },
      {
        id: 'VH-102',
        reg_no: 'DL-01-AX-9021',
        model: 'BharatBenz 3528R (12-Wheeler Reefer)',
        driver_name: 'Satnam Singh',
        driver_phone: '+91 97110 52391',
        driver_score: 72,
        oem_cph: 16.5,
        cph_buffer_percent: 25.0,
        current_cph: 17.2,
        num_wheels: 12,
        num_tanks: 1,
        tank_capacity_liters: 380.0,
        current_fuel_liters: 145.0,
        fuel_level_mm: 210.0,
        fuel_temp_c: 33.1,
        fuel_water_ppm: 14,
        idle_alert_mins: 15,
        initial_engine_hours: 2150.0,
        current_engine_hours: 2156.0,
        engine_hours_today: 6.0,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 10000.0,
        current_odometer_km: 14200.0,
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'FIXED',
        geofence_perimeter_km: 25.0,
        status: 'RUNNING',
        speed_kmh: 54.0,
        current_lat: 26.9124,
        current_lng: 75.7873,
        bearing: 210.0,
        route_name: 'Delhi - Jaipur - Ahmedabad Cold Corridor',
        planned_origin: 'Kundli Cold Storage, Delhi',
        planned_destination: 'Sanand Agro Hub, Ahmedabad',
        deviation_km: 56.4, // > 50km route deviation -> Alert F!
        work_start_time: '07:15 AM',
        late_start: 0,
        reefer_temp_c: -12.3, // -12.3°C while setpoint -18°C -> Cold Temp Alert I!
        reefer_setpoint_c: -18.0,
        axle_payload_kg: 29400.0, // > 28,000 kg -> Axle overweight alert J!
        max_payload_kg: 28000.0,
        avg_monthly_speed_kmh: 46.0,
        fuel_flow_rate_lph: 16.8,
        fuel_siphoning_loss_liters: 28.5, // Alert A Siphoning verified!
        idling_loss_liters: 6.5,
        cph_loss_liters: 2.1,
        deviation_loss_liters: 18.2,
        mismatch_loss_liters: 15.0
      },
      {
        id: 'VH-103',
        reg_no: 'KA-04-MB-4190',
        model: 'Ashok Leyland 4220 (14-Wheeler Multi-Axle)',
        driver_name: 'K. Venkatesh',
        driver_phone: '+91 94480 32187',
        driver_score: 91,
        oem_cph: 19.5,
        cph_buffer_percent: 25.0,
        current_cph: 20.1,
        num_wheels: 14,
        num_tanks: 2,
        tank_capacity_liters: 550.0,
        current_fuel_liters: 420.0,
        fuel_level_mm: 480.0,
        fuel_temp_c: 26.4,
        fuel_water_ppm: 5,
        idle_alert_mins: 15,
        initial_engine_hours: 890.0,
        current_engine_hours: 898.2,
        engine_hours_today: 8.2,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 0.0,
        current_odometer_km: 6350.0,
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 20.0,
        status: 'IDLE', // Idling with speed 0 and fuel consumption > 1.2 L/hr -> Alert D!
        speed_kmh: 0.0,
        current_lat: 13.0827,
        current_lng: 80.2707,
        bearing: 45.0,
        route_name: 'Bangalore - Chennai Expressway',
        planned_origin: 'Peenya Industrial Estate, Bengaluru',
        planned_destination: 'Sriperumbudur Hub, Chennai',
        deviation_km: 3.2,
        work_start_time: '06:50 AM',
        late_start: 0,
        reefer_temp_c: 4.1,
        reefer_setpoint_c: 4.0,
        axle_payload_kg: 24100.0,
        max_payload_kg: 26000.0,
        avg_monthly_speed_kmh: 44.0,
        fuel_flow_rate_lph: 2.4, // Idling logic: speed=0, fuel flow 2.4 L/hr for 18 mins
        fuel_siphoning_loss_liters: 0.0,
        idling_loss_liters: 12.4,
        cph_loss_liters: 0.0,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 22.0 // Refueling discrepancy Alert C!
      },
      {
        id: 'VH-104',
        reg_no: 'GJ-06-ZZ-7711',
        model: 'Eicher Pro 6028 (10-Wheeler Tipper)',
        driver_name: 'Mahesh Solanki',
        driver_phone: '+91 99250 88210',
        driver_score: 65,
        oem_cph: 15.0,
        cph_buffer_percent: 25.0,
        current_cph: 21.4, // > 25% High CPH Loss!
        num_wheels: 10,
        num_tanks: 1,
        tank_capacity_liters: 350.0,
        current_fuel_liters: 210.0,
        fuel_level_mm: 310.0,
        fuel_temp_c: 31.0,
        fuel_water_ppm: 18,
        idle_alert_mins: 15,
        initial_engine_hours: 3100.0,
        current_engine_hours: 3105.4,
        engine_hours_today: 5.4,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 20000.0,
        current_odometer_km: 28900.0,
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 10.0,
        status: 'RUNNING',
        speed_kmh: 62.0,
        current_lat: 22.3072,
        current_lng: 73.1812,
        bearing: 315.0,
        route_name: 'Vadodara - Dahej Chemical Belt',
        planned_origin: 'GIDC Makarpura Vadodara',
        planned_destination: 'Dahej Port Terminal',
        deviation_km: 6.5,
        work_start_time: '09:10 AM', // Late start!
        late_start: 1,
        reefer_temp_c: 0.0,
        reefer_setpoint_c: 0.0,
        axle_payload_kg: 18500.0,
        max_payload_kg: 21000.0,
        avg_monthly_speed_kmh: 38.0,
        fuel_flow_rate_lph: 21.4,
        fuel_siphoning_loss_liters: 14.0,
        idling_loss_liters: 8.6,
        cph_loss_liters: 22.5,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 0.0
      },
      {
        id: 'VH-105',
        reg_no: 'HR-55-AK-3004',
        model: 'Tata Signa 4825.TK (16-Wheeler Tipper)',
        driver_name: 'Virender Yadav',
        driver_phone: '+91 98120 77621',
        driver_score: 82,
        oem_cph: 20.0,
        cph_buffer_percent: 25.0,
        current_cph: 19.8,
        num_wheels: 16,
        num_tanks: 2,
        tank_capacity_liters: 500.0,
        current_fuel_liters: 310.0,
        fuel_level_mm: 375.0,
        fuel_temp_c: 28.0,
        fuel_water_ppm: 9,
        idle_alert_mins: 15,
        initial_engine_hours: 1540.0,
        current_engine_hours: 1546.8,
        engine_hours_today: 6.8,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 10000.0,
        current_odometer_km: 19800.0, // Approaching 20,000 km within 200 km!
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 20.0,
        status: 'RUNNING',
        speed_kmh: 58.0,
        current_lat: 28.4595,
        current_lng: 77.0266,
        bearing: 180.0,
        route_name: 'Gurgaon - Neemrana Logistics Link',
        planned_origin: 'Binola Logistics Park, Gurgaon',
        planned_destination: 'Japanese Zone, Neemrana',
        deviation_km: 4.0,
        work_start_time: '07:40 AM',
        late_start: 0,
        reefer_temp_c: 0.0,
        reefer_setpoint_c: 0.0,
        axle_payload_kg: 21500.0, // Sudden drop alert in history
        max_payload_kg: 32000.0,
        avg_monthly_speed_kmh: 40.0,
        fuel_flow_rate_lph: 19.5,
        fuel_siphoning_loss_liters: 0.0,
        idling_loss_liters: 5.1,
        cph_loss_liters: 0.0,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 0.0
      },
      {
        id: 'VH-106',
        reg_no: 'AP-16-TX-5509',
        model: 'BharatBenz 2823R (10-Wheeler Container)',
        driver_name: 'M. Subba Rao',
        driver_phone: '+91 98480 11942',
        driver_score: 85,
        oem_cph: 14.5,
        cph_buffer_percent: 25.0,
        current_cph: 15.1,
        num_wheels: 10,
        num_tanks: 1,
        tank_capacity_liters: 380.0,
        current_fuel_liters: 280.0,
        fuel_level_mm: 360.0,
        fuel_temp_c: 27.5,
        fuel_water_ppm: 6,
        idle_alert_mins: 15,
        initial_engine_hours: 980.0,
        current_engine_hours: 987.0,
        engine_hours_today: 7.0,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 0.0,
        current_odometer_km: 4800.0,
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 15.0,
        status: 'RUNNING',
        speed_kmh: 65.0,
        current_lat: 16.5062,
        current_lng: 80.6480,
        bearing: 90.0,
        route_name: 'Vijayawada - Visakhapatnam Cargo Line',
        planned_origin: 'Auto Nagar Vijayawada',
        planned_destination: 'Visakhapatnam Port',
        deviation_km: 2.1,
        work_start_time: '07:30 AM',
        late_start: 0,
        reefer_temp_c: -19.5,
        reefer_setpoint_c: -20.0,
        axle_payload_kg: 19800.0,
        max_payload_kg: 21000.0,
        avg_monthly_speed_kmh: 48.0,
        fuel_flow_rate_lph: 15.0,
        fuel_siphoning_loss_liters: 0.0,
        idling_loss_liters: 3.2,
        cph_loss_liters: 0.0,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 0.0
      },
      {
        id: 'VH-107',
        reg_no: 'UP-32-HN-1244',
        model: 'Ashok Leyland 4825 (16-Wheeler Haulage)',
        driver_name: 'Ram Lakhan Shukla',
        driver_phone: '+91 94150 99312',
        driver_score: 79,
        oem_cph: 18.0,
        cph_buffer_percent: 25.0,
        current_cph: 23.9, // > 25% alert!
        num_wheels: 16,
        num_tanks: 2,
        tank_capacity_liters: 500.0,
        current_fuel_liters: 340.0,
        fuel_level_mm: 410.0,
        fuel_temp_c: 28.5,
        fuel_water_ppm: 10,
        idle_alert_mins: 15,
        initial_engine_hours: 1890.0,
        current_engine_hours: 1896.5,
        engine_hours_today: 6.5,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 10000.0,
        current_odometer_km: 15400.0,
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 25.0,
        status: 'RUNNING',
        speed_kmh: 72.0,
        current_lat: 26.8467,
        current_lng: 80.9462,
        bearing: 110.0,
        route_name: 'Lucknow - Varanasi Freight Corridor',
        planned_origin: 'Transport Nagar Lucknow',
        planned_destination: 'Ramnagar Industrial Area Varanasi',
        deviation_km: 18.0,
        work_start_time: '08:50 AM', // Late start!
        late_start: 1,
        reefer_temp_c: 0.0,
        reefer_setpoint_c: 0.0,
        axle_payload_kg: 27500.0,
        max_payload_kg: 32000.0,
        avg_monthly_speed_kmh: 43.0,
        fuel_flow_rate_lph: 24.0,
        fuel_siphoning_loss_liters: 0.0,
        idling_loss_liters: 7.0,
        cph_loss_liters: 17.5,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 0.0
      },
      {
        id: 'VH-108',
        reg_no: 'WB-19-DF-4402',
        model: 'Tata LPT 3118 (10-Wheeler Reefer Box)',
        driver_name: 'Bapi Mondal',
        driver_phone: '+91 98300 48821',
        driver_score: 93,
        oem_cph: 15.5,
        cph_buffer_percent: 25.0,
        current_cph: 15.8,
        num_wheels: 10,
        num_tanks: 1,
        tank_capacity_liters: 365.0,
        current_fuel_liters: 190.0,
        fuel_level_mm: 270.0,
        fuel_temp_c: 25.0,
        fuel_water_ppm: 7,
        idle_alert_mins: 15,
        initial_engine_hours: 1120.0,
        current_engine_hours: 1127.4,
        engine_hours_today: 7.4,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 0.0,
        current_odometer_km: 7850.0,
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 15.0,
        status: 'RUNNING',
        speed_kmh: 52.0,
        current_lat: 22.5726,
        current_lng: 88.3639,
        bearing: 195.0,
        route_name: 'Kolkata - Haldia Port Transfer',
        planned_origin: 'Dankuni Logistics Center Kolkata',
        planned_destination: 'Haldia Dock Complex',
        deviation_km: 1.5,
        work_start_time: '07:00 AM',
        late_start: 0,
        reefer_temp_c: -21.0,
        reefer_setpoint_c: -20.0,
        axle_payload_kg: 19200.0,
        max_payload_kg: 21000.0,
        avg_monthly_speed_kmh: 40.0,
        fuel_flow_rate_lph: 15.6,
        fuel_siphoning_loss_liters: 0.0,
        idling_loss_liters: 2.8,
        cph_loss_liters: 0.0,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 0.0
      },
      {
        id: 'VH-109',
        reg_no: 'RJ-14-GH-6621',
        model: 'Mahindra Blazo X 49 (16-Wheeler Trailer)',
        driver_name: 'Staff Driver',
        driver_phone: '+91 94140 11223',
        driver_score: 85,
        oem_cph: 17.5,
        cph_buffer_percent: 25.0,
        current_cph: 17.8,
        num_wheels: 16,
        num_tanks: 2,
        tank_capacity_liters: 450.0,
        current_fuel_liters: 280.0,
        fuel_level_mm: 380.0,
        fuel_temp_c: 27.5,
        fuel_water_ppm: 6,
        idle_alert_mins: 15,
        initial_engine_hours: 980.0,
        current_engine_hours: 986.5,
        engine_hours_today: 6.5,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 0.0,
        current_odometer_km: 4200.0,
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 20.0,
        status: 'RUNNING',
        speed_kmh: 60.0,
        current_lat: 26.9124,
        current_lng: 75.7873,
        bearing: 180.0,
        route_name: 'Jaipur - Ajmer Highway',
        planned_origin: 'VKI Area Jaipur',
        planned_destination: 'Parbatsar Marble Zone',
        deviation_km: 4.0,
        work_start_time: '07:15 AM',
        late_start: 0,
        reefer_temp_c: 0.0,
        reefer_setpoint_c: 0.0,
        axle_payload_kg: 24000.0,
        max_payload_kg: 26000.0,
        avg_monthly_speed_kmh: 45.0,
        fuel_flow_rate_lph: 17.5,
        fuel_siphoning_loss_liters: 0.0,
        idling_loss_liters: 1.5,
        cph_loss_liters: 0.0,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 0.0
      },
      {
        id: 'VH-110',
        reg_no: 'TN-09-BK-9182',
        model: 'Volvo FMX 460 (12-Wheeler Heavy Hauler)',
        driver_name: 'Staff Driver',
        driver_phone: '+91 94440 33445',
        driver_score: 89,
        oem_cph: 21.0,
        cph_buffer_percent: 25.0,
        current_cph: 20.5,
        num_wheels: 12,
        num_tanks: 2,
        tank_capacity_liters: 520.0,
        current_fuel_liters: 360.0,
        fuel_level_mm: 410.0,
        fuel_temp_c: 28.0,
        fuel_water_ppm: 8,
        idle_alert_mins: 15,
        initial_engine_hours: 1450.0,
        current_engine_hours: 1457.2,
        engine_hours_today: 7.2,
        service_due_gap_km: 10000.0,
        last_service_odometer_km: 10000.0,
        current_odometer_km: 13500.0,
        route_deviation_allowed_km: 40.0,
        geofence_mode: 'AUTO',
        geofence_perimeter_km: 20.0,
        status: 'RUNNING',
        speed_kmh: 55.0,
        current_lat: 12.9716,
        current_lng: 79.1596,
        bearing: 220.0,
        route_name: 'Chennai - Vellore Logistics Route',
        planned_origin: 'Ennore Port Chennai',
        planned_destination: 'Ranipet SIPCOT Hub',
        deviation_km: 3.0,
        work_start_time: '06:45 AM',
        late_start: 0,
        reefer_temp_c: 0.0,
        reefer_setpoint_c: 0.0,
        axle_payload_kg: 28500.0,
        max_payload_kg: 31000.0,
        avg_monthly_speed_kmh: 44.0,
        fuel_flow_rate_lph: 20.8,
        fuel_siphoning_loss_liters: 0.0,
        idling_loss_liters: 2.1,
        cph_loss_liters: 0.0,
        deviation_loss_liters: 0.0,
        mismatch_loss_liters: 0.0
      }
    ];

    const stmt = db.prepare(`INSERT INTO vehicles (
      id, reg_no, model, driver_name, driver_phone, driver_score,
      oem_cph, cph_buffer_percent, current_cph, num_wheels, num_tanks,
      tank_capacity_liters, current_fuel_liters, fuel_level_mm, fuel_temp_c, fuel_water_ppm,
      idle_alert_mins, initial_engine_hours, current_engine_hours, engine_hours_today,
      service_due_gap_km, last_service_odometer_km, current_odometer_km,
      route_deviation_allowed_km, geofence_mode, geofence_perimeter_km,
      status, speed_kmh, current_lat, current_lng, bearing,
      route_name, planned_origin, planned_destination, deviation_km,
      work_start_time, late_start, reefer_temp_c, reefer_setpoint_c,
      axle_payload_kg, max_payload_kg, avg_monthly_speed_kmh, fuel_flow_rate_lph,
      fuel_siphoning_loss_liters, idling_loss_liters, cph_loss_liters, deviation_loss_liters, mismatch_loss_liters
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    initialVehicles.forEach(v => {
      stmt.run(
        v.id, v.reg_no, v.model, v.driver_name, v.driver_phone, v.driver_score,
        v.oem_cph, v.cph_buffer_percent, v.current_cph, v.num_wheels, v.num_tanks,
        v.tank_capacity_liters, v.current_fuel_liters, v.fuel_level_mm, v.fuel_temp_c, v.fuel_water_ppm,
        v.idle_alert_mins, v.initial_engine_hours, v.current_engine_hours, v.engine_hours_today,
        v.service_due_gap_km, v.last_service_odometer_km, v.current_odometer_km,
        v.route_deviation_allowed_km, v.geofence_mode, v.geofence_perimeter_km,
        v.status, v.speed_kmh, v.current_lat, v.current_lng, v.bearing,
        v.route_name, v.planned_origin, v.planned_destination, v.deviation_km,
        v.work_start_time, v.late_start, v.reefer_temp_c, v.reefer_setpoint_c,
        v.axle_payload_kg, v.max_payload_kg, v.avg_monthly_speed_kmh, v.fuel_flow_rate_lph,
        v.fuel_siphoning_loss_liters, v.idling_loss_liters, v.cph_loss_liters, v.deviation_loss_liters, v.mismatch_loss_liters
      );
    });
    stmt.finalize();

    // Seed 13 Alert Types covering A to M with initial acknowledged=0 (Red button)
    const initialAlerts = [
      {
        id: 'ALT-1001',
        vehicle_id: 'VH-102',
        reg_no: 'DL-01-AX-9021',
        type: 'FUEL_SIPHONING',
        severity: 'CRITICAL',
        title: 'Fuel Siphoning Loss Detected (> 5L)',
        message: 'Sudden drop of 28.5L detected in Fuel Tank.',
        metric_value: '28.5 Liters (₹2,679)',
        location: 'NH48 Dhaba km 142, Kotputli, RJ',
        timestamp: '11:42 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1002',
        vehicle_id: 'VH-103',
        reg_no: 'KA-04-MB-4190',
        type: 'REFUEL_DISCREPANCY',
        severity: 'HIGH',
        title: 'Refuelling Mismatch Loss',
        message: 'Slip / Card statement recorded 180.0L but digital tank sensor rise was only 158.0L. Discrepancy of 22.0L.',
        metric_value: '22.0L Shortfall (₹2,068)',
        location: 'HPCL COCO Pump, Sriperumbudur',
        timestamp: '11:15 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1003',
        vehicle_id: 'VH-103',
        reg_no: 'KA-04-MB-4190',
        type: 'IDLE_ALERT',
        severity: 'HIGH',
        title: 'Idling Alert (> 15 min)',
        message: 'Idling Alert! Vehicle number KA-04-MB-4190 remained idle for 24 minutes at Sriperumbudur Loading Bay 4, resulting in 2.4 litres of diesel wasted in idling (approx. ₹226).',
        metric_value: '24 mins (2.4 L/hr)',
        location: 'Sriperumbudur Loading Bay 4',
        timestamp: '10:50 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1004',
        vehicle_id: 'VH-101',
        reg_no: 'MH-12-RN-8842',
        type: 'HIGH_CPH',
        severity: 'HIGH',
        title: 'High CPH Loss (> 25% OEM Benchmark)',
        message: 'Current CPH 24.8 L/hr exceeds OEM benchmark (18.0 L/hr) by +37.7% under laden highway conditions.',
        metric_value: '24.8 L/hr (+37.7%)',
        location: 'Samruddhi Mahamarg Ch. 182',
        timestamp: '10:28 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1005',
        vehicle_id: 'VH-102',
        reg_no: 'DL-01-AX-9021',
        type: 'ROUTE_DEVIATION',
        severity: 'HIGH',
        title: 'Route Deviation Alert (> 50 km)',
        message: 'Geofence Breach Alert! Your vehicle number DL-01-AX-9021 has deviated 56.4 km from its designated route. Please verify the vehicle\'s location and check route deviation authorization.',
        metric_value: '56.4 km Deviation',
        location: 'State Highway 19, Dausa link',
        timestamp: '10:05 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1006',
        vehicle_id: 'VH-101',
        reg_no: 'MH-12-RN-8842',
        type: 'LATE_START',
        severity: 'MEDIUM',
        title: 'Late Start Alert (Started after 8:00 AM)',
        message: 'Late Start Alert! Vehicle number MH-12-RN-8842 commenced its trip later than the scheduled departure time.',
        metric_value: '08:42 AM Start',
        location: 'JNPT Freight Yard, Navi Mumbai',
        timestamp: '08:42 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1007',
        vehicle_id: 'VH-101',
        reg_no: 'MH-12-RN-8842',
        type: 'SERVICING_DUE',
        severity: 'MEDIUM',
        title: 'Vehicle Servicing Due (< 500 km remaining)',
        message: 'Odometer at 9,680 km. Scheduled 10,000 km mandatory preventive overhaul is within 320 km.',
        metric_value: '9,680 / 10,000 km (320 km left)',
        location: 'Nagpur Highway Link',
        timestamp: '08:30 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1008',
        vehicle_id: 'VH-102',
        reg_no: 'DL-01-AX-9021',
        type: 'COLD_TEMP',
        severity: 'CRITICAL',
        title: 'Reefer Cold Temp Breach Alert',
        message: 'Pharma cargo cold room temperature rose to -12.3°C, exceeding max allowable setpoint threshold of -18.0°C.',
        metric_value: '-12.3°C (Target: -18°C)',
        location: 'Near Shahpura Toll Plaza',
        timestamp: '08:15 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1009',
        vehicle_id: 'VH-102',
        reg_no: 'DL-01-AX-9021',
        type: 'AXLE_OVERWEIGHT',
        severity: 'HIGH',
        title: 'Axle Payload Overweight Alert',
        message: 'Electronic axle sensor weight is 29,400 kg against legal permit GVW of 28,000 kg (+1,400 kg overload).',
        metric_value: '29,400 kg (+1.4T)',
        location: 'Shahpura Weigh Bridge',
        timestamp: '07:55 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1010',
        vehicle_id: 'VH-104',
        reg_no: 'GJ-06-ZZ-7711',
        type: 'HARSH_DRIVING',
        severity: 'MEDIUM',
        title: 'Harsh Driving & Rapid Decel Alert',
        message: 'Vehicle triggered 4 harsh braking events (> 12 km/h/s) and 3 rapid pedal kick accelerations in last 20 mins.',
        metric_value: 'Score: 65/100',
        location: 'NH48 Vadodara bypass',
        timestamp: '07:40 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1011',
        vehicle_id: 'VH-101',
        reg_no: 'MH-12-RN-8842',
        type: 'OVERSPEEDING_2X',
        severity: 'HIGH',
        title: 'Over Speeding Alert (2x Monthly Average)',
        message: 'Overspeeding Alert! Your vehicle is travelling at 88 km/h against the permitted limit of 60 km/h. Please maintain speed limits and ensure safe driving.',
        metric_value: '88 km/h vs 42 km/h avg',
        location: 'Samruddhi Expressway stretch',
        timestamp: '07:20 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1012',
        vehicle_id: 'VH-105',
        reg_no: 'HR-55-AK-3004',
        type: 'RTO_COMPLIANCE_DUE',
        severity: 'CRITICAL',
        title: 'RTO Compliance Renewal Due Alert',
        message: 'National Goods Permit and State Fitness Certificate expiring in 6 days (22-Oct-2026). Mandatory renewal.',
        metric_value: 'Expires in 6 Days',
        location: 'Gurgaon Central Depot',
        timestamp: '07:00 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1013',
        vehicle_id: 'VH-106',
        reg_no: 'AP-16-TX-5509',
        type: 'REFUEL_SUCCESS',
        severity: 'LOW',
        title: 'Refuelling Completed Alert',
        message: 'Refuelling detected! Your vehicle number AP-16-TX-5509 has added 220 litres of fuel at IOCL Mega Point Vijayawada, at 06:30 AM.',
        metric_value: '+220.0 Liters Sensor Rise',
        location: 'IOCL Highway Station Vijayawada',
        timestamp: '06:30 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1014',
        vehicle_id: 'VH-101',
        reg_no: 'MH-12-RN-8842',
        type: 'HARSH_BRAKING',
        severity: 'HIGH',
        title: 'Harsh Braking Alert (-14.2 km/h/s)',
        message: 'Harsh braking detected! Your vehicle number MH-12-RN-8842 has experienced sudden deceleration. Please check driver safety & ensure safe driving practices.',
        metric_value: '-14.2 km/h/s (3.9s)',
        location: 'Samruddhi Mahamarg km 194, Jalna',
        timestamp: '11:58 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1015',
        vehicle_id: 'VH-104',
        reg_no: 'GJ-06-ZZ-7711',
        type: 'SHARP_CORNERING',
        severity: 'HIGH',
        title: 'Sharp Cornering & High G-Force Spike',
        message: 'Aggressive steering at 62 km/h around sharp curve triggered 0.48G lateral acceleration, exceeding safe rollover margin (0.35G).',
        metric_value: '0.48G Lateral (62 km/h)',
        location: 'NH48 Vadodara-Surat Highway Curve km 74',
        timestamp: '11:35 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1016',
        vehicle_id: 'VH-102',
        reg_no: 'DL-01-AX-9021',
        type: 'EWAY_EXPIRING',
        severity: 'CRITICAL',
        title: 'E-Way Bill Expiring (< 4 Hours)',
        message: 'E-Way Bill #2819-2847-1920 (Consignment ₹28.5L) expires in 3h 15m at 03:00 PM. Truck has 142 km remaining to terminal.',
        metric_value: 'Expires in 3h 15m (142 km left)',
        location: 'NH48 Kotputli Corridor, RJ',
        timestamp: '11:10 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1017',
        vehicle_id: 'VH-105',
        reg_no: 'HR-55-AK-3004',
        type: 'CHALLAN_PENDING',
        severity: 'HIGH',
        title: 'Parivahan e-Challan Overdue Pending',
        message: 'Unpaid traffic e-Challan #HR2026101402 of ₹4,000 for highway lane violation overdue by 14 days. Immediate online settlement required.',
        metric_value: '₹4,000 Due (14 Days Overdue)',
        location: 'Gurgaon-Neemrana Toll Point',
        timestamp: '10:45 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1018',
        vehicle_id: 'VH-103',
        reg_no: 'KA-04-MB-4190',
        type: 'AXLE_OVERWEIGHT',
        severity: 'CRITICAL',
        title: 'Axle Overweight Limit Exceeded Alert',
        message: 'Drive tandem axle sensor load reached 13,420 kg, exceeding MoRTH statutory CMVR limit of 11,500 kg (+1,920 kg overload). Potential RTO detention.',
        metric_value: '13,420 kg (+1,920 kg Overload)',
        location: 'Sriperumbudur Electronic Weighbridge NH48',
        timestamp: '10:15 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1019',
        vehicle_id: 'VH-107',
        reg_no: 'UP-32-HN-1244',
        type: 'AXLE_IMBALANCE',
        severity: 'HIGH',
        title: 'Axle Weight Imbalance Alert (> 18%)',
        message: 'Uneven payload distribution detected: Left axle weight 8,900 kg vs Right axle 6,850 kg (22.4% lateral imbalance / 2,050 kg Δ). Severe rollover & uneven tire wear risk.',
        metric_value: '22.4% Imbalance (2,050 kg Δ)',
        location: 'Lucknow-Varanasi Freight Corridor km 112',
        timestamp: '09:40 AM',
        is_acknowledged: 0
      },
      {
        id: 'ALT-1020',
        vehicle_id: 'VH-108',
        reg_no: 'WB-19-DF-4402',
        type: 'CARGO_TEMP_INCREASING',
        severity: 'CRITICAL',
        title: 'Cargo Temp Increasing Rapidly Alert',
        message: 'Cold storage chamber temp rose rapidly (+1.8°C in 15 mins). Current sensor reads -9.4°C against frozen pharma target of -18.0°C. Check reefer unit and door seal.',
        metric_value: '-9.4°C (Rising +1.8°C/15m)',
        location: 'Kolkata-Haldia Port Highway km 46',
        timestamp: '09:12 AM',
        is_acknowledged: 0
      }
    ];

    const alertStmt = db.prepare(`INSERT INTO alerts (
      id, vehicle_id, reg_no, type, severity, title, message, metric_value, location, timestamp, is_acknowledged
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

    initialAlerts.forEach(a => {
      alertStmt.run(a.id, a.vehicle_id, a.reg_no, a.type, a.severity, a.title, a.message, a.metric_value, a.location, a.timestamp, a.is_acknowledged);
    });
    alertStmt.finalize();

    // Seed Refueling Records with Cross-Check slips
    const initialRefuels = [
      {
        id: 'REF-801',
        vehicle_id: 'VH-103',
        reg_no: 'KA-04-MB-4190',
        refuel_time: '2026-10-15 11:15',
        station_name: 'HPCL COCO Pump, Sriperumbudur',
        fuel_slip_no: 'SLIP-99201',
        fleet_card_statement_no: 'FC-HDFC-99321',
        slip_liters: 180.0,
        sensor_rise_liters: 158.0,
        mismatch_liters: 22.0, // Shortfall!
        fuel_rate_per_liter: 94.0,
        total_amount_inr: 16920.0,
        status: 'DISCREPANCY_FLAGGED',
        notes: 'Discrepancy of 22 Liters between slip and digital sensor rise. Investigation initiated.'
      },
      {
        id: 'REF-802',
        vehicle_id: 'VH-106',
        reg_no: 'AP-16-TX-5509',
        refuel_time: '2026-10-15 06:30',
        station_name: 'IOCL Mega Point Vijayawada',
        fuel_slip_no: 'SLIP-88142',
        fleet_card_statement_no: 'FC-SBI-44102',
        slip_liters: 220.0,
        sensor_rise_liters: 220.0,
        mismatch_liters: 0.0,
        fuel_rate_per_liter: 94.5,
        total_amount_inr: 20790.0,
        status: 'MATCHED',
        notes: '100% matched with automated electronic sensor rise.'
      },
      {
        id: 'REF-803',
        vehicle_id: 'VH-101',
        reg_no: 'MH-12-RN-8842',
        refuel_time: '2026-10-14 19:40',
        station_name: 'BPCL Highway Oasis Samruddhi',
        fuel_slip_no: 'SLIP-77319',
        fleet_card_statement_no: 'FC-ICICI-66219',
        slip_liters: 350.0,
        sensor_rise_liters: 348.5,
        mismatch_liters: 1.5,
        fuel_rate_per_liter: 93.8,
        total_amount_inr: 32830.0,
        status: 'MATCHED',
        notes: 'Within 0.5% standard thermal tolerance.'
      }
    ];

    const refuelStmt = db.prepare(`INSERT INTO refueling_records (
      id, vehicle_id, reg_no, refuel_time, station_name, fuel_slip_no,
      fleet_card_statement_no, slip_liters, sensor_rise_liters, mismatch_liters,
      fuel_rate_per_liter, total_amount_inr, status, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    initialRefuels.forEach(r => {
      refuelStmt.run(r.id, r.vehicle_id, r.reg_no, r.refuel_time, r.station_name, r.fuel_slip_no, r.fleet_card_statement_no, r.slip_liters, r.sensor_rise_liters, r.mismatch_liters, r.fuel_rate_per_liter, r.total_amount_inr, r.status, r.notes);
    });
    refuelStmt.finalize();

    // Seed Siphoning Events
    const initialSiphons = [
      {
        id: 'SIPH-501',
        vehicle_id: 'VH-102',
        reg_no: 'DL-01-AX-9021',
        detected_time: '2026-10-28 04:15',
        moved_15m_time: '2026-10-28 04:30',
        siphoned_liters: 28.5,
        estimated_loss_inr: 2679.0,
        location_name: 'NH48 Dhaba km 142, Kotputli, RJ',
        lat: 27.7011,
        lng: 76.2023,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-502',
        vehicle_id: 'VH-104',
        reg_no: 'GJ-06-ZZ-7711',
        detected_time: '2026-10-27 23:15',
        moved_15m_time: '2026-10-27 23:30',
        siphoned_liters: 14.0,
        estimated_loss_inr: 1316.0,
        location_name: 'GIDC Bypass Roadside Hotel, Ankleshwar',
        lat: 21.6264,
        lng: 72.9991,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-503',
        vehicle_id: 'VH-107',
        reg_no: 'UP-32-HN-1244',
        detected_time: '2026-10-26 18:40',
        moved_15m_time: '2026-10-26 18:55',
        siphoned_liters: 22.0,
        estimated_loss_inr: 2068.0,
        location_name: 'Lucknow Ring Road Toll Oasis Dhaba',
        lat: 26.8467,
        lng: 80.9462,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-504',
        vehicle_id: 'VH-101',
        reg_no: 'MH-12-RN-8842',
        detected_time: '2026-10-24 02:25',
        moved_15m_time: '2026-10-24 02:40',
        siphoned_liters: 18.5,
        estimated_loss_inr: 1739.0,
        location_name: 'Samruddhi Expressway Rest Bay km 184',
        lat: 19.8762,
        lng: 75.3433,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-505',
        vehicle_id: 'VH-103',
        reg_no: 'KA-04-MB-4190',
        detected_time: '2026-10-23 21:50',
        moved_15m_time: '2026-10-23 22:05',
        siphoned_liters: 25.0,
        estimated_loss_inr: 2350.0,
        location_name: 'Hosur Border Highway Truck Layby',
        lat: 12.7409,
        lng: 77.8253,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-506',
        vehicle_id: 'VH-105',
        reg_no: 'HR-55-AK-3004',
        detected_time: '2026-10-22 14:10',
        moved_15m_time: '2026-10-22 14:25',
        siphoned_liters: 16.5,
        estimated_loss_inr: 1551.0,
        location_name: 'Neemrana Japanese Zone Flyover Service Lane',
        lat: 27.9942,
        lng: 76.3882,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-507',
        vehicle_id: 'VH-106',
        reg_no: 'AP-16-TX-5509',
        detected_time: '2026-10-20 03:40',
        moved_15m_time: '2026-10-20 03:55',
        siphoned_liters: 14.0,
        estimated_loss_inr: 1288.0,
        location_name: 'Eluru Bypass Truck Bay, NH16, AP',
        lat: 16.7107,
        lng: 81.0952,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-508',
        vehicle_id: 'VH-108',
        reg_no: 'WB-19-DF-4402',
        detected_time: '2026-10-18 01:20',
        moved_15m_time: '2026-10-18 01:35',
        siphoned_liters: 11.5,
        estimated_loss_inr: 1058.0,
        location_name: 'Kolaghat NH116 Bridge Rest Point',
        lat: 22.4277,
        lng: 87.8727,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-509',
        vehicle_id: 'VH-109',
        reg_no: 'RJ-14-GH-6621',
        detected_time: '2026-10-16 22:50',
        moved_15m_time: '2026-10-16 23:05',
        siphoned_liters: 9.5,
        estimated_loss_inr: 874.0,
        location_name: 'Kishangarh Marble Area Layby km 92',
        lat: 26.5746,
        lng: 74.8654,
        verified_after_15min_move: 1
      },
      {
        id: 'SIPH-510',
        vehicle_id: 'VH-110',
        reg_no: 'TN-09-BK-9182',
        detected_time: '2026-10-13 20:15',
        moved_15m_time: '2026-10-13 20:30',
        siphoned_liters: 6.0,
        estimated_loss_inr: 552.0,
        location_name: 'Kanchipuram Outer Ring Toll Bay',
        lat: 12.8342,
        lng: 79.7036,
        verified_after_15min_move: 1
      }
    ];

    const siphStmt = db.prepare(`INSERT INTO siphoning_events (
      id, vehicle_id, reg_no, detected_time, moved_15m_time, siphoned_liters, estimated_loss_inr, location_name, lat, lng, verified_after_15min_move
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

    initialSiphons.forEach(s => {
      siphStmt.run(s.id, s.vehicle_id, s.reg_no, s.detected_time, s.moved_15m_time, s.siphoned_liters, s.estimated_loss_inr, s.location_name, s.lat, s.lng, s.verified_after_15min_move);
    });
    siphStmt.finalize();

    // Seed Tank Calibration points (Dip mm to Liters curve)
    const calibrationPoints = [
      { v: 'VH-101', mm: 50, l: 38 },
      { v: 'VH-101', mm: 100, l: 82 },
      { v: 'VH-101', mm: 150, l: 130 },
      { v: 'VH-101', mm: 200, l: 185 },
      { v: 'VH-101', mm: 250, l: 242 },
      { v: 'VH-101', mm: 300, l: 300 },
      { v: 'VH-101', mm: 350, l: 358 },
      { v: 'VH-101', mm: 400, l: 415 },
      { v: 'VH-101', mm: 450, l: 470 },
      { v: 'VH-101', mm: 500, l: 520 },
      { v: 'VH-101', mm: 550, l: 565 },
      { v: 'VH-101', mm: 600, l: 600 }
    ];

    const calibStmt = db.prepare(`INSERT INTO tank_calibration (vehicle_id, dip_mm, volume_liters, tank_index) VALUES (?,?,?,?)`);
    calibrationPoints.forEach(p => {
      calibStmt.run(p.v, p.mm, p.l, 1);
    });
    calibStmt.finalize();

    // Seed RTO Compliance (All 10 Fleet Vehicles)
    const rtoData = [
      { id: 'RTO-1', vehicle_id: 'VH-101', reg_no: 'MH-12-RN-8842', fit: '2027-04-15', np: '2027-03-10', ins: '2026-11-20', puc: '2026-12-05', tax: '2027-01-01', gtax: '2027-01-01', st: 'VALID' },
      { id: 'RTO-2', vehicle_id: 'VH-102', reg_no: 'DL-01-AX-9021', fit: '2026-12-01', np: '2026-11-15', ins: '2027-02-14', puc: '2026-11-30', tax: '2027-03-31', gtax: '2027-03-31', st: 'VALID' },
      { id: 'RTO-3', vehicle_id: 'VH-103', reg_no: 'KA-04-MB-4190', fit: '2027-02-15', np: '2027-01-10', ins: '2026-10-28', puc: '2026-10-30', tax: '2027-03-31', gtax: '2027-03-31', st: 'EXPIRING_SOON' },
      { id: 'RTO-4', vehicle_id: 'VH-104', reg_no: 'GJ-06-ZZ-7711', fit: '2027-08-10', np: '2027-06-20', ins: '2027-05-15', puc: '2027-01-10', tax: '2027-09-30', gtax: '2027-09-30', st: 'VALID' },
      { id: 'RTO-5', vehicle_id: 'VH-105', reg_no: 'HR-55-AK-3004', fit: '2026-10-22', np: '2026-10-22', ins: '2026-10-25', puc: '2026-10-20', tax: '2026-10-31', gtax: '2026-10-31', st: 'EXPIRING_SOON' },
      { id: 'RTO-6', vehicle_id: 'VH-106', reg_no: 'AP-16-TX-5509', fit: '2027-09-12', np: '2027-07-25', ins: '2027-06-18', puc: '2027-03-14', tax: '2027-08-31', gtax: '2027-08-31', st: 'VALID' },
      { id: 'RTO-7', vehicle_id: 'VH-107', reg_no: 'UP-32-HN-1244', fit: '2027-05-20', np: '2027-04-15', ins: '2026-11-28', puc: '2026-12-10', tax: '2027-04-01', gtax: '2027-04-01', st: 'VALID' },
      { id: 'RTO-8', vehicle_id: 'VH-108', reg_no: 'WB-19-DF-4402', fit: '2027-10-05', np: '2027-08-15', ins: '2027-07-20', puc: '2027-02-28', tax: '2027-09-30', gtax: '2027-09-30', st: 'VALID' },
      { id: 'RTO-9', vehicle_id: 'VH-109', reg_no: 'RJ-14-GH-6621', fit: '2027-11-18', np: '2027-09-30', ins: '2027-08-10', puc: '2027-04-15', tax: '2027-10-31', gtax: '2027-10-31', st: 'VALID' },
      { id: 'RTO-10', vehicle_id: 'VH-110', reg_no: 'TN-09-BK-9182', fit: '2027-12-20', np: '2027-11-15', ins: '2027-10-05', puc: '2027-05-20', tax: '2027-11-30', gtax: '2027-11-30', st: 'VALID' }
    ];

    const rtoStmt = db.prepare(`INSERT INTO rto_compliance (id, vehicle_id, reg_no, fitness_expiry, national_permit_expiry, insurance_expiry, puc_expiry, road_tax_expiry, green_tax_expiry, status) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    rtoData.forEach(r => {
      rtoStmt.run(r.id, r.vehicle_id, r.reg_no, r.fit, r.np, r.ins, r.puc, r.tax, r.gtax, r.st);
    });
    rtoStmt.finalize();

    // Seed RBAC Users
    const rbacUsers = [
      { id: 'USR-1', name: 'Vikramaditya Rao', email: 'vikram@axonafleet.com', role: 'Super Admin', dept: 'Executive Operations', can_edit: 1, can_ack: 1, can_audit: 1 },
      { id: 'USR-2', name: 'Pooja Deshmukh', email: 'pooja.d@axonafleet.com', role: 'Fleet Manager', dept: 'Fleet Control', can_edit: 1, can_ack: 1, can_audit: 1 },
      { id: 'USR-3', name: 'Amitabh Sen', email: 'fuel.audit@axonafleet.com', role: 'Fuel Auditor', dept: 'Diesel Intelligence', can_edit: 0, can_ack: 1, can_audit: 1 },
      { id: 'USR-4', name: 'Naveen Kumar', email: 'noc.duty@axonafleet.com', role: 'NOC Controller', dept: 'Command Center 24/7', can_edit: 0, can_ack: 1, can_audit: 0 }
    ];

    const userStmt = db.prepare(`INSERT INTO users_rbac (id, name, email, role, department, can_edit_settings, can_acknowledge_alerts, can_audit_fuel) VALUES (?,?,?,?,?,?,?,?)`);
    rbacUsers.forEach(u => {
      userStmt.run(u.id, u.name, u.email, u.role, u.dept, u.can_edit, u.can_ack, u.can_audit);
    });
    userStmt.finalize();

    console.log("Axona Fleet Analytics database successfully seeded!");
  });
}

function seedHistoricalDataIfEmpty() {
  db.get("SELECT COUNT(*) as count FROM historical_monthly_audits", (err, row) => {
    if (err || (row && row.count > 0)) {
      return; // Already permanently saved in SQLite!
    }

    console.log("Permanently archiving 12-month historical audits (Nov 2025 - Oct 2026) in SQLite...");

    const DIESEL_RATE = 94.0;
    const months = [
      { name: 'Nov 2025', idx: 1 },
      { name: 'Dec 2025', idx: 2 },
      { name: 'Jan 2026', idx: 3 },
      { name: 'Feb 2026', idx: 4 },
      { name: 'Mar 2026', idx: 5 },
      { name: 'Apr 2026', idx: 6 },
      { name: 'May 2026', idx: 7 },
      { name: 'Jun 2026', idx: 8 },
      { name: 'Jul 2026', idx: 9 },
      { name: 'Aug 2026', idx: 10 },
      { name: 'Sep 2026', idx: 11 },
      { name: 'Oct 2026 (MTD)', idx: 12 }
    ];

    db.all("SELECT id, reg_no, model, oem_cph, route_name FROM vehicles", (err, vehicles) => {
      if (err || !vehicles || vehicles.length === 0) return;

      const stmt = db.prepare(`INSERT INTO historical_monthly_audits (
        box_key, month, month_index, vehicle_id, reg_no, model,
        monthly_km, oem_cph, actual_avg_cph,
        siphoned_liters, siphoning_loss_inr,
        mismatch_liters, mismatch_loss_inr,
        idling_liters, idling_loss_inr,
        cph_loss_liters, cph_loss_inr,
        deviation_loss_liters, deviation_loss_inr,
        total_lost_liters, total_financial_loss_inr,
        audit_resolution, route_name
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

      months.forEach((m) => {
        vehicles.forEach((v) => {
          const seed = ((v.id.charCodeAt(3) || 1) * m.idx) % 10;
          const siphL = (seed % 3 === 0) ? parseFloat((18.0 + seed * 2.2).toFixed(1)) : 0;
          const mismatchL = (seed % 2 === 0) ? parseFloat((12.0 + seed * 1.5).toFixed(1)) : 0;
          const idleL = parseFloat((35.0 + seed * 4.8).toFixed(1));
          const cphExcessL = (seed > 4) ? parseFloat((28.0 + seed * 3.4).toFixed(1)) : 0;
          const devL = (seed % 4 === 0) ? parseFloat((15.0 + seed * 2.0).toFixed(1)) : 0;
          const totalLostL = parseFloat((siphL + mismatchL + idleL + cphExcessL + devL).toFixed(1));
          const totalLossInr = Math.round(totalLostL * DIESEL_RATE);
          const monthlyKm = Math.round(6200 + seed * 450);

          stmt.run(
            'ALL',
            m.name,
            m.idx,
            v.id,
            v.reg_no,
            v.model,
            monthlyKm,
            v.oem_cph,
            parseFloat((v.oem_cph * (1 + (seed * 0.04))).toFixed(1)),
            siphL,
            Math.round(siphL * DIESEL_RATE),
            mismatchL,
            Math.round(mismatchL * DIESEL_RATE),
            idleL,
            Math.round(idleL * DIESEL_RATE),
            cphExcessL,
            Math.round(cphExcessL * DIESEL_RATE),
            devL,
            Math.round(devL * DIESEL_RATE),
            totalLostL,
            totalLossInr,
            siphL > 0 ? 'INVESTIGATED & VERIFIED' : 'NORMAL AUDIT CLEARED',
            v.route_name
          );
        });
      });

      stmt.finalize();
      console.log("Historical 12-month audits permanently stored in SQLite database!");
    });
  });

  db.get("SELECT COUNT(*) as count FROM historical_seven_day_events", (err, row) => {
    if (err || (row && row.count > 0)) return;

    console.log("Permanently archiving 7-day historical telemetry events in SQLite...");
    const stmt = db.prepare(`INSERT INTO historical_seven_day_events (
      id, box_key, vehicle_id, reg_no, model, event_time,
      metric_primary, metric_secondary, financial_loss_inr,
      location_name, status, details_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);

    const sevenDayEvents = [
      { id: 'SIPH-501', box_key: 'SIPHONING', vehicle_id: 'VH-102', reg_no: 'DL-01-AX-9021', model: 'BharatBenz 3528R (12-Wheeler Reefer)', time: '2026-10-16 04:15', p: 28.5, s: 4.8, inr: 2679, loc: 'NH48 Dhaba km 142, Kotputli, RJ', st: 'VERIFIED_POST_STOP_15MIN', details: 'Siphoning 28.5L detected at rest stop' },
      { id: 'SIPH-502', box_key: 'SIPHONING', vehicle_id: 'VH-104', reg_no: 'GJ-06-ZZ-7711', model: 'Eicher Pro 6028 (10-Wheeler Tipper)', time: '2026-10-15 23:15', p: 14.0, s: 3.5, inr: 1316, loc: 'GIDC Bypass Roadside Hotel, Ankleshwar', st: 'VERIFIED_POST_STOP_15MIN', details: 'Siphoning 14.0L detected' },
      { id: 'SIPH-503', box_key: 'SIPHONING', vehicle_id: 'VH-107', reg_no: 'UP-32-HN-1244', model: 'Ashok Leyland 4825 (16-Wheeler Haulage)', time: '2026-10-14 18:40', p: 22.0, s: 4.2, inr: 2068, loc: 'Lucknow Ring Road Toll Oasis Dhaba', st: 'VERIFIED_POST_STOP_15MIN', details: 'Siphoning 22.0L detected' },
      { id: 'SIPH-504', box_key: 'SIPHONING', vehicle_id: 'VH-101', reg_no: 'MH-12-RN-8842', model: 'Tata Prima 5530.S (18-Wheeler Tractor)', time: '2026-10-12 02:25', p: 18.5, s: 3.8, inr: 1739, loc: 'Samruddhi Expressway Rest Bay km 184', st: 'VERIFIED_POST_STOP_15MIN', details: 'Siphoning 18.5L detected' },
      { id: 'SIPH-505', box_key: 'SIPHONING', vehicle_id: 'VH-103', reg_no: 'KA-04-MB-4190', model: 'Ashok Leyland 4220 (14-Wheeler Multi-Axle)', time: '2026-10-11 21:50', p: 25.0, s: 5.1, inr: 2350, loc: 'Hosur Border Highway Truck Layby', st: 'VERIFIED_POST_STOP_15MIN', details: 'Siphoning 25.0L detected' },
      { id: 'SIPH-506', box_key: 'SIPHONING', vehicle_id: 'VH-105', reg_no: 'HR-55-AK-3004', model: 'Tata Signa 4825.TK (16-Wheeler Tipper)', time: '2026-10-10 14:10', p: 16.5, s: 3.9, inr: 1551, loc: 'Neemrana Japanese Zone Flyover Service Lane', st: 'VERIFIED_POST_STOP_15MIN', details: 'Siphoning 16.5L detected' },
      
      { id: 'REF-801', box_key: 'REFUEL_MISMATCH', vehicle_id: 'VH-103', reg_no: 'KA-04-MB-4190', model: 'Ashok Leyland 4220 (14-Wheeler Multi-Axle)', time: '2026-10-16 11:15', p: 22.0, s: 180.0, inr: 2068, loc: 'HPCL COCO Pump, Sriperumbudur', st: 'DISCREPANCY_FLAGGED', details: 'Slip billed 180L, tank sensor rose 158L (22L shortfall)' },
      { id: 'REF-802', box_key: 'REFUEL_MISMATCH', vehicle_id: 'VH-106', reg_no: 'AP-16-TX-5509', model: 'BharatBenz 2823R (10-Wheeler Container)', time: '2026-10-15 06:30', p: 0.0, s: 220.0, inr: 0, loc: 'IOCL Mega Point Vijayawada', st: 'MATCHED', details: '100% matched sensor rise' },
      { id: 'REF-803', box_key: 'REFUEL_MISMATCH', vehicle_id: 'VH-101', reg_no: 'MH-12-RN-8842', model: 'Tata Prima 5530.S (18-Wheeler Tractor)', time: '2026-10-14 19:40', p: 1.5, s: 350.0, inr: 141, loc: 'BPCL Highway Oasis Samruddhi', st: 'MATCHED', details: 'Within 0.5% thermal tolerance' },
      { id: 'REF-804', box_key: 'REFUEL_MISMATCH', vehicle_id: 'VH-104', reg_no: 'GJ-06-ZZ-7711', model: 'Eicher Pro 6028 (10-Wheeler Tipper)', time: '2026-10-13 08:20', p: 25.0, s: 210.0, inr: 2350, loc: 'HPCL COCO Ankleshwar Express', st: 'DISCREPANCY_FLAGGED', details: 'Slip billed 210L, sensor rose 185L' },
      { id: 'REF-805', box_key: 'REFUEL_MISMATCH', vehicle_id: 'VH-107', reg_no: 'UP-32-HN-1244', model: 'Ashok Leyland 4825 (16-Wheeler Haulage)', time: '2026-10-11 15:10', p: 18.0, s: 300.0, inr: 1692, loc: 'IOCL Highway COCO Hub Kanpur Road', st: 'DISCREPANCY_FLAGGED', details: '18L shortfall flagged' },

      { id: 'IDL-1', box_key: 'IDLING_LOSS', vehicle_id: 'VH-103', reg_no: 'KA-04-MB-4190', model: 'Ashok Leyland 4220 (14-Wheeler Multi-Axle)', time: '2026-10-16 14:20', p: 12.4, s: 38, inr: 1166, loc: 'Hosur Toll Plaza Truck Halt', st: 'IDLE_ALERT_LOGGED', details: '38 mins idling, 2.4 L/h burn rate' },
      { id: 'IDL-2', box_key: 'IDLING_LOSS', vehicle_id: 'VH-104', reg_no: 'GJ-06-ZZ-7711', model: 'Eicher Pro 6028 (10-Wheeler Tipper)', time: '2026-10-15 16:05', p: 8.6, s: 28, inr: 808, loc: 'Dahej Industrial Entry Gate', st: 'IDLE_ALERT_LOGGED', details: '28 mins idling' },
      { id: 'IDL-3', box_key: 'IDLING_LOSS', vehicle_id: 'VH-107', reg_no: 'UP-32-HN-1244', model: 'Ashok Leyland 4825 (16-Wheeler Haulage)', time: '2026-10-14 11:30', p: 7.0, s: 25, inr: 658, loc: 'Varanasi Bypass Loading Yard', st: 'IDLE_ALERT_LOGGED', details: '25 mins idling' },

      { id: 'CPH-1', box_key: 'HIGH_CPH', vehicle_id: 'VH-101', reg_no: 'MH-12-RN-8842', model: 'Tata Prima 5530.S (18-Wheeler Tractor)', time: '2026-10-16 15:10', p: 19.5, s: 24.8, inr: 1833, loc: 'Mumbai-Nagpur Corridor', st: 'CPH_EXCESS_LOGGED', details: 'Live CPH 24.8 vs OEM 18.0' },
      { id: 'CPH-2', box_key: 'HIGH_CPH', vehicle_id: 'VH-104', reg_no: 'GJ-06-ZZ-7711', model: 'Eicher Pro 6028 (10-Wheeler Tipper)', time: '2026-10-15 12:30', p: 22.5, s: 21.4, inr: 2115, loc: 'Vadodara-Dahej Belt', st: 'CPH_EXCESS_LOGGED', details: 'Live CPH 21.4 vs OEM 15.0' },

      { id: 'DEV-1', box_key: 'ROUTE_DEVIATION', vehicle_id: 'VH-102', reg_no: 'DL-01-AX-9021', model: 'BharatBenz 3528R (12-Wheeler Reefer)', time: '2026-10-16 11:20', p: 18.2, s: 56.4, inr: 1711, loc: 'State Highway 14 (Shahpura Bypass Link)', st: 'ROUTE_DEVIATION_LOGGED', details: 'Deviation 56.4 km (Allowed 40 km)' },
      { id: 'DEV-2', box_key: 'ROUTE_DEVIATION', vehicle_id: 'VH-107', reg_no: 'UP-32-HN-1244', model: 'Ashok Leyland 4825 (16-Wheeler Haulage)', time: '2026-10-14 09:10', p: 11.4, s: 48.5, inr: 1072, loc: 'Sultanpur De-tour Road', st: 'ROUTE_DEVIATION_LOGGED', details: 'Deviation 48.5 km (Allowed 40 km)' }
    ];

    sevenDayEvents.forEach(e => {
      stmt.run(e.id, e.box_key, e.vehicle_id, e.reg_no, e.model, e.time, e.p, e.s, e.inr, e.loc, e.st, e.details);
    });
    stmt.finalize();
    console.log("Historical 7-day events permanently stored in SQLite database!");
  });
}

module.exports = {
  db,
  initDatabase
};
