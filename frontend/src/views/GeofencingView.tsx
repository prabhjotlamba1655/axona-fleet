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
import { Geofence, Vehicle } from '../types';
import FleetMap from '../components/FleetMap';

export const GeofencingView: React.FC = () => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // New Geofence form
  const [newFence, setNewFence] = useState({
    name: '',
    description: '',
    fence_type: 'circle' as 'circle' | 'polygon',
    center_lat: 18.5912,
    center_lng: 73.7389,
    radius_meters: 1500,
    coordinates_json: '',
    alert_on_entry: true,
    alert_on_exit: true,
    speed_limit: 30,
    vehicle_ids: [] as string[]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const gfData = await apiFetch<Geofence[]>('/geofences');
      setGeofences(gfData);

      const vData = await apiFetch<Vehicle[]>('/vehicles');
      setVehicles(vData);

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
  }, []);

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const toggleVehicleAssignment = (vId: string) => {
    setNewFence(prev => {
      const exists = prev.vehicle_ids.includes(vId);
      return {
        ...prev,
        vehicle_ids: exists ? prev.vehicle_ids.filter(id => id !== vId) : [...prev.vehicle_ids, vId]
      };
    });
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
          onClick={() => {
            setNewFence({
              name: '',
              description: '',
              fence_type: 'circle',
              center_lat: 18.5912,
              center_lng: 73.7389,
              radius_meters: 1500,
              coordinates_json: '',
              alert_on_entry: true,
              alert_on_exit: true,
              speed_limit: 30,
              vehicle_ids: vehicles.map(v => v.id)
            });
            setIsCreateModalOpen(true);
          }}
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
          vehicles={[]}
          geofences={geofences}
          height="340px"
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Recent Geofence Events
          </h3>

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
                  placeholder="e.g. Pune City Distribution Hub"
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

              <div className="pt-2">
                <label className="block text-slate-700 font-bold mb-1">Assign Fleet Vehicles</label>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5 bg-slate-50">
                  {vehicles.map(v => (
                    <label key={v.id} className="flex items-center space-x-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={newFence.vehicle_ids.includes(v.id)}
                        onChange={() => toggleVehicleAssignment(v.id)}
                        className="rounded text-sky-600 focus:ring-0"
                      />
                      <span className="font-bold">{v.registration_number}</span>
                      <span className="text-[11px] text-slate-400">({v.make} {v.model})</span>
                    </label>
                  ))}
                </div>
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
