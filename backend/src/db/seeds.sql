-- ============================================================================
-- AXONA FLEET MANAGEMENT - REALISTIC SEED DATA
-- Developed by Axona Software LLP
-- ============================================================================

-- Roles
INSERT OR IGNORE INTO roles (id, name, display_name, description) VALUES
('role_super', 'super_admin', 'Super Administrator', 'Complete system-wide access to all tenants, devices, and global settings'),
('role_company', 'company_admin', 'Company Administrator', 'Full management over company fleet, drivers, geofences, and safety commands'),
('role_owner', 'individual_owner', 'Individual Vehicle Owner', 'Personal tracking, trips, emergency alerts for owned vehicles'),
('role_subuser', 'sub_user', 'Sub User', 'Restricted view-only or authorized access to specific assigned vehicles');

-- Vehicle Categories
INSERT OR IGNORE INTO vehicle_categories (id, code, name, icon, speed_limit_default) VALUES
('cat_car', 'car', 'Car / Sedan / SUV', 'Car', 80.0),
('cat_bike', 'bike', 'Two Wheeler / Motorcycle', 'Bike', 60.0),
('cat_truck', 'truck', 'Heavy Commercial Truck', 'Truck', 65.0),
('cat_bus', 'bus', 'Passenger Bus / Coach', 'Bus', 70.0),
('cat_taxi', 'taxi', 'Commercial Taxi / Cab', 'Taxi', 80.0),
('cat_other', 'other', 'Special Equipment / Other', 'ShieldAlert', 50.0);

-- Device Manufacturers
INSERT OR IGNORE INTO device_manufacturers (id, name, code, protocol, port, supports_immobilisation, is_ais140_certified) VALUES
('mfg_ais140', 'Axona AIS-140 Certified', 'ais140_generic', 'TCP', 5001, 1, 1),
('mfg_teltonika', 'Teltonika Telematics (FMC130)', 'teltonika', 'TCP', 5002, 1, 1),
('mfg_concox', 'Concox Wireless (WeTrack2/JM-VL03)', 'concox', 'TCP', 5003, 1, 1),
('mfg_queclink', 'Queclink Wireless (GV300W)', 'queclink', 'UDP', 5004, 1, 1);

-- Tenants
INSERT OR IGNORE INTO tenants (id, name, tenant_type, contact_person, email, phone, address, city, state, country) VALUES
('tenant_super', 'Axona Master Operations', 'super', 'System Administrator', 'admin@axonafleet.com', '+91 98765 00001', 'Axona HQ, Bandra Kurla Complex', 'Mumbai', 'Maharashtra', 'India'),
('tenant_apex', 'Apex Commercial Logistics LLP', 'company', 'Vikramaditya Rao', 'fleetmanager@apexlogistics.in', '+91 98220 12345', 'Plot 45, MIDC Industrial Area, Hinjawadi Phase 2', 'Pune', 'Maharashtra', 'India'),
('tenant_rahul', 'Rahul Sharma (Personal)', 'individual', 'Rahul Sharma', 'rahul.sharma@gmail.com', '+91 98450 67890', 'A-304, Palm Meadows, Whitefield', 'Bengaluru', 'Karnataka', 'India');

-- Users (All default password is 'admin123' hashed with bcrypt or plain fallback)
-- bcrypt hash for 'admin123': $2a$10$wT0xQfQzGq53.7i4E8wDceL.uWz6a6x3W1N6WbZ4s6ZzW8B9I/jWW (or we verify plain in fallback)
INSERT OR IGNORE INTO users (id, tenant_id, role_id, name, email, password_hash, phone, security_pin, is_active) VALUES
('usr_super', 'tenant_super', 'role_super', 'Axona Operations Lead', 'superadmin@axonafleet.com', '$2a$10$rQf6z5w87yQh7Eom8wB6xeV55m1qX0X6J01y3mE4qO8kL8w.9i4E8', '+91 98765 00001', '9999', 1),
('usr_apex_admin', 'tenant_apex', 'role_company', 'Vikramaditya Rao', 'fleetmanager@apexlogistics.in', '$2a$10$rQf6z5w87yQh7Eom8wB6xeV55m1qX0X6J01y3mE4qO8kL8w.9i4E8', '+91 98220 12345', '1234', 1),
('usr_rahul', 'tenant_rahul', 'role_owner', 'Rahul Sharma', 'rahul.sharma@gmail.com', '$2a$10$rQf6z5w87yQh7Eom8wB6xeV55m1qX0X6J01y3mE4qO8kL8w.9i4E8', '+91 98450 67890', '4321', 1),
('usr_driver_sub', 'tenant_apex', 'role_subuser', 'Vikram Singh (Dispatcher)', 'driver.vikram@apexlogistics.in', '$2a$10$rQf6z5w87yQh7Eom8wB6xeV55m1qX0X6J01y3mE4qO8kL8w.9i4E8', '+91 98111 22334', '1122', 1);

-- GPS Devices
INSERT OR IGNORE INTO gps_devices (id, tenant_id, imei, manufacturer_id, model, sim_number, firmware_version, is_ais140_compliant, status, last_communication, main_power_connected, backup_battery_pct, gps_fixed, satellites, tamper_detected) VALUES
('dev_101', 'tenant_apex', '864201045892110', 'mfg_ais140', 'AX-140-Pro', '+919988112233', 'v2.1.0-AIS', 1, 'online', datetime('now', '-2 minutes'), 1, 98, 1, 14, 0),
('dev_102', 'tenant_apex', '864201045892111', 'mfg_ais140', 'AX-140-Pro', '+919988112234', 'v2.1.0-AIS', 1, 'online', datetime('now', '-1 minutes'), 1, 94, 1, 13, 0),
('dev_103', 'tenant_apex', '864201045892112', 'mfg_teltonika', 'FMC130', '+919988112235', 'v1.4.3', 1, 'online', datetime('now', '-3 minutes'), 1, 91, 1, 12, 0),
('dev_104', 'tenant_apex', '864201045892113', 'mfg_ais140', 'AX-140-Basic', '+919988112236', 'v2.0.1-AIS', 1, 'online', datetime('now', '-1 minutes'), 1, 88, 1, 15, 0),
('dev_105', 'tenant_apex', '864201045892114', 'mfg_concox', 'JM-VL03', '+919988112237', 'v3.0.2', 1, 'offline', datetime('now', '-45 minutes'), 0, 42, 0, 0, 1),
('dev_106', 'tenant_apex', '864201045892115', 'mfg_ais140', 'AX-140-Pro', '+919988112238', 'v2.1.0-AIS', 1, 'online', datetime('now', '-2 minutes'), 1, 99, 1, 16, 0),
('dev_201', 'tenant_rahul', '864201045892201', 'mfg_ais140', 'AX-140-Personal', '+919988223344', 'v2.1.0-AIS', 1, 'online', datetime('now', '-1 minutes'), 1, 100, 1, 14, 0);

-- Vehicles
INSERT OR IGNORE INTO vehicles (id, tenant_id, registration_number, category_id, make, model, manufacturing_year, owner_name, owner_phone, emergency_contact_phone, device_id, installation_date, speed_limit, is_active, immobilisation_status) VALUES
('veh_1', 'tenant_apex', 'MH-12-RN-2024', 'cat_truck', 'Tata Motors', 'Prima 4028.S', 2023, 'Apex Logistics LLP', '+91 98220 12345', '+91 98220 99999', 'dev_101', '2024-01-15', 65.0, 1, 'active'),
('veh_2', 'tenant_apex', 'MH-12-PQ-9081', 'cat_truck', 'BharatBenz', '3528R Heavy Duty', 2022, 'Apex Logistics LLP', '+91 98220 12345', '+91 98220 99999', 'dev_102', '2024-01-18', 65.0, 1, 'active'),
('veh_3', 'tenant_apex', 'MH-14-GH-5566', 'cat_bus', 'Ashok Leyland', 'Viking 222 Staff Coach', 2023, 'Apex Logistics LLP', '+91 98220 12345', '+91 98220 99999', 'dev_103', '2024-02-01', 70.0, 1, 'active'),
('veh_4', 'tenant_apex', 'MH-12-TX-3344', 'cat_taxi', 'Maruti Suzuki', 'Ertiga Commercial Tour M', 2024, 'Apex Logistics LLP', '+91 98220 12345', '+91 98220 99999', 'dev_104', '2024-02-10', 80.0, 1, 'active'),
('veh_5', 'tenant_apex', 'MH-14-DT-7711', 'cat_truck', 'Eicher Motors', 'Pro 3019 Container', 2021, 'Apex Logistics LLP', '+91 98220 12345', '+91 98220 99999', 'dev_105', '2023-11-05', 60.0, 1, 'active'),
('veh_6', 'tenant_apex', 'MH-12-EV-8822', 'cat_car', 'Mahindra', 'XUV700 Inspection Vehicle', 2024, 'Apex Logistics LLP', '+91 98220 12345', '+91 98220 99999', 'dev_106', '2024-03-01', 80.0, 1, 'active'),
('veh_7', 'tenant_rahul', 'KA-03-MR-4589', 'cat_car', 'Hyundai', 'Creta SX(O) Turbo', 2023, 'Rahul Sharma', '+91 98450 67890', '+91 98450 11111', 'dev_201', '2024-01-10', 80.0, 1, 'active');

-- User Vehicle Assignments for Sub User (Dispatcher assigned veh_1 and veh_4)
INSERT OR IGNORE INTO user_vehicle_assignments (id, user_id, vehicle_id) VALUES
('uva_1', 'usr_driver_sub', 'veh_1'),
('uva_2', 'usr_driver_sub', 'veh_4');

-- Latest Vehicle Locations
INSERT OR REPLACE INTO latest_vehicle_locations (vehicle_id, device_id, latitude, longitude, altitude, speed, heading, ignition, movement_status, main_power, panic_status, address, gps_time) VALUES
('veh_1', 'dev_101', 18.5912, 73.7389, 560, 48.5, 85, 1, 'moving', 1, 0, 'Near Pune-Bangalore Highway, Hinjawadi Phase 1, Pune', datetime('now', '-2 minutes')),
('veh_2', 'dev_102', 18.6298, 73.7997, 545, 0.0, 140, 1, 'idle', 1, 0, 'Apex Hub Parking Yard, Nigdi MIDC, Pune', datetime('now', '-1 minutes')),
('veh_3', 'dev_103', 18.5204, 73.8567, 570, 32.0, 220, 1, 'moving', 1, 0, 'Shivaji Nagar Bus Transit Corridor, Pune', datetime('now', '-3 minutes')),
('veh_4', 'dev_104', 18.5590, 73.7780, 552, 54.0, 310, 1, 'moving', 1, 0, 'Baner Road High Street Flyover, Pune', datetime('now', '-1 minutes')),
('veh_5', 'dev_105', 18.7020, 73.6840, 590, 0.0, 0, 0, 'offline', 0, 0, 'Talegaon Dabhade Warehouse Bay 4, Pune', datetime('now', '-45 minutes')),
('veh_6', 'dev_106', 18.5089, 73.9260, 555, 0.0, 90, 0, 'stopped', 1, 0, 'Magarpatta Cybercity Gate 3, Hadapsar, Pune', datetime('now', '-2 minutes')),
('veh_7', 'dev_201', 12.9716, 77.5946, 920, 42.0, 45, 1, 'moving', 1, 0, 'MG Road near Cubbon Park, Bengaluru, Karnataka', datetime('now', '-1 minutes'));

-- Trips
INSERT OR IGNORE INTO trips (id, vehicle_id, start_time, end_time, start_latitude, start_longitude, start_address, end_latitude, end_longitude, end_address, distance_km, duration_minutes, stoppage_minutes, stops_count, max_speed, avg_speed, is_inferred) VALUES
('trip_1', 'veh_1', datetime('now', '-4 hours'), datetime('now', '-1 hours'), 18.6298, 73.7997, 'Apex Hub Nigdi', 18.5912, 73.7389, 'Hinjawadi Phase 1 Gateway', 38.4, 65, 12, 2, 62.0, 41.5, 0),
('trip_2', 'veh_3', datetime('now', '-6 hours'), datetime('now', '-3 hours'), 18.5590, 73.7780, 'Baner Depot', 18.5204, 73.8567, 'Shivaji Nagar Station', 24.8, 50, 18, 4, 68.0, 34.2, 0),
('trip_3', 'veh_4', datetime('now', '-2 hours'), datetime('now', '-30 minutes'), 18.5089, 73.9260, 'Magarpatta City', 18.5590, 73.7780, 'Baner Road', 29.1, 45, 8, 1, 74.0, 48.0, 0),
('trip_4', 'veh_7', datetime('now', '-5 hours'), datetime('now', '-3 hours'), 12.9352, 77.6245, 'Koramangala 4th Block', 12.9716, 77.5946, 'MG Road Metro Station', 11.2, 35, 15, 3, 52.0, 22.0, 0);

-- Panic Events (Critical Module - Realistic Incidents)
INSERT OR IGNORE INTO panic_events (id, tenant_id, vehicle_id, device_id, latitude, longitude, speed, address, event_time, status, acknowledged_by, acknowledged_at, remarks, emergency_contact_notified) VALUES
('panic_1', 'tenant_apex', 'veh_1', 'dev_101', 18.5912, 73.7389, 48.5, 'Near Pune-Bangalore Highway, Hinjawadi Phase 1, Pune', datetime('now', '-10 minutes'), 'New', NULL, NULL, 'SOS physical panic button triggered in vehicle cab.', 1),
('panic_2', 'tenant_apex', 'veh_4', 'dev_104', 18.5590, 73.7780, 54.0, 'Baner Road High Street Flyover, Pune', datetime('now', '-2 hours'), 'Acknowledged', 'usr_apex_admin', datetime('now', '-110 minutes'), 'Operator contacted driver Vikramaditya. False touch while handling phone mount. Monitoring ongoing.', 1),
('panic_3', 'tenant_apex', 'veh_3', 'dev_103', 18.5204, 73.8567, 0.0, 'Shivaji Nagar Bus Transit Corridor, Pune', datetime('now', '-1 days'), 'Resolved', 'usr_apex_admin', datetime('now', '-23 hours'), 'Verified with depot manager. Passenger emergency resolved safely.', 1);

-- Speed Alerts
INSERT OR IGNORE INTO speed_alerts (id, tenant_id, vehicle_id, speed, speed_limit, latitude, longitude, address, event_time) VALUES
('spd_1', 'tenant_apex', 'veh_1', 78.5, 65.0, 18.6010, 73.7500, 'NH-48 Bypass km 14, Pune', datetime('now', '-45 minutes')),
('spd_2', 'tenant_apex', 'veh_4', 88.0, 80.0, 18.5720, 73.7650, 'Katraj-Dehu Road Bypass, Pune', datetime('now', '-3 hours')),
('spd_3', 'tenant_apex', 'veh_3', 76.0, 70.0, 18.5340, 73.8410, 'University Road near E-Square, Pune', datetime('now', '-18 hours'));

-- Device Health Events
INSERT OR IGNORE INTO device_health_events (id, device_id, vehicle_id, event_type, severity, details, created_at) VALUES
('dhe_1', 'dev_105', 'veh_5', 'power_disconnect', 'critical', 'Main vehicle battery disconnected. Device operating on internal backup battery.', datetime('now', '-45 minutes')),
('dhe_2', 'dev_105', 'veh_5', 'tamper', 'critical', 'Enclosure tamper switch triggered. Possible device tampering detected.', datetime('now', '-44 minutes')),
('dhe_3', 'dev_103', 'veh_3', 'low_battery', 'warning', 'Internal battery discharge below 20%.', datetime('now', '-6 hours'));

-- Geofences
INSERT OR IGNORE INTO geofences (id, tenant_id, name, description, fence_type, center_lat, center_lng, radius_meters, coordinates_json, alert_on_entry, alert_on_exit, speed_limit, is_active) VALUES
('geo_1', 'tenant_apex', 'Apex Hinjawadi Central Logistics Hub', 'Main company headquarters, maintenance bay and distribution yard', 'circle', 18.5912, 73.7389, 1200, NULL, 1, 1, 20.0, 1),
('geo_2', 'tenant_apex', 'Nigdi Heavy Depot & Workshop', 'Heavy commercial truck parking and inspection bay', 'circle', 18.6298, 73.7997, 800, NULL, 1, 1, 15.0, 1),
('geo_3', 'tenant_apex', 'Pune City Restricted Heavy Vehicle Zone', 'Inner ring city center polygon restricted between 8 AM and 9 PM', 'polygon', 18.5204, 73.8567, 0, '[[18.535, 73.840], [18.540, 73.870], [18.510, 73.875], [18.505, 73.845]]', 1, 0, 40.0, 1);

-- Geofence Vehicles
INSERT OR IGNORE INTO geofence_vehicles (geofence_id, vehicle_id) VALUES
('geo_1', 'veh_1'),
('geo_1', 'veh_2'),
('geo_1', 'veh_4'),
('geo_2', 'veh_1'),
('geo_2', 'veh_2'),
('geo_3', 'veh_1'),
('geo_3', 'veh_2');

-- Remote Commands (Immobilisation History)
INSERT OR IGNORE INTO remote_commands (id, tenant_id, vehicle_id, device_id, user_id, command_type, status, safety_check_stationary, speed_at_request, reason, otp_verified, device_ack_response, requested_at, executed_at) VALUES
('cmd_1', 'tenant_apex', 'veh_6', 'dev_106', 'usr_apex_admin', 'IMMOBILISE', 'EXECUTED', 1, 0.0, 'Scheduled night parking security lockdown', 1, 'ACK:OUTPUT1_LOW_OK', datetime('now', '-1 days'), datetime('now', '-1 days', '+3 seconds')),
('cmd_2', 'tenant_apex', 'veh_6', 'dev_106', 'usr_apex_admin', 'RESTORE', 'EXECUTED', 1, 0.0, 'Authorized inspection vehicle deployment', 1, 'ACK:OUTPUT1_HIGH_OK', datetime('now', '-18 hours'), datetime('now', '-18 hours', '+2 seconds'));

-- Subscription Plans
INSERT OR IGNORE INTO subscription_plans (id, name, code, billing_period, price_per_vehicle, max_vehicles, description, features_json) VALUES
('plan_trial', '14-Day Enterprise Trial', 'trial', 'trial', 0.0, 5, 'Free trial with complete AIS-140 and live tracking features', '["Live GPS Tracking", "AIS-140 Packet Ingestion", "Emergency Panic Alerts", "Basic Geofencing"]'),
('plan_monthly', 'Axona Fleet Monthly', 'monthly', 'monthly', 299.0, 50, 'Standard fleet management per vehicle per month', '["Live GPS Tracking", "AIS-140 Compliance", "Emergency Panic Monitoring", "Geofencing", "Remote Immobilisation Safety", "Exportable Reports", "SMS/Email Alerts"]'),
('plan_quarterly', 'Axona Fleet Quarterly', 'quarterly', 'quarterly', 799.0, 100, 'Discounted quarterly fleet billing per vehicle', '["All Monthly Features", "Priority WebSocket Stream", "Raw AIS-140 Telemetry Logs", "Multi-tenant Sub-users"]'),
('plan_annual', 'Axona Fleet Enterprise Annual', 'annual', 'annual', 2799.0, 500, 'Full enterprise package with dedicated support & API integration', '["Unlimited AIS-140 GPS Devices", "24/7 Panic Center Monitoring", "Automated Compliance Audits", "Custom Geofences & Polygon Routes", "Dedicated Account Manager"]');

-- Subscriptions
INSERT OR IGNORE INTO subscriptions (id, tenant_id, plan_id, vehicle_count, status, start_date, end_date, auto_renew) VALUES
('sub_apex', 'tenant_apex', 'plan_annual', 6, 'active', '2024-01-01', '2025-01-01', 1),
('sub_rahul', 'tenant_rahul', 'plan_monthly', 1, 'active', '2024-02-01', '2024-12-31', 1);

-- Payments
INSERT OR IGNORE INTO payments (id, tenant_id, subscription_id, invoice_number, amount, currency, payment_method, status, paid_at) VALUES
('pay_1', 'tenant_apex', 'sub_apex', 'INV-AXONA-2024-001', 16794.0, 'INR', 'Corporate NetBanking (HDFC)', 'paid', datetime('now', '-60 days')),
('pay_2', 'tenant_rahul', 'sub_rahul', 'INV-AXONA-2024-002', 299.0, 'INR', 'UPI (rahul@okaxis)', 'paid', datetime('now', '-15 days'));

-- Notifications
INSERT OR IGNORE INTO notifications (id, tenant_id, user_id, vehicle_id, title, message, notification_type, is_read, created_at) VALUES
('notif_1', 'tenant_apex', 'usr_apex_admin', 'veh_1', 'EMERGENCY: Panic Button Activated!', 'Vehicle MH-12-RN-2024 triggered emergency panic button near Hinjawadi Phase 1.', 'panic', 0, datetime('now', '-10 minutes')),
('notif_2', 'tenant_apex', 'usr_apex_admin', 'veh_1', 'Speed Alert: 78.5 km/h', 'Vehicle MH-12-RN-2024 exceeded speed limit of 65 km/h on NH-48 Bypass.', 'overspeed', 0, datetime('now', '-45 minutes')),
('notif_3', 'tenant_apex', 'usr_apex_admin', 'veh_5', 'CRITICAL: Main Battery Disconnected', 'Vehicle MH-14-DT-7711 GPS device power cut detected. Enclosure tamper switch active.', 'power', 0, datetime('now', '-45 minutes')),
('notif_4', 'tenant_apex', 'usr_apex_admin', 'veh_1', 'Geofence Entry: Hinjawadi Hub', 'Vehicle MH-12-RN-2024 entered Apex Hinjawadi Central Logistics Hub.', 'geofence', 1, datetime('now', '-2 hours'));
