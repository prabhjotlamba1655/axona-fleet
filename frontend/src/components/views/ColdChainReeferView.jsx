import React, { useState, useEffect } from 'react';
import { 
  ThermometerSnowflake, AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, 
  Activity, Gauge, TrendingUp, Cpu, Sparkles, Layers,
  Truck, RefreshCw, Check, Play, Pause, Home, PanelLeftClose, PanelLeftOpen,
  DoorClosed, DoorOpen, Wind, Zap, Flame, BellRing, Radio
} from 'lucide-react';
import { fetchColdChain } from '../../services/api';

export default function ColdChainReeferView({ onReturnHome, sidebarCollapsed, onToggleSidebar }) {
  const [reefers, setReefers] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('MH-12-RN-8842');
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);

  const loadData = () => {
    fetchColdChain().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setReefers(data);
        if (!selectedVehicleId) {
          setSelectedVehicleId(data[0].id || data[0].reg_no);
        }
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // TV Rotation Timer: Cycle trucks every 12 seconds
  useEffect(() => {
    if (!autoRotate || reefers.length === 0) return;
    const rotateInterval = setInterval(() => {
      setSelectedVehicleId(prevId => {
        const currIdx = reefers.findIndex(v => v.id === prevId || v.reg_no === prevId);
        const nextIdx = (currIdx + 1) % reefers.length;
        return reefers[nextIdx].id || reefers[nextIdx].reg_no;
      });
    }, 12000);
    return () => clearInterval(rotateInterval);
  }, [autoRotate, reefers]);

  const activeReefer = reefers.find(v => v.id === selectedVehicleId || v.reg_no === selectedVehicleId) || reefers[0];

  return (
    <div className="h-full w-full flex flex-col bg-[#050A16] text-slate-100 overflow-hidden select-none p-2 space-y-2 justify-between">
      {/* ------------------------------------------------------------- */}
      {/* COMPACT TV HEADER & TRUCK SELECTOR BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between bg-[#081022] border border-slate-800/90 rounded-xl px-3 py-1.5 shrink-0 shadow-md">
        <div className="flex items-center space-x-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded-md bg-[#0D1830] text-cyan-400 hover:text-white border border-cyan-800/60 transition"
              title={sidebarCollapsed ? "Expand Left Menu" : "Collapse Left Menu (Ultra-Wide TV View)"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <ThermometerSnowflake size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold uppercase font-['Chakra_Petch'] text-white tracking-wide">
                Cold Chain &amp; Reefer Temperature Monitoring
              </h1>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-semibold">
                20 Core Sensors Active • TV NOC Mode
              </span>
            </div>
          </div>
        </div>

        {/* Truck Selector Pills Strip */}
        <div className="flex items-center space-x-1.5 font-mono text-[11px] overflow-x-hidden">
          {reefers.map(v => {
            const isSelected = (v.id === activeReefer?.id || v.reg_no === activeReefer?.reg_no);
            const isExcursion = v.is_excursion;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`flex items-center space-x-1 px-2 py-1 rounded transition text-[10.5px] border ${
                  isSelected
                    ? 'bg-cyan-950/90 border-cyan-400 text-white font-bold ring-1 ring-cyan-400/80 shadow'
                    : 'bg-[#050B18] text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                <span>{v.reg_no.split('-')[0]}-{v.reg_no.split('-')[1]}..</span>
                <span className={`text-[8.5px] px-1 py-0.1 rounded font-bold ${
                  isExcursion ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-cyan-950 text-cyan-300'
                }`}>
                  {isExcursion ? 'BREACH' : `${v.current_temp_c}°C`}
                </span>
              </button>
            );
          })}

          {/* Auto TV Rotation Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-[10.5px] border ml-1 ${
              autoRotate ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold' : 'bg-[#050B18] border-slate-800 text-slate-400'
            }`}
            title="Auto cycle reefer trucks every 12 seconds"
          >
            {autoRotate ? <Pause size={10} /> : <Play size={10} />}
            <span>{autoRotate ? 'Auto: ON' : 'Auto: OFF'}</span>
          </button>

          {/* Clean Return Home Button */}
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#0A1329] hover:bg-[#12224A] text-cyan-300 border border-cyan-700/60 text-[10.5px] font-mono transition ml-1 shadow"
              title="Return to Executive NOC Dashboard (Esc)"
            >
              <Home size={11} />
              <span>Home (Esc)</span>
            </button>
          )}
        </div>
      </div>

      {loading || !activeReefer ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-mono text-sm">
          <RefreshCw className="animate-spin mr-2" size={18} />
          Connecting to Reefer Microprocessor Telemetry...
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between space-y-2 overflow-hidden">
          {/* ------------------------------------------------------------- */}
          {/* ROW 1: PRIMARY 5 TV METRIC CARDS (Exact Match to TV Format) */}
          {/* Features 1, 3, 4 & 5, 6, 10 */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-5 gap-2.5 shrink-0 font-mono">
            {/* Card 1: Feature 1 - Cargo Temperature Monitoring */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
              activeReefer.is_excursion
                ? 'bg-gradient-to-b from-[#210D1B] to-[#120710] border-rose-600 shadow-md shadow-rose-950/40'
                : 'bg-[#091124] border-slate-800'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #1 Cargo Temperature (GVW Style)
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                  activeReefer.is_excursion ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-slate-800 text-cyan-300'
                }`}>
                  {activeReefer.compliance_score_pct}% In-Spec
                </span>
              </div>
              <div className="my-1">
                <div className={`text-2xl font-bold tracking-tight ${
                  activeReefer.is_excursion ? 'text-rose-400' : 'text-white'
                }`}>
                  {activeReefer.current_temp_c} <span className="text-xs text-slate-400">°C</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Target Setpoint: <strong>{activeReefer.setpoint_c} °C (±{activeReefer.allowed_tolerance_c}°C)</strong>
                </div>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-700/60">
                <div
                  className={`h-full transition-all duration-500 ${
                    activeReefer.is_excursion ? 'bg-rose-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(15, 100 - (Math.abs(activeReefer.temp_delta_c) * 16)))}%` }}
                />
              </div>
            </div>

            {/* Card 2: Feature 3 - Temperature Setpoint Management */}
            <div className="p-2.5 rounded-xl bg-[#091124] border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #3 Setpoint &amp; Cargo Profile
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
                  {activeReefer.setpoint_c <= -18 ? 'Deep Frozen' : 'Chilled'}
                </span>
              </div>
              <div className="my-1">
                <div className="text-2xl font-bold tracking-tight text-white">
                  {activeReefer.setpoint_c} <span className="text-xs text-slate-400">°C Setpoint</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Safe Range: {activeReefer.min_safe_temp_c}°C to {activeReefer.max_safe_temp_c}°C
                </div>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-700/60">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: '92%' }}
                />
              </div>
            </div>

            {/* Card 3: Feature 4 & 5 - Temperature Excursion Detection, Duration & Severity */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
              activeReefer.is_excursion
                ? 'bg-gradient-to-b from-[#210D1B] to-[#120710] border-rose-600 shadow-md shadow-rose-950/40'
                : 'bg-[#091124] border-slate-800'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #4 &amp; #5 Excursion Severity
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  activeReefer.is_excursion ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-emerald-950 text-emerald-300'
                }`}>
                  {activeReefer.is_excursion ? activeReefer.excursion_severity : 'IN SAFE RANGE'}
                </span>
              </div>
              <div className="my-1">
                <div className={`text-2xl font-bold tracking-tight ${
                  activeReefer.is_excursion ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {activeReefer.is_excursion ? `+${activeReefer.temp_delta_c}°C Breach` : '0.0°C Delta'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {activeReefer.is_excursion 
                    ? `Dwell: ${activeReefer.excursion_duration_min}m • MKT: ${activeReefer.mkt_degree_minutes} °C·min`
                    : 'Zero Temperature Excursion Detected'}
                </div>
              </div>
              <div className="text-[9.5px] text-slate-400 flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full inline-block ${
                  activeReefer.is_excursion ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
                }`} />
                <span>Thermal Envelope: {activeReefer.is_excursion ? 'Critical Breach' : 'Dynamic Stable'}</span>
              </div>
            </div>

            {/* Card 4: Feature 6 - Temperature Compliance Score */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
              activeReefer.is_excursion
                ? 'bg-gradient-to-b from-[#210D1B] to-[#120710] border-rose-600 shadow-md shadow-rose-950/40'
                : 'bg-[#091124] border-slate-800'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #6 Temperature Compliance
                </span>
                <ShieldCheck size={14} className={activeReefer.is_excursion ? 'text-rose-400' : 'text-emerald-400'} />
              </div>
              <div className="my-1">
                <div className={`text-lg font-bold tracking-tight uppercase ${
                  activeReefer.is_excursion ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {activeReefer.is_excursion ? 'TEMP EXCURSION' : 'WHO PQS COMPLIANT'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Statute: US FDA 21 CFR Part 11 &amp; GDP
                </div>
              </div>
              <div className="text-[9.5px] font-mono">
                {activeReefer.is_excursion ? (
                  <span className="text-rose-300 font-bold">⚠ Consignment Rejection Risk</span>
                ) : (
                  <span className="text-emerald-400">✓ Zero Spoilage • Clearance OK</span>
                )}
              </div>
            </div>

            {/* Card 5: Feature 10 - Refrigeration Unit Health */}
            <div className="p-2.5 rounded-xl bg-[#091124] border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #10 Reefer Unit Health
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                  {activeReefer.reefer_health_status}
                </span>
              </div>
              <div className="my-1">
                <div className="text-2xl font-bold tracking-tight text-cyan-300">
                  {activeReefer.reefer_health_score}% <span className="text-xs text-slate-400">Score</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Compressor: OK • Refrigerant: Passed (R452A)
                </div>
              </div>
              <div className="text-[9px] text-slate-400">
                Minimal Thermal Decay
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* ROW 2: MULTI-ZONE TEMPERATURE MONITORING, PROBES & HEATMAP */}
          {/* 5 TALL VERTICAL COLUMNS (Exact Match to Axle Columns in Image) */}
          {/* Features 2, 7, 9, 14, 18 */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-[#081022] border border-slate-800 rounded-xl p-2.5 flex-1 flex flex-col justify-between overflow-hidden">
            {/* Row 2 Section Title & Legend */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80 shrink-0 font-mono">
              <div className="flex items-center space-x-2">
                <Activity size={14} className="text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
                  Multi-Zone Temperature Monitoring, Dual Probes &amp; Thermal Heatmap [5 Zones]
                </span>
              </div>
              {/* Heatmap Legend */}
              <div className="flex items-center space-x-3 text-[9.5px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="text-slate-400">Deep Freeze (&lt;-18°C)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-400">Frozen (-18 to -12°C)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-slate-400">Chilled (0 to 4°C)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-slate-400">Excursion (&gt;4°C)</span>
                </span>
              </div>
            </div>

            {/* 5 Columns Layout matching 5 Axles */}
            <div 
              className="grid gap-2.5 flex-1 min-h-0 items-stretch"
              style={{ gridTemplateColumns: `repeat(5, minmax(0, 1fr))` }}
            >
              {activeReefer.zones.map((zone, idx) => {
                const isOver = zone.status === 'EXCURSION';
                const isCold = zone.temp_c <= -16.0;

                return (
                  <div
                    key={zone.zone_id}
                    className={`rounded-xl border p-2.5 flex flex-col justify-between font-mono transition-all ${
                      isOver
                        ? 'bg-gradient-to-b from-[#240C1A] to-[#12060D] border-rose-600/90 shadow-lg shadow-rose-950/40'
                        : 'bg-[#070E20] border-slate-800/90'
                    }`}
                  >
                    {/* Zone Header Strip */}
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-white truncate pr-1">
                          {zone.name}
                        </span>
                        <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                          isOver ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {zone.status === 'SAFE IN-RANGE' ? 'SAFE OK' : 'EXCURSION'}
                        </span>
                      </div>

                      {/* Sub-badge below title */}
                      <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold inline-block mt-1">
                        {zone.badge}
                      </span>

                      {/* Main Large Reading: Current Temp / Target Setpoint */}
                      <div className="my-2">
                        <div className={`text-xl font-bold tracking-tight ${
                          isOver ? 'text-rose-400' : 'text-white'
                        }`}>
                          {zone.temp_c} <span className="text-xs text-slate-400">/ {zone.setpoint_c} °C</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>#7 Stability</span>
                          <span className="font-bold text-slate-200">{zone.stability_pct}%</span>
                        </div>
                      </div>

                      {/* Thermal Stress Bar */}
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800 mb-2">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isOver ? 'bg-rose-500' : isCold ? 'bg-cyan-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(20, 100 - (Math.abs(zone.delta_c) * 15)))}%` }}
                        />
                      </div>
                    </div>

                    {/* Middle Nested Card: #18 DUAL RTD PROBES (Matching Left vs Right Wheel in image) */}
                    <div className="bg-[#050A16] border border-slate-800/80 rounded-lg p-2 my-1">
                      <div className="flex justify-between text-[8.5px] text-slate-400 mb-1">
                        <span>#18 DUAL RTD SENSORS</span>
                        <span className="text-cyan-400 font-bold">{zone.probe_balance_pct}% CAL</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-center py-1 bg-[#030610] rounded border border-slate-800/60">
                        <div className="border-r border-slate-800">
                          <div className="text-[8px] text-slate-400 uppercase">{zone.left_probe?.tag || 'LEFT'}</div>
                          <div className={`text-[11px] font-bold ${isOver ? 'text-rose-400' : 'text-slate-200'}`}>
                            {zone.left_probe?.temp_c ?? zone.temp_c} °C
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] text-slate-400 uppercase">{zone.right_probe?.tag || 'RIGHT'}</div>
                          <div className={`text-[11px] font-bold ${isOver ? 'text-rose-400' : 'text-slate-200'}`}>
                            {zone.right_probe?.temp_c ?? zone.temp_c} °C
                          </div>
                        </div>
                      </div>
                      <div className="text-center text-[8.5px] text-slate-400 mt-1">
                        Δ Imbalance: {zone.delta_imbalance_c ?? '0.2'}°C • Drift: &lt;{zone.drift_c ?? '0.02'}°C
                      </div>
                    </div>

                    {/* Bottom Strip: Recovery Time & Airflow */}
                    <div className="pt-1.5 border-t border-slate-800/80 flex justify-between text-[9px] text-slate-400">
                      <span>#9 Recovery:</span>
                      <strong className={isOver ? 'text-rose-300' : 'text-cyan-300'}>
                        {zone.recovery_time_min}m ({zone.airflow_mps} m/s)
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* ROW 3: BOTTOM TELEMETRY & AI ACTION CARDS (5 Cards) */}
          {/* Features 8 & 9, 11 & 12, 13 & 14, 15 & 16, 17 & 20 */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-5 gap-2.5 shrink-0 font-mono">
            {/* Card 1: Feature 8 & 9 - Pull-Down Performance & Cooling Recovery */}
            <div className="p-2.5 rounded-xl bg-[#091124] border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #8 Pull-Down &amp; #9 Recovery
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                  OPTIMAL
                </span>
              </div>
              <div className="my-1">
                <div className="text-xl font-bold tracking-tight text-white">
                  {activeReefer.pull_down_time_min}m <span className="text-xs text-slate-400">Pull-Down</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Pre-Trip: Passed (&lt;45m) • Recovery: {activeReefer.recovery_rate_c_per_min} °C/min
                </div>
              </div>
              <div className="text-[9px] text-slate-400">
                ✓ Thermal Inertia Stable
              </div>
            </div>

            {/* Card 2: Feature 11 & 12 - Cooling Efficiency & Compressor Analytics */}
            <div className="p-2.5 rounded-xl bg-[#091124] border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #11 Eff &amp; #12 Compressor
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold">
                  COP {activeReefer.cop_rating}
                </span>
              </div>
              <div className="my-1">
                <div className="text-xl font-bold tracking-tight text-cyan-300">
                  {activeReefer.cooling_efficiency_pct}% <span className="text-xs text-slate-400">Efficiency</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Compressor: {activeReefer.compressor.mode}
                </div>
              </div>
              <div className="text-[9px] text-slate-400">
                Suction: {activeReefer.compressor.suction_pressure_bar} bar • Head: {activeReefer.compressor.discharge_pressure_bar} bar
              </div>
            </div>

            {/* Card 3: Feature 13 & 14 - Door Open Intelligence & Temp Impact */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
              activeReefer.door.is_open 
                ? 'bg-gradient-to-b from-[#2B0E1B] to-[#15070D] border-rose-600 shadow-md shadow-rose-950/30' 
                : 'bg-[#091124] border-slate-800'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #13 Door &amp; #14 Temp Impact
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center space-x-1 ${
                  activeReefer.door.is_open ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-emerald-950 text-emerald-300'
                }`}>
                  {activeReefer.door.is_open ? <DoorOpen size={10} /> : <DoorClosed size={10} />}
                  <span>{activeReefer.door.is_open ? 'DOOR OPEN' : 'SEALED'}</span>
                </span>
              </div>
              <div className="my-1">
                <div className={`text-xl font-bold tracking-tight ${
                  activeReefer.door.is_open ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  +{activeReefer.door.temp_rise_c}°C Rise
                </div>
                <div className="text-[10px] text-slate-400">
                  {activeReefer.door.events_today} Open Events Today • {activeReefer.door.total_open_duration_min}m Total Dwell
                </div>
              </div>
              <div className="text-[9px] text-slate-400">
                Curtain Seal: {activeReefer.curtain_integrity_pct}% Intact • Blower Auto
              </div>
            </div>

            {/* Card 4: Feature 15 & 16 - Cold Air Loss Index & Defrost Analytics */}
            <div className="p-2.5 rounded-xl bg-[#091124] border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #15 Air Loss &amp; #16 Defrost
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
                  {activeReefer.defrost.mode}
                </span>
              </div>
              {/* Mini SVG Sparkline */}
              <div className="my-1 h-7 w-full bg-[#050A16] rounded border border-slate-800/80 p-0.5 relative">
                <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                  {/* Safe Upper Bound Red Dash */}
                  <line x1="0" y1="5" x2="100" y2="5" stroke="#EF4444" strokeWidth="1" strokeDasharray="2,2" />
                  {/* Temperature Curve */}
                  <path d="M 0,16 Q 30,15 60,16 T 100,15" fill="none" stroke="#22D3EE" strokeWidth="1.8" />
                </svg>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>Loss: {activeReefer.cold_air_loss_pct}%</span>
                <span>Defrost: {activeReefer.defrost.last_defrost_ago_min}m ago</span>
              </div>
            </div>

            {/* Card 5: Feature 17 & 20 - Reefer Alarm & AI Recommendations */}
            <div className="p-2.5 rounded-xl bg-[#091124] border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  #17 Alarm &amp; #20 AI Insights
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-bold flex items-center space-x-1">
                  <Sparkles size={10} />
                  <span>AI Engine</span>
                </span>
              </div>
              <div className="my-1">
                <div className="text-xs font-bold text-amber-300 truncate" title={activeReefer.ai_recommendations[0]?.title}>
                  {activeReefer.ai_recommendations[0]?.title}
                </div>
                <div className="text-[9.5px] text-slate-300 line-clamp-1 font-sans mt-0.5">
                  {activeReefer.ai_recommendations[0]?.action}
                </div>
              </div>
              <div className="text-[9px] text-cyan-300 font-mono truncate">
                {activeReefer.ai_recommendations[0]?.estimated_saving}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
