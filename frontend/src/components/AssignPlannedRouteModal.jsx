import React, { useState, useEffect } from 'react';
import { 
  X, Route, Navigation, Truck, MapPin, CheckCircle2, 
  ArrowRight, ShieldCheck, AlertCircle, Save, Eye, Layers
} from 'lucide-react';
import { PRESET_NATIONAL_CORRIDORS, saveVehicleAssignedRoute, getVehicleAssignedRoute } from '../services/routeCorridorService';
import { assignPlannedRouteToVehicle } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function AssignPlannedRouteModal({ 
  vehicles = [], 
  selectedVehicleId = null, 
  onClose, 
  onRouteAssigned,
  onOpenMap 
}) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [selectedVehId, setSelectedVehId] = useState(
    selectedVehicleId || (vehicles.length > 0 ? (vehicles[0].id || vehicles[0].vehicle_id) : '')
  );

  const [selectedPresetId, setSelectedPresetId] = useState('CORR-DEL-AHM');
  const [isCustomRoute, setIsCustomRoute] = useState(false);

  // Form Fields
  const [routeName, setRouteName] = useState('Delhi - Jaipur - Ahmedabad Cold Corridor (NH-48)');
  const [originName, setOriginName] = useState('Kundli Cold Storage Hub, Delhi');
  const [destinationName, setDestinationName] = useState('Sanand Agro Hub, Ahmedabad');
  const [distanceKm, setDistanceKm] = useState('945');
  const [allowedDeviationKm, setAllowedDeviationKm] = useState('40');
  const [corridorDescription, setCorridorDescription] = useState('NH-48 Golden Quadrilateral Western Spine');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Selected vehicle object
  const activeVehicle = vehicles.find(v => (v.id || v.vehicle_id) === selectedVehId) || vehicles[0];

  // Whenever vehicle changes, populate with its currently assigned route if any
  useEffect(() => {
    if (!activeVehicle) return;
    const vehKey = activeVehicle.id || activeVehicle.vehicle_id;
    const existing = getVehicleAssignedRoute(vehKey);

    if (existing) {
      setRouteName(existing.routeName || '');
      setOriginName(existing.originName || '');
      setDestinationName(existing.destinationName || '');
      setDistanceKm(String(existing.totalDistanceKm || 500));
      setAllowedDeviationKm(String(existing.allowedDeviationKm || activeVehicle.route_deviation_allowed_km || 40));
      setCorridorDescription(existing.corridorName || '');
    } else if (activeVehicle.route_name) {
      // Find matching preset
      const match = PRESET_NATIONAL_CORRIDORS.find(p => p.routeName.toLowerCase().includes(activeVehicle.route_name.toLowerCase()));
      if (match) {
        setSelectedPresetId(match.id);
        setRouteName(match.routeName);
        setOriginName(match.originName);
        setDestinationName(match.destinationName);
        setDistanceKm(String(match.totalDistanceKm));
        setAllowedDeviationKm(String(match.allowedDeviationKm));
        setCorridorDescription(match.corridorName);
      } else {
        setRouteName(activeVehicle.route_name);
        setOriginName(activeVehicle.planned_origin || 'Origin Cargo Hub');
        setDestinationName(activeVehicle.planned_destination || 'Destination Hub');
        setAllowedDeviationKm(String(activeVehicle.route_deviation_allowed_km || 40));
      }
    }
  }, [selectedVehId, activeVehicle]);

  // Handle Preset Selection Change
  const handlePresetChange = (presetId) => {
    setSelectedPresetId(presetId);
    if (presetId === 'CUSTOM') {
      setIsCustomRoute(true);
      setRouteName('');
      setOriginName('');
      setDestinationName('');
      setDistanceKm('500');
      setAllowedDeviationKm(String(activeVehicle?.route_deviation_allowed_km || 40));
      setCorridorDescription('Custom Logistics Corridor');
    } else {
      setIsCustomRoute(false);
      const preset = PRESET_NATIONAL_CORRIDORS.find(p => p.id === presetId);
      if (preset) {
        setRouteName(preset.routeName);
        setOriginName(preset.originName);
        setDestinationName(preset.destinationName);
        setDistanceKm(String(preset.totalDistanceKm));
        setAllowedDeviationKm(String(preset.allowedDeviationKm));
        setCorridorDescription(preset.corridorName);
      }
    }
  };

  const handleSaveAndAssign = async (e) => {
    e.preventDefault();
    if (!activeVehicle) return;

    setSaving(true);
    setSuccessMessage('');

    const preset = PRESET_NATIONAL_CORRIDORS.find(p => p.id === selectedPresetId);

    // Build planned corridor points
    let plannedCorridor = preset?.plannedCorridor;
    let plannedWaypoints = preset?.plannedWaypoints;

    if (!plannedCorridor || isCustomRoute) {
      const curLat = Number(activeVehicle.current_lat || 26.9124);
      const curLng = Number(activeVehicle.current_lng || 75.7873);
      plannedCorridor = [
        [curLat + 0.95, curLng - 0.85],
        [curLat + 0.45, curLng - 0.35],
        [curLat, curLng],
        [curLat - 0.45, curLng + 0.35],
        [curLat - 0.95, curLng + 0.85]
      ];
      plannedWaypoints = [
        { name: originName || 'Origin Terminal', coords: plannedCorridor[0], type: 'origin' },
        { name: 'Mid-Point Checkpoint', coords: plannedCorridor[2], type: 'waypoint' },
        { name: destinationName || 'Destination Terminal', coords: plannedCorridor[4], type: 'destination' }
      ];
    }

    const routeConfig = {
      routeName,
      originName,
      destinationName,
      corridorName: corridorDescription,
      totalDistanceKm: parseFloat(distanceKm || 500),
      allowedDeviationKm: parseFloat(allowedDeviationKm || 40),
      plannedCorridor,
      plannedWaypoints
    };

    const vehKey = activeVehicle.id || activeVehicle.vehicle_id;

    // 1. Save in frontend service store
    saveVehicleAssignedRoute(vehKey, routeConfig);
    if (activeVehicle.reg_no) {
      saveVehicleAssignedRoute(activeVehicle.reg_no, routeConfig);
    }

    // 2. Persist to backend database API
    try {
      await assignPlannedRouteToVehicle(vehKey, {
        route_name: routeName,
        planned_origin: originName,
        planned_destination: destinationName,
        route_deviation_allowed_km: parseFloat(allowedDeviationKm || 40),
        distance_km: parseFloat(distanceKm || 500),
        waypoints_json: JSON.stringify(plannedWaypoints || [])
      });
    } catch (err) {
      console.warn('Backend assign API notice:', err.message);
    }

    setSaving(false);
    setSuccessMessage(`Planned Route '${routeName}' successfully assigned to ${activeVehicle.reg_no} (${vehKey})!`);

    if (onRouteAssigned) {
      onRouteAssigned({
        vehicle: {
          ...activeVehicle,
          route_name: routeName,
          planned_origin: originName,
          planned_destination: destinationName,
          route_deviation_allowed_km: parseFloat(allowedDeviationKm || 40)
        },
        routeConfig
      });
    }

    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  const handleOpenInteractiveMap = () => {
    if (!activeVehicle) return;

    const preset = PRESET_NATIONAL_CORRIDORS.find(p => p.id === selectedPresetId);
    let plannedCorridor = preset?.plannedCorridor;
    let plannedWaypoints = preset?.plannedWaypoints;

    if (!plannedCorridor || isCustomRoute) {
      const curLat = Number(activeVehicle.current_lat || 26.9124);
      const curLng = Number(activeVehicle.current_lng || 75.7873);
      plannedCorridor = [
        [curLat + 0.95, curLng - 0.85],
        [curLat + 0.45, curLng - 0.35],
        [curLat, curLng],
        [curLat - 0.45, curLng + 0.35],
        [curLat - 0.95, curLng + 0.85]
      ];
      plannedWaypoints = [
        { name: originName || 'Origin Terminal', coords: plannedCorridor[0], type: 'origin' },
        { name: 'Mid-Point Checkpoint', coords: plannedCorridor[2], type: 'waypoint' },
        { name: destinationName || 'Destination Terminal', coords: plannedCorridor[4], type: 'destination' }
      ];
    }

    const routeConfig = {
      routeName,
      originName,
      destinationName,
      corridorName: corridorDescription,
      totalDistanceKm: parseFloat(distanceKm || 500),
      allowedDeviationKm: parseFloat(allowedDeviationKm || 40),
      plannedCorridor,
      plannedWaypoints
    };

    const vehKey = activeVehicle.id || activeVehicle.vehicle_id;
    saveVehicleAssignedRoute(vehKey, routeConfig);
    if (activeVehicle.reg_no) {
      saveVehicleAssignedRoute(activeVehicle.reg_no, routeConfig);
    }

    const targetVeh = {
      ...activeVehicle,
      route_name: routeName,
      planned_origin: originName,
      planned_destination: destinationName,
      route_deviation_allowed_km: parseFloat(allowedDeviationKm || 40)
    };
    if (onOpenMap) {
      onOpenMap(targetVeh);
    }
  };

  return (
    <div className={`fixed inset-0 z-[130] ${isLight ? 'bg-slate-900/60' : 'bg-black/85'} backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200`}>
      <div className={`${isLight ? 'bg-white border-slate-300 shadow-2xl text-slate-900' : 'bg-[#070E22] border-cyan-500/50 shadow-2xl text-white'} border rounded-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden font-sans`}>
        
        {/* Modal Top Bar */}
        <div className={`px-5 py-3.5 ${isLight ? 'bg-slate-100 border-b border-slate-200' : 'bg-[#091533] border-b border-slate-800'} flex items-center justify-between shrink-0`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${isLight ? 'bg-cyan-50 border border-cyan-300 text-cyan-700' : 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300'} shadow-md`}>
              <Route size={20} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'} uppercase font-['Chakra_Petch'] tracking-wide`}>
                  Assign Planned Route & Highway Corridor
                </h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${isLight ? 'bg-cyan-100 border border-cyan-400 text-cyan-800' : 'bg-cyan-950 border border-cyan-500/60 text-cyan-300'}`}>
                  PILLAR 5 ROUTE DISPATCH
                </span>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'} font-mono mt-0.5`}>
                Select registered vehicle from onboarding settings and assign approved Blue Line route corridor
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-lg ${isLight ? 'text-slate-600 hover:text-slate-900 bg-slate-200/80 hover:bg-rose-100 border border-slate-300' : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-rose-950 border border-slate-700'} transition`}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSaveAndAssign} className="flex-1 p-5 overflow-y-auto space-y-4 text-xs font-mono">
          
          {/* Success Banner */}
          {successMessage && (
            <div className={`p-3 rounded-xl ${isLight ? 'bg-emerald-50 border border-emerald-400 text-emerald-800' : 'bg-emerald-950/90 border border-emerald-500 text-emerald-300'} flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200`}>
              <div className="flex items-center space-x-2">
                <CheckCircle2 size={16} className={isLight ? 'text-emerald-600 shrink-0' : 'text-emerald-400 shrink-0'} />
                <span className="font-bold text-xs">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleOpenInteractiveMap}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center space-x-1 transition shadow"
              >
                <Eye size={12} />
                <span>View on Map Now</span>
              </button>
            </div>
          )}

          {/* Step 1: Registered Vehicle Selection Dropdown */}
          <div className={`p-4 rounded-xl ${isLight ? 'bg-slate-50 border border-cyan-200' : 'bg-[#0B1736] border border-cyan-800/60'} space-y-3 shadow-inner`}>
            <div className="flex items-center justify-between">
              <label className={`${isLight ? 'text-cyan-800' : 'text-cyan-300'} font-bold text-xs uppercase flex items-center space-x-2`}>
                <Truck size={14} className={isLight ? 'text-cyan-700' : 'text-cyan-400'} />
                <span>1. Select Registered Vehicle (From Onboarding Master in Settings)</span>
              </label>
              <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Total Registered: <b className={isLight ? 'text-slate-900' : 'text-white'}>{vehicles.length}</b> vehicles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <select
                  value={selectedVehId}
                  onChange={(e) => setSelectedVehId(e.target.value)}
                  className={`w-full ${isLight ? 'bg-white border-cyan-400 text-slate-900' : 'bg-[#050B1B] border-cyan-500/60 text-white'} border focus:border-cyan-500 rounded-lg p-2.5 font-bold text-xs font-mono transition shadow-inner`}
                  required
                >
                  {vehicles.map((v) => {
                    const id = v.id || v.vehicle_id;
                    const assigned = getVehicleAssignedRoute(id) || getVehicleAssignedRoute(v.reg_no);
                    const routeDisplay = assigned?.routeName || v.route_name || 'Standard Freight Corridor';
                    return (
                      <option key={id} value={id}>
                        {v.reg_no} ({id}) — {v.model || 'Commercial Haulier'} [Route: {routeDisplay}]
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quick Vehicle Telemetry Snippet */}
              {activeVehicle && (
                <div className={`p-2.5 rounded-lg ${isLight ? 'bg-white border-slate-300' : 'bg-[#070F26] border-slate-700/80'} border flex flex-col justify-center text-[10.5px]`}>
                  <div className={`flex justify-between items-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span>Driver:</span>
                    <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{activeVehicle.driver_name || 'Assigned Driver'}</span>
                  </div>
                  <div className={`flex justify-between items-center ${isLight ? 'text-slate-600' : 'text-slate-400'} mt-1`}>
                    <span>Status / Speed:</span>
                    <span className="font-bold text-emerald-600">{activeVehicle.status || 'RUNNING'} • {activeVehicle.speed_kmh || 54} km/h</span>
                  </div>
                  <div className={`flex justify-between items-center ${isLight ? 'text-slate-600' : 'text-slate-400'} mt-1`}>
                    <span>Deviation Tol:</span>
                    <span className={`font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>≤ {activeVehicle.route_deviation_allowed_km || 40} km</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Route Corridor Endpoints */}
          <div className={`p-4 rounded-xl ${isLight ? 'bg-slate-50 border border-slate-300' : 'bg-[#0B1736] border border-slate-700/80'} space-y-3`}>
            <div className="flex items-center justify-between">
              <label className={`${isLight ? 'text-amber-700' : 'text-amber-400'} font-bold text-xs uppercase flex items-center space-x-2`}>
                <Layers size={14} className={isLight ? 'text-amber-600' : 'text-amber-400'} />
                <span>2. Planned Route Corridor Endpoints</span>
              </label>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Origin logistics hub, destination terminal & highway corridor distance
              </span>
            </div>

            {/* Origin & Destination Hubs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className={`${isLight ? 'text-emerald-700' : 'text-emerald-400'} block mb-1 text-[11px] font-semibold`}>
                  Origin Hub (Point A - Green Marker)
                </label>
                <input
                  type="text"
                  value={originName}
                  onChange={(e) => setOriginName(e.target.value)}
                  className={`w-full ${isLight ? 'bg-white border-emerald-400 text-slate-900 focus:border-emerald-600' : 'bg-[#050B1B] border-emerald-700/60 text-white focus:border-emerald-400'} border rounded-lg p-2 font-medium text-xs`}
                  placeholder="e.g. Kundli Logistics Hub, Delhi"
                  required
                />
              </div>

              <div>
                <label className={`${isLight ? 'text-sky-700' : 'text-sky-400'} block mb-1 text-[11px] font-semibold`}>
                  Destination Terminal (Point B - Blue Marker)
                </label>
                <input
                  type="text"
                  value={destinationName}
                  onChange={(e) => setDestinationName(e.target.value)}
                  className={`w-full ${isLight ? 'bg-white border-sky-400 text-slate-900 focus:border-sky-600' : 'bg-[#050B1B] border-sky-700/60 text-white focus:border-sky-400'} border rounded-lg p-2 font-medium text-xs`}
                  placeholder="e.g. Sanand Agro Hub, Ahmedabad"
                  required
                />
              </div>
            </div>

            {/* Distance Parameter */}
            <div className="pt-1">
              <label className={`${isLight ? 'text-slate-700' : 'text-slate-300'} block mb-1 text-[11px]`}>Total Corridor Distance (km)</label>
              <input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className={`w-full max-w-xs ${isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-600' : 'bg-[#050B1B] border-slate-700 text-slate-100 focus:border-cyan-400'} border rounded-lg p-2 font-mono font-bold text-xs`}
                placeholder="945"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`pt-2 flex flex-wrap items-center justify-between gap-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={handleOpenInteractiveMap}
              className={`px-4 py-2 rounded-xl ${isLight ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-400' : 'bg-[#0C1D4A] hover:bg-[#112966] text-cyan-300 hover:text-white border-cyan-500/60'} border font-bold text-xs transition flex items-center space-x-2 shadow-md`}
              title="Preview or view vehicle on the interactive Leaflet Route Map"
            >
              <Eye size={14} className={isLight ? 'text-cyan-700' : 'text-cyan-400'} />
              <span>View Route on Map (Blue Planned Corridor)</span>
            </button>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} text-xs font-semibold transition`}
              >
                Close
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition flex items-center space-x-2 shadow-lg shadow-cyan-900/40 border border-cyan-400/40 transform hover:scale-[1.02] disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Assigning...' : 'Assign & Save Planned Route'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
