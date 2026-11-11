/**
 * Universal Fleet Vehicle Markers for Axona Telematics (Car & Truck Compatible)
 * Compact, lightweight micro-markers designed to eliminate map clutter and overlapping.
 */

export function generateTruckMarkerHtml(vehicle, isSelected = false) {
  const isBreached = vehicle.isBreached || (vehicle.deviation_km || 0) > 40;
  const status = vehicle.status || 'WORKING';
  const speed = Number(vehicle.speed_kmh || 0);

  // Status color theming
  let statusColor = '#10B981'; // Emerald Green (Working)
  let statusGlow = 'rgba(16, 185, 129, 0.45)';
  let statusBg = 'rgba(16, 185, 129, 0.2)';
  let statusBorder = 'rgba(16, 185, 129, 0.5)';

  if (isBreached) {
    statusColor = '#EF4444'; // Red (Breach)
    statusGlow = 'rgba(239, 68, 68, 0.6)';
    statusBg = 'rgba(239, 68, 68, 0.25)';
    statusBorder = 'rgba(239, 68, 68, 0.7)';
  } else if (status === 'IDLE' || (speed === 0 && (vehicle.fuel_flow_rate_lph || 0) > 1.2)) {
    statusColor = '#F59E0B'; // Amber Gold (Idling)
    statusGlow = 'rgba(245, 158, 11, 0.45)';
    statusBg = 'rgba(245, 158, 11, 0.25)';
    statusBorder = 'rgba(245, 158, 11, 0.5)';
  } else if (status === 'STOPPED' || speed === 0) {
    statusColor = '#64748B'; // Slate (Stopped)
    statusGlow = 'rgba(100, 116, 139, 0.35)';
    statusBg = 'rgba(100, 116, 139, 0.2)';
    statusBorder = 'rgba(100, 116, 139, 0.4)';
  }

  // Universal Vehicle SVG Icon (Represents both Cars and Commercial Trucks)
  const universalVehicleSvg = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${statusColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; display:block;">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" fill="${statusColor}" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" fill="${statusColor}" />
    </svg>
  `;

  // Selected Vehicle: Slightly accented micro-pill with GPS pin pointer
  if (isSelected) {
    return `
      <div class="selected-vehicle-map-marker" style="
        position: relative;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        user-select: none;
        cursor: pointer;
        z-index: 5000;
        transform: translate(-50%, -100%);
      ">
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #060D20;
          border: 1.5px solid ${statusColor};
          border-radius: 12px;
          padding: 2px 6px 2px 5px;
          box-shadow: 0 0 12px ${statusGlow}, 0 4px 10px rgba(0,0,0,0.85);
          white-space: nowrap;
        ">
          <span style="
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: ${statusColor};
            box-shadow: 0 0 6px ${statusColor};
            display: inline-block;
            flex-shrink: 0;
          "></span>
          ${universalVehicleSvg}
          <span style="
            font-family: 'Chakra Petch', monospace;
            font-weight: 800;
            font-size: 9.5px;
            color: #FFFFFF;
            letter-spacing: 0.3px;
          ">
            ${vehicle.reg_no}
          </span>
          <span style="
            font-family: monospace;
            font-size: 8px;
            font-weight: 800;
            color: ${statusColor};
            background: ${statusBg};
            border: 1px solid ${statusBorder};
            padding: 0 3px;
            border-radius: 3px;
          ">
            ${speed}k
          </span>
        </div>
        <!-- Pin point pointer -->
        <div style="
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid ${statusColor};
          margin-top: -1px;
        "></div>
      </div>
    `;
  }

  // Standard Vehicle Marker: Tiny, compact, sleek micro-pill (Car & Truck compatible)
  return `
    <div class="tiny-vehicle-map-marker" style="
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 3.5px;
      background: rgba(6, 13, 30, 0.94);
      border: 1px solid ${statusBorder};
      border-radius: 9999px;
      padding: 1.5px 5px 1.5px 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.8), 0 0 6px ${statusGlow};
      cursor: pointer;
      white-space: nowrap;
      transform: translate(-50%, -50%);
      user-select: none;
      transition: transform 0.15s ease-out;
    ">
      ${universalVehicleSvg}
      <span style="
        color: #FFFFFF;
        font-family: 'Chakra Petch', monospace;
        font-weight: 700;
        font-size: 8.5px;
        letter-spacing: 0.2px;
        line-height: 1;
      ">
        ${vehicle.reg_no}
      </span>
      <span style="
        font-family: monospace;
        font-size: 7.5px;
        font-weight: 800;
        color: ${statusColor};
        background: ${statusBg};
        padding: 0 3px;
        border-radius: 3px;
        line-height: 1.2;
      ">
        ${speed}
      </span>
      ${isBreached ? `
        <span style="
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #EF4444;
          box-shadow: 0 0 6px #EF4444;
          display: inline-block;
          margin-left: 1px;
        "></span>
      ` : ''}
    </div>
  `;
}
