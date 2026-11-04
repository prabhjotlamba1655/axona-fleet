/**
 * Axona Fleet Analytics - Axle Payload & Weigh-In-Motion Telemetry Service
 * Structured into 5 Core Pillars:
 * 1. Load: GVW, Payload, Axlewise Load, Load Utilization
 * 2. Balance: Axle Distribution, Left Right Balance, Load Shift, Sensor Health
 * 3. Compliance: GVW Limit, Axle Limit, Overload, Alerts, Compliance Monitoring
 * 4. Events: Loading, Loaded, Unloading, Empty, Cargo Event Log
 * 5. AI: Load Anomaly (Load/Suspension Anomaly), Under Utilization, Overload, Load Distribution, Utilization Recommendation
 */

function generateAxleTelemetryForVehicle(v) {
  const wheels = v.num_wheels || 16;
  const payload = parseFloat((v.axle_payload_kg || 24000).toFixed(0));
  const maxPayload = parseFloat((v.max_payload_kg || 26000).toFixed(0));

  // Tare weight based on truck class
  const tareWeight = wheels >= 18 ? 15000 : wheels >= 16 ? 14000 : wheels >= 14 ? 12500 : wheels >= 12 ? 10200 : 8200;
  
  // 1. Gross Vehicle Weight (GVW) & Payload
  const gvw = tareWeight + payload;
  const maxGvw = tareWeight + maxPayload;
  const isOverweightGvw = gvw > maxGvw;
  const gvwUtilizationPct = parseFloat(((gvw / maxGvw) * 100).toFixed(1));
  const payloadUtilizationPct = parseFloat(((payload / maxPayload) * 100).toFixed(1));

  // Determine axle configuration based directly on registered num_axles (from vehicle registration)
  const numAxles = parseInt(v.num_axles) || (wheels >= 22 ? 6 : (wheels >= 16 ? 5 : (wheels >= 12 ? 4 : (wheels >= 10 ? 3 : 2))));

  let axleDefs = [];
  if (numAxles === 2) {
    axleDefs = [
      { name: 'Axle 1 (Front Steer)', type: 'STEER', rated_capacity_kg: 7000, baseFraction: 0.35 },
      { name: 'Axle 2 (Rear Drive)', type: 'DRIVE', rated_capacity_kg: 11500, baseFraction: 0.65 }
    ];
  } else if (numAxles === 3) {
    axleDefs = [
      { name: 'Axle 1 (Front Steer)', type: 'STEER', rated_capacity_kg: 7000, baseFraction: 0.24 },
      { name: 'Axle 2 (Drive Tandem 1)', type: 'DRIVE', rated_capacity_kg: 10500, baseFraction: 0.38 },
      { name: 'Axle 3 (Drive Tandem 2)', type: 'DRIVE', rated_capacity_kg: 10500, baseFraction: 0.38 }
    ];
  } else if (numAxles === 4) {
    axleDefs = [
      { name: 'Axle 1 (Front Steer)', type: 'STEER', rated_capacity_kg: 7000, baseFraction: 0.18 },
      { name: 'Axle 2 (Pneumatic Lift)', type: 'LIFT', rated_capacity_kg: 8000, baseFraction: 0.22 },
      { name: 'Axle 3 (Drive Axle 1)', type: 'DRIVE', rated_capacity_kg: 10200, baseFraction: 0.30 },
      { name: 'Axle 4 (Drive Axle 2)', type: 'DRIVE', rated_capacity_kg: 10200, baseFraction: 0.30 }
    ];
  } else if (numAxles === 5) {
    axleDefs = [
      { name: 'Axle 1 (Primary Steer)', type: 'STEER', rated_capacity_kg: 7000, baseFraction: 0.14 },
      { name: 'Axle 2 (Secondary Steer)', type: 'STEER', rated_capacity_kg: 7500, baseFraction: 0.18 },
      { name: 'Axle 3 (Drive Tandem 1)', type: 'DRIVE', rated_capacity_kg: 10200, baseFraction: 0.22 },
      { name: 'Axle 4 (Drive Tandem 2)', type: 'DRIVE', rated_capacity_kg: 10200, baseFraction: 0.23 },
      { name: 'Axle 5 (Trailer Tandem)', type: 'TRAILER', rated_capacity_kg: 11500, baseFraction: 0.23 }
    ];
  } else if (numAxles === 6) {
    axleDefs = [
      { name: 'Axle 1 (Primary Steer)', type: 'STEER', rated_capacity_kg: 7000, baseFraction: 0.12 },
      { name: 'Axle 2 (Pneumatic Lift)', type: 'LIFT', rated_capacity_kg: 7500, baseFraction: 0.14 },
      { name: 'Axle 3 (Drive Tandem 1)', type: 'DRIVE', rated_capacity_kg: 10200, baseFraction: 0.18 },
      { name: 'Axle 4 (Drive Tandem 2)', type: 'DRIVE', rated_capacity_kg: 10200, baseFraction: 0.18 },
      { name: 'Axle 5 (Trailer Tandem 1)', type: 'TRAILER', rated_capacity_kg: 11500, baseFraction: 0.19 },
      { name: 'Axle 6 (Trailer Tandem 2)', type: 'TRAILER', rated_capacity_kg: 11500, baseFraction: 0.19 }
    ];
  } else {
    // Dynamic generation for arbitrary N registered axles
    axleDefs.push({ name: 'Axle 1 (Front Steer)', type: 'STEER', rated_capacity_kg: 7000, baseFraction: 0.15 });
    const share = 0.85 / (numAxles - 1);
    for (let i = 2; i <= numAxles; i++) {
      axleDefs.push({
        name: `Axle ${i} (${i <= numAxles - 2 ? 'Drive Tandem' : 'Trailer Axle'})`,
        type: i <= numAxles - 2 ? 'DRIVE' : 'TRAILER',
        rated_capacity_kg: 10500,
        baseFraction: share
      });
    }
  }

  // Check if vehicle has explicit overload alert (e.g. VH-102 DL-01-AX-9021)
  const isVehicleKnownOverload = (v.id === 'VH-102' || v.reg_no === 'DL-01-AX-9021' || isOverweightGvw);

  let overloadedCount = 0;
  let underloadedCount = 0;
  let axleLoadList = [];
  let totalDistributed = 0;

  axleDefs.forEach((def, idx) => {
    let loadShare = gvw * def.baseFraction;
    
    if (isVehicleKnownOverload && (def.type === 'DRIVE' || def.type === 'TRAILER')) {
      loadShare *= 1.15; // push over 100%
    }
    
    const axleWeight = Math.round(loadShare);
    totalDistributed += axleWeight;

    // Left vs Right Wheel Load: realistic 49% - 51% balance
    const leftBias = 0.495 + ((idx % 3) * 0.007);
    const leftKg = Math.round(axleWeight * leftBias);
    const rightKg = axleWeight - leftKg;
    const lrDeltaKg = Math.abs(leftKg - rightKg);
    const lrBalancePct = parseFloat(((Math.min(leftKg, rightKg) / Math.max(leftKg, rightKg)) * 100).toFixed(1));

    const utilPct = parseFloat(((axleWeight / def.rated_capacity_kg) * 100).toFixed(1));
    const isOverloaded = axleWeight > def.rated_capacity_kg;
    const isUnderloaded = utilPct < 35.0 && def.type !== 'LIFT';
    const excessKg = isOverloaded ? axleWeight - def.rated_capacity_kg : 0;

    if (isOverloaded) overloadedCount++;
    if (isUnderloaded) underloadedCount++;

    let stressLevel = 'NORMAL';
    let heatColor = '#10B981'; // Green
    if (utilPct >= 100) {
      stressLevel = 'CRITICAL';
      heatColor = '#EF4444'; // Red
    } else if (utilPct >= 92) {
      stressLevel = 'HIGH';
      heatColor = '#F97316'; // Orange
    } else if (utilPct >= 80) {
      stressLevel = 'ELEVATED';
      heatColor = '#F59E0B'; // Amber
    }

    const baseBar = 4.5 + (utilPct / 100) * 3.2;
    const airPressureBar = parseFloat(baseBar.toFixed(1));
    const airPressurePsi = Math.round(airPressureBar * 14.5038);

    axleLoadList.push({
      axle_num: idx + 1,
      name: def.name,
      type: def.type,
      current_load_kg: axleWeight,
      rated_capacity_kg: def.rated_capacity_kg,
      left_wheel_kg: leftKg,
      right_wheel_kg: rightKg,
      lr_delta_kg: lrDeltaKg,
      lr_balance_pct: lrBalancePct,
      utilization_pct: utilPct,
      is_overloaded: isOverloaded,
      is_underloaded: isUnderloaded,
      excess_kg: excessKg,
      stress_level: stressLevel,
      heat_color: heatColor,
      air_suspension_pressure_bar: airPressureBar,
      air_suspension_pressure_psi: airPressurePsi
    });
  });

  // Load Distribution Index
  const meanUtil = axleLoadList.reduce((sum, a) => sum + a.utilization_pct, 0) / axleLoadList.length;
  const variance = axleLoadList.reduce((sum, a) => sum + Math.pow(a.utilization_pct - meanUtil, 2), 0) / axleLoadList.length;
  const stdDev = Math.sqrt(variance);
  const loadDistributionIndex = Math.max(60, Math.min(99, Math.round(100 - (stdDev * 1.5))));

  // Overall Left/Right Balance
  const totalLeftKg = axleLoadList.reduce((s, a) => s + a.left_wheel_kg, 0);
  const totalRightKg = axleLoadList.reduce((s, a) => s + a.right_wheel_kg, 0);
  const overallLrDeltaKg = Math.abs(totalLeftKg - totalRightKg);
  const overallLrBalancePct = parseFloat(((Math.min(totalLeftKg, totalRightKg) / Math.max(totalLeftKg, totalRightKg)) * 100).toFixed(1));

  // Compliance calculations
  const totalExcessKg = Math.max(0, gvw - maxGvw);
  const isCompliant = !isOverweightGvw && overloadedCount === 0;
  const challanExposureInr = isCompliant ? 0 : 20000 + (Math.ceil(totalExcessKg / 1000) * 2000);

  // Load Shift
  const hasShift = isVehicleKnownOverload;
  const loadShift = {
    status: hasShift ? 'CARGO_SHIFT_DETECTED' : 'STABLE',
    longitudinal_delta_pct: hasShift ? '+4.2% Rearward' : '+0.2% Normal',
    lateral_delta_pct: hasShift ? '+2.8% Left Side' : '-0.1% Balanced',
    cog_status: hasShift ? 'DYNAMIC INSTABILITY' : 'DYNAMIC STABLE',
    message: hasShift
      ? '⚠ Dynamic weight transfer of +850 kg detected towards rear drive axles during transit.'
      : '✓ Center of gravity stable. Zero longitudinal cargo migration detected.'
  };

  // Sensor Health
  const sensorDiagnostics = axleLoadList.map((a, i) => ({
    sensor_id: `WIM-SG-AX${a.axle_num}`,
    axle_name: a.name,
    status: 'ONLINE',
    protocol: 'CANBus J1939 (PGN 65265)',
    calibration_date: '2026-09-28',
    calibration_status: 'VALID',
    zero_drift_pct: parseFloat((0.05 + (i * 0.04)).toFixed(2)),
    signal_strength: '-58 dBm (Strong)',
    temperature_compensation_c: '+28.4°C'
  }));

  // Compliance Alerts
  const complianceAlerts = [];
  if (isOverweightGvw) {
    complianceAlerts.push({
      id: 'ALT-GVW-1',
      severity: 'CRITICAL',
      title: 'Gross Vehicle Weight Exceeded',
      message: `GVW is ${gvw.toLocaleString()} kg against legal MoRTH limit of ${maxGvw.toLocaleString()} kg (+${totalExcessKg.toLocaleString()} kg excess).`,
      timestamp: 'Just now'
    });
  }
  axleLoadList.filter(a => a.is_overloaded).forEach(a => {
    complianceAlerts.push({
      id: `ALT-AX-${a.axle_num}`,
      severity: 'HIGH',
      title: `${a.name} Overload`,
      message: `Axle weight ${a.current_load_kg.toLocaleString()} kg exceeds rated legal limit of ${a.rated_capacity_kg.toLocaleString()} kg (+${a.excess_kg.toLocaleString()} kg).`,
      timestamp: '2 mins ago'
    });
  });
  if (complianceAlerts.length === 0) {
    complianceAlerts.push({
      id: 'ALT-OK',
      severity: 'NORMAL',
      title: 'All Legal Limits Cleared',
      message: 'Vehicle weight is 100% compliant under MoRTH CMVR Section 113/114 rules.',
      timestamp: 'Active'
    });
  }

  // Events Lifecycle (Loading, Loaded, Unloading, Empty)
  const isCurrentlyEmpty = payload < 2000;
  const isCurrentlyLoading = v.status === 'STOPPED' && payload > 2000 && payload < (maxPayload * 0.7);
  const isCurrentlyLoaded = payload >= (maxPayload * 0.7);
  const isCurrentlyUnloading = v.status === 'STOPPED' && v.current_speed === 0 && (v.route_name || '').includes('DC');

  const cargoEventsLifecycle = {
    current_state: isCurrentlyEmpty ? 'EMPTY' : isCurrentlyLoading ? 'LOADING' : isCurrentlyLoaded ? 'LOADED' : 'UNLOADING',
    loading: {
      status: isCurrentlyLoading ? 'IN_PROGRESS' : 'COMPLETED',
      rate_kg_min: isCurrentlyLoading ? 350 : 0,
      dock_bay: 'Bay-04 North Terminal',
      start_time: '05:30 AM',
      elapsed_mins: 42
    },
    loaded: {
      status: isCurrentlyLoaded ? 'VERIFIED_DISPATCH' : 'PENDING',
      timestamp: '06:45 AM',
      tare_verified_kg: tareWeight,
      dispatch_gvw_kg: gvw,
      seal_number: `SL-${v.reg_no.replace(/[^A-Z0-9]/g, '')}-2026`,
      certified_by: 'Inspector S. Rathore (Scale 2)'
    },
    unloading: {
      status: isCurrentlyUnloading ? 'IN_PROGRESS' : 'SCHEDULED',
      target_location: v.planned_destination || 'Destination Hub',
      eta: '06:45 PM',
      dock_bay: 'Dock-08 Inbound Bay'
    },
    empty: {
      status: isCurrentlyEmpty ? 'ACTIVE_EMPTY' : 'DISPATCH_LOADED',
      tare_kg: tareWeight,
      deadhead_km: isCurrentlyEmpty ? 84 : 0,
      return_freight_available: true
    },
    cargo_event_log: [
      {
        id: 'LOG-01',
        time: '05:30 AM',
        event: 'Tare Scale Weigh-In',
        type: 'EMPTY',
        weight_kg: tareWeight,
        delta_kg: 0,
        location: v.planned_origin || 'Origin Terminal',
        badge: 'SCALE VERIFIED'
      },
      {
        id: 'LOG-02',
        time: '06:30 AM',
        event: 'Loading Complete (+24,000 kg)',
        type: 'LOADING',
        weight_kg: gvw,
        delta_kg: +payload,
        location: v.planned_origin || 'Origin Freight Park',
        badge: 'TAMPER PROOF SEAL'
      },
      {
        id: 'LOG-03',
        time: '08:15 AM',
        event: 'Loaded Dispatch Departure',
        type: 'LOADED',
        weight_kg: gvw,
        delta_kg: 0,
        location: 'NH Highway Outbound Toll',
        badge: 'DISPATCH LOCK'
      },
      {
        id: 'LOG-04',
        time: '11:45 AM',
        event: 'High-Speed WIM Weighbridge Sensor Check',
        type: 'WIM_AUDIT',
        weight_kg: gvw - 120, // fuel burn
        delta_kg: -120,
        location: 'KMP Expressway Toll Plaza',
        badge: 'FASTAG GREEN PASS'
      }
    ]
  };

  // AI Load Optimization & Anomaly Engine
  const aiEngine = {
    load_anomaly: {
      detected: isVehicleKnownOverload,
      type: isVehicleKnownOverload ? 'Axle Load / Suspension Anomaly' : 'Normal Operational Harmonics',
      severity: isVehicleKnownOverload ? 'CRITICAL' : 'OPTIMAL',
      suspension_anomaly: isVehicleKnownOverload 
        ? 'Uneven air spring pressure (+1.2 bar bias on Axle 4 vs Axle 5). Left rear leaf spring stress fatigue detected.'
        : 'Symmetric air bag damping. Zero leak or leaf fatigue across all suspension mountings.',
      damping_efficiency_pct: isVehicleKnownOverload ? 74 : 96
    },
    under_utilization: {
      detected: payloadUtilizationPct < 85,
      utilization_pct: payloadUtilizationPct,
      wasted_capacity_kg: Math.max(0, maxPayload - payload),
      volume_utilization_pct: Math.min(100, Math.round(payloadUtilizationPct * 0.95)),
      potential_revenue_gain_inr: Math.round(Math.max(0, maxPayload - payload) * 0.048 * 800), // ~₹48/ton/km
      message: payloadUtilizationPct >= 85
        ? 'High mass efficiency (Above 85% payload threshold).'
        : `Vehicle carrying ${payload.toLocaleString()} kg against rated ${maxPayload.toLocaleString()} kg capacity (${(maxPayload - payload).toLocaleString()} kg headroom available).`
    },
    overload: {
      predictive_risk: isOverweightGvw || overloadedCount > 0 ? 'HIGH_EXPOSURE' : 'ZERO_RISK',
      challan_exposure_inr: challanExposureInr,
      weighbridge_intercept_prob: isOverweightGvw ? '99.2%' : '0.1%',
      road_damage_factor: isOverweightGvw ? '2.8x Standard ESAL' : '0.9x Nominal',
      braking_distance_delta_pct: isOverweightGvw ? '+22% Elongation' : 'Standard OEM (+0%)'
    },
    load_distribution: {
      uniformity_index_pct: loadDistributionIndex,
      cog_offset_meters: hasShift ? '+0.42m Rearward' : '+0.04m Nominal Center',
      lateral_symmetry_pct: overallLrBalancePct,
      rollover_stability_threshold_g: hasShift ? '0.31g (Elevated Risk)' : '0.45g (Optimal Margin)',
      distribution_curve: 'Steer: 14% | Lift: 18% | Drive Tandem: 52% | Trailer: 16%'
    },
    utilization_recommendation: {
      primary_advice: isOverweightGvw
        ? 'Immediately shift 1,200 kg from rear drive tandem toward center chassis to prevent MoRTH overload seizure.'
        : payloadUtilizationPct < 85
        ? `Consolidate +${(maxPayload - payload).toLocaleString()} kg of return freight at destination hub to maximize profit margin by ₹18,400.`
        : 'Load distribution is optimal. Maintain current air suspension pressure (7.1 bar) for 1.8 L/100km fuel economy.',
      action_items: [
        'Verify front steer axle air pressure is at nominal 7.1 bar before highway transit.',
        'Ensure dynamic weighbridge cross-check is pre-registered on FASTag WIM gateway.',
        'Schedule return trip pallet arrangement with center-of-gravity lock.'
      ]
    }
  };

  return {
    id: v.id,
    reg_no: v.reg_no,
    model: v.model,
    num_wheels: wheels,
    driver_name: v.driver_name,
    driver_phone: v.driver_phone,
    driver_score: v.driver_score,
    speed_kmh: v.speed_kmh,
    status: v.status,
    route_name: v.route_name,
    planned_origin: v.planned_origin,
    planned_destination: v.planned_destination,

    // Pillar 1: Load
    load: {
      gvw_kg: gvw,
      max_gvw_kg: maxGvw,
      gvw_utilization_pct: gvwUtilizationPct,
      payload_kg: payload,
      max_payload_kg: maxPayload,
      tare_weight_kg: tareWeight,
      payload_utilization_pct: payloadUtilizationPct,
      axles: axleLoadList
    },

    // Pillar 2: Balance
    balance: {
      load_distribution_index: loadDistributionIndex,
      load_balance_indicator: hasShift ? 'CRITICAL' : loadDistributionIndex >= 90 ? 'BALANCED' : 'SLIGHTLY_UNBALANCED',
      total_left_kg: totalLeftKg,
      total_right_kg: totalRightKg,
      lr_balance_pct: overallLrBalancePct,
      lr_delta_kg: overallLrDeltaKg,
      load_shift: loadShift,
      sensor_health: {
        active_sensors_count: axleLoadList.length,
        total_sensors_count: axleLoadList.length,
        status: '100% ONLINE',
        canbus_protocol: 'CANBus J1939 (PGN 65265)',
        zero_drift_pct: '<0.1%',
        signal_strength: '-58 dBm',
        calibration_validity_days: 180,
        diagnostics: sensorDiagnostics
      }
    },

    // Pillar 3: Compliance
    compliance: {
      gvw_limit_kg: maxGvw,
      current_gvw_kg: gvw,
      is_compliant: isCompliant,
      status: isCompliant ? 'CMVR COMPLIANT' : 'OVERLOAD VIOLATION',
      statutory_norm: 'MoRTH CMVR Section 113/114',
      axle_limits: axleLoadList.map(a => ({
        axle_num: a.axle_num,
        name: a.name,
        limit_kg: a.rated_capacity_kg,
        current_kg: a.current_load_kg,
        is_over: a.is_overloaded,
        excess_kg: a.excess_kg
      })),
      overload: {
        is_overload: !isCompliant,
        excess_gvw_kg: totalExcessKg,
        overloaded_axles_count: overloadedCount,
        challan_exposure_inr: challanExposureInr,
        toll_clearance: isCompliant ? 'AUTOMATED GREEN PASS' : 'WEIGHBRIDGE STOP REQUIREMENT'
      },
      alerts: complianceAlerts,
      compliance_monitoring: {
        cmvr_audit_status: isCompliant ? 'PASSED (0 PENALTY)' : 'CHALLAN RISK ACTIVE',
        weighbridge_cross_check: 'Verified ±0.4% dynamic precision',
        fastag_status: isCompliant ? 'ACTIVE GREEN CORRIDOR' : 'WEIGH-IN HOLD'
      }
    },

    // Pillar 4: Events
    events: cargoEventsLifecycle,

    // Pillar 5: AI Engine
    ai: aiEngine,

    // Legacy compatibility fields
    gvw_kg: gvw,
    max_gvw_kg: maxGvw,
    gvw_utilization_pct: gvwUtilizationPct,
    payload_kg: payload,
    max_payload_kg: maxPayload,
    tare_weight_kg: tareWeight,
    payload_utilization_pct: payloadUtilizationPct,
    axles: axleLoadList,
    load_distribution_index: loadDistributionIndex,
    load_balance_indicator: hasShift ? 'CRITICAL' : 'BALANCED',
    legal_compliance: {
      is_compliant: isCompliant,
      status: isCompliant ? 'COMPLIANT' : 'OVERLOAD_VIOLATION',
      statutory_norm: 'MoRTH CMVR Section 113/114',
      challan_exposure_inr: challanExposureInr,
      excess_gvw_kg: totalExcessKg
    },
    load_shift: loadShift,
    suspension_health: {
      score_pct: isCompliant ? 94 : 76,
      status: isCompliant ? 'OPTIMAL' : 'ATTENTION_REQUIRED',
      damping_efficiency: isCompliant ? '94%' : '74%',
      shock_fatigue: isCompliant ? 'Minimal' : 'Moderate Wear'
    },
    loading_events: cargoEventsLifecycle.cargo_event_log,
    sensor_diagnostics: sensorDiagnostics,
    ai_insights: [
      {
        title: aiEngine.utilization_recommendation.primary_advice,
        advice: aiEngine.ai_anomaly?.message || 'AI Load Distribution Monitoring',
        estimated_saving: isCompliant ? '100% CMVR Compliance Verified' : `₹${challanExposureInr.toLocaleString()} Challan Risk`
      }
    ]
  };
}

module.exports = {
  generateAxleTelemetryForVehicle
};
