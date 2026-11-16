import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Crosshair,
  Compass,
  Zap,
  Gauge,
  Navigation,
  ExternalLink,
  Radio,
  Layers,
  MapPin
} from 'lucide-react';
import { apiFetch, telematicsWS } from '../services/api';
import { VehicleLocation } from '../types';
import FleetMap from '../components/FleetMap';

export const LiveTrackingView: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [followVehicle, setFollowVehicle] = useState<boolean>(true);
  const [showTrail, setShowTrail] = useState<boolean>(true);
  const [trailPoints, setTrailPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const selectedVehicleIdRef = useRef<string | null>(null);
  selectedVehicleIdRef.current = selectedVehicleId;

  const rememberTrailPoint = (point: { latitude?: number; longitude?: number; speed?: number; heading?: number }) => {
    if (point.latitude == null || point.longitude == null) return;
    setTrailPoints(tp => {
      const last = tp[tp.length - 1];
      if (last && last.latitude === point.latitude && last.longitude === point.longitude && last.speed === point.speed) {
        return tp;
      }
      return [...tp, point];
    });
  };

  // Fetch initial live positions
  const fetchVehicles = async () => {
    try {
      const data = await apiFetch<VehicleLocation[]>('/tracking/live');
      setVehicles(data);
      const withFix = data.filter(veh => Number.isFinite(veh.latitude) && Number.isFinite(veh.longitude));
      const newest = [...withFix].sort((a, b) => String(b.gps_time || '').localeCompare(String(a.gps_time || '')))[0];
      if (!selectedVehicleIdRef.current && newest) {
        setSelectedVehicleId(newest.vehicle_id);
      }
      const selected = data.find(v => v.vehicle_id === (selectedVehicleIdRef.current || newest?.vehicle_id));
      if (selected) rememberTrailPoint(selected);
    } catch (err) {
      console.error('Error fetching live positions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();

    // Subscribe to WebSocket real-time location stream
    const unsubscribe = telematicsWS.subscribe(msg => {
      if (msg.type === 'LOCATION_UPDATE') {
        const { vehicleId, latitude, longitude, speed, heading, movementStatus, ignition } = msg.data;
        setVehicles(prev =>
          prev.map(v =>
            v.vehicle_id === vehicleId
              ? { ...v, latitude, longitude, speed, heading, ignition: ignition ?? v.ignition, movement_status: movementStatus }
              : v
          )
        );

        if ((selectedVehicleIdRef.current || vehicleId) === vehicleId) {
          rememberTrailPoint({ latitude, longitude, speed, heading });
        }
      }
    });

    const poll = setInterval(fetchVehicles, 5000);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, []);

  // Fetch trail when vehicle changes
  useEffect(() => {
    if (!selectedVehicleId) return;
    apiFetch<any[]>(`/tracking/trail/${selectedVehicleId}`)
      .then(pts => setTrailPoints(pts))
      .catch(() => setTrailPoints([]));
  }, [selectedVehicleId]);

  const selectedVehicle = vehicles.find(v => v.vehicle_id === selectedVehicleId) || vehicles[0];

  const filteredVehicles = vehicles.filter(v => {
    const matchesCategory = categoryFilter === 'all' || v.category_code === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      v.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-3">
      {/* Top Controls Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
            <Radio className="w-4 h-4 text-sky-600 animate-pulse" />
            <span>AIS-140 Real-Time Telematics Map</span>
            <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">User data since today 00:00 hrs</span>
          </div>

          <div className="h-4 w-px bg-slate-200"></div>

          <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={followVehicle}
              onChange={e => setFollowVehicle(e.target.checked)}
              className="rounded text-sky-600 focus:ring-0"
            />
            <span className="font-medium">Auto-Follow Selected</span>
          </label>

          <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showTrail}
              onChange={e => setShowTrail(e.target.checked)}
              className="rounded text-sky-600 focus:ring-0"
            />
            <span className="font-medium">Show GPS Trail</span>
            <span className="text-[10px] text-slate-400">since today 00:00 hrs</span>
          </label>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="all">All Vehicle Types</option>
            <option value="truck">Trucks</option>
            <option value="bus">Buses</option>
            <option value="taxi">Taxis</option>
            <option value="car">Cars</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter vehicle..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 w-44"
            />
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Vehicle Selector / Right Map */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 min-h-0">
        {/* Left Col: Vehicle Selector List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Vehicles ({filteredVehicles.length})</span>
            <span className="text-[10px] text-sky-600 font-bold">LIVE TELEMATICS</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1 space-y-1">
            {filteredVehicles.map(veh => {
              const isSelected = veh.vehicle_id === selectedVehicleId;
              return (
                <div
                  key={veh.vehicle_id}
                  onClick={() => setSelectedVehicleId(veh.vehicle_id)}
                  className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-sky-50 border border-sky-200 text-sky-950 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{veh.registration_number}</div>
                    <div className="text-[11px] text-slate-500">{veh.make} {veh.model}</div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                      <span>{veh.speed} km/h</span>
                      <span>•</span>
                      <span>Ign: {veh.ignition ? 'ON' : 'OFF'}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      veh.movement_status === 'moving'
                        ? 'bg-emerald-100 text-emerald-800'
                        : veh.movement_status === 'towing'
                        ? 'bg-violet-100 text-violet-800'
                        : veh.movement_status === 'stopped'
                        ? 'bg-rose-100 text-rose-800'
                        : veh.movement_status === 'idle'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {veh.movement_status?.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 3 Cols: Interactive Map & HUD Card */}
        <div className="lg:col-span-3 flex flex-col space-y-3 relative">
          {/* Map */}
          <div className="flex-1 min-h-[350px]">
            <FleetMap
              vehicles={vehicles}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={v => setSelectedVehicleId(v.vehicle_id)}
              trailPoints={showTrail ? trailPoints : []}
              height="100%"
            />
          </div>

          {/* Floating Vehicle HUD Card (Section 7 Requirements) */}
          {selectedVehicle && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center font-bold">
                    <Navigation className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {selectedVehicle.registration_number}
                    </h2>
                    <div className="text-xs text-slate-500">
                      {selectedVehicle.make} {selectedVehicle.model} • IMEI: {selectedVehicle.imei}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedVehicle.latitude}&mlon=${selectedVehicle.longitude}#map=16/${selectedVehicle.latitude}/${selectedVehicle.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 rounded-lg border border-sky-200 flex items-center space-x-1"
                  >
                    <span>OpenStreetMap Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* HUD Telematics Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 text-xs">
                {/* Speed */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Speed</span>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedVehicle.speed} <span className="text-xs font-normal text-slate-500">km/h</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Limit: {selectedVehicle.speed_limit} km/h</span>
                </div>

                {/* Heading & Direction */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Direction / Heading</span>
                  <div className="text-lg font-bold text-slate-900 flex items-center space-x-1">
                    <Compass className="w-4 h-4 text-sky-600" />
                    <span>{selectedVehicle.heading}°</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Azimuth Angle</span>
                </div>

                {/* Ignition Status */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ignition Status</span>
                  <div className={`text-lg font-bold ${selectedVehicle.ignition ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {selectedVehicle.ignition ? 'ON (Running)' : 'OFF'}
                  </div>
                  <span className="text-[10px] text-slate-400">Digital Input 1</span>
                </div>

                {/* Main Power & Battery */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Power / Battery</span>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedVehicle.backup_battery_pct || 98}%
                  </div>
                  <span className={`text-[10px] font-semibold ${selectedVehicle.main_power ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedVehicle.main_power ? 'Main Battery OK' : 'Main Cut (Backup)'}
                  </span>
                </div>

                {/* Coordinates */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Coordinates</span>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">
                    {selectedVehicle.latitude?.toFixed(4)}, {selectedVehicle.longitude?.toFixed(4)}
                  </div>
                  <span className="text-[10px] text-slate-400">WGS84 GPS Fix</span>
                </div>
              </div>

              {/* Location Address */}
              <div className="mt-3 text-[11px] text-slate-600 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span><strong>Address:</strong> {selectedVehicle.address || 'Address pending'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingView;
