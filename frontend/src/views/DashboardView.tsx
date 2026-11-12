import React, { useState, useEffect } from 'react';
import {
  Truck,
  Play,
  Square,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Search,
  ExternalLink
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { VehicleLocation, DashboardStats } from '../types';
import FleetMap from '../components/FleetMap';

interface DashboardViewProps {
  onNavigateTo: (tab: any) => void;
  onSelectVehicleForLive?: (veh: VehicleLocation) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTo, onSelectVehicleForLive }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    movingVehicles: 0,
    stoppedVehicles: 0,
    idleVehicles: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    todayPanicAlerts: 0,
    overspeedingAlerts: 0
  });

  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      const statsRes = await apiFetch<{ kpis: DashboardStats; recentAlerts: any[] }>('/tracking/dashboard-stats');
      setStats(statsRes.kpis);
      setRecentAlerts(statsRes.recentAlerts || []);

      const vehRes = await apiFetch<VehicleLocation[]>('/tracking/live');
      setVehicles(vehRes);
      if (vehRes.length > 0 && !selectedVehicle) {
        setSelectedVehicle(vehRes[0]);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredVehicles = vehicles.filter(v => {
    const matchesCategory = categoryFilter === 'all' || v.category_code === categoryFilter;
    const matchesStatus = statusFilter === 'all' || v.movement_status === statusFilter;
    const matchesSearch = !searchQuery || 
      v.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.make && v.make.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.imei && v.imei.includes(searchQuery));
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Fleet Operations Dashboard</h1>
          <p className="text-xs text-slate-500">Real-time AIS-140 GPS telematics, emergency monitoring and vehicle health</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchData}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 shadow-xs"
          >
            Refresh Telematics
          </button>
          <button
            onClick={() => onNavigateTo('live-tracking')}
            className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 rounded-lg text-white shadow-xs flex items-center space-x-1"
          >
            <span>Live Full Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 8 Summary KPI Cards (Section 5 Requirements) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Vehicles */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Vehicles</span>
            <Truck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalVehicles}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Registered Fleet</div>
        </div>

        {/* Moving Vehicles */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Moving</span>
            <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.movingVehicles}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Speed &gt; 3 km/h</div>
        </div>

        {/* Stopped Vehicles */}
        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Stopped</span>
            <Square className="w-4 h-4 text-rose-600 fill-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{stats.stoppedVehicles}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Ignition OFF</div>
        </div>

        {/* Idle Vehicles */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Idle</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.idleVehicles}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Ignition ON, 0 km/h</div>
        </div>

        {/* Online GPS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Online GPS</span>
            <Wifi className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.onlineDevices}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">AIS-140 connected</div>
        </div>

        {/* Offline GPS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Offline GPS</span>
            <WifiOff className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-600">{stats.offlineDevices}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">No signal &gt; 10m</div>
        </div>

        {/* Today's Panic Alerts */}
        <div className="bg-white p-3.5 rounded-xl border border-rose-300 shadow-xs bg-rose-50/40">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Panic Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{stats.todayPanicAlerts}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Today's SOS</div>
        </div>

        {/* Overspeeding Alerts */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-300 shadow-xs bg-amber-50/30">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overspeed</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.overspeedingAlerts}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Limit violations</div>
        </div>
      </div>

      {/* Map & Recent Alerts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Live Vehicle Map</h2>
              <p className="text-[11px] text-slate-500">Live coordinates via WebSocket. Click any marker for vehicle telemetry.</p>
            </div>
            
            {/* Filters */}
            <div className="flex items-center space-x-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
              >
                <option value="all">All Categories</option>
                <option value="truck">Trucks</option>
                <option value="bus">Buses</option>
                <option value="taxi">Taxis</option>
                <option value="car">Cars</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
              >
                <option value="all">All Status</option>
                <option value="moving">Moving</option>
                <option value="stopped">Stopped</option>
                <option value="idle">Idle</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="flex-1 min-h-[380px]">
            <FleetMap
              vehicles={filteredVehicles}
              selectedVehicleId={selectedVehicle?.vehicle_id}
              onSelectVehicle={veh => setSelectedVehicle(veh)}
              height="400px"
            />
          </div>
        </div>

        {/* Right Col: Selected Vehicle Telemetry & Recent Alerts */}
        <div className="space-y-4">
          {/* Active Vehicle Info Card */}
          {selectedVehicle ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-base font-extrabold text-slate-900 tracking-tight">{selectedVehicle.registration_number}</span>
                  <div className="text-xs text-slate-500">{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.category_name})</div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  selectedVehicle.movement_status === 'moving' ? 'bg-emerald-100 text-emerald-800' :
                  selectedVehicle.movement_status === 'stopped' ? 'bg-rose-100 text-rose-800' :
                  selectedVehicle.movement_status === 'idle' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {selectedVehicle.movement_status?.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Speed</span>
                  <span className="text-base font-bold text-slate-800">{selectedVehicle.speed} <span className="text-xs font-normal text-slate-500">km/h</span></span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ignition</span>
                  <span className={`font-semibold ${selectedVehicle.ignition ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {selectedVehicle.ignition ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Device IMEI</span>
                  <span className="font-mono text-slate-700">{selectedVehicle.imei || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Battery / Power</span>
                  <span className="text-slate-700 font-medium">{selectedVehicle.backup_battery_pct || 95}% (Main: {selectedVehicle.main_power ? 'OK' : 'Cut'})</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span className="font-medium text-slate-700">Location:</span> {selectedVehicle.address || 'Hinjawadi, Pune'}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selectedVehicle.latitude}&mlon=${selectedVehicle.longitude}#map=16/${selectedVehicle.latitude}/${selectedVehicle.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
                >
                  <span>OpenStreetMap View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => onNavigateTo('live-tracking')}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded"
                >
                  Track Solo
                </button>
              </div>
            </div>
          ) : null}

          {/* Route Replay Quick Launch Card */}
          <div className="bg-gradient-to-br from-navy-950 to-navy-900 text-white rounded-xl shadow-xs p-4 space-y-2.5 border border-navy-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Play className="w-4 h-4 text-sky-400 fill-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300">Route Replay Dashboard</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                90-Day Telematics
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Inspect historical vehicle trips with animated waypoint scrubbing, stop audits, and telemetry replay on OpenStreetMap.
            </p>
            <div className="pt-2 border-t border-navy-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Recent: Nigdi ➔ Hinjawadi (38.4 km)</span>
              <button
                onClick={() => onNavigateTo('trips')}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-[11px] flex items-center space-x-1 shadow-sm transition"
              >
                <span>Launch Replay</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Recent Alerts Feed (Section 5.B Requirements) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Recent Alerts</h3>
              <button onClick={() => onNavigateTo('panic')} className="text-[11px] text-sky-600 font-semibold hover:underline">
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {recentAlerts.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">No recent alerts recorded.</div>
              ) : (
                recentAlerts.map(alert => (
                  <div key={alert.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{alert.registration_number}</span>
                        <span className="text-[10px] font-semibold text-rose-600 px-1.5 py-0.2 bg-rose-50 rounded">
                          {alert.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">{alert.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{alert.address}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Status Table (Section 5.C Requirements) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Vehicle Status Fleet Table</h2>
            <p className="text-xs text-slate-500">Live telematics status for all registered vehicles</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search vehicle number or IMEI..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Vehicle Number</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">GPS Status</th>
                <th className="py-3 px-4">Current Speed</th>
                <th className="py-3 px-4">Ignition</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map(veh => (
                <tr key={veh.vehicle_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {veh.registration_number}
                    <div className="text-[10px] font-normal text-slate-400">{veh.make} {veh.model}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{veh.category_name}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      veh.movement_status === 'moving' ? 'bg-emerald-100 text-emerald-800' :
                      veh.movement_status === 'stopped' ? 'bg-rose-100 text-rose-800' :
                      veh.movement_status === 'idle' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        veh.movement_status === 'moving' ? 'bg-emerald-500' :
                        veh.movement_status === 'stopped' ? 'bg-rose-500' :
                        veh.movement_status === 'idle' ? 'bg-amber-500' : 'bg-slate-400'
                      }`}></span>
                      {veh.movement_status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {veh.speed} km/h
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${veh.ignition ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {veh.ignition ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-[220px] truncate" title={veh.address}>
                    {veh.address || 'Pune Corridor'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedVehicle(veh);
                        onNavigateTo('live-tracking');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded"
                    >
                      Track
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
