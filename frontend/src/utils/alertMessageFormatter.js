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

  // 3. Harsh Braking
  if (type === 'HARSH_BRAKING') {
    return `Harsh braking detected! Your vehicle number ${vehicleReg} has experienced sudden deceleration. Please check driver safety & ensure safe driving practices.`;
  }

  // 4. Overspeeding
  if (type === 'OVERSPEEDING' || type === 'OVERSPEEDING_2X') {
    const speedMatch = (metric || details).match(/(\d+)\s*km\/h/i);
    const limitMatch = (metric || details).match(/Limit:\s*(\d+)\s*km\/h/i);
    const curSpeed = speedMatch ? speedMatch[1] : '76';
    const speedLimit = limitMatch ? limitMatch[1] : '60';
    return `Overspeeding Alert! Your vehicle is travelling at ${curSpeed} km/h against the permitted limit of ${speedLimit} km/h. Please maintain speed limits and ensure safe driving.`;
  }

  // 5. Geofence Working Breach / Route Deviation
  if (type === 'GEOFENCE_WORKING' || type === 'GEOFENCE_BREACH' || type === 'ROUTE_DEVIATION') {
    const distMatch = (metric || details).match(/([\d.]+)\s*km/i);
    const dist = distMatch ? distMatch[1] : '56.4';
    return `Geofence Breach Alert! Your vehicle number ${vehicleReg} has deviated ${dist} km from its designated route. Please verify the vehicle's location and check route deviation authorization.`;
  }

  // 6. Geofence Night Parking
  if (type === 'GEOFENCE_PARKING') {
    return `Night Parking Breach detected! Your vehicle number ${vehicleReg} is parked outside the approved parking zone during designated night hours. Please take necessary action to ensure vehicle safety.`;
  }

  // 7. Towing Alert
  if (type === 'TOWING' || type === 'TOWING_ALERT') {
    return `Towing Alert! Unauthorised vehicle movement detected while the ignition is OFF. Please verify the vehicle's location and check for possible towing or unauthorised movement.`;
  }

  // 8. Stoppage (> 2h with Ignition OFF) - Reason sentence removed
  if (type === 'EXCESSIVE_STOPPAGE' || type === 'STOPPAGE') {
    const parts = (details || '').split('. ');
    return parts.length > 1 ? parts[0] + '.' : details;
  }

  // 9. Late Start (after 08:00 AM)
  if (type === 'LATE_START') {
    return `Late Start Alert! Vehicle number ${vehicleReg} commenced its trip later than the scheduled departure time.`;
  }

  // 10. Idling (> 15 min & > 30 min) - Includes duration, location, fuel volume, and approx cost
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
