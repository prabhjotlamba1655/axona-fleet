// Axona Fleet Analytics Central API Service

const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const API_BASE = `http://${host}:5000/api`;
const WS_BASE = `ws://${host}:5000`;

export async function fetchVehicles() {
  const res = await fetch(`${API_BASE}/vehicles`);
  return res.json();
}

export async function fetchVehicleById(id) {
  const res = await fetch(`${API_BASE}/vehicles/${id}`);
  return res.json();
}

export async function registerOrUpdateVehicle(payload) {
  const res = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchDieselSavings() {
  const res = await fetch(`${API_BASE}/diesel-savings`);
  return res.json();
}

export async function crossCheckRefueling(payload) {
  const res = await fetch(`${API_BASE}/refueling/cross-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchPlannedRoutes() {
  const res = await fetch(`${API_BASE}/routes`);
  return res.json();
}

export async function savePlannedRoute(payload) {
  const res = await fetch(`${API_BASE}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function assignPlannedRouteToVehicle(vehicleId, payload) {
  const res = await fetch(`${API_BASE}/vehicles/${vehicleId}/assign-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  return res.json();
}

export async function acknowledgeAlert(alertId, acknowledgedBy = 'NOC Controller') {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledged_by: acknowledgedBy })
  });
  return res.json();
}

export async function fetchFleetOverview() {
  const res = await fetch(`${API_BASE}/fleet/overview`);
  return res.json();
}

export async function fetchTank3D(vehicleId) {
  const res = await fetch(`${API_BASE}/fuel-tank-3d/${vehicleId}`);
  return res.json();
}

export async function fetchRtoCompliance() {
  const res = await fetch(`${API_BASE}/rto-compliance`);
  return res.json();
}

export async function fetchAxlePayload() {
  const res = await fetch(`${API_BASE}/axle-payload`);
  return res.json();
}

export async function fetchCostProfitability() {
  const res = await fetch(`${API_BASE}/cost-profitability`);
  return res.json();
}

export async function fetchColdChain() {
  const res = await fetch(`${API_BASE}/cold-chain`);
  return res.json();
}

export async function fetchTankCalibration(vehicleId) {
  const res = await fetch(`${API_BASE}/tank-calibration/${vehicleId}`);
  return res.json();
}

export async function saveTankCalibrationPoint(payload) {
  const res = await fetch(`${API_BASE}/tank-calibration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchRbacUsers() {
  const res = await fetch(`${API_BASE}/rbac/users`);
  return res.json();
}

export function downloadReportUrl(params = 'Daily') {
  if (typeof params === 'string') {
    return `${API_BASE}/reports/download?period=${params}&segment=ALL`;
  }
  const query = new URLSearchParams(params).toString();
  return `${API_BASE}/reports/download?${query}`;
}

export function connectWebSocket(onMessage, onOpen, onClose) {
  let ws;
  let retryTimer;

  function connect() {
    try {
      ws = new WebSocket(WS_BASE);
      ws.onopen = () => {
        if (onOpen) onOpen();
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };
      ws.onclose = () => {
        if (onClose) onClose();
        retryTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      retryTimer = setTimeout(connect, 3000);
    }
  }

  connect();

  return () => {
    clearTimeout(retryTimer);
    if (ws) ws.close();
  };
}
