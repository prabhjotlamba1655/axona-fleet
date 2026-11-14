import { WebSocket } from 'ws';

const clients = new Set();

export function addLiveClient(ws) {
  clients.add(ws);
  return clients.size;
}

export function removeLiveClient(ws) {
  clients.delete(ws);
  return clients.size;
}

export function broadcastWS(payload) {
  const json = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    try {
      client.send(json);
    } catch (err) {
      console.warn('WS send failed:', err.message);
    }
  }
}
