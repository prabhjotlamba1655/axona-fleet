import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, PauseCircle, PlayCircle, ArrowRightLeft, Milestone, Clock, ShieldAlert, CheckCircle2, AlertTriangle, Navigation, 
  User, Check, RefreshCw, Maximize2, Minimize2, ThermometerSnowflake, 
  Weight, Activity, Bell, Filter, Search, Layers, Compass,
  Truck, ArrowRight, ShieldCheck, Radio, X, Route, ChevronUp, ChevronDown,
  Gauge, Zap, Timer, Save, Edit3, Crosshair, Minus, Globe
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, fetchVehicles } from '../services/api';
import { formatStandardizedAlertMessage } from '../utils/alertMessageFormatter';
import { FREE_MAP_PROVIDERS, getMapProvider, getStoredMapboxToken } from '../services/mapProviders';
import { generateTruckMarkerHtml } from './TruckMapMarker';
import MapboxModal from './MapboxModal';
import { getRouteCorridorForVehicle, KNOWN_CORRIDORS } from '../services/routeCorridorService';
import { getVehicleJourneyTimeline, getDriverIntelligence } from '../services/vehicleJourneyService';

// Major Logistics Hub Geofence Zones across India
const LOGISTICS_HUB_GEOFENCES = [
  { id: 'HUB-DEL', name: 'Kundli Cold Logistics Hub, Delhi', coords: [28.8700, 77.1200], radiusMeters: 25000, type: 'HUB' },
  { id: 'HUB-BOM', name: 'JNPT Port Logistics Terminal, Navi Mumbai', coords: [18.9499, 72.9515], radiusMeters: 20000, type: 'PORT' },
  { id: 'HUB-AMD', name: 'Sanand Agro Freight Hub, Ahmedabad', coords: [22.9868, 72.3798], radiusMeters: 20000, type: 'HUB' },
  { id: 'HUB-BLR', name: 'Peenya Industrial Logistics Hub, Bengaluru', coords: [13.0285, 77.5197], radiusMeters: 22000, type: 'HUB' },
  { id: 'HUB-MAA', name: 'Sriperumbudur Auto Terminal, Chennai', coords: [12.9675, 79.9408], radiusMeters: 20000, type: 'HUB' },
  { id: 'HUB-PUN', name: 'Chakan Auto SEZ, Pune', coords: [18.7523, 73.8567], radiusMeters: 18000, type: 'SEZ' },
  { id: 'HUB-NAG', name: 'MIHAN SEZ Super Cargo Hub, Nagpur', coords: [21.0594, 79.0381], radiusMeters: 28000, type: 'SEZ' },
  { id: 'HUB-VJA', name: 'Auto Nagar Logistics Park, Vijayawada', coords: [16.4950, 80.6650], radiusMeters: 18000, type: 'HUB' },
  { id: 'HUB-LKO', name: 'Transport Nagar Hub, Lucknow', coords: [26.7780, 80.8920], radiusMeters: 20000, type: 'HUB' },
  { id: 'HUB-CCU', name: 'Dankuni Logistics Park, Kolkata', coords: [22.6840, 88.2980], radiusMeters: 22000, type: 'PORT' },
  { id: 'HUB-JAI', name: 'VKIA Industrial Hub, Jaipur', coords: [26.9850, 75.7720], radiusMeters: 18000, type: 'HUB' }
];

export default function Screen2LiveMapTracking({ isExpanded = false, onToggleExpand }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Layer Groups
  const layersRef = useRef({
    vehicleMarkers: {},
    geofenceCircles: [],
    breachPerimeters: [],
    plannedCorridorPolyline: null,
    plannedCorridorGlow: null,
    deviatedPolyline: null,
    routeWaypoints: [],
    todayRoutePolyline: null,
    todayRouteGlow: null,
    todayStoppageMarkers: [],
    selectedPulseCircle: null
  });

  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedCorridorData, setSelectedCorridorData] = useState(null);
  const [journeyTimeline, setJourneyTimeline] = useState(null);
  const [driverIntelligence, setDriverIntelligence] = useState(null);
  const [activeVehicleTab, setActiveVehicleTab] = useState('intelligence'); // 'intelligence' | 'timeline'
  const [showTimelineDrawer, setShowTimelineDrawer] = useState(true); // Route Details Box (Since 00.00 hrs today) - Open by default
  const [drawerSide, setDrawerSide] = useState('right'); // 'right' | 'left'
  const [consoleMinimized, setConsoleMinimized] = useState(false); // Minimize/Expand 8-Box NOC Cockpit
  const [customRouteInputs, setCustomRouteInputs] = useState({ start: '', end: '' });
  const [routeUpdateSuccess, setRouteUpdateSuccess] = useState(false);
  
  // Filters & Controls
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, WORKING, IDLE, STOPPED, BREACHED
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [showGeofences, setShowGeofences] = useState(true);
  const [mapProvider, setMapProvider] = useState(() => {
    const tok = getStoredMapboxToken();
    return tok ? 'mapbox_nav' : 'dark';
  });
  const [mapboxModalOpen, setMapboxModalOpen] = useState(false);
  const [mapboxToken, setMapboxToken] = useState(() => getStoredMapboxToken());
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setVehicleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load Data
  const refreshData = async () => {
    try {
      const [vList, aList] = await Promise.all([fetchVehicles(), fetchAlerts()]);
      
      // Normalize statuses for exact Working, Idle, Stopped mapping
      const normalized = (vList || []).map(v => {
        let normalizedStatus = v.status || 'RUNNING';
        const isBreached = (v.deviation_km || 0) > (v.route_deviation_allowed_km || 40) || (v.reg_no && v.reg_no.includes('DL-01-AX-9021'));
        if (v.status === 'STOPPED' || (v.speed_kmh === 0 && (v.fuel_flow_rate_lph || 0) <= 1.2)) {
          normalizedStatus = 'STOPPED';
        } else if (v.status === 'IDLE' || (v.speed_kmh === 0 && (v.fuel_flow_rate_lph || 0) > 1.2)) {
          normalizedStatus = 'IDLE';
        } else {
          normalizedStatus = 'WORKING'; // Active On-Road
        }
        return {
          ...v,
          status: normalizedStatus,
          isBreached,
          deviation_km: isBreached ? Math.max(v.deviation_km || 56.4, 56.4) : (v.deviation_km || 0)
        };
      });

      setVehicles(normalized);
      setAlerts(aList || []);

      // If already selected, refresh active vehicle reference
      if (selectedVehicle) {
        const found = normalized.find(v => (v.id === selectedVehicle.id || v.reg_no === selectedVehicle.reg_no));
        if (found) setSelectedVehicle(found);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching live fleet data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update corridor and today's 00:00 hrs journey when selectedVehicle changes
  // Popular Route Presets for Quick Corridor Assignment
  const ROUTE_PRESETS = [
    { start: 'Kundli Hub, Delhi', end: 'Bhiwandi DC, Mumbai' },
    { start: 'JNPT Port, Navi Mumbai', end: 'MIHAN Super Hub, Nagpur' },
    { start: 'Peenya Industrial, Bengaluru', end: 'Sriperumbudur Auto SEZ, Chennai' },
    { start: 'Dankuni Logistics Park, Kolkata', end: 'Fatuha Multi-Modal Hub, Patna' }
  ];

  useEffect(() => {
    if (!selectedVehicle) {
      setSelectedCorridorData(null);
      setJourneyTimeline(null);
      setDriverIntelligence(null);
      setRouteUpdateSuccess(false);
      return;
    }
    const corridor = getRouteCorridorForVehicle(selectedVehicle);
    setSelectedCorridorData(corridor);
    const journey = getVehicleJourneyTimeline(selectedVehicle);
    setJourneyTimeline(journey);
    const intel = getDriverIntelligence(selectedVehicle.id, selectedVehicle);
    setDriverIntelligence(intel);

    setCustomRouteInputs({
      start: selectedVehicle.planned_origin || journey?.origin?.name || intel?.tripMonitoring?.startLocation || '',
      end: selectedVehicle.planned_destination || intel?.tripMonitoring?.endLocation || ''
    });
    setRouteUpdateSuccess(false);

    // Pan map smoothly to selected vehicle
    const map = mapInstanceRef.current;
    if (map) {
      const pathPts = journey?.pathCoords || [];
      if (pathPts.length > 1) {
        const bounds = L.latLngBounds(pathPts);
        map.fitBounds(bounds, { padding: [60, 60] });
      } else if (selectedVehicle.current_lat && selectedVehicle.current_lng) {
        map.setView([Number(selectedVehicle.current_lat), Number(selectedVehicle.current_lng)], 9, { animate: true });
      }
    }
  }, [selectedVehicle]);

  // Handle Trip Monitoring Custom Start & End Route Update (Requirement 6)
  const handleUpdateTripRoute = (e) => {
    if (e) e.preventDefault();
    if (!customRouteInputs.start || !customRouteInputs.end) return;

    if (selectedVehicle) {
      selectedVehicle.planned_origin = customRouteInputs.start;
      selectedVehicle.planned_destination = customRouteInputs.end;
      selectedVehicle.route_name = `${customRouteInputs.start} → ${customRouteInputs.end}`;
    }

    if (journeyTimeline) {
      setJourneyTimeline(prev => ({
        ...prev,
        routeName: `${customRouteInputs.start} → ${customRouteInputs.end}`,
        origin: {
          ...prev.origin,
          name: customRouteInputs.start
        }
      }));
    }

    if (driverIntelligence) {
      setDriverIntelligence(prev => ({
        ...prev,
        tripMonitoring: {
          ...prev.tripMonitoring,
          startLocation: customRouteInputs.start,
          endLocation: customRouteInputs.end,
          tripStatus: 'ACTIVE IN-TRANSIT (UPDATED)'
        },
        routeDeviation: {
          ...prev.routeDeviation,
          designatedCorridor: `${customRouteInputs.start} → ${customRouteInputs.end}`
        }
      }));
    }

    setRouteUpdateSuccess(true);
    setTimeout(() => setRouteUpdateSuccess(false), 4000);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on India geographic center
    const map = L.map(mapContainerRef.current, {
      center: [22.5, 78.9],
      zoom: 5,
      zoomControl: true,
      attributionControl: false
    });

    // Map Provider (MapBox Official Tiles or Pro Dark Fallback)
    const provider = getMapProvider(mapProvider, mapboxToken);
    tileLayerRef.current = L.tileLayer(provider.url, provider.options).addTo(map);

    mapInstanceRef.current = map;

    const resize = () => map.invalidateSize();
    setTimeout(resize, 100);
    setTimeout(resize, 350);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Map Provider & MapBox Token Switcher
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const provider = getMapProvider(mapProvider, mapboxToken);
    tileLayerRef.current = L.tileLayer(provider.url, provider.options).addTo(map);
    map.invalidateSize();
  }, [mapProvider, mapboxToken]);

  // Draw Geofence Perimeters (Hubs & Breach Zones)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing geofences
    layersRef.current.geofenceCircles.forEach(c => map.removeLayer(c));
    layersRef.current.geofenceCircles = [];
    layersRef.current.breachPerimeters.forEach(p => map.removeLayer(p));
    layersRef.current.breachPerimeters = [];

    if (!showGeofences) return;

    // 1. Draw Normal Authorized Logistics Hub Geofence Circles
    LOGISTICS_HUB_GEOFENCES.forEach(hub => {
      const circle = L.circle(hub.coords, {
        radius: hub.radiusMeters,
        color: '#06B6D4',
        weight: 1.5,
        dashArray: '5, 8',
        fillColor: '#0891B2',
        fillOpacity: 0.07
      }).addTo(map);

      circle.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px; padding: 3px 6px;">
          <b style="color: #22D3EE;">🛡 GEOFENCE PERIMETER:</b> ${hub.name}<br/>
          <span style="color: #94A3B8;">Type: ${hub.type} • Authorized Radius: ${(hub.radiusMeters/1000).toFixed(0)} km</span>
        </div>
      `, { sticky: true });

      layersRef.current.geofenceCircles.push(circle);
    });

    // 2. Draw Geofence Breach Perimeters for Breached Vehicles!
    vehicles.filter(v => v.isBreached).forEach(v => {
      const curLoc = [Number(v.current_lat || 28.0304), Number(v.current_lng || 76.8747)];
      const allowedRadiusMeters = (v.route_deviation_allowed_km || 40) * 1000;

      // Authorized baseline corridor perimeter ring
      const corridorExitLoc = [27.3800, 75.9600]; // Shahpura Corridor exit point

      const breachCircle = L.circle(corridorExitLoc, {
        radius: allowedRadiusMeters,
        color: '#EF4444',
        weight: 2,
        dashArray: '6, 6',
        fillColor: '#991B1B',
        fillOpacity: 0.12
      }).addTo(map);

      // Warning marker at the breach zone
      const breachPulseMarker = L.circleMarker(curLoc, {
        radius: 22,
        color: '#FF0055',
        weight: 3,
        dashArray: '4, 4',
        fillColor: '#FF0055',
        fillOpacity: 0.25
      }).addTo(map);

      breachCircle.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px; padding: 4px 8px; background: #26050C; border: 1px solid #EF4444; border-radius: 6px; color: #fff;">
          <b style="color: #F87171;">⚠️ GEOFENCE PERIMETER BREACH</b><br/>
          <span>Vehicle: <b>${v.reg_no}</b></span><br/>
          <span style="color: #FCA5A5;">Allowed Perimeter: ≤ ${(allowedRadiusMeters/1000).toFixed(0)} km</span><br/>
          <span style="color: #FF4D4D; font-weight: bold;">Current Breach: +${v.deviation_km} km outside perimeter</span>
        </div>
      `, { permanent: false, sticky: true });

      layersRef.current.breachPerimeters.push(breachCircle, breachPulseMarker);
    });

  }, [showGeofences, vehicles]);

  // Draw Vehicle Markers, Selected Radar Pulse, and 00:00 hrs Route with >15m Stoppages
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || vehicles.length === 0) return;

    // Filter vehicles by search & status
    const displayedVehicles = vehicles.filter(v => {
      if (statusFilter === 'WORKING' && v.status !== 'WORKING') return false;
      if (statusFilter === 'IDLE' && v.status !== 'IDLE') return false;
      if (statusFilter === 'STOPPED' && v.status !== 'STOPPED') return false;
      if (statusFilter === 'BREACHED' && !v.isBreached) return false;

      if (searchQuery.trim() && !selectedVehicle) {
        const q = searchQuery.toLowerCase();
        const matchReg = (v.reg_no || '').toLowerCase().includes(q);
        const matchId = (v.id || '').toLowerCase().includes(q);
        const matchModel = (v.model || '').toLowerCase().includes(q);
        const matchRoute = (v.route_name || '').toLowerCase().includes(q);
        return matchReg || matchId || matchModel || matchRoute;
      }
      return true;
    });

    // Remove old vehicle markers
    Object.values(layersRef.current.vehicleMarkers).forEach(m => map.removeLayer(m));
    layersRef.current.vehicleMarkers = {};

    // Remove old selected pulse circle
    if (layersRef.current.selectedPulseCircle) {
      map.removeLayer(layersRef.current.selectedPulseCircle);
      layersRef.current.selectedPulseCircle = null;
    }

    displayedVehicles.forEach(v => {
      const isSelected = selectedVehicle && (selectedVehicle.id === v.id || selectedVehicle.reg_no === v.reg_no);

      const customIcon = L.divIcon({
        className: isSelected ? 'selected-truck-leaflet-marker' : 'pro-truck-leaflet-marker',
        html: generateTruckMarkerHtml(v, isSelected),
        iconSize: isSelected ? [180, 44] : [160, 38],
        iconAnchor: isSelected ? [90, 44] : [80, 38]
      });

      const marker = L.marker([Number(v.current_lat || 22.5), Number(v.current_lng || 78.5)], { 
        icon: customIcon,
        zIndexOffset: isSelected ? 3000 : 100
      })
        .addTo(map)
        .on('click', () => {
          setSelectedVehicle(v);
          setSearchQuery(v.reg_no);
          setLeftPanelCollapsed(false);
          setConsoleMinimized(false);
          setShowTimelineDrawer(true);
        });

      layersRef.current.vehicleMarkers[v.id || v.reg_no] = marker;
    });

    // If a vehicle is selected, add animated radar pulse beacon marking object around vehicle position
    if (selectedVehicle) {
      const curLat = Number(selectedVehicle.current_lat || 22.5);
      const curLng = Number(selectedVehicle.current_lng || 78.5);

      const pulseIcon = L.divIcon({
        className: 'selected-radar-pulse-container',
        html: `
          <div style="position: relative; width: 80px; height: 80px; transform: translate(-50%, -50%); pointer-events: none;">
            <div class="radar-pulse-beacon" style="position: absolute; inset: 0; border-radius: 50%; border: 3px solid ${selectedVehicle.isBreached ? '#EF4444' : '#00F0FF'}; background: ${selectedVehicle.isBreached ? 'rgba(239,68,68,0.25)' : 'rgba(0,240,255,0.25)'};"></div>
            <div style="position: absolute; inset: 24px; border-radius: 50%; border: 2px solid #fff; background: ${selectedVehicle.isBreached ? '#FF0055' : '#00E676'}; box-shadow: 0 0 16px ${selectedVehicle.isBreached ? '#FF0055' : '#00E676'};"></div>
          </div>
        `,
        iconSize: [80, 80],
        iconAnchor: [40, 40]
      });

      const pulseMarker = L.marker([curLat, curLng], { icon: pulseIcon, zIndexOffset: 2000 }).addTo(map);
      layersRef.current.selectedPulseCircle = pulseMarker;
    }

    // Clear old route corridor polylines and waypoints
    if (layersRef.current.plannedCorridorPolyline) {
      map.removeLayer(layersRef.current.plannedCorridorPolyline);
      layersRef.current.plannedCorridorPolyline = null;
    }
    if (layersRef.current.plannedCorridorGlow) {
      map.removeLayer(layersRef.current.plannedCorridorGlow);
      layersRef.current.plannedCorridorGlow = null;
    }
    if (layersRef.current.deviatedPolyline) {
      map.removeLayer(layersRef.current.deviatedPolyline);
      layersRef.current.deviatedPolyline = null;
    }
    layersRef.current.routeWaypoints.forEach(w => map.removeLayer(w));
    layersRef.current.routeWaypoints = [];

    // Clear old today's route polylines and stoppage markers
    if (layersRef.current.todayRoutePolyline) {
      map.removeLayer(layersRef.current.todayRoutePolyline);
      layersRef.current.todayRoutePolyline = null;
    }
    if (layersRef.current.todayRouteGlow) {
      map.removeLayer(layersRef.current.todayRouteGlow);
      layersRef.current.todayRouteGlow = null;
    }
    layersRef.current.todayStoppageMarkers.forEach(m => map.removeLayer(m));
    layersRef.current.todayStoppageMarkers = [];

    // If a vehicle is selected, draw its 00:00 hrs Route Polyline and >15 min Stoppage Pins (Requirement 3)
    if (selectedVehicle && journeyTimeline) {
      const pathPts = journeyTimeline.pathCoords || [];

      if (pathPts.length > 1) {
        // Glowing Polyline underlay
        layersRef.current.todayRouteGlow = L.polyline(pathPts, {
          color: '#0284C7',
          weight: 8,
          opacity: 0.45,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // Solid Bright Route Line (00:00 hrs to Live Location)
        layersRef.current.todayRoutePolyline = L.polyline(pathPts, {
          color: '#00F0FF', // Bright Cyan / Neon Blue Route
          weight: 4,
          opacity: 0.95
        }).addTo(map);
      }

      // 1. Origin Marker (00:00 hrs Start Point)
      if (journeyTimeline.origin) {
        const originIcon = L.divIcon({
          className: 'journey-origin-pin',
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 5px;
              background: #022c22;
              border: 2px solid #10B981;
              border-radius: 8px;
              padding: 2px 8px;
              color: #6EE7B7;
              font-family: monospace;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              box-shadow: 0 0 12px rgba(16, 185, 129, 0.7);
              transform: translate(-50%, -50%);
            ">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #10B981; box-shadow: 0 0 6px #10B981;"></span>
              <span>00:00 hrs Origin</span>
            </div>
          `,
          iconSize: [120, 24],
          iconAnchor: [60, 12]
        });

        const oMarker = L.marker(journeyTimeline.origin.coords, { icon: originIcon })
          .addTo(map)
          .bindTooltip(`
            <div style="font-family: monospace; font-size: 11px; padding: 4px 6px;">
              <b style="color: #10B981;">🟢 TRIP ORIGIN (00:00 hrs Midnight):</b><br/>
              <span><b>${journeyTimeline.origin.name}</b></span><br/>
              <span style="color: #94A3B8;">Departure: ${journeyTimeline.origin.time}</span><br/>
              <span style="color: #6EE7B7;">${journeyTimeline.origin.notes || ''}</span>
            </div>
          `, { sticky: true });

        layersRef.current.todayStoppageMarkers.push(oMarker);
      }

      // 2. Intermediate Stoppage Pins (> 15 mins)
      if (journeyTimeline.stoppages && journeyTimeline.stoppages.length > 0) {
        journeyTimeline.stoppages.forEach(s => {
          const stopIcon = L.divIcon({
            className: 'journey-stoppage-pin',
            html: `
              <div style="
                display: flex;
                align-items: center;
                gap: 5px;
                background: #241103;
                border: 2px solid #F59E0B;
                border-radius: 8px;
                padding: 2px 7px;
                color: #FDE68A;
                font-family: monospace;
                font-size: 10px;
                font-weight: 800;
                white-space: nowrap;
                box-shadow: 0 0 12px rgba(245, 158, 11, 0.85);
                transform: translate(-50%, -50%);
                cursor: pointer;
              ">
                <span style="background: #F59E0B; color: #000; border-radius: 3px; padding: 0 3px; font-weight: 900; font-size: 8.5px;">
                  ⏸ Stopped
                </span>
                <span>${s.durationMins}m (${s.startTime})</span>
              </div>
            `,
            iconSize: [130, 24],
            iconAnchor: [65, 12]
          });

          const sMarker = L.marker(s.coords, { icon: stopIcon })
            .addTo(map)
            .bindTooltip(`
              <div style="font-family: monospace; font-size: 11px; padding: 4px 6px;">
                <b style="color: #F59E0B;">⏸ STOPPAGE:</b><br/>
                <span><b>${s.name}</b></span><br/>
                <span style="color: #94A3B8;">Time: ${s.startTime} - ${s.endTime}</span><br/>
                <span style="color: #FBBF24; font-weight: bold;">Duration: ${s.durationMins} mins stopped</span><br/>
                <span style="color: #E2E8F0;">Activity: ${s.reason}</span>
              </div>
            `, { sticky: true });

          layersRef.current.todayStoppageMarkers.push(sMarker);
        });
      }

      // If vehicle has an unauthorized detour path, draw red line
      if (selectedCorridorData && selectedCorridorData.isDeviated && selectedCorridorData.deviatedPath?.length > 1) {
        layersRef.current.deviatedPolyline = L.polyline(selectedCorridorData.deviatedPath, {
          color: '#EF4444',
          weight: 4,
          dashArray: '6, 6',
          opacity: 0.95
        }).addTo(map);
      }
    }

  }, [vehicles, statusFilter, searchQuery, selectedVehicle, selectedCorridorData, journeyTimeline]);

  // Fit All Fleets
  const handleFitAllFleets = () => {
    const map = mapInstanceRef.current;
    if (!map || vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map(v => [v.current_lat || 22.5, v.current_lng || 78.5]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
  };

  // Focus on Selected Truck
  const handleFocusSelectedTruck = () => {
    const map = mapInstanceRef.current;
    if (!map || !selectedVehicle) return;
    map.setView([Number(selectedVehicle.current_lat), Number(selectedVehicle.current_lng)], 10, { animate: true });
  };

  // Focus 00:00 hrs Route
  const handleFitTodayRoute = () => {
    const map = mapInstanceRef.current;
    if (!map || !journeyTimeline || !journeyTimeline.pathCoords) return;
    const bounds = L.latLngBounds(journeyTimeline.pathCoords);
    map.fitBounds(bounds, { padding: [70, 70] });
  };

  // Handle Alert Acknowledge
  const handleAcknowledge = async (alertId) => {
    setAcknowledgingId(alertId);
    try {
      await acknowledgeAlert(alertId, 'NOC Controller');
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_acknowledged: 1, acknowledged_by: 'NOC Controller' } : a));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const workingCount = vehicles.filter(v => v.status === 'WORKING').length;
  const idleCount = vehicles.filter(v => v.status === 'IDLE').length;
  const stoppedCount = vehicles.filter(v => v.status === 'STOPPED').length;
  const breachedCount = vehicles.filter(v => v.isBreached).length;

  return (
    <div className="h-full w-full flex flex-col bg-[#050B17] text-slate-100 overflow-hidden select-none font-sans relative">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP FLOATING CONTROLS & SEARCH DROPDOWN (Requirement 1) */}
      {/* ------------------------------------------------------------- */}
      <div className="z-40 px-3 py-2 bg-[#070D1F]/90 backdrop-blur-md border-b border-[#1E2E56] flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-xl">
        
        {/* Left: Brand & Flightradar-style Status Pills */}
        <div className="flex items-center space-x-2 flex-wrap">
          <div className="flex items-center space-x-1.5 mr-2">
            <Radio size={16} className="text-cyan-400 animate-pulse" />
            <span className="font-['Chakra_Petch'] font-bold text-sm tracking-wider uppercase text-white">
              Live Fleet Radar
            </span>
          </div>

          {/* Quick Filter Buttons (All, Working, Idle, Stopped, Breached) */}
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSelectedVehicle(null);
                setSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 border ${
                statusFilter === 'ALL' && !selectedVehicle
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-[#09132A] text-slate-400 border-slate-700/60 hover:text-white'
              }`}
            >
              <span>ALL FLEETS</span>
              <span className="px-1.5 py-0.2 rounded bg-[#060D20] text-cyan-300 font-bold">{vehicles.length}</span>
            </button>

            <button
              onClick={() => setStatusFilter('WORKING')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 border ${
                statusFilter === 'WORKING'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-[#09132A] text-slate-400 border-slate-700/60 hover:text-emerald-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>WORKING</span>
              <span className="px-1.5 py-0.2 rounded bg-[#060D20] text-emerald-400 font-bold">{workingCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('IDLE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 border ${
                statusFilter === 'IDLE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-[#09132A] text-slate-400 border-slate-700/60 hover:text-amber-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>IDLE</span>
              <span className="px-1.5 py-0.2 rounded bg-[#060D20] text-amber-400 font-bold">{idleCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('STOPPED')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 border ${
                statusFilter === 'STOPPED'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-[#09132A] text-slate-400 border-slate-700/60 hover:text-purple-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>STOPPED</span>
              <span className="px-1.5 py-0.2 rounded bg-[#060D20] text-purple-300 font-bold">{stoppedCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('BREACHED')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 border ${
                statusFilter === 'BREACHED'
                  ? 'bg-rose-600/30 text-rose-300 border-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'bg-[#09132A] text-rose-400 border-rose-800/60 hover:bg-rose-950'
              }`}
            >
              <AlertTriangle size={12} className="text-rose-400 animate-pulse" />
              <span>GEOFENCE BREACH</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-bold border border-rose-700">{breachedCount}</span>
            </button>
          </div>
        </div>

        {/* Right: Searchable Vehicle Dropdown (Requirement 1), Geofences, Layers, Fit All */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          
          {/* --------------------------------------------------------- */}
          {/* SEARCHABLE VEHICLE DROPDOWN (Requirement 1)               */}
          {/* --------------------------------------------------------- */}
          <div className="relative z-50" ref={dropdownRef}>
            <div 
              className="flex items-center bg-[#09132A] border border-[#1E2E56] rounded-lg focus-within:border-cyan-400 transition shadow-inner cursor-pointer"
              onClick={() => setVehicleDropdownOpen(true)}
            >
              <Search size={13} className="ml-2.5 text-slate-400 shrink-0" />
              <input
                id="vehicle-search-input"
                type="text"
                placeholder="Search & Select Vehicle..."
                value={searchQuery}
                onFocus={() => setVehicleDropdownOpen(true)}
                onClick={(e) => {
                  e.stopPropagation();
                  setVehicleDropdownOpen(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVehicleDropdownOpen(true);
                }}
                className="pl-2 pr-1 py-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-xs w-44 md:w-56 cursor-text"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    setSelectedVehicle(null);
                  }} 
                  className="px-1 text-slate-400 hover:text-white"
                  title="Clear Search & Reset to All Fleets"
                >
                  <X size={13} />
                </button>
              )}
              <button
                id="vehicle-dropdown-toggle-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setVehicleDropdownOpen(prev => !prev);
                }}
                className="px-2 py-1 text-slate-400 hover:text-cyan-300 border-l border-slate-800/80 transition"
                title="Toggle Registered Vehicles List"
              >
                <ChevronDown size={13} className={`transform transition-transform ${vehicleDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
              </button>
            </div>

            {/* Dropdown Menu displaying ONLY vehicle no. */}
            {vehicleDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 sm:w-64 bg-[#070F28] border-2 border-cyan-500 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,1)] z-[9999] overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                {/* Dropdown Top Bar */}
                <div className="px-3 py-2 bg-[#0A1635] border-b border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5 font-['Chakra_Petch']">
                    <Truck size={13} />
                    <span>Select Vehicle ({vehicles.length})</span>
                  </span>
                  <span className="text-[9.5px] text-slate-400">Live Fleets</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {/* Option: View All Fleets */}
                  <div
                    onClick={() => {
                      setSelectedVehicle(null);
                      setSearchQuery('');
                      setVehicleDropdownOpen(false);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-cyan-950/50 transition flex items-center justify-between ${
                      !selectedVehicle ? 'bg-cyan-950/40 border-l-4 border-cyan-400' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06B6D4]"></span>
                      <span className="font-bold text-white text-xs">All Vehicles</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#060D20] text-cyan-300 font-bold">
                      {vehicles.length} Fleets
                    </span>
                  </div>

                  {/* Filtered Vehicles List - SHOWING ONLY VEHICLE NO. */}
                  {vehicles
                    .filter(v => {
                      if (!searchQuery.trim() || searchQuery === selectedVehicle?.reg_no) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        (v.reg_no || '').toLowerCase().includes(q) ||
                        (v.id || '').toLowerCase().includes(q)
                      );
                    })
                    .map(v => {
                      const isSel = selectedVehicle && (selectedVehicle.id === v.id || selectedVehicle.reg_no === v.reg_no);
                      let sColor = '#10B981';
                      if (v.isBreached) sColor = '#EF4444';
                      else if (v.status === 'IDLE') sColor = '#F59E0B';
                      else if (v.status === 'STOPPED') sColor = '#94A3B8';

                      return (
                        <div
                          key={v.id || v.reg_no}
                          onClick={() => {
                            setSelectedVehicle(v);
                            setSearchQuery(v.reg_no);
                            setVehicleDropdownOpen(false);
                            setConsoleMinimized(false);
                            setShowTimelineDrawer(true);
                          }}
                          className={`px-3 py-2.5 cursor-pointer hover:bg-[#0E2042] transition flex items-center justify-between ${
                            isSel ? 'bg-[#0E264E] border-l-4 border-cyan-400' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: sColor, boxShadow: `0 0 6px ${sColor}` }}
                            />
                            <span className="font-extrabold text-white text-[12.5px] tracking-wide font-['Chakra_Petch']">
                              {v.reg_no}
                            </span>
                          </div>

                          {isSel && (
                            <span className="text-cyan-400 text-xs font-bold">✓</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Geofence Perimeter Visibility Button */}
          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 border ${
              showGeofences
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle Geofence Perimeters & Breach Rings"
          >
            <ShieldCheck size={13} className={showGeofences ? 'text-cyan-400' : 'text-slate-500'} />
            <span className="hidden md:inline">Geofences</span>
          </button>

          {/* MapBox API Integration Button */}
          <button
            onClick={() => setMapboxModalOpen(true)}
            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 border text-xs ${
              Boolean(mapboxToken)
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                : 'bg-[#091530] text-slate-300 hover:text-white border-[#1E2E56] hover:border-cyan-500/50'
            }`}
            title="Configure & Link MapBox API (Access Token & Fleet Styles)"
          >
            <Globe size={13} className={Boolean(mapboxToken) ? 'text-cyan-400' : 'text-slate-400'} />
            <span className="font-['Chakra_Petch']">MapBox API</span>
            <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-mono uppercase font-black ${
              Boolean(mapboxToken)
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
            }`}>
              {Boolean(mapboxToken) ? 'LINKED' : 'SETUP'}
            </span>
          </button>

          {/* Map Layer Selector (Mapbox API & Open Source) */}
          <div className="flex items-center bg-[#09132A] p-0.5 rounded-lg border border-[#1E2E56]">
            <button
              onClick={() => {
                if (mapboxToken) {
                  setMapProvider('mapbox_nav');
                } else {
                  setMapboxModalOpen(true);
                }
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                mapProvider.startsWith('mapbox')
                  ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                  : 'text-cyan-300 hover:text-white'
              }`}
              title={mapboxToken ? 'MapBox Official Telematics Vector Tiles' : 'Click to link MapBox API token'}
            >
              <span>🌌 MapBox API</span>
              {!mapboxToken && (
                <span className="text-[8px] px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  LINK
                </span>
              )}
            </button>
            {Object.values(FREE_MAP_PROVIDERS).map(p => (
              <button
                key={p.id}
                onClick={() => setMapProvider(p.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                  mapProvider === p.id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={p.hint}
              >
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Fit All Button */}
          <button
            onClick={handleFitAllFleets}
            className="px-2.5 py-1 rounded-lg bg-[#0C1E44] hover:bg-[#122E68] text-cyan-300 border border-cyan-500/50 font-bold transition flex items-center space-x-1 shadow-sm"
            title="Fit All Vehicles in View"
          >
            <Compass size={13} />
            <span className="hidden sm:inline">Fit All</span>
          </button>

          {/* Toggle Alert Drawer Pill */}
          <button
            onClick={() => setAlertsPanelOpen(!alertsPanelOpen)}
            className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 font-bold transition flex items-center space-x-1.5 shadow-sm"
            title="View Live Alert Stream"
          >
            <Bell size={13} className="text-rose-400 animate-pulse" />
            <span>{alerts.filter(a => a.is_acknowledged === 0).length} Alerts</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN MAP VIEW WITH LEFT ROUTE COLUMN (Requirements 2 & 3)     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

        {/* ------------------------------------------------------------- */}
        {/* EXECUTIVE NOC 8-BOX DRIVER INTELLIGENCE COCKPIT (100% PURE GPS) */}
        {/* All 8 parameters visible in one shot without scrolling         */}
        {/* ------------------------------------------------------------- */}
        {selectedVehicle && journeyTimeline && driverIntelligence ? (
          <>
            {/* ============================================================= */}
            {/* VERTICAL COLUMN ROUTE DETAILS BOX (SINCE 00.00 HRS TODAY)     */}
            {/* Shows Starting point & time, Stoppage durations, Current loc   */}
            {/* ============================================================= */}
            {showTimelineDrawer ? (
              <div 
                style={{ zIndex: 1200, maxHeight: 'calc(100vh - 300px)' }}
                className={`absolute top-3 ${drawerSide === 'right' ? 'right-3' : 'left-3'} bottom-[245px] w-84 sm:w-92 bg-[#060D20]/98 backdrop-blur-2xl border-2 border-cyan-500/90 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-slate-100 font-mono text-[9.5px] pointer-events-auto animate-in fade-in duration-200`}
              >
                {/* 1. Header (WheelsEye Style) */}
                <div className="px-3 py-2 bg-gradient-to-r from-[#0A1635] via-[#0E204E] to-[#0A1635] border-b border-cyan-600/60 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-cyan-950/90 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                      <Route size={14} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                        <h3 className="font-['Chakra_Petch'] font-black text-xs uppercase tracking-wider text-white">
                          ROUTE DETAILS
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 uppercase tracking-tight shadow-xs">
                          Since 00.00 hrs today
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-300 font-sans mt-0.5">
                        {journeyTimeline.regNo} • <span className="text-cyan-400 font-semibold">{journeyTimeline.model}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Toggle Dock Side (Left / Right) */}
                    <button
                      onClick={() => setDrawerSide(prev => prev === 'left' ? 'right' : 'left')}
                      className="p-1 rounded-md hover:bg-[#122A5C] text-slate-400 hover:text-cyan-300 transition"
                      title={`Dock to ${drawerSide === 'left' ? 'Right' : 'Left'} Column`}
                    >
                      <ArrowRightLeft size={13} />
                    </button>
                    {/* Minimize Button */}
                    <button
                      onClick={() => setShowTimelineDrawer(false)}
                      className="p-1 rounded-md hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition"
                      title="Minimize Route Details Box"
                    >
                      <Minus size={13} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* 2. WheelsEye Summary Cards */}
                <div className="px-2.5 py-1.5 bg-[#030816] border-b border-slate-800 grid grid-cols-3 gap-1.5 text-center text-[8.5px] shrink-0">
                  <div className="p-1 rounded bg-[#07132B] border border-cyan-900/50">
                    <span className="text-slate-400 block text-[7.5px] uppercase font-bold tracking-wider">Distance</span>
                    <span className="text-cyan-300 font-extrabold text-[10px]">{journeyTimeline.totalDistanceKm} km</span>
                  </div>
                  <div className="p-1 rounded bg-[#07132B] border border-cyan-900/50">
                    <span className="text-slate-400 block text-[7.5px] uppercase font-bold tracking-wider">Moving Time</span>
                    <span className="text-emerald-300 font-extrabold text-[10px]">{journeyTimeline.drivingTimeFormatted || '05h 20m'}</span>
                  </div>
                  <div className="p-1 rounded bg-[#07132B] border border-cyan-900/50">
                    <span className="text-slate-400 block text-[7.5px] uppercase font-bold tracking-wider">Stoppages</span>
                    <span className="text-amber-300 font-extrabold text-[10px]">{journeyTimeline.stoppageCount} Halts ({journeyTimeline.totalStoppageMinutes}m)</span>
                  </div>
                </div>

                {/* 3. WheelsEye Clean Vertical Stepper Timeline */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="relative pl-6 space-y-3.5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-700/80">

                    {/* Step 1: Start Point */}
                    <div 
                      onClick={() => {
                        const map = mapInstanceRef.current;
                        if (map) map.setView(journeyTimeline.origin.coords, 12, { animate: true });
                      }}
                      className="relative group cursor-pointer"
                      title="Click to view Start Point on map"
                    >
                      {/* Timeline Dot */}
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#031B15] border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:scale-110 transition">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      </div>

                      {/* Content Card */}
                      <div className="p-2 rounded-lg bg-[#07191D]/90 border border-emerald-600/60 group-hover:border-emerald-400 group-hover:bg-[#0A262C] transition shadow-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            Trip Start
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[8px] font-bold">
                            {journeyTimeline.origin.time || 'Today 00:00 AM'}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-white group-hover:text-emerald-200 transition leading-snug">
                          {journeyTimeline.origin.name}
                        </div>
                        <div className="mt-1 text-[8px] text-slate-400 pt-0.5 border-t border-emerald-900/40 flex items-center justify-between">
                          <span>Fuel: {journeyTimeline.origin.fuelLiters || 420} L</span>
                          <span className="text-emerald-400 font-semibold">Start: 00.00 hrs today</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 2..N: Stoppages */}
                    {journeyTimeline.stoppages && journeyTimeline.stoppages.map((stop, sIdx) => (
                      <div 
                        key={stop.id || sIdx}
                        onClick={() => {
                          const map = mapInstanceRef.current;
                          if (map) map.setView(stop.coords, 12, { animate: true });
                        }}
                        className="relative group cursor-pointer"
                        title="Click to view Stoppage on map"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#1C1204] border-2 border-amber-400 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.5)] group-hover:scale-110 transition">
                          <PauseCircle size={11} className="text-amber-400" />
                        </div>

                        {/* Content Card */}
                        <div className="p-2 rounded-lg bg-[#191104]/90 border border-amber-600/60 group-hover:border-amber-400 group-hover:bg-[#2A1C08] transition shadow-xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-300">
                              Halt #{sIdx + 1} • <span className="text-amber-100 underline decoration-amber-500 font-black">{stop.durationMins} mins</span>
                            </span>
                            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700 font-mono font-bold">
                              {stop.startTime} – {stop.endTime}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-white group-hover:text-amber-200 transition leading-snug">
                            {stop.name}
                          </div>
                          <div className="mt-1 text-[8px] text-slate-400 pt-0.5 border-t border-amber-900/40 flex items-center justify-between">
                            <span className="text-amber-400 font-semibold">Speed: 0 km/h</span>
                            <span>Verified Halt &gt; 15m</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Step Final: Current Live Location */}
                    <div 
                      onClick={() => {
                        const map = mapInstanceRef.current;
                        if (map) map.setView(journeyTimeline.current.coords, 12, { animate: true });
                      }}
                      className="relative group cursor-pointer"
                      title="Click to center on Live Current Location"
                    >
                      {/* Timeline Dot */}
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#041D2D] border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse group-hover:scale-110 transition">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                      </div>

                      {/* Content Card */}
                      <div className="p-2 rounded-lg bg-[#04172C]/90 border border-cyan-500/80 group-hover:border-cyan-300 group-hover:bg-[#072445] transition shadow-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            Live Location
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-200 border border-cyan-600 text-[8px] font-bold">
                            ⚡ {journeyTimeline.current.speedKmh} km/h • {journeyTimeline.current.status}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-white group-hover:text-cyan-200 transition leading-snug">
                          {journeyTimeline.current.name}
                        </div>
                        <div className="mt-1 text-[8px] text-slate-400 pt-0.5 border-t border-cyan-900/50 flex items-center justify-between">
                          <span>{journeyTimeline.current.coords[0].toFixed(4)}°N, {journeyTimeline.current.coords[1].toFixed(4)}°E</span>
                          <span className="text-cyan-300 font-bold">{journeyTimeline.current.time}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Quick Action Controls */}
                <div className="p-2 bg-[#040918] border-t border-cyan-900/60 flex items-center gap-1.5 text-[9px] shrink-0">
                  <button
                    onClick={handleFitTodayRoute}
                    className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-[#0C2A5E] to-[#123E8A] hover:from-[#123E8A] hover:to-[#1853BA] text-cyan-200 font-bold border border-cyan-500/60 transition flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                    title="Fit entire today's route on map"
                  >
                    <Compass size={12} />
                    <span>Fit Route</span>
                  </button>
                  <button
                    onClick={handleFocusSelectedTruck}
                    className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-[#0A3022] to-[#104D36] hover:from-[#104D36] hover:to-[#176B4B] text-emerald-200 font-bold border border-emerald-500/60 transition flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                    title="Focus live vehicle position"
                  >
                    <Crosshair size={12} />
                    <span>Focus Live</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Minimized Floating Re-Open Button on Side */
              <button
                style={{ zIndex: 1200 }}
                onClick={() => setShowTimelineDrawer(true)}
                className={`absolute top-3 ${drawerSide === 'right' ? 'right-3' : 'left-3'} px-3 py-1.5 rounded-lg bg-[#070F26]/95 hover:bg-[#0C1E44] border-2 border-cyan-500/80 text-cyan-300 font-mono font-bold text-xs shadow-xl flex items-center space-x-2 transition cursor-pointer`}
                title="Expand Route Details Box (Since 00.00 hrs today)"
              >
                <Route size={14} className="text-cyan-400" />
                <span>Route Details (Since 00.00 hrs) ▶</span>
              </button>
            )}

            {/* DOCKED BOTTOM EXECUTIVE NOC 8-BOX CONSOLE */}
            <div className={`absolute z-30 pointer-events-auto transition-all duration-200 ${
              consoleMinimized 
                ? 'bottom-3 right-3' 
                : 'bottom-2 left-2 right-2 md:left-3 md:right-3 max-w-[1560px] mx-auto'
            }`}>
              {consoleMinimized ? (
                /* MINIMIZED FLOATING PILL (Leaves 99% of map clearly visible) */
                <div className="bg-[#070F26]/95 backdrop-blur-xl border border-cyan-500/80 rounded-xl px-3 py-1.5 flex items-center space-x-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.9)] text-xs font-mono animate-in fade-in slide-in-from-bottom-2">
                  {/* Close Window Button */}
                  <button
                    onClick={() => { setSelectedVehicle(null); setSearchQuery(''); }}
                    className="p-1 rounded-md bg-rose-950/90 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/80 transition flex items-center justify-center shrink-0 shadow-sm"
                    title="Close Window (Return to All Fleets)"
                  >
                    <X size={13} className="stroke-[2.5]" />
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-white text-xs font-['Chakra_Petch']">{journeyTimeline.regNo}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-600">⚡ {journeyTimeline.current.speedKmh} km/h</span>
                  </div>

                  {/* Expand Button to Restore Full 8-Box Dashboard */}
                  <button
                    onClick={() => setConsoleMinimized(false)}
                    className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[10px] transition flex items-center gap-1 shadow-sm"
                    title="Expand 8-Box Executive NOC Telematics View"
                  >
                    <ChevronUp size={12} />
                    <span>Expand Telematics</span>
                  </button>
                </div>
              ) : (
                /* FULL EXECUTIVE NOC 8-BOX DASHBOARD VIEW (All in one shot, zero scrolling) */
                <div className="bg-[#050C1F]/98 backdrop-blur-2xl border-2 border-cyan-500/70 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col p-2 text-slate-100 font-sans">
                  
                  {/* TOP CONSOLE HEADER BAR */}
                  <div className="pb-1.5 mb-1.5 border-b border-cyan-900/60 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono shrink-0">
                    {/* Left: Window Controls (Close & Minimize on Left Top Corner) + Vehicle Identification Details */}
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {/* Window Controls: Close & Minimize on Left Top Corner */}
                      <div className="flex items-center space-x-1 shrink-0 mr-1">
                        {/* Close Window Button (Red) */}
                        <button
                          onClick={() => { setSelectedVehicle(null); setSearchQuery(''); }}
                          className="p-1 rounded-md bg-rose-950/90 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/80 transition flex items-center justify-center shrink-0 shadow-sm group"
                          title="Close Window (Return to All Fleets)"
                        >
                          <X size={14} className="stroke-[2.5] group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Minimize Window Button (Amber) */}
                        <button
                          onClick={() => {
                            setConsoleMinimized(true);
                            setShowTimelineDrawer(false);
                          }}
                          className="p-1 rounded-md bg-amber-950/90 hover:bg-amber-900 text-amber-300 hover:text-white border border-amber-700/80 transition flex items-center justify-center shrink-0 shadow-sm group"
                          title="Minimize Window (View Full Map Clearly)"
                        >
                          <Minus size={14} className="stroke-[2.5] group-hover:scale-110 transition-transform" />
                        </button>
                      </div>

                      <div className="p-1 rounded bg-cyan-950 border border-cyan-500/70 text-cyan-400 shrink-0">
                        <Truck size={13} />
                      </div>
                      <span className="font-extrabold text-white text-[13px] font-['Chakra_Petch'] tracking-wide shrink-0">
                        {journeyTimeline.regNo}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-[#091D3E] border border-cyan-600 text-cyan-300 shrink-0">
                        {journeyTimeline.vehicleId}
                      </span>
                      <span className="text-[10.5px] text-slate-300 font-medium whitespace-nowrap hidden sm:inline shrink-0">
                        🚛 {journeyTimeline.model}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-semibold whitespace-nowrap hidden lg:inline shrink-0">
                        🛣 {journeyTimeline.routeName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-cyan-950 border border-cyan-500 text-cyan-300 shrink-0">
                        ⚡ {journeyTimeline.current.speedKmh} km/h
                      </span>
                      <div className="hidden xl:flex items-center space-x-1.5 text-[10px] text-slate-300 shrink-0">
                        <User size={11} className="text-cyan-400" />
                        <span className="font-bold text-white">{driverIntelligence.driver.name}</span>
                        <span className="text-slate-400">({driverIntelligence.driver.badge})</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                          Score: {driverIntelligence.driver.score}/100
                        </span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-[#031527] text-cyan-300 border border-cyan-700/80 tracking-wide uppercase shrink-0">
                        📡 100% Pure GPS Source
                      </span>
                    </div>

                    {/* Right: Actions (Timeline, Focus, Fit Route, Minimize) */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => setShowTimelineDrawer(prev => !prev)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 border ${
                          showTimelineDrawer
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                            : 'bg-[#091838] text-cyan-300 border-cyan-700/80 hover:bg-[#122A5C]'
                        }`}
                        title="Toggle Route Details Box (Since 00.00 hrs today)"
                      >
                        <Route size={11} />
                        <span>Route Details (00:00h)</span>
                      </button>
                      <button
                        onClick={handleFocusSelectedTruck}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0A261D] hover:bg-[#0E3529] text-emerald-300 border border-emerald-600/70 transition flex items-center gap-1"
                        title="Focus Vehicle on Map"
                      >
                        <Crosshair size={11} />
                        <span className="hidden sm:inline">Focus</span>
                      </button>
                      <button
                        onClick={handleFitTodayRoute}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0C1E44] hover:bg-[#122E68] text-cyan-300 border border-cyan-600/70 transition flex items-center gap-1"
                        title="Fit Route on Map"
                      >
                        <Compass size={11} />
                        <span className="hidden sm:inline">Fit Route</span>
                      </button>
                      <button
                        onClick={() => setConsoleMinimized(true)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                        title="Minimize Console"
                      >
                        <Minimize2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* ----------------------------------------------------------------------- */}
                  {/* 8 EXECUTIVE NOC ENGRAVED METRIC BOXES (4 COLUMNS x 2 ROWS)              */}
                  {/* All 8 parameters visible in one shot with zero scrolling                */}
                  {/* ----------------------------------------------------------------------- */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 font-mono text-[9px]">

                    {/* ================================================================= */}
                    {/* BOX 1: OVERSPEEDING (Strictly GPS Doppler Velocity)               */}
                    {/* ================================================================= */}
                    <div
                      className="p-2 rounded-lg relative overflow-hidden group shadow-md flex flex-col justify-between transition-all duration-150"
                      style={{
                        background: driverIntelligence.overspeed.isAlert 
                          ? 'linear-gradient(180deg, #3d0d18 0%, #1e050b 100%)' 
                          : 'linear-gradient(180deg, #093322 0%, #041910 100%)',
                        borderTop: driverIntelligence.overspeed.isAlert ? '1.5px solid rgba(244, 63, 94, 0.7)' : '1.5px solid rgba(52, 211, 153, 0.6)',
                        borderBottom: '3px solid rgba(0, 0, 0, 0.95)',
                        borderLeft: driverIntelligence.overspeed.isAlert ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        borderRight: driverIntelligence.overspeed.isAlert ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <div className="flex items-center space-x-1">
                          <Gauge size={12} className={driverIntelligence.overspeed.isAlert ? 'text-rose-400' : 'text-emerald-400'} />
                          <span className={driverIntelligence.overspeed.isAlert ? 'text-rose-300' : 'text-emerald-300'}>1. Overspeeding</span>
                        </div>
                        <span className={`px-1 py-0.2 rounded text-[7.5px] font-extrabold border ${
                          driverIntelligence.overspeed.isAlert
                            ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        }`}>
                          {driverIntelligence.overspeed.isAlert ? '⚠️ ALERT' : '✓ COMPLIANT'}
                        </span>
                      </div>

                      <div className="my-0.5 flex items-baseline justify-between shrink-0">
                        <span className={`text-[17px] font-extrabold font-['Chakra_Petch'] leading-none ${
                          driverIntelligence.overspeed.isAlert ? 'text-rose-400' : 'text-emerald-300'
                        }`}>
                          {driverIntelligence.overspeed.maxRecordedSpeedKmh} km/h
                        </span>
                        <span className="text-[8.5px] text-slate-400">Limit: {driverIntelligence.overspeed.speedLimitKmh} km/h</span>
                      </div>

                      <div className="text-[8px] text-slate-300 flex items-center justify-between shrink-0 border-t border-white/10 pt-0.5">
                        <span className="truncate">{driverIntelligence.overspeed.eventCount} Events ({driverIntelligence.overspeed.overspeedDurationMins}m)</span>
                        <span className="text-[7.5px] text-cyan-400 font-bold">📡 GPS Doppler</span>
                      </div>
                    </div>

                    {/* ================================================================= */}
                    {/* BOX 2: HARSH ACCELERATION (Strictly GPS Speed Delta: Δv/Δt)       */}
                    {/* ================================================================= */}
                    <div
                      className="p-2 rounded-lg relative overflow-hidden group shadow-md flex flex-col justify-between transition-all duration-150"
                      style={{
                        background: driverIntelligence.harshAcc.isAlert 
                          ? 'linear-gradient(180deg, #351c07 0%, #1a0d03 100%)' 
                          : 'linear-gradient(180deg, #093322 0%, #041910 100%)',
                        borderTop: driverIntelligence.harshAcc.isAlert ? '1.5px solid rgba(251, 191, 36, 0.7)' : '1.5px solid rgba(52, 211, 153, 0.6)',
                        borderBottom: '3px solid rgba(0, 0, 0, 0.95)',
                        borderLeft: driverIntelligence.harshAcc.isAlert ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        borderRight: driverIntelligence.harshAcc.isAlert ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <div className="flex items-center space-x-1">
                          <Zap size={12} className={driverIntelligence.harshAcc.isAlert ? 'text-amber-400' : 'text-emerald-400'} />
                          <span className={driverIntelligence.harshAcc.isAlert ? 'text-amber-300' : 'text-emerald-300'}>2. Harsh Acceleration</span>
                        </div>
                        <span className={`px-1 py-0.2 rounded text-[7.5px] font-extrabold border ${
                          driverIntelligence.harshAcc.isAlert
                            ? 'bg-amber-950 text-amber-300 border-amber-600'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        }`}>
                          {driverIntelligence.harshAcc.status}
                        </span>
                      </div>

                      <div className="my-0.5 flex items-baseline justify-between shrink-0">
                        <span className={`text-[17px] font-extrabold font-['Chakra_Petch'] leading-none ${
                          driverIntelligence.harshAcc.isAlert ? 'text-amber-400' : 'text-emerald-300'
                        }`}>
                          {driverIntelligence.harshAcc.maxAccRate}
                        </span>
                        <span className="text-[8.5px] text-slate-400">Limit: {driverIntelligence.harshAcc.threshold}</span>
                      </div>

                      <div className="text-[8px] text-slate-300 flex items-center justify-between shrink-0 border-t border-white/10 pt-0.5">
                        <span className="truncate">{driverIntelligence.harshAcc.eventCount} Detected</span>
                        <span className="text-[7.5px] text-cyan-400 font-bold">📡 GPS Speed Delta (Δv/Δt)</span>
                      </div>
                    </div>

                    {/* ================================================================= */}
                    {/* BOX 3: HARSH BRAKING (Strictly GPS Deceleration Delta: -Δv/Δt)    */}
                    {/* ================================================================= */}
                    <div
                      className="p-2 rounded-lg relative overflow-hidden group shadow-md flex flex-col justify-between transition-all duration-150"
                      style={{
                        background: driverIntelligence.harshBraking.isAlert 
                          ? 'linear-gradient(180deg, #3d0d18 0%, #1e050b 100%)' 
                          : 'linear-gradient(180deg, #093322 0%, #041910 100%)',
                        borderTop: driverIntelligence.harshBraking.isAlert ? '1.5px solid rgba(244, 63, 94, 0.7)' : '1.5px solid rgba(52, 211, 153, 0.6)',
                        borderBottom: '3px solid rgba(0, 0, 0, 0.95)',
                        borderLeft: driverIntelligence.harshBraking.isAlert ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        borderRight: driverIntelligence.harshBraking.isAlert ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <div className="flex items-center space-x-1">
                          <AlertTriangle size={12} className={driverIntelligence.harshBraking.isAlert ? 'text-rose-400' : 'text-emerald-400'} />
                          <span className={driverIntelligence.harshBraking.isAlert ? 'text-rose-300' : 'text-emerald-300'}>3. Harsh Braking</span>
                        </div>
                        <span className={`px-1 py-0.2 rounded text-[7.5px] font-extrabold border ${
                          driverIntelligence.harshBraking.isAlert
                            ? 'bg-rose-950 text-rose-300 border-rose-600'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        }`}>
                          {driverIntelligence.harshBraking.status}
                        </span>
                      </div>

                      <div className="my-0.5 flex items-baseline justify-between shrink-0">
                        <span className={`text-[17px] font-extrabold font-['Chakra_Petch'] leading-none ${
                          driverIntelligence.harshBraking.isAlert ? 'text-rose-400' : 'text-emerald-300'
                        }`}>
                          {driverIntelligence.harshBraking.maxDecelRate}
                        </span>
                        <span className="text-[8.5px] text-slate-400">Limit: {driverIntelligence.harshBraking.threshold}</span>
                      </div>

                      <div className="text-[8px] text-slate-300 flex items-center justify-between shrink-0 border-t border-white/10 pt-0.5">
                        <span className="truncate">{driverIntelligence.harshBraking.eventCount} Instances</span>
                        <span className="text-[7.5px] text-cyan-400 font-bold">📡 GPS Decel (-Δv/Δt)</span>
                      </div>
                    </div>

                    {/* ================================================================= */}
                    {/* BOX 4: RASH DRIVING (Strictly GPS Angular Turn Rate: Δθ/Δt)       */}
                    {/* ================================================================= */}
                    <div
                      className="p-2 rounded-lg relative overflow-hidden group shadow-md flex flex-col justify-between transition-all duration-150"
                      style={{
                        background: driverIntelligence.rashDriving.isAlert 
                          ? 'linear-gradient(180deg, #351c07 0%, #1a0d03 100%)' 
                          : 'linear-gradient(180deg, #093322 0%, #041910 100%)',
                        borderTop: driverIntelligence.rashDriving.isAlert ? '1.5px solid rgba(251, 191, 36, 0.7)' : '1.5px solid rgba(52, 211, 153, 0.6)',
                        borderBottom: '3px solid rgba(0, 0, 0, 0.95)',
                        borderLeft: driverIntelligence.rashDriving.isAlert ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        borderRight: driverIntelligence.rashDriving.isAlert ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <div className="flex items-center space-x-1">
                          <Activity size={12} className={driverIntelligence.rashDriving.isAlert ? 'text-amber-400' : 'text-emerald-400'} />
                          <span className={driverIntelligence.rashDriving.isAlert ? 'text-amber-300' : 'text-emerald-300'}>4. Rash Driving</span>
                        </div>
                        <span className={`px-1 py-0.2 rounded text-[7.5px] font-extrabold border ${
                          driverIntelligence.rashDriving.isAlert
                            ? 'bg-amber-950 text-amber-300 border-amber-600'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        }`}>
                          {driverIntelligence.rashDriving.rating}
                        </span>
                      </div>

                      <div className="my-0.5 flex items-baseline justify-between shrink-0">
                        <span className={`text-[17px] font-extrabold font-['Chakra_Petch'] leading-none ${
                          driverIntelligence.rashDriving.isAlert ? 'text-amber-400' : 'text-emerald-300'
                        }`}>
                          {driverIntelligence.rashDriving.turnRate} Turn
                        </span>
                        <span className="text-[8.5px] text-slate-400">Limit: {driverIntelligence.rashDriving.thresholdTurnRate}</span>
                      </div>

                      <div className="text-[8px] text-slate-300 flex items-center justify-between shrink-0 border-t border-white/10 pt-0.5">
                        <span className="truncate">{driverIntelligence.rashDriving.aggressiveSwerveCount} Swerves</span>
                        <span className="text-[7.5px] text-cyan-400 font-bold">📡 GPS Heading Rate (Δθ/Δt)</span>
                      </div>
                    </div>

                    {/* ================================================================= */}
                    {/* BOX 5: EXCESSIVE IDLING (Strictly GPS Coordinate Dwell v=0)       */}
                    {/* ================================================================= */}
                    <div
                      className="p-2 rounded-lg relative overflow-hidden group shadow-md flex flex-col justify-between transition-all duration-150"
                      style={{
                        background: driverIntelligence.excessiveIdling.isAlert 
                          ? 'linear-gradient(180deg, #351c07 0%, #1a0d03 100%)' 
                          : 'linear-gradient(180deg, #093322 0%, #041910 100%)',
                        borderTop: driverIntelligence.excessiveIdling.isAlert ? '1.5px solid rgba(251, 191, 36, 0.7)' : '1.5px solid rgba(52, 211, 153, 0.6)',
                        borderBottom: '3px solid rgba(0, 0, 0, 0.95)',
                        borderLeft: driverIntelligence.excessiveIdling.isAlert ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        borderRight: driverIntelligence.excessiveIdling.isAlert ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <div className="flex items-center space-x-1">
                          <Timer size={12} className={driverIntelligence.excessiveIdling.isAlert ? 'text-amber-400' : 'text-emerald-400'} />
                          <span className={driverIntelligence.excessiveIdling.isAlert ? 'text-amber-300' : 'text-emerald-300'}>5. Excessive Idling</span>
                        </div>
                        <span className={`px-1 py-0.2 rounded text-[7.5px] font-extrabold border ${
                          driverIntelligence.excessiveIdling.isAlert
                            ? 'bg-amber-950 text-amber-300 border-amber-600'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        }`}>
                          {driverIntelligence.excessiveIdling.status}
                        </span>
                      </div>

                      <div className="my-0.5 flex items-baseline justify-between shrink-0">
                        <span className={`text-[17px] font-extrabold font-['Chakra_Petch'] leading-none ${
                          driverIntelligence.excessiveIdling.isAlert ? 'text-amber-400' : 'text-emerald-300'
                        }`}>
                          {driverIntelligence.excessiveIdling.totalIdleMinutes} mins
                        </span>
                        <span className="text-[8.5px] text-slate-400">Limit: {driverIntelligence.excessiveIdling.thresholdMinutes}m (+{driverIntelligence.excessiveIdling.excessMinutes}m)</span>
                      </div>

                      <div className="text-[8px] text-slate-300 flex items-center justify-between shrink-0 border-t border-white/10 pt-0.5">
                        <span className="truncate">{driverIntelligence.excessiveIdling.location}</span>
                        <span className="text-[7.5px] text-cyan-400 font-bold">📡 GPS Dwell (v=0)</span>
                      </div>
                    </div>

                    {/* ================================================================= */}
                    {/* BOX 6: TRIP MONITORING (Strictly GPS Geodesic & Waypoints)         */}
                    {/* ================================================================= */}
                    <div
                      className="p-2 rounded-lg relative overflow-hidden group shadow-md flex flex-col justify-between transition-all duration-150"
                      style={{
                        background: 'linear-gradient(180deg, #0d2547 0%, #061326 100%)',
                        borderTop: '1.5px solid rgba(56, 189, 248, 0.7)',
                        borderBottom: '3px solid rgba(0, 0, 0, 0.95)',
                        borderLeft: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRight: '1px solid rgba(56, 189, 248, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <div className="flex items-center space-x-1">
                          <Compass size={12} className="text-cyan-400" />
                          <span className="text-cyan-300">6. Trip Monitoring</span>
                        </div>
                        <span className="px-1 py-0.2 rounded text-[7.5px] font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-600">
                          {driverIntelligence.tripMonitoring.progressPercent}% DONE
                        </span>
                      </div>

                      <div className="my-0.5 shrink-0">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[17px] font-extrabold font-['Chakra_Petch'] text-cyan-300 leading-none">
                            {driverIntelligence.tripMonitoring.completedDistanceKm} / {driverIntelligence.tripMonitoring.plannedDistanceKm} km
                          </span>
                          <span className="text-[8.5px] text-slate-400">ETA: {driverIntelligence.tripMonitoring.etaFormatted.split(' ')[1]}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 rounded-full"
                            style={{ width: `${driverIntelligence.tripMonitoring.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[8px] text-slate-300 flex items-center justify-between shrink-0 border-t border-white/10 pt-0.5">
                        <span className="truncate">{driverIntelligence.tripMonitoring.remainingDistanceKm} km left</span>
                        <span className="text-[7.5px] text-cyan-400 font-bold">📡 GPS Geodesic</span>
                      </div>
                    </div>

                    {/* ================================================================= */}
                    {/* BOX 7: ROUTE DEVIATION (Strictly GPS Cross-Track Corridor Error)  */}
                    {/* ================================================================= */}
                    <div
                      className="p-2 rounded-lg relative overflow-hidden group shadow-md flex flex-col justify-between transition-all duration-150"
                      style={{
                        background: driverIntelligence.routeDeviation.isDeviated 
                          ? 'linear-gradient(180deg, #3d0d18 0%, #1e050b 100%)' 
                          : 'linear-gradient(180deg, #093322 0%, #041910 100%)',
                        borderTop: driverIntelligence.routeDeviation.isDeviated ? '1.5px solid rgba(244, 63, 94, 0.7)' : '1.5px solid rgba(52, 211, 153, 0.6)',
                        borderBottom: '3px solid rgba(0, 0, 0, 0.95)',
                        borderLeft: driverIntelligence.routeDeviation.isDeviated ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        borderRight: driverIntelligence.routeDeviation.isDeviated ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <div className="flex items-center space-x-1">
                          <Route size={12} className={driverIntelligence.routeDeviation.isDeviated ? 'text-rose-400' : 'text-emerald-400'} />
                          <span className={driverIntelligence.routeDeviation.isDeviated ? 'text-rose-300' : 'text-emerald-300'}>7. Route Deviation</span>
                        </div>
                        <span className={`px-1 py-0.2 rounded text-[7.5px] font-extrabold border ${
                          driverIntelligence.routeDeviation.isDeviated
                            ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        }`}>
                          {driverIntelligence.routeDeviation.status}
                        </span>
                      </div>

                      <div className="my-0.5 flex items-baseline justify-between shrink-0">
                        <span className={`text-[17px] font-extrabold font-['Chakra_Petch'] leading-none ${
                          driverIntelligence.routeDeviation.isDeviated ? 'text-rose-400' : 'text-emerald-300'
                        }`}>
                          {driverIntelligence.routeDeviation.deviationDistanceKm > 0 ? `+${driverIntelligence.routeDeviation.deviationDistanceKm} km` : '0.0 km'}
                        </span>
                        <span className="text-[8.5px] text-slate-400">Buffer: {driverIntelligence.routeDeviation.toleranceBufferMeters}m</span>
                      </div>

                      <div className="text-[8px] text-slate-300 flex items-center justify-between shrink-0 border-t border-white/10 pt-0.5">
                        <span className="truncate">{driverIntelligence.routeDeviation.lastRecordedPoint}</span>
                        <span className="text-[7.5px] text-cyan-400 font-bold">📡 GPS Cross-Track</span>
                      </div>
                    </div>

                    {/* ================================================================= */}
                    {/* BOX 8: GEO FENCING (Strictly GPS Point-in-Polygon Boundary Engine) */}
                    {/* ================================================================= */}
                    <div
                      className="p-2 rounded-lg relative overflow-hidden group shadow-md flex flex-col justify-between transition-all duration-150"
                      style={{
                        background: driverIntelligence.geoFencing.isBreached 
                          ? 'linear-gradient(180deg, #3d0d18 0%, #1e050b 100%)' 
                          : 'linear-gradient(180deg, #093322 0%, #041910 100%)',
                        borderTop: driverIntelligence.geoFencing.isBreached ? '1.5px solid rgba(244, 63, 94, 0.7)' : '1.5px solid rgba(52, 211, 153, 0.6)',
                        borderBottom: '3px solid rgba(0, 0, 0, 0.95)',
                        borderLeft: driverIntelligence.geoFencing.isBreached ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        borderRight: driverIntelligence.geoFencing.isBreached ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(52, 211, 153, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.1), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <div className="flex items-center space-x-1">
                          <ShieldCheck size={12} className={driverIntelligence.geoFencing.isBreached ? 'text-rose-400' : 'text-emerald-400'} />
                          <span className={driverIntelligence.geoFencing.isBreached ? 'text-rose-300' : 'text-emerald-300'}>8. Geo Fencing</span>
                        </div>
                        <span className={`px-1 py-0.2 rounded text-[7.5px] font-extrabold border ${
                          driverIntelligence.geoFencing.isBreached
                            ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        }`}>
                          {driverIntelligence.geoFencing.status}
                        </span>
                      </div>

                      <div className="my-0.5 flex items-baseline justify-between shrink-0">
                        <span className={`text-[17px] font-extrabold font-['Chakra_Petch'] leading-none ${
                          driverIntelligence.geoFencing.isBreached ? 'text-rose-400' : 'text-emerald-300'
                        }`}>
                          {driverIntelligence.geoFencing.isBreached ? `+${driverIntelligence.geoFencing.perimeterDistanceKm} km Out` : 'Inside Perimeter'}
                        </span>
                        <span className="text-[8.5px] text-slate-400">{driverIntelligence.geoFencing.isBreached ? 'Breach 05:40 AM' : 'Zone A'}</span>
                      </div>

                      <div className="text-[8px] text-slate-300 flex items-center justify-between shrink-0 border-t border-white/10 pt-0.5">
                        <span className="truncate">{driverIntelligence.geoFencing.assignedZone}</span>
                        <span className="text-[7.5px] text-cyan-400 font-bold">📡 GPS Point-in-Polygon</span>
                      </div>
                    </div>

                  </div>

                  {/* ----------------------------------------------------------------------- */}
                  {/* TRIP ROUTE ENTRY PROVISION (Start & End inputs + Presets + Save)       */}
                  {/* Compact 1-line strip at bottom of 8 boxes                               */}
                  {/* ----------------------------------------------------------------------- */}
                  <div className="mt-1.5 pt-1 border-t border-cyan-900/60 flex flex-wrap items-center justify-between gap-1.5 text-[9.5px] font-mono shrink-0">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="font-bold text-cyan-300 flex items-center gap-1 uppercase tracking-wider text-[9px]">
                        <Edit3 size={11} className="text-cyan-400" />
                        <span>Trip Route Provision:</span>
                      </span>
                    </div>

                    <div className="flex items-center flex-1 max-w-2xl space-x-1.5 min-w-[260px]">
                      <div className="flex-1 flex items-center bg-[#030916] border border-cyan-800/80 rounded px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 shrink-0" title="Start Point"></span>
                        <input
                          type="text"
                          value={customRouteInputs.start}
                          onChange={(e) => setCustomRouteInputs(prev => ({ ...prev, start: e.target.value }))}
                          placeholder="Start Location (Origin)..."
                          className="w-full bg-transparent text-white text-[9.5px] placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>

                      <span className="text-cyan-400 font-bold text-xs shrink-0">➔</span>

                      <div className="flex-1 flex items-center bg-[#030916] border border-cyan-800/80 rounded px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1.5 shrink-0" title="End Point"></span>
                        <input
                          type="text"
                          value={customRouteInputs.end}
                          onChange={(e) => setCustomRouteInputs(prev => ({ ...prev, end: e.target.value }))}
                          placeholder="End Location (Destination)..."
                          className="w-full bg-transparent text-white text-[9.5px] placeholder:text-slate-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleUpdateTripRoute}
                        className="px-2 py-0.5 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-black font-extrabold text-[9px] transition shrink-0 flex items-center gap-1 shadow-sm"
                        title="Save and update active trip route"
                      >
                        <Save size={10} />
                        <span>Update Route</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-[8.5px] text-slate-400 mr-1 hidden lg:inline">Presets:</span>
                      {ROUTE_PRESETS.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setCustomRouteInputs({ start: p.start, end: p.end })}
                          className="px-1.5 py-0.5 rounded bg-[#091838] hover:bg-[#122A5C] text-cyan-300 border border-cyan-800/80 text-[8.5px] font-medium transition"
                        >
                          {p.start.split(' ')[0]} ➔ {p.end.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {routeUpdateSuccess && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 text-[8.5px] font-bold flex items-center gap-1 animate-in fade-in">
                        <CheckCircle2 size={10} className="text-emerald-400" />
                        <span>Route Updated!</span>
                      </span>
                    )}
                  </div>

                </div>
              )}
            </div>
          </>
        ) : null}

        {/* ------------------------------------------------------------- */}
        {/* OPTIONAL BOTTOM INTELLIGENCE DRAWER                           */}
        {/* ------------------------------------------------------------- */}
        {selectedVehicle && (
          <div className={`absolute bottom-4 right-4 z-20 transition-all duration-300 pointer-events-auto ${
            leftPanelCollapsed || !selectedVehicle ? 'left-4 md:left-8' : 'left-4 md:left-[400px] lg:left-[415px]'
          }`}>
            <div className="bg-[#081026]/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] overflow-hidden font-sans text-slate-100 flex flex-col">
              
              {/* Top Bar of Drawer: Callout, Reg, Route Name, Toggle */}
              <div className="px-4 py-2 bg-[#091533] border-b border-cyan-800/40 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-400">
                    <Truck size={16} />
                  </div>
                  <div className="flex items-center space-x-2 font-['Chakra_Petch']">
                    <span className="text-base font-extrabold text-white tracking-wide">{selectedVehicle.reg_no}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                      {selectedVehicle.id}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                      selectedVehicle.isBreached
                        ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse'
                        : selectedVehicle.status === 'WORKING'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : selectedVehicle.status === 'IDLE'
                        ? 'bg-amber-950 text-amber-300 border border-amber-600'
                        : 'bg-purple-950 text-purple-300 border border-purple-600'
                    }`}>
                      {selectedVehicle.isBreached ? '⚠️ GEOFENCE BREACHED' : selectedVehicle.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDrawerExpanded(!drawerExpanded)}
                    className="px-2 py-1 rounded-lg bg-[#0C1E44] hover:bg-[#122E68] text-cyan-300 text-xs font-mono font-bold transition flex items-center gap-1"
                    title={drawerExpanded ? 'Collapse Telematics Drawer' : 'Expand Detailed Telematics'}
                  >
                    <span>{drawerExpanded ? 'Hide Specs' : 'Detailed Telematics'}</span>
                    {drawerExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVehicle(null);
                      setSearchQuery('');
                    }}
                    className="p-1 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition"
                    title="Return to All Fleets Radar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer Content Body (when expanded) */}
              {drawerExpanded && (
                <div className="p-3.5 space-y-2.5 font-mono text-xs">
                  {/* Telemetry Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2 rounded-xl bg-[#060D20] border border-slate-800">
                      <span className="text-[9.5px] text-slate-500 block uppercase">LIVE SPEED</span>
                      <span className="text-sm font-bold text-cyan-300 font-['Chakra_Petch']">
                        {selectedVehicle.speed_kmh || 0} km/h
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#060D20] border border-slate-800">
                      <span className="text-[9.5px] text-slate-500 block uppercase">FUEL TANK</span>
                      <span className="text-sm font-bold text-emerald-400 font-['Chakra_Petch']">
                        {selectedVehicle.current_fuel_liters || 285} L
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#060D20] border border-slate-800">
                      <span className="text-[9.5px] text-slate-500 block uppercase">BURN RATE</span>
                      <span className="text-sm font-bold text-slate-200 font-['Chakra_Petch']">
                        {selectedVehicle.current_cph || 18.2} L/h
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#060D20] border border-slate-800">
                      <span className="text-[9.5px] text-slate-500 block uppercase">GEOFENCE</span>
                      <span className={`text-sm font-bold font-['Chakra_Petch'] ${selectedVehicle.isBreached ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {selectedVehicle.isBreached ? `+${selectedVehicle.deviation_km} km` : '✓ IN BOUND'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#060D20] border border-slate-800">
                      <span className="text-[9.5px] text-slate-500 block uppercase">CHASSIS / MODEL</span>
                      <span className="text-[11px] font-bold text-slate-200 whitespace-normal break-words block mt-0.5" title={selectedVehicle.model}>
                        {selectedVehicle.model || 'Heavy Commercial Hauler'}
                      </span>
                    </div>
                  </div>

                  {/* Driver Intelligence Summary Strip */}
                  {driverIntelligence && (
                    <div className="p-2.5 rounded-xl bg-[#071328] border border-cyan-900/60 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                      <div className="flex items-center space-x-1.5">
                        <User size={13} className="text-cyan-400" />
                        <span className="text-slate-400">Driver:</span>
                        <span className="font-bold text-white">{driverIntelligence.driver.name} ({driverIntelligence.driver.badge})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">Score:</span>
                        <span className="font-bold text-emerald-400">{driverIntelligence.driver.score}/100</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">Overspeed:</span>
                        <span className={`font-bold ${driverIntelligence.overspeed.isAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {driverIntelligence.overspeed.eventCount} ev
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">Braking:</span>
                        <span className={`font-bold ${driverIntelligence.harshBraking.isAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {driverIntelligence.harshBraking.eventCount} ev
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">Trip:</span>
                        <span className="font-bold text-cyan-300">{driverIntelligence.tripMonitoring.progressPercent}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* COLLAPSIBLE RIGHT SLIDE-IN ALERT STREAM                       */}
        {/* ------------------------------------------------------------- */}
        {alertsPanelOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-[#070D1F]/95 backdrop-blur-xl border-l border-[#1E2E56] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 font-mono text-xs">
            <div className="p-3 bg-[#0A1128] border-b border-[#1E2E56] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Bell size={16} className="text-rose-400 animate-pulse" />
                <span className="font-bold text-white uppercase font-['Chakra_Petch']">Live Alerts Stream</span>
              </div>
              <button onClick={() => setAlertsPanelOpen(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
              {alerts.map(alert => {
                const isAck = alert.is_acknowledged === 1;
                return (
                  <div 
                    key={alert.id}
                    className={`p-2.5 rounded-lg border transition ${
                      isAck ? 'bg-[#0B152A]/70 border-slate-800 opacity-75' : 'bg-[#121E3B] border-rose-600/60 shadow-lg'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase ${
                        alert.type === 'FUEL_SIPHONING' || alert.type === 'COLD_TEMP' || alert.type === 'CARGO_TEMP_INCREASING' || alert.type === 'EWAY_EXPIRING' || alert.type === 'AXLE_OVERWEIGHT'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : alert.type === 'REFUEL_DISCREPANCY' || alert.type === 'IDLE_ALERT' || alert.type === 'HIGH_CPH' || alert.type === 'CHALLAN_PENDING' || alert.type === 'AXLE_IMBALANCE'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : alert.type === 'HARSH_BRAKING' || alert.type === 'SHARP_CORNERING' || alert.type === 'HARSH_DRIVING' || alert.type === 'OVERSPEEDING_2X'
                          ? 'bg-orange-950 text-orange-300 border border-orange-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-400">{alert.timestamp}</span>
                    </div>
                    <div className="font-bold text-white mt-1">{alert.reg_no}</div>
                    <p className="text-[11px] text-slate-300 leading-tight mt-0.5">{formatStandardizedAlertMessage(alert)}</p>
                    <div className="mt-2">
                      {isAck ? (
                        <div className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle2 size={12} />
                          <span>Acknowledged by {alert.acknowledged_by}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="w-full py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase shadow-sm"
                        >
                          Acknowledge Alert
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MapBox API Integration Modal */}
        <MapboxModal
          isOpen={mapboxModalOpen}
          onClose={() => setMapboxModalOpen(false)}
          onTokenUpdated={(tok) => {
            setMapboxToken(tok);
          }}
          currentProvider={mapProvider}
          setMapProvider={setMapProvider}
        />

      </div>
    </div>
  );
}
