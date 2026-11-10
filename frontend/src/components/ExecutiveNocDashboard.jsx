import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Truck, Activity, Clock, ShieldAlert, CheckCircle2, 
  MapPin, Fuel, AlertTriangle, FileText, Download, 
  RefreshCw, Check, Bell, Play, Pause, FastForward,
  Navigation, Weight, FileCheck, Layers, ExternalLink, Calendar,
  Search, X, Crosshair, ChevronDown, ThermometerSnowflake, Percent, TrendingUp,
  Plus, Route, CreditCard, UserCheck, UserPlus, UserMinus, ShieldCheck, UserX, AlertCircle,
  Smartphone, Radio, Signal, BatteryCharging
} from 'lucide-react';
import { 
  fetchFleetOverview, 
  fetchDieselSavings, 
  fetchAlerts, 
  acknowledgeAlert, 
  fetchVehicles,
  fetchRtoCompliance,
  downloadReportUrl,
  crossCheckRefueling,
  savePlannedRoute
} from '../services/api';
import { FREE_MAP_PROVIDERS } from '../services/mapProviders';
import { 
  getSevenDayEvents, 
  getTwelveMonthReportData, 
  getTwelveMonthCsvColumns 
} from '../services/historicalDataService';
import VehicleRouteMapModal from './VehicleRouteMapModal';
import AssignPlannedRouteModal from './AssignPlannedRouteModal';
import { getVehicleAssignedRoute } from '../services/routeCorridorService';
import { useTheme } from '../context/ThemeContext';

const DIESEL_RATE = 94.0; // ₹ / Liter average across Indian corridors

const FLEET_VEHICLE_DETAILS = {
  'VH-101': { make: 'Tata', model: 'Prima 5530.S (18-Wheeler Tractor)' },
  'VH-102': { make: 'BharatBenz', model: '3528R (12-Wheeler Reefer)' },
  'VH-103': { make: 'Ashok Leyland', model: '4220 (14-Wheeler Multi-Axle)' },
  'VH-104': { make: 'Eicher', model: 'Pro 6028 (10-Wheeler Tipper)' },
  'VH-105': { make: 'Mahindra', model: 'Blazo X 35 (12-Wheeler Haulage)' },
  'VH-106': { make: 'Tata', model: 'Signa 4825.TK (16-Wheeler Tipper)' },
  'VH-107': { make: 'Ashok Leyland', model: '4825 (16-Wheeler Haulage)' },
  'VH-108': { make: 'BharatBenz', model: '2823R (10-Wheeler Cargo)' },
  'VH-109': { make: 'Volvo', model: 'FH500 (22-Wheeler Puller)' },
  'VH-110': { make: 'Eicher', model: 'Pro 8035XM (12-Wheeler Dumper)' },
  'DL-01-AX-9021': { make: 'BharatBenz', model: '3528R (12-Wheeler Reefer)' },
  'GJ-06-ZZ-7711': { make: 'Eicher', model: 'Pro 6028 (10-Wheeler Tipper)' },
  'UP-32-HN-1244': { make: 'Ashok Leyland', model: '4825 (16-Wheeler Haulage)' },
  'MH-12-RN-8842': { make: 'Tata', model: 'Prima 5530.S (18-Wheeler Tractor)' },
  'KA-04-MB-4190': { make: 'Ashok Leyland', model: '4220 (14-Wheeler Multi-Axle)' },
  'HR-55-AK-3004': { make: 'Mahindra', model: 'Blazo X 35 (12-Wheeler Haulage)' },
  'AP-16-TX-5509': { make: 'Tata', model: 'Signa 4825.TK (16-Wheeler Tipper)' },
  'WB-19-DF-4402': { make: 'BharatBenz', model: '2823R (10-Wheeler Cargo)' },
  'RJ-14-GH-6621': { make: 'Volvo', model: 'FH500 (22-Wheeler Puller)' },
  'TN-09-BK-9182': { make: 'Eicher', model: 'Pro 8035XM (12-Wheeler Dumper)' }
};

const KNOWN_VEHICLE_MAKES = ['Tata', 'BharatBenz', 'Ashok Leyland', 'Eicher', 'Mahindra', 'Volvo'];
function extractMakeAndModel(fullModel = '', vId = null, regNo = null) {
  if (vId && FLEET_VEHICLE_DETAILS[vId]) return FLEET_VEHICLE_DETAILS[vId];
  if (regNo && FLEET_VEHICLE_DETAILS[regNo]) return FLEET_VEHICLE_DETAILS[regNo];

  let make = 'Commercial';
  let model = fullModel || 'Commercial Haulage Truck';
  for (const km of KNOWN_VEHICLE_MAKES) {
    if (fullModel && fullModel.startsWith(km)) {
      make = km;
      model = fullModel.slice(km.length).trim();
      break;
    }
  }
  return { make, model };
}


// Universal Date Formatter to enforce DD/MM/YYYY throughout the software
export const formatDateDDMMYYYY = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str;
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (isoMatch) {
    const [, yyyy, mm, dd, rest] = isoMatch;
    return `${dd}/${mm}/${yyyy}${rest}`;
  }
  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const dmyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})(.*)$/);
  if (dmyMatch) {
    const [, d, mon, y, rest] = dmyMatch;
    const mm = monthMap[mon.toLowerCase()] || '01';
    const dd = d.padStart(2, '0');
    const restClean = rest.startsWith(',') ? rest.slice(1) : rest;
    return `${dd}/${mm}/${y}${restClean}`;
  }
  const dmTimeMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2}:\d{2})$/);
  if (dmTimeMatch) {
    const [, d, mon, time] = dmTimeMatch;
    const mm = monthMap[mon.toLowerCase()] || '10';
    const dd = d.padStart(2, '0');
    return `${dd}/${mm}/2026 ${time}`;
  }
  return str;
};

export default function ExecutiveNocDashboard({ 
  onNavigateToScreen, 
  onOpenSettings,
  autoScrollSpeed = 'normal'
}) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const getBoxThemeStyle = (type) => {
    if (!isLight) {
      // Professional Dark 3D Engraved Style: Neutral slate background, color ONLY on boundaries & subtle border glow
      const baseDarkBg = 'linear-gradient(180deg, #0C1527 0%, #060B16 100%)';
      switch (type) {
        case 'cyan':
          return {
            background: baseDarkBg,
            border: '1.5px solid rgba(56, 189, 248, 0.65)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.7), 0 0 12px rgba(56, 189, 248, 0.15), 0 4px 14px rgba(0, 0, 0, 0.45)'
          };
        case 'green':
          return {
            background: baseDarkBg,
            border: '1.5px solid rgba(52, 211, 153, 0.65)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.7), 0 0 12px rgba(52, 211, 153, 0.15), 0 4px 14px rgba(0, 0, 0, 0.45)'
          };
        case 'amber':
          return {
            background: baseDarkBg,
            border: '1.5px solid rgba(251, 191, 36, 0.65)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.7), 0 0 12px rgba(251, 191, 36, 0.15), 0 4px 14px rgba(0, 0, 0, 0.45)'
          };
        case 'purple':
          return {
            background: baseDarkBg,
            border: '1.5px solid rgba(192, 132, 252, 0.65)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.7), 0 0 12px rgba(192, 132, 252, 0.15), 0 4px 14px rgba(0, 0, 0, 0.45)'
          };
        case 'red':
          return {
            background: baseDarkBg,
            border: '1.5px solid rgba(251, 113, 133, 0.65)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.7), 0 0 12px rgba(251, 113, 133, 0.15), 0 4px 14px rgba(0, 0, 0, 0.45)'
          };
        default:
          return {};
      }
    }

    // Light Theme: Clean neutral white engraved card, color ONLY on boundaries
    const baseLightBg = 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)';
    switch (type) {
      case 'cyan':
        return {
          background: baseLightBg,
          border: '1.5px solid #0EA5E9',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 0 8px rgba(14, 165, 233, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05)'
        };
      case 'green':
        return {
          background: baseLightBg,
          border: '1.5px solid #10B981',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 0 8px rgba(16, 185, 129, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05)'
        };
      case 'amber':
        return {
          background: baseLightBg,
          border: '1.5px solid #F59E0B',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 0 8px rgba(245, 158, 11, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05)'
        };
      case 'purple':
        return {
          background: baseLightBg,
          border: '1.5px solid #A855F7',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 0 8px rgba(168, 85, 247, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05)'
        };
      case 'red':
        return {
          background: baseLightBg,
          border: '1.5px solid #F43F5E',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), 0 0 8px rgba(244, 63, 94, 0.12), 0 2px 6px rgba(0, 0, 0, 0.05)'
        };
      default:
        return {};
    }
  };
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  const alertsScrollRef = useRef(null);

  const [fleetOverview, setFleetOverview] = useState(null);
  const [dieselSavings, setDieselSavings] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [rtoRecords, setRtoRecords] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [mapFilter, setMapFilter] = useState('ALL'); // ALL, RUNNING, IDLE, STOPPED
  const [mapProvider, setMapProvider] = useState('osm'); // Default 100% Free OpenStreetMap!
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  // Drilldown Modal State for ALL 15 Metric Boxes
  const [drilldownData, setDrilldownData] = useState(null);
  const [drilldownSearch, setDrilldownSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL'); // 'ALL' or specific column key/header
  const [serviceFilter, setServiceFilter] = useState('ALL'); // ALL, URGENT, DUE_SOON, NORMAL
  const [rtoFilter, setRtoFilter] = useState('ALL'); // ALL, URGENT, DUE_SOON, NORMAL
  const [routeModalVehicle, setRouteModalVehicle] = useState(null); // Active vehicle for GPS Planned (Blue) & Deviated (Red) Map Modal
  const [plannedRouteModalOpen, setPlannedRouteModalOpen] = useState(false); // Modal for Assigning Planned Route
  const [routeAssignTargetVehId, setRouteAssignTargetVehId] = useState(null); // Pre-selected vehicle for Route Assignment
  const [routeDeviationTab, setRouteDeviationTab] = useState('AUDIT'); // 'AUDIT' (3 deviated events) or 'FLEET_ROUTES' (all registered vehicles)

  // Sheet horizontal scroller state & handlers for drilldown table
  const tableScrollRef = useRef(null);
  const [sheetScrollPercent, setSheetScrollPercent] = useState(0);

  const handleTableScroll = () => {
    if (!tableScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setSheetScrollPercent(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    } else {
      setSheetScrollPercent(0);
    }
  };

  const handleSheetSliderChange = (e) => {
    const pct = Number(e.target.value);
    setSheetScrollPercent(pct);
    if (!tableScrollRef.current) return;
    const { scrollWidth, clientWidth } = tableScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      tableScrollRef.current.scrollLeft = (pct / 100) * maxScroll;
    }
  };

  const slideSheet = (direction) => {
    if (!tableScrollRef.current) return;
    const delta = direction === 'left' ? -320 : 320;
    tableScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Auto-scroll controller for alerts vertical panel
  const [alertAutoScroll, setAlertAutoScroll] = useState(true);
  const [isAlertHovered, setIsAlertHovered] = useState(false);
  const [hoveredAlertId, setHoveredAlertId] = useState(null);

  // Modals
  const [showRefuelModal, setShowRefuelModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    segment: 'ALL',
    title: 'Executive Fleet Fuel & Operations Audit',
    period: 'last3months',
    fromDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });

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

  const [routeForm, setRouteForm] = useState({
    route_name: 'Delhi - Mumbai Freight Corridor',
    origin: 'Kundli Logistics Hub, Delhi',
    destination: 'JNPT Terminal, Navi Mumbai',
    distance_km: '1380',
    allowed_deviation_km: '40'
  });

  // Pillar 2 Refuelling Slip vs Sensor Reconciliation Database State
  const initialRefuelRecords = [
    {
      id: 'REF-801',
      reg_no: 'KA-04-MB-4190',
      make: 'Ashok Leyland',
      modelOnly: '4220 (14-Wheeler Multi-Axle)',
      station_name: 'HPCL COCO Pump, Sriperumbudur',
      fuel_slip_no: 'SLIP-99201',
      slip_liters: 180.0,
      sensor_rise_liters: 158.0,
      mismatch_liters: 22.0,
      financial_loss_inr: 2068,
      refuel_time: '03/11/2026 11:15',
      status: 'DISCREPANCY_FLAGGED',
      has_slip: true,
      notes: 'Discrepancy of 22 Liters between slip and digital sensor rise.'
    },
    {
      id: 'REF-800-UNVERIFIED',
      reg_no: 'RJ-14-GH-6621',
      make: 'Volvo',
      modelOnly: 'FH500 (22-Wheeler Puller)',
      station_name: 'Highway NH48 Pump (Sensor Detected)',
      fuel_slip_no: null,
      slip_liters: null, // Blank details in refuelling slip field
      sensor_rise_liters: 165.0,
      mismatch_liters: 165.0,
      financial_loss_inr: 15510,
      refuel_time: '03/11/2026 09:40',
      status: 'DISCREPANCY_FLAGGED',
      has_slip: false, // NO SLIP INSERTED!
      notes: 'Sensor detected +165.0 L refuel but NO driver refuelling slip was inserted!'
    },
    {
      id: 'REF-802',
      reg_no: 'AP-16-TX-5509',
      make: 'Tata',
      modelOnly: 'Signa 4825.TK (16-Wheeler Tipper)',
      station_name: 'IOCL Mega Point Vijayawada',
      fuel_slip_no: 'SLIP-88142',
      slip_liters: 220.0,
      sensor_rise_liters: 220.0,
      mismatch_liters: 0.0,
      financial_loss_inr: 0,
      refuel_time: '02/11/2026 06:30',
      status: 'VERIFIED_MATCHED',
      has_slip: true,
      notes: 'Matched with digital sensor'
    },
    {
      id: 'REF-803',
      reg_no: 'MH-12-RN-8842',
      make: 'Tata',
      modelOnly: 'Prima 5530.S (18-Wheeler Tractor)',
      station_name: 'BPCL Highway Oasis Samruddhi',
      fuel_slip_no: 'SLIP-77312',
      slip_liters: 350.0,
      sensor_rise_liters: 348.5,
      mismatch_liters: 0.0,
      financial_loss_inr: 0,
      refuel_time: '01/11/2026 19:20',
      status: 'VERIFIED_MATCHED',
      has_slip: true,
      notes: 'Minor variance within 0.5% tolerance'
    },
    {
      id: 'REF-804',
      reg_no: 'GJ-06-ZZ-7711',
      make: 'Eicher',
      modelOnly: 'Pro 6028 (10-Wheeler Tipper)',
      station_name: 'HPCL COCO Ankleshwar Express',
      fuel_slip_no: 'SLIP-66190',
      slip_liters: 210.0,
      sensor_rise_liters: 185.0,
      mismatch_liters: 25.0,
      financial_loss_inr: 2350,
      refuel_time: '30/10/2026 14:10',
      status: 'DISCREPANCY_FLAGGED',
      has_slip: true,
      notes: '25L Mismatch vs digital tank sensor'
    },
    {
      id: 'REF-805',
      reg_no: 'UP-32-HN-1244',
      make: 'Ashok Leyland',
      modelOnly: '4825 (16-Wheeler Haulage)',
      station_name: 'IOCL Highway COCO Hub Kanpur Road',
      fuel_slip_no: 'SLIP-55421',
      slip_liters: 300.0,
      sensor_rise_liters: 282.0,
      mismatch_liters: 18.0,
      financial_loss_inr: 1692,
      refuel_time: '29/10/2026 08:45',
      status: 'DISCREPANCY_FLAGGED',
      has_slip: true,
      notes: '18L Discrepancy logged'
    },
    {
      id: 'REF-806',
      reg_no: 'DL-01-AX-9021',
      make: 'BharatBenz',
      modelOnly: '3528R (12-Wheeler Reefer)',
      station_name: 'BPCL Highway COCO Shahpura',
      fuel_slip_no: 'SLIP-44319',
      slip_liters: 260.0,
      sensor_rise_liters: 260.0,
      mismatch_liters: 0.0,
      financial_loss_inr: 0,
      refuel_time: '28/10/2026 22:15',
      status: 'VERIFIED_MATCHED',
      has_slip: true,
      notes: 'Exact match'
    }
  ];

  const [refuelRecords, setRefuelRecords] = useState(initialRefuelRecords);
  const [showRefuelSlipForm, setShowRefuelSlipForm] = useState(false);
  const [newRefuelSlip, setNewRefuelSlip] = useState({
    reg_no: 'MH-12-RN-8842',
    fuel_slip_no: 'SLIP-HPCL-7740',
    station_name: 'HPCL COCO Hub, Highway Express',
    slip_liters: '190.0',
    sensor_rise_liters: '172.0',
    fuel_rate: '94.0'
  });

  // Driver Management & Sarathi DL Verification Master Database State
  const initialDriverList = [
    {
      s_no: 1,
      driver_id: 'DRV-101',
      driver_name: 'Rajesh Gurjar',
      driver_phone: '+91 98231 44019',
      dl_number: 'MH-12-2015-0084920',
      dl_class: 'TRANS / HCV-Articulated',
      endorsements: 'HAZMAT / Dangerous Goods',
      is_commercial: true,
      issuing_rto: 'MH-12 Pune RTO, Maharashtra',
      expiry_date: '2029-06-14',
      expiry_display: '14/06/2029',
      days_to_expiry: 957,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '15/03/2021',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 2,
      driver_id: 'DRV-102',
      driver_name: 'Vikram Singh',
      driver_phone: '+91 98110 55231',
      dl_number: 'DL-01-2017-0038472',
      dl_class: 'TRANS / Heavy Goods (HGV)',
      endorsements: 'Reefer Pharma Transport',
      is_commercial: true,
      issuing_rto: 'DL-01 Mall Road Delhi',
      expiry_date: '2028-08-22',
      expiry_display: '22/08/2028',
      days_to_expiry: 662,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '10/01/2022',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 3,
      driver_id: 'DRV-103',
      driver_name: 'Manoj Yadav',
      driver_phone: '+91 97410 88219',
      dl_number: 'KA-04-2016-0091823',
      dl_class: 'TRANS / Multi-Axle HCV',
      endorsements: 'Container Freight Pass',
      is_commercial: true,
      issuing_rto: 'KA-04 Yeshwanthpur RTO, Karnataka',
      expiry_date: '2027-11-18',
      expiry_display: '18/11/2027',
      days_to_expiry: 384,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '20/08/2021',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 4,
      driver_id: 'DRV-104',
      driver_name: 'Suresh Patel',
      driver_phone: '+91 98250 66341',
      dl_number: 'GJ-06-2018-0044190',
      dl_class: 'TRANS / Heavy Commercial',
      endorsements: 'Bulk Tipper Operations',
      is_commercial: true,
      issuing_rto: 'GJ-06 Vadodara RTO, Gujarat',
      expiry_date: '2029-03-05',
      expiry_display: '05/03/2029',
      days_to_expiry: 856,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '12/04/2022',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 5,
      driver_id: 'DRV-105',
      driver_name: 'Harpreet Singh',
      driver_phone: '+91 98720 11984',
      dl_number: 'HR-55-2014-0077218',
      dl_class: 'TRANS / Multi-Axle Heavy',
      endorsements: 'Long Haul National Permit',
      is_commercial: true,
      issuing_rto: 'HR-55 Gurgaon RTO, Haryana',
      expiry_date: '2028-01-12',
      expiry_display: '12/01/2028',
      days_to_expiry: 439,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '05/11/2020',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 6,
      driver_id: 'DRV-106',
      driver_name: 'Dinesh Shinde',
      driver_phone: '+91 98190 33452',
      dl_number: 'MH-04-2019-0062810',
      dl_class: 'TRANS / Heavy Construction CV',
      endorsements: 'Quarry & Mining Transit',
      is_commercial: true,
      issuing_rto: 'MH-04 Thane RTO, Maharashtra',
      expiry_date: '2029-09-29',
      expiry_display: '29/09/2029',
      days_to_expiry: 1064,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '18/02/2023',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 7,
      driver_id: 'DRV-107',
      driver_name: 'Ramesh Sharma',
      driver_phone: '+91 94140 77123',
      dl_number: 'RJ-14-2016-0048122',
      dl_class: 'TRANS / Heavy Goods Vehicle',
      endorsements: 'Hill Driving & Heavy Haul',
      is_commercial: true,
      issuing_rto: 'RJ-14 Jaipur South RTO, Rajasthan',
      expiry_date: '2026-11-24',
      expiry_display: '24/11/2026',
      days_to_expiry: 25,
      is_valid: true,
      validity_status: 'EXPIRING_SOON',
      org_status: 'ACTIVE',
      joining_date: '01/06/2021',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 8,
      driver_id: 'DRV-108',
      driver_name: 'Anil Verma',
      driver_phone: '+91 94520 99411',
      dl_number: 'UP-32-2017-0081923',
      dl_class: 'TRANS / HCV Logistics',
      endorsements: 'National Freight Corridor Pass',
      is_commercial: true,
      issuing_rto: 'UP-32 Lucknow RTO, Uttar Pradesh',
      expiry_date: '2028-07-15',
      expiry_display: '15/07/2028',
      days_to_expiry: 624,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '14/09/2022',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 9,
      driver_id: 'DRV-109',
      driver_name: 'Karthik Raja',
      driver_phone: '+91 98400 22345',
      dl_number: 'TN-09-2015-0099418',
      dl_class: 'TRANS / Heavy ODC Puller',
      endorsements: 'ODC & Hazardous Cargo Endorsed',
      is_commercial: true,
      issuing_rto: 'TN-09 Chennai South RTO, Tamil Nadu',
      expiry_date: '2027-10-30',
      expiry_display: '30/10/2027',
      days_to_expiry: 365,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '22/07/2020',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 10,
      driver_id: 'DRV-110',
      driver_name: 'Subhash Ghosh',
      driver_phone: '+91 98310 77654',
      dl_number: 'WB-19-2018-0051289',
      dl_class: 'TRANS / Heavy Tipper Dumper',
      endorsements: 'Port Logistics & Heavy Transit',
      is_commercial: true,
      issuing_rto: 'WB-19 Alipore RTO, West Bengal',
      expiry_date: '2029-04-18',
      expiry_display: '18/04/2029',
      days_to_expiry: 900,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: '10/05/2023',
      exit_date: null,
      exit_reason: null
    },
    {
      s_no: 11,
      driver_id: 'DRV-111',
      driver_name: 'Mohd. Aslam',
      driver_phone: '+91 98910 11244',
      dl_number: 'UP-14-2012-0033109',
      dl_class: 'TRANS / Medium Goods (MGV)',
      endorsements: 'Regional Delivery Pass',
      is_commercial: true,
      issuing_rto: 'UP-14 Ghaziabad RTO, Uttar Pradesh',
      expiry_date: '2025-10-10',
      expiry_display: '10/10/2025 (Expired)',
      days_to_expiry: -385,
      is_valid: false,
      validity_status: 'EXPIRED',
      org_status: 'EXITED',
      joining_date: '10/01/2020',
      exit_date: '15/09/2026',
      exit_reason: 'Voluntary Resignation & DL Expired'
    }
  ];

  const [driverDatabase, setDriverDatabase] = useState(initialDriverList);
  const [driverTabFilter, setDriverTabFilter] = useState('ALL'); // ALL, ACTIVE, EXITED, EXPIRING_SOON
  const [dlLookupInput, setDlLookupInput] = useState('');
  const [dlLookupResult, setDlLookupResult] = useState(null);
  const [dlLookupLoading, setDlLookupLoading] = useState(false);
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [exitDriverTarget, setExitDriverTarget] = useState(null);
  const [exitReasonInput, setExitReasonInput] = useState('Voluntary Resignation');
  const [exitDateInput, setExitDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [newDriverForm, setNewDriverForm] = useState({
    driver_name: '',
    driver_phone: '',
    dl_number: '',
    dl_class: 'TRANS / HCV (Heavy Commercial Vehicle)',
    endorsements: 'National Freight Corridor Pass',
    is_commercial: true,
    issuing_rto: '',
    expiry_date: '',
    joining_date: new Date().toISOString().split('T')[0]
  });

  const handleVerifyDlNumber = (dlNum) => {
    const cleanDl = (dlNum || dlLookupInput).trim().toUpperCase();
    if (!cleanDl) return;
    setDlLookupLoading(true);
    setDlLookupResult(null);
    setTimeout(() => {
      const existing = driverDatabase.find(d => d.dl_number.replace(/[\s-]/g, '').toUpperCase() === cleanDl.replace(/[\s-]/g, ''));
      if (existing) {
        setDlLookupResult({
          found: true,
          is_existing_driver: true,
          driver_name: existing.driver_name,
          dl_number: existing.dl_number,
          dl_class: existing.dl_class,
          is_commercial: existing.is_commercial,
          issuing_rto: existing.issuing_rto,
          expiry_date: existing.expiry_display || existing.expiry_date,
          days_to_expiry: existing.days_to_expiry,
          is_valid: existing.is_valid,
          validity_status: existing.validity_status,
          org_status: existing.org_status,
          endorsements: existing.endorsements
        });
      } else if (cleanDl.includes('EXPIRED') || cleanDl.endsWith('0044910') || cleanDl.startsWith('DL-04')) {
        setDlLookupResult({
          found: true,
          is_existing_driver: false,
          driver_name: 'Pravin Kumar',
          dl_number: cleanDl,
          dl_class: 'TRANS / Medium Goods Vehicle (MGV)',
          is_commercial: true,
          issuing_rto: 'DL-04 Janakpuri RTO, Delhi',
          expiry_date: '12/01/2024 (Expired)',
          days_to_expiry: -650,
          is_valid: false,
          validity_status: 'EXPIRED / INVALID',
          org_status: 'NOT_ONBOARDED',
          endorsements: 'Expired - Renewal Overdue by 650 days'
        });
      } else if (cleanDl.includes('PRIVATE') || cleanDl.endsWith('0077812') || cleanDl.startsWith('KA-01')) {
        setDlLookupResult({
          found: true,
          is_existing_driver: false,
          driver_name: 'Abhishek Hegde',
          dl_number: cleanDl,
          dl_class: 'LMV (Light Motor Vehicle) & MCWG (Motorcycle)',
          is_commercial: false,
          issuing_rto: 'KA-01 Koramangala RTO, Bangalore',
          expiry_date: '15/10/2038',
          days_to_expiry: 4368,
          is_valid: true,
          validity_status: 'VALID (NON-COMMERCIAL ONLY)',
          org_status: 'NOT_ONBOARDED',
          endorsements: 'Non-Commercial (Private Only - Not Authorized for HCV/TRANS)'
        });
      } else {
        setDlLookupResult({
          found: true,
          is_existing_driver: false,
          driver_name: 'Sanjay Deshmukh',
          dl_number: cleanDl,
          dl_class: 'TRANS / HCV-Articulated & Heavy Commercial',
          is_commercial: true,
          issuing_rto: 'MH-14 Pimpri Chinchwad RTO, Maharashtra',
          expiry_date: '28/02/2030',
          days_to_expiry: 1216,
          is_valid: true,
          validity_status: 'VALID (ACTIVE SARATHI)',
          org_status: 'NOT_ONBOARDED',
          endorsements: 'HAZMAT & Multi-Axle Heavy Freight Endorsed'
        });
      }
      setDlLookupLoading(false);
    }, 400);
  };

  const handleConfirmOnboard = () => {
    if (!newDriverForm.driver_name || !newDriverForm.dl_number) return;
    const newId = `DRV-${100 + driverDatabase.length + 1}`;
    const newRecord = {
      s_no: driverDatabase.length + 1,
      driver_id: newId,
      driver_name: newDriverForm.driver_name,
      driver_phone: newDriverForm.driver_phone || '+91 98000 00000',
      dl_number: newDriverForm.dl_number.toUpperCase(),
      dl_class: newDriverForm.dl_class || 'TRANS / HCV (Heavy Commercial Vehicle)',
      endorsements: newDriverForm.endorsements || 'Commercial National Freight Pass',
      is_commercial: Boolean(newDriverForm.is_commercial),
      issuing_rto: newDriverForm.issuing_rto || 'Transport Department RTO',
      expiry_date: newDriverForm.expiry_date || '2030-02-28',
      expiry_display: newDriverForm.expiry_date ? new Date(newDriverForm.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '28 Feb 2030',
      days_to_expiry: 1200,
      is_valid: true,
      validity_status: 'VALID',
      org_status: 'ACTIVE',
      joining_date: newDriverForm.joining_date || new Date().toISOString().split('T')[0],
      exit_date: null,
      exit_reason: null
    };

    setDriverDatabase(prev => [newRecord, ...prev]);
    setOnboardModalOpen(false);
    setDlLookupResult(null);
    setDlLookupInput('');
    setNewDriverForm({
      driver_name: '',
      driver_phone: '',
      dl_number: '',
      dl_class: 'TRANS / HCV (Heavy Commercial Vehicle)',
      endorsements: 'National Freight Corridor Pass',
      is_commercial: true,
      issuing_rto: '',
      expiry_date: '',
      joining_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleConfirmExitDriver = () => {
    if (!exitDriverTarget) return;
    setDriverDatabase(prev => prev.map(d => {
      if (d.driver_id === exitDriverTarget.driver_id) {
        return {
          ...d,
          org_status: 'EXITED',
          exit_date: exitDateInput,
          exit_reason: exitReasonInput
        };
      }
      return d;
    }));
    setExitDriverTarget(null);
  };

  const handleReonboardDriver = (driverId) => {
    setDriverDatabase(prev => prev.map(d => {
      if (d.driver_id === driverId) {
        return {
          ...d,
          org_status: 'ACTIVE',
          exit_date: null,
          exit_reason: null,
          joining_date: new Date().toISOString().split('T')[0]
        };
      }
      return d;
    }));
  };

  const handleAddRefuelSlip = (e) => {
    e?.preventDefault();
    const slipL = parseFloat(newRefuelSlip.slip_liters) || 0;
    const sensorL = parseFloat(newRefuelSlip.sensor_rise_liters) || 0;
    const diffL = Math.max(0, +(slipL - sensorL).toFixed(1));
    const veh = vehicles.find(v => v.reg_no === newRefuelSlip.reg_no);
    const makeInfo = veh ? extractMakeAndModel(veh.model, veh.id, veh.reg_no) : { make: 'Tata', model: 'Prima 5530.S' };
    
    const newRecord = {
      id: `REF-${Date.now().toString().slice(-4)}`,
      reg_no: newRefuelSlip.reg_no,
      make: veh?.make || makeInfo.make,
      modelOnly: makeInfo.model,
      station_name: newRefuelSlip.station_name || 'Highway COCO Outlet',
      fuel_slip_no: newRefuelSlip.fuel_slip_no || `SLIP-${Math.floor(10000 + Math.random() * 90000)}`,
      slip_liters: slipL,
      sensor_rise_liters: sensorL,
      mismatch_liters: diffL,
      financial_loss_inr: Math.round(diffL * (parseFloat(newRefuelSlip.fuel_rate) || DIESEL_RATE)),
      refuel_time: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: diffL > 0 ? 'DISCREPANCY_FLAGGED' : 'VERIFIED_MATCHED',
      has_slip: true,
      notes: diffL > 0 ? `Mismatch of ${diffL} L between pump slip and tank sensor` : 'Pump slip matched sensor rise'
    };

    setRefuelRecords(prev => [newRecord, ...prev]);
    setDrilldownData(prev => prev?.boxKey === 'REFUEL_MISMATCH' ? {
      ...prev,
      rows: [newRecord, ...prev.rows],
      sevenDayRows: [newRecord, ...(prev.sevenDayRows || prev.rows)]
    } : prev);
  };

  const handleSimulateSensorOnlyRefuel = () => {
    const sampleVeh = vehicles[Math.floor(Math.random() * vehicles.length)] || { reg_no: 'DL-01-AX-9021', make: 'BharatBenz', model: '3528R' };
    const makeInfo = extractMakeAndModel(sampleVeh.model, sampleVeh.id, sampleVeh.reg_no);
    const detectedRise = 175.0;

    const sensorOnlyRecord = {
      id: `REF-${Date.now().toString().slice(-4)}-UNVERIFIED`,
      reg_no: sampleVeh.reg_no,
      make: sampleVeh.make || makeInfo.make,
      modelOnly: makeInfo.model,
      station_name: 'Highway Service Corridor (Tank Sensor Rise Detected)',
      fuel_slip_no: null,
      slip_liters: null, // Blank details in refuelling slip field
      sensor_rise_liters: detectedRise,
      mismatch_liters: detectedRise,
      financial_loss_inr: Math.round(detectedRise * DIESEL_RATE),
      refuel_time: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'DISCREPANCY_FLAGGED',
      has_slip: false, // NO SLIP INSERTED!
      notes: 'Tank sensor detected +175.0 L refuel with NO corresponding driver refuelling slip uploaded.'
    };

    setRefuelRecords(prev => [sensorOnlyRecord, ...prev]);
    setDrilldownData(prev => prev?.boxKey === 'REFUEL_MISMATCH' ? {
      ...prev,
      rows: [sensorOnlyRecord, ...prev.rows],
      sevenDayRows: [sensorOnlyRecord, ...(prev.sevenDayRows || prev.rows)]
    } : prev);
  };

  // Fetch all live data
  const loadDashboardData = async () => {
    try {
      const [overviewData, savingsData, vList, alertsData, rtoData] = await Promise.all([
        fetchFleetOverview(),
        fetchDieselSavings(),
        fetchVehicles(),
        fetchAlerts(),
        fetchRtoCompliance().catch(() => [])
      ]);
      setFleetOverview(overviewData);
      setDieselSavings(savingsData);
      setVehicles(vList);
      setAlerts(alertsData);
      if (Array.isArray(rtoData)) {
        setRtoRecords(rtoData);
      }
      if (!selectedVehicle && vList.length > 0) {
        setSelectedVehicle(vList[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet Map for Row 4 using Free Map API
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.5, 78.5],
      zoom: 5,
      zoomControl: true,
      attributionControl: true
    });

    const provider = FREE_MAP_PROVIDERS[mapProvider] || FREE_MAP_PROVIDERS.osm;
    tileLayerRef.current = L.tileLayer(provider.url, provider.options).addTo(map);

    mapInstanceRef.current = map;

    // Trigger invalidateSize so Leaflet calculates DOM dimensions and fetches tiles immediately
    const triggerResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    setTimeout(triggerResize, 100);
    setTimeout(triggerResize, 350);
    setTimeout(triggerResize, 800);
    window.addEventListener('resize', triggerResize);

    return () => {
      window.removeEventListener('resize', triggerResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [loading]);

  // Update Free Map Tile Layer when user toggles mapProvider
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const provider = FREE_MAP_PROVIDERS[mapProvider] || FREE_MAP_PROVIDERS.osm;
    tileLayerRef.current = L.tileLayer(provider.url, provider.options).addTo(map);
    map.invalidateSize();
  }, [mapProvider]);

  // Update Map Markers on Vehicle Data Update (Row 4)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || vehicles.length === 0) return;

    vehicles.forEach(v => {
      const matchesFilter = mapFilter === 'ALL' || v.status === mapFilter;
      const isSelected = selectedVehicle && selectedVehicle.id === v.id;

      // Color coding: Working = Green, Idle = Yellow, Stopped = Red
      const statusColor = v.status === 'RUNNING' ? '#00E676' : v.status === 'IDLE' ? '#FFD600' : '#FF1744';
      const statusLabel = v.status === 'RUNNING' ? 'Working' : v.status === 'IDLE' ? 'Idle' : 'Stopped';

      if (markersRef.current[v.id]) {
        if (!matchesFilter) {
          markersRef.current[v.id].remove();
          delete markersRef.current[v.id];
          return;
        }
        markersRef.current[v.id].setLatLng([v.current_lat, v.current_lng]);
      } else if (matchesFilter) {
        const customIcon = L.divIcon({
          className: 'custom-fleet-marker',
          html: `
            <div style="
              background: #091124;
              border: 2px solid ${isSelected ? '#00F0FF' : statusColor};
              box-shadow: 0 0 ${isSelected ? '16px #00F0FF' : '8px ' + statusColor};
              border-radius: 8px;
              padding: 2px 7px;
              display: flex;
              align-items: center;
              gap: 5px;
              color: #fff;
              font-size: 10px;
              font-weight: 700;
              font-family: monospace;
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -50%);
            ">
              <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${statusColor}; box-shadow:0 0 6px ${statusColor};"></span>
              <span>${v.reg_no.split('-')[0]}-${v.reg_no.split('-')[1]}</span>
              <span style="color:#00F0FF; font-size:9px;">${v.speed_kmh}km/h</span>
              <span style="font-size:8px; opacity:0.8; text-transform:uppercase; color:${statusColor}">${statusLabel}</span>
            </div>
          `,
          iconSize: [110, 24],
          iconAnchor: [55, 12]
        });

        const marker = L.marker([v.current_lat, v.current_lng], { icon: customIcon })
          .addTo(map)
          .on('click', () => {
            setSelectedVehicle(v);
          });

        markersRef.current[v.id] = marker;
      }
    });

    // Draw route for selected vehicle
    if (selectedVehicle) {
      if (polylineRef.current) {
        polylineRef.current.remove();
      }

      const routePoints = [
        [selectedVehicle.current_lat - 0.45, selectedVehicle.current_lng - 0.35],
        [selectedVehicle.current_lat, selectedVehicle.current_lng],
        [selectedVehicle.current_lat + 0.55, selectedVehicle.current_lng + 0.45]
      ];

      polylineRef.current = L.polyline(routePoints, {
        color: '#00F0FF',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.85
      }).addTo(map);
    }
  }, [vehicles, selectedVehicle, mapFilter]);

  // Handle Alert Acknowledgment: Turns Red to Green!
  const handleAcknowledge = async (alertId) => {
    setAcknowledgingId(alertId);
    try {
      await acknowledgeAlert(alertId, 'NOC Supervisor (Duty Desk)');
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_acknowledged: 1, acknowledged_by: 'NOC Supervisor', acknowledged_at: 'Just now' } : a
      ));
    } catch (err) {
      alert('Error acknowledging alert: ' + err.message);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleRefuelCrossCheckSubmit = async (e) => {
    e.preventDefault();
    try {
      await crossCheckRefueling(refuelForm);
      setShowRefuelModal(false);
      loadDashboardData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    try {
      await savePlannedRoute(routeForm);
      setShowRouteModal(false);
      loadDashboardData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const openReport = (segment, title) => {
    setReportConfig({
      segment,
      title,
      period: 'last3months',
      fromDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0]
    });
    setShowReportModal(true);
  };

  const downloadFilteredReport = () => {
    const url = downloadReportUrl({
      segment: reportConfig.segment,
      period: reportConfig.period,
      fromDate: reportConfig.fromDate,
      toDate: reportConfig.toDate
    });
    window.open(url, '_blank');
    setShowReportModal(false);
  };



  // Row 1 metrics
  const totalFleet = vehicles.length;
  const workingCount = vehicles.filter(v => v.status === 'RUNNING').length;
  const idleCount = vehicles.filter(v => v.status === 'IDLE' || (v.speed_kmh === 0 && v.fuel_flow_rate_lph > 1.2)).length;
  const stoppedCount = vehicles.filter(v => v.status === 'STOPPED' || (v.speed_kmh === 0 && v.fuel_flow_rate_lph <= 1.2)).length;
  const lateStartCount = vehicles.filter(v => v.late_start === 1).length;

  // Row 2 metrics (Diesel Savings 5 Pillars)
  const p1 = dieselSavings?.pillar1_siphoning || {};
  const p2 = dieselSavings?.pillar2_refuelingMismatch || {};
  const p3 = dieselSavings?.pillar3_idling || {};
  const p4 = dieselSavings?.pillar4_highCph || {};
  const p5 = dieselSavings?.pillar5_routeDeviation || {};

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Number of affected vehicles per pillar (Today's losses)
  const p1VehiclesCount = (() => {
    if (p1.events && p1.events.length > 0) {
      const todayEvents = p1.events.filter(e => !e.detected_time || e.detected_time.startsWith(todayDateStr));
      if (todayEvents.length > 0) {
        return new Set(todayEvents.map(e => e.vehicle_id || e.reg_no)).size;
      }
    }
    return 1;
  })();

  const p2VehiclesCount = (() => {
    if (p2.refuelings && p2.refuelings.length > 0) {
      const flagged = p2.refuelings.filter(r => r.status === 'DISCREPANCY_FLAGGED' || (r.mismatch_liters || 0) > 5);
      if (flagged.length > 0) {
        return new Set(flagged.map(r => r.vehicle_id || r.reg_no)).size;
      }
    }
    return p2.flaggedCount || 1;
  })();

  const p3VehiclesCount = (() => {
    const idling = vehicles.filter(v => (v.idling_loss_liters || 0) >= 4.0 || v.status === 'IDLE');
    return idling.length > 0 ? idling.length : 4;
  })();

  const p4VehiclesCount = (() => {
    const highCph = vehicles.filter(v => {
      const threshold = v.oem_cph * (1 + (v.cph_buffer_percent || 25) / 100);
      return v.current_cph > threshold;
    });
    return highCph.length > 0 ? highCph.length : (p4.highCphVehiclesCount || 3);
  })();

  const p5VehiclesCount = (() => {
    const deviated = vehicles.filter(v => (v.deviation_km || 0) > (v.route_deviation_allowed_km || 40));
    return deviated.length > 0 ? deviated.length : (p5.deviatedCount || 1);
  })();

  // Row 3 metrics
  const geofenceBreachCount = vehicles.filter(v => v.deviation_km > 40).length;
  const refuelsDoneCount = p2.refuelings?.length || 3;
  const totalLitersRefueled = p2.refuelings?.reduce((acc, r) => acc + (r.slip_liters || 0), 0) || 750;
  const totalRefuelDoneAmount = Math.round(totalLitersRefueled * DIESEL_RATE);
  
  // Dynamic 10-Hour Operations Refueling Calculations:
  // Required Fuel for 10h Ops = (10 Hours × CPH) + 25L Reserve Buffer
  // Deficit = max(0, Required Fuel - Current Fuel in Tank)
  const refuel10hVehicles = vehicles.map(v => {
    const hoursPlanned = 10;
    const cph = v.current_cph || v.oem_cph || 18.0;
    const fuelNeeded10h = parseFloat(((hoursPlanned * cph) + 25).toFixed(1)); // 25L reserve buffer
    const deficitLiters = parseFloat(Math.max(0, fuelNeeded10h - (v.current_fuel_liters || 0)).toFixed(1));
    return {
      ...v,
      hoursPlanned,
      fuelNeeded10h,
      deficitLiters,
      deficitAmountInr: Math.round(deficitLiters * DIESEL_RATE),
      needsRefuel: deficitLiters > 0
    };
  });

  const vehiclesNeedingRefuel = refuel10hVehicles.filter(v => v.needsRefuel);
  const totalRefuelQuantityReq = parseFloat(refuel10hVehicles.reduce((acc, v) => acc + v.deficitLiters, 0).toFixed(1));
  const totalRefuelAmountReq = Math.round(totalRefuelQuantityReq * DIESEL_RATE);
  const projectedMonthRefuelLiters = Math.round(totalRefuelQuantityReq * 31);
  const projectedMonthRefuelAmount = Math.round(projectedMonthRefuelLiters * DIESEL_RATE);

  const serviceDueCount = vehicles.filter(v => {
    const gap = v.service_due_gap_km - (v.current_odometer_km % v.service_due_gap_km);
    return gap <= 500;
  }).length;

  const rtoComplianceDueCount = rtoRecords.filter(r => r.status === 'EXPIRING_SOON').length || 1;

  // -------------------------------------------------------------
  // ROW 4: FLEET PERFORMANCE, UTILIZATION & SPECIALIZED ALARMS
  // -------------------------------------------------------------
  // 1. E-Way Bill Compliance (Consignment Status & Expiry)
  // 2. Traffic & WIM Challans (Parivahan & MoRTH Fines)
  // 3. Fuel Consumed Today (Run Km Today) (For Fleet)
  // 4. Axle Alarms for Today (Since 00.00 hrs)
  // 5. Cold Chain Alarms for Today (Since 00.00 hrs)
  const ewayBillsList = [
    { id: 'EWB-241890321145', eway_bill_no: '2418 9032 1145', vehicle_reg: 'MH-12-RN-8842', consignor: 'Tata Steel Processing Ltd, Mumbai', consignee: 'Larsen & Toubro Ltd, Nagpur', cargo: 'Automotive HR Steel Coils (HSN 7208)', valid_from: '26/10/2026 04:30', valid_until: '28/10/2026 23:59', value_inr: 3850000, distance_km: 780, status: 'VALID', status_label: 'Valid & In-Transit', hours_left: 36, gen_date: '26/10/2026' },
    { id: 'EWB-892104553210', eway_bill_no: '8921 0455 3210', vehicle_reg: 'DL-01-AB-1234', consignor: 'Schneider Electric, Manesar', consignee: 'Siemens Energy, Vadodara', cargo: 'High Voltage Switchgear Panels (HSN 8537)', valid_from: '26/10/2026 06:15', valid_until: '27/10/2026 08:00', value_inr: 5400000, distance_km: 920, status: 'EXPIRING_SOON', status_label: 'Expiring Soon (<8h)', hours_left: 6, gen_date: '26/10/2026' },
    { id: 'EWB-563219804421', eway_bill_no: '5632 1980 4421', vehicle_reg: 'KA-04-E-5678', consignor: 'Bosch Automotive, Bangalore', consignee: 'Mahindra & Mahindra, Chakan', cargo: 'CRDI Fuel Injector Assemblies (HSN 8409)', valid_from: '25/10/2026 22:00', valid_until: '28/10/2026 12:00', value_inr: 4200000, distance_km: 840, status: 'VALID', status_label: 'Valid & In-Transit', hours_left: 24, gen_date: '25/10/2026' },
    { id: 'EWB-710492831002', eway_bill_no: '7104 9283 1002', vehicle_reg: 'GJ-06-TC-9988', consignor: 'Reliance Petrochemicals, Jamnagar', consignee: 'Indian Oil Depot, Panipat', cargo: 'Bulk Polymer Granules (HSN 3902)', valid_from: '26/10/2026 08:00', valid_until: '29/10/2026 18:00', value_inr: 2900000, distance_km: 1150, status: 'VALID', status_label: 'Valid & In-Transit', hours_left: 54, gen_date: '26/10/2026' },
    { id: 'EWB-334910284711', eway_bill_no: '3349 1028 4711', vehicle_reg: 'HR-55-B-4321', consignor: 'Maruti Suzuki Logistics, Gurgaon', consignee: 'NEXA Central Distribution, Jaipur', cargo: 'Engine Cylinder Blocks (HSN 8708)', valid_from: '26/10/2026 10:30', valid_until: '27/10/2026 06:00', value_inr: 3100000, distance_km: 260, status: 'EXPIRING_SOON', status_label: 'Expiring Soon (<6h)', hours_left: 4, gen_date: '26/10/2026' },
    { id: 'EWB-119840223590', eway_bill_no: '1198 4022 3590', vehicle_reg: 'MH-04-KF-7721', consignor: 'Cipla Pharma Ltd, Kurkumbh', consignee: 'Apollo Central Warehouse, Hyderabad', cargo: 'Temperature Controlled Vaccines (HSN 3004)', valid_from: '26/10/2026 03:00', valid_until: '28/10/2026 18:00', value_inr: 6800000, distance_km: 560, status: 'VALID', status_label: 'Valid & In-Transit', hours_left: 30, gen_date: '26/10/2026' },
    { id: 'EWB-442109882314', eway_bill_no: '4421 0988 2314', vehicle_reg: 'RJ-14-GH-6655', consignor: 'UltraTech Cement, Kotputli', consignee: 'Godrej Properties, Noida', cargo: 'Portland Pozzolana Cement Bulk (HSN 2523)', valid_from: '26/10/2026 12:00', valid_until: '27/10/2026 23:59', value_inr: 1850000, distance_km: 290, status: 'VALID', status_label: 'Valid & In-Transit', hours_left: 22, gen_date: '26/10/2026' },
    { id: 'EWB-665412093847', eway_bill_no: '6654 1209 3847', vehicle_reg: 'UP-32-MN-2200', consignor: 'Tata Motors CV Plant, Lucknow', consignee: 'Cargo Freight Hub, Varanasi', cargo: 'Chassis Spares & Axles (HSN 8708)', valid_from: '26/10/2026 07:00', valid_until: '28/10/2026 16:00', value_inr: 2750000, distance_km: 320, status: 'VALID', status_label: 'Valid & In-Transit', hours_left: 28, gen_date: '26/10/2026' },
    { id: 'EWB-908123746501', eway_bill_no: '9081 2374 6501', vehicle_reg: 'TN-09-XY-3344', consignor: 'Hyundai Mobis, Sriperumbudur', consignee: 'Ashok Leyland Depot, Hosur', cargo: 'Transmission Sub-Assemblies (HSN 8708)', valid_from: '26/10/2026 05:00', valid_until: '28/10/2026 20:00', value_inr: 4900000, distance_km: 310, status: 'VALID', status_label: 'Valid & In-Transit', hours_left: 32, gen_date: '26/10/2026' },
    { id: 'EWB-771239840192', eway_bill_no: '7712 3984 0192', vehicle_reg: 'WB-19-JK-8811', consignor: 'Exide Industries, Haldia', consignee: 'Luminous Power, Patna', cargo: 'Heavy Duty Commercial Inverter Batteries (HSN 8507)', valid_from: '26/10/2026 09:30', valid_until: '29/10/2026 12:00', value_inr: 3450000, distance_km: 580, status: 'VALID', status_label: 'Valid & In-Transit', hours_left: 48, gen_date: '26/10/2026' }
  ];

  const totalActiveEway = ewayBillsList.length;
  const expiringSoonEway = ewayBillsList.filter(e => e.status === 'EXPIRING_SOON').length;
  const totalCargoValueInr = ewayBillsList.reduce((acc, e) => acc + e.value_inr, 0);

  const challansList = [
    { id: 'CH-MH-2026-00491', challan_no: 'MH24102600491', vehicle_reg: 'MH-12-RN-8842', date_time: '26/10/2026 14:22', violation: 'WIM Dynamic Axle Overload (+1,400 kg)', location: 'Samruddhi Mahamarg Toll KM 142', authority: 'MoRTH / Maha Highway Police', amount_inr: 2000, status: 'PENDING', payment_status: 'Unpaid (Pending)', risk: 'HIGH', section: 'CMVR 113 / 114' },
    { id: 'CH-DL-2026-00128', challan_no: 'DL24102400128', vehicle_reg: 'DL-01-AB-1234', date_time: '24/10/2026 09:15', violation: 'Over-speeding (74 km/h in 60 zone)', location: 'Eastern Peripheral Expressway Plaza-3', authority: 'Delhi Traffic Police', amount_inr: 1000, status: 'PAID', payment_status: 'Paid & Closed', risk: 'MEDIUM', section: 'Sec 183(1) MV Act' },
    { id: 'CH-KA-2026-00892', challan_no: 'KA24102100892', vehicle_reg: 'KA-04-E-5678', date_time: '21/10/2026 18:40', violation: 'Unauthorized Lane Change / Fast Lane Driving', location: 'Hosur Road Electronic City Flyover', authority: 'Bangalore Traffic Police', amount_inr: 500, status: 'PAID', payment_status: 'Paid & Closed', risk: 'LOW', section: 'Sec 177 MV Act' },
    { id: 'CH-GJ-2026-00341', challan_no: 'GJ24101800341', vehicle_reg: 'GJ-06-TC-9988', date_time: '18/10/2026 11:05', violation: 'Toll Plaza FASTag Barcode Scan Delay', location: 'Vadodara-Ahmedabad Expressway Toll', authority: 'NHAI Regional Office', amount_inr: 0, status: 'DISMISSED', payment_status: 'Dismissed / Disputed', risk: 'LOW', section: 'NH Fee Rule 8' },
    { id: 'CH-HR-2026-00612', challan_no: 'HR24101400612', vehicle_reg: 'HR-55-B-4321', date_time: '14/10/2026 16:30', violation: 'No-Parking on National Highway Shoulder', location: 'NH-48 Bilaspur Industrial Crossing', authority: 'Haryana Highway Patrol', amount_inr: 500, status: 'PAID', payment_status: 'Paid & Closed', risk: 'LOW', section: 'Sec 122/177 MV Act' },
    { id: 'CH-MH-2026-00199', challan_no: 'MH24100900199', vehicle_reg: 'MH-04-KF-7721', date_time: '09/10/2026 08:20', violation: 'Signal Violation / Yellow Line Crossing at Junction', location: 'Bhiwandi Bypass Junction', authority: 'Thane Traffic Division', amount_inr: 500, status: 'PAID', payment_status: 'Paid & Closed', risk: 'LOW', section: 'Sec 119/177 MV Act' }
  ];

  const pendingChallans = challansList.filter(c => c.status === 'PENDING');
  const pendingChallansCount = pendingChallans.length;
  const pendingChallansAmount = pendingChallans.reduce((acc, c) => acc + c.amount_inr, 0);
  const totalChallansCount = challansList.length;

  const totalKmsToday = Math.round(vehicles.reduce((acc, v) => acc + ((v.speed_kmh || 55) * (v.engine_hours_today || 6.5) * 0.8), 0)) || 4280;
  const totalDieselToday = parseFloat(vehicles.reduce((acc, v) => acc + ((v.current_cph || 18.0) * (v.engine_hours_today || 6.5)), 0).toFixed(1)) || 1110.0;
  const totalFuelCostToday = Math.round(totalDieselToday * DIESEL_RATE);
  const fleetCostPerKm = totalKmsToday > 0 ? (totalFuelCostToday / totalKmsToday).toFixed(2) : '24.38';

  const scheduledDutyShiftHours = 10.0;
  const fleetWorkingHours = parseFloat(vehicles.reduce((acc, v) => acc + Math.min(scheduledDutyShiftHours, v.engine_hours_today || 6.5), 0).toFixed(1));
  const fleetUtilizationPercent = vehicles.length > 0 
    ? ((workingCount / vehicles.length) * 100).toFixed(1) 
    : '90.0';

  const fleetAvgMileage = totalDieselToday > 0 ? (totalKmsToday / totalDieselToday).toFixed(2) : '3.85';

  const fastagTotalTollPaidToday = 47250;
  const fastagActivePlazasCount = 42;
  const fastagLowBalanceCount = 1; // DL-01-AB-1234
  const driverDlVerifiedCount = 10;
  const driverDlExpiringCount = 1; // RJ-14-GH-6655 due in 25d

  // -------------------------------------------------------------
  // DRILLDOWN & INTERACTION LOGIC FOR ALL 20 METRIC BOXES
  // -------------------------------------------------------------
  const locateVehicleOnMap = (targetVeh) => {
    setRouteModalVehicle(targetVeh);
  };

  const exportTableToCsv = (filename, columns, rows) => {
    if (!rows || rows.length === 0) return;
    const headerLine = columns.map(c => `"${(c.header || '').replace(/"/g, '""')}"`).join(',');
    const rowLines = rows.map(r => 
      columns.map(c => {
        let val = '';
        if (c.csvValue) {
          val = c.csvValue(r);
        } else if (r[c.key] !== undefined && r[c.key] !== null) {
          val = r[c.key];
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    // Include UTF-8 BOM so Microsoft Excel cleanly renders symbols and formatting
    const csvStr = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBoxClick = (boxKey) => {
    setDrilldownSearch('');
    setSearchColumn(boxKey === 'DRIVER_DL' ? 'driver_name' : 'ALL');
    setServiceFilter('ALL');
    setRtoFilter('ALL');
    const DIESEL_RATE = 94.0;
    const todayDateStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateStr = yesterdayDate.toISOString().split('T')[0];
    const daysElapsed = Math.max(1, new Date().getDate());
    const daysInMonth = 31;
    const daysInYear = 365;

    const buildStandardLossKpis = ({
      todayVal = 0,
      yesterdayVal = 0,
      sevenDayTotal = 0,
      todayVehicles = 1,
      yesterdayVehicles = 1,
      mtdVehicles = 2,
      unit = 'L',
      subType = 'Diesel Loss',
      metricTitle = 'Loss',
      rate = DIESEL_RATE,
      customTodayInr = null,
      customYesterdayInr = null,
      customMtdInr = null,
      customMonthProjInr = null,
      customYearProjInr = null
    }) => {
      const dailyAvg = sevenDayTotal > 0 ? (sevenDayTotal / 7) : ((todayVal + yesterdayVal) / 2 || todayVal || 12);
      const mtdVal = parseFloat((dailyAvg * daysElapsed).toFixed(1));
      const monthProjVal = parseFloat((dailyAvg * daysInMonth).toFixed(1));
      const yearProjVal = Math.round(dailyAvg * daysInYear);

      const isCurrencyOnly = unit === '₹';

      const tInr = customTodayInr !== null ? customTodayInr : Math.round(todayVal * rate);
      const yInr = customYesterdayInr !== null ? customYesterdayInr : Math.round(yesterdayVal * rate);
      const mtdInr = customMtdInr !== null ? customMtdInr : Math.round(mtdVal * rate);
      const monthInr = customMonthProjInr !== null ? customMonthProjInr : Math.round(monthProjVal * rate);
      const yearInr = customYearProjInr !== null ? customYearProjInr : Math.round(yearProjVal * rate);

      return [
        {
          label: `Today's ${metricTitle} (Since 00:00 hrs)`,
          value: isCurrencyOnly ? `${todayVal.toFixed ? todayVal.toFixed(1) : todayVal} ${unit}` : `₹${tInr.toLocaleString()}`,
          sub: isCurrencyOnly ? `${subType}` : `${todayVal.toFixed ? todayVal.toFixed(1) : todayVal} ${unit} ${subType}`,
          subQty: isCurrencyOnly ? null : (todayVal.toFixed ? todayVal.toFixed(1) : todayVal),
          subUnit: isCurrencyOnly ? null : unit,
          subDesc: isCurrencyOnly ? null : subType,
          vehicleCount: todayVehicles
        },
        {
          label: `Yesterday's ${metricTitle}`,
          value: isCurrencyOnly ? `${yesterdayVal.toFixed ? yesterdayVal.toFixed(1) : yesterdayVal} ${unit}` : `₹${yInr.toLocaleString()}`,
          sub: isCurrencyOnly ? `${subType}` : `${yesterdayVal.toFixed ? yesterdayVal.toFixed(1) : yesterdayVal} ${unit}`,
          subQty: isCurrencyOnly ? null : (yesterdayVal.toFixed ? yesterdayVal.toFixed(1) : yesterdayVal),
          subUnit: isCurrencyOnly ? null : unit,
          vehicleCount: yesterdayVehicles
        },
        {
          label: `MTD ${metricTitle}`,
          value: isCurrencyOnly ? `${mtdVal.toFixed(1)} ${unit}` : `₹${mtdInr.toLocaleString()}`,
          sub: isCurrencyOnly ? '' : `${mtdVal.toFixed(1)} ${unit}`,
          subQty: isCurrencyOnly ? null : mtdVal.toFixed(1),
          subUnit: isCurrencyOnly ? null : unit,
          vehicleCount: mtdVehicles
        },
        {
          label: `Month Projection ${metricTitle}`,
          value: isCurrencyOnly ? `${monthProjVal.toFixed(1)} ${unit}` : `₹${monthInr.toLocaleString()}`,
          sub: isCurrencyOnly ? '' : `${monthProjVal.toFixed(1)} ${unit}`,
          subQty: isCurrencyOnly ? null : monthProjVal.toFixed(1),
          subUnit: isCurrencyOnly ? null : unit
        },
        {
          label: `Annual Projection ${metricTitle}`,
          value: isCurrencyOnly ? `${yearProjVal.toLocaleString()} ${unit}` : `₹${yearInr.toLocaleString()}`,
          sub: isCurrencyOnly ? '' : `${yearProjVal.toLocaleString()} ${unit}`,
          subQty: isCurrencyOnly ? null : yearProjVal.toLocaleString(),
          subUnit: isCurrencyOnly ? null : unit
        }
      ];
    };

    switch (boxKey) {
      case 'TOTAL_FLEET':
      case 'WORKING':
      case 'IDLE':
      case 'STOPPED':
      case 'LATE_START': {
        const now = new Date();
        const currentHourDecimal = parseFloat((now.getHours() + (now.getMinutes() / 60)).toFixed(1));
        const totalShiftHours = currentHourDecimal > 0.5 ? currentHourDecimal : 12.0;

        const KNOWN_MAKES = ['Tata', 'BharatBenz', 'Ashok Leyland', 'Eicher', 'Mahindra', 'Volvo'];
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

        const allTransformed = vehicles.map(v => {
          let make = 'Commercial';
          let modelOnly = v.model || 'Heavy Commercial Vehicle';
          const makeModelInfo = extractMakeAndModel(v.model, v.id, v.reg_no);
          if (makeModelInfo) {
            make = makeModelInfo.make;
            modelOnly = makeModelInfo.model;
          }

          let working = 0;
          if (v.status === 'RUNNING') {
            working = parseFloat(Math.min(v.engine_hours_today || 6.5, Math.max(1.0, totalShiftHours - 1.2)).toFixed(1));
          } else if (v.status === 'IDLE') {
            working = parseFloat(Math.min(v.engine_hours_today || 4.5, Math.max(0.8, totalShiftHours * 0.45)).toFixed(1));
          } else {
            working = parseFloat(Math.min(v.engine_hours_today || 3.0, Math.max(0.5, totalShiftHours * 0.3)).toFixed(1));
          }

          const rawIdle = parseFloat(((v.idling_loss_liters || 3.0) / 2.5).toFixed(1));
          let idle = parseFloat(Math.min(Math.max(rawIdle, 0.4), Math.max(0.4, totalShiftHours - working - 0.4)).toFixed(1));

          let stopped = parseFloat((totalShiftHours - working - idle).toFixed(1));
          if (stopped < 0) {
            stopped = 0;
            idle = parseFloat((totalShiftHours - working).toFixed(1));
          }
          const sum = parseFloat((working + idle + stopped).toFixed(1));
          const diff = parseFloat((totalShiftHours - sum).toFixed(1));
          if (diff !== 0) {
            stopped = parseFloat((stopped + diff).toFixed(1));
          }

          const plannedTrip = (v.planned_origin && v.planned_destination)
            ? `${v.planned_origin} → ${v.planned_destination}`
            : (v.route_name || 'Designated Freight Corridor');

          const currentLocation = VEHICLE_LOCATION_MAP[v.id] || v.current_location || v.location_name || v.route_name || 'En Route Corridor';
          const startedAt = v.work_start_time || '08:00 AM';

          // Composite Fleet Performance Score calculation (0 to 100)
          let pScore = v.driver_score || 80;
          pScore += (working / totalShiftHours) * 15;
          if (idle > 2.0) pScore -= (idle - 2.0) * 3;
          if (v.fuel_siphoning_loss_liters > 0) pScore -= 22;
          if (v.deviation_km > 40 || v.reg_no === 'DL-01-AX-9021') pScore -= 25;
          if (v.cph_loss_liters > 10) pScore -= 12;
          if (v.late_start === 1) pScore -= 8;
          const performanceScore = Math.max(10, Math.min(100, Math.round(pScore)));

          return {
            ...v,
            make,
            modelOnly,
            plannedTrip,
            currentLocation,
            workingHours: working,
            idleHours: idle,
            stoppedHours: stopped,
            totalShiftHours,
            startedAt,
            performanceScore
          };
        });

        // Rank fleets by performance score descending (Top performers first, Least performers last)
        allTransformed.sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));
        allTransformed.forEach((v, idx) => {
          v.rank = idx + 1;
          v.isTopPerformer = idx < 3;
          v.isLeastPerformer = idx >= allTransformed.length - 3;
        });

        const standardFleetColumns = [
          {
            header: 'Vehicle Number',
            key: 'reg_no',
            csvValue: v => v.reg_no,
            render: (v) => (
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: v.status === 'RUNNING' ? '#10B981' : v.status === 'IDLE' ? '#F59E0B' : '#EF4444',
                    boxShadow: v.status === 'RUNNING' ? '0 0 8px rgba(16,185,129,0.9)' : v.status === 'IDLE' ? '0 0 8px rgba(245,158,11,0.9)' : '0 0 8px rgba(239,68,68,0.9)'
                  }}
                  title={v.status}
                />
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{v.reg_no}</span>
              </div>
            )
          },
          {
            header: 'Make',
            key: 'make',
            csvValue: v => v.make,
            render: (v) => (
              <span className={`font-mono text-xs ${isLight ? 'text-cyan-700' : 'text-cyan-400'} font-semibold whitespace-nowrap`}>
                {v.make}
              </span>
            )
          },
          {
            header: 'Model',
            key: 'modelOnly',
            csvValue: v => v.modelOnly || v.model,
            render: (v) => (
              <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                {v.modelOnly || v.model || 'Heavy Commercial'}
              </span>
            )
          },
          {
            header: 'Current Location',
            key: 'currentLocation',
            csvValue: v => v.currentLocation,
            render: (v) => (
              <div className="min-w-[240px]">
                <span className="text-xs text-emerald-300 font-semibold block leading-tight">{v.currentLocation}</span>
                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                  GPS: {v.current_lat ? v.current_lat.toFixed(4) : '—'}, {v.current_lng ? v.current_lng.toFixed(4) : '—'}
                </span>
              </div>
            )
          },
          {
            header: 'Working',
            key: 'workingHours',
            csvValue: v => `${v.workingHours} hrs`,
            render: (v) => (
              <div className="text-left">
                <span className="font-mono text-emerald-400 text-xs block">{v.workingHours} hrs</span>
              </div>
            )
          },
          {
            header: 'Idle',
            key: 'idleHours',
            csvValue: v => `${v.idleHours} hrs`,
            render: (v) => (
              <div className="text-left">
                <span className="font-mono text-amber-400 text-xs block">{v.idleHours} hrs</span>
              </div>
            )
          },
          {
            header: 'Stopped',
            key: 'stoppedHours',
            csvValue: v => `${v.stoppedHours} hrs`,
            render: (v) => (
              <div className="text-left">
                <span className="font-mono text-rose-400 text-xs block">{v.stoppedHours} hrs</span>
              </div>
            )
          },
          {
            header: 'Started at',
            key: 'startedAt',
            csvValue: v => v.startedAt,
            render: (v) => (
              <div className="text-left">
                <span className="font-mono text-slate-200 text-xs block">{v.startedAt}</span>
                <span className={`text-[9.5px] block font-mono font-semibold mt-0.5 ${v.late_start ? 'text-rose-400' : 'text-slate-400'}`}>
                  {v.late_start ? 'Late Start (>8am)' : 'On-Schedule'}
                </span>
              </div>
            )
          }
        ];

        let filteredTransformed = allTransformed;
        let title = 'Total Commercial Fleet Inventory';
        let badgeText = `${allTransformed.length} Commercial Trucks`;
        let accent = {
          border: 'border-cyan-500/50',
          bg: 'bg-cyan-500/10',
          text: 'text-cyan-400',
          glow: 'shadow-cyan-900/30',
          badgeBg: 'bg-cyan-950 border-cyan-700 text-cyan-300'
        };
        let exportFilename = 'axona_total_fleet_telemetry.csv';

        if (boxKey === 'WORKING') {
          filteredTransformed = allTransformed.filter(v => v.status === 'RUNNING');
          setMapFilter('RUNNING');
          title = 'Working Fleets (Actively Hauling)';
          badgeText = `${filteredTransformed.length} Commercial Trucks On-Road`;
          accent = {
            border: 'border-emerald-500/50',
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            glow: 'shadow-emerald-900/30',
            badgeBg: 'bg-emerald-950 border-emerald-700 text-emerald-300'
          };
          exportFilename = 'axona_working_fleets.csv';
        } else if (boxKey === 'IDLE') {
          filteredTransformed = allTransformed.filter(v => v.status === 'IDLE' || (v.speed_kmh === 0 && v.fuel_flow_rate_lph > 1.2));
          setMapFilter('IDLE');
          title = 'Idle Fleets (Engine ON, Stationary)';
          badgeText = `${filteredTransformed.length} Idle Vehicles Detected`;
          accent = {
            border: 'border-amber-500/50',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            glow: 'shadow-amber-900/30',
            badgeBg: 'bg-amber-950 border-amber-700 text-amber-300'
          };
          exportFilename = 'axona_idle_fleets.csv';
        } else if (boxKey === 'STOPPED') {
          filteredTransformed = allTransformed.filter(v => v.status === 'STOPPED' || (v.speed_kmh === 0 && v.fuel_flow_rate_lph <= 1.2));
          setMapFilter('STOPPED');
          title = 'Stopped Commercial Fleets';
          badgeText = `${filteredTransformed.length} Trucks Parked / Inactive`;
          accent = {
            border: 'border-purple-500/50',
            bg: 'bg-purple-500/10',
            text: 'text-purple-300',
            glow: 'shadow-purple-900/30',
            badgeBg: 'bg-purple-950 border-purple-700 text-purple-200'
          };
          exportFilename = 'axona_stopped_fleets.csv';
        } else if (boxKey === 'LATE_START') {
          filteredTransformed = allTransformed.filter(v => v.late_start === 1);
          title = 'Late Start Shift Exceptions (>08:00 AM)';
          badgeText = `${filteredTransformed.length} Late Start Shift Exceptions`;
          accent = {
            border: 'border-rose-500/50',
            bg: 'bg-rose-500/10',
            text: 'text-rose-400',
            glow: 'shadow-rose-900/30',
            badgeBg: 'bg-rose-950 border-rose-700 text-rose-300'
          };
          exportFilename = 'axona_late_start_exceptions.csv';
        }

        setDrilldownData({
          boxKey,
          title,
          category: null,
          badgeText,
          accent,
          kpis: null,
          columns: standardFleetColumns,
          rows: filteredTransformed,
          sevenDayRows: filteredTransformed,
          twelveMonthRows: getTwelveMonthReportData(boxKey, filteredTransformed),
          twelveMonthColumns: getTwelveMonthCsvColumns(boxKey),
          exportFilename
        });
        break;
      }

      case 'SIPHONING': {
        const rawRows = getSevenDayEvents('SIPHONING', p1, vehicles);
        const twelveMonthRows = getTwelveMonthReportData('SIPHONING', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('SIPHONING');

        // Strictly Last 7 Days & MTD incident data with latest incident on top
        const sevenDayRows = ((rawRows && rawRows.length > 0)
          ? [...rawRows].sort((a, b) => (new Date(b.detected_time).getTime() || 0) - (new Date(a.detected_time).getTime() || 0))
          : []).map((r, i) => {
            const { make, model } = extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no);
            return {
              ...r,
              s_no: i + 1,
              make,
              modelOnly: model
            };
          });

        const totalLiters = sevenDayRows.reduce((a, r) => a + (r.siphoned_liters || 0), 0);
        const totalLoss = Math.round(totalLiters * DIESEL_RATE);

        setDrilldownData({
          boxKey,
          title: 'Pillar 1: Fuel Siphoning Theft Incidents',
          category: null,
          badgeText: `${sevenDayRows.length} Theft Events (MTD)`,
          accent: {
            border: 'border-rose-500/50',
            bg: 'bg-rose-500/10',
            text: 'text-rose-400',
            glow: 'shadow-rose-900/30',
            badgeBg: 'bg-rose-950 border-rose-700 text-rose-300'
          },
          kpis: buildStandardLossKpis({
            todayVal: sevenDayRows.filter(r => r.detected_time?.startsWith(todayDateStr)).reduce((a, r) => a + (r.siphoned_liters || 0), 0) || 28.5,
            yesterdayVal: sevenDayRows.filter(r => r.detected_time?.startsWith(yesterdayDateStr)).reduce((a, r) => a + (r.siphoned_liters || 0), 0) || 14.0,
            sevenDayTotal: totalLiters || 124.5,
            todayVehicles: p1VehiclesCount || 1,
            yesterdayVehicles: 1,
            mtdVehicles: 2,
            unit: 'L',
            subType: 'Siphoning Theft'
          }),
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (r, idx) => r.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (r, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {r.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: r => r.reg_no,
              render: (r) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{r.reg_no}</span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: r => r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make,
              render: (r) => {
                const make = r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: r => r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model,
              render: (r) => {
                const model = r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model;
                return (
                  <span className={`font-mono text-[11px] ${isLight ? 'text-slate-800' : 'text-slate-200'} truncate max-w-[140px] block whitespace-nowrap`} title={model}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Siphoned Liters', key: 'siphoned_liters', csvValue: r => `${r.siphoned_liters} L`, render: (r) => (
              <span className="font-mono text-rose-400 text-xs whitespace-nowrap">
                {r.siphoned_liters > 0 ? `-${r.siphoned_liters} L` : '0 L'}
              </span>
            )},
            { header: 'Financial Loss', key: 'financial_loss_inr', csvValue: r => `₹${Math.round(r.financial_loss_inr || r.estimated_loss_inr || ((r.siphoned_liters || 0) * DIESEL_RATE))}`, render: (r) => {
              const loss = Math.round(r.financial_loss_inr || r.estimated_loss_inr || ((r.siphoned_liters || 0) * DIESEL_RATE));
              return <span className="font-mono text-rose-300 text-xs whitespace-nowrap">₹{loss.toLocaleString()}</span>;
            }},
            { header: 'Incident Time', key: 'detected_time', render: (r) => (
              <span className="font-mono text-slate-300 text-xs whitespace-nowrap">{formatDateDDMMYYYY(r.detected_time)}</span>
            )},
            { header: 'Incident Location', key: 'location_name', render: (r) => (
              <div className="min-w-[160px] max-w-[210px] whitespace-normal leading-tight" title={r.location_name}>
                <span className="text-slate-200 text-xs font-medium block truncate max-w-[200px]">{r.location_name}</span>
              </div>
            )},
            { 
              header: (
                <div className="grid grid-cols-6 gap-1 text-center text-[9px] tracking-wider min-w-[150px]">
                  <span className="text-pink-400 font-bold">Y'day</span>
                  <span className="text-rose-400 font-bold">1W</span>
                  <span className="text-orange-400 font-bold">1M</span>
                  <span className="text-amber-400 font-bold">3M</span>
                  <span className="text-teal-400 font-bold">6M</span>
                  <span className="text-purple-400 font-bold">1Y</span>
                </div>
              ), 
              key: 'incident_counts', 
              csvValue: r => `Y:${r.history?.yest || 0}, 1W:${r.history?.w1 || 0}, 1M:${r.history?.m1 || 0}, 3M:${r.history?.m3 || 0}, 6M:${r.history?.m6 || 0}, 1Y:${r.history?.y1 || 0}`,
              render: (r) => {
                const h = r.history || {};
                return (
                  <div className="grid grid-cols-6 gap-1 items-center min-w-[150px]">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold font-mono border ${
                      (h.yest || 0) > 0 ? 'bg-[#3d0e1b] text-pink-300 border-pink-700/80 shadow-sm' : 'bg-[#0a1122] text-slate-600 border-slate-800'
                    }`}>
                      {h.yest || 0}
                    </span>
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold font-mono border ${
                      (h.w1 || 0) > 0 ? 'bg-[#380d15] text-rose-300 border-rose-700/80 shadow-sm' : 'bg-[#0a1122] text-slate-600 border-slate-800'
                    }`}>
                      {h.w1 || 0}
                    </span>
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold font-mono border ${
                      (h.m1 || 0) > 0 ? 'bg-[#381c08] text-orange-300 border-orange-700/80 shadow-sm' : 'bg-[#0a1122] text-slate-600 border-slate-800'
                    }`}>
                      {h.m1 || 0}
                    </span>
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold font-mono border ${
                      (h.m3 || 0) > 0 ? 'bg-[#382a08] text-amber-300 border-amber-700/80 shadow-sm' : 'bg-[#0a1122] text-slate-600 border-slate-800'
                    }`}>
                      {h.m3 || 0}
                    </span>
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold font-mono border ${
                      (h.m6 || 0) > 0 ? 'bg-[#082e28] text-teal-300 border-teal-700/80 shadow-sm' : 'bg-[#0a1122] text-slate-600 border-slate-800'
                    }`}>
                      {h.m6 || 0}
                    </span>
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold font-mono border ${
                      (h.y1 || 0) > 0 ? 'bg-[#28133d] text-purple-300 border-purple-700/80 shadow-sm' : 'bg-[#0a1122] text-slate-600 border-slate-800'
                    }`}>
                      {h.y1 || 0}
                    </span>
                  </div>
                );
              }
            },
            {
              header: '1Y Total Loss',
              key: 'liters_1y',
              csvValue: r => `${r.history?.liters1y || 0} L (Rs ${Math.abs(r.history?.inr1y || 0)})`,
              render: (r) => (
                <div className="font-mono text-xs whitespace-nowrap">
                  <span className="text-[#F43F5E] font-bold block text-xs">
                    {r.history?.liters1y ? `-${Math.abs(r.history.liters1y).toFixed(1)} L` : '-0.0 L'}
                  </span>
                  <span className="text-slate-400 font-medium text-[10.5px] block">
                    {r.history?.inr1y ? `₹${Math.abs(r.history.inr1y).toLocaleString()}` : '₹0'}
                  </span>
                </div>
              )
            },
            {
              header: 'LAST INCIDENT',
              key: 'last_incident',
              csvValue: r => `${r.history?.lastDate || r.detected_time} (${r.history?.lastLiters || r.siphoned_liters} L)`,
              render: (r) => (
                <div className="font-mono text-xs whitespace-nowrap">
                  <span className="text-slate-200 block text-[11px] leading-tight font-medium">
                    {r.history?.lastDate || r.detected_time}
                  </span>
                  <span className="text-[#F43F5E] font-bold text-[10.5px] block mt-0.5 leading-tight">
                    {r.history?.lastLiters ? `-${Math.abs(r.history.lastLiters)} L` : `-${r.siphoned_liters || 0} L`}
                  </span>
                </div>
              )
            }
          ],
          rows: sevenDayRows,
          sevenDayRows: sevenDayRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_pillar1_fuel_siphoning_audit.csv'
        });
        break;
      }

      case 'REFUEL_MISMATCH': {
        const rowsToDisplay = refuelRecords && refuelRecords.length > 0 ? refuelRecords : getSevenDayEvents('REFUEL_MISMATCH', p2, vehicles);
        const twelveMonthRows = getTwelveMonthReportData('REFUEL_MISMATCH', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('REFUEL_MISMATCH');
        const totalMismatchL = rowsToDisplay.reduce((a, r) => a + (r.mismatch_liters || 0), 0);
        const totalMismatchLoss = Math.round(totalMismatchL * DIESEL_RATE);

        setDrilldownData({
          boxKey,
          title: 'Pillar 2: Refuelling Mismatch & Slip Discrepancies',
          category: 'Physical Fuel Slip vs. Digital Sensor Level Discrepancy Audit',
          badgeText: `${rowsToDisplay.filter(r => r.status === 'DISCREPANCY_FLAGGED' || !r.slip_liters).length} Discrepancies (MTD)`,
          accent: {
            border: 'border-amber-500/50',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            glow: 'shadow-amber-900/30',
            badgeBg: 'bg-amber-950 border-amber-700 text-amber-300'
          },
          kpis: buildStandardLossKpis({
            todayVal: rowsToDisplay.filter(r => r.refuel_time?.startsWith(todayDateStr)).reduce((a, r) => a + (r.mismatch_liters || 0), 0) || 22.0,
            yesterdayVal: rowsToDisplay.filter(r => r.refuel_time?.startsWith(yesterdayDateStr)).reduce((a, r) => a + (r.mismatch_liters || 0), 0) || 35.0,
            sevenDayTotal: rowsToDisplay.reduce((a, r) => a + (r.mismatch_liters || 0), 0) || totalMismatchL || 92.0,
            todayVehicles: p2VehiclesCount || 1,
            yesterdayVehicles: 1,
            mtdVehicles: 2,
            unit: 'L',
            subType: 'Mismatch Diff'
          }),
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (r, idx) => r.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (r, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {r.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: r => r.reg_no,
              render: (r) => (
                <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'} whitespace-nowrap`}>
                  {r.reg_no}
                </span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: r => r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make,
              render: (r) => {
                const make = r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make;
                return (
                  <span className={`font-mono text-xs font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-400'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: r => r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model,
              render: (r) => {
                const model = r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'} truncate max-w-[130px] block`} title={model}>
                    {model}
                  </span>
                );
              }
            },
            { 
              header: 'Fuel Station Outlet', 
              key: 'station_name', 
              render: (r) => (
                <span className={`font-mono text-xs truncate max-w-[170px] block ${!r.slip_liters && r.has_slip === false ? 'text-amber-300/90 italic' : 'text-slate-200 font-semibold'}`} title={r.station_name}>
                  {r.station_name}
                </span>
              )
            },
            { 
              header: 'Pump Slip (Billed)', 
              key: 'slip_liters', 
              csvValue: r => r.slip_liters ? `${r.slip_liters} L` : 'No Slip Inserted', 
              render: (r) => {
                if (!r.slip_liters && r.has_slip === false) {
                  return (
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-950/70 border border-amber-600/60 text-amber-300 italic block whitespace-nowrap">
                      — [ No Slip Inserted ]
                    </span>
                  );
                }
                return (
                  <div className="whitespace-nowrap">
                    <span className="font-mono text-slate-100 font-bold text-xs">{r.slip_liters} L</span>
                    {r.fuel_slip_no && (
                      <span className="text-slate-400 font-mono text-[10px] block font-normal">
                        ({r.fuel_slip_no})
                      </span>
                    )}
                  </div>
                );
              }
            },
            { 
              header: 'Sensor Level Rise', 
              key: 'sensor_rise_liters', 
              csvValue: r => `${r.sensor_rise_liters} L`, 
              render: (r) => (
                <span className="font-mono text-cyan-300 font-bold text-xs whitespace-nowrap">
                  +{r.sensor_rise_liters} L
                </span>
              )
            },
            { 
              header: 'Mismatch Liters', 
              key: 'mismatch_liters', 
              csvValue: r => `${r.mismatch_liters} L`, 
              render: (r) => {
                if (!r.slip_liters && r.has_slip === false) {
                  return (
                    <span className="font-mono text-xs text-amber-300 font-bold whitespace-nowrap">
                      +{r.sensor_rise_liters} L (Unverified)
                    </span>
                  );
                }
                return (
                  <span className={`font-mono text-xs font-bold whitespace-nowrap ${r.mismatch_liters > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {r.mismatch_liters > 0 ? `-${r.mismatch_liters} L` : '0 L (Matched)'}
                  </span>
                );
              }
            },
            { 
              header: 'Financial Loss', 
              key: 'financial_loss_inr', 
              csvValue: r => `₹${Math.round((r.mismatch_liters || 0) * DIESEL_RATE)}`, 
              render: (r) => {
                if (!r.slip_liters && r.has_slip === false) {
                  return (
                    <span className="font-mono text-amber-400 text-xs whitespace-nowrap">
                      Pending Slip Audit
                    </span>
                  );
                }
                return (
                  <span className={`font-mono text-xs font-bold whitespace-nowrap ${r.mismatch_liters > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ₹{Math.round((r.mismatch_liters || 0) * DIESEL_RATE).toLocaleString()}
                  </span>
                );
              }
            },
            { 
              header: 'Refuel Time', 
              key: 'refuel_time', 
              render: (r) => (
                <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">{formatDateDDMMYYYY(r.refuel_time)}</span>
              )
            },
            { 
              header: 'Status', 
              key: 'status', 
              render: (r) => {
                const isMissingSlip = !r.slip_liters && r.has_slip === false;
                const isDiscrepancy = isMissingSlip || r.status === 'DISCREPANCY_FLAGGED' || (r.mismatch_liters > 0);
                
                if (isMissingSlip) {
                  return (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-950 border border-rose-600 text-rose-300 shadow-sm flex items-center gap-1 whitespace-nowrap">
                      <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                      <span>DISCREPANCY</span>
                    </span>
                  );
                }
                if (isDiscrepancy) {
                  return (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-950 border border-amber-600 text-amber-300 shadow-sm flex items-center gap-1 whitespace-nowrap">
                      <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                      <span>DISCREPANCY</span>
                    </span>
                  );
                }
                return (
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950 border border-emerald-600 text-emerald-300 shadow-sm flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    <span>MATCHED</span>
                  </span>
                );
              }
            }
          ],
          rows: rowsToDisplay,
          sevenDayRows: rowsToDisplay,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_pillar2_refuel_mismatch_audit.csv'
        });
        break;
      }

      case 'IDLING_LOSS': {
        const sevenDayRows = getSevenDayEvents('IDLING_LOSS', p3, vehicles);
        const twelveMonthRows = getTwelveMonthReportData('IDLING_LOSS', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('IDLING_LOSS');
        const totalIdleL = sevenDayRows.reduce((a, r) => a + (r.idling_loss_liters || 0), 0);
        const totalIdleLoss = Math.round(totalIdleL * DIESEL_RATE);

        setDrilldownData({
          boxKey,
          title: 'Pillar 3: Unnecessary Idling Loss Audit',
          category: null,
          badgeText: `${sevenDayRows.filter(r => (r.idling_duration_mins || 20) > 15).length} Vehicles Audited`,
          accent: {
            border: 'border-orange-500/50',
            bg: 'bg-orange-500/10',
            text: 'text-orange-400',
            glow: 'shadow-orange-900/30',
            badgeBg: 'bg-orange-950 border-orange-700 text-orange-300'
          },
          kpis: buildStandardLossKpis({
            todayVal: sevenDayRows.filter(r => r.date_time?.startsWith(todayDateStr) && (r.idling_duration_mins || 20) > 15).reduce((a, r) => a + (r.idling_loss_liters || 0), 0) || 31.2,
            yesterdayVal: sevenDayRows.filter(r => r.date_time?.startsWith(yesterdayDateStr) && (r.idling_duration_mins || 20) > 15).reduce((a, r) => a + (r.idling_loss_liters || 0), 0) || 44.5,
            sevenDayTotal: sevenDayRows.filter(r => (r.idling_duration_mins || 20) > 15).reduce((a, r) => a + (r.idling_loss_liters || 0), 0) || totalIdleL || 148.5,
            todayVehicles: p3VehiclesCount || 6,
            yesterdayVehicles: 6,
            mtdVehicles: 6,
            unit: 'L',
            subType: ''
          }),
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (v, idx) => v.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (v, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {v.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: v => v.reg_no,
              render: (v) => (
                <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{v.reg_no}</span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: v => v.make || extractMakeAndModel(v.model).make,
              render: (v) => {
                const make = v.make || extractMakeAndModel(v.model).make;
                return (
                  <span className={`font-mono text-xs font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-400'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: v => v.modelOnly || extractMakeAndModel(v.model).model,
              render: (v) => {
                const model = v.modelOnly || extractMakeAndModel(v.model).model;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'} truncate max-w-[130px] block`} title={model}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Date & Time', key: 'date_time', render: (v) => (
              <span className="font-mono text-slate-300 text-xs whitespace-nowrap">{formatDateDDMMYYYY(v.date_time)}</span>
            )},
            { header: 'Burned Diesel (L)', key: 'idling_loss_liters', csvValue: v => `${v.idling_loss_liters?.toFixed(1) || 0} L`, render: (v) => (
              <span className="font-mono text-orange-400 text-xs font-bold whitespace-nowrap block">
                {v.idling_loss_liters?.toFixed(1) || 0} L
              </span>
            )},
            { header: 'Financial Loss', key: 'financial_loss', csvValue: v => `₹${Math.round((v.idling_loss_liters || 0) * DIESEL_RATE)}`, render: (v) => (
              <span className="font-mono text-rose-400 text-xs font-bold whitespace-nowrap">₹{Math.round((v.idling_loss_liters || 0) * DIESEL_RATE).toLocaleString('en-IN')}</span>
            )},
            { header: 'Pro Rata Monthly Loss', key: 'pro_rata_monthly_loss', csvValue: v => `₹${Math.round(((v.idling_loss_liters || 0) * DIESEL_RATE) * 30)}`, render: (v) => {
              const monthly = Math.round(((v.idling_loss_liters || 0) * DIESEL_RATE) * 30);
              return <span className="font-mono text-amber-400 text-xs font-bold whitespace-nowrap">₹{monthly.toLocaleString('en-IN')}</span>;
            }},
            { header: 'Pro Rata Annual Loss', key: 'pro_rata_annual_loss', csvValue: v => `₹${Math.round(((v.idling_loss_liters || 0) * DIESEL_RATE) * 30 * 12)}`, render: (v) => {
              const annual = Math.round(((v.idling_loss_liters || 0) * DIESEL_RATE) * 30 * 12);
              return <span className="font-mono text-purple-300 text-xs font-bold whitespace-nowrap">₹{annual.toLocaleString('en-IN')}</span>;
            }},
            { header: 'Stationary Spot', key: 'location_name', render: (v) => (
              <span className="text-slate-300 text-xs block max-w-[170px] truncate" title={v.location_name || v.route_name}>
                {v.location_name || v.route_name}
              </span>
            )}
          ],
          rows: sevenDayRows.filter(r => (r.idling_duration_mins === undefined || r.idling_duration_mins > 15)),
          sevenDayRows: sevenDayRows.filter(r => (r.idling_duration_mins === undefined || r.idling_duration_mins > 15)),
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_pillar3_idling_loss_audit.csv'
        });
        break;
      }

      case 'HIGH_CPH': {
        const sevenDayRows = getSevenDayEvents('HIGH_CPH', p4, vehicles);
        const twelveMonthRows = getTwelveMonthReportData('HIGH_CPH', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('HIGH_CPH');
        const totalCphL = sevenDayRows.reduce((a, r) => a + (r.cph_loss_liters || 0), 0);
        const totalCphLoss = Math.round(totalCphL * DIESEL_RATE);

        setDrilldownData({
          boxKey,
          title: 'Pillar 4: High CPH Benchmarking Audit',
          category: null,
          badgeText: `${sevenDayRows.length} Over-Benchmark Fleets (MTD)`,
          accent: {
            border: 'border-purple-500/50',
            bg: 'bg-purple-500/10',
            text: 'text-purple-300',
            glow: 'shadow-purple-900/30',
            badgeBg: 'bg-purple-950 border-purple-700 text-purple-200'
          },
          kpis: buildStandardLossKpis({
            todayVal: sevenDayRows.filter(r => r.date_time?.startsWith(todayDateStr)).reduce((a, r) => a + (r.cph_loss_liters || 0), 0) || 19.5,
            yesterdayVal: sevenDayRows.filter(r => r.date_time?.startsWith(yesterdayDateStr)).reduce((a, r) => a + (r.cph_loss_liters || 0), 0) || 22.5,
            sevenDayTotal: sevenDayRows.reduce((a, r) => a + (r.cph_loss_liters || 0), 0) || totalCphL || 74.3,
            todayVehicles: p4VehiclesCount || 3,
            yesterdayVehicles: 3,
            mtdVehicles: 3,
            unit: 'L',
            subType: 'Excess CPH Cost'
          }),
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (v, idx) => v.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (v, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {v.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: v => v.reg_no,
              render: (v) => (
                <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{v.reg_no}</span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: v => v.make || extractMakeAndModel(v.model).make,
              render: (v) => {
                const make = v.make || extractMakeAndModel(v.model).make;
                return (
                  <span className={`font-mono text-xs font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-400'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: v => v.modelOnly || extractMakeAndModel(v.model).model,
              render: (v) => {
                const model = v.modelOnly || extractMakeAndModel(v.model).model;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'} truncate max-w-[140px] block`} title={model}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Audit Date', key: 'date_time', render: (v) => (
              <span className="font-mono text-slate-300 text-xs whitespace-nowrap">{formatDateDDMMYYYY(v.date_time)}</span>
            )},
            { header: 'Current CPH', key: 'current_cph', csvValue: v => `${v.current_cph} L/h`, render: (v) => (
              <span className="font-mono text-purple-300 font-bold text-xs whitespace-nowrap">{v.current_cph?.toFixed(1)} L/h</span>
            )},
            { header: 'OEM Benchmark', key: 'oem_cph', csvValue: v => `${v.oem_cph} L/h`, render: (v) => (
              <span className="font-mono text-slate-300 text-xs whitespace-nowrap">{v.oem_cph?.toFixed(1)} L/h</span>
            )},
            { header: 'Excess Fuel Burned', key: 'cph_loss_liters', csvValue: v => `${v.cph_loss_liters || 0} L`, render: (v) => (
              <span className="font-mono text-rose-400 font-bold text-xs whitespace-nowrap">{v.cph_loss_liters?.toFixed(1) || 0} L</span>
            )},
            { header: 'Financial Excess', key: 'financial_loss_inr', csvValue: v => `₹${v.financial_loss_inr || Math.round((v.cph_loss_liters || 0) * DIESEL_RATE)}`, render: (v) => (
              <span className="font-mono text-rose-300 font-bold text-xs whitespace-nowrap">₹{(v.financial_loss_inr || Math.round((v.cph_loss_liters || 0) * DIESEL_RATE)).toLocaleString()}</span>
            )}
          ],
          rows: sevenDayRows,
          sevenDayRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_pillar4_high_cph_audit.csv'
        });
        break;
      }

      case 'ROUTE_DEVIATION': {
        const sevenDayRows = getSevenDayEvents('ROUTE_DEVIATION', p5, vehicles);
        const twelveMonthRows = getTwelveMonthReportData('ROUTE_DEVIATION', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('ROUTE_DEVIATION');
        const totalDevL = sevenDayRows.reduce((a, r) => a + (r.deviation_loss_liters || 0), 0);
        const totalDevLoss = Math.round(totalDevL * DIESEL_RATE);

        setDrilldownData({
          boxKey,
          title: 'Pillar 5: Route Deviation Corridor Audit',
          category: null,
          badgeText: `${sevenDayRows.length} Deviated Events (MTD)`,
          accent: {
            border: 'border-blue-500/50',
            bg: 'bg-blue-500/10',
            text: 'text-blue-400',
            glow: 'shadow-blue-900/30',
            badgeBg: 'bg-blue-950 border-blue-700 text-blue-300'
          },
          kpis: buildStandardLossKpis({
            todayVal: sevenDayRows.filter(r => r.date_time?.startsWith(todayDateStr)).reduce((a, r) => a + (r.deviation_loss_liters || 0), 0) || 18.5,
            yesterdayVal: sevenDayRows.filter(r => r.date_time?.startsWith(yesterdayDateStr)).reduce((a, r) => a + (r.deviation_loss_liters || 0), 0) || 24.0,
            sevenDayTotal: sevenDayRows.reduce((a, r) => a + (r.deviation_loss_liters || 0), 0) || totalDevL || 84.5,
            todayVehicles: p5VehiclesCount || 1,
            yesterdayVehicles: 2,
            mtdVehicles: 3,
            unit: 'L',
            subType: 'Deviation Burn'
          }),
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (v, idx) => v.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (v, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {v.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: v => v.reg_no,
              render: (v) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{v.reg_no}</span>
              )
            },
            { 
              header: 'Vehicle ID', 
              key: 'vehicle_id', 
              csvValue: v => v.vehicle_id || v.id,
              render: (v) => (
                <span className={`font-mono text-xs ${isLight ? 'text-cyan-700' : 'text-cyan-300'} whitespace-nowrap`}>
                  {v.vehicle_id || v.id}
                </span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: v => v.make || extractMakeAndModel(v.model).make,
              render: (v) => {
                const make = v.make || extractMakeAndModel(v.model).make;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: v => v.modelOnly || extractMakeAndModel(v.model).model,
              render: (v) => {
                const model = v.modelOnly || extractMakeAndModel(v.model).model;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Corridor Name', key: 'route_name', render: (v) => (
              <span className="text-slate-200 font-semibold text-xs block min-w-[180px] whitespace-normal leading-relaxed">{v.route_name}</span>
            )},
            { header: 'Incident Date', key: 'date_time', render: (v) => (
              <span className="font-mono text-slate-300 text-xs">{formatDateDDMMYYYY(v.date_time)}</span>
            )},
            { header: 'Actual Deviation', key: 'deviation_km', csvValue: v => `${v.deviation_km} km`, render: (v) => (
              <span className="font-mono text-rose-400 font-bold text-sm">+{v.deviation_km} km</span>
            )},
            { header: 'Excess Fuel Burned', key: 'deviation_loss_liters', csvValue: v => `${v.deviation_loss_liters || 0} L`, render: (v) => (
              <span className="font-mono text-blue-300 font-bold">{v.deviation_loss_liters?.toFixed(1) || 0} L</span>
            )},
            { header: 'Financial Loss', key: 'deviation_loss_liters', csvValue: v => `₹${Math.round((v.deviation_loss_liters || 0) * DIESEL_RATE)}`, render: (v) => (
              <span className="font-mono text-rose-300 font-bold">₹{Math.round((v.deviation_loss_liters || 0) * DIESEL_RATE).toLocaleString()}</span>
            )}
          ],
          rows: sevenDayRows,
          sevenDayRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_pillar5_route_deviation_audit.csv'
        });
        break;
      }

      case 'GEOFENCE': {
        const sevenDayRows = getSevenDayEvents('GEOFENCE', null, vehicles);
        const twelveMonthRows = getTwelveMonthReportData('GEOFENCE', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('GEOFENCE');
        const todayBreaches = sevenDayRows.filter(r => r.date_time?.startsWith(todayDateStr));
        const uniqueBreachedVehicles = [...new Set(sevenDayRows.map(r => r.reg_no || r.vehicle_id))];
        const totalBreachEvents = sevenDayRows.length;
        const maxBreachKm = Math.max(...sevenDayRows.map(r => r.deviation_km || 0), 0);
        const totalActiveFleetCount = vehicles?.length > 0 ? vehicles.length : 10;

        setDrilldownData({
          boxKey,
          title: 'Geofencing Boundary & Corridor Breach Audit',
          category: 'Real-time GPS Out-of-Corridor Alerts (> 40 km Perimeter)',
          badgeText: `${uniqueBreachedVehicles.length} Fleets Breached (${totalBreachEvents} Events MTD)`,
          accent: {
            border: 'border-rose-500/50',
            bg: 'bg-rose-500/10',
            text: 'text-rose-400',
            glow: 'shadow-rose-900/30',
            badgeBg: 'bg-rose-950 border-rose-700 text-rose-300'
          },
          kpis: [
            {
              label: 'Total Fleets Breached',
              value: `${uniqueBreachedVehicles.length} Fleets`,
              textColor: 'text-rose-400',
              badge: `${uniqueBreachedVehicles.length} of ${totalActiveFleetCount} Active Fleets`,
              badgeColor: isLight ? 'bg-rose-100 border-rose-300 text-rose-900' : 'bg-rose-950/90 border-rose-700 text-rose-300'
            },
            {
              label: 'Total Breach Events (MTD)',
              value: `${totalBreachEvents} Incidents`,
              textColor: 'text-amber-400',
              badge: `${todayBreaches.length || 1} Active Today`,
              badgeColor: isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-950/90 border-amber-700 text-amber-300'
            },
            {
              label: 'Max Breach Distance',
              value: `+${maxBreachKm.toFixed(1)} km`,
              textColor: 'text-rose-400',
              badge: 'Off-Corridor Peak',
              badgeColor: isLight ? 'bg-rose-100 border-rose-300 text-rose-900' : 'bg-rose-950/90 border-rose-700 text-rose-300'
            }
          ],
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (v, idx) => v.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (v, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {v.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: v => v.reg_no,
              render: (v) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{v.reg_no}</span>
              )
            },
            { 
              header: 'Vehicle ID', 
              key: 'vehicle_id', 
              csvValue: v => v.vehicle_id || v.id,
              render: (v) => (
                <span className={`font-mono text-xs ${isLight ? 'text-cyan-700' : 'text-cyan-300'} whitespace-nowrap`}>
                  {v.vehicle_id || v.id}
                </span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: v => v.make || extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no).make,
              render: (v) => {
                const make = v.make || extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no).make;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: v => v.modelOnly || extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no).model,
              render: (v) => {
                const model = v.modelOnly || extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no).model;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Date & Time', key: 'date_time', render: (v) => (
              <span className="font-mono text-slate-300 text-xs">{formatDateDDMMYYYY(v.date_time)}</span>
            )},
            { header: 'Assigned Corridor', key: 'route_name', render: (v) => (
              <span className="text-slate-200 font-semibold text-xs block">{v.route_name}</span>
            )},
            { header: 'Breach Distance', key: 'deviation_km', csvValue: v => `+${v.deviation_km} km off-track`, render: (v) => (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950 border border-rose-700 text-rose-300">
                +{v.deviation_km} km Off-Track
              </span>
            )},
            { header: 'Breach Spot / Road', key: 'location_name', render: (v) => (
              <span className="text-slate-200 text-xs block min-w-[220px] max-w-sm whitespace-normal leading-relaxed">{v.location_name || 'Highway Link'}</span>
            )}
          ],
          rows: sevenDayRows,
          sevenDayRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_geofence_breach_audit.csv'
        });
        break;
      }

      case 'REFUEL_DONE': {
        const rawSevenDayRows = getSevenDayEvents('REFUEL_DONE', p2, vehicles);
        const sevenDayRows = rawSevenDayRows.map((r, idx) => {
          const mm = extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no);
          return {
            ...r,
            s_no: idx + 1,
            vehicle_id: r.vehicle_id || r.id,
            make: mm.make,
            modelOnly: mm.model
          };
        });
        const twelveMonthRows = getTwelveMonthReportData('REFUEL_DONE', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('REFUEL_DONE');
        const totalDispensed = sevenDayRows.reduce((a, r) => a + (r.slip_liters || 0), 0);

        setDrilldownData({
          boxKey,
          title: 'Refuelling Done: Historical Logged Transactions',
          category: null,
          badgeText: `${sevenDayRows.length} Refueling Events (MTD)`,
          accent: {
            border: 'border-emerald-500/50',
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            glow: 'shadow-emerald-900/30',
            badgeBg: 'bg-emerald-950 border-emerald-700 text-emerald-300'
          },
          kpis: buildStandardLossKpis({
            todayVal: 220.0,
            yesterdayVal: 350.0,
            sevenDayTotal: 1520.0,
            todayVehicles: 2,
            yesterdayVehicles: 3,
            mtdVehicles: 8,
            unit: 'L',
            metricTitle: 'Refuelling Done',
            subType: 'Dispensed Fuel Spend'
          }),
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (r, idx) => r.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (r, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {r.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: r => r.reg_no,
              render: (r) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{r.reg_no}</span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: r => r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make,
              render: (r) => {
                const make = r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: r => r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model,
              render: (r) => {
                const model = r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model;
                return (
                  <span className={`font-mono text-[11px] ${isLight ? 'text-slate-800' : 'text-slate-200'} truncate max-w-[140px] block whitespace-nowrap`} title={model}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Station / Outlet', key: 'station_name', render: (r) => (
              <span className="text-slate-200 text-xs block min-w-[180px] whitespace-normal leading-relaxed">{r.station_name}</span>
            )},
            { header: 'Liters Dispensed', key: 'slip_liters', csvValue: r => `${r.slip_liters} L`, render: (r) => (
              <span className="font-mono text-emerald-400 text-xs whitespace-nowrap">+{r.slip_liters} L</span>
            )},
            { header: 'Tank Sensor Rise', key: 'sensor_rise_liters', csvValue: r => `${r.sensor_rise_liters} L`, render: (r) => (
              <span className="font-mono text-cyan-300 text-xs whitespace-nowrap">+{r.sensor_rise_liters} L</span>
            )},
            { header: 'Total Value', key: 'cost_inr', csvValue: r => `₹${r.cost_inr || Math.round(r.slip_liters * DIESEL_RATE)}`, render: (r) => (
              <span className="font-mono text-slate-200 text-xs whitespace-nowrap">₹{(r.cost_inr || Math.round(r.slip_liters * DIESEL_RATE)).toLocaleString()}</span>
            )},
            { header: 'Refuel Time', key: 'refuel_time', render: (r) => (
              <span className="font-mono text-slate-400 text-xs whitespace-nowrap">{formatDateDDMMYYYY(r.refuel_time)}</span>
            )}
          ],
          rows: sevenDayRows,
          sevenDayRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_refuelling_done_7days.csv'
        });
        break;
      }

      case 'REFUEL_REQ_10H': {
        const sortedRefuelRows = [...refuel10hVehicles].sort((a, b) => b.deficitLiters - a.deficitLiters).map((r, idx) => {
          const mm = extractMakeAndModel(r.model, r.id || r.vehicle_id, r.reg_no);
          return {
            ...r,
            s_no: idx + 1,
            vehicle_id: r.id || r.vehicle_id,
            make: mm.make,
            modelOnly: mm.model
          };
        });
        const twelveMonthRows = getTwelveMonthReportData('REFUEL_REQ_10H', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('REFUEL_REQ_10H');

        setDrilldownData({
          boxKey,
          title: 'Refuelling Required for 10-Hour Operations',
          category: 'Predictive Diesel Requirement (10 Hours × CPH + 25L Reserve Buffer)',
          badgeText: `${vehiclesNeedingRefuel.length} Trucks Require Refuel (${totalRefuelQuantityReq.toFixed(1)} L)`,
          accent: {
            border: 'border-amber-500/50',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            glow: 'shadow-amber-900/30',
            badgeBg: 'bg-amber-950 border-amber-700 text-amber-300'
          },
          kpis: [
            {
              label: "No. of Vehicles Refuelling Required",
              value: `${vehiclesNeedingRefuel.length} Trucks`,
              sub: null
            },
            {
              label: "Refuelling Amount (10h Ops)",
              value: `₹${totalRefuelAmountReq.toLocaleString()}`,
              sub: null
            },
            {
              label: "Refuelling Quantity Required",
              value: `${totalRefuelQuantityReq.toFixed(1)} L`,
              sub: null
            },
            {
              label: "Current Month Projected Refuel",
              value: `₹${projectedMonthRefuelAmount.toLocaleString('en-IN')}`,
              sub: null
            }
          ],
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (r, idx) => r.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (r, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {r.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: r => r.reg_no,
              render: (r) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{r.reg_no}</span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: r => r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make,
              render: (r) => {
                const make = r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: r => r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model,
              render: (r) => {
                const model = r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model;
                return (
                  <span className={`font-mono text-[11px] ${isLight ? 'text-slate-800' : 'text-slate-200'} truncate max-w-[140px] block whitespace-nowrap`} title={model}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Current Fuel in Tank', key: 'current_fuel_liters', csvValue: r => `${r.current_fuel_liters} L`, render: (r) => (
              <span className="font-mono text-cyan-300 text-xs whitespace-nowrap">{r.current_fuel_liters?.toFixed(0)} <span className="text-[10px] text-slate-400">/ {r.tank_capacity_liters} L</span></span>
            )},
            { header: 'Current CPH', key: 'current_cph', csvValue: r => `${r.current_cph} L/h`, render: (r) => (
              <span className="font-mono text-slate-300 whitespace-nowrap">{r.current_cph?.toFixed(1)} L/h</span>
            )},
            { header: '10h Fuel Requirement', key: 'fuelNeeded10h', csvValue: r => `${r.fuelNeeded10h} L`, render: (r) => (
              <span className="font-mono text-slate-200 whitespace-nowrap">{r.fuelNeeded10h} L</span>
            )},
            { header: 'Refuelling Quantity Required', key: 'deficitLiters', csvValue: r => `${r.deficitLiters} L`, render: (r) => (
              <span className={`font-mono text-xs whitespace-nowrap ${r.deficitLiters > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {r.deficitLiters > 0 ? `+${r.deficitLiters} L` : '0 L (Adequate)'}
              </span>
            )},
            { header: 'Refuelling Amount', key: 'deficitAmountInr', csvValue: r => `₹${r.deficitAmountInr}`, render: (r) => (
              <span className={`font-mono text-xs whitespace-nowrap ${r.deficitLiters > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                ₹{r.deficitAmountInr.toLocaleString()}
              </span>
            )},
            { header: 'Refuel Urgency', key: 'needsRefuel', render: (r) => (
              <span className={`px-2 py-0.5 rounded text-xs font-mono border whitespace-nowrap ${
                r.needsRefuel ? 'bg-amber-950 border-amber-700 text-amber-300' : 'bg-emerald-950 border-emerald-700 text-emerald-300'
              }`}>
                {r.needsRefuel ? 'REFUEL REQUIRED' : 'ADEQUATE TANK'}
              </span>
            )}
          ],
          rows: sortedRefuelRows,
          sevenDayRows: sortedRefuelRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_refuel_requirement_10h_ops.csv'
        });
        break;
      }

      case 'SERVICE_DUE': {
        const serviceRows = vehicles.map((v, idx) => {
          const gap = v.service_due_gap_km - (v.current_odometer_km % v.service_due_gap_km);
          const avgSpeed = v.avg_monthly_speed_kmh || (v.speed_kmh > 0 ? v.speed_kmh : 42.0);
          const hoursRem = parseFloat((gap / avgSpeed).toFixed(1));

          let serviceCategory = 'NORMAL';
          if (hoursRem <= 15.0) {
            serviceCategory = 'URGENT';
          } else if (hoursRem <= 50.0) {
            serviceCategory = 'DUE_SOON';
          } else {
            serviceCategory = 'NORMAL';
          }

          const mm = extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no);
          return {
            ...v,
            s_no: idx + 1,
            vehicle_id: v.vehicle_id || v.id,
            make: mm.make,
            modelOnly: mm.model,
            kmRemaining: gap,
            hoursRemaining: hoursRem,
            serviceCategory,
            isCritical: serviceCategory === 'URGENT'
          };
        }).sort((a, b) => a.hoursRemaining - b.hoursRemaining).map((r, i) => ({ ...r, s_no: i + 1 }));

        const totalCount = serviceRows.length;
        const urgentCount = serviceRows.filter(r => r.serviceCategory === 'URGENT').length;
        const dueSoonCount = serviceRows.filter(r => r.serviceCategory === 'DUE_SOON').length;
        const normalCount = serviceRows.filter(r => r.serviceCategory === 'NORMAL').length;

        const twelveMonthRows = getTwelveMonthReportData('SERVICE_DUE', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('SERVICE_DUE');

        setDrilldownData({
          boxKey,
          title: 'Preventive Maintenance & Servicing Schedule',
          category: 'Fleet Service Due Operational Priority (Real-Time Telemetry)',
          badgeText: `${urgentCount} Urgent (≤15H) • ${dueSoonCount} Due Soon (≤50H) • ${normalCount} Normal`,
          accent: {
            border: 'border-purple-500/50',
            bg: 'bg-purple-500/10',
            text: 'text-purple-300',
            glow: 'shadow-purple-900/30',
            badgeBg: 'bg-purple-950 border-purple-700 text-purple-200'
          },
          serviceSummary: {
            total: totalCount,
            urgent: urgentCount,
            dueSoon: dueSoonCount,
            normal: normalCount
          },
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (r, idx) => r.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (r, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {r.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: r => r.reg_no,
              render: (r) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{r.reg_no}</span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: r => r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make,
              render: (r) => {
                const make = r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: r => r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model,
              render: (r) => {
                const model = r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model;
                return (
                  <span className={`font-mono text-[11px] ${isLight ? 'text-slate-800' : 'text-slate-200'} truncate max-w-[140px] block whitespace-nowrap`} title={model}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Current Odometer', key: 'current_odometer_km', csvValue: r => `${r.current_odometer_km} km`, render: (r) => (
              <span className="font-mono text-slate-200 font-bold">{(r.current_odometer_km || 0).toLocaleString()} km</span>
            )},
            { header: 'Service Interval', key: 'service_due_gap_km', csvValue: r => `${r.service_due_gap_km} km`, render: (r) => (
              <span className="font-mono text-slate-400">{(r.service_due_gap_km || 10000).toLocaleString()} km</span>
            )},
            { header: 'Remaining Distance', key: 'kmRemaining', csvValue: r => `${r.kmRemaining} km`, render: (r) => (
              <span className={`font-mono font-bold text-sm ${
                r.serviceCategory === 'URGENT' ? 'text-rose-400' :
                r.serviceCategory === 'DUE_SOON' ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {r.kmRemaining.toLocaleString()} km
              </span>
            )},
            { header: 'Hours to Service', key: 'hoursRemaining', csvValue: r => `${r.hoursRemaining} h`, render: (r) => (
              <div className="flex items-center gap-1.5">
                <span className={`font-mono font-bold text-sm ${
                  r.serviceCategory === 'URGENT' ? 'text-rose-400' :
                  r.serviceCategory === 'DUE_SOON' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {r.hoursRemaining} h
                </span>
                <span className="text-[10px] text-slate-500 font-mono">(@ {r.avg_monthly_speed_kmh || 42} km/h)</span>
              </div>
            )},
            { header: 'Maintenance Priority', key: 'serviceCategory', render: (r) => {
              if (r.serviceCategory === 'URGENT') {
                return (
                  <span className="px-2.5 py-1 rounded-md text-[10.5px] font-bold font-mono border bg-rose-950/80 border-rose-700 text-rose-300 animate-pulse flex items-center gap-1.5 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    URGENT (≤ 15H)
                  </span>
                );
              }
              if (r.serviceCategory === 'DUE_SOON') {
                return (
                  <span className="px-2.5 py-1 rounded-md text-[10.5px] font-bold font-mono border bg-amber-950/80 border-amber-700 text-amber-300 flex items-center gap-1.5 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    DUE SOON (≤ 50H)
                  </span>
                );
              }
              return (
                <span className="px-2.5 py-1 rounded-md text-[10.5px] font-bold font-mono border bg-emerald-950/80 border-emerald-700 text-emerald-300 flex items-center gap-1.5 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  NORMAL (&gt; 50H)
                </span>
              );
            }}
          ],
          rows: serviceRows,
          sevenDayRows: serviceRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_service_due_audit.csv'
        });
        break;
      }

      case 'RTO_COMPLIANCE': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const baseRto = rtoRecords.length > 0 ? rtoRecords : [];
        const complianceRows = vehicles.map(v => {
          const rto = baseRto.find(r => r.vehicle_id === v.id || r.reg_no === v.reg_no) || {
            fitness_expiry: '2027-04-15',
            national_permit_expiry: '2027-03-10',
            insurance_expiry: '2026-11-20',
            puc_expiry: '2026-12-05',
            road_tax_expiry: '2027-01-01',
            green_tax_expiry: '2027-01-01'
          };

          const docDates = [
            { name: 'Fitness', date: rto.fitness_expiry },
            { name: 'National Permit', date: rto.national_permit_expiry },
            { name: 'Insurance', date: rto.insurance_expiry },
            { name: 'PUC', date: rto.puc_expiry },
            { name: 'Road Tax', date: rto.road_tax_expiry },
            { name: 'Green Tax', date: rto.green_tax_expiry }
          ].filter(d => d.date);

          let minDays = 999;
          let earliestDocName = 'All Valid';
          let earliestDocDate = '';

          docDates.forEach(d => {
            const exp = new Date(d.date);
            exp.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
            if (diffDays < minDays) {
              minDays = diffDays;
              earliestDocName = d.name;
              earliestDocDate = d.date;
            }
          });

          let rtoCategory = 'NORMAL';
          if (minDays <= 15) {
            rtoCategory = 'URGENT';
          } else if (minDays <= 45) {
            rtoCategory = 'DUE_SOON';
          } else {
            rtoCategory = 'NORMAL';
          }

          const mm = extractMakeAndModel(v.model, v.id, v.reg_no);
          return {
            id: rto.id || `RTO-${v.id}`,
            s_no: 1,
            vehicle_id: v.id,
            reg_no: v.reg_no,
            make: mm.make,
            modelOnly: mm.model,
            model: v.model,
            fitness_expiry: rto.fitness_expiry || '2027-06-30',
            national_permit_expiry: rto.national_permit_expiry || '2027-06-30',
            insurance_expiry: rto.insurance_expiry || '2027-06-30',
            puc_expiry: rto.puc_expiry || '2027-06-30',
            road_tax_expiry: rto.road_tax_expiry || '2027-06-30',
            green_tax_expiry: rto.green_tax_expiry || '2027-06-30',
            daysRemaining: minDays,
            earliestDocName,
            earliestDocDate,
            rtoCategory
          };
        }).sort((a, b) => a.daysRemaining - b.daysRemaining).map((r, i) => ({ ...r, s_no: i + 1 }));

        const totalCount = complianceRows.length;
        const urgentCount = complianceRows.filter(r => r.rtoCategory === 'URGENT').length;
        const dueSoonCount = complianceRows.filter(r => r.rtoCategory === 'DUE_SOON').length;
        const normalCount = complianceRows.filter(r => r.rtoCategory === 'NORMAL').length;

        const twelveMonthRows = getTwelveMonthReportData('COMPLIANCE_RTO', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('COMPLIANCE_RTO');

        setDrilldownData({
          boxKey,
          title: 'RTO Statutory Compliance & Permits Audit',
          category: 'Fitness, National Permit, Insurance, PUC & Road Tax Governance',
          badgeText: `${urgentCount} Urgent (≤15 Days) • ${dueSoonCount} Due Soon (≤45 Days) • ${normalCount} Normal`,
          accent: {
            border: 'border-rose-500/50',
            bg: 'bg-rose-500/10',
            text: 'text-rose-400',
            glow: 'shadow-rose-900/30',
            badgeBg: 'bg-rose-950 border-rose-700 text-rose-300'
          },
          rtoSummary: {
            total: totalCount,
            urgent: urgentCount,
            dueSoon: dueSoonCount,
            normal: normalCount
          },
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (r, idx) => r.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (r, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {r.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: r => r.reg_no,
              render: (r) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{r.reg_no}</span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: r => r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make,
              render: (r) => {
                const make = r.make || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).make;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: r => r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model,
              render: (r) => {
                const model = r.modelOnly || extractMakeAndModel(r.model, r.vehicle_id || r.id, r.reg_no).model;
                return (
                  <span className={`font-mono text-[11px] ${isLight ? 'text-slate-800' : 'text-slate-200'} truncate max-w-[140px] block whitespace-nowrap`} title={model}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Status / Priority', key: 'rtoCategory', render: (r) => {
              if (r.rtoCategory === 'URGENT') {
                return (
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono border bg-rose-950/80 border-rose-700 text-rose-300 animate-pulse inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    URGENT (≤15d)
                  </span>
                );
              }
              if (r.rtoCategory === 'DUE_SOON') {
                return (
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono border bg-amber-950/80 border-amber-700 text-amber-300 inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    DUE SOON (≤45d)
                  </span>
                );
              }
              return (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold font-mono border bg-emerald-950/80 border-emerald-700 text-emerald-300 inline-flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  NORMAL (&gt;45d)
                </span>
              );
            }},
            { 
              header: 'Next Expiring Document', 
              key: 'earliestDocName', 
              csvValue: r => r.earliestDocName, 
              render: (r) => (
                <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs whitespace-nowrap inline-block ${
                  r.rtoCategory === 'URGENT' ? 'bg-rose-950/80 border border-rose-700/80 text-rose-300' :
                  r.rtoCategory === 'DUE_SOON' ? 'bg-amber-950/80 border border-amber-700/80 text-amber-300' :
                  'bg-slate-900 border border-slate-700 text-slate-300'
                }`}>
                  {r.earliestDocName}
                </span>
              )
            },
            { 
              header: 'Expiry Date', 
              key: 'earliestDocDate', 
              csvValue: r => `${formatDateDDMMYYYY(r.earliestDocDate)} (${r.daysRemaining <= 0 ? 'Expires Today' : `${r.daysRemaining}d remaining`})`, 
              render: (r) => (
                <div>
                  <span className={`font-mono font-bold text-xs block whitespace-nowrap ${
                    r.rtoCategory === 'URGENT' ? 'text-rose-400' :
                    r.rtoCategory === 'DUE_SOON' ? 'text-amber-400' : 'text-slate-200'
                  }`}>
                    {formatDateDDMMYYYY(r.earliestDocDate)}
                  </span>
                  <span className={`text-[10px] font-mono block whitespace-nowrap ${
                    r.daysRemaining <= 0 ? 'text-rose-400 font-bold' :
                    r.daysRemaining <= 15 ? 'text-rose-300' :
                    r.daysRemaining <= 45 ? 'text-amber-300' : 'text-slate-400'
                  }`}>
                    {r.daysRemaining <= 0 ? 'Expires Today' : `${r.daysRemaining} days remaining`}
                  </span>
                </div>
              )
            },
            { header: 'Fitness Expiry', key: 'fitness_expiry', csvValue: r => r.fitness_expiry, render: (r) => (
              <span className="font-mono text-slate-300">{formatDateDDMMYYYY(r.fitness_expiry)}</span>
            )},
            { header: 'National Permit', key: 'national_permit_expiry', csvValue: r => r.national_permit_expiry, render: (r) => (
              <span className="font-mono text-slate-300">{formatDateDDMMYYYY(r.national_permit_expiry)}</span>
            )},
            { header: 'Commercial Insurance', key: 'insurance_expiry', csvValue: r => r.insurance_expiry, render: (r) => (
              <span className="font-mono text-slate-300">{formatDateDDMMYYYY(r.insurance_expiry)}</span>
            )},
            { header: 'PUC / Pollution', key: 'puc_expiry', csvValue: r => r.puc_expiry, render: (r) => (
              <span className="font-mono text-slate-300">{formatDateDDMMYYYY(r.puc_expiry)}</span>
            )},
            { header: 'Road Tax', key: 'road_tax_expiry', csvValue: r => r.road_tax_expiry, render: (r) => (
              <span className="font-mono text-slate-300">{formatDateDDMMYYYY(r.road_tax_expiry)}</span>
            )}
          ],
          rows: complianceRows,
          sevenDayRows: complianceRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_rto_compliance_audit.csv'
        });
        break;
      }

      case 'E_WAY_BILL': {
        const monthMap = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };

        const mappedEwayList = ewayBillsList.map((e, idx) => {
          const hsnMatch = e.cargo?.match(/\(HSN\s*(\d+)\)/i);
          const hsn_code = hsnMatch ? hsnMatch[1] : (e.hsn_code || '8708');
          const commodity_name = e.cargo ? e.cargo.replace(/\s*\(HSN\s*\d+\)/i, '').trim() : e.cargo;

          let ddmmyyyy = '';
          if (e.gen_date) {
            const parts = e.gen_date.trim().split(/\s+/);
            if (parts.length >= 3) {
              const day = parts[0].padStart(2, '0');
              const mon = monthMap[parts[1]] || '10';
              const yr = parts[2];
              ddmmyyyy = `${day}${mon}${yr}`;
            }
          }

          return {
            ...e,
            s_no: idx + 1,
            reg_no: e.vehicle_reg,
            commodity_name,
            hsn_code,
            ddmmyyyy
          };
        });

        const twelveMonthRows = mappedEwayList.map((e) => ({
          month: 'Oct 2026',
          vehicle_id: e.vehicle_reg,
          reg_no: e.vehicle_reg,
          model: 'Heavy Commercial Vehicle',
          bill_no: e.eway_bill_no,
          consignor: e.consignor,
          consignee: e.consignee,
          cargo: e.commodity_name || e.cargo,
          hsn_code: e.hsn_code,
          value_inr: e.value_inr,
          status: e.status_label
        }));

        setDrilldownData({
          boxKey,
          title: 'Fleet E-Way Bill Consignment & GST Compliance Audit',
          category: 'Real-time GST E-Way Bill Portal Sync (NIC / Vahan Gateway) • Consignment Value & Validity Tracking',
          badgeText: `${ewayBillsList.length} Active Consignments (₹${(totalCargoValueInr / 10000000).toFixed(2)} Cr In-Transit)`,
          accent: {
            border: 'border-cyan-500/50',
            bg: 'bg-cyan-500/10',
            text: 'text-cyan-400',
            glow: 'shadow-cyan-900/30',
            badgeBg: 'bg-cyan-950 border-cyan-700 text-cyan-300'
          },
          kpis: [
            { label: 'Active E-Way Bills', value: `${totalActiveEway} Bills`, sub: null },
            { label: 'Goods In-Transit Value', value: `₹${(totalCargoValueInr / 10000000).toFixed(2)} Cr`, sub: null },
            { label: 'Valid & In-Transit', value: `${totalActiveEway - expiringSoonEway} Bills`, sub: null },
            { label: 'Expiring Soon (<8h)', value: `${expiringSoonEway} Bills`, sub: null },
            { label: 'Expired / Breached', value: '0 Bills', sub: null }
          ],
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (e, idx) => e.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (e, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {e.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'E-Way Bill No', 
              key: 'eway_bill_no', 
              csvValue: e => e.eway_bill_no,
              render: (e) => (
                <span className="font-bold text-cyan-300 font-mono text-xs whitespace-nowrap">{e.eway_bill_no}</span>
              )
            },
            { 
              header: 'Generation Date', 
              key: 'gen_date', 
              csvValue: e => e.gen_date,
              render: (e) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-300'} whitespace-nowrap`}>
                  {formatDateDDMMYYYY(e.gen_date)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'vehicle_reg', 
              csvValue: e => e.vehicle_reg,
              render: (e) => (
                <span className={`font-bold font-mono text-xs ${isLight ? 'text-slate-900' : 'text-white'} whitespace-nowrap`}>{e.vehicle_reg}</span>
              )
            },
            { 
              header: 'Route Distance', 
              key: 'distance_km', 
              csvValue: e => `${e.distance_km} km`,
              render: (e) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'} whitespace-nowrap`}>{e.distance_km} km</span>
              )
            },
            { 
              header: 'Consignor (From)', 
              key: 'consignor', 
              csvValue: e => e.consignor,
              render: (e) => (
                <span className={`text-xs block ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-normal min-w-[150px] max-w-[200px] leading-tight font-medium`} title={e.consignor}>
                  {e.consignor}
                </span>
              )
            },
            { 
              header: 'Consignee (To)', 
              key: 'consignee', 
              csvValue: e => e.consignee,
              render: (e) => (
                <span className={`text-xs block ${isLight ? 'text-slate-700' : 'text-slate-300'} whitespace-normal min-w-[150px] max-w-[200px] leading-tight`} title={e.consignee}>
                  {e.consignee}
                </span>
              )
            },
            { 
              header: 'Cargo / Commodity', 
              key: 'commodity_name', 
              csvValue: e => e.commodity_name || e.cargo,
              render: (e) => (
                <span className={`text-xs block ${isLight ? 'text-slate-800' : 'text-slate-300'} whitespace-normal min-w-[160px] max-w-[220px] leading-tight font-medium`} title={e.commodity_name || e.cargo}>
                  {e.commodity_name || e.cargo}
                </span>
              )
            },
            { 
              header: 'HSN Code', 
              key: 'hsn_code', 
              csvValue: e => e.hsn_code,
              render: (e) => (
                <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 whitespace-nowrap inline-block shadow-xs">
                  {e.hsn_code}
                </span>
              )
            },
            { 
              header: 'Consignment Value', 
              key: 'value_inr', 
              csvValue: e => `₹${e.value_inr}`,
              render: (e) => (
                <span className="font-mono text-emerald-400 font-bold text-xs whitespace-nowrap">₹{e.value_inr.toLocaleString()}</span>
              )
            },
            { 
              header: 'Valid Until', 
              key: 'valid_until', 
              csvValue: e => e.valid_until,
              render: (e) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>{formatDateDDMMYYYY(e.valid_until)}</span>
              )
            },
            { 
              header: 'Time Remaining', 
              key: 'hours_left', 
              csvValue: e => `${e.hours_left} hrs remaining`,
              render: (e) => (
                <span className={`font-mono text-xs font-bold whitespace-nowrap ${e.hours_left <= 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {e.hours_left} hrs remaining
                </span>
              )
            },
            { 
              header: 'Status', 
              key: 'status', 
              csvValue: e => e.status_label,
              render: (e) => (
                <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold font-mono border whitespace-nowrap ${
                  e.status === 'EXPIRING_SOON'
                    ? 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {e.status_label}
                </span>
              )
            }
          ],
          rows: mappedEwayList,
          sevenDayRows: mappedEwayList,
          twelveMonthRows,
          twelveMonthColumns: [
            { header: 'Vehicle', key: 'vehicle_id' },
            { header: 'E-Way Bill No', key: 'bill_no' },
            { header: 'Consignor', key: 'consignor' },
            { header: 'Consignee', key: 'consignee' },
            { header: 'Cargo', key: 'cargo' },
            { header: 'Value (INR)', key: 'value_inr' },
            { header: 'Status', key: 'status' }
          ],
          exportFilename: 'axona_fleet_eway_bill_audit.csv'
        });
        break;
      }

      case 'CHALLANS': {
        const mappedChallansList = challansList.map((c, idx) => ({
          ...c,
          s_no: idx + 1,
          formatted_date_time: formatDateDDMMYYYY(c.date_time)
        }));

        const twelveMonthRows = mappedChallansList.map((c) => ({
          month: 'Oct 2026',
          s_no: c.s_no,
          vehicle_id: c.vehicle_reg,
          reg_no: c.vehicle_reg,
          challan_no: c.challan_no,
          section: c.section,
          date_time: c.formatted_date_time,
          violation: c.violation,
          location: c.location,
          authority: c.authority,
          amount_inr: c.amount_inr,
          status: c.payment_status,
          payment_url: 'https://echallan.parivahan.gov.in/index/accused-challan'
        }));

        setDrilldownData({
          boxKey,
          title: 'Fleet Traffic & MoRTH E-Challan Telematics Audit',
          category: 'Live Parivahan / Vahan E-Challan & High-Speed Highway WIM Violation Registry',
          badgeText: `${challansList.length} Total Recorded (${pendingChallansCount > 0 ? `${pendingChallansCount} Pending Unpaid` : '100% Cleared'})`,
          accent: {
            border: 'border-emerald-500/50',
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            glow: 'shadow-emerald-900/30',
            badgeBg: 'bg-emerald-950 border-emerald-700 text-emerald-300'
          },
          kpis: [
            { label: 'Pending Challans', value: `${pendingChallansCount}`, sub: `₹${pendingChallansAmount.toLocaleString()} Outstanding Fine` },
            { label: 'Settled / Closed', value: `${totalChallansCount - pendingChallansCount}`, sub: 'Paid via Parivahan' },
            { label: 'Total Recorded', value: `${totalChallansCount} Records`, sub: 'MoRTH Database' },
            { label: 'High Risk (WIM)', value: '1 Case', sub: 'MH-12 Axle Overload' },
            { label: 'Parivahan Sync', value: 'Active', sub: 'Synced 5m ago' }
          ],
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (c, idx) => c.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (c, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {c.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Challan Number', 
              key: 'challan_no', 
              csvValue: c => c.challan_no,
              render: (c) => (
                <span className="font-bold text-white font-mono text-xs whitespace-nowrap">{c.challan_no}</span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'vehicle_reg', 
              csvValue: c => c.vehicle_reg,
              render: (c) => (
                <span className="font-bold text-cyan-300 font-mono text-xs whitespace-nowrap">{c.vehicle_reg}</span>
              )
            },
            { 
              header: 'Date & Time', 
              key: 'date_time', 
              csvValue: c => formatDateDDMMYYYY(c.date_time),
              render: (c) => (
                <span className="font-mono text-slate-300 text-xs whitespace-nowrap">{formatDateDDMMYYYY(c.date_time)}</span>
              )
            },
            { 
              header: 'Violation Details', 
              key: 'violation', 
              csvValue: c => c.violation,
              render: (c) => (
                <span className={`text-xs block font-bold font-sans max-w-[240px] whitespace-normal leading-snug ${
                  c.status === 'PENDING' ? 'text-rose-400' : isLight ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  {c.violation}
                </span>
              )
            },
            { 
              header: 'Violation Location', 
              key: 'location', 
              csvValue: c => c.location,
              render: (c) => (
                <span className={`text-xs block font-sans max-w-[200px] whitespace-normal leading-snug ${isLight ? 'text-slate-700' : 'text-slate-300'}`} title={c.location}>
                  {c.location}
                </span>
              )
            },
            { 
              header: 'Fine Amount', 
              key: 'amount_inr', 
              csvValue: c => `₹${c.amount_inr}`,
              render: (c) => (
                <span className={`font-mono font-bold text-xs whitespace-nowrap ${
                  c.amount_inr > 0 ? (c.status === 'PENDING' ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-400'
                }`}>
                  {c.amount_inr > 0 ? `₹${c.amount_inr.toLocaleString()}` : '₹0 (Zero Fine)'}
                </span>
              )
            },
            { 
              header: 'Payment Status', 
              key: 'status', 
              csvValue: c => c.payment_status,
              render: (c) => (
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border whitespace-nowrap inline-block ${
                  c.status === 'PENDING'
                    ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                    : c.status === 'DISMISSED'
                    ? 'bg-slate-900 text-slate-300 border-slate-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {c.payment_status}
                </span>
              )
            },
            { 
              header: 'Govt Parivahan Payment', 
              key: 'payment_action', 
              csvValue: c => `https://echallan.parivahan.gov.in/index/accused-challan?challan_no=${c.challan_no}`,
              render: (c) => (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  {c.status === 'PENDING' ? (
                    <a
                      href="https://echallan.parivahan.gov.in/index/accused-challan"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-md shadow-rose-950/40 transition active:scale-95 border border-rose-400"
                      title={`Pay ${c.challan_no} directly on official MoRTH Parivahan Portal`}
                    >
                      <span>Pay Challan</span>
                      <ExternalLink size={12} className="text-white shrink-0" />
                    </a>
                  ) : c.status === 'DISMISSED' ? (
                    <a
                      href="https://echallan.parivahan.gov.in/index/accused-challan"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px] transition"
                      title="Verify grievance status on Parivahan portal"
                    >
                      <span>Dispute Portal</span>
                      <ExternalLink size={11} className="text-slate-400 shrink-0" />
                    </a>
                  ) : (
                    <a
                      href="https://echallan.parivahan.gov.in/index/accused-challan"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 font-mono text-[11px] font-semibold transition"
                      title="Download official Parivahan payment receipt"
                    >
                      <span>Govt Receipt</span>
                      <ExternalLink size={11} className="text-emerald-400 shrink-0" />
                    </a>
                  )}
                </div>
              )
            }
          ],
          rows: mappedChallansList,
          sevenDayRows: mappedChallansList,
          twelveMonthRows,
          twelveMonthColumns: [
            { header: 'S.No.', key: 's_no' },
            { header: 'Challan No', key: 'challan_no' },
            { header: 'Vehicle', key: 'vehicle_id' },
            { header: 'Date & Time', key: 'date_time' },
            { header: 'Violation', key: 'violation' },
            { header: 'Location', key: 'location' },
                        { header: 'Fine (INR)', key: 'amount_inr' },
            { header: 'Status', key: 'status' },
            { header: 'Govt Payment Portal URL', key: 'payment_url' }
          ],
          exportFilename: 'axona_fleet_challans_audit.csv'
        });
        break;
      }

      case 'COST_PER_KM': {
        const costRows = vehicles.map(v => {
          const runKm = Math.round((v.speed_kmh || 55) * (v.engine_hours_today || 6.5) * 0.8);
          const fuelL = parseFloat(((v.current_cph || 18.0) * (v.engine_hours_today || 6.5)).toFixed(1));
          const fuelCost = Math.round(fuelL * DIESEL_RATE);
          const cpkm = runKm > 0 ? parseFloat((fuelCost / runKm).toFixed(2)) : 24.5;
          const mileage = fuelL > 0 ? (runKm / fuelL).toFixed(2) : '3.85';
          return {
            ...v,
            runKm,
            fuelL,
            fuelCost,
            cpkm,
            mileage
          };
        });

        const twelveMonthRows = getTwelveMonthReportData('TOTAL_FLEET', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('TOTAL_FLEET');

        setDrilldownData({
          boxKey,
          title: 'Fleet Cost Per Km Audit (Fuel & Operations)',
          category: 'Real-time Diesel Cost Run Rate per Odometer Km (₹ / km) Since 00:00 hrs',
          badgeText: `${costRows.length} Vehicles Audited (Fleet Avg: ₹${fleetCostPerKm}/km)`,
          accent: {
            border: 'border-cyan-500/50',
            bg: 'bg-cyan-500/10',
            text: 'text-cyan-400',
            glow: 'shadow-cyan-900/30',
            badgeBg: 'bg-cyan-950 border-cyan-700 text-cyan-300'
          },
          kpis: [
            { label: 'Fleet Cost / Km', value: `₹${fleetCostPerKm}`, sub: 'Fleet-wide Run Rate' },
            { label: 'Total Fuel Cost', value: `₹${totalFuelCostToday.toLocaleString()}`, sub: 'Since 00:00 hrs Today' },
            { label: 'Total Fleet Run', value: `${totalKmsToday.toLocaleString()} km`, sub: '10 Operating Haulers' },
            { label: 'Total Diesel Consumed', value: `${Math.round(totalDieselToday).toLocaleString()} L`, sub: `Avg Economy: ${fleetAvgMileage} km/L` },
            { label: 'Benchmark Cost / Km', value: '₹22.50', sub: 'OEM Standard Target' }
          ],
          columns: [
            { header: 'Vehicle', key: 'reg_no', render: (v) => (
              <div>
                <span className="font-bold text-white font-mono">{v.reg_no}</span>
                <span className="text-[10px] text-slate-400 block">{v.model} • {v.vehicle_id || v.id}</span>
              </div>
            )},
            { header: 'Run Km Today', key: 'runKm', render: (v) => (
              <span className="font-mono text-cyan-300 font-bold">{v.runKm?.toLocaleString()} km</span>
            )},
            { header: 'Diesel Consumed', key: 'fuelL', render: (v) => (
              <span className="font-mono text-amber-300 font-bold">{v.fuelL} L</span>
            )},
            { header: 'Total Fuel Cost', key: 'fuelCost', render: (v) => (
              <span className="font-mono text-slate-200 font-bold">₹{v.fuelCost?.toLocaleString()}</span>
            )},
            { header: 'Cost per Km', key: 'cpkm', render: (v) => (
              <span className={`font-mono font-bold text-sm ${v.cpkm > 26 ? 'text-rose-400' : v.cpkm < 23 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                ₹{v.cpkm} / km
              </span>
            )},
            { header: 'Mileage', key: 'mileage', render: (v) => (
              <span className="font-mono text-slate-300">{v.mileage} km/L</span>
            )},
            { header: 'Corridor Route', key: 'route_name', render: (v) => (
              <span className="text-slate-300 text-xs block">{v.route_name}</span>
            )}
          ],
          rows: costRows,
          sevenDayRows: costRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_fleet_cost_per_km_audit.csv'
        });
        break;
      }

      case 'VEHICLE_UTILIZATION': {
        const utilRows = vehicles.map(v => {
          const working = parseFloat(Math.min(10.0, v.engine_hours_today || 6.5).toFixed(1));
          const rawIdle = parseFloat(((v.idling_loss_liters || 3.0) / 2.5).toFixed(1));
          const idle = parseFloat(Math.min(Math.max(rawIdle, 0.4), Math.max(0.4, 10.0 - working)).toFixed(1));
          const stopped = parseFloat(Math.max(0, 10.0 - working - idle).toFixed(1));
          const utilPct = parseFloat(((working / 10.0) * 100).toFixed(1));
          return {
            ...v,
            workingHours: working,
            idleHours: idle,
            stoppedHours: stopped,
            utilization: utilPct
          };
        });

        const twelveMonthRows = getTwelveMonthReportData('WORKING', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('WORKING');

        setDrilldownData({
          boxKey,
          title: 'Fleet Vehicle Utilization & Shift Productivity',
          category: 'Active Operating Hours vs 10.0h Scheduled Shift Target',
          badgeText: `${utilRows.length} Vehicles Audited (Fleet Active: ${fleetUtilizationPercent}%)`,
          accent: {
            border: 'border-emerald-500/50',
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            glow: 'shadow-emerald-900/30',
            badgeBg: 'bg-emerald-950 border-emerald-700 text-emerald-300'
          },
          kpis: [
            { label: 'Fleet Active Ratio', value: `${fleetUtilizationPercent}%`, sub: `${workingCount}/${totalFleet} Vehicles Active` },
            { label: 'Total Working Hours', value: `${fleetWorkingHours} hrs`, sub: 'Since 00:00 hrs Today' },
            { label: 'Total Idle Hours', value: `${(idleCount * 1.8).toFixed(1)} hrs`, sub: 'Excess Stationary Burn' },
            { label: 'Duty Shift Target', value: '10.0 hrs', sub: 'Standard Operations Target' },
            { label: 'Fleet Benchmark', value: '85.0%', sub: 'Target Utilization' }
          ],
          columns: [
            { header: 'Vehicle', key: 'reg_no', render: (v) => (
              <div>
                <span className="font-bold text-white font-mono">{v.reg_no}</span>
                <span className="text-[10px] text-slate-400 block">{v.model} • {v.vehicle_id || v.id}</span>
              </div>
            )},
            { header: 'Status', key: 'status', render: (v) => (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                v.status === 'RUNNING' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                v.status === 'IDLE' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>{v.status}</span>
            )},
            { header: 'Working Hours', key: 'workingHours', render: (v) => (
              <span className="font-mono text-emerald-300 font-bold">{v.workingHours} hrs</span>
            )},
            { header: 'Idle Hours', key: 'idleHours', render: (v) => (
              <span className="font-mono text-amber-300 font-bold">{v.idleHours} hrs</span>
            )},
            { header: 'Stopped Hours', key: 'stoppedHours', render: (v) => (
              <span className="font-mono text-slate-400">{v.stoppedHours} hrs</span>
            )},
            { header: 'Shift Utilization %', key: 'utilization', render: (v) => (
              <div>
                <span className="font-mono text-white font-bold text-sm">{v.utilization}%</span>
                <div className="w-16 bg-slate-800 rounded-full h-1 mt-0.5 overflow-hidden">
                  <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${Math.min(100, v.utilization)}%` }}></div>
                </div>
              </div>
            )},
            { header: 'Current Location', key: 'route_name', render: (v) => (
              <span className="text-slate-300 text-xs block">{v.location_name || v.route_name}</span>
            )}
          ],
          rows: utilRows,
          sevenDayRows: utilRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_fleet_vehicle_utilization_audit.csv'
        });
        break;
      }

      case 'FUEL_CONSUMED_TODAY': {
        const fuelRows = vehicles.map((v, idx) => {
          const runKm = Math.round((v.speed_kmh || 55) * (v.engine_hours_today || 6.5) * 0.8);
          const fuelL = parseFloat(((v.current_cph || 18.0) * (v.engine_hours_today || 6.5)).toFixed(1));
          const fuelCost = Math.round(fuelL * DIESEL_RATE);
          const mileage = fuelL > 0 ? (runKm / fuelL).toFixed(2) : '3.85';
          const fillPercent = Math.min(100, Math.round(((v.current_fuel_liters || 300) / (v.tank_capacity_liters || 400)) * 100));
          const mm = extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no);
          return {
            ...v,
            s_no: idx + 1,
            vehicle_id: v.vehicle_id || v.id,
            make: mm.make,
            modelOnly: mm.model,
            runKm,
            fuelL,
            fuelCost,
            mileage,
            fillPercent
          };
        });

        const twelveMonthRows = getTwelveMonthReportData('TOTAL_FLEET', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('TOTAL_FLEET');

        setDrilldownData({
          boxKey,
          title: 'Fleet Fuel Consumed & Run Km Today',
          category: 'Real-time Diesel Burned (L) vs Distance Traveled (km) Since 00:00 hrs',
          badgeText: `${fuelRows.length} Vehicles Audited (${Math.round(totalDieselToday).toLocaleString()} L Total Burn)`,
          accent: {
            border: 'border-amber-500/50',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            glow: 'shadow-amber-900/30',
            badgeBg: 'bg-amber-950 border-amber-700 text-amber-300'
          },
          kpis: [
            {
              label: 'Fuel Consumed Today',
              value: `₹${totalFuelCostToday.toLocaleString('en-IN')}`,
              kmRun: `${totalKmsToday.toLocaleString('en-IN')} km`,
              subQty: `${Math.round(totalDieselToday).toLocaleString('en-IN')}`,
              subUnit: 'L',
              subDesc: null,
              sub: `${Math.round(totalDieselToday).toLocaleString('en-IN')} L`
            },
            {
              label: 'Fuel Consumed Yesterday',
              value: `₹${(Math.round(1410 * DIESEL_RATE)).toLocaleString('en-IN')}`,
              kmRun: '3,580 km',
              subQty: '1,410',
              subUnit: 'L',
              subDesc: null,
              sub: '1,410 L'
            },
            {
              label: 'MTD Fuel Consumed',
              value: '₹36,11,480',
              kmRun: '97,203 km',
              subQty: '38,420',
              subUnit: 'L',
              subDesc: null,
              sub: '38,420 L'
            },
            {
              label: 'Monthly Projection Consumption',
              value: `₹${Math.round((38420 / daysElapsed) * daysInMonth * DIESEL_RATE).toLocaleString('en-IN')}`,
              kmRun: `${Math.round((38420 / daysElapsed) * daysInMonth * (parseFloat(fleetAvgMileage) || 2.53)).toLocaleString('en-IN')} km`,
              subQty: `${Math.round((38420 / daysElapsed) * daysInMonth).toLocaleString('en-IN')}`,
              subUnit: 'L',
              subDesc: null,
              sub: `${Math.round((38420 / daysElapsed) * daysInMonth).toLocaleString('en-IN')} L`
            },
            {
              label: 'Annual Projection Consumption (Jan-Dec)',
              value: `₹${Math.round((38420 / daysElapsed) * 365 * DIESEL_RATE).toLocaleString('en-IN')}`,
              kmRun: `${((Math.round((38420 / daysElapsed) * 365 * (parseFloat(fleetAvgMileage) || 2.53))) / 1000000).toFixed(2)}M km`,
              subQty: `${Math.round((38420 / daysElapsed) * 365).toLocaleString('en-IN')}`,
              subUnit: 'L',
              subDesc: null,
              sub: `${Math.round((38420 / daysElapsed) * 365).toLocaleString('en-IN')} L`
            }
          ],
          columns: [
            { 
              header: 'S.No.', 
              key: 's_no', 
              csvValue: (v, idx) => v.s_no || (idx !== undefined ? idx + 1 : 1),
              render: (v, idx) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {v.s_no || (idx !== undefined ? idx + 1 : 1)}
                </span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              csvValue: v => v.reg_no,
              render: (v) => (
                <span className={`font-mono text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'} whitespace-nowrap`}>{v.reg_no}</span>
              )
            },
            { 
              header: 'Vehicle ID', 
              key: 'vehicle_id', 
              csvValue: v => v.vehicle_id || v.id,
              render: (v) => (
                <span className={`font-mono text-xs ${isLight ? 'text-cyan-700' : 'text-cyan-300'} whitespace-nowrap`}>
                  {v.vehicle_id || v.id}
                </span>
              )
            },
            { 
              header: 'Make', 
              key: 'make', 
              csvValue: v => v.make || extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no).make,
              render: (v) => {
                const make = v.make || extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no).make;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {make}
                  </span>
                );
              }
            },
            { 
              header: 'Model', 
              key: 'modelOnly', 
              csvValue: v => v.modelOnly || extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no).model,
              render: (v) => {
                const model = v.modelOnly || extractMakeAndModel(v.model, v.vehicle_id || v.id, v.reg_no).model;
                return (
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'} whitespace-nowrap`}>
                    {model}
                  </span>
                );
              }
            },
            { header: 'Diesel Consumed Today', key: 'fuelL', render: (v) => (
              <span className="font-mono text-amber-300 text-xs whitespace-nowrap">{v.fuelL} L</span>
            )},
            { header: 'Run Km Today', key: 'runKm', render: (v) => (
              <span className="font-mono text-cyan-300 text-xs whitespace-nowrap">{v.runKm?.toLocaleString()} km</span>
            )},
            { header: 'Live CPH', key: 'current_cph', render: (v) => (
              <span className="font-mono text-purple-300 text-xs whitespace-nowrap">{v.current_cph || 18.0} L/h</span>
            )},
            { header: 'Mileage', key: 'mileage', render: (v) => (
              <span className="font-mono text-emerald-300 text-xs whitespace-nowrap">{v.mileage} km/L</span>
            )},
            { header: 'Fuel Cost Today', key: 'fuelCost', render: (v) => (
              <span className="font-mono text-slate-200 text-xs whitespace-nowrap">₹{v.fuelCost?.toLocaleString()}</span>
            )},
            { header: 'Tank Level', key: 'current_fuel_liters', render: (v) => (
              <span className="font-mono text-slate-300 whitespace-nowrap">{v.current_fuel_liters || 300} L ({v.fillPercent}%)</span>
            )}
          ],
          rows: fuelRows,
          sevenDayRows: fuelRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_fleet_fuel_consumed_and_run_kms.csv'
        });
        break;
      }

      case 'MOBILE_TRACKING':
      case 'FASTAG_TOLL': {
        const mobileTrackingRows = [
          {
            s_no: 1,
            driver_name: 'Rajesh Gurjar',
            driver_id: 'DRV-101',
            vehicle_id: 'VH-101',
            reg_no: 'MH-12-RN-8842',
            make: 'Tata',
            model: 'Prima 5530.S (18-Wheeler)',
            mobile_number: '+91 98231 44019',
            telecom_operator: 'Jio 5G',
            tracking_mode: 'Driver App GPS',
            tracking_mode_code: 'APP_GPS',
            location: 'Samruddhi Mahamarg Ch. 182, Jalna Bypass',
            lat_lng: '19.8324° N, 75.8821° E',
            accuracy: '±8m (A-GPS High Fix)',
            accuracy_m: 8,
            speed_kmh: 58,
            movement_status: 'Moving (58 km/h)',
            battery_pct: 92,
            signal_bars: '5G (4/4 Bars)',
            last_ping: 'Just now (4s ago)',
            status: 'LIVE STREAMING',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 2,
            driver_name: 'Vikram Singh',
            driver_id: 'DRV-102',
            vehicle_id: 'VH-102',
            reg_no: 'DL-01-AB-1234',
            make: 'BharatBenz',
            model: '3528R (12-Wheeler Reefer)',
            mobile_number: '+91 98110 55231',
            telecom_operator: 'Airtel 4G LTE',
            tracking_mode: 'Driver App GPS',
            tracking_mode_code: 'APP_GPS',
            location: 'Kotputli Industrial Corridor, NH48',
            lat_lng: '27.7051° N, 76.2008° E',
            accuracy: '±12m (A-GPS Fix)',
            accuracy_m: 12,
            speed_kmh: 46,
            movement_status: 'Moving (46 km/h)',
            battery_pct: 78,
            signal_bars: '4G LTE (4/4 Bars)',
            last_ping: '9s ago',
            status: 'LIVE STREAMING',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 3,
            driver_name: 'Manoj Yadav',
            driver_id: 'DRV-103',
            vehicle_id: 'VH-103',
            reg_no: 'KA-04-E-5678',
            make: 'Ashok Leyland',
            model: '4220 (14-Wheeler Multi-Axle)',
            mobile_number: '+91 97410 88219',
            telecom_operator: 'Jio 5G',
            tracking_mode: 'Driver App GPS',
            tracking_mode_code: 'APP_GPS',
            location: 'Hosur Attibele Border Plaza, NH44',
            lat_lng: '12.7758° N, 77.8012° E',
            accuracy: '±10m (A-GPS Fix)',
            accuracy_m: 10,
            speed_kmh: 0,
            movement_status: 'Stationary (Toll Queue)',
            battery_pct: 85,
            signal_bars: '5G (4/4 Bars)',
            last_ping: '12s ago',
            status: 'LIVE STREAMING',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 4,
            driver_name: 'Suresh Patel',
            driver_id: 'DRV-104',
            vehicle_id: 'VH-104',
            reg_no: 'GJ-06-TC-9988',
            make: 'Eicher',
            model: 'Pro 6028 (10-Wheeler Tipper)',
            mobile_number: '+91 98250 66341',
            telecom_operator: 'Vodafone Idea (Vi 4G)',
            tracking_mode: 'SIM LBS Triangulation',
            tracking_mode_code: 'SIM_LBS',
            location: 'Vadodara Toll Plaza, NE-1 Expressway',
            lat_lng: '22.3072° N, 73.1812° E',
            accuracy: '±45m (Cell ID Tower Triangulation)',
            accuracy_m: 45,
            speed_kmh: 52,
            movement_status: 'Moving (52 km/h)',
            battery_pct: 64,
            signal_bars: '4G (3/4 Bars)',
            last_ping: '22s ago',
            status: 'SIM CONSENT ACTIVE',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 5,
            driver_name: 'Harpreet Singh',
            driver_id: 'DRV-105',
            vehicle_id: 'VH-105',
            reg_no: 'HR-55-B-4321',
            make: 'Mahindra',
            model: 'Blazo X 35 (12-Wheeler Haulage)',
            mobile_number: '+91 98720 11984',
            telecom_operator: 'Airtel 5G Plus',
            tracking_mode: 'Driver App GPS',
            tracking_mode_code: 'APP_GPS',
            location: 'Kherki Daula Flyover, NH48 Gurgaon',
            lat_lng: '28.4021° N, 76.9935° E',
            accuracy: '±9m (A-GPS High Fix)',
            accuracy_m: 9,
            speed_kmh: 62,
            movement_status: 'Moving (62 km/h)',
            battery_pct: 95,
            signal_bars: '5G (4/4 Bars)',
            last_ping: '6s ago',
            status: 'LIVE STREAMING',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 6,
            driver_name: 'Dinesh Shinde',
            driver_id: 'DRV-106',
            vehicle_id: 'VH-106',
            reg_no: 'MH-04-KF-7721',
            make: 'Tata',
            model: 'Signa 4825.TK (16-Wheeler Tipper)',
            mobile_number: '+91 98190 33452',
            telecom_operator: 'Jio 5G',
            tracking_mode: 'Driver App GPS',
            tracking_mode_code: 'APP_GPS',
            location: 'Vijayawada Bypass, NH16 Corridor',
            lat_lng: '16.5062° N, 80.6480° E',
            accuracy: '±11m (A-GPS Fix)',
            accuracy_m: 11,
            speed_kmh: 49,
            movement_status: 'Moving (49 km/h)',
            battery_pct: 81,
            signal_bars: '5G (4/4 Bars)',
            last_ping: '14s ago',
            status: 'LIVE STREAMING',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 7,
            driver_name: 'Ramesh Sharma',
            driver_id: 'DRV-107',
            vehicle_id: 'VH-107',
            reg_no: 'RJ-14-GH-6655',
            make: 'Ashok Leyland',
            model: '4825 (16-Wheeler Haulage)',
            mobile_number: '+91 94140 77123',
            telecom_operator: 'BSNL / Airtel Roaming',
            tracking_mode: 'SIM LBS Triangulation',
            tracking_mode_code: 'SIM_LBS',
            location: 'Shahjahanpur Rajasthan Border, NH48',
            lat_lng: '27.9943° N, 76.5412° E',
            accuracy: '±55m (Cell ID Tower Triangulation)',
            accuracy_m: 55,
            speed_kmh: 0,
            movement_status: 'Stationary (Waybill Check)',
            battery_pct: 58,
            signal_bars: '4G (3/4 Bars)',
            last_ping: '28s ago',
            status: 'SIM CONSENT ACTIVE',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 8,
            driver_name: 'Anil Verma',
            driver_id: 'DRV-108',
            vehicle_id: 'VH-108',
            reg_no: 'UP-32-MN-2200',
            make: 'BharatBenz',
            model: '2823R (10-Wheeler Cargo)',
            mobile_number: '+91 94520 99411',
            telecom_operator: 'Jio 5G',
            tracking_mode: 'Driver App GPS',
            tracking_mode_code: 'APP_GPS',
            location: 'Varanasi Ring Road Junction, NH19',
            lat_lng: '25.3176° N, 82.9739° E',
            accuracy: '±14m (A-GPS Fix)',
            accuracy_m: 14,
            speed_kmh: 42,
            movement_status: 'Moving (42 km/h)',
            battery_pct: 72,
            signal_bars: '5G (4/4 Bars)',
            last_ping: '10s ago',
            status: 'LIVE STREAMING',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 9,
            driver_name: 'Karthik Raja',
            driver_id: 'DRV-109',
            vehicle_id: 'VH-109',
            reg_no: 'TN-09-XY-3344',
            make: 'Volvo',
            model: 'FH500 (22-Wheeler Puller)',
            mobile_number: '+91 98400 22345',
            telecom_operator: 'Airtel 5G Plus',
            tracking_mode: 'Driver App GPS',
            tracking_mode_code: 'APP_GPS',
            location: 'Krishnagiri Highway Rest Stop, NH44',
            lat_lng: '12.5186° N, 78.2137° E',
            accuracy: '±7m (A-GPS High Fix)',
            accuracy_m: 7,
            speed_kmh: 0,
            movement_status: 'Stationary (Driver Break)',
            battery_pct: 89,
            signal_bars: '5G (4/4 Bars)',
            last_ping: '5s ago',
            status: 'LIVE STREAMING',
            status_code: 'ONLINE',
            consent_verified: true
          },
          {
            s_no: 10,
            driver_name: 'Subhash Ghosh',
            driver_id: 'DRV-110',
            vehicle_id: 'VH-110',
            reg_no: 'WB-19-JK-8811',
            make: 'Eicher',
            model: 'Pro 8035XM (12-Wheeler Dumper)',
            mobile_number: '+91 98310 77654',
            telecom_operator: 'Jio 5G',
            tracking_mode: 'Driver App GPS',
            tracking_mode_code: 'APP_GPS',
            location: 'Dankuni Freight Logistic Park, NH19',
            lat_lng: '22.6841° N, 88.2917° E',
            accuracy: '±10m (A-GPS Fix)',
            accuracy_m: 10,
            speed_kmh: 38,
            movement_status: 'Moving (38 km/h)',
            battery_pct: 91,
            signal_bars: '5G (4/4 Bars)',
            last_ping: '8s ago',
            status: 'LIVE STREAMING',
            status_code: 'ONLINE',
            consent_verified: true
          }
        ];

        const twelveMonthRows = getTwelveMonthReportData('TOTAL_FLEET', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('TOTAL_FLEET');

        setDrilldownData({
          boxKey,
          title: 'Mobile Location Tracking & SIM Telemetry Audit',
          category: 'Driver Smartphone GPS App, Cellular SIM LBS Triangulation & Real-Time Fleet Geolocation',
          badgeText: `${mobileTrackingRows.length} / ${mobileTrackingRows.length} Devices Online • 98.4% GPS Fix • Zero Blindspots`,
          accent: {
            border: 'border-amber-500/50',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            glow: 'shadow-amber-900/30',
            badgeBg: 'bg-amber-950 border-amber-700 text-amber-300'
          },
          kpis: [
            { 
              label: 'LIVE TRACKED DEVICES', 
              value: '10 / 10 Active', 
              sub: '100% Cellular Reachable',
              badge: '10 Active',
              badgeColor: 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300',
              textColor: 'text-emerald-300'
            },
            { 
              label: 'TRACKING METHOD', 
              value: '8 App • 2 SIM LBS', 
              sub: 'Native App GPS & Telco LBS',
              badge: 'Dual Mode',
              badgeColor: 'bg-amber-950/80 border-amber-700/60 text-amber-300',
              textColor: 'text-amber-300'
            }
          ],
          columns: [
            { header: 'S.No.', key: 's_no', render: (v) => <span className="text-slate-400 font-mono text-xs">{v.s_no}</span> },
            { 
              header: 'Driver Name', 
              key: 'driver_name', 
              render: (v) => (
                <span className="text-white font-mono text-xs block font-semibold whitespace-nowrap">{v.driver_name}</span>
              )
            },
            { 
              header: 'Vehicle Number', 
              key: 'reg_no', 
              render: (v) => (
                <span className="text-white font-mono text-xs block font-bold whitespace-nowrap">{v.reg_no}</span>
              )
            },
            { 
              header: 'Mobile No. & Telecom', 
              key: 'mobile_number', 
              render: (v) => (
                <div className="whitespace-nowrap">
                  <span className="text-slate-200 font-mono text-xs block">{v.mobile_number}</span>
                  <span className="text-[10px] text-amber-300 font-mono block">{v.telecom_operator}</span>
                </div>
              )
            },
            { 
              header: 'Current Location & Geofence', 
              key: 'location', 
              render: (v) => (
                <div>
                  <span className="text-slate-200 text-xs block truncate max-w-[280px]" title={v.location}>{v.location}</span>
                  <span className="text-[10px] text-slate-400 font-mono block">{v.lat_lng}</span>
                </div>
              )
            },
            { 
              header: 'Last Ping', 
              key: 'last_ping', 
              render: (v) => (
                <span className="text-slate-300 font-mono text-xs whitespace-nowrap block">
                  {v.last_ping}
                </span>
              )
            }
          ],
          rows: mobileTrackingRows,
          sevenDayRows: mobileTrackingRows,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_mobile_location_tracking_telemetry.csv'
        });
        break;
      }

      case 'DRIVER_DL': {
        const activeDrivers = driverDatabase.filter(d => d.org_status === 'ACTIVE');
        const exitedDrivers = driverDatabase.filter(d => d.org_status === 'EXITED');
        const expiringSoonDrivers = driverDatabase.filter(d => d.days_to_expiry <= 30 && d.days_to_expiry >= 0);
        
        let filteredDrivers = [...driverDatabase];
        if (driverTabFilter === 'ACTIVE') {
          filteredDrivers = activeDrivers;
        } else if (driverTabFilter === 'EXITED') {
          filteredDrivers = exitedDrivers;
        } else if (driverTabFilter === 'EXPIRING_SOON') {
          filteredDrivers = expiringSoonDrivers;
        }

        const twelveMonthRows = getTwelveMonthReportData('TOTAL_FLEET', vehicles);
        const twelveMonthCols = getTwelveMonthCsvColumns('TOTAL_FLEET');

        setDrilldownData({
          boxKey,
          title: 'Driver DL Verification & Master Register',
          category: 'MoRTH Sarathi Portal Authenticated Commercial HCV/TRANS Drivers & Roster Audit',
          badgeText: `${activeDrivers.length} Active Employed • ${exitedDrivers.length} Exited • ${expiringSoonDrivers.length} Expiring Soon (<30d)`,
          accent: {
            border: 'border-purple-500/50',
            bg: 'bg-purple-500/10',
            text: 'text-purple-400',
            glow: 'shadow-purple-900/30',
            badgeBg: 'bg-purple-950 border-purple-700 text-purple-300'
          },
          kpis: [
            { 
              label: 'SARATHI AUTHENTICATED', 
              value: `${activeDrivers.filter(d => d.is_valid).length} / ${activeDrivers.length} Active`, 
              sub: '100% MoRTH Sarathi Verified',
              badge: `${activeDrivers.length} Active`,
              badgeColor: 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300',
              textColor: 'text-purple-200'
            },
            { 
              label: 'AUTHORIZED VEHICLE CLASSES', 
              value: `${activeDrivers.filter(d => d.is_commercial).length} Commercial`, 
              sub: 'HCV / TRANS & HAZMAT Certified',
              badge: 'HCV / TRANS',
              badgeColor: 'bg-purple-950 border-purple-700 text-purple-300',
              textColor: 'text-purple-300'
            },
            { 
              label: 'COMMERCIAL DL RATIO', 
              value: `${Math.round((activeDrivers.filter(d => d.is_commercial).length / Math.max(1, activeDrivers.length)) * 100)}% Commercial`, 
              sub: 'Multi-Axle & Articulated Endorsed',
              badge: '100% Heavy',
              badgeColor: 'bg-amber-950 border-amber-700 text-amber-300',
              textColor: 'text-amber-300'
            },
            { 
              label: 'EXPIRING (< 30 DAYS)', 
              value: `${expiringSoonDrivers.length} Driver Alert`, 
              sub: expiringSoonDrivers.length > 0 ? `${expiringSoonDrivers[0].driver_name} (${expiringSoonDrivers[0].days_to_expiry}d Left)` : 'Zero DLs Expiring Soon',
              badge: expiringSoonDrivers.length > 0 ? 'CRITICAL ALERT' : 'Normal',
              badgeColor: expiringSoonDrivers.length > 0 ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-emerald-950 border-emerald-500 text-emerald-300',
              textColor: expiringSoonDrivers.length > 0 ? 'text-amber-400' : 'text-emerald-400'
            }
          ],
          columns: [
            { header: 'S.No.', key: 's_no', render: (v, idx) => <span className="text-slate-400 font-mono text-xs">{idx + 1}</span> },
            { 
              header: 'Driver Name', 
              key: 'driver_name', 
              render: (v) => (
                <span className="text-white font-mono text-xs block font-semibold whitespace-nowrap">{v.driver_name}</span>
              )
            },
            { 
              header: 'Phone Number', 
              key: 'driver_phone', 
              render: (v) => (
                <span className="text-slate-200 font-mono text-xs block whitespace-nowrap">{v.driver_phone}</span>
              )
            },
            { 
              header: 'DL Number', 
              key: 'dl_number', 
              render: (v) => (
                <span className="text-cyan-300 font-mono text-xs block font-bold whitespace-nowrap">{v.dl_number}</span>
              )
            },
            { 
              header: 'Authorized Vehicle Classes', 
              key: 'dl_class', 
              render: (v) => (
                <span className="text-slate-200 font-mono text-xs block whitespace-nowrap">{v.dl_class}</span>
              )
            },
            { 
              header: 'Endorsements', 
              key: 'endorsements', 
              render: (v) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap block w-fit ${
                  v.endorsements 
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-600/70' 
                    : 'text-slate-500'
                }`}>
                  {v.endorsements || 'Standard'}
                </span>
              )
            },
            { 
              header: 'Commercial DL', 
              key: 'is_commercial', 
              render: (v) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap block w-fit font-bold ${
                  v.is_commercial 
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/70' 
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {v.is_commercial ? 'COMMERCIAL (TRANS)' : 'NON-COMMERCIAL (LMV)'}
                </span>
              )
            },
            { 
              header: 'Issuing RTO', 
              key: 'issuing_rto', 
              render: (v) => (
                <span className="text-slate-300 font-mono text-xs block whitespace-nowrap">{v.issuing_rto}</span>
              )
            },
            { 
              header: 'DL Expiry Date', 
              key: 'expiry_date', 
              render: (v) => (
                <span className={`font-mono text-xs block whitespace-nowrap ${
                  v.days_to_expiry < 0 
                    ? 'text-rose-400 font-bold' 
                    : v.days_to_expiry <= 30 
                    ? 'text-amber-300 font-bold' 
                    : 'text-slate-200'
                }`}>
                  {formatDateDDMMYYYY(v.expiry_display || v.expiry_date)}
                </span>
              )
            },
            { 
              header: 'Days Remaining', 
              key: 'days_to_expiry', 
              render: (v) => {
                const isExpiringSoon = v.days_to_expiry <= 30 && v.days_to_expiry >= 0;
                const isExpired = v.days_to_expiry < 0;
                return (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap block w-fit font-bold ${
                    isExpired 
                      ? 'bg-rose-950 text-rose-300 border border-rose-700' 
                      : isExpiringSoon 
                      ? 'bg-amber-950 text-amber-300 border border-amber-600 animate-pulse' 
                      : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50'
                  }`}>
                    {isExpired 
                      ? `EXPIRED (${Math.abs(v.days_to_expiry)}d ago)` 
                      : isExpiringSoon 
                      ? `⚠ ${v.days_to_expiry} days left` 
                      : `${v.days_to_expiry} days remaining`}
                  </span>
                );
              }
            },
            { 
              header: 'Org Roster Status', 
              key: 'org_status', 
              render: (v) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap block w-fit font-bold ${
                  v.org_status === 'ACTIVE' 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {v.org_status === 'ACTIVE' ? 'ACTIVE EMPLOYED' : 'EXITED / OFFBOARDED'}
                </span>
              )
            },
            { 
              header: 'Joining Date', 
              key: 'joining_date', 
              render: (v) => (
                <span className="text-slate-300 font-mono text-xs whitespace-nowrap block">
                  {formatDateDDMMYYYY(v.org_status === 'ACTIVE' ? v.joining_date : (v.exit_date || v.joining_date))}
                </span>
              )
            },
            {
              header: 'Org Actions',
              key: 'actions',
              render: (v) => (
                <div className="flex items-center space-x-1.5 whitespace-nowrap">
                  {v.org_status === 'ACTIVE' ? (
                    <button
                      onClick={() => setExitDriverTarget(v)}
                      className="px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                      title="Offboard / Exit Driver from Organization"
                    >
                      <UserMinus size={11} className="text-rose-400" />
                      <span>Exit Org</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReonboardDriver(v.driver_id)}
                      className="px-2.5 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-[10px] font-mono font-bold transition flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                      title="Re-onboard Driver to Active Fleet"
                    >
                      <UserCheck size={11} className="text-emerald-400" />
                      <span>Re-onboard</span>
                    </button>
                  )}
                </div>
              )
            },
            { 
              header: 'DL Validity', 
              key: 'validity_status', 
              render: (v) => {
                const isExpiringSoon = v.days_to_expiry <= 30 && v.days_to_expiry >= 0;
                const isExpired = v.days_to_expiry < 0 || !v.is_valid;
                return (
                  <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold whitespace-nowrap block text-center ${
                    isExpired
                      ? 'bg-rose-950 text-rose-300 border border-rose-600 shadow-sm shadow-rose-950/50'
                      : isExpiringSoon
                      ? 'bg-amber-950 text-amber-300 border border-amber-600 shadow-sm shadow-amber-950/50'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-sm shadow-emerald-950/50'
                  }`}>
                    {isExpired ? '✖ INVALID / EXPIRED' : isExpiringSoon ? '⚠ VALID (EXPIRING SOON)' : '✔ VALID (ACTIVE SARATHI)'}
                  </span>
                );
              }
            }
          ],
          rows: filteredDrivers,
          sevenDayRows: filteredDrivers,
          twelveMonthRows,
          twelveMonthColumns: twelveMonthCols,
          exportFilename: 'axona_driver_dl_verification_and_roster_audit.csv'
        });
        break;
      }

      default:
        break;
    }
  };

  const displayRows = drilldownData?.sevenDayRows || drilldownData?.rows || [];

  const filteredDrilldownRows = displayRows.filter(row => {
    // Priority filter for Preventive Maintenance & Servicing
    if (drilldownData?.boxKey === 'SERVICE_DUE' && serviceFilter && serviceFilter !== 'ALL') {
      if (row.serviceCategory !== serviceFilter) return false;
    }

    // Priority filter for RTO Compliance & Permits
    if (drilldownData?.boxKey === 'RTO_COMPLIANCE' && rtoFilter && rtoFilter !== 'ALL') {
      if (row.rtoCategory !== rtoFilter) return false;
    }

    if (!drilldownSearch.trim()) return true;
    const q = drilldownSearch.toLowerCase().trim();

    // Specific filter options for Vehicle Number, Make, E-Way Bill No, and Generation Date (DDMMYYYY)
    if (searchColumn === 'reg_no') {
      const fieldVal = `${row.reg_no || ''} ${row.vehicle_reg || ''} ${row.vehicle_id || ''} ${row.id || ''}`.toLowerCase();
      return fieldVal.includes(q);
    }
    if (searchColumn === 'make') {
      const fieldVal = String(row.make || '').toLowerCase();
      return fieldVal.includes(q);
    }
    if (searchColumn === 'eway_bill_no') {
      const cleanQ = q.replace(/\s+/g, '');
      const billNo = `${row.eway_bill_no || ''} ${row.bill_no || ''}`.toLowerCase().replace(/\s+/g, '');
      return billNo.includes(cleanQ) || `${row.eway_bill_no || ''} ${row.bill_no || ''}`.toLowerCase().includes(q);
    }
    if (searchColumn === 'gen_date') {
      const cleanQ = q.replace(/[\/\-\s]/g, '');
      const ddmmyyyy = String(row.ddmmyyyy || '').toLowerCase();
      const genDateStr = String(row.gen_date || '').toLowerCase();
      return ddmmyyyy.includes(cleanQ) || genDateStr.includes(q);
    }
    if (searchColumn === 'driver_name') {
      const fieldVal = String(row.driver_name || '').toLowerCase();
      return fieldVal.includes(q);
    }
    if (searchColumn === 'dl_number') {
      const cleanQ = q.replace(/[\s-]/g, '');
      const dlNo = String(row.dl_number || '').toLowerCase();
      const cleanDlNo = dlNo.replace(/[\s-]/g, '');
      return dlNo.includes(q) || cleanDlNo.includes(cleanQ);
    }

    if (searchColumn !== 'ALL' && drilldownData?.columns) {
      const targetCol = drilldownData.columns.find(c => (c.key || c.header) === searchColumn);
      if (targetCol) {
        let fieldVal = '';
        if (targetCol.header === 'Vehicle Number' || targetCol.key === 'reg_no') {
          fieldVal = `${row.reg_no || ''} ${row.vehicle_id || ''} ${row.id || ''}`;
        } else if (targetCol.header === 'Make' || targetCol.key === 'make') {
          fieldVal = `${row.make || ''} ${row.model || ''} ${row.modelOnly || ''}`;
        } else if (targetCol.header === 'Current Location' || targetCol.key === 'currentLocation') {
          fieldVal = `${row.currentLocation || ''} ${row.route_name || ''} ${row.location_name || ''}`;
        } else if (targetCol.header === 'Working' || targetCol.key === 'workingHours') {
          fieldVal = `${row.workingHours !== undefined ? row.workingHours : ''}`;
        } else if (targetCol.header === 'Idle' || targetCol.key === 'idleHours') {
          fieldVal = `${row.idleHours !== undefined ? row.idleHours : ''}`;
        } else if (targetCol.header === 'Stopped' || targetCol.key === 'stoppedHours') {
          fieldVal = `${row.stoppedHours !== undefined ? row.stoppedHours : ''}`;
        } else if (targetCol.header === 'Started at' || targetCol.key === 'startedAt') {
          fieldVal = `${row.startedAt || ''} ${row.late_start ? 'late start' : 'on-schedule'}`;
        } else {
          if (row[targetCol.key] !== undefined && row[targetCol.key] !== null) {
            fieldVal = String(row[targetCol.key]);
          }
          if (targetCol.csvValue) {
            try {
              const csvV = targetCol.csvValue(row);
              if (csvV) fieldVal += ` ${csvV}`;
            } catch (e) {}
          }
        }
        return String(fieldVal).toLowerCase().includes(q);
      }
    }

    return (
      (row.driver_name && String(row.driver_name).toLowerCase().includes(q)) ||
      (row.driver_id && String(row.driver_id).toLowerCase().includes(q)) ||
      (row.mobile_number && String(row.mobile_number).toLowerCase().includes(q)) ||
      (row.telecom_operator && String(row.telecom_operator).toLowerCase().includes(q)) ||
      (row.tracking_mode && String(row.tracking_mode).toLowerCase().includes(q)) ||
      (row.location && String(row.location).toLowerCase().includes(q)) ||
      (row.dl_number && String(row.dl_number).toLowerCase().includes(q)) ||
      (row.dl_class && String(row.dl_class).toLowerCase().includes(q)) ||
      (row.issuing_rto && String(row.issuing_rto).toLowerCase().includes(q)) ||
      (row.org_status && String(row.org_status).toLowerCase().includes(q)) ||
      (row.validity_status && String(row.validity_status).toLowerCase().includes(q)) ||
      (row.reg_no && String(row.reg_no).toLowerCase().includes(q)) ||
      (row.vehicle_id && String(row.vehicle_id).toLowerCase().includes(q)) ||
      (row.id && String(row.id).toLowerCase().includes(q)) ||
      (row.model && String(row.model).toLowerCase().includes(q)) ||
      (row.make && String(row.make).toLowerCase().includes(q)) ||
      (row.modelOnly && String(row.modelOnly).toLowerCase().includes(q)) ||
      (row.plannedTrip && String(row.plannedTrip).toLowerCase().includes(q)) ||
      (row.currentLocation && String(row.currentLocation).toLowerCase().includes(q)) ||
      (row.workingHours !== undefined && String(row.workingHours).toLowerCase().includes(q)) ||
      (row.idleHours !== undefined && String(row.idleHours).toLowerCase().includes(q)) ||
      (row.stoppedHours !== undefined && String(row.stoppedHours).toLowerCase().includes(q)) ||
      (row.startedAt && String(row.startedAt).toLowerCase().includes(q)) ||
      (row.station_name && String(row.station_name).toLowerCase().includes(q)) ||
      (row.location_name && String(row.location_name).toLowerCase().includes(q)) ||
      (row.route_name && String(row.route_name).toLowerCase().includes(q)) ||
      (row.fuel_slip_no && String(row.fuel_slip_no).toLowerCase().includes(q)) ||
      (row.serviceCategory && String(row.serviceCategory).toLowerCase().includes(q)) ||
      (row.rtoCategory && String(row.rtoCategory).toLowerCase().includes(q)) ||
      (row.earliestDocName && String(row.earliestDocName).toLowerCase().includes(q)) ||
      (row.status && String(row.status).toLowerCase().includes(q))
    );
  });

  // Re-sync DRIVER_DL drilldown data when driverDatabase or driverTabFilter updates
  useEffect(() => {
    if (drilldownData?.boxKey === 'DRIVER_DL') {
      handleBoxClick('DRIVER_DL');
    }
  }, [driverDatabase, driverTabFilter]);

  // Close drilldown modal with ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrilldownData(null);
      }
    };
    if (drilldownData) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drilldownData]);

  // Auto-scroll animation speed class
  const speedClass = autoScrollSpeed === 'slow' ? 'noc-auto-scroll-slow' : autoScrollSpeed === 'fast' ? 'noc-auto-scroll-fast' : 'noc-auto-scroll';
  const scrollClass = alertAutoScroll ? speedClass : '';

  return (
    <div className={`h-full flex ${isLight ? 'bg-[#F1F5F9] text-slate-800' : 'bg-[#060B18] text-slate-100'} overflow-hidden select-none transition-colors duration-200`}>
      {/* ========================================================================= */}
      {/* MAIN CENTER PANEL: 4 BALANCED, FULL-HEIGHT ROWS WITH 3D ENGRAVED CARDS */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col p-3.5 overflow-y-auto space-y-3 justify-between">
        {/* ----------------------------------------------------------------------- */}
        {/* ROW 1: LIVE FLEET TELEMETRY (5 ENGRAVED CARDS WITH COLOR BORDERS & FONTS) */}
        {/* No. of Fleets | Working | Idle | Stopped | Late Start */}
        {/* ----------------------------------------------------------------------- */}
        <div className={`p-3 rounded-xl ${isLight ? 'bg-white border border-slate-200/90 shadow-xs' : 'bg-[#091124] border border-[#1E2E56] shadow-md'} space-y-2 flex-1 flex flex-col justify-between`}>
          <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} pb-1.5`}>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className={`text-xs font-bold ${isLight ? 'text-slate-900 font-extrabold' : 'text-white'} uppercase font-['Chakra_Petch'] tracking-wide`}>
                Live Fleet Telemetry (Starting from 00:00 hrs)
              </span>
            </div>
            <span className={`text-[10px] font-mono ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>
              ● {workingCount} Working / {totalFleet} Active Vehicles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 font-mono flex-1">
            {/* Box 1: No. of Fleets (Cyan 3D Engraved) */}
            <div 
              id="box-total-fleet"
              onClick={() => handleBoxClick('TOTAL_FLEET')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('cyan')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">No. of Fleets</span>
                <Truck size={17} className={`shrink-0 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-cyan-300'} font-['Chakra_Petch'] leading-none drop-shadow-sm`}>
                  {totalFleet}
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-slate-600 border-cyan-200' : 'text-cyan-300 border-cyan-900/30'} flex items-center justify-between shrink-0 pt-1.5 border-t`}>
                <span className="truncate">All Vehicles</span>
                <span className={`font-mono font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>10 Total</span>
              </div>
            </div>

            {/* Box 2: Working (Green 3D Engraved) */}
            <div 
              onClick={() => handleBoxClick('WORKING')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('green')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Working</span>
                <Activity size={17} className={`shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-emerald-300'} font-['Chakra_Petch'] leading-none drop-shadow-sm`}>
                  {workingCount}
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-slate-600 border-emerald-200' : 'text-emerald-400 border-emerald-900/30'} flex items-center justify-between shrink-0 pt-1.5 border-t`}>
                <span className="truncate">Active On Trip</span>
                <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>90% Active</span>
              </div>
            </div>

            {/* Box 3: Idle (Amber 3D Engraved) */}
            <div 
              onClick={() => handleBoxClick('IDLE')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('amber')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Idle</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-950/90 border-amber-800 text-amber-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-amber-300'} font-['Chakra_Petch'] leading-none drop-shadow-sm`}>
                  {idleCount}
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-slate-600 border-amber-200' : 'text-amber-300 border-amber-900/30'} flex items-center justify-between shrink-0 pt-1.5 border-t`}>
                <span className="truncate">Stationary Idling</span>
                <span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>VH-103</span>
              </div>
            </div>

            {/* Box 4: Stopped (Purple 3D Engraved) */}
            <div 
              onClick={() => handleBoxClick('STOPPED')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('purple')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-purple-800' : 'text-purple-300'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Stopped</span>
                <MapPin size={17} className={`shrink-0 ${isLight ? 'text-purple-700' : 'text-purple-300'}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-purple-200'} font-['Chakra_Petch'] leading-none drop-shadow-sm`}>
                  {stoppedCount}
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-slate-600 border-purple-200' : 'text-purple-300 border-purple-900/30'} flex items-center justify-between shrink-0 pt-1.5 border-t`}>
                <span className="truncate">Parked / Rest Bay</span>
                <span className={`font-mono font-bold ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>0 in Yard</span>
              </div>
            </div>

            {/* Box 5: Late Start (Red 3D Engraved) */}
            <div 
              id="box-late-start"
              onClick={() => handleBoxClick('LATE_START')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('red')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-rose-800' : 'text-rose-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Late Start</span>
                <AlertTriangle size={17} className={`animate-pulse shrink-0 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-rose-300'} font-['Chakra_Petch'] leading-none drop-shadow-sm`}>
                  {lateStartCount}
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-slate-600 border-rose-200' : 'text-rose-400 border-rose-900/30'} flex items-center justify-between shrink-0 pt-1.5 border-t`}>
                <span className="truncate">Delayed Dispatch</span>
                <span className={`font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>&gt; 08:00 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* ROW 2: FIVE BOXES - DIESEL SAVINGS 5 PILLARS (ALL CLICKABLE) */}
        {/* Fuel Siphoning | Refuelling Mismatch | Idling Loss | High CPH Loss | Route Deviation Loss */}
        {/* ----------------------------------------------------------------------- */}
        <div className={`p-3 rounded-xl ${isLight ? 'bg-white border border-slate-200/90 shadow-xs' : 'bg-[#091124] border border-[#1E2E56] shadow-md'} space-y-2 flex-1 flex flex-col justify-between`}>
          <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} pb-1.5`}>
            <div className="flex items-center space-x-2">
              <Fuel size={16} className={`${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span className={`text-xs font-bold ${isLight ? 'text-slate-900 font-extrabold' : 'text-white'} uppercase font-['Chakra_Petch'] tracking-wide`}>
                Diesel Savings 5 Pillars Loss Overview
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isLight ? 'bg-amber-100/90 text-amber-800 border border-amber-300' : 'bg-amber-950/70 text-amber-300 border border-amber-500/40'} flex items-center gap-1 shadow-xs`} title="Approx Diesel price across Indian corridors used to compute financial losses (₹94.0/L)">
                <span>Approx Fuel Price:</span>
                <span className="font-bold underline decoration-amber-400/50">₹{DIESEL_RATE.toFixed(1)}/L</span>
              </span>
            </div>
            <span className={`text-[10px] font-mono ${isLight ? 'text-amber-700 font-bold' : 'text-amber-400'}`}>
              ● Live Financial Loss Tracking
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 font-mono flex-1">
            {/* Box 1: Fuel Siphoning (Crimson Red Engraved Button) */}
            <div 
              id="box-fuel-siphoning"
              onClick={() => handleBoxClick('SIPHONING')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('red')}
            >
              <div className={`flex items-center justify-between text-xs ${isLight ? 'text-rose-800' : 'text-rose-400'} font-bold uppercase tracking-tight shrink-0`}>
                <span className="truncate pr-1">Fuel Siphoning</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-rose-950/90 border-rose-800 text-rose-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-rose-300'} leading-none font-['Chakra_Petch'] drop-shadow-md tracking-tight`}>
                    ₹2,679
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-rose-950/90 border-rose-700/70 text-rose-200'} border flex items-center gap-1 shrink-0 shadow-xs`} title={`${p1VehiclesCount} Vehicle affected today`}>
                    <Truck size={11} className={`${isLight ? 'text-rose-700' : 'text-rose-400'} shrink-0`} />
                    <span>{p1VehiclesCount} {p1VehiclesCount === 1 ? 'Veh' : 'Veh'}</span>
                  </span>
                </div>
                <div className={`text-[13px] ${isLight ? 'text-rose-700' : 'text-rose-400'} font-black font-mono leading-none mt-1`}>
                  28.5 L
                </div>
              </div>
              <div className={`text-[11px] flex justify-between items-center shrink-0 pt-1.5 border-t ${isLight ? 'border-rose-200 text-slate-600' : 'border-rose-900/30 text-slate-300'}`}>
                <span className="font-mono whitespace-nowrap truncate">
                  MTD: <b className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>₹17,343</b> <span className={isLight ? 'text-rose-700 font-bold' : 'text-rose-400'}>(184.5 L)</span>
                </span>
              </div>
            </div>

            {/* Box 2: Refuelling Mismatch (Amber Engraved Button) */}
            <div 
              onClick={() => handleBoxClick('REFUEL_MISMATCH')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('amber')}
            >
              <div className={`flex items-center justify-between text-xs ${isLight ? 'text-amber-800' : 'text-amber-400'} font-bold uppercase tracking-tight shrink-0`}>
                <span className="truncate pr-1">Refuel Mismatch</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-950/90 border-amber-800 text-amber-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-amber-300'} leading-none font-['Chakra_Petch'] drop-shadow-md tracking-tight`}>
                    ₹2,068
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-950/90 border-amber-700/70 text-amber-200'} border flex items-center gap-1 shrink-0 shadow-xs`} title={`${p2VehiclesCount} Vehicle affected today`}>
                    <Truck size={11} className={`${isLight ? 'text-amber-800' : 'text-amber-400'} shrink-0`} />
                    <span>{p2VehiclesCount} {p2VehiclesCount === 1 ? 'Veh' : 'Veh'}</span>
                  </span>
                </div>
                <div className={`text-[13px] ${isLight ? 'text-amber-800' : 'text-amber-400'} font-black font-mono leading-none mt-1`}>
                  22.0 L
                </div>
              </div>
              <div className={`text-[11px] flex justify-between items-center shrink-0 pt-1.5 border-t ${isLight ? 'border-amber-200 text-slate-600' : 'border-amber-900/30 text-slate-300'}`}>
                <span className="font-mono whitespace-nowrap truncate">
                  MTD: <b className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>₹13,348</b> <span className={isLight ? 'text-amber-800 font-bold' : 'text-amber-400'}>(142.0 L)</span>
                </span>
              </div>
            </div>

            {/* Box 3: Idling Loss (Solar Yellow Engraved Button) */}
            <div 
              id="box-idling-loss"
              onClick={() => handleBoxClick('IDLING_LOSS')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('amber')}
            >
              <div className={`flex items-center justify-between text-xs ${isLight ? 'text-amber-800' : 'text-amber-400'} font-bold uppercase tracking-tight shrink-0`}>
                <span className="truncate pr-1">Idling Loss</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-950/90 border-amber-800 text-amber-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-amber-300'} leading-none font-['Chakra_Petch'] drop-shadow-md tracking-tight`}>
                    ₹5,020
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-yellow-950/90 border-yellow-700/70 text-yellow-200'} border flex items-center gap-1 shrink-0 shadow-xs`} title={`${p3VehiclesCount} Vehicles affected today`}>
                    <Truck size={11} className={`${isLight ? 'text-amber-800' : 'text-amber-400'} shrink-0`} />
                    <span>{p3VehiclesCount} {p3VehiclesCount === 1 ? 'Veh' : 'Veh'}</span>
                  </span>
                </div>
                <div className={`text-[13px] ${isLight ? 'text-amber-800' : 'text-amber-400'} font-black font-mono leading-none mt-1`}>
                  53.4 L
                </div>
              </div>
              <div className={`text-[11px] flex justify-between items-center shrink-0 pt-1.5 border-t ${isLight ? 'border-amber-200 text-slate-600' : 'border-amber-900/30 text-slate-300'}`}>
                <span className="font-mono whitespace-nowrap truncate">
                  MTD: <b className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>₹79,571</b> <span className={isLight ? 'text-amber-800 font-bold' : 'text-amber-400'}>(846.5 L)</span>
                </span>
              </div>
            </div>

            {/* Box 4: High CPH Loss (Purple Engraved Button) */}
            <div 
              onClick={() => handleBoxClick('HIGH_CPH')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('purple')}
            >
              <div className={`flex items-center justify-between text-xs ${isLight ? 'text-purple-800' : 'text-purple-300'} font-bold uppercase tracking-tight shrink-0`}>
                <span className="truncate pr-1">High CPH Loss</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-purple-950/90 border-purple-800 text-purple-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-purple-200'} leading-none font-['Chakra_Petch'] drop-shadow-md tracking-tight`}>
                    ₹5,349
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-purple-950/90 border-purple-700/70 text-purple-200'} border flex items-center gap-1 shrink-0 shadow-xs`} title={`${p4VehiclesCount} Vehicles affected today`}>
                    <Truck size={11} className={`${isLight ? 'text-purple-800' : 'text-purple-400'} shrink-0`} />
                    <span>{p4VehiclesCount} {p4VehiclesCount === 1 ? 'Veh' : 'Veh'}</span>
                  </span>
                </div>
                <div className={`text-[13px] ${isLight ? 'text-purple-800' : 'text-purple-300'} font-black font-mono leading-none mt-1`}>
                  56.9 L
                </div>
              </div>
              <div className={`text-[11px] flex justify-between items-center shrink-0 pt-1.5 border-t ${isLight ? 'border-purple-200 text-slate-600' : 'border-purple-900/30 text-slate-300'}`}>
                <span className="font-mono whitespace-nowrap truncate">
                  MTD: <b className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>₹57,528</b> <span className={isLight ? 'text-purple-800 font-bold' : 'text-purple-300'}>(612.0 L)</span>
                </span>
              </div>
            </div>

            {/* Box 5: Route Deviation Loss (Cyan Engraved Button) */}
            <div 
              id="box-route-deviation"
              onClick={() => handleBoxClick('ROUTE_DEVIATION')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('cyan')}
            >
              <div className={`flex items-center justify-between text-xs ${isLight ? 'text-cyan-800' : 'text-cyan-400'} font-bold uppercase tracking-tight shrink-0`}>
                <span className="truncate pr-1">Route Deviation</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-cyan-100 border-cyan-300 text-cyan-800' : 'bg-cyan-950/90 border-cyan-800 text-cyan-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-cyan-300'} leading-none font-['Chakra_Petch'] drop-shadow-md tracking-tight`}>
                    ₹1,711
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-cyan-100 border-cyan-300 text-cyan-800' : 'bg-sky-950/90 border-sky-700/70 text-sky-200'} border flex items-center gap-1 shrink-0 shadow-xs`} title={`${p5VehiclesCount} Vehicle affected today`}>
                    <Truck size={11} className={`${isLight ? 'text-cyan-800' : 'text-cyan-400'} shrink-0`} />
                    <span>{p5VehiclesCount} {p5VehiclesCount === 1 ? 'Veh' : 'Veh'}</span>
                  </span>
                </div>
                <div className={`text-[13px] ${isLight ? 'text-cyan-800' : 'text-cyan-400'} font-black font-mono leading-none mt-1`}>
                  18.2 L
                </div>
              </div>
              <div className={`text-[11px] flex justify-between items-center shrink-0 pt-1.5 border-t ${isLight ? 'border-cyan-200 text-slate-600' : 'border-cyan-900/30 text-slate-300'}`}>
                <span className="font-mono whitespace-nowrap truncate">
                  MTD: <b className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>₹23,359</b> <span className={isLight ? 'text-cyan-800 font-bold' : 'text-cyan-300'}>(248.5 L)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* ROW 3: FIVE BOXES - OPERATIONAL & COMPLIANCE INTEL (ALL CLICKABLE) */}
        {/* Fuel Consumed | Refuelling Done | Refuelling Req for 10h | Service Due | Geo Fencing Breach */}
        {/* ----------------------------------------------------------------------- */}
        <div className={`p-3 rounded-xl ${isLight ? 'bg-white border border-slate-200/90 shadow-xs' : 'bg-[#091124] border border-[#1E2E56] shadow-md'} space-y-2 flex-1 flex flex-col justify-between`}>
          <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} pb-1.5`}>
            <div className="flex items-center space-x-2">
              <Layers size={16} className={`${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
              <span className={`text-xs font-bold ${isLight ? 'text-slate-900 font-extrabold' : 'text-white'} uppercase font-['Chakra_Petch'] tracking-wide`}>
                Operational Logistics Overview
              </span>
            </div>
            <span className={`text-[10px] font-mono ${isLight ? 'text-cyan-700 font-bold' : 'text-cyan-400'}`}>
              ● Continuous Telemetry Audit
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 font-mono flex-1">
            {/* Box 1: Fuel Consumed Today (Run Km Today) (Amber Engraved Button) */}
            <div 
              id="box-fuel-consumed"
              onClick={() => handleBoxClick('FUEL_CONSUMED_TODAY')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('amber')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'} uppercase tracking-tight shrink-0`}>
                <span className="whitespace-nowrap">Fuel Consumed</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-950/90 border-amber-800 text-amber-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-amber-300'} leading-none drop-shadow-md tracking-tight`}>
                    ₹{totalFuelCostToday.toLocaleString('en-IN')}
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-950/90 border-amber-700/70 text-amber-200'} border flex items-center gap-1 shrink-0 shadow-xs`} title={`${totalKmsToday.toLocaleString()} km run today`}>
                    <span>{totalKmsToday.toLocaleString()} km</span>
                  </span>
                </div>
                <div className={`text-[13px] font-black font-mono leading-none mt-1.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  {Math.round(totalDieselToday).toLocaleString()} L
                </div>
              </div>
              <div className={`text-[11px] flex justify-between items-center shrink-0 pt-1.5 border-t ${isLight ? 'border-amber-200 text-slate-600' : 'border-amber-900/30 text-slate-300'}`}>
                <span className="font-mono whitespace-nowrap truncate">
                  MTD: <b className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>₹36,11,480</b> <span className={isLight ? 'text-amber-800 font-bold' : 'text-amber-400'}>(38,420 L)</span>
                </span>
              </div>
            </div>

            {/* Box 2: Refuelling Done (Emerald Engraved Button) */}
            <div 
              id="box-refuel-done"
              onClick={() => handleBoxClick('REFUEL_DONE')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('green')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Refuelling Done</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-emerald-950/90 border-emerald-800 text-emerald-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-emerald-300'} leading-none drop-shadow-md whitespace-nowrap tracking-tight`}>
                    ₹{totalRefuelDoneAmount.toLocaleString('en-IN')}
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-emerald-950/90 border-emerald-700/70 text-emerald-200'} border flex items-center gap-1 shrink-0 shadow-xs`} title={`${refuelsDoneCount} Refuels Logged Today`}>
                    <CheckCircle2 size={11} className={`${isLight ? 'text-emerald-700' : 'text-emerald-400'} shrink-0`} />
                    <span>{refuelsDoneCount} Refuels</span>
                  </span>
                </div>
                <div className={`text-[13px] font-black font-mono leading-none mt-1.5 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                  {totalLitersRefueled} L
                </div>
              </div>
              <div className={`text-[11px] flex justify-between items-center shrink-0 pt-1.5 border-t ${isLight ? 'border-emerald-200 text-slate-600' : 'border-emerald-900/30 text-slate-300'}`}>
                <span className="font-mono whitespace-nowrap truncate">
                  MTD: <b className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>₹21,10,300</b> <span className={isLight ? 'text-emerald-800 font-bold' : 'text-emerald-400'}>(22,450 L)</span>
                </span>
              </div>
            </div>

            {/* Box 3: Refuelling Req for 10 hrs ops (Amber Engraved Button) */}
            <div 
              id="box-refuel-req-10h"
              onClick={() => handleBoxClick('REFUEL_REQ_10H')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('amber')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Refuel Req 10h</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-950/90 border-amber-800 text-amber-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-amber-300'} leading-none font-['Chakra_Petch'] drop-shadow-md whitespace-nowrap tracking-tight`}>
                    ₹{totalRefuelAmountReq.toLocaleString('en-IN')}
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-950/90 border-amber-700/70 text-amber-200'} border flex items-center gap-1 shrink-0 shadow-xs`} title={`${vehiclesNeedingRefuel.length} Trucks require refueling`}>
                    <Truck size={11} className={`${isLight ? 'text-amber-800' : 'text-amber-400'} shrink-0`} />
                    <span>{vehiclesNeedingRefuel.length} Trucks</span>
                  </span>
                </div>
                <div className={`text-[13px] font-black font-mono leading-none mt-1 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  {totalRefuelQuantityReq.toFixed(1)} L required
                </div>
              </div>
              <div className={`text-[11px] flex justify-between items-center shrink-0 pt-1.5 border-t ${isLight ? 'border-amber-200 text-slate-600' : 'border-amber-900/30 text-slate-300'}`}>
                <span className="font-mono whitespace-nowrap truncate">
                  MTD Proj: <b className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>2,511 L</b> <span className={isLight ? 'text-amber-800 font-bold' : 'text-amber-400'}>(₹2,36,034)</span>
                </span>
              </div>
            </div>

            {/* Box 4: Service Due (Cyan Engraved Button) */}
            <div 
              onClick={() => handleBoxClick('SERVICE_DUE')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('cyan')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Service Due</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-cyan-100 border-cyan-300 text-cyan-800' : 'bg-cyan-950/90 border-cyan-800 text-cyan-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-cyan-300'} font-['Chakra_Petch'] leading-none drop-shadow-md`}>
                  {serviceDueCount} <span className={`text-sm font-semibold ${isLight ? 'text-cyan-800' : 'text-cyan-400'}`}>Trucks</span>
                </div>
              </div>
              <div className={`text-[11px] ${isLight ? 'text-cyan-800 border-cyan-200' : 'text-cyan-300 border-cyan-900/30'} flex justify-between items-center shrink-0 pt-1.5 border-t`}>
                <span className="truncate pr-1">&lt; 500 km remaining</span>
                <span className={`font-mono font-bold shrink-0 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>Overhaul Due</span>
              </div>
            </div>

            {/* Box 5: Geo Fencing Breach (Red Engraved Button) */}
            <div 
              id="box-geo-fencing"
              onClick={() => handleBoxClick('GEOFENCE')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] px-2.5 py-2.5 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('red')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-rose-800' : 'text-rose-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Geo Fencing</span>
                <span className={`text-[9.5px] ${isLight ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-rose-950/90 border-rose-800 text-rose-300'} px-2 py-0.5 rounded border font-mono font-bold flex items-center gap-1 shrink-0`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="my-auto py-0.5 flex flex-col justify-center">
                <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-rose-300'} font-['Chakra_Petch'] leading-none drop-shadow-md`}>
                  {geofenceBreachCount} <span className={`text-sm font-semibold ${isLight ? 'text-rose-800' : 'text-rose-400'}`}>Breach</span>
                </div>
              </div>
              <div className={`text-[11px] ${isLight ? 'text-rose-800 border-rose-200' : 'text-rose-300 border-rose-900/30'} flex justify-between items-center shrink-0 pt-1.5 border-t`}>
                <span className="truncate pr-1">DL-01 (+56.4km)</span>
                <span className={`font-mono font-bold shrink-0 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Off Corridor</span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* ROW 4: FIVE BOXES - FLEET PERFORMANCE, UTILIZATION & SPECIALIZED ALARMS (ALL CLICKABLE) */}
        {/* 1. E-Way Bill */}
        {/* 2. Challans */}
        {/* 3. Compliance RTO */}
        {/* 4. Mobile Location Tracking */}
        {/* 5. Driver DL Verification */}
        {/* ----------------------------------------------------------------------- */}
        <div className={`p-3 rounded-xl ${isLight ? 'bg-white border border-slate-200/90 shadow-xs' : 'bg-[#091124] border border-[#1E2E56] shadow-md'} space-y-2 flex-1 flex flex-col justify-between`}>
          <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} pb-1.5`}>
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} className={`${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
              <span className={`text-xs font-bold ${isLight ? 'text-slate-900 font-extrabold' : 'text-white'} uppercase font-['Chakra_Petch'] tracking-wide`}>
                Fleet Performance, Statutory Compliance & Transport Intelligence
              </span>
            </div>
            <span className={`text-[10px] font-mono ${isLight ? 'text-emerald-700 font-bold' : 'text-cyan-400'}`}>
              ● Live Telemetry & Diagnostics
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 font-mono flex-1">
            {/* Box 1: E-Way Bill (Cyan Engraved Button) */}
            <div 
              onClick={() => handleBoxClick('E_WAY_BILL')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('cyan')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">E-Way Bill</span>
                <FileCheck size={17} className={`shrink-0 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-cyan-300'} font-['Chakra_Petch'] leading-tight drop-shadow-md`}>
                  {totalActiveEway} Active
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-cyan-800 border-cyan-200' : 'text-cyan-300 border-cyan-900/30'} flex justify-between items-center shrink-0 pt-1.5 border-t`}>
                <span className="truncate">{expiringSoonEway > 0 ? `${expiringSoonEway} Expiring Soon (< 4h)` : '100% Valid'}</span>
                <span className={`font-mono font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>GST Portal</span>
              </div>
            </div>

            {/* Box 2: Challans (Emerald Engraved Button) */}
            <div 
              id="box-challans"
              onClick={() => handleBoxClick('CHALLANS')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('green')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Challans</span>
                <AlertTriangle size={17} className={`shrink-0 ${pendingChallansCount > 0 ? (isLight ? 'text-amber-600' : 'text-amber-400') : (isLight ? 'text-emerald-700' : 'text-emerald-400')}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-emerald-300'} font-['Chakra_Petch'] leading-tight drop-shadow-md`}>
                  {pendingChallansCount > 0 ? `${pendingChallansCount} Pending` : '0 Pending'}
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-emerald-800 border-emerald-200' : 'text-emerald-300 border-emerald-900/30'} flex justify-between items-center shrink-0 pt-1.5 border-t`}>
                <span className="truncate">{pendingChallansCount > 0 ? `₹${pendingChallansAmount.toLocaleString()} Fine (1 Due)` : 'All 10 Clean'}</span>
                <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Parivahan</span>
              </div>
            </div>

            {/* Box 3: Compliance RTO (Jade Green Engraved Button) */}
            <div 
              id="box-compliance-rto"
              onClick={() => handleBoxClick('RTO_COMPLIANCE')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('green')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Compliance RTO</span>
                <FileCheck size={17} className={`shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-emerald-300'} font-['Chakra_Petch'] leading-tight drop-shadow-md`}>
                  {rtoComplianceDueCount} <span className={`text-xs font-normal ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Due</span>
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-emerald-800 border-emerald-200' : 'text-emerald-300 border-emerald-900/30'} flex justify-between items-center shrink-0 pt-1.5 border-t`}>
                <span className={`${isLight ? 'text-emerald-700' : 'text-emerald-400'} font-bold truncate`}>HR-55 (Due 6d)</span>
                <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Fitness &amp; Permit</span>
              </div>
            </div>

            {/* Box 4: Mobile Location Tracking (Amber Engraved Button) */}
            <div 
              id="box-mobile-tracking"
              onClick={() => handleBoxClick('MOBILE_TRACKING')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('amber')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Mobile Tracking</span>
                <Smartphone size={17} className={`shrink-0 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-amber-300'} font-['Chakra_Petch'] leading-tight drop-shadow-md`}>
                  10/10 <span className={`text-xs font-normal ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>Active</span>
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-amber-800 border-amber-200' : 'text-amber-300 border-amber-900/30'} flex justify-between items-center shrink-0 pt-1.5 border-t`}>
                <span className="truncate">10 Tracked • 98.4% Fix</span>
                <span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>SIM / App GPS</span>
              </div>
            </div>

            {/* Box 5: Driver DL Verification (Purple Engraved Button) */}
            <div 
              id="box-driver-dl"
              onClick={() => handleBoxClick('DRIVER_DL')}
              className="cursor-pointer transition-all duration-150 transform hover:scale-[1.015] hover:brightness-110 active:scale-[0.99] p-3 rounded-xl relative overflow-hidden group shadow-md flex flex-col justify-between flex-1 min-h-[142px] xl:min-h-[156px]"
              style={getBoxThemeStyle('purple')}
            >
              <div className={`flex items-center justify-between text-xs font-bold ${isLight ? 'text-purple-800' : 'text-purple-300'} uppercase tracking-wider shrink-0`}>
                <span className="whitespace-nowrap">Driver DL</span>
                <UserCheck size={17} className={`shrink-0 ${isLight ? 'text-purple-700' : 'text-purple-300'}`} />
              </div>
              <div className="my-auto py-0.5">
                <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-purple-200'} font-['Chakra_Petch'] leading-tight drop-shadow-md`}>
                  10/10 <span className={`text-xs font-normal ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>Verified</span>
                </div>
              </div>
              <div className={`text-[11.5px] ${isLight ? 'text-purple-800 border-purple-200' : 'text-purple-300 border-purple-900/30'} flex justify-between items-center shrink-0 pt-1.5 border-t`}>
                <span className="truncate flex items-center gap-1 text-amber-400 font-bold">
                  <span>⚠ 1 Alert (&lt;30d)</span>
                </span>
                <span className={`font-mono font-bold ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>Sarathi RTO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sleek Bottom Fleet Telemetry Status & Hardware Health Strip */}
        <div className={`mt-1 px-4 py-2 rounded-xl border flex items-center justify-between text-[11px] font-mono shrink-0 shadow-sm ${isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#0A1329] border-[#1E2E56] text-slate-400'}`}>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>CAN-BUS TELEMETRY: 100% HEALTHY</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:flex items-center space-x-1">
              <Radio size={12} className="text-cyan-400" />
              <span>10 AIS-140 GPS Connected</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:flex items-center space-x-1">
              <ShieldCheck size={12} className="text-purple-400" />
              <span>Sarathi &amp; Parivahan Gateways: Live Synced</span>
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-[10px] text-slate-400">Pings/sec: <b className="text-cyan-300 font-bold">128 Hz</b></span>
            <span className="hidden lg:inline text-[10px] text-slate-400">Latency: <b className="text-emerald-300 font-bold">14 ms</b></span>
            <span className="text-[10px] text-slate-400">Sync: <b className="text-emerald-400 font-bold">00:00 - Live</b></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT VERTICAL PANEL: ALL ALERTS IN CHRONOLOGICAL ORDER (AUTO-SCROLL) */}
      {/* ========================================================================= */}
      <div 
        className={`w-88 lg:w-96 xl:w-[410px] 2xl:w-[440px] ${isLight ? 'bg-white border-l border-slate-200' : 'bg-[#070D1F] border-l border-[#1E2E56]'} flex flex-col shrink-0 overflow-hidden shadow-2xl transition-colors duration-200`}
      >
        {/* Right Header with Auto-Scroll Controls */}
        <div className={`p-3 ${isLight ? 'bg-white border-b border-slate-200' : 'bg-[#0A1128] border-b border-[#1E2E56]'} flex items-center justify-between shrink-0`}>
          <div className="flex items-center space-x-2">
            <Bell size={16} className="text-rose-400 animate-pulse" />
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'} font-['Chakra_Petch']`}>
                Chronological Alerts
              </span>
              <span className={`ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-950 text-rose-300 border border-rose-800'} font-bold`}>
                {alerts.filter(a => a.is_acknowledged === 0).length} Pending
              </span>
            </div>
          </div>

          {/* Auto-Scroll & Matrix Navigation Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onNavigateToScreen && onNavigateToScreen('alert_matrix')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center space-x-1 transition cursor-pointer shadow-xs ${
                isLight 
                  ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-300' 
                  : 'bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/50'
              }`}
              title="Open Full Cross-Tabulated Alert & Report Audit Dashboard"
            >
              <Layers size={11} />
              <span>Matrix ↗</span>
            </button>
            <button
              onClick={() => setAlertAutoScroll(!alertAutoScroll)}
              className={`p-1 rounded text-[10px] font-mono flex items-center space-x-1 transition ${
                alertAutoScroll 
                  ? (isLight ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40')
                  : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')
              }`}
              title="Toggle Alert Feed Auto-Scroll (Pauses on Alert Hover)"
            >
              {alertAutoScroll ? <Play size={10} className="fill-current" /> : <Pause size={10} />}
              <span>{alertAutoScroll ? (isAlertHovered ? 'Paused' : 'Auto') : 'Off'}</span>
            </button>
          </div>
        </div>

        {/* Chronological Alert Cards Container with Auto-Scroll Ticker */}
        <div 
          ref={alertsScrollRef}
          onMouseEnter={() => setIsAlertHovered(true)}
          onMouseLeave={() => {
            setIsAlertHovered(false);
            setHoveredAlertId(null);
          }}
          className="flex-1 p-2.5 overflow-y-auto space-y-2 relative"
        >
          <div 
            className={`space-y-2 ${scrollClass}`}
            style={{
              animationPlayState: (!alertAutoScroll || isAlertHovered) ? 'paused' : 'running'
            }}
          >
            {/* Render alerts doubled when auto-scroll is active for smooth loop */}
            {[...alerts, ...(alertAutoScroll ? alerts : [])].map((alert, idx) => {
              const isAck = alert.is_acknowledged === 1;
              const cardKey = `${alert.id}-${idx}`;
              const isHoveredCard = hoveredAlertId === cardKey;

              const getBadgeClasses = (type) => {
                switch (type) {
                  case 'FUEL_SIPHONING':
                  case 'COLD_TEMP':
                  case 'CARGO_TEMP_INCREASING':
                  case 'EWAY_EXPIRING':
                  case 'AXLE_OVERWEIGHT':
                  case 'EXCESSIVE_IDLE':
                    return isLight ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold' : 'bg-rose-950 text-rose-300 border border-rose-800 font-bold';
                  case 'REFUEL_DISCREPANCY':
                  case 'IDLE_ALERT':
                  case 'EXCESSIVE_STOPPAGE':
                  case 'HIGH_CPH':
                  case 'CHALLAN_PENDING':
                  case 'AXLE_IMBALANCE':
                    return isLight ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' : 'bg-amber-950 text-amber-300 border border-amber-800 font-bold';
                  case 'HARSH_BRAKING':
                  case 'SHARP_CORNERING':
                  case 'HARSH_DRIVING':
                  case 'OVERSPEEDING_2X':
                    return isLight ? 'bg-orange-100 text-orange-800 border border-orange-300 font-bold' : 'bg-orange-950 text-orange-300 border border-orange-800 font-bold';
                  case 'REFUEL_SUCCESS':
                    return isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold' : 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold';
                  default:
                    return isLight ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold' : 'bg-blue-950 text-blue-300 border border-blue-800 font-bold';
                }
              };

              return (
                <div
                  key={cardKey}
                  onMouseEnter={() => {
                    setIsAlertHovered(true);
                    setHoveredAlertId(cardKey);
                  }}
                  onMouseLeave={() => {
                    setHoveredAlertId(null);
                  }}
                  className={`p-2.5 rounded-xl border transition-all duration-200 text-xs space-y-1.5 cursor-pointer relative ${
                    isHoveredCard
                      ? (isLight ? 'bg-cyan-50/90 border-cyan-500 ring-2 ring-cyan-400 shadow-md scale-[1.015] z-10' : 'bg-[#122347] border-cyan-400 ring-2 ring-cyan-500/60 shadow-xl shadow-cyan-950/80 scale-[1.015] z-10')
                      : isAck
                      ? (isLight ? 'bg-slate-50/90 border-slate-200 opacity-75' : 'bg-[#0B152A]/80 border-slate-800/80 opacity-75')
                      : (isLight ? 'bg-white border-rose-300 shadow-sm hover:border-rose-400' : 'bg-[#101E3D] border-rose-600/60 shadow-lg shadow-rose-950/40 hover:border-rose-400')
                  }`}
                >
                  {/* Top Alert Tag & Chronological Timestamp */}
                  <div className="flex items-center justify-between font-mono">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${getBadgeClasses(alert.type)}`}>
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{alert.timestamp}</span>
                  </div>

                  {/* Title & Registration */}
                  <div>
                    <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'} flex items-center justify-between`}>
                      <span className="truncate pr-1">{alert.title}</span>
                      <span className={`text-[11px] font-mono ${isLight ? 'text-cyan-700 font-bold' : 'text-cyan-400'} shrink-0`}>{alert.reg_no}</span>
                    </div>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'} leading-tight mt-0.5`}>
                      {alert.message}
                    </p>
                  </div>

                  {/* Metric Value & Location */}
                  <div className={`flex items-center justify-between text-[10px] font-mono ${isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-700/60'} pt-1 border-t`}>
                    <span className={`${isLight ? 'text-amber-800 font-bold' : 'text-amber-300 font-semibold'}`}>{alert.metric_value}</span>
                    <span className="truncate max-w-[150px]">{alert.location}</span>
                  </div>

                  {/* Interactive Acknowledge Button: RED to GREEN Requirement! */}
                  <div className="pt-1">
                    {isAck ? (
                      <div className={`w-full flex items-center justify-between px-2.5 py-1 rounded ${isLight ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300'} font-mono font-bold text-[10px]`}>
                        <span className="flex items-center space-x-1">
                          <CheckCircle2 size={12} className={isLight ? 'text-emerald-600' : 'text-emerald-400'} />
                          <span>ACKNOWLEDGED</span>
                        </span>
                        <span className={`text-[9px] font-normal ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                          {alert.acknowledged_by || 'Logged'}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcknowledge(alert.id);
                        }}
                        disabled={acknowledgingId === alert.id}
                        className="w-full py-1.5 px-3 rounded bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md shadow-red-950 transition transform hover:scale-[1.01]"
                      >
                        {acknowledgingId === alert.id ? (
                          <RefreshCw size={13} className="animate-spin text-white" />
                        ) : (
                          <Check size={13} className="stroke-[3]" />
                        )}
                        <span>ACKNOWLEDGE ALERT</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Telemetry Stream Diagnostic Footer Bar to Anchor Bottom */}
        <div className={`p-2.5 border-t shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#091124] border-[#1E2E56]'}`}>
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
            <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>TELEMETRY STREAM: LIVE</span>
            </span>
            <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {alerts.length} Total Events
            </span>
          </div>
          <div className={`p-2 rounded-lg text-[9.5px] font-mono ${isLight ? 'bg-white border border-slate-200 text-slate-600' : 'bg-[#060D1E] border border-slate-800 text-slate-400'} flex items-center justify-between`}>
            <div>
              <span className="text-slate-500">CAN Bus: </span>
              <span className="text-cyan-400 font-bold">128/min</span>
            </div>
            <div>
              <span className="text-slate-500">Audit Status: </span>
              <span className="text-emerald-400 font-bold">Active</span>
            </div>
            <div>
              <span className="text-slate-500">Loss Index: </span>
              <span className="text-amber-400 font-bold">₹1.42L</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Report Modal Up to 3 Months with Custom Dates */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1730] border border-cyan-500/50 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <Download size={18} className="text-cyan-400" />
                <h3 className="font-bold text-white text-sm font-['Chakra_Petch']">
                  Download Operational Audit Report
                </h3>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Quick Range Presets:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Today', period: 'today', days: 0 },
                    { label: 'Current MTD', period: 'mtd', days: new Date().getDate() },
                    { label: 'Last 3 Months', period: 'last3months', days: 90 },
                  ].map(p => (
                    <button
                      key={p.period}
                      type="button"
                      onClick={() => {
                        const from = new Date(Date.now() - p.days * 86400000).toISOString().split('T')[0];
                        setReportConfig({ ...reportConfig, period: p.period, fromDate: from, toDate: new Date().toISOString().split('T')[0] });
                      }}
                      className={`p-1.5 rounded border text-center font-bold ${
                        reportConfig.period === p.period ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-[#060B18] text-slate-300 border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#060B18] border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-bold block">Custom Date Range (Up to 3 Months)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-0.5">From Date</label>
                    <input
                      type="date"
                      value={reportConfig.fromDate}
                      min={new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setReportConfig({ ...reportConfig, fromDate: e.target.value, period: 'custom' })}
                      className="w-full bg-[#0D1730] border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-0.5">To Date</label>
                    <input
                      type="date"
                      value={reportConfig.toDate}
                      min={reportConfig.fromDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setReportConfig({ ...reportConfig, toDate: e.target.value, period: 'custom' })}
                      className="w-full bg-[#0D1730] border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={downloadFilteredReport}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center space-x-1"
                >
                  <Download size={13} />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refuel Cross-Check Modal */}
      {showRefuelModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1730] border border-cyan-500/50 rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <span className="font-bold text-white text-sm font-['Chakra_Petch']">Cross-Check Refuel Slip / Fleet Card</span>
              <button onClick={() => setShowRefuelModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleRefuelCrossCheckSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Select Vehicle</label>
                  <select
                    value={refuelForm.vehicle_id}
                    onChange={(e) => setRefuelForm({ ...refuelForm, vehicle_id: e.target.value })}
                    className="w-full bg-[#060B18] border border-slate-700 rounded p-1.5 text-white"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.reg_no}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Station Name</label>
                  <input
                    type="text"
                    value={refuelForm.station_name}
                    onChange={(e) => setRefuelForm({ ...refuelForm, station_name: e.target.value })}
                    className="w-full bg-[#060B18] border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Slip Fuel Quantity (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={refuelForm.slip_liters}
                    onChange={(e) => setRefuelForm({ ...refuelForm, slip_liters: e.target.value })}
                    className="w-full bg-[#060B18] border border-amber-600/50 rounded p-1.5 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tank Sensor Rise (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={refuelForm.sensor_rise_liters}
                    onChange={(e) => setRefuelForm({ ...refuelForm, sensor_rise_liters: e.target.value })}
                    className="w-full bg-[#060B18] border border-cyan-600/50 rounded p-1.5 text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefuelModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  Save & Audit Discrepancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Route Entering Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1730] border border-blue-500/50 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <span className="font-bold text-white text-sm font-['Chakra_Petch']">Planned Route Entering Provision</span>
              <button onClick={() => setShowRouteModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleRouteSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Route Corridor Name</label>
                <input
                  type="text"
                  value={routeForm.route_name}
                  onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                  className="w-full bg-[#060B18] border border-slate-700 rounded p-1.5 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Origin Hub</label>
                  <input
                    type="text"
                    value={routeForm.origin}
                    onChange={(e) => setRouteForm({ ...routeForm, origin: e.target.value })}
                    className="w-full bg-[#060B18] border border-slate-700 rounded p-1.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Destination Hub</label>
                  <input
                    type="text"
                    value={routeForm.destination}
                    onChange={(e) => setRouteForm({ ...routeForm, destination: e.target.value })}
                    className="w-full bg-[#060B18] border border-slate-700 rounded p-1.5 text-white"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Distance (km)</label>
                  <input
                    type="number"
                    value={routeForm.distance_km}
                    onChange={(e) => setRouteForm({ ...routeForm, distance_km: e.target.value })}
                    className="w-full bg-[#060B18] border border-slate-700 rounded p-1.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Allowed Dev. (km)</label>
                  <input
                    type="number"
                    value={routeForm.allowed_deviation_km}
                    onChange={(e) => setRouteForm({ ...routeForm, allowed_deviation_km: e.target.value })}
                    className="w-full bg-[#060B18] border border-cyan-700 rounded p-1.5 text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRouteModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE DRILLDOWN MODAL FOR ALL 15 METRIC BOXES */}
      {/* ========================================================================= */}
      {drilldownData && (
        <div 
          onClick={() => setDrilldownData(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-3 animate-fadeIn"
        >
          <div 
            className={`bg-[#0A1226] border ${drilldownData.accent.border} rounded-2xl w-full max-w-[98vw] 2xl:max-w-[1680px] max-h-[94vh] flex flex-col shadow-2xl ${drilldownData.accent.glow} overflow-hidden font-mono`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-2.5 bg-[#070D1D] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${drilldownData.accent.bg} ${drilldownData.accent.text} border ${drilldownData.accent.border}`}>
                  {drilldownData.boxKey === 'MOBILE_TRACKING' ? (
                    <Smartphone size={20} />
                  ) : drilldownData.boxKey === 'DRIVER_DL' ? (
                    <UserCheck size={20} />
                  ) : (
                    <Truck size={20} />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-white font-['Chakra_Petch'] uppercase tracking-wide">
                      {drilldownData.title}
                    </h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${drilldownData.accent.badgeBg}`}>
                      {drilldownData.badgeText}
                    </span>
                    {/* Real-time starting from 00:00 hrs small text pill on top */}
                    {['TOTAL_FLEET', 'WORKING', 'IDLE', 'STOPPED', 'LATE_START', 'SIPHONING'].includes(drilldownData.boxKey) && (
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-700/60 flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Real-Time Data (Starting from 00:00 hrs)</span>
                      </span>
                    )}
                    {/* Approx Fuel Price Badge */}
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-sm ${
                      isLight 
                        ? 'bg-amber-100 text-amber-800 border-amber-300' 
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    }`}>
                      Approx Fuel Price: ₹{DIESEL_RATE.toFixed(1)}/L
                    </span>
                  </div>
                  {drilldownData.category && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {drilldownData.category}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {drilldownData.boxKey === 'ROUTE_DEVIATION' && (
                  <button
                    onClick={() => {
                      setRouteAssignTargetVehId(vehicles[0]?.id || vehicles[0]?.vehicle_id || null);
                      setPlannedRouteModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold font-mono transition flex items-center space-x-1.5 shadow-md shadow-blue-900/40 border border-cyan-400/50 transform hover:scale-[1.02] cursor-pointer"
                    title="Add or Assign Planned Route to any registered vehicle"
                  >
                    <Plus size={14} />
                    <span>Add Planned Route</span>
                  </button>
                )}
                {drilldownData.boxKey === 'CHALLANS' && (
                  <a
                    href="https://echallan.parivahan.gov.in/index/accused-challan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition shadow-sm active:scale-95 border border-blue-400"
                    title="Open official Government of India Parivahan e-Challan Portal"
                  >
                    <span>Parivahan e-Challan Portal</span>
                    <ExternalLink size={13} className="text-white shrink-0" />
                  </a>
                )}
                <button
                  onClick={() => {
                    const cols = drilldownData.twelveMonthColumns || getTwelveMonthCsvColumns(drilldownData.boxKey);
                    const rows = drilldownData.twelveMonthRows || getTwelveMonthReportData(drilldownData.boxKey, vehicles);
                    exportTableToCsv(
                      `axona_${(drilldownData.boxKey || 'fleet').toLowerCase()}_12month_audit_report.csv`, 
                      cols, 
                      rows
                    );
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md hover:shadow-emerald-900/40"
                  title="Download comprehensive 12-month historical audit report (Nov 2025 – Oct 2026) for Excel"
                >
                  <Download size={13} />
                  <span>Export 12-Month Report (Excel)</span>
                </button>
                <button
                  onClick={() => exportTableToCsv(
                    drilldownData.exportFilename || `axona_${(drilldownData.boxKey || 'events').toLowerCase()}_mtd_records.csv`, 
                    drilldownData.columns, 
                    filteredDrilldownRows
                  )}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                  title="Export currently displayed MTD events to Excel/CSV"
                >
                  <FileText size={13} />
                  <span className="hidden sm:inline">Export MTD Records</span>
                </button>
                <button
                  onClick={() => setDrilldownData(null)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-600 transition"
                  title="Close modal (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* KPI Summary Cards: Servicing 4-Card (Urgent/Due Soon/Normal), 3-Card Refuel, or 5-Card Loss Layouts */}
            {drilldownData.serviceSummary ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#060B18]/70 border-b border-slate-800/80 shrink-0">
                {/* 1. TOTAL FLEET */}
                <div
                  onClick={() => setServiceFilter('ALL')}
                  className={`p-3.5 rounded-2xl bg-[#091528] border transition cursor-pointer flex flex-col justify-between select-none ${
                    serviceFilter === 'ALL'
                      ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-[#0d1e38]'
                      : 'border-slate-800/90 hover:border-cyan-700/60 hover:bg-[#0c1c34]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                      TOTAL FLEET
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-['Chakra_Petch'] leading-none">
                      {drilldownData.serviceSummary.total}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setServiceFilter('ALL');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0B2538]/80 border border-[#134e6f] text-cyan-400 hover:bg-[#113a57] transition flex items-center gap-1"
                    >
                      Details ↗
                    </button>
                  </div>
                </div>

                {/* 2. URGENT (≤ 15H) */}
                <div
                  onClick={() => setServiceFilter('URGENT')}
                  className={`p-3.5 rounded-2xl bg-[#140B12] border transition cursor-pointer flex flex-col justify-between select-none ${
                    serviceFilter === 'URGENT'
                      ? 'border-rose-500 ring-2 ring-rose-500/30 bg-[#220d1c]'
                      : 'border-rose-950/60 hover:border-rose-700/70 hover:bg-[#1c0f1a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                      URGENT (≤ 15H)
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#FB7185] font-['Chakra_Petch'] leading-none">
                      {drilldownData.serviceSummary.urgent}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setServiceFilter('URGENT');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#38101C]/80 border border-[#881337] text-[#FB7185] hover:bg-[#521629] transition flex items-center gap-1"
                    >
                      Details ↗
                    </button>
                  </div>
                </div>

                {/* 3. DUE SOON (≤ 50H) */}
                <div
                  onClick={() => setServiceFilter('DUE_SOON')}
                  className={`p-3.5 rounded-2xl bg-[#14120A] border transition cursor-pointer flex flex-col justify-between select-none ${
                    serviceFilter === 'DUE_SOON'
                      ? 'border-amber-400 ring-2 ring-amber-500/30 bg-[#221c0d]'
                      : 'border-amber-950/60 hover:border-amber-700/70 hover:bg-[#1d170a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                      DUE SOON (≤ 50H)
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#FBBF24] font-['Chakra_Petch'] leading-none">
                      {drilldownData.serviceSummary.dueSoon}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setServiceFilter('DUE_SOON');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#38260B]/80 border border-[#78350F] text-[#FBBF24] hover:bg-[#503710] transition flex items-center gap-1"
                    >
                      Details ↗
                    </button>
                  </div>
                </div>

                {/* 4. NORMAL (> 50H) */}
                <div
                  onClick={() => setServiceFilter('NORMAL')}
                  className={`p-3.5 rounded-2xl bg-[#091512] border transition cursor-pointer flex flex-col justify-between select-none ${
                    serviceFilter === 'NORMAL'
                      ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-[#0c241c]'
                      : 'border-emerald-950/60 hover:border-emerald-700/70 hover:bg-[#0f211b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                      NORMAL (&gt; 50H)
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#34D399] font-['Chakra_Petch'] leading-none">
                      {drilldownData.serviceSummary.normal}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setServiceFilter('NORMAL');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0B2E24]/80 border border-[#065F46] text-[#34D399] hover:bg-[#124234] transition flex items-center gap-1"
                    >
                      Details ↗
                    </button>
                  </div>
                </div>
              </div>
            ) : drilldownData.rtoSummary ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#060B18]/70 border-b border-slate-800/80 shrink-0">
                {/* 1. TOTAL VEHICLES */}
                <div
                  onClick={() => setRtoFilter('ALL')}
                  className={`p-3.5 rounded-2xl bg-[#091528] border transition cursor-pointer flex flex-col justify-between select-none ${
                    rtoFilter === 'ALL'
                      ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-[#0d1e38]'
                      : 'border-slate-800/90 hover:border-cyan-700/60 hover:bg-[#0c1c34]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                      TOTAL VEHICLES
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-['Chakra_Petch'] leading-none">
                      {drilldownData.rtoSummary.total}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRtoFilter('ALL');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0B2538]/80 border border-[#134e6f] text-cyan-400 hover:bg-[#113a57] transition flex items-center gap-1"
                    >
                      Details ↗
                    </button>
                  </div>
                </div>

                {/* 2. URGENT (≤ 15 DAYS) */}
                <div
                  onClick={() => setRtoFilter('URGENT')}
                  className={`p-3.5 rounded-2xl bg-[#140B12] border transition cursor-pointer flex flex-col justify-between select-none ${
                    rtoFilter === 'URGENT'
                      ? 'border-rose-500 ring-2 ring-rose-500/30 bg-[#220d1c]'
                      : 'border-rose-950/60 hover:border-rose-700/70 hover:bg-[#1c0f1a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                      URGENT (≤ 15 DAYS)
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#FB7185] font-['Chakra_Petch'] leading-none">
                      {drilldownData.rtoSummary.urgent}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRtoFilter('URGENT');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#38101C]/80 border border-[#881337] text-[#FB7185] hover:bg-[#521629] transition flex items-center gap-1"
                    >
                      Details ↗
                    </button>
                  </div>
                </div>

                {/* 3. DUE SOON (≤ 45 DAYS) */}
                <div
                  onClick={() => setRtoFilter('DUE_SOON')}
                  className={`p-3.5 rounded-2xl bg-[#14120A] border transition cursor-pointer flex flex-col justify-between select-none ${
                    rtoFilter === 'DUE_SOON'
                      ? 'border-amber-400 ring-2 ring-amber-500/30 bg-[#221c0d]'
                      : 'border-amber-950/60 hover:border-amber-700/70 hover:bg-[#1d170a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                      DUE SOON (≤ 45 DAYS)
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#FBBF24] font-['Chakra_Petch'] leading-none">
                      {drilldownData.rtoSummary.dueSoon}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRtoFilter('DUE_SOON');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#38260B]/80 border border-[#78350F] text-[#FBBF24] hover:bg-[#503710] transition flex items-center gap-1"
                    >
                      Details ↗
                    </button>
                  </div>
                </div>

                {/* 4. NORMAL (> 45 DAYS) */}
                <div
                  onClick={() => setRtoFilter('NORMAL')}
                  className={`p-3.5 rounded-2xl bg-[#091512] border transition cursor-pointer flex flex-col justify-between select-none ${
                    rtoFilter === 'NORMAL'
                      ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-[#0c241c]'
                      : 'border-emerald-950/60 hover:border-emerald-700/70 hover:bg-[#0f211b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                      NORMAL (&gt; 45 DAYS)
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#34D399] font-['Chakra_Petch'] leading-none">
                      {drilldownData.rtoSummary.normal}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRtoFilter('NORMAL');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0B2E24]/80 border border-[#065F46] text-[#34D399] hover:bg-[#124234] transition flex items-center gap-1"
                    >
                      Details ↗
                    </button>
                  </div>
                </div>
              </div>
            ) : drilldownData.kpis && drilldownData.kpis.length > 0 && (
              <div className={`grid gap-3 px-3.5 py-3 ${isLight ? 'bg-slate-50 border-b border-slate-200' : 'bg-[#060B18]/70 border-b border-slate-800/80'} shrink-0 ${
                drilldownData.kpis.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : drilldownData.kpis.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : drilldownData.kpis.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-5'
              }`}>
                {drilldownData.kpis.map((kpi, idx) => (
                  <div key={idx} className={`p-4 sm:p-5 rounded-2xl min-h-[110px] sm:min-h-[125px] ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0B152E] border-slate-800/90 shadow-sm'} border flex flex-col justify-between`}>
                    <span className={`text-xs sm:text-[13px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider block font-bold leading-tight mb-1`} title={kpi.label}>
                      {kpi.label}
                    </span>
                    <div>
                      <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
                        <span className={`font-black ${kpi.textColor || drilldownData.accent.text} font-['Chakra_Petch'] block leading-none drop-shadow-sm ${
                          String(kpi.value || '').length > 11 
                            ? 'text-xl sm:text-2xl 2xl:text-[26px]' 
                            : String(kpi.value || '').length > 8 
                            ? 'text-2xl sm:text-[28px] 2xl:text-3xl' 
                            : 'text-3xl sm:text-4xl'
                        }`}>
                          {kpi.value}
                        </span>
                        {kpi.vehicleCount !== undefined && kpi.vehicleCount !== null && (
                          <span 
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isLight ? 'bg-cyan-50 border-cyan-300 text-cyan-800' : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'} border flex items-center gap-1 shrink-0 shadow-sm`} 
                            title={`${kpi.vehicleCount} Vehicles affected`}
                          >
                            <Truck size={11} className={isLight ? 'text-cyan-700 shrink-0' : 'text-cyan-400 shrink-0'} />
                            <span>{kpi.vehicleCount} {kpi.vehicleCount === 1 ? 'Vehicle' : 'Vehicles'}</span>
                          </span>
                        )}
                        {kpi.badge && (
                          <span 
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 shadow-xs ${
                              kpi.badgeColor || (isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300')
                            }`}
                          >
                            <span>{kpi.badge}</span>
                          </span>
                        )}
                        {kpi.kmRun !== undefined && kpi.kmRun !== null && (
                          <span 
                            className={`text-[9.5px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-950/90 border-amber-700/80 text-amber-200'} border flex items-center gap-1 shadow-xs`} 
                            title={`${kpi.kmRun} distance`}
                          >
                            <Navigation size={9} className={`${isLight ? 'text-amber-800' : 'text-amber-400'} shrink-0`} />
                            <span>{kpi.kmRun}</span>
                          </span>
                        )}
                      </div>
                      {kpi.sub && (
                        <div className="mt-1.5 font-mono leading-tight">
                          {kpi.subQty ? (
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className={`text-sm sm:text-base font-black ${isLight ? 'text-slate-900' : 'text-amber-300'}`}>{kpi.subQty}</span>
                              <span className={`text-xs sm:text-[13px] uppercase font-black ${isLight ? 'text-slate-700' : 'text-amber-400'}`}>{kpi.subUnit || 'L'}</span>
                              {kpi.subDesc && (
                                <span className={`text-[11px] sm:text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                                  {kpi.subDesc}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className={`text-xs sm:text-[13px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{kpi.sub}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Driver DL Dedicated Provision 1: Critical 30-Day Alert Banner */}
            {drilldownData?.boxKey === 'DRIVER_DL' && driverDatabase.some(d => d.org_status === 'ACTIVE' && d.days_to_expiry <= 30 && d.days_to_expiry >= 0) && (
              <div className="mx-3.5 mt-2.5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-300 flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={20} className="text-amber-400 shrink-0 animate-bounce" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-wide text-amber-200 font-['Chakra_Petch']">
                        ⚠ STATUTORY ALERT: DRIVER LICENSE EXPIRING WITHIN 30 DAYS
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500 text-black font-bold uppercase">
                        Action Required
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-amber-300/90 mt-0.5">
                      Driver <strong>Ramesh Sharma</strong> (DL: <code>RJ-14-2016-0048122</code>) expires on <strong>24 Nov 2026 (25 days remaining)</strong>. Mandatory commercial RTO renewal required to prevent statutory fleet grounding.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setDriverTabFilter('EXPIRING_SOON')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono transition shadow-md"
                  >
                    View Expiring Driver
                  </button>
                </div>
              </div>
            )}

            {/* Driver DL Dedicated Provision 2: Sarathi DL Verification & Instant Check Box */}
            {drilldownData?.boxKey === 'DRIVER_DL' && (
              <div className="mx-3.5 mt-2 p-3 rounded-xl bg-[#09152B]/90 border border-purple-800/60 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-200 uppercase font-['Chakra_Petch'] tracking-wide">
                      MoRTH Sarathi National Register • Instant DL Verification & Status Check
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300 font-mono bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                    Live Sarathi Vahan API Gateway
                  </span>
                </div>

                {/* Input bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[280px]">
                    <Search size={14} className="absolute left-3 top-2.5 text-purple-400" />
                    <input 
                      type="text"
                      placeholder="Enter Driver's DL Number to check validity (e.g. MH-14-2020-0012948 or DL-04-2016-0044910)..."
                      value={dlLookupInput}
                      onChange={(e) => setDlLookupInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyDlNumber(dlLookupInput)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#040A18] border border-purple-700/60 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <button
                    onClick={() => handleVerifyDlNumber(dlLookupInput)}
                    disabled={dlLookupLoading || !dlLookupInput.trim()}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md shadow-purple-950/50 cursor-pointer"
                  >
                    {dlLookupLoading ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                    <span>{dlLookupLoading ? 'Querying Sarathi...' : 'Check DL Validity'}</span>
                  </button>
                  <button
                    onClick={() => setOnboardModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer"
                  >
                    <UserPlus size={14} />
                    <span>➕ Onboard New Driver</span>
                  </button>
                </div>

                {/* Quick test sample chips */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-purple-900/40 text-[10.5px] font-mono text-slate-400 flex-wrap">
                  <span className="text-purple-300 font-semibold">Test Sample DLs:</span>
                  <button 
                    type="button" 
                    onClick={() => { setDlLookupInput('MH-14-2020-0012948'); handleVerifyDlNumber('MH-14-2020-0012948'); }}
                    className="px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-700/50 text-purple-200 transition"
                  >
                    MH-14-2020-0012948 (Valid Commercial TRANS)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setDlLookupInput('DL-04-2016-0044910'); handleVerifyDlNumber('DL-04-2016-0044910'); }}
                    className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-200 transition"
                  >
                    DL-04-2016-0044910 (Expired DL)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setDlLookupInput('KA-01-2022-0077812'); handleVerifyDlNumber('KA-01-2022-0077812'); }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 transition"
                  >
                    KA-01-2022-0077812 (Non-Commercial LMV)
                  </button>
                </div>

                {/* Verification Result Card */}
                {dlLookupResult && (
                  <div className={`mt-2.5 p-3 rounded-xl border ${
                    !dlLookupResult.is_valid 
                      ? 'bg-rose-950/40 border-rose-600/70' 
                      : !dlLookupResult.is_commercial 
                      ? 'bg-amber-950/40 border-amber-600/70' 
                      : 'bg-emerald-950/40 border-emerald-600/70'
                  } transition shadow-md`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-bold ${
                          !dlLookupResult.is_valid ? 'text-rose-400' : !dlLookupResult.is_commercial ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {!dlLookupResult.is_valid ? '✖ DL IS EXPIRED / INVALID' : !dlLookupResult.is_commercial ? '⚠ VALID NON-COMMERCIAL (NOT AUTHORIZED FOR HCV)' : '✔ DL IS AUTHENTIC & VALID (COMMERCIAL TRANS)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!dlLookupResult.is_existing_driver && dlLookupResult.is_valid && dlLookupResult.is_commercial && (
                          <button
                            onClick={() => {
                              setNewDriverForm({
                                driver_name: dlLookupResult.driver_name,
                                driver_phone: '+91 98450 11223',
                                dl_number: dlLookupResult.dl_number,
                                dl_class: dlLookupResult.dl_class,
                                endorsements: dlLookupResult.endorsements || 'Commercial National Freight',
                                is_commercial: dlLookupResult.is_commercial,
                                issuing_rto: dlLookupResult.issuing_rto,
                                expiry_date: '2030-02-28',
                                joining_date: new Date().toISOString().split('T')[0]
                              });
                              setOnboardModalOpen(true);
                            }}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition flex items-center gap-1 shadow-sm"
                          >
                            <UserPlus size={12} />
                            <span>Onboard {dlLookupResult.driver_name} to Organization</span>
                          </button>
                        )}
                        <button 
                          onClick={() => setDlLookupResult(null)}
                          className="text-slate-400 hover:text-white text-xs p-1"
                        >
                          ✕ Close
                        </button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Driver Name</span>
                        <span className="text-white font-bold block">{dlLookupResult.driver_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">DL Number</span>
                        <span className="text-cyan-300 font-bold block">{dlLookupResult.dl_number}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Authorized Classes</span>
                        <span className="text-slate-200 block">{dlLookupResult.dl_class}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">DL Expiry Date</span>
                        <span className={`block font-bold ${!dlLookupResult.is_valid ? 'text-rose-400' : 'text-emerald-300'}`}>
                          {dlLookupResult.expiry_date}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Commercial Status</span>
                        <span className={`block font-bold ${dlLookupResult.is_commercial ? 'text-amber-300' : 'text-slate-400'}`}>
                          {dlLookupResult.is_commercial ? 'COMMERCIAL (TRANS / HCV)' : 'NON-COMMERCIAL (PRIVATE)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Issuing RTO</span>
                        <span className="text-slate-300 block">{dlLookupResult.issuing_rto}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Sarathi Verification</span>
                        <span className={`block font-bold ${dlLookupResult.is_valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {dlLookupResult.validity_status}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Org Roster</span>
                        <span className="text-slate-300 block">
                          {dlLookupResult.is_existing_driver ? `Already in Fleet DB (${dlLookupResult.org_status})` : 'New Applicant'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Driver DL Dedicated Provision 3: Database Roster Management Tabs */}
            {drilldownData?.boxKey === 'DRIVER_DL' && (
              <div className="mx-3.5 mt-2 flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-xl bg-[#070E22] border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold px-2">Roster Filter:</span>
                  <button
                    onClick={() => setDriverTabFilter('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      driverTabFilter === 'ALL'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                        : 'bg-[#0B152E] text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>All Drivers ({driverDatabase.length})</span>
                  </button>
                  <button
                    onClick={() => setDriverTabFilter('ACTIVE')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      driverTabFilter === 'ACTIVE'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                        : 'bg-[#0B152E] text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Active Employed ({driverDatabase.filter(d => d.org_status === 'ACTIVE').length})</span>
                  </button>
                  <button
                    onClick={() => setDriverTabFilter('EXITED')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      driverTabFilter === 'EXITED'
                        ? 'bg-slate-700 text-white shadow-md'
                        : 'bg-[#0B152E] text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span>Exited / Offboarded ({driverDatabase.filter(d => d.org_status === 'EXITED').length})</span>
                  </button>
                  <button
                    onClick={() => setDriverTabFilter('EXPIRING_SOON')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      driverTabFilter === 'EXPIRING_SOON'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                        : 'bg-[#0B152E] text-amber-300 hover:text-white border border-amber-800/60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    <span>Expiring Soon &lt;30d ({driverDatabase.filter(d => d.days_to_expiry <= 30 && d.days_to_expiry >= 0).length})</span>
                  </button>
                </div>

                <button
                  onClick={() => setOnboardModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition flex items-center gap-1 shadow-sm"
                >
                  <UserPlus size={13} />
                  <span>Onboard New Driver</span>
                </button>
              </div>
            )}

            {/* Vehicle Data Table (All columns displayed in one single view without scrolling) */}
            <div className="flex-1 overflow-auto px-3.5 py-2 flex flex-col">
              {/* Dual Productivity Table (Image 1 reference - EXCLUSIVELY in TOTAL_FLEET Details Dashboard) */}
              {drilldownData?.boxKey === 'TOTAL_FLEET' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-2.5 shrink-0">
                  {/* Lowest Working Commercial Fleet Card */}
                  <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-rose-300 shadow-sm' : 'bg-[#060D1E] border-rose-900/40 shadow-md'}`}>
                    <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b ${isLight ? 'border-rose-200' : 'border-rose-900/30'}`}>
                      <div className="flex items-center space-x-2">
                        <span className={`font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          LOWEST WORKING FLEET
                        </span>
                        <span className="text-cyan-400 text-xs font-mono font-medium">• Today (Real-Time)</span>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-600/80 text-rose-300 font-mono text-xs font-bold shadow-xs">
                        High Idle Cost
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono table-fixed border-collapse">
                        <colgroup>
                          <col style={{ width: '40px' }} />
                          <col style={{ width: '110px' }} />
                          <col style={{ width: '105px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '65px' }} />
                          <col style={{ width: '55px' }} />
                          <col style={{ width: '65px' }} />
                          <col style={{ width: '55px' }} />
                        </colgroup>
                        <thead>
                          <tr className={`text-[11px] uppercase tracking-wider ${isLight ? 'text-slate-700 border-slate-300' : 'text-slate-400 border-slate-800'} border-b font-bold`}>
                            <th className="pb-1.5 text-rose-400 font-bold">RANK</th>
                            <th className={`pb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>VEHICLE NO</th>
                            <th className="pb-1.5 pr-2 text-cyan-400">MAKE</th>
                            <th className={`pb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>SITE LOCATION</th>
                            <th className="pb-1.5 text-emerald-400 font-bold">WORKING</th>
                            <th className="pb-1.5 text-amber-400">IDLE</th>
                            <th className="pb-1.5 text-rose-400">STOPPED</th>
                            <th className="pb-1.5 text-rose-400 text-right">UTIL %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-950/20">
                          {[...(drilldownData.rows || [])]
                            .sort((a, b) => (a.workingHours || 0) - (b.workingHours || 0))
                            .slice(0, 3)
                            .map((veh, idx) => {
                              const shiftH = veh.totalShiftHours || 12.0;
                              const util = Math.min(100, Math.max(0, Math.round(((veh.workingHours || 0) / shiftH) * 100)));
                              return (
                                <tr key={veh.id || veh.reg_no || idx} className="hover:bg-rose-950/20 transition-colors">
                                  <td className="py-2">
                                    <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700/80 text-rose-300 font-black text-xs">
                                      #{idx + 1}
                                    </span>
                                  </td>
                                  <td className={`py-2 font-bold font-mono text-xs md:text-[13px] whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{veh.reg_no}</td>
                                  <td className="py-2 pr-2 text-cyan-400 whitespace-nowrap font-bold text-xs md:text-[13px]">{veh.make}</td>
                                  <td className={`py-2 pr-3 overflow-hidden text-xs md:text-[12.5px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                    <div className="truncate" title={veh.currentLocation}>
                                      {veh.currentLocation}
                                    </div>
                                  </td>
                                  <td className="py-2 whitespace-nowrap text-emerald-400 font-bold text-xs md:text-[13px]">{veh.workingHours}h</td>
                                  <td className="py-2 whitespace-nowrap text-amber-400 font-bold text-xs md:text-[13px]">{veh.idleHours}h</td>
                                  <td className="py-2 whitespace-nowrap text-rose-400 text-xs md:text-[13px] font-bold">{veh.stoppedHours}h</td>
                                  <td className="py-2 whitespace-nowrap text-rose-400 font-black text-xs md:text-[13px] text-right">{util}%</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Highest Working Commercial Fleet Card */}
                  <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-emerald-300 shadow-sm' : 'bg-[#060D1E] border-emerald-900/40 shadow-md'}`}>
                    <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b ${isLight ? 'border-emerald-200' : 'border-emerald-900/30'}`}>
                      <div className="flex items-center space-x-2">
                        <span className={`font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          HIGHEST WORKING FLEET
                        </span>
                        <span className="text-cyan-400 text-xs font-mono font-medium">• Today (Real-Time)</span>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 font-mono text-xs font-bold shadow-xs">
                        High Productivity
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono table-fixed border-collapse">
                        <colgroup>
                          <col style={{ width: '40px' }} />
                          <col style={{ width: '110px' }} />
                          <col style={{ width: '105px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '65px' }} />
                          <col style={{ width: '55px' }} />
                          <col style={{ width: '65px' }} />
                          <col style={{ width: '55px' }} />
                        </colgroup>
                        <thead>
                          <tr className={`text-[11px] uppercase tracking-wider ${isLight ? 'text-slate-700 border-slate-300' : 'text-slate-400 border-slate-800'} border-b font-bold`}>
                            <th className="pb-1.5 text-emerald-400 font-bold">RANK</th>
                            <th className={`pb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>VEHICLE NO</th>
                            <th className="pb-1.5 pr-2 text-cyan-400">MAKE</th>
                            <th className={`pb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>SITE LOCATION</th>
                            <th className="pb-1.5 text-emerald-400">WORKING</th>
                            <th className="pb-1.5 text-amber-400">IDLE</th>
                            <th className="pb-1.5 text-rose-400">STOPPED</th>
                            <th className="pb-1.5 text-emerald-400 text-right">UTIL %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-950/20">
                          {[...(drilldownData.rows || [])]
                            .sort((a, b) => (b.workingHours || 0) - (a.workingHours || 0))
                            .slice(0, 3)
                            .map((veh, idx) => {
                              const shiftH = veh.totalShiftHours || 12.0;
                              const util = Math.min(100, Math.max(0, Math.round(((veh.workingHours || 0) / shiftH) * 100)));
                              return (
                                <tr key={veh.id || veh.reg_no || idx} className="hover:bg-emerald-950/20 transition-colors">
                                  <td className="py-2">
                                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 font-black text-xs">
                                      #{idx + 1}
                                    </span>
                                  </td>
                                  <td className={`py-2 font-bold font-mono text-xs md:text-[13px] whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{veh.reg_no}</td>
                                  <td className="py-2 pr-2 text-cyan-400 whitespace-nowrap font-bold text-xs md:text-[13px]">{veh.make}</td>
                                  <td className={`py-2 pr-3 overflow-hidden text-xs md:text-[12.5px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                    <div className="truncate" title={veh.currentLocation}>
                                      {veh.currentLocation}
                                    </div>
                                  </td>
                                  <td className="py-2 whitespace-nowrap text-emerald-400 font-bold text-xs md:text-[13px]">{veh.workingHours}h</td>
                                  <td className="py-2 whitespace-nowrap text-amber-400 text-xs md:text-[13px] font-bold">{veh.idleHours}h</td>
                                  <td className="py-2 whitespace-nowrap text-rose-400 text-xs md:text-[13px] font-bold">{veh.stoppedHours}h</td>
                                  <td className="py-2 whitespace-nowrap text-emerald-400 font-black text-xs md:text-[13px] text-right">{util}%</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Two Smaller Summary Boxes for LATE_START: Fleets Started Late & Started On Time (Image 1 reference) */}
              {drilldownData?.boxKey === 'LATE_START' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl sm:max-w-3xl mb-2.5 shrink-0">
                  {/* Box 1: No. of Fleets Started Late */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    isLight ? 'bg-rose-50/90 border-rose-200 shadow-sm' : 'bg-[#140A14] border-rose-900/60 shadow-md'
                  }`}>
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 block mb-1">
                        No. of Fleets Started Late
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black font-['Chakra_Petch'] text-rose-400 leading-none">
                          3
                        </span>
                        <span className="text-xs font-mono text-rose-300 font-bold">
                          Fleets Delayed (&gt; 08:00 AM)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 mt-1.5 block">
                        Baseline Shift Departure: <strong className="text-amber-400">08:00 AM Sharp</strong>
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-600/80 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                      <AlertTriangle size={24} className="animate-pulse" />
                    </div>
                  </div>

                  {/* Box 2: No. of Fleets Started On Time */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    isLight ? 'bg-emerald-50/90 border-emerald-200 shadow-sm' : 'bg-[#061413] border-emerald-900/60 shadow-md'
                  }`}>
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                        No. of Fleets Started On Time
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black font-['Chakra_Petch'] text-emerald-400 leading-none">
                          7
                        </span>
                        <span className="text-xs font-mono text-emerald-300 font-bold">
                          Fleets On Schedule (≤ 08:00 AM)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 mt-1.5 block">
                        Schedule Compliance: <strong className="text-emerald-400">70% On-Time Dispatch</strong>
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-600/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                      <CheckCircle2 size={24} />
                    </div>
                  </div>
                </div>
              )}

              {/* Refuelling Slip Action Bar with Toggle Button */}
              {drilldownData?.boxKey === 'REFUEL_MISMATCH' && (
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRefuelSlipForm(prev => !prev)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 shadow-md cursor-pointer ${
                        showRefuelSlipForm
                          ? 'bg-amber-600 text-white shadow-amber-950/60'
                          : 'bg-[#0B152E] hover:bg-[#122246] text-amber-300 border border-amber-600/60'
                      }`}
                    >
                      <Plus size={14} className={showRefuelSlipForm ? "rotate-45 transition-transform" : "transition-transform"} />
                      <span>Log & Reconcile Refuel Slip</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      {showRefuelSlipForm ? 'Click button to hide form' : 'Click to enter physical refuelling slip details'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulateSensorOnlyRefuel}
                    className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600/70 text-rose-200 text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Simulate unverified refuel where sensor detected fuel (+175 L) but driver inserted NO slip"
                  >
                    <AlertTriangle size={13} className="text-rose-400" />
                    <span>⚠ Simulate Sensor Refuel Without Slip</span>
                  </button>
                </div>
              )}

              {/* Refuelling Slip vs Digital Sensor Input Form (Only visible when button clicked) */}
              {drilldownData?.boxKey === 'REFUEL_MISMATCH' && showRefuelSlipForm && (
                <div className={`p-3.5 sm:p-4 rounded-xl border mb-2.5 shrink-0 shadow-lg animate-in fade-in duration-150 ${
                  isLight ? 'bg-amber-50/90 border-amber-300' : 'bg-[#09152B]/95 border-amber-600/70'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-amber-900/40">
                    <div className="flex items-center gap-2">
                      <Fuel size={17} className="text-amber-400" />
                      <span className="text-xs sm:text-[13px] font-bold text-amber-200 uppercase font-['Chakra_Petch'] tracking-wide">
                        Physical Refuelling Slip Entry & Tank Sensor Reconciliation Audit
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] text-amber-300 font-mono bg-amber-950/90 px-2.5 py-0.5 rounded border border-amber-700/80">
                        Diesel Rate: ₹{DIESEL_RATE}/L • Sensor Cross-Check
                      </span>
                    </div>
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleAddRefuelSlip} className="space-y-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                      {/* Vehicle Number */}
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Vehicle *</label>
                        <select
                          value={newRefuelSlip.reg_no}
                          onChange={(e) => setNewRefuelSlip(p => ({ ...p, reg_no: e.target.value }))}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:border-amber-400 ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#040A18] border-amber-700/70 text-white'
                          }`}
                        >
                          {vehicles.map(v => (
                            <option key={v.id || v.reg_no} value={v.reg_no}>{v.reg_no} ({v.make})</option>
                          ))}
                        </select>
                      </div>

                      {/* Pump Slip Number */}
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Pump Slip No *</label>
                        <input
                          type="text"
                          placeholder="e.g. SLIP-HPCL-7740"
                          value={newRefuelSlip.fuel_slip_no}
                          onChange={(e) => setNewRefuelSlip(p => ({ ...p, fuel_slip_no: e.target.value }))}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:border-amber-400 ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#040A18] border-amber-700/70 text-white'
                          }`}
                        />
                      </div>

                      {/* Station Name */}
                      <div className="col-span-2 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Fuel Station Outlet *</label>
                        <input
                          type="text"
                          placeholder="e.g. HPCL COCO Pump, Sriperumbudur"
                          value={newRefuelSlip.station_name}
                          onChange={(e) => setNewRefuelSlip(p => ({ ...p, station_name: e.target.value }))}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:border-amber-400 ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#040A18] border-amber-700/70 text-white'
                          }`}
                        />
                      </div>

                      {/* Pump Slip Billed Liters */}
                      <div>
                        <label className="text-[10px] text-amber-300 block uppercase font-bold mb-1">Slip Quantity (L) *</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="180.0"
                          value={newRefuelSlip.slip_liters}
                          onChange={(e) => setNewRefuelSlip(p => ({ ...p, slip_liters: e.target.value }))}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:border-amber-400 ${
                            isLight ? 'bg-white border-amber-400 text-amber-900' : 'bg-[#040A18] border-amber-500 text-amber-300'
                          }`}
                        />
                      </div>

                      {/* Tank Sensor Rise */}
                      <div>
                        <label className="text-[10px] text-cyan-300 block uppercase font-bold mb-1">Sensor Rise (L) *</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="158.0"
                          value={newRefuelSlip.sensor_rise_liters}
                          onChange={(e) => setNewRefuelSlip(p => ({ ...p, sensor_rise_liters: e.target.value }))}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 ${
                            isLight ? 'bg-white border-cyan-400 text-cyan-900' : 'bg-[#040A18] border-cyan-500 text-cyan-300'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-900/40">
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span>Projected Reconciliation:</span>
                        {(() => {
                          const slip = parseFloat(newRefuelSlip.slip_liters) || 0;
                          const sensor = parseFloat(newRefuelSlip.sensor_rise_liters) || 0;
                          const diff = +(slip - sensor).toFixed(1);
                          if (diff > 0) {
                            return <span className="text-amber-400 font-bold">-{diff} L Shortfall (₹{Math.round(diff * DIESEL_RATE).toLocaleString()} Loss • DISCREPANCY)</span>;
                          } else if (diff === 0) {
                            return <span className="text-emerald-400 font-bold">0.0 L (₹0 Loss • EXACT MATCH)</span>;
                          }
                          return <span className="text-cyan-400 font-bold">+{Math.abs(diff)} L Extra In Tank</span>;
                        })()}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSimulateSensorOnlyRefuel}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-600/80 text-rose-200 text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          title="Simulate unverified refuel where sensor detected fuel (+175 L) but driver inserted NO slip"
                        >
                          <AlertTriangle size={13} className="text-rose-400" />
                          <span>⚠ Simulate Sensor Refuel Without Slip</span>
                        </button>

                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md shadow-amber-950/50 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>+ Log & Reconcile Refuel Slip</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Search Filter Bar with Integrated Scroller */}
              {drilldownData?.boxKey !== 'MOBILE_TRACKING' && (
              <div className={`p-2 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs mb-2.5 ${
                isLight ? 'bg-slate-100/90 border-slate-300' : 'bg-[#081022] border-slate-800'
              }`}>
                {/* Single Unified Search Bar with Filter Options written inside */}
                <div className="relative flex-1 min-w-[320px] flex items-center">
                  <Search size={14} className="absolute left-3.5 text-cyan-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={
                      drilldownData?.boxKey === 'E_WAY_BILL'
                        ? "Filter by E-Way Bill Number, Generation Date (DD/MM/YYYY), Vehicle Number..."
                        : drilldownData?.boxKey === 'DRIVER_DL'
                        ? "Filter by Driver Name or DL Number..."
                        : "Filter by Vehicle Number, Make, Model, Location..."
                    }
                    value={drilldownSearch}
                    onChange={(e) => setDrilldownSearch(e.target.value)}
                    className={`w-full pl-9 ${
                      drilldownData?.boxKey === 'E_WAY_BILL' ? 'pr-72 sm:pr-[370px]' : 'pr-48'
                    } py-2 rounded-lg border text-xs font-mono focus:outline-none focus:border-cyan-400 transition shadow-inner ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-[#040814] border-slate-700 text-slate-100 placeholder-slate-400'
                    }`}
                    autoFocus
                  />

                  {/* Filter options written right inside the search bar */}
                  <div className="absolute right-2.5 flex items-center gap-1 font-mono text-[11px]">
                    <span className="text-[10px] text-slate-500 uppercase mr-0.5 hidden sm:inline">Filter:</span>
                    {(drilldownData?.boxKey === 'E_WAY_BILL' ? [
                      { id: 'ALL', label: 'All' },
                      { id: 'eway_bill_no', label: 'E-Way Bill No' },
                      { id: 'gen_date', label: 'Gen Date (DD/MM/YYYY)' },
                      { id: 'reg_no', label: 'Vehicle No' }
                    ] : drilldownData?.boxKey === 'DRIVER_DL' ? [
                      { id: 'driver_name', label: 'Driver Name' },
                      { id: 'dl_number', label: 'DL Number' }
                    ] : [
                      { id: 'ALL', label: 'All' },
                      { id: 'reg_no', label: 'Vehicle No' },
                      { id: 'make', label: 'Make' }
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSearchColumn(opt.id)}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition whitespace-nowrap ${
                          searchColumn === opt.id
                            ? isLight
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/60 shadow-xs'
                            : isLight
                              ? 'text-slate-500 hover:text-slate-900'
                              : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title={`Filter specifically by ${opt.label}`}
                      >
                        {opt.label}
                      </button>
                    ))}

                    {drilldownSearch && (
                      <button 
                        onClick={() => setDrilldownSearch('')}
                        className="ml-1 text-slate-400 hover:text-white text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-800 transition"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Active Service Category Filter Chip */}
                  {drilldownData?.boxKey === 'SERVICE_DUE' && serviceFilter !== 'ALL' && (
                    <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono select-none ${
                      serviceFilter === 'URGENT' ? 'bg-rose-950/70 border-rose-700 text-rose-300' :
                      serviceFilter === 'DUE_SOON' ? 'bg-amber-950/70 border-amber-700 text-amber-300' :
                      'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                    }`}>
                      <span>Filtered: {serviceFilter === 'URGENT' ? 'URGENT (≤ 15H)' : serviceFilter === 'DUE_SOON' ? 'DUE SOON (≤ 50H)' : 'NORMAL (> 50H)'}</span>
                      <button
                        onClick={() => setServiceFilter('ALL')}
                        className="hover:text-white font-bold ml-1 text-xs"
                        title="Show all vehicles"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Active RTO Compliance Category Filter Chip */}
                  {drilldownData?.boxKey === 'RTO_COMPLIANCE' && rtoFilter !== 'ALL' && (
                    <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono select-none ${
                      rtoFilter === 'URGENT' ? 'bg-rose-950/70 border-rose-700 text-rose-300' :
                      rtoFilter === 'DUE_SOON' ? 'bg-amber-950/70 border-amber-700 text-amber-300' :
                      'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                    }`}>
                      <span>Filtered: {rtoFilter === 'URGENT' ? 'URGENT (≤ 15 DAYS)' : rtoFilter === 'DUE_SOON' ? 'DUE SOON (≤ 45 DAYS)' : 'NORMAL (> 45 DAYS)'}</span>
                      <button
                        onClick={() => setRtoFilter('ALL')}
                        className="hover:text-white font-bold ml-1 text-xs"
                        title="Show all vehicles"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Clean record count */}
                  <div className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Showing <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{filteredDrilldownRows.length}</span> of {displayRows.length} records
                  </div>
                </div>
              </div>
              )}

              {filteredDrilldownRows.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <AlertTriangle size={24} className="text-amber-500/60" />
                  <p className="text-sm">No vehicles match the search criteria.</p>
                  <button 
                    onClick={() => setDrilldownSearch('')}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                <div 
                  ref={tableScrollRef}
                  onScroll={handleTableScroll}
                  className={`border ${isLight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-[#070D1D]'} rounded-xl shadow-inner w-full ${
                    ['REFUEL_REQUIRED', 'IDLING_LOSS', 'HIGH_CPH', 'RTO_COMPLIANCE', 'MOBILE_TRACKING'].includes(drilldownData.boxKey) ? 'overflow-hidden' : 'overflow-x-auto'
                  }`}
                >
                  <table className="w-full text-left border-separate border-spacing-0 text-xs">
                    <thead className="sticky top-0 z-10 bg-[#070F26] shadow-md">
                      <tr className="text-slate-300 text-xs font-bold uppercase tracking-wider font-['Chakra_Petch']">
                        {['TOTAL_FLEET', 'WORKING', 'IDLE', 'STOPPED', 'LATE_START'].includes(drilldownData.boxKey) && (
                          <th className="py-2.5 px-2.5 text-center min-w-[100px] w-24 border-r border-b border-slate-700 bg-[#070F26]"># Performance Rank</th>
                        )}
                        {(drilldownData.columns || [])
                          .filter(col => col.key !== 'vehicle_id' && col.header !== 'Vehicle ID')
                          .map((col, idx) => (
                            <th 
                              key={idx} 
                              className={`${['REFUEL_REQUIRED', 'RTO_COMPLIANCE'].includes(drilldownData?.boxKey) ? 'py-2 px-1.5 text-[11px]' : 'py-2.5 px-2.5 text-xs'} whitespace-nowrap border-b border-slate-700 font-bold uppercase tracking-wider ${
                                isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#070F26] text-slate-300'
                              } border-r border-slate-800/40`}
                            >
                              {col.header}
                            </th>
                          ))}
                        {!['SIPHONING', 'DRIVER_DL', 'REFUEL_MISMATCH', 'IDLING_LOSS', 'HIGH_CPH', 'REFUEL_REQUIRED', 'CHALLANS', 'RTO_COMPLIANCE'].includes(drilldownData.boxKey) && (
                          <th className="py-2.5 px-2.5 text-right whitespace-nowrap border-b border-slate-700 text-xs font-bold uppercase tracking-wider">{drilldownData.boxKey === 'MOBILE_TRACKING' ? 'Locate' : 'GPS Map'}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono text-xs md:text-[12px] font-normal">
                      {filteredDrilldownRows.map((row, idx) => {
                        const targetVeh = vehicles.find(v => v.id === row.vehicle_id || v.reg_no === row.reg_no) || row;
                        const visibleCols = (drilldownData.columns || []).filter(col => col.key !== 'vehicle_id' && col.header !== 'Vehicle ID');
                        return (
                          <tr 
                            key={row.id || `${row.vehicle_id || row.reg_no}_${idx}`} 
                            className={`transition group ${isLight ? (idx % 2 === 0 ? 'bg-white hover:bg-cyan-50/60' : 'bg-slate-50/90 hover:bg-cyan-50/60') : (idx % 2 === 0 ? 'bg-[#081126]/60 hover:bg-cyan-950/30' : 'bg-[#050A18]/60 hover:bg-cyan-950/30')}`}
                          >
                            {['TOTAL_FLEET', 'WORKING', 'IDLE', 'STOPPED', 'LATE_START'].includes(drilldownData.boxKey) && (
                              <td className="py-2 px-2.5 text-center border-r border-slate-800/40">
                                {row.isTopPerformer ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <span className={`font-extrabold text-xs flex items-center gap-1 font-['Chakra_Petch'] ${
                                      row.rank === 1 ? 'text-amber-300' : row.rank === 2 ? 'text-slate-200' : 'text-amber-400'
                                    }`}>
                                      <span className="text-sm">{row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : '🥉'}</span>
                                      <span>#{row.rank || idx + 1}</span>
                                    </span>
                                    <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded border mt-0.5 whitespace-nowrap shadow-sm ${
                                      row.rank === 1 
                                        ? 'bg-amber-500/20 border-amber-400/80 text-amber-300' 
                                        : row.rank === 2 
                                        ? 'bg-slate-300/20 border-slate-300/80 text-slate-200' 
                                        : 'bg-amber-700/20 border-amber-600/80 text-amber-400'
                                    }`}>
                                      TOP PERFORMER
                                    </span>
                                  </div>
                                ) : row.isLeastPerformer ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-extrabold text-rose-400 text-xs flex items-center gap-1 font-['Chakra_Petch']">
                                      <span className="text-[11px]">⚠</span>
                                      <span>#{row.rank || idx + 1}</span>
                                    </span>
                                    <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-950/90 border border-rose-600 text-rose-300 mt-0.5 whitespace-nowrap shadow-sm">
                                      LEAST PERFORMER
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-slate-400 font-mono">
                                    <span className="font-bold text-slate-300 text-xs">#{row.rank || idx + 1}</span>
                                    <span className="text-[8.5px] text-slate-500 uppercase tracking-tight">Average</span>
                                  </div>
                                )}
                              </td>
                            )}
                            {visibleCols.map((col, cIdx) => (
                              <td 
                                key={cIdx} 
                                className={`${['REFUEL_REQUIRED', 'RTO_COMPLIANCE'].includes(drilldownData?.boxKey) ? 'py-1 px-1.5 text-[11px]' : 'py-1.5 px-2.5 text-xs'} text-xs ${isLight ? 'text-slate-800 border-slate-200' : 'text-slate-200 border-slate-800/80'} border-b transition-colors border-r border-slate-800/20 ${
                                  ['location_name', 'currentLocation', 'route_name'].includes(col.key) 
                                    ? 'whitespace-normal' 
                                    : 'whitespace-nowrap'
                                }`}
                              >
                                {col.render ? col.render(row, idx) : (row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-')}
                              </td>
                            ))}
                            {!['SIPHONING', 'DRIVER_DL', 'REFUEL_MISMATCH', 'IDLING_LOSS', 'HIGH_CPH', 'REFUEL_REQUIRED', 'CHALLANS', 'RTO_COMPLIANCE'].includes(drilldownData.boxKey) && (
                              <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    const modalVeh = {
                                      ...targetVeh,
                                      ...row,
                                      driverName: row.driver_name || targetVeh.driver_name,
                                      currentLocationName: row.location || targetVeh.location,
                                      assignedRoute: row.location ? `Live Corridor: ${row.location}` : targetVeh.assignedRoute
                                    };
                                    setRouteModalVehicle(modalVeh);
                                  }}
                                  className="px-2.5 py-1 rounded bg-blue-950/80 hover:bg-blue-800 text-cyan-300 hover:text-white border border-cyan-600/70 text-xs font-bold font-mono transition inline-flex items-center space-x-1 shadow-sm hover:shadow-cyan-500/20 active:scale-95 cursor-pointer"
                                  title={drilldownData.boxKey === 'MOBILE_TRACKING' ? `Locate ${row.driver_name || row.reg_no} on live map` : "Open GPS Route Map (Blue Planned Corridor & Red Deviated Path)"}
                                >
                                  <MapPin size={12} className="text-cyan-400" />
                                  <span>{drilldownData.boxKey === 'MOBILE_TRACKING' ? 'Locate' : 'Map'}</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 bg-[#070D1D] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <div className="flex items-center space-x-2">
                {drilldownData.boxKey === 'SIPHONING' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Showing MTD Audit Report (Latest First) • 12-Month Audit Report available via "Export 12-Month Report (Excel)"</span>
                  </>
                ) : !['TOTAL_FLEET', 'WORKING', 'IDLE', 'STOPPED', 'LATE_START'].includes(drilldownData.boxKey) ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Showing MTD Report • 12-Month Audit Report available via "Export 12-Month Report (Excel)"</span>
                  </>
                ) : null}
              </div>
              <div className="flex items-center space-x-3 ml-auto">
                <button
                  onClick={() => setDrilldownData(null)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Planned Route to Vehicle Modal */}
      {plannedRouteModalOpen && (
        <AssignPlannedRouteModal
          vehicles={vehicles}
          selectedVehicleId={routeAssignTargetVehId}
          onClose={() => setPlannedRouteModalOpen(false)}
          onRouteAssigned={({ vehicle }) => {
            // Update local vehicles state so new route shows everywhere
            setVehicles(prev => prev.map(v => 
              (v.id === vehicle.id || v.reg_no === vehicle.reg_no) ? { ...v, ...vehicle } : v
            ));
          }}
          onOpenMap={(targetVeh) => {
            setPlannedRouteModalOpen(false);
            setRouteModalVehicle(targetVeh);
          }}
        />
      )}

      {/* Route GPS Corridor & Deviation Map Modal */}
      {routeModalVehicle && (
        <VehicleRouteMapModal
          vehicle={routeModalVehicle}
          vehicles={vehicles}
          onClose={() => setRouteModalVehicle(null)}
          onAssignRoute={(v) => {
            setRouteModalVehicle(null);
            setRouteAssignTargetVehId(v.id || v.vehicle_id);
            setPlannedRouteModalOpen(true);
          }}
        />
      )}

      {/* Onboard New Driver Modal */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="bg-[#0A1226] border border-purple-500/70 rounded-2xl w-full max-w-xl shadow-2xl shadow-purple-950/70 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-[#0D1836] border-b border-purple-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus size={18} className="text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase font-['Chakra_Petch'] tracking-wide">
                  Onboard New Driver to Fleet Database
                </h3>
              </div>
              <button 
                onClick={() => setOnboardModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Driver Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Deshmukh"
                    value={newDriverForm.driver_name}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, driver_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Mobile Phone Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98450 11223"
                    value={newDriverForm.driver_phone}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, driver_phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Driver License (DL) Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-14-2020-0012948"
                    value={newDriverForm.dl_number}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, dl_number: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-cyan-300 font-mono text-xs uppercase focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Issuing RTO & State *</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-14 Pimpri Chinchwad RTO"
                    value={newDriverForm.issuing_rto}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, issuing_rto: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Authorized Vehicle Classes *</label>
                  <input
                    type="text"
                    placeholder="e.g. TRANS / HCV-Articulated & Heavy Commercial"
                    value={newDriverForm.dl_class}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, dl_class: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Endorsements</label>
                  <input
                    type="text"
                    placeholder="e.g. HAZMAT / National Freight Corridor"
                    value={newDriverForm.endorsements}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, endorsements: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Is DL Commercial? *</label>
                  <select
                    value={newDriverForm.is_commercial ? 'yes' : 'no'}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, is_commercial: e.target.value === 'yes' }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-amber-300 font-mono text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value="yes">Yes - Commercial (TRANS / HCV)</option>
                    <option value="no">No - Non-Commercial (Private LMV)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">DL Expiry Date *</label>
                  <input
                    type="date"
                    value={newDriverForm.expiry_date}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Joining Date *</label>
                  <input
                    type="date"
                    value={newDriverForm.joining_date}
                    onChange={(e) => setNewDriverForm(p => ({ ...p, joining_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#081022] border-t border-purple-900/50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Will be registered with active status in driver master.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOnboard}
                  disabled={!newDriverForm.driver_name.trim() || !newDriverForm.dl_number.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md shadow-emerald-950/60"
                >
                  <Check size={14} />
                  <span>Confirm Onboard Driver</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit / Offboard Driver Confirmation Modal */}
      {exitDriverTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="bg-[#0A1226] border border-rose-500/70 rounded-2xl w-full max-w-md shadow-2xl shadow-rose-950/70 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-[#140810] border-b border-rose-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserMinus size={18} className="text-rose-400" />
                <h3 className="text-sm font-bold text-white uppercase font-['Chakra_Petch'] tracking-wide">
                  Exit Driver from Organization
                </h3>
              </div>
              <button 
                onClick={() => setExitDriverTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50">
                <span className="text-[10px] text-rose-300 uppercase font-bold block mb-1">Driver Details</span>
                <span className="text-white font-bold text-sm block">{exitDriverTarget.driver_name}</span>
                <span className="text-slate-400 text-xs font-mono block">ID: {exitDriverTarget.driver_id} • DL: {exitDriverTarget.dl_number}</span>
                <span className="text-slate-400 text-xs font-mono block">Current Class: {exitDriverTarget.dl_class}</span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Exit Date *</label>
                <input
                  type="date"
                  value={exitDateInput}
                  onChange={(e) => setExitDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">Exit Reason / Separation Category *</label>
                <select
                  value={exitReasonInput}
                  onChange={(e) => setExitReasonInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#050B1A] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
                >
                  <option value="Voluntary Resignation">Voluntary Resignation</option>
                  <option value="Contract Completed / Mutual Separation">Contract Completed / Mutual Separation</option>
                  <option value="DL Expired / Renewal Discontinued">DL Expired / Renewal Discontinued</option>
                  <option value="Safety & Traffic Violation Disqualification">Safety &amp; Traffic Violation Disqualification</option>
                  <option value="Medical / Fitness Ineligibility">Medical / Fitness Ineligibility</option>
                  <option value="Other Administrative Ground">Other Administrative Ground</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                The driver record will be moved to the <strong>Exited / Offboarded</strong> archive. Historical logs and past trip associations are preserved.
              </p>
            </div>

            <div className="px-5 py-3.5 bg-[#081022] border-t border-rose-900/50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setExitDriverTarget(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExitDriver}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md shadow-rose-950/60"
              >
                <UserMinus size={14} />
                <span>Confirm Exit Driver</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
