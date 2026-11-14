import net from 'node:net';
import { ingestTelemetry } from '../core/ingestPipeline.js';
import { takeAvlPacket, takeImeiGreeting } from '../core/adapters/teltonikaCodec8.js';

let server = null;

/**
 * Accept FMB920 (and other Teltonika Codec 8) trackers.
 * Reply 0x01 to the IMEI, decode each AVL packet, and commit it through ingest
 * before telling the device how many records were accepted.
 * An IMEI that is not registered is answered with 0 so the tracker keeps the
 * records and sends them again after the vehicle is linked.
 */
export function startTeltonikaTcpServer(port) {
  if (server) return server;
  const tcpPort = Number(port);
  if (!Number.isInteger(tcpPort) || tcpPort < 0) return null;

  server = net.createServer((socket) => {
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;
    const state = { imei: null, buffer: Buffer.alloc(0) };
    socket.setTimeout(5 * 60 * 1000);
    console.log(`[Teltonika TCP] connected ${remote}`);

    socket.on('data', (chunk) => {
      state.buffer = Buffer.concat([state.buffer, chunk]);
      try {
        drain(socket, state, remote);
      } catch (err) {
        console.error(`[Teltonika TCP] ${remote} ${err.message}`);
        socket.destroy();
      }
    });

    socket.on('timeout', () => socket.destroy());
    socket.on('error', (err) => {
      console.error(`[Teltonika TCP] ${remote} ${err.message}`);
    });
    socket.on('close', () => {
      console.log(`[Teltonika TCP] closed ${state.imei || remote}`);
    });
  });

  server.on('error', (err) => {
    console.error(`[Teltonika TCP] listener error: ${err.message}`);
  });

  server.listen(tcpPort, '0.0.0.0', () => {
    const bound = server && server.address();
    console.log(`[Teltonika TCP] Codec 8 listening on 0.0.0.0:${bound ? bound.port : tcpPort}`);
  });
  return server;
}

export function stopTeltonikaTcpServer() {
  if (!server) return;
  const current = server;
  server = null;
  current.close();
}

function drain(socket, state, remote) {
  while (state.buffer.length > 0) {
    if (!state.imei) {
      const greeting = takeImeiGreeting(state.buffer);
      if (!greeting) return;
      if (greeting.error) throw new Error(greeting.error);
      state.imei = greeting.imei;
      state.buffer = state.buffer.subarray(greeting.bytes);
      socket.write(Buffer.from([0x01]));
      console.log(`[Teltonika TCP] IMEI ${state.imei} from ${remote}`);
      continue;
    }

    const packet = takeAvlPacket(state.buffer);
    if (!packet) return;
    if (!packet.bytes) throw new Error(packet.error || 'Invalid AVL packet');
    const accepted = packet.error ? 0 : acceptRecords(state.imei, packet.records, remote);
    const reply = Buffer.alloc(4);
    reply.writeUInt32BE(accepted, 0);
    socket.write(reply);
    state.buffer = state.buffer.subarray(packet.bytes);
    if (packet.error) {
      console.error(`[Teltonika TCP] ${state.imei} ${packet.error}`);
    }
  }
}

function acceptRecords(imei, records, remote) {
  let accepted = 0;
  for (const record of records) {
    if (record.latitude === 0 && record.longitude === 0) {
      accepted += 1;
      continue;
    }
    const result = ingestTelemetry({
      protocol: 'teltonika',
      imei,
      latitude: record.latitude,
      longitude: record.longitude,
      altitude: record.altitude,
      speed: record.speed,
      angle: record.angle,
      satellites: record.satellites,
      timestamp: record.timestamp,
      io: { ignition: record.ignition }
    }, { transport: 'TCP', ipAddress: remote });

    if (result.status === 'UNREGISTERED_DEVICE') {
      console.error(`[Teltonika TCP] IMEI ${imei} is not linked to a vehicle. Records left on the device.`);
      return 0;
    }
    accepted += 1;
    console.log(`[Teltonika TCP] ${imei} ${result.status} ${record.latitude}, ${record.longitude} ${record.speed} km/h`);
  }
  return accepted;
}
