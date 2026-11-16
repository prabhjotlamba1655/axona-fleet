/** Same event catalog and thresholds for every tracker that can supply them. */

export const DEFAULT_THRESHOLDS = {
  harshBrake: 0.55,
  harshAccel: 0.43,
  tiltAngle: 45,
  rashTurningSpeed: 30,
  harshTurningG: 0.47
};

const CATALOG = {
  HARSH_BRAKING: { packetType: 'HB', alertId: 13, severity: 'WARNING' },
  HARSH_ACCEL: { packetType: 'HA', alertId: 14, severity: 'WARNING' },
  VEHICLE_TILT: { packetType: 'TI', alertId: 22, severity: 'CRITICAL' },
  RASH_DRIVING: { packetType: 'RT', alertId: 15, severity: 'WARNING' },
  OVERSPEEDING: { packetType: 'OS', alertId: 17, severity: 'CRITICAL' }
};

const EVENT_ALIASES = {
  HARSH_BRAKING: 'HARSH_BRAKING',
  HARSH_BRAKE: 'HARSH_BRAKING',
  HARSHBRAKING: 'HARSH_BRAKING',
  HB: 'HARSH_BRAKING',
  13: 'HARSH_BRAKING',
  HARSH_ACCEL: 'HARSH_ACCEL',
  HARSH_ACCELERATION: 'HARSH_ACCEL',
  HA: 'HARSH_ACCEL',
  14: 'HARSH_ACCEL',
  VEHICLE_TILT: 'VEHICLE_TILT',
  TILT: 'VEHICLE_TILT',
  TI: 'VEHICLE_TILT',
  22: 'VEHICLE_TILT',
  RASH_DRIVING: 'RASH_DRIVING',
  HARSH_CORNERING: 'RASH_DRIVING',
  CORNERING: 'RASH_DRIVING',
  RT: 'RASH_DRIVING',
  15: 'RASH_DRIVING',
  OVERSPEEDING: 'OVERSPEEDING',
  OVERSPEED: 'OVERSPEEDING',
  OS: 'OVERSPEEDING',
  17: 'OVERSPEEDING'
};

function finite(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function limitsFrom(thresholds = {}) {
  return {
    harshBrake: finite(thresholds.harshBrake ?? thresholds.harsh_brake_threshold) ?? DEFAULT_THRESHOLDS.harshBrake,
    harshAccel: finite(thresholds.harshAccel ?? thresholds.harsh_accel_threshold) ?? DEFAULT_THRESHOLDS.harshAccel,
    tiltAngle: finite(thresholds.tiltAngle ?? thresholds.tilt_angle_threshold) ?? DEFAULT_THRESHOLDS.tiltAngle,
    rashTurningSpeed: finite(thresholds.rashTurningSpeed ?? thresholds.rash_turning_speed) ?? DEFAULT_THRESHOLDS.rashTurningSpeed,
    harshTurningG: finite(thresholds.harshTurningG ?? thresholds.harsh_turning_g) ?? DEFAULT_THRESHOLDS.harshTurningG
  };
}

function namedEvent(value) {
  if (value == null || value === '') return null;
  const key = String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');
  return EVENT_ALIASES[key] || null;
}

function event(eventType, limits, signals, metricValue, thresholdValue) {
  const spec = CATALOG[eventType];
  return {
    eventType,
    packetType: spec.packetType,
    alertId: finite(signals.alertId) || spec.alertId,
    severity: signals.severity || spec.severity,
    metricValue: signals.metricValue || metricValue || eventType,
    thresholdValue: signals.thresholdValue || thresholdValue || ''
  };
}

function signedG(value) {
  const parsed = finite(value);
  if (parsed == null) return null;
  return parsed;
}

/**
 * Teltonika accelerometer AVL 17/18/19 is milli-g. Green-driving AVL 254 is 0.01 g
 * and is converted by the caller.
 */
function milliGToG(value) {
  const parsed = finite(value);
  if (parsed == null) return null;
  return parsed / 1000;
}

function ioValue(io, id) {
  if (!io) return null;
  if (io[id] != null) return finite(io[id]);
  if (io[String(id)] != null) return finite(io[String(id)]);
  return null;
}

export function behaviorFromTeltonikaIo(io = {}, speedKmh = null) {
  const source = io && typeof io === 'object' ? io : {};
  const x = milliGToG(ioValue(source, 17));
  const y = milliGToG(ioValue(source, 18));
  const z = milliGToG(ioValue(source, 19));
  const rawGreen = ioValue(source, 254);
  let tiltDegrees = null;
  if (z != null && Math.abs(z) <= 1.2) {
    const dynamic = Math.abs(x || 0) > 0.2 || Math.abs(y || 0) > 0.2;
    if (!dynamic) {
      const clamped = Math.max(-1, Math.min(1, z));
      tiltDegrees = Math.acos(clamped) * (180 / Math.PI);
    }
  }
  return {
    greenDrivingType: ioValue(source, 253),
    greenDrivingG: rawGreen != null && rawGreen > 0 ? rawGreen / 100 : null,
    longitudinalG: x,
    lateralG: y,
    tiltDegrees,
    speedKmh
  };
}

export function behaviorFromGeneric(payload = {}, speedKmh = null) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const alert = source.alert && typeof source.alert === 'object' ? source.alert : {};
  const axesSource = source.acceleration ?? source.accelerometer;
  const axes = axesSource && typeof axesSource === 'object' ? axesSource : {};
  const brake = signedG(source.brakeG);
  const accel = signedG(source.accelG);
  let longitudinalG = signedG(source.longitudinalG ?? axes.x);
  if (longitudinalG == null && brake != null) longitudinalG = -Math.abs(brake);
  if (longitudinalG == null && accel != null) longitudinalG = Math.abs(accel);

  return {
    eventType: source.eventType || source.event || alert.eventType || alert.type || null,
    alertId: source.alertId || alert.alertId || null,
    severity: alert.severity || null,
    metricValue: alert.metricValue || null,
    thresholdValue: alert.thresholdValue || null,
    greenDrivingType: source.greenDrivingType ?? null,
    greenDrivingG: signedG(source.greenDrivingG),
    longitudinalG,
    lateralG: signedG(source.lateralG ?? axes.y),
    tiltDegrees: signedG(source.tiltDegrees ?? source.tilt ?? source.tiltAngle),
    speedKmh: speedKmh ?? signedG(source.speedKmh ?? source.speed)
  };
}

/**
 * Device-classified events (AIS-140 $ALT, Teltonika green driving, a named JSON event)
 * are kept. Raw g-force and tilt are compared with the device IMU thresholds,
 * falling back to the same defaults for every manufacturer.
 */
export function classifyDriverBehavior(signals = {}, thresholds = {}) {
  if (!signals || typeof signals !== 'object') return null;
  const limits = limitsFrom(thresholds);
  const named = namedEvent(signals.eventType ?? signals.alertId);
  if (named) {
    return event(named, limits, signals, signals.metricValue, signals.thresholdValue);
  }

  const greenType = finite(signals.greenDrivingType);
  const greenG = finite(signals.greenDrivingG);
  const greenText = greenG != null ? `${greenG.toFixed(2)}g` : null;
  if (greenType === 1) {
    return event('HARSH_ACCEL', limits, signals,
      greenText ? `+${greenText} acceleration` : 'harsh acceleration',
      `${limits.harshAccel.toFixed(2)}g (HAT)`);
  }
  if (greenType === 2) {
    return event('HARSH_BRAKING', limits, signals,
      greenText ? `-${greenText} deceleration` : 'harsh braking',
      `${limits.harshBrake.toFixed(2)}g (HBT)`);
  }
  if (greenType === 3) {
    return event('RASH_DRIVING', limits, signals,
      greenText ? `${greenText} cornering` : 'harsh cornering',
      `${limits.harshTurningG.toFixed(2)}g (HTA)`);
  }

  const tilt = finite(signals.tiltDegrees);
  if (tilt != null && Math.abs(tilt) >= limits.tiltAngle) {
    return event('VEHICLE_TILT', limits, signals,
      `${Math.abs(tilt).toFixed(1)}° Vehicle Tilt Angle`,
      `${limits.tiltAngle.toFixed(1)}° (TA)`);
  }

  const longitudinal = finite(signals.longitudinalG);
  if (longitudinal != null && longitudinal <= -limits.harshBrake) {
    return event('HARSH_BRAKING', limits, signals,
      `${longitudinal.toFixed(2)}g deceleration`,
      `${limits.harshBrake.toFixed(2)}g (HBT)`);
  }
  if (longitudinal != null && longitudinal >= limits.harshAccel) {
    return event('HARSH_ACCEL', limits, signals,
      `+${longitudinal.toFixed(2)}g acceleration`,
      `${limits.harshAccel.toFixed(2)}g (HAT)`);
  }

  const lateral = finite(signals.lateralG);
  const speed = finite(signals.speedKmh) || 0;
  if (lateral != null && Math.abs(lateral) >= limits.harshTurningG && speed >= limits.rashTurningSpeed) {
    return event('RASH_DRIVING', limits, signals,
      `${speed.toFixed(0)} km/h (${Math.abs(lateral).toFixed(2)}g lateral)`,
      `${limits.rashTurningSpeed.toFixed(0)} km/h / ${limits.harshTurningG.toFixed(2)}g (RTT/HTA)`);
  }

  return null;
}
