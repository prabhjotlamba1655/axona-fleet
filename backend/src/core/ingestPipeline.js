import db from '../db/database.js';
import { frameSentence, publicCanonical } from './canonicalTelemetry.js';
import { normalizePayload } from './adapters/registry.js';
import { withImmediateTransaction } from './transaction.js';
import { telemetryRepository } from '../db/repositories/telemetryRepository.js';

const recentPacketCache = new Map();

export function resetIngestCaches() {
  recentPacketCache.clear();
}

function ack(imei, code) {
  return frameSentence(`ACK,${imei || 'UNKNOWN'},${code}`);
}

function nak(imei, code) {
  return frameSentence(`NAK,${imei || 'UNKNOWN'},${code}`);
}

function rawText(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Normalize any supported hardware payload and commit it before the caller
 * is allowed to send an ACK. A thrown error rolls the transaction back and
 * must be surfaced as a failed response with no success ACK.
 */
export function ingestTelemetry(input, meta = {}) {
  db.get('SELECT 1 AS ready');

  const normalized = normalizePayload(input);
  const imeiGuess = normalized.canonical?.device?.imei
    || normalized.imei
    || (input && input.imei)
    || 'UNKNOWN';

  const cacheKey = normalized.ok
    ? `${imeiGuess}_${normalized.canonical.position.latitude}_${normalized.canonical.position.longitude}_${normalized.canonical.position.speedKmh}`
    : null;
  const nowMs = Date.now();
  const duplicate = cacheKey
    ? Boolean(recentPacketCache.get(cacheKey) && (nowMs - recentPacketCache.get(cacheKey) < 2000))
    : false;

  const outcome = withImmediateTransaction(() => {
    if (!normalized.ok) {
      telemetryRepository.insertRawLog({
        imei: imeiGuess,
        packetType: normalized.protocol || 'RAW',
        rawPayload: normalized.rawForLog || rawText(input),
        isValid: false,
        errorMessage: normalized.error,
        canonical: null
      });
      return {
        status: 'REJECTED',
        committed: true,
        persisted: false,
        protocol: normalized.protocol,
        error: normalized.error,
        code: normalized.code || 'INVALID_FORMAT',
        ack: nak(imeiGuess, normalized.code || 'INVALID_FORMAT')
      };
    }

    const canonical = normalized.canonical;
    const imei = canonical.device.imei;

    telemetryRepository.insertRawLog({
      imei,
      packetType: canonical.alert?.packetType || canonical.protocol,
      rawPayload: normalized.rawForLog,
      isValid: true,
      errorMessage: duplicate ? 'duplicate' : null,
      canonical
    });

    if (duplicate) {
      return {
        status: 'DUPLICATE_IGNORED',
        committed: true,
        persisted: false,
        protocol: canonical.protocol,
        imei,
        canonical: publicCanonical(canonical),
        ack: ack(imei, 'DUP')
      };
    }

    const device = telemetryRepository.findDeviceByImei(imei);
    if (!device) {
      return {
        status: 'UNREGISTERED_DEVICE',
        committed: true,
        persisted: false,
        protocol: canonical.protocol,
        imei,
        error: `Device with IMEI ${imei} is not registered in Axona`,
        canonical: publicCanonical(canonical),
        ack: nak(imei, 'UNREGISTERED')
      };
    }

    const position = canonical.position;
    const state = canonical.state;
    const satellites = position.satellites || 0;

    telemetryRepository.markDeviceOnline(device.id, {
      mainPower: state.mainPower,
      tamper: state.tamper,
      satellites
    });

    if (state.mainPower === 0) {
      telemetryRepository.insertHealthEvent({
        deviceId: device.id,
        vehicleId: device.vehicle_id,
        eventType: 'power_disconnect',
        severity: 'critical',
        details: 'Device reported external vehicle power cut.'
      });
    }
    if (state.tamper === 1) {
      telemetryRepository.insertHealthEvent({
        deviceId: device.id,
        vehicleId: device.vehicle_id,
        eventType: 'tamper',
        severity: 'critical',
        details: 'Physical tamper detection switch triggered on device enclosure.'
      });
    }

    let panicEventCreated = null;
    let driverIntelligenceEventCreated = null;
    const gpsTime = canonical.timing.gpsTime
      ? canonical.timing.gpsTime.replace('T', ' ').replace('Z', '')
      : null;

    if (device.vehicle_id) {
      const address = `Near Lat ${position.latitude.toFixed(4)}, Lon ${position.longitude.toFixed(4)}`;
      telemetryRepository.upsertLatestLocation({
        vehicleId: device.vehicle_id,
        deviceId: device.id,
        latitude: position.latitude,
        longitude: position.longitude,
        speed: position.speedKmh,
        heading: position.headingDegrees,
        ignition: state.ignition,
        movementStatus: state.movementStatus,
        mainPower: state.mainPower,
        panic: state.panic,
        address,
        gpsTime,
        rawPacket: normalized.rawForLog
      });
      telemetryRepository.insertHistory({
        vehicleId: device.vehicle_id,
        deviceId: device.id,
        latitude: position.latitude,
        longitude: position.longitude,
        speed: position.speedKmh,
        heading: position.headingDegrees,
        ignition: state.ignition,
        mainPower: state.mainPower,
        panic: state.panic,
        address: `Live GPS Waypoint (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)})`,
        gpsTime
      });

      if (state.panic === 1) {
        const panicId = telemetryRepository.insertPanic({
          tenantId: device.tenant_id,
          vehicleId: device.vehicle_id,
          deviceId: device.id,
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speedKmh,
          address: `Emergency Location: Lat ${position.latitude.toFixed(5)}, Lon ${position.longitude.toFixed(5)}`,
          gpsTime
        });
        telemetryRepository.insertNotification({
          tenantId: device.tenant_id,
          vehicleId: device.vehicle_id,
          title: `EMERGENCY SOS: ${device.registration_number}`,
          message: `Panic button activated in vehicle ${device.registration_number} at ${position.speedKmh} km/h.`,
          type: 'panic'
        });
        panicEventCreated = {
          id: panicId,
          vehicle_id: device.vehicle_id,
          registration_number: device.registration_number,
          owner_name: device.owner_name,
          owner_phone: device.owner_phone,
          emergency_contact_phone: device.emergency_contact_phone,
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speedKmh,
          time: new Date().toISOString()
        };
      }

      if (device.speed_limit && position.speedKmh > device.speed_limit) {
        const recent = telemetryRepository.findRecentSpeedAlert(device.vehicle_id);
        if (!recent) {
          telemetryRepository.insertSpeedAlert({
            tenantId: device.tenant_id,
            vehicleId: device.vehicle_id,
            speed: position.speedKmh,
            speedLimit: device.speed_limit,
            latitude: position.latitude,
            longitude: position.longitude,
            address: `Speed violation on route (${position.speedKmh} km/h in ${device.speed_limit} zone)`,
            gpsTime
          });
        }
      }

      if (canonical.alert?.eventType) {
        const eventId = telemetryRepository.insertDriverEvent({
          tenantId: device.tenant_id,
          vehicleId: device.vehicle_id,
          deviceId: device.id,
          eventType: canonical.alert.eventType,
          packetType: canonical.alert.packetType || canonical.protocol,
          alertId: canonical.alert.alertId || 0,
          severity: canonical.alert.severity || 'WARNING',
          metricValue: canonical.alert.metricValue || String(position.speedKmh),
          thresholdValue: canonical.alert.thresholdValue || '',
          speed: position.speedKmh,
          heading: position.headingDegrees,
          latitude: position.latitude,
          longitude: position.longitude,
          address,
          driverName: device.owner_name || 'Fleet Operator',
          gpsTime
        });
        driverIntelligenceEventCreated = {
          id: eventId,
          vehicleId: device.vehicle_id,
          registrationNumber: device.registration_number,
          driverName: device.owner_name || 'Fleet Operator',
          eventType: canonical.alert.eventType,
          packetType: canonical.alert.packetType || canonical.protocol,
          alertId: canonical.alert.alertId || 0,
          severity: canonical.alert.severity || 'WARNING',
          metricValue: canonical.alert.metricValue || String(position.speedKmh),
          thresholdValue: canonical.alert.thresholdValue || '',
          speed: position.speedKmh,
          heading: position.headingDegrees,
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      status: 'PROCESSED',
      committed: true,
      persisted: Boolean(device.vehicle_id),
      protocol: canonical.protocol,
      transport: meta.transport || 'HTTP',
      imei,
      vehicle_id: device.vehicle_id,
      registration_number: device.registration_number,
      latitude: position.latitude,
      longitude: position.longitude,
      speed: position.speedKmh,
      heading: position.headingDegrees,
      ignition: state.ignition,
      movementStatus: state.movementStatus,
      panicEventCreated,
      driverIntelligenceEventCreated,
      canonical: publicCanonical(canonical),
      ack: ack(imei, 'SUCCESS')
    };
  });

  if (outcome.status === 'PROCESSED' && cacheKey) {
    recentPacketCache.set(cacheKey, nowMs);
    if (recentPacketCache.size > 2000) recentPacketCache.clear();
  }

  return outcome;
}
