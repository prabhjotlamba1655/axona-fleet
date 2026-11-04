import React, { useState, useEffect } from 'react';
import { 
  Truck, Fuel, RefreshCw, Maximize2, Minimize2, 
  AlertTriangle, CheckCircle2, Droplets, Thermometer, 
  Gauge, Clock, ShieldCheck, ArrowRight, Layers, 
  Grid, Box, Filter, Check, ChevronRight, Activity, Zap, Home
} from 'lucide-react';
import { fetchVehicles } from '../services/api';

// Helper: Calculate 10-hour refuel metrics, working/idle/stopped hours, and Executive NOC operational metrics
function getEnrichedVehicleMetrics(v) {
  const capacity = v.tank_capacity_liters || 400;
  const currentFuel = parseFloat((v.current_fuel_liters || 0).toFixed(1));
  const fillPercent = Math.min(100, Math.max(0, Math.round((currentFuel / capacity) * 100)));
  const remainingHours = Math.max(0, 10 - (v.engine_hours_today || 0));
  const cph = v.current_cph || 18.0;
  const fuelNeeded = remainingHours * cph;
  const safetyReserve = 25.0; // 25L reserve buffer
  const refuelRequired = Math.max(0, (fuelNeeded + safetyReserve) - currentFuel);
  const isDual = (v.num_tanks === 2);

  // Executive NOC Working, Idle & Stopped Hours (Aligned to 10.0-Hour Scheduled Duty Shift)
  const scheduledShiftHours = 10.0;
  const workingHours = parseFloat(Math.min(scheduledShiftHours, v.engine_hours_today || 6.5).toFixed(1));

  // Idling hours based on consumption at zero speed
  const rawIdle = parseFloat(((v.idling_loss_liters || 3.0) / 2.5).toFixed(1));
  const maxIdlePossible = Math.max(0.2, scheduledShiftHours - workingHours);
  const idleHours = parseFloat(Math.min(Math.max(rawIdle, 0.4), maxIdlePossible).toFixed(1));

  // Stopped / Rest hours to complete the 10-hour operational shift
  const stoppedHours = parseFloat(Math.max(0, scheduledShiftHours - workingHours - idleHours).toFixed(1));

  // Executive NOC Consumption, Distance & Economy
  const dieselConsumedToday = parseFloat((cph * workingHours).toFixed(1));
  const todayKms = Math.round((v.speed_kmh || 55) * workingHours * 0.8);
  const mileage = dieselConsumedToday > 0 ? (todayKms / dieselConsumedToday).toFixed(2) : '3.85';

  // 1. Running Km Left based on current fuel and calibrated real-world mileage
  const mileageNum = parseFloat(mileage) || 2.5;
  const runningKmLeft = Math.round(currentFuel * mileageNum);

  // 2. Refuelling Done last 24 hrs
  const refuel24hLookup = {
    'VH-101': 0,
    'VH-102': 0,
    'VH-103': 180,
    'VH-104': 0,
    'VH-105': 190,
    'VH-106': 220,
    'VH-107': 0,
    'VH-108': 0,
    'VH-109': 160,
    'VH-110': 0
  };
  const refuel24h = v.refueling_24h_liters !== undefined 
    ? parseFloat(v.refueling_24h_liters) 
    : (refuel24hLookup[v.id] || (v.reg_no && refuel24hLookup[v.reg_no]) || 0);

  // 3. Fuel Siphoning last 24 hrs
  const siphoning24h = parseFloat((v.fuel_siphoning_loss_liters || 0).toFixed(1));

  // 4. Battery Voltage (24V Commercial Heavy Duty Standards)
  const baseBattery = v.battery_voltage 
    ? parseFloat(v.battery_voltage)
    : (v.status === 'RUNNING' 
        ? 24.8 + ((parseInt(v.id.replace(/\D/g, '0') || '0') % 5) * 0.1)
        : v.status === 'IDLE' 
        ? 24.3 
        : 24.0);
  const batteryVoltage = parseFloat(baseBattery.toFixed(1));

  return {
    capacity,
    currentFuel,
    fillPercent,
    remainingHours: parseFloat(remainingHours.toFixed(1)),
    cph,
    refuelRequired: parseFloat(refuelRequired.toFixed(1)),
    needsRefuel: refuelRequired > 0,
    isDual,
    workingHours,
    idleHours,
    stoppedHours,
    totalShiftHours: scheduledShiftHours,
    dieselConsumedToday,
    todayKms,
    mileage,
    runningKmLeft,
    refuel24h,
    siphoning24h,
    batteryVoltage,
    startedAt: v.work_start_time || '07:30 AM',
    isLateStart: v.late_start === 1
  };
}

/**
 * CupFuelTankGauge:
 * Renders an individual truck fuel tank in the shape of a single cup-like rectangular container
 * with warm, soothing orange diesel filling, glowing amber meniscus, graduated calibration ticks,
 * capacitive dipstick rod, and all quantity aggregated together.
 */
function CupFuelTankGauge({ fillPercent = 50, capacity, size = 'normal' }) {
  const isCompact = size === 'compact';
  const cupWidth = isCompact ? 'w-11' : 'w-[52px]';
  const cupHeight = isCompact ? 'h-28' : 'h-36';
  const rimWidth = isCompact ? 'w-13' : 'w-[58px]';

  // Warm soothing orange diesel gradient
  const getLiquidColor = (pct) => {
    if (pct < 20) return 'from-rose-600 via-orange-600 to-amber-500 shadow-[0_0_12px_rgba(249,115,22,0.6)] animate-pulse';
    if (pct < 35) return 'from-orange-600 via-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    return 'from-amber-600 via-orange-500 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]';
  };

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      {/* Top cup rim / lip with filler neck */}
      <div className={`${rimWidth} h-2 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 rounded-t-sm border border-slate-400/50 shadow-sm relative flex items-center justify-between px-1.5`}>
        <div className="w-3 h-1 -mt-1 bg-slate-300 rounded-t-[1px] border border-slate-500 shadow" title="Diesel Filler Cap" />
        <span className="text-[7px] text-amber-200 font-bold tracking-tighter">DIESEL</span>
      </div>

      {/* Rectangular Cup Body with Soothing Dark Glass/Metallic Framing */}
      <div className={`${cupWidth} ${cupHeight} relative rounded-b-lg border-x-2 border-b-2 border-slate-600/80 bg-[#060B18] overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)] flex flex-col justify-end`}>
        {/* Anti-slosh Baffle Reference Lines */}
        <div className="absolute inset-x-0 top-1/3 h-px bg-slate-700/50 pointer-events-none" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-slate-700/50 pointer-events-none" />

        {/* Center Capacitive Dipstick Sensor Rod (Subtle Golden Brass) */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-400/60 z-10 pointer-events-none shadow-[0_0_3px_rgba(245,158,11,0.4)]" />

        {/* Graduated Calibration Scale Ticks */}
        <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-1.5 z-10 pointer-events-none opacity-80">
          <div className="flex items-center space-x-0.5">
            <span className="text-[7px] font-mono text-slate-400 font-bold">F</span>
            <div className="w-1.5 h-0.5 bg-slate-300" />
          </div>
          <div className="w-1 h-0.5 bg-slate-400" />
          <div className="flex items-center space-x-0.5">
            <span className="text-[7px] font-mono text-slate-400 font-bold">½</span>
            <div className="w-2 h-0.5 bg-slate-300" />
          </div>
          <div className="w-1 h-0.5 bg-slate-400" />
          <div className="flex items-center space-x-0.5">
            <span className="text-[7px] font-mono text-slate-400 font-bold">E</span>
            <div className="w-1.5 h-0.5 bg-slate-300" />
          </div>
        </div>

        {/* Soothing Orange Diesel Liquid Core Fill */}
        <div
          className={`w-full bg-gradient-to-t ${getLiquidColor(fillPercent)} transition-all duration-700 relative`}
          style={{ height: `${Math.max(6, Math.min(100, fillPercent))}%` }}
        >
          {/* Glowing Fluid Meniscus line (Warm Amber/White) */}
          <div className="w-full h-1 bg-amber-100/95 absolute top-0 left-0 shadow-[0_0_8px_#F59E0B]" />
        </div>

        {/* Overlaid Fill Percentage */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span className="text-xs font-mono font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-[1px]">
            {fillPercent}%
          </span>
        </div>
      </div>

      <span className="text-[9px] font-mono text-amber-300/90 font-medium mt-1">
        {capacity ? `${capacity}L Tank` : 'Fuel Tank'}
      </span>
    </div>
  );
}

export default function Screen4LiveFuelTank3D({ isExpanded = false, onToggleExpand, onReturnHome }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('VH-101');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'RUNNING' | 'IDLE' | 'STOPPED' | 'DEFICIT' | 'LOW'

  // Fetch available vehicles list
  const loadVehicles = () => {
    fetchVehicles().then(list => {
      setVehicles(list || []);
      if (list && list.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(list[0].id);
      }
    }).catch(err => console.error(err));
  };

  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fleet-wide calculations
  const totalFleetDiesel = vehicles.reduce((sum, v) => sum + (v.current_fuel_liters || 0), 0);
  const totalFleetCapacity = vehicles.reduce((sum, v) => sum + (v.tank_capacity_liters || 400), 0);
  const avgFleetFillPercent = totalFleetCapacity > 0 ? Math.round((totalFleetDiesel / totalFleetCapacity) * 100) : 0;
  
  // Filtered vehicles list
  const filteredVehicles = vehicles.filter(v => {
    const metrics = getEnrichedVehicleMetrics(v);
    if (filterStatus === 'RUNNING') return v.status === 'RUNNING';
    if (filterStatus === 'IDLE') return v.status === 'IDLE';
    if (filterStatus === 'STOPPED') return v.status === 'STOPPED';
    if (filterStatus === 'DEFICIT') return metrics.needsRefuel;
    if (filterStatus === 'LOW') return metrics.fillPercent < 35;
    return true;
  });

  const vehiclesNeedingRefuelCount = vehicles.filter(v => getEnrichedVehicleMetrics(v).needsRefuel).length;

  return (
    <div className="h-full flex flex-col bg-[#070D1E] text-slate-200 overflow-hidden border border-[#18233C] rounded-xl select-none p-2.5">
      {/* Main Container: Clean Full-Screen Fleet Tanks & Executive NOC Grid */}
      <div className="flex flex-col bg-[#081022] border border-[#18233C] rounded-xl p-3 shadow-lg flex-1 overflow-y-auto">
        {/* Single Integrated Header: Title, Live Summary Chips, Filter Buttons & Home Navigation */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80 gap-2 shrink-0">
          {/* Left Title & Summary Badges */}
          <div className="flex items-center space-x-2.5">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Fuel size={16} />
            </div>
            <h2 className="text-xs font-bold text-slate-100 uppercase font-['Chakra_Petch'] tracking-wide">
              Fleet Fuel Tanks & Executive Operations Telemetry ({filteredVehicles.length} Units)
            </h2>

            {/* Quick Fleet Summary Badges */}
            <div className="hidden md:flex items-center space-x-1.5 text-[10px] font-mono ml-2">
              <span className="px-2 py-0.5 rounded bg-[#0D172E] border border-slate-700/80 text-slate-300">
                Total: <strong className="text-amber-300">{Math.round(totalFleetDiesel).toLocaleString()} L</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#0D172E] border border-slate-700/80 text-slate-300">
                Avg Fill: <strong className="text-amber-300">{avgFleetFillPercent}%</strong>
              </span>
              {vehiclesNeedingRefuelCount > 0 ? (
                <span className="px-2 py-0.5 rounded bg-rose-950/70 border border-rose-700/60 text-rose-300 font-medium flex items-center space-x-1">
                  <AlertTriangle size={11} />
                  <span>{vehiclesNeedingRefuelCount} Need Refuel</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 flex items-center space-x-1">
                  <CheckCircle2 size={11} />
                  <span>10h Duty Safe</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Filters & Home Button */}
          <div className="flex items-center space-x-2">
            {/* Status Filter Chips */}
            <div className="flex items-center space-x-1 text-[10.5px] font-mono">
              {[
                { id: 'ALL', label: `All (${vehicles.length})` },
                { id: 'RUNNING', label: 'Running' },
                { id: 'IDLE', label: 'Idle' },
                { id: 'STOPPED', label: 'Stopped' },
                { id: 'DEFICIT', label: `Top-up Req (${vehiclesNeedingRefuelCount})` },
                { id: 'LOW', label: 'Low Fuel (<35%)' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-2.5 py-0.5 rounded transition ${
                    filterStatus === f.id
                      ? 'bg-amber-600/80 text-white font-bold border border-amber-400/80 shadow'
                      : 'bg-[#050B18] text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Compact Return to Home Button */}
            {onReturnHome && (
              <button
                onClick={onReturnHome}
                className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#0D172E] hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-medium transition shadow-sm"
                title="Return to Executive NOC Dashboard (Esc)"
              >
                <Home size={13} className="text-amber-400" />
                <span>Home (Esc)</span>
              </button>
            )}
          </div>
        </div>

        {/* Individual Trucks Fuel Tank Boxes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 items-start">
          {filteredVehicles.map(v => {
            const metrics = getEnrichedVehicleMetrics(v);
            const isSelected = v.id === selectedVehicleId;

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`relative rounded-xl p-2.5 transition-all duration-200 cursor-pointer flex flex-col justify-start border ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#131E38] to-[#0A1224] border-amber-400/90 shadow-[0_0_16px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/70'
                      : 'bg-[#050B18]/90 hover:bg-[#091226] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Active Selected Indicator Ribbon */}
                  {isSelected && (
                    <div className="absolute -top-2 right-2 px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold font-mono text-[9px] shadow uppercase tracking-wider flex items-center space-x-1">
                      <Check size={10} />
                      <span>Selected</span>
                    </div>
                  )}

                  {/* Box Header: Reg No, ID, Model, Status */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-xs text-white tracking-wide">
                          {v.reg_no}
                        </span>
                        <span className="text-[10px] font-mono px-1 rounded bg-slate-800/90 text-slate-300">
                          {v.id}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px] font-sans" title={v.model}>
                        {v.model.split('(')[0]}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                      v.status === 'RUNNING'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                        : v.status === 'IDLE'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-700/50'
                        : 'bg-slate-800/60 text-slate-300 border border-slate-700/50'
                    }`}>
                      {v.status === 'RUNNING' ? `${v.speed_kmh}k` : v.status}
                    </span>
                  </div>

                  {/* Middle Section: Orange Pictorial Fuel Tank + Executive NOC Data (Working, Idle, Stopped Hrs) */}
                  <div className="flex items-center space-x-2.5 my-1 bg-[#070E20]/90 px-2 py-1.5 rounded-lg border border-slate-800/80">
                    {/* Orange Pictorial Cup-like Rectangular Fuel Tank */}
                    <CupFuelTankGauge
                      fillPercent={metrics.fillPercent}
                      capacity={metrics.capacity}
                      size="normal"
                    />

                    {/* Executive NOC Telemetry (Working, Idle, Stopped Hrs & Fuel Info) */}
                    <div className="flex-1 min-w-0 space-y-1 font-mono text-[10px]">
                      {/* Total Fuel Level - No truncation, fully visible with capacity */}
                      <div className="flex justify-between items-center text-[10px] pb-1 border-b border-slate-800/80">
                        <span className="text-slate-400 text-[8.5px] uppercase tracking-wider shrink-0 font-medium">Total Fuel:</span>
                        <div className="font-mono whitespace-nowrap text-right">
                          <span className="text-amber-300 font-bold text-[11px]">{metrics.currentFuel} L</span>
                          <span className="text-slate-400 text-[9px] ml-0.5 font-normal">/ {metrics.capacity}L</span>
                        </div>
                      </div>

                      {/* Today's Working, Idle, Stopped Hours Breakdown */}
                      <div className="bg-[#050A16] px-1.5 py-1 rounded border border-slate-800/80 space-y-0.5">
                        <div className="text-[7.5px] text-slate-400 uppercase font-semibold tracking-wider flex justify-between items-center px-0.5">
                          <span>Today's Shift Hours</span>
                          <span className="text-slate-500 font-normal">10h Duty</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded py-0.5 px-0.5">
                            <div className="text-[7px] text-emerald-400 font-sans font-medium">Work</div>
                            <div className="text-emerald-200 font-bold text-[9px]">{metrics.workingHours}h</div>
                          </div>
                          <div className="bg-amber-950/40 border border-amber-800/40 rounded py-0.5 px-0.5">
                            <div className="text-[7px] text-amber-400 font-sans font-medium">Idle</div>
                            <div className="text-amber-200 font-bold text-[9px]">{metrics.idleHours}h</div>
                          </div>
                          <div className="bg-slate-800/50 border border-slate-700/40 rounded py-0.5 px-0.5">
                            <div className="text-[7px] text-slate-400 font-sans font-medium">Stop</div>
                            <div className="text-slate-200 font-bold text-[9px]">{metrics.stoppedHours}h</div>
                          </div>
                        </div>
                      </div>

                      {/* Operational Telemetry Lines */}
                      <div className="space-y-1 pt-0.5 text-[9px]">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 shrink-0">Consumed:</span>
                          <span className="text-slate-200 font-medium whitespace-nowrap font-mono">{metrics.dieselConsumedToday} L <span className="text-slate-400 text-[8px]">(@ {metrics.cph}L/h)</span></span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 shrink-0">Run Today:</span>
                          <span className="text-slate-200 font-medium whitespace-nowrap font-mono">{metrics.todayKms} km <span className="text-slate-400 text-[8px]">({metrics.mileage} km/L)</span></span>
                        </div>

                        {/* 1. Running Km Left */}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 shrink-0">Running Km Left:</span>
                          <span className="text-cyan-300 font-bold font-mono whitespace-nowrap">{metrics.runningKmLeft.toLocaleString()} km</span>
                        </div>

                        {/* 2. Refuelling Done last 24 hrs */}
                        <div className="flex justify-between items-center" title="Refuelling Done last 24 hrs">
                          <span className="text-slate-400 shrink-0">Refuelling (24h):</span>
                          <span className={`font-mono font-bold whitespace-nowrap ${metrics.refuel24h > 0 ? "text-emerald-300" : "text-slate-400"}`}>
                            {metrics.refuel24h > 0 ? `+${metrics.refuel24h} L` : '0 L'}
                          </span>
                        </div>

                        {/* 3. Fuel Siphoning last 24 hrs */}
                        <div className="flex justify-between items-center" title="Fuel Siphoning last 24 hrs">
                          <span className="text-slate-400 shrink-0">Siphoning (24h):</span>
                          <span className={`font-mono font-bold whitespace-nowrap ${metrics.siphoning24h > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                            {metrics.siphoning24h > 0 ? `⚠ ${metrics.siphoning24h} L` : '0 L (Clean)'}
                          </span>
                        </div>

                        {/* 4. Battery Voltage */}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 shrink-0">Battery Voltage:</span>
                          <span className="text-amber-200 font-semibold font-mono whitespace-nowrap">{metrics.batteryVoltage} V</span>
                        </div>

                        {/* Day Start (Replaced Shift Start per user instruction) */}
                        <div className="flex justify-between items-center pt-0.5 border-t border-slate-800/60">
                          <span className="text-slate-400 shrink-0">Day Start:</span>
                          <span className={`font-mono whitespace-nowrap font-medium ${metrics.isLateStart ? "text-rose-300" : "text-emerald-300"}`}>
                            {metrics.startedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Status: 10-Hour Shift Refuel Status Pill */}
                  <div className="mt-1.5 pt-2 border-t border-slate-800/80">
                    {metrics.needsRefuel ? (
                      <div className="flex items-center justify-between px-2.5 py-1 rounded bg-rose-950/60 border border-rose-700/50 text-[10px] font-mono text-rose-300">
                        <div className="flex items-center space-x-1">
                          <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                          <span>Deficit:</span>
                        </div>
                        <span className="font-bold">+{metrics.refuelRequired} L Top-up</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-700/50 text-[10px] font-mono text-emerald-300">
                        <div className="flex items-center space-x-1">
                          <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                          <span>10h Duty:</span>
                        </div>
                        <span className="font-bold">Buffer OK</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
