import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  AlertTriangle,
  Zap,
  Disc,
  RotateCcw,
  Compass,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  Settings,
  Sliders,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Award,
  AlertOctagon
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch, telematicsWS } from '../services/api';
import { Vehicle } from '../types';

interface DriverKPIs {
  totalEvents: number;
  harshBraking: number;
  harshAccel: number;
  vehicleTilt: number;
  rashDriving: number;
  overspeeding: number;
  criticalCount: number;
  last24hCount: number;
  last7dCount: number;
  fleetSafetyScore: number;
  protocol: string;
}

interface DriverEvent {
  id: string;
  vehicle_id: string;
  registration_number: string;
  make?: string;
  vehicle_model?: string;
  category_name?: string;
  device_imei?: string;
  event_type: 'HARSH_BRAKING' | 'HARSH_ACCEL' | 'VEHICLE_TILT' | 'RASH_DRIVING' | 'OVERSPEEDING';
  packet_type: string;
  alert_id: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  metric_value: string;
  threshold_value: string;
  speed: number;
  heading: number;
  latitude: number;
  longitude: number;
  address: string;
  driver_name: string;
  event_time: string;
  osmLink: string;
}

interface LeaderboardItem {
  rank: number;
  vehicleId: string;
  registrationNumber: string;
  vehicleName: string;
  category: string;
  driverName: string;
  totalViolations: number;
  harshBraking: number;
  harshAccel: number;
  vehicleTilt: number;
  rashDriving: number;
  overspeeding: number;
  safetyScore: number;
  riskTier: 'Safe' | 'Moderate Risk' | 'High Risk';
  lastIncident: string;
}

interface IMUConfig {
  device_id: string;
  harsh_brake_threshold: number;
  harsh_accel_threshold: number;
  tilt_angle_threshold: number;
  rash_turning_speed: number;
  harsh_turning_g: number;
  motion_threshold: number;
  speed_limit: number;
}

export const DriverIntelligenceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'leaderboard' | 'map' | 'config'>('events');
  const [kpis, setKpis] = useState<DriverKPIs>({
    totalEvents: 0,
    harshBraking: 0,
    harshAccel: 0,
    vehicleTilt: 0,
    rashDriving: 0,
    overspeeding: 0,
    criticalCount: 0,
    last24hCount: 0,
    last7dCount: 0,
    fleetSafetyScore: 85,
    protocol: 'tnavIC AIS-140 / ARAI Standard'
  });

  const [events, setEvents] = useState<DriverEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // Filters
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedPreset, setSelectedPreset] = useState<'today' | '7days' | '30days' | '90days'>('90days');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // IMU Config State
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('dev_101');
  const [imuConfig, setImuConfig] = useState<IMUConfig | null>(null);
  const [commandString, setCommandString] = useState<string>('');
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // 1. Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, vehRes, leadRes] = await Promise.all([
        apiFetch<{ success: boolean; kpis: DriverKPIs }>('/driver-intelligence/summary'),
        apiFetch<Vehicle[]>('/vehicles'),
        apiFetch<LeaderboardItem[]>('/driver-intelligence/leaderboard')
      ]);

      if (sumRes.kpis) setKpis(sumRes.kpis);
      setVehicles(vehRes || []);
      setLeaderboard(leadRes || []);

      // Fetch events with current filters
      await fetchFilteredEvents();
      await fetchDeviceConfig(selectedDeviceId);
    } catch (err) {
      console.error('Error fetching driver intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredEvents = async () => {
    try {
      let url = `/driver-intelligence/events?limit=200&eventType=${selectedEventType}&severity=${selectedSeverity}`;
      if (selectedVehicle) url += `&vehicleId=${selectedVehicle}`;
      
      const now = new Date();
      let startIso = '';
      if (selectedPreset === 'today') {
        startIso = now.toISOString().split('T')[0] + ' 00:00:00';
      } else if (selectedPreset === '7days') {
        const d = new Date(now.getTime() - 7 * 86400000);
        startIso = d.toISOString().split('T')[0] + ' 00:00:00';
      } else if (selectedPreset === '30days') {
        const d = new Date(now.getTime() - 30 * 86400000);
        startIso = d.toISOString().split('T')[0] + ' 00:00:00';
      } else if (selectedPreset === '90days') {
        const d = new Date(now.getTime() - 90 * 86400000);
        startIso = d.toISOString().split('T')[0] + ' 00:00:00';
      }
      if (startIso) url += `&startDate=${encodeURIComponent(startIso)}`;

      const data = await apiFetch<DriverEvent[]>(url);
      setEvents(data || []);
    } catch (e) {
      console.error('Failed to fetch filtered events:', e);
    }
  };

  const fetchDeviceConfig = async (devId: string) => {
    try {
      const res = await apiFetch<{ config: IMUConfig; commandString: string }>(`/driver-intelligence/device-config/${devId}`);
      if (res && res.config) {
        setImuConfig(res.config);
        setCommandString(res.commandString);
      }
    } catch (e) {
      console.warn('Failed to fetch IMU config:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchFilteredEvents();
  }, [selectedVehicle, selectedEventType, selectedSeverity, selectedPreset]);

  // WebSocket Live Updates
  useEffect(() => {
    const unsub = telematicsWS.subscribe((msg: any) => {
      if (msg && msg.type === 'DRIVER_INTELLIGENCE_EVENT' && msg.data) {
        const ev = msg.data;
        // Prepend event
        setEvents(prev => [
          {
            id: ev.id,
            vehicle_id: ev.vehicleId,
            registration_number: ev.registrationNumber,
            driver_name: ev.driverName,
            event_type: ev.eventType,
            packet_type: ev.packetType,
            alert_id: ev.alertId,
            severity: ev.severity,
            metric_value: ev.metricValue,
            threshold_value: ev.thresholdValue,
            speed: ev.speed,
            heading: ev.heading,
            latitude: ev.latitude,
            longitude: ev.longitude,
            address: `Lat ${ev.latitude.toFixed(4)}, Lon ${ev.longitude.toFixed(4)}`,
            event_time: ev.timestamp,
            osmLink: `https://www.openstreetmap.org/?mlat=${ev.latitude}&mlon=${ev.longitude}#map=16/${ev.latitude}/${ev.longitude}`
          },
          ...prev
        ]);

        // Refresh KPI summary
        apiFetch<{ success: boolean; kpis: DriverKPIs }>('/driver-intelligence/summary').then(res => {
          if (res?.kpis) setKpis(res.kpis);
        });
      }
    });

    return () => unsub();
  }, []);

  // Initialize Leaflet OpenStreetMap when Map Tab is active
  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([18.5912, 73.7389], 12);
      
      // OpenStreetMap standard tile layer
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    // Render incident markers
    if (markersLayerRef.current && events.length > 0) {
      markersLayerRef.current.clearLayers();
      const bounds = L.latLngBounds([]);

      events.forEach(ev => {
        if (!ev.latitude || !ev.longitude) return;
        bounds.extend([ev.latitude, ev.longitude]);

        // Distinct colors for the 5 categories
        let pinColor = '#EF4444'; // Red default
        if (ev.event_type === 'HARSH_BRAKING') pinColor = '#F97316'; // Orange
        else if (ev.event_type === 'HARSH_ACCEL') pinColor = '#EAB308'; // Amber
        else if (ev.event_type === 'VEHICLE_TILT') pinColor = '#DC2626'; // Deep Red
        else if (ev.event_type === 'RASH_DRIVING') pinColor = '#A855F7'; // Purple
        else if (ev.event_type === 'OVERSPEEDING') pinColor = '#0284C7'; // Blue

        const markerHtml = `
          <div style="background-color: ${pinColor}; width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">
            ${ev.packet_type}
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: 'custom-driver-marker',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; min-width: 220px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              ${ev.registration_number} &bull; <span style="color: ${pinColor}">${ev.event_type.replace('_', ' ')}</span>
            </div>
            <div style="margin-bottom: 3px;"><strong>Driver:</strong> ${ev.driver_name}</div>
            <div style="margin-bottom: 3px;"><strong>Sensor Metric:</strong> <span style="color: #b91c1c; font-weight: 600;">${ev.metric_value}</span></div>
            <div style="margin-bottom: 3px;"><strong>Configured Threshold:</strong> ${ev.threshold_value}</div>
            <div style="margin-bottom: 3px;"><strong>Speed / Heading:</strong> ${ev.speed} km/h | ${ev.heading}&deg;</div>
            <div style="margin-bottom: 6px; color: #64748b; font-size: 11px;">${ev.event_time}</div>
            <a href="${ev.osmLink}" target="_blank" rel="noreferrer" style="display: inline-block; background: #0284c7; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: 500;">
              View on OpenStreetMap &nearr;
            </a>
          </div>
        `;

        const marker = L.marker([ev.latitude, ev.longitude], { icon }).bindPopup(popupContent);
        markersLayerRef.current?.addLayer(marker);
      });

      if (bounds.isValid() && mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [activeTab, events]);

  // Trigger on-demand test packet
  const handleSimulate = async (type: string) => {
    setIsSimulating(true);
    setSimMessage(null);
    try {
      const res = await apiFetch<any>('/driver-intelligence/simulate', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: selectedVehicle || 'veh_1',
          eventType: type
        })
      });
      setSimMessage(res.message);
      fetchFilteredEvents();
      setTimeout(() => setSimMessage(null), 4000);
    } catch (e: any) {
      setSimMessage(`Simulation failed: ${e.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Update IMU configuration
  const handleSaveIMUConfig = async () => {
    if (!imuConfig) return;
    try {
      const res = await apiFetch<any>(`/driver-intelligence/device-config/${selectedDeviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          harshBrake: imuConfig.harsh_brake_threshold,
          harshAccel: imuConfig.harsh_accel_threshold,
          tiltAngle: imuConfig.tilt_angle_threshold,
          rashTurning: imuConfig.rash_turning_speed,
          speedLimit: imuConfig.speed_limit
        })
      });
      setConfigSuccess(`Configured successfully! Sent OTA AIS-140 command: ${res.otaCommand}`);
      setTimeout(() => setConfigSuccess(null), 5000);
    } catch (e: any) {
      alert(`Failed to save IMU configuration: ${e.message}`);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open(`/api/reports/driver-intelligence?preset=${selectedPreset}&eventType=${selectedEventType}&exportFormat=csv`, '_blank');
  };

  const filteredEvents = events.filter(ev => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.registration_number?.toLowerCase().includes(q) ||
      ev.driver_name?.toLowerCase().includes(q) ||
      ev.event_type?.toLowerCase().includes(q) ||
      ev.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Telematics Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg border border-sky-100">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Driver Intelligence
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  AIS-140 IMU Active
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                AI-Powered Inertial Telematics & Behavioral Sensor Analytics &bull; Compliant with tnavIC-140 ARAI Standards
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Quick Simulation Dropdown */}
          <div className="relative inline-block text-left">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
              <span className="text-[11px] font-medium text-slate-500 px-2">Simulate Event:</span>
              <button
                onClick={() => handleSimulate('HARSH_BRAKING')}
                disabled={isSimulating}
                className="px-2 py-1 text-xs font-semibold bg-white text-amber-700 hover:bg-amber-50 rounded border border-slate-200 shadow-2xs mr-1 transition-colors"
                title="Table 7: HB / Alert ID 13 (HBT 0.55g)"
              >
                Harsh Brake
              </button>
              <button
                onClick={() => handleSimulate('HARSH_ACCEL')}
                disabled={isSimulating}
                className="px-2 py-1 text-xs font-semibold bg-white text-orange-700 hover:bg-orange-50 rounded border border-slate-200 shadow-2xs mr-1 transition-colors"
                title="Table 7: HA / Alert ID 14 (HAT 0.43g)"
              >
                Harsh Accel
              </button>
              <button
                onClick={() => handleSimulate('VEHICLE_TILT')}
                disabled={isSimulating}
                className="px-2 py-1 text-xs font-semibold bg-white text-rose-700 hover:bg-rose-50 rounded border border-slate-200 shadow-2xs mr-1 transition-colors"
                title="Table 7: TI / Alert ID 22 (TA 45°)"
              >
                Tilt (49°)
              </button>
              <button
                onClick={() => handleSimulate('RASH_DRIVING')}
                disabled={isSimulating}
                className="px-2 py-1 text-xs font-semibold bg-white text-purple-700 hover:bg-purple-50 rounded border border-slate-200 shadow-2xs mr-1 transition-colors"
                title="Table 7: RT / Alert ID 15 (RTT 30km/h)"
              >
                Rash Turn
              </button>
              <button
                onClick={() => handleSimulate('OVERSPEEDING')}
                disabled={isSimulating}
                className="px-2 py-1 text-xs font-semibold bg-white text-sky-700 hover:bg-sky-50 rounded border border-slate-200 shadow-2xs transition-colors"
                title="Table 7: OS / Alert ID 17 (SL 70km/h)"
              >
                Overspeed
              </button>
            </div>
          </div>

          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg border border-slate-200 transition-colors"
            title="Refresh All Telematics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV (90 Days)</span>
          </button>
        </div>
      </div>

      {/* Notification banner if simulation triggered */}
      {simMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{simMessage}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-600">AIS-140 Packet Acknowledged</span>
        </div>
      )}

      {/* 2. THE 5 HERO FEATURE CARDS + FLEET SAFETY SCORE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Harsh Braking */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'HARSH_BRAKING' ? 'ALL' : 'HARSH_BRAKING')}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-2xs ${
            selectedEventType === 'HARSH_BRAKING'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Harsh Braking</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Disc className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpis.harshBraking}</div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Threshold:</span>
            <span className="font-mono font-semibold text-amber-700">0.55g (HBT)</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">Packet: HB | Alert ID: 13</div>
        </div>

        {/* Card 2: Harsh Acceleration */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'HARSH_ACCEL' ? 'ALL' : 'HARSH_ACCEL')}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-2xs ${
            selectedEventType === 'HARSH_ACCEL'
              ? 'bg-orange-50/80 border-orange-400 ring-2 ring-orange-400/20'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">Harsh Accel</span>
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpis.harshAccel}</div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Threshold:</span>
            <span className="font-mono font-semibold text-orange-700">0.43g (HAT)</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">Packet: HA | Alert ID: 14</div>
        </div>

        {/* Card 3: Vehicle Tilt */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'VEHICLE_TILT' ? 'ALL' : 'VEHICLE_TILT')}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-2xs ${
            selectedEventType === 'VEHICLE_TILT'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Vehicle Tilt</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpis.vehicleTilt}</div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Max Tilt Limit:</span>
            <span className="font-mono font-semibold text-rose-700">45.0° (TA)</span>
          </div>
          <div className="mt-1 text-[10px] text-rose-600 font-semibold font-mono">Critical Safety Alert</div>
        </div>

        {/* Card 4: Rash Driving */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'RASH_DRIVING' ? 'ALL' : 'RASH_DRIVING')}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-2xs ${
            selectedEventType === 'RASH_DRIVING'
              ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Rash Driving</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpis.rashDriving}</div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Threshold:</span>
            <span className="font-mono font-semibold text-purple-700">30 km/h / 0.47g</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">Packet: RT | Alert ID: 15</div>
        </div>

        {/* Card 5: Overspeeding */}
        <div
          onClick={() => setSelectedEventType(selectedEventType === 'OVERSPEEDING' ? 'ALL' : 'OVERSPEEDING')}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-2xs ${
            selectedEventType === 'OVERSPEEDING'
              ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-400/20'
              : 'bg-white border-slate-200 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Overspeeding</span>
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kpis.overspeeding}</div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Speed Limit:</span>
            <span className="font-mono font-semibold text-sky-700">70 km/h (SL)</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">Packet: OS | Alert ID: 17</div>
        </div>

        {/* Fleet Safety Score */}
        <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-800 text-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Fleet Score</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{kpis.fleetSafetyScore}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                kpis.fleetSafetyScore >= 80 ? 'bg-emerald-400' : kpis.fleetSafetyScore >= 65 ? 'bg-amber-400' : 'bg-rose-400'
              }`}
              style={{ width: `${kpis.fleetSafetyScore}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-300 mt-1 flex justify-between">
            <span>Violations: {kpis.totalEvents}</span>
            <span className="text-rose-300">{kpis.criticalCount} Critical</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 text-sm font-semibold flex items-center space-x-2 transition-colors border-b-2 -mb-px ${
              activeTab === 'events'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>Live Incident Stream ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-3 text-sm font-semibold flex items-center space-x-2 transition-colors border-b-2 -mb-px ${
              activeTab === 'leaderboard'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Driver Safety Scorecard</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`pb-3 text-sm font-semibold flex items-center space-x-2 transition-colors border-b-2 -mb-px ${
              activeTab === 'map'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Violation Incident Map (OSM)</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 text-sm font-semibold flex items-center space-x-2 transition-colors border-b-2 -mb-px ${
              activeTab === 'config'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>AIS-140 IMU Threshold Config</span>
          </button>
        </div>

        {/* 90-Day Range Presets */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
          {(['today', '7days', '30days', '90days'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => setSelectedPreset(preset)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedPreset === preset
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {preset === 'today' ? 'Today' : preset === '7days' ? '7 Days' : preset === '30days' ? '30 Days' : '90 Days Max'}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tab 1: Live Incident Telematics Feed */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vehicle, driver or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-sky-500 focus:bg-white outline-hidden"
                />
              </div>

              {/* Vehicle Selector */}
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 text-slate-700 outline-hidden"
              >
                <option value="">All Vehicles ({vehicles.length})</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} ({v.make} {v.model})
                  </option>
                ))}
              </select>

              {/* Event Type Filter */}
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 text-slate-700 outline-hidden"
              >
                <option value="ALL">All Event Types</option>
                <option value="HARSH_BRAKING">1. Harsh Braking (HB / ID 13)</option>
                <option value="HARSH_ACCEL">2. Harsh Acceleration (HA / ID 14)</option>
                <option value="VEHICLE_TILT">3. Vehicle Tilt (TI / ID 22)</option>
                <option value="RASH_DRIVING">4. Rash Driving (RT / ID 15)</option>
                <option value="OVERSPEEDING">5. Overspeeding (OS / ID 17)</option>
              </select>

              {/* Severity */}
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 text-slate-700 outline-hidden"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="WARNING">Warnings</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Showing <span className="font-semibold text-slate-800">{filteredEvents.length}</span> recorded violations (up to 90 days)
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4">Event Time</th>
                    <th className="py-3 px-4">Vehicle & Category</th>
                    <th className="py-3 px-4">Driver Name</th>
                    <th className="py-3 px-4">Violation Type</th>
                    <th className="py-3 px-4">Sensor Metric Value</th>
                    <th className="py-3 px-4">AIS-140 Threshold</th>
                    <th className="py-3 px-4">Speed & Heading</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Map Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No driver intelligence events found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map(ev => {
                      let badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (ev.event_type === 'HARSH_BRAKING') {
                        badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
                      } else if (ev.event_type === 'HARSH_ACCEL') {
                        badgeBg = 'bg-orange-50 text-orange-800 border-orange-200';
                      } else if (ev.event_type === 'VEHICLE_TILT') {
                        badgeBg = 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse';
                      } else if (ev.event_type === 'RASH_DRIVING') {
                        badgeBg = 'bg-purple-50 text-purple-800 border-purple-200';
                      } else if (ev.event_type === 'OVERSPEEDING') {
                        badgeBg = 'bg-sky-50 text-sky-800 border-sky-200';
                      }

                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono text-slate-800 font-semibold">{ev.event_time}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Packet: ${ev.packet_type} (ID: {ev.alert_id})</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{ev.registration_number}</div>
                            <div className="text-[11px] text-slate-500">{ev.make} {ev.vehicle_model} &bull; {ev.category_name}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                            {ev.driver_name}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeBg}`}>
                              {ev.event_type.replace('_', ' ')}
                            </span>
                            {ev.severity === 'CRITICAL' && (
                              <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-rose-600" title="Critical Event"></span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900">{ev.metric_value}</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                            {ev.threshold_value}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono">
                            <span className="font-semibold text-slate-800">{ev.speed} km/h</span>
                            <span className="text-slate-400 text-[11px] ml-1">({ev.heading}&deg;)</span>
                          </td>
                          <td className="py-3 px-4 max-w-[200px] truncate text-slate-600" title={ev.address}>
                            {ev.address}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <a
                              href={ev.osmLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-sky-600 hover:text-sky-800 font-medium text-xs hover:underline"
                            >
                              <span>OpenStreetMap</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Driver & Vehicle Safety Scorecard */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Fleet Driver Safety Ranking & Scorecard
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Scoring algorithm penalizes Vehicle Tilt (-10), Rash Driving (-4), Harsh Braking (-3), Harsh Accel (-2), and Overspeeding (-2).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Vehicle & Driver</th>
                    <th className="py-3 px-4">Safety Score</th>
                    <th className="py-3 px-4 text-center">Harsh Braking</th>
                    <th className="py-3 px-4 text-center">Harsh Accel</th>
                    <th className="py-3 px-4 text-center">Vehicle Tilt</th>
                    <th className="py-3 px-4 text-center">Rash Driving</th>
                    <th className="py-3 px-4 text-center">Overspeeding</th>
                    <th className="py-3 px-4 text-right">Risk Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {leaderboard.map(item => (
                    <tr key={item.vehicleId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        #{item.rank}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{item.registrationNumber}</div>
                        <div className="text-[11px] text-slate-500">{item.driverName} &bull; {item.vehicleName}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap min-w-[140px]">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-slate-900">{item.safetyScore}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.safetyScore >= 85
                                  ? 'bg-emerald-500'
                                  : item.safetyScore >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${item.safetyScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-amber-700">
                        {item.harshBraking}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-orange-700">
                        {item.harshAccel}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">
                        {item.vehicleTilt}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-purple-700">
                        {item.rashDriving}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-sky-700">
                        {item.overspeeding}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            item.riskTier === 'Safe'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : item.riskTier === 'Moderate Risk'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {item.riskTier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Interactive OpenStreetMap Incident Pins */}
      {activeTab === 'map' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-4 text-xs font-medium">
              <span className="text-slate-500">Legend:</span>
              <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> <span>Harsh Braking</span></span>
              <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> <span>Harsh Accel</span></span>
              <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded-full bg-rose-600 inline-block"></span> <span>Vehicle Tilt (Critical)</span></span>
              <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> <span>Rash Driving</span></span>
              <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded-full bg-sky-600 inline-block"></span> <span>Overspeeding</span></span>
            </div>
            <span className="text-xs text-slate-500 font-mono">OpenStreetMap Tiles Engine</span>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-[550px] rounded-xl border border-slate-200 shadow-sm z-0 relative"
          ></div>
        </div>
      )}

      {/* 7. Tab 4: AIS-140 IMU Configuration & Command Generator */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">AIS-140 IMU Telematics Sensor Configuration</h2>
              <p className="text-xs text-slate-500">
                Configure acceleration, tilt and speed thresholds on ARAI-certified tnavIC-140 hardware trackers.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-600">Select Tracker:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  fetchDeviceConfig(e.target.value);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 font-mono"
              >
                <option value="dev_101">dev_101 (IMEI 864201045892110)</option>
                <option value="dev_102">dev_102 (IMEI 864201045892111)</option>
                <option value="dev_104">dev_104 (IMEI 864201045892113)</option>
                <option value="dev_106">dev_106 (IMEI 864201045892115)</option>
                <option value="dev_107">dev_107 (IMEI 864201045892116)</option>
              </select>
            </div>
          </div>

          {configSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{configSuccess}</span>
            </div>
          )}

          {imuConfig && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. Harsh Braking Threshold (HBT) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Harsh Braking Threshold (HBT)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">Limit in g (m/s²). Default 0.55g</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="2.0"
                    value={imuConfig.harsh_brake_threshold}
                    onChange={(e) => setImuConfig({ ...imuConfig, harsh_brake_threshold: parseFloat(e.target.value) || 0.55 })}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold"
                  />
                  <span className="text-xs text-slate-600 font-mono">g</span>
                </div>
              </div>

              {/* 2. Harsh Acceleration Threshold (HAT) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. Harsh Acceleration Threshold (HAT)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">Limit in g (m/s²). Default 0.43g</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="2.0"
                    value={imuConfig.harsh_accel_threshold}
                    onChange={(e) => setImuConfig({ ...imuConfig, harsh_accel_threshold: parseFloat(e.target.value) || 0.43 })}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold"
                  />
                  <span className="text-xs text-slate-600 font-mono">g</span>
                </div>
              </div>

              {/* 3. Tilt Angle (TA) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  3. Tilt Angle Threshold (TA)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">Minimum tilt in degrees for alert. Default 45°</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="1"
                    min="15"
                    max="90"
                    value={imuConfig.tilt_angle_threshold}
                    onChange={(e) => setImuConfig({ ...imuConfig, tilt_angle_threshold: parseFloat(e.target.value) || 45.0 })}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold"
                  />
                  <span className="text-xs text-slate-600 font-mono">deg</span>
                </div>
              </div>

              {/* 4. Rash Turning Threshold (RTT) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  4. Rash Turning Speed Threshold (RTT)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">Speed limit during cornering. Default 30 km/h</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="80"
                    value={imuConfig.rash_turning_speed}
                    onChange={(e) => setImuConfig({ ...imuConfig, rash_turning_speed: parseFloat(e.target.value) || 30.0 })}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold"
                  />
                  <span className="text-xs text-slate-600 font-mono">km/h</span>
                </div>
              </div>

              {/* 5. Speed Limit (SL) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  5. Overspeeding Limit (SL)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">Vehicle speed limit in km/h. Default 70 km/h</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="1"
                    min="20"
                    max="140"
                    value={imuConfig.speed_limit}
                    onChange={(e) => setImuConfig({ ...imuConfig, speed_limit: parseFloat(e.target.value) || 70.0 })}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold"
                  />
                  <span className="text-xs text-slate-600 font-mono">km/h</span>
                </div>
              </div>

              {/* 6. Motion Assistance (IMU HTA) */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  6. Lateral Acceleration G (HTA)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">Harsh turning lateral g-force. Default 0.47g</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={imuConfig.harsh_turning_g}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono text-slate-500"
                  />
                  <span className="text-xs text-slate-600 font-mono">g</span>
                </div>
              </div>
            </div>
          )}

          {/* Generated AIS-140 Command Box */}
          <div className="bg-slate-900 rounded-lg p-4 text-white space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono uppercase tracking-wider">AIS-140 OTA Command (Section 25 / tnavIC Protocol)</span>
              <span>Command Type: [SET]</span>
            </div>
            <div className="font-mono text-xs text-sky-400 bg-slate-950 p-2.5 rounded border border-slate-800">
              SET HBT:{imuConfig?.harsh_brake_threshold},HAT:{imuConfig?.harsh_accel_threshold},TA:{imuConfig?.tilt_angle_threshold},RTT:{imuConfig?.rash_turning_speed},SL:{imuConfig?.speed_limit}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveIMUConfig}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
            >
              Save & Dispatch OTA Configuration to Device
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverIntelligenceView;
