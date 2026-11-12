import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  Volume2,
  VolumeX,
  ExternalLink,
  CheckCircle,
  Clock,
  ShieldAlert,
  Send,
  Radio,
  FileText
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { PanicEvent } from '../types';
import audioAlert from '../services/audioService';
import FleetMap from '../components/FleetMap';

export const PanicAlertsView: React.FC = () => {
  const [panicEvents, setPanicEvents] = useState<PanicEvent[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<PanicEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorRemarks, setOperatorRemarks] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const fetchPanicAlerts = async () => {
    try {
      const url = statusFilter === 'all' ? '/panic' : `/panic?status=${statusFilter}`;
      const data = await apiFetch<PanicEvent[]>(url);
      setPanicEvents(data);

      if (data.length > 0 && !selectedAlert) {
        setSelectedAlert(data[0]);
      }

      // Check if any 'New' status panic alert exists; if so, trigger emergency audio alert
      const hasNewEmergency = data.some(d => d.status === 'New');
      if (hasNewEmergency && !audioAlert.getIsMuted()) {
        audioAlert.playPanicSiren();
      }
    } catch (err) {
      console.error('Error fetching panic alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanicAlerts();
    const interval = setInterval(fetchPanicAlerts, 5000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleUpdateStatus = async (newStatus: 'Acknowledged' | 'In Progress' | 'Resolved' | 'Closed') => {
    if (!selectedAlert) return;
    try {
      await apiFetch(`/panic/${selectedAlert.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: newStatus,
          remarks: operatorRemarks
        })
      });
      setOperatorRemarks('');
      audioAlert.stopAlarm();
      fetchPanicAlerts();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleSimulateEmergency = async () => {
    try {
      setIsSimulating(true);
      await apiFetch('/panic/simulate', {
        method: 'POST',
        body: JSON.stringify({ vehicleId: 'veh_1' })
      });
      audioAlert.playPanicSiren(4000);
      fetchPanicAlerts();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AIS-140 Emergency Panic Button Command Centre</h1>
          </div>
          <p className="text-xs text-slate-500">24/7 SOS hardware alert escalation, emergency dispatch, and audit trail</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => audioAlert.playPanicSiren(2500)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg shadow-xs flex items-center space-x-1"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Test Siren Sound</span>
          </button>

          <button
            onClick={handleSimulateEmergency}
            disabled={isSimulating}
            className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs flex items-center space-x-1.5 animate-pulse"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Simulate Hardware SOS Event</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Incident Cards / Right Details Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Incident Feed */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Emergency Incidents ({panicEvents.length})
            </span>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="New">New (Active SOS)</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {panicEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No panic incidents found. Use the simulation button to trigger a live test SOS!
              </div>
            ) : (
              panicEvents.map(alert => {
                const isSelected = selectedAlert?.id === alert.id;
                const isNew = alert.status === 'New';

                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`p-3.5 cursor-pointer transition flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-rose-50/70 border-l-4 border-rose-600'
                        : isNew
                        ? 'bg-rose-50/30 hover:bg-rose-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mt-0.5 ${isNew ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-sm">{alert.registration_number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alert.status === 'New' ? 'bg-rose-600 text-white animate-bounce' :
                          alert.status === 'Acknowledged' ? 'bg-amber-100 text-amber-800' :
                          alert.status === 'In Progress' ? 'bg-sky-100 text-sky-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {alert.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                        Owner: {alert.owner_name}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        {alert.address}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {alert.event_time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Cols: Incident Details & Action Response Console (Section 10 Requirements) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAlert ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
              {/* Emergency Banner Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                      MoRTH AIS-140 SOS EMERGENCY
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded">
                      STATUS: {selectedAlert.status.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                    {selectedAlert.registration_number}
                  </h2>
                  <div className="text-xs text-slate-500">
                    GPS Device IMEI: <span className="font-mono font-semibold">{selectedAlert.device_imei}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedAlert.latitude}&mlon=${selectedAlert.longitude}#map=16/${selectedAlert.latitude}/${selectedAlert.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 border border-sky-200 rounded-lg flex items-center space-x-1.5 shadow-xs"
                  >
                    <span>Open in OpenStreetMap</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Map of Incident Location */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Incident GPS Location
                </h3>
                <FleetMap
                  vehicles={[{
                    vehicle_id: selectedAlert.vehicle_id,
                    registration_number: selectedAlert.registration_number,
                    make: '',
                    model: '',
                    speed_limit: 80,
                    immobilisation_status: 'active',
                    category_name: 'Vehicle',
                    category_code: 'truck',
                    device_id: 'dev_sos',
                    imei: selectedAlert.device_imei,
                    device_status: 'online',
                    main_power_connected: 1,
                    backup_battery_pct: 95,
                    latitude: selectedAlert.latitude,
                    longitude: selectedAlert.longitude,
                    speed: selectedAlert.speed,
                    heading: 0,
                    ignition: 1,
                    movement_status: 'stopped',
                    main_power: 1,
                    panic_status: 1,
                    address: selectedAlert.address,
                    gps_time: selectedAlert.event_time
                  }]}
                  height="260px"
                />
              </div>

              {/* Emergency Contacts & Telematics Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Contact Phone */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Owner Contact</span>
                  <div className="font-bold text-slate-900 mt-1">{selectedAlert.owner_name}</div>
                  <a href={`tel:${selectedAlert.owner_phone}`} className="text-sky-600 font-bold block mt-0.5">
                    {selectedAlert.owner_phone}
                  </a>
                </div>

                {/* Emergency Contact */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Emergency SOS Contact</span>
                  <div className="font-bold text-rose-700 mt-1">Pre-configured SOS</div>
                  <a href={`tel:${selectedAlert.emergency_contact_phone}`} className="text-rose-600 font-bold block mt-0.5">
                    {selectedAlert.emergency_contact_phone}
                  </a>
                </div>

                {/* Speed at Incident */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Speed at Panic Event</span>
                  <div className="text-lg font-bold text-slate-900 mt-1">{selectedAlert.speed} km/h</div>
                  <span className="text-[10px] text-slate-400">Captured by Hardware</span>
                </div>

                {/* Activation Time */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Activation Time</span>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1">{selectedAlert.event_time}</div>
                  <span className="text-[10px] text-slate-400">Device Timestamp</span>
                </div>
              </div>

              {/* Operator Action / Escalation Workflow (Section 10 Requirements) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Operator Remarks & Escalation Action
                  </span>
                  {selectedAlert.acknowledged_by_name && (
                    <span className="text-[10px] text-slate-500">
                      Acknowledged by: <strong>{selectedAlert.acknowledged_by_name}</strong>
                    </span>
                  )}
                </div>

                <textarea
                  rows={2}
                  placeholder="Enter response notes (e.g. 'Driver contacted via phone; verified passenger medical emergency; notified police dispatch 112')..."
                  value={operatorRemarks}
                  onChange={e => setOperatorRemarks(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-sky-500"
                />

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {selectedAlert.status === 'New' && (
                    <button
                      onClick={() => handleUpdateStatus('Acknowledged')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs"
                    >
                      Acknowledge Incident
                    </button>
                  )}

                  {selectedAlert.status === 'Acknowledged' && (
                    <button
                      onClick={() => handleUpdateStatus('In Progress')}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs"
                    >
                      Mark In Progress (Dispatching Support)
                    </button>
                  )}

                  {(selectedAlert.status === 'Acknowledged' || selectedAlert.status === 'In Progress') && (
                    <button
                      onClick={() => handleUpdateStatus('Resolved')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                    >
                      Resolve Emergency
                    </button>
                  )}

                  {selectedAlert.status === 'Resolved' && (
                    <button
                      onClick={() => handleUpdateStatus('Closed')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs"
                    >
                      Close & Archive Incident
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Select an incident from the feed to view full telematics and operator actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanicAlertsView;
