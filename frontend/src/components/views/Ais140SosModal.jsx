import React, { useState } from 'react';
import { 
  AlertOctagon, X, Phone, Radio, MapPin, ShieldCheck, 
  CheckCircle2, Clock, Volume2, Send, AlertTriangle, ExternalLink
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Ais140SosModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [incidents, setIncidents] = useState([
    {
      id: 'SOS-2026-001',
      vehicle_no: 'MH-12-RN-8842',
      vehicle_id: 'VH-101',
      model: 'Tata Prima 5530.S (18-Wheeler)',
      driver_name: 'Rajesh Gurjar',
      driver_phone: '+91 98231 44019',
      owner_contact: '+91 94220 18492',
      trigger_time: '14:02:18 IST (18 mins ago)',
      location: 'Samruddhi Mahamarg Ch. 182, Jalna Bypass Corridor',
      coordinates: '19.8324° N, 75.8821° E',
      speed_kmh: 58,
      ignition: 'ON',
      trigger_source: 'Physical Panic Button 1 (Cabin Center Console)',
      police_jurisdiction: 'Jalna Rural Police HQ (Dial 112 / Call 02482-220112)',
      erss_status: 'DISPATCHED_TO_112',
      erss_ref_no: 'ERSS-MH-2026-948102',
      status: 'ACTIVE_EMERGENCY',
      burst_mode: '5-Second High Frequency Burst Active',
      siren_triggered: true,
      notes: ''
    },
    {
      id: 'SOS-2026-002',
      vehicle_no: 'DL-01-AX-9021',
      vehicle_id: 'VH-102',
      model: 'BharatBenz 3528R (12-Wheeler Reefer)',
      driver_name: 'Vikram Singh',
      driver_phone: '+91 98110 55231',
      owner_contact: '+91 98101 22941',
      trigger_time: '11:15:04 IST (Today)',
      location: 'Kotputli Industrial Area Gate 2, NH48',
      coordinates: '27.7051° N, 76.2008° E',
      speed_kmh: 0,
      ignition: 'OFF',
      trigger_source: 'Rear Cargo Door Panic Switch',
      police_jurisdiction: 'Kotputli Police Station (Dial 112 / Call 01421-222041)',
      erss_status: 'RESOLVED',
      erss_ref_no: 'ERSS-RJ-2026-881920',
      status: 'RESOLVED',
      burst_mode: 'Standard Interval (30s)',
      siren_triggered: false,
      notes: 'False trigger during cargo loading bay door alignment. Verified by Shift Lead.'
    }
  ]);

  const [activeTab, setActiveTab] = useState('ALL');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [successToast, setSuccessToast] = useState(null);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleDispatchErss = (incidentId) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          erss_status: 'DISPATCHED_TO_112',
          erss_ref_no: `ERSS-MH-2026-${Math.floor(100000 + Math.random() * 900000)}`
        };
      }
      return inc;
    }));
    showToast('🚨 Live coordinates, vehicle details & driver phone dispatched to State ERSS-112 Police Command!');
  };

  const handleResolveSos = (incidentId) => {
    if (!resolutionNote.trim()) {
      alert('Please enter resolution audit notes before clearing the emergency alert.');
      return;
    }
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: 'RESOLVED',
          siren_triggered: false,
          burst_mode: 'Standard Interval (30s)',
          notes: resolutionNote
        };
      }
      return inc;
    }));
    setResolvingId(null);
    setResolutionNote('');
    showToast('✅ SOS Emergency de-escalated and closed with audit note.');
  };

  const activeIncidents = incidents.filter(i => i.status === 'ACTIVE_EMERGENCY');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans ${
        isLight ? 'bg-white border-rose-300' : 'bg-[#080E24] border-rose-600/60 shadow-[0_0_50px_rgba(225,29,72,0.3)]'
      }`}>
        
        {/* Header with High-Priority Emergency Banner */}
        <div className="p-4 bg-gradient-to-r from-rose-900/90 via-rose-950 to-red-900 border-b border-rose-500/50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-lg animate-pulse">
              <AlertOctagon size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
                  AIS-140 Panic Button Emergency Queue
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-rose-900 animate-pulse">
                  MoRTH / ERSS 112
                </span>
              </div>
              <p className="text-xs text-rose-200/90 font-mono mt-0.5">
                Physical in-cabin distress switches with instant State Police 112 gateway dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-black/40 border border-rose-400/40 text-rose-200 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>{activeIncidents.length} Active Emergency</span>
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-mono font-bold flex items-center justify-between animate-in slide-in-from-top">
            <span>{successToast}</span>
            <button onClick={() => setSuccessToast(null)}><X size={14} /></button>
          </div>
        )}

        {/* Tab Filters */}
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B1533] border-slate-800'
        }`}>
          <div className="flex items-center space-x-2">
            {[
              { id: 'ALL', label: 'All Incidents', count: incidents.length },
              { id: 'ACTIVE', label: 'Active SOS Only', count: activeIncidents.length },
              { id: 'RESOLVED', label: 'Resolved History', count: incidents.filter(i => i.status === 'RESOLVED').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : isLight 
                    ? 'text-slate-600 hover:bg-slate-200' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400">
            Mandate: <b>S.O. 5453(E) • 5-Second GPS Burst</b>
          </span>
        </div>

        {/* Incident Cards Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {incidents
            .filter(i => activeTab === 'ALL' || (activeTab === 'ACTIVE' && i.status === 'ACTIVE_EMERGENCY') || (activeTab === 'RESOLVED' && i.status === 'RESOLVED'))
            .map(incident => {
              const isActive = incident.status === 'ACTIVE_EMERGENCY';

              return (
                <div
                  key={incident.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? isLight 
                        ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
                        : 'bg-gradient-to-br from-[#1A0A17] via-[#1F0D22] to-[#120718] border-rose-500/80 ring-2 ring-rose-500/40 shadow-xl'
                      : isLight 
                      ? 'bg-slate-50 border-slate-200 opacity-80' 
                      : 'bg-[#0A132C]/80 border-slate-800 opacity-80'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b pb-2.5 mb-3 border-rose-900/30">
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                        isActive ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                      }`}>
                        {isActive ? '🚨 ACTIVE PANIC TRIGGER' : '✓ RESOLVED'}
                      </span>
                      <span className={`text-base font-bold font-['Chakra_Petch'] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {incident.vehicle_no}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({incident.model})</span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Clock size={12} />
                        <span>{incident.trigger_time}</span>
                      </span>
                    </div>
                  </div>

                  {/* Incident Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="space-y-1.5">
                      <div className="flex items-start space-x-1.5">
                        <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400">Location: </span>
                          <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {incident.location}
                          </span>
                          <div className="text-[10px] text-cyan-400 mt-0.5">GPS: {incident.coordinates}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-600/50 text-amber-300 text-[10.5px]">
                          Speed: <b>{incident.speed_kmh} km/h</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-600/50 text-cyan-300 text-[10.5px]">
                          Ignition: <b>{incident.ignition}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-950/70 border border-purple-600/50 text-purple-300 text-[10.5px]">
                          {incident.burst_mode}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t md:border-t-0 md:border-l md:pl-3 border-slate-700/50">
                      <div>
                        <span className="text-slate-400">Driver: </span>
                        <b className={isLight ? 'text-slate-900' : 'text-white'}>{incident.driver_name}</b>
                        <a href={`tel:${incident.driver_phone}`} className="ml-2 text-cyan-400 hover:underline">
                          {incident.driver_phone}
                        </a>
                      </div>

                      <div>
                        <span className="text-slate-400">Trigger Source: </span>
                        <span className="text-rose-300 font-semibold">{incident.trigger_source}</span>
                      </div>

                      <div>
                        <span className="text-slate-400">Police Station: </span>
                        <span className="text-amber-300">{incident.police_jurisdiction}</span>
                      </div>

                      <div>
                        <span className="text-slate-400">ERSS Docket: </span>
                        <span className="text-emerald-400 font-bold">{incident.erss_ref_no || 'Pending Push'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Notes Display (if resolved) */}
                  {incident.notes && (
                    <div className="mt-3 p-2 rounded-lg bg-emerald-950/40 border border-emerald-600/40 text-[11px] font-mono text-emerald-300">
                      <b>Closure Audit Note:</b> {incident.notes}
                    </div>
                  )}

                  {/* Action Controls for Active Emergency */}
                  {isActive && (
                    <div className="mt-4 pt-3 border-t border-rose-900/40 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDispatchErss(incident.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-red-950 transition cursor-pointer"
                        >
                          <Send size={13} />
                          <span>Push Update to ERSS 112</span>
                        </button>

                        <a
                          href={`tel:${incident.driver_phone}`}
                          className="px-3 py-1.5 rounded-lg bg-[#0E1E47] hover:bg-[#152B66] border border-cyan-500/60 text-cyan-300 font-mono font-bold text-xs flex items-center space-x-1.5 transition"
                        >
                          <Phone size={13} />
                          <span>Call Driver</span>
                        </a>

                        <button
                          onClick={() => showToast('🔊 In-cabin two-way emergency audio line initiated with driver cabin.')}
                          className="px-3 py-1.5 rounded-lg bg-[#1F143B] hover:bg-[#2C1D54] border border-purple-500/60 text-purple-300 font-mono font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                        >
                          <Volume2 size={13} />
                          <span>Cabin Intercom</span>
                        </button>
                      </div>

                      {resolvingId === incident.id ? (
                        <div className="flex items-center space-x-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <input
                            type="text"
                            placeholder="Enter resolution notes (e.g. verified false alarm)..."
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            className="px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-white font-mono flex-1 min-w-[200px]"
                          />
                          <button
                            onClick={() => handleResolveSos(incident.id)}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs whitespace-nowrap cursor-pointer"
                          >
                            Confirm De-escalate
                          </button>
                          <button
                            onClick={() => setResolvingId(null)}
                            className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResolvingId(incident.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/70 text-emerald-300 font-mono font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                        >
                          <CheckCircle2 size={13} />
                          <span>De-escalate & Resolve</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-[11px] font-mono shrink-0 ${
          isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#060B18] text-slate-400 border-slate-800'
        }`}>
          <span>
            AIS-140 Panic Standard: <b>Two In-Cabin SOS Buttons + High-Frequency 5s Burst Pinging</b>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Close Emergency Console
          </button>
        </div>

      </div>
    </div>
  );
}
