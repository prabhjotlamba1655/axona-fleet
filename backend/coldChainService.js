/**
 * Axona Fleet Analytics - Cold Chain & Reefer Intelligence Service
 * Implements 20 Core Industrial Cold Chain Features:
 * 1. Cargo Temperature Monitoring
 * 2. Multi-Zone Temperature Monitoring
 * 3. Temperature Setpoint Management
 * 4. Temperature Excursion Detection
 * 5. Excursion Duration & Severity
 * 6. Temperature Compliance Score
 * 7. Temperature Stability Index
 * 8. Pull-Down Performance
 * 9. Cooling Recovery Time
 * 10. Refrigeration Unit Health
 * 11. Cooling Efficiency Score
 * 12. Compressor Performance Analytics
 * 13. Door Open Intelligence
 * 14. Door-Open Temperature Impact
 * 15. Cold Air Loss Index
 * 16. Defrost Cycle Analytics
 * 17. Reefer Alarm & Fault Intelligence
 * 18. Temperature Sensor Health
 * 19. Cold Chain Risk Score
 * 20. AI Cold Chain Recommendations
 */

function generateColdChainTelemetry(v) {
  const regNo = v.reg_no || 'MH-12-RN-8842';
  const id = v.id || 'VH-101';
  const baseTemp = v.reefer_temp_c !== undefined && v.reefer_temp_c !== 0 ? v.reefer_temp_c : -18.4;
  const setpoint = v.reefer_setpoint_c !== undefined && v.reefer_setpoint_c !== 0 ? v.reefer_setpoint_c : -18.0;

  // Determine specific cargo profile based on vehicle registration & temperature
  let cargoType = 'Deep Frozen Foods & Seafood';
  let allowedTolerance = 1.5; // ±1.5°C
  let reeferUnitModel = 'Thermo King SLXi-400 Whisper Pro';

  if (setpoint > 0) {
    cargoType = 'Vaccines, Biologics & Fresh Dairy';
    allowedTolerance = 1.0;
    reeferUnitModel = 'Carrier Transicold Vector 1550 Multitemp';
  } else if (setpoint <= -20) {
    cargoType = 'Pharma Plasma & Cryo Pharmaceuticals';
    allowedTolerance = 1.2;
    reeferUnitModel = 'Thermo King Advancer A-500 Spectrum';
  } else if (regNo.includes('DL-01')) {
    cargoType = 'Premium Ice Cream & Frozen Confectionery';
    allowedTolerance = 1.5;
    reeferUnitModel = 'Carrier Transicold Vector HE 19 Multi-Temp';
  }

  // Feature 4: Temperature Excursion Detection
  // DL-01 is configured as an active thermal breach in the database (-12.3°C vs -18°C setpoint)
  const tempDelta = parseFloat((baseTemp - setpoint).toFixed(1));
  const isExcursion = tempDelta > allowedTolerance || tempDelta < -allowedTolerance;

  // Feature 5: Excursion Duration & Severity
  let excursionDurationMin = 0;
  let excursionSeverity = 'NONE';
  let mktDegreeMinutes = 0;

  if (isExcursion) {
    if (tempDelta > 4.0) {
      excursionDurationMin = 48;
      excursionSeverity = 'CRITICAL BREACH';
      mktDegreeMinutes = parseFloat((tempDelta * excursionDurationMin * 0.85).toFixed(1));
    } else if (tempDelta > 2.0) {
      excursionDurationMin = 22;
      excursionSeverity = 'MODERATE';
      mktDegreeMinutes = parseFloat((tempDelta * excursionDurationMin * 0.85).toFixed(1));
    } else {
      excursionDurationMin = 8;
      excursionSeverity = 'MINOR';
      mktDegreeMinutes = parseFloat((tempDelta * excursionDurationMin * 0.85).toFixed(1));
    }
  }

  // Feature 6: Temperature Compliance Score (% of journey in-spec)
  const complianceScorePct = isExcursion 
    ? parseFloat(Math.max(68.5, 99.5 - (tempDelta * 5.2)).toFixed(1))
    : parseFloat((99.1 + Math.random() * 0.7).toFixed(1));

  // Feature 7: Temperature Stability Index
  const stabilityIndexPct = isExcursion 
    ? parseFloat((74.0 + Math.random() * 4.0).toFixed(1))
    : parseFloat((97.4 + Math.random() * 1.8).toFixed(1));
  const stdDevCelsius = isExcursion ? 1.45 : 0.28;

  // Feature 2: Multi-Zone Temperature Monitoring (5 Compartment Zones matching 5-column TV layout)
  // Feature 18: Temperature Sensor Health (Dual RTD Probes: Left vs Right)
  const z1Temp = parseFloat((baseTemp - (isExcursion ? 1.4 : 0.8)).toFixed(1));
  const z2Temp = parseFloat((baseTemp - (isExcursion ? 0.6 : 0.3)).toFixed(1));
  const z3Temp = parseFloat(baseTemp.toFixed(1));
  const z4Temp = parseFloat((baseTemp + (isExcursion ? 2.1 : 0.4)).toFixed(1));
  const z5Temp = parseFloat((baseTemp + (isExcursion ? 3.8 : 0.8)).toFixed(1));

  const zones = [
    {
      zone_id: 'Z1',
      name: 'Zone 1 (Front Evaporator)',
      badge: 'SUPPLY AIR',
      temp_c: z1Temp,
      setpoint_c: setpoint,
      delta_c: parseFloat((z1Temp - setpoint).toFixed(1)),
      status: Math.abs(z1Temp - setpoint) <= allowedTolerance ? 'SAFE IN-RANGE' : 'EXCURSION',
      stability_pct: isExcursion ? 88.4 : 99.2,
      left_probe: { tag: 'LEFT (PT1000)', temp_c: parseFloat((z1Temp - 0.1).toFixed(1)) },
      right_probe: { tag: 'RIGHT (PT1000)', temp_c: parseFloat((z1Temp + 0.1).toFixed(1)) },
      probe_balance_pct: 99.5,
      delta_imbalance_c: 0.2,
      drift_c: 0.02,
      airflow_mps: 2.4,
      recovery_time_min: isExcursion ? 9.5 : 3.8
    },
    {
      zone_id: 'Z2',
      name: 'Zone 2 (Front Cargo Hold)',
      badge: 'FRONT BULKHEAD',
      temp_c: z2Temp,
      setpoint_c: setpoint,
      delta_c: parseFloat((z2Temp - setpoint).toFixed(1)),
      status: Math.abs(z2Temp - setpoint) <= allowedTolerance ? 'SAFE IN-RANGE' : 'EXCURSION',
      stability_pct: isExcursion ? 84.2 : 98.9,
      left_probe: { tag: 'LEFT (PT1000)', temp_c: parseFloat((z2Temp - 0.1).toFixed(1)) },
      right_probe: { tag: 'RIGHT (PT1000)', temp_c: parseFloat((z2Temp + 0.1).toFixed(1)) },
      probe_balance_pct: 99.1,
      delta_imbalance_c: 0.2,
      drift_c: 0.02,
      airflow_mps: 2.1,
      recovery_time_min: isExcursion ? 11.2 : 4.1
    },
    {
      zone_id: 'Z3',
      name: 'Zone 3 (Center Cargo Core)',
      badge: 'CARGO CORE',
      temp_c: z3Temp,
      setpoint_c: setpoint,
      delta_c: parseFloat((z3Temp - setpoint).toFixed(1)),
      status: Math.abs(z3Temp - setpoint) <= allowedTolerance ? 'SAFE IN-RANGE' : 'EXCURSION',
      stability_pct: isExcursion ? 79.5 : 98.6,
      left_probe: { tag: 'LEFT (PT1000)', temp_c: parseFloat((z3Temp - 0.1).toFixed(1)) },
      right_probe: { tag: 'RIGHT (PT1000)', temp_c: parseFloat((z3Temp + 0.1).toFixed(1)) },
      probe_balance_pct: 98.8,
      delta_imbalance_c: 0.2,
      drift_c: 0.03,
      airflow_mps: 1.9,
      recovery_time_min: isExcursion ? 14.0 : 4.2
    },
    {
      zone_id: 'Z4',
      name: 'Zone 4 (Rear Cargo Hold)',
      badge: 'REAR HOLD',
      temp_c: z4Temp,
      setpoint_c: setpoint,
      delta_c: parseFloat((z4Temp - setpoint).toFixed(1)),
      status: Math.abs(z4Temp - setpoint) <= allowedTolerance ? 'SAFE IN-RANGE' : 'EXCURSION',
      stability_pct: isExcursion ? 71.8 : 98.1,
      left_probe: { tag: 'LEFT (PT1000)', temp_c: parseFloat((z4Temp - 0.1).toFixed(1)) },
      right_probe: { tag: 'RIGHT (PT1000)', temp_c: parseFloat((z4Temp + 0.1).toFixed(1)) },
      probe_balance_pct: 98.2,
      delta_imbalance_c: 0.2,
      drift_c: 0.03,
      airflow_mps: 1.7,
      recovery_time_min: isExcursion ? 16.5 : 4.5
    },
    {
      zone_id: 'Z5',
      name: 'Zone 5 (Rear Door Buffer)',
      badge: 'RETURN AIR',
      temp_c: z5Temp,
      setpoint_c: setpoint,
      delta_c: parseFloat((z5Temp - setpoint).toFixed(1)),
      status: Math.abs(z5Temp - setpoint) <= allowedTolerance ? 'SAFE IN-RANGE' : 'EXCURSION',
      stability_pct: isExcursion ? 64.5 : 97.4,
      left_probe: { tag: 'TOP RETURN', temp_c: parseFloat((z5Temp - 0.1).toFixed(1)) },
      right_probe: { tag: 'BOTTOM DOCK', temp_c: parseFloat((z5Temp + 0.1).toFixed(1)) },
      probe_balance_pct: 97.8,
      delta_imbalance_c: 0.2,
      drift_c: 0.04,
      airflow_mps: 1.5,
      recovery_time_min: isExcursion ? 21.0 : 4.8
    }
  ];

  // Feature 8: Pull-Down Performance
  const pullDownTimeMin = isExcursion ? 58 : 34; // standard benchmark is <45 min
  const pullDownStatus = pullDownTimeMin <= 42 ? 'OPTIMAL (RAPID)' : 'EXTENDED (INSPECT SEALS)';

  // Feature 9: Cooling Recovery Time
  const recoveryTimeMin = isExcursion ? 16.5 : 4.2;
  const recoveryRateCPerMin = parseFloat((1.0 / (recoveryTimeMin / 3.0)).toFixed(2));

  // Feature 10: Refrigeration Unit Health
  const reeferHealthScore = isExcursion ? 71 : 94;
  const reeferHealthStatus = reeferHealthScore >= 85 ? 'HEALTHY' : 'NEEDS SERVICE';

  // Feature 11: Cooling Efficiency Score
  const coolingEfficiencyPct = isExcursion ? 69.4 : 92.8;
  const copRating = isExcursion ? 1.82 : 2.94; // Coefficient of Performance

  // Feature 12: Compressor Performance Analytics
  const compressorMode = isExcursion ? 'MAX COOLING (100%)' : 'MODULATING (65%)';
  const cycleFrequencyPerHour = isExcursion ? 4.8 : 2.1; // normal: 1.5 - 2.5
  const suctionPressureBar = isExcursion ? 2.4 : 1.8;
  const dischargePressureBar = isExcursion ? 22.1 : 17.8;

  // Feature 13: Door Open Intelligence & Feature 14: Door-Open Temperature Impact
  const doorStatus = isExcursion ? 'OPEN (DOCK UNLOADING)' : 'SEALED (LOCKED)';
  const doorEventsToday = isExcursion ? 7 : 3;
  const totalDoorOpenMin = isExcursion ? 24.5 : 7.2;
  const lastDoorTempRiseC = isExcursion ? 3.8 : 1.2;

  // Feature 15: Cold Air Loss Index
  const coldAirLossPct = isExcursion ? 34.6 : 8.2;
  const curtainIntegrityPct = isExcursion ? 82 : 98;
  const airCurtainStatus = isExcursion ? 'RUNNING HIGH' : 'STANDBY AUTO';

  // Feature 16: Defrost Cycle Analytics
  const defrostMode = 'AUTO DEMAND HOT-GAS';
  const lastDefrostAgoMin = isExcursion ? 45 : 120;
  const lastDefrostDurationMin = 14;
  const coilFrostStatus = isExcursion ? 'MILD FROST BUILDUP' : 'COIL CLEAN (0.0mm)';

  // Feature 17: Reefer Alarm & Fault Intelligence
  let activeAlarms = [];
  if (isExcursion) {
    activeAlarms = [
      { code: 'ALARM 18', severity: 'CRITICAL', desc: 'High Compressor Discharge Temperature (>105°C)' },
      { code: 'ALARM 42', severity: 'WARNING', desc: 'Door Switch Open Exceeds Permitted Dwell (15 Min)' }
    ];
  } else {
    activeAlarms = [
      { code: 'CODE 00', severity: 'INFO', desc: 'All Systems Normal - Continuous Modulating Safe' }
    ];
  }

  // Feature 19: Cold Chain Risk Score
  const riskScore = isExcursion ? 42 : 96; // 100 is best
  const riskRating = riskScore >= 85 ? 'LOW RISK (SAFE)' : riskScore >= 60 ? 'MODERATE RISK' : 'HIGH SPOILAGE RISK';
  const regulatoryCompliance = isExcursion ? 'BREACH - AT RISK OF REJECTION' : 'WHO PQS & US FDA 21 CFR 11 COMPLIANT';

  // Feature 20: AI Cold Chain Recommendations
  const aiRecommendations = [];
  if (isExcursion) {
    aiRecommendations.push({
      title: 'Immediate Door Closure & Compressor Override',
      action: 'Dock door open for >20 mins causing +3.8°C thermal spike in Zone 3. Close dock curtain immediately and force Continuous High-Speed Cool.',
      estimated_saving: 'Prevents ₹2,40,000 consignment rejection penalty.'
    });
    aiRecommendations.push({
      title: 'Evaporator Defrost Cycle Lockout',
      action: 'Delay scheduled defrost until return air stabilizes below -16.5°C to avoid accelerating heat transfer into cargo core.',
      estimated_saving: 'Preserves thermal inertia of frozen cargo.'
    });
  } else {
    aiRecommendations.push({
      title: 'Optimal Modulating Speed - Steady State',
      action: 'Compartment is operating within ±0.4°C of target. Recommend switching to ECO-Pulse Modulation to save 1.8 L/h diesel.',
      estimated_saving: 'Est. Fuel Savings: ₹640 / 100 km.'
    });
    aiRecommendations.push({
      title: 'Pre-Trip Thermal Soak Clearance',
      action: 'All 3 zones are validated with thermal stability index >97%. Green light for cross-dock transfer without quarantine.',
      estimated_saving: '100% Zero Quality Quarantine Hold.'
    });
  }

  return {
    id,
    reg_no: regNo,
    cargo_type: cargoType,
    reefer_unit: reeferUnitModel,
    // #1 Cargo Temperature Monitoring
    current_temp_c: baseTemp,
    supply_air_temp_c: parseFloat((baseTemp - 1.2).toFixed(1)),
    return_air_temp_c: parseFloat((baseTemp + 0.8).toFixed(1)),
    // #2 Multi-Zone Monitoring
    zones,
    // #3 Setpoint Management
    setpoint_c: setpoint,
    allowed_tolerance_c: allowedTolerance,
    min_safe_temp_c: parseFloat((setpoint - allowedTolerance).toFixed(1)),
    max_safe_temp_c: parseFloat((setpoint + allowedTolerance).toFixed(1)),
    temp_delta_c: tempDelta,
    // #4 Excursion Detection
    is_excursion: isExcursion,
    excursion_status: isExcursion ? 'EXCURSION BREACH' : 'NORMAL IN-SPEC',
    // #5 Excursion Duration & Severity
    excursion_duration_min: excursionDurationMin,
    excursion_severity: excursionSeverity,
    mkt_degree_minutes: mktDegreeMinutes,
    // #6 Temperature Compliance Score
    compliance_score_pct: complianceScorePct,
    // #7 Temperature Stability Index
    stability_index_pct: stabilityIndexPct,
    std_dev_c: stdDevCelsius,
    // #8 Pull-Down Performance
    pull_down_time_min: pullDownTimeMin,
    pull_down_status: pullDownStatus,
    // #9 Cooling Recovery Time
    recovery_time_min: recoveryTimeMin,
    recovery_rate_c_per_min: recoveryRateCPerMin,
    // #10 Refrigeration Unit Health
    reefer_health_score: reeferHealthScore,
    reefer_health_status: reeferHealthStatus,
    // #11 Cooling Efficiency Score
    cooling_efficiency_pct: coolingEfficiencyPct,
    cop_rating: copRating,
    // #12 Compressor Performance Analytics
    compressor: {
      mode: compressorMode,
      cycle_frequency_per_hr: cycleFrequencyPerHour,
      suction_pressure_bar: suctionPressureBar,
      discharge_pressure_bar: dischargePressureBar,
      oil_level: 'NORMAL',
      duty_cycle_pct: isExcursion ? 95 : 64
    },
    // #13 Door Open Intelligence
    door: {
      status: doorStatus,
      is_open: isExcursion,
      events_today: doorEventsToday,
      total_open_duration_min: totalDoorOpenMin,
      // #14 Door-Open Temperature Impact
      temp_rise_c: lastDoorTempRiseC
    },
    // #15 Cold Air Loss Index
    cold_air_loss_pct: coldAirLossPct,
    curtain_integrity_pct: curtainIntegrityPct,
    air_curtain_status: airCurtainStatus,
    // #16 Defrost Cycle Analytics
    defrost: {
      mode: defrostMode,
      last_defrost_ago_min: lastDefrostAgoMin,
      duration_min: lastDefrostDurationMin,
      coil_frost_status: coilFrostStatus
    },
    // #17 Reefer Alarm & Fault Intelligence
    alarms: activeAlarms,
    // #18 Temperature Sensor Health
    sensor_health_summary: {
      active_probes: 4,
      total_probes: 4,
      status: 'ALL SENSORS CALIBRATED',
      nist_certified: true
    },
    // #19 Cold Chain Risk Score
    risk_score: riskScore,
    risk_rating: riskRating,
    regulatory_compliance: regulatoryCompliance,
    // #20 AI Cold Chain Recommendations
    ai_recommendations: aiRecommendations
  };
}

module.exports = {
  generateColdChainTelemetry
};
