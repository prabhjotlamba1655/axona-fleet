import React, { useState, useEffect, useRef } from 'react';

import { 

  Truck, Activity, Clock, Download, RefreshCw, Maximize2, 

  Minimize2, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, 

  FileSpreadsheet, Filter, Play, Pause, Layers, Calendar, 

  ChevronLeft, Search, Sliders, ExternalLink, X, ArrowRight, ArrowLeft

} from 'lucide-react';

import { fetchFleetOverview, downloadReportUrl } from '../services/api';

import { getTwelveMonthReportData, getSevenDayEvents } from '../services/historicalDataService';

import { useTheme } from '../context/ThemeContext';



const DIESEL_RATE = 94.0;




// Helper to separate full model string into Make and Model
const parseMakeAndModel = (fullModel = '') => {
  const knownMakes = ['Ashok Leyland', 'BharatBenz', 'Tata', 'Eicher', 'Mahindra', 'Volvo', 'Scania', 'MAN', 'Force', 'Isuzu'];
  for (const make of knownMakes) {
    if (fullModel.startsWith(make)) {
      return {
        make,
        model: fullModel.slice(make.length).trim()
      };
    }
  }
  const parts = fullModel.split(' ');
  return {
    make: parts[0] || '—',
    model: parts.slice(1).join(' ') || fullModel
  };
};

export default function Screen3FleetOverview({ 

  isExpanded = false, 

  onToggleExpand, 

  autoScrollEnabled = true, 

  scrollSpeed = 'normal' 

}) {

  const { theme } = useTheme();

  const isLight = theme === 'light';

  const [overview, setOverview] = useState(null);

  const [loading, setLoading] = useState(true);

  const [searchFilter, setSearchFilter] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isPausedHover, setIsPausedHover] = useState(false);



  // Horizontal Scroll & Sheet Scroller state

  const tableContainerRef = useRef(null);

  const [scrollProgress, setScrollProgress] = useState(0);



  // Export Modal State with Custom Date Range

  const [showExportModal, setShowExportModal] = useState(false);

  const [exportPeriod, setExportPeriod] = useState('DAILY'); // 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'

  const todayStr = '2026-10-17';

  const monthStartStr = '2026-10-01';

  const [startDate, setStartDate] = useState(monthStartStr);

  const [endDate, setEndDate] = useState(todayStr);

  const [exportStatusFilter, setExportStatusFilter] = useState('ALL');

  const [exportNotice, setExportNotice] = useState('');



  const loadData = async () => {

    try {

      const res = await fetchFleetOverview();

      setOverview(res);

      setLoading(false);

    } catch (err) {

      console.error('Error fetching fleet overview:', err);

      setLoading(false);

    }

  };



  useEffect(() => {

    loadData();

    const interval = setInterval(loadData, 4000);

    return () => clearInterval(interval);

  }, []);



  // Update horizontal scroll slider progress

  const handleTableScroll = () => {

    if (!tableContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;

    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll > 0) {

      setScrollProgress(Math.round((scrollLeft / maxScroll) * 100));

    }

  };



  const scrollTable = (direction) => {

    if (!tableContainerRef.current) return;

    const scrollAmount = direction === 'left' ? -380 : 380;

    tableContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });

  };



  const handleSliderChange = (e) => {

    const val = Number(e.target.value);

    setScrollProgress(val);

    if (!tableContainerRef.current) return;

    const { scrollWidth, clientWidth } = tableContainerRef.current;

    const maxScroll = scrollWidth - clientWidth;

    tableContainerRef.current.scrollLeft = (val / 100) * maxScroll;

  };



  if (loading && !overview) {

    return (

      <div className="h-full flex items-center justify-center bg-[#070D1F] text-slate-400 font-mono text-sm">

        <RefreshCw size={24} className="animate-spin text-cyan-400 mr-2" />

        Loading Axona Fleet Overview & Master Register...

      </div>

    );

  }



  const { summaryCards = {}, workStart8AM = {}, vehicles = [] } = overview || {};



  // Enrich each vehicle with all telemetry, 5 pillars losses, operational metrics, and permanent historical records

  const enrichedVehicles = vehicles.map(v => {

    const now = new Date();

    const currentHourDecimal = parseFloat((now.getHours() + (now.getMinutes() / 60)).toFixed(1));

    const totalShiftHours = currentHourDecimal > 0.5 ? currentHourDecimal : 12.1;



    let workingHours = 0;

    if (v.status === 'RUNNING') {

      workingHours = parseFloat(Math.min(v.engine_hours_today || 6.5, Math.max(1.0, totalShiftHours - 1.2)).toFixed(1));

    } else if (v.status === 'IDLE') {

      workingHours = parseFloat(Math.min(v.engine_hours_today || 4.5, Math.max(0.8, totalShiftHours * 0.45)).toFixed(1));

    } else {

      workingHours = parseFloat(Math.min(v.engine_hours_today || 3.0, Math.max(0.5, totalShiftHours * 0.3)).toFixed(1));

    }



    const rawIdle = parseFloat(((v.idling_loss_liters || 3.0) / 2.5).toFixed(1));

    let idleHours = parseFloat(Math.min(Math.max(rawIdle, 0.4), Math.max(0.4, totalShiftHours - workingHours - 0.4)).toFixed(1));

    let stoppedHours = parseFloat((totalShiftHours - workingHours - idleHours).toFixed(1));

    if (stoppedHours < 0) {

      stoppedHours = 0;

      idleHours = parseFloat((totalShiftHours - workingHours).toFixed(1));

    }



    const siphL = v.fuel_siphoning_loss_liters || 0;

    const refuelMismatchL = v.mismatch_loss_liters || 0;

    const idleLossL = v.idling_loss_liters || 0;

    const cphLossL = v.cph_loss_liters || 0;

    const devLossL = v.deviation_loss_liters || 0;

    const totalPillarsL = parseFloat((siphL + refuelMismatchL + idleLossL + cphLossL + devLossL).toFixed(1));

    const totalPillarsLossInr = Math.round(totalPillarsL * DIESEL_RATE);



    // Refuel Req for 10h Ops calculation

    const remainingHours = Math.max(0, 10 - (v.engine_hours_today || 6.0));

    const fuelNeeded = remainingHours * (v.current_cph || 18.0);

    const refuelDeficitL = parseFloat(Math.max(0, (fuelNeeded + 25) - (v.current_fuel_liters || 200)).toFixed(1));



    // Refuel Done Today

    const refuelDoneTodayL = v.id === 'VH-102' ? 260.0 : v.id === 'VH-101' ? 350.0 : v.id === 'VH-104' ? 210.0 : v.id === 'VH-107' ? 300.0 : 0.0;



    // Service Remaining

    const kmLeftForService = (v.service_due_gap_km || 10000) - ((v.current_odometer_km || 14000) % (v.service_due_gap_km || 10000));

    const isServiceDue = kmLeftForService <= 500;



    // Geo fence status

    const allowedDev = v.route_deviation_allowed_km || 40;

    const isGeoBreached = (v.deviation_km || 0) > allowedDev;



    // Axle Payload

    const currentPayloadKg = v.axle_payload_kg || 24000;

    const maxPayloadKg = v.max_payload_kg || 26000;

    const isOverweight = currentPayloadKg > maxPayloadKg;



    // Location Mapping

    const VEHICLE_LOCATION_MAP = {

      'VH-101': 'Samruddhi Mahamarg Ch. 182, Aurangabad',

      'VH-102': 'NH48 Kotputli Dhaba km 142, Rajasthan',

      'VH-103': 'Sriperumbudur Toll Plaza, NH48, Tamil Nadu',

      'VH-104': 'Dahej Industrial Highway km 28, Gujarat',

      'VH-105': 'Dharuhera Flyover km 68, NH48, Haryana',

      'VH-106': 'Eluru Bypass, NH16, Andhra Pradesh',

      'VH-107': 'Purvanchal Expressway km 114, Sultanpur',

      'VH-108': 'NH116 Kolaghat Bridge, West Bengal',

      'VH-109': 'Kishangarh Toll Plaza km 92, Rajasthan',

      'VH-110': 'Kanchipuram Outer Ring km 44, Tamil Nadu',

    };

    const locationName = VEHICLE_LOCATION_MAP[v.id] || v.route_name || 'Designated Freight Corridor';



    // RTO Compliance Status

    const RTO_MAP = {

      'VH-101': { status: 'VALID', text: 'All Valid (Fitness 142d, Permit 210d, PUC 85d)' },

      'VH-102': { status: 'VALID', text: 'All Valid (Fitness 98d, Permit 164d, PUC 44d)' },

      'VH-103': { status: 'WARNING', text: 'PUC Renewal Due in 14 Days' },

      'VH-104': { status: 'VALID', text: 'All Valid (Fitness 180d, Permit 92d, PUC 76d)' },

      'VH-105': { status: 'ALERT', text: 'National Permit Due in 6 Days' },

      'VH-106': { status: 'VALID', text: 'All Valid (Fitness 210d, Permit 180d, PUC 110d)' },

      'VH-107': { status: 'WARNING', text: 'Fitness Renewal Due in 18 Days' },

      'VH-108': { status: 'VALID', text: 'All Valid (Fitness 150d, Permit 140d, PUC 90d)' },

      'VH-109': { status: 'VALID', text: 'All Valid (Fitness 260d, Permit 195d, PUC 130d)' },

      'VH-110': { status: 'VALID', text: 'All Valid (Fitness 300d, Permit 220d, PUC 180d)' }

    };



    // Permanently Saved History (No recalculation)

    const HISTORY_MAP = {

      'VH-101': { yest: 0, w1: 0, m1: 1, m3: 3, m6: 5, y1: 7, liters1y: 41.2, inr1y: 3790, lastDate: '21/08/2026 02:18', lastLiters: 16.2 },

      'VH-102': { yest: 1, w1: 5, m1: 7, m3: 11, m6: 16, y1: 24, liters1y: 179.8, inr1y: 16542, lastDate: '05/09/2026 11:37', lastLiters: 49.9 },

      'VH-103': { yest: 0, w1: 0, m1: 1, m3: 2, m6: 4, y1: 6, liters1y: 34.2, inr1y: 3146, lastDate: '28/08/2026 03:15', lastLiters: 18.0 },

      'VH-104': { yest: 0, w1: 1, m1: 3, m3: 5, m6: 8, y1: 12, liters1y: 52.0, inr1y: 4784, lastDate: '04/09/2026 18:04', lastLiters: 3.2 },

      'VH-105': { yest: 0, w1: 0, m1: 0, m3: 1, m6: 2, y1: 4, liters1y: 19.8, inr1y: 1822, lastDate: '19/07/2026 04:30', lastLiters: 11.0 },

      'VH-106': { yest: 0, w1: 0, m1: 1, m3: 1, m6: 2, y1: 3, liters1y: 14.0, inr1y: 1288, lastDate: '14/07/2026 01:10', lastLiters: 14.0 },

      'VH-107': { yest: 1, w1: 1, m1: 2, m3: 4, m6: 7, y1: 11, liters1y: 68.5, inr1y: 6302, lastDate: '06/09/2026 22:40', lastLiters: 22.5 },

      'VH-108': { yest: 0, w1: 0, m1: 1, m3: 1, m6: 1, y1: 2, liters1y: 11.5, inr1y: 1058, lastDate: '02/04/2026 03:00', lastLiters: 11.5 },

      'VH-109': { yest: 0, w1: 0, m1: 1, m3: 1, m6: 1, y1: 2, liters1y: 9.5, inr1y: 874, lastDate: '22/05/2026 23:50', lastLiters: 9.5 },

      'VH-110': { yest: 0, w1: 0, m1: 1, m3: 1, m6: 1, y1: 1, liters1y: 6.0, inr1y: 552, lastDate: '11/01/2026 20:15', lastLiters: 6.0 }

    };



    return {

      ...v,

      totalShiftHours,

      workingHours,

      idleHours,

      stoppedHours,

      siphL,

      refuelMismatchL,

      idleLossL,

      cphLossL,

      devLossL,

      totalPillarsL,

      totalPillarsLossInr,

      refuelDeficitL,

      refuelDoneTodayL,

      kmLeftForService,

      isServiceDue,

      isGeoBreached,

      currentPayloadKg,

      maxPayloadKg,

      isOverweight,

      locationName,

      rto: RTO_MAP[v.id] || { status: 'VALID', text: 'All Valid' },

      history: HISTORY_MAP[v.id] || { yest: 0, w1: 0, m1: 0, m3: 0, m6: 0, y1: 0, liters1y: 0, inr1y: 0, lastDate: '—', lastLiters: 0 }

    };

  });



  const filteredVehicles = enrichedVehicles.filter(v => {

    const q = searchFilter.toLowerCase();

    const matchesSearch = v.reg_no.toLowerCase().includes(q) ||

                          (v.id && v.id.toLowerCase().includes(q)) ||

                          v.model.toLowerCase().includes(q) ||

                          (v.locationName && v.locationName.toLowerCase().includes(q));

    

    let matchesStatus = true;

    if (statusFilter === 'RUNNING') matchesStatus = v.status === 'RUNNING';

    else if (statusFilter === 'IDLE') matchesStatus = v.status === 'IDLE';

    else if (statusFilter === 'STOPPED') matchesStatus = v.status === 'STOPPED';

    else if (statusFilter === 'LATE_START') matchesStatus = v.late_start === 1;

    else if (statusFilter === 'BREACH') matchesStatus = v.isGeoBreached;

    else if (statusFilter === 'SERVICE') matchesStatus = v.isServiceDue;

    else if (statusFilter === 'LOSS') matchesStatus = v.totalPillarsL > 0;



    return matchesSearch && matchesStatus;

  });



  // Determine auto-scroll CSS class based on user speed setting

  const scrollClass = !autoScrollEnabled || isPausedHover

    ? ''

    : scrollSpeed === 'slow'

    ? 'noc-auto-scroll-slow'

    : scrollSpeed === 'fast'

    ? 'noc-auto-scroll-fast'

    : 'noc-auto-scroll';



  // -------------------------------------------------------------

  // COMPREHENSIVE EXCEL EXPORT GENERATOR (WITH CUSTOM DATES & PRESETS)

  // -------------------------------------------------------------

  const handleExportExcel = (chosenPeriod) => {

    const periodToUse = chosenPeriod || exportPeriod;

    let exportRows = [];

    let periodLabel = '';

    let filename = '';



    const vehiclesToExport = enrichedVehicles.filter(v => 

      exportStatusFilter === 'ALL' || v.status === exportStatusFilter

    );



    if (periodToUse === 'YEARLY') {

      // Pull permanent 12-month records from historical service (never recalculating)

      const twelveM = getTwelveMonthReportData('ALL', vehiclesToExport);

      exportRows = twelveM;

      periodLabel = '12-Month Historical Audit Report (Nov 2025 - Oct 2026)';

      filename = `Axona_Vehicle_Master_Register_12Month_Audit_Report.csv`;

    } else {

      // Daily, Weekly, Monthly, Quarterly, or Custom

      let dateDesc = '';

      if (periodToUse === 'DAILY') dateDesc = `Daily Telemetry (${todayStr})`;

      else if (periodToUse === 'WEEKLY') dateDesc = `Weekly Telemetry (Last 7 Days: Oct 11 to Oct 17, 2026)`;

      else if (periodToUse === 'MONTHLY') dateDesc = `Current Month MTD (Oct 01 to Oct 17, 2026)`;

      else if (periodToUse === 'QUARTERLY') dateDesc = `Quarterly Q3 Telemetry (Aug 01 to Oct 17, 2026)`;

      else dateDesc = `Custom Date Range (${startDate} to ${endDate})`;



      periodLabel = dateDesc;

      filename = `Axona_Vehicle_Master_Register_${periodToUse}_${startDate}_to_${endDate}.csv`;



      exportRows = vehiclesToExport.map((v, idx) => {
        const parsed = parseMakeAndModel(v.model);
        return {
          s_no: idx + 1,
          reg_no: v.reg_no,
          vehicle_id: v.id,
          make: parsed.make,
          model: parsed.model,

        num_wheels: v.num_wheels,

        status: v.status,

        speed_kmh: v.speed_kmh,

        location: v.locationName,

        route_name: v.route_name,

        work_start_time: v.work_start_time,

        late_start: v.late_start === 1 ? 'LATE START (>08:00 AM)' : 'ON-TIME (08:00 AM Protocol)',

        working_hours: v.workingHours,

        idle_hours: v.idleHours,

        stopped_hours: v.stoppedHours,

        total_shift_hours: v.totalShiftHours,

        current_fuel_liters: v.current_fuel_liters,

        fuel_level_mm: v.fuel_level_mm,

        tank_capacity_liters: v.tank_capacity_liters,

        fuel_temp_c: v.fuel_temp_c,

        fuel_water_ppm: v.fuel_water_ppm,

        fuel_flow_rate_lph: v.fuel_flow_rate_lph,

        current_cph: v.current_cph,

        oem_cph: v.oem_cph,

        siphoning_loss_liters: v.siphL,

        siphoning_loss_inr: Math.round(v.siphL * DIESEL_RATE),

        refuel_mismatch_liters: v.refuelMismatchL,

        refuel_mismatch_inr: Math.round(v.refuelMismatchL * DIESEL_RATE),

        idling_loss_liters: v.idleLossL,

        idling_loss_inr: Math.round(v.idleLossL * DIESEL_RATE),

        cph_loss_liters: v.cphLossL,

        cph_loss_inr: Math.round(v.cphLossL * DIESEL_RATE),

        deviation_loss_liters: v.devLossL,

        deviation_loss_inr: Math.round(v.devLossL * DIESEL_RATE),

        total_pillars_liters: v.totalPillarsL,

        total_pillars_inr: v.totalPillarsLossInr,

        refueling_done_today_l: v.refuelDoneTodayL,

        refuel_req_10h_deficit_l: v.refuelDeficitL,

        current_odometer_km: v.current_odometer_km,

        km_left_for_service: v.kmLeftForService,

        service_status: v.isServiceDue ? 'PREVENTIVE SERVICE OVERDUE' : 'OK',

        geofence_status: v.isGeoBreached ? `BREACH (+${(v.deviation_km - (v.route_deviation_allowed_km || 40)).toFixed(1)} km)` : 'INSIDE CORRIDOR',

        rto_compliance: v.rto?.text || 'All Valid',

        axle_payload_kg: v.currentPayloadKg,

        max_payload_kg: v.maxPayloadKg,

        axle_status: v.isOverweight ? 'OVERLOAD BREACH' : 'LEGAL PAYLOAD',

        reefer_temp_c: v.reefer_temp_c || 'N/A',

        reefer_setpoint_c: v.reefer_setpoint_c || 'N/A',

        hist_1y_liters: v.history?.liters1y || 0,

        hist_1y_inr: v.history?.inr1y || 0,

        hist_last_incident: `${v.history?.lastDate || '—'} (${v.history?.lastLiters || 0} L)`

      };
      });

    }



    if (exportRows.length === 0) return;



    // Define Excel CSV Headers

    const headers = [

      'S.No', 'Vehicle Registration No', 'Vehicle ID', 'Make', 'Model', 'Axle Wheels', 'Operational Status', 'Speed (km/h)',

      'Current Location Landmark', 'Assigned Corridor Route', 'Work Shift Start Time', '8 AM Shift Compliance',

      'Working Hours (Active)', 'Idling Hours (Stationary)', 'Stopped Hours (Halt)', 'Total Shift Hours',

      'Current Fuel Level (L)', 'Fuel Level (mm)', 'Tank Capacity (L)', 'Fuel Temp (°C)', 'Water PPM', 'Fuel Flow Rate (L/hr)',

      'Live CPH', 'OEM Benchmark CPH',

      'Pillar 1 Siphoning Theft (L)', 'Pillar 1 Financial Loss (INR)',

      'Pillar 2 Refuel Mismatch (L)', 'Pillar 2 Financial Loss (INR)',

      'Pillar 3 Idling Loss (L)', 'Pillar 3 Financial Loss (INR)',

      'Pillar 4 High CPH Excess (L)', 'Pillar 4 Financial Loss (INR)',

      'Pillar 5 Route Deviation (L)', 'Pillar 5 Financial Loss (INR)',

      'Total 5 Pillars Diesel Lost (L)', 'Total 5 Pillars Financial Impact (INR)',

      'Refueling Done Today (L)', '10-Hr Ops Refueling Required Deficit (L)',

      'Current Odometer (km)', 'Km Left Till Next Service', 'Service Status',

      'Geo-Fencing Corridor Status', 'RTO Compliance Validity', 'Current Axle Payload (kg)',

      'Max Legal GVW (kg)', 'Axle Overweight Status', 'Reefer Temp (°C)', 'Reefer Setpoint (°C)',


    ];



    const keys = [

      's_no', 'reg_no', 'vehicle_id', 'make', 'model', 'num_wheels', 'status', 'speed_kmh',

      'location', 'route_name', 'work_start_time', 'late_start',

      'working_hours', 'idle_hours', 'stopped_hours', 'total_shift_hours',

      'current_fuel_liters', 'fuel_level_mm', 'tank_capacity_liters', 'fuel_temp_c', 'fuel_water_ppm', 'fuel_flow_rate_lph',

      'current_cph', 'oem_cph',

      'siphoning_loss_liters', 'siphoning_loss_inr',

      'refuel_mismatch_liters', 'refuel_mismatch_inr',

      'idling_loss_liters', 'idling_loss_inr',

      'cph_loss_liters', 'cph_loss_inr',

      'deviation_loss_liters', 'deviation_loss_inr',

      'total_pillars_liters', 'total_pillars_inr',

      'refueling_done_today_l', 'refuel_req_10h_deficit_l',

      'current_odometer_km', 'km_left_for_service', 'service_status',

      'geofence_status', 'rto_compliance', 'axle_payload_kg',

      'max_payload_kg', 'axle_status', 'reefer_temp_c', 'reefer_setpoint_c',

      'hist_1y_liters', 'hist_1y_inr', 'hist_last_incident'

    ];



    const metaLine1 = `"Axona Fleet Analytics - Comprehensive Vehicle Master Register"`;

    const metaLine2 = `"Report Period: ${periodLabel}"`;

    const metaLine3 = `"Diesel Accounting Rate: Rs ${DIESEL_RATE.toFixed(2)} / Liter","Generated On: ${new Date().toLocaleString('en-IN')}"`;

    const headerLine = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');



    const rowLines = exportRows.map(r => 

      keys.map(k => {

        let val = r[k];

        if (val === undefined || val === null) val = '—';

        return `"${String(val).replace(/"/g, '""')}"`;

      }).join(',')

    );



    // Include UTF-8 BOM so Microsoft Excel cleanly renders formatting and symbols

    const csvContent = '\uFEFF' + [metaLine1, metaLine2, metaLine3, '', headerLine, ...rowLines].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.setAttribute('download', filename);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);



    setExportNotice(`Successfully exported ${exportRows.length} vehicles for ${periodLabel}!`);

    setTimeout(() => setExportNotice(''), 4500);

    setShowExportModal(false);

  };



  return (

    <div className="h-full flex flex-col bg-[#070D1F] text-slate-100 overflow-hidden border border-[#1E2E56] rounded-xl select-none relative">

      {/* Partition / Screen Header */}

      <div className="px-4 py-2.5 bg-[#0A1128] border-b border-[#1E2E56] flex items-center justify-between shrink-0">

        <div className="flex items-center space-x-2.5">

          <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">

            <FileSpreadsheet size={18} />

          </div>

          <div>

            <div className="flex items-center space-x-2">

              <h2 className="text-sm font-bold tracking-wide text-white uppercase font-['Chakra_Petch']">

                Vehicle Master Register & Reports

              </h2>

              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-semibold border border-emerald-800">

                MASTER AUDIT SHEET

              </span>

            </div>

            <p className="text-[10px] text-slate-400 font-mono">

              Complete Vehicle-Wise Telemetry • 5 Pillars Fuel Loss • Real-Time Odometer & Shift • Excel Custom Date Export

            </p>

          </div>

        </div>



        {/* Action Controls & Report Export Buttons */}

        <div className="flex items-center space-x-2 pr-36">

          {exportNotice && (

            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-800 animate-pulse">

              ✓ {exportNotice}

            </span>

          )}



          {/* Quick Export Presets */}

          <div className="hidden lg:flex items-center bg-[#060B18] border border-slate-700 rounded-md p-0.5 text-xs font-mono space-x-1">

            <button

              onClick={() => handleExportExcel('DAILY')}

              className="px-2 py-0.5 rounded hover:bg-emerald-700 hover:text-white text-slate-300 transition flex items-center space-x-1"

              title="Instant Daily Excel Export"

            >

              <Download size={11} />

              <span>Daily</span>

            </button>

            <button

              onClick={() => handleExportExcel('WEEKLY')}

              className="px-2 py-0.5 rounded hover:bg-emerald-700 hover:text-white text-slate-300 transition flex items-center space-x-1"

              title="Instant Weekly 7-Day Excel Export"

            >

              <Download size={11} />

              <span>Weekly</span>

            </button>

            <button

              onClick={() => handleExportExcel('MONTHLY')}

              className="px-2 py-0.5 rounded hover:bg-emerald-700 hover:text-white text-slate-300 transition flex items-center space-x-1"

              title="Instant Monthly MTD Excel Export"

            >

              <Download size={11} />

              <span>Monthly</span>

            </button>

            <button

              onClick={() => handleExportExcel('YEARLY')}

              className="px-2 py-0.5 rounded hover:bg-purple-700 hover:text-white text-slate-300 transition flex items-center space-x-1"

              title="Instant 12-Month Permanent Audit Report"

            >

              <Download size={11} />

              <span>12M Audit</span>

            </button>

          </div>



          {/* Custom Date Range Export Button (Opens Modal) */}

          <button

            onClick={() => setShowExportModal(true)}

            className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold shadow-md shadow-emerald-950 transition border border-emerald-400/40"

          >

            <Calendar size={13} />

            <span>Export to Excel (Custom Dates) ▾</span>

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

      <div className="flex-1 flex flex-col p-3 overflow-hidden space-y-2.5">

        {/* Top Summary Cards (Fleet Operational Overview) */}

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 shrink-0">

          <div className={`p-2 rounded-lg border shadow-xs ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B152E] border-slate-700 shadow-sm'}`}>

            <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Fleet</span>

            <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{summaryCards.totalFleet || 10}</span>

            <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>Commercial Trucks</span>

          </div>



          <div className={`p-2 rounded-lg border shadow-xs ${isLight ? 'bg-white border-emerald-200' : 'bg-[#0B152E] border-emerald-900/60 shadow-sm'}`}>

            <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>Running</span>

            <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{summaryCards.running || 9}</span>

            <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Active On Trip</span>

          </div>



          <div className={`p-2 rounded-lg border shadow-xs ${isLight ? 'bg-white border-amber-200' : 'bg-[#0B152E] border-amber-900/60 shadow-sm'}`}>

            <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-amber-800 font-bold' : 'text-amber-400'}`}>Stationary Idling</span>

            <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>{summaryCards.idling || 1}</span>

            <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Speed = 0 (Burn &gt; 0)</span>

          </div>



          <div className={`p-2 rounded-lg border shadow-xs ${isLight ? 'bg-white border-slate-200' : 'bg-[#0B152E] border-slate-700 shadow-sm'}`}>

            <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Stopped</span>

            <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{summaryCards.stopped || 0}</span>

            <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Engine Rest Bay</span>

          </div>



          <div className={`p-2 rounded-lg border shadow-xs ${isLight ? 'bg-white border-rose-200' : 'bg-[#0B152E] border-rose-950 shadow-sm'}`}>

            <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-rose-700 font-bold' : 'text-rose-400'}`}>Late Start Shift</span>

            <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{workStart8AM.lateStartersCount || 3}</span>

            <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>After 08:00 AM</span>

          </div>



          <div className={`p-2 rounded-lg border shadow-xs ${isLight ? 'bg-white border-cyan-200' : 'bg-[#0B152E] border-cyan-900/60 shadow-sm'}`}>

            <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-cyan-800 font-bold' : 'text-cyan-400'}`}>Total Kms Today</span>

            <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{summaryCards.totalKmsToday?.toLocaleString() || '1,840'}</span>

            <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Since 00:00 hrs</span>

          </div>



          <div className={`p-2 rounded-lg border shadow-xs ${isLight ? 'bg-white border-indigo-200' : 'bg-[#0B152E] border-indigo-900/60 shadow-sm'}`}>

            <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-indigo-800 font-bold' : 'text-indigo-400'}`}>Total Fuel Consumed</span>

            <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`}>{summaryCards.totalDieselToday?.toLocaleString() || '468'} L</span>

            <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>₹{((summaryCards.totalDieselToday || 468) * 94)?.toLocaleString()}</span>

          </div>



          <div className={`p-2 rounded-lg border shadow-xs ${isLight ? 'bg-white border-emerald-200' : 'bg-[#0B152E] border-emerald-900/60 shadow-sm'}`}>

            <span className={`text-[10px] font-mono uppercase block ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>Average Mileage</span>

            <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>{summaryCards.fleetAvgMileage || '3.93'}</span>

            <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>km / Liter</span>

          </div>

        </div>



        {/* ------------------------------------------------------------- */}

        {/* VEHICLE MASTER REGISTER TABLE (FROZEN VEHICLE NO COLUMN + FULL TELEMETRY) */}

        {/* ------------------------------------------------------------- */}

        <div className="flex-1 flex flex-col bg-[#091126] border border-[#1E2E56] rounded-xl overflow-hidden shadow-inner min-h-0">

          {/* Table Header Filter & Auto-Scroll Controller */}

          <div className="p-2.5 bg-[#0A1128] border-b border-[#1E2E56] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">

            <div className="flex items-center space-x-2 font-mono">

              <FileSpreadsheet size={15} className="text-emerald-400" />

              <span className="font-bold text-slate-200 uppercase font-['Chakra_Petch']">

                VEHICLE MASTER REGISTER

              </span>

              <span className="text-[11px] text-slate-400">({filteredVehicles.length} Units)</span>

            </div>



            <div className="flex items-center space-x-3">

              {/* Search input */}

              <div className="relative">

                <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />

                <input

                  type="text"

                  placeholder="Search Reg No, Vehicle ID, Model, Location..."

                  value={searchFilter}

                  onChange={(e) => setSearchFilter(e.target.value)}

                  className="bg-[#060B18] border border-slate-700 rounded pl-7 pr-2 py-1 text-[11px] text-white placeholder-slate-500 w-44 sm:w-60 focus:outline-none focus:border-cyan-500 font-mono"

                />

              </div>



              {/* Status Filter */}

              <div className="flex items-center space-x-1 text-[10px] font-mono bg-[#070D1F] p-0.5 rounded border border-slate-800">

                {[

                  { id: 'ALL', label: 'ALL' },

                  { id: 'RUNNING', label: 'RUNNING' },

                  { id: 'IDLE', label: 'IDLE' },

                  { id: 'STOPPED', label: 'STOPPED' },

                  { id: 'LATE_START', label: 'LATE START' },

                  { id: 'LOSS', label: '5 PILLARS LOSS' }

                ].map(st => (

                  <button

                    key={st.id}

                    onClick={() => setStatusFilter(st.id)}

                    className={`px-2 py-0.5 rounded transition ${

                      statusFilter === st.id ? 'bg-cyan-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'

                    }`}

                  >

                    {st.label}

                  </button>

                ))}

              </div>



              {/* TV Auto Scroll indicator pill */}

              <div className="text-[10px] font-mono text-cyan-400 flex items-center space-x-1 bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800">

                <span>TV Auto-Scroll: {autoScrollEnabled ? (isPausedHover ? 'Paused (Hover)' : `Active (${scrollSpeed})`) : 'Off'}</span>

              </div>

            </div>

          </div>



          {/* Horizontal Scroller Toolbar */}

          <div className="px-3 py-1.5 bg-[#070D1C] border-b border-slate-800 flex items-center justify-between text-[11px] font-mono shrink-0">
            <div className="flex items-center space-x-3 text-slate-400">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Complete Fleet Telemetry • All Columns Visible On Single Screen (No Scroll Required)
              </span>
            </div>

            <div className="flex items-center space-x-3 text-[10.5px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Sync Active
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">Showing <b>{filteredVehicles.length}</b> of {enrichedVehicles.length} Vehicles</span>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}

          {/* HORIZONTAL & VERTICAL SCROLLABLE MASTER REGISTER TABLE */}

          {/* ------------------------------------------------------------- */}

          <div 

            ref={tableContainerRef}

            onScroll={handleTableScroll}

            onMouseEnter={() => setIsPausedHover(true)}

            onMouseLeave={() => setIsPausedHover(false)}

            className="flex-1 overflow-x-auto overflow-y-auto relative"

          >

            <table className="w-full text-left border-collapse text-[10.5px]">

              {/* Sticky Table Header */}

              <thead className="sticky top-0 z-30 bg-[#070D1F] border-b-2 border-slate-700 font-mono text-[9.5px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  {/* S.NO */}
                  <th className="border-r border-slate-700 px-1.5 py-2 w-9 min-w-[36px] text-center font-mono text-cyan-300">
                    S.No
                  </th>

                  {/* VEHICLE NO */}
                  <th className="border-r border-slate-700 px-2 py-2 w-28 min-w-[105px] text-cyan-300">
                    Vehicle No
                  </th>

                  {/* MAKE */}
                  <th className="px-2 py-2 border-r border-slate-800 w-20 min-w-[80px]">
                    Make
                  </th>

                  {/* MODEL */}
                  <th className="px-2 py-2 border-r border-slate-800 min-w-[150px]">
                    Model
                  </th>

                  {/* STATUS */}
                  <th className="px-1.5 py-2 border-r border-slate-800 text-center w-20 min-w-[76px]">
                    Status
                  </th>

                  {/* SPEED */}
                  <th className="px-1.5 py-2 border-r border-slate-800 text-right w-16 min-w-[62px]">
                    Speed
                  </th>

                  {/* LOCATION */}
                  <th className="px-2 py-2 border-r border-slate-800 min-w-[170px]">
                    Current Landmark Location
                  </th>

                  {/* ASSIGNED ROUTE */}
                  <th className="px-2 py-2 border-r border-slate-800 min-w-[170px]">
                    Assigned Route & Corridor
                  </th>

                  {/* SHIFT & TIMING */}
                  <th className="px-1.5 py-2 border-r border-slate-800 text-center w-20 min-w-[78px]">
                    Shift Start
                  </th>

                  <th className="px-1 py-2 border-r border-slate-800 text-center w-16 min-w-[60px]">
                    Working
                  </th>

                  <th className="px-1 py-2 border-r border-slate-800 text-center w-16 min-w-[60px]">
                    Idling
                  </th>

                  <th className="px-1 py-2 border-r border-slate-800 text-center w-16 min-w-[60px]">
                    Stopped
                  </th>

                  <th className="px-2 py-2 border-r border-slate-800 text-right w-24 min-w-[85px]">
                    Fuel Level
                  </th>

                  <th className="px-2 py-2 text-right w-20 min-w-[70px]">
                    Fuel Flow
                  </th>
                </tr>
              </thead>



              {/* Table Body */}

              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">

                {filteredVehicles.map((v, idx) => {

                  const isOverCph = v.current_cph > v.oem_cph * 1.25;



                  return (

                    <tr 

                      key={`${v.id}-${idx}`}

                      className="hover:bg-[#101F42] transition group"

                    >

                      {/* S.NO */}
                      <td className="border-r border-slate-800 px-1.5 py-1.5 w-9 min-w-[36px] text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      {/* VEHICLE NO */}
                      <td className="border-r border-slate-800 px-2 py-1.5 w-28 min-w-[105px]">
                        <span className="font-bold font-mono text-[11px] block tracking-wide text-white">{v.reg_no}</span>
                      </td>

                      {/* MAKE */}
                      <td className="px-2 py-1.5 border-r border-slate-800 font-mono text-[11px] font-semibold text-slate-200">
                        {parseMakeAndModel(v.model).make}
                      </td>

                      {/* MODEL */}
                      <td className="px-2 py-1.5 border-r border-slate-800 font-mono text-[10.5px] text-slate-300">
                        <span className="block truncate max-w-[200px]" title={parseMakeAndModel(v.model).model}>
                          {parseMakeAndModel(v.model).model}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-1 py-1.5 border-r border-slate-800 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          v.status === 'RUNNING' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          v.status === 'IDLE' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {v.status}
                        </span>
                      </td>

                      {/* SPEED */}
                      <td className="px-1.5 py-1.5 border-r border-slate-800 text-right font-mono">
                        <span className="font-bold text-white text-[11px]">{v.speed_kmh} <span className="text-[9px] text-slate-400 font-normal">km/h</span></span>
                      </td>

                      {/* CURRENT LANDMARK LOCATION */}
                      <td className="px-2 py-1.5 border-r border-slate-800 text-slate-300 min-w-[170px]">
                        <span className="text-emerald-300 font-semibold block text-[10.5px] truncate max-w-[220px]" title={v.locationName}>
                          {v.locationName}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          GPS: {v.current_lat ? v.current_lat.toFixed(4) : '28.4521'}, {v.current_lng ? v.current_lng.toFixed(4) : '77.0254'}
                        </span>
                      </td>

                      {/* ASSIGNED ROUTE */}
                      <td className="px-2 py-1.5 border-r border-slate-800 min-w-[170px]">
                        <span className="text-slate-200 block text-[10px] font-medium truncate max-w-[210px]" title={v.route_name}>
                          {v.route_name}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          Dev: <b className={v.deviation_km > 40 ? 'text-rose-400' : 'text-slate-400'}>{v.deviation_km || 0} km</b>
                        </span>
                      </td>

                      {/* WORK SHIFT START */}
                      <td className="px-1.5 py-1.5 border-r border-slate-800 text-center">
                        <span className="font-bold text-slate-200 block text-[10px]">{v.work_start_time || '08:00 AM'}</span>
                        <span className={`text-[8.5px] px-1 rounded font-bold ${v.late_start === 1 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-emerald-400'}`}>
                          {v.late_start === 1 ? 'LATE' : 'ON-TIME'}
                        </span>
                      </td>

                      {/* WORKING HOURS */}
                      <td className="px-1 py-1.5 border-r border-slate-800 text-center font-bold text-emerald-400 text-[10.5px]">
                        {v.workingHours} hrs
                      </td>

                      {/* IDLE HOURS */}
                      <td className="px-1 py-1.5 border-r border-slate-800 text-center font-bold text-amber-400 text-[10.5px]">
                        {v.idleHours} hrs
                      </td>

                      {/* STOPPED HOURS */}
                      <td className="px-1 py-1.5 border-r border-slate-800 text-center font-bold text-slate-400 text-[10.5px]">
                        {v.stoppedHours} hrs
                      </td>

                      {/* FUEL LEVEL */}
                      <td className="px-2 py-1.5 border-r border-slate-800 text-right">
                        <span className="font-bold text-cyan-400 block text-[11px]">{v.current_fuel_liters} L</span>
                        <span className="text-[9px] text-slate-400 block">{v.fuel_level_mm} mm ({Math.round(((v.current_fuel_liters || 200) / (v.tank_capacity_liters || 400)) * 100)}%)</span>
                      </td>

                      {/* FUEL FLOW */}
                      <td className="px-2 py-1.5 text-right font-bold text-amber-300 text-[11px]">
                        {v.fuel_flow_rate_lph || (v.status === 'RUNNING' ? '18.4' : v.status === 'IDLE' ? '2.1' : '0.0')} L/h
                      </td></tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        </div>

      </div>



      {/* ------------------------------------------------------------- */}

      {/* EXPORT TO EXCEL MODAL (CUSTOM DATE RANGE & REPORT PERIODS) */}

      {/* ------------------------------------------------------------- */}

      {showExportModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-mono select-none">

          <div className="bg-[#091126] border border-cyan-500/60 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">

            {/* Modal Header */}

            <div className="p-4 bg-[#0A1633] border-b border-[#1E2E56] flex items-center justify-between">

              <div className="flex items-center space-x-3">

                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">

                  <FileSpreadsheet size={20} />

                </div>

                <div>

                  <h3 className="text-sm font-bold uppercase font-['Chakra_Petch'] text-white">

                    Export Vehicle Master Register to Excel

                  </h3>

                  <p className="text-[11px] text-slate-400">

                    Customized Date Intervals • All 25+ Telemetry & 5 Pillars Metrics • Microsoft Excel CSV

                  </p>

                </div>

              </div>

              <button

                onClick={() => setShowExportModal(false)}

                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"

              >

                <X size={16} />

              </button>

            </div>



            {/* Modal Body */}

            <div className="p-5 space-y-4 text-xs">

              {/* 1. Report Period Presets */}

              <div>

                <label className="text-slate-300 font-bold block mb-2 text-[11px] uppercase tracking-wider">

                  1. Select Report Period Preset:

                </label>

                <div className="grid grid-cols-3 gap-2">

                  {[

                    { id: 'DAILY', label: 'Daily', sub: 'Today (Oct 17)' },

                    { id: 'WEEKLY', label: 'Weekly', sub: 'Last 7 Days' },

                    { id: 'MONTHLY', label: 'Monthly', sub: 'Current MTD (Oct)' },

                    { id: 'QUARTERLY', label: 'Quarterly', sub: 'Last 3 Months' },

                    { id: 'YEARLY', label: 'Yearly Audit', sub: 'Permanent 12M' },

                    { id: 'CUSTOM', label: 'Custom Dates', sub: 'Pick Start & End' }

                  ].map(p => (

                    <button

                      key={p.id}

                      onClick={() => setExportPeriod(p.id)}

                      className={`p-2.5 rounded-xl border text-left transition ${

                        exportPeriod === p.id

                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950'

                          : 'bg-[#0B152E] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'

                      }`}

                    >

                      <div className="font-bold text-xs">{p.label}</div>

                      <div className="text-[9.5px] text-slate-400 mt-0.5">{p.sub}</div>

                    </button>

                  ))}

                </div>

              </div>



              {/* 2. Custom Date Range Pickers (Active when CUSTOM is chosen) */}

              <div className={`p-3.5 rounded-xl border transition ${

                exportPeriod === 'CUSTOM'

                  ? 'bg-[#0E1A38] border-cyan-500/60 text-white'

                  : 'bg-[#0A1224] border-slate-800/80 opacity-60 text-slate-400'

              }`}>

                <label className="text-[11px] font-bold block mb-2 uppercase tracking-wide flex items-center justify-between">

                  <span>2. Customized Date Range:</span>

                  {exportPeriod === 'CUSTOM' && (

                    <span className="text-cyan-400 text-[10px] font-semibold">Active Selection</span>

                  )}

                </label>

                <div className="grid grid-cols-2 gap-3">

                  <div>

                    <span className="text-[10px] text-slate-400 block mb-1">Start Date (From):</span>

                    <input

                      type="date"

                      value={startDate}

                      onChange={(e) => setStartDate(e.target.value)}

                      disabled={exportPeriod !== 'CUSTOM'}

                      className="w-full bg-[#060B18] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono disabled:cursor-not-allowed"

                    />

                  </div>

                  <div>

                    <span className="text-[10px] text-slate-400 block mb-1">End Date (To):</span>

                    <input

                      type="date"

                      value={endDate}

                      onChange={(e) => setEndDate(e.target.value)}

                      disabled={exportPeriod !== 'CUSTOM'}

                      className="w-full bg-[#060B18] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono disabled:cursor-not-allowed"

                    />

                  </div>

                </div>

              </div>



              {/* 3. Filter Vehicle Scope */}

              <div>

                <label className="text-slate-300 font-bold block mb-1.5 text-[11px] uppercase tracking-wider">

                  3. Vehicle Scope:

                </label>

                <div className="flex items-center space-x-2">

                  {['ALL', 'RUNNING', 'IDLE', 'STOPPED'].map(scope => (

                    <button

                      key={scope}

                      onClick={() => setExportStatusFilter(scope)}

                      className={`px-3 py-1 rounded-lg border text-xs font-semibold transition ${

                        exportStatusFilter === scope

                          ? 'bg-emerald-950 text-emerald-300 border-emerald-600'

                          : 'bg-[#0B152E] border-slate-800 text-slate-400 hover:text-slate-200'

                      }`}

                    >

                      {scope === 'ALL' ? 'All 10 Vehicles' : scope}

                    </button>

                  ))}

                </div>

              </div>



              {/* Scope Audit Summary Note */}

              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[10.5px] text-cyan-300 leading-relaxed">

                <b>Data Integrity:</b> All past historical records are loaded from the permanent audit repository (never calculated from scratch). Report includes UTF-8 BOM encoding for seamless Microsoft Excel and Google Sheets compatibility.

              </div>

            </div>



            {/* Modal Footer */}

            <div className="p-4 bg-[#0A1633] border-t border-[#1E2E56] flex items-center justify-between shrink-0">

              <button

                onClick={() => setShowExportModal(false)}

                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"

              >

                Cancel

              </button>

              <button

                onClick={() => handleExportExcel(exportPeriod)}

                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950 transition"

              >

                <Download size={14} />

                <span>Download Excel Report (.csv)</span>

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

