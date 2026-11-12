import { User } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('axona_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('axona_auth_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('axona_auth_token');
  localStorage.removeItem('axona_current_user');
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
  }

  return response.json();
}

/**
 * Real-time WebSocket connection to backend telematics stream
 */
type WSCallback = (data: any) => void;

class TelematicsWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Set<WSCallback> = new Set();
  private reconnectTimer: any = null;

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/telematics`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[Axona WS] Connected to telematics stream');
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.listeners.forEach(cb => cb(payload));
      } catch (e) {
        // ignore
      }
    };

    this.ws.onclose = () => {
      console.log('[Axona WS] Connection closed. Reconnecting in 3s...');
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.warn('[Axona WS] Error:', err);
      this.ws?.close();
    };
  }

  public subscribe(callback: WSCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const telematicsWS = new TelematicsWebSocket();
