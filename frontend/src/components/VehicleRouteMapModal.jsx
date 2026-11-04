import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  X, MapPin, Navigation, AlertTriangle, CheckCircle2, 
  Truck, ShieldAlert, Layers, Maximize2, Compass, CornerDownRight,
  Fuel, Activity, Gauge, Clock, User, Route
} from 'lucide-react';
import { getRouteCorridorForVehicle } from '../services/routeCorridorService';
import { FREE_MAP_PROVIDERS } from '../services/mapProviders';

export default function VehicleRouteMapModal({ vehicle, vehicles = [], onClose, onAssignRoute }) {
  const [activeVehicle, setActiveVehicle] = useState(vehicle);

  useEffect(() => {
    setActiveVehicle(vehicle);
  }, [vehicle]);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    tileLayer: null,
    plannedPolyline: null,
    plannedGlowLine: null,
    deviatedPolyline: null,
    markers: []
  });

  const [mapProvider, setMapProvider] = useState('dark'); // 'dark', 'osm', 'voyager'
  const [forceDeviationMode, setForceDeviationMode] = useState(null); // null = auto from vehicle, true = force deviated, false = force on route
  const [telemetry, setTelemetry] = useState(null);

  // Recalculate route corridor data when activeVehicle or force toggle changes
  useEffect(() => {
    if (!activeVehicle) return;
    const base = getRouteCorridorForVehicle(activeVehicle);
    if (!base) return;

    // Apply manual simulation toggle if user clicked "Simulate Deviation" or "Force On-Route"
    if (forceDeviationMode !== null) {
      if (forceDeviationMode === true && !base.isDeviated) {
        // Force deviation
        const branch = base.plannedCorridor[Math.floor(base.plannedCorridor.length / 2)] || base.currentLocation;
        const detour = [
          branch,
          [(branch[0] + base.currentLocation[0]) / 2 + 0.18, (branch[1] + base.currentLocation[1]) / 2 + 0.28],
          [base.currentLocation[0] + 0.08, base.currentLocation[1] + 0.12]
        ];
        setTelemetry({
          ...base,
          isDeviated: true,
          deviationKm: 56.4,
          deviatedPath: detour,
          deviationJunction: branch,
          deviationReason: 'Simulated off-corridor detour (+56.4 km unapproved detour)'
        });
        return;
      } else if (forceDeviationMode === false) {
        // Force on route
        setTelemetry({
          ...base,
          isDeviated: false,
          deviationKm: 0,
          deviatedPath: [],
          deviationReason: null
        });
        return;
      }
    }

    setTelemetry(base);
  }, [activeVehicle, forceDeviationMode]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!telemetry || !mapContainerRef.current) return;

    // Destroy existing map if already instantiated
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Determine initial center
    const center = telemetry.currentLocation || [26.9124, 75.7873];
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 8,
      zoomControl: true,
      attributionControl: false
    });
    mapInstanceRef.current = map;

    // Add Free Tile Layer with crisp rendering & zero watermark
    let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let tileOptions = {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    };

    if (mapProvider === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      tileOptions = { maxZoom: 18, attribution: 'Tiles &copy; Esri World Imagery' };
    } else if (mapProvider === 'streets') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      tileOptions = { maxZoom: 18, attribution: 'Tiles &copy; Esri World Street Map' };
    }

    const tileLayer = L.tileLayer(tileUrl, tileOptions).addTo(map);
    layersRef.current.tileLayer = tileLayer;

    // Clear marker storage
    layersRef.current.markers.forEach(m => m.remove());
    layersRef.current.markers = [];

    const allPoints = [];

    // 1. RENDER PLANNED ROUTE CORRIDOR (BLUE LINE)
    if (telemetry.plannedCorridor && telemetry.plannedCorridor.length > 0) {
      // Outer glow line
      const glowLine = L.polyline(telemetry.plannedCorridor, {
        color: '#0284c7', // Cyan-Blue Outer Glow
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Core Solid Blue Line (Approved Planned Freight Corridor)
      const plannedLine = L.polyline(telemetry.plannedCorridor, {
        color: '#2563eb', // Royal Blue
        weight: 4.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      plannedLine.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px; padding: 4px 6px;">
          <strong style="color: #60a5fa;">PLANNED ROUTE CORRIDOR</strong><br/>
          <span>${telemetry.routeName}</span><br/>
          <span style="color: #93c5fd;">Total Distance: ~${telemetry.totalDistanceKm} km</span>
        </div>
      `, { sticky: true });

      layersRef.current.plannedGlowLine = glowLine;
      layersRef.current.plannedPolyline = plannedLine;
      telemetry.plannedCorridor.forEach(pt => allPoints.push(pt));
    }

    // 2. RENDER ORIGIN AND DESTINATION PINS
    if (telemetry.plannedCorridor && telemetry.plannedCorridor.length >= 2) {
      const originPt = telemetry.plannedCorridor[0];
      const destPt = telemetry.plannedCorridor[telemetry.plannedCorridor.length - 1];

      // Origin Icon (Green 'A')
      const originIcon = L.divIcon({
        className: 'origin-marker',
        html: `
          <div style="
            background: #052e16;
            border: 2px solid #22c55e;
            box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
            border-radius: 6px;
            padding: 3px 6px;
            color: #4ade80;
            font-size: 10px;
            font-weight: 800;
            font-family: monospace;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #22c55e;"></span>
            <span>ORIGIN: ${telemetry.originName.split(',')[0]}</span>
          </div>
        `,
        iconSize: [120, 24],
        iconAnchor: [60, 26]
      });
      const originMarker = L.marker(originPt, { icon: originIcon }).addTo(map);
      layersRef.current.markers.push(originMarker);

      // Destination Icon (Emerald 'B')
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `
          <div style="
            background: #172554;
            border: 2px solid #38bdf8;
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
            border-radius: 6px;
            padding: 3px 6px;
            color: #bae6fd;
            font-size: 10px;
            font-weight: 800;
            font-family: monospace;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #38bdf8;"></span>
            <span>DEST: ${telemetry.destinationName.split(',')[0]}</span>
          </div>
        `,
        iconSize: [130, 24],
        iconAnchor: [65, 26]
      });
      const destMarker = L.marker(destPt, { icon: destIcon }).addTo(map);
      layersRef.current.markers.push(destMarker);
    }

    // 3. RENDER DEVIATED ROUTE (RED LINE) IF OFF-CORRIDOR
    if (telemetry.isDeviated && telemetry.deviatedPath && telemetry.deviatedPath.length > 0) {
      // Glow under deviated line
      const devGlow = L.polyline(telemetry.deviatedPath, {
        color: '#dc2626',
        weight: 9,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Prominent Warning Red Line
      const devLine = L.polyline(telemetry.deviatedPath, {
        color: '#ef4444', // Warning Red
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.98,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      devLine.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px; padding: 4px 6px; color: #fca5a5;">
          <strong style="color: #ef4444;">⚠ UNAUTHORIZED ROUTE DEVIATION</strong><br/>
          <span>Deviation: +${telemetry.deviationKm.toFixed(1)} km</span><br/>
          <span>${telemetry.deviationReason || 'Unapproved off-corridor detour'}</span>
        </div>
      `, { sticky: true });

      layersRef.current.deviatedPolyline = devLine;
      telemetry.deviatedPath.forEach(pt => allPoints.push(pt));

      // Departure Junction Marker (Where truck broke off from blue corridor)
      if (telemetry.deviationJunction) {
        const junctionIcon = L.divIcon({
          className: 'junction-marker',
          html: `
            <div style="
              background: #450a0a;
              border: 2px solid #ef4444;
              border-radius: 50%;
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fca5a5;
              font-size: 11px;
              font-weight: 900;
              box-shadow: 0 0 12px #ef4444;
            ">
              ✕
            </div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        const junctionMarker = L.marker(telemetry.deviationJunction, { icon: junctionIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: monospace; font-size: 11px; color: #fff; background: #0f172a; padding: 8px; border-radius: 6px;">
              <strong style="color: #ef4444;">⚠ Route Departure Point</strong><br/>
              Vehicle diverged from approved NH-48 Blue corridor onto unapproved route.<br/>
              <span style="color: #f87171; font-weight: bold;">Excess Distance: +${telemetry.deviationKm} km</span>
            </div>
          `);
        layersRef.current.markers.push(junctionMarker);
      }
    }

    // 4. RENDER CURRENT TRUCK LOCATION MARKER (Professional Tiny Freight Truck Marker)
    const truckCoords = telemetry.currentLocation;
    allPoints.push(truckCoords);

    const isTruckDeviated = telemetry.isDeviated;
    const pulseColor = isTruckDeviated ? '#ef4444' : '#22c55e';
    const borderColor = isTruckDeviated ? '#f87171' : '#4ade80';

    const truckIcon = L.divIcon({
      className: 'live-truck-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; user-select: none; cursor: pointer;">
          <!-- Top Registration & Speed Pill -->
          <div style="
            position: relative;
            z-index: 10;
            background: rgba(6, 13, 32, 0.95);
            border: 1.5px solid ${borderColor};
            box-shadow: 0 0 12px ${pulseColor}, 0 4px 10px rgba(0,0,0,0.85);
            border-radius: 6px;
            padding: 2px 7px;
            display: flex;
            align-items: center;
            gap: 6px;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            font-family: monospace;
            white-space: nowrap;
            margin-bottom: 2px;
          ">
            <span style="color: #ffffff; font-weight: 800; font-family: 'Chakra Petch', monospace;">${activeVehicle.reg_no}</span>
            <span style="color: ${isTruckDeviated ? '#fca5a5' : '#86efac'}; font-size: 10px; font-weight: bold;">
              ⚡ ${activeVehicle.speed_kmh || 54} km/h
            </span>
            ${isTruckDeviated ? '<span style="background: #ef4444; color: #fff; font-size: 8.5px; padding: 1px 4px; border-radius: 3px; font-weight: 900;">DEVIATED</span>' : ''}
          </div>

          <!-- Professional Tiny Commercial Truck Container -->
          <div style="
            position: relative;
            z-index: 5;
            background: #071026;
            border: 1.5px solid ${borderColor};
            border-radius: 8px;
            padding: 3px 6px 2px 6px;
            box-shadow: 0 0 14px ${pulseColor}, 0 4px 12px rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Radar Wave Ring -->
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: ${pulseColor};
              opacity: 0.25;
              animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
              z-index: -1;
            "></div>

            <!-- Authentic Commercial Freight Truck SVG (Prime Mover & Trailer) -->
            <svg width="44" height="22" viewBox="0 0 54 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Long Cargo Container Trailer -->
              <rect x="2" y="3" width="32" height="18" rx="2" fill="#0B172E" stroke="${borderColor}" stroke-width="1.8" />
              <!-- Container Corrugations -->
              <line x1="8" y1="4" x2="8" y2="20" stroke="${borderColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <line x1="14" y1="4" x2="14" y2="20" stroke="${borderColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <line x1="20" y1="4" x2="20" y2="20" stroke="${borderColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <line x1="26" y1="4" x2="26" y2="20" stroke="${borderColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <!-- Tractor Cab Body -->
              <path d="M34 11 L40 4 L47 4 L51 12 L51 21 L34 21 Z" fill="#152648" stroke="${borderColor}" stroke-width="1.8" />
              <!-- Aerodynamic Roof Fairing -->
              <path d="M36 7 L41 3 L47 3 L47 4 L36 7 Z" fill="${borderColor}" fill-opacity="0.7" />
              <!-- Windshield Glass with Tint Reflection -->
              <path d="M40.5 5.5 L46 5.5 L49 12 L40.5 12 Z" fill="#38BDF8" fill-opacity="0.85" />
              <!-- Driver Cabin Window -->
              <rect x="36" y="7" width="3.5" height="5" rx="0.5" fill="#38BDF8" fill-opacity="0.7" />
              <!-- Forward Headlamp Beam -->
              <polygon points="51,16 54,15 54,19 51,18" fill="#FDE047" />
              <!-- Dual Rear Axle Wheels -->
              <circle cx="8" cy="22" r="3.5" fill="#020617" stroke="#94A3B8" stroke-width="1.5" />
              <circle cx="8" cy="22" r="1.5" fill="${pulseColor}" />
              <circle cx="16" cy="22" r="3.5" fill="#020617" stroke="#94A3B8" stroke-width="1.5" />
              <circle cx="16" cy="22" r="1.5" fill="${pulseColor}" />
              <!-- Front Steer Wheel -->
              <circle cx="43" cy="22" r="3.5" fill="#020617" stroke="#94A3B8" stroke-width="1.5" />
              <circle cx="43" cy="22" r="1.5" fill="${pulseColor}" />
            </svg>
          </div>

          <!-- Bottom Pin Pointer -->
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid ${borderColor};
            margin-top: -1px;
            z-index: 4;
          "></div>
        </div>
      `,
      iconSize: [140, 58],
      iconAnchor: [70, 56]
    });

    const truckMarker = L.marker(truckCoords, { icon: truckIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #f1f5f9; background: #070D1D; padding: 10px; border-radius: 8px; min-width: 220px; border: 1px solid #1e293b;">
          <div style="font-size: 13px; font-weight: bold; color: ${isTruckDeviated ? '#ef4444' : '#38bdf8'}; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
            <span>${activeVehicle.reg_no}</span>
            <span style="font-size: 10px; background: ${isTruckDeviated ? '#7f1d1d' : '#064e3b'}; padding: 2px 6px; border-radius: 4px; color: #fff;">
              ${isTruckDeviated ? 'ROUTE DEVIATED' : 'ON SCHEDULE'}
            </span>
          </div>
          <div style="color: #94a3b8; font-size: 10.5px; margin-bottom: 6px;">${activeVehicle.model || 'Commercial Haulier'}</div>
          <div style="border-top: 1px solid #1e293b; padding-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div><span style="color: #64748b;">Driver:</span> <b>${activeVehicle.driver_name || 'Assigned'}</b></div>
            <div><span style="color: #64748b;">Speed:</span> <b>${activeVehicle.speed_kmh || 54} km/h</b></div>
            <div><span style="color: #64748b;">Fuel:</span> <b>${activeVehicle.current_fuel_liters || 145} L</b></div>
            <div><span style="color: #64748b;">CPH:</span> <b>${activeVehicle.current_cph || 17.2} L/h</b></div>
          </div>
          <div style="margin-top: 6px; padding: 4px; border-radius: 4px; background: ${isTruckDeviated ? '#450a0a' : '#022c22'}; color: ${isTruckDeviated ? '#fca5a5' : '#6ee7b7'}; text-align: center; font-weight: bold;">
            ${isTruckDeviated 
              ? `⚠ Detour: +${telemetry.deviationKm} km off-corridor` 
              : `✓ Following Approved Blue Corridor`}
          </div>
        </div>
      `);

    layersRef.current.markers.push(truckMarker);

    // Auto-fit map bounds to encompass the entire route and truck location
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }

    // Invalidate size after modal render transitions
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [telemetry, mapProvider]);

  // Center on Truck Location
  const handleCenterTruck = () => {
    if (mapInstanceRef.current && telemetry?.currentLocation) {
      mapInstanceRef.current.setView(telemetry.currentLocation, 12, { animate: true });
    }
  };

  // Fit Entire Route Corridor
  const handleFitRoute = () => {
    if (mapInstanceRef.current && telemetry?.plannedCorridor) {
      const all = [...telemetry.plannedCorridor, ...(telemetry.deviatedPath || []), telemetry.currentLocation];
      mapInstanceRef.current.fitBounds(L.latLngBounds(all), { padding: [50, 50], animate: true });
    }
  };

  if (!activeVehicle || !telemetry) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#070D1E] border border-cyan-500/40 rounded-2xl w-full max-w-6xl h-[92vh] max-h-[880px] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Top Bar */}
        <div className="px-4 py-3 bg-[#0A1633] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-md">
              <Navigation size={18} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Vehicle Selector Dropdown if multiple registered vehicles */}
                {vehicles && vehicles.length > 1 ? (
                  <select
                    value={activeVehicle.id || activeVehicle.vehicle_id}
                    onChange={(e) => {
                      const found = vehicles.find(v => (v.id || v.vehicle_id) === e.target.value);
                      if (found) setActiveVehicle(found);
                    }}
                    className="bg-[#050C20] border border-cyan-500/70 focus:border-cyan-400 rounded-lg px-2.5 py-1 text-sm font-['Chakra_Petch'] font-bold text-white shadow-inner focus:outline-none"
                    title="Switch to inspect Planned Route for any registered fleet vehicle"
                  >
                    {vehicles.map(v => {
                      const vid = v.id || v.vehicle_id;
                      return (
                        <option key={vid} value={vid}>
                          {v.reg_no} ({vid}) — {v.model}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <span className="font-['Chakra_Petch'] font-bold text-white text-base tracking-wide">
                    {activeVehicle.reg_no}
                  </span>
                )}

                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                  {activeVehicle.model}
                </span>

                {telemetry.isDeviated ? (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold font-mono bg-rose-950/90 border border-rose-500 text-rose-300 flex items-center gap-1.5 shadow-sm animate-pulse">
                    <AlertTriangle size={12} className="text-rose-400" />
                    <span>ROUTE DEVIATED (+{telemetry.deviationKm} km)</span>
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold font-mono bg-emerald-950/90 border border-emerald-500 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span>ON APPROVED BLUE CORRIDOR</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
                <span className="text-cyan-300 font-semibold">{telemetry.routeName}</span>
                <span>•</span>
                <span>{telemetry.corridorName}</span>
              </p>
            </div>
          </div>

          {/* Controls & Close */}
          <div className="flex items-center space-x-2">
            {/* Quick Assign / Edit Planned Route Button */}
            {onAssignRoute && (
              <button
                onClick={() => onAssignRoute(activeVehicle)}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white font-mono font-bold text-[11px] flex items-center gap-1.5 shadow-md border border-cyan-400/40 transition transform hover:scale-[1.02]"
                title="Open Planned Route Assignment form for this vehicle"
              >
                <Route size={13} />
                <span className="hidden sm:inline">Assign Route</span>
              </button>
            )}

            {/* Tile Layer Provider Selector */}
            <div className="flex items-center bg-[#070F26] border border-slate-700 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setMapProvider('dark')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${mapProvider === 'dark' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                title="High-Tech Dark Mode (Clean Free OSM)"
              >
                Dark Map
              </button>
              <button
                onClick={() => setMapProvider('osm')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${mapProvider === 'osm' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                title="OpenStreetMap Standard Color Tiles"
              >
                OSM Free
              </button>
              <button
                onClick={() => setMapProvider('satellite')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${mapProvider === 'satellite' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                title="Esri Public Satellite Imagery"
              >
                Satellite
              </button>
            </div>

            {/* Deviation Demonstration Toggle (Test with / without deviation) */}
            <button
              onClick={() => setForceDeviationMode(prev => prev === true ? false : true)}
              className={`px-2.5 py-1 rounded border text-[11px] font-mono font-bold transition flex items-center gap-1.5 ${
                telemetry.isDeviated 
                  ? 'bg-rose-950/80 border-rose-600 text-rose-300 hover:bg-rose-900' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle to view corridor in on-route vs deviated state"
            >
              <span>{telemetry.isDeviated ? 'Showing Deviated Path (Red)' : 'Simulate Deviation (Red)'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 transition"
              title="Close Route Map"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Telemetry Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-4 py-2.5 bg-[#060D1E] border-b border-slate-800/80 text-xs font-mono shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Origin Hub</span>
            <span className="font-bold text-emerald-400 truncate" title={telemetry.originName}>
              📍 {telemetry.originName}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Destination Terminal</span>
            <span className="font-bold text-sky-400 truncate" title={telemetry.destinationName}>
              🏁 {telemetry.destinationName}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Live Speed & Status</span>
            <span className="font-bold text-slate-200">
              ⚡ {activeVehicle?.speed_kmh || activeVehicle?.speed || 54} km/h • <span className="text-cyan-300">{activeVehicle?.status || 'RUNNING'}</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Corridor Distance</span>
            <span className="font-bold text-slate-200">
              🛣 ~{telemetry.totalDistanceKm} km Corridor
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase">Corridor Deviation</span>
            <span className={`font-bold ${telemetry.isDeviated ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              {telemetry.isDeviated 
                ? `⚠ +${telemetry.deviationKm} km (Off-Corridor Detour)` 
                : '✓ 0.0 km (Within Corridor Tolerance)'}
            </span>
          </div>
        </div>

        {/* Map Container Area */}
        <div className="flex-1 relative bg-[#040814] overflow-hidden">
          {/* Leaflet Map Div */}
          <div 
            ref={mapContainerRef} 
            className={`w-full h-full ${mapProvider === 'dark' ? 'leaflet-dark-mode' : ''}`} 
          />

          {/* Interactive Floating Legend (Top-Left) */}
          <div className="absolute top-3 left-3 z-[1000] bg-[#070F26]/95 backdrop-blur-md border border-cyan-700/50 rounded-xl p-3 shadow-2xl max-w-xs text-xs font-mono">
            <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-2 font-['Chakra_Petch'] flex items-center justify-between">
              <span>Route Corridor Legend</span>
              <Layers size={13} className="text-cyan-400" />
            </div>

            {/* Planned Route (Blue Line) */}
            <div className="flex items-center space-x-2.5 py-1">
              <div className="w-6 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#2563eb]"></div>
              <div className="flex-1">
                <span className="font-bold text-blue-400">Planned Route</span>
                <span className="text-[10px] text-slate-400 block">Approved highway freight corridor</span>
              </div>
            </div>

            {/* Deviated Route (Red Line) */}
            {telemetry.isDeviated && (
              <div className="flex items-center space-x-2.5 py-1 border-t border-slate-800/80 mt-1 pt-1">
                <div className="w-6 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444] border-dashed"></div>
                <div className="flex-1">
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <span>Deviated Route</span>
                    <span className="text-[9px] bg-rose-950 px-1 py-0.2 rounded border border-rose-700 text-rose-300">
                      +{telemetry.deviationKm} km
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400 block">Unapproved detour branching off corridor</span>
                </div>
              </div>
            )}

            {/* Live Truck Marker */}
            <div className="flex items-center space-x-2.5 py-1 border-t border-slate-800/80 mt-1 pt-1">
              <div className="w-7 h-5 rounded-md bg-[#071026] border border-emerald-400 flex items-center justify-center p-0.5 shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.7)]">
                <Truck size={13} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <span className="font-bold text-slate-200">Current Truck Location</span>
                <span className="text-[10px] text-slate-400 block">Live GPS Telemetry ({telemetry.currentLocation[0].toFixed(4)}°N, {telemetry.currentLocation[1].toFixed(4)}°E)</span>
              </div>
            </div>
          </div>

          {/* Floating Map Action Buttons (Bottom-Right) */}
          <div className="absolute bottom-4 right-4 z-[1000] flex items-center space-x-2">
            <button
              onClick={handleCenterTruck}
              className="px-3 py-1.5 rounded-lg bg-[#070F26]/90 hover:bg-[#0C1D4A] border border-cyan-600/70 text-cyan-300 text-xs font-mono font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 transition"
              title="Center map on live truck marker"
            >
              <Truck size={13} className="text-cyan-400" />
              <span>Center on Truck</span>
            </button>
            <button
              onClick={handleFitRoute}
              className="px-3 py-1.5 rounded-lg bg-[#070F26]/90 hover:bg-[#0C1D4A] border border-cyan-600/70 text-cyan-300 text-xs font-mono font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 transition"
              title="Fit entire route corridor and deviation"
            >
              <Maximize2 size={13} className="text-cyan-400" />
              <span>Fit Entire Corridor</span>
            </button>
          </div>

          {/* Deviation Alert Overlay Badge (Top-Right if Deviated) */}
          {telemetry.isDeviated && (
            <div className="absolute top-3 right-3 z-[1000] bg-rose-950/95 border-2 border-rose-500 rounded-xl p-3 shadow-2xl max-w-sm backdrop-blur-md text-xs font-mono animate-in slide-in-from-top duration-300">
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 bg-rose-900/60 rounded-lg text-rose-300 shrink-0">
                  <ShieldAlert size={16} className="text-rose-400" />
                </div>
                <div>
                  <div className="font-bold text-rose-200 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Unapproved Route Deviation Detected</span>
                  </div>
                  <p className="text-[11px] text-rose-300 mt-1">
                    Vehicle diverged from approved <b>Blue Line</b> corridor onto <b>Red Line</b> unapproved detour path.
                  </p>
                  <div className="mt-2 pt-1.5 border-t border-rose-800/80 flex items-center justify-between text-[10.5px]">
                    <span className="text-rose-400">Detour: <b>+{telemetry.deviationKm} km</b></span>
                    <span className="text-slate-400">Tolerance: <b>&le; {telemetry.allowedDeviationKm} km</b></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-[#0A1633] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Real-time GPS Telemetry Active • Leaflet OpenStreetMap Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close Map
          </button>
        </div>

      </div>
    </div>
  );
}
