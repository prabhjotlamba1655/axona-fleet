// Route Corridor and Deviation Mapping Service for Axona Fleet Analytics
// Provides high-fidelity planned freight corridors (Blue Line) and unapproved deviation paths (Red Line)

export const KNOWN_CORRIDORS = {
  'VH-102': { // DL-01-AX-9021 (The primary deviated vehicle)
    routeName: 'Delhi - Jaipur - Ahmedabad Cold Corridor (NH-48)',
    originName: 'Kundli Cold Storage Hub, Delhi',
    destinationName: 'Sanand Agro Hub, Ahmedabad',
    corridorName: 'NH-48 Golden Quadrilateral Western Spine',
    totalDistanceKm: 945,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [28.8700, 77.1200], // Kundli Logistics Hub, Delhi (Origin)
      [28.6139, 77.2090], // Delhi Bypass / Ring Road
      [28.4595, 77.0266], // Gurgaon IFFCO Chowk NH48
      [28.2100, 76.8400], // Dharuhera NH48 Flyover
      [27.9900, 76.5500], // Bawal Industrial Junction
      [27.7000, 76.2000], // Kotputli Toll Plaza NH48
      [27.3800, 75.9600], // Shahpura NH48 (Approved Junction - Deviation Point)
      [27.1500, 75.8900], // Chandwaji NH48
      [26.9800, 75.8300], // Amer / Jaipur Northern Bypass
      [26.8900, 75.7600], // Jaipur Transport Nagar / Ajmer Road Toll
      [26.5700, 74.8600], // Kishangarh 6-Lane Expressway
      [26.4400, 74.6300], // Ajmer Bypass NH48
      [26.1000, 74.3100], // Beawar Freight Cross
      [25.7700, 73.3200], // Pali Marwar Highway
      [24.8800, 72.8600], // Sirohi Toll
      [24.1700, 72.4300], // Palanpur Inter-State Border
      [23.5800, 72.3600], // Mehsana Bypass
      [23.0225, 72.5714], // Ahmedabad Ring Road
      [22.9800, 72.3800]  // Sanand Agro Hub (Destination)
    ],
    // Unapproved Deviated Route: Diverged off NH48 at Shahpura towards Dausa / rural bypass
    deviatedPath: [
      [27.3800, 75.9600], // Point of Departure from Planned Corridor (Shahpura)
      [27.2600, 76.1500], // SH-55 Unapproved Rural Detour
      [27.1200, 76.3200], // Jamwa Ramgarh Off-Corridor Route
      [26.9600, 76.2800], // Dausa Warehouse Cluster Bypass
      [26.8400, 76.0500], // Bassi Toll Unauthorized Connector
      [26.9124, 75.7873]  // Current Truck Location (Off-Corridor Detour Point)
    ],
    deviationJunction: [27.3800, 75.9600],
    deviationReason: 'Unapproved detour via state rural highway avoiding toll plaza (+56.4 km)',
    plannedWaypoints: [
      { name: 'Kundli Origin Hub', coords: [28.8700, 77.1200], type: 'origin' },
      { name: 'Gurgaon NH-48', coords: [28.4595, 77.0266], type: 'waypoint' },
      { name: 'Shahpura Checkpoint', coords: [27.3800, 75.9600], type: 'junction' },
      { name: 'Jaipur Ajmer Bypass', coords: [26.8900, 75.7600], type: 'waypoint' },
      { name: 'Kishangarh Expressway', coords: [26.5700, 74.8600], type: 'waypoint' },
      { name: 'Sanand Terminal', coords: [22.9800, 72.3800], type: 'destination' }
    ]
  },

  'VH-101': { // MH-12-RN-8842
    routeName: 'Mumbai - Nagpur Express Freight',
    originName: 'JNPT Port, Navi Mumbai',
    destinationName: 'MIHAN SEZ, Nagpur',
    corridorName: 'Hindu Hrudaysamrat Balasaheb Thackeray Samruddhi Mahamarg',
    totalDistanceKm: 701,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [18.9499, 72.9515], // JNPT
      [19.2183, 72.9781], // Thane
      [19.6936, 73.5611], // Igatpuri Kasara Ghat
      [19.9975, 73.7898], // Nashik
      [19.8762, 75.3433], // Aurangabad / Chhatrapati Sambhaji Nagar
      [19.8410, 75.8864], // Jalna
      [20.4837, 77.4842], // Karanja Lad
      [20.7453, 78.6022], // Wardha
      [21.0594, 79.0381]  // MIHAN Nagpur
    ],
    deviatedPath: [
      [19.8762, 75.3433],
      [19.8200, 75.4200],
      [19.7800, 75.5100]
    ],
    deviationJunction: [19.8762, 75.3433],
    deviationReason: 'Secondary service road access near Jalna',
    plannedWaypoints: [
      { name: 'JNPT Port', coords: [18.9499, 72.9515], type: 'origin' },
      { name: 'Igatpuri Ghat', coords: [19.6936, 73.5611], type: 'waypoint' },
      { name: 'Nashik Interchange', coords: [19.9975, 73.7898], type: 'waypoint' },
      { name: 'Aurangabad Exit', coords: [19.8762, 75.3433], type: 'waypoint' },
      { name: 'MIHAN Nagpur SEZ', coords: [21.0594, 79.0381], type: 'destination' }
    ]
  },

  'VH-103': { // KA-04-MB-4190
    routeName: 'Bangalore - Chennai Expressway',
    originName: 'Peenya Industrial Estate, Bengaluru',
    destinationName: 'Sriperumbudur Hub, Chennai',
    corridorName: 'NH-48 Bengaluru-Chennai Industrial Freight Corridor',
    totalDistanceKm: 345,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [13.0285, 77.5197], // Peenya
      [12.8399, 77.6770], // Electronic City
      [12.7409, 77.8253], // Hosur
      [12.5186, 78.2137], // Krishnagiri
      [12.6825, 78.6214], // Vaniyambadi
      [12.9165, 79.1325], // Vellore
      [12.9272, 79.3333], // Ranipet
      [12.8342, 79.7036], // Kanchipuram
      [12.9675, 79.9408], // Sriperumbudur
      [13.0827, 80.2707]  // Chennai Port
    ],
    deviatedPath: [
      [12.9675, 79.9408],
      [13.0100, 80.0500],
      [13.0827, 80.2707]
    ],
    deviationJunction: [12.9675, 79.9408],
    deviationReason: 'Port gate queue diversion',
    plannedWaypoints: [
      { name: 'Peenya Hub', coords: [13.0285, 77.5197], type: 'origin' },
      { name: 'Hosur Toll', coords: [12.7409, 77.8253], type: 'waypoint' },
      { name: 'Vellore Bypass', coords: [12.9165, 79.1325], type: 'waypoint' },
      { name: 'Sriperumbudur Hub', coords: [12.9675, 79.9408], type: 'destination' }
    ]
  },

  'VH-104': { // GJ-06-ZZ-7711
    routeName: 'Vadodara - Dahej Chemical Belt',
    originName: 'GIDC Makarpura, Vadodara',
    destinationName: 'Dahej Port Terminal',
    corridorName: 'PCPIR Express Freight Highway',
    totalDistanceKm: 140,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [22.2530, 73.1950],
      [22.0460, 73.1200],
      [21.7051, 72.9959],
      [21.8480, 72.8450],
      [21.7100, 72.5800]
    ],
    deviatedPath: [
      [22.0460, 73.1200],
      [22.1500, 73.0800],
      [22.3072, 73.1812]
    ],
    deviationJunction: [22.0460, 73.1200],
    deviationReason: 'Secondary weighbridge diversion',
    plannedWaypoints: [
      { name: 'Makarpura GIDC', coords: [22.2530, 73.1950], type: 'origin' },
      { name: 'Bharuch Junction', coords: [21.7051, 72.9959], type: 'waypoint' },
      { name: 'Dahej Port', coords: [21.7100, 72.5800], type: 'destination' }
    ]
  },

  'VH-105': { // HR-55-AK-3004
    routeName: 'Gurgaon - Neemrana Logistics Link',
    originName: 'Binola Logistics Park, Gurgaon',
    destinationName: 'Japanese Zone, Neemrana',
    corridorName: 'Delhi-Mumbai Industrial Corridor (DMIC) Phase 1',
    totalDistanceKm: 110,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [28.4595, 77.0266],
      [28.3245, 76.9120],
      [28.2050, 76.7850],
      [28.0800, 76.5800],
      [27.9880, 76.3850]
    ],
    deviatedPath: [
      [28.3245, 76.9120],
      [28.3800, 76.9800],
      [28.4595, 77.0266]
    ],
    deviationJunction: [28.3245, 76.9120],
    deviationReason: 'Reverse dispatch return to Gurgaon yard',
    plannedWaypoints: [
      { name: 'Binola Logistics', coords: [28.3245, 76.9120], type: 'origin' },
      { name: 'Dharuhera Toll', coords: [28.2050, 76.7850], type: 'waypoint' },
      { name: 'Neemrana Zone', coords: [27.9880, 76.3850], type: 'destination' }
    ]
  },

  'VH-106': { // AP-16-TX-5509
    routeName: 'Vijayawada - Visakhapatnam Cargo Line',
    originName: 'Auto Nagar Vijayawada',
    destinationName: 'Visakhapatnam Port',
    corridorName: 'NH-16 Coastal Freight Corridor',
    totalDistanceKm: 360,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [16.4950, 80.6650],
      [16.5062, 80.6480],
      [16.7107, 81.0952],
      [17.0005, 81.8040],
      [17.3582, 82.5501],
      [17.6868, 83.2185]
    ],
    deviatedPath: [],
    deviationJunction: null,
    deviationReason: null,
    plannedWaypoints: [
      { name: 'Vijayawada Hub', coords: [16.4950, 80.6650], type: 'origin' },
      { name: 'Rajahmundry', coords: [17.0005, 81.8040], type: 'waypoint' },
      { name: 'Vizag Port', coords: [17.6868, 83.2185], type: 'destination' }
    ]
  },

  'VH-107': { // UP-32-HN-1244
    routeName: 'Lucknow - Varanasi Freight Corridor',
    originName: 'Transport Nagar Lucknow',
    destinationName: 'Ramnagar Industrial Area Varanasi',
    corridorName: 'Purvanchal Freight Link NH-31',
    totalDistanceKm: 310,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [26.7780, 80.8920],
      [26.8467, 80.9462],
      [26.2648, 82.0727],
      [25.7464, 82.6837],
      [25.2818, 83.0294]
    ],
    deviatedPath: [],
    deviationJunction: null,
    deviationReason: null,
    plannedWaypoints: [
      { name: 'Lucknow Transport Nagar', coords: [26.7780, 80.8920], type: 'origin' },
      { name: 'Sultanpur', coords: [26.2648, 82.0727], type: 'waypoint' },
      { name: 'Varanasi Ramnagar', coords: [25.2818, 83.0294], type: 'destination' }
    ]
  },

  'VH-108': { // WB-19-DF-4402
    routeName: 'Kolkata - Haldia Port Transfer',
    originName: 'Dankuni Logistics Center Kolkata',
    destinationName: 'Haldia Dock Complex',
    corridorName: 'NH-116 Port Connectivity Link',
    totalDistanceKm: 135,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [22.6840, 88.2980],
      [22.5726, 88.3639],
      [22.4280, 87.8720],
      [22.1860, 87.9150],
      [22.0620, 88.0830]
    ],
    deviatedPath: [],
    deviationJunction: null,
    deviationReason: null,
    plannedWaypoints: [
      { name: 'Dankuni Center', coords: [22.6840, 88.2980], type: 'origin' },
      { name: 'Kolaghat Flyover', coords: [22.4280, 87.8720], type: 'waypoint' },
      { name: 'Haldia Dock', coords: [22.0620, 88.0830], type: 'destination' }
    ]
  },

  'VH-109': { // RJ-14-GH-6621
    routeName: 'Jaipur - Jodhpur Industrial Link',
    originName: 'VKIA Jaipur',
    destinationName: 'Boranada SEZ Jodhpur',
    corridorName: 'Rajasthan State Freight Corridor',
    totalDistanceKm: 340,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [26.9850, 75.7720],
      [26.4499, 74.6399],
      [26.1011, 74.3188],
      [26.0820, 74.0720],
      [26.1800, 73.7100],
      [26.1890, 72.9550]
    ],
    deviatedPath: [],
    deviationJunction: null,
    deviationReason: null,
    plannedWaypoints: [
      { name: 'VKIA Jaipur', coords: [26.9850, 75.7720], type: 'origin' },
      { name: 'Ajmer Junction', coords: [26.4499, 74.6399], type: 'waypoint' },
      { name: 'Boranada Jodhpur', coords: [26.1890, 72.9550], type: 'destination' }
    ]
  },

  'VH-110': { // KA-01-EQ-6033
    routeName: 'Bengaluru - Hyderabad IT & Parcel FastTrack',
    originName: 'Electronic City Bengaluru',
    destinationName: 'Shamshabad Cargo Terminal Hyderabad',
    corridorName: 'NH-44 North-South Super Corridor',
    totalDistanceKm: 565,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [12.8399, 77.6770],
      [13.4325, 77.7275],
      [14.6819, 77.6006],
      [15.8281, 78.0373],
      [16.7488, 77.9856],
      [17.2403, 78.4294]
    ],
    deviatedPath: [],
    deviationJunction: null,
    deviationReason: null,
    plannedWaypoints: [
      { name: 'Electronic City Hub', coords: [12.8399, 77.6770], type: 'origin' },
      { name: 'Anantapur Toll', coords: [14.6819, 77.6006], type: 'waypoint' },
      { name: 'Kurnool Pass', coords: [15.8281, 78.0373], type: 'waypoint' },
      { name: 'Shamshabad Terminal', coords: [17.2403, 78.4294], type: 'destination' }
    ]
  }
};

export const PRESET_NATIONAL_CORRIDORS = [
  {
    id: 'CORR-DEL-AHM',
    routeName: 'Delhi - Jaipur - Ahmedabad Cold Corridor (NH-48)',
    originName: 'Kundli Cold Storage Hub, Delhi',
    destinationName: 'Sanand Agro Hub, Ahmedabad',
    corridorName: 'NH-48 Golden Quadrilateral Western Spine',
    totalDistanceKm: 945,
    allowedDeviationKm: 40,
    plannedCorridor: KNOWN_CORRIDORS['VH-102'].plannedCorridor,
    plannedWaypoints: KNOWN_CORRIDORS['VH-102'].plannedWaypoints
  },
  {
    id: 'CORR-MUM-NAG',
    routeName: 'Mumbai - Nagpur Express Freight (Samruddhi Mahamarg)',
    originName: 'JNPT Port, Navi Mumbai',
    destinationName: 'MIHAN SEZ, Nagpur',
    corridorName: 'Hindu Hrudaysamrat Balasaheb Thackeray Samruddhi Mahamarg',
    totalDistanceKm: 701,
    allowedDeviationKm: 40,
    plannedCorridor: KNOWN_CORRIDORS['VH-101'].plannedCorridor,
    plannedWaypoints: KNOWN_CORRIDORS['VH-101'].plannedWaypoints
  },
  {
    id: 'CORR-BLR-MAA',
    routeName: 'Bengaluru - Chennai Industrial Freight Corridor (NH-48)',
    originName: 'Peenya Industrial Estate, Bengaluru',
    destinationName: 'Sriperumbudur Hub, Chennai',
    corridorName: 'NH-48 Bengaluru-Chennai Industrial Freight Corridor',
    totalDistanceKm: 345,
    allowedDeviationKm: 40,
    plannedCorridor: KNOWN_CORRIDORS['VH-103'].plannedCorridor,
    plannedWaypoints: KNOWN_CORRIDORS['VH-103'].plannedWaypoints
  },
  {
    id: 'CORR-DEL-CCU',
    routeName: 'Delhi - Kolkata Eastern Freight Corridor (NH-19)',
    originName: 'Sanjay Gandhi Transport Nagar, Delhi',
    destinationName: 'Dankuni Logistics Park, Kolkata',
    corridorName: 'NH-19 Grand Trunk Highway Spine',
    totalDistanceKm: 1450,
    allowedDeviationKm: 45,
    plannedCorridor: [
      [28.7495, 77.1565], // Delhi SGTN
      [27.8974, 78.0880], // Aligarh
      [27.1767, 78.0081], // Agra
      [26.4499, 80.3319], // Kanpur
      [25.4358, 81.8463], // Prayagraj
      [25.3176, 82.9739], // Varanasi
      [24.7914, 85.0002], // Gaya
      [23.7957, 86.4304], // Dhanbad
      [23.5204, 87.3119], // Durgapur
      [22.6841, 88.2936]  // Dankuni Kolkata
    ],
    plannedWaypoints: [
      { name: 'Delhi SGTN Hub', coords: [28.7495, 77.1565], type: 'origin' },
      { name: 'Kanpur Interchange', coords: [26.4499, 80.3319], type: 'waypoint' },
      { name: 'Varanasi Bypass', coords: [25.3176, 82.9739], type: 'waypoint' },
      { name: 'Dhanbad Coal Corridor', coords: [23.7957, 86.4304], type: 'waypoint' },
      { name: 'Dankuni Terminal', coords: [22.6841, 88.2936], type: 'destination' }
    ]
  },
  {
    id: 'CORR-DEL-BOM',
    routeName: 'Delhi - Mumbai Golden Quadrilateral Spine (NH-48)',
    originName: 'Kundli Logistics Hub, Delhi',
    destinationName: 'JNPT Port, Navi Mumbai',
    corridorName: 'NH-48 National Economic Expressway Corridor',
    totalDistanceKm: 1410,
    allowedDeviationKm: 40,
    plannedCorridor: [
      [28.8700, 77.1200], // Delhi Kundli
      [28.2100, 76.8400], // Dharuhera
      [26.9124, 75.7873], // Jaipur
      [24.5854, 73.7125], // Udaipur
      [23.0225, 72.5714], // Ahmedabad
      [22.3072, 73.1812], // Vadodara
      [21.1702, 72.8311], // Surat
      [19.2183, 72.9781], // Thane
      [18.9499, 72.9515]  // JNPT Mumbai
    ],
    plannedWaypoints: [
      { name: 'Kundli Hub, Delhi', coords: [28.8700, 77.1200], type: 'origin' },
      { name: 'Jaipur Ajmer Bypass', coords: [26.9124, 75.7873], type: 'waypoint' },
      { name: 'Udaipur Checkpoint', coords: [24.5854, 73.7125], type: 'waypoint' },
      { name: 'Surat Industrial Ring', coords: [21.1702, 72.8311], type: 'waypoint' },
      { name: 'JNPT Port Terminal', coords: [18.9499, 72.9515], type: 'destination' }
    ]
  },
  {
    id: 'CORR-PUN-HYD',
    routeName: 'Pune - Solapur - Hyderabad Logistics Spine (NH-65)',
    originName: 'Chakan Auto SEZ, Pune',
    destinationName: 'GMR AeroCity Cargo Hub, Hyderabad',
    corridorName: 'NH-65 Western-Deccan Commercial Spine',
    totalDistanceKm: 560,
    allowedDeviationKm: 35,
    plannedCorridor: [
      [18.7523, 73.8567], // Chakan Pune
      [18.5204, 73.8567], // Pune Bypass
      [17.6599, 75.9064], // Solapur
      [17.3297, 76.8343], // Gulbarga / Kalaburagi
      [17.3850, 78.4867]  // Hyderabad AeroCity
    ],
    plannedWaypoints: [
      { name: 'Chakan SEZ, Pune', coords: [18.7523, 73.8567], type: 'origin' },
      { name: 'Solapur Mid-Corridor Toll', coords: [17.6599, 75.9064], type: 'waypoint' },
      { name: 'Hyderabad AeroCity Hub', coords: [17.3850, 78.4867], type: 'destination' }
    ]
  }
];

const STORAGE_KEY = 'axona_custom_assigned_routes';

function loadStoredRoutes() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveVehicleAssignedRoute(vehicleKey, routeConfig) {
  const current = loadStoredRoutes();
  current[vehicleKey] = routeConfig;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch (e) {}
  return routeConfig;
}

export function getVehicleAssignedRoute(vehicleKey) {
  const current = loadStoredRoutes();
  return current[vehicleKey] || null;
}

/**
 * Returns full route telemetry, planned blue corridor, truck location, and red deviated path.
 */
export function getRouteCorridorForVehicle(vehicle) {
  if (!vehicle) return null;

  const key = vehicle.id || vehicle.vehicle_id;
  const regNo = vehicle.reg_no || '';

  // 1. Check if user explicitly assigned a planned route to this vehicle
  const userAssigned = getVehicleAssignedRoute(key) || getVehicleAssignedRoute(regNo);

  // 2. Or check known static corridors
  const known = userAssigned || KNOWN_CORRIDORS[key] || Object.values(KNOWN_CORRIDORS).find(c => 
    regNo.includes('DL-01-AX-9021') || regNo === 'DL-01-AX-9021' || (vehicle.route_name && c.routeName === vehicle.route_name)
  );

  const curLat = Number(vehicle.current_lat || 26.9124);
  const curLng = Number(vehicle.current_lng || 75.7873);
  const curLocation = [curLat, curLng];

  const deviationKm = Number(vehicle.deviation_km || 0);
  const allowedDeviationKm = Number(userAssigned?.allowedDeviationKm || vehicle.route_deviation_allowed_km || 40);
  const isDeviated = regNo.includes('DL-01-AX-9021') || deviationKm > allowedDeviationKm;

  if (known) {
    let deviatedPath = [];
    if (isDeviated) {
      if (known.deviatedPath && known.deviatedPath.length > 0) {
        // Adjust the last point of deviated path to live truck location
        deviatedPath = [
          ...known.deviatedPath.slice(0, -1),
          curLocation
        ];
      } else {
        // Find nearest point on planned corridor to branch off
        const branchPoint = known.plannedCorridor[Math.floor(known.plannedCorridor.length / 2)] || curLocation;
        deviatedPath = [
          branchPoint,
          [(branchPoint[0] + curLat) / 2 + 0.15, (branchPoint[1] + curLng) / 2 + 0.25],
          curLocation
        ];
      }
    }

    return {
      routeName: vehicle.route_name || known.routeName,
      corridorName: known.corridorName,
      originName: vehicle.planned_origin || known.originName,
      destinationName: vehicle.planned_destination || known.destinationName,
      totalDistanceKm: known.totalDistanceKm,
      allowedDeviationKm,
      plannedCorridor: known.plannedCorridor,
      deviatedPath: isDeviated ? deviatedPath : [],
      deviationJunction: known.deviationJunction || (isDeviated && deviatedPath.length > 0 ? deviatedPath[0] : null),
      deviationReason: isDeviated ? (known.deviationReason || `Deviated by +${deviationKm.toFixed(1)} km outside approved perimeter`) : null,
      isDeviated,
      deviationKm: isDeviated ? Math.max(deviationKm, 56.4) : deviationKm,
      currentLocation: curLocation,
      plannedWaypoints: known.plannedWaypoints,
      vehicle
    };
  }

  // Fallback dynamic corridor generator for any custom vehicle
  const originLat = curLat + 0.85;
  const originLng = curLng - 0.75;
  const destLat = curLat - 0.85;
  const destLng = curLng + 0.75;

  const dynamicPlanned = [
    [originLat, originLng],
    [curLat + 0.40, curLng - 0.35],
    [curLat, curLng], // Sits on route if not deviated
    [curLat - 0.40, curLng + 0.35],
    [destLat, destLng]
  ];

  let dynamicDeviated = [];
  if (isDeviated) {
    const branchPoint = [curLat + 0.40, curLng - 0.35];
    dynamicDeviated = [
      branchPoint,
      [curLat + 0.25, curLng + 0.30],
      [curLat + 0.10, curLng + 0.45],
      curLocation
    ];
  }

  return {
    routeName: vehicle.route_name || 'Standard Freight Corridor',
    corridorName: 'National Freight Corridor Network',
    originName: vehicle.planned_origin || 'Origin Cargo Hub',
    destinationName: vehicle.planned_destination || 'Destination Hub',
    totalDistanceKm: 650,
    allowedDeviationKm,
    plannedCorridor: dynamicPlanned,
    deviatedPath: dynamicDeviated,
    deviationJunction: isDeviated && dynamicDeviated.length > 0 ? dynamicDeviated[0] : null,
    deviationReason: isDeviated ? `Deviated by +${deviationKm.toFixed(1)} km outside approved corridor` : null,
    isDeviated,
    deviationKm,
    currentLocation: curLocation,
    plannedWaypoints: [
      { name: 'Origin Hub', coords: [originLat, originLng], type: 'origin' },
      { name: 'Destination Hub', coords: [destLat, destLng], type: 'destination' }
    ],
    vehicle
  };
}
