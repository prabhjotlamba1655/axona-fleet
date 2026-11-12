-- ============================================================================
-- AXONA FLEET MANAGEMENT - ENTERPRISE DATABASE SCHEMA
-- Developed by Axona Software LLP
-- Compatible with PostgreSQL & SQLite
-- ============================================================================

-- 1. Tenants (Companies / Fleet Accounts / Individuals)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tenant_type TEXT NOT NULL DEFAULT 'company', -- 'super', 'company', 'individual'
    contact_person TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    security_pin TEXT DEFAULT '1234', -- for remote immobilisation verification
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 4. Vehicle Categories
CREATE TABLE IF NOT EXISTS vehicle_categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE, -- 'car', 'bike', 'truck', 'bus', 'taxi', 'other'
    name TEXT NOT NULL,
    icon TEXT,
    speed_limit_default REAL DEFAULT 80.0
);

-- 5. Device Manufacturers
CREATE TABLE IF NOT EXISTS device_manufacturers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- 'ais140_generic', 'teltonika', 'concox', 'queclink'
    protocol TEXT NOT NULL, -- 'TCP', 'UDP', 'HTTP', 'API'
    port INTEGER DEFAULT 5000,
    supports_immobilisation INTEGER DEFAULT 1,
    is_ais140_certified INTEGER DEFAULT 1
);

-- 6. GPS Devices
CREATE TABLE IF NOT EXISTS gps_devices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    imei TEXT UNIQUE NOT NULL,
    manufacturer_id TEXT NOT NULL,
    model TEXT NOT NULL,
    sim_number TEXT,
    firmware_version TEXT DEFAULT '1.4.0',
    is_ais140_compliant INTEGER DEFAULT 1,
    status TEXT DEFAULT 'online', -- 'online', 'offline', 'tampered', 'inactive'
    last_communication TIMESTAMP,
    main_power_connected INTEGER DEFAULT 1,
    backup_battery_pct INTEGER DEFAULT 95,
    gps_fixed INTEGER DEFAULT 1,
    satellites INTEGER DEFAULT 12,
    tamper_detected INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (manufacturer_id) REFERENCES device_manufacturers(id)
);

-- 7. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    category_id TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    manufacturing_year INTEGER,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    emergency_contact_phone TEXT NOT NULL,
    photo_url TEXT,
    device_id TEXT UNIQUE,
    installation_date TEXT,
    speed_limit REAL DEFAULT 80.0,
    is_active INTEGER DEFAULT 1,
    immobilisation_status TEXT DEFAULT 'active', -- 'active', 'immobilised', 'pending'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES vehicle_categories(id),
    FOREIGN KEY (device_id) REFERENCES gps_devices(id) ON DELETE SET NULL,
    UNIQUE(tenant_id, registration_number)
);

-- 8. User Vehicle Assignments (For Sub Users & Individual Access)
CREATE TABLE IF NOT EXISTS user_vehicle_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    UNIQUE(user_id, vehicle_id)
);

-- 9. Latest Vehicle Location (Fast lookups for dashboard & live map)
CREATE TABLE IF NOT EXISTS latest_vehicle_locations (
    vehicle_id TEXT PRIMARY KEY,
    device_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude REAL DEFAULT 0,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    ignition INTEGER DEFAULT 0,
    movement_status TEXT DEFAULT 'stopped', -- 'moving', 'stopped', 'idle', 'offline'
    main_power INTEGER DEFAULT 1,
    panic_status INTEGER DEFAULT 0,
    address TEXT,
    gps_time TIMESTAMP NOT NULL,
    server_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_packet TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 10. GPS Location History (Historical breadcrumbs)
CREATE TABLE IF NOT EXISTS gps_location_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    ignition INTEGER DEFAULT 0,
    main_power INTEGER DEFAULT 1,
    panic_button INTEGER DEFAULT 0,
    address TEXT,
    gps_time TIMESTAMP NOT NULL,
    server_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 11. Trips
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    start_latitude REAL NOT NULL,
    start_longitude REAL NOT NULL,
    start_address TEXT,
    end_latitude REAL,
    end_longitude REAL,
    end_address TEXT,
    distance_km REAL DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    stoppage_minutes INTEGER DEFAULT 0,
    stops_count INTEGER DEFAULT 0,
    max_speed REAL DEFAULT 0,
    avg_speed REAL DEFAULT 0,
    is_inferred INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 12. Panic Events (Critical AIS-140 emergency events)
CREATE TABLE IF NOT EXISTS panic_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    address TEXT,
    event_time TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'New', -- 'New', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMP,
    resolved_by TEXT,
    resolved_at TIMESTAMP,
    remarks TEXT,
    emergency_contact_notified INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 13. Device Health Events
CREATE TABLE IF NOT EXISTS device_health_events (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    vehicle_id TEXT,
    event_type TEXT NOT NULL, -- 'power_disconnect', 'low_battery', 'tamper', 'gps_lost', 'offline'
    severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES gps_devices(id) ON DELETE CASCADE
);

-- 14. Geofences
CREATE TABLE IF NOT EXISTS geofences (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    fence_type TEXT NOT NULL DEFAULT 'circle', -- 'circle', 'polygon'
    center_lat REAL,
    center_lng REAL,
    radius_meters REAL,
    coordinates_json TEXT, -- polygon vertices JSON: [[lat,lng], ...]
    alert_on_entry INTEGER DEFAULT 1,
    alert_on_exit INTEGER DEFAULT 1,
    speed_limit REAL,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 15. Geofence Vehicle Assignments
CREATE TABLE IF NOT EXISTS geofence_vehicles (
    geofence_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    PRIMARY KEY(geofence_id, vehicle_id),
    FOREIGN KEY (geofence_id) REFERENCES geofences(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 16. Geofence Events
CREATE TABLE IF NOT EXISTS geofence_events (
    id TEXT PRIMARY KEY,
    geofence_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'entry', 'exit', 'overspeed'
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (geofence_id) REFERENCES geofences(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 17. Speed Alerts
CREATE TABLE IF NOT EXISTS speed_alerts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    speed REAL NOT NULL,
    speed_limit REAL NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT,
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 17A. Driver Intelligence & Behavior Events (AIS-140 / tnavIC Protocol Compliant)
-- Supports: Harsh Braking (HB/13), Harsh Acceleration (HA/14), Vehicle Tilt (TI/22), Rash Driving (RT/15), Overspeeding (OS/17)
CREATE TABLE IF NOT EXISTS driver_intelligence_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    device_id TEXT,
    event_type TEXT NOT NULL, -- 'HARSH_BRAKING', 'HARSH_ACCEL', 'VEHICLE_TILT', 'RASH_DRIVING', 'OVERSPEEDING'
    packet_type TEXT NOT NULL, -- 'HB', 'HA', 'TI', 'RT', 'OS'
    alert_id INTEGER NOT NULL, -- 13, 14, 22, 15, 17
    severity TEXT NOT NULL DEFAULT 'WARNING', -- 'CRITICAL', 'WARNING', 'INFO'
    metric_value TEXT NOT NULL, -- e.g. '-0.68g', '+0.52g', '48.5°', '41 km/h (0.51g)', '86.4 km/h'
    threshold_value TEXT NOT NULL, -- '0.55g (HBT)', '0.43g (HAT)', '45.0° (TA)', '30 km/h (RTT) / 0.47g (HTA)', '70.0 km/h (SL)'
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

-- 17B. Device IMU & Driver Behavior Threshold Configurations (tnavIC AIS-140 Commands)
CREATE TABLE IF NOT EXISTS device_imu_configs (
    device_id TEXT PRIMARY KEY,
    harsh_brake_threshold REAL DEFAULT 0.55, -- HBT (g) default 0.55g
    harsh_accel_threshold REAL DEFAULT 0.43, -- HAT (g) default 0.43g
    tilt_angle_threshold REAL DEFAULT 45.0,  -- TA (deg) default 45
    rash_turning_speed REAL DEFAULT 30.0,    -- RTT (km/h) default 30
    harsh_turning_g REAL DEFAULT 0.47,       -- IMU HTA (g) default 0.47
    motion_threshold REAL DEFAULT 0.05,      -- IMU THR (g) default 0.05
    speed_limit REAL DEFAULT 70.0,           -- SL (km/h) default 70
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 18. Remote Commands (Vehicle Security - Immobilisation)
CREATE TABLE IF NOT EXISTS remote_commands (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    command_type TEXT NOT NULL, -- 'IMMOBILISE', 'RESTORE'
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'ACKNOWLEDGED', 'EXECUTED', 'REJECTED', 'FAILED'
    safety_check_stationary INTEGER NOT NULL DEFAULT 1,
    speed_at_request REAL DEFAULT 0,
    reason TEXT,
    otp_verified INTEGER DEFAULT 1,
    device_ack_response TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 19. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    vehicle_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- 'panic', 'overspeed', 'offline', 'power', 'geofence', 'security'
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 20. Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- 'trial', 'monthly', 'quarterly', 'annual'
    billing_period TEXT NOT NULL, -- 'trial', 'monthly', 'quarterly', 'annual'
    price_per_vehicle REAL NOT NULL,
    max_vehicles INTEGER DEFAULT 100,
    description TEXT,
    features_json TEXT
);

-- 21. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL UNIQUE,
    plan_id TEXT NOT NULL,
    vehicle_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active', -- 'active', 'trial', 'expired', 'cancelled'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 22. Payments & Invoices
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    subscription_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    payment_method TEXT DEFAULT 'UPI / NetBanking',
    status TEXT DEFAULT 'paid', -- 'paid', 'pending', 'failed'
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 23. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. Raw AIS-140 Packet Logs (For troubleshooting & compliance audit)
CREATE TABLE IF NOT EXISTS raw_packet_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    imei TEXT NOT NULL,
    packet_type TEXT NOT NULL,
    raw_payload TEXT NOT NULL,
    is_valid INTEGER DEFAULT 1,
    error_message TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
