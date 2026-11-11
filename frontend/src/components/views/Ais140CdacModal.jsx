import React, { useState, useEffect } from 'react';
import { 
  Activity, X, Radio, Server, CheckCircle2, AlertTriangle, 
  RefreshCw, Terminal, Globe, ArrowUpRight, ShieldCheck, Zap
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Ais140CdacModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [rawPackets, setRawPackets] = useState([
    '$PVT,AXN01,1.0,864920048192041,MH12RN8842,111126,142019,19.8324,N,075.8821,E,58.2,182.4,14,0.9,1,1,12.8,4.15,0,0,0,0,404,45,3928,19842*4F',
    '$PVT,AXN01,1.0,864920048192042,DL01AB1234,111126,142018,27.7051,N,076.2008,E,46.0,210.1,12,1.1,1,1,24.2,4.12,0,0,0,0,404,10,2108,18492*2A',
    '$EMR,AXN01,1.0,864920048192041,MH12RN8842,111126,142015,19.8320,N,075.8819,E,58.0,182.0,14,0.9,1,1,12.8,4.15,1,0,0,0,404,45,3928,19842*9E',
    '$HB,AXN01,1.0,864920048192043,KA04E5678,111126,142012,12.5186,N,078.2137,E,0.0,0.0,11,1.2,0,1,12.4,4.20,0,0,0,0,404,20,5192,10291*1C'
  ]);

  // Append simulated packets periodically
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const sampleVehicles = ['MH12RN8842', 'DL01AB1234', 'HR55B4321', 'UP32HN1244', 'KA04E5678'];
      const v = sampleVehicles[Math.floor(Math.random() * sampleVehicles.length)];
      const speed = (Math.random() * 65).toFixed(1);
      const newPkt = `$PVT,AXN01,1.0,86492004819204${Math.floor(Math.random()*9)},${v},111126,${timeStr},28.4${Math.floor(Math.random()*90)},N,077.1${Math.floor(Math.random()*90)},E,${speed},184.2,14,0.9,1,1,12.8,4.15,0,0,0,0,404,45,3928,19842*${Math.floor(Math.random()*89+10).toString(16).toUpperCase()}`;
      
      setRawPackets(prev => [newPkt, ...prev.slice(0, 15)]);
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const stateGateways = [
    { name: 'MoRTH CDAC National Gateway', ip: 'cdac-vltd.parivahan.gov.in:9002', status: 'ONLINE', ping: '18 ms', ack_pct: '100%', vehicles: 10 },
    { name: 'Delhi Transport Dept (CDAC Delhi)', ip: '164.100.78.22:8080', status: 'ONLINE', ping: '12 ms', ack_pct: '100%', vehicles: 3 },
    { name: 'Maharashtra ERSS 112 (MahaIT Mumbai)', ip: 'vltd.mahait.org:9001', status: 'ONLINE', ping: '24 ms', ack_pct: '100%', vehicles: 3 },
    { name: 'Tamil Nadu e-Governance (TNeGA Chennai)', ip: 'vltd.tnega.tn.gov.in:9005', status: 'ONLINE', ping: '29 ms', ack_pct: '100%', vehicles: 2 },
    { name: 'Karnataka State Road Safety Authority', ip: 'vltd.ksrsa.karnataka.gov.in:9002', status: 'ONLINE', ping: '21 ms', ack_pct: '100%', vehicles: 2 }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans ${
        isLight ? 'bg-white border-cyan-300' : 'bg-[#080E24] border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.25)]'
      }`}>
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#08183B] via-[#0D2457] to-[#08183B] border-b border-cyan-500/50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-900/50">
              <Activity size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
                  AIS-140 State Government (CDAC) Dual-IP Sync Monitor
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>10/10 Dual-IP Synced</span>
                </span>
              </div>
              <p className="text-xs text-cyan-200/90 font-mono mt-0.5">
                Real-time ingestion health across MoRTH CDAC National Gateway & State Emergency Response Hubs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cyan-200 hover:text-white hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Overview KPI Cards */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A1430] border-[#1E2E56]'}`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Primary IP (Axona TSP)</span>
            <div className="text-lg font-bold font-['Chakra_Petch'] text-cyan-400 mt-0.5">tsp.axona-telematics.in</div>
            <div className="text-[11px] font-mono text-emerald-400 font-semibold mt-1 flex items-center space-x-1">
              <CheckCircle2 size={12} />
              <span>10 Connected • 14ms Latency</span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A1430] border-[#1E2E56]'}`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Secondary IP (State CDAC)</span>
            <div className="text-lg font-bold font-['Chakra_Petch'] text-purple-400 mt-0.5">cdac-vltd.parivahan.gov.in</div>
            <div className="text-[11px] font-mono text-emerald-400 font-semibold mt-1 flex items-center space-x-1">
              <CheckCircle2 size={12} />
              <span>100% ACK Rate • 18ms</span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A1430] border-[#1E2E56]'}`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Packets Ingested Today</span>
            <div className="text-lg font-bold font-['Chakra_Petch'] text-white mt-0.5">1,842,910</div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">128 packets/sec peak rate</div>
          </div>

          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0A1430] border-[#1E2E56]'}`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase block">NavIC (IRNSS) Fix Health</span>
            <div className="text-lg font-bold font-['Chakra_Petch'] text-amber-400 mt-0.5">Dual Constellation</div>
            <div className="text-[11px] font-mono text-cyan-300 mt-1">GPS (9) + NavIC (4) Satellites</div>
          </div>
        </div>

        {/* State Gateway Distribution Table */}
        <div className="px-4 pb-2">
          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <Globe size={13} className="text-cyan-400" />
            <span>State Government Connected Command Centers</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A132C] text-slate-400 border-b border-slate-800 text-[10.5px]">
                <tr>
                  <th className="py-2 px-3">State Monitoring Center</th>
                  <th className="py-2 px-3">Gateway Endpoint</th>
                  <th className="py-2 px-3 text-center">Vehicles</th>
                  <th className="py-2 px-3 text-center">Ping Latency</th>
                  <th className="py-2 px-3 text-center">MoRTH ACK Rate</th>
                  <th className="py-2 px-3 text-right">Gateway Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#060D1E]/80">
                {stateGateways.map((gw, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-semibold text-white flex items-center space-x-1.5">
                      <Server size={12} className="text-cyan-400" />
                      <span>{gw.name}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[11px] font-mono">{gw.ip}</td>
                    <td className="py-2 px-3 text-center text-cyan-300 font-bold">{gw.vehicles}</td>
                    <td className="py-2 px-3 text-center text-slate-300">{gw.ping}</td>
                    <td className="py-2 px-3 text-center text-emerald-400 font-bold">{gw.ack_pct}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/60">
                        ● {gw.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Raw AIS-140 NMEA Packet Stream Inspector Terminal */}
        <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col min-h-[160px]">
          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Terminal size={13} className="text-emerald-400" />
              <span>Live Raw AIS-140 Protocol Stream ($PVT / $EMR / $HB Packets)</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono animate-pulse">● Ingestion Active</span>
          </div>

          <div className="flex-1 rounded-xl bg-black border border-slate-800 p-3 font-mono text-[11px] text-emerald-400/90 overflow-y-auto space-y-1 shadow-inner select-all">
            {rawPackets.map((pkt, idx) => (
              <div key={idx} className="leading-tight hover:text-white transition flex items-center space-x-2">
                <span className="text-slate-600 text-[9px] shrink-0">[{idx + 1}]</span>
                <span className={pkt.startsWith('$EMR') ? 'text-rose-400 font-bold bg-rose-950/40 px-1 rounded' : ''}>
                  {pkt}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs font-mono shrink-0 ${
          isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#060B18] text-slate-400 border-slate-800'
        }`}>
          <span>
            Compliance: <b>MoRTH S.O. 5453(E) Mandated Dual-IP Push to CDAC & TSP</b>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Close Gateway Monitor
          </button>
        </div>

      </div>
    </div>
  );
}
