/** Penalties shown on the Driver Intelligence scorecard. */
const PENALTY = {
  harshBraking: 3,
  harshAccel: 2,
  vehicleTilt: 10,
  rashDriving: 4,
  overspeeding: 2
};

export function safetyScore(counts) {
  const penalty =
    (counts.harshBraking || 0) * PENALTY.harshBraking +
    (counts.harshAccel || 0) * PENALTY.harshAccel +
    (counts.vehicleTilt || 0) * PENALTY.vehicleTilt +
    (counts.rashDriving || 0) * PENALTY.rashDriving +
    (counts.overspeedPenalty == null
      ? (counts.overspeeding || 0) * PENALTY.overspeeding
      : Number(counts.overspeedPenalty));
  return Math.max(20, Math.min(100, 100 - penalty));
}

export function riskTier(score, vehicleTilt = 0) {
  if (score < 70 || vehicleTilt > 0) return 'High Risk';
  if (score < 85) return 'Moderate Risk';
  return 'Safe';
}

export function fleetSafetyScore(scores) {
  if (!scores.length) return 100;
  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round(total / scores.length);
}

export function rankLeaderboard(rows) {
  const scored = rows.map((row) => {
    const counts = {
      harshBraking: row.harsh_braking_count || 0,
      harshAccel: row.harsh_accel_count || 0,
      vehicleTilt: row.vehicle_tilt_count || 0,
      rashDriving: row.rash_driving_count || 0,
      overspeeding: row.overspeeding_count || 0,
      overspeedPenalty: row.overspeed_penalty == null ? undefined : Number(row.overspeed_penalty)
    };
    const score = safetyScore(counts);
    return {
      vehicleId: row.vehicle_id,
      registrationNumber: row.registration_number,
      vehicleName: [row.make, row.model].filter(Boolean).join(' ') || 'Vehicle',
      category: row.category_name || '',
      driverName: row.owner_name || 'Assigned Driver',
      totalViolations: row.total_violations || 0,
      harshBraking: counts.harshBraking,
      harshAccel: counts.harshAccel,
      vehicleTilt: counts.vehicleTilt,
      rashDriving: counts.rashDriving,
      overspeeding: counts.overspeeding,
      safetyScore: score,
      riskTier: riskTier(score, counts.vehicleTilt),
      lastIncident: row.last_incident_time || 'None'
    };
  });

  scored.sort((a, b) =>
    b.safetyScore - a.safetyScore
    || a.vehicleTilt - b.vehicleTilt
    || String(a.registrationNumber).localeCompare(String(b.registrationNumber))
  );

  return scored.map((row, index) => ({ rank: index + 1, ...row }));
}
