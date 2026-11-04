import React, { useState, useEffect } from 'react';
import { 
  Weight, AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, 
  Activity, Gauge, TrendingUp, Cpu, Sparkles, Layers, Scale,
  Truck, RefreshCw, Check, Play, Pause, Home, PanelLeftClose, PanelLeftOpen,
  ArrowRight, Clock, FileText, Zap, ChevronRight, AlertOctagon, RotateCw,
  Box, Anchor, ArrowUpDown, Compass, CheckCircle, BarChart3, Database, Plus, MapPin
} from 'lucide-react';
import { fetchAxlePayload } from '../../services/api';

export default function AxlePayloadView({ onReturnHome, sidebarCollapsed, onToggleSidebar }) {
  const [vehiclesAxles, setVehiclesAxles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('MH-12-RN-8842');
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [stopsMode, setStopsMode] = useState('multi'); // 'multi' (7 points) or 'single' (2 points)

  // Multi-Stop Demo Dataset with 7 Loading & Unloading Points
  const multiStopsData = [
    {
      stop_num: 1,
      type: 'LOADING',
      code: 'L1',
      time: '05:30 hrs',
      name: 'JNPT Port Mumbai',
      dock: 'Bay-04 Terminal',
      cargo_action: '+24,000 kg',
      cargo_sub: 'Initial Cargo Load',
      status: 'COMPLETED',
      status_label: '✓ Loaded & Sealed',
      seal: 'SL-MH12-01',
      is_done: true
    },
    {
      stop_num: 2,
      type: 'UNLOADING',
      code: 'U1',
      time: '07:45 hrs',
      name: 'Bhiwandi Hub',
      dock: 'Dock-02 Inbound',
      cargo_action: '-6,000 kg',
      cargo_sub: '18,000 kg remaining',
      status: 'COMPLETED',
      status_label: '✓ Discharged',
      is_done: true
    },
    {
      stop_num: 3,
      type: 'LOADING',
      code: 'L2',
      time: '09:15 hrs',
      name: 'Kalyan Industrial',
      dock: 'Bay-01 Express Yard',
      cargo_action: '+4,200 kg',
      cargo_sub: '22,200 kg on board',
      status: 'COMPLETED',
      status_label: '✓ Loaded & Scaled',
      seal: 'SL-MH12-02',
      is_done: true
    },
    {
      stop_num: 4,
      type: 'UNLOADING',
      code: 'U2',
      time: '11:30 hrs',
      name: 'Nashik Agro DC',
      dock: 'Dock-06 Inbound',
      cargo_action: '-8,000 kg',
      cargo_sub: '14,200 kg remaining',
      status: 'COMPLETED',
      status_label: '✓ Discharged',
      is_done: true
    },
    {
      stop_num: 5,
      type: 'UNLOADING',
      code: 'U3',
      time: '13:45 hrs',
      name: 'Dhule Cross-Dock',
      dock: 'Bay-03 Transit Dock',
      cargo_action: '-5,200 kg',
      cargo_sub: '9,000 kg on board',
      status: 'COMPLETED',
      status_label: '✓ Discharged',
      is_done: true
    },
    {
      stop_num: 6,
      type: 'LOADING',
      code: 'L3',
      time: '16:15 hrs',
      name: 'Jalgaon Agro Hub',
      dock: 'Bay-02 Cold Dock',
      cargo_action: '+12,000 kg',
      cargo_sub: 'Pickup Assigned',
      status: 'NEXT',
      status_label: '⚑ Next Loading',
      is_done: false
    },
    {
      stop_num: 7,
      type: 'UNLOADING',
      code: 'U4',
      time: '18:30 hrs',
      name: 'MIHAN SEZ Nagpur',
      dock: 'Dock-08 Final Drop',
      cargo_action: '-21,000 kg',
      cargo_sub: 'Final Cargo Discharge',
      status: 'SCHEDULED',
      status_label: '⚑ Final Unload Dock',
      is_done: false
    }
  ];

  const loadData = () => {
    fetchAxlePayload().then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setVehiclesAxles(data);
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

  // TV Screen Auto-Rotation between trucks
  useEffect(() => {
    if (!autoRotate || vehiclesAxles.length === 0) return;
    const rotateInterval = setInterval(() => {
      setSelectedVehicleId(prev => {
        const idx = vehiclesAxles.findIndex(v => v.id === prev || v.reg_no === prev);
        const nextIdx = (idx + 1) % vehiclesAxles.length;
        return vehiclesAxles[nextIdx].id;
      });
    }, 12000);
    return () => clearInterval(rotateInterval);
  }, [autoRotate, vehiclesAxles]);

  const activeVehicle = vehiclesAxles.find(v => v.id === selectedVehicleId || v.reg_no === selectedVehicleId) || vehiclesAxles[0] || null;

  // Extract or compute fallback fields if needed
  const vLoad = activeVehicle?.load || {
    gvw_kg: activeVehicle?.gvw_kg || 38000,
    max_gvw_kg: activeVehicle?.max_gvw_kg || 40000,
    gvw_utilization_pct: activeVehicle?.gvw_utilization_pct || 95.0,
    payload_kg: activeVehicle?.payload_kg || 24000,
    max_payload_kg: activeVehicle?.max_payload_kg || 26000,
    tare_weight_kg: activeVehicle?.tare_weight_kg || 14000,
    payload_utilization_pct: activeVehicle?.payload_utilization_pct || 92.3,
    axles: activeVehicle?.axles || []
  };

  const vBalance = activeVehicle?.balance || {
    load_distribution_index: activeVehicle?.load_distribution_index || 89,
    load_balance_indicator: activeVehicle?.load_balance_indicator || 'BALANCED',
    total_left_kg: 18920,
    total_right_kg: 19080,
    lr_balance_pct: 99.2,
    lr_delta_kg: 160,
    load_shift: activeVehicle?.load_shift || {
      status: 'STABLE',
      longitudinal_delta_pct: '+0.2% Normal',
      lateral_delta_pct: '-0.1% Balanced',
      message: '✓ Center of gravity stable. Zero longitudinal cargo migration detected.'
    },
    sensor_health: {
      active_sensors_count: activeVehicle?.axles?.length || 5,
      total_sensors_count: activeVehicle?.axles?.length || 5,
      status: '100% ONLINE',
      canbus_protocol: 'CANBus J1939 (PGN 65265)',
      zero_drift_pct: '<0.1%',
      signal_strength: '-58 dBm',
      calibration_validity_days: 180
    }
  };

  const vCompliance = activeVehicle?.compliance || {
    gvw_limit_kg: activeVehicle?.max_gvw_kg || 40000,
    current_gvw_kg: activeVehicle?.gvw_kg || 38000,
    is_compliant: activeVehicle?.legal_compliance?.is_compliant ?? true,
    status: activeVehicle?.legal_compliance?.is_compliant ? 'CMVR COMPLIANT' : 'OVERLOAD VIOLATION',
    statutory_norm: 'MoRTH CMVR Section 113/114',
    axle_limits: (activeVehicle?.axles || []).map(a => ({
      axle_num: a.axle_num,
      name: a.name,
      limit_kg: a.rated_capacity_kg,
      current_kg: a.current_load_kg,
      is_over: a.is_overloaded,
      excess_kg: a.excess_kg
    })),
    overload: {
      is_overload: !(activeVehicle?.legal_compliance?.is_compliant ?? true),
      excess_gvw_kg: activeVehicle?.legal_compliance?.excess_gvw_kg || 0,
      overloaded_axles_count: activeVehicle?.overloaded_axles_count || 0,
      challan_exposure_inr: activeVehicle?.legal_compliance?.challan_exposure_inr || 0,
      toll_clearance: activeVehicle?.legal_compliance?.is_compliant ? 'AUTOMATED GREEN PASS' : 'WEIGHBRIDGE STOP REQUIREMENT'
    },
    alerts: [
      {
        id: 'ALT-1',
        severity: activeVehicle?.legal_compliance?.is_compliant ? 'NORMAL' : 'CRITICAL',
        title: activeVehicle?.legal_compliance?.is_compliant ? 'CMVR Legal Compliance Cleared' : 'Overload Violation Recorded',
        message: activeVehicle?.legal_compliance?.is_compliant
          ? 'Vehicle weight is 100% compliant under MoRTH CMVR Section 113/114 rules.'
          : `Excess payload of +${(activeVehicle?.legal_compliance?.excess_gvw_kg || 1200).toLocaleString()} kg over statutory axle limit.`,
        timestamp: 'Active'
      }
    ],
    compliance_monitoring: {
      cmvr_audit_status: activeVehicle?.legal_compliance?.is_compliant ? 'PASSED (₹0 PENALTY)' : 'CHALLAN RISK ACTIVE',
      weighbridge_cross_check: 'Verified ±0.4% dynamic precision',
      fastag_status: activeVehicle?.legal_compliance?.is_compliant ? 'ACTIVE GREEN CORRIDOR' : 'WEIGH-IN HOLD'
    }
  };

  const vEvents = activeVehicle?.events || {
    current_state: 'LOADED',
    loading: {
      status: 'COMPLETED',
      rate_kg_min: 0,
      dock_bay: 'Bay-04 North Terminal',
      start_time: '05:30 AM'
    },
    loaded: {
      status: 'VERIFIED_DISPATCH',
      timestamp: '06:45 AM',
      tare_verified_kg: vLoad.tare_weight_kg,
      dispatch_gvw_kg: vLoad.gvw_kg,
      seal_number: `SL-${(activeVehicle?.reg_no || 'MH12').replace(/[^A-Z0-9]/g, '')}-2026`,
      certified_by: 'Inspector S. Rathore (Scale 2)'
    },
    unloading: {
      status: 'SCHEDULED',
      target_location: activeVehicle?.planned_destination || 'Destination Hub',
      eta: '06:45 PM',
      dock_bay: 'Dock-08 Inbound Bay'
    },
    empty: {
      status: 'DISPATCH_LOADED',
      tare_kg: vLoad.tare_weight_kg,
      deadhead_km: 0,
      return_freight_available: true
    },
    cargo_event_log: [
      {
        id: 'LOG-01',
        time: '05:30 AM',
        event: 'Tare Scale Weigh-In',
        type: 'EMPTY',
        weight_kg: vLoad.tare_weight_kg,
        delta_kg: 0,
        location: activeVehicle?.planned_origin || 'Origin Terminal',
        badge: 'SCALE VERIFIED'
      },
      {
        id: 'LOG-02',
        time: '06:30 AM',
        event: 'Loading Complete (+24,000 kg)',
        type: 'LOADING',
        weight_kg: vLoad.gvw_kg,
        delta_kg: +vLoad.payload_kg,
        location: activeVehicle?.planned_origin || 'Origin Freight Park',
        badge: 'TAMPER PROOF SEAL'
      },
      {
        id: 'LOG-03',
        time: '08:15 AM',
        event: 'Loaded Dispatch Departure',
        type: 'LOADED',
        weight_kg: vLoad.gvw_kg,
        delta_kg: 0,
        location: 'NH Highway Outbound Toll',
        badge: 'DISPATCH LOCK'
      },
      {
        id: 'LOG-04',
        time: '11:45 AM',
        event: 'High-Speed WIM Sensor Check',
        type: 'WIM_AUDIT',
        weight_kg: vLoad.gvw_kg - 120,
        delta_kg: -120,
        location: 'Expressway Toll Plaza WIM',
        badge: 'FASTAG GREEN PASS'
      }
    ]
  };

  const vAI = activeVehicle?.ai || {
    load_anomaly: {
      detected: !vCompliance.is_compliant,
      type: !vCompliance.is_compliant ? 'Axle Load / Suspension Anomaly' : 'Normal Operational Harmonics',
      severity: !vCompliance.is_compliant ? 'CRITICAL' : 'OPTIMAL',
      suspension_anomaly: !vCompliance.is_compliant 
        ? 'Uneven air spring pressure (+1.2 bar bias on Drive Axle). Left rear leaf spring stress fatigue detected.'
        : 'Symmetric air bag damping. Zero leak or leaf fatigue across all suspension mountings.',
      damping_efficiency_pct: !vCompliance.is_compliant ? 74 : 96
    },
    under_utilization: {
      detected: vLoad.payload_utilization_pct < 85,
      utilization_pct: vLoad.payload_utilization_pct,
      wasted_capacity_kg: Math.max(0, vLoad.max_payload_kg - vLoad.payload_kg),
      volume_utilization_pct: Math.min(100, Math.round(vLoad.payload_utilization_pct * 0.95)),
      potential_revenue_gain_inr: Math.round(Math.max(0, vLoad.max_payload_kg - vLoad.payload_kg) * 0.048 * 800),
      message: vLoad.payload_utilization_pct >= 85
        ? 'High mass efficiency (Above 85% payload threshold).'
        : `Vehicle carrying ${vLoad.payload_kg.toLocaleString()} kg against rated ${vLoad.max_payload_kg.toLocaleString()} kg capacity.`
    },
    overload: {
      predictive_risk: !vCompliance.is_compliant ? 'HIGH_EXPOSURE' : 'ZERO_RISK',
      challan_exposure_inr: vCompliance.overload.challan_exposure_inr,
      weighbridge_intercept_prob: !vCompliance.is_compliant ? '99.2%' : '0.1%',
      road_damage_factor: !vCompliance.is_compliant ? '2.8x Standard ESAL' : '0.9x Nominal',
      braking_distance_delta_pct: !vCompliance.is_compliant ? '+22% Elongation' : 'Standard OEM (+0%)'
    },
    load_distribution: {
      uniformity_index_pct: vBalance.load_distribution_index,
      cog_offset_meters: !vCompliance.is_compliant ? '+0.42m Rearward' : '+0.04m Nominal Center',
      lateral_symmetry_pct: vBalance.lr_balance_pct,
      rollover_stability_threshold_g: !vCompliance.is_compliant ? '0.31g (Elevated Risk)' : '0.45g (Optimal Margin)',
      distribution_curve: 'Steer: 14% | Lift: 18% | Drive Tandem: 52% | Trailer: 16%'
    },
    utilization_recommendation: {
      primary_advice: !vCompliance.is_compliant
        ? 'Immediately shift 1,200 kg from rear drive tandem toward center chassis to prevent MoRTH overload seizure.'
        : vLoad.payload_utilization_pct < 85
        ? `Consolidate +${(vLoad.max_payload_kg - vLoad.payload_kg).toLocaleString()} kg of return freight at destination hub to maximize profit margin by ₹18,400.`
        : 'Load distribution is optimal. Maintain current air suspension pressure (7.1 bar) for 1.8 L/100km fuel economy.',
      action_items: [
        'Verify front steer axle air pressure is at nominal 7.1 bar before highway transit.',
        'Ensure dynamic weighbridge cross-check is pre-registered on FASTag WIM gateway.',
        'Schedule return trip pallet arrangement with center-of-gravity lock.'
      ]
    }
  };

  const isOver = !vCompliance.is_compliant;

  return (
    <div className="h-full w-full flex flex-col bg-[#050A16] text-slate-100 overflow-hidden select-none p-2 space-y-1.5 justify-between font-sans">
      {/* ------------------------------------------------------------- */}
      {/* TOP COMPACT TV HEADER & VEHICLE SELECTOR STRIP                 */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#081126] border border-cyan-950/80 rounded-xl px-3 py-1.5 shrink-0 shadow-md flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded-md bg-[#0D1830] text-cyan-400 hover:text-white border border-cyan-800/60 transition"
              title={sidebarCollapsed ? "Expand Menu" : "Collapse Menu"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          )}
          <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Scale size={16} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xs font-black uppercase font-['Chakra_Petch'] text-white tracking-wide">
                Axle Payload &amp; WIM Telematics
              </h1>
              <span className="text-[8.5px] font-mono px-2 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold uppercase tracking-wider">
                Executive WIM NOC • 1 Category Per Row
              </span>
            </div>
            <div className="text-[9.5px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="text-slate-200 font-bold">{activeVehicle?.reg_no}</span>
              <span>•</span>
              <span>{activeVehicle?.model || 'Commercial Multi-Axle'}</span>
              <span>•</span>
              <span className={isOver ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {isOver ? '⚠ OVERLOAD VIOLATION' : '✓ CMVR COMPLIANT'}
              </span>
            </div>
          </div>
        </div>

        {/* Right controls: Vehicle selector pills strip & Auto TV */}
        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
          <div className="flex items-center space-x-1 max-w-sm overflow-x-auto no-scrollbar">
            {vehiclesAxles.map(v => {
              const isSelected = (v.id === activeVehicle?.id || v.reg_no === activeVehicle?.reg_no);
              const isVOver = !v.legal_compliance?.is_compliant;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition border ${
                    isSelected
                      ? 'bg-cyan-950/90 border-cyan-400 text-white font-bold ring-1 ring-cyan-400/80 shadow'
                      : 'bg-[#050B18] text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <span>{v.reg_no.split('-')[0]}-{v.reg_no.split('-')[1]}</span>
                  <span className={`text-[8px] px-1 rounded font-bold ${
                    isVOver ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {isVOver ? 'OVER' : `${Math.round(v.gvw_kg / 1000)}T`}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded border ${
              autoRotate ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold' : 'bg-[#050B18] border-slate-800 text-slate-400'
            }`}
            title="Auto cycle trucks every 12s"
          >
            {autoRotate ? <Pause size={9} /> : <Play size={9} />}
            <span className="hidden lg:inline">{autoRotate ? 'Auto: ON' : 'Auto: OFF'}</span>
          </button>

          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#0A1329] hover:bg-[#12224A] text-cyan-300 border border-cyan-700/60 font-mono transition shadow"
              title="Return to Home (Esc)"
            >
              <Home size={10} />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}
        </div>
      </div>

      {loading || !activeVehicle ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-mono text-sm">
          <RefreshCw className="animate-spin mr-2 text-cyan-400" size={18} />
          Connecting to High-Speed Weigh-In-Motion Sensors &amp; CANBus...
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* 5 CATEGORIES — EACH IN ITS OWN ROW, STACKED VERTICALLY        */
        /* ALL 5 VISIBLE SIMULTANEOUSLY IN ONE PAGE VIEW                 */
        /* ------------------------------------------------------------- */
        <div className="flex-1 flex flex-col justify-between space-y-1 overflow-hidden">
          
          {/* ============================================================ */}
          {/* ROW 1: LOAD & COMPLIANCE (GVW, Payload, Axlewise, Utilization, Compliance Breached) */}
          {/* ============================================================ */}
          <div className="p-1.5 rounded-xl bg-[#081126] border border-[#16254A] flex flex-col justify-between shadow">
            {/* Category Row Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                  <Box size={11} />
                </div>
                <span className="text-[11px] font-black text-white uppercase font-['Chakra_Petch'] tracking-wide">
                  Row 1 • Load
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  (GVW, Payload, Axlewise Load, Load Utilization, Compliance Breached)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-[8.5px] px-2 py-0.2 rounded-full font-bold font-mono ${
                  isOver ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                }`}>
                  {isOver ? 'COMPLIANCE BREACHED' : '✓ ALL LIMITS CLEARED'}
                </span>
                <span className="text-[8px] text-slate-500 font-mono">+ Can Add More Boxes</span>
              </div>
            </div>

            {/* Category Boxes Strip */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 font-mono">
              {/* Box 1.1: GVW */}
              <div className={`p-1.5 rounded-lg border flex flex-col justify-between ${
                isOver ? 'bg-[#1C0A15] border-rose-600/70' : 'bg-[#040A18] border-slate-800/90'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">GVW (Gross Weight)</span>
                  <span className={`text-[7.5px] px-1 py-0.2 rounded font-bold ${isOver ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-cyan-300'}`}>
                    {vLoad.gvw_utilization_pct}% Limit
                  </span>
                </div>
                <div className="my-0.5">
                  <span className={`text-base font-black ${isOver ? 'text-rose-400' : 'text-white'}`}>
                    {vLoad.gvw_kg.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-400 ml-1">kg</span>
                </div>
                <div className="text-[8px] text-slate-400 flex justify-between">
                  <span>Legal Max: {vLoad.max_gvw_kg.toLocaleString()} kg</span>
                  <span>Tare: {vLoad.tare_weight_kg.toLocaleString()} kg</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-700/60 mt-1">
                  <div
                    className={`h-full transition-all duration-500 ${isOver ? 'bg-rose-500' : 'bg-cyan-400'}`}
                    style={{ width: `${Math.min(100, vLoad.gvw_utilization_pct)}%` }}
                  />
                </div>
              </div>

              {/* Box 1.2: Payload */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">Payload (Net Cargo)</span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                    Net Mass
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="text-base font-black text-cyan-300">
                    {vLoad.payload_kg.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-400 ml-1">kg</span>
                </div>
                <div className="text-[8px] text-slate-400 flex justify-between">
                  <span>Rated Cap: {vLoad.max_payload_kg.toLocaleString()} kg</span>
                  <span>Tare: {vLoad.tare_weight_kg.toLocaleString()} kg</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-700/60 mt-1">
                  <div
                    className="h-full bg-indigo-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, vLoad.payload_utilization_pct)}%` }}
                  />
                </div>
              </div>

              {/* Box 1.3: Axlewise Load (Dynamic matching registered axles) */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">
                    Axlewise Load ({vLoad.axles.length} Axles)
                  </span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded font-bold bg-emerald-950 text-emerald-300">
                    Active
                  </span>
                </div>
                {/* Fully dynamic columns matching exact registered axle count */}
                <div
                  className="grid gap-1 my-0.5 text-center"
                  style={{ gridTemplateColumns: `repeat(${Math.max(1, vLoad.axles.length)}, minmax(0, 1fr))` }}
                >
                  {vLoad.axles.map(ax => (
                    <div key={ax.axle_num} className="p-0.5 rounded bg-[#07132B] border border-slate-800">
                      <span className="text-[7px] text-slate-400 block truncate" title={ax.name}>
                        {ax.name.split(' ')[0]} {ax.axle_num}
                      </span>
                      <span className={`text-[8px] font-bold block ${ax.is_overloaded ? 'text-rose-400' : 'text-slate-200'}`}>
                        {Math.round(ax.current_load_kg / 1000)}T
                      </span>
                      <div className="w-full bg-slate-900 h-0.5 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full" style={{ width: `${Math.min(100, ax.utilization_pct)}%`, backgroundColor: ax.heat_color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[7.5px] text-slate-400 flex justify-between">
                  <span>Front: {(vLoad.axles[0]?.current_load_kg || 0).toLocaleString()}kg</span>
                  <span>Rear: {(vLoad.axles[vLoad.axles.length - 1]?.current_load_kg || 0).toLocaleString()}kg</span>
                </div>
              </div>

              {/* Box 1.4: Load Utilization */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">Load Utilization</span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded font-bold bg-emerald-950 text-emerald-300">
                    {vLoad.payload_utilization_pct >= 85 ? 'Optimal' : 'Headroom'}
                  </span>
                </div>
                <div className="my-0.5 flex items-baseline justify-between">
                  <span className="text-base font-black text-emerald-400">
                    {vLoad.payload_utilization_pct}%
                  </span>
                  <span className="text-[8px] text-slate-400 font-sans">
                    Vol: ~{Math.round(vLoad.payload_utilization_pct * 0.95)}%
                  </span>
                </div>
                <div className="text-[8px] text-slate-400 flex justify-between">
                  <span>Mass Cap: {vLoad.max_payload_kg.toLocaleString()} kg</span>
                  <span className="text-emerald-400 font-bold">{vLoad.payload_utilization_pct >= 85 ? '✓ High Mass Eff.' : 'Headroom Avail.'}</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-700/60 mt-1">
                  <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, vLoad.payload_utilization_pct)}%` }} />
                </div>
              </div>

              {/* Box 1.5: Compliance Breached (Last Box) */}
              <div className={`p-1.5 rounded-lg border flex flex-col justify-between ${
                isOver ? 'bg-[#220B19] border-rose-600/80 shadow-[0_0_12px_rgba(244,63,94,0.2)]' : 'bg-[#040A18] border-slate-800/90'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">Compliance Breached</span>
                  <span className={`text-[7.5px] px-1.5 py-0.2 rounded font-bold ${
                    isOver ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}>
                    {isOver ? 'BREACHED' : 'CLEARED'}
                  </span>
                </div>
                <div className="my-0.5">
                  <span className={`text-base font-black ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isOver ? `+${(vCompliance.overload?.excess_gvw_kg || 1400).toLocaleString()} kg` : '0 kg Excess'}
                  </span>
                  <span className="text-[8.5px] text-slate-400 ml-1">{isOver ? 'Overload' : 'Compliant'}</span>
                </div>
                <div className="text-[8px] text-slate-400 flex justify-between">
                  <span className={isOver ? 'text-rose-300 font-bold' : 'text-slate-400'}>
                    {isOver ? `₹${(vCompliance.overload?.challan_exposure_inr || 22000).toLocaleString()} Fine Exposure` : '₹0 Fine / Fastag Pass'}
                  </span>
                  <span className="text-cyan-400">CMVR 113/114</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-700/60 mt-1">
                  <div
                    className={`h-full ${isOver ? 'bg-rose-500' : 'bg-emerald-400'}`}
                    style={{ width: isOver ? '100%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ROW 2: BALANCE (Axle Dist, Left Right Balance, Shift, Health) */}
          {/* ============================================================ */}
          <div className="p-1.5 rounded-xl bg-[#081126] border border-[#16254A] flex flex-col justify-between shadow">
            {/* Category Row Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <Scale size={11} />
                </div>
                <span className="text-[11px] font-black text-white uppercase font-['Chakra_Petch'] tracking-wide">
                  Row 2 • Balance
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  (Axle Distribution, Left Right Balance, Load Shift, Sensor Health)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-[8.5px] px-2 py-0.2 rounded-full font-bold font-mono ${
                  vBalance.load_balance_indicator === 'BALANCED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}>
                  {vBalance.load_balance_indicator}
                </span>
                <span className="text-[8px] text-slate-500 font-mono">+ Can Add More Boxes</span>
              </div>
            </div>

            {/* Category Boxes Strip */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono">
              {/* Box 2.1: Axle Distribution */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">Axle Distribution</span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded font-bold bg-emerald-950 text-emerald-300">
                    Optimal
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="text-base font-black text-emerald-400">
                    {vBalance.load_distribution_index}%
                  </span>
                  <span className="text-[9px] text-slate-400 ml-1">Uniformity</span>
                </div>
                <div className="text-[8px] text-slate-400 truncate">
                  Curve: Steer 15% • Drive 52% • Trailer 33%
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-700/60 mt-1">
                  <div className="h-full bg-emerald-400" style={{ width: `${vBalance.load_distribution_index}%` }} />
                </div>
              </div>

              {/* Box 2.2: Left Right Balance */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">Left Right Balance</span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded font-bold bg-cyan-950 text-cyan-300">
                    Δ {vBalance.lr_delta_kg} kg
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="text-base font-black text-cyan-300">
                    {vBalance.lr_balance_pct}%
                  </span>
                  <span className="text-[9px] text-slate-400 ml-1">Symmetry</span>
                </div>
                <div className="text-[8px] text-slate-400 flex justify-between">
                  <span>L: {vBalance.total_left_kg.toLocaleString()}kg</span>
                  <span>R: {vBalance.total_right_kg.toLocaleString()}kg</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-slate-700/60 mt-1">
                  <div className="h-full bg-cyan-400" style={{ width: `${vBalance.lr_balance_pct}%` }} />
                </div>
              </div>

              {/* Box 2.3: Load Shift */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">Load Shift (CoG)</span>
                  <span className={`text-[7.5px] px-1 py-0.2 rounded font-bold ${
                    vBalance.load_shift.status === 'STABLE' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                  }`}>
                    {vBalance.load_shift.status === 'STABLE' ? 'STABLE' : 'SHIFT DETECTED'}
                  </span>
                </div>
                <div className="my-0.5">
                  <span className={`text-base font-black ${vBalance.load_shift.status === 'STABLE' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {vBalance.load_shift.longitudinal_delta_pct}
                  </span>
                </div>
                <div className="text-[8px] text-slate-400 flex justify-between">
                  <span>Lat: {vBalance.load_shift.lateral_delta_pct}</span>
                  <span className="text-cyan-300">50Hz CAN</span>
                </div>
                <div className="text-[7.5px] text-slate-500 truncate mt-0.5">
                  Zero longitudinal migration
                </div>
              </div>

              {/* Box 2.4: Sensor Health */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase font-sans">Sensor Health</span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded font-bold bg-emerald-950 text-emerald-300">
                    100% ONLINE
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="text-base font-black text-emerald-400">
                    {vBalance.sensor_health.active_sensors_count}/{vBalance.sensor_health.total_sensors_count}
                  </span>
                  <span className="text-[9px] text-slate-400 ml-1">Load Cells</span>
                </div>
                <div className="text-[8px] text-slate-400 flex justify-between">
                  <span>Drift: {vBalance.sensor_health.zero_drift_pct}</span>
                  <span>Sig: {vBalance.sensor_health.signal_strength}</span>
                </div>
                <div className="text-[7.5px] text-emerald-400 mt-0.5">
                  Cal Valid ({vBalance.sensor_health.calibration_validity_days}d remaining)
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ROW 3: EVENTS (Only Loading & Unloading Points • 00:00 hrs till Current Time) */}
          {/* ============================================================ */}
          <div className="p-1.5 rounded-xl bg-[#081126] border border-[#16254A] flex flex-col justify-between shadow">
            {/* Category Row Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                  <Clock size={11} />
                </div>
                <span className="text-[11px] font-black text-white uppercase font-['Chakra_Petch'] tracking-wide">
                  Row 3 • Events Timeline
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  (Loading &amp; Unloading Points Only • 00:00 hrs till Live Time • No Route Prediction)
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono">
                {/* View Switcher: 7 Points Multi-Stop vs 2 Points Single-Leg */}
                <div className="flex items-center bg-[#050B18] p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setStopsMode('multi')}
                    className={`text-[8px] font-bold px-2 py-0.5 rounded transition-all ${
                      stopsMode === 'multi'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    7 Points (Multi-Stop Demo)
                  </button>
                  <button
                    onClick={() => setStopsMode('single')}
                    className={`text-[8px] font-bold px-2 py-0.5 rounded transition-all ${
                      stopsMode === 'single'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2 Points (Single Leg)
                  </button>
                </div>
                <span className="text-[8px] px-2 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                  {stopsMode === 'multi' ? '7 STOPS CONFIGURED' : `STATUS: ${vEvents.current_state}`}
                </span>
                <span className="text-[8px] text-emerald-400 font-bold">00:00 hrs → Live Time (Active)</span>
              </div>
            </div>

            {/* Simple Dotted Timeline Line with Small Indicators for Loading, En Route & Unloading */}
            {stopsMode === 'multi' ? (
              <div className="relative px-3 py-1.5 my-0.5 font-mono">
                {/* Background Simple Dotted Line */}
                <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-slate-700/80 z-0" />

                {/* Active Dotted Progress Line up to En Route Position (Stop 5) */}
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-cyan-400 z-0 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  style={{ width: '70%' }}
                />

                {/* Small Indicators positioned along the simple dotted line */}
                <div className="relative z-10 flex items-center justify-between text-[7.5px]">
                  {/* 00:00 hrs Start */}
                  <div className="flex items-center space-x-1 bg-[#081126] px-1.5 py-0.5 rounded-full border border-slate-700 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-bold text-slate-300">00:00 hrs</span>
                  </div>

                  {/* L1 */}
                  <div className="flex items-center space-x-1 bg-[#051124] px-1.5 py-0.5 rounded-full border border-cyan-500/70 shadow-[0_0_6px_rgba(6,182,212,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="font-bold text-cyan-300">L1 • 05:30</span>
                    <span className="text-[6.5px] px-1 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">✓ Loaded</span>
                  </div>

                  {/* U1 */}
                  <div className="flex items-center space-x-1 bg-[#0B0D26] px-1.5 py-0.5 rounded-full border border-purple-500/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span className="font-bold text-purple-300">U1 • 07:45</span>
                    <span className="text-[6.5px] px-1 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">✓ Unloaded</span>
                  </div>

                  {/* L2 */}
                  <div className="flex items-center space-x-1 bg-[#051124] px-1.5 py-0.5 rounded-full border border-cyan-500/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="font-bold text-cyan-300">L2 • 09:15</span>
                    <span className="text-[6.5px] px-1 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">✓ Loaded</span>
                  </div>

                  {/* U2 */}
                  <div className="flex items-center space-x-1 bg-[#0B0D26] px-1.5 py-0.5 rounded-full border border-purple-500/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span className="font-bold text-purple-300">U2 • 11:30</span>
                    <span className="text-[6.5px] px-1 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">✓ Unloaded</span>
                  </div>

                  {/* U3 */}
                  <div className="flex items-center space-x-1 bg-[#0B0D26] px-1.5 py-0.5 rounded-full border border-purple-500/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span className="font-bold text-purple-300">U3 • 13:45</span>
                    <span className="text-[6.5px] px-1 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">✓ Unloaded</span>
                  </div>

                  {/* En Route Live Indicator */}
                  <div className="flex items-center space-x-1 bg-[#181106] px-2 py-0.5 rounded-full border border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
                    <Truck size={9} className="text-amber-400" />
                    <span className="font-black text-amber-300 uppercase">En Route: 88 km/h</span>
                    <span className="text-[6.5px] text-slate-300 font-bold">(9,000 kg)</span>
                  </div>

                  {/* L3 Next */}
                  <div className="flex items-center space-x-1 bg-[#121326] px-1.5 py-0.5 rounded-full border border-cyan-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="font-bold text-cyan-200">L3 • 16:15</span>
                    <span className="text-[6.5px] px-1 rounded bg-amber-950 text-amber-300 font-bold border border-amber-700">⚑ Next</span>
                  </div>

                  {/* U4 Final */}
                  <div className="flex items-center space-x-1 bg-[#121326] px-1.5 py-0.5 rounded-full border border-slate-700">
                    <MapPin size={8} className="text-indigo-400" />
                    <span className="font-bold text-slate-300">U4 • 18:30</span>
                    <span className="text-[6.5px] px-1 rounded bg-slate-900 text-slate-400 font-bold border border-slate-700">⚑ Final</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative px-4 py-2 my-0.5 font-mono">
                {/* Background Simple Dotted Line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-slate-700/80 z-0" />

                {/* Active Dotted Progress Overlay (from start to live en route position) */}
                <div
                  className="absolute left-6 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-cyan-400 z-0 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  style={{ width: vEvents.current_state === 'UNLOADING' ? '92%' : '66%' }}
                />

                {/* Small Indicators positioned cleanly along the dotted line */}
                <div className="relative z-10 flex items-center justify-between">
                  {/* 1. Day Start Indicator */}
                  <div className="flex items-center space-x-1.5 bg-[#081126] px-2 py-0.5 rounded-full border border-slate-700/80 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[7.5px] font-bold text-slate-300">00:00 hrs</span>
                  </div>

                  {/* 2. Loading Point Indicator */}
                  <div className="flex items-center space-x-1.5 bg-[#051124] px-2.5 py-0.5 rounded-full border border-cyan-500/70 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span className="text-[8px] font-black text-cyan-300 uppercase">
                      05:30 hrs • Loading Point ({vEvents.loading?.dock_bay ? vEvents.loading.dock_bay.split(' ')[0] : 'Bay-04'})
                    </span>
                    <span className="text-[7px] px-1 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                      ✓ Loaded
                    </span>
                  </div>

                  {/* 3. Small En Route Indicator (showing Loading or Unloading in En Route) */}
                  <div className="flex items-center space-x-1.5 bg-[#181106] px-2.5 py-0.5 rounded-full border border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-pulse">
                    <Truck size={10} className="text-amber-400" />
                    <span className="text-[8px] font-black text-amber-300 uppercase tracking-tight">
                      En Route: {vEvents.current_state === 'UNLOADING' ? 'At Unloading Dock' : 'Loaded • En Route to Unload'}
                    </span>
                    <span className="text-[7px] text-slate-300 font-bold">
                      ({activeVehicle?.speed_kmh || 58} km/h • Live)
                    </span>
                  </div>

                  {/* 4. Unloading Point Indicator */}
                  <div className="flex items-center space-x-1.5 bg-[#0B0D26] px-2.5 py-0.5 rounded-full border border-indigo-500/70 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                    <MapPin size={9} className="text-indigo-400" />
                    <span className="text-[8px] font-black text-indigo-200 uppercase">
                      Unloading Point ({vEvents.unloading?.target_location ? vEvents.unloading.target_location.split(' ')[0] : 'Nagpur'} Dock-08)
                    </span>
                    <span className={`text-[7px] px-1 rounded font-bold border ${
                      vEvents.current_state === 'UNLOADING'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                    }`}>
                      {vEvents.current_state === 'UNLOADING' ? '● Unloading Now' : 'Destination'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stop Panels: 7 Columns in Multi-Stop Mode OR 2 Columns in Single-Leg Mode */}
            {stopsMode === 'multi' ? (
              <div className="grid grid-cols-7 gap-1 pt-0.5 font-mono">
                {multiStopsData.map(stop => {
                  const isLoading = stop.type === 'LOADING';
                  const isCompleted = stop.is_done;
                  const isNext = stop.status === 'NEXT';

                  return (
                    <div
                      key={stop.stop_num}
                      className={`p-1.5 rounded-lg border flex flex-col justify-between transition-all ${
                        isNext
                          ? 'bg-[#181508] border-amber-500/90 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : isLoading
                          ? 'bg-[#051124] border-cyan-500/50 shadow-[0_0_6px_rgba(6,182,212,0.1)]'
                          : 'bg-[#0B0D26] border-purple-500/50 shadow-[0_0_6px_rgba(168,85,247,0.1)]'
                      }`}
                    >
                      {/* Card Header: Code & Time */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <div className="flex items-center space-x-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLoading ? 'bg-cyan-400' : 'bg-purple-400'
                            }`}
                          />
                          <span
                            className={`text-[9px] font-black uppercase font-sans ${
                              isLoading ? 'text-cyan-300' : 'text-purple-300'
                            }`}
                          >
                            {stop.code} • {isLoading ? 'Load' : 'Unload'}
                          </span>
                        </div>
                        <span className="text-[7.5px] px-1 py-0.2 rounded font-bold bg-[#030914] text-slate-300 border border-slate-700">
                          {stop.time}
                        </span>
                      </div>

                      {/* Location & Dock */}
                      <div className="my-1">
                        <div className="text-[10px] font-bold text-white truncate" title={stop.name}>
                          {stop.name}
                        </div>
                        <div className="text-[7.5px] text-slate-400 truncate" title={stop.dock}>
                          {stop.dock}
                        </div>
                      </div>

                      {/* Cargo Action Metric */}
                      <div className="p-1 rounded bg-[#030914] border border-slate-800/80 text-center my-0.5">
                        <span
                          className={`text-[10px] font-black block ${
                            isLoading ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {stop.cargo_action}
                        </span>
                        <span className="text-[6.5px] text-slate-400 block truncate" title={stop.cargo_sub}>
                          {stop.cargo_sub}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className="pt-0.5 border-t border-slate-800/80 text-center">
                        <span
                          className={`text-[7px] font-bold block truncate py-0.2 px-1 rounded ${
                            isNext
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : isCompleted
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {stop.status_label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Two Dedicated Panels: Only Loading Point & Unloading Point */
              <div className="grid grid-cols-2 gap-2 pt-0.5 font-mono">
                {/* Box 3.1: LOADING POINT */}
                <div className="p-2 rounded-lg bg-[#051124] border border-cyan-500/60 flex flex-col justify-between shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                  <div className="flex items-center justify-between pb-1 border-b border-cyan-900/40">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span className="text-[10px] font-black text-cyan-300 uppercase font-sans tracking-wide">
                        1. Loading Point
                      </span>
                    </div>
                    <span className="text-[7.5px] px-1.5 py-0.2 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                      05:30 hrs • ORIGIN DOCK
                    </span>
                  </div>

                  <div className="my-1">
                    <div className="text-xs font-bold text-white truncate" title={vEvents.loading?.dock_bay}>
                      {vEvents.loading?.dock_bay || 'Bay-04 North Terminal'}
                    </div>
                    <div className="text-[8.5px] text-slate-300 truncate" title={activeVehicle?.planned_origin}>
                      Origin Hub: <span className="text-cyan-200 font-semibold">{activeVehicle?.planned_origin || 'JNPT Port Mumbai'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 my-0.5 text-center text-[8px]">
                    <div className="p-1 rounded bg-[#030914] border border-slate-800">
                      <span className="text-[7px] text-slate-400 block uppercase">Tare Mass</span>
                      <span className="font-bold text-white">{vLoad.tare_weight_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="p-1 rounded bg-[#030914] border border-slate-800">
                      <span className="text-[7px] text-slate-400 block uppercase">Net Payload</span>
                      <span className="font-bold text-cyan-300">{vLoad.payload_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="p-1 rounded bg-[#030914] border border-slate-800">
                      <span className="text-[7px] text-slate-400 block uppercase">Gross Mass</span>
                      <span className="font-bold text-emerald-400">{(vEvents.loaded?.dispatch_gvw_kg || vLoad.gvw_kg).toLocaleString()} kg</span>
                    </div>
                  </div>

                  <div className="text-[7.5px] text-slate-300 flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="truncate" title={vEvents.loaded?.seal_number}>
                      Seal: <strong className="text-cyan-300">{vEvents.loaded?.seal_number || `SL-${activeVehicle?.reg_no}-26`}</strong>
                    </span>
                    <span className="text-emerald-400 font-bold">✓ Loading Verified &amp; Dispatched</span>
                  </div>
                </div>

                {/* Box 3.2: UNLOADING POINT (No further route prediction) */}
                <div className="p-2 rounded-lg bg-[#0B0D26] border border-indigo-500/60 flex flex-col justify-between shadow-[0_0_10px_rgba(99,102,241,0.15)]">
                  <div className="flex items-center justify-between pb-1 border-b border-indigo-900/40">
                    <div className="flex items-center space-x-1.5">
                      <MapPin size={10} className="text-indigo-400" />
                      <span className="text-[10px] font-black text-indigo-200 uppercase font-sans tracking-wide">
                        2. Unloading Point
                      </span>
                    </div>
                    <span className="text-[7.5px] px-1.5 py-0.2 rounded font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                      {activeVehicle?.status === 'UNLOADING' ? 'UNLOADING ACTIVE' : 'DESTINATION DOCK'}
                    </span>
                  </div>

                  <div className="my-1">
                    <div className="text-xs font-bold text-white truncate" title={vEvents.unloading?.target_location || activeVehicle?.planned_destination}>
                      {vEvents.unloading?.target_location || activeVehicle?.planned_destination || 'MIHAN SEZ Nagpur'}
                    </div>
                    <div className="text-[8.5px] text-slate-300 truncate" title={vEvents.unloading?.dock_bay}>
                      Inbound Dock: <span className="text-indigo-200 font-semibold">{vEvents.unloading?.dock_bay || 'Dock-08 Inbound Bay'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 my-0.5 text-center text-[8px]">
                    <div className="p-1 rounded bg-[#050616] border border-slate-800">
                      <span className="text-[7px] text-slate-400 block uppercase">Target Cargo</span>
                      <span className="font-bold text-indigo-300">{vLoad.payload_kg.toLocaleString()} kg</span>
                    </div>
                    <div className="p-1 rounded bg-[#050616] border border-slate-800">
                      <span className="text-[7px] text-slate-400 block uppercase">Transit Route</span>
                      <span className="font-bold text-white truncate block">{activeVehicle?.route_name?.split(' ')[0] || 'Corridor'}</span>
                    </div>
                    <div className="p-1 rounded bg-[#050616] border border-slate-800">
                      <span className="text-[7px] text-slate-400 block uppercase">Dock Bay</span>
                      <span className="font-bold text-indigo-300">Dock-08</span>
                    </div>
                  </div>

                  <div className="text-[7.5px] text-slate-300 flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Assigned Inbound Point</span>
                    <span className="text-indigo-300 font-bold">⚑ Destination Dock Assigned (No Route Prediction)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* ROW 4: AI (Anomaly, Under-Util, Overload, Distribution, Advice) */}
          {/* ============================================================ */}
          <div className="p-1.5 rounded-xl bg-[#081126] border border-[#16254A] flex flex-col justify-between shadow">
            {/* Category Row Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-md bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <Sparkles size={11} />
                </div>
                <span className="text-[11px] font-black text-white uppercase font-['Chakra_Petch'] tracking-wide">
                  Row 4 • AI
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  (Load Anomaly, Under Utilization, Overload, Load Distribution, Utilization Recommendation)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[8.5px] px-2 py-0.2 rounded-full font-bold font-mono bg-amber-950 text-amber-300 border border-amber-700">
                  NEURAL WIM MODEL
                </span>
                <span className="text-[8px] text-slate-500 font-mono">+ Can Add More Boxes</span>
              </div>
            </div>

            {/* Category Boxes Strip */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 font-mono">
              {/* Box 5.1: Load Anomaly */}
              <div className={`p-1.5 rounded-lg border flex flex-col justify-between ${
                vAI.load_anomaly.detected ? 'bg-[#1C0A15] border-rose-600/70 text-rose-300' : 'bg-[#040A18] border-slate-800/90'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-semibold text-slate-400 uppercase font-sans truncate">Load/Suspension Anomaly</span>
                  <span className={`text-[7px] px-1 rounded font-bold ${vAI.load_anomaly.detected ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'}`}>
                    {vAI.load_anomaly.severity}
                  </span>
                </div>
                <div className="text-[8px] text-slate-300 my-0.5 line-clamp-2 leading-tight">
                  {vAI.load_anomaly.suspension_anomaly}
                </div>
                <div className="text-[7.5px] text-cyan-400">
                  Damping Eff: {vAI.load_anomaly.damping_efficiency_pct}%
                </div>
              </div>

              {/* Box 5.2: Under Utilization */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-semibold text-slate-400 uppercase font-sans">Under Utilization</span>
                  <span className="text-[7px] px-1 rounded font-bold bg-cyan-950 text-cyan-300">
                    {vAI.under_utilization.utilization_pct}%
                  </span>
                </div>
                <div className="my-0.5">
                  <span className="text-xs font-bold text-white block">
                    {vAI.under_utilization.wasted_capacity_kg > 0 ? `${vAI.under_utilization.wasted_capacity_kg.toLocaleString()} kg Headroom` : 'Max Utilized'}
                  </span>
                </div>
                <div className="text-[7.5px] text-slate-400">
                  Potential: +₹{vAI.under_utilization.potential_revenue_gain_inr.toLocaleString()}
                </div>
              </div>

              {/* Box 5.3: Overload */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-semibold text-slate-400 uppercase font-sans">Overload (AI Risk)</span>
                  <span className={`text-[7px] px-1 rounded font-bold ${isOver ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'}`}>
                    {vAI.overload.predictive_risk.split('_')[0]}
                  </span>
                </div>
                <div className="text-[8px] text-slate-300 my-0.5">
                  Intercept Prob: {vAI.overload.weighbridge_intercept_prob}
                </div>
                <div className="text-[7.5px] text-slate-400">
                  Braking: {vAI.overload.braking_distance_delta_pct}
                </div>
              </div>

              {/* Box 5.4: Load Distribution */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-slate-800/90 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] font-semibold text-slate-400 uppercase font-sans">Load Distribution</span>
                  <span className="text-[7px] px-1 rounded font-bold bg-emerald-950 text-emerald-300">
                    {vAI.load_distribution.uniformity_index_pct}% CoG
                  </span>
                </div>
                <div className="text-[8px] text-slate-300 my-0.5">
                  Offset: {vAI.load_distribution.cog_offset_meters}
                </div>
                <div className="text-[7.5px] text-slate-400">
                  Rollover: {vAI.load_distribution.rollover_stability_threshold_g}
                </div>
              </div>

              {/* Box 5.5: Utilization Recommendation */}
              <div className="p-1.5 rounded-lg bg-[#040A18] border border-amber-900/60 flex flex-col justify-between">
                <div className="flex items-center space-x-1 text-amber-300 text-[8.5px] font-bold uppercase">
                  <Sparkles size={10} className="text-amber-400 shrink-0" />
                  <span className="truncate">Utilization Advice</span>
                </div>
                <p className="text-[8px] text-slate-200 line-clamp-2 leading-tight my-0.5">
                  {vAI.utilization_recommendation.primary_advice}
                </p>
                <div className="text-[7.5px] text-emerald-400 flex justify-between">
                  <span>Save: 1.8L/100km</span>
                  <span>Tire: +14%</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
