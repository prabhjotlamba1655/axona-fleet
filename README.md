# Axona Fleet Management Platform
**Enterprise-grade, cloud-ready AIS-140 GPS Vehicle Tracking & Emergency Monitoring Platform**  
*Developed by Axona Software LLP*

---

## 1. Executive Summary

**Axona Fleet Management** is a modern, high-performance, enterprise SaaS platform engineered for commercial fleets, passenger transport (buses, taxis), heavy trucks, individual vehicle owners, and fleet management companies.

The system is built to comply with **MoRTH AIS-140 (Automotive Industry Standard 140)** regulations for telematics, emergency panic button alerting, and vehicle security.

### Core Highlights:
- **Real-Time Telematics Map**: High-frequency GPS position streaming via WebSockets with heading rotation, ignition status, and speed metrics.
- **MoRTH AIS-140 Emergency Panic Command Centre**: Flashing visual alarms, browser Web Audio synthesizer siren, operator remarks, escalation workflows (New → Acknowledged → In Progress → Resolved → Closed), and direct Google Maps links.
- **Safety-First Remote Immobilisation**: Mandatory server-side stationary check (Speed = 0 km/h) before crank relay commands can be executed, protected with PIN verification and full immutable audit trails.
- **8 Enterprise Compliance Reports**: Movement, Trip History, Distance, Overspeeding, Panic Button, GPS Device Health, Geofence, and Remote Immobilisation reports with instant CSV and print-ready PDF export.
- **Multi-Tenant Architecture**: Strict tenant-level data isolation, role-based access control (Super Admin, Company Admin, Vehicle Owner, Sub User).
- **Interactive Route Playback**: Animated trip reconstruction with scrubbing slider and speed telemetry.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Leaflet with OpenStreetMap / CartoDB tiles.
- **Backend**: Node.js, Express.js, TypeScript/ESM, WebSockets (`ws`), JSON Web Tokens (JWT), Bcrypt.
- **Database**: PostgreSQL cloud-ready relational schema, with native SQLite (`node:sqlite`) zero-configuration embedded engine for instant evaluation.
- **Telematics Layer**: AIS-140 ASCII parser, Teltonika/Concox adapters, raw packet logging, duplicate packet suppression, and realistic live GPS simulator.

---

## 3. Demo Accounts & User Roles

You can evaluate the application as any role using the **Role Switcher** in the top navigation header, or log in with these credentials (password for all is `admin123`):

| Role | Name | Email | Scope |
|---|---|---|---|
| **Super Administrator** | Axona Operations Lead | `superadmin@axonafleet.com` | Global access to all tenants, hardware devices, and subscription tiers. |
| **Company Administrator** | Vikramaditya Rao | `fleetmanager@apexlogistics.in` | Full management of Apex Commercial Logistics fleet, drivers, geofences, and safety commands. |
| **Individual Vehicle Owner** | Rahul Sharma | `rahul.sharma@gmail.com` | Personal tracking and trip history for personal vehicle. |
| **Sub User** | Vikram Singh (Dispatcher) | `driver.vikram@apexlogistics.in` | Restricted view of assigned vehicles only (`MH-12-RN-2024`, `MH-12-TX-3344`). |

---

## 4. Main Navigation Menu (11 Modules)

1. **Dashboard**: Executive summary with 8 KPI cards (Total, Moving, Stopped, Idle, Online, Offline, Panic Alerts, Overspeeding Alerts), live vehicle map, recent alerts feed, and fleet status table.
2. **Live Tracking**: Full-screen interactive map with category filters, auto-follow toggle, location history breadcrumbs, and floating vehicle telemetry HUD.
3. **My Vehicles**: Vehicle registration with complete AIS-140 device mapping, category badges, bulk CSV import, edit/delete, and status toggles.
4. **Trip History**: Date-filtered vehicle journeys with distance, duration, stoppage analysis, and interactive route playback slider.
5. **Panic Alerts**: 24/7 emergency operations console with audio siren alarm, operator remarks, escalation state transitions, and test simulation button.
6. **Vehicle Security**: Remote starter immobilisation with mandatory stationary safety check (0 km/h), PIN verification, restore command, and audit log.
7. **Device Management**: GPS device health monitoring (battery %, main power cut, tamper alert, satellites), raw packet audit logs, and interactive packet tester.
8. **Geofencing**: Circular yards and polygon boundaries with vehicle assignment and entry/exit breach tracking.
9. **Reports**: 8 compliance reports with date/vehicle filters, CSV export, and print formatting.
10. **User Management**: Tenant users, role assignment, vehicle scoping for sub-users, and account activation toggles.
11. **Settings**: Company profile, emergency contacts (112, 108), notification channels, AIS-140 MoRTH gateway settings, and SaaS subscription billing with invoices.

---

## 5. Quick Start Guide

### Prerequisites
- Node.js v20+ or v24+
- npm v10+

### Step 1: Start Backend
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:5055` with WebSocket stream on `ws://localhost:5055/ws/telematics`.*

### Step 2: Start Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 6. Directory Structure

```
axona-fleet-management/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js          # SQLite / PostgreSQL connection wrapper
│   │   │   ├── schema.sql            # Complete relational schema
│   │   │   └── seeds.sql             # Realistic Indian fleet seed data
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT verification & RBAC scoping
│   │   ├── routes/
│   │   │   ├── auth.js               # Authentication & role switcher
│   │   │   ├── vehicles.js           # CRUD & bulk import
│   │   │   ├── tracking.js           # Live positions & KPI stats
│   │   │   ├── trips.js              # Trips & playback points
│   │   │   ├── panic.js              # Emergency panic event escalation
│   │   │   ├── security.js           # Remote immobilisation & safety validator
│   │   │   ├── devices.js            # Hardware health & raw packet viewer
│   │   │   ├── geofences.js          # Geofencing spatial engine
│   │   │   ├── reports.js            # 8 compliance reports with CSV export
│   │   │   ├── users.js              # Multi-tenant user management
│   │   │   ├── subscriptions.js      # SaaS billing & invoices
│   │   │   └── settings.js           # Company profile & notification routes
│   │   ├── services/
│   │   │   ├── ais140Parser.js       # AIS-140 NMEA parser & checksum engine
│   │   │   ├── gpsSimulator.js       # Background vehicle movement simulator
│   │   │   ├── immobilisationService.js # Safety-enforced engine starter relay
│   │   │   ├── geofenceService.js    # Point-in-polygon & distance algorithms
│   │   │   └── reportsService.js     # Enterprise reports compiler
│   │   └── server.js                 # Express HTTP + WebSocket server
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FleetMap.tsx          # Interactive Leaflet map with custom markers
│   │   │   ├── Header.tsx            # Top bar with role switcher & panic alert banner
│   │   │   └── Sidebar.tsx           # 11-module navigation sidebar
│   │   ├── context/
│   │   │   └── AuthContext.tsx       # Auth session & demo switcher
│   │   ├── services/
│   │   │   ├── api.ts                # Fetch wrapper & WebSocket client
│   │   │   └── audioService.ts       # Web Audio API emergency siren synthesizer
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript type definitions
│   │   ├── views/                    # 11 Feature Views
│   │   │   ├── DashboardView.tsx
│   │   │   ├── LiveTrackingView.tsx
│   │   │   ├── VehiclesView.tsx
│   │   │   ├── TripHistoryView.tsx
│   │   │   ├── PanicAlertsView.tsx
│   │   │   ├── VehicleSecurityView.tsx
│   │   │   ├── DeviceManagementView.tsx
│   │   │   ├── GeofencingView.tsx
│   │   │   ├── ReportsView.tsx
│   │   │   ├── UserManagementView.tsx
│   │   │   └── SettingsView.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── API_DOCUMENTATION.md              # Complete REST & WebSocket specification
├── AIS140_INTEGRATION_GUIDE.md       # AIS-140 hardware protocol & safety guide
└── README.md
```

---

## 7. Cloud Production Deployment

For deploying to production clouds (AWS, GCP, DigitalOcean, Azure):
1. **Database**: Point `DATABASE_URL` in backend `.env` to managed PostgreSQL. Run `backend/src/db/schema.sql` and `seeds.sql`.
2. **Reverse Proxy**: Setup Nginx reverse proxy with SSL terminating at port 443, proxying `/api` and `/ws` to the Node backend.
3. **Frontend**: Build with `npm run build` and serve static `dist` via Nginx, Cloudflare Pages, or AWS S3/CloudFront.
4. **Hardware Gateways**: Map external TCP/UDP ports 5001-5004 for direct GPS device hardware listener daemons.
