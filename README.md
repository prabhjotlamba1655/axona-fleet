# Axona Fleet Analytics - NOC Command Center Software

Enterprise-grade Commercial Fleet Intelligence & Diesel Loss Prevention Platform built for large-screen TV Command Centers (NOC), logistics operations, and fuel auditing.

---

## 🚀 System Architecture

- **Frontend**: React 19 + Vite + Tailwind CSS + Lucide Icons + Three.js WebGL (3D Fuel Tank) + Leaflet (Real-Time GPS Corridors).
- **Backend**: Node.js + Express REST API + WebSocket Server (`ws`) for real-time live telemetry broadcasting.
- **Database**: SQLite3 (`axona_fleet.db`) with relational tables for Vehicles, Refueling Slips, Siphoning Events, Chronological Alerts, Tank Calibration Curves, Planned Routes, RTO Compliance, and RBAC.

---

## 🖥️ Screen Layout & Multi-Screen NOC Functionality

### 1. Default Home Screen: Screen 3 (Fleet Overview)
- When launching the application, the **Fleet Overview (Screen 3)** loads as the default home view with the collapsible left menu bar.

### 2. All Screens Tab (4-in-1 NOC Quad Partition)
- Clicking the **"All Screens"** menu button divides the screen into four equal quadrants with screen names clearly labelled at the top:
  - **Top-Left**: *Screen 1: Diesel Savings 5 Pillars*
  - **Top-Right**: *Screen 2: Live Map & Fleet Tracking*
  - **Bottom-Left**: *Screen 3: Fleet Overview*
  - **Bottom-Right**: *Screen 4: Live Fuel 3D Tank Telemetry*

### 3. Click-to-Enlarge & ESC Home Return
- Clicking **any of the 4 screens** enlarges that quadrant into **Full-Screen Mode**.
- Pressing the **`Esc`** key or clicking the floating **`Return to Home`** button immediately returns to the default Home Screen (Screen 3).

### 4. 4 Dedicated TV Screens / Multi-Monitor NOC Provision
- Dispatchers and NOC controllers running 4 separate physical TV screens can click **"Launch 4 TV Screens"** on the top navigation bar.
- This automatically opens 4 dedicated, pop-out windows (`?tv_screen=1`, `?tv_screen=2`, `?tv_screen=3`, `?tv_screen=4`), designed to be dragged onto 4 separate TV displays in the NOC room, all updating in real-time via WebSocket.

### 5. TV Hands-Free Excel Auto-Scroll Mode
- Designed for large-screen TVs viewed from a distance. The Vehicle Master Register features an automated, slow-speed row-wise scrolling animation that continuously rotates rows from bottom to top.
- Includes toggle controls: **ON/OFF**, speed adjustment (**Slow / Normal / Fast**), and hover-to-pause.

---

## 📊 Core Screens Feature Breakdown

### Screen 1: Diesel Savings 5 Pillars
1. **Fuel Siphoning Loss**:
   - Strictly verified **15 minutes after vehicle starts moving** from a rest stop (Dhaba/motel) to eliminate false alarms caused by slopes, tilted fuel tanks, or rough terrain.
   - Shows verified theft events, liters lost, and financial impact in INR (₹94/L).
2. **Refuelling Mismatch Loss**:
   - Lists all refueling logs with automated discrepancy calculation.
   - **Interactive Modal**: Allows operators to enter physical Fuel Slips or Fleet Card statement quantities, cross-checks against electronic tank sensor rise, flags fraud/shortfalls, and saves directly to the SQLite database.
3. **Idling Loss (>5 mins)**:
   - Evaluates engine idling using **Fuel Flow Rate Logic (>1.2 L/hr while Speed = 0 km/h for >5 mins)** instead of fragile or easily tampered ignition ON/OFF wire signals.
4. **High CPH Loss (>25% OEM Benchmark)**:
   - Flags vehicles consuming diesel in excess of 25% above factory OEM benchmark consumption per hour.
5. **Route Deviation Loss (>40 km)**:
   - Detects trucks deviating by more than 40 km from the planned transit corridor.
   - **Route Entering Provision**: Interactive modal to register new origin, destination, allowed deviation buffer, and waypoints.
6. **Fuel Intelligence Summary**:
   - Executive dashboard aggregating losses across all 5 pillars, potential monthly savings %, and overall Fleet Efficiency Score (0-100).

---

### Screen 2: Live Map & Fleet Tracking
1. **Live GPS Tracking**: Real-time Leaflet map displaying commercial freight trucks across Indian national corridors with speed, heading, and status markers.
2. **Geofence Breach**: Automatic visual monitoring of geofence corridors and loading bays.
3. **Trip Route & Live Tracking**: Selecting any truck draws its active transit route polyline and live breadcrumbs.
4. **Driver Intelligence**: Driver scorecards, harsh braking events, rapid accelerations, and eco-driving score.
5. **Right Vertical Section: Chronological Alert Stream**:
   - Real-time list of today's operational alerts ordered chronologically.
   - Covers minimum required alert types:
     - **A.** Fuel Siphoning > 5L (verified post 15-min movement from Dhaba)
     - **B.** Refuelling Alert
     - **C.** Refuelling Discrepancy Alert (slip vs sensor rise shortfall)
     - **D.** Idle Alert (Speed = 0, Engine ON > 10 min by fuel consumption logic)
     - **E.** High CPH Alert (> 25% over OEM benchmark)
     - **F.** Route Deviation Alert (> 50 km off planned corridor)
     - **G.** Late Start Alert (truck departed after 08:00 AM)
     - **H.** Servicing Due (approaching 10,000 km, alerts when < 500 km remain, stays active until 10,500 km or acknowledged)
     - **I.** Cold Temp Alert (reefer cold storage temperature breach)
     - **J.** Axle Overweight / Sudden Weight Drop Alert
     - **K.** Driver Harsh Driving (repeated sudden braking / acceleration)
     - **L.** Overspeeding Alert (> 2x regular 30-day average speed)
     - **M.** RTO Compliance Due Alert (fitness, permit, or insurance renewal)
   - **Interactive Acknowledge Button**: Rendered in bold **RED**; turns **GREEN** `[ACKNOWLEDGED ✓]` with operator timestamp upon click, persisting to the backend SQLite DB.

---

### Screen 3: Fleet Overview (Default Home Screen)
1. **Fleet Overview Horizontal Summary**: Total Fleet, Running, Idling, Stopped, Maintenance, Total Kms Today, Total Diesel Burned Today, and Fleet Mileage (km/L).
2. **Work Started at 8:00 AM Metric**: Compliance rate %, on-time truck count, and late-starter drilldown ticker.
3. **Vehicle Master Register**: Excel-style data table with NOC TV auto-scroller displaying Reg No, Model, Driver, Live Speed, Fuel Liters & Dip mm, Live vs OEM CPH, Odometer, Next Service Gap, and Assigned Route.
4. **Report Export**: Downloadable Daily, Weekly, and Monthly CSV reports.

---

### Screen 4: Live Fuel 3D Tank Telemetry
1. **Interactive 3D Tank View**:
   - WebGL Three.js rendering of aluminum fuel cylinder with metallic reflections, liquid diesel slosh physics, internal anti-slosh baffle rings, and capacitive dipstick sensor rod.
   - Live telemetry overlays: Dipstick height (mm), Fuel Temp (°C), Water Contamination Float (ppm), and Incline/Tilt compensation.
   - Dual-Tank configuration with primary/secondary volume distribution and equalizer valve status.
   - Vehicle selector to inspect any truck in the fleet.
2. **Refuelling Required for 10 Hrs Running Since 00:00 Hrs**:
   - Dynamic calculation based on elapsed engine hours today, remaining hours to complete 10-hour duty, vehicle live CPH, and safety buffer.
   - Flags whether current tank volume is sufficient or calculates exact top-up liters required.

---

### Left Side Menu Panel
1. **All Screens** (4-in-1 Partition View)
2. **RTO & Compliance** (Fitness, National Permit, Insurance, PUC, Road Tax, Green Tax tracking)
3. **Axle Payload** (Weigh-in-motion gross vehicle weight, overload prevention, sudden weight drops)
4. **Cost & Profitability** (Diesel burn expense, toll costs, freight revenue, operating margin %)
5. **Cold Chain & Reefer** (Chamber temperature probes, setpoint breach alarms, compressor status)
6. **Integrations & IoT Sensor** (Modbus RS485 fuel rods, CANBus J1939, BLE beacons, 4G GPS gateway)
7. **Settings Modal**:
   - **A. RBAC**: User role permissions (Super Admin, Fleet Manager, Fuel Auditor, NOC Controller).
   - **B. Vehicle Registration**: Form for one-time inputs:
     - OEM Benchmark (CPH)
     - Buffer % with OEM Benchmark Alert (e.g., 25%)
     - Number of Wheels
     - Number of Tanks
     - Idle Time setting for alert generation (mins)
     - Initial Engine Hours
     - Service Due (Km gap, default 10,000 km)
     - Route Deviation Allowed Km (Default 40 km)
     - Geofencing perimeter (Auto / Fixed)
   - **C. Tank Calibration Table**: Non-linear dip height (mm) to volume (Liters) curve editor.

---

## 🏃 Quick Start Guide

### 1. Backend Server
```bash
cd axona-fleet-analytics/backend
npm install
node server.js
```
*Backend runs on `http://localhost:5000` with SQLite database `axona_fleet.db` and WebSocket broadcaster on port 5000.*

### 2. Frontend React Application
```bash
cd axona-fleet-analytics/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```
*Access the application at `http://localhost:3000`.*
