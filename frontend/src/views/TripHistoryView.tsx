import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Play,
  Pause,
  RotateCcw,
  Download,
  MapPin,
  Clock,
  Gauge,
  Navigation,
  ArrowRight,
  Filter,
  ExternalLink,
  FastForward,
  Flag,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { Trip, Vehicle } from '../types';
import FleetMap from '../components/FleetMap';

export const TripHistoryView: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [playbackPoints, setPlaybackPoints] = useState<any[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [loading, setLoading] = useState<boolean>(true);
  const [dateValidationWarning, setDateValidationWarning] = useState<string | null>(null);

  useEffect(() => {
    // Load vehicles
    apiFetch<Vehicle[]>('/vehicles').then(v => {
      setVehicles(v);
      if (v.length > 0) {
        setSelectedVehicleId(v[0].id);
      }
    });

    // Default to last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  const fetchTrips = async () => {
    // Validate 90 days range
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 90) {
        setDateValidationWarning(`Selected interval is ${diff} days. Trip history queries are supported for up to 90 days.`);
        return;
      }
      setDateValidationWarning(null);
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedVehicleId) params.append('vehicleId', selectedVehicleId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await apiFetch<Trip[]>(`/trips?${params.toString()}`);
      setTrips(data);
      if (data.length > 0) {
        selectTripForPlayback(data[0]);
      } else {
        setSelectedTrip(null);
        setPlaybackPoints([]);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVehicleId) {
      fetchTrips();
    }
  }, [selectedVehicleId, startDate, endDate]);

  const selectTripForPlayback = async (trip: Trip) => {
    setSelectedTrip(trip);
    setIsPlaying(false);
    setPlaybackIndex(0);
    try {
      const res = await apiFetch<{ trip: Trip; waypoints: any[] }>(`/trips/${trip.id}/playback`);
      setPlaybackPoints(res.waypoints || []);
    } catch (err) {
      console.error('Failed to load playback points:', err);
    }
  };

  // Playback timer loop with speed multiplier (1x, 2x, 5x, 10x)
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && playbackPoints.length > 0) {
      const intervalDelay = Math.max(100, Math.floor(1000 / playbackSpeed));
      timer = setInterval(() => {
        setPlaybackIndex(prev => {
          if (prev >= playbackPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalDelay);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackPoints, playbackSpeed]);

  const currentPoint = playbackPoints[playbackIndex] || playbackPoints[0];

  // Extract intermediate stoppage points along route
  const intermediateStops = playbackPoints
    .map((pt, idx) => ({ ...pt, originalIndex: idx }))
    .filter((pt, idx) => pt.is_stop && idx > 0 && idx < playbackPoints.length - 1);

  const handleApplyPreset = (days: number) => {
    const now = new Date();
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    setStartDate(past.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    setDateValidationWarning(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Trip History & Animated Route Replay Dashboard</h1>
          <p className="text-xs text-slate-500">
            Reconstruct historical vehicle trips (up to 90 days), audit stops, and inspect route telemetry on OpenStreetMap
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={`/api/reports/trips?exportFormat=csv&vehicleId=${selectedVehicleId || ''}&startDate=${startDate}&endDate=${endDate}`}
            download
            className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 shadow-xs flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Trip History (CSV)</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar with 90-Day Range Presets */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Vehicle</label>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-semibold"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number} ({v.make} {v.model})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">To Date (Max 90d)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
              />
            </div>

            <button
              onClick={fetchTrips}
              className="mt-4 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs"
            >
              Apply Filter
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center space-x-1.5 pt-4">
            <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Presets:</span>
            <button
              onClick={() => handleApplyPreset(1)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
            >
              Today
            </button>
            <button
              onClick={() => handleApplyPreset(7)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
            >
              7 Days
            </button>
            <button
              onClick={() => handleApplyPreset(30)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
            >
              30 Days
            </button>
            <button
              onClick={() => handleApplyPreset(90)}
              className="px-2.5 py-1 text-[11px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-800 rounded border border-sky-300"
            >
              90 Days (Max)
            </button>
          </div>
        </div>

        {dateValidationWarning && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{dateValidationWarning}</span>
          </div>
        )}
      </div>

      {/* Main Map & Route Replay HUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Animated Map & Scrubber Player */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Route Replay: {selectedTrip ? selectedTrip.registration_number : 'Select a Trip'}
              </h2>
              <div className="text-[11px] text-slate-500">
                {selectedTrip ? `${selectedTrip.start_address} ➔ ${selectedTrip.end_address || 'In Transit'}` : 'Select a trip from below table'}
              </div>
            </div>

            {selectedTrip && (
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedTrip.is_inferred ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedTrip.is_inferred ? 'INFERRED' : 'AIS-140 RECORDED'}
                </span>

                <a
                  href={`https://www.openstreetmap.org/?mlat=${currentPoint?.latitude || selectedTrip.start_latitude}&mlon=${currentPoint?.longitude || selectedTrip.start_longitude}#map=15/${currentPoint?.latitude || selectedTrip.start_latitude}/${currentPoint?.longitude || selectedTrip.start_longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded hover:bg-sky-100 flex items-center space-x-1"
                >
                  <span>OpenStreetMap</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Interactive Map with Polyline and Replay Marker */}
          <div className="flex-1 min-h-[380px]">
            <FleetMap
              vehicles={[]}
              trailPoints={playbackPoints}
              currentReplayPoint={currentPoint}
              height="390px"
            />
          </div>

          {/* Route Replay Controls Bar (Play/Pause, Scrubber, Multiplier) */}
          {playbackPoints.length > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Play / Pause & Reset */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs flex items-center space-x-1"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setPlaybackIndex(0);
                    }}
                    className="p-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg shadow-2xs"
                    title="Rewind to Start"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Speed Multiplier Buttons */}
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
                    {[1, 2, 5, 10].map(s => (
                      <button
                        key={s}
                        onClick={() => setPlaybackSpeed(s)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                          playbackSpeed === s ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time Telematics Telemetry Indicator */}
                <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-700">
                  <div>
                    Speed: <strong className="text-slate-900">{currentPoint?.speed || 0} km/h</strong>
                  </div>
                  <div>
                    Ignition: <strong className={currentPoint?.ignition ? 'text-emerald-600' : 'text-slate-500'}>
                      {currentPoint?.ignition ? 'ON' : 'OFF'}
                    </strong>
                  </div>
                  <div>
                    Heading: <strong className="text-slate-900">{currentPoint?.heading || 0}°</strong>
                  </div>
                </div>
              </div>

              {/* Range Scrubber */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, playbackPoints.length - 1)}
                  value={playbackIndex}
                  onChange={e => {
                    setPlaybackIndex(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Start: Waypoint 1</span>
                  <span className="font-semibold text-slate-700">
                    Waypoint {playbackIndex + 1} of {playbackPoints.length} ({Math.round(((playbackIndex + 1) / playbackPoints.length) * 100)}%)
                  </span>
                  <span>End: Waypoint {playbackPoints.length}</span>
                </div>
              </div>

              {/* Waypoint Address Info */}
              <div className="text-[11px] text-slate-600 truncate flex items-center space-x-1.5 pt-1 border-t border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>
                  <strong>Current Location:</strong> {currentPoint?.address || 'Corridor waypoint'}
                  {currentPoint?.is_stop ? ` (🛑 Stoppage: ${currentPoint.stop_duration_min || 5} min)` : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Trip Specifications Card */}
        <div>
          {selectedTrip ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Selected Route Segment</span>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {selectedTrip.registration_number}
                </h3>
                <div className="text-xs text-slate-500">{selectedTrip.make} {selectedTrip.model}</div>
              </div>

              {/* Route Timeline */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                  <div>
                    <span className="font-bold text-slate-800">Origin Departure:</span>
                    <p className="text-slate-600">{selectedTrip.start_address}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedTrip.start_time}</span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 mt-1 shrink-0"></div>
                  <div>
                    <span className="font-bold text-slate-800">Destination Arrival:</span>
                    <p className="text-slate-600">{selectedTrip.end_address || 'In Transit'}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{selectedTrip.end_time || 'Active'}</span>
                  </div>
                </div>
              </div>

              {/* Key Journey Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedTrip.distance_km} <span className="text-xs font-normal text-slate-500">km</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Journey Duration</span>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedTrip.duration_minutes} <span className="text-xs font-normal text-slate-500">min</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Stoppage Time</span>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedTrip.stoppage_minutes} <span className="text-xs font-normal text-slate-500">min</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{selectedTrip.stops_count} Stoppage points</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Peak / Avg Speed</span>
                  <div className="text-lg font-bold text-slate-900">
                    {selectedTrip.max_speed} <span className="text-xs font-normal text-slate-500">/ {selectedTrip.avg_speed} km/h</span>
                  </div>
                </div>
              </div>

              {/* En-Route Stoppages Breakdown */}
              {intermediateStops.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                      <span>🛑</span> En-Route Stoppages ({intermediateStops.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Total: {selectedTrip.stoppage_minutes}m
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {intermediateStops.map((st: any, sIdx: number) => (
                      <div
                        key={sIdx}
                        onClick={() => setPlaybackIndex(st.originalIndex)}
                        className="p-2 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 rounded-lg cursor-pointer transition text-xs flex items-start justify-between gap-2"
                        title="Click to jump animated replay scrubber to this stoppage"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <span className="truncate">{st.address || `Stop #${sIdx + 1}`}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            Ignition: OFF &bull; Speed: 0 km/h
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-rose-200/90 text-rose-900 font-bold text-[10px]">
                            {st.stop_duration_min || 8} min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OpenStreetMap Deep Link */}
              <div className="pt-2">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selectedTrip.start_latitude}&mlon=${selectedTrip.start_longitude}#map=14/${selectedTrip.start_latitude}/${selectedTrip.start_longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                >
                  <span>View Route on OpenStreetMap</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              No trip selected. Select a trip from the table below to inspect route replay.
            </div>
          )}
        </div>
      </div>

      {/* Trips Table (Up to 90 Days) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Historical Fleet Trips Log (Last 90 Days)</h2>
            <p className="text-xs text-slate-500">Showing {trips.length} recorded journeys across configured date range</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Trip Timeline</th>
                <th className="py-3 px-4">Origin Departure</th>
                <th className="py-3 px-4">Destination Arrival</th>
                <th className="py-3 px-4">Distance</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Stops</th>
                <th className="py-3 px-4">Speed Metrics</th>
                <th className="py-3 px-4 text-right">Route Replay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trips.map(t => {
                const isSelected = selectedTrip?.id === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => selectTripForPlayback(t)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-sky-50/80 font-medium' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{t.start_time}</div>
                      <div className="text-[10px] text-slate-400">{t.end_time || 'Ongoing'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate" title={t.start_address}>
                      {t.start_address}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate" title={t.end_address}>
                      {t.end_address || 'In Route'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{t.distance_km} km</td>
                    <td className="py-3 px-4 text-slate-600">{t.duration_minutes} min</td>
                    <td className="py-3 px-4 text-slate-600">{t.stops_count} stops ({t.stoppage_minutes}m)</td>
                    <td className="py-3 px-4 text-slate-600">Max: {t.max_speed} km/h (Avg {t.avg_speed})</td>
                    <td className="py-3 px-4 text-right">
                      <button className="px-3 py-1 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded shadow-2xs">
                        Replay
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TripHistoryView;
