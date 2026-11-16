import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  AlertTriangle,
  Layers,
  CheckCircle2,
  X,
  Compass,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { Geofence, Vehicle, VehicleLocation } from '../types';
import FleetMap from '../components/FleetMap';

export const GeofencingView: React.FC = () => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [liveVehicles, setLiveVehicles] = useState<VehicleLocation[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [mapFocus, setMapFocus] = useState<[number, number] | null>(null);

  // New Geofence form
  const [newFence, setNewFence] = useState({
    name: '',
    description: '',
    fence_type: 'circle' as 'circle' | 'polygon',
    center_lat: 0,
    center_lng: 0,
    radius_meters: 1500,
    coordinates_json: '',
    alert_on_entry: true,
    alert_on_exit: true,
    speed_limit: '' as number | '',
    vehicle_ids: [] as string[]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const gfData = await apiFetch<Geofence[]>('/geofences');
      setGeofences(gfData);

      const vData = await apiFetch<Vehicle[]>('/vehicles');
      setVehicles(vData);

      const live = await apiFetch<VehicleLocation[]>('/tracking/live');
      setLiveVehicles(live);

      const evData = await apiFetch<any[]>('/geofences/events');
      setEvents(evData);
    } catch (err) {
      console.error('Failed to load geofences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, 5000);
    return () => clearInterval(poll);
  }, []);

  const livePosition = (vehicleId: string) => liveVehicles.find(v => v.vehicle_id === vehicleId && v.latitude && v.longitude);

  const applyVehicleFix = (vehicleId: string) => {
    const live = livePosition(vehicleId);
    setNewFence(prev => ({
      ...prev,
      vehicle_ids: vehicleId ? [vehicleId] : [],
      center_lat: live ? Number(live.latitude.toFixed(5)) : prev.center_lat,
      center_lng: live ? Number(live.longitude.toFixed(5)) : prev.center_lng
    }));
    if (live) setMapFocus([live.latitude, live.longitude]);
    return live;
  };

  const openCreate = () => {
    const located = [...liveVehicles]
      .filter(v => v.latitude && v.longitude)
      .sort((a, b) => String(b.gps_time || '').localeCompare(String(a.gps_time || '')))[0];
    const vehicleId = located?.vehicle_id || vehicles[0]?.id || '';
    setNewFence({
      name: '',
      description: '',
      fence_type: 'circle',
      center_lat: located ? Number(located.latitude.toFixed(5)) : 0,
      center_lng: located ? Number(located.longitude.toFixed(5)) : 0,
      radius_meters: 1500,
      coordinates_json: '',
      alert_on_entry: true,
      alert_on_exit: true,
      speed_limit: '',
      vehicle_ids: vehicleId ? [vehicleId] : []
    });
    if (located) setMapFocus([located.latitude, located.longitude]);
    setIsCreateModalOpen(true);
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFence.fence_type === 'circle' && (!newFence.center_lat || !newFence.center_lng)) {
      alert('Choose a vehicle with a current fix, or click the map, before saving.');
      return;
    }
    try {
      await apiFetch('/geofences', {
        method: 'POST',
        body: JSON.stringify(newFence)
      });
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Geofence creation failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete geofence "${name}"?`)) return;
    try {
      await apiFetch(`/geofences/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Geofencing & Spatial Zone Management</h1>
          </div>
          <p className="text-xs text-slate-500">
            Define circular yards or polygon boundary perimeters with automated entry, exit, and speed compliance alerts
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-xs flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Geofence Zone</span>
        </button>
      </div>

      {/* Map Overview with Geofence Overlays */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-2">Active Geofence Boundaries Map</h2>
        <FleetMap
          vehicles={liveVehicles}
          geofences={geofences}
          focus={mapFocus}
          height="340px"
          onMapClick={isCreateModalOpen ? (latitude, longitude) => {
            setNewFence(prev => ({ ...prev, center_lat: latitude, center_lng: longitude }));
            setMapFocus([latitude, longitude]);
          } : undefined}
          draftCircle={isCreateModalOpen && newFence.fence_type === 'circle' ? {
            latitude: newFence.center_lat,
            longitude: newFence.center_lng,
            radiusMeters: newFence.radius_meters
          } : null}
        />
      </div>

      {/* Geofences Grid & Breach History Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Geofence Cards */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active Zones ({geofences.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {geofences.map(fence => (
              <div key={fence.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm tracking-tight">{fence.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 uppercase">
                      {fence.fence_type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">{fence.description || 'Logistics perimeter'}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                    <div>
                      Radius / Dimensions: <strong>{fence.fence_type === 'circle' ? `${fence.radius_meters}m` : 'Polygon Coordinates'}</strong>
                    </div>
                    <div>
                      Alert Triggers: <strong>
                        {fence.alert_on_entry ? 'Entry ' : ''}
                        {fence.alert_on_exit ? 'Exit' : ''}
                      </strong>
                    </div>
                    <div>
                      Assigned Fleet: <strong>{fence.assigned_vehicles?.length || 0} Vehicles</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Breaches: {fence.event_count || 0}</span>
                  <button
                    onClick={() => handleDelete(fence.id, fence.name)}
                    className="text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Geofence Breach Events */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Recent Geofence Events
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">Entry and exit appear here, and on the dashboard, after the next GPS fix.</p>

          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">No breach events recorded.</div>
            ) : (
              events.map(ev => (
                <div key={ev.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ev.registration_number}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      ev.event_type === 'entry' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {ev.event_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{ev.geofence_name}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">{ev.event_time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Geofence Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Geofence Zone</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGeofence} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Geofence Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yard gate"
                  value={newFence.name}
                  onChange={e => setNewFence({ ...newFence, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Depot parking yard and warehouse facility"
                  value={newFence.description}
                  onChange={e => setNewFence({ ...newFence, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Geofence Shape</label>
                  <select
                    value={newFence.fence_type}
                    onChange={e => setNewFence({ ...newFence, fence_type: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                  >
                    <option value="circle">Circular Radial Zone</option>
                    <option value="polygon">Custom Polygon Perimeter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Radius (Meters)</label>
                  <input
                    type="number"
                    value={newFence.radius_meters}
                    onChange={e => setNewFence({ ...newFence, radius_meters: parseInt(e.target.value) || 1000 })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Center Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newFence.center_lat}
                    onChange={e => setNewFence({ ...newFence, center_lat: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Center Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newFence.center_lng}
                    onChange={e => setNewFence({ ...newFence, center_lng: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">Filled from the selected vehicle’s current parked fix. Click the map to move the center.</p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Zone speed limit (km/h, optional)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Leave empty for entry and exit only"
                  value={newFence.speed_limit}
                  onChange={e => setNewFence({ ...newFence, speed_limit: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2">
                <label className="block text-slate-700 font-bold mb-1">Vehicle</label>
                <select
                  value={newFence.vehicle_ids[0] || ''}
                  onChange={e => applyVehicleFix(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} ({v.make} {v.model})</option>
                  ))}
                </select>
                {newFence.vehicle_ids[0] && !livePosition(newFence.vehicle_ids[0]) && (
                  <p className="text-[11px] text-amber-700 mt-1">This vehicle has no parked fix yet, so the center was not moved.</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeofencingView;
