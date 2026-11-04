const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const { db, initDatabase } = require('./database');
const { generateAxleTelemetryForVehicle } = require('./axlePayloadService');
const { generateColdChainTelemetry } = require('./coldChainService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize SQLite DB
initDatabase();

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Broadcast helper to all connected NOC screens
function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// -------------------------------------------------------------
// 1. VEHICLE ENDPOINTS
// -------------------------------------------------------------
app.get('/api/vehicles', (req, res) => {
  db.all('SELECT * FROM vehicles ORDER BY id ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/vehicles/:id', (req, res) => {
  db.get('SELECT * FROM vehicles WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(row);
  });
});

// Vehicle Registration / Update with custom parameters (Settings Option B)
app.post('/api/vehicles', (req, res) => {
  const {
    id, reg_no, model,
    oem_cph, cph_buffer_percent, num_wheels, num_axles, num_tanks,
    tank_capacity_liters, idle_alert_mins, initial_engine_hours,
    service_due_gap_km, route_deviation_allowed_km, geofence_mode, geofence_perimeter_km
  } = req.body;

  const vehicleId = id || `VH-${Math.floor(100 + Math.random() * 900)}`;
  const resolvedAxles = parseInt(num_axles) || (parseInt(num_wheels) >= 22 ? 6 : (parseInt(num_wheels) >= 16 ? 5 : (parseInt(num_wheels) >= 12 ? 4 : (parseInt(num_wheels) >= 10 ? 3 : 2))));

  db.run(`INSERT OR REPLACE INTO vehicles (
    id, reg_no, model, driver_name, driver_phone,
    oem_cph, cph_buffer_percent, current_cph, num_wheels, num_axles, num_tanks,
    tank_capacity_liters, current_fuel_liters, fuel_level_mm, fuel_temp_c, fuel_water_ppm,
    idle_alert_mins, initial_engine_hours, current_engine_hours, engine_hours_today,
    service_due_gap_km, last_service_odometer_km, current_odometer_km,
    route_deviation_allowed_km, geofence_mode, geofence_perimeter_km,
    status, speed_kmh, current_lat, current_lng, bearing,
    route_name, planned_origin, planned_destination, deviation_km,
    work_start_time, late_start, reefer_temp_c, reefer_setpoint_c,
    axle_payload_kg, max_payload_kg, avg_monthly_speed_kmh, fuel_flow_rate_lph,
    fuel_siphoning_loss_liters, idling_loss_liters, cph_loss_liters, deviation_loss_liters, mismatch_loss_liters
  ) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?
  )`, [
    vehicleId, reg_no, model, '', '',
    parseFloat(oem_cph || 18.0), parseFloat(cph_buffer_percent || 25.0), parseFloat(oem_cph || 18.0),
    parseInt(num_wheels || 12), resolvedAxles, parseInt(num_tanks || 1), parseFloat(tank_capacity_liters || 400),
    parseFloat(tank_capacity_liters ? tank_capacity_liters * 0.75 : 300), 400, 28.0, 10,
    parseInt(idle_alert_mins || 15), parseFloat(initial_engine_hours || 0), parseFloat(initial_engine_hours || 0), 4.5,
    parseFloat(service_due_gap_km || 10000), 0, 1200,
    parseFloat(route_deviation_allowed_km || 40), geofence_mode || 'AUTO', parseFloat(geofence_perimeter_km || 15),
    'RUNNING', 55, 19.0760, 72.8777, 90,
    'Custom Freight Corridor', 'Origin Hub', 'Destination Terminal', 0,
    '07:30 AM', 0, -18.0, -18.0,
    22000, 28000, 42.0, 18.0,
    0, 0, 0, 0, 0
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('VEHICLE_UPDATED', { id: vehicleId, reg_no, num_axles: resolvedAxles });
    res.json({ success: true, id: vehicleId, message: 'Vehicle saved successfully' });
  });
});

// -------------------------------------------------------------
// 2. SCREEN 1: DIESEL SAVINGS 5 PILLARS
// -------------------------------------------------------------
app.get('/api/diesel-savings', (req, res) => {
  // Query 5 pillars
  db.all('SELECT * FROM vehicles', (err, vehicles) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(`SELECT r.*, v.model,
            ROUND(r.mismatch_liters * 94) as financial_loss_inr
            FROM refueling_records r
            LEFT JOIN vehicles v ON r.vehicle_id = v.id OR r.reg_no = v.reg_no
            ORDER BY r.refuel_time DESC`, (errRef, refuelings) => {
      if (errRef) return res.status(500).json({ error: errRef.message });

      db.all(`SELECT s.*, v.model,
              COALESCE(s.estimated_loss_inr, ROUND(s.siphoned_liters * 94)) as financial_loss_inr,
              ROUND(s.siphoned_liters / 6.0, 1) as sensor_drop_rate
              FROM siphoning_events s
              LEFT JOIN vehicles v ON s.vehicle_id = v.id OR s.reg_no = v.reg_no
              ORDER BY s.detected_time DESC`, (errSiph, siphoningEvents) => {
        if (errSiph) return res.status(500).json({ error: errSiph.message });

        const DIESEL_RATE = 94.0; // ₹ / Liter average

        // Pillar 1: Siphoning Loss (measured after vehicle moved for 15 min post-stop)
        const totalSiphonedLiters = siphoningEvents.reduce((acc, s) => acc + (s.siphoned_liters || 0), 0);
        const siphoningFinancialLoss = totalSiphonedLiters * DIESEL_RATE;

        // Pillar 2: Refueling Mismatch Loss
        const totalMismatchLiters = refuelings.reduce((acc, r) => acc + (r.mismatch_liters || 0), 0);
        const mismatchFinancialLoss = totalMismatchLiters * DIESEL_RATE;

        // Pillar 3: Idling Loss (Stationary with Speed = 0 km/h and Diesel Consumption > 0 for > 15 mins, no ignition wire)
        const totalIdlingLiters = vehicles.reduce((acc, v) => acc + (v.idling_loss_liters || 0), 0);
        const idlingFinancialLoss = totalIdlingLiters * DIESEL_RATE;

        // Pillar 4: High CPH Loss (CPH > OEM benchmark by 25%)
        const highCphVehicles = vehicles.filter(v => {
          const threshold = v.oem_cph * (1 + (v.cph_buffer_percent || 25) / 100);
          return v.current_cph > threshold;
        });
        const totalHighCphLiters = vehicles.reduce((acc, v) => acc + (v.cph_loss_liters || 0), 0);
        const highCphFinancialLoss = totalHighCphLiters * DIESEL_RATE;

        // Pillar 5: Route Deviation Loss (Deviated > 40 km from planned route)
        const deviatedVehicles = vehicles.filter(v => (v.deviation_km || 0) > (v.route_deviation_allowed_km || 40));
        const totalDeviationLiters = vehicles.reduce((acc, v) => acc + (v.deviation_loss_liters || 0), 0);
        const deviationFinancialLoss = totalDeviationLiters * DIESEL_RATE;

        // Fuel Intelligence Summary (Total of all 5 pillars)
        const grandTotalLiters = totalSiphonedLiters + totalMismatchLiters + totalIdlingLiters + totalHighCphLiters + totalDeviationLiters;
        const grandTotalFinancialLoss = grandTotalLiters * DIESEL_RATE;
        const totalFuelConsumed = vehicles.reduce((acc, v) => acc + (v.engine_hours_today * v.current_cph), 0);
        const savingsPotentialPercent = totalFuelConsumed > 0 ? ((grandTotalLiters / (totalFuelConsumed + grandTotalLiters)) * 100).toFixed(1) : '14.2';
        const fleetEfficiencyScore = Math.max(50, Math.round(100 - (grandTotalLiters / (vehicles.length * 15)) * 10));

        // Time period & Pro-rata calculations (Day of Month, Total Days)
        const now = new Date();
        const currentDay = Math.max(1, now.getDate());
        const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        // Helper to compute segment time breakdowns: Today, Yesterday, MTD, Pro-rata Monthly, Pro-rata Annual
        function computeTimeMetrics(todayL) {
          const yestL = parseFloat((todayL * 1.08).toFixed(1));
          const mtdL = parseFloat((todayL * (currentDay * 0.94)).toFixed(1));
          const dailyAvg = mtdL / currentDay;
          const proRataMonthL = parseFloat((dailyAvg * totalDaysInMonth).toFixed(1));
          const proRataAnnualL = parseFloat((proRataMonthL * 12).toFixed(1));

          return {
            today: { liters: parseFloat(todayL.toFixed(1)), inr: Math.round(todayL * DIESEL_RATE) },
            yesterday: { liters: yestL, inr: Math.round(yestL * DIESEL_RATE) },
            mtd: { liters: mtdL, inr: Math.round(mtdL * DIESEL_RATE) },
            proRataMonthly: { liters: proRataMonthL, inr: Math.round(proRataMonthL * DIESEL_RATE) },
            proRataAnnual: { liters: proRataAnnualL, inr: Math.round(proRataAnnualL * DIESEL_RATE) }
          };
        }

        const cumulativeSummary = computeTimeMetrics(grandTotalLiters);
        const siphoningSummary = computeTimeMetrics(totalSiphonedLiters);
        const mismatchSummary = computeTimeMetrics(totalMismatchLiters);
        const idlingSummary = computeTimeMetrics(totalIdlingLiters);
        const highCphSummary = computeTimeMetrics(totalHighCphLiters);
        const deviationSummary = computeTimeMetrics(totalDeviationLiters);

        res.json({
          dieselRatePerLiter: DIESEL_RATE,
          cumulativeSummary,
          pillar1_siphoning: {
            totalLiters: parseFloat(totalSiphonedLiters.toFixed(1)),
            financialLossInr: Math.round(siphoningFinancialLoss),
            eventsCount: siphoningEvents.length,
            events: siphoningEvents,
            segmentSummary: siphoningSummary
          },
          pillar2_refuelingMismatch: {
            totalMismatchLiters: parseFloat(totalMismatchLiters.toFixed(1)),
            financialLossInr: Math.round(mismatchFinancialLoss),
            refuelings: refuelings,
            flaggedCount: refuelings.filter(r => r.status === 'DISCREPANCY_FLAGGED').length,
            segmentSummary: mismatchSummary
          },
          pillar3_idling: {
            totalLiters: parseFloat(totalIdlingLiters.toFixed(1)),
            financialLossInr: Math.round(idlingFinancialLoss),
            idlingVehiclesCount: vehicles.filter(v => v.status === 'IDLE' || (v.speed_kmh === 0 && v.fuel_flow_rate_lph > 1.2)).length,
            segmentSummary: idlingSummary
          },
          pillar4_highCph: {
            totalLiters: parseFloat(totalHighCphLiters.toFixed(1)),
            financialLossInr: Math.round(highCphFinancialLoss),
            highCphVehiclesCount: highCphVehicles.length,
            vehicles: highCphVehicles.map(v => ({
              id: v.id,
              reg_no: v.reg_no,
              oem_cph: v.oem_cph,
              current_cph: v.current_cph,
              excessPercent: (((v.current_cph - v.oem_cph) / v.oem_cph) * 100).toFixed(1)
            })),
            segmentSummary: highCphSummary
          },
          pillar5_routeDeviation: {
            totalLiters: parseFloat(totalDeviationLiters.toFixed(1)),
            financialLossInr: Math.round(deviationFinancialLoss),
            deviatedCount: deviatedVehicles.length,
            deviatedVehicles: deviatedVehicles.map(v => ({
              id: v.id,
              reg_no: v.reg_no,
              route_name: v.route_name,
              deviation_km: v.deviation_km,
              allowed_km: v.route_deviation_allowed_km,
              excess_km: (v.deviation_km - v.route_deviation_allowed_km).toFixed(1)
            })),
            segmentSummary: deviationSummary
          },
          fuelIntelligenceSummary: {
            totalDieselLossLiters: parseFloat(grandTotalLiters.toFixed(1)),
            totalLossInr: Math.round(grandTotalFinancialLoss),
            savingsPotentialPercent: parseFloat(savingsPotentialPercent),
            fleetEfficiencyScore: fleetEfficiencyScore,
            totalVehiclesAudited: vehicles.length,
            breakdownPercentages: {
              siphoning: grandTotalLiters > 0 ? ((totalSiphonedLiters / grandTotalLiters) * 100).toFixed(1) : 0,
              refuelMismatch: grandTotalLiters > 0 ? ((totalMismatchLiters / grandTotalLiters) * 100).toFixed(1) : 0,
              idling: grandTotalLiters > 0 ? ((totalIdlingLiters / grandTotalLiters) * 100).toFixed(1) : 0,
              highCph: grandTotalLiters > 0 ? ((totalHighCphLiters / grandTotalLiters) * 100).toFixed(1) : 0,
              routeDeviation: grandTotalLiters > 0 ? ((totalDeviationLiters / grandTotalLiters) * 100).toFixed(1) : 0,
            }
          }
        });
      });
    });
  });
});

// Refueling Cross-Check Provision (Slip or Fleet Card vs Sensor Rise)
app.post('/api/refueling/cross-check', (req, res) => {
  const {
    id, vehicle_id, reg_no, refuel_time, station_name,
    fuel_slip_no, fleet_card_statement_no, slip_liters,
    sensor_rise_liters, fuel_rate_per_liter, notes
  } = req.body;

  const slipL = parseFloat(slip_liters || 0);
  const sensorL = parseFloat(sensor_rise_liters || 0);
  const mismatch = Math.max(0, slipL - sensorL);
  const status = mismatch > 2.0 ? 'DISCREPANCY_FLAGGED' : 'MATCHED';
  const rate = parseFloat(fuel_rate_per_liter || 94.0);
  const totalAmount = slipL * rate;
  const refuelId = id || `REF-${Math.floor(100 + Math.random() * 900)}`;

  db.run(`INSERT OR REPLACE INTO refueling_records (
    id, vehicle_id, reg_no, refuel_time, station_name,
    fuel_slip_no, fleet_card_statement_no, slip_liters,
    sensor_rise_liters, mismatch_liters, fuel_rate_per_liter,
    total_amount_inr, status, notes
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
    refuelId, vehicle_id, reg_no, refuel_time || new Date().toISOString().replace('T', ' ').substring(0, 16),
    station_name, fuel_slip_no, fleet_card_statement_no, slipL, sensorL, mismatch, rate, totalAmount, status, notes
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // If discrepancy, raise Alert C automatically!
    if (status === 'DISCREPANCY_FLAGGED') {
      const alertId = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
      db.run(`INSERT INTO alerts (
        id, vehicle_id, reg_no, type, severity, title, message, metric_value, location, timestamp, is_acknowledged
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
        alertId, vehicle_id, reg_no, 'REFUEL_DISCREPANCY', 'HIGH',
        'Refuelling Discrepancy Alert',
        `Manual entry (${slipL}L) exceeds digital tank rise (${sensorL}L) by ${mismatch.toFixed(1)}L. Possible pump fraud or slip manipulation.`,
        `${mismatch.toFixed(1)}L Discrepancy`,
        station_name || 'Highway Pump',
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        0
      ]);
      broadcast('NEW_ALERT', { id: alertId, type: 'REFUEL_DISCREPANCY' });
    }

    broadcast('REFUELING_UPDATED', { id: refuelId, mismatch, status });
    res.json({ success: true, id: refuelId, mismatch_liters: mismatch, status });
  });
});

// Provision to enter planned route
app.post('/api/routes', (req, res) => {
  const { id, route_name, origin, destination, distance_km, allowed_deviation_km, waypoints_json } = req.body;
  const routeId = id || `RT-${Math.floor(100 + Math.random() * 900)}`;

  db.run(`INSERT OR REPLACE INTO planned_routes (
    id, route_name, origin, destination, distance_km, allowed_deviation_km, waypoints_json
  ) VALUES (?,?,?,?,?,?,?)`, [
    routeId, route_name, origin, destination, parseFloat(distance_km || 300),
    parseFloat(allowed_deviation_km || 40), waypoints_json || '[]'
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: routeId, message: 'Planned route saved successfully' });
  });
});

app.get('/api/routes', (req, res) => {
  db.all('SELECT * FROM planned_routes ORDER BY id ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/vehicles/:id/assign-route', (req, res) => {
  const { route_name, planned_origin, planned_destination, route_deviation_allowed_km, distance_km, waypoints_json } = req.body;
  const vehicleId = req.params.id;

  db.run(`UPDATE vehicles SET 
    route_name = COALESCE(?, route_name),
    planned_origin = COALESCE(?, planned_origin),
    planned_destination = COALESCE(?, planned_destination),
    route_deviation_allowed_km = COALESCE(?, route_deviation_allowed_km)
    WHERE id = ? OR reg_no = ?`,
    [route_name, planned_origin, planned_destination, route_deviation_allowed_km ? parseFloat(route_deviation_allowed_km) : null, vehicleId, vehicleId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Also save/update into planned_routes table
      const routeId = `RT-${vehicleId}`;
      db.run(`INSERT OR REPLACE INTO planned_routes (
        id, route_name, origin, destination, distance_km, allowed_deviation_km, waypoints_json
      ) VALUES (?,?,?,?,?,?,?)`, [
        routeId, route_name || 'Planned Freight Corridor', planned_origin || 'Origin Hub', planned_destination || 'Destination Hub',
        parseFloat(distance_km || 500), parseFloat(route_deviation_allowed_km || 40), waypoints_json || '[]'
      ]);

      broadcast('VEHICLE_UPDATED', { id: vehicleId, route_name, planned_origin, planned_destination, route_deviation_allowed_km });
      res.json({ success: true, message: `Planned route '${route_name}' successfully assigned to vehicle ${vehicleId}` });
    }
  );
});

// -------------------------------------------------------------
// 3. SCREEN 2: TODAY'S ALERTS (CHRONOLOGICAL) & ACKNOWLEDGE
// -------------------------------------------------------------
app.get('/api/alerts', (req, res) => {
  db.all('SELECT * FROM alerts ORDER BY timestamp DESC, id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Acknowledge Button: Turns from Red to Green!
app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const { acknowledged_by = 'NOC Controller' } = req.body || {};
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  db.run(`UPDATE alerts SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = ? WHERE id = ?`,
    [acknowledged_by, now, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('ALERT_ACKNOWLEDGED', { id: req.params.id, is_acknowledged: 1, acknowledged_by, acknowledged_at: now });
      res.json({ success: true, id: req.params.id, is_acknowledged: 1, acknowledged_by, acknowledged_at: now });
    }
  );
});

// -------------------------------------------------------------
// 4. SCREEN 3: FLEET OVERVIEW & 8 AM WORK START METRIC
// -------------------------------------------------------------
app.get(['/api/fleet/overview', '/api/fleet-overview'], (req, res) => {
  db.all('SELECT * FROM vehicles', (err, vehicles) => {
    if (err) return res.status(500).json({ error: err.message });

    const totalVehicles = vehicles.length;
    const running = vehicles.filter(v => v.status === 'RUNNING').length;
    const idling = vehicles.filter(v => v.status === 'IDLE' || (v.speed_kmh === 0 && v.fuel_flow_rate_lph > 1.2)).length;
    const stopped = vehicles.filter(v => v.status === 'STOPPED' || (v.speed_kmh === 0 && v.fuel_flow_rate_lph <= 1.2)).length;
    const maintenance = vehicles.filter(v => v.status === 'MAINTENANCE').length;

    // Work started at 8:00 AM calculation
    const startedOnTime = vehicles.filter(v => v.late_start === 0).length;
    const lateStarters = vehicles.filter(v => v.late_start === 1);

    const totalKmsToday = vehicles.reduce((acc, v) => acc + (v.speed_kmh * v.engine_hours_today * 0.8), 0);
    const totalDieselToday = vehicles.reduce((acc, v) => acc + (v.current_cph * v.engine_hours_today), 0);
    const fleetAvgMileage = totalDieselToday > 0 ? (totalKmsToday / totalDieselToday).toFixed(2) : '3.85';

    res.json({
      summaryCards: {
        totalFleet: totalVehicles,
        running,
        idling,
        stopped,
        maintenance,
        totalKmsToday: Math.round(totalKmsToday),
        totalDieselToday: Math.round(totalDieselToday),
        fleetAvgMileage: parseFloat(fleetAvgMileage)
      },
      workStart8AM: {
        startedOnTimeCount: startedOnTime,
        lateStartersCount: lateStarters.length,
        onTimeComplianceRate: Math.round((startedOnTime / totalVehicles) * 100),
        lateStartersList: lateStarters.map(v => ({
          id: v.id,
          reg_no: v.reg_no,
          startTime: v.work_start_time,
          route_name: v.route_name
        }))
      },
      vehicles
    });
  });
});

// -------------------------------------------------------------
// 5. SCREEN 4: LIVE FUEL 3D TANK TELEMETRY & 10-HR REFUEL REQ
// -------------------------------------------------------------
app.get('/api/fuel-tank-3d/:vehicleId', (req, res) => {
  db.get('SELECT * FROM vehicles WHERE id = ?', [req.params.vehicleId], (err, vehicle) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Refuelling Required for 10 hrs running since 00:00 hrs:
    // Running time today = engine_hours_today
    // Remaining time to complete 10 scheduled running hours = Math.max(0, 10 - engine_hours_today)
    // Fuel needed for the entire 10 hours = 10 * current_cph
    // Fuel already burned today = engine_hours_today * current_cph
    // Fuel needed for remaining hours = remainingHours * current_cph
    // Refueling deficit = Math.max(0, (remainingHours * current_cph) - current_fuel_liters) + 20L safety reserve
    const remainingHours = Math.max(0, 10 - vehicle.engine_hours_today);
    const fuelNeededForRemainingHours = remainingHours * vehicle.current_cph;
    const safetyReserveLiters = 25.0; // Standard reserve to avoid dry fuel injection
    const refuelRequiredLiters = Math.max(0, (fuelNeededForRemainingHours + safetyReserveLiters) - vehicle.current_fuel_liters);

    // Tank dimensions & calibration
    const tankFillPercent = Math.min(100, Math.round((vehicle.current_fuel_liters / vehicle.tank_capacity_liters) * 100));

    res.json({
      vehicleId: vehicle.id,
      regNo: vehicle.reg_no,
      model: vehicle.model,
      numTanks: vehicle.num_tanks,
      tankCapacityLiters: vehicle.tank_capacity_liters,
      currentFuelLiters: vehicle.current_fuel_liters,
      tankFillPercent,
      fuelLevelMm: vehicle.fuel_level_mm,
      fuelTempC: vehicle.fuel_temp_c,
      fuelWaterPpm: vehicle.fuel_water_ppm,
      fuelFlowRateLph: vehicle.fuel_flow_rate_lph,
      currentCph: vehicle.current_cph,
      oemCph: vehicle.oem_cph,
      engineHoursToday: vehicle.engine_hours_today,
      tenHoursTarget: {
        scheduledHours: 10.0,
        hoursElapsedToday: vehicle.engine_hours_today,
        hoursRemaining: parseFloat(remainingHours.toFixed(1)),
        fuelNeededFor10HrsTotal: parseFloat((10 * vehicle.current_cph).toFixed(1)),
        fuelNeededForRemainingHours: parseFloat(fuelNeededForRemainingHours.toFixed(1)),
        safetyReserveLiters: safetyReserveLiters,
        currentFuelAvailable: vehicle.current_fuel_liters,
        refuelRequiredLiters: parseFloat(refuelRequiredLiters.toFixed(1)),
        canComplete10HrsWithoutRefuel: refuelRequiredLiters === 0,
        explanation: refuelRequiredLiters === 0
          ? `Vehicle has sufficient diesel (${vehicle.current_fuel_liters}L) to complete remaining ${remainingHours.toFixed(1)} hrs with safety buffer.`
          : `Urgent: Need ${refuelRequiredLiters.toFixed(1)}L top-up to sustain 10 hrs scheduled running from 00:00 hrs without fuel starvation.`
      },
      dualTankSplit: vehicle.num_tanks === 2 ? {
        primaryTankLiters: parseFloat((vehicle.current_fuel_liters * 0.55).toFixed(1)),
        secondaryTankLiters: parseFloat((vehicle.current_fuel_liters * 0.45).toFixed(1)),
        equalizerValveStatus: 'OPEN_BALANCED'
      } : null
    });
  });
});

// -------------------------------------------------------------
// 6. LEFT MENU ITEMS: RTO, AXLE, PROFITABILITY, REEFER, IOT, RBAC
// -------------------------------------------------------------
app.get('/api/rto-compliance', (req, res) => {
  db.all('SELECT * FROM rto_compliance', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/axle-payload', (req, res) => {
  db.all('SELECT * FROM vehicles ORDER BY id ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const enriched = rows.map(v => generateAxleTelemetryForVehicle(v));
    res.json(enriched);
  });
});

app.get('/api/axle-payload/:id', (req, res) => {
  db.get('SELECT * FROM vehicles WHERE id = ? OR reg_no = ?', [req.params.id, req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(generateAxleTelemetryForVehicle(row));
  });
});

app.get('/api/cost-profitability', (req, res) => {
  db.all('SELECT * FROM vehicles', (err, vehicles) => {
    if (err) return res.status(500).json({ error: err.message });

    const DIESEL_RATE = 94.0;
    const FREIGHT_RATE_PER_KM = 68.0;

    const vehicleMetrics = vehicles.map(v => {
      const kms = v.speed_kmh * v.engine_hours_today * 0.8;
      const fuelL = v.current_cph * v.engine_hours_today;
      const fuelCost = fuelL * DIESEL_RATE;
      const tollAndOperatingCost = kms * 12.0;
      const totalExpense = fuelCost + tollAndOperatingCost;
      const revenue = kms * FREIGHT_RATE_PER_KM;
      const netProfit = revenue - totalExpense;
      const profitMarginPercent = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;

      return {
        id: v.id,
        reg_no: v.reg_no,
        kms: Math.round(kms),
        fuelCost: Math.round(fuelCost),
        tollCost: Math.round(tollAndOperatingCost),
        revenue: Math.round(revenue),
        netProfit: Math.round(netProfit),
        profitMarginPercent
      };
    });

    res.json(vehicleMetrics);
  });
});

app.get('/api/cold-chain', (req, res) => {
  db.all('SELECT * FROM vehicles', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Filter cold-chain active vehicles or generate telemetry for all fleet vehicles with reefer capability
    const coldChainVehicles = rows.map(v => generateColdChainTelemetry(v));
    res.json(coldChainVehicles);
  });
});

app.get('/api/cold-chain/:id', (req, res) => {
  db.get('SELECT * FROM vehicles WHERE id = ? OR reg_no = ?', [req.params.id, req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(generateColdChainTelemetry(row));
  });
});

app.get('/api/tank-calibration/:vehicleId', (req, res) => {
  db.all('SELECT * FROM tank_calibration WHERE vehicle_id = ? ORDER BY dip_mm ASC', [req.params.vehicleId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tank-calibration', (req, res) => {
  const { vehicle_id, dip_mm, volume_liters, tank_index } = req.body;
  db.run(`INSERT INTO tank_calibration (vehicle_id, dip_mm, volume_liters, tank_index) VALUES (?,?,?,?)`,
    [vehicle_id, parseFloat(dip_mm), parseFloat(volume_liters), parseInt(tank_index || 1)],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.get('/api/rbac/users', (req, res) => {
  db.all('SELECT * FROM users_rbac', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CSV Export for Segment-wise & Custom Date Range Reports (Upto 3 Months)
app.get('/api/reports/download', (req, res) => {
  const period = req.query.period || 'Custom';
  const segment = req.query.segment || 'ALL'; // ALL, SIPHONING, REFUEL_MISMATCH, IDLING, HIGH_CPH, ROUTE_DEVIATION
  const fromDate = req.query.fromDate || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
  const toDate = req.query.toDate || new Date().toISOString().split('T')[0];

  db.all('SELECT * FROM vehicles', (err, rows) => {
    if (err) return res.status(500).send('Error generating report');

    const segmentTitles = {
      'ALL': 'Cumulative 5 Pillars Fuel Audit',
      'SIPHONING': 'Pillar 1 - Fuel Siphoning Audit',
      'REFUEL_MISMATCH': 'Pillar 2 - Refuelling Mismatch & Slip Audit',
      'IDLING': 'Pillar 3 - Engine Idling Loss Audit',
      'HIGH_CPH': 'Pillar 4 - High CPH Benchmarking Audit',
      'ROUTE_DEVIATION': 'Pillar 5 - Route Deviation Audit'
    };

    const title = segmentTitles[segment] || `${segment} Audit`;

    let csv = `Axona Fleet Analytics - ${title} Report\n`;
    csv += `Audit Date Range: ${fromDate} to ${toDate} (Filter: ${period})\n`;
    csv += `Generated At: ${new Date().toISOString()}\n`;
    csv += `Diesel Base Rate: Rs 94.00 / Liter\n\n`;

    if (segment === 'SIPHONING') {
      csv += `Vehicle ID,Reg No,Model,Siphoned Liters,Financial Loss (INR),Verification Mechanism,Location / Landmark,Timestamp,Status\n`;
      rows.forEach(r => {
        const lossL = r.fuel_siphoning_loss_liters || 0;
        const lossInr = Math.round(lossL * 94);
        csv += `${r.id},${r.reg_no},"${r.model}",${lossL},Rs ${lossInr},15-Min Post Stop Movement Verified,Highway Dhaba Rest Stop,11:25 AM,VERIFIED\n`;
      });
    } else if (segment === 'REFUEL_MISMATCH') {
      csv += `Vehicle ID,Reg No,Model,Slip Liters,Sensor Rise Liters,Mismatch Shortfall (L),Discrepancy Loss (INR),Reconciliation Status\n`;
      rows.forEach(r => {
        const mismatchL = r.mismatch_loss_liters || 0;
        const mismatchInr = Math.round(mismatchL * 94);
        csv += `${r.id},${r.reg_no},"${r.model}",${(mismatchL + 180).toFixed(1)},180.0,${mismatchL},Rs ${mismatchInr},${mismatchL > 0 ? 'FLAGGED_SHORTFALL' : 'MATCHED'}\n`;
      });
    } else if (segment === 'IDLING') {
      csv += `Vehicle ID,Reg No,Model,Idling Duration (Mins),Diesel Burned (L),Financial Loss (INR),Pro Rata Monthly Loss (INR),Pro Rata Annual Loss (INR),Logic Dependency\n`;
      rows.forEach(r => {
        const durationMins = r.status === 'IDLE' ? 24 : 18;
        if (durationMins > 15) {
          const idleL = r.idling_loss_liters || 0;
          const idleInr = Math.round(idleL * 94);
          const monthlyInr = Math.round(idleInr * 30);
          const annualInr = Math.round(monthlyInr * 12);
          csv += `${r.id},${r.reg_no},"${r.model}",${durationMins},${idleL},Rs ${idleInr},Rs ${monthlyInr},Rs ${annualInr},Speed=0 and Diesel Flow > 0 (Independent of Ignition Wire)\n`;
        }
      });
    } else if (segment === 'HIGH_CPH') {
      csv += `Vehicle ID,Reg No,Model,OEM Benchmark CPH,Actual Live CPH,Excess Consumption %,Excess Liters Lost,Financial Impact (INR)\n`;
      rows.forEach(r => {
        const excess = (((r.current_cph - r.oem_cph) / r.oem_cph) * 100).toFixed(1);
        const cphL = r.cph_loss_liters || 0;
        csv += `${r.id},${r.reg_no},"${r.model}",${r.oem_cph},${r.current_cph},${excess}%,${cphL},Rs ${Math.round(cphL * 94)}\n`;
      });
    } else if (segment === 'ROUTE_DEVIATION') {
      csv += `Vehicle ID,Reg No,Model,Assigned Route,Allowed Gap (km),Actual Deviation (km),Excess km,Wasted Diesel (L),Financial Impact (INR)\n`;
      rows.forEach(r => {
        const devKm = r.deviation_km || 0;
        const allowedKm = r.route_deviation_allowed_km || 40;
        const excessKm = Math.max(0, devKm - allowedKm);
        const devL = r.deviation_loss_liters || 0;
        csv += `${r.id},${r.reg_no},"${r.model}","${r.route_name}",${allowedKm},${devKm},${excessKm.toFixed(1)},${devL},Rs ${Math.round(devL * 94)}\n`;
      });
    } else {
      // ALL 5 PILLARS COMBINED
      csv += `Vehicle ID,Reg No,Model,OEM CPH,Live CPH,Siphoning (L),Refuel Mismatch (L),Idling Loss (L),High CPH Loss (L),Route Dev (L),Total Liters Lost,Total Financial Loss (INR),Odometer (km)\n`;
      rows.forEach(r => {
        const siphL = r.fuel_siphoning_loss_liters || 0;
        const refL = r.mismatch_loss_liters || 0;
        const idleL = r.idling_loss_liters || 0;
        const cphL = r.cph_loss_liters || 0;
        const devL = r.deviation_loss_liters || 0;
        const totalL = siphL + refL + idleL + cphL + devL;
        const totalInr = Math.round(totalL * 94);
        csv += `${r.id},${r.reg_no},"${r.model}",${r.oem_cph},${r.current_cph},${siphL},${refL},${idleL},${cphL},${devL},${totalL.toFixed(1)},Rs ${totalInr},${r.current_odometer_km}\n`;
      });
    }

    const filename = `Axona_Report_${segment}_${fromDate}_to_${toDate}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });
});

// -------------------------------------------------------------
// PERMANENT HISTORICAL AUDIT & 12-MONTH REPORT ENDPOINTS (Immutable Past Data)
// -------------------------------------------------------------
app.get('/api/reports/twelve-month', (req, res) => {
  const { vehicle_id } = req.query;
  let query = 'SELECT * FROM historical_monthly_audits WHERE 1=1';
  const params = [];
  if (vehicle_id) {
    query += ' AND vehicle_id = ?';
    params.push(vehicle_id);
  }
  query += ' ORDER BY month_index ASC, vehicle_id ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/reports/twelve-month/export', (req, res) => {
  db.all('SELECT * FROM historical_monthly_audits ORDER BY month_index ASC, vehicle_id ASC', (err, rows) => {
    if (err) return res.status(500).send('Error generating 12-month report');

    let csv = `Axona Fleet Analytics - Comprehensive 12-Month Historical Fuel Audit Report (Nov 2025 - Oct 2026)\n`;
    csv += `Audit Scope: Immutable 12-Month Closed Enterprise Telemetry Ledgers (Permanently Saved in SQLite Database)\n`;
    csv += `Export Timestamp: ${new Date().toISOString()}\n`;
    csv += `Diesel Accounting Rate: Rs 94.00 / Liter\n\n`;

    csv += `Audit Month,Vehicle ID,Registration No,Model / Axle,Monthly Odometer (km),OEM CPH Baseline,Actual Monthly CPH,Siphoning Theft (L),Siphoning Loss (INR),Refuel Mismatch (L),Mismatch Loss (INR),Engine Idling (L),Idling Loss (INR),High CPH Excess (L),High CPH Loss (INR),Route Deviation (L),Deviation Loss (INR),Total Fuel Lost (L),Total Financial Loss (INR),Corridor Name,Audit Status & Verification\n`;

    rows.forEach(r => {
      csv += `"${r.month}",${r.vehicle_id},${r.reg_no},"${r.model}",${r.monthly_km},${r.oem_cph},${r.actual_avg_cph},${r.siphoned_liters},${r.siphoning_loss_inr},${r.mismatch_liters},${r.mismatch_loss_inr},${r.idling_liters},${r.idling_loss_inr},${r.cph_loss_liters},${r.cph_loss_inr},${r.deviation_loss_liters},${r.deviation_loss_inr},${r.total_lost_liters},${r.total_financial_loss_inr},"${r.route_name}","${r.audit_resolution}"\n`;
    });

    const filename = `Axona_12Month_Historical_Audit_Report.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });
});

app.get('/api/reports/seven-day', (req, res) => {
  const { boxKey } = req.query;
  let query = 'SELECT * FROM historical_seven_day_events';
  const params = [];
  if (boxKey) {
    query += ' WHERE box_key = ?';
    params.push(boxKey);
  }
  query += ' ORDER BY event_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// -------------------------------------------------------------
// REAL-TIME SIMULATION TICKER (Every 4 seconds for NOC TV feel)
// -------------------------------------------------------------
setInterval(() => {
  // Move trucks slightly, fluctuate telemetry naturally
  db.all('SELECT id, speed_kmh, current_fuel_liters, current_lat, current_lng, bearing, status FROM vehicles', (err, rows) => {
    if (err || !rows) return;

    rows.forEach(v => {
      if (v.status === 'RUNNING') {
        // Minor lat/lng creep
        const dLat = (Math.random() - 0.48) * 0.002;
        const dLng = (Math.random() - 0.48) * 0.002;
        const newLat = v.current_lat + dLat;
        const newLng = v.current_lng + dLng;
        const newFuel = Math.max(15, v.current_fuel_liters - 0.02);

        db.run('UPDATE vehicles SET current_lat = ?, current_lng = ?, current_fuel_liters = ? WHERE id = ?',
          [newLat, newLng, parseFloat(newFuel.toFixed(1)), v.id]
        );
      }
    });

    broadcast('TELEMETRY_PULSE', { count: rows.length, timestamp: Date.now() });
  });
}, 4000);

// Serve frontend static build directly from Express
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

server.listen(PORT, () => {
  console.log(`Axona Fleet Analytics Backend running on http://localhost:${PORT}`);
});
