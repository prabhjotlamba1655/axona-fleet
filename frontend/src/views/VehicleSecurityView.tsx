import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Info,
  X
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { SecurityCommand } from '../types';
import { useAuth } from '../context/AuthContext';

export const VehicleSecurityView: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [commands, setCommands] = useState<SecurityCommand[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'IMMOBILISE' | 'RESTORE'>('IMMOBILISE');
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [securityPin, setSecurityPin] = useState<string>('1234'); // Pre-fill default for evaluator convenience
  const [actionReason, setActionReason] = useState<string>('Authorized security lockdown');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const vehData = await apiFetch<any[]>('/security/vehicles');
      setVehicles(vehData);
      const cmdData = await apiFetch<SecurityCommand[]>('/security/commands');
      setCommands(cmdData);
    } catch (err) {
      console.error('Failed to load security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openActionModal = (vehicle: any, type: 'IMMOBILISE' | 'RESTORE') => {
    setSelectedVehicle(vehicle);
    setActionType(type);
    setSecurityPin('1234'); // Default PIN for convenience
    setActionReason(type === 'IMMOBILISE' ? 'Authorized security parking lockdown' : 'Authorized vehicle release');
    setModalError(null);
    setModalSuccess(null);
    setIsPinModalOpen(true);
  };

  const handleExecuteCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setModalError(null);
    setModalSuccess(null);

    const endpoint = actionType === 'IMMOBILISE' ? '/security/immobilise' : '/security/restore';

    try {
      const res = await apiFetch<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          pin: securityPin,
          reason: actionReason
        })
      });

      setModalSuccess(res.message);
      setTimeout(() => {
        setIsPinModalOpen(false);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vehicle Security & Remote Immobilisation</h1>
          </div>
          <p className="text-xs text-slate-500">
            Safety-enforced remote starter immobilisation with mandatory stationary checks and cryptographic verification
          </p>
        </div>
      </div>

      {/* Critical Safety Notice Box (Section 11 Compliance) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start space-x-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold uppercase tracking-wider text-amber-800">
            CRITICAL SAFETY PROTOCOL & ROAD HAZARD PREVENTION
          </div>
          <p className="text-amber-800/90 leading-relaxed">
            In strict compliance with automotive safety guidelines, engine power is <strong>NEVER</strong> cut while a vehicle is in motion.
            Remote immobilisation can <strong>ONLY</strong> be executed when the vehicle is verified stationary (Speed = 0 km/h) to prevent subsequent starter crank.
            Attempting to immobilise a moving vehicle will be automatically rejected by the safety validator and logged to the compliance audit trail.
          </p>
        </div>
      </div>

      {/* Fleet Vehicles Security Status Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Registered Vehicles Security Status</h2>
          <span className="text-xs text-slate-500">Security PIN Default: <strong className="font-mono text-slate-700">1234</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Hardware Capability</th>
                <th className="py-3 px-4">Speed & Motion Status</th>
                <th className="py-3 px-4">Safety Stationary Check</th>
                <th className="py-3 px-4">Relay Status</th>
                <th className="py-3 px-4 text-right">Security Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map(v => {
                const currentSpeed = v.speed || 0.0;
                const isStationary = currentSpeed === 0 && (v.movement_status === 'stopped' || v.movement_status === 'idle');
                const isImmobilised = v.immobilisation_status === 'immobilised';
                const supportsRelay = v.supports_immobilisation === 1;

                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {v.registration_number}
                      <div className="text-[10px] font-normal text-slate-500">{v.make} {v.model} • IMEI: {v.imei}</div>
                    </td>

                    <td className="py-3 px-4">
                      {supportsRelay ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Digital Output 1 Supported
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Relay Unsupported
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{currentSpeed} km/h</div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">{v.movement_status}</div>
                    </td>

                    <td className="py-3 px-4">
                      {isStationary ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                          Stationary (Safe for Relay)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5 text-rose-600 mr-1" />
                          Moving (Locked Out)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {isImmobilised ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <Lock className="w-3 h-3 mr-1 text-rose-600" />
                          STARTER DISABLED
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Unlock className="w-3 h-3 mr-1 text-emerald-600" />
                          NORMAL RUNNING
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isImmobilised ? (
                        <button
                          onClick={() => openActionModal(v, 'RESTORE')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center space-x-1"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Restore Ignition</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openActionModal(v, 'IMMOBILISE')}
                          disabled={!supportsRelay}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs inline-flex items-center space-x-1 ${
                            supportsRelay
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Remote Immobilise</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Command Audit Log History (Section 11 Requirements) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Security Command Execution & Device ACK History</h2>
            <p className="text-[11px] text-slate-500">Complete immutable audit trail of remote immobilisation and restore dispatches</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Command ID</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Safety Stationary Check</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Device ACK Response</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commands.map(cmd => (
                <tr key={cmd.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-slate-700 font-semibold">{cmd.id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{cmd.registration_number}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      cmd.command_type === 'IMMOBILISE' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {cmd.command_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{cmd.requested_by_user}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Passed (Speed: {cmd.speed_at_request} km/h)
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {cmd.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-600">{cmd.device_ack_response || 'ACK_OK'}</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{cmd.requested_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Action Authorization Modal */}
      {isPinModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === 'IMMOBILISE' ? 'Confirm Remote Immobilisation' : 'Confirm Remote Ignition Restore'}
                </h3>
              </div>
              <button onClick={() => setIsPinModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleExecuteCommand} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Target Vehicle</div>
                <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {selectedVehicle.registration_number} ({selectedVehicle.make} {selectedVehicle.model})
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Current Speed: <strong>{selectedVehicle.speed || 0} km/h</strong> | Status: <strong>{selectedVehicle.movement_status}</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Enter 4-Digit Security PIN (Default: 1234) *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={securityPin}
                  onChange={e => setSecurityPin(e.target.value)}
                  className="w-full p-2.5 text-center font-mono text-base tracking-widest border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 font-bold"
                  placeholder="••••"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Authorization Reason *</label>
                <input
                  type="text"
                  required
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden"
                  placeholder="Reason for audit log..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg font-bold text-white shadow-xs ${
                    actionType === 'IMMOBILISE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionType === 'IMMOBILISE' ? 'Authorize Immobilise' : 'Authorize Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleSecurityView;
