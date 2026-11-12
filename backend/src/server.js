import express from 'express';
import http from 'node:http';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';

import db from './db/database.js';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import trackingRoutes from './routes/tracking.js';
import tripRoutes from './routes/trips.js';
import panicRoutes from './routes/panic.js';
import securityRoutes from './routes/security.js';
import deviceRoutes from './routes/devices.js';
import geofenceRoutes from './routes/geofences.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes from './routes/subscriptions.js';
import settingsRoutes from './routes/settings.js';
import driverIntelligenceRoutes from './routes/driverIntelligence.js';
import { startGPSSimulator } from './services/gpsSimulator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5055;

// Enable CORS for frontend dev server
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (!req.url.startsWith('/api/tracking/live')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/panic', panicRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/driver-intelligence', driverIntelligenceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Axona Fleet Management Enterprise Telematics Gateway',
    version: '1.4.0-AIS',
    timestamp: new Date().toISOString()
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Axona Error]', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/telematics' });

const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[Axona WS] New client connected. Total clients: ${clients.size}`);

  // Send initial welcome & connection ack
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    message: 'Connected to Axona Real-Time Telematics Stream',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      // ignore
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[Axona WS] Client disconnected. Remaining: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.warn('[Axona WS] Client error:', err.message);
    clients.delete(ws);
  });
});

// Broadcast helper
export function broadcastWS(payload) {
  const json = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(json);
      } catch (err) {
        console.warn('WS send failed:', err.message);
      }
    }
  }
}

// Start HTTP Server
server.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 AXONA FLEET MANAGEMENT BACKEND ONLINE on http://localhost:${PORT}`);
  console.log(`📡 WebSocket Telematics Gateway listening on ws://localhost:${PORT}/ws/telematics`);
  console.log('🏢 Developed by Axona Software LLP');
  console.log('================================================================');

  // Start background GPS telemetry streamer
  startGPSSimulator(broadcastWS);
});
