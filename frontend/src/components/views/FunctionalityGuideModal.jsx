import React, { useState } from 'react';
import { 
  X, Truck, Fuel, AlertTriangle, Scale, ThermometerSnowflake, 
  FileCheck, ShieldAlert, CheckCircle2, Navigation, Layers, 
  Activity, Clock, ExternalLink, HelpCircle, Info, Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function FunctionalityGuideModal({ isOpen, onClose, onNavigate }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Fleet Overview (10 Trucks)', icon: Truck },
    { id: 'diesel_pillars', label: '5 Pillars Diesel Savings', icon: Fuel },
    { id: 'axle_wim', label: 'Axle Payload & 7-Stop Route', icon: Scale },
    { id: 'compliance', label: 'E-Way Bills & Challans', icon: FileCheck },
    { id: 'cold_chain', label: 'Cold Chain Reefer', icon: ThermometerSnowflake },
    { id: 'how_to_use', label: 'How to Navigate & Audit', icon: Info },
  ];

  const dummyFleet = [
    { reg_no: 'MH-12-RN-8842', id: 'VH-101', model: 'Tata Prima 5530.S (18-Wheeler Tractor)', axles: 5, driver: 'Rajesh Gurjar', phone: '+91 98231 44019', route: 'Mumbai - Nagpur Express Freight', status: 'RUNNING', highlight: 'Overload (+1,400 kg), High CPH (24.8 L/h)' },
    { reg_no: 'DL-01-AX-9021', id: 'VH-102', model: 'BharatBenz 3528R (12-Wheeler Reefer)', axles: 4, driver: 'Vikram Singh', phone: '+91 97112 55890', route: 'Delhi - Jaipur - Ahmedabad Cold Corridor', status: 'RUNNING', highlight: 'Fuel Siphoning (28.5L), Route Deviation (+56.4km)' },
    { reg_no: 'KA-04-MB-4190', id: 'VH-103', model: 'Ashok Leyland 4220 (14-Wheeler Multi-Axle)', axles: 3, driver: 'Manjunath Gowda', phone: '+91 94481 22340', route: 'Bangalore - Chennai Expressway', status: 'IDLE', highlight: 'Refuel Mismatch (22.0L diff), Idling Alert (24m)' },
    { reg_no: 'GJ-06-ZZ-7711', id: 'VH-104', model: 'Eicher Pro 6028 (10-Wheeler Tipper)', axles: 4, driver: 'Pravin Patel', phone: '+91 98250 88123', route: 'Vadodara - Dahej Chemical Belt', status: 'RUNNING', highlight: 'Optimal 27T Payload, 100% On-Schedule Dispatch' },
    { reg_no: 'HR-55-AK-3004', id: 'VH-105', model: 'Tata Signa 4825.TK (16-Wheeler Tipper)', axles: 4, driver: 'Satbir Yadav', phone: '+91 98120 77654', route: 'Gurgaon - Neemrana Logistics Link', status: 'RUNNING', highlight: 'RTO National Permit Renewal Due in 6 Days' },
    { reg_no: 'AP-16-TX-5509', id: 'VH-106', model: 'BharatBenz 2823R (10-Wheeler Container)', axles: 3, driver: 'Venkatesh Rao', phone: '+91 99490 33412', route: 'Vijayawada - Visakhapatnam Cargo Line', status: 'RUNNING', highlight: 'Zero Deviation, 100% Fuel Reconciliation Clean' },
    { reg_no: 'UP-32-HN-1244', id: 'VH-107', model: 'Ashok Leyland 4825 (16-Wheeler Haulage)', axles: 4, driver: 'Rameshwar Shukla', phone: '+91 94150 66789', route: 'Lucknow - Varanasi Freight Corridor', status: 'RUNNING', highlight: 'Late Start Shift (08:50 AM), 28.5L 7-Day Deviation' },
    { reg_no: 'WB-19-DF-4402', id: 'VH-108', model: 'Tata LPT 3118 (10-Wheeler Reefer Box)', axles: 3, driver: 'Subhash Mondal', phone: '+91 98301 99876', route: 'Kolkata - Haldia Port Transfer', status: 'RUNNING', highlight: 'Optimal Reefer Envelope (-18.4°C / -18.0°C)' },
    { reg_no: 'RJ-14-GH-6621', id: 'VH-109', model: 'Mahindra Blazo X 49 (16-Wheeler Trailer)', axles: 4, driver: 'Gopal Meena', phone: '+91 98290 44532', route: 'Jaipur - Ajmer Highway', status: 'RUNNING', highlight: 'Driver Behavior Score 94/100, Fuel Consumed 186L' },
    { reg_no: 'TN-09-BK-9182', id: 'VH-110', model: 'Volvo FMX 460 (12-Wheeler Heavy Hauler)', axles: 4, driver: 'Senthil Murugan', phone: '+91 98400 11298', route: 'Chennai - Vellore Logistics Route', status: 'RUNNING', highlight: 'Ultra Low Idling (<0.8h), Excellent Mileage 3.8 km/L' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0A1226] border-[#1E2E56] text-slate-100'
      }`}>
        {/* Modal Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080E20] border-slate-800'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-['Chakra_Petch'] tracking-wide">
                  Platform Functionality Guide & Live Dummy Data
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
                  Interactive Demo
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Explore pre-configured Indian freight telematics scenarios, loss algorithms, axle weigh-in-motion, and compliance workflows.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Close Guide (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-5 pt-2 border-b flex space-x-1 overflow-x-auto shrink-0 ${
          isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#060B18] border-slate-800'
        }`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  active 
                    ? (isLight ? 'border-cyan-600 text-cyan-700 bg-white rounded-t-lg shadow-xs' : 'border-cyan-400 text-cyan-300 bg-[#0A1226] rounded-t-lg')
                    : (isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200')
                }`}
              >
                <Icon size={14} className={active ? (isLight ? 'text-cyan-700' : 'text-cyan-400') : ''} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: FLEET OVERVIEW DUMMY DATA */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-cyan-50/60 border-cyan-200 text-cyan-950' : 'bg-cyan-950/30 border-cyan-800/60 text-cyan-200'
              }`}>
                <h3 className="font-bold text-sm flex items-center gap-1.5 font-['Chakra_Petch']">
                  <Truck size={16} className="text-cyan-600" />
                  10 Heavy Commercial Vehicles Pre-Loaded With Realistic Operational Data
                </h3>
                <p className="text-xs mt-1 leading-relaxed">
                  The platform simulates real-time GPS, CANbus fuel sensors, weigh-in-motion load cells, and digital refrigeration telematics across key logistics freight corridors in India. Each vehicle represents a specific commercial operational scenario.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {dummyFleet.map((v) => (
                  <div 
                    key={v.id} 
                    className={`p-3 rounded-xl border transition shadow-xs ${
                      isLight ? 'bg-white border-slate-200 hover:border-cyan-400' : 'bg-[#081028] border-slate-800 hover:border-cyan-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-extrabold font-mono text-sm tracking-wide text-cyan-700">{v.reg_no}</span>
                        <span className={`text-[11px] block font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {v.id} • {v.model}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        v.status === 'RUNNING' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {v.status}
                      </span>
                    </div>

                    <div className="mt-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Corridor:</span>
                        <span className="font-medium text-right truncate max-w-[230px]">{v.route}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Driver:</span>
                        <span className="font-medium">{v.driver} ({v.phone})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Registered Axles:</span>
                        <span className="font-bold text-cyan-700">{v.axles} Axles</span>
                      </div>
                    </div>

                    <div className={`mt-2.5 pt-2 border-t text-[11px] font-mono ${
                      isLight ? 'border-slate-100 text-rose-700 font-semibold' : 'border-slate-800 text-rose-300'
                    }`}>
                      ⚡ Active Scenario: {v.highlight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: 5 PILLARS DIESEL SAVINGS */}
          {activeTab === 'diesel_pillars' && (
            <div className="space-y-3.5">
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
              }`}>
                <h3 className="font-bold text-sm flex items-center gap-1.5 font-['Chakra_Petch']">
                  <Fuel size={16} className="text-amber-600" />
                  Understanding the 5 Pillars of Diesel Fuel Loss & Financial Audit
                </h3>
                <p className="text-xs mt-1 leading-relaxed">
                  Fuel represents 55-60% of fleet operating costs in Indian freight. Axona categorizes diesel loss into 5 distinct actionable pillars so fleet managers eliminate theft, slip fraud, and idling waste immediately.
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Pillar 1 */}
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-rose-200' : 'bg-[#081028] border-rose-900/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 uppercase font-mono">Pillar 1: Fuel Siphoning Theft (Live Dip Drop)</span>
                    <span className="text-xs font-mono font-bold text-rose-700">28.5 Liters • ₹2,679 Today</span>
                  </div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    <b>How it works:</b> A digital capacitive fuel sensor detects sudden fuel level drop exceeding 5 Liters while the ignition is OFF. To eliminate slosh false alarms on sloped terrain, the system waits for the truck to move 15 meters after 15 minutes before officially verifying siphoning theft.
                  </p>
                  <div className="mt-2 text-[11px] font-mono p-2 rounded bg-rose-50 text-rose-800 border border-rose-200">
                    🎯 <b>Pre-loaded Incident:</b> Vehicle <b>DL-01-AX-9021</b> at NH48 Kotputli Dhaba km 142. Siphoned volume: 28.5 L (₹2,679). Status: Acknowledged by NOC Controller.
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-amber-200' : 'bg-[#081028] border-amber-900/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 uppercase font-mono">Pillar 2: Refuelling Slip Mismatch</span>
                    <span className="text-xs font-mono font-bold text-amber-800">22.0 Liters • ₹2,068 Diff</span>
                  </div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    <b>How it works:</b> Compares the printed fuel slip / fleet card billed liters against the actual digital sensor volume rise in the fuel tank.
                  </p>
                  <div className="mt-2 text-[11px] font-mono p-2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                    🎯 <b>Pre-loaded Incident:</b> Vehicle <b>KA-04-MB-4190</b> at HPCL COCO Pump, Sriperumbudur. Driver presented slip for <b>180.0 L</b>, but sensor recorded only <b>158.0 L</b> rise. Shortfall: 22.0 L (₹2,068).
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-yellow-200' : 'bg-[#081028] border-yellow-900/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 uppercase font-mono">Pillar 3: Excessive Idling Fuel Burn</span>
                    <span className="text-xs font-mono font-bold text-amber-800">53.4 Liters • ₹5,020 Loss</span>
                  </div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    <b>How it works:</b> Audits engine status and stationary duration:
                    <span className="block mt-1 pl-2 border-l-2 border-amber-400">
                      • <b>Idling Alert (&gt;15 min):</b> Vehicle ignition is ON and vehicle is stationary for &gt;15 minutes.<br />
                      • <b>Excessive Idle (&gt;30 min):</b> Vehicle ignition is ON and vehicle is stationary for &gt;30 minutes (critical fuel burn).<br />
                      • <b>Stoppage (&gt;2 hrs):</b> Vehicle ignition is OFF and vehicle is stationary for &gt;2 hours.
                    </span>
                  </p>
                  <div className="mt-2 text-[11px] font-mono p-2 rounded bg-yellow-50 text-yellow-900 border border-yellow-200">
                    🎯 <b>Pre-loaded Incident:</b> 6 trucks idle at warehouse gates. Vehicle <b>KA-04-MB-4190</b> idle for 24 minutes at Sriperumbudur Loading Bay 4 (2.4 L wasted).
                  </div>
                </div>

                {/* Pillar 4 */}
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-purple-200' : 'bg-[#081028] border-purple-900/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-800 uppercase font-mono">Pillar 4: High CPH (Consumption Per Hour)</span>
                    <span className="text-xs font-mono font-bold text-purple-800">56.9 Liters • ₹5,349 Excess</span>
                  </div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    <b>How it works:</b> Benchmarks live fuel burn against the OEM baseline curve. Any vehicle burning &gt;25% over baseline triggers an immediate High CPH alarm indicating bad driving or mechanical drag.
                  </p>
                  <div className="mt-2 text-[11px] font-mono p-2 rounded bg-purple-50 text-purple-900 border border-purple-200">
                    🎯 <b>Pre-loaded Incident:</b> Vehicle <b>MH-12-RN-8842</b> running at <b>24.8 L/h</b> vs OEM baseline <b>18.0 L/h</b> (+37.7% excess burn) on Samruddhi Mahamarg Ch. 182.
                  </div>
                </div>

                {/* Pillar 5 */}
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-cyan-200' : 'bg-[#081028] border-cyan-900/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-800 uppercase font-mono">Pillar 5: Route Corridor Deviation</span>
                    <span className="text-xs font-mono font-bold text-cyan-800">18.2 Liters • ₹1,711 Wasted</span>
                  </div>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    <b>How it works:</b> Checks vehicle coordinates against designated corridor geofence with 40 km buffer. Deviations waste diesel and delay SLAs.
                  </p>
                  <div className="mt-2 text-[11px] font-mono p-2 rounded bg-cyan-50 text-cyan-900 border border-cyan-200">
                    🎯 <b>Pre-loaded Incident:</b> Vehicle <b>DL-01-AX-9021</b> deviated +56.4 km off planned Jaipur Bypass route towards unapproved village road (SH-19 Dausa).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AXLE PAYLOAD & WIM */}
          {activeTab === 'axle_wim' && (
            <div className="space-y-3.5">
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-blue-50/70 border-blue-200 text-blue-950' : 'bg-blue-950/30 border-blue-800/60 text-blue-200'
              }`}>
                <h3 className="font-bold text-sm flex items-center gap-1.5 font-['Chakra_Petch']">
                  <Scale size={16} className="text-blue-600" />
                  Dynamic Axle Weigh-in-Motion & 7 Loading/Unloading Multi-Stop Hubs
                </h3>
                <p className="text-xs mt-1 leading-relaxed">
                  Axona dynamically configures load cells based on vehicle registration (3, 4, or 5 axles) and tracks net cargo loading/unloading events across the freight trip without route prediction hallucinations.
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#081028] border-slate-800'}`}>
                <h4 className="font-bold text-xs uppercase font-mono text-cyan-700">
                  Pre-Loaded 7-Stop Corridor Timeline (Mumbai to Nagpur Express)
                </h4>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <span className="font-bold block">1. JNPT Port Mumbai (05:30)</span>
                    <span className="text-[11px] block mt-0.5 text-emerald-700">+24,000 kg Initial Cargo</span>
                    <span className="text-[10px] text-slate-500">Bay-04 Container Terminal</span>
                  </div>
                  <div className="p-2 rounded bg-purple-50 border border-purple-200 text-purple-900">
                    <span className="font-bold block">2. Bhiwandi Hub (07:45)</span>
                    <span className="text-[11px] block mt-0.5 text-purple-700">-6,000 kg Partial Unload</span>
                    <span className="text-[10px] text-slate-500">Dock-02 Inbound Warehouse</span>
                  </div>
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <span className="font-bold block">3. Kalyan Industrial (09:15)</span>
                    <span className="text-[11px] block mt-0.5 text-emerald-700">+4,200 kg Mid-Trip Load</span>
                    <span className="text-[10px] text-slate-500">Bay-01 Express Yard</span>
                  </div>
                  <div className="p-2 rounded bg-purple-50 border border-purple-200 text-purple-900">
                    <span className="font-bold block">4. Nashik Agro DC (11:30)</span>
                    <span className="text-[11px] block mt-0.5 text-purple-700">-8,000 kg Regional Drop</span>
                    <span className="text-[10px] text-slate-500">Dock-06 Inbound Yard</span>
                  </div>
                  <div className="p-2 rounded bg-purple-50 border border-purple-200 text-purple-900">
                    <span className="font-bold block">5. Dhule Cross-Dock (13:45)</span>
                    <span className="text-[11px] block mt-0.5 text-purple-700">-5,200 kg Cross-Dock Drop</span>
                    <span className="text-[10px] text-slate-500">Bay-03 Transit Dock</span>
                  </div>
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold block">6. Jalgaon Agro Hub (16:15)</span>
                    <span className="text-[11px] block mt-0.5 text-amber-700">+12,000 kg Next Pickup</span>
                    <span className="text-[10px] text-slate-500">Bay-02 Cold Dock Staging</span>
                  </div>
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-900">
                    <span className="font-bold block">7. MIHAN SEZ Nagpur (18:30)</span>
                    <span className="text-[11px] block mt-0.5 text-rose-700">-21,000 kg Final Discharge</span>
                    <span className="text-[10px] text-slate-500">Dock-08 Final Unload Dock</span>
                  </div>
                  <div className="p-2 rounded bg-slate-100 border border-slate-300 text-slate-800 flex flex-col justify-center text-center">
                    <span className="font-bold block">Enroute Speed & GPS</span>
                    <span className="text-[11px] text-cyan-800 font-bold">88 km/h • 9,000 kg on board</span>
                  </div>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-rose-200' : 'bg-[#081028] border-rose-900/50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 uppercase font-mono">Overload Detection & CMVR 113/114 Fine Calculation</span>
                  <span className="text-xs font-mono font-bold text-rose-700">₹20,000 Fine Exposure</span>
                </div>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  On vehicle <b>MH-12-RN-8842</b>, current Gross Vehicle Weight (GVW) is <b>41,800 kg</b> against rated capacity <b>28,000 kg payload</b> (43,000 kg legal max limit). Axle 2 (Drive Tandem) is overloaded by <b>+1,400 kg</b>, triggering CMVR section 194 overweight penalty warning.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: COMPLIANCE E-WAY & CHALLANS */}
          {activeTab === 'compliance' && (
            <div className="space-y-3.5">
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
              }`}>
                <h3 className="font-bold text-sm flex items-center gap-1.5 font-['Chakra_Petch']">
                  <FileCheck size={16} className="text-emerald-600" />
                  E-Way Bills & Parivahan E-Challans Continuous Compliance Telematics
                </h3>
                <p className="text-xs mt-1 leading-relaxed">
                  Real-time GST E-Way Bill validity tracking prevents roadside confiscation of commercial freight, while direct integration with Parivahan tracks pending traffic and weighbridge challans across all states.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* E-Way Bill Box */}
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-cyan-200' : 'bg-[#081028] border-cyan-800/60'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase font-mono text-cyan-800">E-Way Bill System (10 Active)</span>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">2 Expiring Soon</span>
                  </div>
                  <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Tracks 12-digit GST E-Way Bill validity for all 10 vehicles in transit. Clicking the E-Way Bill box on the Executive NOC dashboard opens a detailed audit table showing Consignor, Consignee, HSN codes, and time remaining.
                  </p>
                  <div className="mt-2.5 space-y-1 text-[11px] font-mono">
                    <div className="p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-900 flex justify-between">
                      <span>DL-01-AX-9021 • EWB #2410-8892-4101</span>
                      <span className="font-bold text-rose-700">Expiring in 4h 15m</span>
                    </div>
                    <div className="p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-900 flex justify-between">
                      <span>UP-32-HN-1244 • EWB #2410-9182-5503</span>
                      <span className="font-bold text-amber-700">Expiring in 8h 20m</span>
                    </div>
                  </div>
                </div>

                {/* Challans Box */}
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-emerald-200' : 'bg-[#081028] border-emerald-800/60'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase font-mono text-emerald-800">Parivahan Challans (1 Pending)</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">9 Vehicles 100% Clean</span>
                  </div>
                  <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    Continuous audit of state police and transport department e-challans. Clicking the Challans box opens violation records with exact sections of the Motor Vehicles Act.
                  </p>
                  <div className="mt-2.5 p-2 rounded bg-rose-50 border border-rose-200 text-rose-950 text-[11px] font-mono">
                    <div className="font-bold">MH-12-RN-8842 • Challan #MH-8842-CH-2026-091</div>
                    <div className="text-slate-600 mt-0.5">Offense: Sec 194 MV Act (Axle Weight Limit Exceeded)</div>
                    <div className="text-slate-600">Authority: Maharashtra State Highway Police (Samruddhi Toll)</div>
                    <div className="font-bold text-rose-700 mt-1">Fine Amount: ₹2,000 • Status: Pending Payment</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COLD CHAIN REEFER */}
          {activeTab === 'cold_chain' && (
            <div className="space-y-3.5">
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-purple-50/70 border-purple-200 text-purple-950' : 'bg-purple-950/30 border-purple-800/60 text-purple-200'
              }`}>
                <h3 className="font-bold text-sm flex items-center gap-1.5 font-['Chakra_Petch']">
                  <ThermometerSnowflake size={16} className="text-purple-600" />
                  Multi-Zone Cold Chain Reefer Monitoring & Temperature Envelopes
                </h3>
                <p className="text-xs mt-1 leading-relaxed">
                  For perishable pharmaceuticals, vaccines, and frozen dairy cargo, Axona monitors dual-probe RTD sensors across 5 cargo hold zones, compressor health, and door-opening thermal loss.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#081028] border-slate-800'}`}>
                  <h4 className="font-bold text-xs uppercase font-mono text-purple-700">Pre-Loaded Reefer Truck 1: DL-01-AX-9021</h4>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Cargo Profile:</span>
                      <span className="font-bold">Deep Frozen Vaccines & Insulin</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Target Setpoint:</span>
                      <span className="font-mono font-bold text-blue-600">-18.0 °C (±1.5 °C)</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Current Cargo Temp:</span>
                      <span className="font-mono font-bold text-rose-600">-14.2 °C (Thermal Breach!)</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Door Open Count:</span>
                      <span className="font-mono font-bold">3 Dwell Events (7.2m total)</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Compliance:</span>
                      <span className="text-rose-700 font-bold">Excursion Flagged to Pharma Hub</span>
                    </li>
                  </ul>
                </div>

                <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#081028] border-slate-800'}`}>
                  <h4 className="font-bold text-xs uppercase font-mono text-emerald-700">Pre-Loaded Reefer Truck 2: WB-19-DF-4402</h4>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Cargo Profile:</span>
                      <span className="font-bold">Processed Seafood Export</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Target Setpoint:</span>
                      <span className="font-mono font-bold text-blue-600">-18.0 °C</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Current Cargo Temp:</span>
                      <span className="font-mono font-bold text-emerald-600">-18.4 °C (99.6% In-Spec)</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Door Seal Health:</span>
                      <span className="font-mono font-bold text-emerald-600">98% Intact (Curtain Sealed)</span>
                    </li>
                    <li className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Compliance:</span>
                      <span className="text-emerald-700 font-bold">WHO PQS & US FDA 21 CFR Compliant</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HOW TO NAVIGATE */}
          {activeTab === 'how_to_use' && (
            <div className="space-y-3.5">
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
              }`}>
                <h3 className="font-bold text-sm flex items-center gap-1.5 font-['Chakra_Petch']">
                  <Info size={16} className="text-cyan-600" />
                  Key Interactive Features to Test Across the Software
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#081028] border-slate-800'}`}>
                  <span className="font-bold font-mono text-cyan-700 block text-xs">1. Click Any Metric Box for Full Audit Modals</span>
                  <p className="mt-1 text-slate-600">
                    On the Executive NOC dashboard, all 20 boxes are interactive engraved buttons. Click any box (e.g. Siphoning, E-Way Bill, Challans, Service Due, Fastag & Toll Intelligence, Driver DL Verification) to see row-by-row vehicle tables, multi-column search, and CSV export.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#081028] border-slate-800'}`}>
                  <span className="font-bold font-mono text-cyan-700 block text-xs">2. Light & Dark Mode Instant Toggle</span>
                  <p className="mt-1 text-slate-600">
                    Use the <b>☀️ Light Mode / 🌙 Dark Mode</b> button in the top navbar at any time. It instantly recalculates high-contrast colors, map tiles, and table borders, saving your preference in localStorage.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#081028] border-slate-800'}`}>
                  <span className="font-bold font-mono text-cyan-700 block text-xs">3. Axle View Multi-Stop Demo Toggle</span>
                  <p className="mt-1 text-slate-600">
                    In the Axle Payload dashboard, you can toggle between the <b>7 Points (Multi-Stop Demo)</b> and <b>2 Points (Single Leg)</b> views, and switch between vehicles (MH-12, DL-01, KA-04, GJ-06, HR-55) in the top bar.
                  </p>
                </div>

                <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#081028] border-slate-800'}`}>
                  <span className="font-bold font-mono text-cyan-700 block text-xs">4. Vehicle Master Register with Excel Export</span>
                  <p className="mt-1 text-slate-600">
                    Open <b>Vehicle Register</b> from the left sidebar to see all 10 vehicles in a frozen-column spreadsheet view, with one-click Daily, Weekly, Monthly, and 12-Month Excel exports.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080E20] border-slate-800'
        }`}>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
            <span>Axona Telematics AI NOC</span>
            <span>•</span>
            <span>10 Vehicles Online</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Got It, Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
