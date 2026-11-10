import React, { useState, useMemo } from 'react';
import { 
  Layers, Download, FileSpreadsheet, FileText, Search, Calendar, 
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, AlertOctagon, Fuel, 
  Zap, Gauge, Clock, ShieldAlert, Navigation, Truck, Weight, 
  ThermometerSnowflake, X, Filter, Printer, ExternalLink, Info, 
  ArrowLeft, Home, BellRing, Phone, User, MapPin, Check
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// Standard Report Timeframe Options (as per HDD software reference)
const DURATION_TIMEFRAMES = [
  { id: 'today', label: 'Today', short: 'Today' },
  { id: 'yesterday', label: "Y'day (Yesterday)", short: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days', short: 'Last 7 Days' },
  { id: 'last_1_month', label: 'Last 1 Month', short: 'Last 1 Month' },
  { id: 'last_3_months', label: 'Last 3 Months', short: 'Last 3 Months' },
  { id: 'last_6_months', label: 'Last 6 Months', short: 'Last 6 Months' },
  { id: 'last_1_year', label: 'Last 1 Year', short: 'Last 1 Year' }
];

// 10 Monitored Heavy Commercial Vehicles in the Fleet
const TRUCK_FLEET = [
  { id: 'VH-101', reg_no: 'MH-12-RN-8842', code: 'TRK-01', model: 'Tata Signa 4825.TK (16-Wheeler)', category: 'heavy', driver: 'Rajesh Gurjar', phone: '+91 98230 44120', location: 'Samruddhi Mahamarg km 194' },
  { id: 'VH-102', reg_no: 'DL-01-AB-1234', code: 'TRK-02', model: 'Ashok Leyland 2820 (Multi-Axle)', category: 'multi', driver: 'Vikram Singh', phone: '+91 98110 55231', location: 'NH48 Kotputli Corridor' },
  { id: 'VH-103', reg_no: 'KA-04-E-5678', code: 'TRK-03', model: 'BharatBenz 3528C (Heavy Haulage)', category: 'heavy', driver: 'Manoj Yadav', phone: '+91 97410 88219', location: 'Sriperumbudur Loading Bay 4' },
  { id: 'VH-104', reg_no: 'GJ-06-TC-9988', code: 'TRK-04', model: 'Volvo FMX 460 (Tipper/Trailer)', category: 'multi', driver: 'Suresh Patel', phone: '+91 98250 66341', location: 'Vadodara-Surat Highway km 74' },
  { id: 'VH-105', reg_no: 'HR-55-B-4321', code: 'TRK-05', model: 'Mahindra Blazo X 35 (Multi-Axle)', category: 'multi', driver: 'Harpreet Singh', phone: '+91 98720 11984', location: 'Gurgaon Central Logistics Yard' },
  { id: 'VH-106', reg_no: 'MH-04-KF-7721', code: 'TRK-06', model: 'Eicher Pro 6028 (Heavy Tipper)', category: 'heavy', driver: 'Dinesh Shinde', phone: '+91 98190 33452', location: 'IOCL Highway Station, Vijayawada' },
  { id: 'VH-107', reg_no: 'RJ-14-GH-6655', code: 'TRK-07', model: 'Tata Prima 5530.S (Tractor Trailer)', category: 'heavy', driver: 'Ramesh Sharma', phone: '+91 94140 77123', location: 'NH48 Kotputli Industrial Area' },
  { id: 'VH-108', reg_no: 'UP-32-MN-2200', code: 'TRK-08', model: 'Ashok Leyland 3520 (Twin Steer)', category: 'multi', driver: 'Anil Verma', phone: '+91 94520 99411', location: 'Varanasi Bypass Freight Hub' },
  { id: 'VH-109', reg_no: 'TN-09-XY-3344', code: 'TRK-09', model: 'BharatBenz 2823R (Haulage Truck)', category: 'heavy', driver: 'Karthik Raja', phone: '+91 98400 22345', location: 'Hosur Industrial Corridor' },
  { id: 'VH-110', reg_no: 'WB-19-JK-8811', code: 'TRK-10', model: 'Scania G440 (Heavy Haulage)', category: 'heavy', driver: 'Subhash Ghosh', phone: '+91 98310 77654', location: 'Dankuni Freight Terminal' }
];

// 19 Standard Alert Violations Covering All Chronological Alerts from Vertical Section
const ALERT_VIOLATIONS = [
  {
    id: 'FUEL_SIPHONING',
    label: 'Fuel Siphoning / Theft',
    icon: '🚨',
    severity: 'CRIT',
    category: 'Fuel Security',
    description: 'Sudden dip in fuel tank sensor level (> 5L) during halt or parking'
  },
  {
    id: 'REFUEL_DONE',
    label: 'Refuelling Done',
    icon: '⛽',
    severity: 'INFO',
    category: 'Fuel Operations',
    description: 'Verified positive digital tank sensor volume rise indicating refueling'
  },
  {
    id: 'REFUEL_MISMATCH',
    label: 'Refueling Qty Mismatch (Gap)',
    icon: '⚠️',
    severity: 'HIGH',
    category: 'Fuel Audit',
    description: 'Discrepancy between fuel slip / card bill and digital sensor rise'
  },
  {
    id: 'HARSH_BRAKING',
    label: 'Harsh Braking Alert',
    icon: '🛑',
    severity: 'HIGH',
    category: 'Driver Safety',
    description: 'Emergency deceleration exceeding -10 km/h/s indicating panic braking'
  },
  {
    id: 'SHARP_CORNERING',
    label: 'Sharp Cornering Spike',
    icon: '⚡',
    severity: 'HIGH',
    category: 'Driver Safety',
    description: 'Aggressive lateral acceleration (> 0.35G) around curve with rollover risk'
  },
  {
    id: 'OVERSPEEDING',
    label: 'Over speeding (> 60 km/h)',
    icon: '⚡',
    severity: 'HIGH',
    category: 'Driver Safety',
    description: 'Vehicle exceeding highway safe speed ceiling or 2x monthly avg'
  },
  {
    id: 'AXLE_OVERWEIGHT',
    label: 'Axle Overweight Limit',
    icon: '⚖️',
    severity: 'CRIT',
    category: 'Payload & WIM',
    description: 'Electronic axle sensor weight exceeding legal permit Gross Vehicle Weight'
  },
  {
    id: 'AXLE_IMBALANCE',
    label: 'Axle Load Imbalance',
    icon: '⚖️',
    severity: 'HIGH',
    category: 'Payload & Safety',
    description: 'Uneven cargo loading causing cross-axle load skew exceeding 18%'
  },
  {
    id: 'CARGO_TEMP_INCREASING',
    label: 'Cargo Temp Increasing (Reefer)',
    icon: '❄️',
    severity: 'CRIT',
    category: 'Cold Chain',
    description: 'Temperature deviation exceeding allowable cold room threshold'
  },
  {
    id: 'EWAY_EXPIRING',
    label: 'E-Way Bill Expiring (< 4h)',
    icon: '⏳',
    severity: 'WARN',
    category: 'GST & Compliance',
    description: 'Consignment E-Way Bill nearing 4h expiry with pending route distance'
  },
  {
    id: 'CHALLAN_PENDING',
    label: 'Challan Pending (Parivahan)',
    icon: '📋',
    severity: 'WARN',
    category: 'Legal & RTO',
    description: 'Unpaid traffic or WIM axle overload e-challan recorded on Parivahan'
  },
  {
    id: 'GEOFENCE_WORKING',
    label: 'Geofence Working Breach',
    icon: '📍',
    severity: 'CRIT',
    category: 'Corridor & Geo',
    description: 'Vehicle exiting designated active delivery route corridor (> 40km)'
  },
  {
    id: 'GEOFENCE_PARKING',
    label: 'Geofence Night Parking Breach',
    icon: '🌙',
    severity: 'CRIT',
    category: 'Yard Security',
    description: 'Vehicle parked outside authorized night rest yard after curfew hours'
  },
  {
    id: 'TOWING_ALERT',
    label: 'Towing Alert',
    icon: '🚜',
    severity: 'CRIT',
    category: 'Asset Security',
    description: 'GPS movement detected while vehicle engine ignition remains OFF'
  },
  {
    id: 'BATTERY_DISCONNECT',
    label: 'Battery Disconnected',
    icon: '🔋',
    severity: 'CRIT',
    category: 'Hardware Tamper',
    description: 'Main vehicle battery disconnected or physical tamper wire triggered'
  },
  {
    id: 'EXCESSIVE_STOPPAGE',
    label: 'Stoppage (> 2h)',
    icon: '🛑',
    severity: 'WARN',
    category: 'Trip Efficiency',
    description: 'Vehicle ignition is OFF and vehicle is stationary for more than 2 hours'
  },
  {
    id: 'LATE_START',
    label: 'Late Start (after 08:00 AM)',
    icon: '⏰',
    severity: 'WARN',
    category: 'Dispatch Schedule',
    description: 'First departure of the morning delayed beyond 08:00 AM shift start'
  },
  {
    id: 'IDLE_ALERT',
    label: 'Idling (> 15 min)',
    icon: '⏱️',
    severity: 'WARN',
    category: 'Fuel Efficiency',
    description: 'Vehicle ignition is ON and vehicle is stationary for more than 15 minutes'
  },
  {
    id: 'EXCESSIVE_IDLE',
    label: 'Excessive Idle (> 30 min)',
    icon: '⏳',
    severity: 'CRIT',
    category: 'Fuel Efficiency',
    description: 'Vehicle ignition is ON and vehicle is stationary for more than 30 minutes'
  }
];

// Rich Incident Database cross-tabulated across the 19 alert types and 10 vehicles
const RAW_INCIDENTS = [
  // 1. Fuel Siphoning / Theft (3 incidents)
  {
    id: 'ALT-1001',
    alert_type: 'FUEL_SIPHONING',
    vehicle_id: 'VH-101',
    time: '11:42 AM',
    location: 'Samruddhi Mahamarg km 194 Dhaba Point',
    metric: '28.5 Liters Loss (₹2,679)',
    details: 'Sudden drop of 28.5L detected in Fuel Tank.',
    impact_inr: 2679,
    status: 'PENDING'
  },
  {
    id: 'ALT-1021',
    alert_type: 'FUEL_SIPHONING',
    vehicle_id: 'VH-104',
    time: '04:15 AM',
    location: 'Vadodara Bypass Rest Area, NH48',
    metric: '42.0 Liters Loss (₹3,948)',
    details: 'Sudden drop of 42.0L detected in Fuel Tank.',
    impact_inr: 3948,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1022',
    alert_type: 'FUEL_SIPHONING',
    vehicle_id: 'VH-110',
    time: '02:30 AM',
    location: 'Dankuni Highway Shoulder Link, WB',
    metric: '35.0 Liters Loss (₹3,290)',
    details: 'Sudden drop of 35.0L detected in Fuel Tank.',
    impact_inr: 3290,
    status: 'PENDING'
  },

  // 2. Refuelling Done (2 incidents)
  {
    id: 'ALT-1013',
    alert_type: 'REFUEL_DONE',
    vehicle_id: 'VH-102',
    time: '08:30 AM',
    location: 'BPCL COCO Plaza Hub, Delhi-Jaipur Expressway (KM 84)',
    metric: '+380.0 Liters Added (₹35,720)',
    details: 'Refuelling detected! Your vehicle number DL-01-AB-1234 has added 380 litres of fuel at BPCL COCO Plaza Hub, Delhi-Jaipur Expressway (KM 84), at 08:30 AM.',
    impact_inr: 0,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1023',
    alert_type: 'REFUEL_DONE',
    vehicle_id: 'VH-106',
    time: '06:30 AM',
    location: 'IOCL Highway Station, Vijayawada',
    metric: '+370.0 Liters Added (₹34,780)',
    details: 'Refuelling detected! Your vehicle number MH-04-KF-7721 has added 370 litres of fuel at IOCL Highway Station, Vijayawada, at 06:30 AM.',
    impact_inr: 0,
    status: 'RESOLVED'
  },

  // 3. Refueling Qty Mismatch (Gap) (2 incidents)
  {
    id: 'ALT-1002',
    alert_type: 'REFUEL_MISMATCH',
    vehicle_id: 'VH-102',
    time: '11:15 AM',
    location: 'HPCL COCO Pump, Sriperumbudur',
    metric: '22.0L Shortfall (₹2,068)',
    details: 'Slip / Card statement recorded 180.0L but digital tank sensor rise was only 158.0L. Discrepancy gap of 22.0L detected.',
    impact_inr: 2068,
    status: 'PENDING'
  },
  {
    id: 'ALT-1024',
    alert_type: 'REFUEL_MISMATCH',
    vehicle_id: 'VH-105',
    time: '09:45 AM',
    location: 'Indian Oil Swagat Plaza, Bilaspur NH48',
    metric: '18.5L Shortfall (₹1,739)',
    details: 'Bunk billing statement shows 200.0L filled against 181.5L physical sensor jump. Supervisor notified for pump calibration cross-audit.',
    impact_inr: 1739,
    status: 'ACKNOWLEDGED'
  },

  // 4. Harsh Braking Alert (3 incidents)
  {
    id: 'ALT-1014',
    alert_type: 'HARSH_BRAKING',
    vehicle_id: 'VH-101',
    time: '11:58 AM',
    location: 'Samruddhi Mahamarg km 194, Jalna',
    metric: '-14.2 km/h/s (3.9s)',
    details: 'Harsh braking detected! Your vehicle number MH-12-RN-8842 has experienced sudden deceleration. Please check driver safety & ensure safe driving practices.',
    impact_inr: 0,
    status: 'PENDING'
  },
  {
    id: 'ALT-1025',
    alert_type: 'HARSH_BRAKING',
    vehicle_id: 'VH-103',
    time: '10:14 AM',
    location: 'Bangalore-Chennai Highway Toll Plaza Approach',
    metric: '-12.8 km/h/s (2.8s)',
    details: 'Harsh braking detected! Your vehicle number KA-04-MB-4190 has experienced sudden deceleration. Please check driver safety & ensure safe driving practices.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1026',
    alert_type: 'HARSH_BRAKING',
    vehicle_id: 'VH-107',
    time: '07:22 AM',
    location: 'Kotputli Toll Plaza km 138',
    metric: '-13.5 km/h/s (3.1s)',
    details: 'Harsh braking detected! Your vehicle number UP-32-HN-1244 has experienced sudden deceleration. Please check driver safety & ensure safe driving practices.',
    impact_inr: 0,
    status: 'RESOLVED'
  },

  // 5. Sharp Cornering Spike (2 incidents)
  {
    id: 'ALT-1015',
    alert_type: 'SHARP_CORNERING',
    vehicle_id: 'VH-104',
    time: '11:35 AM',
    location: 'NH48 Vadodara-Surat Highway Curve km 74',
    metric: '0.48G Lateral (62 km/h)',
    details: 'Aggressive steering at 62 km/h around sharp curve triggered 0.48G lateral acceleration, exceeding safe rollover threshold (0.35G).',
    impact_inr: 0,
    status: 'PENDING'
  },
  {
    id: 'ALT-1027',
    alert_type: 'SHARP_CORNERING',
    vehicle_id: 'VH-108',
    time: '08:50 AM',
    location: 'Varanasi Ring Road Interchange Bend',
    metric: '0.42G Lateral (58 km/h)',
    details: 'Laden 35T trailer negotiated interchange ramp at elevated speed. Lateral gyro alarm logged into driver scorecard.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },

  // 6. Over speeding (> 60 km/h) (4 incidents)
  {
    id: 'ALT-1011',
    alert_type: 'OVERSPEEDING',
    vehicle_id: 'VH-101',
    time: '07:20 AM',
    location: 'Samruddhi Expressway stretch km 142',
    metric: '88 km/h (Limit: 60 km/h)',
    details: 'Cruising speed 88.0 km/h exceeded commercial fleet ceiling of 60.0 km/h for 14 continuous minutes.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1028',
    alert_type: 'OVERSPEEDING',
    vehicle_id: 'VH-103',
    time: '09:05 AM',
    location: 'Hosur-Krishnagiri Expressway km 58',
    metric: '76 km/h (Limit: 60 km/h)',
    details: 'Overspeeding Alert! Your vehicle is travelling at 76 km/h against the permitted limit of 60 km/h. Please maintain speed limits and ensure safe driving.',
    impact_inr: 0,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1029',
    alert_type: 'OVERSPEEDING',
    vehicle_id: 'VH-106',
    time: '10:40 AM',
    location: 'NH16 Guntur-Vijayawada Highway',
    metric: '74 km/h (Limit: 60 km/h)',
    details: 'Over-speed sustained across toll bypass stretch. Alert notification delivered to duty supervisor.',
    impact_inr: 0,
    status: 'PENDING'
  },
  {
    id: 'ALT-1030',
    alert_type: 'OVERSPEEDING',
    vehicle_id: 'VH-107',
    time: '11:02 AM',
    location: 'Jaipur Outer Ring Road km 32',
    metric: '79 km/h (Limit: 60 km/h)',
    details: 'Over-speed event logged during empty return leg. Voice safety prompt broadcasted to driver cab.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },

  // 7. Axle Overweight Limit (2 incidents)
  {
    id: 'ALT-1018',
    alert_type: 'AXLE_OVERWEIGHT',
    vehicle_id: 'VH-102',
    time: '07:55 AM',
    location: 'Shahpura Weigh Bridge, NH48',
    metric: '29,400 kg (+1,400 kg Over)',
    details: 'Electronic axle sensor weight recorded 29,400 kg against legal permit GVW of 28,000 kg (+1,400 kg overload). WIM penalty risk.',
    impact_inr: 2000,
    status: 'PENDING'
  },
  {
    id: 'ALT-1031',
    alert_type: 'AXLE_OVERWEIGHT',
    vehicle_id: 'VH-103',
    time: '10:30 AM',
    location: 'Sriperumbudur Hub Automated Weighbridge',
    metric: '36,800 kg (+1,800 kg Over)',
    details: 'Gross vehicle weight exceeds legal ceiling of 35,000 kg. Loading supervisor instructed to offload excess steel billets.',
    impact_inr: 2000,
    status: 'PENDING'
  },

  // 8. Axle Load Imbalance (2 incidents)
  {
    id: 'ALT-1019',
    alert_type: 'AXLE_IMBALANCE',
    vehicle_id: 'VH-107',
    time: '10:48 AM',
    location: 'Kotputli Industrial Area Gate 2',
    metric: '22.4% Axle Skew (> 18%)',
    details: 'Cargo shift detected: Drive axle 1 carries 11,200 kg while drive axle 2 carries only 8,700 kg (22.4% imbalance vs 18% limit).',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1032',
    alert_type: 'AXLE_IMBALANCE',
    vehicle_id: 'VH-109',
    time: '08:12 AM',
    location: 'Hosur Manufacturing Yard',
    metric: '19.8% Axle Skew (> 18%)',
    details: 'Asymmetrical pallet placement caused left-hand suspension bogie stress. Re-palletizing requested.',
    impact_inr: 0,
    status: 'RESOLVED'
  },

  // 9. Cargo Temp Increasing (Reefer) (2 incidents)
  {
    id: 'ALT-1020',
    alert_type: 'CARGO_TEMP_INCREASING',
    vehicle_id: 'VH-102',
    time: '08:15 AM',
    location: 'Near Shahpura Toll Plaza, RJ',
    metric: '-12.3°C (Target: -18.0°C)',
    details: 'Pharma cargo cold room temperature rose +5.7°C above target setpoint (-18.0°C). Compressor cycle duty trip detected.',
    impact_inr: 15000,
    status: 'PENDING'
  },
  {
    id: 'ALT-1033',
    alert_type: 'CARGO_TEMP_INCREASING',
    vehicle_id: 'VH-108',
    time: '11:10 AM',
    location: 'Varanasi Cold Hub Gate 1',
    metric: '+6.8°C (Target: +2.0°C)',
    details: 'Dairy cargo thermal breach due to rear door ajar condition during prolonged unloading bay idle.',
    impact_inr: 8500,
    status: 'PENDING'
  },

  // 10. E-Way Bill Expiring (< 4h) (2 incidents)
  {
    id: 'ALT-1016',
    alert_type: 'EWAY_EXPIRING',
    vehicle_id: 'VH-102',
    time: '11:10 AM',
    location: 'NH48 Kotputli Corridor, RJ',
    metric: 'Expires in 3h 15m (142 km left)',
    details: 'E-Way Bill #2819-2847-1920 (Consignment ₹28.5L) expires in 3h 15m. Truck has 142 km remaining to terminal.',
    impact_inr: 0,
    status: 'PENDING'
  },
  {
    id: 'ALT-1034',
    alert_type: 'EWAY_EXPIRING',
    vehicle_id: 'VH-105',
    time: '10:00 AM',
    location: 'Gurgaon Express Highway km 28',
    metric: 'Expires in 3h 45m (110 km left)',
    details: 'GST E-Way Bill #8921-0455-3210 (Consignment ₹31.0L) valid until 01:45 PM. Dispatch coordinator alerted to request portal extension.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },

  // 11. Challan Pending (Parivahan) (2 incidents)
  {
    id: 'ALT-1017',
    alert_type: 'CHALLAN_PENDING',
    vehicle_id: 'VH-101',
    time: '09:15 AM',
    location: 'Samruddhi Mahamarg KM 142',
    metric: '₹2,000 Overload Fine Due',
    details: 'Parivahan e-Challan #MH24102600491 generated by Maha Highway Police for dynamic WIM axle overload. Unpaid for 48 hours.',
    impact_inr: 2000,
    status: 'PENDING'
  },
  {
    id: 'ALT-1035',
    alert_type: 'CHALLAN_PENDING',
    vehicle_id: 'VH-105',
    time: '08:30 AM',
    location: 'NH48 Bilaspur Industrial Crossing',
    metric: '₹1,000 Lane Violation Fine',
    details: 'MoRTH automated camera challan #HR24102600128 for commercial lane restriction violation.',
    impact_inr: 1000,
    status: 'RESOLVED'
  },

  // 12. Geofence Working Breach (2 incidents)
  {
    id: 'ALT-1005',
    alert_type: 'GEOFENCE_WORKING',
    vehicle_id: 'VH-105',
    time: '10:05 AM',
    location: 'State Highway 19, Dausa link',
    metric: '56.4 km Off Corridor',
    details: 'Geofence Breach Alert! Your vehicle number HR-55-B-4321 has deviated 56.4 km from its designated route. Please verify the vehicle\'s location and check route deviation authorization.',
    impact_inr: 0,
    status: 'PENDING'
  },
  {
    id: 'ALT-1036',
    alert_type: 'GEOFENCE_WORKING',
    vehicle_id: 'VH-107',
    time: '09:20 AM',
    location: 'Beawar Bypass Detour Link, RJ',
    metric: '44.8 km Off Corridor',
    details: 'Geofence Breach Alert! Your vehicle number UP-32-HN-1244 has deviated 44.8 km from its designated route. Please verify the vehicle\'s location and check route deviation authorization.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },

  // 13. Geofence Night Parking Breach (2 incidents)
  {
    id: 'ALT-1037',
    alert_type: 'GEOFENCE_PARKING',
    vehicle_id: 'VH-106',
    time: '01:45 AM',
    location: 'Vijayawada Outer Ring Highway Layby',
    metric: 'Parked Outside Yard (4.2h)',
    details: 'Night Parking Breach detected! Your vehicle number MH-04-KF-7721 is parked outside the approved parking zone during designated night hours. Please take necessary action to ensure vehicle safety.',
    impact_inr: 0,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1038',
    alert_type: 'GEOFENCE_PARKING',
    vehicle_id: 'VH-109',
    time: '02:15 AM',
    location: 'Hosur Highway Service Road Dhaba',
    metric: 'Parked Outside Yard (3.8h)',
    details: 'Night Parking Breach detected! Your vehicle number RJ-14-GH-6621 is parked outside the approved parking zone during designated night hours. Please take necessary action to ensure vehicle safety.',
    impact_inr: 0,
    status: 'PENDING'
  },

  // 14. Towing Alert (3 incidents)
  {
    id: 'ALT-1039',
    alert_type: 'TOWING_ALERT',
    vehicle_id: 'VH-101',
    time: '03:10 AM',
    location: 'Samruddhi Mahamarg Service Lane',
    metric: 'Moving at 32 km/h (Ignition OFF)',
    details: 'Towing Alert! Unauthorised vehicle movement detected while the ignition is OFF. Please verify the vehicle\'s location and check for possible towing or unauthorised movement.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1040',
    alert_type: 'TOWING_ALERT',
    vehicle_id: 'VH-103',
    time: '04:40 AM',
    location: 'Sriperumbudur Yard Shunting Track',
    metric: 'Moving at 14 km/h (Ignition OFF)',
    details: 'Internal yard tractor shunted the trailer while primary tractor engine was cold. Operator verified.',
    impact_inr: 0,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1041',
    alert_type: 'TOWING_ALERT',
    vehicle_id: 'VH-108',
    time: '02:50 AM',
    location: 'Varanasi Bypass Toll Approach',
    metric: 'Moving at 28 km/h (Ignition OFF)',
    details: 'Unauthorized towing event detected on highway link. Highway patrol contacted.',
    impact_inr: 0,
    status: 'PENDING'
  },

  // 15. Battery Disconnected (2 incidents)
  {
    id: 'ALT-1042',
    alert_type: 'BATTERY_DISCONNECT',
    vehicle_id: 'VH-104',
    time: '05:15 AM',
    location: 'Vadodara Transport Nagar Bay 12',
    metric: 'Internal Battery Backup Active (3.7V)',
    details: 'Main 24V vehicle battery terminal severed or disconnected. Telematics unit running on internal Li-ion backup battery.',
    impact_inr: 0,
    status: 'PENDING'
  },
  {
    id: 'ALT-1043',
    alert_type: 'BATTERY_DISCONNECT',
    vehicle_id: 'VH-109',
    time: '01:20 AM',
    location: 'Hosur Terminal Parking Bay',
    metric: 'Main Terminal Power Cut',
    details: 'Hardware tamper switch opened during overnight maintenance. Fleet electrician verified master kill switch test.',
    impact_inr: 0,
    status: 'RESOLVED'
  },

  // 16. Stoppage (> 2h) (4 incidents)
  {
    id: 'ALT-1044',
    alert_type: 'EXCESSIVE_STOPPAGE',
    vehicle_id: 'VH-101',
    time: '09:30 AM',
    location: 'Samruddhi Expressway Rest Plaza',
    metric: 'Halted for 2h 45m (Ignition OFF)',
    details: 'Vehicle ignition is OFF and vehicle stationary for 2h 45m (> 2h threshold).',
    impact_inr: 0,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1045',
    alert_type: 'EXCESSIVE_STOPPAGE',
    vehicle_id: 'VH-105',
    time: '10:15 AM',
    location: 'Dharuhera Industrial Gate, NH48',
    metric: 'Halted for 3h 10m (Ignition OFF)',
    details: 'Vehicle ignition is OFF and vehicle stationary for 3h 10m (> 2h threshold).',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1046',
    alert_type: 'EXCESSIVE_STOPPAGE',
    vehicle_id: 'VH-109',
    time: '11:25 AM',
    location: 'Krishnagiri Border Checkpost',
    metric: 'Halted for 2h 20m (Ignition OFF)',
    details: 'Vehicle ignition is OFF and vehicle stationary for 2h 20m (> 2h threshold).',
    impact_inr: 0,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1047',
    alert_type: 'EXCESSIVE_STOPPAGE',
    vehicle_id: 'VH-110',
    time: '08:40 AM',
    location: 'Dankuni Toll Approach Staging Line',
    metric: 'Halted for 2h 55m (Ignition OFF)',
    details: 'Vehicle ignition is OFF and vehicle stationary for 2h 55m (> 2h threshold).',
    impact_inr: 0,
    status: 'PENDING'
  },

  // 17. Late Start (after 08:00 AM) (3 incidents)
  {
    id: 'ALT-1006',
    alert_type: 'LATE_START',
    vehicle_id: 'VH-103',
    time: '08:42 AM',
    location: 'Sriperumbudur Central Depot',
    metric: '08:42 AM First Motion (+42m)',
    details: 'Late Start Alert! Vehicle number KA-04-E-5678 commenced its trip later than the scheduled departure time.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1048',
    alert_type: 'LATE_START',
    vehicle_id: 'VH-105',
    time: '09:15 AM',
    location: 'Gurgaon Central Logistics Yard',
    metric: '09:15 AM First Motion (+1h 15m)',
    details: 'Late Start Alert! Vehicle number HR-55-B-4321 commenced its trip later than the scheduled departure time.',
    impact_inr: 0,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1049',
    alert_type: 'LATE_START',
    vehicle_id: 'VH-108',
    time: '08:55 AM',
    location: 'Lucknow Transport Nagar Depot',
    metric: '08:55 AM First Motion (+55m)',
    details: 'Late Start Alert! Vehicle number UP-32-BN-3490 commenced its trip later than the scheduled departure time.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },

  // 18. Excessive Idle (> 30 min) (5 incidents)
  {
    id: 'ALT-1003',
    alert_type: 'EXCESSIVE_IDLE',
    vehicle_id: 'VH-102',
    time: '10:50 AM',
    location: 'Kotputli Loading Bay 2',
    metric: '45 mins Idling (> 30m, 4.8 L Wasted)',
    details: 'Idling Alert! Vehicle number DL-01-AB-1234 remained idle for 45 minutes at Kotputli Loading Bay 2, resulting in 4.8 litres of diesel wasted in idling (approx. ₹451).',
    impact_inr: 451,
    status: 'PENDING'
  },
  {
    id: 'ALT-1050',
    alert_type: 'EXCESSIVE_IDLE',
    vehicle_id: 'VH-104',
    time: '09:20 AM',
    location: 'Vadodara Toll Plaza Queue',
    metric: '38 mins Idling (> 30m, 3.9 L Wasted)',
    details: 'Idling Alert! Vehicle number MH-04-E-4567 remained idle for 38 minutes at Vadodara Toll Plaza Queue, resulting in 3.9 litres of diesel wasted in idling (approx. ₹367).',
    impact_inr: 367,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1051',
    alert_type: 'EXCESSIVE_IDLE',
    vehicle_id: 'VH-107',
    time: '07:45 AM',
    location: 'Jaipur Bypass Highway Dhaba',
    metric: '52 mins Idling (> 30m, 5.4 L Wasted)',
    details: 'Idling Alert! Vehicle number RJ-14-GH-9012 remained idle for 52 minutes at Jaipur Bypass Highway Dhaba, resulting in 5.4 litres of diesel wasted in idling (approx. ₹508).',
    impact_inr: 508,
    status: 'PENDING'
  },
  {
    id: 'ALT-1052',
    alert_type: 'EXCESSIVE_IDLE',
    vehicle_id: 'VH-110',
    time: '10:35 AM',
    location: 'Dankuni Freight Hub Gate 4',
    metric: '34 mins Idling (> 30m, 3.6 L Wasted)',
    details: 'Idling Alert! Vehicle number WB-19-J-9988 remained idle for 34 minutes at Dankuni Freight Hub Gate 4, resulting in 3.6 litres of diesel wasted in idling (approx. ₹338).',
    impact_inr: 338,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1053',
    alert_type: 'TOWING_ALERT',
    vehicle_id: 'VH-106',
    time: '04:10 AM',
    location: 'Vijayawada Outer Ring Road Service Track',
    metric: 'Moving at 18 km/h (Ignition OFF)',
    details: 'Yard shunting detected by geofence sensor while engine switched off.',
    impact_inr: 0,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1054',
    alert_type: 'BATTERY_DISCONNECT',
    vehicle_id: 'VH-102',
    time: '03:40 AM',
    location: 'Kotputli Logistics Hub Secure Bay',
    metric: 'Main Terminal Disconnected',
    details: 'Main terminal disconnected during auxiliary battery trickle charge inspection.',
    impact_inr: 0,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1055',
    alert_type: 'LATE_START',
    vehicle_id: 'VH-107',
    time: '08:48 AM',
    location: 'Jaipur Logistics Hub Terminal 2',
    metric: '08:48 AM First Motion (+48m)',
    details: 'Late Start Alert! Vehicle number RJ-14-GH-9012 commenced its trip later than the scheduled departure time.',
    impact_inr: 0,
    status: 'PENDING'
  },
  {
    id: 'ALT-1056',
    alert_type: 'EXCESSIVE_IDLE',
    vehicle_id: 'VH-106',
    time: '09:10 AM',
    location: 'Vijayawada IOCL Station Waiting Lane',
    metric: '32 mins Idling (> 30m, 3.4 L Wasted)',
    details: 'Idling Alert! Vehicle number MH-04-KF-7721 remained idle for 32 minutes at Vijayawada IOCL Station Waiting Lane, resulting in 3.4 litres of diesel wasted in idling (approx. ₹320).',
    impact_inr: 320,
    status: 'RESOLVED'
  },

  // 19. Idling (> 15 min) (4 incidents)
  {
    id: 'ALT-1060',
    alert_type: 'IDLE_ALERT',
    vehicle_id: 'VH-103',
    time: '11:15 AM',
    location: 'Sriperumbudur Loading Bay 4',
    metric: '18 mins Idling (> 15m, 1.9 L Wasted)',
    details: 'Idling Alert! Vehicle number KA-04-E-5678 remained idle for 18 minutes at Sriperumbudur Loading Bay 4, resulting in 1.9 litres of diesel wasted in idling (approx. ₹178).',
    impact_inr: 178,
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'ALT-1061',
    alert_type: 'IDLE_ALERT',
    vehicle_id: 'VH-105',
    time: '01:25 PM',
    location: 'Dharuhera Toll Plaza Staging Area',
    metric: '22 mins Idling (> 15m, 2.3 L Wasted)',
    details: 'Idling Alert! Vehicle number HR-55-B-4321 remained idle for 22 minutes at Dharuhera Toll Plaza Staging Area, resulting in 2.3 litres of diesel wasted in idling (approx. ₹216).',
    impact_inr: 216,
    status: 'PENDING'
  },
  {
    id: 'ALT-1062',
    alert_type: 'IDLE_ALERT',
    vehicle_id: 'VH-108',
    time: '02:40 PM',
    location: 'Varanasi Bypass Freight Hub Entry',
    metric: '24 mins Idling (> 15m, 2.5 L Wasted)',
    details: 'Idling Alert! Vehicle number UP-32-BN-3490 remained idle for 24 minutes at Varanasi Bypass Freight Hub Entry, resulting in 2.5 litres of diesel wasted in idling (approx. ₹235).',
    impact_inr: 235,
    status: 'RESOLVED'
  },
  {
    id: 'ALT-1063',
    alert_type: 'IDLE_ALERT',
    vehicle_id: 'VH-101',
    time: '04:10 PM',
    location: 'Samruddhi Mahamarg Rest Stop',
    metric: '27 mins Idling (> 15m, 2.8 L Wasted)',
    details: 'Idling Alert! Vehicle number MH-12-RN-8842 remained idle for 27 minutes at Samruddhi Mahamarg Rest Stop, resulting in 2.8 litres of diesel wasted in idling (approx. ₹263).',
    impact_inr: 263,
    status: 'PENDING'
  }
];

export default function AlertReportDashboard({ onReturnHome }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Filters state
  const [selectedDuration, setSelectedDuration] = useState('Today');
  const [durationDropdownOpen, setDurationDropdownOpen] = useState(false);
  const [fleetFilter, setFleetFilter] = useState('all'); // 'all', 'heavy', 'multi'
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL'); // 'ALL', 'CRIT', 'HIGH', 'WARN', 'INFO'

  // Drilldown modal state
  const [drilldownModal, setDrilldownModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    incidents: [],
    vehicleInfo: null,
    alertInfo: null
  });

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return TRUCK_FLEET.filter(v => {
      if (fleetFilter !== 'all' && v.category !== fleetFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.reg_no.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.driver.toLowerCase().includes(q)
      );
    });
  }, [fleetFilter, searchQuery]);

  // Filtered alert definitions
  const filteredAlerts = useMemo(() => {
    return ALERT_VIOLATIONS.filter(a => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.label.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    });
  }, [severityFilter, searchQuery]);

  // Matrix cell lookup: { [alert_id]: { [vehicle_id]: Incident[] } }
  const matrixData = useMemo(() => {
    const map = {};
    ALERT_VIOLATIONS.forEach(a => {
      map[a.id] = {};
      TRUCK_FLEET.forEach(v => {
        map[a.id][v.id] = [];
      });
    });

    RAW_INCIDENTS.forEach(inc => {
      if (map[inc.alert_type] && map[inc.alert_type][inc.vehicle_id]) {
        map[inc.alert_type][inc.vehicle_id].push(inc);
      }
    });

    return map;
  }, []);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalAlerts = RAW_INCIDENTS.length;
    const activeVehicles = TRUCK_FLEET.length;
    const theftIncidents = RAW_INCIDENTS.filter(i => i.alert_type === 'FUEL_SIPHONING');
    const fuelTheftImpact = theftIncidents.reduce((sum, i) => sum + (i.impact_inr || 0), 0);
    const totalRefueledQty = 750; // Liters
    const dieselRate = 94.00; // INR/L
    const totalRefueledAmt = Math.round(totalRefueledQty * dieselRate);

    return {
      totalAlerts,
      activeVehicles,
      fuelTheftImpact,
      totalRefueledQty,
      dieselRate,
      totalRefueledAmt
    };
  }, []);

  // Row Totals (Total per alert type across filtered vehicles)
  const rowTotals = useMemo(() => {
    const totals = {};
    ALERT_VIOLATIONS.forEach(a => {
      totals[a.id] = filteredVehicles.reduce((sum, v) => {
        const count = matrixData[a.id]?.[v.id]?.length || 0;
        return sum + count;
      }, 0);
    });
    return totals;
  }, [matrixData, filteredVehicles]);

  // Column Totals (Total per vehicle across filtered alerts)
  const colTotals = useMemo(() => {
    const totals = {};
    TRUCK_FLEET.forEach(v => {
      totals[v.id] = filteredAlerts.reduce((sum, a) => {
        const count = matrixData[a.id]?.[v.id]?.length || 0;
        return sum + count;
      }, 0);
    });
    return totals;
  }, [matrixData, filteredAlerts]);

  // Grand Total of all displayed cells
  const grandTotal = useMemo(() => {
    return filteredVehicles.reduce((sum, v) => sum + (colTotals[v.id] || 0), 0);
  }, [filteredVehicles, colTotals]);

  // Cell click handler
  const handleCellClick = (alertDef, vehicle) => {
    const incidents = matrixData[alertDef.id]?.[vehicle.id] || [];
    if (incidents.length === 0) return;

    setDrilldownModal({
      isOpen: true,
      title: `${alertDef.label} Audit Log`,
      subtitle: `Vehicle: ${vehicle.reg_no} (${vehicle.id}) • Driver: ${vehicle.driver}`,
      incidents,
      vehicleInfo: vehicle,
      alertInfo: alertDef
    });
  };

  // Row Total click handler
  const handleRowTotalClick = (alertDef) => {
    const allIncidentsForAlert = [];
    filteredVehicles.forEach(v => {
      const list = matrixData[alertDef.id]?.[v.id] || [];
      allIncidentsForAlert.push(...list);
    });

    if (allIncidentsForAlert.length === 0) return;

    setDrilldownModal({
      isOpen: true,
      title: `All Fleet Incidents: ${alertDef.label}`,
      subtitle: `${allIncidentsForAlert.length} Violations Recorded Across Active Fleet`,
      incidents: allIncidentsForAlert,
      vehicleInfo: null,
      alertInfo: alertDef
    });
  };

  // Column Total click handler
  const handleColTotalClick = (vehicle) => {
    const allIncidentsForVehicle = [];
    filteredAlerts.forEach(a => {
      const list = matrixData[a.id]?.[vehicle.id] || [];
      allIncidentsForVehicle.push(...list);
    });

    if (allIncidentsForVehicle.length === 0) return;

    setDrilldownModal({
      isOpen: true,
      title: `All Violations for ${vehicle.reg_no}`,
      subtitle: `${vehicle.model} • Driver: ${vehicle.driver} (${vehicle.phone})`,
      incidents: allIncidentsForVehicle,
      vehicleInfo: vehicle,
      alertInfo: null
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Alert Violation', 'Severity', 'Category', ...filteredVehicles.map(v => `${v.reg_no} (${v.id})`), 'Total'];
    const rows = filteredAlerts.map(a => {
      const rowCounts = filteredVehicles.map(v => matrixData[a.id]?.[v.id]?.length || 0);
      const total = rowTotals[a.id] || 0;
      return [
        `"${a.label}"`,
        a.severity,
        `"${a.category}"`,
        ...rowCounts,
        total
      ];
    });

    // Add totals row
    const totalsRow = [
      '"TOTAL VIOLATIONS"',
      '""',
      '""',
      ...filteredVehicles.map(v => colTotals[v.id] || 0),
      grandTotal
    ];
    rows.push(totalsRow);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Axona_TruckFleet_Alert_Report_Matrix_${selectedDuration}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel (.xlsx/.xls HTML format)
  const handleExportExcel = () => {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <h2>AXONA AI FLEET ANALYTICS - ALERT & REPORT MATRIX</h2>
        <p>Report Range: ${selectedDuration} | Generated: ${new Date().toLocaleString('en-IN')}</p>
        <p>Total Recorded Alerts: ${summaryMetrics.totalAlerts} | Fuel Theft Loss: ₹${summaryMetrics.fuelTheftImpact.toLocaleString('en-IN')}</p>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">
          <tr style="background:#0a1936;color:#ffffff;font-weight:bold;">
            <th>Alert Violation</th>
            <th>Severity</th>
            <th>Category</th>
            ${filteredVehicles.map(v => `<th>${v.reg_no}<br/><small>${v.id}</small></th>`).join('')}
            <th>TOTAL</th>
          </tr>
          ${filteredAlerts.map(a => `
            <tr>
              <td><b>${a.label}</b></td>
              <td>${a.severity}</td>
              <td>${a.category}</td>
              ${filteredVehicles.map(v => {
                const count = matrixData[a.id]?.[v.id]?.length || 0;
                return `<td align="center" style="font-weight:${count > 0 ? 'bold' : 'normal'};background:${count > 0 ? (a.severity === 'CRIT' ? '#ffebee' : a.severity === 'HIGH' ? '#fff8e1' : '#e0f7fa') : '#ffffff'}">${count > 0 ? count : '-'}</td>`;
              }).join('')}
              <td align="center" style="font-weight:bold;background:#eceff1;">${rowTotals[a.id] || 0}</td>
            </tr>
          `).join('')}
          <tr style="background:#0f274a;color:#00ffff;font-weight:bold;">
            <td colspan="3">TOTAL VIOLATIONS</td>
            ${filteredVehicles.map(v => `<td align="center">${colTotals[v.id] || 0}</td>`).join('')}
            <td align="center" style="background:#00ffff;color:#000000;">${grandTotal}</td>
          </tr>
        </table>
        <p><small>DISCLAIMER: Auto-generated audit report developed by Axona AI Smart Intelligence.</small></p>
      </body>
      </html>
    `;
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Axona_TruckFleet_Alert_Matrix_${selectedDuration}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print PDF matrix
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans select-none ${isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#060B18] text-slate-100'}`}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & EXPORT ACTIONS                                */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0A1128] border-[#1E2E56]'}`}>
        
        {/* Title + Badges + Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-950/40 text-cyan-400">
            <Layers size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className={`text-base font-extrabold uppercase tracking-wide font-['Chakra_Petch'] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                ALERT & REPORT DASHBOARD
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shadow-xs ${
                isLight ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/50'
              }`}>
                Truck Fleet (10 Units)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shadow-xs ${
                isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
              }`}>
                {selectedDuration}
              </span>
            </div>
            <p className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Cross-tabulated audit matrix: All Alerts (Rows) × All Vehicles (Columns). Click any cell count to view drilldown details.
            </p>
          </div>
        </div>

        {/* Action Buttons: PDF, Excel, CSV, Home */}
        <div className="flex items-center space-x-2">
          {/* Export PDF Matrix */}
          <button
            onClick={handlePrintPdf}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border shadow-xs transition active:scale-95 cursor-pointer ${
              isLight 
                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300' 
                : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/60 shadow-sm'
            }`}
            title="Export printable PDF Matrix"
          >
            <Download size={13} />
            <span>Export PDF Matrix</span>
          </button>

          {/* Export Excel (.xlsx) */}
          <button
            onClick={handleExportExcel}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border shadow-xs transition active:scale-95 cursor-pointer ${
              isLight 
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300' 
                : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/60 shadow-sm'
            }`}
            title="Download Excel spreadsheet"
          >
            <FileSpreadsheet size={13} />
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* CSV */}
          <button
            onClick={handleExportCsv}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border shadow-sm transition active:scale-95 cursor-pointer ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600'
            }`}
            title="Download Raw CSV"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>

          {/* Return Home Pill */}
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm transition active:scale-95 cursor-pointer ml-1"
              title="Return to Executive NOC"
            >
              <Home size={13} />
              <span>Home (Esc)</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FILTER & SEARCH CONTROLS BAR                              */}
      {/* ------------------------------------------------------------- */}
      <div className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#091124] border-[#1E2E56]'}`}>
        
        <div className="flex items-center space-x-2">
          {/* Duration Selector Dropdown (Styled as per HDD Reference Image 2) */}
          <div className="relative">
            <button
              onClick={() => setDurationDropdownOpen(prev => !prev)}
              className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl text-xs font-mono font-bold border transition cursor-pointer shadow-md ${
                isLight 
                  ? 'bg-white border-slate-300 text-slate-800 hover:border-cyan-600 shadow-xs' 
                  : 'bg-[#09152B] border-cyan-500/70 text-white hover:border-cyan-400 shadow-cyan-950/40'
              }`}
            >
              <Calendar size={15} className="text-cyan-400 shrink-0" />
              <span className="tracking-wide">
                Duration: <span className="text-cyan-300 font-extrabold">{selectedDuration}</span>
              </span>
              {durationDropdownOpen ? (
                <ChevronUp size={15} className="text-cyan-400 shrink-0 ml-0.5" />
              ) : (
                <ChevronDown size={15} className="text-cyan-400 shrink-0 ml-0.5" />
              )}
            </button>

            {durationDropdownOpen && (
              <>
                {/* Backdrop to close on click outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setDurationDropdownOpen(false)} 
                />
                
                <div className={`absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl border z-50 overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-800 shadow-slate-400/50' 
                    : 'bg-[#081326] border-cyan-500/50 text-slate-200 shadow-cyan-950/80 backdrop-blur-md'
                }`}>
                  {/* Dropdown Header from Image 2 */}
                  <div className={`px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider border-b ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-[#060E1E] border-[#102347] text-slate-400'
                  }`}>
                    SELECT REPORT TIMEFRAME
                  </div>

                  {/* Dropdown Options List */}
                  <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-[#102347]/50'}`}>
                    {DURATION_TIMEFRAMES.map(item => {
                      const isSelected = selectedDuration === item.label;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedDuration(item.label);
                            setDurationDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? (isLight 
                                  ? 'bg-cyan-50 text-cyan-800 font-bold border-l-2 border-cyan-600' 
                                  : 'bg-cyan-950/70 text-cyan-300 font-bold border-l-2 border-cyan-400')
                              : (isLight 
                                  ? 'hover:bg-slate-100 text-slate-700' 
                                  : 'hover:bg-cyan-500/10 text-slate-300 hover:text-white')
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Clock size={14} className={`shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                            <span className="text-[12px]">{item.label}</span>
                          </div>
                          
                          {/* Cyan dot indicator for selected option matching Image 2 */}
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Fleet Filter Tabs */}
          <div className={`flex items-center p-0.5 rounded-lg border text-xs font-mono ${
            isLight ? 'bg-slate-200/90 border-slate-300' : 'bg-[#0D1730] border-slate-700/60'
          }`}>
            <button
              onClick={() => setFleetFilter('all')}
              className={`px-3 py-1 rounded-md transition font-bold ${
                fleetFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : (isLight ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50' : 'text-slate-400 hover:text-white')
              }`}
            >
              All Trucks (10 Units)
            </button>
            <button
              onClick={() => setFleetFilter('heavy')}
              className={`px-3 py-1 rounded-md transition font-bold ${
                fleetFilter === 'heavy'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : (isLight ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50' : 'text-slate-400 hover:text-white')
              }`}
            >
              Heavy Haulage (6 Units)
            </button>
            <button
              onClick={() => setFleetFilter('multi')}
              className={`px-3 py-1 rounded-md transition font-bold ${
                fleetFilter === 'multi'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : (isLight ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50' : 'text-slate-400 hover:text-white')
              }`}
            >
              Multi-Axle (4 Units)
            </button>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative w-64">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle ID, model, alert..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-mono border focus:outline-none transition ${
              isLight 
                ? 'bg-white border-slate-300 text-slate-800 focus:border-cyan-600' 
                : 'bg-[#0D1730] border-slate-700 text-slate-200 focus:border-cyan-500'
            }`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-slate-400 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. METRICS SUMMARY & SEVERITY LEGEND STRIP                     */}
      {/* ------------------------------------------------------------- */}
      <div className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0 ${
        isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#080E20] border-[#1E2E56] text-slate-300'
      }`}>
        {/* Metric stats */}
        <div className="flex items-center space-x-3 flex-wrap">
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Total Recorded Alerts:</span>
            <span className="font-bold text-cyan-400 font-['Chakra_Petch'] text-sm">{summaryMetrics.totalAlerts}</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Active Monitored Vehicles:</span>
            <span className={`font-bold font-['Chakra_Petch'] text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {summaryMetrics.activeVehicles}
            </span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Fuel Theft Impact:</span>
            <span className="font-bold text-rose-400 font-['Chakra_Petch'] text-sm">₹{summaryMetrics.fuelTheftImpact.toLocaleString('en-IN')}</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center space-x-1 text-emerald-400">
            <Fuel size={13} className="shrink-0" />
            <span className="text-slate-400">Total Refuelled Qty:</span>
            <span className="font-bold font-mono">+{summaryMetrics.totalRefueledQty} L</span>
            <span className="text-slate-400">•</span>
            <span className="font-bold font-mono">₹{summaryMetrics.totalRefueledAmt.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-500 font-mono">(Diesel Rate: ₹{summaryMetrics.dieselRate.toFixed(2)}/L)</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Critical Alert</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>High Alert</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Warning / Info</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400/90 font-mono text-[10.5px]">💡 Click any cell number to see full incident details</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. CROSS-TABULATED AUDIT MATRIX TABLE                          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-auto p-3">
        <div className={`rounded-xl border overflow-hidden shadow-2xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#080F22] border-[#1E2E56]'
        }`}>
          <table className="w-full text-left border-collapse text-xs font-mono">
            {/* Table Header Row */}
            <thead>
              <tr className={`border-b text-[10.5px] uppercase tracking-wider ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#0B1530] border-[#1E2E56] text-cyan-300'
              }`}>
                {/* Column 1: Alert Violation Header */}
                <th className={`py-2.5 px-3 min-w-[240px] max-w-[280px] sticky left-0 z-20 bg-inherit ${
                  isLight ? 'border-r border-slate-200' : 'border-r border-[#1E2E56]/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold font-['Chakra_Petch'] tracking-wide">ALERT VIOLATION</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      isLight ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    }`}>
                      ({filteredAlerts.length})
                    </span>
                  </div>
                </th>

                {/* Columns 2 to N: Vehicles */}
                {filteredVehicles.map(veh => (
                  <th key={veh.id} className={`py-2 px-2 text-center min-w-[100px] ${
                    isLight ? 'border-r border-slate-200' : 'border-r border-[#1E2E56]/40'
                  }`}>
                    <div className={`font-bold font-mono text-xs whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {veh.reg_no}
                    </div>
                  </th>
                ))}

                {/* Rightmost Column: Total */}
                <th className={`py-2 px-3 text-center min-w-[80px] font-extrabold font-['Chakra_Petch'] ${
                  isLight ? 'bg-slate-200/80 text-slate-900 border-l border-slate-200' : 'bg-[#0E1B3E] text-cyan-300'
                }`}>
                  TOTAL
                </th>
              </tr>
            </thead>

            {/* Table Body Rows (All 19 Alerts) */}
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-[#1E2E56]/30'}`}>
              {filteredAlerts.map((alertDef, rowIdx) => {
                const totalForRow = rowTotals[alertDef.id] || 0;
                
                // Severity tag badge style
                let sevBadge = '';
                if (alertDef.severity === 'CRIT') {
                  sevBadge = isLight ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold' : 'bg-rose-950/80 text-rose-300 border-rose-700/60';
                } else if (alertDef.severity === 'HIGH') {
                  sevBadge = isLight ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : 'bg-amber-950/80 text-amber-300 border-amber-700/60';
                } else {
                  sevBadge = isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold' : 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
                }

                return (
                  <tr 
                    key={alertDef.id} 
                    className={`transition duration-100 ${
                      rowIdx % 2 === 0 
                        ? (isLight ? 'bg-white' : 'bg-[#080F22]') 
                        : (isLight ? 'bg-slate-50/60' : 'bg-[#0A132A]/60')
                    } hover:bg-cyan-500/5`}
                  >
                    {/* Alert Label & Badge */}
                    <td className={`py-2 px-3 sticky left-0 z-10 font-medium ${
                      rowIdx % 2 === 0 
                        ? (isLight ? 'bg-white border-r border-slate-200' : 'bg-[#080F22] border-r border-[#1E2E56]/60') 
                        : (isLight ? 'bg-slate-50 border-r border-slate-200' : 'bg-[#0A132A] border-r border-[#1E2E56]/60')
                    }`}>
                      <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="text-sm shrink-0">{alertDef.icon}</span>
                          <span className={`text-xs font-semibold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`} title={alertDef.description}>
                            {alertDef.label}
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${sevBadge}`}>
                          {alertDef.severity}
                        </span>
                      </div>
                    </td>

                    {/* Columns: Count for each Vehicle */}
                    {filteredVehicles.map(veh => {
                      const count = matrixData[alertDef.id]?.[veh.id]?.length || 0;
                      
                      // Cell badge colors matching reference with light theme support
                      let pillClass = '';
                      if (alertDef.severity === 'CRIT') {
                        pillClass = isLight 
                          ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300 font-bold shadow-xs' 
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50 border-rose-400';
                      } else if (alertDef.severity === 'HIGH') {
                        pillClass = isLight 
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-bold shadow-xs' 
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50 border-amber-400';
                      } else {
                        pillClass = isLight 
                          ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border-cyan-300 font-bold shadow-xs' 
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50 border-cyan-400';
                      }

                      return (
                        <td 
                          key={veh.id} 
                          className={`py-1.5 px-2 text-center ${isLight ? 'border-r border-slate-200' : 'border-r border-[#1E2E56]/30'}`}
                        >
                          {count > 0 ? (
                            <button
                              onClick={() => handleCellClick(alertDef, veh)}
                              className={`w-7 h-6 rounded-md font-bold text-xs inline-flex items-center justify-center border shadow-xs transition transform hover:scale-110 active:scale-95 cursor-pointer ${pillClass}`}
                              title={`Click to view ${count} incidents of ${alertDef.label} for ${veh.reg_no}`}
                            >
                              {count}
                            </button>
                          ) : (
                            <span className={`${isLight ? 'text-slate-400' : 'text-slate-600'} font-mono text-xs select-none`}>-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Column for this Alert */}
                    <td className={`py-1.5 px-3 text-center ${
                      isLight ? 'border-l border-slate-200 bg-slate-50' : 'border-l border-[#1E2E56]/60 bg-[#0A1535]/80'
                    }`}>
                      {totalForRow > 0 ? (
                        <button
                          onClick={() => handleRowTotalClick(alertDef)}
                          className={`w-8 h-6 rounded-md font-bold text-xs inline-flex items-center justify-center border transition transform hover:scale-110 active:scale-95 cursor-pointer ${
                            isLight 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-xs' 
                              : 'bg-cyan-950/90 text-cyan-300 border-cyan-600 hover:bg-cyan-900'
                          }`}
                          title={`Click to view all ${totalForRow} incidents for ${alertDef.label}`}
                        >
                          {totalForRow}
                        </button>
                      ) : (
                        <span className={`${isLight ? 'text-slate-400' : 'text-slate-600'} font-mono text-xs`}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Bottom Row: Total Violations per Vehicle */}
              <tr className={`border-t-2 font-bold ${
                isLight ? 'bg-slate-100 border-t-2 border-slate-300 text-slate-900' : 'bg-[#0A1432] border-cyan-500/40 text-cyan-300'
              }`}>
                {/* Total Violations Label */}
                <td className={`py-2.5 px-3 sticky left-0 z-20 uppercase tracking-wider font-['Chakra_Petch'] ${
                  isLight ? 'bg-slate-100 border-r border-slate-200 text-slate-900' : 'bg-[#0A1432] border-r border-[#1E2E56]/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">TOTAL VIOLATIONS</span>
                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Sum</span>
                  </div>
                </td>

                {/* Per-Vehicle Total Pills */}
                {filteredVehicles.map(veh => {
                  const total = colTotals[veh.id] || 0;
                  return (
                    <td key={veh.id} className={`py-2 px-2 text-center ${isLight ? 'border-r border-slate-200' : 'border-r border-[#1E2E56]/40'}`}>
                      <button
                        onClick={() => handleColTotalClick(veh)}
                        className={`w-7 h-6 rounded-md font-bold text-xs inline-flex items-center justify-center border transition transform hover:scale-110 active:scale-95 cursor-pointer ${
                          isLight 
                            ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border-cyan-300 shadow-xs' 
                            : 'bg-cyan-950 text-cyan-300 border-cyan-500 hover:bg-cyan-900'
                        }`}
                        title={`Click to view all ${total} violations for ${veh.reg_no}`}
                      >
                        {total}
                      </button>
                    </td>
                  );
                })}

                {/* Grand Total */}
                <td className={`py-2 px-3 text-center ${
                  isLight ? 'border-l border-slate-300 bg-cyan-600 text-white' : 'border-l border-[#1E2E56]/60 bg-cyan-500 text-slate-950'
                }`}>
                  <span className="font-black font-['Chakra_Petch'] text-sm">
                    {grandTotal}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. FOOTER DISCLAIMER                                          */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono shrink-0 ${
        isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#060B18] border-[#1E2E56] text-slate-400'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-cyan-400">DISCLAIMER:</span>
          <span>
            This is an auto-generated report developed by Axona AI Smart Intelligence for the sole use of its clients. Data is system-generated, and Axona AI Smart Intelligence shall not be responsible for any discrepancy, inaccuracy, or error arising from the data or system.
          </span>
        </div>
        <div className="font-bold text-slate-500 whitespace-nowrap">
          Axona 24x7 Audit System
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. INTERACTIVE DRILLDOWN MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {drilldownModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden font-mono ${
            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0A1329] border-[#1E2E56] text-slate-100'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0D1730] border-[#1E2E56]'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className={`text-base font-bold font-['Chakra_Petch'] uppercase tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {drilldownModal.title}
                    </h2>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    }`}>
                      Approx Fuel Price: ₹94.0/L
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {drilldownModal.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrilldownModal({ isOpen: false, title: '', subtitle: '', incidents: [], vehicleInfo: null, alertInfo: null })}
                className={`p-1.5 rounded-lg transition ${
                  isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Incident Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {drilldownModal.incidents.map((inc, idx) => {
                const targetVeh = TRUCK_FLEET.find(v => v.id === inc.vehicle_id);
                const vehicleReg = targetVeh ? targetVeh.reg_no : (inc.reg_no || inc.vehicle_id);

                return (
                <div 
                  key={inc.id || idx}
                  className={`p-3.5 rounded-xl border transition shadow-sm space-y-2.5 ${
                    isLight ? 'bg-white border-slate-200 hover:border-cyan-500 shadow-xs' : 'bg-[#070D1E] border-[#1E2E56] hover:border-cyan-500/60'
                  }`}
                >
                  {/* Incident Header (Removed ALT- alert id as per request 4) */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-bold font-['Chakra_Petch'] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {inc.alert_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{inc.time}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Request 5: Show Fuel price (approx) for understanding the loss in amount */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
                        isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-600/70'
                      }`} title="Calculated using government benchmark diesel rate">
                        <span>Approx Fuel Price:</span>
                        <span className={isLight ? 'text-amber-950 font-black' : 'text-white font-extrabold'}>₹94.0/L</span>
                      </span>

                      {inc.impact_inr > 0 && (
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                          isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                        }`}>
                          Loss: ₹{inc.impact_inr.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        inc.status === 'RESOLVED' 
                          ? (isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-700')
                          : inc.status === 'ACKNOWLEDGED' 
                              ? (isLight ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-950 text-cyan-300 border-cyan-700')
                              : (isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950 text-rose-300 border-rose-700')
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                  </div>

                  {/* Incident Details & Telemetry */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-start space-x-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <MapPin size={14} className="text-cyan-500 shrink-0 mt-0.5" />
                      <span><b className={isLight ? 'text-slate-900 font-semibold' : 'text-slate-400'}>Location:</b> {inc.location}</span>
                    </div>
                    <div className={`flex items-start space-x-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Gauge size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        <b className={isLight ? 'text-slate-900 font-semibold' : 'text-slate-400'}>Telemetry Metric:</b>{' '}
                        <span className={isLight ? 'text-amber-800 font-bold font-mono' : 'text-amber-300 font-bold font-mono'}>
                          {inc.metric}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Request 1: In Fuel siphoning alert message show- Sudden drop of L detected in Fuel Tank. */}
                  <p className={`text-xs leading-relaxed pt-2 font-mono ${
                    isLight ? 'text-slate-800 border-t border-slate-200' : 'text-slate-200 border-t border-slate-800/80'
                  }`}>
                    {inc.alert_type === 'FUEL_SIPHONING'
                      ? (() => {
                          const match = (inc.metric || inc.details).match(/([\d.]+)[\s]*L/i);
                          const qty = match ? match[1] : '28.5';
                          return `Sudden drop of ${qty}L detected in Fuel Tank.`;
                        })()
                      : (inc.alert_type === 'REFUEL_DONE' || inc.alert_type === 'REFUEL_SUCCESS')
                      ? (() => {
                          if (inc.id === 'ALT-1013' || (inc.location && inc.location.includes('Delhi-Jaipur'))) {
                            return `Refuelling detected! Your vehicle number ${vehicleReg} has added 380 litres of fuel at BPCL COCO Plaza Hub, Delhi-Jaipur Expressway (KM 84), at 08:30 AM.`;
                          }
                          const match = (inc.metric || inc.details).match(/([\d.]+)[\s]*L/i);
                          const qty = match ? Math.round(parseFloat(match[1])) : '370';
                          const loc = inc.location || 'Highway Fuel Station';
                          const tm = inc.time || '08:30 AM';
                          return `Refuelling detected! Your vehicle number ${vehicleReg} has added ${qty} litres of fuel at ${loc}, at ${tm}.`;
                        })()
                      : inc.alert_type === 'HARSH_BRAKING'
                      ? `Harsh braking detected! Your vehicle number ${vehicleReg} has experienced sudden deceleration. Please check driver safety & ensure safe driving practices.`
                      : inc.alert_type === 'OVERSPEEDING'
                      ? (() => {
                          const speedMatch = (inc.metric || '').match(/(\d+)\s*km\/h/i);
                          const limitMatch = (inc.metric || '').match(/Limit:\s*(\d+)\s*km\/h/i);
                          const curSpeed = speedMatch ? speedMatch[1] : '76';
                          const speedLimit = limitMatch ? limitMatch[1] : '60';
                          return `Overspeeding Alert! Your vehicle is travelling at ${curSpeed} km/h against the permitted limit of ${speedLimit} km/h. Please maintain speed limits and ensure safe driving.`;
                        })()
                      : (inc.alert_type === 'GEOFENCE_WORKING' || inc.alert_type === 'GEOFENCE_BREACH' || inc.alert_type === 'ROUTE_DEVIATION')
                      ? (() => {
                          const distMatch = (inc.metric || inc.details).match(/([\d.]+)\s*km/i);
                          const dist = distMatch ? distMatch[1] : '56.4';
                          return `Geofence Breach Alert! Your vehicle number ${vehicleReg} has deviated ${dist} km from its designated route. Please verify the vehicle's location and check route deviation authorization.`;
                        })()
                      : inc.alert_type === 'GEOFENCE_PARKING'
                      ? `Night Parking Breach detected! Your vehicle number ${vehicleReg} is parked outside the approved parking zone during designated night hours. Please take necessary action to ensure vehicle safety.`
                      : (inc.alert_type === 'TOWING' || inc.alert_type === 'TOWING_ALERT')
                      ? `Towing Alert! Unauthorised vehicle movement detected while the ignition is OFF. Please verify the vehicle's location and check for possible towing or unauthorised movement.`
                      : (inc.alert_type === 'EXCESSIVE_STOPPAGE' || inc.alert_type === 'STOPPAGE')
                      ? (() => {
                          const parts = (inc.details || '').split('. ');
                          return parts.length > 1 ? parts[0] + '.' : inc.details;
                        })()
                      : inc.alert_type === 'LATE_START'
                      ? `Late Start Alert! Vehicle number ${vehicleReg} commenced its trip later than the scheduled departure time.`
                      : (inc.alert_type === 'IDLE_ALERT' || inc.alert_type === 'EXCESSIVE_IDLE' || inc.alert_type === 'IDLING' || inc.alert_type === 'IDLE')
                      ? (() => {
                          const timeMatch = (inc.metric || inc.details || '').match(/(\d+)\s*(?:mins|min|minutes)/i);
                          const idleTime = timeMatch ? `${timeMatch[1]} minutes` : '27 minutes';
                          const fuelMatch = (inc.metric || inc.details || '').match(/([\d.]+)\s*L/i);
                          const fuelVol = fuelMatch ? `${fuelMatch[1]} litres` : '2.8 litres';
                          const fuelNum = fuelMatch ? parseFloat(fuelMatch[1]) : 2.8;
                          const approxCost = inc.impact_inr ? Math.round(inc.impact_inr) : Math.round(fuelNum * 94.0);
                          const locText = inc.location ? ` at ${inc.location}` : '';
                          return `Idling Alert! Vehicle number ${vehicleReg} remained idle for ${idleTime}${locText}, resulting in ${fuelVol} of diesel wasted in idling (approx. ₹${approxCost.toLocaleString('en-IN')}).`;
                        })()
                      : inc.details
                    }
                  </p>

                  {/* Incident Footer Action Bar (Removed vehicle ID as per request 2, Removed Resolve as per request 3) */}
                  <div className={`flex items-center justify-between pt-1 text-[11px] ${
                    isLight ? 'border-t border-slate-200 text-slate-600' : 'border-t border-slate-800/50 text-slate-400'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <span>Vehicle: <b className={`font-mono ${isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}`}>{vehicleReg}</b></span>
                      <span>Assigned Controller: <b className={isLight ? 'text-slate-800' : 'text-slate-300'}>NOC Shift Lead</b></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {inc.status !== 'ACKNOWLEDGED' && inc.status !== 'RESOLVED' && (
                        <button
                          onClick={() => {
                            inc.status = 'ACKNOWLEDGED';
                            setDrilldownModal({ ...drilldownModal });
                          }}
                          className={`px-3 py-1 rounded font-bold font-mono transition cursor-pointer active:scale-95 ${
                            isLight 
                              ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-400 shadow-xs' 
                              : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600'
                          }`}
                        >
                          Acknowledge
                        </button>
                      )}
                      {(inc.status === 'ACKNOWLEDGED' || inc.status === 'RESOLVED') && (
                        <span className="text-[10.5px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                          ✓ Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            {/* Modal Footer */}
            <div className={`p-3 border-t flex items-center justify-between text-xs shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0D1730] border-[#1E2E56]'
            }`}>
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                Displaying {drilldownModal.incidents.length} verified telematics incident logs
              </span>
              <button
                onClick={() => setDrilldownModal({ isOpen: false, title: '', subtitle: '', incidents: [], vehicleInfo: null, alertInfo: null })}
                className={`px-4 py-1.5 rounded-lg font-bold font-mono transition ${
                  isLight 
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs' 
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
