# Axona Fleet Management - REST API & WebSocket Documentation
**Developed by Axona Software LLP**

## Overview
Axona Fleet Management provides an enterprise-grade RESTful API and real-time WebSocket telematics stream. All requests use JSON payloads and return JSON responses.

**Base URL**: `http://localhost:5055/api`  
**WebSocket Telematics Stream**: `ws://localhost:5055/ws/telematics`  
**Authentication**: Bearer Token in `Authorization: Bearer <jwt_token>` header.

---

## 1. Authentication & Role Switcher
- `POST /api/auth/login`
  - Body: `{ "email": "fleetmanager@apexlogistics.in", "password": "admin123" }`
  - Response: `{ "token": "jwt...", "user": { ... } }`
- `GET /api/auth/demo-users`
  - Lists demo accounts for immediate role switching.
- `POST /api/auth/switch-user`
  - Body: `{ "userId": "usr_apex_admin" }`
  - Response: `{ "token": "jwt...", "user": { ... } }`

---

## 2. Vehicles
- `GET /api/vehicles`
  - Query parameters: `category`, `status`, `search`
  - Returns tenant-scoped fleet with mapped GPS telemetry and latest coordinates.
- `GET /api/vehicles/categories`
  - Returns vehicle category dictionary (Car, Bike, Truck, Bus, Taxi, Other).
- `GET /api/vehicles/manufacturers`
  - Returns certified hardware device manufacturers (AIS-140, Teltonika, Concox, Queclink).
- `GET /api/vehicles/:id`
  - Detailed vehicle profile, device telemetry, recent trips.
- `POST /api/vehicles`
  - Register new vehicle and link GPS device IMEI.
- `PUT /api/vehicles/:id`
  - Update vehicle attributes and speed limits.
- `DELETE /api/vehicles/:id`
  - Deletes vehicle from tenant fleet.
- `POST /api/vehicles/:id/toggle-active`
  - Activate or deactivate vehicle tracking license.
- `POST /api/vehicles/bulk-import`
  - Bulk import fleet batch using CSV/JSON.

---

## 3. Live Tracking & Dashboard
- `GET /api/tracking/dashboard-stats`
  - Returns 8 KPI metrics: Total Vehicles, Moving, Stopped, Idle, Online Devices, Offline Devices, Today's Panic Alerts, Overspeeding Alerts, and recent alerts.
- `GET /api/tracking/live`
  - Real-time GPS coordinates, speed, heading, ignition, main battery status.
- `GET /api/tracking/trail/:vehicleId`
  - Last 100 historical GPS waypoints for route breadcrumb display.

---

## 4. Trip History
- `GET /api/trips`
  - Query parameters: `vehicleId`, `startDate`, `endDate`
  - Returns trips with distance (km), duration, stoppage minutes, and stop count.
- `GET /api/trips/:id/playback`
  - Returns sequenced GPS points for animated playback on map.

---

## 5. Panic Button / Emergency Operations
- `GET /api/panic`
  - Query parameters: `status` ('New', 'Acknowledged', 'In Progress', 'Resolved', 'Closed')
  - Lists emergency SOS incidents with owner contact, location, and device IMEI.
- `POST /api/panic/:id/status`
  - Body: `{ "status": "Acknowledged", "remarks": "Operator verified SOS" }`
  - Updates escalation status with operator audit remarks.
- `POST /api/panic/simulate`
  - Triggers a real-time SOS panic event for testing and evaluation.

---

## 6. Vehicle Security & Remote Immobilisation
- `GET /api/security/vehicles`
  - Security statuses, relay support, and stationary check indicators.
- `GET /api/security/commands`
  - Complete immutable audit log of remote commands and device ACK strings.
- `POST /api/security/immobilise`
  - Body: `{ "vehicleId": "veh_6", "pin": "1234", "reason": "Security lockdown" }`
  - **Safety Check**: Rejects command if vehicle speed > 0 km/h or vehicle is in motion.
- `POST /api/security/restore`
  - Body: `{ "vehicleId": "veh_6", "pin": "1234" }`
  - Restores starter relay circuit.

---

## 7. Device Management & AIS-140 Ingestion
- `GET /api/devices`
  - Hardware device inventory with battery %, main power state, tamper flags.
- `GET /api/devices/raw-logs`
  - Raw NMEA ASCII packet logs for compliance inspection.
- `POST /api/devices/ingest`
  - Ingests raw AIS-140 frame: `$PVT,IMEI,DATE,TIME,LAT,N,LON,E,SPEED,HEAD,SATS,ALT,IGN,PWR,SOS,TMP*CS`.

---

## 8. Geofencing
- `GET /api/geofences`
  - Active circular and polygon zones with assigned vehicles.
- `POST /api/geofences`
  - Create circular or polygon geofence with entry/exit alert triggers.
- `DELETE /api/geofences/:id`
  - Delete geofence.
- `GET /api/geofences/events`
  - Spatial zone entry and exit event audit log.

---

## 9. Reports (8 Reports with CSV / Print Export)
- `GET /api/reports/:reportType`
  - `movement`: Vehicle Movement Report
  - `trips`: Trip History Report
  - `distance`: Distance Travelled Report
  - `overspeeding`: Overspeeding Report
  - `panic`: Panic Button Report
  - `device-health`: GPS Device Health Report
  - `geofence`: Geofence Report
  - `immobilisation`: Remote Immobilisation History
  - Pass `exportFormat=csv` to download as CSV spreadsheet.

---

## 10. User Management & RBAC
- `GET /api/users`
  - Lists tenant users with roles and assigned vehicles.
- `POST /api/users`
  - Create user with role (`super_admin`, `company_admin`, `individual_owner`, `sub_user`).
- `POST /api/users/:id/toggle-active`
  - Toggle user account active status.

---

## 11. SaaS Subscriptions & Settings
- `GET /api/subscriptions/current`
  - Active subscription, licensed vehicle usage, available plans, invoice payments.
- `POST /api/subscriptions/upgrade`
  - Upgrade subscription tier.
- `GET /api/settings`
  - Organization profile and notification preferences.
- `PUT /api/settings/company`
  - Update company profile.
