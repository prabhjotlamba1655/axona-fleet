/**
 * Professional Truck Vehicle Markers for Axona Fleet Telematics
 * Renders authentic commercial multi-axle freight truck graphics with real-time status cues.
 */

export function generateTruckMarkerHtml(vehicle, isSelected = false) {
  const isBreached = vehicle.isBreached || (vehicle.deviation_km || 0) > 40;
  const status = vehicle.status || 'WORKING';
  const speed = Number(vehicle.speed_kmh || 0);

  // Status color theming
  let statusColor = '#10B981'; // Emerald Green (Working / On-Road)
  let statusGlow = 'rgba(16, 185, 129, 0.45)';
  let statusBg = 'rgba(16, 185, 129, 0.15)';
  let statusBorder = 'rgba(16, 185, 129, 0.4)';
  let statusText = 'WORKING';

  if (isBreached) {
    statusColor = '#EF4444'; // Crimson Red
    statusGlow = 'rgba(239, 68, 68, 0.6)';
    statusBg = 'rgba(239, 68, 68, 0.2)';
    statusBorder = 'rgba(239, 68, 68, 0.6)';
    statusText = 'BREACH ⚠️';
  } else if (status === 'IDLE' || (speed === 0 && (vehicle.fuel_flow_rate_lph || 0) > 1.2)) {
    statusColor = '#F59E0B'; // Amber Gold
    statusGlow = 'rgba(245, 158, 11, 0.45)';
    statusBg = 'rgba(245, 158, 11, 0.18)';
    statusBorder = 'rgba(245, 158, 11, 0.4)';
    statusText = 'IDLE';
  } else if (status === 'STOPPED' || speed === 0) {
    statusColor = '#64748B'; // Slate Blue
    statusGlow = 'rgba(100, 116, 139, 0.35)';
    statusBg = 'rgba(100, 116, 139, 0.15)';
    statusBorder = 'rgba(100, 116, 139, 0.35)';
    statusText = 'STOPPED';
  }

  // Selected Truck View: Prominent 3D Heavy Freight Truck with Live Beacon
  if (isSelected) {
    return `
      <div class="selected-truck-marker-card" style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -85%);
        cursor: pointer;
        pointer-events: auto;
        user-select: none;
        z-index: 5000;
        filter: drop-shadow(0 10px 25px rgba(0,0,0,0.85));
      ">
        <!-- Floating Header Pill: License Plate + Live Speed -->
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          background: #060D20;
          border: 2px solid ${statusColor};
          border-radius: 8px;
          padding: 3px 8px;
          box-shadow: 0 0 16px ${statusGlow};
          margin-bottom: 4px;
          white-space: nowrap;
        ">
          <span style="
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: ${statusColor};
            box-shadow: 0 0 8px ${statusColor};
            display: inline-block;
          "></span>
          <span style="
            font-family: 'Chakra Petch', monospace;
            font-weight: 800;
            font-size: 13px;
            color: #FFFFFF;
            letter-spacing: 0.5px;
          ">
            ${vehicle.reg_no}
          </span>
          <span style="
            font-family: 'Chakra Petch', monospace;
            font-size: 11px;
            font-weight: 900;
            color: ${statusColor};
            background: ${statusBg};
            border: 1px solid ${statusBorder};
            padding: 1px 6px;
            border-radius: 4px;
          ">
            ⚡ ${speed} km/h
          </span>
        </div>

        <!-- Heavy Logistics Truck SVG (Commercial Prime Mover & Container Trailer) -->
        <div style="
          position: relative;
          background: rgba(7, 15, 36, 0.95);
          border: 2px solid ${statusColor};
          border-radius: 12px;
          padding: 6px 10px;
          box-shadow: 0 0 20px ${statusGlow}, inset 0 0 12px ${statusGlow};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="68" height="34" viewBox="0 0 68 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Road Shadow -->
            <ellipse cx="34" cy="32" rx="30" ry="2" fill="${statusColor}" fill-opacity="0.35" />
            
            <!-- Long Cargo Container Trailer -->
            <rect x="2" y="4" width="40" height="21" rx="2" fill="#0A142A" stroke="${statusColor}" stroke-width="1.8" />
            <!-- Container Corrugations -->
            <line x1="10" y1="5" x2="10" y2="24" stroke="${statusColor}" stroke-opacity="0.35" stroke-width="1.2" />
            <line x1="18" y1="5" x2="18" y2="24" stroke="${statusColor}" stroke-opacity="0.35" stroke-width="1.2" />
            <line x1="26" y1="5" x2="26" y2="24" stroke="${statusColor}" stroke-opacity="0.35" stroke-width="1.2" />
            <line x1="34" y1="5" x2="34" y2="24" stroke="${statusColor}" stroke-opacity="0.35" stroke-width="1.2" />
            
            <!-- Fuel Tank under Container -->
            <rect x="14" y="25" width="14" height="3" rx="1.5" fill="#334155" stroke="#475569" stroke-width="0.8" />

            <!-- Tractor Cab Body -->
            <path d="M42 12 L49 4 L59 4 L64 13 L64 25 L42 25 Z" fill="#132342" stroke="${statusColor}" stroke-width="1.8" />
            <!-- Aerodynamic Roof Fairing -->
            <path d="M44 8 L50 2 L58 2 L58 4 L44 8 Z" fill="${statusColor}" fill-opacity="0.6" />
            <!-- Windshield Glass with Tint Reflection -->
            <path d="M49.5 5.5 L57.5 5.5 L61.5 13 L49.5 13 Z" fill="#38BDF8" fill-opacity="0.85" />
            <!-- Driver Cabin Window -->
            <rect x="44.5" y="8" width="4" height="6" rx="0.8" fill="#38BDF8" fill-opacity="0.7" />
            <!-- Chrome Front Grille -->
            <line x1="63" y1="16" x2="63" y2="23" stroke="#94A3B8" stroke-width="1.8" />
            <!-- Forward Headlamp Beam -->
            <polygon points="64,17 68,15 68,21 64,19" fill="#FEF08A" />

            <!-- Dual Rear Axle Wheels -->
            <circle cx="10" cy="26" r="4.5" fill="#020617" stroke="#94A3B8" stroke-width="2" />
            <circle cx="10" cy="26" r="2" fill="${statusColor}" />
            <circle cx="21" cy="26" r="4.5" fill="#020617" stroke="#94A3B8" stroke-width="2" />
            <circle cx="21" cy="26" r="2" fill="${statusColor}" />

            <!-- Front Steer Wheel -->
            <circle cx="54" cy="26" r="4.5" fill="#020617" stroke="#94A3B8" stroke-width="2" />
            <circle cx="54" cy="26" r="2" fill="${statusColor}" />
          </svg>

          <!-- Bottom Coordinate Needle Pointer -->
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 8px solid ${statusColor};
          "></div>
        </div>
      </div>
    `;
  }

  // Standard Truck Marker (for All Other Fleet Vehicles on Map)
  return `
    <div class="pro-truck-map-marker" style="
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(6, 13, 32, 0.94);
      border: 1.5px solid ${statusColor};
      border-radius: 20px;
      padding: 3px 8px 3px 5px;
      box-shadow: 0 0 12px ${statusGlow}, 0 4px 10px rgba(0,0,0,0.8);
      cursor: pointer;
      white-space: nowrap;
      transform: translate(-50%, -50%);
      transition: all 0.2s ease-in-out;
      pointer-events: auto;
    ">
      <!-- Authentic Logistics Freight Truck Icon -->
      <svg width="38" height="20" viewBox="0 0 54 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
        <!-- Container Body -->
        <rect x="2" y="3" width="32" height="18" rx="2" fill="#0B172E" stroke="${statusColor}" stroke-width="1.8" />
        <!-- Ribs -->
        <line x1="8" y1="4" x2="8" y2="20" stroke="${statusColor}" stroke-opacity="0.3" stroke-width="1.2" />
        <line x1="14" y1="4" x2="14" y2="20" stroke="${statusColor}" stroke-opacity="0.3" stroke-width="1.2" />
        <line x1="20" y1="4" x2="20" y2="20" stroke="${statusColor}" stroke-opacity="0.3" stroke-width="1.2" />
        <line x1="26" y1="4" x2="26" y2="20" stroke="${statusColor}" stroke-opacity="0.3" stroke-width="1.2" />
        <!-- Cab Body -->
        <path d="M34 11 L40 4 L47 4 L51 12 L51 21 L34 21 Z" fill="#152648" stroke="${statusColor}" stroke-width="1.8" />
        <!-- Windshield -->
        <path d="M40.5 5.5 L46 5.5 L49 12 L40.5 12 Z" fill="#38BDF8" fill-opacity="0.85" />
        <!-- Side Window -->
        <rect x="36" y="7" width="3.5" height="5" rx="0.5" fill="#38BDF8" fill-opacity="0.7" />
        <!-- Headlamp Beam -->
        <polygon points="51,16 54,15 54,19 51,18" fill="#FDE047" />
        <!-- Wheels -->
        <circle cx="8" cy="22" r="4" fill="#020617" stroke="#94A3B8" stroke-width="1.8" />
        <circle cx="8" cy="22" r="1.8" fill="${statusColor}" />
        <circle cx="17" cy="22" r="4" fill="#020617" stroke="#94A3B8" stroke-width="1.8" />
        <circle cx="17" cy="22" r="1.8" fill="${statusColor}" />
        <circle cx="44" cy="22" r="4" fill="#020617" stroke="#94A3B8" stroke-width="1.8" />
        <circle cx="44" cy="22" r="1.8" fill="${statusColor}" />
      </svg>

      <!-- Registration Number & Live Speed -->
      <div style="
        display: flex;
        align-items: center;
        gap: 5px;
        font-family: 'Chakra Petch', monospace;
        line-height: 1;
      ">
        <span style="
          color: #FFFFFF;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.5px;
        ">
          ${vehicle.reg_no}
        </span>
        <span style="
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 4px;
          background: ${statusBg};
          color: ${statusColor};
          border: 1px solid ${statusBorder};
        ">
          ${speed} km/h
        </span>
      </div>

      ${isBreached ? `
        <span style="
          position: absolute;
          top: -8px;
          right: -5px;
          background: #EF4444;
          color: #FFF;
          font-size: 9px;
          font-weight: 900;
          padding: 0 4px;
          border-radius: 8px;
          border: 1px solid #FFF;
          box-shadow: 0 0 8px #FF0055;
        ">!</span>
      ` : ''}
    </div>
  `;
}
