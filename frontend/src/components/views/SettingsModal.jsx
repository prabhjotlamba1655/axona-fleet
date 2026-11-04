import React, { useState, useEffect } from 'react';
import { 
  Settings, X, ShieldCheck, Truck, Fuel, Cpu,
  Check, RefreshCw, Plus, Trash2, Edit 
} from 'lucide-react';
import { 
  registerOrUpdateVehicle, 
  fetchTankCalibration, 
  saveTankCalibrationPoint, 
  fetchRbacUsers 
} from '../../services/api';
import IotSensorView from './IotSensorView';

export default function SettingsModal({ initialTab = 'vehicle_reg', onClose, onVehicleSaved }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'rbac', 'vehicle_reg', 'calibration', 'integrations'
  const [saving, setSaving] = useState(false);

  // Form State for Option B: Vehicle Registration with all required one-time parameters
  const [vehicleForm, setVehicleForm] = useState({
    id: 'VH-109',
    reg_no: 'MH-04-KF-9201',
    model: 'Tata Prima 5530.S (18-Wheeler)',
    oem_cph: '18.5',
    cph_buffer_percent: '25',
    num_wheels: '18',
    num_axles: '5',
    num_tanks: '2',
    tank_capacity_liters: '600',
    idle_alert_mins: '15',
    initial_engine_hours: '1450',
    service_due_gap_km: '10000',
    route_deviation_allowed_km: '40',
    geofence_mode: 'AUTO',
    geofence_perimeter_km: '15'
  });

  // RBAC Users State
  const [users, setUsers] = useState([]);

  // Calibration Table State
  const [calibPoints, setCalibPoints] = useState([]);
  const [newCalib, setNewCalib] = useState({ dip_mm: '100', volume_liters: '85', tank_index: '1' });

  useEffect(() => {
    fetchRbacUsers().then(data => setUsers(data)).catch(err => console.error(err));
    fetchTankCalibration('VH-101').then(data => setCalibPoints(data)).catch(err => console.error(err));
  }, []);

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await registerOrUpdateVehicle(vehicleForm);
      alert('Vehicle successfully registered with all OEM benchmarks, service gap & geofence rules!');
      if (onVehicleSaved) onVehicleSaved();
      onClose();
    } catch (err) {
      alert('Error saving vehicle: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCalibPoint = async (e) => {
    e.preventDefault();
    try {
      await saveTankCalibrationPoint({
        vehicle_id: 'VH-101',
        dip_mm: newCalib.dip_mm,
        volume_liters: newCalib.volume_liters,
        tank_index: newCalib.tank_index
      });
      const updated = await fetchTankCalibration('VH-101');
      setCalibPoints(updated);
    } catch (err) {
      alert('Error saving calibration point: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#0B152E] border border-cyan-500/50 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#070D1F] border-b border-[#1E2E56] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase font-['Chakra_Petch']">
                Axona System Settings & Master Configuration
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                RBAC Permissions • Vehicle One-Time Baseline Setup • Non-Linear Tank Calibration
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#1E2E56] bg-[#091126] px-5 pt-2 shrink-0 space-x-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('vehicle_reg')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-bold transition ${
              activeTab === 'vehicle_reg'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck size={14} />
            <span>B. Vehicle Registration (One-Time Parameters)</span>
          </button>

          <button
            onClick={() => setActiveTab('rbac')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-bold transition ${
              activeTab === 'rbac'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={14} />
            <span>A. RBAC (Roles & Permissions)</span>
          </button>

          <button
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-bold transition ${
              activeTab === 'calibration'
                ? 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fuel size={14} />
            <span>C. Tank Calibration Table</span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-bold transition ${
              activeTab === 'integrations'
                ? 'border-purple-400 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu size={14} />
            <span>D. Integrations & IoT Sensors</span>
          </button>
        </div>

        {/* Modal Tab Content Area */}
        <div className="flex-1 p-5 overflow-y-auto">
          {/* TAB B: VEHICLE REGISTRATION (ONE-TIME INPUTS) */}
          {activeTab === 'vehicle_reg' && (
            <form onSubmit={handleVehicleSubmit} className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-[11px] leading-relaxed">
                Configure one-time baselines for automatic fleet auditing: OEM Benchmark CPH, Buffer %, Wheel and Tank setup, Idle time alert cutoff, Engine Hours, Service Interval gap, and Route Deviation threshold.
              </div>

              {/* Basic Vehicle Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Vehicle Registration No</label>
                  <input
                    type="text"
                    value={vehicleForm.reg_no}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, reg_no: e.target.value })}
                    className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white font-bold"
                    placeholder="MH-12-RN-8842"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-slate-400 block mb-1">Vehicle Model & Configuration</label>
                  <input
                    type="text"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white"
                    required
                  />
                </div>
              </div>

              {/* Requirement: OEM Benchmark, Buffer % with OEM Benchmark Alert */}
              <div className="p-3 rounded-xl bg-[#080F26] border border-slate-700/80 space-y-3">
                <span className="text-amber-400 font-bold block uppercase">
                  1. Fuel Consumption & CPH Benchmarks
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">OEM Benchmark (CPH L/hr)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={vehicleForm.oem_cph}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, oem_cph: e.target.value })}
                      className="w-full bg-[#060B18] border border-amber-600/50 rounded p-2 text-amber-300 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Buffer % with OEM Alert (Default 25%)</label>
                    <input
                      type="number"
                      value={vehicleForm.cph_buffer_percent}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, cph_buffer_percent: e.target.value })}
                      className="w-full bg-[#060B18] border border-amber-600/50 rounded p-2 text-amber-300 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Alert Trigger CPH Threshold</label>
                    <div className="p-2 bg-[#060B18] rounded border border-slate-800 text-rose-400 font-bold">
                      &gt; {(parseFloat(vehicleForm.oem_cph || 18) * (1 + parseFloat(vehicleForm.cph_buffer_percent || 25) / 100)).toFixed(1)} L/hr
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement: Number of Wheels, Number of Tanks */}
              <div className="p-3 rounded-xl bg-[#080F26] border border-slate-700/80 space-y-3">
                <span className="text-cyan-400 font-bold block uppercase">
                  2. Chassis Axles, Wheels & Dual Tank Geometry
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">No. of Axles (Registered)</label>
                    <select
                      value={vehicleForm.num_axles || '5'}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, num_axles: e.target.value })}
                      className="w-full bg-[#060B18] border border-cyan-500/60 rounded p-2 text-cyan-300 font-bold"
                    >
                      <option value="2">2 Axles (Single Steer + Rear Drive)</option>
                      <option value="3">3 Axles (Steer + Dual Tandem Drive)</option>
                      <option value="4">4 Axles (Steer + Lift + Dual Drive)</option>
                      <option value="5">5 Axles (Dual Steer/Lift + Tandem + Trailer)</option>
                      <option value="6">6 Axles (Heavy Articulated Puller)</option>
                      <option value="7">7 Axles (Special Multi-Axle Modular)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Number of Wheels</label>
                    <select
                      value={vehicleForm.num_wheels}
                      onChange={(e) => {
                        const wheels = e.target.value;
                        const defaultAxles = wheels >= 22 ? '6' : wheels >= 16 ? '5' : wheels >= 12 ? '4' : wheels >= 10 ? '3' : '2';
                        setVehicleForm({ ...vehicleForm, num_wheels: wheels, num_axles: defaultAxles });
                      }}
                      className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white"
                    >
                      <option value="6">6 Wheels (Single Axle)</option>
                      <option value="10">10 Wheels (Multi-Axle)</option>
                      <option value="12">12 Wheels (Heavy Haulage)</option>
                      <option value="14">14 Wheels (Heavy Cargo)</option>
                      <option value="16">16 Wheels (Tipper / Container)</option>
                      <option value="18">18 Wheels (Tractor Trailer)</option>
                      <option value="22">22 Wheels (Special Puller)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Number of Tanks</label>
                    <select
                      value={vehicleForm.num_tanks}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, num_tanks: e.target.value })}
                      className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white"
                    >
                      <option value="1">1 Tank (Standard)</option>
                      <option value="2">2 Tanks (Dual with Equalizer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Total Tank Capacity (Liters)</label>
                    <input
                      type="number"
                      value={vehicleForm.tank_capacity_liters}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, tank_capacity_liters: e.target.value })}
                      className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Requirement: Idle Time setting, Initial Engine Hours, Service Due Km gap, Route Deviation Allowed Km, Geofencing perimeter */}
              <div className="p-3 rounded-xl bg-[#080F26] border border-slate-700/80 space-y-3">
                <span className="text-purple-400 font-bold block uppercase">
                  3. Alert Thresholds & Service Schedule
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-300 block mb-1">Idle Alert Setting (Minutes)</label>
                    <input
                      type="number"
                      value={vehicleForm.idle_alert_mins}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, idle_alert_mins: e.target.value })}
                      className="w-full bg-[#060B18] border border-purple-600/50 rounded p-2 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Initial Engine Hours</label>
                    <input
                      type="number"
                      value={vehicleForm.initial_engine_hours}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, initial_engine_hours: e.target.value })}
                      className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Service Due Gap (Km)</label>
                    <input
                      type="number"
                      value={vehicleForm.service_due_gap_km}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, service_due_gap_km: e.target.value })}
                      className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white"
                      placeholder="10000"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Route Deviation Allowed (Default 40km)</label>
                    <input
                      type="number"
                      value={vehicleForm.route_deviation_allowed_km}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, route_deviation_allowed_km: e.target.value })}
                      className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white"
                      placeholder="40"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Geofencing Perimeter Type</label>
                    <select
                      value={vehicleForm.geofence_mode}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, geofence_mode: e.target.value })}
                      className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white"
                    >
                      <option value="AUTO">AUTO (Dynamic Corridor Buffer)</option>
                      <option value="FIXED">FIXED (Strict Geospatial Polygon)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Geofence Corridor Radius (km)</label>
                    <input
                      type="number"
                      value={vehicleForm.geofence_perimeter_km}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, geofence_perimeter_km: e.target.value })}
                      className="w-full bg-[#060B18] border border-slate-700 rounded p-2 text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Vehicle Baseline to Master Register</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB A: RBAC (ROLE-BASED ACCESS CONTROL) */}
          {activeTab === 'rbac' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-[11px]">
                RBAC matrix defines permission tiers: Super Admin, Fleet Manager, Fuel Auditor, NOC 24/7 Controller, and Field Operator.
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-[#070D1F] border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <div>Name</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div className="text-center">Edit Config</div>
                  <div className="text-center">Ack Alerts</div>
                  <div className="text-center">Fuel Audit</div>
                </div>

                <div className="divide-y divide-slate-800">
                  {users.map(u => (
                    <div key={u.id} className="grid grid-cols-6 gap-2 px-3 py-2.5 items-center hover:bg-[#0E1C3D]">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-slate-400 truncate">{u.email}</div>
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {u.role}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={u.can_edit_settings ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                          {u.can_edit_settings ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={u.can_acknowledge_alerts ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                          {u.can_acknowledge_alerts ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={u.can_audit_fuel ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                          {u.can_audit_fuel ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB C: TANK CALIBRATION TABLE */}
          {activeTab === 'calibration' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px]">
                Non-linear calibration table translating sensor immersion dip (mm) to precise physical volume (Liters) accounting for dish ends, baffles, and tilt.
              </div>

              {/* Add Calibration Point Form */}
              <form onSubmit={handleAddCalibPoint} className="p-3 rounded-xl bg-[#080F26] border border-slate-800 flex items-center space-x-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">Sensor Dip (mm)</span>
                  <input
                    type="number"
                    value={newCalib.dip_mm}
                    onChange={(e) => setNewCalib({ ...newCalib, dip_mm: e.target.value })}
                    className="bg-[#060B18] border border-slate-700 rounded p-1.5 text-white w-28 font-bold"
                    required
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Calibrated Volume (L)</span>
                  <input
                    type="number"
                    value={newCalib.volume_liters}
                    onChange={(e) => setNewCalib({ ...newCalib, volume_liters: e.target.value })}
                    className="bg-[#060B18] border border-slate-700 rounded p-1.5 text-cyan-300 w-28 font-bold"
                    required
                  />
                </div>
                <div className="pt-3">
                  <button type="submit" className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center space-x-1">
                    <Plus size={14} />
                    <span>Add Curve Point</span>
                  </button>
                </div>
              </form>

              {/* Calibration Points Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-[#070D1F] border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <div>Step ID</div>
                  <div>Liquid Height (mm)</div>
                  <div>Calibrated Liters</div>
                  <div className="text-right">Volume / mm Ratio</div>
                </div>
                <div className="divide-y divide-slate-800">
                  {calibPoints.map((pt, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 px-3 py-2 hover:bg-[#0E1B3D]">
                      <div className="text-slate-400">P-{idx + 1}</div>
                      <div className="font-bold text-white">{pt.dip_mm} mm</div>
                      <div className="font-bold text-cyan-400">{pt.volume_liters} L</div>
                      <div className="text-right text-slate-400 font-mono">
                        {(pt.volume_liters / pt.dip_mm).toFixed(3)} L/mm
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB D: INTEGRATIONS & IOT SENSOR GATEWAY */}
          {activeTab === 'integrations' && (
            <div className="h-full">
              <IotSensorView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
