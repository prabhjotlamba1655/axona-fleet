import React, { useState, useEffect } from 'react';
import { 
  Fuel, AlertTriangle, CheckCircle2, FileText, Plus, 
  MapPin, Clock, ArrowRight, ShieldAlert, Sparkles, 
  Maximize2, Minimize2, RefreshCw, X, Check, TrendingDown,
  Download, Calendar
} from 'lucide-react';
import { fetchDieselSavings, crossCheckRefueling, savePlannedRoute, downloadReportUrl } from '../services/api';

export default function Screen1DieselSavings({ isExpanded = false, onToggleExpand }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRefuelModal, setShowRefuelModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  // Report Modal State (Upto 3 Months with Custom Date Selection)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    segment: 'ALL',
    title: 'Cumulative 5 Pillars Fuel Audit Report',
    period: 'last3months',
    fromDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });

  // Form states for Refuel Cross-Check Modal
  const [refuelForm, setRefuelForm] = useState({
    vehicle_id: 'VH-101',
    reg_no: 'MH-12-RN-8842',
    station_name: 'BPCL Highway Oasis Samruddhi',
    fuel_slip_no: 'SLIP-99881',
    fleet_card_statement_no: 'FC-HDFC-99321',
    slip_liters: '190.0',
    sensor_rise_liters: '168.0',
    fuel_rate_per_liter: '94.0',
    notes: 'Audit cross-check with physical pump slip'
  });

  // Form states for Route Entering Provision
  const [routeForm, setRouteForm] = useState({
    route_name: 'Delhi - Mumbai Freight Corridor',
    origin: 'Kundli Logistics Hub, Delhi',
    destination: 'JNPT Terminal, Navi Mumbai',
    distance_km: '1380',
    allowed_deviation_km: '40'
  });

  const loadData = async () => {
    try {
      const res = await fetchDieselSavings();
      setData(res);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching diesel savings data:', e);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefuelCrossCheckSubmit = async (e) => {
    e.preventDefault();
    setSavingAction(true);
    try {
      await crossCheckRefueling(refuelForm);
      setShowRefuelModal(false);
      await loadData();
    } catch (err) {
      alert('Error saving refueling cross-check: ' + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    setSavingAction(true);
    try {
      await savePlannedRoute(routeForm);
      setShowRouteModal(false);
      await loadData();
    } catch (err) {
      alert('Error saving planned route: ' + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const openReportModal = (segment, title) => {
    setReportConfig({
      segment,
      title,
      period: 'last3months',
      fromDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0]
    });
    setShowReportModal(true);
  };

  const handleDownloadReport = () => {
    const url = downloadReportUrl({
      segment: reportConfig.segment,
      period: reportConfig.period,
      fromDate: reportConfig.fromDate,
      toDate: reportConfig.toDate
    });
    window.open(url, '_blank');
  };

  if (loading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-[#070D1F] text-slate-400 font-mono text-sm">
        <RefreshCw size={24} className="animate-spin text-cyan-400 mr-2" />
        Computing Axona Diesel Savings 5 Pillars...
      </div>
    );
  }

  const {
    cumulativeSummary = {},
    pillar1_siphoning = {},
    pillar2_refuelingMismatch = {},
    pillar3_idling = {},
    pillar4_highCph = {},
    pillar5_routeDeviation = {},
    fuelIntelligenceSummary = {}
  } = data || {};

  // Safe fallback helper for 4 boxes in each segment
  const renderSegmentSummaryBoxes = (seg = {}) => {
    const s = seg || {};
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 my-2.5 font-mono text-[10px]">
        <div className="bg-[#070D1F] p-2 rounded-lg border border-slate-800 shadow-inner">
          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Today</span>
          <span className="text-white font-extrabold text-xs block mt-0.5">{s.today?.liters || 0} L</span>
          <span className="text-rose-400 text-[10px] font-bold">₹{s.today?.inr?.toLocaleString() || 0}</span>
        </div>
        <div className="bg-[#070D1F] p-2 rounded-lg border border-slate-800 shadow-inner">
          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Yesterday</span>
          <span className="text-white font-extrabold text-xs block mt-0.5">{s.yesterday?.liters || 0} L</span>
          <span className="text-amber-400 text-[10px] font-bold">₹{s.yesterday?.inr?.toLocaleString() || 0}</span>
        </div>
        <div className="bg-[#070D1F] p-2 rounded-lg border border-slate-800 shadow-inner">
          <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">MTD</span>
          <span className="text-white font-extrabold text-xs block mt-0.5">{s.mtd?.liters?.toLocaleString() || 0} L</span>
          <span className="text-orange-400 text-[10px] font-bold">₹{s.mtd?.inr?.toLocaleString() || 0}</span>
        </div>
        <div className="bg-[#070D1F] p-2 rounded-lg border border-purple-900/60 shadow-inner">
          <span className="text-purple-300 block text-[9px] uppercase tracking-wider font-semibold">Pro Rata Monthly</span>
          <span className="text-purple-200 font-extrabold text-xs block mt-0.5">{s.proRataMonthly?.liters?.toLocaleString() || 0} L</span>
          <span className="text-rose-400 text-[10px] font-bold">₹{s.proRataMonthly?.inr?.toLocaleString() || 0}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#070D1F] text-slate-100 overflow-hidden border border-[#1E2E56] rounded-xl select-none">
      {/* Partition Header */}
      <div className="px-4 py-2.5 bg-[#0A1128] border-b border-[#1E2E56] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Fuel size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white uppercase font-['Chakra_Petch']">
              Screen 1: Diesel Savings 5 Pillars
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              Theft Prevention • Slip Reconciliation • Fuel Flow Idling • CPH Benchmarks • Route Lock
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => openReportModal('ALL', 'Cumulative 5 Pillars Fuel Audit Report')}
            className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono border border-cyan-500/40 transition shadow-sm"
            title="Download cumulative report up to last 3 months with custom dates"
          >
            <Download size={12} />
            <span>Audit Report</span>
          </button>

          <button
            onClick={() => setShowRefuelModal(true)}
            className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition"
          >
            <FileText size={12} />
            <span>Cross-Check Refuelling</span>
          </button>

          <button
            onClick={() => setShowRouteModal(true)}
            className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-blue-600/80 hover:bg-blue-500 text-white font-medium border border-blue-400/40 transition"
          >
            <Plus size={12} />
            <span>Enter Route</span>
          </button>

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
              title={isExpanded ? 'Restore Partition View' : 'Full Screen View'}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {/* FUEL INTELLIGENCE SUMMARY BANNER (Summary of all 5 Pillars) */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0D1C3D] via-[#102450] to-[#0A1630] border border-cyan-500/40 shadow-lg relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-md shadow-cyan-500/20">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider font-mono">
                  Fuel Intelligence Executive Summary
                </div>
                <div className="text-xl font-extrabold text-white font-['Chakra_Petch']">
                  ₹{fuelIntelligenceSummary.totalLossInr?.toLocaleString('en-IN') || 0}{' '}
                  <span className="text-xs text-rose-400 font-normal">
                    ({fuelIntelligenceSummary.totalDieselLossLiters || 0} Liters Total Wasted Diesel)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Potential Savings</div>
                <div className="text-base font-bold text-emerald-400 font-mono">
                  {fuelIntelligenceSummary.savingsPotentialPercent || 0}% / Month
                </div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Fleet Fuel Score</div>
                <div className="text-base font-bold text-cyan-300 font-mono">
                  {fuelIntelligenceSummary.fleetEfficiencyScore || 0}/100
                </div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <button
                onClick={() => openReportModal('ALL', 'Cumulative 5 Pillars Fuel Audit Report')}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 text-xs font-mono font-bold flex items-center space-x-1.5 transition"
              >
                <Download size={13} />
                <span>3-Month Report</span>
              </button>
            </div>
          </div>

          {/* REQUEST 2: FIVE SUMMARY BOXES FOR CUMULATIVE FIGURE OF ALL 5 PILLARS */}
          <div className="mt-3 pt-3 border-t border-cyan-500/20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-left font-mono">
            {/* Box 1: Today's (Real Time starting 00.00 hrs) */}
            <div className="bg-[#0A1633] p-2.5 rounded-lg border border-cyan-500/40 shadow-sm relative overflow-hidden">
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider truncate">
                Today's (Real-Time 00:00)
              </div>
              <div className="text-base font-extrabold text-white mt-0.5">
                {cumulativeSummary.today?.liters || 0} L
              </div>
              <div className="text-[11px] text-rose-400 font-bold">
                ₹{cumulativeSummary.today?.inr?.toLocaleString() || 0}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Live Real-Time Burn</div>
            </div>

            {/* Box 2: Yesterday's */}
            <div className="bg-[#0A1633] p-2.5 rounded-lg border border-slate-700/80 shadow-sm">
              <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider truncate">
                Yesterday's
              </div>
              <div className="text-base font-extrabold text-white mt-0.5">
                {cumulativeSummary.yesterday?.liters || 0} L
              </div>
              <div className="text-[11px] text-amber-400 font-bold">
                ₹{cumulativeSummary.yesterday?.inr?.toLocaleString() || 0}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Closed 24h cycle</div>
            </div>

            {/* Box 3: MTD */}
            <div className="bg-[#0A1633] p-2.5 rounded-lg border border-slate-700/80 shadow-sm">
              <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider truncate">
                MTD (Month To Date)
              </div>
              <div className="text-base font-extrabold text-white mt-0.5">
                {cumulativeSummary.mtd?.liters?.toLocaleString() || 0} L
              </div>
              <div className="text-[11px] text-orange-400 font-bold">
                ₹{cumulativeSummary.mtd?.inr?.toLocaleString() || 0}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Cumulative to date</div>
            </div>

            {/* Box 4: Potential Monthly Loss (Pro rata basis) */}
            <div className="bg-[#0A1633] p-2.5 rounded-lg border border-purple-500/40 shadow-sm">
              <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider truncate">
                Potential Monthly Loss
              </div>
              <div className="text-base font-extrabold text-purple-200 mt-0.5">
                {cumulativeSummary.proRataMonthly?.liters?.toLocaleString() || 0} L
              </div>
              <div className="text-[11px] text-rose-400 font-bold">
                ₹{cumulativeSummary.proRataMonthly?.inr?.toLocaleString() || 0}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Pro rata (Full month)</div>
            </div>

            {/* Box 5: Potential Annual Loss (Pro rata basis) */}
            <div className="bg-[#0A1633] p-2.5 rounded-lg border border-rose-500/40 shadow-sm">
              <div className="text-[10px] text-rose-300 font-bold uppercase tracking-wider truncate">
                Potential Annual Loss
              </div>
              <div className="text-base font-extrabold text-rose-200 mt-0.5">
                {cumulativeSummary.proRataAnnual?.liters?.toLocaleString() || 0} L
              </div>
              <div className="text-[11px] text-rose-400 font-bold">
                ₹{cumulativeSummary.proRataAnnual?.inr?.toLocaleString() || 0}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Pro rata (12 Months)</div>
            </div>
          </div>
        </div>

        {/* 5 INDIVIDUAL PILLARS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {/* PILLAR 1: FUEL SIPHONING LOSS */}
          <div className="bg-[#0B152E] border border-rose-800/40 rounded-xl p-3 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-400 flex items-center space-x-1.5 font-['Chakra_Petch']">
                  <ShieldAlert size={14} />
                  <span>PILLAR 1: FUEL SIPHONING LOSS</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    {pillar1_siphoning.eventsCount || 0} Verified Events
                  </span>
                  {/* REQUEST 5: Report Button on Top Right of Box */}
                  <button
                    onClick={() => openReportModal('SIPHONING', 'Pillar 1: Fuel Siphoning Audit Report')}
                    className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white border border-slate-700 font-mono transition"
                    title="Download Siphoning report up to 3 months"
                  >
                    <Download size={10} />
                    <span>Report</span>
                  </button>
                </div>
              </div>

              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-xl font-extrabold text-white font-mono">
                  {pillar1_siphoning.totalLiters || 0} L
                </span>
                <span className="text-xs text-rose-400 font-semibold font-mono">
                  ₹{pillar1_siphoning.financialLossInr?.toLocaleString('en-IN') || 0} Loss
                </span>
              </div>

              {/* REQUEST 3: 4 BOXES FOR PARTICULAR SEGMENT (Today, Yesterday, MTD, Pro Rata Monthly) */}
              {renderSegmentSummaryBoxes(pillar1_siphoning.segmentSummary)}

              {/* REQUEST 4: TEXT BOX OF 15 MIN LOGIC REMOVED FROM HERE! */}

              {/* Siphoning Events Stream */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 mt-2">
                {pillar1_siphoning.events?.map(evt => (
                  <div key={evt.id} className="p-1.5 rounded bg-[#0D1C3D] border border-rose-900/50 text-[10px] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200">{evt.reg_no}</div>
                      <div className="text-[9px] text-slate-400 flex items-center space-x-1">
                        <MapPin size={9} />
                        <span className="truncate max-w-[130px]">{evt.location_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-rose-400 font-bold font-mono">-{evt.siphoned_liters} L</div>
                      <div className="text-[8px] text-emerald-400">Verified</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PILLAR 2: REFUELLING MISMATCH LOSS */}
          <div className="bg-[#0B152E] border border-amber-800/40 rounded-xl p-3 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5 font-['Chakra_Petch']">
                  <FileText size={14} />
                  <span>PILLAR 2: REFUELLING MISMATCH LOSS</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    {pillar2_refuelingMismatch.flaggedCount || 0} Flagged
                  </span>
                  {/* REQUEST 5: Report Button on Top Right of Box */}
                  <button
                    onClick={() => openReportModal('REFUEL_MISMATCH', 'Pillar 2: Refuelling Mismatch & Slip Audit Report')}
                    className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white border border-slate-700 font-mono transition"
                    title="Download Refuelling Mismatch report up to 3 months"
                  >
                    <Download size={10} />
                    <span>Report</span>
                  </button>
                </div>
              </div>

              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-xl font-extrabold text-white font-mono">
                  {pillar2_refuelingMismatch.totalMismatchLiters || 0} L
                </span>
                <span className="text-xs text-amber-400 font-semibold font-mono">
                  ₹{pillar2_refuelingMismatch.financialLossInr?.toLocaleString('en-IN') || 0} Discrepancy
                </span>
              </div>

              {/* REQUEST 3: 4 BOXES FOR PARTICULAR SEGMENT */}
              {renderSegmentSummaryBoxes(pillar2_refuelingMismatch.segmentSummary)}

              <p className="text-[9px] text-slate-400 mb-1.5">
                Cross-checks physical Fuel Slips or Fleet Card statements with digital tank sensor rise.
              </p>

              {/* Refueling List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {pillar2_refuelingMismatch.refuelings?.map(ref => (
                  <div key={ref.id} className="p-1.5 rounded bg-[#0D1C3D] border border-slate-700 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{ref.reg_no}</span>
                      <span className={`text-[9px] px-1 rounded font-semibold ${
                        ref.status === 'MATCHED' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                      }`}>
                        {ref.status === 'MATCHED' ? 'MATCHED' : `SHORTFALL -${ref.mismatch_liters}L`}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 flex justify-between mt-1 font-mono">
                      <span>Slip: {ref.slip_liters}L</span>
                      <span>Sensor Rise: {ref.sensor_rise_liters}L</span>
                      <span className="text-amber-400">Diff: {ref.mismatch_liters}L</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowRefuelModal(true)}
              className="mt-2 w-full py-1 text-center rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-medium transition"
            >
              + Cross-Check Refuelling Entry
            </button>
          </div>

          {/* PILLAR 3: IDLING LOSS (FUEL CONSUMPTION LOGIC) */}
          <div className="bg-[#0B152E] border border-orange-800/40 rounded-xl p-3 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-orange-400 flex items-center space-x-1.5 font-['Chakra_Petch']">
                  <Clock size={14} />
                  <span>PILLAR 3: IDLING LOSS</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800">
                    {pillar3_idling.idlingVehiclesCount || 0} Idling
                  </span>
                  {/* REQUEST 5: Report Button on Top Right of Box */}
                  <button
                    onClick={() => openReportModal('IDLING', 'Pillar 3: Engine Idling Loss Audit Report')}
                    className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-orange-600 text-slate-300 hover:text-white border border-slate-700 font-mono transition"
                    title="Download Idling report up to 3 months"
                  >
                    <Download size={10} />
                    <span>Report</span>
                  </button>
                </div>
              </div>

              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-xl font-extrabold text-white font-mono">
                  {pillar3_idling.totalLiters || 0} L
                </span>
                <span className="text-xs text-orange-400 font-semibold font-mono">
                  ₹{pillar3_idling.financialLossInr?.toLocaleString('en-IN') || 0} Burned
                </span>
              </div>

              {/* REQUEST 3: 4 BOXES FOR PARTICULAR SEGMENT */}
              {renderSegmentSummaryBoxes(pillar3_idling.segmentSummary)}

              <p className="text-[9px] text-slate-400 mb-1.5">
                Speed = 0 km/h with Diesel Consumption (Independent of Ignition ON/OFF wire).
              </p>

              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between p-1.5 rounded bg-[#0D1C3D] border border-slate-800">
                  <span className="text-slate-300 font-medium">KA-04-MB-4190</span>
                  <span className="text-orange-400 font-mono font-bold">24 min (2.4 L/hr)</span>
                  <span className="text-slate-400 font-mono">-12.4 L</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-[#0D1C3D] border border-slate-800">
                  <span className="text-slate-300 font-medium">GJ-06-ZZ-7711</span>
                  <span className="text-orange-400 font-mono font-bold">18 min (2.1 L/hr)</span>
                  <span className="text-slate-400 font-mono">-8.6 L</span>
                </div>
              </div>
            </div>
          </div>

          {/* PILLAR 4: HIGH CPH LOSS (>25% OEM BENCHMARK) */}
          <div className="bg-[#0B152E] border border-purple-800/40 rounded-xl p-3 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-400 flex items-center space-x-1.5 font-['Chakra_Petch']">
                  <TrendingDown size={14} />
                  <span>PILLAR 4: HIGH CPH LOSS (&gt;25% OEM)</span>
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    {pillar4_highCph.highCphVehiclesCount || 0} Trucks
                  </span>
                  {/* REQUEST 5: Report Button on Top Right of Box */}
                  <button
                    onClick={() => openReportModal('HIGH_CPH', 'Pillar 4: High CPH Benchmarking Audit Report')}
                    className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white border border-slate-700 font-mono transition"
                    title="Download High CPH report up to 3 months"
                  >
                    <Download size={10} />
                    <span>Report</span>
                  </button>
                </div>
              </div>

              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-xl font-extrabold text-white font-mono">
                  {pillar4_highCph.totalLiters || 0} L
                </span>
                <span className="text-xs text-purple-400 font-semibold font-mono">
                  ₹{pillar4_highCph.financialLossInr?.toLocaleString('en-IN') || 0} Excess Burn
                </span>
              </div>

              {/* REQUEST 3: 4 BOXES FOR PARTICULAR SEGMENT */}
              {renderSegmentSummaryBoxes(pillar4_highCph.segmentSummary)}

              <p className="text-[9px] text-slate-400 mb-1.5">
                Triggered when Live Consumption Per Hour exceeds OEM factory standard by &gt; 25%.
              </p>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {pillar4_highCph.vehicles?.map(v => (
                  <div key={v.id} className="p-1.5 rounded bg-[#0D1C3D] border border-purple-900/50 text-[10px]">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-200">{v.reg_no} <span className="text-slate-400 text-[9px]">({v.model})</span></span>
                      <span className="text-purple-300 font-mono font-bold">+{v.excessPercent}%</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>OEM: {v.oem_cph} L/h</span>
                      <span className="text-rose-400 font-bold">Actual: {v.current_cph} L/h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PILLAR 5: ROUTE DEVIATION LOSS (>40 KM) */}
          <div className="bg-[#0B152E] border border-blue-800/40 rounded-xl p-3 flex flex-col justify-between shadow-md md:col-span-2 xl:col-span-2">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400 flex items-center space-x-1.5 font-['Chakra_Petch']">
                  <MapPin size={14} />
                  <span>PILLAR 5: ROUTE DEVIATION LOSS (&gt;40 KM)</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    Allowed: 40 km Default
                  </span>
                  {/* REQUEST 5: Report Button on Top Right of Box */}
                  <button
                    onClick={() => openReportModal('ROUTE_DEVIATION', 'Pillar 5: Route Deviation Audit Report')}
                    className="flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 font-mono transition"
                    title="Download Route Deviation report up to 3 months"
                  >
                    <Download size={10} />
                    <span>Report</span>
                  </button>
                  <button
                    onClick={() => setShowRouteModal(true)}
                    className="text-[10px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
                  >
                    + Enter Route
                  </button>
                </div>
              </div>

              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-xl font-extrabold text-white font-mono">
                  {pillar5_routeDeviation.totalLiters || 0} L
                </span>
                <span className="text-xs text-blue-400 font-semibold font-mono">
                  ₹{pillar5_routeDeviation.financialLossInr?.toLocaleString('en-IN') || 0} Fuel Wastage
                </span>
              </div>

              {/* REQUEST 3: 4 BOXES FOR PARTICULAR SEGMENT */}
              {renderSegmentSummaryBoxes(pillar5_routeDeviation.segmentSummary)}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {pillar5_routeDeviation.deviatedVehicles?.map(dev => (
                  <div key={dev.id} className="p-2 rounded bg-[#0D1C3D] border border-blue-900/60 text-[11px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-100">{dev.reg_no}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                        +{dev.excess_km} km Breach
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mb-1">{dev.route_name}</div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-300">
                      <span>Total Deviation: {dev.deviation_km} km</span>
                      <span>Allowed Gap: {dev.allowed_km} km</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REQUEST 5 MODAL: REPORT DOWNLOAD MODAL UP TO LAST 3 MONTHS (WITH CUSTOM DATE SELECTION) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1730] border border-cyan-500/50 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-['Chakra_Petch']">
                    Download Detailed Audit Report
                  </h3>
                  <p className="text-[10px] text-cyan-300 font-mono truncate max-w-[340px]">
                    {reportConfig.title}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowReportModal(false)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Quick Date Range Presets:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Today', period: 'today', days: 0 },
                    { label: 'Yesterday', period: 'yesterday', days: 1 },
                    { label: 'Current MTD', period: 'mtd', days: new Date().getDate() },
                    { label: 'Last 7 Days', period: 'last7days', days: 7 },
                    { label: 'Last 30 Days', period: 'last30days', days: 30 },
                    { label: 'Last 3 Months', period: 'last3months', days: 90 }
                  ].map(p => (
                    <button
                      key={p.period}
                      type="button"
                      onClick={() => {
                        const from = new Date(Date.now() - p.days * 86400000).toISOString().split('T')[0];
                        const to = p.period === 'yesterday' 
                          ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0];
                        setReportConfig({
                          ...reportConfig,
                          period: p.period,
                          fromDate: from,
                          toDate: to
                        });
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-center font-bold border transition ${
                        reportConfig.period === p.period
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                          : 'bg-[#060B18] text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Selection (Up to last 3 months) */}
              <div className="p-3 rounded-xl bg-[#060B18] border border-cyan-900/60 space-y-2.5">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                  <Calendar size={13} />
                  <span>Custom Date Selection (Upto Last 3 Months)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">From Date (Min: 90 Days Back)</label>
                    <input
                      type="date"
                      value={reportConfig.fromDate}
                      min={new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setReportConfig({ ...reportConfig, fromDate: e.target.value, period: 'custom' })}
                      className="w-full bg-[#0D1730] border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">To Date</label>
                    <input
                      type="date"
                      value={reportConfig.toDate}
                      min={reportConfig.fromDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setReportConfig({ ...reportConfig, toDate: e.target.value, period: 'custom' })}
                      className="w-full bg-[#0D1730] border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Information pill */}
              <div className="text-[10px] text-slate-400 p-2 rounded bg-slate-900/60 border border-slate-800">
                Exports raw GPS coordinates, vehicle registration numbers, telematics, fuel metrics (Liters & ₹ at ₹94/L), and audit status timestamps formatted for Excel & PowerBI.
              </div>

              <div className="flex justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadReport();
                    setShowReportModal(false);
                  }}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-950 transition"
                >
                  <Download size={14} />
                  <span>Download CSV Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Cross-check Refuelling Quantity with Fuel Slip / Fleet Card */}
      {showRefuelModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1730] border border-cyan-500/50 rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="text-cyan-400" size={18} />
                <h3 className="font-bold text-white text-base font-['Chakra_Petch']">
                  Cross-Check Refuelling vs Slip / Fleet Card
                </h3>
              </div>
              <button onClick={() => setShowRefuelModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRefuelCrossCheckSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Select Vehicle</label>
                  <select
                    value={refuelForm.vehicle_id}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const reg = vId === 'VH-101' ? 'MH-12-RN-8842' : vId === 'VH-102' ? 'DL-01-AX-9021' : 'KA-04-MB-4190';
                      setRefuelForm({ ...refuelForm, vehicle_id: vId, reg_no: reg });
                    }}
                    className="w-full bg-[#060B18] border border-[#1E2E56] rounded p-2 text-white"
                  >
                    <option value="VH-101">MH-12-RN-8842 (Tata Prima)</option>
                    <option value="VH-102">DL-01-AX-9021 (BharatBenz Reefer)</option>
                    <option value="VH-103">KA-04-MB-4190 (Ashok Leyland)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Station / Pump Name</label>
                  <input
                    type="text"
                    value={refuelForm.station_name}
                    onChange={(e) => setRefuelForm({ ...refuelForm, station_name: e.target.value })}
                    className="w-full bg-[#060B18] border border-[#1E2E56] rounded p-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Fuel Slip Number</label>
                  <input
                    type="text"
                    value={refuelForm.fuel_slip_no}
                    onChange={(e) => setRefuelForm({ ...refuelForm, fuel_slip_no: e.target.value })}
                    className="w-full bg-[#060B18] border border-[#1E2E56] rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Fleet Card Statement Ref</label>
                  <input
                    type="text"
                    value={refuelForm.fleet_card_statement_no}
                    onChange={(e) => setRefuelForm({ ...refuelForm, fleet_card_statement_no: e.target.value })}
                    className="w-full bg-[#060B18] border border-[#1E2E56] rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded bg-[#060B18] border border-[#1E2E56]">
                <div>
                  <label className="text-amber-400 font-semibold block mb-1">Slip Quantity (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={refuelForm.slip_liters}
                    onChange={(e) => setRefuelForm({ ...refuelForm, slip_liters: e.target.value })}
                    className="w-full bg-[#0D1730] border border-amber-600/50 rounded p-2 text-white font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-cyan-400 font-semibold block mb-1">Tank Sensor Rise (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={refuelForm.sensor_rise_liters}
                    onChange={(e) => setRefuelForm({ ...refuelForm, sensor_rise_liters: e.target.value })}
                    className="w-full bg-[#0D1730] border border-cyan-600/50 rounded p-2 text-white font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Fuel Rate (₹/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={refuelForm.fuel_rate_per_liter}
                    onChange={(e) => setRefuelForm({ ...refuelForm, fuel_rate_per_liter: e.target.value })}
                    className="w-full bg-[#0D1730] border border-slate-700 rounded p-2 text-white font-mono text-sm"
                  />
                </div>
              </div>

              {/* Live discrepancy preview */}
              {(() => {
                const diff = (parseFloat(refuelForm.slip_liters || 0) - parseFloat(refuelForm.sensor_rise_liters || 0)).toFixed(1);
                const isDiscrepant = parseFloat(diff) > 2.0;
                return (
                  <div className={`p-2.5 rounded font-mono text-xs flex items-center justify-between ${
                    isDiscrepant ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}>
                    <span>Calculated Discrepancy: {diff} Liters</span>
                    <span className="font-bold uppercase">{isDiscrepant ? 'FLAG FRAUD / SHORTFALL' : 'VERIFIED MATCH'}</span>
                  </div>
                );
              })()}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefuelModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center space-x-1"
                >
                  {savingAction ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save & Reconcile in DB</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Enter Planned Route Provision */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1730] border border-blue-500/50 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="text-blue-400" size={18} />
                <h3 className="font-bold text-white text-base font-['Chakra_Petch']">
                  Planned Route Entering Provision
                </h3>
              </div>
              <button onClick={() => setShowRouteModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRouteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Route Corridor Name</label>
                <input
                  type="text"
                  value={routeForm.route_name}
                  onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                  className="w-full bg-[#060B18] border border-[#1E2E56] rounded p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Origin Point</label>
                  <input
                    type="text"
                    value={routeForm.origin}
                    onChange={(e) => setRouteForm({ ...routeForm, origin: e.target.value })}
                    className="w-full bg-[#060B18] border border-[#1E2E56] rounded p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Destination Point</label>
                  <input
                    type="text"
                    value={routeForm.destination}
                    onChange={(e) => setRouteForm({ ...routeForm, destination: e.target.value })}
                    className="w-full bg-[#060B18] border border-[#1E2E56] rounded p-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Total Distance (km)</label>
                  <input
                    type="number"
                    value={routeForm.distance_km}
                    onChange={(e) => setRouteForm({ ...routeForm, distance_km: e.target.value })}
                    className="w-full bg-[#060B18] border border-[#1E2E56] rounded p-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-cyan-400 font-semibold block mb-1">Allowed Deviation (km)</label>
                  <input
                    type="number"
                    value={routeForm.allowed_deviation_km}
                    onChange={(e) => setRouteForm({ ...routeForm, allowed_deviation_km: e.target.value })}
                    className="w-full bg-[#060B18] border border-cyan-700 rounded p-2 text-white font-mono"
                    placeholder="40"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRouteModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center space-x-1"
                >
                  {savingAction ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Route Corridor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
