import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  BatteryCharging,
  Zap,
  AlertTriangle,
  Radio,
  Send,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Plus,
  X
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { GPSDevice } from '../types';

const PACKET_SAMPLES = {
  ais140: '$PVT,864201045892110,12112026,143000,18.591200,N,073.738900,E,55.0,85.0,14,560,1,1,0,0*7F',
  'navic-nmea': '$GNRMC,143000.00,A,1835.4720,N,07344.3340,E,29.70,85.0,131126,,,A*7F\n$GNGGA,143000.00,1835.4720,N,07344.3340,E,1,14,0.8,560.0,M,0.0,M,,*44',
  json: `{
  "imei": "864201045892110",
  "latitude": 18.5912,
  "longitude": 73.7389,
  "speedKmh": 42,
  "heading": 90,
  "ignition": 1,
  "satellites": 12
}`,
  teltonika: `{
  "imei": "864201045892112",
  "lat": 18.5204,
  "lng": 73.8567,
  "speed": 32,
  "angle": 220,
  "sat": 12,
  "io": { "ignition": 1 }
}`
};

export const DeviceManagementView: React.FC = () => {
  const [devices, setDevices] = useState<GPSDevice[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, online: 0, offline: 0, tampered: 0, powerDisconnected: 0 });
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isTestPacketOpen, setIsTestPacketOpen] = useState<boolean>(false);
  const [ingestProtocol, setIngestProtocol] = useState<'ais140' | 'navic-nmea' | 'json' | 'teltonika'>('ais140');
  const [testImei, setTestImei] = useState<string>('864201045892110');
  const [testPayload, setTestPayload] = useState<string>(PACKET_SAMPLES.ais140);
  const [testResponse, setTestResponse] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // New device form
  const [newDevice, setNewDevice] = useState({
    imei: '',
    manufacturer_id: 'mfg_ais140',
    model: 'AX-140-Pro',
    sim_number: '',
    firmware_version: 'v2.1.0-AIS'
  });

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ devices: GPSDevice[]; stats: any }>('/devices');
      setDevices(res.devices);
      setStats(res.stats);

      const logs = await apiFetch<any[]>('/devices/raw-logs');
      setRawLogs(logs);

      const mfgs = await apiFetch<any[]>('/vehicles/manufacturers');
      setManufacturers(mfgs);
    } catch (err) {
      console.error('Failed to load device telematics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/devices', {
        method: 'POST',
        body: JSON.stringify(newDevice)
      });
      setIsRegisterModalOpen(false);
      fetchDevices();
      alert('GPS Device registered successfully!');
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const handleSendTestPacket = async () => {
    try {
      let body: Record<string, unknown>;
      if (ingestProtocol === 'json' || ingestProtocol === 'teltonika') {
        body = JSON.parse(testPayload);
        body.protocol = ingestProtocol;
      } else {
        body = {
          protocol: ingestProtocol,
          packet: testPayload,
          imei: testImei || undefined
        };
      }
      const res = await apiFetch('/devices/ingest', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      setTestResponse(res);
      fetchDevices();
    } catch (err: any) {
      setTestResponse({ error: err.message, committed: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AIS-140 GPS Device Health & Gateway</h1>
          </div>
          <p className="text-xs text-slate-500">Hardware connectivity monitoring, battery state, tamper detection, and raw NMEA telemetry logs</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsTestPacketOpen(!isTestPacketOpen)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 shadow-xs flex items-center space-x-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>AIS-140 Packet Tester</span>
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 rounded-lg text-white shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register Device</span>
          </button>
        </div>
      </div>

      {/* 5 Hardware Health KPI Cards (Section 12 Requirements) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total GPS Devices</span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Hardware Inventory</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Online Devices</span>
            <Wifi className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.online}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Transmitting live data</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Offline Devices</span>
            <WifiOff className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-600">{stats.offline}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">No signal &gt; 10 min</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Power Cuts</span>
            <Zap className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{stats.powerDisconnected}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">On internal backup battery</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tamper Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.tampered}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Enclosure switch tripped</div>
        </div>
      </div>

      {/* Interactive Packet Ingestion Testing Tool (Section 9 & 12 Requirements) */}
      {isTestPacketOpen && (
        <div className="bg-slate-900 rounded-xl p-4 text-slate-200 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Hardware Ingestion & Canonical Telemetry
              </h3>
            </div>
            <button onClick={() => setIsTestPacketOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Payloads are normalized to one canonical telemetry document and committed with BEGIN IMMEDIATE before the gateway returns an ACK.
          </p>

          <div className="flex flex-wrap gap-2">
            {([
              ['ais140', 'AIS-140'],
              ['navic-nmea', 'NavIC NMEA'],
              ['json', 'JSON'],
              ['teltonika', 'Teltonika JSON']
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setIngestProtocol(id);
                  setTestPayload(PACKET_SAMPLES[id]);
                  setTestResponse(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                  ingestProtocol === id
                    ? 'bg-sky-600 border-sky-500 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {(ingestProtocol === 'ais140' || ingestProtocol === 'navic-nmea') && (
              <input
                value={testImei}
                onChange={e => setTestImei(e.target.value)}
                placeholder="IMEI (required for NavIC sentences)"
                className="w-full bg-slate-950 font-mono text-xs p-2.5 rounded-lg border border-slate-700 text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
            )}
            <textarea
              rows={ingestProtocol === 'ais140' ? 2 : 6}
              value={testPayload}
              onChange={e => setTestPayload(e.target.value)}
              className="w-full bg-slate-950 font-mono text-xs p-2.5 rounded-lg border border-slate-700 text-sky-300 focus:outline-hidden focus:border-sky-500"
            />

            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400">
                {ingestProtocol === 'ais140' && <code>$PVT / $ALT / $SOS</code>}
                {ingestProtocol === 'navic-nmea' && <code>$GNRMC + $GNGGA. Speed in the sentence is knots.</code>}
                {ingestProtocol === 'json' && <code>{'{ imei, latitude, longitude, speedKmh }'}</code>}
                {ingestProtocol === 'teltonika' && <code>Decoded JSON. Raw CODEC8 frames are rejected until a decoder is registered.</code>}
              </div>
              <button
                onClick={handleSendTestPacket}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simulate Ingest Packet</span>
              </button>
            </div>
          </div>

          {testResponse && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
              <pre>{JSON.stringify(testResponse, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* GPS Devices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Connected Telematics Hardware Inventory</h2>
          <button onClick={fetchDevices} className="text-slate-500 hover:text-slate-800 p-1" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Device IMEI</th>
                <th className="py-3 px-4">Manufacturer & Model</th>
                <th className="py-3 px-4">Mapped Vehicle</th>
                <th className="py-3 px-4">Connection Status</th>
                <th className="py-3 px-4">Power Source</th>
                <th className="py-3 px-4">Internal Battery</th>
                <th className="py-3 px-4">GPS Satellites</th>
                <th className="py-3 px-4">Firmware / Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map(dev => (
                <tr key={dev.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{dev.imei}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{dev.manufacturer_name}</div>
                    <div className="text-[10px] text-slate-400">{dev.model}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {dev.registration_number ? (
                      <span className="font-bold text-slate-900">{dev.registration_number}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unmapped</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      dev.status === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dev.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      {dev.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {dev.main_power_connected ? (
                      <span className="text-emerald-700 font-semibold text-[11px]">Vehicle 12V/24V</span>
                    ) : (
                      <span className="text-rose-600 font-bold text-[11px]">DISCONNECTED</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-12 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dev.backup_battery_pct > 50 ? 'bg-emerald-500' : dev.backup_battery_pct > 20 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${dev.backup_battery_pct}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-slate-700 text-[11px]">{dev.backup_battery_pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {dev.satellites || 12} Sats (Fixed)
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                      {dev.firmware_version} • AIS-140
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw AIS-140 Packet Audit Logs Viewer (Section 9 Requirements) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Raw Telematics Packet Logs (MoRTH Compliance Audit)</h2>
            <p className="text-[11px] text-slate-500">Live incoming ASCII frames captured at backend TCP/HTTP gateway</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Received Time</th>
                <th className="py-2.5 px-3">IMEI</th>
                <th className="py-2.5 px-3">Packet Type</th>
                <th className="py-2.5 px-3">Raw Payload</th>
                <th className="py-2.5 px-3">Validity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {rawLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{log.received_at}</td>
                  <td className="py-2 px-3 font-bold text-slate-800">{log.imei}</td>
                  <td className="py-2 px-3 text-sky-700 font-semibold">{log.packet_type}</td>
                  <td className="py-2 px-3 text-slate-600 break-all">{log.raw_payload}</td>
                  <td className="py-2 px-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${log.is_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {log.is_valid ? 'VALID' : 'INVALID'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Device Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Register New GPS Telematics Device</h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">IMEI Number (15 Digits) *</label>
                <input
                  type="text"
                  required
                  placeholder="864201045892999"
                  value={newDevice.imei}
                  onChange={e => setNewDevice({ ...newDevice, imei: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Device Manufacturer *</label>
                <select
                  value={newDevice.manufacturer_id}
                  onChange={e => setNewDevice({ ...newDevice, manufacturer_id: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                >
                  {manufacturers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Model Name</label>
                <input
                  type="text"
                  value={newDevice.model}
                  onChange={e => setNewDevice({ ...newDevice, model: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">M2M eSIM Number</label>
                <input
                  type="text"
                  placeholder="+91 9988112233"
                  value={newDevice.sim_number}
                  onChange={e => setNewDevice({ ...newDevice, sim_number: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagementView;
