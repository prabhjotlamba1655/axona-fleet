import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  Truck,
  AlertTriangle,
  Zap,
  Activity,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Clock,
  AlertCircle,
  ExternalLink,
  BrainCircuit
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { Vehicle } from '../types';

export const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<string>('movement');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reportTabs = [
    { id: 'movement', label: '1. Vehicle Movement Report', icon: Truck },
    { id: 'trips', label: '2. Trip History Report', icon: Activity },
    { id: 'distance', label: '3. Distance Travelled Report', icon: Activity },
    { id: 'overspeeding', label: '4. Overspeeding Report', icon: Zap },
    { id: 'panic', label: '5. Panic Button Report', icon: AlertTriangle },
    { id: 'device-health', label: '6. GPS Device Health Report', icon: Activity },
    { id: 'geofence', label: '7. Geofence Report', icon: MapPin },
    { id: 'driver-intelligence', label: '8. Driver Intelligence & Behavior Report', icon: BrainCircuit }
  ];

  useEffect(() => {
    apiFetch<Vehicle[]>('/vehicles').then(v => setVehicles(v));

    // Default to Last 30 Days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  const calculateDaysDiff = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysSelected = calculateDaysDiff();
  const isOver90Days = daysSelected > 90;

  const fetchReport = async () => {
    if (isOver90Days) {
      setErrorMessage(`Selected range (${daysSelected} days) exceeds maximum allowed interval of 90 days.`);
      return;
    }
    setErrorMessage(null);

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedVehicleId) params.append('vehicleId', selectedVehicleId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiFetch<{ data: any[] }>(`/reports/${activeReport}?${params.toString()}`);
      setReportData(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate && !isOver90Days) {
      fetchReport();
    }
  }, [activeReport, selectedVehicleId]);

  const handleApplyPreset = (days: number) => {
    const now = new Date();
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    setStartDate(past.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    setErrorMessage(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Compliance & Operational Fleet Reports</h1>
          </div>
          <p className="text-xs text-slate-500">
            Generate and export AIS-140 compliance reports up to <strong>90 days</strong> in accordance with data retention standards
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 shadow-xs flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print / Save PDF</span>
          </button>

          <a
            href={`/api/reports/${activeReport}?exportFormat=csv&vehicleId=${selectedVehicleId || ''}&startDate=${startDate}&endDate=${endDate}`}
            download
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 ${
              isOver90Days
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* 8 Report Tabs Selector (Section 16 Requirements) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-200">
        {reportTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`px-3 py-2 rounded-t-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center space-x-2 border-b-2 ${
                isActive
                  ? 'border-sky-600 text-sky-600 bg-sky-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 90-Day Range Filter Toolbar & Presets */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Filter Vehicle</label>
              <select
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-semibold"
              >
                <option value="">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number}</option>
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
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">To Date (Up to 90 Days)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
              />
            </div>

            <button
              onClick={fetchReport}
              disabled={isOver90Days}
              className={`mt-4 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs ${
                isOver90Days
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              Generate Report
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center space-x-1.5 pt-4">
            <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Quick Presets:</span>
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
              Last 7 Days
            </button>
            <button
              onClick={() => handleApplyPreset(30)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleApplyPreset(90)}
              className="px-2.5 py-1 text-[11px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-800 rounded border border-sky-300 flex items-center space-x-1"
            >
              <span>Last 90 Days (Max)</span>
            </button>
          </div>
        </div>

        {/* 90-Day Policy Notice / Validation Banner */}
        {isOver90Days ? (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Date Range Exceeded:</strong> You have selected {daysSelected} days. Reports can be generated for up to <strong>90 days</strong> maximum. Please select a shorter range.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>
                Active Range: <strong>{startDate}</strong> to <strong>{endDate}</strong> ({daysSelected} days selected / 90 days allowed)
              </span>
            </div>
            <div>
              Records Found: <strong>{reportData.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Data Table for Active Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          {reportData.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No report records found for the selected criteria. Try selecting the "Last 90 Days (Max)" preset.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  {Object.keys(reportData[0] || {}).map(key => (
                    <th key={key} className="py-3 px-4 capitalize">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right">OpenStreetMap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, idx) => {
                  const lat = row.latitude || row.start_latitude;
                  const lon = row.longitude || row.start_longitude;

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      {Object.entries(row).map(([k, val]: any, cellIdx) => (
                        <td key={cellIdx} className="py-2.5 px-4 text-slate-700 max-w-[200px] truncate">
                          {val === null || val === undefined
                            ? '-'
                            : typeof val === 'object'
                            ? JSON.stringify(val)
                            : String(val)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right">
                        {lat && lon ? (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-[11px] font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                          >
                            <span>OSM Map</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
