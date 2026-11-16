/** Company-admin limits from the telematics guide. */
export const IMU_LIMITS = {
  harshBrake: { min: 0.35, max: 0.80, fallback: 0.55 },
  harshAccel: { min: 0.25, max: 0.65, fallback: 0.43 },
  tiltAngle: { min: 30, max: 60, fallback: 45 },
  rashTurning: { min: 20, max: 50, fallback: 30 },
  harshTurning: { min: 0.30, max: 0.65, fallback: 0.47 },
  speedLimit: { min: 30, max: 90, fallback: 70 }
};

export function validateImuConfig(input = {}) {
  const errors = [];
  const value = {};
  for (const [key, bounds] of Object.entries(IMU_LIMITS)) {
    const number = Number(input[key]);
    if (!Number.isFinite(number) || number < bounds.min || number > bounds.max) {
      errors.push(`${key} must be between ${bounds.min} and ${bounds.max}`);
    } else {
      value[key] = number;
    }
  }
  return { ok: errors.length === 0, errors, value };
}
