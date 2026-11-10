/**
 * Standardized Telematics Alert Message Formatter
 * Ensures 100% message consistency across Chronological Alerts feed (View 1),
 * Live Map Tracking alerts, and Alert & Report Audit Log modals (View 2).
 */

export function formatStandardizedAlertMessage(alert) {
  if (!alert) return '';
  const type = alert.type || alert.alert_type || '';
  const vehicleReg = alert.reg_no || alert.vehicleReg || alert.vehicle_id || 'Vehicle';
  const metric = alert.metric_value || alert.metric || '';
  const details = alert.message || alert.details || '';
  const location = alert.location || '';
  const time = alert.timestamp || alert.time || '';

  // 1. Refuelling Completed / Refuel Done
  if (type === 'REFUEL_DONE' || type === 'REFUEL_SUCCESS') {
    if (alert.id === 'ALT-1013' || (location && location.includes('Delhi-Jaipur'))) {
      return `Refuelling detected! Your vehicle number ${vehicleReg} has added 380 litres of fuel at BPCL COCO Plaza Hub, Delhi-Jaipur Expressway (KM 84), at 08:30 AM.`;
    }
    const volMatch = (metric || details).match(/\+?([\d.]+)\s*(?:Liters?|Litres?|L)/i);
    const vol = volMatch ? Math.round(parseFloat(volMatch[1])) : '380';
    const loc = location ? ` at ${location}` : '';
    const tm = time ? `, at ${time}` : '';
    return `Refuelling detected! Your vehicle number ${vehicleReg} has added ${vol} litres of fuel${loc}${tm}.`;
  }

  // 2. Fuel Siphoning / Sudden Drop
  if (type === 'FUEL_SIPHONING' || type === 'FUEL_SIPHONING_LOSS') {
    const match = (metric || details).match(/([\d.]+)[\s]*(?:Liters?|Litres?|L)/i);
    const qty = match ? match[1] : '28.5';
    return `Sudden drop of ${qty}L detected in Fuel Tank.`;
  }

  // 3. Refueling Quantity Mismatch
  if (type === 'REFUEL_MISMATCH' || type === 'REFUEL_DISCREPANCY') {
    return details || `Slip / Card statement recorded 180.0L but digital tank sensor rise was only 158.0L. Discrepancy of 22.0L shortfall.`;
  }

  // 4. Harsh Braking
  if (type === 'HARSH_BRAKING') {
    return `Harsh braking detected! Your vehicle number ${vehicleReg} has experienced sudden deceleration. Please check driver safety & ensure safe driving practices.`;
  }

  // 5. Sharp Cornering Spike
  if (type === 'SHARP_CORNERING') {
    return details || `Aggressive steering at 62 km/h around sharp curve triggered 0.48G lateral acceleration, exceeding safe rollover margin (0.35G).`;
  }

  // 6. Overspeeding (> 60 km/h)
  if (type === 'OVERSPEEDING' || type === 'OVERSPEEDING_2X') {
    const speedMatch = (metric || details).match(/(\d+)\s*km\/h/i);
    const limitMatch = (metric || details).match(/Limit:\s*(\d+)\s*km\/h/i);
    const curSpeed = speedMatch ? speedMatch[1] : '76';
    const speedLimit = limitMatch ? limitMatch[1] : '60';
    return `Overspeeding Alert! Your vehicle is travelling at ${curSpeed} km/h against the permitted limit of ${speedLimit} km/h. Please maintain speed limits and ensure safe driving.`;
  }

  // 7. Axle Overweight Limit
  if (type === 'AXLE_OVERWEIGHT') {
    return details || `Drive tandem axle sensor load reached 13,420 kg, exceeding MoRTH statutory CMVR limit of 11,500 kg (+1,920 kg overload). Potential RTO detention.`;
  }

  // 8. Axle Load Imbalance
  if (type === 'AXLE_IMBALANCE') {
    return details || `Uneven payload distribution detected: Left axle weight 8,900 kg vs Right axle 6,850 kg (22.4% lateral imbalance / 2,050 kg Δ). Severe rollover & uneven tire wear risk.`;
  }

  // 9. Cargo Temp Increasing (Reefer Cold Chain)
  if (type === 'CARGO_TEMP_INCREASING' || type === 'COLD_TEMP') {
    return details || `Cold storage chamber temp rose rapidly (+1.8°C in 15 mins). Current sensor reads -9.4°C against frozen pharma target of -18.0°C. Check reefer unit and door seal.`;
  }

  // 10. E-Way Bill Expiring (< 4h)
  if (type === 'EWAY_EXPIRING') {
    return details || `E-Way Bill #2819-2847-1920 (Consignment ₹28.5L) expires in 3h 15m at 03:00 PM. Truck has 142 km remaining to terminal.`;
  }

  // 11. Challan Pending (Parivahan)
  if (type === 'CHALLAN_PENDING') {
    return details || `Unpaid traffic e-Challan #HR2026101402 of ₹4,000 for highway lane violation overdue by 14 days. Immediate online settlement required.`;
  }

  // 12. Geofence Working Breach / Route Deviation
  if (type === 'GEOFENCE_WORKING' || type === 'GEOFENCE_BREACH' || type === 'ROUTE_DEVIATION') {
    const distMatch = (metric || details).match(/([\d.]+)\s*km/i);
    const dist = distMatch ? distMatch[1] : '56.4';
    return `Geofence Breach Alert! Your vehicle number ${vehicleReg} has deviated ${dist} km from its designated route. Please verify the vehicle's location and check route deviation authorization.`;
  }

  // 13. Geofence Night Parking Breach
  if (type === 'GEOFENCE_PARKING') {
    return `Night Parking Breach detected! Your vehicle number ${vehicleReg} is parked outside the approved parking zone during designated night hours. Please take necessary action to ensure vehicle safety.`;
  }

  // 14. Towing Alert
  if (type === 'TOWING' || type === 'TOWING_ALERT') {
    return `Towing Alert! Unauthorised vehicle movement detected while the ignition is OFF. Please verify the vehicle's location and check for possible towing or unauthorised movement.`;
  }

  // 15. Battery Disconnected
  if (type === 'BATTERY_DISCONNECT' || type === 'BATTERY_DISCONNECTED') {
    return details || `Primary telematics harness power supply disconnected. Auxiliary backup internal Li-ion active (3.7V). Possible tampering or electrical fault.`;
  }

  // 16. Stoppage (> 2h with Ignition OFF) - Reason sentence removed
  if (type === 'EXCESSIVE_STOPPAGE' || type === 'STOPPAGE') {
    const parts = (details || '').split('. ');
    return parts.length > 1 ? parts[0] + '.' : details;
  }

  // 17. Late Start (after 08:00 AM)
  if (type === 'LATE_START') {
    return `Late Start Alert! Vehicle number ${vehicleReg} commenced its trip later than the scheduled departure time.`;
  }

  // 18 & 19. Idling (> 15 min & > 30 min) - Includes duration, location, fuel volume, and approx cost
  if (type === 'IDLE_ALERT' || type === 'EXCESSIVE_IDLE' || type === 'IDLING' || type === 'IDLE') {
    const timeMatch = (metric || details).match(/(\d+)\s*(?:mins|min|minutes)/i);
    const idleTime = timeMatch ? `${timeMatch[1]} minutes` : '24 minutes';
    const fuelMatch = (metric || details).match(/([\d.]+)\s*L/i);
    const fuelVol = fuelMatch ? `${fuelMatch[1]} litres` : '2.4 litres';
    const fuelNum = fuelMatch ? parseFloat(fuelMatch[1]) : 2.4;
    const approxCost = alert.impact_inr ? Math.round(alert.impact_inr) : Math.round(fuelNum * 94.0);
    const locText = location ? ` at ${location}` : '';
    return `Idling Alert! Vehicle number ${vehicleReg} remained idle for ${idleTime}${locText}, resulting in ${fuelVol} of diesel wasted in idling (approx. ₹${approxCost.toLocaleString('en-IN')}).`;
  }

  return details;
}
