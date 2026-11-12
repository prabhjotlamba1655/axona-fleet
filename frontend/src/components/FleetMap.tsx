import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { VehicleLocation, Geofence } from '../types';
import { Layers } from 'lucide-react';

interface StopPoint {
  latitude: number;
  longitude: number;
  address?: string;
  stop_duration_min?: number;
}

interface FleetMapProps {
  vehicles?: VehicleLocation[];
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicle: VehicleLocation) => void;
  geofences?: Geofence[];
  trailPoints?: { latitude: number; longitude: number; is_stop?: number; stop_duration_min?: number; speed?: number; heading?: number; address?: string }[];
  currentReplayPoint?: { latitude: number; longitude: number; speed?: number; heading?: number; address?: string };
  center?: [number, number];
  zoom?: number;
  height?: string;
}

// Open-source map tile providers
const OPEN_SOURCE_MAP_LAYERS: { [key: string]: { name: string; url: string; attribution: string; subdomains?: string[] } } = {
  osmStandard: {
    name: 'OpenStreetMap Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
  },
  cartoVoyager: {
    name: 'OpenStreetMap Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd']
  },
  cartoPositron: {
    name: 'OpenStreetMap Positron Clean Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd']
  },
  openTopo: {
    name: 'OpenTopoMap (Topographic)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    subdomains: ['a', 'b', 'c']
  }
};

export const FleetMap: React.FC<FleetMapProps> = ({
  vehicles = [],
  selectedVehicleId,
  onSelectVehicle,
  geofences = [],
  trailPoints = [],
  currentReplayPoint,
  center = [18.5204, 73.8567], // Default Pune / Western India
  zoom = 12,
  height = '500px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const replayMarkerRef = useRef<L.Marker | null>(null);
  const geofenceLayersRef = useRef<L.LayerGroup | null>(null);
  const trailLayerRef = useRef<L.Polyline | null>(null);

  const [activeLayerKey, setActiveLayerKey] = useState<string>('osmStandard');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  // Initialize Leaflet map with OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLayer = OPEN_SOURCE_MAP_LAYERS[activeLayerKey];

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false
    });

    const tileLayer = L.tileLayer(initialLayer.url, {
      attribution: initialLayer.attribution,
      subdomains: initialLayer.subdomains || ['a', 'b', 'c'],
      maxZoom: 19
    }).addTo(map);

    baseTileLayerRef.current = tileLayer;

    L.control.zoom({ position: 'topright' }).addTo(map);

    geofenceLayersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Open Source Map Tile Layer Switching
  const handleSwitchLayer = (layerKey: string) => {
    const map = mapInstanceRef.current;
    if (!map || !OPEN_SOURCE_MAP_LAYERS[layerKey]) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const newConfig = OPEN_SOURCE_MAP_LAYERS[layerKey];
    const newTileLayer = L.tileLayer(newConfig.url, {
      attribution: newConfig.attribution,
      subdomains: newConfig.subdomains || ['a', 'b', 'c'],
      maxZoom: 19
    }).addTo(map);

    baseTileLayerRef.current = newTileLayer;
    setActiveLayerKey(layerKey);
    setShowLayerMenu(false);
  };

  // Update vehicle markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;

    vehicles.forEach((veh) => {
      if (!veh.latitude || !veh.longitude) return;

      const isSelected = veh.vehicle_id === selectedVehicleId;
      const isPanic = veh.panic_status === 1;

      let colorClass = '#10B981'; // green moving
      let statusLabel = 'MOVING';
      if (isPanic) {
        colorClass = '#E11D48'; // critical red
        statusLabel = 'EMERGENCY SOS';
      } else if (veh.movement_status === 'stopped') {
        colorClass = '#EF4444'; // red stopped
        statusLabel = 'STOPPED';
      } else if (veh.movement_status === 'idle') {
        colorClass = '#F59E0B'; // amber idle
        statusLabel = 'IDLE';
      } else if (veh.movement_status === 'offline') {
        colorClass = '#64748B'; // slate offline
        statusLabel = 'OFFLINE';
      }

      const isImmobilised = veh.immobilisation_status === 'immobilised';

      // OpenStreetMap direct coordinate deep-link
      const osmDeepLink = `https://www.openstreetmap.org/?mlat=${veh.latitude}&mlon=${veh.longitude}#map=16/${veh.latitude}/${veh.longitude}`;
      const googleMapsLink = `https://maps.google.com/?q=${veh.latitude},${veh.longitude}`;

      const svgIconHtml = `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          ${isPanic ? '<div class="animate-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background: rgba(225, 29, 72, 0.4);"></div>' : ''}
          ${isSelected ? '<div style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; border: 2px dashed #0284C7; animation: spin 6s linear infinite;"></div>' : ''}
          <div style="
            width: 30px;
            height: 30px;
            border-radius: 8px;
            background: #0B1E3B;
            border: 2px solid ${colorClass};
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
          ">
            <svg style="transform: rotate(${veh.heading || 0}deg);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${colorClass}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: svgIconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 700; font-size: 13px; color: #0F172A;">${veh.registration_number}</span>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${colorClass}20; color: ${colorClass};">${statusLabel}</span>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.5;">
            <div><strong>Speed:</strong> ${veh.speed} km/h (Limit: ${veh.speed_limit} km/h)</div>
            <div><strong>Ignition:</strong> ${veh.ignition ? 'ON' : 'OFF'} | <strong>Heading:</strong> ${veh.heading}°</div>
            <div><strong>Main Power:</strong> ${veh.main_power ? 'Connected' : 'DISCONNECTED'}</div>
            ${isImmobilised ? '<div style="color: #E11D48; font-weight: 700; margin-top: 2px;">⚠️ STARTER IMMOBILISED</div>' : ''}
            <div style="margin-top: 4px; font-size: 10px; color: #64748B;">${veh.address || 'Location coordinates recorded'}</div>
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between;">
            <a href="${osmDeepLink}" target="_blank" rel="noreferrer" style="font-size: 11px; color: #0284C7; text-decoration: none; font-weight: 700; display: flex; align-items: center;">
              🗺️ Open in OpenStreetMap ↗
            </a>
            <a href="${googleMapsLink}" target="_blank" rel="noreferrer" style="font-size: 10px; color: #64748B; text-decoration: none;">
              Google Maps
            </a>
          </div>
        </div>
      `;

      if (currentMarkers[veh.vehicle_id]) {
        currentMarkers[veh.vehicle_id].setLatLng([veh.latitude, veh.longitude]);
        currentMarkers[veh.vehicle_id].setIcon(customIcon);
        currentMarkers[veh.vehicle_id].setPopupContent(popupHtml);
      } else {
        const marker = L.marker([veh.latitude, veh.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupHtml);

        marker.on('click', () => {
          if (onSelectVehicle) onSelectVehicle(veh);
        });

        currentMarkers[veh.vehicle_id] = marker;
      }
    });

    if (selectedVehicleId && currentMarkers[selectedVehicleId]) {
      const pos = currentMarkers[selectedVehicleId].getLatLng();
      map.panTo(pos, { animate: true });
    }
  }, [vehicles, selectedVehicleId]);

  // Update Geofences
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = geofenceLayersRef.current;
    if (!map || !group) return;

    group.clearLayers();

    geofences.forEach(fence => {
      if (fence.fence_type === 'circle' && fence.center_lat && fence.center_lng) {
        L.circle([fence.center_lat, fence.center_lng], {
          radius: fence.radius_meters || 1000,
          color: '#0284C7',
          fillColor: '#38BDF8',
          fillOpacity: 0.15,
          weight: 2
        }).bindPopup(`<strong>Geofence:</strong> ${fence.name}<br>Radius: ${fence.radius_meters}m`).addTo(group);
      } else if (fence.fence_type === 'polygon' && fence.coordinates_json) {
        try {
          const coords = JSON.parse(fence.coordinates_json);
          L.polygon(coords, {
            color: '#7C3AED',
            fillColor: '#A78BFA',
            fillOpacity: 0.18,
            weight: 2
          }).bindPopup(`<strong>Geofence Polygon:</strong> ${fence.name}`).addTo(group);
        } catch (e) {
          // ignore
        }
      }
    });
  }, [geofences]);

  // Update Breadcrumb Trail & Stoppage Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (trailLayerRef.current) {
      map.removeLayer(trailLayerRef.current);
      trailLayerRef.current = null;
    }

    // Clean old stop markers
    stopMarkersRef.current.forEach(m => map.removeLayer(m));
    stopMarkersRef.current = [];

    if (trailPoints.length > 1) {
      const latlngs = trailPoints.map(p => [p.latitude, p.longitude] as [number, number]);
      trailLayerRef.current = L.polyline(latlngs, {
        color: '#0284C7',
        weight: 4.5,
        opacity: 0.85
      }).addTo(map);

      // Add Start Marker (Green Flag)
      const startPt = trailPoints[0];
      const startIcon = L.divIcon({
        className: 'custom-trip-marker',
        html: `
          <div style="display:flex; align-items:center; gap:4px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
            <div style="background:#10B981; color:white; font-size:11px; font-weight:900; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2.5px solid white; box-shadow:0 0 0 1px #10B981;">
              S
            </div>
            <div style="background:#0F172A; color:white; font-size:10px; font-weight:700; padding:2px 6px; border-radius:6px; border:1px solid #334155; white-space:nowrap;">
              ORIGIN
            </div>
          </div>
        `,
        iconSize: [85, 30],
        iconAnchor: [14, 15]
      });
      const startMarker = L.marker([startPt.latitude, startPt.longitude], { icon: startIcon, zIndexOffset: 1500 })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:2px;">
            <strong style="color:#10B981;">Trip Origin (Departure):</strong><br/>
            ${startPt.address || 'Starting Logistics Bay'}<br/>
            <span style="font-size:10px; color:#64748B;">Lat: ${startPt.latitude.toFixed(4)}, Lon: ${startPt.longitude.toFixed(4)}</span>
          </div>
        `);
      stopMarkersRef.current.push(startMarker);

      // Add End Marker (Destination Flag)
      const endPt = trailPoints[trailPoints.length - 1];
      const endIcon = L.divIcon({
        className: 'custom-trip-marker',
        html: `
          <div style="display:flex; align-items:center; gap:4px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
            <div style="background:#0F172A; color:white; font-size:11px; font-weight:900; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2.5px solid white; box-shadow:0 0 0 1px #0F172A;">
              E
            </div>
            <div style="background:#0F172A; color:white; font-size:10px; font-weight:700; padding:2px 6px; border-radius:6px; border:1px solid #334155; white-space:nowrap;">
              DESTINATION
            </div>
          </div>
        `,
        iconSize: [110, 30],
        iconAnchor: [14, 15]
      });
      const endMarker = L.marker([endPt.latitude, endPt.longitude], { icon: endIcon, zIndexOffset: 1500 })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; padding:2px;">
            <strong style="color:#0F172A;">Trip Destination (Arrival):</strong><br/>
            ${endPt.address || 'Destination Gateway'}<br/>
            <span style="font-size:10px; color:#64748B;">Lat: ${endPt.latitude.toFixed(4)}, Lon: ${endPt.longitude.toFixed(4)}</span>
          </div>
        `);
      stopMarkersRef.current.push(endMarker);

      // Add Prominent Intermediate Stoppage Markers along route
      let stoppageIndex = 0;
      trailPoints.forEach((pt, idx) => {
        if (pt.is_stop && idx > 0 && idx < trailPoints.length - 1) {
          stoppageIndex++;
          const duration = pt.stop_duration_min || 8;
          const stopIcon = L.divIcon({
            className: 'custom-stop-marker',
            html: `
              <div style="display:flex; align-items:center; filter:drop-shadow(0 2px 5px rgba(220,38,38,0.45));">
                <div style="position:relative; width:30px; height:30px; background:#DC2626; color:white; font-size:11px; font-weight:900; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2.5px solid white; box-shadow:0 0 0 2px #DC2626;">
                  <span>🛑</span>
                </div>
                <div style="margin-left:-6px; padding:3px 8px 3px 10px; background:#FEF2F2; color:#991B1B; font-size:10px; font-weight:800; border-radius:0 12px 12px 0; border:1.5px solid #F87171; border-left:none; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.15);">
                  Stop #${stoppageIndex}: ${duration} min
                </div>
              </div>
            `,
            iconSize: [140, 32],
            iconAnchor: [15, 16]
          });

          const m = L.marker([pt.latitude, pt.longitude], { icon: stopIcon, zIndexOffset: 2500 })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:sans-serif; font-size:12px; padding:4px; min-width:210px;">
                <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #FCA5A5; padding-bottom:4px; margin-bottom:6px;">
                  <strong style="color:#DC2626; font-size:13px;">🛑 Vehicle Stoppage #${stoppageIndex}</strong>
                  <span style="background:#FEE2E2; color:#991B1B; font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px;">
                    ${duration} MINS
                  </span>
                </div>
                <div style="margin-bottom:4px;"><strong>Location:</strong><br/>${pt.address || 'En-route Checkpoint / Toll Bay'}</div>
                <div style="margin-bottom:4px; color:#64748B; font-size:11px;">
                  <strong>Status:</strong> Ignition OFF &bull; Speed: 0 km/h
                </div>
                <div style="margin-bottom:6px; color:#64748B; font-size:10px; font-family:monospace;">
                  Coordinates: ${pt.latitude.toFixed(5)}, ${pt.longitude.toFixed(5)}
                </div>
                <a href="https://www.openstreetmap.org/?mlat=${pt.latitude}&mlon=${pt.longitude}#map=16/${pt.latitude}/${pt.longitude}" target="_blank" rel="noreferrer" style="display:inline-block; background:#0284C7; color:white; padding:3px 7px; border-radius:4px; text-decoration:none; font-size:10px; font-weight:600;">
                  Open on OpenStreetMap &nearr;
                </a>
              </div>
            `);
          stopMarkersRef.current.push(m);
        }
      });

      map.fitBounds(trailLayerRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [trailPoints]);

  // Update Replay Animated Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentReplayPoint) {
      const replayIcon = L.divIcon({
        className: 'replay-vehicle-marker',
        html: `
          <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:38px; height:38px; border-radius:999px; background:rgba(2, 132, 199, 0.3); animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width:30px; height:30px; border-radius:8px; background:#0B1E3B; border:2px solid #0284C7; box-shadow:0 4px 8px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white;">
              <svg style="transform: rotate(${currentReplayPoint.heading || 0}deg);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      if (!replayMarkerRef.current) {
        replayMarkerRef.current = L.marker([currentReplayPoint.latitude, currentReplayPoint.longitude], { icon: replayIcon }).addTo(map);
      } else {
        replayMarkerRef.current.setLatLng([currentReplayPoint.latitude, currentReplayPoint.longitude]);
        replayMarkerRef.current.setIcon(replayIcon);
      }
    } else if (replayMarkerRef.current) {
      map.removeLayer(replayMarkerRef.current);
      replayMarkerRef.current = null;
    }
  }, [currentReplayPoint]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Open Source Map Layer Switcher Floating Button (Top Left) */}
      <div className="absolute top-3 left-3 z-[1000]">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-xs hover:bg-white text-slate-800 rounded-lg shadow-md border border-slate-200 text-xs font-semibold transition"
          >
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Map: {OPEN_SOURCE_MAP_LAYERS[activeLayerKey]?.name.split(' ')[0]}</span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-10 left-0 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-[1001] text-xs">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Open Source Map Providers
              </div>
              {Object.entries(OPEN_SOURCE_MAP_LAYERS).map(([k, cfg]) => (
                <button
                  key={k}
                  onClick={() => handleSwitchLayer(k)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition ${
                    activeLayerKey === k ? 'bg-sky-50 text-sky-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{cfg.name}</span>
                  {activeLayerKey === k && <span className="text-sky-600 text-[11px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Open Source OpenStreetMap Attribution Badge (Bottom Left) */}
      <div className="absolute bottom-1 left-2 z-[999] pointer-events-none">
        <span className="text-[10px] text-slate-600/90 bg-white/85 backdrop-blur-xs px-2 py-0.5 rounded shadow-xs font-mono">
          Map data: OpenStreetMap (OSM)
        </span>
      </div>
    </div>
  );
};

export default FleetMap;
