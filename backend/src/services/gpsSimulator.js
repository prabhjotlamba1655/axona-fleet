import db from '../db/database.js';
import AIS140Parser from './ais140Parser.js';
import GeofenceService from './geofenceService.js';

/**
 * AXONA LIVE GPS SIMULATION & TELEMETRY STREAMER
 * Developed by Axona Software LLP
 * Simulates real-time vehicle movement, speed changes, heading turns, and hardware packet transmission.
 */

// Route waypoints around Pune metro & highways
const SIMULATED_ROUTES = {
  'veh_1': [
    { lat: 18.5912, lng: 73.7389, speed: 45.0, heading: 90 },
    { lat: 18.5935, lng: 73.7445, speed: 52.0, heading: 85 },
    { lat: 18.5960, lng: 73.7510, speed: 58.0, heading: 70 },
    { lat: 18.6015, lng: 73.7620, speed: 64.0, heading: 60 },
    { lat: 18.6080, lng: 73.7740, speed: 60.0, heading: 45 },
    { lat: 18.6160, lng: 73.7850, speed: 48.0, heading: 30 },
    { lat: 18.6220, lng: 73.7920, speed: 35.0, heading: 20 },
    { lat: 18.6298, lng: 73.7997, speed: 15.0, heading: 10 },
    { lat: 18.6250, lng: 73.7950, speed: 42.0, heading: 210 },
    { lat: 18.6180, lng: 73.7880, speed: 55.0, heading: 225 },
    { lat: 18.6040, lng: 73.7620, speed: 62.0, heading: 240 },
    { lat: 18.5912, lng: 73.7389, speed: 48.5, heading: 85 }
  ],
  'veh_4': [
    { lat: 18.5590, lng: 73.7780, speed: 50.0, heading: 120 },
    { lat: 18.5520, lng: 73.7900, speed: 56.0, heading: 135 },
    { lat: 18.5440, lng: 73.8050, speed: 45.0, heading: 150 },
    { lat: 18.5360, lng: 73.8200, speed: 38.0, heading: 160 },
    { lat: 18.5280, lng: 73.8380, speed: 42.0, heading: 170 },
    { lat: 18.5204, lng: 73.8567, speed: 30.0, heading: 180 },
    { lat: 18.5350, lng: 73.8400, speed: 48.0, heading: 310 },
    { lat: 18.5590, lng: 73.7780, speed: 54.0, heading: 310 }
  ],
  'veh_7': [
    { lat: 12.9716, lng: 77.5946, speed: 35.0, heading: 45 },
    { lat: 12.9760, lng: 77.6010, speed: 42.0, heading: 60 },
    { lat: 12.9820, lng: 77.6100, speed: 48.0, heading: 75 },
    { lat: 12.9880, lng: 77.6220, speed: 38.0, heading: 90 },
    { lat: 12.9800, lng: 77.6150, speed: 40.0, heading: 220 },
    { lat: 12.9716, lng: 77.5946, speed: 32.0, heading: 245 }
  ]
};

const routeIndices = {
  veh_1: 0,
  veh_4: 0,
  veh_7: 0
};

let simInterval = null;

export function startGPSSimulator(broadcastCallback) {
  if (simInterval) clearInterval(simInterval);

  console.log('[Axona GPS Simulator] Starting background telemetry stream (every 4s)...');

  simInterval = setInterval(async () => {
    try {
      for (const [vehicleId, waypoints] of Object.entries(SIMULATED_ROUTES)) {
        // Check if vehicle is immobilised! If immobilised, vehicle CANNOT move
        const veh = db.get('SELECT immobilisation_status, device_id FROM vehicles WHERE id = ?', [vehicleId]);
        if (!veh || veh.immobilisation_status === 'immobilised') {
          continue; // Immobilised vehicle stays stationary
        }

        const dev = db.get('SELECT imei FROM gps_devices WHERE id = ?', [veh.device_id]);
        if (!dev) continue;

        let idx = routeIndices[vehicleId] || 0;
        idx = (idx + 1) % waypoints.length;
        routeIndices[vehicleId] = idx;
        const pt = waypoints[idx];

        // Format standard AIS-140 packet:
        // $PVT,IMEI,DATE,TIME,LAT,N,LON,E,SPEED,HEADING,SATS,ALT,IGN,MAIN_PWR,EMERGENCY,TAMPER*CS
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        
        const rawPacket = `$PVT,${dev.imei},${dateStr},${timeStr},${pt.lat.toFixed(6)},N,0${pt.lng.toFixed(6)},E,${pt.speed.toFixed(1)},${pt.heading.toFixed(1)},14,560,1,1,0,0*7F`;

        // Process through the AIS-140 parser
        const result = await AIS140Parser.processIncomingPacket(rawPacket, 'SIMULATOR');

        // Check geofences
        GeofenceService.evaluateVehicleGeofences(vehicleId, pt.lat, pt.lng, pt.speed);

        // Notify WebSocket clients of location update
        if (broadcastCallback) {
          broadcastCallback({
            type: 'LOCATION_UPDATE',
            data: {
              vehicleId,
              imei: dev.imei,
              latitude: pt.lat,
              longitude: pt.lng,
              speed: pt.speed,
              heading: pt.heading,
              ignition: 1,
              movementStatus: pt.speed > 3 ? 'moving' : 'idle',
              timestamp: now.toISOString()
            }
          });

          // Occasionally simulate a realistic AIS-140 driver behavior packet (Harsh Braking, Accel, Tilt, Rash Driving, Overspeeding)
          if (Math.random() < 0.08) {
            const behaviorVariants = [
              { sub: 'HB', aid: 13, val: '-0.62g brake' },
              { sub: 'HA', aid: 14, val: '+0.50g surge' },
              { sub: 'RT', aid: 15, val: '43 km/h lateral turn' },
              { sub: 'TI', aid: 22, val: '47.1° roll angle' },
              { sub: 'OS', aid: 17, val: `${(pt.speed + 25).toFixed(1)} km/h` }
            ];
            const chosen = behaviorVariants[Math.floor(Math.random() * behaviorVariants.length)];
            const altPacket = `$ALT,TNOWTN,1.2.0,${chosen.sub},${chosen.aid},L,${dev.imei},${veh.registration_number || 'VEH'},1,${dateStr},${timeStr},${pt.lat.toFixed(6)},N,0${pt.lng.toFixed(6)},E,${pt.speed.toFixed(1)},${pt.heading.toFixed(1)},14,560,0.8,0.9,Airtel,1,1,12.4,4.2,0,C,31,404,98,XXXX,1001,0000,00,0,0,000010,123.456,TEST*1A`;
            
            AIS140Parser.processIncomingPacket(altPacket, 'SIMULATOR_BEHAVIOR').then(altRes => {
              if (altRes && altRes.driverIntelligenceEventCreated) {
                broadcastCallback({
                  type: 'DRIVER_INTELLIGENCE_EVENT',
                  data: altRes.driverIntelligenceEventCreated
                });
              }
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('[Axona GPS Simulator] Error:', e.message);
    }
  }, 4000);
}

export function stopGPSSimulator() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
    console.log('[Axona GPS Simulator] Stopped.');
  }
}
